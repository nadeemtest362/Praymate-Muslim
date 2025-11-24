import React, { useState, useEffect } from 'react'
import { Brain, Zap, Play, RefreshCw, TrendingUp } from 'lucide-react'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  runBulkAnalysis,
  getViralInsights,
  getUnanalyzedVideos,
} from '../services/bulk-video-analyzer-simple'

export function ViralVideoAnalyzer() {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [insights, setInsights] = useState<any>(null)
  const [unanalyzedCount, setUnanalyzedCount] = useState(0)
  const [progress, setProgress] = useState(0)
  const [analysisLog, setAnalysisLog] = useState<string[]>([])
  const [totalAnalyzed, setTotalAnalyzed] = useState(0)
  const [errorCount, setErrorCount] = useState(0)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const [insightsData, unanalyzed] = await Promise.all([
      getViralInsights(),
      getUnanalyzedVideos(1000),
    ])

    setInsights(insightsData)
    setUnanalyzedCount(unanalyzed.length)
  }

  const startAnalysis = async () => {
    setIsAnalyzing(true)
    setAnalysisLog([])
    setProgress(0)
    setTotalAnalyzed(0)
    setErrorCount(0)

    try {
      // Create a custom console logger to capture progress
      const originalLog = console.log
      const logs: string[] = []

      console.log = (...args) => {
        const message = args.join(' ')
        logs.push(message)
        setAnalysisLog((prev) => [...prev.slice(-10), message]) // Keep last 10 messages

        // Extract progress info
        const progressMatch = message.match(
          /(\d+)\/(\d+) videos \((\d+\.\d+)%\)/
        )
        if (progressMatch) {
          const [, current, total, percent] = progressMatch
          setProgress(parseFloat(percent))
          setTotalAnalyzed(parseInt(current))
        }

        // Count errors
        if (message.includes('Failed to analyze') || message.includes('❌')) {
          setErrorCount((prev) => prev + 1)
        }

        originalLog(...args)
      }

      // Analyze in batches of 20, up to 100 videos for testing
      const result = await runBulkAnalysis(100, 20)

      // Show final results
      if (result.failed > 0) {
        setAnalysisLog((prev) => [
          ...prev,
          `⚠️ Warning: ${result.failed} videos failed to analyze`,
        ])
      }

      await loadData()

      // Restore original console.log
      console.log = originalLog
    } catch (error) {
      console.error('Analysis failed:', error)
      setAnalysisLog((prev) => [...prev, `❌ Error: ${error.message}`])
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-2xl font-bold'>Viral Video Analyzer</h2>
          <p className='text-muted-foreground'>
            Deep AI analysis of what makes Christian content go viral
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

      {/* Control */}
      <Card>
        <CardHeader>
          <CardTitle>Run Analysis</CardTitle>
          <CardDescription>
            Analyze viral videos to extract success patterns
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='flex items-center gap-2'>
            <Button
              onClick={startAnalysis}
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
                  Analyze Videos
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

          {/* Progress indicator */}
          {isAnalyzing && (
            <div className='space-y-2'>
              <div className='flex items-center justify-between text-sm'>
                <span>Analyzing videos...</span>
                <span className='font-medium'>{progress.toFixed(1)}%</span>
              </div>
              <Progress value={progress} className='h-2' />
              <div className='text-muted-foreground flex items-center gap-4 text-xs'>
                <span>{totalAnalyzed} videos processed</span>
                {errorCount > 0 && (
                  <span className='text-yellow-500'>{errorCount} errors</span>
                )}
              </div>
            </div>
          )}

          {/* Analysis log */}
          {analysisLog.length > 0 && (
            <div className='bg-muted/50 mt-4 max-h-32 overflow-y-auto rounded-md p-3'>
              <p className='mb-1 text-xs font-medium'>Analysis Log:</p>
              {analysisLog.map((log, i) => (
                <p key={i} className='text-muted-foreground font-mono text-xs'>
                  {log}
                </p>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Insights */}
      {insights && (
        <Tabs defaultValue='emotions' className='space-y-4'>
          <TabsList className='grid w-full grid-cols-4'>
            <TabsTrigger value='emotions'>Emotions</TabsTrigger>
            <TabsTrigger value='factors'>Viral Factors</TabsTrigger>
            <TabsTrigger value='types'>Content Types</TabsTrigger>
            <TabsTrigger value='examples'>Examples</TabsTrigger>
          </TabsList>

          <TabsContent value='emotions'>
            <Card>
              <CardHeader>
                <CardTitle>Emotional Triggers</CardTitle>
                <CardDescription>
                  Emotions that drive viral Christian content
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className='space-y-3'>
                  {insights.topEmotions.map(
                    ({ item, count }: any, i: number) => (
                      <div
                        key={item}
                        className='flex items-center justify-between'
                      >
                        <span className='font-medium capitalize'>{item}</span>
                        <Badge variant='secondary'>{count} videos</Badge>
                      </div>
                    )
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value='factors'>
            <Card>
              <CardHeader>
                <CardTitle>Viral Success Factors</CardTitle>
                <CardDescription>
                  What makes these videos spread
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className='grid grid-cols-1 gap-2 md:grid-cols-2'>
                  {insights.topViralFactors.map(({ item, count }: any) => (
                    <div
                      key={item}
                      className='bg-muted/50 flex items-center justify-between rounded p-2'
                    >
                      <span className='text-sm'>{item}</span>
                      <Badge variant='outline'>{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value='types'>
            <Card>
              <CardHeader>
                <CardTitle>Content Type Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className='space-y-3'>
                  {insights.contentTypes.map(({ item, count }: any) => (
                    <div
                      key={item}
                      className='flex items-center justify-between'
                    >
                      <Badge variant='outline' className='capitalize'>
                        {item}
                      </Badge>
                      <span className='font-medium'>{count} videos</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value='examples'>
            <Card>
              <CardHeader>
                <CardTitle>Top Video Insights</CardTitle>
                <CardDescription>
                  Specific strategies from viral videos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className='space-y-4'>
                  {insights.examples.map((ex: any) => (
                    <div
                      key={ex.video_id}
                      className='bg-muted/30 space-y-2 rounded p-3'
                    >
                      <div className='flex items-center justify-between'>
                        <Badge variant='secondary'>
                          {ex.views.toLocaleString()} views
                        </Badge>
                      </div>
                      {ex.hook_strategy && (
                        <p className='text-sm'>
                          <span className='font-medium'>Hook: </span>
                          {ex.hook_strategy}
                        </p>
                      )}
                      {ex.replication_note && (
                        <p className='text-sm'>
                          <span className='font-medium'>Insight: </span>
                          {ex.replication_note}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
