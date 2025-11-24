import { useEffect, useState } from 'react'
import {
  DollarSign,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Zap,
  Hash,
  FileText,
  Settings,
  ChevronRight,
  Info,
  Calculator,
  Lightbulb,
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
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
  ComposedChart,
} from 'recharts'
import { cn } from '@/lib/utils'
import { Alert, AlertDescription } from '@/components/ui/alert'
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

interface CostMetric {
  date: string
  totalCost: number
  tokenCount: number
  requestCount: number
  avgCostPerRequest: number
  avgTokensPerRequest: number
}

interface ModelUsage {
  model: string
  requests: number
  tokens: number
  cost: number
  avgLatency: number
  errorRate: number
}

interface CostSavingOpportunity {
  id: string
  title: string
  description: string
  potentialSavings: number
  difficulty: 'easy' | 'medium' | 'hard'
  impact: 'low' | 'medium' | 'high'
  implementation: string
}

export function CostOptimization() {
  const [costMetrics, setCostMetrics] = useState<CostMetric[]>([])
  const [modelUsage, setModelUsage] = useState<ModelUsage[]>([])
  const [opportunities, setOpportunities] = useState<CostSavingOpportunity[]>(
    []
  )
  const [totalMonthlyCost, setTotalMonthlyCost] = useState(0)
  const [projectedSavings, setProjectedSavings] = useState(0)

  useEffect(() => {
    // Simulate fetching cost data
    const mockCostMetrics: CostMetric[] = Array.from({ length: 30 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - (29 - i))
      const baseRequests = 8000 + Math.random() * 2000
      const tokensPerRequest = 1500 + Math.random() * 500
      return {
        date: date.toISOString().split('T')[0],
        requestCount: Math.floor(baseRequests),
        tokenCount: Math.floor(baseRequests * tokensPerRequest),
        totalCost: baseRequests * tokensPerRequest * 0.00002,
        avgCostPerRequest: tokensPerRequest * 0.00002,
        avgTokensPerRequest: Math.floor(tokensPerRequest),
      }
    })
    setCostMetrics(mockCostMetrics)

    // Calculate total monthly cost
    const monthlyTotal = mockCostMetrics.reduce(
      (sum, day) => sum + day.totalCost,
      0
    )
    setTotalMonthlyCost(monthlyTotal)

    // Model usage breakdown
    const mockModelUsage: ModelUsage[] = [
      {
        model: 'gpt-4-turbo',
        requests: 45000,
        tokens: 67500000,
        cost: 1350,
        avgLatency: 2800,
        errorRate: 0.8,
      },
      {
        model: 'gpt-3.5-turbo',
        requests: 120000,
        tokens: 120000000,
        cost: 480,
        avgLatency: 1200,
        errorRate: 0.5,
      },
      {
        model: 'text-embedding-3-small',
        requests: 85000,
        tokens: 8500000,
        cost: 8.5,
        avgLatency: 150,
        errorRate: 0.1,
      },
    ]
    setModelUsage(mockModelUsage)

    // Cost saving opportunities
    const mockOpportunities: CostSavingOpportunity[] = [
      {
        id: '1',
        title: 'Implement Response Caching',
        description:
          'Cache frequently requested prayer types and moods to reduce duplicate API calls',
        potentialSavings: 320,
        difficulty: 'easy',
        impact: 'high',
        implementation:
          'Add Redis cache with 24hr TTL for common prayer combinations',
      },
      {
        id: '2',
        title: 'Switch to GPT-3.5 for Simple Prayers',
        description:
          'Use GPT-3.5-turbo for basic prayer requests, reserve GPT-4 for complex ones',
        potentialSavings: 450,
        difficulty: 'medium',
        impact: 'high',
        implementation:
          'Implement prayer complexity scoring and route accordingly',
      },
      {
        id: '3',
        title: 'Optimize Token Usage',
        description:
          'Reduce system prompts and implement dynamic context sizing',
        potentialSavings: 180,
        difficulty: 'medium',
        impact: 'medium',
        implementation:
          'Compress prompts, remove redundant instructions, use few-shot examples',
      },
      {
        id: '4',
        title: 'Batch Similar Requests',
        description: 'Group similar prayer requests and process in batches',
        potentialSavings: 120,
        difficulty: 'hard',
        impact: 'medium',
        implementation:
          'Queue system with 5-second window for batching similar requests',
      },
      {
        id: '5',
        title: 'Implement Retry Budgets',
        description:
          'Set limits on retries for failed requests to control costs',
        potentialSavings: 65,
        difficulty: 'easy',
        impact: 'low',
        implementation:
          'Max 2 retries with exponential backoff, alert on repeated failures',
      },
    ]
    setOpportunities(mockOpportunities)
    setProjectedSavings(
      mockOpportunities.reduce((sum, opp) => sum + opp.potentialSavings, 0)
    )
  }, [])

  // Calculate cost breakdown for pie chart
  const costBreakdown = modelUsage.map((model) => ({
    name: model.model,
    value: model.cost,
    percentage: (
      (model.cost / modelUsage.reduce((sum, m) => sum + m.cost, 0)) *
      100
    ).toFixed(1),
  }))

  const pieColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

  // Token efficiency over time
  const efficiencyData = costMetrics.map((metric) => ({
    date: new Date(metric.date).getDate(),
    avgTokens: metric.avgTokensPerRequest,
    avgCost: metric.avgCostPerRequest,
  }))

  return (
    <div className='space-y-6'>
      {/* Header Metrics */}
      <div className='grid gap-4 md:grid-cols-4'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Monthly Cost</CardTitle>
            <DollarSign className='text-muted-foreground h-4 w-4' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              ${totalMonthlyCost.toFixed(2)}
            </div>
            <div className='mt-1 flex items-center'>
              <TrendingUp className='mr-1 h-3 w-3 text-red-500' />
              <span className='text-xs text-red-500'>+12.3% vs last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Potential Savings
            </CardTitle>
            <Lightbulb className='text-muted-foreground h-4 w-4' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-green-600'>
              ${projectedSavings}/mo
            </div>
            <Badge variant='outline' className='mt-1 text-xs'>
              {((projectedSavings / totalMonthlyCost) * 100).toFixed(0)}%
              reduction
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Avg Cost/Prayer
            </CardTitle>
            <Calculator className='text-muted-foreground h-4 w-4' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>$0.024</div>
            <div className='mt-1 flex items-center'>
              <TrendingDown className='mr-1 h-3 w-3 text-green-500' />
              <span className='text-xs text-green-500'>
                -8.2% efficiency gain
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Token Efficiency
            </CardTitle>
            <Zap className='text-muted-foreground h-4 w-4' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>1,842</div>
            <p className='text-muted-foreground mt-1 text-xs'>
              avg tokens/request
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cost Trend Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className='text-xl font-bold'>API Cost Trends</CardTitle>
          <CardDescription>
            Daily costs and token usage over the last 30 days
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue='cost' className='space-y-4'>
            <TabsList>
              <TabsTrigger value='cost'>Cost Trend</TabsTrigger>
              <TabsTrigger value='efficiency'>Token Efficiency</TabsTrigger>
              <TabsTrigger value='breakdown'>Model Breakdown</TabsTrigger>
            </TabsList>

            <TabsContent value='cost'>
              <ResponsiveContainer width='100%' height={300}>
                <ComposedChart data={costMetrics}>
                  <CartesianGrid strokeDasharray='3 3' />
                  <XAxis
                    dataKey='date'
                    tickFormatter={(date) => new Date(date).getDate()}
                  />
                  <YAxis yAxisId='left' />
                  <YAxis yAxisId='right' orientation='right' />
                  <Tooltip
                    formatter={(value: any, name: string) => {
                      if (name === 'Cost') return `$${value.toFixed(2)}`
                      return value.toLocaleString()
                    }}
                  />
                  <Area
                    yAxisId='left'
                    type='monotone'
                    dataKey='totalCost'
                    stroke='#3b82f6'
                    fill='#3b82f6'
                    fillOpacity={0.6}
                    name='Cost'
                  />
                  <Line
                    yAxisId='right'
                    type='monotone'
                    dataKey='requestCount'
                    stroke='#10b981'
                    name='Requests'
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </TabsContent>

            <TabsContent value='efficiency'>
              <ResponsiveContainer width='100%' height={300}>
                <LineChart data={efficiencyData}>
                  <CartesianGrid strokeDasharray='3 3' />
                  <XAxis dataKey='date' />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type='monotone'
                    dataKey='avgTokens'
                    stroke='#8b5cf6'
                    name='Avg Tokens'
                  />
                </LineChart>
              </ResponsiveContainer>
            </TabsContent>

            <TabsContent value='breakdown'>
              <div className='grid gap-4 md:grid-cols-2'>
                <ResponsiveContainer width='100%' height={300}>
                  <PieChart>
                    <Pie
                      data={costBreakdown}
                      cx='50%'
                      cy='50%'
                      labelLine={false}
                      label={({ name, percentage }) =>
                        `${name}: ${percentage}%`
                      }
                      outerRadius={100}
                      fill='#8884d8'
                      dataKey='value'
                    >
                      {costBreakdown.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={pieColors[index % pieColors.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: any) => `$${value.toFixed(2)}`}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className='space-y-4'>
                  {modelUsage.map((model, index) => (
                    <div
                      key={model.model}
                      className='flex items-center justify-between rounded-lg border p-3'
                    >
                      <div className='flex items-center gap-3'>
                        <div
                          className='h-3 w-3 rounded-full'
                          style={{
                            backgroundColor:
                              pieColors[index % pieColors.length],
                          }}
                        />
                        <div>
                          <p className='font-medium'>{model.model}</p>
                          <p className='text-muted-foreground text-sm'>
                            {model.requests.toLocaleString()} requests
                          </p>
                        </div>
                      </div>
                      <div className='text-right'>
                        <p className='font-bold'>${model.cost.toFixed(2)}</p>
                        <p className='text-muted-foreground text-xs'>
                          ${(model.cost / model.requests).toFixed(4)}/req
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Cost Optimization Opportunities */}
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div>
              <CardTitle className='text-xl font-bold'>
                Cost Optimization Opportunities
              </CardTitle>
              <CardDescription>
                Actionable recommendations to reduce API costs
              </CardDescription>
            </div>
            <Badge className='bg-green-500'>
              ${projectedSavings}/mo potential savings
            </Badge>
          </div>
        </CardHeader>
        <CardContent className='space-y-4'>
          {opportunities.map((opportunity) => (
            <div
              key={opportunity.id}
              className='cursor-pointer rounded-lg border p-4 transition-shadow hover:shadow-md'
            >
              <div className='flex items-start justify-between'>
                <div className='flex-1'>
                  <div className='mb-2 flex items-center gap-2'>
                    <h3 className='font-semibold'>{opportunity.title}</h3>
                    <Badge
                      variant={
                        opportunity.impact === 'high' ? 'default' : 'secondary'
                      }
                      className={cn(
                        opportunity.impact === 'high' && 'bg-green-500',
                        opportunity.impact === 'medium' && 'bg-yellow-500'
                      )}
                    >
                      {opportunity.impact} impact
                    </Badge>
                    <Badge variant='outline'>{opportunity.difficulty}</Badge>
                  </div>
                  <p className='text-muted-foreground mb-2 text-sm'>
                    {opportunity.description}
                  </p>
                  <div className='flex items-center gap-4'>
                    <div className='flex items-center gap-1'>
                      <DollarSign className='h-4 w-4 text-green-500' />
                      <span className='text-sm font-medium text-green-600'>
                        Save ${opportunity.potentialSavings}/mo
                      </span>
                    </div>
                    <Button variant='link' size='sm' className='h-auto p-0'>
                      View implementation
                      <ChevronRight className='ml-1 h-3 w-3' />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          <Alert>
            <Info className='h-4 w-4' />
            <AlertDescription>
              Implementing all recommendations could reduce your monthly API
              costs by{' '}
              <strong>
                {((projectedSavings / totalMonthlyCost) * 100).toFixed(0)}%
              </strong>{' '}
              while maintaining prayer quality.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Usage Patterns */}
      <div className='grid gap-6 md:grid-cols-2'>
        <Card>
          <CardHeader>
            <CardTitle className='text-lg font-bold'>
              Peak Usage Times
            </CardTitle>
            <CardDescription>
              Optimize capacity for high-demand periods
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className='space-y-3'>
              <div className='flex items-center justify-between'>
                <span className='text-sm'>6:00 AM - 8:00 AM</span>
                <div className='flex items-center gap-2'>
                  <div className='h-2 w-32 rounded-full bg-gray-200'>
                    <div
                      className='h-2 rounded-full bg-blue-500'
                      style={{ width: '85%' }}
                    />
                  </div>
                  <span className='text-sm font-medium'>85%</span>
                </div>
              </div>
              <div className='flex items-center justify-between'>
                <span className='text-sm'>8:00 PM - 10:00 PM</span>
                <div className='flex items-center gap-2'>
                  <div className='h-2 w-32 rounded-full bg-gray-200'>
                    <div
                      className='h-2 rounded-full bg-blue-500'
                      style={{ width: '72%' }}
                    />
                  </div>
                  <span className='text-sm font-medium'>72%</span>
                </div>
              </div>
              <div className='flex items-center justify-between'>
                <span className='text-sm'>12:00 PM - 1:00 PM</span>
                <div className='flex items-center gap-2'>
                  <div className='h-2 w-32 rounded-full bg-gray-200'>
                    <div
                      className='h-2 rounded-full bg-blue-500'
                      style={{ width: '45%' }}
                    />
                  </div>
                  <span className='text-sm font-medium'>45%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className='text-lg font-bold'>
              Cost by Prayer Type
            </CardTitle>
            <CardDescription>
              Token usage varies by prayer complexity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className='space-y-3'>
              <div className='flex items-center justify-between'>
                <span className='text-sm'>Personal Intentions</span>
                <div className='flex items-center gap-2'>
                  <Badge variant='outline'>2,100 tokens</Badge>
                  <span className='text-sm font-medium'>$0.042</span>
                </div>
              </div>
              <div className='flex items-center justify-between'>
                <span className='text-sm'>Gratitude Prayers</span>
                <div className='flex items-center gap-2'>
                  <Badge variant='outline'>1,200 tokens</Badge>
                  <span className='text-sm font-medium'>$0.024</span>
                </div>
              </div>
              <div className='flex items-center justify-between'>
                <span className='text-sm'>Healing Prayers</span>
                <div className='flex items-center gap-2'>
                  <Badge variant='outline'>1,800 tokens</Badge>
                  <span className='text-sm font-medium'>$0.036</span>
                </div>
              </div>
              <div className='flex items-center justify-between'>
                <span className='text-sm'>Quick Blessings</span>
                <div className='flex items-center gap-2'>
                  <Badge variant='outline'>800 tokens</Badge>
                  <span className='text-sm font-medium'>$0.016</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
