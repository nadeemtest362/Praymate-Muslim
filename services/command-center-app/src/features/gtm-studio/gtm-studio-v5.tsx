import React, { useState, useEffect } from 'react'
import {
  Rocket,
  Bot,
  Zap,
  Users,
  Target,
  TrendingUp,
  Clock,
  AlertCircle,
  CheckCircle2,
  Play,
  Pause,
  Plus,
  ArrowRight,
  Sparkles,
  Brain,
  Code,
  Palette,
  MessageSquare,
  BarChart3,
  ChevronDown,
  Video,
  User,
  Calendar,
  GitBranch,
  Workflow,
  Star,
  Filter,
  Wand2,
  Save,
  X,
  ListChecks,
  FileText,
  Image,
  Hash,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { AgentThoughtsPanel } from './components/agent-thoughts-panel'
import { BulkAnalyzerTest } from './components/bulk-analyzer-test'
import { ChristianHooksAnalyzer } from './components/christian-hooks-analyzer'
import { ProductionStudio } from './components/production-studio'
import { SimpleAutomation } from './components/simple-automation'
import { TestAnalyzer } from './components/test-analyzer'
import { TikTokPortfolioManager } from './components/tiktok-portfolio-manager'
import { ViralVideoAnalyzerWithScrape } from './components/viral-video-analyzer-scrape'
import { WorkflowBuilderV6 } from './components/workflow-builder-v6'
import { ViralVideoAnalyzer } from './components/viral-video-analyzer-simple'
import { WorkflowBuilderV7 } from './components/workflow-builder-v7'
import { requestAgentSubtasks } from './services/agent-planner'
import { buildTaskContext } from './services/agent-planner'
import { generateTaskPlanWithAI } from './services/ai-task-planner'
import { loadGTMData, saveTaskUpdate } from './services/gtm-file-service'
import { generateSubtasksWithAI } from './services/simple-ai-service'
import { workflowService } from './services/supabase-service'
import { generateTaskPlan } from './services/task-planner'
import { GTMPhase, GTMTask, GTMRisk, TaskStatus, TaskOwner } from './types'

// Agent types with their specialties
const AGENTS = [
  {
    id: 'strategist',
    name: 'Strategy Agent',
    icon: Brain,
    color: 'from-purple-500 to-pink-500',
    specialty: 'Planning & Analytics',
  },
  {
    id: 'developer',
    name: 'Dev Agent',
    icon: Code,
    color: 'from-blue-500 to-cyan-500',
    specialty: 'Technical Implementation',
  },
  {
    id: 'creative',
    name: 'Creative Agent',
    icon: Palette,
    color: 'from-pink-500 to-rose-500',
    specialty: 'Content & Design',
  },
  {
    id: 'social',
    name: 'Social Agent',
    icon: MessageSquare,
    color: 'from-green-500 to-emerald-500',
    specialty: 'Community & Engagement',
  },
]

const ownerColors: Record<TaskOwner, { bg: string; icon: React.ReactNode }> = {
  PM: {
    bg: 'from-purple-500/20 to-pink-500/20',
    icon: <Target className='h-4 w-4' />,
  },
  BE: {
    bg: 'from-blue-500/20 to-cyan-500/20',
    icon: <Code className='h-4 w-4' />,
  },
  CR: {
    bg: 'from-pink-500/20 to-rose-500/20',
    icon: <Palette className='h-4 w-4' />,
  },
  HC: {
    bg: 'from-green-500/20 to-emerald-500/20',
    icon: <Users className='h-4 w-4' />,
  },
}

export default function GTMStudioV5() {
  const [phases, setPhases] = useState<GTMPhase[]>([])
  const [risks, setRisks] = useState<GTMRisk[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedTask, setSelectedTask] = useState<GTMTask | null>(null)
  const [activeAgents, setActiveAgents] = useState<Set<string>>(new Set())
  const [agentTasks, setAgentTasks] = useState<Record<string, string[]>>({})
  const [taskSheetOpen, setTaskSheetOpen] = useState(false)
  const [editedTask, setEditedTask] = useState<GTMTask | null>(null)
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [workflowSheetOpen, setWorkflowSheetOpen] = useState(false)
  const [workflows, setWorkflows] = useState<any[]>([])
  const [selectedWorkflow, setSelectedWorkflow] = useState<any>(null)
  const [showWorkflowRunner, setShowWorkflowRunner] = useState(false)
  const [isLoadingWorkflows, setIsLoadingWorkflows] = useState(false)
  const [showProductionStudio, setShowProductionStudio] = useState(false)
  const [productionSessions, setProductionSessions] = useState<any[]>([])
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null
  )
  const [showAllSessions, setShowAllSessions] = useState(false)
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(
    null
  )
  const [selectedWorkflowType, setSelectedWorkflowType] = useState<
    'jesus' | 'ugc' | 'slideshow' | 'ugc-slideshow' | '6-verses'
  >('jesus')
  const [useEnhancedAnalyzer, setUseEnhancedAnalyzer] = useState(true) // Always use enhanced by default!
  const [activeTab, setActiveTab] = useState(() => {
    // Load saved tab from localStorage or default to 'overview'
    if (typeof window !== 'undefined') {
      return localStorage.getItem('gtm-studio-active-tab') || 'overview'
    }
    return 'overview'
  })

  useEffect(() => {
    const loadData = async () => {
      console.log('[GTM Studio] Starting data load...')
      setIsLoading(true)
      try {
        console.log('[GTM Studio] Loading GTM data...')
        const { phases, risks } = await loadGTMData()
        console.log('[GTM Studio] GTM data loaded:', {
          phases: phases.length,
          risks: risks.length,
        })
        setPhases(phases)
        setRisks(risks)

        // Load workflows from Supabase
        console.log('[GTM Studio] Loading workflows...')
        setIsLoadingWorkflows(true)
        const workflowData = await workflowService.list()
        console.log('[GTM Studio] Workflows loaded:', workflowData.length)
        setWorkflows(workflowData)

        // Load production sessions
        console.log('[GTM Studio] Loading production sessions...')
        const { productionSessionService } = await import(
          './services/supabase-service'
        )
        const sessions = await productionSessionService.listRecent()
        console.log('[GTM Studio] Production sessions loaded:', sessions.length)
        setProductionSessions(sessions)

        console.log('[GTM Studio] All data loaded successfully!')
      } catch (error) {
        console.error('[GTM Studio] Failed to load data:', error)
        toast.error('Failed to load data')
      } finally {
        console.log('[GTM Studio] Finishing data load...')
        setIsLoading(false)
        setIsLoadingWorkflows(false)
      }
    }
    loadData()
  }, [])

  // Calculate metrics
  const totalTasks = phases.reduce((acc, phase) => acc + phase.tasks.length, 0)
  const completedTasks = phases.reduce(
    (acc, phase) =>
      acc + phase.tasks.filter((t) => t.status === 'completed').length,
    0
  )
  const inProgressTasks = phases.reduce(
    (acc, phase) =>
      acc + phase.tasks.filter((t) => t.status === 'in-progress').length,
    0
  )
  const blockedTasks = phases.reduce(
    (acc, phase) =>
      acc + phase.tasks.filter((t) => t.status === 'blocked').length,
    0
  )

  // Get current phase based on today
  const today = new Date()
  const launchDate = new Date(today)
  launchDate.setDate(launchDate.getDate() + 21) // Assuming we're 21 days before launch
  const daysUntilLaunch = Math.floor(
    (launchDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  )

  const loadProductionSessions = async () => {
    try {
      const { productionSessionService } = await import(
        './services/supabase-service'
      )
      const sessions = await productionSessionService.listRecent()
      setProductionSessions(sessions)
    } catch (error) {
      console.error('Failed to load production sessions:', error)
    }
  }

  const currentPhase = phases.find((phase) => {
    // Simple logic - you'd implement proper date range checking
    if (daysUntilLaunch > 7) return phase.id === 0
    if (daysUntilLaunch > 0) return phase.id === 1
    if (daysUntilLaunch > -7) return phase.id === 2
    if (daysUntilLaunch > -30) return phase.id === 3
    return phase.id === 4
  })

  const handleTabChange = (tabValue: string) => {
    setActiveTab(tabValue)
    // Reset "show all sessions" when changing tabs
    setShowAllSessions(false)
    if (typeof window !== 'undefined') {
      localStorage.setItem('gtm-studio-active-tab', tabValue)
    }
  }

  const handleDeleteSession = async (
    sessionId: string,
    sessionName: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation() // Prevent card click

    if (
      !confirm(
        `Are you sure you want to delete "${sessionName}"? This action cannot be undone.`
      )
    ) {
      return
    }

    setDeletingSessionId(sessionId)
    try {
      const { productionSessionService } = await import(
        './services/supabase-service'
      )
      await productionSessionService.delete(sessionId)

      // Remove from local state
      setProductionSessions((prev) =>
        prev.filter((session) => session.id !== sessionId)
      )

      // Clear selected session if it was the deleted one
      if (selectedSessionId === sessionId) {
        setSelectedSessionId(null)
      }

      toast.success(`"${sessionName}" deleted successfully`)
    } catch (error) {
      console.error('Failed to delete session:', error)
      toast.error('Failed to delete session. Please try again.')
    } finally {
      setDeletingSessionId(null)
    }
  }

  const assignTaskToAgent = (taskId: string, agentId: string) => {
    setActiveAgents((prev) => new Set(prev).add(agentId))
    setAgentTasks((prev) => ({
      ...prev,
      [agentId]: [...(prev[agentId] || []), taskId],
    }))

    // Update task status
    setPhases((prevPhases) =>
      prevPhases.map((phase) => ({
        ...phase,
        tasks: phase.tasks.map((task) =>
          task.id === taskId
            ? {
                ...task,
                status: 'in-progress' as TaskStatus,
                assignedAgent: agentId,
              }
            : task
        ),
      }))
    )

    toast.success('Task assigned to agent')
  }

  const createWorkflow = () => {
    setSelectedWorkflow(null)
    setWorkflowSheetOpen(true)
  }

  const runWorkflowOnTask = (workflowId: string, taskId: string) => {
    const workflow = workflows.find((w) => w.id === workflowId)
    const task = phases.flatMap((p) => p.tasks).find((t) => t.id === taskId)
    if (workflow && task) {
      setSelectedWorkflow({ ...workflow, task })
      setShowWorkflowRunner(true)
    }
  }

  const openTaskDetails = (task: any) => {
    // Handle both regular GTMTask and tasks with phase info
    const cleanTask = {
      id: task.id,
      phase: task.phase,
      phaseTitle: task.phaseTitle,
      taskNumber: task.taskNumber,
      title: task.title,
      owner: task.owner,
      dueDate: task.dueDate,
      dependencies: task.dependencies,
      status: task.status,
      isMilestone: task.isMilestone,
      priority: task.priority,
      subtasks: task.subtasks,
      notes: task.notes,
      assignedAgent: task.assignedAgent,
    } as GTMTask

    setSelectedTask(cleanTask)
    setEditedTask({ ...cleanTask })
    setTaskSheetOpen(true)
  }

  const saveTaskChanges = () => {
    if (!editedTask) return

    setPhases((prevPhases) =>
      prevPhases.map((phase) => ({
        ...phase,
        tasks: phase.tasks.map((task) =>
          task.id === editedTask.id ? editedTask : task
        ),
      }))
    )

    toast.success('Task updated')
    setTaskSheetOpen(false)
  }

  const generateSubtasks = async () => {
    if (!editedTask) return

    setIsGeneratingPlan(true)
    try {
      // Use simple AI service instead of complex agent system
      toast.info('AI is analyzing the task...')

      // Build context for the AI
      const context = buildTaskContext(editedTask, phases)

      // Generate subtasks with AI
      const generatedSubtasks = await generateSubtasksWithAI(
        editedTask.title,
        context
      )

      // Update UI to show agent is active (for visual consistency)
      setActiveAgents((prev) => new Set(prev).add('strategist'))
      setAgentTasks((prev) => ({
        ...prev,
        strategist: [...(prev.strategist || []), editedTask.id],
      }))

      // Add subtasks to the task
      const updatedTask = {
        ...editedTask,
        subtasks: generatedSubtasks.map((title, index) => ({
          id: `${editedTask.id}-sub-${index}`,
          title,
          dueDate: editedTask.dueDate,
          status: 'not-started' as TaskStatus,
        })),
      }

      setEditedTask(updatedTask)

      // Auto-save the subtasks
      try {
        await saveTaskUpdate(updatedTask)

        // Update in the main phases state so the UI reflects the changes
        setPhases((prevPhases) =>
          prevPhases.map((phase) => ({
            ...phase,
            tasks: phase.tasks.map((task) =>
              task.id === updatedTask.id ? updatedTask : task
            ),
          }))
        )

        toast.success(`AI generated ${generatedSubtasks.length} subtasks!`)
      } catch (saveError) {
        console.error('Failed to save subtasks:', saveError)
        toast.error('Failed to save subtasks')
      }
    } catch (error) {
      console.error('Failed to generate subtasks:', error)
      toast.error('Failed to generate subtasks with AI')
    } finally {
      setIsGeneratingPlan(false)
    }
  }

  if (isLoading) {
    return (
      <div className='flex h-[50vh] items-center justify-center'>
        <div className='text-center'>
          <div className='relative'>
            <div className='mx-auto mb-4 h-16 w-16 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 blur-xl' />
            <Rocket className='absolute inset-0 m-auto mx-auto mb-4 h-8 w-8 animate-pulse text-purple-500' />
          </div>
          <p className='text-muted-foreground'>
            Initializing mission control...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className='flex-1 space-y-8 overflow-y-auto p-4 md:p-8'>
      {/* Header with Launch Status */}
      <div className='flex flex-col gap-6'>
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-3xl font-black tracking-tight text-transparent uppercase'>
              <span className='text-5xl text-white'>🚀 </span> GTM
              <span className='text-3xl text-white'>Lab</span>
            </h1>
            <p className='text-muted-foreground mt-1'>
              Mission control for TikTok go-to-market campaign
            </p>
          </div>
          <div className='flex items-center gap-4'>
            <div className='text-center'>
              <div className='bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-4xl font-black text-transparent'>
                {daysUntilLaunch > 0
                  ? `T-${daysUntilLaunch}`
                  : `L+${Math.abs(daysUntilLaunch)}`}
              </div>
              <p className='text-muted-foreground text-sm'>
                {daysUntilLaunch > 0 ? 'Days to Launch' : 'Days Since Launch'}
              </p>
            </div>
            {import.meta.env.DEV && (
              <Button
                variant='outline'
                size='sm'
                onClick={async () => {
                  if (
                    confirm(
                      'This will reset all GTM data and reload from gtm.MD. Are you sure?'
                    )
                  ) {
                    try {
                      setIsLoading(true)
                      const { resetGTMData } = await import(
                        './services/gtm-file-service'
                      )
                      const { phases, risks } = await resetGTMData()
                      setPhases(phases)
                      setRisks(risks)
                      toast.success('GTM data reset successfully!')
                    } catch (error) {
                      console.error('Failed to reset GTM data:', error)
                      toast.error('Failed to reset GTM data')
                    } finally {
                      setIsLoading(false)
                    }
                  }
                }}
                className='gap-2'
              >
                <Wand2 size={14} />
                Reset Data
              </Button>
            )}
          </div>
        </div>

        {/* Main Dashboard Tabs - Moved to top */}
        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className='space-y-6'
        >
          <div className='w-full overflow-x-auto pb-2'>
            <TabsList className='bg-card border'>
              <TabsTrigger value='overview' className='gap-2'>
                <TrendingUp size={16} />
                Overview
              </TabsTrigger>
              <TabsTrigger value='tasks' className='gap-2'>
                <CheckCircle2 size={16} />
                Tasks
              </TabsTrigger>
              <TabsTrigger value='phases' className='gap-2'>
                <Rocket size={16} />
                Phases
              </TabsTrigger>
              <TabsTrigger value='pipeline' className='gap-2'>
                <GitBranch size={16} />
                Pipeline
              </TabsTrigger>
              <TabsTrigger value='workflows' className='gap-2'>
                <Workflow size={16} />
                Workflows
              </TabsTrigger>
              <TabsTrigger value='automation' className='gap-2'>
                <Zap size={16} />
                Automation
              </TabsTrigger>
              <TabsTrigger value='analytics' className='gap-2'>
                <BarChart3 size={16} />
                Analytics
              </TabsTrigger>
              <TabsTrigger value='hooks' className='gap-2'>
                <Hash size={16} />
                Hook Analysis
              </TabsTrigger>
              <TabsTrigger value='analyzer' className='gap-2'>
                <Brain size={16} />
                Video Analyzer
              </TabsTrigger>
              <TabsTrigger value='portfolio' className='gap-2'>
                <Users size={16} />
                Portfolio
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value='overview' className='space-y-4'>
            {/* Mission Status Overview - Dashboard Style */}
            <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
              <Card className='overflow-hidden border-none bg-gradient-to-br from-purple-50 to-pink-50 shadow-md dark:from-purple-950/40 dark:to-pink-950/40'>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='flex items-center gap-2 text-lg font-bold tracking-tight uppercase'>
                    🎯 &nbsp; Mission Progress
                  </CardTitle>
                  <div className='rounded-full bg-purple-100 p-2 text-purple-600 dark:bg-purple-900/50 dark:text-purple-300'>
                    <TrendingUp size={18} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold'>
                    {Math.round((completedTasks / totalTasks) * 100)}%
                  </div>
                  <div className='mt-1 flex items-center'>
                    <Badge
                      variant='outline'
                      className='gap-1 border-none bg-emerald-100 px-1.5 text-xs font-normal text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                    >
                      <span>
                        +{Math.round(((completedTasks / totalTasks) * 100) / 7)}
                        %
                      </span>
                    </Badge>
                    <p className='text-muted-foreground ml-2 text-xs'>
                      this week
                    </p>
                  </div>
                  <Progress
                    value={(completedTasks / totalTasks) * 100}
                    className='mt-2 h-1'
                  />
                </CardContent>
              </Card>

              <Card className='overflow-hidden border-none bg-gradient-to-br from-blue-50 to-cyan-50 shadow-md dark:from-blue-950/40 dark:to-cyan-950/40'>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='flex items-center gap-2 text-lg font-bold tracking-tight uppercase'>
                    ⚡ &nbsp; Active Tasks
                  </CardTitle>
                  <div className='rounded-full bg-blue-100 p-2 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300'>
                    <Zap size={18} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold'>{inProgressTasks}</div>
                  <div className='mt-1 flex items-center'>
                    <Badge
                      variant='outline'
                      className='gap-1 border-none bg-blue-100 px-1.5 text-xs font-normal text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    >
                      <span>
                        {phases.reduce(
                          (acc, p) =>
                            acc +
                            p.tasks.filter((t) => t.status === 'not-started')
                              .length,
                          0
                        )}{' '}
                        ready
                      </span>
                    </Badge>
                    <p className='text-muted-foreground ml-2 text-xs'>
                      to start
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className='overflow-hidden border-none bg-gradient-to-br from-green-50 to-emerald-50 shadow-md dark:from-green-950/40 dark:to-emerald-950/40'>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='flex items-center gap-2 text-lg font-bold tracking-tight uppercase'>
                    🤖 &nbsp; AI Agents
                  </CardTitle>
                  <div className='rounded-full bg-green-100 p-2 text-green-600 dark:bg-green-900/50 dark:text-green-300'>
                    <Bot size={18} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold'>
                    {activeAgents.size}/{AGENTS.length}
                  </div>
                  <div className='mt-1 flex items-center'>
                    <Badge
                      variant='outline'
                      className='gap-1 border-none bg-emerald-100 px-1.5 text-xs font-normal text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                    >
                      <span>
                        {agentTasks[Array.from(activeAgents)[0]]?.length || 0}{' '}
                        tasks
                      </span>
                    </Badge>
                    <p className='text-muted-foreground ml-2 text-xs'>
                      assigned
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className='overflow-hidden border-none bg-gradient-to-br from-amber-50 to-orange-50 shadow-md dark:from-amber-950/40 dark:to-orange-950/40'>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='flex items-center gap-2 text-lg font-bold tracking-tight uppercase'>
                    ⚠️ &nbsp; Blockers
                  </CardTitle>
                  <div className='rounded-full bg-amber-100 p-2 text-amber-600 dark:bg-amber-900/50 dark:text-amber-300'>
                    <AlertCircle size={18} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold'>
                    {blockedTasks +
                      risks.filter((r) => r.status === 'open').length}
                  </div>
                  <div className='mt-1 flex items-center'>
                    <Badge
                      variant='outline'
                      className={
                        blockedTasks > 0
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
                      }
                      className='gap-1 border-none px-1.5 text-xs font-normal'
                    >
                      <span>
                        {risks.filter((r) => r.status === 'open').length}{' '}
                        decisions
                      </span>
                    </Badge>
                    <p className='text-muted-foreground ml-2 text-xs'>needed</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* AI Agents Panel - Compact */}
            <Card className='glass-card border-white/10'>
              <CardHeader className='pb-3'>
                <CardTitle className='flex items-center gap-2 text-base'>
                  <Sparkles className='h-4 w-4 text-purple-500' />
                  AI Agents
                </CardTitle>
              </CardHeader>
              <CardContent className='pt-0'>
                <div className='grid grid-cols-2 gap-2 md:grid-cols-4'>
                  {AGENTS.map((agent) => {
                    const isActive = activeAgents.has(agent.id)
                    const taskCount = agentTasks[agent.id]?.length || 0

                    return (
                      <button
                        key={agent.id}
                        className={cn(
                          'relative overflow-hidden rounded-lg border p-3 text-left transition-all duration-200',
                          isActive
                            ? 'border-white/20 bg-gradient-to-br from-white/10 to-white/5'
                            : 'border-white/10 bg-white/5 hover:bg-white/10'
                        )}
                        onClick={() => {
                          if (!isActive) {
                            setActiveAgents((prev) =>
                              new Set(prev).add(agent.id)
                            )
                          }
                        }}
                      >
                        <div
                          className={cn(
                            'absolute inset-0 bg-gradient-to-br opacity-10',
                            agent.color
                          )}
                        />

                        <div className='relative space-y-1'>
                          <div className='flex items-center justify-between'>
                            <agent.icon className='h-4 w-4' />
                            {isActive && (
                              <div className='h-2 w-2 animate-pulse rounded-full bg-green-500' />
                            )}
                          </div>

                          <div>
                            <h4 className='text-sm font-medium'>
                              {agent.name}
                            </h4>
                            <p className='text-muted-foreground text-xs'>
                              {agent.specialty}
                            </p>
                            {taskCount > 0 && (
                              <p className='mt-1 text-xs font-medium'>
                                {taskCount} tasks
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Current Phase - Compact */}
            {currentPhase && (
              <div className='space-y-3'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-3'>
                    <Badge variant='outline' className='text-xs'>
                      Phase {currentPhase.id}
                    </Badge>
                    <h3 className='text-base font-semibold'>
                      {currentPhase.title}
                    </h3>
                    <Badge className='border-purple-400/20 bg-purple-500/20 text-xs text-purple-400'>
                      Active
                    </Badge>
                  </div>
                  <p className='text-muted-foreground text-xs'>
                    {currentPhase.subtitle}
                  </p>
                </div>

                <div className='grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3'>
                  {currentPhase.tasks.slice(0, 6).map((task) => (
                    <TaskCardCompact
                      key={task.id}
                      task={task}
                      onAssignAgent={assignTaskToAgent}
                      onCreateWorkflow={() => {
                        if (workflows.length === 0) {
                          toast.info(
                            'Create a workflow first in the Workflows tab'
                          )
                        } else if (workflows.length === 1) {
                          runWorkflowOnTask(workflows[0].id, task.id)
                        } else {
                          // TODO: Show workflow selector
                          runWorkflowOnTask(workflows[0].id, task.id)
                        }
                      }}
                      onSelect={() => openTaskDetails(task)}
                    />
                  ))}
                </div>
                {currentPhase.tasks.length > 6 && (
                  <Button variant='ghost' size='sm' className='w-full'>
                    View all {currentPhase.tasks.length} tasks
                    <ArrowRight className='ml-1 h-3 w-3' />
                  </Button>
                )}
              </div>
            )}

            {/* Decision Points - Compact */}
            {risks.filter((r) => r.status === 'open').length > 0 && (
              <Card className='glass-card border-yellow-500/20'>
                <CardHeader className='pb-3'>
                  <CardTitle className='flex items-center gap-2 text-base'>
                    <AlertCircle className='h-4 w-4 text-yellow-500' />
                    Decision Points
                  </CardTitle>
                </CardHeader>
                <CardContent className='pt-0'>
                  <div className='space-y-2'>
                    {risks
                      .filter((r) => r.status === 'open')
                      .slice(0, 3)
                      .map((risk) => (
                        <div
                          key={risk.id}
                          className='flex items-center gap-2 rounded-md bg-white/5 p-2 text-sm'
                        >
                          <div className='h-1.5 w-1.5 flex-shrink-0 rounded-full bg-yellow-500' />
                          <p className='line-clamp-1 flex-1'>{risk.question}</p>
                          {risk.dueDate && (
                            <span className='text-muted-foreground text-xs'>
                              {risk.dueDate}
                            </span>
                          )}
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value='tasks' className='space-y-4'>
            {/* Task Filters */}
            <div className='flex items-center justify-between gap-4'>
              <div className='flex items-center gap-2'>
                <Badge variant='outline' className='text-xs'>
                  {phases.reduce((acc, p) => acc + p.tasks.length, 0)} total
                </Badge>
                <Badge
                  variant='outline'
                  className='border-green-500/20 bg-green-500/10 text-xs text-green-600'
                >
                  {completedTasks} completed
                </Badge>
                <Badge
                  variant='outline'
                  className='border-blue-500/20 bg-blue-500/10 text-xs text-blue-600'
                >
                  {inProgressTasks} active
                </Badge>
                <Badge
                  variant='outline'
                  className='border-yellow-500/20 bg-yellow-500/10 text-xs text-yellow-600'
                >
                  {blockedTasks} blocked
                </Badge>
              </div>
              <div className='flex items-center gap-2'>
                <Button variant='outline' size='sm'>
                  <Filter className='mr-1 h-3 w-3' />
                  Filter
                </Button>
              </div>
            </div>

            {/* All Tasks List */}
            <div className='space-y-2'>
              {phases
                .flatMap((phase) =>
                  phase.tasks.map((task) => ({
                    ...task,
                    phaseId: phase.id,
                    phaseTitle: phase.title,
                  }))
                )
                .map((task) => (
                  <Card
                    key={task.id}
                    className='glass-card cursor-pointer border-white/10 transition-all duration-200 hover:border-white/20'
                    onClick={() => openTaskDetails(task)}
                  >
                    <CardContent className='p-3'>
                      <div className='flex items-center gap-3'>
                        {/* Status Checkbox */}
                        <Checkbox
                          checked={task.status === 'completed'}
                          onClick={(e) => e.stopPropagation()}
                          onCheckedChange={(checked) => {
                            const newStatus = checked
                              ? 'completed'
                              : 'not-started'
                            setPhases((prevPhases) =>
                              prevPhases.map((phase) => ({
                                ...phase,
                                tasks: phase.tasks.map((t) =>
                                  t.id === task.id
                                    ? { ...t, status: newStatus as TaskStatus }
                                    : t
                                ),
                              }))
                            )
                          }}
                        />

                        {/* Task Info */}
                        <div className='flex-1'>
                          <div className='mb-1 flex items-center gap-2'>
                            <Badge variant='outline' className='text-xs'>
                              Phase {task.phaseId}
                            </Badge>
                            <Badge
                              variant='outline'
                              className='font-mono text-xs'
                            >
                              {task.taskNumber}
                            </Badge>
                            <div
                              className={cn(
                                'flex items-center gap-1 rounded bg-gradient-to-r px-1.5 py-0.5 text-xs',
                                ownerColors[task.owner].bg
                              )}
                            >
                              {ownerColors[task.owner].icon}
                              <span>{task.owner}</span>
                            </div>
                            {task.isMilestone && (
                              <Star className='h-3 w-3 text-yellow-500' />
                            )}
                          </div>
                          <h4
                            className={cn(
                              'text-sm font-medium',
                              task.status === 'completed' &&
                                'text-muted-foreground line-through'
                            )}
                          >
                            {task.title}
                          </h4>
                          {task.subtasks && task.subtasks.length > 0 && (
                            <p className='text-muted-foreground mt-1 text-xs'>
                              {task.subtasks.length} subtasks
                            </p>
                          )}
                        </div>

                        {/* Task Meta */}
                        <div className='text-muted-foreground flex items-center gap-4 text-xs'>
                          <span className='flex items-center gap-1'>
                            <Calendar className='h-3 w-3' />
                            {task.dueDate}
                          </span>
                          {task.dependencies.length > 0 && (
                            <span className='flex items-center gap-1'>
                              <ArrowRight className='h-3 w-3' />
                              {task.dependencies.join(', ')}
                            </span>
                          )}
                        </div>

                        {/* Actions */}
                        <div
                          className='flex items-center gap-1'
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            size='sm'
                            variant='ghost'
                            className='h-7 w-7 p-0'
                            onClick={() =>
                              assignTaskToAgent(task.id, 'developer')
                            }
                          >
                            <Bot className='h-3 w-3' />
                          </Button>
                          <Button
                            size='sm'
                            variant='ghost'
                            className='h-7 w-7 p-0'
                            onClick={() => {
                              if (workflows.length === 0) {
                                toast.info(
                                  'Create a workflow first in the Workflows tab'
                                )
                              } else if (workflows.length === 1) {
                                runWorkflowOnTask(workflows[0].id, task.id)
                              } else {
                                // TODO: Show workflow selector
                                runWorkflowOnTask(workflows[0].id, task.id)
                              }
                            }}
                          >
                            <Workflow className='h-3 w-3' />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </TabsContent>

          <TabsContent value='phases' className='space-y-4'>
            {/* Phase Summary Cards */}
            <div className='grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4'>
              {phases.map((phase) => (
                <Card
                  key={phase.id}
                  className={cn(
                    'glass-card cursor-pointer border-white/10 transition-all',
                    phase.id === currentPhase?.id && 'ring-2 ring-purple-500/50'
                  )}
                >
                  <CardContent className='p-4'>
                    <div className='mb-2 flex items-center justify-between'>
                      <Badge variant='outline' className='text-xs'>
                        Phase {phase.id}
                      </Badge>
                      {phase.hasMilestone && (
                        <Star className='h-3 w-3 text-yellow-500' />
                      )}
                    </div>
                    <h4 className='mb-1 text-sm font-semibold'>
                      {phase.title}
                    </h4>
                    <p className='text-muted-foreground mb-2 text-xs'>
                      {phase.dateRange}
                    </p>
                    <div className='space-y-1'>
                      <Progress value={phase.progress} className='h-1' />
                      <div className='text-muted-foreground flex justify-between text-xs'>
                        <span>
                          {
                            phase.tasks.filter((t) => t.status === 'completed')
                              .length
                          }
                          /{phase.tasks.length} tasks
                        </span>
                        <span>{Math.round(phase.progress)}%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* All Tasks by Phase */}
            <div className='space-y-6'>
              {phases.map((phase) => (
                <div key={phase.id} className='space-y-3'>
                  {/* Phase Header */}
                  <div className='bg-background/95 sticky top-0 z-10 flex items-center justify-between py-2 backdrop-blur-sm'>
                    <div className='flex items-center gap-3'>
                      <Badge
                        variant={
                          phase.id === currentPhase?.id ? 'default' : 'outline'
                        }
                      >
                        Phase {phase.id}
                      </Badge>
                      <h3 className='font-semibold'>{phase.title}</h3>
                      <span className='text-muted-foreground text-sm'>
                        {phase.subtitle}
                      </span>
                      {phase.hasMilestone && (
                        <Star className='h-4 w-4 text-yellow-500' />
                      )}
                    </div>
                    <span className='text-muted-foreground text-sm'>
                      {phase.dateRange}
                    </span>
                  </div>

                  {/* Task Grid */}
                  <div className='grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3'>
                    {phase.tasks.map((task) => (
                      <TaskCardCompact
                        key={task.id}
                        task={task}
                        onAssignAgent={assignTaskToAgent}
                        onCreateWorkflow={() => {
                          if (workflows.length === 0) {
                            toast.info(
                              'Create a workflow first in the Workflows tab'
                            )
                          } else if (workflows.length === 1) {
                            runWorkflowOnTask(workflows[0].id, task.id)
                          } else {
                            // TODO: Show workflow selector
                            runWorkflowOnTask(workflows[0].id, task.id)
                          }
                        }}
                        onSelect={() => openTaskDetails(task)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value='pipeline' className='space-y-4'>
            <Card className='glass-card'>
              <CardHeader>
                <CardTitle>Execution Pipeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className='text-muted-foreground flex h-64 items-center justify-center'>
                  <div className='text-center'>
                    <GitBranch className='mx-auto mb-4 h-12 w-12 opacity-50' />
                    <p>Pipeline visualization coming soon</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value='workflows' className='space-y-4'>
            <div className='space-y-6'>
              {/* Workflows Header */}
              <div className='flex items-center justify-between'>
                <div>
                  <h3 className='text-lg font-semibold'>
                    Automation Workflows
                  </h3>
                  <p className='text-muted-foreground text-sm'>
                    Create reusable workflows that can be applied to any task
                  </p>
                </div>
                <div className='flex items-center gap-2'>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size='sm' variant='outline'>
                        <Sparkles className='mr-1.5 h-3.5 w-3.5' />
                        Production Studio
                        <ChevronDown className='ml-1 h-3 w-3' />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align='start'>
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedWorkflowType('jesus')
                          setShowProductionStudio(true)
                        }}
                      >
                        <Video className='mr-2 h-4 w-4' />
                        Jesus Animation Videos
                        <span className='text-muted-foreground ml-auto text-xs'>
                          Conviction hooks
                        </span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedWorkflowType('ugc')
                          setShowProductionStudio(true)
                        }}
                      >
                        <User className='mr-2 h-4 w-4' />
                        AI UGC Videos
                        <span className='text-muted-foreground ml-auto text-xs'>
                          Transformation hooks
                        </span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedWorkflowType('slideshow')
                          setShowProductionStudio(true)
                        }}
                      >
                        <Image className='mr-2 h-4 w-4' />
                        TikTok Slideshows
                        <span className='text-muted-foreground ml-auto text-xs'>
                          Viral slideshow format
                        </span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedWorkflowType('ugc-slideshow')
                          setShowProductionStudio(true)
                        }}
                      >
                        <Image className='mr-2 h-4 w-4' />
                        UGC Slideshows
                        <span className='text-muted-foreground ml-auto text-xs'>
                          POV daily practices
                        </span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedWorkflowType('6-verses')
                          setShowProductionStudio(true)
                        }}
                      >
                        <FileText className='mr-2 h-4 w-4' />6 Verses
                        <span className='text-muted-foreground ml-auto text-xs'>
                          Bible verses for emotions
                        </span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button onClick={createWorkflow} size='sm'>
                    <Plus className='mr-1.5 h-3.5 w-3.5' />
                    New Workflow
                  </Button>
                </div>
              </div>

              {/* Production Sessions */}
              {productionSessions.length > 0 && (
                <div className='space-y-4'>
                  <div className='flex items-center justify-between'>
                    <h4 className='text-muted-foreground text-sm font-medium'>
                      Recent Production Sessions ({productionSessions.length}{' '}
                      total)
                    </h4>
                    {productionSessions.length > 6 && (
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={() => {
                          setShowAllSessions(!showAllSessions)
                        }}
                      >
                        {showAllSessions ? 'Show Less' : 'View All'}
                      </Button>
                    )}
                  </div>
                  <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
                    {(showAllSessions
                      ? productionSessions
                      : productionSessions.slice(0, 6)
                    ).map((session) => {
                      const assetCount = session.assets?.length || 0
                      const imageCount =
                        session.assets?.filter((a: any) => a.type === 'image')
                          .length || 0
                      const videoCount =
                        session.assets?.filter((a: any) => a.type === 'video')
                          .length || 0

                      return (
                        <Card
                          key={session.id}
                          className='glass-card cursor-pointer border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-pink-500/5 transition-all hover:border-purple-500/40'
                          onClick={() => {
                            setSelectedSessionId(session.id)
                            setShowProductionStudio(true)
                          }}
                        >
                          <CardContent className='p-4'>
                            <div className='mb-3 flex items-center justify-between'>
                              <div className='flex items-center gap-2'>
                                <Sparkles className='h-4 w-4 text-purple-500' />
                                <h4 className='font-medium'>{session.name}</h4>
                              </div>
                              <div className='flex items-center gap-2'>
                                {session.settings?.workflowType && (
                                  <Badge variant='outline' className='text-xs'>
                                    {session.settings.workflowType === 'ugc'
                                      ? 'UGC'
                                      : session.settings.workflowType ===
                                          'slideshow'
                                        ? 'Slideshow'
                                        : session.settings.workflowType ===
                                            'ugc-slideshow'
                                          ? 'UGC Slideshow'
                                          : session.settings.workflowType ===
                                              '6-verses'
                                            ? '6 Verses'
                                            : 'Jesus'}
                                  </Badge>
                                )}
                                <Badge variant='secondary' className='text-xs'>
                                  {assetCount} assets
                                </Badge>
                                <Button
                                  variant='ghost'
                                  size='sm'
                                  className='text-muted-foreground h-6 w-6 p-0 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/20'
                                  onClick={(e) =>
                                    handleDeleteSession(
                                      session.id,
                                      session.name,
                                      e
                                    )
                                  }
                                  disabled={deletingSessionId === session.id}
                                  title='Delete session'
                                >
                                  {deletingSessionId === session.id ? (
                                    <div className='h-3 w-3 animate-spin rounded-full border border-red-500 border-t-transparent' />
                                  ) : (
                                    <Trash2 className='h-3 w-3' />
                                  )}
                                </Button>
                              </div>
                            </div>
                            <div className='space-y-2'>
                              {session.settings?.prompt && (
                                <p className='text-muted-foreground line-clamp-2 text-xs'>
                                  "{session.settings.prompt}"
                                </p>
                              )}
                              <div className='text-muted-foreground flex items-center gap-3 text-xs'>
                                {imageCount > 0 && (
                                  <span className='flex items-center gap-1'>
                                    <Image className='h-3 w-3' />
                                    {imageCount}
                                  </span>
                                )}
                                {videoCount > 0 && (
                                  <span className='flex items-center gap-1'>
                                    <Video className='h-3 w-3' />
                                    {videoCount}
                                  </span>
                                )}
                                <span className='ml-auto'>
                                  {new Date(
                                    session.updated_at
                                  ).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Workflows Grid */}
              <div className='space-y-4'>
                <h4 className='text-muted-foreground text-sm font-medium'>
                  Automation Workflows
                </h4>
                {workflows.length === 0 ? (
                  <Card className='glass-card border-dashed'>
                    <CardContent className='p-8 text-center'>
                      <Workflow className='text-muted-foreground/50 mx-auto mb-4 h-12 w-12' />
                      <h4 className='mb-2 font-semibold'>No workflows yet</h4>
                      <p className='text-muted-foreground mb-4 text-sm'>
                        Create your first workflow to automate repetitive tasks
                      </p>
                      <Button onClick={createWorkflow} size='sm'>
                        <Plus className='mr-1.5 h-3.5 w-3.5' />
                        Create Workflow
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
                    {workflows.map((workflow) => (
                      <Card
                        key={workflow.id}
                        className='glass-card cursor-pointer border-white/10 transition-all hover:border-white/20'
                        onClick={() => {
                          setSelectedWorkflow(workflow)
                          setWorkflowSheetOpen(true)
                        }}
                      >
                        <CardContent className='p-4'>
                          <div className='mb-3 flex items-center justify-between'>
                            <div className='flex items-center gap-2'>
                              <Workflow className='h-4 w-4' />
                              <h4 className='font-medium'>{workflow.name}</h4>
                            </div>
                            <Badge variant='outline' className='text-xs'>
                              {workflow.steps?.nodes?.length || 0} steps
                            </Badge>
                          </div>
                          <p className='text-muted-foreground mb-3 text-xs'>
                            {workflow.description ||
                              `Status: ${workflow.status || 'draft'}`}
                          </p>
                          <div className='text-muted-foreground flex items-center justify-between text-xs'>
                            <span>Used {workflow.run_count || 0} times</span>
                            <Button
                              size='sm'
                              variant='outline'
                              className='h-7 px-2'
                              onClick={async (e) => {
                                e.stopPropagation()
                                if (confirm('Delete this workflow?')) {
                                  try {
                                    await workflowService.delete(workflow.id)
                                    setWorkflows(
                                      workflows.filter(
                                        (w) => w.id !== workflow.id
                                      )
                                    )
                                    toast.success('Workflow deleted')
                                  } catch (error) {
                                    console.error(
                                      'Failed to delete workflow:',
                                      error
                                    )
                                    toast.error('Failed to delete workflow')
                                  }
                                }
                              }}
                            >
                              <Trash2 className='h-3 w-3' />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value='automation' className='space-y-4'>
            <SimpleAutomation />
          </TabsContent>

          <TabsContent value='analytics' className='space-y-4'>
            <Card className='glass-card'>
              <CardHeader>
                <CardTitle>Launch Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className='text-muted-foreground flex h-64 items-center justify-center'>
                  <div className='text-center'>
                    <BarChart3 className='mx-auto mb-4 h-12 w-12 opacity-50' />
                    <p>Analytics dashboard coming soon</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value='hooks' className='space-y-4'>
            <ChristianHooksAnalyzer />
          </TabsContent>

          <TabsContent value='analyzer' className='space-y-4'>
            <div className='space-y-4'>
              <div className='flex items-center justify-between'>
                <div>
                  <h3 className='text-lg font-semibold'>
                    Viral Video Analysis
                  </h3>
                  <p className='text-muted-foreground text-sm'>
                    {useEnhancedAnalyzer
                      ? 'Enhanced analyzer with web scraping'
                      : 'Simple bulk analyzer for large datasets'}
                  </p>
                </div>
                <div className='flex items-center gap-2'>
                  <Label htmlFor='analyzer-mode' className='text-sm'>
                    Enhanced Mode
                  </Label>
                  <Checkbox
                    id='analyzer-mode'
                    checked={useEnhancedAnalyzer}
                    onCheckedChange={setUseEnhancedAnalyzer}
                  />
                </div>
              </div>

              {/* TEST COMPONENT */}
              <div className='mb-6'>
                <TestAnalyzer />
              </div>

              <div className='grid grid-cols-1 gap-4 lg:grid-cols-3'>
                <div className='lg:col-span-2'>
                  {useEnhancedAnalyzer ? (
                    <ViralVideoAnalyzerWithScrape />
                  ) : (
                    <ViralVideoAnalyzer />
                  )}
                </div>
                <div className='lg:col-span-1'>
                  <BulkAnalyzerTest />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value='portfolio' className='space-y-4'>
            <TikTokPortfolioManager />
          </TabsContent>
        </Tabs>
      </div>

      {/* Task Detail Sheet */}
      <Sheet open={taskSheetOpen} onOpenChange={setTaskSheetOpen}>
        <SheetContent className='w-full overflow-y-auto p-6 sm:max-w-xl'>
          <SheetHeader className='pb-6'>
            <SheetTitle className='flex items-center gap-2'>
              <Badge variant='outline' className='text-xs'>
                Phase{' '}
                {editedTask?.phase ||
                  phases.find((p) =>
                    p.tasks.some((t) => t.id === editedTask?.id)
                  )?.id}
              </Badge>
              <Badge variant='outline' className='font-mono text-xs'>
                {editedTask?.taskNumber}
              </Badge>
              {editedTask?.isMilestone && (
                <Star className='h-4 w-4 text-yellow-500' />
              )}
            </SheetTitle>
            <SheetDescription>
              Edit task details and create an execution plan
            </SheetDescription>
          </SheetHeader>

          {editedTask && (
            <div className='mt-6 space-y-6'>
              {/* Task Title */}
              <div className='space-y-2'>
                <Label htmlFor='title'>Task Title</Label>
                <Textarea
                  id='title'
                  value={editedTask.title}
                  onChange={(e) => {
                    const updated = { ...editedTask, title: e.target.value }
                    setEditedTask(updated)
                    // Auto-save after a short delay
                    setTimeout(async () => {
                      setPhases((prevPhases) =>
                        prevPhases.map((phase) => ({
                          ...phase,
                          tasks: phase.tasks.map((task) =>
                            task.id === updated.id ? updated : task
                          ),
                        }))
                      )
                      // Save to Supabase
                      try {
                        await saveTaskUpdate(updated)
                        toast.success('Changes saved')
                      } catch (error) {
                        console.error('Failed to save task:', error)
                        toast.error('Failed to save changes')
                      }
                    }, 500)
                  }}
                  className='min-h-[80px]'
                />
              </div>

              {/* Task Meta */}
              <div className='grid grid-cols-2 gap-4'>
                <div className='space-y-2'>
                  <Label>Owner</Label>
                  <div
                    className={cn(
                      'flex items-center gap-2 rounded-md bg-gradient-to-r px-3 py-2',
                      ownerColors[editedTask.owner].bg
                    )}
                  >
                    {ownerColors[editedTask.owner].icon}
                    <span className='font-medium'>{editedTask.owner}</span>
                  </div>
                </div>

                <div className='space-y-2'>
                  <Label>Due Date</Label>
                  <div className='flex items-center gap-2 rounded-md border px-3 py-2'>
                    <Calendar className='h-4 w-4' />
                    <span>{editedTask.dueDate}</span>
                  </div>
                </div>
              </div>

              {/* Dependencies */}
              {editedTask.dependencies.length > 0 && (
                <div className='space-y-2'>
                  <Label>Dependencies</Label>
                  <div className='text-muted-foreground flex items-center gap-2 text-sm'>
                    <ArrowRight className='h-4 w-4' />
                    <span>{editedTask.dependencies.join(', ')}</span>
                  </div>
                </div>
              )}

              {/* Task Status */}
              <div className='space-y-2'>
                <Label>Status</Label>
                <div className='flex gap-2'>
                  <Button
                    size='sm'
                    variant={
                      editedTask.status === 'not-started'
                        ? 'default'
                        : 'outline'
                    }
                    onClick={async () => {
                      const updated = {
                        ...editedTask,
                        status: 'not-started' as TaskStatus,
                      }
                      setEditedTask(updated)
                      await saveTaskUpdate(updated)
                      setPhases((prevPhases) =>
                        prevPhases.map((phase) => ({
                          ...phase,
                          tasks: phase.tasks.map((task) =>
                            task.id === updated.id ? updated : task
                          ),
                        }))
                      )
                      toast.success('Status updated')
                    }}
                  >
                    Not Started
                  </Button>
                  <Button
                    size='sm'
                    variant={
                      editedTask.status === 'in-progress'
                        ? 'default'
                        : 'outline'
                    }
                    onClick={async () => {
                      const updated = {
                        ...editedTask,
                        status: 'in-progress' as TaskStatus,
                      }
                      setEditedTask(updated)
                      await saveTaskUpdate(updated)
                      setPhases((prevPhases) =>
                        prevPhases.map((phase) => ({
                          ...phase,
                          tasks: phase.tasks.map((task) =>
                            task.id === updated.id ? updated : task
                          ),
                        }))
                      )
                      toast.success('Status updated')
                    }}
                  >
                    In Progress
                  </Button>
                  <Button
                    size='sm'
                    variant={
                      editedTask.status === 'completed' ? 'default' : 'outline'
                    }
                    className={
                      editedTask.status === 'completed'
                        ? 'bg-green-500 hover:bg-green-600'
                        : ''
                    }
                    onClick={async () => {
                      const updated = {
                        ...editedTask,
                        status: 'completed' as TaskStatus,
                      }
                      setEditedTask(updated)
                      await saveTaskUpdate(updated)
                      setPhases((prevPhases) =>
                        prevPhases.map((phase) => ({
                          ...phase,
                          tasks: phase.tasks.map((task) =>
                            task.id === updated.id ? updated : task
                          ),
                        }))
                      )
                      toast.success('Task completed! 🎉')
                    }}
                  >
                    <CheckCircle2 className='mr-1 h-3 w-3' />
                    Completed
                  </Button>
                </div>
              </div>

              {/* Notes */}
              <div className='space-y-2'>
                <Label htmlFor='notes'>Notes</Label>
                <Textarea
                  id='notes'
                  value={editedTask.notes || ''}
                  onChange={(e) => {
                    const updated = { ...editedTask, notes: e.target.value }
                    setEditedTask(updated)
                    // Auto-save after a short delay
                    clearTimeout((window as any).notesTimeout)
                    ;(window as any).notesTimeout = setTimeout(async () => {
                      try {
                        await saveTaskUpdate(updated)
                        setPhases((prevPhases) =>
                          prevPhases.map((phase) => ({
                            ...phase,
                            tasks: phase.tasks.map((task) =>
                              task.id === updated.id ? updated : task
                            ),
                          }))
                        )
                        toast.success('Notes saved')
                      } catch (error) {
                        console.error('Failed to save notes:', error)
                        toast.error('Failed to save notes')
                      }
                    }, 1000)
                  }}
                  placeholder='Add notes about this task...'
                  className='min-h-[100px]'
                />
              </div>

              {/* Strategy Agent Planning Section */}
              <div className='space-y-3 rounded-lg border border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-pink-500/10 p-4'>
                <div className='flex items-center justify-between'>
                  <h4 className='flex items-center gap-2 font-semibold'>
                    <Brain className='h-4 w-4 text-purple-500' />
                    Strategy Agent Planning
                  </h4>
                  <Button
                    size='sm'
                    onClick={generateSubtasks}
                    disabled={isGeneratingPlan}
                    className='bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600'
                  >
                    {isGeneratingPlan ? (
                      <>
                        <Brain className='mr-1 h-3 w-3 animate-pulse' />
                        Agent Planning...
                      </>
                    ) : (
                      <>
                        <Brain className='mr-1 h-3 w-3' />
                        Request Plan
                      </>
                    )}
                  </Button>
                </div>
                <p className='text-muted-foreground text-sm'>
                  Request the Strategy Agent to break down this task into
                  actionable subtasks
                </p>
              </div>

              {/* Subtasks */}
              {editedTask.subtasks && editedTask.subtasks.length > 0 && (
                <div className='space-y-3'>
                  <h4 className='flex items-center gap-2 font-semibold'>
                    <ListChecks className='h-4 w-4' />
                    Subtasks ({editedTask.subtasks.length})
                  </h4>
                  <div className='space-y-2'>
                    {editedTask.subtasks.map((subtask, index) => (
                      <div
                        key={subtask.id}
                        className={cn(
                          'flex items-start gap-3 rounded-lg border p-3 transition-all',
                          subtask.status === 'completed'
                            ? 'border-green-500/20 bg-green-500/10'
                            : 'border-white/10 bg-white/5'
                        )}
                      >
                        <Checkbox
                          checked={subtask.status === 'completed'}
                          onCheckedChange={async (checked) => {
                            const updatedSubtasks = editedTask.subtasks?.map(
                              (s) =>
                                s.id === subtask.id
                                  ? {
                                      ...s,
                                      status: checked
                                        ? 'completed'
                                        : ('not-started' as TaskStatus),
                                    }
                                  : s
                            )
                            const updatedTask = {
                              ...editedTask,
                              subtasks: updatedSubtasks,
                            }
                            setEditedTask(updatedTask)

                            // Auto-save the subtask status
                            try {
                              await saveTaskUpdate(updatedTask)
                              setPhases((prevPhases) =>
                                prevPhases.map((phase) => ({
                                  ...phase,
                                  tasks: phase.tasks.map((task) =>
                                    task.id === updatedTask.id
                                      ? updatedTask
                                      : task
                                  ),
                                }))
                              )
                              toast.success(
                                checked
                                  ? 'Subtask completed! ✅'
                                  : 'Subtask reopened'
                              )
                            } catch (error) {
                              console.error(
                                'Failed to update subtask status:',
                                error
                              )
                              toast.error('Failed to update subtask status')
                            }
                          }}
                          className='mt-0.5'
                        />
                        <div className='flex-1'>
                          <p
                            className={cn(
                              'text-sm',
                              subtask.status === 'completed' &&
                                'text-muted-foreground line-through'
                            )}
                          >
                            {subtask.title}
                          </p>
                        </div>
                        <Button
                          size='sm'
                          variant='ghost'
                          className='h-6 w-6 p-0 opacity-50 hover:opacity-100'
                          onClick={async () => {
                            const updatedSubtasks = editedTask.subtasks?.filter(
                              (s) => s.id !== subtask.id
                            )
                            const updatedTask = {
                              ...editedTask,
                              subtasks: updatedSubtasks,
                            }
                            setEditedTask(updatedTask)

                            // Auto-save the subtask removal
                            try {
                              await saveTaskUpdate(updatedTask)
                              // Update in the main phases state too
                              setPhases((prevPhases) =>
                                prevPhases.map((phase) => ({
                                  ...phase,
                                  tasks: phase.tasks.map((task) =>
                                    task.id === updatedTask.id
                                      ? updatedTask
                                      : task
                                  ),
                                }))
                              )
                              toast.success('Subtask removed')
                            } catch (error) {
                              console.error('Failed to remove subtask:', error)
                              toast.error('Failed to remove subtask')
                            }
                          }}
                        >
                          <X className='h-3 w-3' />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Agent Thoughts */}
              {editedTask && (
                <AgentThoughtsPanel taskId={editedTask.id} className='mt-4' />
              )}

              {/* Actions */}
              <div className='mt-6 flex items-center gap-2 border-t pt-6'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => assignTaskToAgent(editedTask.id, 'developer')}
                >
                  <Bot className='mr-1 h-3 w-3' />
                  Assign AI
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => {
                    if (workflows.length === 0) {
                      toast.info('Create a workflow first in the Workflows tab')
                    } else if (workflows.length === 1) {
                      runWorkflowOnTask(workflows[0].id, editedTask.id)
                    } else {
                      // TODO: Show workflow selector
                      runWorkflowOnTask(workflows[0].id, editedTask.id)
                    }
                  }}
                >
                  <Workflow className='mr-1 h-3 w-3' />
                  Workflow
                </Button>
                <div className='ml-auto'>
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => setTaskSheetOpen(false)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Workflow Builder Sheet */}
      <Sheet open={workflowSheetOpen} onOpenChange={setWorkflowSheetOpen}>
        <SheetContent className='w-full p-0 sm:max-w-[95vw]'>
          <SheetHeader className='sr-only'>
            <SheetTitle>Workflow Builder</SheetTitle>
            <SheetDescription>
              Create and edit automation workflows
            </SheetDescription>
          </SheetHeader>
          <div className='flex h-screen flex-col'>
            <WorkflowBuilderV6
              workflow={selectedWorkflow}
              onClose={() => setWorkflowSheetOpen(false)}
              onSave={async (workflow) => {
                try {
                  if (selectedWorkflow && selectedWorkflow.id) {
                    // Update existing workflow
                    const updated = await workflowService.update(
                      selectedWorkflow.id,
                      workflow
                    )
                    setWorkflows(
                      workflows.map((w) =>
                        w.id === selectedWorkflow.id ? updated : w
                      )
                    )
                  } else {
                    // Create new workflow
                    const created = await workflowService.create(workflow)
                    setWorkflows([...workflows, created])
                  }
                  setWorkflowSheetOpen(false)
                  toast.success('Workflow saved!')
                } catch (error) {
                  console.error('Failed to save workflow:', error)
                  toast.error('Failed to save workflow')
                }
              }}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Production Studio Modal */}
      <Sheet
        open={showProductionStudio}
        onOpenChange={(open) => {
          setShowProductionStudio(open)
          if (!open) {
            setSelectedSessionId(null)
            // Reload sessions when closing
            loadProductionSessions()
          }
        }}
      >
        <SheetContent className='w-full p-0 sm:max-w-[95vw]'>
          <SheetHeader className='sr-only'>
            <SheetTitle>Production Studio</SheetTitle>
            <SheetDescription>
              Generate and refine content at scale
            </SheetDescription>
          </SheetHeader>
          <div className='h-screen'>
            <ProductionStudio
              workflow={selectedWorkflow}
              sessionId={selectedSessionId}
              onClose={() => setShowProductionStudio(false)}
              workflowType={selectedWorkflowType}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

// Task Card Component
function TaskCard({
  task,
  onAssignAgent,
  onCreateWorkflow,
  onSelect,
}: {
  task: GTMTask
  onAssignAgent: (taskId: string, agentId: string) => void
  onCreateWorkflow: () => void
  onSelect: () => void
}) {
  const ownerStyle = ownerColors[task.owner]

  return (
    <Card
      className={cn(
        'glass-card cursor-pointer transition-all duration-300',
        task.status === 'completed'
          ? 'border-green-500/30 bg-green-500/5'
          : task.status === 'in-progress'
            ? 'border-blue-500/30 bg-blue-500/5'
            : 'border-white/10 hover:border-white/20'
      )}
      onClick={onSelect}
    >
      <CardContent className='p-4'>
        <div className='space-y-3'>
          <div className='flex items-start justify-between'>
            <div className='flex items-center gap-2'>
              <Badge variant='outline' className='font-mono text-xs'>
                {task.taskNumber}
              </Badge>
              <div
                className={cn(
                  'flex items-center gap-1 rounded-md bg-gradient-to-r px-2 py-1',
                  ownerStyle.bg
                )}
              >
                {ownerStyle.icon}
                <span className='text-xs font-medium'>{task.owner}</span>
              </div>
              {task.isMilestone && <Star className='h-4 w-4 text-yellow-500' />}
            </div>
            {task.status === 'completed' && (
              <Badge className='border-green-500/30 bg-green-500/20 text-xs text-green-400'>
                <CheckCircle2 className='mr-1 h-3 w-3' />
                Done
              </Badge>
            )}
            {task.status === 'in-progress' && (
              <Badge className='border-blue-500/30 bg-blue-500/20 text-xs text-blue-400'>
                <Play className='mr-1 h-3 w-3' />
                Active
              </Badge>
            )}
            {task.status === 'not-started' && (
              <Badge variant='secondary' className='text-xs'>
                Not Started
              </Badge>
            )}
          </div>

          <h4
            className={cn(
              'line-clamp-2 font-semibold',
              task.status === 'completed' && 'line-through opacity-60'
            )}
          >
            {task.title}
          </h4>

          <div className='text-muted-foreground flex items-center gap-2 text-xs'>
            <Calendar className='h-3 w-3' />
            <span>{task.dueDate}</span>
            {task.dependencies.length > 0 && (
              <>
                <span>•</span>
                <span>{task.dependencies.length} dependencies</span>
              </>
            )}
            {task.notes && (
              <>
                <span>•</span>
                <FileText className='h-3 w-3' />
                <span>Has notes</span>
              </>
            )}
          </div>

          {task.subtasks && task.subtasks.length > 0 && (
            <div className='space-y-1'>
              <div className='text-muted-foreground text-xs'>
                {task.subtasks.filter((s) => s.status === 'completed').length}/
                {task.subtasks.length} subtasks complete
              </div>
              <Progress
                value={
                  (task.subtasks.filter((s) => s.status === 'completed')
                    .length /
                    task.subtasks.length) *
                  100
                }
                className='h-1'
              />
            </div>
          )}

          <div className='flex gap-2' onClick={(e) => e.stopPropagation()}>
            <Button
              size='sm'
              variant='outline'
              className='flex-1'
              onClick={() => {
                // Simple agent assignment - you'd show a modal to select agent
                onAssignAgent(task.id, 'developer')
              }}
            >
              <Bot className='mr-1 h-3 w-3' />
              Assign
            </Button>
            <Button
              size='sm'
              variant='outline'
              className='flex-1'
              onClick={onCreateWorkflow}
            >
              <Workflow className='mr-1 h-3 w-3' />
              Automate
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Compact Task Card Component
function TaskCardCompact({
  task,
  onAssignAgent,
  onCreateWorkflow,
  onSelect,
}: {
  task: GTMTask
  onAssignAgent: (taskId: string, agentId: string) => void
  onCreateWorkflow: () => void
  onSelect: () => void
}) {
  const ownerStyle = ownerColors[task.owner]

  return (
    <Card
      className={cn(
        'glass-card cursor-pointer transition-all duration-200',
        task.status === 'completed'
          ? 'border-green-500/30 bg-green-500/5'
          : task.status === 'in-progress'
            ? 'border-blue-500/30 bg-blue-500/5'
            : 'border-white/10 hover:border-white/20'
      )}
      onClick={onSelect}
    >
      <CardContent className='p-3'>
        <div className='space-y-2'>
          <div className='flex items-start justify-between gap-2'>
            <div className='flex flex-1 items-center gap-2'>
              <Badge variant='outline' className='font-mono text-xs'>
                {task.taskNumber}
              </Badge>
              <h4
                className={cn(
                  'line-clamp-1 flex-1 text-sm font-medium',
                  task.status === 'completed' && 'line-through opacity-60'
                )}
              >
                {task.title}
              </h4>
            </div>
            <div className='flex items-center gap-1'>
              {task.status === 'completed' && (
                <CheckCircle2 className='h-3 w-3 text-green-400' />
              )}
              {task.status === 'in-progress' && (
                <Play className='h-3 w-3 text-blue-400' />
              )}
              {task.isMilestone && <Star className='h-3 w-3 text-yellow-500' />}
            </div>
          </div>

          <div className='flex items-center justify-between gap-2'>
            <div className='flex items-center gap-2'>
              <div
                className={cn(
                  'flex items-center gap-1 rounded bg-gradient-to-r px-1.5 py-0.5 text-xs',
                  ownerStyle.bg
                )}
              >
                {ownerStyle.icon}
                <span className='text-xs'>{task.owner}</span>
              </div>
              <span className='text-muted-foreground text-xs'>
                {task.dueDate}
              </span>
            </div>

            <div
              className='flex items-center gap-1'
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                size='sm'
                variant='ghost'
                className='h-6 w-6 p-0'
                onClick={() => onAssignAgent(task.id, 'developer')}
              >
                <Bot className='h-3 w-3' />
              </Button>
              <Button
                size='sm'
                variant='ghost'
                className='h-6 w-6 p-0'
                onClick={onCreateWorkflow}
              >
                <Workflow className='h-3 w-3' />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
