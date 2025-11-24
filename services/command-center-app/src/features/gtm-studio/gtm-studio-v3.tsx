import React, { useState, useEffect } from 'react'
import {
  Brain,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  Target,
  AlertTriangle,
  TrendingUp,
  Zap,
  Filter,
  ChevronRight,
  Play,
  Pause,
  RotateCcw,
  Edit,
  MessageSquare,
  Bot,
  Milestone,
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
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  loadGTMData,
  getTasksDueToday,
  getOverdueTasks,
  getTodaysPosition,
} from './services/gtm-file-service'
import { GTMPhase, GTMTask, GTMRisk, TaskStatus, TaskOwner } from './types'

const ownerColors: Record<
  TaskOwner,
  { bg: string; text: string; border: string }
> = {
  PM: {
    bg: 'bg-purple-500/10',
    text: 'text-purple-700',
    border: 'border-purple-500/20',
  },
  BE: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-700',
    border: 'border-blue-500/20',
  },
  CR: {
    bg: 'bg-pink-500/10',
    text: 'text-pink-700',
    border: 'border-pink-500/20',
  },
  HC: {
    bg: 'bg-green-500/10',
    text: 'text-green-700',
    border: 'border-green-500/20',
  },
}

const statusColors: Record<TaskStatus, { bg: string; text: string }> = {
  'not-started': { bg: 'bg-gray-100', text: 'text-gray-600' },
  'in-progress': { bg: 'bg-blue-100', text: 'text-blue-700' },
  completed: { bg: 'bg-green-100', text: 'text-green-700' },
  blocked: { bg: 'bg-red-100', text: 'text-red-700' },
}

