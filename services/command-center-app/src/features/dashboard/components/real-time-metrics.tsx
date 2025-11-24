import { useEffect, useState } from 'react'
import {
  Activity,
  AlertCircle,
  TrendingUp,
  DollarSign,
  Zap,
  Users,
  Clock,
  BarChart3,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
} from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Metric {
  id: string
  label: string
  value: string | number
  change?: number
  status?: 'good' | 'warning' | 'danger'
  icon: any
  subtext?: string
}

export function RealTimeMetrics() {
  const [metrics, setMetrics] = useState<Metric[]>([])
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    // Initialize with default metrics
    const defaultMetrics: Metric[] = [
      {
        id: 'active_users',
        label: 'Active Now',
        value: '0',
        icon: Activity,
        status: 'good',
        subtext: 'Users in last 5min',
      },
      {
        id: 'generation_rate',
        label: 'Success Rate',
        value: '0%',
        icon: TrendingUp,
        status: 'good',
        subtext: 'Last hour',
      },
      {
        id: 'avg_latency',
        label: 'Avg Latency',
        value: '0ms',
        icon: Zap,
        status: 'good',
        subtext: 'Response time',
      },
      {
        id: 'error_rate',
        label: 'Error Rate',
        value: '0%',
        icon: AlertCircle,
        status: 'good',
        subtext: 'Last hour',
      },
      {
        id: 'api_cost',
        label: 'API Cost',
        value: '$0',
        icon: DollarSign,
        status: 'good',
        subtext: 'Today',
      },
      {
        id: 'queue_size',
        label: 'Queue Size',
        value: '0',
        icon: BarChart3,
        status: 'good',
        subtext: 'Pending prayers',
      },
    ]
    setMetrics(defaultMetrics)

    // Set up real-time subscription
    const channel = supabase
      .channel('prayer-metrics')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'prayer_logs',
        },
        (payload) => {
          // Update metrics based on new data
          updateMetrics(payload)
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED')
      })

    // Fetch initial metrics
    fetchRealtimeMetrics()

    // Set up polling for calculated metrics
    const interval = setInterval(fetchRealtimeMetrics, 10000) // Every 10 seconds

    return () => {
      channel.unsubscribe()
      clearInterval(interval)
    }
  }, [])

  const fetchRealtimeMetrics = async () => {
    try {
      // Fetch active users
      const { data: activeUsers } = await supabase
        .from('prayer_logs')
        .select('user_id')
        .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())
        .eq('status', 'completed')

      // Fetch success/error rates
      const { data: hourlyLogs } = await supabase
        .from('prayer_logs')
        .select('status, duration_ms, total_cost')
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())

      const uniqueUsers = new Set(activeUsers?.map((log) => log.user_id) || [])
      const successCount =
        hourlyLogs?.filter((log) => log.status === 'completed').length || 0
      const errorCount =
        hourlyLogs?.filter((log) => log.status === 'error').length || 0
      const totalCount = successCount + errorCount
      const avgLatency =
        hourlyLogs?.reduce((acc, log) => acc + (log.duration_ms || 0), 0) /
        (hourlyLogs?.length || 1)
      const todayCost =
        hourlyLogs?.reduce((acc, log) => acc + (log.total_cost || 0), 0) || 0

      // Fetch queue size
      const { count: queueSize } = await supabase
        .from('prayer_queue')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')

      setMetrics((prev) => [
        {
          ...prev[0],
          value: uniqueUsers.size.toLocaleString(),
          change: calculateChange(uniqueUsers.size, 100), // Compare with baseline
        },
        {
          ...prev[1],
          value:
            totalCount > 0
              ? `${((successCount / totalCount) * 100).toFixed(1)}%`
              : '100%',
          status: successCount / totalCount < 0.95 ? 'warning' : 'good',
        },
        {
          ...prev[2],
          value: `${Math.round(avgLatency)}ms`,
          status:
            avgLatency > 3000
              ? 'danger'
              : avgLatency > 2000
                ? 'warning'
                : 'good',
        },
        {
          ...prev[3],
          value:
            totalCount > 0
              ? `${((errorCount / totalCount) * 100).toFixed(1)}%`
              : '0%',
          status:
            errorCount / totalCount > 0.05
              ? 'danger'
              : errorCount / totalCount > 0.02
                ? 'warning'
                : 'good',
        },
        {
          ...prev[4],
          value: `$${todayCost.toFixed(2)}`,
          status: todayCost > 100 ? 'warning' : 'good',
        },
        {
          ...prev[5],
          value: (queueSize || 0).toLocaleString(),
          status: (queueSize || 0) > 50 ? 'warning' : 'good',
        },
      ])
    } catch (error) {
      console.error('Error fetching metrics:', error)
    }
  }

  const updateMetrics = (payload: any) => {
    // Handle real-time updates
    if (payload.eventType === 'INSERT' && payload.new) {
      // Update relevant metrics based on new prayer log
      fetchRealtimeMetrics()
    }
  }

  const calculateChange = (current: number, baseline: number): number => {
    if (baseline === 0) return 0
    return ((current - baseline) / baseline) * 100
  }

  return (
    <div className='relative'>
      {/* Connection Status */}
      <div className='absolute top-0 right-0 flex items-center gap-2'>
        <div
          className={cn(
            'h-2 w-2 rounded-full',
            isConnected ? 'bg-green-500' : 'bg-red-500'
          )}
        />
        <span className='text-muted-foreground text-xs'>
          {isConnected ? 'Live' : 'Connecting...'}
        </span>
      </div>

      {/* Metrics Grid */}
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6'>
        {metrics.map((metric) => (
          <Card
            key={metric.id}
            className={cn(
              'relative overflow-hidden transition-all hover:shadow-lg',
              metric.status === 'danger' && 'border-red-500/50 bg-red-50/5',
              metric.status === 'warning' &&
                'border-yellow-500/50 bg-yellow-50/5'
            )}
          >
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-muted-foreground text-sm font-medium'>
                {metric.label}
              </CardTitle>
              <metric.icon
                className={cn(
                  'h-4 w-4',
                  metric.status === 'good' && 'text-green-500',
                  metric.status === 'warning' && 'text-yellow-500',
                  metric.status === 'danger' && 'text-red-500'
                )}
              />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>{metric.value}</div>
              {metric.subtext && (
                <p className='text-muted-foreground mt-1 text-xs'>
                  {metric.subtext}
                </p>
              )}
              {metric.change !== undefined && (
                <div className='mt-2 flex items-center'>
                  {metric.change > 0 ? (
                    <ArrowUp className='h-3 w-3 text-green-500' />
                  ) : (
                    <ArrowDown className='h-3 w-3 text-red-500' />
                  )}
                  <span
                    className={cn(
                      'ml-1 text-xs',
                      metric.change > 0 ? 'text-green-500' : 'text-red-500'
                    )}
                  >
                    {Math.abs(metric.change).toFixed(1)}%
                  </span>
                </div>
              )}
            </CardContent>

            {/* Alert Indicator */}
            {metric.status === 'danger' && (
              <div className='absolute top-2 left-2'>
                <AlertTriangle className='h-3 w-3 animate-pulse text-red-500' />
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
