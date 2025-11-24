import { useEffect, useState } from 'react'
import {
  TrendingDown,
  TrendingUp,
  Users,
  Calendar,
  UserX,
  UserCheck,
  Clock,
  Target,
} from 'lucide-react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  Cell,
  PieChart,
  Pie,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface CohortData {
  cohort: string
  week0: number
  week1: number
  week2: number
  week3: number
  week4: number
}

interface ChurnPrediction {
  userId: string
  churnProbability: number
  riskLevel: 'high' | 'medium' | 'low'
  lastActive: Date
  totalPrayers: number
  engagementScore: number
}

export function RetentionAnalytics() {
  const [cohortData, setCohortData] = useState<CohortData[]>([])
  const [churnPredictions, setChurnPredictions] = useState<ChurnPrediction[]>(
    []
  )
  const [selectedMetric, setSelectedMetric] = useState<
    'daily' | 'weekly' | 'monthly'
  >('weekly')
  const [retentionRate, setRetentionRate] = useState(0)
  const [churnRate, setChurnRate] = useState(0)

  useEffect(() => {
    // Simulate fetching cohort data
    const mockCohortData: CohortData[] = [
      {
        cohort: 'Dec Week 1',
        week0: 100,
        week1: 78,
        week2: 65,
        week3: 58,
        week4: 52,
      },
      {
        cohort: 'Dec Week 2',
        week0: 100,
        week1: 82,
        week2: 69,
        week3: 61,
        week4: 55,
      },
      {
        cohort: 'Dec Week 3',
        week0: 100,
        week1: 85,
        week2: 72,
        week3: 64,
        week4: 58,
      },
      {
        cohort: 'Dec Week 4',
        week0: 100,
        week1: 88,
        week2: 75,
        week3: 67,
        week4: 61,
      },
      {
        cohort: 'Jan Week 1',
        week0: 100,
        week1: 91,
        week2: 78,
        week3: 70,
        week4: 64,
      },
    ]
    setCohortData(mockCohortData)

    // Calculate overall retention
    const avgRetention =
      mockCohortData.reduce((acc, cohort) => acc + cohort.week4, 0) /
      mockCohortData.length
    setRetentionRate(avgRetention)
    setChurnRate(100 - avgRetention)

    // Simulate churn predictions
    const mockChurnPredictions: ChurnPrediction[] = [
      {
        userId: 'user_1',
        churnProbability: 0.85,
        riskLevel: 'high',
        lastActive: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        totalPrayers: 3,
        engagementScore: 0.2,
      },
      {
        userId: 'user_2',
        churnProbability: 0.72,
        riskLevel: 'high',
        lastActive: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        totalPrayers: 8,
        engagementScore: 0.35,
      },
      {
        userId: 'user_3',
        churnProbability: 0.45,
        riskLevel: 'medium',
        lastActive: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        totalPrayers: 15,
        engagementScore: 0.5,
      },
      {
        userId: 'user_4',
        churnProbability: 0.38,
        riskLevel: 'medium',
        lastActive: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        totalPrayers: 22,
        engagementScore: 0.6,
      },
      {
        userId: 'user_5',
        churnProbability: 0.15,
        riskLevel: 'low',
        lastActive: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        totalPrayers: 45,
        engagementScore: 0.8,
      },
    ]
    setChurnPredictions(
      mockChurnPredictions.sort(
        (a, b) => b.churnProbability - a.churnProbability
      )
    )
  }, [])

  // Transform cohort data for visualization
  const cohortChartData = cohortData.map((cohort) => ({
    name: cohort.cohort,
    'Week 1': cohort.week1,
    'Week 2': cohort.week2,
    'Week 3': cohort.week3,
    'Week 4': cohort.week4,
  }))

  // User lifecycle data
  const lifecycleData = [
    { name: 'New Users', value: 35, color: '#10b981' },
    { name: 'Active', value: 45, color: '#3b82f6' },
    { name: 'At Risk', value: 15, color: '#f59e0b' },
    { name: 'Churned', value: 5, color: '#ef4444' },
  ]

  // Engagement score distribution
  const engagementData = [
    { score: '0-20', users: 120 },
    { score: '21-40', users: 180 },
    { score: '41-60', users: 350 },
    { score: '61-80', users: 420 },
    { score: '81-100', users: 230 },
  ]

  return (
    <div className='space-y-6'>
      {/* Key Metrics */}
      <div className='grid gap-4 md:grid-cols-4'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              4-Week Retention
            </CardTitle>
            <UserCheck className='text-muted-foreground h-4 w-4' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {retentionRate.toFixed(1)}%
            </div>
            <div className='mt-1 flex items-center'>
              <TrendingUp className='mr-1 h-3 w-3 text-green-500' />
              <span className='text-xs text-green-500'>
                +3.2% vs last month
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Churn Rate</CardTitle>
            <UserX className='text-muted-foreground h-4 w-4' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{churnRate.toFixed(1)}%</div>
            <div className='mt-1 flex items-center'>
              <TrendingDown className='mr-1 h-3 w-3 text-green-500' />
              <span className='text-xs text-green-500'>
                -2.1% vs last month
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Avg Session Length
            </CardTitle>
            <Clock className='text-muted-foreground h-4 w-4' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>4:32</div>
            <div className='mt-1 flex items-center'>
              <TrendingUp className='mr-1 h-3 w-3 text-green-500' />
              <span className='text-xs text-green-500'>+18s vs last week</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>LTV:CAC Ratio</CardTitle>
            <Target className='text-muted-foreground h-4 w-4' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>3.2:1</div>
            <Badge variant='outline' className='mt-1 text-xs'>
              Healthy
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Cohort Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className='text-xl font-bold'>
            Cohort Retention Analysis
          </CardTitle>
          <CardDescription>
            Weekly retention rates by user cohort
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width='100%' height={300}>
            <AreaChart data={cohortChartData}>
              <CartesianGrid strokeDasharray='3 3' />
              <XAxis dataKey='name' />
              <YAxis />
              <Tooltip />
              <Area
                type='monotone'
                dataKey='Week 1'
                stackId='1'
                stroke='#10b981'
                fill='#10b981'
                fillOpacity={0.6}
              />
              <Area
                type='monotone'
                dataKey='Week 2'
                stackId='1'
                stroke='#3b82f6'
                fill='#3b82f6'
                fillOpacity={0.6}
              />
              <Area
                type='monotone'
                dataKey='Week 3'
                stackId='1'
                stroke='#8b5cf6'
                fill='#8b5cf6'
                fillOpacity={0.6}
              />
              <Area
                type='monotone'
                dataKey='Week 4'
                stackId='1'
                stroke='#f59e0b'
                fill='#f59e0b'
                fillOpacity={0.6}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className='grid gap-6 md:grid-cols-2'>
        {/* User Lifecycle */}
        <Card>
          <CardHeader>
            <CardTitle className='text-xl font-bold'>
              User Lifecycle Distribution
            </CardTitle>
            <CardDescription>
              Current user base by lifecycle stage
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width='100%' height={200}>
              <PieChart>
                <Pie
                  data={lifecycleData}
                  cx='50%'
                  cy='50%'
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}%`}
                  outerRadius={80}
                  fill='#8884d8'
                  dataKey='value'
                >
                  {lifecycleData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Engagement Score Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className='text-xl font-bold'>
              Engagement Score Distribution
            </CardTitle>
            <CardDescription>
              User distribution by engagement level
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width='100%' height={200}>
              <BarChart data={engagementData}>
                <CartesianGrid strokeDasharray='3 3' />
                <XAxis dataKey='score' />
                <YAxis />
                <Tooltip />
                <Bar dataKey='users' fill='#8b5cf6' />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Churn Risk Users */}
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div>
              <CardTitle className='text-xl font-bold'>
                High Churn Risk Users
              </CardTitle>
              <CardDescription>
                Users likely to churn in the next 7 days
              </CardDescription>
            </div>
            <Button variant='outline' size='sm'>
              Export List
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            {churnPredictions.slice(0, 5).map((prediction) => (
              <div
                key={prediction.userId}
                className='flex items-center justify-between rounded-lg border p-4'
              >
                <div className='flex items-center gap-4'>
                  <div
                    className={cn(
                      'h-8 w-2 rounded-full',
                      prediction.riskLevel === 'high' && 'bg-red-500',
                      prediction.riskLevel === 'medium' && 'bg-yellow-500',
                      prediction.riskLevel === 'low' && 'bg-green-500'
                    )}
                  />
                  <div>
                    <p className='font-medium'>{prediction.userId}</p>
                    <p className='text-muted-foreground text-sm'>
                      Last active: {prediction.lastActive.toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className='flex items-center gap-6'>
                  <div className='text-right'>
                    <p className='text-muted-foreground text-sm'>Churn Risk</p>
                    <p className='text-lg font-bold'>
                      {(prediction.churnProbability * 100).toFixed(0)}%
                    </p>
                  </div>
                  <div className='text-right'>
                    <p className='text-muted-foreground text-sm'>
                      Total Prayers
                    </p>
                    <p className='font-medium'>{prediction.totalPrayers}</p>
                  </div>
                  <Button size='sm' variant='outline'>
                    Send Re-engagement
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
