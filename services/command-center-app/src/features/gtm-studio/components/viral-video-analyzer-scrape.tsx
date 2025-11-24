import React, { useState, useEffect } from 'react'
import {
  Brain,
  Zap,
  Play,
  RefreshCw,
  TrendingUp,
  FileText,
  Video,
  Image,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  Link,
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  runBulkViralAnalysis,
  getViralInsights,
  getUnanalyzedViralVideos,
  getReplicationFormulas,
} from '../services/bulk-video-analyzer-with-scrape'
import { analyzeViralVideo } from '../services/viral-video-analysis-service'

export function ViralVideoAnalyzerWithScrape() {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [insights, setInsights] = useState<any>(null)
  const [unanalyzedCount, setUnanalyzedCount] = useState(0)
  const [progress, setProgress] = useState(0)
  const [analysisStats, setAnalysisStats] = useState<any>(null)
  const [formulas, setFormulas] = useState<any[]>([])
  const [singleVideoUrl, setSingleVideoUrl] = useState('')
  const [singleVideoResult, setSingleVideoResult] = useState<any>(null)
  const [isAnalyzingSingle, setIsAnalyzingSingle] = useState(false)

  useEffect(() => {
    // First check the schema
    checkSchema()
    loadData()
  }, [])

  const checkSchema = async () => {
    const { supabase } = await import('../services/supabase-service')
    try {
      const { data, error } = await supabase.from('videos').select('*').limit(1)

      if (!error && data && data.length > 0) {
        console.log('Videos table columns:', Object.keys(data[0]))
        console.log('Sample video data:', data[0])
      }
    } catch (e) {
      console.error('Schema check error:', e)
    }
  }

  const loadData = async () => {
    const [insightsData, unanalyzed, formulasData] = await Promise.all([
      getViralInsights(),
      getUnanalyzedViralVideos(500),
      getReplicationFormulas(),
    ])

    setInsights(insightsData)
    setUnanalyzedCount(unanalyzed.length)
    setFormulas(formulasData)
  }

  const startBulkAnalysis = async () => {
    setIsAnalyzing(true)
    setProgress(0)

    try {
      const stats = await runBulkViralAnalysis(100, 20) // Smart rate limiting
      setAnalysisStats(stats)
      await loadData()
    } catch (error) {
      console.error('Analysis failed:', error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const analyzeSingleVideo = async () => {
    if (!singleVideoUrl.trim()) return

    setIsAnalyzingSingle(true)
    setSingleVideoResult(null)

    try {
      const result = await analyzeViralVideo(singleVideoUrl)
      setSingleVideoResult(result)
    } catch (error) {
      console.error('Single video analysis failed:', error)
      setSingleVideoResult({ error: 'Analysis failed' })
    } finally {
      setIsAnalyzingSingle(false)
    }
  }

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'transcript':
        return <FileText className='h-4 w-4' />
      case 'gemini_video':
        return <Video className='h-4 w-4' />
      case 'thumbnail':
        return <Image className='h-4 w-4' />
      case 'description':
        return <MessageSquare className='h-4 w-4' />
      default:
        return <AlertCircle className='h-4 w-4' />
    }
  }

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-2xl font-bold'>Viral Video Analyzer 2.0</h2>
          <p className='text-muted-foreground'>
            AI-powered analysis with ScrapeCreators integration
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <Badge variant='outline' className='gap-1'>
            <Brain className='h-3 w-3' />
            {insights?.totalAnalyzed || 0} Analyzed
          </Badge>
          <Badge variant='outline' className='gap-1'>
            <TrendingUp className='h-3 w-3' />
            {unanalyzedCount} Available
          </Badge>
        </div>
      </div>

      {/* Single Video Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Analyze Single Video</CardTitle>
          <CardDescription>
            Enter a TikTok URL to analyze with transcript extraction
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='flex gap-2'>
            <Input
              placeholder='https://www.tiktok.com/@username/video/123...'
              value={singleVideoUrl}
              onChange={(e) => setSingleVideoUrl(e.target.value)}
              className='flex-1'
            />
            <Button
              onClick={analyzeSingleVideo}
              disabled={isAnalyzingSingle || !singleVideoUrl.trim()}
              className='gap-2'
            >
              {isAnalyzingSingle ? (
                <>
                  <Brain className='h-4 w-4 animate-pulse' />
                  Analyzing...
                </>
              ) : (
                <>
                  <Link className='h-4 w-4' />
                  Analyze
                </>
              )}
            </Button>
          </div>

          {singleVideoResult && (
            <div className='mt-4 space-y-3'>
              {singleVideoResult.error ? (
                <div className='text-destructive flex items-center gap-2'>
                  <AlertCircle className='h-4 w-4' />
                  <span>{singleVideoResult.error}</span>
                </div>
              ) : (
                <>
                  <div className='flex items-center gap-2'>
                    <CheckCircle2 className='h-4 w-4 text-green-500' />
                    <span>Analysis complete</span>
                    <Badge variant='outline' className='gap-1'>
                      {getSourceIcon(singleVideoResult.source)}
                      {singleVideoResult.source}
                    </Badge>
                  </div>

                  {singleVideoResult.analysis?.overall_summary && (
                    <div className='bg-muted/50 rounded p-3'>
                      <p className='text-sm'>
                        {singleVideoResult.analysis.overall_summary}
                      </p>
                    </div>
                  )}

                  {singleVideoResult.analysis?.new_video_concepts?.concepts
                    ?.length > 0 && (
                    <div className='space-y-2'>
                      <h4 className='font-medium'>Generated Concepts:</h4>
                      {singleVideoResult.analysis.new_video_concepts.concepts
                        .slice(0, 3)
                        .map((concept: any, i: number) => (
                          <div
                            key={i}
                            className='bg-muted/30 rounded p-2 text-sm'
                          >
                            <div className='font-medium'>
                              {concept.concept_title}
                            </div>
                            <div className='text-muted-foreground'>
                              {concept.details?.emotion}
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk Analysis Control */}
      <Card>
        <CardHeader>
          <CardTitle>Bulk Analysis</CardTitle>
          <CardDescription>
            Analyze multiple viral videos to extract patterns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            <div className='flex items-center gap-2'>
              <Button
                onClick={startBulkAnalysis}
                disabled={isAnalyzing || unanalyzedCount === 0}
                className='gap-2'
              >
                {isAnalyzing ? (
                  <>
                    <Brain className='h-4 w-4 animate-pulse' />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Play className='h-4 w-4' />
                    Analyze 100 Videos
                  </>
                )}
              </Button>
              <Button
                variant='outline'
                onClick={loadData}
                disabled={isAnalyzing}
                className='gap-2'
              >
                <RefreshCw className='h-4 w-4' />
                Refresh
              </Button>
            </div>

            {analysisStats && (
              <div className='grid grid-cols-2 gap-2 md:grid-cols-4'>
                <div className='bg-muted/50 rounded p-3'>
                  <div className='text-muted-foreground flex items-center gap-1 text-sm'>
                    <FileText className='h-3 w-3' />
                    Transcript
                  </div>
                  <div className='font-medium'>
                    {analysisStats.transcriptAnalysis}
                  </div>
                </div>
                <div className='bg-muted/50 rounded p-3'>
                  <div className='text-muted-foreground flex items-center gap-1 text-sm'>
                    <Video className='h-3 w-3' />
                    Video AI
                  </div>
                  <div className='font-medium'>
                    {analysisStats.geminiVideoAnalysis}
                  </div>
                </div>
                <div className='bg-muted/50 rounded p-3'>
                  <div className='text-muted-foreground flex items-center gap-1 text-sm'>
                    <Image className='h-3 w-3' />
                    Thumbnail
                  </div>
                  <div className='font-medium'>
                    {analysisStats.thumbnailAnalysis}
                  </div>
                </div>
                <div className='bg-muted/50 rounded p-3'>
                  <div className='text-muted-foreground flex items-center gap-1 text-sm'>
                    <MessageSquare className='h-3 w-3' />
                    Description
                  </div>
                  <div className='font-medium'>
                    {analysisStats.descriptionAnalysis}
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Insights */}
      {insights && (
        <Tabs defaultValue='concepts' className='space-y-4'>
          <TabsList className='grid w-full grid-cols-5'>
            <TabsTrigger value='concepts'>Concepts</TabsTrigger>
            <TabsTrigger value='emotions'>Emotions</TabsTrigger>
            <TabsTrigger value='elements'>Elements</TabsTrigger>
            <TabsTrigger value='formulas'>Formulas</TabsTrigger>
            <TabsTrigger value='sources'>Sources</TabsTrigger>
          </TabsList>

          <TabsContent value='concepts'>
            <Card>
              <CardHeader>
                <CardTitle>Top Video Concepts</CardTitle>
                <CardDescription>
                  Most frequently suggested viral concepts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className='space-y-3'>
                  {insights.topConcepts
                    .slice(0, 10)
                    .map((concept: any, i: number) => (
                      <div
                        key={i}
                        className='flex items-start justify-between gap-2'
                      >
                        <div className='flex-1'>
                          <div className='font-medium'>
                            {concept.concept_title}
                          </div>
                          <div className='text-muted-foreground text-sm'>
                            {concept.theme_title} • {concept.emotion}
                          </div>
                        </div>
                        <Badge variant='secondary'>{concept.count}x</Badge>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value='emotions'>
            <Card>
              <CardHeader>
                <CardTitle>Emotional Drivers</CardTitle>
                <CardDescription>
                  Emotions that power viral content
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className='grid grid-cols-2 gap-3 md:grid-cols-3'>
                  {insights.topEmotions.map((emotion: any, i: number) => (
                    <div
                      key={i}
                      className='bg-muted/50 flex items-center justify-between rounded p-3'
                    >
                      <span className='font-medium capitalize'>
                        {emotion.emotion}
                      </span>
                      <Badge variant='outline'>{emotion.count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value='elements'>
            <Card>
              <CardHeader>
                <CardTitle>Success Elements</CardTitle>
                <CardDescription>
                  Key elements for viral success
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className='space-y-2'>
                  {insights.topViralElements.map((element: any, i: number) => (
                    <div
                      key={i}
                      className='bg-muted/30 flex items-center justify-between rounded p-2'
                    >
                      <span className='text-sm'>{element.element}</span>
                      <Badge variant='outline'>{element.count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value='formulas'>
            <Card>
              <CardHeader>
                <CardTitle>Winning Formulas</CardTitle>
                <CardDescription>
                  Proven emotion + theme combinations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className='space-y-3'>
                  {formulas.slice(0, 10).map((formula: any, i: number) => (
                    <div key={i} className='flex items-center justify-between'>
                      <div>
                        <div className='font-medium'>{formula.formula}</div>
                        <div className='text-muted-foreground text-sm'>
                          {formula.examples} examples • Avg{' '}
                          {formula.avgViews.toLocaleString()} views
                        </div>
                      </div>
                      <Badge
                        variant={
                          formula.avgViews > 5000000 ? 'default' : 'secondary'
                        }
                      >
                        {(formula.avgViews / 1000000).toFixed(1)}M
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value='sources'>
            <Card>
              <CardHeader>
                <CardTitle>Analysis Sources</CardTitle>
                <CardDescription>
                  Breakdown of how videos were analyzed
                </CardDescription>
              </CardHeader>
              <CardContent>
                {insights.analysisBreakdown && (
                  <div className='space-y-4'>
                    <div className='grid grid-cols-2 gap-3'>
                      <div className='bg-muted/50 space-y-1 rounded p-4'>
                        <div className='flex items-center gap-2'>
                          <FileText className='h-4 w-4' />
                          <span className='font-medium'>Transcript</span>
                        </div>
                        <div className='text-2xl font-bold'>
                          {(
                            (insights.analysisBreakdown.transcriptAnalysis /
                              insights.totalAnalyzed) *
                            100
                          ).toFixed(1)}
                          %
                        </div>
                        <div className='text-muted-foreground text-sm'>
                          {insights.analysisBreakdown.transcriptAnalysis} videos
                        </div>
                      </div>

                      <div className='bg-muted/50 space-y-1 rounded p-4'>
                        <div className='flex items-center gap-2'>
                          <Video className='h-4 w-4' />
                          <span className='font-medium'>Video AI</span>
                        </div>
                        <div className='text-2xl font-bold'>
                          {(
                            (insights.analysisBreakdown.geminiVideoAnalysis /
                              insights.totalAnalyzed) *
                            100
                          ).toFixed(1)}
                          %
                        </div>
                        <div className='text-muted-foreground text-sm'>
                          {insights.analysisBreakdown.geminiVideoAnalysis}{' '}
                          videos
                        </div>
                      </div>

                      <div className='bg-muted/50 space-y-1 rounded p-4'>
                        <div className='flex items-center gap-2'>
                          <Image className='h-4 w-4' />
                          <span className='font-medium'>Thumbnail</span>
                        </div>
                        <div className='text-2xl font-bold'>
                          {(
                            (insights.analysisBreakdown.thumbnailAnalysis /
                              insights.totalAnalyzed) *
                            100
                          ).toFixed(1)}
                          %
                        </div>
                        <div className='text-muted-foreground text-sm'>
                          {insights.analysisBreakdown.thumbnailAnalysis} videos
                        </div>
                      </div>

                      <div className='bg-muted/50 space-y-1 rounded p-4'>
                        <div className='flex items-center gap-2'>
                          <MessageSquare className='h-4 w-4' />
                          <span className='font-medium'>Description</span>
                        </div>
                        <div className='text-2xl font-bold'>
                          {(
                            (insights.analysisBreakdown.descriptionAnalysis /
                              insights.totalAnalyzed) *
                            100
                          ).toFixed(1)}
                          %
                        </div>
                        <div className='text-muted-foreground text-sm'>
                          {insights.analysisBreakdown.descriptionAnalysis}{' '}
                          videos
                        </div>
                      </div>
                    </div>

                    <div className='text-muted-foreground text-sm'>
                      Videos with transcripts are analyzed directly. Videos
                      without transcripts are processed with Gemini video AI for
                      deep content analysis.
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
