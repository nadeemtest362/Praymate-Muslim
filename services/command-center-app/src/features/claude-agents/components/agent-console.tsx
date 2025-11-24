import { useState, useEffect, useRef } from 'react'
import {
  claudeAgentService,
  AgentThought,
  DecisionPoint,
} from '@/services/claude-agent.service'
import { Loader2, Send, StopCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'

export function AgentConsole() {
  const [mission, setMission] = useState('')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [thoughts, setThoughts] = useState<AgentThought[]>([])
  const [currentDecision, setCurrentDecision] = useState<DecisionPoint | null>(
    null
  )
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Connect to WebSocket
    const socket = claudeAgentService.connect()

    // Set up event listeners
    claudeAgentService.onThought((thought) => {
      setThoughts((prev) => [...prev, thought])
      scrollToBottom()
    })

    claudeAgentService.onDecisionPoint((decision) => {
      setCurrentDecision(decision)
    })

    claudeAgentService.onSessionCompleted(() => {
      setIsRunning(false)
      setSessionId(null)
    })

    claudeAgentService.onSessionError((data) => {
      setError(data.error)
      setIsRunning(false)
      setSessionId(null)
    })

    return () => {
      claudeAgentService.disconnect()
    }
  }, [])

  useEffect(() => {
    if (sessionId) {
      claudeAgentService.joinSession(sessionId)
      return () => {
        claudeAgentService.leaveSession(sessionId)
      }
    }
  }, [sessionId])

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const handleStartMission = async () => {
    if (!mission.trim()) return

    try {
      setError(null)
      setThoughts([])
      setCurrentDecision(null)
      setIsRunning(true)

      const { sessionId: newSessionId } =
        await claudeAgentService.startMission(mission)
      setSessionId(newSessionId)
    } catch (err) {
      setError('Failed to start mission')
      setIsRunning(false)
    }
  }

  const handleStopMission = async () => {
    if (sessionId) {
      try {
        await claudeAgentService.stopSession(sessionId)
      } catch (err) {
        setError('Failed to stop mission')
      }
    }
  }

  const handleDecisionResponse = async (choice: string) => {
    if (!sessionId || !currentDecision) return

    try {
      await claudeAgentService.respondToDecision(
        sessionId,
        currentDecision.id,
        choice
      )
      setCurrentDecision(null)
    } catch (err) {
      setError('Failed to respond to decision')
    }
  }

  const getThoughtIcon = (type: AgentThought['type']) => {
    switch (type) {
      case 'thought':
        return '💭'
      case 'action':
        return '⚡'
      case 'result':
        return '✅'
      case 'error':
        return '❌'
      default:
        return '📝'
    }
  }

  return (
    <div className='space-y-4'>
      <Card>
        <CardHeader>
          <CardTitle>Claude Agent Console</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='flex gap-2'>
            <Input
              placeholder="Enter mission (e.g., 'Create a new React component for user profile')"
              value={mission}
              onChange={(e) => setMission(e.target.value)}
              onKeyPress={(e) =>
                e.key === 'Enter' && !isRunning && handleStartMission()
              }
              disabled={isRunning}
            />
            {isRunning ? (
              <Button
                onClick={handleStopMission}
                variant='destructive'
                size='icon'
              >
                <StopCircle className='h-4 w-4' />
              </Button>
            ) : (
              <Button onClick={handleStartMission} size='icon'>
                <Send className='h-4 w-4' />
              </Button>
            )}
          </div>

          {error && (
            <Alert variant='destructive'>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <ScrollArea className='h-[400px] rounded-md border p-4'>
            <div className='space-y-2'>
              {thoughts.map((thought, index) => (
                <div
                  key={index}
                  className={`flex gap-2 ${
                    thought.type === 'error' ? 'text-red-600' : ''
                  }`}
                >
                  <span className='text-xl'>
                    {getThoughtIcon(thought.type)}
                  </span>
                  <div className='flex-1'>
                    <p className='text-muted-foreground text-sm'>
                      {new Date(thought.timestamp).toLocaleTimeString()}
                    </p>
                    <p className='text-sm'>{thought.content}</p>
                  </div>
                </div>
              ))}
              {isRunning && thoughts.length === 0 && (
                <div className='flex items-center justify-center py-8'>
                  <Loader2 className='h-6 w-6 animate-spin' />
                  <span className='ml-2'>Starting agent...</span>
                </div>
              )}
              <div ref={scrollRef} />
            </div>
          </ScrollArea>

          {currentDecision && (
            <Alert>
              <AlertDescription>
                <p className='mb-2 font-medium'>{currentDecision.question}</p>
                <div className='mt-2 flex gap-2'>
                  {currentDecision.options.map((option) => (
                    <Button
                      key={option}
                      size='sm'
                      onClick={() => handleDecisionResponse(option)}
                    >
                      {option}
                    </Button>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
