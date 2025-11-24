import React, { useState, useEffect } from 'react'
import {
  Brain,
  Rocket,
  Target,
  Users,
  TrendingUp,
  MessageSquare,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Bot,
  Code2,
  PenTool,
  Search,
  FileText,
  Zap,
  Terminal,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  ClaudeAgentManager,
  DecisionRequest,
} from './services/claude-agent-manager'
import { parseMissions } from './services/mission-parser'
import { AgentStatus, Mission, AgentThought } from './types'

export default function GTMStudioV2() {
  const [isDevelopmentMode] = useState(true) // For now, always use dev mode
  const [agentManager] = useState(
    () => new ClaudeAgentManager({ developmentMode: isDevelopmentMode })
  )
  const [agents, setAgents] = useState<AgentStatus[]>([])
  const [missions, setMissions] = useState<Mission[]>([])
  const [missionQueue, setMissionQueue] = useState<Mission[]>([])
  const [completedMissions, setCompletedMissions] = useState<Mission[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [decisionRequests, setDecisionRequests] = useState<DecisionRequest[]>(
    []
  )
  const [activeDecision, setActiveDecision] = useState<DecisionRequest | null>(
    null
  )
  const [decisionResponse, setDecisionResponse] = useState('')
  const [isInitializing, setIsInitializing] = useState(false)

  // Initialize agent manager
  useEffect(() => {
    // Set up event handlers
    agentManager.on('started', () => {
      setIsRunning(true)
      toast.success('Agents started successfully')
    })

    agentManager.on('stopped', () => {
      setIsRunning(false)
      toast.info('Agents stopped')
    })

    agentManager.on('reset', () => {
      setCompletedMissions([])
      setDecisionRequests([])
      toast.info('System reset')
    })

    agentManager.on('agentUpdate', ({ agentId, type, data }) => {
      setAgents(agentManager.getAgentStatuses())

      if (type === 'error') {
        toast.error(`Agent ${agentId} error: ${data}`)
      }
    })

    agentManager.on('missionStarted', ({ agentId, mission }) => {
      setAgents(agentManager.getAgentStatuses())
      setMissionQueue(agentManager.getMissionQueue())
    })

    agentManager.on('missionComplete', ({ agentId, mission }) => {
      setAgents(agentManager.getAgentStatuses())
      setCompletedMissions((prev) => [...prev, mission])
      toast.success(`${mission.title} completed!`)
    })

    agentManager.on('decisionRequired', (decision: DecisionRequest) => {
      setDecisionRequests((prev) => [...prev, decision])
      toast.warning('Agent needs your input', {
        action: {
          label: 'View',
          onClick: () => setActiveDecision(decision),
        },
      })
    })

    agentManager.on('decisionResolved', ({ decisionId }) => {
      setDecisionRequests((prev) => prev.filter((d) => d.id !== decisionId))
    })

    // Initialize agents
    setAgents(agentManager.getAgentStatuses())

    return () => {
      agentManager.removeAllListeners()
    }
  }, [agentManager])

  // Parse missions on mount
  useEffect(() => {
    const loadMissions = async () => {
      const parsedMissions = await parseMissions()
      setMissions(parsedMissions)
      setMissionQueue(parsedMissions)
    }
    loadMissions()
  }, [])

  const handleStart = async () => {
    if (
      !isDevelopmentMode &&
      !process.env.ANTHROPIC_API_KEY &&
      !import.meta.env.VITE_ANTHROPIC_API_KEY
    ) {
      toast.error('ANTHROPIC_API_KEY not found in environment variables')
      return
    }

    setIsInitializing(true)
    try {
      // Add missions to the agent manager
      agentManager.addMissions(missionQueue)

      // Start the agents
      await agentManager.start()
    } catch (error) {
      toast.error('Failed to start agents: ' + error)
      console.error(error)
    } finally {
      setIsInitializing(false)
    }
  }

  const handlePause = async () => {
    await agentManager.stop()
  }

  const handleReset = async () => {
    await agentManager.reset()
    setMissionQueue(missions)
    setCompletedMissions([])
  }

  const handleDecisionSubmit = async () => {
    if (!activeDecision || !decisionResponse) return

    await agentManager.respondToDecision(activeDecision.id, decisionResponse)
    setActiveDecision(null)
    setDecisionResponse('')
    toast.success('Decision sent to agent')
  }

  // Update agent statuses periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (isRunning) {
        setAgents(agentManager.getAgentStatuses())
        setMissionQueue(agentManager.getMissionQueue())
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [isRunning, agentManager])

  return (
    <div className='container mx-auto space-y-6 p-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-3xl font-bold text-transparent'>
            GTM Studio
            <Badge
              variant={isDevelopmentMode ? 'outline' : 'secondary'}
              className='ml-2'
            >
              <Terminal className='mr-1 h-3 w-3' />
              {isDevelopmentMode ? 'Dev Mode' : 'Claude Code Powered'}
            </Badge>
          </h1>
          <p className='text-muted-foreground mt-1'>
            Real AI Agent Orchestration for Go-to-Market Strategy
          </p>
        </div>

        <div className='flex items-center gap-2'>
          <Button
            variant={isRunning ? 'secondary' : 'default'}
            size='sm'
            onClick={isRunning ? handlePause : handleStart}
            disabled={isInitializing}
          >
            {isInitializing ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                Initializing...
              </>
            ) : isRunning ? (
              <>
                <Pause className='mr-2 h-4 w-4' />
                Pause
              </>
            ) : (
              <>
                <Play className='mr-2 h-4 w-4' />
                Start Agents
              </>
            )}
          </Button>
          <Button variant='outline' size='sm' onClick={handleReset}>
            <RotateCcw className='mr-2 h-4 w-4' />
            Reset
          </Button>
        </div>
      </div>

      {/* API Key Alert */}
      {!isDevelopmentMode &&
        !process.env.ANTHROPIC_API_KEY &&
        !import.meta.env.VITE_ANTHROPIC_API_KEY && (
          <Alert variant='destructive'>
            <AlertCircle className='h-4 w-4' />
            <AlertTitle>API Key Required</AlertTitle>
            <AlertDescription>
              Please set ANTHROPIC_API_KEY in your environment variables to use
              Claude agents.
            </AlertDescription>
          </Alert>
        )}

      {/* Development Mode Notice */}
      {isDevelopmentMode && (
        <Alert className='border-yellow-500/20 bg-yellow-500/5'>
          <Zap className='h-4 w-4 text-yellow-500' />
          <AlertTitle>Development Mode Active</AlertTitle>
          <AlertDescription>
            Running simulated agents for testing. Switch to production mode to
            use real Claude Code agents.
          </AlertDescription>
        </Alert>
      )}

      {/* Mission Overview */}
      <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
        <Card className='border-purple-500/20 bg-purple-500/5'>
          <CardHeader className='pb-3'>
            <CardTitle className='text-sm font-medium'>
              Total Missions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{missions.length}</div>
          </CardContent>
        </Card>

        <Card className='border-blue-500/20 bg-blue-500/5'>
          <CardHeader className='pb-3'>
            <CardTitle className='text-sm font-medium'>In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {agents.filter((a) => a.status === 'working').length}
            </div>
          </CardContent>
        </Card>

        <Card className='border-green-500/20 bg-green-500/5'>
          <CardHeader className='pb-3'>
            <CardTitle className='text-sm font-medium'>Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{completedMissions.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Agent Grid */}
      <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
        {agents.map((agent) => (
          <Card
            key={agent.id}
            className={cn(
              'relative overflow-hidden transition-all duration-300',
              agent.borderColor,
              agent.status === 'working' &&
                'ring-offset-background animate-pulse ring-2 ring-offset-2'
            )}
          >
            <div className={cn('absolute inset-0 opacity-5', agent.bgColor)} />

            <CardHeader className='relative'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <div className={cn('rounded-lg p-2', agent.bgColor)}>
                    <agent.icon className={cn('h-5 w-5', agent.color)} />
                  </div>
                  <div>
                    <CardTitle className='flex items-center gap-2 text-base'>
                      {agent.name}
                      <Badge variant='outline' className='text-xs'>
                        <Bot className='mr-1 h-3 w-3' />
                        Claude
                      </Badge>
                    </CardTitle>
                    <div className='mt-1 flex items-center gap-2'>
                      <Badge
                        variant={
                          agent.status === 'working'
                            ? 'default'
                            : agent.status === 'blocked'
                              ? 'destructive'
                              : 'secondary'
                        }
                        className='text-xs'
                      >
                        {agent.status}
                      </Badge>
                      {agent.completedMissions > 0 && (
                        <span className='text-muted-foreground text-xs'>
                          {agent.completedMissions} completed
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className='relative space-y-3'>
              {agent.currentMission && (
                <div className='space-y-2'>
                  <div className='flex items-center gap-2'>
                    <Target className='text-muted-foreground h-4 w-4' />
                    <span className='text-sm font-medium'>Current Mission</span>
                  </div>
                  <p className='text-muted-foreground text-sm'>
                    {agent.currentMission.title}
                  </p>
                  <Progress value={agent.progress} className='h-2' />
                </div>
              )}

              {agent.thoughts.length > 0 && (
                <div className='space-y-2'>
                  <div className='flex items-center gap-2'>
                    <MessageSquare className='text-muted-foreground h-4 w-4' />
                    <span className='text-sm font-medium'>Live Thoughts</span>
                  </div>
                  <ScrollArea className='h-24'>
                    <div className='space-y-1'>
                      {agent.thoughts.map((thought) => (
                        <div
                          key={thought.id}
                          className={cn(
                            'rounded-lg p-2 font-mono text-xs',
                            thought.type === 'decision'
                              ? 'border border-yellow-500/20 bg-yellow-500/10'
                              : thought.type === 'error'
                                ? 'border border-red-500/20 bg-red-500/10'
                                : 'bg-muted'
                          )}
                        >
                          {thought.type === 'decision' && (
                            <AlertCircle className='mr-1 inline h-3 w-3 text-yellow-500' />
                          )}
                          {thought.type === 'error' && (
                            <AlertCircle className='mr-1 inline h-3 w-3 text-red-500' />
                          )}
                          {thought.content}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {agent.status === 'idle' && !agent.currentMission && (
                <div className='text-muted-foreground flex h-24 items-center justify-center'>
                  <Clock className='mr-2 h-4 w-4' />
                  <span className='text-sm'>Waiting for mission...</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Mission Queue */}
      <Tabs defaultValue='queue' className='w-full'>
        <TabsList className='grid w-full grid-cols-3'>
          <TabsTrigger value='queue'>
            Mission Queue ({missionQueue.length})
          </TabsTrigger>
          <TabsTrigger value='active'>
            Active Missions (
            {agents.filter((a) => a.status === 'working').length})
          </TabsTrigger>
          <TabsTrigger value='completed'>
            Completed ({completedMissions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value='queue' className='space-y-2'>
          <ScrollArea className='h-64'>
            {missionQueue.length === 0 ? (
              <div className='text-muted-foreground flex h-32 items-center justify-center'>
                <Sparkles className='mr-2 h-4 w-4' />
                <span>No missions in queue</span>
              </div>
            ) : (
              <div className='space-y-2'>
                {missionQueue.map((mission) => (
                  <Card key={mission.id} className='p-3'>
                    <div className='flex items-start gap-3'>
                      <Badge variant='outline'>{mission.agentType}</Badge>
                      <div className='flex-1'>
                        <h4 className='text-sm font-medium'>{mission.title}</h4>
                        <p className='text-muted-foreground mt-1 text-xs'>
                          {mission.description}
                        </p>
                        <div className='mt-2 flex items-center gap-2'>
                          <Badge variant='secondary' className='text-xs'>
                            {mission.priority}
                          </Badge>
                          <span className='text-muted-foreground text-xs'>
                            Week {mission.week}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value='active' className='space-y-2'>
          <ScrollArea className='h-64'>
            {agents
              .filter((a) => a.status === 'working')
              .map((agent) => (
                <Card key={agent.id} className='p-3'>
                  <div className='flex items-start gap-3'>
                    <div className={cn('rounded-lg p-2', agent.bgColor)}>
                      <agent.icon className={cn('h-4 w-4', agent.color)} />
                    </div>
                    <div className='flex-1'>
                      <h4 className='text-sm font-medium'>
                        {agent.currentMission?.title}
                      </h4>
                      <p className='text-muted-foreground mt-1 text-xs'>
                        Assigned to {agent.name}
                      </p>
                      <Progress value={agent.progress} className='mt-2 h-2' />
                    </div>
                  </div>
                </Card>
              ))}
          </ScrollArea>
        </TabsContent>

        <TabsContent value='completed' className='space-y-2'>
          <ScrollArea className='h-64'>
            {completedMissions.length === 0 ? (
              <div className='text-muted-foreground flex h-32 items-center justify-center'>
                <CheckCircle2 className='mr-2 h-4 w-4' />
                <span>No completed missions yet</span>
              </div>
            ) : (
              <div className='space-y-2'>
                {completedMissions.map((mission) => (
                  <Card key={mission.id} className='p-3'>
                    <div className='flex items-start gap-3'>
                      <CheckCircle2 className='mt-0.5 h-4 w-4 text-green-500' />
                      <div className='flex-1'>
                        <h4 className='text-sm font-medium'>{mission.title}</h4>
                        <p className='text-muted-foreground mt-1 text-xs'>
                          {mission.description}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Decision Points */}
      {decisionRequests.length > 0 && (
        <Alert className='border-yellow-500/20 bg-yellow-500/5'>
          <AlertCircle className='h-4 w-4 text-yellow-500' />
          <AlertDescription>
            <span className='font-medium'>
              {decisionRequests.length} Decision
              {decisionRequests.length > 1 ? 's' : ''} Required:
            </span>{' '}
            Agent{decisionRequests.length > 1 ? 's need' : ' needs'} your input
            to proceed.
            <Button
              size='sm'
              variant='outline'
              className='ml-2'
              onClick={() => setActiveDecision(decisionRequests[0])}
            >
              Review
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Decision Dialog */}
      <Dialog
        open={!!activeDecision}
        onOpenChange={(open) => !open && setActiveDecision(null)}
      >
        <DialogContent className='sm:max-w-[525px]'>
          <DialogHeader>
            <DialogTitle>Agent Decision Required</DialogTitle>
            <DialogDescription>
              {activeDecision &&
                `${activeDecision.agentType} agent needs your input`}
            </DialogDescription>
          </DialogHeader>
          <div className='grid gap-4 py-4'>
            <div className='space-y-2'>
              <Label>Question</Label>
              <p className='text-muted-foreground text-sm'>
                {activeDecision?.question}
              </p>
            </div>
            {activeDecision?.context && (
              <div className='space-y-2'>
                <Label>Context</Label>
                <p className='text-muted-foreground text-sm'>
                  {activeDecision.context}
                </p>
              </div>
            )}
            {activeDecision?.options && activeDecision.options.length > 0 ? (
              <div className='space-y-2'>
                <Label>Options</Label>
                <RadioGroup
                  value={decisionResponse}
                  onValueChange={setDecisionResponse}
                >
                  {activeDecision.options.map((option, idx) => (
                    <div key={idx} className='flex items-center space-x-2'>
                      <RadioGroupItem value={option} id={`option-${idx}`} />
                      <Label htmlFor={`option-${idx}`} className='font-normal'>
                        {option}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            ) : (
              <div className='space-y-2'>
                <Label htmlFor='response'>Your Response</Label>
                <Textarea
                  id='response'
                  value={decisionResponse}
                  onChange={(e) => setDecisionResponse(e.target.value)}
                  placeholder='Enter your decision or guidance...'
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setActiveDecision(null)}>
              Cancel
            </Button>
            <Button onClick={handleDecisionSubmit} disabled={!decisionResponse}>
              Send Response
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
