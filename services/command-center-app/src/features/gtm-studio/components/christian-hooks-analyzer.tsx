import React, { useState, useEffect } from 'react'
import {
  TrendingUp,
  BarChart,
  MessageSquare,
  Heart,
  Share2,
  Clock,
  Hash,
  Lightbulb,
  Target,
  Sparkles,
  CheckCircle2,
} from 'lucide-react'
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
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  getTopChristianTikTokHooks,
  analyzeChristianHookPatterns,
} from '../services/supabase-service'
import { getViralInsights } from '../services/viral-insights-service'

interface VideoHook {
  id: number
  video_id: string
  title?: string
  description: string
  views: number
  likes: number
  comments: number
  shares: number
  author_id: number
  author_name?: string
  duration: number
  engagement_rate?: number
  hook_transcript?: string
  viral_techniques?: string[]
  emotional_triggers?: string[]
  visual_elements?: string[]
  key_success_factors?: string[]
  new_concepts?: any[]
  overall_summary?: string
  analysis_source?: string
}

interface HookAnalysis {
  totalVideos: number
  averageViews: number
  averageEngagementRate: number
  averageHookLength: number
  topHooks: Array<{
    hook: string
    views: number
    engagementRate: string
    author: string
    id: string
    techniques?: string[]
    emotionalTriggers?: string[]
    visualElements?: string[]
    analysisSource?: string
  }>
  mostCommonWords: Array<{ word: string; count: number }>
  patternPercentages: {
    questions: string
    personalStory: string
    challenge: string
    revelation: string
    controversy: string
  }
  topTechniques?: Array<{ technique: string; count: number }>
  topConcepts?: Array<{ theme: string; count: number }>
  topEmotionalTriggers?: Array<{ trigger: string; count: number }>
  topVisualElements?: Array<{ element: string; count: number }>
  topSuccessFactors?: Array<{ factor: string; count: number }>
}

