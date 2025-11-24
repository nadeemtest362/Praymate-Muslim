import React, { useEffect, useState } from 'react'
import { Brain, Zap, AlertCircle, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { supabase } from '../services/supabase-service'

interface AgentThought {
  id: string
  agent_id: string
  task_id: string
  thought_type: string
  content: string
  created_at: string
  agent?: {
    name: string
    type: string
  }
}

interface AgentThoughtsPanelProps {
  taskId?: string
  agentId?: string
  className?: string
}

const thoughtTypeConfig = {
  planning: { icon: Brain, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  progress: { icon: Zap, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  error: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-500/10' },
  insight: {
    icon: CheckCircle,
    color: 'text-green-500',
    bg: 'bg-green-500/10',
  },
}

export function AgentThoughtsPanel({
  taskId,
  agentId,
  className,
}: AgentThoughtsPanelProps) {
  const [thoughts, setThoughts] = useState<AgentThought[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadThoughts()

    // Subscribe to real-time updates
    const subscription = supabase
      .channel('agent-thoughts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'gtm_agent_thoughts',
          filter: taskId ? `task_id=eq.${taskId}` : undefined,
        },
        (payload) => {
          setThoughts((prev) => [payload.new as AgentThought, ...prev])
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [taskId, agentId])

  const loadThoughts = async () => {
    setIsLoading(true)
    try {
      let query = supabase
        .from('gtm_agent_thoughts')
        .select(
          `
          *,
          agent:gtm_agents(name, type)
        `
        )
        .order('created_at', { ascending: false })
        .limit(50)

      if (taskId) query = query.eq('task_id', taskId)
      if (agentId) query = query.eq('agent_id', agentId)

      const { data, error } = await query

      if (error) throw error
      setThoughts(data || [])
    } catch (error) {
      console.error('Failed to load agent thoughts:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <Card className={cn('glass-card', className)}>
        <CardContent className='p-4'>
          <p className='text-muted-foreground text-sm'>
            Loading agent thoughts...
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('glass-card border-white/10', className)}>
      <CardHeader className='pb-3'>
        <CardTitle className='flex items-center gap-2 text-sm font-medium'>
          <Brain className='h-4 w-4' />
          Agent Thoughts
        </CardTitle>
      </CardHeader>
      <CardContent className='p-0'>
        <ScrollArea className='h-64'>
          <div className='space-y-2 p-4 pt-0'>
            {thoughts.length === 0 ? (
              <p className='text-muted-foreground py-8 text-center text-sm'>
                No agent thoughts yet
              </p>
            ) : (
              thoughts.map((thought) => {
                const config =
                  thoughtTypeConfig[
                    thought.thought_type as keyof typeof thoughtTypeConfig
                  ] || thoughtTypeConfig.progress
                const Icon = config.icon

                return (
                  <div key={thought.id} className='space-y-1'>
                    <div className='flex items-start gap-2'>
                      <div className={cn('mt-0.5 rounded-full p-1', config.bg)}>
                        <Icon className={cn('h-3 w-3', config.color)} />
                      </div>
                      <div className='flex-1 space-y-1'>
                        <div className='flex items-center gap-2'>
                          <span className='text-xs font-medium'>
                            {thought.agent?.name || 'Agent'}
                          </span>
                          <Badge variant='outline' className='h-4 py-0 text-xs'>
                            {thought.thought_type}
                          </Badge>
                          <span className='text-muted-foreground ml-auto text-xs'>
                            {new Date(thought.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className='text-muted-foreground text-sm'>
                          {thought.content}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
