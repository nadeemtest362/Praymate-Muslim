import React, { useState, useEffect } from 'react'
import {
  DollarSign,
  AlertTriangle,
  Brain,
  Play,
  Pause,
  RefreshCw,
  Clock,
  TrendingUp,
  AlertCircle,
} from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
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
import {
  runBulkAnalysis,
  estimateAnalysisCost,
  getAnalysisProgress,
  type AnalysisProgress,
} from '../services/bulk-video-analyzer-v2'

export function ViralVideoAnalyzer() {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [progress, setProgress] = useState<AnalysisProgress | null>(null)
  const [maxVideos, setMaxVideos] = useState(50)
  const [costEstimate, setCostEstimate] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadProgress()
  }, [])

  useEffect(() => {
    if (maxVideos > 0) {
      estimateCost()
    }
  }, [maxVideos])

  const loadProgress = async () => {
    try {
      const data = await getAnalysisProgress()
      setProgress(data)
    } catch (err) {
      console.error('Failed to load progress:', err)
    }
  }

  const estimateCost = async () => {
    try {
      const estimate = await estimateAnalysisCost(maxVideos)
      setCostEstimate(estimate)
    } catch (err) {
      console.error('Failed to estimate cost:', err)
    }
  }

  const startAnalysis = async () => {
    if (
      !window.confirm(
        `This will analyze up to ${maxVideos} videos and cost approximately $${costEstimate?.estimatedCost.toFixed(2)}. Continue?`
      )
    ) {
      return
    }

    setIsAnalyzing(true)
    setError(null)

    try {
      const finalProgress = await runBulkAnalysis(maxVideos, (prog) => {
        setProgress(prog)
      })

      setProgress(finalProgress)

      if (finalProgress.error_count > 0) {
        setError(`Analysis completed with ${finalProgress.error_count} errors`)
      }
    } catch (err: any) {
      console.error('Analysis failed:', err)
      setError(err.message || 'Analysis failed')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const progressPercent = progress
    ? (progress.analyzed_count / Math.min(maxVideos, progress.total_videos)) *
      100
    : 0

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-2xl font-bold'>Viral Video Analyzer</h2>
          <p className='text-muted-foreground'>
            AI analysis of Christian TikTok content with safety controls
          </p>
        </div>
        {progress && (
          <div className='flex items-center gap-2'>
            <Badge variant='outline' className='gap-1'>
              <Brain className='h-3 w-3' />
              {progress.success_count} Analyzed
            </Badge>
            <Badge variant='outline' className='gap-1'>
              <DollarSign className='h-3 w-3' />$
              {progress.estimated_cost.toFixed(2)}
            </Badge>
          </div>
        )}
      </div>

      {/* Cost Warning */}
      <Alert>
        <AlertTriangle className='h-4 w-4' />
        <AlertTitle>Cost & Rate Limits</AlertTitle>
        <AlertDescription>
          This tool uses Claude AI which costs ~$0.015 per video analysis. Rate
          limited to 40 requests/minute with automatic pausing. Maximum cost
          limit: $10.00
        </AlertDescription>
      </Alert>

      {/* Analysis Control */}
      <Card>
        <CardHeader>
          <CardTitle>Analysis Settings</CardTitle>
          <CardDescription>
            Configure how many videos to analyze
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='max-videos'>Number of videos to analyze</Label>
            <div className='flex items-center gap-4'>
              <Input
                id='max-videos'
                type='number'
                value={maxVideos}
                onChange={(e) =>
                  setMaxVideos(
                    Math.max(1, Math.min(500, parseInt(e.target.value) || 1))
                  )
                }
                min='1'
                max='500'
                className='w-32'
                disabled={isAnalyzing}
              />
              {costEstimate && (
                <div className='text-muted-foreground text-sm'>
                  <span className='font-medium'>
                    ${costEstimate.estimatedCost.toFixed(2)}
                  </span>{' '}
                  estimated cost •{' '}
                  <span className='font-medium'>
                    {costEstimate.estimatedTime}
                  </span>{' '}
                  estimated time
                </div>
              )}
            </div>
          </div>

          {error && (
            <Alert variant='destructive'>
              <AlertCircle className='h-4 w-4' />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {isAnalyzing && progress && (
            <div className='space-y-2'>
              <div className='flex items-center justify-between text-sm'>
                <span>
                  Analyzing {progress.analyzed_count} of{' '}
                  {Math.min(maxVideos, progress.total_videos)}
                </span>
                <span>{Math.round(progressPercent)}%</span>
              </div>
              <Progress value={progressPercent} />
              <div className='text-muted-foreground flex items-center gap-4 text-xs'>
                <span>✅ {progress.success_count} success</span>
                <span>❌ {progress.error_count} errors</span>
                <span>⏭️ {progress.skipped_count} skipped</span>
              </div>
            </div>
          )}

          <div className='flex items-center gap-2'>
            <Button
              onClick={startAnalysis}
              disabled={isAnalyzing || maxVideos < 1}
              className='gap-2'
            >
              {isAnalyzing ? (
                <>
                  <Pause className='h-4 w-4' />
                  Analyzing...
                </>
              ) : (
                <>
                  <Play className='h-4 w-4' />
                  Start Analysis
                </>
              )}
            </Button>
            <Button
              variant='outline'
              onClick={loadProgress}
              disabled={isAnalyzing}
              className='gap-2'
            >
              <RefreshCw className='h-4 w-4' />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Progress Summary */}
      {progress && progress.analyzed_count > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Analysis Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='grid grid-cols-2 gap-4 md:grid-cols-4'>
              <div className='space-y-1'>
                <p className='text-muted-foreground text-sm'>Total Analyzed</p>
                <p className='text-2xl font-bold'>{progress.analyzed_count}</p>
              </div>
              <div className='space-y-1'>
                <p className='text-muted-foreground text-sm'>Success Rate</p>
                <p className='text-2xl font-bold'>
                  {progress.analyzed_count > 0
                    ? Math.round(
                        (progress.success_count / progress.analyzed_count) * 100
                      )
                    : 0}
                  %
                </p>
              </div>
              <div className='space-y-1'>
                <p className='text-muted-foreground text-sm'>Total Cost</p>
                <p className='text-2xl font-bold'>
                  ${progress.estimated_cost.toFixed(2)}
                </p>
              </div>
              <div className='space-y-1'>
                <p className='text-muted-foreground text-sm'>Rate Limits Hit</p>
                <p className='text-2xl font-bold'>
                  {progress.rate_limit_pauses || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent className='space-y-2 text-sm'>
          <p>
            • Analyzes viral Christian videos (500k+ views) from your database
          </p>
          <p>
            • Uses video captions and hooks when available (no video file
            analysis)
          </p>
          <p>
            • Extracts emotional triggers, viral factors, and content patterns
          </p>
          <p>• Rate limited to 40 requests/minute with automatic pausing</p>
          <p>• Saves progress so you can resume if interrupted</p>
          <p>• Maximum cost safety limit of $10 per session</p>
        </CardContent>
      </Card>
    </div>
  )
}
