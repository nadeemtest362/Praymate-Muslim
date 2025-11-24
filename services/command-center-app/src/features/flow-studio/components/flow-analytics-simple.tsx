import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Users,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertCircle,
  Activity,
  ArrowDown,
  Eye,
  RefreshCw,
  ChevronRight,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from 'recharts'
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
import { AnalyticsService } from '../services/analytics-service'

interface FlowMetrics {
  flowId: string
  flowName: string
  isActive: boolean
  version: number
  totalStarts: number
  completions: number
  activeNow: number
  avgCompletionTime: number
  lastUpdated: Date
  stepMetrics: StepMetric[]
  businessMetrics: {
    paywallViews: number
    paywallConversions: number
    paywallConversionRate: number
    totalRevenue: number
    revenuePerVisitor: number
    avgRevenuePerUser: number
    lifetimeValue: number
    churnRate: number
    activationRate: number
  }
  trends: {
    completionRate: number
    completionChange: number
    avgTimeChange: number
    paywallConversionChange: number
    rpvChange: number
    revenueChange: number
  }
}

interface StepMetric {
  stepId: string
  stepName: string
  screenType: string
  views: number
  completions: number
  dropOffs: number
  avgTimeSeconds: number
  errorRate: number
}

interface LiveSession {
  userId: string
  currentStep: string
  startTime: Date
  lastActivity: Date
  progress: number
}