export default function GTMStudioV3() {
  const [phases, setPhases] = useState<GTMPhase[]>([])
  const [risks, setRisks] = useState<GTMRisk[]>([])
  const [ownerLegend, setOwnerLegend] = useState<Record<string, string>>({})
  const [selectedPhase, setSelectedPhase] = useState<number | null>(null)
  const [selectedOwner, setSelectedOwner] = useState<TaskOwner | null>(null)
  const [selectedTask, setSelectedTask] = useState<GTMTask | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'phase' | 'timeline' | 'owner'>(
    'phase'
  )
  const [taskNotes, setTaskNotes] = useState<Record<string, string>>({})

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

  const updateTaskStatus = (taskId: string, status: TaskStatus) => {
    setPhases((prevPhases) =>
      prevPhases.map((phase) => ({
        ...phase,
        tasks: phase.tasks.map((task) =>
          task.id === taskId ? { ...task, status } : task
        ),
      }))
    )
    toast.success(`Task ${taskId} marked as ${status}`)
  }

  const assignAgentToTask = (taskId: string, agentId: string) => {
    setPhases((prevPhases) =>
      prevPhases.map((phase) => ({
        ...phase,
        tasks: phase.tasks.map((task) =>
          task.id === taskId ? { ...task, assignedAgent: agentId } : task
        ),
      }))
    )
    toast.success(`Task ${taskId} assigned to AI agent`)
  }

  const addNoteToTask = (taskId: string, note: string) => {
    setTaskNotes((prev) => ({ ...prev, [taskId]: note }))
    toast.success('Note added to task')
  }

  // Filter tasks based on search and filters
  const filteredPhases = phases.map((phase) => ({
    ...phase,
    tasks: phase.tasks.filter((task) => {
      const matchesSearch =
        searchQuery === '' ||
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.taskNumber.includes(searchQuery)
      const matchesOwner = !selectedOwner || task.owner === selectedOwner
      return matchesSearch && matchesOwner
    }),
  }))

  if (isLoading) {
    return (
      <div className='flex h-96 items-center justify-center'>
        <div className='text-center'>
          <Clock className='mx-auto mb-4 h-8 w-8 animate-spin text-gray-400' />
          <p className='text-muted-foreground'>Loading GTM data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className='container mx-auto space-y-6 p-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-3xl font-bold text-transparent'>
            GTM Studio
          </h1>
          <p className='text-muted-foreground mt-1'>
            TikTok Go-to-Market Task Execution Dashboard
          </p>
        </div>

        <div className='flex items-center gap-2'>
          <Badge variant='outline' className='gap-1'>
            <Calendar className='h-3 w-3' />
            Today: Phase {todaysPosition.phase}, Day {todaysPosition.day}
          </Badge>
        </div>
      </div>

      {/* Quick Stats */}
      <div className='grid grid-cols-1 gap-4 md:grid-cols-4'>
        <Card className='border-purple-500/20 bg-purple-500/5'>
          <CardHeader className='pb-3'>
            <CardTitle className='text-sm font-medium'>Total Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {phases.reduce((acc, phase) => acc + phase.tasks.length, 0)}
            </div>
          </CardContent>
        </Card>

        <Card className='border-blue-500/20 bg-blue-500/5'>
          <CardHeader className='pb-3'>
            <CardTitle className='text-sm font-medium'>Due Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-blue-600'>
              {tasksDueToday.length}
            </div>
          </CardContent>
        </Card>

        <Card className='border-red-500/20 bg-red-500/5'>
          <CardHeader className='pb-3'>
            <CardTitle className='text-sm font-medium'>Overdue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-red-600'>
              {overdueTasks.length}
            </div>
          </CardContent>
        </Card>

        <Card className='border-green-500/20 bg-green-500/5'>
          <CardHeader className='pb-3'>
            <CardTitle className='text-sm font-medium'>Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-green-600'>
              {phases.reduce(
                (acc, phase) =>
                  acc +
                  phase.tasks.filter((t) => t.status === 'completed').length,
                0
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className='p-4'>
          <div className='flex flex-col gap-4 md:flex-row'>
            <div className='flex-1'>
              <Input
                placeholder='Search tasks...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className='w-full'
              />
            </div>
            <Select
              value={selectedOwner || 'all'}
              onValueChange={(v) =>
                setSelectedOwner(v === 'all' ? null : (v as TaskOwner))
              }
            >
              <SelectTrigger className='w-48'>
                <SelectValue placeholder='Filter by owner' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All Owners</SelectItem>
                {Object.entries(ownerLegend).map(([key, value]) => (
                  <SelectItem key={key} value={key}>
                    {value} ({key})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className='flex gap-2'>
              <Button
                variant={viewMode === 'phase' ? 'default' : 'outline'}
                size='sm'
                onClick={() => setViewMode('phase')}
              >
                Phase View
              </Button>
              <Button
                variant={viewMode === 'timeline' ? 'default' : 'outline'}
                size='sm'
                onClick={() => setViewMode('timeline')}
              >
                Timeline
              </Button>
              <Button
                variant={viewMode === 'owner' ? 'default' : 'outline'}
                size='sm'
                onClick={() => setViewMode('owner')}
              >
                By Owner
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Today's Focus */}
      {tasksDueToday.length > 0 && (
        <Alert className='border-blue-500/20 bg-blue-500/5'>
          <Zap className='h-4 w-4 text-blue-600' />
          <AlertTitle>Today's Focus</AlertTitle>
          <AlertDescription>
            <div className='mt-2 space-y-2'>
              {tasksDueToday.slice(0, 3).map((task) => (
                <div key={task.id} className='flex items-center gap-2'>
                  <Badge
                    variant='outline'
                    className={cn(
                      ownerColors[task.owner].bg,
                      ownerColors[task.owner].text
                    )}
                  >
                    {task.owner}
                  </Badge>
                  <span className='text-sm'>
                    {task.taskNumber}: {task.title}
                  </span>
                  {task.isMilestone && (
                    <Milestone className='h-4 w-4 text-yellow-600' />
                  )}
                </div>
              ))}
              {tasksDueToday.length > 3 && (
                <span className='text-muted-foreground text-sm'>
                  ...and {tasksDueToday.length - 3} more tasks
                </span>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
        <TabsContent value='phase' className='space-y-4'>
          {filteredPhases.map((phase) => (
            <Card
              key={phase.id}
              className={cn(
                'overflow-hidden',
                phase.hasMilestone && 'ring-2 ring-yellow-500/20'
              )}
            >
              <CardHeader
                className={cn('relative', `bg-gradient-to-r ${phase.color}`)}
              >
                <div className='flex items-center justify-between text-white'>
                  <div>
                    <CardTitle className='text-xl'>
                      {phase.title}: {phase.subtitle}
                    </CardTitle>
                    <CardDescription className='text-white/80'>
                      {phase.dateRange} • {phase.tasks.length} tasks
                    </CardDescription>
                  </div>
                  <div className='flex items-center gap-2'>
                    {phase.hasMilestone && (
                      <Badge
                        variant='secondary'
                        className='bg-yellow-500 text-yellow-900'
                      >
                        <Milestone className='mr-1 h-3 w-3' />
                        Milestone
                      </Badge>
                    )}
                    <div className='text-right'>
                      <div className='text-2xl font-bold'>
                        {Math.round(phase.progress)}%
                      </div>
                      <Progress
                        value={phase.progress}
                        className='h-2 w-24 bg-white/20'
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className='p-0'>
                <ScrollArea className='h-64'>
                  <div className='space-y-2 p-4'>
                    {phase.tasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        ownerLegend={ownerLegend}
                        notes={taskNotes[task.id]}
                        onStatusChange={updateTaskStatus}
                        onAssignAgent={assignAgentToTask}
                        onAddNote={addNoteToTask}
                        onClick={() => setSelectedTask(task)}
                      />
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value='timeline' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle>Timeline View</CardTitle>
              <CardDescription>All tasks organized by due date</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className='h-96'>
                <div className='space-y-4'>
                  {/* Group tasks by due date */}
                  {Array.from(
                    new Set(
                      phases.flatMap((p) => p.tasks.map((t) => t.dueDate))
                    )
                  )
                    .sort()
                    .map((dueDate) => {
                      const tasksForDate = phases.flatMap((p) =>
                        p.tasks.filter((t) => t.dueDate === dueDate)
                      )
                      return (
                        <div key={dueDate} className='space-y-2'>
                          <h3 className='text-muted-foreground bg-background sticky top-0 py-1 text-sm font-semibold'>
                            {dueDate}
                          </h3>
                          {tasksForDate.map((task) => (
                            <TaskCard
                              key={task.id}
                              task={task}
                              ownerLegend={ownerLegend}
                              notes={taskNotes[task.id]}
                              onStatusChange={updateTaskStatus}
                              onAssignAgent={assignAgentToTask}
                              onAddNote={addNoteToTask}
                              onClick={() => setSelectedTask(task)}
                              showPhase
                            />
                          ))}
                        </div>
                      )
                    })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='owner' className='space-y-4'>
          {Object.entries(ownerLegend).map(([owner, description]) => {
            const ownerTasks = phases.flatMap((p) =>
              p.tasks.filter((t) => t.owner === owner)
            )
            const completed = ownerTasks.filter(
              (t) => t.status === 'completed'
            ).length
            const progress =
              ownerTasks.length > 0 ? (completed / ownerTasks.length) * 100 : 0

            return (
              <Card
                key={owner}
                className={cn(
                  'overflow-hidden',
                  ownerColors[owner as TaskOwner].border
                )}
              >
                <CardHeader className={cn(ownerColors[owner as TaskOwner].bg)}>
                  <div className='flex items-center justify-between'>
                    <div>
                      <CardTitle className='text-lg'>
                        {description} ({owner})
                      </CardTitle>
                      <CardDescription>
                        {ownerTasks.length} tasks • {completed} completed
                      </CardDescription>
                    </div>
                    <div className='text-right'>
                      <div className='text-xl font-bold'>
                        {Math.round(progress)}%
                      </div>
                      <Progress value={progress} className='h-2 w-24' />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className='p-0'>
                  <ScrollArea className='h-64'>
                    <div className='space-y-2 p-4'>
                      {ownerTasks.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          ownerLegend={ownerLegend}
                          notes={taskNotes[task.id]}
                          onStatusChange={updateTaskStatus}
                          onAssignAgent={assignAgentToTask}
                          onAddNote={addNoteToTask}
                          onClick={() => setSelectedTask(task)}
                          showPhase
                        />
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )
          })}
        </TabsContent>
      </Tabs>

      {/* Risks Section */}
      {risks.length > 0 && (
        <Card className='border-yellow-500/20'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <AlertTriangle className='h-5 w-5 text-yellow-600' />
              Open Questions & Risks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='space-y-3'>
              {risks.map((risk) => (
                <div
                  key={risk.id}
                  className='flex items-start gap-3 rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3'
                >
                  <AlertCircle className='mt-0.5 h-4 w-4 text-yellow-600' />
                  <div className='flex-1'>
                    <p className='text-sm font-medium'>{risk.question}</p>
                    {risk.dueDate && (
                      <p className='text-muted-foreground mt-1 text-xs'>
                        Decision needed by {risk.dueDate}
                      </p>
                    )}
                  </div>
                  <Badge variant='outline' className='text-xs'>
                    {risk.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Task Detail Dialog */}
      <TaskDetailDialog
        task={selectedTask}
        ownerLegend={ownerLegend}
        notes={taskNotes[selectedTask?.id || '']}
        onClose={() => setSelectedTask(null)}
        onStatusChange={updateTaskStatus}
        onAssignAgent={assignAgentToTask}
        onAddNote={addNoteToTask}
      />
    </div>
  )
}

// Task Card Component
function TaskCard({
  task,
  ownerLegend,
  notes,
  onStatusChange,
  onAssignAgent,
  onAddNote,
  onClick,
  showPhase = false,
}: {
  task: GTMTask
  ownerLegend: Record<string, string>
  notes?: string
  onStatusChange: (taskId: string, status: TaskStatus) => void
  onAssignAgent: (taskId: string, agentId: string) => void
  onAddNote: (taskId: string, note: string) => void
  onClick: () => void
  showPhase?: boolean
}) {
  return (
    <div
      className={cn(
        'hover:bg-muted/50 flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors',
        task.status === 'completed' && 'opacity-60',
        task.isMilestone && 'border-yellow-500/30 bg-yellow-500/5'
      )}
      onClick={onClick}
    >
      <Checkbox
        checked={task.status === 'completed'}
        onCheckedChange={(checked) =>
          onStatusChange(task.id, checked ? 'completed' : 'not-started')
        }
        onClick={(e) => e.stopPropagation()}
      />

      <div className='flex-1 space-y-1'>
        <div className='flex items-center gap-2'>
          <span className='text-muted-foreground font-mono text-xs'>
            {task.taskNumber}
          </span>
          <Badge
            variant='outline'
            className={cn(
              'text-xs',
              ownerColors[task.owner].bg,
              ownerColors[task.owner].text
            )}
          >
            {task.owner}
          </Badge>
          {task.isMilestone && (
            <Milestone className='h-3 w-3 text-yellow-600' />
          )}
          {task.dependencies.length > 0 && (
            <Badge variant='outline' className='text-xs'>
              → {task.dependencies.join(', ')}
            </Badge>
          )}
          {showPhase && (
            <Badge variant='outline' className='text-xs'>
              Phase {task.phase}
            </Badge>
          )}
        </div>

        <p
          className={cn(
            'text-sm',
            task.status === 'completed' && 'line-through'
          )}
        >
          {task.title}
        </p>

        {task.subtasks && task.subtasks.length > 0 && (
          <div className='mt-2 ml-4 space-y-1'>
            {task.subtasks.map((subtask) => (
              <div
                key={subtask.id}
                className='text-muted-foreground flex items-center gap-2 text-xs'
              >
                <span className='font-mono'>{subtask.id})</span>
                <span>{subtask.title}</span>
                <span className='text-xs'>• {subtask.dueDate}</span>
              </div>
            ))}
          </div>
        )}

        <div className='mt-2 flex items-center gap-4'>
          <Badge
            variant='secondary'
            className={cn(
              'text-xs',
              statusColors[task.status].bg,
              statusColors[task.status].text
            )}
          >
            {task.status}
          </Badge>
          <span className='text-muted-foreground text-xs'>{task.dueDate}</span>
          {task.assignedAgent && (
            <Badge variant='outline' className='text-xs'>
              <Bot className='mr-1 h-3 w-3' />
              AI Assigned
            </Badge>
          )}
          {notes && <MessageSquare className='text-muted-foreground h-3 w-3' />}
        </div>
      </div>

      <div
        className='flex items-center gap-1'
        onClick={(e) => e.stopPropagation()}
      >
        {task.status !== 'completed' && !task.assignedAgent && (
          <Button
            variant='ghost'
            size='sm'
            onClick={() => onAssignAgent(task.id, 'ai-agent-1')}
          >
            <Bot className='h-4 w-4' />
          </Button>
        )}
      </div>
    </div>
  )
}

// Task Detail Dialog Component
function TaskDetailDialog({
  task,
  ownerLegend,
  notes,
  onClose,
  onStatusChange,
  onAssignAgent,
  onAddNote,
}: {
  task: GTMTask | null
  ownerLegend: Record<string, string>
  notes?: string
  onClose: () => void
  onStatusChange: (taskId: string, status: TaskStatus) => void
  onAssignAgent: (taskId: string, agentId: string) => void
  onAddNote: (taskId: string, note: string) => void
}) {
  const [localNotes, setLocalNotes] = useState(notes || '')

  useEffect(() => {
    setLocalNotes(notes || '')
  }, [notes])

  if (!task) return null

  return (
    <Dialog open={!!task} onOpenChange={onClose}>
      <DialogContent className='max-w-2xl'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <span className='text-muted-foreground font-mono text-sm'>
              {task.taskNumber}
            </span>
            {task.title}
            {task.isMilestone && (
              <Milestone className='h-4 w-4 text-yellow-600' />
            )}
          </DialogTitle>
          <DialogDescription>
            Phase {task.phase}: {task.phaseTitle}
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4'>
          <div className='grid grid-cols-2 gap-4'>
            <div>
              <Label>Owner</Label>
              <div className='mt-1 flex items-center gap-2'>
                <Badge
                  className={cn(
                    ownerColors[task.owner].bg,
                    ownerColors[task.owner].text
                  )}
                >
                  {task.owner}
                </Badge>
                <span className='text-muted-foreground text-sm'>
                  {ownerLegend[task.owner]}
                </span>
              </div>
            </div>

            <div>
              <Label>Due Date</Label>
              <p className='mt-1 text-sm'>{task.dueDate}</p>
            </div>

            <div>
              <Label>Status</Label>
              <Select
                value={task.status}
                onValueChange={(v) => onStatusChange(task.id, v as TaskStatus)}
              >
                <SelectTrigger className='mt-1 w-full'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='not-started'>Not Started</SelectItem>
                  <SelectItem value='in-progress'>In Progress</SelectItem>
                  <SelectItem value='completed'>Completed</SelectItem>
                  <SelectItem value='blocked'>Blocked</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Priority</Label>
              <Badge
                variant={task.priority === 'high' ? 'destructive' : 'secondary'}
                className='mt-1'
              >
                {task.priority}
              </Badge>
            </div>
          </div>

          {task.dependencies.length > 0 && (
            <div>
              <Label>Dependencies</Label>
              <div className='mt-1 flex gap-2'>
                {task.dependencies.map((dep) => (
                  <Badge key={dep} variant='outline'>
                    → {dep}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {task.subtasks && task.subtasks.length > 0 && (
            <div>
              <Label>Subtasks</Label>
              <div className='mt-2 space-y-2'>
                {task.subtasks.map((subtask) => (
                  <div
                    key={subtask.id}
                    className='flex items-center gap-2 rounded border p-2'
                  >
                    <Checkbox checked={subtask.status === 'completed'} />
                    <span className='font-mono text-xs'>{subtask.id})</span>
                    <span className='flex-1 text-sm'>{subtask.title}</span>
                    <span className='text-muted-foreground text-xs'>
                      {subtask.dueDate}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <Label>Notes</Label>
            <Textarea
              value={localNotes}
              onChange={(e) => setLocalNotes(e.target.value)}
              placeholder='Add notes about this task...'
              className='mt-1'
              rows={4}
            />
          </div>

          <div>
            <Label>AI Agent Assignment</Label>
            <div className='mt-2 flex items-center gap-2'>
              {task.assignedAgent ? (
                <Badge variant='outline' className='gap-1'>
                  <Bot className='h-3 w-3' />
                  Assigned to AI Agent
                </Badge>
              ) : (
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => onAssignAgent(task.id, 'ai-agent-1')}
                >
                  <Bot className='mr-2 h-4 w-4' />
                  Assign to AI Agent
                </Button>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              onAddNote(task.id, localNotes)
              onClose()
            }}
          >
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
