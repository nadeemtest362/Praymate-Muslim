import { useState } from 'react'
import {
  BarChart3,
  TrendingUp,
  Users,
  Clock,
  MousePointerClick,
  AlertCircle,
  ChevronRight,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface FlowAnalyticsProps {
  flowId: string
  className?: string
}

// Mock data - replace with real API calls
const mockAnalytics = {
  overview: {
    totalStarts: 12543,
    completionRate: 68.4,
    avgTimeToComplete: '3:42',
    dropOffRate: 31.6,
    trend: 'up' as const,
    trendValue: 12.3,
  },
  stepPerformance: [
    { name: 'Welcome', completionRate: 98.2, avgTime: '0:05', dropOff: 1.8 },
    {
      name: 'Mood Selection',
      completionRate: 94.5,
      avgTime: '0:12',
      dropOff: 3.7,
    },
    {
      name: 'Faith Tradition',
      completionRate: 89.1,
      avgTime: '0:08',
      dropOff: 5.4,
    },
    {
      name: 'Prayer People',
      completionRate: 72.3,
      avgTime: '1:34',
      dropOff: 16.8,
      warning: true,
    },
    {
      name: 'Prayer Example',
      completionRate: 95.6,
      avgTime: '0:45',
      dropOff: 23.3,
    },
    {
      name: 'Confirmation',
      completionRate: 98.9,
      avgTime: '0:03',
      dropOff: 1.1,
    },
  ],
  userSegments: [
    { name: 'New Users', percentage: 65, color: 'from-blue-500 to-cyan-500' },
    {
      name: 'Returning Users',
      percentage: 25,
      color: 'from-purple-500 to-pink-500',
    },
    {
      name: 'Premium Users',
      percentage: 10,
      color: 'from-amber-500 to-orange-500',
    },
  ],
  recommendations: [
    {
      type: 'warning',
      title: 'High drop-off detected',
      description: 'Prayer People screen has 16.8% drop-off rate',
      action: 'Consider simplifying or making optional',
    },
    {
      type: 'success',
      title: 'Strong opener',
      description: 'Welcome screen has 98.2% completion rate',
      action: 'Keep current design',
    },
    {
      type: 'info',
      title: 'Optimization opportunity',
      description: 'Average completion time could be reduced',
      action: 'Review Prayer People screen duration',
    },
  ],
}

export function FlowAnalytics({ flowId, className }: FlowAnalyticsProps) {
  const [selectedTab, setSelectedTab] = useState('overview')

  return (
    <div className={cn('space-y-6', className)}>
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className='grid w-full grid-cols-3'>
          <TabsTrigger value='overview'>Overview</TabsTrigger>
          <TabsTrigger value='performance'>Performance</TabsTrigger>
          <TabsTrigger value='insights'>Insights</TabsTrigger>
        </TabsList>

        <TabsContent value='overview' className='mt-4 space-y-4'>
          {/* Key Metrics */}
          <div className='grid grid-cols-2 gap-4'>
            <Card className='p-4'>
              <div className='flex items-start justify-between'>
                <div>
                  <p className='text-muted-foreground text-sm'>Total Starts</p>
                  <p className='mt-1 text-2xl font-bold'>
                    {mockAnalytics.overview.totalStarts.toLocaleString()}
                  </p>
                  <div className='mt-2 flex items-center gap-1'>
                    {mockAnalytics.overview.trend === 'up' ? (
                      <ArrowUp className='h-4 w-4 text-green-500' />
                    ) : (
                      <ArrowDown className='h-4 w-4 text-red-500' />
                    )}
                    <span
                      className={cn(
                        'text-sm',
                        mockAnalytics.overview.trend === 'up'
                          ? 'text-green-500'
                          : 'text-red-500'
                      )}
                    >
                      {mockAnalytics.overview.trendValue}%
                    </span>
                  </div>
                </div>
                <Users className='text-muted-foreground h-5 w-5' />
              </div>
            </Card>

            <Card className='p-4'>
              <div className='flex items-start justify-between'>
                <div>
                  <p className='text-muted-foreground text-sm'>
                    Completion Rate
                  </p>
                  <p className='mt-1 text-2xl font-bold'>
                    {mockAnalytics.overview.completionRate}%
                  </p>
                  <Progress
                    value={mockAnalytics.overview.completionRate}
                    className='mt-2 h-2'
                  />
                </div>
                <TrendingUp className='text-muted-foreground h-5 w-5' />
              </div>
            </Card>

            <Card className='p-4'>
              <div className='flex items-start justify-between'>
                <div>
                  <p className='text-muted-foreground text-sm'>Avg. Time</p>
                  <p className='mt-1 text-2xl font-bold'>
                    {mockAnalytics.overview.avgTimeToComplete}
                  </p>
                  <p className='text-muted-foreground mt-1 text-xs'>
                    minutes to complete
                  </p>
                </div>
                <Clock className='text-muted-foreground h-5 w-5' />
              </div>
            </Card>

            <Card className='p-4'>
              <div className='flex items-start justify-between'>
                <div>
                  <p className='text-muted-foreground text-sm'>Drop-off Rate</p>
                  <p className='mt-1 text-2xl font-bold'>
                    {mockAnalytics.overview.dropOffRate}%
                  </p>
                  <p className='text-muted-foreground mt-1 text-xs'>
                    users who don't finish
                  </p>
                </div>
                <MousePointerClick className='text-muted-foreground h-5 w-5' />
              </div>
            </Card>
          </div>

          {/* User Segments */}
          <Card className='p-4'>
            <h3 className='mb-4 font-medium'>User Segments</h3>
            <div className='space-y-3'>
              {mockAnalytics.userSegments.map((segment) => (
                <div key={segment.name} className='flex items-center gap-4'>
                  <div
                    className={cn(
                      'h-3 w-3 rounded-full bg-gradient-to-r',
                      segment.color
                    )}
                  />
                  <div className='flex-1'>
                    <div className='mb-1 flex items-center justify-between'>
                      <p className='text-sm font-medium'>{segment.name}</p>
                      <span className='text-muted-foreground text-sm'>
                        {segment.percentage}%
                      </span>
                    </div>
                    <Progress value={segment.percentage} className='h-2' />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value='performance' className='mt-4 space-y-4'>
          <Card className='p-4'>
            <h3 className='mb-4 font-medium'>Step-by-Step Performance</h3>
            <div className='space-y-3'>
              {mockAnalytics.stepPerformance.map((step, index) => (
                <div
                  key={step.name}
                  className={cn(
                    'rounded-lg border p-3',
                    step.warning && 'border-orange-500/50 bg-orange-500/5'
                  )}
                >
                  <div className='flex items-start gap-3'>
                    <div className='bg-primary/10 flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium'>
                      {index + 1}
                    </div>
                    <div className='flex-1'>
                      <div className='mb-2 flex items-center justify-between'>
                        <p className='font-medium'>{step.name}</p>
                        {step.warning && (
                          <AlertCircle className='h-4 w-4 text-orange-500' />
                        )}
                      </div>
                      <div className='grid grid-cols-3 gap-4 text-sm'>
                        <div>
                          <p className='text-muted-foreground'>Completion</p>
                          <p className='font-medium'>{step.completionRate}%</p>
                        </div>
                        <div>
                          <p className='text-muted-foreground'>Avg. Time</p>
                          <p className='font-medium'>{step.avgTime}</p>
                        </div>
                        <div>
                          <p className='text-muted-foreground'>Drop-off</p>
                          <p
                            className={cn(
                              'font-medium',
                              step.dropOff > 10 && 'text-orange-500'
                            )}
                          >
                            {step.dropOff}%
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value='insights' className='mt-4 space-y-4'>
          {mockAnalytics.recommendations.map((rec, index) => (
            <Card key={index} className='p-4'>
              <div className='flex items-start gap-3'>
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full',
                    rec.type === 'warning' &&
                      'bg-orange-500/10 text-orange-500',
                    rec.type === 'success' && 'bg-green-500/10 text-green-500',
                    rec.type === 'info' && 'bg-blue-500/10 text-blue-500'
                  )}
                >
                  {rec.type === 'warning' && (
                    <AlertCircle className='h-4 w-4' />
                  )}
                  {rec.type === 'success' && <TrendingUp className='h-4 w-4' />}
                  {rec.type === 'info' && <BarChart3 className='h-4 w-4' />}
                </div>
                <div className='flex-1'>
                  <h4 className='font-medium'>{rec.title}</h4>
                  <p className='text-muted-foreground mt-1 text-sm'>
                    {rec.description}
                  </p>
                  <p className='mt-2 flex items-center gap-1 text-sm font-medium'>
                    {rec.action}
                    <ChevronRight className='h-3 w-3' />
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  )
}
