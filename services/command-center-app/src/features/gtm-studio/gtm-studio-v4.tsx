import React, { useState, useEffect } from 'react'
import {
  Target,
  CheckCircle2,
  Clock,
  Zap,
  TrendingUp,
  Users,
  Bot,
  ChevronRight,
  Milestone,
  Calendar,
  MessageSquare,
  AlertTriangle,
  Play,
  Pause,
  RotateCcw,
  Hash,
  Sparkles,
  Rocket,
  ArrowRight,
  Timer,
  BellRing,
  Filter,
  MoreHorizontal,
  Edit,
  Star,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import {
  loadGTMData,
  getTasksDueToday,
  getOverdueTasks,
  getTodaysPosition,
} from './services/gtm-file-service'
import { GTMPhase, GTMTask, GTMRisk, TaskStatus, TaskOwner } from './types'

const ownerColors: Record<
  TaskOwner,
  { bg: string; text: string; icon: string }
> = {
  PM: {
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    text: 'text-purple-700 dark:text-purple-300',
    icon: '🎯',
  },
  BE: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-700 dark:text-blue-300',
    icon: '⚙️',
  },
  CR: {
    bg: 'bg-pink-100 dark:bg-pink-900/30',
    text: 'text-pink-700 dark:text-pink-300',
    icon: '✨',
  },
  HC: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-700 dark:text-green-300',
    icon: '🚀',
  },
}

const statusColors: Record<TaskStatus, { bg: string; text: string }> = {
  'not-started': {
    bg: 'bg-gray-100 dark:bg-gray-800',
    text: 'text-gray-600 dark:text-gray-400',
  },
  'in-progress': {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-700 dark:text-blue-300',
  },
  completed: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-700 dark:text-green-300',
  },
  blocked: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-700 dark:text-red-300',
  },
}

