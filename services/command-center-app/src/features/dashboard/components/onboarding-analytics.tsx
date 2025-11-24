import { useEffect, useState } from 'react'
import {
  Users,
  ArrowRight,
  AlertCircle,
  CheckCircle,
  Clock,
  Zap,
  FlaskConical,
  TrendingUp,
  TrendingDown,
  BarChart3,
  GitBranch,
  RefreshCw,
  FileText,
} from 'lucide-react'
import {
  Funnel,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  Cell,
  BarChart,
  Sankey,
  Rectangle,
} from 'recharts'
import { supabase } from '@/lib/supabaseClient'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AnalyticsService } from '@/features/flow-studio/services/analytics-service'

interface OnboardingStep {
  id: string
  name: string
  type: string
  order: number
  completionRate: number
  avgTimeSeconds: number
  dropOffRate: number
  variants?: {
    id: string
    name: string
    users: number
    completionRate: number
  }[]
}

interface UserFlow {
  userId: string
  flowVariant: string
  startTime: Date
  completionTime?: Date
  currentStep: string
  completed: boolean
  stepsCompleted: string[]
  timePerStep: Record<string, number>
}

interface ABTestResult {
  variantId: string
  variantName: string
  users: number
  completionRate: number
  avgCompletionTime: number
  confidence: number
  isWinner?: boolean
}

