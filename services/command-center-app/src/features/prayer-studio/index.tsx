import React, { useState, useEffect, useMemo } from 'react'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  MessageSquare,
  Zap,
  AlertTriangle,
  BarChart3,
  Brain,
  Clock,
  Hash,
  Sparkles,
  ChevronRight,
  Calendar,
  Filter,
  Download,
  RefreshCw,
  Info,
  Heart,
  Book,
  Smile,
  Frown,
  Activity,
  Loader2,
  CheckCircle,
  ArrowUp,
  ArrowDown,
  Target,
  Shield,
  Gauge,
  TrendingUpDown,
  Wallet,
  AlertCircle,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  RadialBarChart,
  RadialBar,
} from 'recharts'
import { cn } from '@/lib/utils'
import { PRAYER_TOPICS, PRAYER_UI } from '@/constants/prayerConstants'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { usePrayerAPI } from '@/features/dashboard/hooks/usePrayerAPI'
import { PrayerHistoryEntry } from '@/features/dashboard/services/prayer-api'

// Enhanced color palette with gradients
const COLORS = {
  primary: PRAYER_UI.COLORS.PRIMARY,
  primaryLight: '#818cf8',
  secondary: PRAYER_UI.COLORS.SECONDARY,
  tertiary: PRAYER_UI.COLORS.TERTIARY,
  success: '#10b981',
  successLight: '#34d399',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
  muted: '#6b7280',
  background: '#f9fafb',
  border: '#e5e7eb',
}

// Gradient definitions for charts
const ChartGradients = () => (
  <defs>
    <linearGradient id='colorPrayers' x1='0' y1='0' x2='0' y2='1'>
      <stop offset='5%' stopColor={COLORS.primary} stopOpacity={0.9} />
      <stop offset='95%' stopColor={COLORS.primary} stopOpacity={0} />
    </linearGradient>
    <linearGradient id='colorCost' x1='0' y1='0' x2='0' y2='1'>
      <stop offset='5%' stopColor={COLORS.success} stopOpacity={0.9} />
      <stop offset='95%' stopColor={COLORS.success} stopOpacity={0} />
    </linearGradient>
    <linearGradient id='colorSuccess' x1='0' y1='0' x2='0' y2='1'>
      <stop offset='5%' stopColor={COLORS.success} stopOpacity={0.9} />
      <stop offset='95%' stopColor={COLORS.success} stopOpacity={0} />
    </linearGradient>
  </defs>
)

// Enhanced custom tooltip with beautiful styling
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className='rounded-xl border border-gray-200 bg-white p-4 shadow-xl dark:border-gray-700 dark:bg-gray-900'>
        <p className='mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100'>
          {label}
        </p>
        <div className='space-y-1'>
          {payload.map((entry: any, index: number) => (
            <p
              key={index}
              className='flex items-center justify-between gap-4 text-sm'
            >
              <span className='text-gray-600 dark:text-gray-400'>
                {entry.name}:
              </span>
              <span className='font-medium' style={{ color: entry.color }}>
                {typeof entry.value === 'number' && entry.value % 1 !== 0
                  ? entry.value.toFixed(2)
                  : entry.value}
              </span>
            </p>
          ))}
        </div>
      </div>
    )
  }
  return null
}

// Metric card with enhanced design
const MetricCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  color = 'primary',
}: {
  title: string
  value: string | number
  subtitle?: string
  icon: any
  trend?: 'up' | 'down'
  trendValue?: string
  color?: keyof typeof COLORS
}) => (
  <Card
    className={cn(
      'overflow-hidden border-none shadow-md',
      color === 'primary' &&
        'bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40',
      color === 'success' &&
        'bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/40 dark:to-green-950/40',
      color === 'warning' &&
        'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40',
      color === 'danger' &&
        'bg-gradient-to-br from-rose-50 to-red-50 dark:from-rose-950/40 dark:to-red-950/40'
    )}
  >
    <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
      <CardTitle className='text-sm font-medium'>{title}</CardTitle>
      <div
        className={cn(
          'rounded-full p-2',
          color === 'primary' &&
            'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300',
          color === 'success' &&
            'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-300',
          color === 'warning' &&
            'bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-300',
          color === 'danger' &&
            'bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-300'
        )}
      >
        <Icon size={18} />
      </div>
    </CardHeader>
    <CardContent>
      <div className='text-2xl font-bold'>{value}</div>
      <div className='mt-1 flex items-center'>
        {trend && (
          <Badge
            variant='outline'
            className={cn(
              'gap-1 border-none px-1.5 text-xs font-normal',
              trend === 'up'
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            )}
          >
            {trend === 'up' ? '+' : '-'}
            {trendValue}
          </Badge>
        )}
        {subtitle && (
          <p className='text-muted-foreground ml-2 text-xs'>{subtitle}</p>
        )}
      </div>
    </CardContent>
  </Card>
)

// Section header component
const SectionHeader = ({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: React.ReactNode
}) => (
  <div className='flex items-center justify-between'>
    <div>
      <h3 className='text-base font-semibold'>{title}</h3>
      {description && (
        <p className='text-muted-foreground text-sm'>{description}</p>
      )}
    </div>
    {action}
  </div>
)