export default function GTMStudioV4() {
  const [phases, setPhases] = useState<GTMPhase[]>([])
  const [risks, setRisks] = useState<GTMRisk[]>([])
  const [ownerLegend, setOwnerLegend] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPhase, setSelectedPhase] = useState<number | null>(null)

  // Load GTM data on mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        const { phases, risks, ownerLegend } = await loadGTMData()
        setPhases(phases)
        setRisks(risks)
        setOwnerLegend(ownerLegend)
      } catch (error) {
        console.error('Failed to load GTM data:', error)
        toast.error('Failed to load GTM data')
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [])

  const todaysPosition = getTodaysPosition(phases)
  const tasksDueToday = getTasksDueToday(phases)
  const overdueTasks = getOverdueTasks(phases)
  const totalTasks = phases.reduce((acc, phase) => acc + phase.tasks.length, 0)
  const completedTasks = phases.reduce(
    (acc, phase) =>
      acc + phase.tasks.filter((t) => t.status === 'completed').length,
    0
  )
  const overallProgress =
    totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

  const updateTaskStatus = (taskId: string, status: TaskStatus) => {
    setPhases((prevPhases) =>
      prevPhases.map((phase) => ({
        ...phase,
        tasks: phase.tasks.map((task) =>
          task.id === taskId ? { ...task, status } : task
        ),
      }))
    )
    toast.success(`Task marked as ${status.replace('-', ' ')}`)
  }

  const assignAgentToTask = (taskId: string) => {
    setPhases((prevPhases) =>
      prevPhases.map((phase) => ({
        ...phase,
        tasks: phase.tasks.map((task) =>
          task.id === taskId ? { ...task, assignedAgent: 'ai-agent-1' } : task
        ),
      }))
    )
    toast.success('Task assigned to AI agent')
  }

  if (isLoading) {
    return (
      <div className='flex h-[50vh] items-center justify-center'>
        <div className='text-center'>
          <div className='relative'>
            <div className='mx-auto mb-4 h-16 w-16 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 blur-xl' />
            <Sparkles className='absolute inset-0 m-auto mx-auto mb-4 h-8 w-8 animate-pulse text-purple-500' />
          </div>
          <p className='text-muted-foreground'>Loading mission control...</p>
        </div>
      </div>
    )
  }

  return (
    <div className='animate-in fade-in space-y-8 duration-700'>
      {/* Header Section */}
      <div className='animate-in slide-in-from-top flex flex-col gap-2 duration-500'>
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-3xl font-black tracking-tight text-transparent uppercase'>
              <span className='text-5xl text-white'>🚀 </span> GTM
              <span className='text-3xl text-white'>Studio</span>
            </h1>
            <p className='text-muted-foreground mt-1'>
              Launch mission control for TikTok go-to-market
            </p>
          </div>
          <div className='flex items-center space-x-2'>
            <Badge variant='outline' className='glass-card gap-2'>
              <Timer className='h-3 w-3' />
              Phase {todaysPosition.phase}, Day {todaysPosition.day}
            </Badge>
            <Button className='gap-2 bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg transition-all duration-300 hover:from-purple-600 hover:to-pink-600 hover:shadow-purple-500/25'>
              <Rocket size={18} />
              Launch Mission
            </Button>
          </div>
        </div>
      </div>

      {/* Mission Overview Card */}
      <div className='animate-in slide-in-from-bottom animation-delay-200 relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-orange-500/10 backdrop-blur-sm duration-600'>
        <div className='absolute -top-10 -right-10 h-40 w-40 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 blur-3xl' />
        <div className='absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-gradient-to-br from-indigo-500/20 to-blue-500/20 blur-3xl' />
        <div className='relative p-8'>
          <div className='mb-6 flex items-center justify-between'>
            <div>
              <h2 className='mb-2 text-2xl font-bold'>Mission Progress</h2>
              <p className='text-muted-foreground'>
                TikTok Go-to-Market Launch Campaign
              </p>
            </div>
            <div className='text-center'>
              <div className='mb-1 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-4xl font-black text-transparent'>
                {Math.round(overallProgress)}%
              </div>
              <p className='text-muted-foreground text-sm'>Complete</p>
            </div>
          </div>

          <div className='mb-6'>
            <Progress value={overallProgress} className='mb-2 h-3' />
            <div className='text-muted-foreground flex justify-between text-sm'>
              <span>{completedTasks} tasks completed</span>
              <span>{totalTasks - completedTasks} remaining</span>
            </div>
          </div>

          <div className='grid grid-cols-2 gap-6 md:grid-cols-4'>
            <div className='rounded-xl border border-white/10 bg-white/5 p-4 text-center backdrop-blur-sm'>
              <div className='mb-1 text-2xl font-bold text-blue-500'>
                {tasksDueToday.length}
              </div>
              <p className='text-muted-foreground text-xs'>Due Today</p>
            </div>
            <div className='rounded-xl border border-white/10 bg-white/5 p-4 text-center backdrop-blur-sm'>
              <div className='mb-1 text-2xl font-bold text-red-500'>
                {overdueTasks.length}
              </div>
              <p className='text-muted-foreground text-xs'>Overdue</p>
            </div>
            <div className='rounded-xl border border-white/10 bg-white/5 p-4 text-center backdrop-blur-sm'>
              <div className='mb-1 text-2xl font-bold text-green-500'>
                {completedTasks}
              </div>
              <p className='text-muted-foreground text-xs'>Completed</p>
            </div>
            <div className='rounded-xl border border-white/10 bg-white/5 p-4 text-center backdrop-blur-sm'>
              <div className='mb-1 text-2xl font-bold text-purple-500'>
                {phases.length}
              </div>
              <p className='text-muted-foreground text-xs'>Phases</p>
            </div>
          </div>
        </div>
      </div>

      {/* Phase Timeline */}
      <div className='animate-in slide-in-from-left animation-delay-400 duration-600'>
        <h3 className='mb-6 text-xl font-bold'>Launch Phases</h3>
        <div className='relative'>
          <div className='flex gap-3 overflow-x-auto pb-4'>
            {phases.map((phase, index) => (
              <div
                key={phase.id}
                className={cn(
                  'relative w-72 flex-shrink-0 cursor-pointer rounded-xl border p-6 transition-all duration-300 hover:shadow-lg',
                  'border-white/10 bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-sm',
                  phase.hasMilestone && 'ring-2 ring-yellow-500/30',
                  selectedPhase === phase.id
                    ? 'scale-105 ring-2 ring-purple-500/50'
                    : 'hover:scale-102'
                )}
                onClick={() =>
                  setSelectedPhase(selectedPhase === phase.id ? null : phase.id)
                }
              >
                {/* Phase Number Badge */}
                <div className='absolute -top-3 -left-3 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-sm font-bold text-white shadow-lg'>
                  {index + 1}
                </div>

                {/* Milestone Star */}
                {phase.hasMilestone && (
                  <div className='absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-orange-500'>
                    <Star className='h-3 w-3 fill-white text-white' />
                  </div>
                )}

                <div className='space-y-4'>
                  <div>
                    <h4 className='mb-1 text-lg font-bold'>{phase.title}</h4>
                    <p className='text-muted-foreground mb-2 text-sm'>
                      {phase.subtitle}
                    </p>
                    <p className='text-muted-foreground flex items-center gap-1 text-xs'>
                      <Calendar className='h-3 w-3' />
                      {phase.dateRange}
                    </p>
                  </div>

                  <div>
                    <div className='mb-2 flex items-center justify-between'>
                      <span className='text-sm font-medium'>Progress</span>
                      <span className='text-sm font-bold text-purple-600'>
                        {Math.round(phase.progress)}%
                      </span>
                    </div>
                    <Progress value={phase.progress} className='h-2' />
                  </div>

                  <div className='flex items-center justify-between text-sm'>
                    <span className='text-muted-foreground'>
                      {phase.tasks.length} tasks
                    </span>
                    <span className='font-medium text-green-600'>
                      {
                        phase.tasks.filter((t) => t.status === 'completed')
                          .length
                      }{' '}
                      done
                    </span>
                  </div>
                </div>

                {/* Connector */}
                {index < phases.length - 1 && (
                  <div className='absolute top-1/2 -right-1.5 h-0.5 w-3 bg-gradient-to-r from-purple-500 to-transparent' />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Today's Priority Tasks */}
      {tasksDueToday.length > 0 && (
        <div className='animate-in slide-in-from-right animation-delay-600 rounded-2xl border border-blue-200/50 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 p-6 backdrop-blur-sm duration-600 dark:border-blue-800/50 dark:from-blue-950/20 dark:to-indigo-950/20'>
          <div className='mb-6 flex items-center gap-3'>
            <div className='flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600'>
              <Zap className='h-5 w-5 text-white' />
            </div>
            <div>
              <h3 className='text-lg font-bold'>Today's Priority</h3>
              <p className='text-muted-foreground text-sm'>
                {tasksDueToday.length} tasks need attention
              </p>
            </div>
          </div>

          <div className='grid gap-4'>
            {tasksDueToday.slice(0, 3).map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                ownerLegend={ownerLegend}
                onStatusChange={updateTaskStatus}
                onAssignAgent={assignAgentToTask}
                priority
              />
            ))}
            {tasksDueToday.length > 3 && (
              <div className='rounded-lg border border-white/10 bg-white/20 p-4 text-center'>
                <p className='text-muted-foreground text-sm'>
                  +{tasksDueToday.length - 3} more tasks due today
                </p>
                <Button variant='ghost' size='sm' className='mt-2'>
                  View All <ArrowRight className='ml-1 h-3 w-3' />
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Phase Tasks (when phase is selected) */}
      {selectedPhase && (
        <div className='space-y-4'>
          {phases
            .filter((phase) => phase.id === selectedPhase)
            .map((phase) => (
              <div
                key={phase.id}
                className='rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/10 p-6 backdrop-blur-sm'
              >
                <div className='mb-6 flex items-center justify-between'>
                  <div className='flex items-center gap-3'>
                    <div className='flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 font-bold text-white'>
                      {selectedPhase}
                    </div>
                    <div>
                      <h3 className='text-lg font-bold'>{phase.title}</h3>
                      <p className='text-muted-foreground text-sm'>
                        {phase.subtitle}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => setSelectedPhase(null)}
                  >
                    Close
                  </Button>
                </div>

                <div className='space-y-3'>
                  {phase.tasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      ownerLegend={ownerLegend}
                      onStatusChange={updateTaskStatus}
                      onAssignAgent={assignAgentToTask}
                    />
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Risks & Blockers */}
      {risks.length > 0 && (
        <div className='rounded-2xl border border-yellow-200/50 bg-gradient-to-br from-yellow-50/50 to-orange-50/50 p-6 backdrop-blur-sm dark:border-yellow-800/50 dark:from-yellow-950/20 dark:to-orange-950/20'>
          <div className='mb-6 flex items-center gap-3'>
            <div className='flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-yellow-500 to-orange-600'>
              <AlertTriangle className='h-5 w-5 text-white' />
            </div>
            <div>
              <h3 className='text-lg font-bold'>Mission Risks</h3>
              <p className='text-muted-foreground text-sm'>
                {risks.length} items need decisions
              </p>
            </div>
          </div>

          <div className='grid gap-3'>
            {risks.map((risk) => (
              <div
                key={risk.id}
                className='rounded-lg border border-white/10 bg-white/20 p-4 transition-colors hover:bg-white/30'
              >
                <div className='flex items-start gap-3'>
                  <div className='mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-yellow-500' />
                  <div className='flex-1'>
                    <p className='mb-1 text-sm font-medium'>{risk.question}</p>
                    {risk.dueDate && (
                      <p className='text-muted-foreground flex items-center gap-1 text-xs'>
                        <Clock className='h-3 w-3' />
                        Decision needed by {risk.dueDate}
                      </p>
                    )}
                  </div>
                  <Badge variant='outline' className='text-xs'>
                    {risk.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Beautiful Task Card Component
function TaskCard({
  task,
  ownerLegend,
  onStatusChange,
  onAssignAgent,
  priority = false,
}: {
  task: GTMTask
  ownerLegend: Record<string, string>
  onStatusChange: (taskId: string, status: TaskStatus) => void
  onAssignAgent: (taskId: string) => void
  priority?: boolean
}) {
  const ownerStyle = ownerColors[task.owner]
  const statusStyle = statusColors[task.status]

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-lg',
        priority
          ? 'border-white/20 bg-gradient-to-br from-white/10 to-white/5'
          : 'border-white/10 bg-gradient-to-br from-white/5 to-white/10',
        task.status === 'completed' && 'opacity-75',
        task.isMilestone && 'ring-2 shadow-yellow-500/10 ring-yellow-500/30',
        'p-4'
      )}
    >
      {/* Milestone glow effect */}
      {task.isMilestone && (
        <div className='absolute -right-4 -bottom-4 h-20 w-20 rounded-full bg-gradient-to-br from-yellow-400/20 to-orange-500/20 blur-2xl' />
      )}

      <div className='relative'>
        <div className='flex items-start gap-4'>
          <div className='mt-1'>
            <Checkbox
              checked={task.status === 'completed'}
              onCheckedChange={(checked) =>
                onStatusChange(task.id, checked ? 'completed' : 'not-started')
              }
              className='h-5 w-5'
            />
          </div>

          <div className='flex-1 space-y-3'>
            {/* Header with badges */}
            <div className='flex flex-wrap items-center gap-2'>
              <Badge
                variant='outline'
                className='bg-white/10 font-mono text-xs'
              >
                #{task.taskNumber}
              </Badge>
              <Badge className={cn('text-xs', ownerStyle.bg, ownerStyle.text)}>
                <span className='mr-1'>{ownerStyle.icon}</span>
                {task.owner}
              </Badge>
              {task.isMilestone && (
                <Badge className='bg-gradient-to-r from-yellow-500 to-orange-500 text-xs text-white'>
                  <Star className='mr-1 h-2 w-2' />
                  Milestone
                </Badge>
              )}
              <Badge
                className={cn('text-xs', statusStyle.bg, statusStyle.text)}
              >
                {task.status === 'completed' && (
                  <CheckCircle2 className='mr-1 h-2 w-2' />
                )}
                {task.status === 'in-progress' && (
                  <Clock className='mr-1 h-2 w-2' />
                )}
                {task.status === 'blocked' && (
                  <AlertTriangle className='mr-1 h-2 w-2' />
                )}
                {task.status.replace('-', ' ')}
              </Badge>
            </div>

            {/* Task title */}
            <h4
              className={cn(
                'text-base leading-tight font-semibold',
                task.status === 'completed' &&
                  'text-muted-foreground line-through'
              )}
            >
              {task.title}
            </h4>

            {/* Task meta */}
            <div className='flex items-center justify-between'>
              <div className='text-muted-foreground flex items-center gap-3 text-sm'>
                <span className='flex items-center gap-1'>
                  <Calendar className='h-3 w-3' />
                  {task.dueDate}
                </span>
                {task.dependencies.length > 0 && (
                  <span className='flex items-center gap-1'>
                    <ArrowRight className='h-3 w-3' />
                    {task.dependencies.length} dep
                    {task.dependencies.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {/* Action buttons */}
              <div className='flex items-center gap-2'>
                {task.status !== 'completed' && !task.assignedAgent && (
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => onAssignAgent(task.id)}
                    className='h-8 bg-white/10 px-3 text-xs opacity-0 transition-opacity group-hover:opacity-100 hover:bg-white/20'
                  >
                    <Bot className='mr-1 h-3 w-3' />
                    Assign AI
                  </Button>
                )}
                {task.assignedAgent && (
                  <Badge
                    variant='outline'
                    className='gap-1 bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-xs'
                  >
                    <Bot className='h-3 w-3' />
                    AI Agent
                  </Badge>
                )}
                <Button
                  variant='ghost'
                  size='sm'
                  className='h-8 w-8 p-0 opacity-0 transition-opacity group-hover:opacity-100'
                >
                  <MoreHorizontal className='h-3 w-3' />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