export function ChristianHooksAnalyzer() {
  const [loading, setLoading] = useState(false)
  const [topVideos, setTopVideos] = useState<VideoHook[]>([])
  const [analysis, setAnalysis] = useState<HookAnalysis | null>(null)
  const [selectedHook, setSelectedHook] = useState<VideoHook | null>(null)

  const loadData = async () => {
    setLoading(true)
    try {
      // Check for cached insights first
      console.log('🔍 Checking for cached viral insights...')
      const cachedInsights = await getViralInsights('christian')

      if (cachedInsights) {
        console.log('📋 Using cached insights from database')
        setAnalysis(cachedInsights)
      }

      // Load top videos
      const videos = await getTopChristianTikTokHooks(100, 0) // Get all videos with proper analysis
      const videosWithEngagement = videos.map((v) => ({
        ...v,
        engagement_rate:
          v.views > 0 ? ((v.likes + v.comments + v.shares) / v.views) * 100 : 0,
      }))
      setTopVideos(videosWithEngagement)

      // If no cached insights, run fresh analysis
      if (!cachedInsights) {
        console.log('🧠 Running fresh analysis...')
        const analysisResult = await analyzeChristianHookPatterns(true)
        if (analysisResult) {
          setAnalysis(analysisResult)
        }
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  const hookFormulas = [
    {
      name: 'Personal Transformation',
      template:
        'I used to [negative state], but then [transformation through faith]',
      example: 'I used to hate myself, but then God showed me my true worth',
      icon: Sparkles,
    },
    {
      name: 'Controversial Question',
      template: 'Why do Christians [unexpected behavior/belief]?',
      example: 'Why do Christians say suffering is a blessing?',
      icon: MessageSquare,
    },
    {
      name: 'Revelation/Secret',
      template:
        'The truth about [common misconception] that nobody talks about',
      example: 'The truth about prayer that nobody talks about',
      icon: Lightbulb,
    },
    {
      name: 'Challenge',
      template: 'I challenge you to [specific faith action] for [time period]',
      example: 'I challenge you to pray for your enemies for 7 days',
      icon: Target,
    },
  ]

  if (loading && topVideos.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Christian TikTok Viral Insights Analyzer</CardTitle>
          <CardDescription>Loading viral content data...</CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <Skeleton className='h-32 w-full' />
          <Skeleton className='h-32 w-full' />
          <Skeleton className='h-32 w-full' />
        </CardContent>
      </Card>
    )
  }

  // Check if we have no data
  const hasNoData = !analysis || analysis.totalVideos === 0

  return (
    <div className='space-y-6'>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div>
              <CardTitle className='text-2xl'>
                Christian TikTok Viral Insights Analyzer
              </CardTitle>
              <CardDescription>
                {analysis && analysis.totalVideos > 0
                  ? `AI-powered analysis of ${analysis.totalVideos} Christian videos (all types) to extract viral patterns, techniques, and formulas`
                  : 'No Christian videos with proper analysis found. Run the bulk analyzer to get started.'}
              </CardDescription>
            </div>
            <div className='flex gap-2'>
              <Button onClick={loadData} disabled={loading}>
                {loading ? 'Analyzing...' : 'Refresh Data'}
              </Button>
              <Button
                onClick={async () => {
                  setLoading(true)
                  try {
                    // Force fresh analysis
                    const analysisResult =
                      await analyzeChristianHookPatterns(true)
                    if (analysisResult) {
                      setAnalysis(analysisResult)
                    }
                  } catch (error) {
                    console.error('Error running analysis:', error)
                  } finally {
                    setLoading(false)
                  }
                }}
                variant='outline'
                disabled={loading}
              >
                Force Re-analyze
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Empty State */}
      {hasNoData && !loading && (
        <Card className='border-dashed'>
          <CardContent className='flex flex-col items-center justify-center py-16'>
            <div className='bg-muted mb-4 rounded-full p-6'>
              <BarChart className='text-muted-foreground h-12 w-12' />
            </div>
            <h3 className='mb-2 text-lg font-semibold'>
              No Christian Videos Found
            </h3>
            <p className='text-muted-foreground mb-6 max-w-md text-center text-sm'>
              We found very few Christian videos with proper analysis
              (video/transcript). The bulk analyzer needs to process more
              Christian content first.
            </p>
            <div className='text-muted-foreground flex flex-col gap-2 text-sm'>
              <p>To get started:</p>
              <ol className='list-inside list-decimal space-y-1'>
                <li>Go to the GTM Studio dashboard</li>
                <li>Run the bulk viral video analyzer</li>
                <li>Select "Christian UGC" content type</li>
                <li>Wait for analysis to complete</li>
                <li>Return here to see insights</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics */}
      {analysis && analysis.totalVideos > 0 && (
        <div className='grid grid-cols-1 gap-4 md:grid-cols-4'>
          <Card>
            <CardHeader className='pb-3'>
              <CardTitle className='text-sm font-medium'>
                Average Views
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>
                {formatNumber(analysis.averageViews)}
              </div>
              <p className='text-muted-foreground text-xs'>per video</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='pb-3'>
              <CardTitle className='text-sm font-medium'>
                Avg Engagement Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>
                {analysis.averageEngagementRate}%
              </div>
              <p className='text-muted-foreground text-xs'>
                likes + comments + shares
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='pb-3'>
              <CardTitle className='text-sm font-medium'>
                Optimal Hook Length
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>
                {analysis.averageHookLength}
              </div>
              <p className='text-muted-foreground text-xs'>words</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='pb-3'>
              <CardTitle className='text-sm font-medium'>
                Videos Analyzed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>{analysis.totalVideos}</div>
              <p className='text-muted-foreground text-xs'>
                UGC/transformation style
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      {!hasNoData && (
        <Tabs defaultValue='viral-insights' className='space-y-4'>
          <TabsList className='flex w-full flex-wrap gap-2'>
            <TabsTrigger value='viral-insights' className='flex-1'>
              Viral Insights
            </TabsTrigger>
            <TabsTrigger value='top-hooks' className='flex-1'>
              Top Hooks
            </TabsTrigger>
            <TabsTrigger value='patterns' className='flex-1'>
              Patterns
            </TabsTrigger>
            <TabsTrigger value='formulas' className='flex-1'>
              Hook Formulas
            </TabsTrigger>
            <TabsTrigger value='words' className='flex-1'>
              Word Analysis
            </TabsTrigger>
          </TabsList>

          {/* Viral Insights Tab */}
          <TabsContent value='viral-insights' className='space-y-4'>
            <div className='grid gap-4'>
              {/* Viral Techniques */}
              {analysis?.topTechniques && analysis.topTechniques.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Viral Techniques That Work</CardTitle>
                    <CardDescription>
                      Most common techniques found in high-performing videos
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className='space-y-3'>
                      {analysis.topTechniques
                        .slice(0, 10)
                        .map((item, index) => (
                          <div key={index} className='flex items-start gap-3'>
                            <Badge variant='outline' className='mt-0.5'>
                              {item.count}x
                            </Badge>
                            <p className='flex-1 text-sm'>{item.technique}</p>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Emotional Triggers */}
              {analysis?.topEmotionalTriggers &&
                analysis.topEmotionalTriggers.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Emotional Triggers</CardTitle>
                      <CardDescription>
                        Emotions that resonate with Christian audiences
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
                        {analysis.topEmotionalTriggers
                          .slice(0, 8)
                          .map((item, index) => (
                            <div key={index} className='flex items-start gap-2'>
                              <Heart className='mt-0.5 h-4 w-4 text-pink-500' />
                              <div className='flex-1'>
                                <p className='text-sm'>{item.trigger}</p>
                                <p className='text-muted-foreground text-xs'>
                                  Used {item.count} times
                                </p>
                              </div>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

              {/* Visual Elements */}
              {analysis?.topVisualElements &&
                analysis.topVisualElements.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>
                        Visual Elements That Capture Attention
                      </CardTitle>
                      <CardDescription>
                        Visual techniques that stop the scroll
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className='space-y-3'>
                        {analysis.topVisualElements
                          .slice(0, 8)
                          .map((item, index) => (
                            <div key={index} className='flex items-start gap-3'>
                              <Sparkles className='mt-0.5 h-4 w-4 text-yellow-500' />
                              <p className='flex-1 text-sm'>{item.element}</p>
                              <Badge variant='secondary'>{item.count}</Badge>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

              {/* Success Factors */}
              {analysis?.topSuccessFactors &&
                analysis.topSuccessFactors.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Key Success Factors</CardTitle>
                      <CardDescription>
                        Elements consistently found in viral content
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className='flex flex-wrap gap-2'>
                        {analysis.topSuccessFactors.map((item, index) => (
                          <Badge
                            key={index}
                            variant='default'
                            className='gap-1'
                          >
                            <CheckCircle2 className='h-3 w-3' />
                            {item.factor}
                            <span className='ml-1 opacity-70'>
                              ({item.count})
                            </span>
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

              {/* New Video Concepts */}
              {analysis?.topConcepts && analysis.topConcepts.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Viral Content Themes</CardTitle>
                    <CardDescription>
                      Proven themes for creating new viral content
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
                      {analysis.topConcepts.map((item, index) => (
                        <div
                          key={index}
                          className='rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 p-3 dark:from-purple-950/20 dark:to-pink-950/20'
                        >
                          <div className='mb-1 flex items-center gap-2'>
                            <Lightbulb className='h-4 w-4 text-purple-500' />
                            <h4 className='text-sm font-medium'>
                              {item.theme}
                            </h4>
                          </div>
                          <p className='text-muted-foreground text-xs'>
                            Used in {item.count} viral analyses
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Top Hooks Tab */}
          <TabsContent value='top-hooks' className='space-y-4'>
            <Card>
              <CardHeader>
                <CardTitle>Highest Performing Hooks</CardTitle>
                <CardDescription>
                  Actual hooks from viral Christian videos (transcript opening
                  lines or thumbnail text)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className='h-[600px]'>
                  <div className='space-y-4'>
                    {topVideos.slice(0, 30).map((video, index) => (
                      <Card
                        key={video.id}
                        className='hover:bg-accent cursor-pointer p-4 transition-colors'
                        onClick={() => setSelectedHook(video)}
                      >
                        <div className='space-y-2'>
                          <div className='flex items-start justify-between'>
                            <div className='flex-1'>
                              <div className='mb-1 flex items-center gap-2'>
                                <Badge variant='outline'>#{index + 1}</Badge>
                                <span className='text-muted-foreground text-sm'>
                                  {video.author_name ||
                                    `Author #${video.author_id}`}
                                </span>
                              </div>
                              <p className='text-sm font-medium'>
                                "
                                {video.hook_transcript ||
                                  video.description?.substring(0, 200)}
                                {(video.hook_transcript || video.description)
                                  ?.length > 200
                                  ? '...'
                                  : ''}
                                "
                              </p>
                            </div>
                          </div>
                          <div className='text-muted-foreground flex items-center gap-4 text-sm'>
                            <div className='flex items-center gap-1'>
                              <TrendingUp className='h-3 w-3' />
                              {formatNumber(video.views)} views
                            </div>
                            <div className='flex items-center gap-1'>
                              <Heart className='h-3 w-3' />
                              {formatNumber(video.likes)}
                            </div>
                            <div className='flex items-center gap-1'>
                              <MessageSquare className='h-3 w-3' />
                              {formatNumber(video.comments)}
                            </div>
                            <div className='flex items-center gap-1'>
                              <Share2 className='h-3 w-3' />
                              {formatNumber(video.shares)}
                            </div>
                            <Badge variant='secondary'>
                              {video.engagement_rate?.toFixed(2)}% engagement
                            </Badge>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Patterns Tab */}
          <TabsContent value='patterns' className='space-y-4'>
            <Card>
              <CardHeader>
                <CardTitle>Hook Pattern Analysis</CardTitle>
                <CardDescription>
                  Common patterns found in high-performing Christian content
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analysis && (
                  <div className='space-y-6'>
                    {Object.entries(analysis.patternPercentages).map(
                      ([pattern, percentage]) => {
                        const patternNames: Record<string, string> = {
                          questions: 'Questions',
                          personalStory: 'Personal Stories',
                          challenge: 'Challenges',
                          revelation: 'Revelations/Secrets',
                          controversy: 'Controversial Topics',
                        }

                        return (
                          <div key={pattern} className='space-y-2'>
                            <div className='flex items-center justify-between'>
                              <span className='font-medium'>
                                {patternNames[pattern]}
                              </span>
                              <span className='text-muted-foreground text-sm'>
                                {percentage}
                              </span>
                            </div>
                            <Progress
                              value={parseFloat(percentage)}
                              className='h-2'
                            />
                          </div>
                        )
                      }
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pattern Examples */}
            <Card>
              <CardHeader>
                <CardTitle>Pattern Examples</CardTitle>
                <CardDescription>
                  Real examples of each pattern from viral videos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className='space-y-4'>
                  <div className='space-y-2'>
                    <h4 className='flex items-center gap-2 font-medium'>
                      <MessageSquare className='h-4 w-4' />
                      Question Hooks
                    </h4>
                    <p className='text-muted-foreground text-sm'>
                      "Why do Christians always talk about being 'saved'?"
                    </p>
                  </div>

                  <div className='space-y-2'>
                    <h4 className='flex items-center gap-2 font-medium'>
                      <Heart className='h-4 w-4' />
                      Personal Story Hooks
                    </h4>
                    <p className='text-muted-foreground text-sm'>
                      "I used to mock Christians until this happened to me..."
                    </p>
                  </div>

                  <div className='space-y-2'>
                    <h4 className='flex items-center gap-2 font-medium'>
                      <Target className='h-4 w-4' />
                      Challenge Hooks
                    </h4>
                    <p className='text-muted-foreground text-sm'>
                      "I challenge you to pray for someone who hurt you today"
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Hook Formulas Tab */}
          <TabsContent value='formulas' className='space-y-4'>
            <Card>
              <CardHeader>
                <CardTitle>Common Hook Formulas</CardTitle>
                <CardDescription>
                  Example templates for Christian content (based on general
                  patterns, not extracted from analyzed videos)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                  {hookFormulas.map((formula) => {
                    const Icon = formula.icon
                    return (
                      <Card key={formula.name} className='p-4'>
                        <div className='space-y-3'>
                          <div className='flex items-center gap-2'>
                            <Icon className='text-primary h-5 w-5' />
                            <h4 className='font-semibold'>{formula.name}</h4>
                          </div>
                          <div className='space-y-2'>
                            <p className='text-sm font-medium'>Template:</p>
                            <p className='text-muted-foreground bg-muted rounded p-2 font-mono text-sm'>
                              {formula.template}
                            </p>
                          </div>
                          <div className='space-y-2'>
                            <p className='text-sm font-medium'>Example:</p>
                            <p className='text-primary text-sm italic'>
                              "{formula.example}"
                            </p>
                          </div>
                        </div>
                      </Card>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Word Analysis Tab */}
          <TabsContent value='words' className='space-y-4'>
            <Card>
              <CardHeader>
                <CardTitle>Most Common Words in Viral Hooks</CardTitle>
                <CardDescription>
                  Word frequency analysis from top-performing content
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analysis && (
                  <div className='flex flex-wrap gap-2'>
                    {analysis.mostCommonWords.slice(0, 50).map((item) => {
                      const size = Math.min(Math.max(item.count / 10, 0.8), 2)
                      return (
                        <Badge
                          key={item.word}
                          variant='secondary'
                          style={{ fontSize: `${size}rem` }}
                          className='px-3 py-1'
                        >
                          {item.word} ({item.count})
                        </Badge>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Selected Hook Details */}
      {selectedHook && !hasNoData && (
        <Card>
          <CardHeader>
            <CardTitle>Video Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='space-y-4'>
              <div>
                <p className='text-muted-foreground mb-1 text-sm'>
                  Description:
                </p>
                <p className='mb-2 text-lg font-medium'>
                  "{selectedHook.hook_transcript || selectedHook.description}"
                </p>
                <p className='text-muted-foreground text-sm'>
                  by @
                  {selectedHook.author_name ||
                    `Author ${selectedHook.author_id}`}
                </p>
              </div>
              <div className='grid grid-cols-2 gap-4 md:grid-cols-4'>
                <div>
                  <p className='text-muted-foreground text-sm'>Views</p>
                  <p className='font-semibold'>
                    {(selectedHook.views || 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className='text-muted-foreground text-sm'>
                    Engagement Rate
                  </p>
                  <p className='font-semibold'>
                    {selectedHook.engagement_rate?.toFixed(2)}%
                  </p>
                </div>
                <div>
                  <p className='text-muted-foreground text-sm'>
                    Description Length
                  </p>
                  <p className='font-semibold'>
                    {(selectedHook.description || '').split(' ').length} words
                  </p>
                </div>
                <div>
                  <p className='text-muted-foreground text-sm'>
                    Video Duration
                  </p>
                  <p className='font-semibold'>{selectedHook.duration}s</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