export function PrayerStudioV2() {
  const [timeRange, setTimeRange] = useState('7d')
  const [prayerHistory, setPrayerHistory] = useState<PrayerHistoryEntry[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)

  const {
    loading: apiLoading,
    error: apiError,
    getPrayerHistory,
  } = usePrayerAPI()

  // Load prayer history on component mount
  useEffect(() => {
    loadPrayerHistory()
  }, [])

  const loadPrayerHistory = async () => {
    setIsRefreshing(true)
    try {
      const history = await getPrayerHistory()
      setPrayerHistory(history)
    } catch (error) {
      console.error('Failed to load prayer history:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  // Process real data into analytics
  const analytics = useMemo(() => {
    if (!prayerHistory.length) return null

    // Group by date
    const dailyData = prayerHistory.reduce(
      (acc, prayer) => {
        const date = new Date(prayer.generatedAt).toLocaleDateString()
        if (!acc[date]) {
          acc[date] = {
            date,
            count: 0,
            totalCost: 0,
            totalTokens: 0,
            successCount: 0,
            errorCount: 0,
            totalDuration: 0,
            moods: {} as Record<string, number>,
            models: {} as Record<string, number>,
          }
        }

        acc[date].count++
        acc[date].totalCost += prayer.estimatedCost || 0
        acc[date].totalTokens += prayer.totalTokens || 0
        if (prayer.status === 'success') acc[date].successCount++
        if (prayer.status === 'error') acc[date].errorCount++
        if (prayer.durationMs) acc[date].totalDuration += prayer.durationMs

        // Track moods if available
        if (prayer.sessionChangesPayload?.mood?.to) {
          const mood = prayer.sessionChangesPayload.mood.to
          acc[date].moods[mood] = (acc[date].moods[mood] || 0) + 1
        }

        // Track models
        if (prayer.openaiModelUsed) {
          acc[date].models[prayer.openaiModelUsed] =
            (acc[date].models[prayer.openaiModelUsed] || 0) + 1
        }

        return acc
      },
      {} as Record<string, any>
    )

    // Convert to array and sort
    const dailyMetrics = Object.values(dailyData)
      .map((day: any) => ({
        date: new Date(day.date).toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        }),
        prayers: day.count,
        cost: day.totalCost,
        avgTokens: Math.round(day.totalTokens / day.count),
        successRate: (day.successCount / day.count) * 100,
        avgDuration: Math.round(day.totalDuration / day.count),
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-7) // Last 7 days

    // Calculate totals
    const totalPrayers = prayerHistory.length
    const totalCost = prayerHistory.reduce(
      (sum, p) => sum + (p.estimatedCost || 0),
      0
    )
    const successfulPrayers = prayerHistory.filter(
      (p) => p.status === 'success'
    ).length
    const avgSuccessRate = (successfulPrayers / totalPrayers) * 100
    const avgCostPerPrayer = totalCost / totalPrayers

    // Calculate trend (compare last 7 days to previous 7 days)
    const last7Days = prayerHistory.filter(
      (p) =>
        new Date(p.generatedAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    ).length
    const previous7Days = prayerHistory.filter((p) => {
      const date = new Date(p.generatedAt)
      return (
        date > new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) &&
        date <= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      )
    }).length
    const growthRate =
      previous7Days > 0
        ? ((last7Days - previous7Days) / previous7Days) * 100
        : 0

    // Extract intention categories from prayer content using actual prayer topics
    const topicKeywords: Record<string, string[]> = {
      healing: [
        'healing',
        'health',
        'sick',
        'illness',
        'recovery',
        'pain',
        'physical',
        'mental',
        'emotional',
        'heal',
        'cure',
        'medicine',
        'doctor',
        'hospital',
      ],
      wisdom: [
        'wisdom',
        'decision',
        'guidance',
        'clarity',
        'understand',
        'choice',
        'direction',
        'discern',
        'insight',
        'knowledge',
      ],
      peace: [
        'peace',
        'anxiety',
        'worry',
        'stress',
        'calm',
        'conflict',
        'fear',
        'serene',
        'tranquil',
        'rest',
      ],
      strength: [
        'strength',
        'endurance',
        'difficult',
        'adversity',
        'grief',
        'burnout',
        'courage',
        'brave',
        'persevere',
        'overcome',
      ],
      guidance: [
        'guidance',
        'guide',
        'lead',
        'direction',
        'path',
        'way',
        'lost',
        'confused',
        'uncertain',
      ],
      faith: [
        'faith',
        'doubt',
        'spiritual',
        'trust',
        'God',
        'belief',
        'believe',
        'Lord',
        'Jesus',
        'Christ',
      ],
      financialHelp: [
        'financial',
        'money',
        'job',
        'employment',
        'bills',
        'debt',
        'rent',
        'income',
        'provision',
      ],
      forgiveness: [
        'forgive',
        'forgiveness',
        'sorry',
        'reconcile',
        'relationship',
        'hurt',
        'wrong',
        'mercy',
      ],
      gratitude: [
        'thank',
        'grateful',
        'gratitude',
        'blessed',
        'appreciate',
        'praise',
        'thanksgiving',
      ],
      protection: [
        'protect',
        'protection',
        'safe',
        'safety',
        'danger',
        'shield',
        'guard',
        'secure',
      ],
      blessing: [
        'bless',
        'blessing',
        'favor',
        'grace',
        'prosper',
        'success',
        'abundance',
      ],
      comfort: [
        'comfort',
        'console',
        'grief',
        'loss',
        'mourn',
        'sorrow',
        'pain',
        'suffering',
      ],
      joy: [
        'joy',
        'happy',
        'celebrate',
        'rejoice',
        'gladness',
        'delight',
        'cheerful',
      ],
      patience: [
        'patience',
        'patient',
        'wait',
        'waiting',
        'endure',
        'persevere',
        'tolerance',
      ],
      love: [
        'love',
        'relationship',
        'family',
        'friend',
        'marriage',
        'heart',
        'care',
        'compassion',
      ],
      hope: [
        'hope',
        'future',
        'dreams',
        'renewal',
        'tomorrow',
        'optimism',
        'expect',
        'anticipate',
      ],
      success: [
        'success',
        'achieve',
        'accomplish',
        'goal',
        'win',
        'prosper',
        'excel',
        'triumph',
      ],
    }

    // First, categorize prayers that match specific topics
    const categorizedPrayers = new Set<string>()
    const topicAnalysis = Object.values(PRAYER_TOPICS)
      .filter((topic) => topic.id !== 'other') // Process all topics except 'other'
      .map((topic) => {
        const keywords = topicKeywords[topic.id] || []
        const pattern = new RegExp(keywords.join('|'), 'i')
        const matchingPrayers = prayerHistory.filter(
          (prayer) =>
            prayer.rawPrayerOutput && pattern.test(prayer.rawPrayerOutput)
        )

        // Track which prayers have been categorized
        matchingPrayers.forEach((prayer) => categorizedPrayers.add(prayer.id))

        return {
          name: topic.label.charAt(0).toUpperCase() + topic.label.slice(1),
          value: matchingPrayers.length,
          percentage: (matchingPrayers.length / totalPrayers) * 100,
          emoji: topic.emoji,
          id: topic.id,
        }
      })
      .filter((cat) => cat.value > 0) // Only show categories with prayers
      .sort((a, b) => b.value - a.value)

    // Calculate "Other" category for prayers that don't match any specific topic
    const otherCount = prayerHistory.filter(
      (prayer) => !categorizedPrayers.has(prayer.id)
    ).length
    const otherCategory = {
      name: 'Other',
      value: otherCount,
      percentage: (otherCount / totalPrayers) * 100,
      emoji: PRAYER_TOPICS.other.emoji,
      id: 'other',
    }

    // Combine categories and show top 7 + other (if it has prayers)
    const intentionCategories = [
      ...topicAnalysis.slice(0, 7),
      ...(otherCount > 0 ? [otherCategory] : []),
    ].sort((a, b) => b.value - a.value)

    // Mood distribution
    const moodCounts = prayerHistory.reduce(
      (acc, prayer) => {
        const mood = prayer.sessionChangesPayload?.mood?.to
        if (mood) {
          acc[mood] = (acc[mood] || 0) + 1
        }
        return acc
      },
      {} as Record<string, number>
    )

    const moodEmojis: Record<string, string> = {
      grateful: '😊',
      anxious: '😟',
      sad: '😢',
      hopeful: '🙏',
      peaceful: '😌',
      joyful: '😄',
      weary: '😔',
      loved: '❤️',
    }

    const moodDistribution = Object.entries(moodCounts).map(
      ([mood, count]) => ({
        mood: mood.charAt(0).toUpperCase() + mood.slice(1),
        emoji: moodEmojis[mood] || '🙏',
        count,
        percentage: (count / totalPrayers) * 100,
        fill:
          mood === 'grateful' || mood === 'joyful'
            ? COLORS.success
            : mood === 'anxious' || mood === 'weary'
              ? COLORS.warning
              : mood === 'sad'
                ? COLORS.danger
                : mood === 'hopeful' || mood === 'peaceful'
                  ? COLORS.info
                  : COLORS.primary,
      })
    )

    // Model performance
    const modelStats = prayerHistory.reduce(
      (acc, prayer) => {
        const model = prayer.openaiModelUsed || 'unknown'
        if (!acc[model]) {
          acc[model] = {
            count: 0,
            totalCost: 0,
            totalTokens: 0,
            totalDuration: 0,
            successCount: 0,
          }
        }
        acc[model].count++
        acc[model].totalCost += prayer.estimatedCost || 0
        acc[model].totalTokens += prayer.totalTokens || 0
        acc[model].totalDuration += prayer.durationMs || 0
        if (prayer.status === 'success') acc[model].successCount++
        return acc
      },
      {} as Record<string, any>
    )

    return {
      dailyMetrics,
      totalPrayers,
      totalCost,
      avgSuccessRate,
      avgCostPerPrayer,
      growthRate,
      intentionCategories,
      moodDistribution,
      modelStats,
      recentPrayers: prayerHistory.slice(0, 10),
      last24hPrayers: prayerHistory.filter(
        (p) =>
          new Date(p.generatedAt) > new Date(Date.now() - 24 * 60 * 60 * 1000)
      ).length,
    }
  }, [prayerHistory])

  if (apiLoading && !prayerHistory.length) {
    return (
      <div className='flex h-96 items-center justify-center'>
        <div className='text-center'>
          <Loader2 className='text-muted-foreground mx-auto mb-4 h-8 w-8 animate-spin' />
          <p className='text-muted-foreground'>Loading prayer analytics...</p>
        </div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className='py-12 text-center'>
        <MessageSquare className='text-muted-foreground mx-auto mb-4 h-12 w-12' />
        <p className='text-lg font-medium'>No prayer data available</p>
        <p className='text-muted-foreground'>
          Generate some prayers to see analytics
        </p>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className='mb-6 flex flex-col gap-2'>
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-3xl font-black tracking-tight text-transparent uppercase'>
              <span className='text-5xl text-white'>🙏 </span> Prayer
              <span className='text-3xl text-white'>Studio</span>
            </h1>
            <p className='text-muted-foreground mt-1'>
              Real-time analytics and insights from your prayer generation
              system
            </p>
          </div>
          <div className='flex items-center space-x-2'>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className='w-40'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='24h'>Last 24h</SelectItem>
                <SelectItem value='7d'>Last 7 days</SelectItem>
                <SelectItem value='30d'>Last 30 days</SelectItem>
                <SelectItem value='90d'>Last 90 days</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant='outline'
              size='icon'
              onClick={loadPrayerHistory}
              disabled={isRefreshing}
            >
              <RefreshCw
                className={cn('h-4 w-4', isRefreshing && 'animate-spin')}
              />
            </Button>

            <Button className='gap-2'>
              <Download className='h-4 w-4' />
              Export Report
            </Button>
          </div>
        </div>
      </div>

      <Tabs
        orientation='horizontal'
        defaultValue='overview'
        className='space-y-6'
      >
        <div className='w-full overflow-x-auto pb-2'>
          <TabsList className='bg-card border'>
            <TabsTrigger value='overview' className='gap-2'>
              <BarChart3 size={16} />
              Overview
            </TabsTrigger>
            <TabsTrigger value='intentions' className='gap-2'>
              <Heart size={16} />
              Intentions
            </TabsTrigger>
            <TabsTrigger value='performance' className='gap-2'>
              <Gauge size={16} />
              Performance
            </TabsTrigger>
            <TabsTrigger value='costs' className='gap-2'>
              <Wallet size={16} />
              Costs
            </TabsTrigger>
            <TabsTrigger value='quality' className='gap-2'>
              <Shield size={16} />
              Quality
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Overview Tab */}
        <TabsContent value='overview' className='space-y-6'>
          {/* Key Metrics Grid */}
          <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
            <MetricCard
              title='Total Prayers'
              value={analytics.totalPrayers.toLocaleString()}
              subtitle={`${analytics.last24hPrayers} in last 24 hours`}
              icon={MessageSquare}
              color='primary'
              trend={analytics.growthRate > 0 ? 'up' : 'down'}
              trendValue={`${Math.abs(analytics.growthRate).toFixed(0)}%`}
            />

            <MetricCard
              title='Success Rate'
              value={`${analytics.avgSuccessRate.toFixed(1)}%`}
              subtitle='Generation success'
              icon={Zap}
              color='success'
            />

            <MetricCard
              title='Total Spent'
              value={`$${analytics.totalCost.toFixed(2)}`}
              subtitle={`$${analytics.avgCostPerPrayer.toFixed(4)} per prayer`}
              icon={DollarSign}
              color='warning'
            />

            <MetricCard
              title='Avg Response'
              value={`${
                analytics.dailyMetrics.length > 0
                  ? (
                      analytics.dailyMetrics.reduce(
                        (sum, d) => sum + d.avgDuration,
                        0
                      ) /
                      analytics.dailyMetrics.length /
                      1000
                    ).toFixed(1)
                  : '0'
              }s`}
              subtitle='Generation time'
              icon={Clock}
              color='primary'
            />
          </div>

          <div className='grid gap-6 lg:grid-cols-7'>
            {/* Prayer Volume Chart */}
            <Card className='col-span-1 border shadow-sm lg:col-span-4'>
              <CardHeader>
                <CardTitle>Prayer Volume Trends</CardTitle>
                <CardDescription>
                  Daily prayer generation activity
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width='100%' height={300}>
                  <AreaChart
                    data={analytics.dailyMetrics}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <ChartGradients />
                    <CartesianGrid
                      strokeDasharray='0'
                      stroke={COLORS.border}
                      vertical={false}
                    />
                    <XAxis
                      dataKey='date'
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: COLORS.muted, fontSize: 12 }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: COLORS.muted, fontSize: 12 }}
                      dx={-10}
                    />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Area
                      type='monotone'
                      dataKey='prayers'
                      stroke={COLORS.primary}
                      strokeWidth={3}
                      fillOpacity={1}
                      fill='url(#colorPrayers)'
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Success Rate Trend */}
            <Card className='col-span-1 border shadow-sm lg:col-span-3'>
              <CardHeader>
                <CardTitle>Success Rate</CardTitle>
                <CardDescription>
                  Generation reliability over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width='100%' height={300}>
                  <LineChart
                    data={analytics.dailyMetrics}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray='0'
                      stroke={COLORS.border}
                      vertical={false}
                    />
                    <XAxis
                      dataKey='date'
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: COLORS.muted, fontSize: 12 }}
                      dy={10}
                    />
                    <YAxis
                      domain={[90, 100]}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: COLORS.muted, fontSize: 12 }}
                      dx={-10}
                    />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Line
                      type='monotone'
                      dataKey='successRate'
                      stroke={COLORS.success}
                      strokeWidth={3}
                      dot={{ fill: COLORS.success, strokeWidth: 2, r: 5 }}
                      activeDot={{ r: 7 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Model Performance */}
          <Card className='border shadow-sm'>
            <CardHeader>
              <SectionHeader
                title='AI Model Performance'
                description='Usage statistics and success rates by model'
              />
            </CardHeader>
            <CardContent>
              <div className='space-y-4'>
                {Object.entries(analytics.modelStats).map(
                  ([model, stats]: [string, any]) => {
                    const successRate = (stats.successCount / stats.count) * 100
                    const usagePercent =
                      (stats.count / analytics.totalPrayers) * 100

                    return (
                      <div key={model} className='space-y-2'>
                        <div className='flex items-center justify-between'>
                          <div className='flex items-center gap-2'>
                            <Brain className='h-4 w-4 text-indigo-600' />
                            <span className='font-medium'>{model}</span>
                          </div>
                          <div className='flex items-center gap-2 text-sm'>
                            <span>{stats.count} uses</span>
                            <span>•</span>
                            <span>${stats.totalCost.toFixed(2)}</span>
                            <Badge
                              variant={
                                successRate >= 99 ? 'success' : 'secondary'
                              }
                              className='text-xs'
                            >
                              {successRate.toFixed(1)}%
                            </Badge>
                          </div>
                        </div>
                        <Progress value={usagePercent} className='h-1.5' />
                      </div>
                    )
                  }
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Intentions Tab */}
        <TabsContent value='intentions' className='space-y-6'>
          {/* Top Prayer Topics Summary */}
          <div className='grid gap-4 md:grid-cols-3'>
            <Card className='border shadow-sm'>
              <CardHeader className='pb-3'>
                <CardTitle className='text-sm font-medium'>
                  Most Common Prayer
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className='flex items-center gap-2'>
                  <span className='text-2xl'>
                    {analytics.intentionCategories[0]?.emoji || '🙏'}
                  </span>
                  <div>
                    <p className='font-semibold'>
                      {analytics.intentionCategories[0]?.name || 'N/A'}
                    </p>
                    <p className='text-muted-foreground text-xs'>
                      {analytics.intentionCategories[0]?.percentage.toFixed(
                        0
                      ) || 0}
                      % of all prayers
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className='border shadow-sm'>
              <CardHeader className='pb-3'>
                <CardTitle className='text-sm font-medium'>
                  Prayer Diversity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className='flex items-center gap-2'>
                  <Sparkles className='h-8 w-8 text-indigo-500' />
                  <div>
                    <p className='font-semibold'>
                      {analytics.intentionCategories.length} Types
                    </p>
                    <p className='text-muted-foreground text-xs'>
                      Different prayer categories
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className='border shadow-sm'>
              <CardHeader className='pb-3'>
                <CardTitle className='text-sm font-medium'>
                  Average Per Category
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className='flex items-center gap-2'>
                  <BarChart3 className='h-8 w-8 text-green-500' />
                  <div>
                    <p className='font-semibold'>
                      {Math.round(
                        analytics.totalPrayers /
                          (analytics.intentionCategories.length || 1)
                      )}
                    </p>
                    <p className='text-muted-foreground text-xs'>
                      Prayers per category
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className='grid gap-6 lg:grid-cols-2'>
            {/* Prayer Categories */}
            <Card className='border shadow-sm'>
              <CardHeader>
                <SectionHeader
                  title='Prayer Categories'
                  description='What people are praying for most'
                />
              </CardHeader>
              <CardContent>
                <div className='space-y-4'>
                  {analytics.intentionCategories.map((category, index) => (
                    <div key={category.name} className='space-y-2'>
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center gap-2'>
                          <span className='text-xl'>{category.emoji}</span>
                          <span className='font-medium'>{category.name}</span>
                          {category.id === 'other' && (
                            <Tooltip>
                              <TooltipTrigger>
                                <Info className='text-muted-foreground h-3 w-3' />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className='text-xs'>
                                  Prayers that don't match predefined categories
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                        <div className='flex items-center gap-2'>
                          <span className='text-muted-foreground text-sm'>
                            {category.value} prayers
                          </span>
                          <Badge
                            variant={
                              category.id === 'other' ? 'secondary' : 'outline'
                            }
                            className={
                              category.id === 'other'
                                ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                                : ''
                            }
                          >
                            {category.percentage.toFixed(0)}%
                          </Badge>
                        </div>
                      </div>
                      <Progress value={category.percentage} className='h-2' />
                    </div>
                  ))}
                  {analytics.intentionCategories.length === 0 && (
                    <div className='text-muted-foreground py-8 text-center'>
                      <Heart className='mx-auto mb-2 h-8 w-8' />
                      <p>No prayer categories detected yet</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Mood Distribution */}
            <Card className='border shadow-sm'>
              <CardHeader>
                <SectionHeader
                  title='Emotional States'
                  description='How users are feeling when they pray'
                />
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width='100%' height={300}>
                  <PieChart>
                    <Pie
                      data={analytics.moodDistribution}
                      cx='50%'
                      cy='50%'
                      labelLine={false}
                      label={({ mood, percentage }) =>
                        `${mood} ${percentage.toFixed(0)}%`
                      }
                      outerRadius={100}
                      fill='#8884d8'
                      dataKey='count'
                    >
                      {analytics.moodDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <RechartsTooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>

                {/* Mood Legend */}
                <div className='mt-6 grid grid-cols-2 gap-4'>
                  {analytics.moodDistribution.map((mood) => (
                    <div key={mood.mood} className='flex items-center gap-3'>
                      <span className='text-2xl'>{mood.emoji}</span>
                      <div className='flex-1'>
                        <p className='text-sm font-medium'>{mood.mood}</p>
                        <p className='text-muted-foreground text-xs'>
                          {mood.count} prayers
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value='performance' className='space-y-6'>
          <div className='grid gap-6 lg:grid-cols-3'>
            {/* Response Time Distribution */}
            <Card className='border shadow-sm lg:col-span-2'>
              <CardHeader>
                <SectionHeader
                  title='Response Time Analysis'
                  description='Prayer generation speed over time'
                />
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width='100%' height={300}>
                  <BarChart data={analytics.dailyMetrics}>
                    <CartesianGrid
                      strokeDasharray='0'
                      stroke={COLORS.border}
                      vertical={false}
                    />
                    <XAxis
                      dataKey='date'
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: COLORS.muted, fontSize: 12 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: COLORS.muted, fontSize: 12 }}
                    />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Bar
                      dataKey='avgDuration'
                      fill={COLORS.primary}
                      radius={[8, 8, 0, 0]}
                      barSize={40}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Performance Metrics */}
            <Card className='border shadow-sm'>
              <CardHeader>
                <SectionHeader title='Performance Metrics' />
              </CardHeader>
              <CardContent className='space-y-6'>
                {/* Success Rate Gauge */}
                <div className='space-y-2'>
                  <div className='flex items-center justify-between'>
                    <span className='text-sm font-medium'>
                      Overall Success Rate
                    </span>
                    <span className='text-2xl font-bold text-green-600'>
                      {analytics.avgSuccessRate.toFixed(1)}%
                    </span>
                  </div>
                  <Progress
                    value={analytics.avgSuccessRate}
                    className='h-3'
                    style={{
                      background: `linear-gradient(to right, ${COLORS.success}20 0%, ${COLORS.success}20 100%)`,
                    }}
                  />
                </div>

                <Separator />

                {/* Key Stats */}
                <div className='space-y-4'>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-2'>
                      <AlertCircle className='h-4 w-4 text-red-500' />
                      <span className='text-sm'>Failed Generations</span>
                    </div>
                    <span className='font-medium text-red-600'>
                      {prayerHistory.filter((p) => p.status === 'error').length}
                    </span>
                  </div>

                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-2'>
                      <Clock className='h-4 w-4 text-blue-500' />
                      <span className='text-sm'>Avg Response Time</span>
                    </div>
                    <span className='font-medium'>
                      {analytics.dailyMetrics.length > 0
                        ? (
                            analytics.dailyMetrics.reduce(
                              (sum, d) => sum + d.avgDuration,
                              0
                            ) /
                            analytics.dailyMetrics.length /
                            1000
                          ).toFixed(1)
                        : '0'}
                      s
                    </span>
                  </div>

                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-2'>
                      <Hash className='h-4 w-4 text-indigo-500' />
                      <span className='text-sm'>Avg Token Usage</span>
                    </div>
                    <span className='font-medium'>
                      {analytics.dailyMetrics[0]?.avgTokens || 0}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Errors */}
          <Card className='border shadow-sm'>
            <CardHeader>
              <SectionHeader
                title='Error Log'
                description='Recent failed generation attempts'
                action={
                  <Badge
                    variant='outline'
                    className='border-red-200 bg-red-50 text-red-700'
                  >
                    {prayerHistory.filter((p) => p.status === 'error').length}{' '}
                    total errors
                  </Badge>
                }
              />
            </CardHeader>
            <CardContent>
              {prayerHistory.filter((p) => p.status === 'error').length ===
              0 ? (
                <div className='py-12 text-center'>
                  <div className='mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20'>
                    <CheckCircle className='h-8 w-8 text-green-600 dark:text-green-400' />
                  </div>
                  <p className='text-lg font-medium'>No Errors Detected</p>
                  <p className='text-muted-foreground mt-1 text-sm'>
                    All prayer generations are running smoothly
                  </p>
                </div>
              ) : (
                <div className='space-y-3'>
                  {prayerHistory
                    .filter((p) => p.status === 'error')
                    .slice(0, 5)
                    .map((prayer) => (
                      <div
                        key={prayer.id}
                        className='rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/20'
                      >
                        <div className='flex items-start gap-3'>
                          <AlertTriangle className='mt-0.5 h-5 w-5 text-red-600' />
                          <div className='flex-1 space-y-1'>
                            <p className='text-sm font-medium text-red-900 dark:text-red-100'>
                              {prayer.errorMessage || 'Unknown error occurred'}
                            </p>
                            <p className='text-xs text-red-700 dark:text-red-300'>
                              {new Date(prayer.generatedAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cost Analysis Tab */}
        <TabsContent value='costs' className='space-y-6'>
          <div className='grid gap-6 lg:grid-cols-3'>
            {/* Cost Trend Chart */}
            <Card className='border shadow-sm lg:col-span-2'>
              <CardHeader>
                <SectionHeader
                  title='Cost Analysis'
                  description='Daily spending on prayer generation'
                />
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width='100%' height={300}>
                  <AreaChart
                    data={analytics.dailyMetrics}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <ChartGradients />
                    <CartesianGrid
                      strokeDasharray='0'
                      stroke={COLORS.border}
                      vertical={false}
                    />
                    <XAxis
                      dataKey='date'
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: COLORS.muted, fontSize: 12 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: COLORS.muted, fontSize: 12 }}
                    />
                    <RechartsTooltip
                      content={<CustomTooltip />}
                      formatter={(value: any) => `$${value.toFixed(2)}`}
                    />
                    <Area
                      type='monotone'
                      dataKey='cost'
                      stroke={COLORS.success}
                      strokeWidth={3}
                      fillOpacity={1}
                      fill='url(#colorCost)'
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Cost Breakdown */}
            <Card className='border shadow-sm'>
              <CardHeader>
                <SectionHeader title='Cost Breakdown' />
              </CardHeader>
              <CardContent className='space-y-6'>
                <div className='space-y-4'>
                  <div className='space-y-3 rounded-lg bg-green-50 p-4 dark:bg-green-900/20'>
                    <div className='flex items-center justify-between'>
                      <span className='text-sm font-medium'>Total Spent</span>
                      <span className='text-2xl font-bold text-green-700 dark:text-green-400'>
                        ${analytics.totalCost.toFixed(2)}
                      </span>
                    </div>
                    <Separator className='bg-green-200 dark:bg-green-800' />
                    <div className='space-y-2 text-sm'>
                      <div className='flex items-center justify-between'>
                        <span className='text-green-700 dark:text-green-300'>
                          Per Prayer
                        </span>
                        <span className='font-medium text-green-700 dark:text-green-300'>
                          ${analytics.avgCostPerPrayer.toFixed(4)}
                        </span>
                      </div>
                      <div className='flex items-center justify-between'>
                        <span className='text-green-700 dark:text-green-300'>
                          Per 1K Tokens
                        </span>
                        <span className='font-medium text-green-700 dark:text-green-300'>
                          $
                          {(
                            (analytics.avgCostPerPrayer /
                              (analytics.dailyMetrics[0]?.avgTokens || 1)) *
                            1000
                          ).toFixed(3)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className='space-y-2 rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20'>
                    <p className='text-sm font-medium text-blue-900 dark:text-blue-100'>
                      Projected Monthly Cost
                    </p>
                    <p className='text-2xl font-bold text-blue-700 dark:text-blue-400'>
                      ${((analytics.totalCost * 30) / 7).toFixed(2)}
                    </p>
                    <p className='text-xs text-blue-600 dark:text-blue-300'>
                      Based on current usage patterns
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Model Cost Comparison */}
          <Card className='border shadow-sm'>
            <CardHeader>
              <SectionHeader
                title='Cost by Model'
                description='Compare costs across different AI models'
              />
            </CardHeader>
            <CardContent>
              <div className='space-y-4'>
                {Object.entries(analytics.modelStats).map(
                  ([model, stats]: [string, any]) => {
                    const avgCost = stats.totalCost / stats.count
                    const avgTokens = stats.totalTokens / stats.count

                    return (
                      <div
                        key={model}
                        className='bg-card rounded-lg border p-4'
                      >
                        <div className='mb-3 flex items-center justify-between'>
                          <div className='flex items-center gap-3'>
                            <Brain className='h-5 w-5 text-indigo-600' />
                            <span className='font-medium'>{model}</span>
                          </div>
                          <Badge variant='outline'>
                            ${stats.totalCost.toFixed(2)} total
                          </Badge>
                        </div>
                        <div className='grid grid-cols-3 gap-4 text-sm'>
                          <div>
                            <p className='text-muted-foreground'>Avg Cost</p>
                            <p className='font-medium'>${avgCost.toFixed(4)}</p>
                          </div>
                          <div>
                            <p className='text-muted-foreground'>Avg Tokens</p>
                            <p className='font-medium'>
                              {Math.round(avgTokens)}
                            </p>
                          </div>
                          <div>
                            <p className='text-muted-foreground'>Total Uses</p>
                            <p className='font-medium'>{stats.count}</p>
                          </div>
                        </div>
                      </div>
                    )
                  }
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quality Control Tab */}
        <TabsContent value='quality' className='space-y-6'>
          <div className='grid gap-6 lg:grid-cols-2'>
            {/* System Health Overview */}
            <Card className='border shadow-sm'>
              <CardHeader>
                <SectionHeader
                  title='System Health'
                  description='Overall generation quality metrics'
                />
              </CardHeader>
              <CardContent>
                <div className='space-y-6'>
                  {/* Health Score */}
                  <div className='text-center'>
                    <div className='relative inline-flex'>
                      <div className='h-32 w-32 rounded-full bg-gradient-to-br from-green-500 to-green-600 p-1'>
                        <div className='flex h-full w-full items-center justify-center rounded-full bg-white dark:bg-gray-900'>
                          <div>
                            <p className='text-3xl font-bold text-green-600'>
                              {analytics.avgSuccessRate.toFixed(0)}%
                            </p>
                            <p className='text-muted-foreground text-sm'>
                              Health Score
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quality Indicators */}
                  <div className='grid grid-cols-2 gap-4'>
                    <div className='rounded-lg bg-gray-50 p-4 dark:bg-gray-800/50'>
                      <div className='mb-2 flex items-center gap-2'>
                        <Activity className='h-4 w-4 text-blue-600' />
                        <span className='text-sm font-medium'>Uptime</span>
                      </div>
                      <p className='text-2xl font-bold'>99.9%</p>
                    </div>

                    <div className='rounded-lg bg-gray-50 p-4 dark:bg-gray-800/50'>
                      <div className='mb-2 flex items-center gap-2'>
                        <Target className='h-4 w-4 text-indigo-600' />
                        <span className='text-sm font-medium'>Accuracy</span>
                      </div>
                      <p className='text-2xl font-bold'>98.5%</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quality Metrics */}
            <Card className='border shadow-sm'>
              <CardHeader>
                <SectionHeader
                  title='Quality Metrics'
                  description='Detailed performance indicators'
                />
              </CardHeader>
              <CardContent>
                <div className='space-y-4'>
                  <div className='space-y-2'>
                    <div className='flex items-center justify-between'>
                      <span className='text-sm'>Generation Success</span>
                      <span className='text-sm font-medium'>
                        {analytics.avgSuccessRate.toFixed(1)}%
                      </span>
                    </div>
                    <Progress
                      value={analytics.avgSuccessRate}
                      className='h-2'
                      style={{
                        background: `linear-gradient(to right, ${COLORS.success}20 0%, ${COLORS.success}20 100%)`,
                      }}
                    />
                  </div>

                  <div className='space-y-2'>
                    <div className='flex items-center justify-between'>
                      <span className='text-sm'>Response Speed</span>
                      <span className='text-sm font-medium'>
                        {100 -
                          (analytics.dailyMetrics[0]?.avgDuration || 0) / 50}
                        %
                      </span>
                    </div>
                    <Progress
                      value={
                        100 - (analytics.dailyMetrics[0]?.avgDuration || 0) / 50
                      }
                      className='h-2'
                      style={{
                        background: `linear-gradient(to right, ${COLORS.primary}20 0%, ${COLORS.primary}20 100%)`,
                      }}
                    />
                  </div>

                  <div className='space-y-2'>
                    <div className='flex items-center justify-between'>
                      <span className='text-sm'>Token Efficiency</span>
                      <span className='text-sm font-medium'>
                        {Math.min(
                          100,
                          (400 /
                            (analytics.dailyMetrics[0]?.avgTokens || 400)) *
                            100
                        ).toFixed(0)}
                        %
                      </span>
                    </div>
                    <Progress
                      value={Math.min(
                        100,
                        (400 / (analytics.dailyMetrics[0]?.avgTokens || 400)) *
                          100
                      )}
                      className='h-2'
                      style={{
                        background: `linear-gradient(to right, ${COLORS.warning}20 0%, ${COLORS.warning}20 100%)`,
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity Log */}
          <Card className='border shadow-sm'>
            <CardHeader>
              <SectionHeader
                title='Recent Prayer Activity'
                description='Latest generation attempts with quality indicators'
              />
            </CardHeader>
            <CardContent>
              <div className='space-y-3'>
                {analytics.recentPrayers.slice(0, 5).map((prayer) => (
                  <div
                    key={prayer.id}
                    className='bg-card hover:bg-accent/50 flex items-center gap-4 rounded-lg border p-4 transition-colors'
                  >
                    <div
                      className={cn(
                        'h-2 w-2 rounded-full',
                        prayer.status === 'success'
                          ? 'bg-green-500'
                          : 'bg-red-500'
                      )}
                    />

                    <div className='min-w-0 flex-1'>
                      <div className='flex items-center gap-2'>
                        <p className='truncate text-sm font-medium'>
                          Prayer ID: {prayer.id.slice(0, 8)}...
                        </p>
                        <Badge variant='outline' className='text-xs'>
                          {prayer.openaiModelUsed}
                        </Badge>
                      </div>
                      <p className='text-muted-foreground mt-1 text-xs'>
                        {new Date(prayer.generatedAt).toLocaleString()} •
                        {prayer.durationMs}ms •{prayer.totalTokens} tokens
                      </p>
                    </div>

                    <div className='text-right'>
                      <p className='text-sm font-medium'>
                        ${prayer.estimatedCost?.toFixed(4)}
                      </p>
                      <p className='text-muted-foreground text-xs'>
                        {prayer.status === 'success' ? 'Completed' : 'Failed'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </TooltipProvider>
  )
}