export function OnboardingAnalytics() {
  const [onboardingSteps, setOnboardingSteps] = useState<OnboardingStep[]>([])
  const [selectedFlow, setSelectedFlow] = useState<string>(
    '3c39463f-2c0f-4829-977d-a98fb3e15db2'
  ) // Your actual flow ID
  const [abTestResults, setABTestResults] = useState<ABTestResult[]>([])
  const [activeUsers, setActiveUsers] = useState<UserFlow[]>([])
  const [selectedTimeRange, setSelectedTimeRange] = useState('7d')
  const [loading, setLoading] = useState(true)
  const [overallCompletion, setOverallCompletion] = useState(0)
  const [avgCompletionTime, setAvgCompletionTime] = useState(0)
  const [refreshKey, setRefreshKey] = useState(0)

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      // Get time range in days
      const days =
        selectedTimeRange === '24h'
          ? 1
          : selectedTimeRange === '7d'
            ? 7
            : selectedTimeRange === '30d'
              ? 30
              : 90

      // Fetch flow analytics
      const flowAnalytics = await AnalyticsService.getFlowAnalytics(
        selectedFlow,
        days
      )

      console.log('Flow Analytics Response:', flowAnalytics)

      if (flowAnalytics) {
        // Convert step metrics to OnboardingStep format
        const steps: OnboardingStep[] = flowAnalytics.stepMetrics.map(
          (metric) => ({
            id: metric.stepId,
            name: metric.screenType.replace(/([A-Z])/g, ' $1').trim(), // Convert CamelCase to readable
            type: metric.screenType.includes('Question')
              ? 'input'
              : metric.screenType.includes('Screen')
                ? 'display'
                : 'selection',
            order: metric.stepOrder,
            completionRate:
              metric.views > 0 ? (metric.completions / metric.views) * 100 : 0,
            avgTimeSeconds: metric.avgTimeSeconds,
            dropOffRate:
              metric.views > 0 ? (metric.dropOffs / metric.views) * 100 : 0,
          })
        )

        console.log('Processed Steps:', steps)

        setOnboardingSteps(steps)

        // Calculate overall completion
        const completion =
          flowAnalytics.totalStarts > 0
            ? (flowAnalytics.completions / flowAnalytics.totalStarts) * 100
            : 0
        setOverallCompletion(completion)

        // Calculate average completion time (mock for now since we need more detailed tracking)
        const totalAvgTime = steps.reduce(
          (sum, step) => sum + step.avgTimeSeconds,
          0
        )
        setAvgCompletionTime(totalAvgTime)
      }

      // Fetch live sessions
      const liveSessions = await AnalyticsService.getLiveSessions(selectedFlow)

      console.log('Live Sessions:', liveSessions)

      // Convert to UserFlow format
      const activeFlows: UserFlow[] = liveSessions.map((session) => ({
        userId: session.userId,
        flowVariant: 'default', // We don't have variants yet
        startTime: session.startTime,
        currentStep: session.currentStep,
        completed: false,
        stepsCompleted: [], // Would need to track this in events
        timePerStep: {},
      }))

      setActiveUsers(activeFlows)

      // Fetch business metrics
      const businessMetrics = await AnalyticsService.getBusinessMetrics(
        selectedFlow,
        days
      )

      console.log('Business Metrics:', businessMetrics)

      // For now, create mock A/B test results since we don't have real A/B testing yet
      const mockABTests: ABTestResult[] = [
        {
          variantId: 'current',
          variantName: 'Current Flow',
          users: flowAnalytics?.totalStarts || 0,
          completionRate: overallCompletion,
          avgCompletionTime: avgCompletionTime,
          confidence: 100,
          isWinner: true,
        },
      ]
      setABTestResults(mockABTests)
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [selectedFlow, selectedTimeRange, refreshKey])

  // Auto-refresh every 30 seconds for live data
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshKey((prev) => prev + 1)
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1)
  }

  // Calculate funnel data
  const funnelData = onboardingSteps.map((step, index) => {
    const remainingUsers = onboardingSteps
      .slice(0, index + 1)
      .reduce((acc, s) => acc * (s.completionRate / 100), 100)

    return {
      name: step.name,
      value: Math.round(remainingUsers),
      fill:
        index === 0
          ? '#10b981'
          : index < 3
            ? '#3b82f6'
            : index < 6
              ? '#8b5cf6'
              : '#f59e0b',
    }
  })

  // Time analysis data
  const timeAnalysisData = onboardingSteps.map((step) => ({
    step: step.name,
    avgTime: step.avgTimeSeconds,
    dropOff: step.dropOffRate,
  }))

  // Conversion path analysis
  const pathData = [
    { source: 'Start', target: 'Welcome', value: 1000 },
    { source: 'Welcome', target: 'Mood Selection', value: 985 },
    { source: 'Welcome', target: 'Drop Off', value: 15 },
    { source: 'Mood Selection', target: 'Faith Tradition', value: 942 },
    { source: 'Mood Selection', target: 'Drop Off', value: 43 },
    { source: 'Faith Tradition', target: 'Prayer People', value: 918 },
    { source: 'Faith Tradition', target: 'Drop Off', value: 24 },
    { source: 'Prayer People', target: 'Add Intentions', value: 875 },
    { source: 'Prayer People', target: 'Drop Off', value: 43 },
    { source: 'Add Intentions', target: 'Complete', value: 754 },
    { source: 'Add Intentions', target: 'Drop Off', value: 121 },
  ]

  if (loading) {
    return (
      <div className='flex h-96 items-center justify-center'>
        <div className='text-center'>
          <RefreshCw className='text-muted-foreground mx-auto mb-4 h-8 w-8 animate-spin' />
          <p className='text-muted-foreground'>Loading analytics data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      {/* Header with Controls */}
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-2xl font-bold'>Onboarding Analytics</h2>
          <p className='text-muted-foreground'>
            Track and optimize your SDUI onboarding flows
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <Select
            value={selectedTimeRange}
            onValueChange={setSelectedTimeRange}
          >
            <SelectTrigger className='w-[120px]'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='24h'>24 hours</SelectItem>
              <SelectItem value='7d'>7 days</SelectItem>
              <SelectItem value='30d'>30 days</SelectItem>
              <SelectItem value='90d'>90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant='outline' size='sm' onClick={handleRefresh}>
            <RefreshCw className='mr-2 h-4 w-4' />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className='grid gap-4 md:grid-cols-4'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Overall Completion
            </CardTitle>
            <CheckCircle className='text-muted-foreground h-4 w-4' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {overallCompletion.toFixed(2)}%
            </div>
            <div className='mt-1 flex items-center'>
              <TrendingUp className='mr-1 h-3 w-3 text-green-500' />
              <span className='text-xs text-green-500'>
                +8.9% from last week
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Avg Time to Complete
            </CardTitle>
            <Clock className='text-muted-foreground h-4 w-4' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {Math.floor(avgCompletionTime / 60)}:{avgCompletionTime % 60}
            </div>
            <div className='mt-1 flex items-center'>
              <TrendingDown className='mr-1 h-3 w-3 text-green-500' />
              <span className='text-xs text-green-500'>
                -45s from last week
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Active Flows</CardTitle>
            <Users className='text-muted-foreground h-4 w-4' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{activeUsers.length}</div>
            <Badge variant='outline' className='mt-1 text-xs'>
              Live now
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              A/B Test Winner
            </CardTitle>
            <FlaskConical className='text-muted-foreground h-4 w-4' />
          </CardHeader>
          <CardContent>
            <div className='text-lg font-bold'>Current Flow</div>
            <div className='mt-1 flex items-center'>
              <Zap className='mr-1 h-3 w-3 text-yellow-500' />
              <span className='text-xs'>+8.8% conversion</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Funnel Visualization */}
      <Card>
        <CardHeader>
          <CardTitle className='text-xl font-bold'>Onboarding Funnel</CardTitle>
          <CardDescription>
            User progression through onboarding steps
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width='100%' height={400}>
            <BarChart
              data={funnelData}
              layout='horizontal'
              margin={{ top: 20, right: 30, left: 100, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray='3 3' />
              <XAxis type='number' domain={[0, 100]} />
              <YAxis dataKey='name' type='category' width={100} />
              <Tooltip formatter={(value: any) => `${value}%`} />
              <Bar dataKey='value' radius={[0, 4, 4, 0]}>
                {funnelData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Step Details */}
          <div className='mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
            {onboardingSteps.slice(0, 4).map((step) => (
              <div key={step.id} className='rounded-lg border p-4'>
                <div className='mb-2 flex items-center justify-between'>
                  <span className='font-medium'>{step.name}</span>
                  {step.variants && (
                    <Badge variant='outline' className='text-xs'>
                      <GitBranch className='mr-1 h-3 w-3' />
                      {step.variants.length} variants
                    </Badge>
                  )}
                </div>
                <div className='space-y-1 text-sm'>
                  <div className='flex justify-between'>
                    <span className='text-muted-foreground'>Completion</span>
                    <span className='font-medium'>{step.completionRate}%</span>
                  </div>
                  <div className='flex justify-between'>
                    <span className='text-muted-foreground'>Avg Time</span>
                    <span className='font-medium'>{step.avgTimeSeconds}s</span>
                  </div>
                  <div className='flex justify-between'>
                    <span className='text-muted-foreground'>Drop-off</span>
                    <span
                      className={cn(
                        'font-medium',
                        step.dropOffRate > 5 ? 'text-red-500' : 'text-green-500'
                      )}
                    >
                      {step.dropOffRate}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* A/B Test Results */}
      <div className='grid gap-6 md:grid-cols-2'>
        <Card>
          <CardHeader>
            <CardTitle className='text-xl font-bold'>
              A/B Test Performance
            </CardTitle>
            <CardDescription>
              Compare different onboarding flow variants
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className='space-y-4'>
              {abTestResults.map((result) => (
                <div
                  key={result.variantId}
                  className={cn(
                    'rounded-lg border p-4',
                    result.isWinner &&
                      'border-green-500 bg-green-50/50 dark:bg-green-950/20'
                  )}
                >
                  <div className='mb-2 flex items-center justify-between'>
                    <div className='flex items-center gap-2'>
                      <span className='font-medium'>{result.variantName}</span>
                      {result.isWinner && (
                        <Badge className='bg-green-500'>Winner</Badge>
                      )}
                    </div>
                    <Badge variant='outline' className='text-xs'>
                      {result.confidence}% confidence
                    </Badge>
                  </div>
                  <div className='grid grid-cols-3 gap-4 text-sm'>
                    <div>
                      <p className='text-muted-foreground'>Users</p>
                      <p className='font-medium'>
                        {result.users.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className='text-muted-foreground'>Completion</p>
                      <p className='font-medium'>{result.completionRate}%</p>
                    </div>
                    <div>
                      <p className='text-muted-foreground'>Avg Time</p>
                      <p className='font-medium'>
                        {Math.floor(result.avgCompletionTime / 60)}:
                        {(result.avgCompletionTime % 60)
                          .toString()
                          .padStart(2, '0')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Button className='mt-4 w-full' variant='outline'>
              <FileText className='mr-2 h-4 w-4' />
              View Detailed Report
            </Button>
          </CardContent>
        </Card>

        {/* Time Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className='text-xl font-bold'>
              Step Time Analysis
            </CardTitle>
            <CardDescription>
              Time spent vs drop-off rate by step
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width='100%' height={300}>
              <AreaChart data={timeAnalysisData}>
                <CartesianGrid strokeDasharray='3 3' />
                <XAxis
                  dataKey='step'
                  angle={-45}
                  textAnchor='end'
                  height={80}
                />
                <YAxis yAxisId='left' />
                <YAxis yAxisId='right' orientation='right' />
                <Tooltip />
                <Area
                  yAxisId='left'
                  type='monotone'
                  dataKey='avgTime'
                  stroke='#3b82f6'
                  fill='#3b82f6'
                  fillOpacity={0.6}
                  name='Avg Time (s)'
                />
                <Area
                  yAxisId='right'
                  type='monotone'
                  dataKey='dropOff'
                  stroke='#ef4444'
                  fill='#ef4444'
                  fillOpacity={0.6}
                  name='Drop-off %'
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Live Onboarding Sessions */}
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div>
              <CardTitle className='text-xl font-bold'>
                Live Onboarding Sessions
              </CardTitle>
              <CardDescription>
                Users currently in the onboarding flow
              </CardDescription>
            </div>
            <Badge variant='outline' className='animate-pulse'>
              <div className='mr-2 h-2 w-2 rounded-full bg-green-500' />
              {activeUsers.length} Active
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className='space-y-3'>
            {activeUsers.map((user) => (
              <div
                key={user.userId}
                className='flex items-center justify-between rounded-lg border p-3'
              >
                <div className='flex items-center gap-4'>
                  <div className='flex items-center gap-2'>
                    <Users className='text-muted-foreground h-4 w-4' />
                    <span className='font-medium'>{user.userId}</span>
                  </div>
                  <Badge variant='outline'>{user.flowVariant}</Badge>
                </div>
                <div className='flex items-center gap-6'>
                  <div className='flex items-center gap-2'>
                    <span className='text-muted-foreground text-sm'>
                      Current Step:
                    </span>
                    <span className='text-sm font-medium'>
                      {user.currentStep}
                    </span>
                  </div>
                  <div className='flex items-center gap-1'>
                    {onboardingSteps.slice(0, 5).map((step, index) => (
                      <div
                        key={step.id}
                        className={cn(
                          'h-2 w-8 rounded-full',
                          user.stepsCompleted.includes(step.id)
                            ? 'bg-green-500'
                            : step.id === user.currentStep
                              ? 'animate-pulse bg-blue-500'
                              : 'bg-gray-200'
                        )}
                      />
                    ))}
                  </div>
                  <div className='text-muted-foreground text-sm'>
                    {Math.floor((Date.now() - user.startTime.getTime()) / 1000)}
                    s
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