export function FlowAnalyticsSimple({
  flowId,
  flowSteps,
  selectedStepId,
}: {
  flowId: string
  flowSteps?: any[]
  selectedStepId?: string
}) {
  const [scrolled, setScrolled] = useState(false)

  // Fetch real analytics data
  const {
    data: analyticsData,
    isLoading: analyticsLoading,
    refetch: refetchAnalytics,
  } = useQuery({
    queryKey: ['flow-analytics', flowId],
    queryFn: () => AnalyticsService.getFlowAnalytics(flowId),
    refetchInterval: 30000, // Refresh every 30 seconds
  })

  const { data: businessMetrics, isLoading: businessLoading } = useQuery({
    queryKey: ['business-metrics', flowId],
    queryFn: () => AnalyticsService.getBusinessMetrics(flowId),
  })

  const { data: liveSessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ['live-sessions', flowId],
    queryFn: () => AnalyticsService.getLiveSessions(flowId),
    refetchInterval: 10000, // Refresh every 10 seconds
  })

  // Combine data into metrics format
  const metrics: FlowMetrics | null = analyticsData
    ? {
        flowId: analyticsData.flowId,
        flowName: analyticsData.flowName,
        isActive: true,
        version: parseInt(analyticsData.flowVersion) || 1,
        totalStarts: analyticsData.totalStarts,
        completions: analyticsData.completions,
        activeNow: liveSessions.length,
        avgCompletionTime:
          analyticsData.stepMetrics.reduce(
            (sum, step) => sum + step.avgTimeSeconds,
            0
          ) / analyticsData.stepMetrics.length || 0,
        lastUpdated: new Date(),
        stepMetrics: analyticsData.stepMetrics.map((metric) => {
          const flowStep = flowSteps?.find((s) => s.id === metric.stepId)
          return {
            ...metric,
            stepName: flowStep?.name || metric.screenType,
            errorRate:
              metric.errorCount > 0
                ? (metric.errorCount / metric.views) * 100
                : 0,
          }
        }),
        businessMetrics: {
          paywallViews: businessMetrics?.paywallViews || 0,
          paywallConversions: businessMetrics?.paywallConversions || 0,
          paywallConversionRate: businessMetrics?.paywallConversionRate || 0,
          totalRevenue: businessMetrics?.estimatedRevenue || 0,
          revenuePerVisitor: businessMetrics?.revenuePerVisitor || 0,
          avgRevenuePerUser: businessMetrics?.avgRevenuePerUser || 0,
          lifetimeValue: businessMetrics?.lifetimeValue || 0,
          churnRate: businessMetrics?.churnRate || 0,
          activationRate: businessMetrics?.activationRate || 0,
        },
        trends: {
          completionRate:
            analyticsData.totalStarts > 0
              ? (analyticsData.completions / analyticsData.totalStarts) * 100
              : 0,
          completionChange: analyticsData.periodComparison.completionRateChange,
          avgTimeChange: analyticsData.periodComparison.avgTimeChange,
          paywallConversionChange: 0, // Would need historical comparison
          rpvChange: 0, // Would need historical comparison
          revenueChange: analyticsData.periodComparison.startsChange,
        },
      }
    : null

  const isLoading = analyticsLoading || businessLoading || sessionsLoading

  // Scroll detection for shrinking header
  useEffect(() => {
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement
      setScrolled(target.scrollTop > 100)
    }

    // The analytics TabsContent is the scrolling container
    const tabContent = document.querySelector('[data-state="active"]')
    if (tabContent) {
      tabContent.addEventListener('scroll', handleScroll)
      return () => tabContent.removeEventListener('scroll', handleScroll)
    }
  }, [metrics])

  if (isLoading) {
    return (
      <div className='flex h-96 items-center justify-center'>
        <div className='text-center'>
          <div className='border-primary mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2' />
          <p className='text-muted-foreground'>Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (!metrics) return null

  const completionRate = (metrics.completions / metrics.totalStarts) * 100

  // Calculate biggest drop-off point
  const biggestDropOff = metrics.stepMetrics.reduce((prev, current) =>
    current.dropOffs / current.views > prev.dropOffs / prev.views
      ? current
      : prev
  )

  return (
    <div className='p-8'>
      {/* Header - Sticky and Shrinking */}
      <div
        className={cn(
          'bg-background/95 sticky top-0 z-10 -mx-8 -mt-8 mb-6 px-8 backdrop-blur-sm transition-all duration-300',
          scrolled && 'shadow-sm'
        )}
      >
        <div
          className={cn(
            'flex items-center justify-between transition-all duration-300',
            scrolled ? 'py-3' : 'pt-8 pb-6'
          )}
        >
          <div>
            <div className='flex items-center gap-3'>
              <h2
                className={cn(
                  'font-bold transition-all duration-300',
                  scrolled ? 'text-lg' : 'text-2xl'
                )}
              >
                {metrics.flowName}
              </h2>
              <Badge
                variant={metrics.isActive ? 'default' : 'secondary'}
                className={cn(
                  'transition-all duration-300',
                  scrolled && 'scale-90'
                )}
              >
                {metrics.isActive ? 'Active' : 'Inactive'}
              </Badge>
              <Badge
                variant='outline'
                className={cn(
                  'transition-all duration-300',
                  scrolled && 'scale-90'
                )}
              >
                v{metrics.version}
              </Badge>
            </div>
            <p
              className={cn(
                'text-muted-foreground transition-all duration-300',
                scrolled ? 'mt-1 text-xs' : 'mt-2 text-sm'
              )}
            >
              Last updated {metrics.lastUpdated.toLocaleTimeString()}
            </p>
          </div>
          <Button
            variant='outline'
            size={scrolled ? 'sm' : 'default'}
            onClick={() => refetchAnalytics()}
          >
            <RefreshCw className='mr-2 h-4 w-4' />
            Refresh
          </Button>
        </div>
      </div>

      <div className='space-y-6'>
        {/* Key Metrics */}
        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>
                Completion Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>
                {completionRate.toFixed(1)}%
              </div>
              <p className='text-muted-foreground text-xs'>
                {metrics.trends.completionChange > 0 ? '+' : ''}
                {metrics.trends.completionChange}% from last period
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>
                Average Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>
                {Math.floor(metrics.avgCompletionTime / 60)}:
                {(metrics.avgCompletionTime % 60).toString().padStart(2, '0')}
              </div>
              <p className='text-muted-foreground text-xs'>
                {metrics.trends.avgTimeChange < 0 ? '' : '+'}
                {metrics.trends.avgTimeChange}s from last period
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>
                Total Starts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>
                {metrics.totalStarts.toLocaleString()}
              </div>
              <p className='text-muted-foreground text-xs'>
                {metrics.completions.toLocaleString()} completed
              </p>
            </CardContent>
          </Card>

          <Card className='border-green-500/20 bg-green-50/50 dark:bg-green-950/20'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>Live Now</CardTitle>
              <div className='relative'>
                <div className='absolute inset-0 animate-ping rounded-full bg-green-500 opacity-25' />
                <div className='relative h-3 w-3 rounded-full bg-green-500' />
              </div>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>{metrics.activeNow}</div>
              <p className='text-muted-foreground text-xs'>active users</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>Paywall CVR</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>
                {metrics.businessMetrics.paywallConversionRate.toFixed(1)}%
              </div>
              <p className='text-muted-foreground text-xs'>
                {metrics.trends.paywallConversionChange > 0 ? '+' : ''}
                {metrics.trends.paywallConversionChange}% from last period
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>RPV</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>
                ${metrics.businessMetrics.revenuePerVisitor.toFixed(2)}
              </div>
              <p className='text-muted-foreground text-xs'>
                {metrics.trends.rpvChange > 0 ? '+' : ''}
                {metrics.trends.rpvChange}% from last period
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>ARPU / LTV</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>
                ${metrics.businessMetrics.avgRevenuePerUser.toFixed(0)}{' '}
                <span className='text-muted-foreground text-sm font-normal'>
                  / ${metrics.businessMetrics.lifetimeValue.toFixed(0)}
                </span>
              </div>
              <p className='text-muted-foreground text-xs'>
                per user / lifetime
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>
                Activation Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>
                {metrics.businessMetrics.activationRate.toFixed(1)}%
              </div>
              <p className='text-muted-foreground text-xs'>
                {metrics.businessMetrics.activationRate > 0
                  ? 'Based on user actions'
                  : 'No activation data yet'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Step Completion Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Step Completion Rates</CardTitle>
            <CardDescription>
              Percentage of users who complete each step
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width='100%' height={300}>
              <BarChart
                data={metrics.stepMetrics.map((step, index) => ({
                  name:
                    step.stepName.length > 15
                      ? step.stepName.substring(0, 15) + '...'
                      : step.stepName,
                  completion: ((step.completions / step.views) * 100).toFixed(
                    1
                  ),
                  stepId: step.stepId,
                  index,
                }))}
              >
                <XAxis
                  dataKey='name'
                  angle={-45}
                  textAnchor='end'
                  height={80}
                  fontSize={12}
                  stroke='#888888'
                />
                <YAxis
                  stroke='#888888'
                  fontSize={12}
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip
                  formatter={(value) => [`${value}%`, 'Completion Rate']}
                  contentStyle={{
                    backgroundColor: 'var(--background)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  }}
                  labelStyle={{ color: 'var(--foreground)' }}
                  itemStyle={{ color: 'var(--foreground)' }}
                  cursor={{ fill: 'rgba(99, 102, 241, 0.1)' }}
                />
                <Bar dataKey='completion' radius={[4, 4, 0, 0]}>
                  {metrics.stepMetrics.map((step, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        selectedStepId === step.stepId ? '#4f46e5' : '#6366f1'
                      }
                      stroke={
                        selectedStepId === step.stepId ? '#3730a3' : 'none'
                      }
                      strokeWidth={selectedStepId === step.stepId ? 2 : 0}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Visual Funnel */}
        <Card>
          <CardHeader>
            <CardTitle>Flow Performance</CardTitle>
            <CardDescription>
              See where users complete or drop off
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className='space-y-6'>
              {[...metrics.stepMetrics]
                .sort((a, b) => {
                  // Move selected step to top
                  if (selectedStepId === a.stepId) return -1
                  if (selectedStepId === b.stepId) return 1
                  // Keep original order for non-selected items
                  return (
                    metrics.stepMetrics.indexOf(a) -
                    metrics.stepMetrics.indexOf(b)
                  )
                })
                .map((step) => {
                  const originalIndex = metrics.stepMetrics.findIndex(
                    (s) => s.stepId === step.stepId
                  )
                  const completionRate = (step.completions / step.views) * 100
                  const dropOffRate = (step.dropOffs / step.views) * 100
                  const isSelected = selectedStepId === step.stepId

                  return (
                    <div
                      key={step.stepId}
                      className={cn(
                        '-mx-4 space-y-2 rounded-lg border p-4 transition-all duration-200',
                        isSelected
                          ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20'
                          : 'border-transparent'
                      )}
                    >
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center gap-3'>
                          <div
                            className={cn(
                              'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium',
                              isSelected
                                ? 'bg-indigo-500 text-white'
                                : 'bg-muted'
                            )}
                          >
                            {originalIndex + 1}
                          </div>
                          <div>
                            <p className='font-medium'>{step.stepName}</p>
                            <p className='text-muted-foreground text-xs'>
                              {step.screenType}
                            </p>
                          </div>
                        </div>
                        <div className='flex items-center gap-6 text-sm'>
                          <div className='flex items-center gap-2'>
                            <Eye className='text-muted-foreground h-4 w-4' />
                            <span>{step.views.toLocaleString()} views</span>
                          </div>
                          <div className='flex items-center gap-2'>
                            <Clock className='text-muted-foreground h-4 w-4' />
                            <span>{step.avgTimeSeconds}s avg</span>
                          </div>
                          {dropOffRate > 5 && (
                            <Badge variant='destructive' className='text-xs'>
                              {dropOffRate.toFixed(1)}% drop
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className='relative'>
                        <div className='bg-secondary h-8 overflow-hidden rounded-md'>
                          <div
                            className='h-full bg-indigo-600/50 transition-all duration-300'
                            style={{ width: `${completionRate}%` }}
                          />
                        </div>
                        <div className='pointer-events-none absolute inset-0 flex items-center justify-between px-3'>
                          <span className='text-foreground text-xs font-medium'>
                            {step.completions.toLocaleString()} completed
                          </span>
                          <span className='text-foreground text-xs font-medium'>
                            {completionRate.toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      {/* Connection Line */}
                      {originalIndex < metrics.stepMetrics.length - 1 && (
                        <div className='flex items-center justify-center py-2'>
                          <ArrowDown className='text-muted-foreground h-4 w-4' />
                        </div>
                      )}
                    </div>
                  )
                })}
            </div>

            {/* Biggest Drop-off Alert */}
            <div className='mt-6 rounded-lg border border-orange-200 bg-orange-50/50 p-4 dark:border-orange-800 dark:bg-orange-950/20'>
              <div className='flex items-start gap-3'>
                <AlertCircle className='mt-0.5 h-5 w-5 text-orange-600' />
                <div>
                  <p className='font-medium'>Biggest drop-off point</p>
                  <p className='text-muted-foreground mt-1 text-sm'>
                    <span className='font-medium'>
                      {(
                        (biggestDropOff.dropOffs / biggestDropOff.views) *
                        100
                      ).toFixed(1)}
                      %
                    </span>{' '}
                    of users drop off at
                    <span className='font-medium'>
                      {' '}
                      "{biggestDropOff.stepName}"
                    </span>
                  </p>
                  <Button variant='link' className='mt-2 h-auto p-0 text-sm'>
                    View step details <ChevronRight className='ml-1 h-3 w-3' />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Live Sessions */}
        <Card>
          <CardHeader>
            <div className='flex items-center justify-between'>
              <div>
                <CardTitle>Live Sessions</CardTitle>
                <CardDescription>Users currently in the flow</CardDescription>
              </div>
              <Badge variant='outline' className='gap-1'>
                <Activity className='h-3 w-3' />
                Live
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className='space-y-3'>
              {liveSessions.map((session) => {
                const elapsedTime = Math.floor(
                  (Date.now() - session.startTime.getTime()) / 1000
                )
                const currentStepIndex = metrics.stepMetrics.findIndex(
                  (s) => s.stepId === session.currentStep
                )

                return (
                  <motion.div
                    key={session.userId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className='bg-card rounded-lg border p-4'
                  >
                    <div className='mb-3 flex items-center justify-between'>
                      <div className='flex items-center gap-3'>
                        <div className='bg-muted flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium'>
                          {session.userId.slice(-3)}
                        </div>
                        <div>
                          <p className='text-sm font-medium'>
                            User {session.userId}
                          </p>
                          <p className='text-muted-foreground text-xs'>
                            Started {Math.floor(elapsedTime / 60)}m{' '}
                            {elapsedTime % 60}s ago
                          </p>
                        </div>
                      </div>
                      <div className='text-right'>
                        <p className='text-sm font-medium'>
                          {metrics.stepMetrics[currentStepIndex]?.stepName}
                        </p>
                        <p className='text-muted-foreground text-xs'>
                          Step {currentStepIndex + 1} of{' '}
                          {metrics.stepMetrics.length}
                        </p>
                      </div>
                    </div>

                    {/* Progress visualization */}
                    <div className='flex items-center gap-1'>
                      {metrics.stepMetrics.map((step, index) => (
                        <div
                          key={step.stepId}
                          className={cn(
                            'h-2 flex-1 rounded-full transition-all',
                            index < currentStepIndex
                              ? 'bg-green-500'
                              : index === currentStepIndex
                                ? 'animate-pulse bg-blue-500'
                                : 'bg-muted'
                          )}
                        />
                      ))}
                    </div>
                  </motion.div>
                )
              })}

              {liveSessions.length === 0 && (
                <div className='text-muted-foreground py-8 text-center'>
                  No active sessions at the moment
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
