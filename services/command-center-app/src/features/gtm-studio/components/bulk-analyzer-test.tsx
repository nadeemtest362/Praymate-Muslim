import React, { useState } from 'react'
import {
  TestTube2,
  Play,
  CheckCircle2,
  XCircle,
  Heart,
  Database,
  Search,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { applyViralSchema } from '../scripts/apply-viral-schema'
import { checkDatabaseSchema } from '../scripts/check-db-schema'
import {
  runBulkAnalysis,
  getUnanalyzedVideos,
  getViralInsights,
} from '../services/bulk-video-analyzer-simple'
import { checkClaudeHealth } from '../services/claude-health-check'

export function BulkAnalyzerTest() {
  const [testResults, setTestResults] = useState<string[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [testStatus, setTestStatus] = useState<
    'idle' | 'running' | 'passed' | 'failed'
  >('idle')
  const [showMigrationInfo, setShowMigrationInfo] = useState(false)

  const addResult = (
    message: string,
    type: 'info' | 'success' | 'error' = 'info'
  ) => {
    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : '📊'
    const timestamp = new Date().toLocaleTimeString()
    setTestResults((prev) => [...prev, `[${timestamp}] ${icon} ${message}`])
  }

  const runTest = async () => {
    setIsRunning(true)
    setTestResults([])
    setTestStatus('running')

    try {
      // Test 0: Health check
      addResult('Checking Claude API health...')
      const health = await checkClaudeHealth()
      if (health.healthy) {
        addResult(
          `API is healthy (${health.responseTime}ms response)`,
          'success'
        )
      } else {
        addResult(`API health check failed: ${health.message}`, 'error')
        throw new Error('API is not healthy')
      }

      // Test 1: Check unanalyzed videos
      addResult('Checking for unanalyzed videos...')
      const unanalyzed = await getUnanalyzedVideos(10)
      addResult(`Found ${unanalyzed.length} unanalyzed videos`, 'success')

      if (unanalyzed.length > 0) {
        addResult(
          `Sample: ${unanalyzed[0].video_id} - ${unanalyzed[0].views.toLocaleString()} views`
        )
      }

      // Test 2: Run small batch analysis
      if (unanalyzed.length > 0) {
        addResult('Running analysis on 3 videos...')
        const result = await runBulkAnalysis(3, 3)

        if (result.analyzed > 0) {
          addResult(
            `Successfully analyzed ${result.analyzed} videos`,
            'success'
          )
        }

        if (result.failed > 0) {
          addResult(`Failed to analyze ${result.failed} videos`, 'error')
          if (result.errors && result.errors.length > 0) {
            result.errors.slice(0, 3).forEach((err) => {
              addResult(`  - ${err}`, 'error')
            })
          }
        }
      }

      // Test 3: Get insights
      addResult('Fetching viral insights...')
      const insights = await getViralInsights()

      if (insights) {
        addResult(`Total analyzed: ${insights.totalAnalyzed} videos`, 'success')
        if (insights.topEmotions.length > 0) {
          addResult(
            `Top emotion: ${insights.topEmotions[0].item} (${insights.topEmotions[0].count} videos)`
          )
        }
        if (insights.topViralFactors.length > 0) {
          addResult(`Top viral factor: ${insights.topViralFactors[0].item}`)
        }
      }

      // Determine overall test status
      const hasErrors = testResults.some((r) => r.includes('❌'))
      setTestStatus(hasErrors ? 'failed' : 'passed')
      addResult(
        hasErrors ? 'Tests completed with errors' : 'All tests passed!',
        hasErrors ? 'error' : 'success'
      )
    } catch (error: any) {
      setTestStatus('failed')
      addResult(`Test failed: ${error.message}`, 'error')
      console.error('Test error:', error)
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <TestTube2 className='h-5 w-5' />
            Bulk Analyzer Test Suite
          </div>
          <Badge
            variant={
              testStatus === 'passed'
                ? 'default'
                : testStatus === 'failed'
                  ? 'destructive'
                  : testStatus === 'running'
                    ? 'secondary'
                    : 'outline'
            }
          >
            {testStatus === 'passed' && (
              <CheckCircle2 className='mr-1 h-3 w-3' />
            )}
            {testStatus === 'failed' && <XCircle className='mr-1 h-3 w-3' />}
            {testStatus}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div className='flex gap-2'>
          <Button onClick={runTest} disabled={isRunning} className='flex-1'>
            {isRunning ? (
              <>Running Tests...</>
            ) : (
              <>
                <Play className='mr-2 h-4 w-4' />
                Run Test Suite
              </>
            )}
          </Button>
          <Button
            variant='outline'
            onClick={async () => {
              addResult('Checking database schema...')
              await checkDatabaseSchema()
              addResult('Check console for detailed schema info', 'info')
            }}
            className='gap-2'
          >
            <Search className='h-4 w-4' />
            Check DB
          </Button>
        </div>

        {showMigrationInfo && (
          <div className='rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-3 text-sm'>
            <p className='mb-1 font-medium text-yellow-600'>
              Database Migration Required
            </p>
            <p className='text-muted-foreground mb-2'>
              The viral_video_analyses table is missing. Click "Fix DB" to open
              Supabase.
            </p>
            <p className='text-muted-foreground text-xs'>
              Run the SQL from:{' '}
              <code className='bg-black/20 px-1'>
                supabase/migrations/create_viral_analysis_schema.sql
              </code>
            </p>
          </div>
        )}

        {testResults.length > 0 && (
          <div className='bg-muted/50 max-h-96 space-y-1 overflow-y-auto rounded-lg p-4 font-mono text-sm'>
            {testResults.map((result, i) => (
              <div
                key={i}
                className={cn(
                  'whitespace-pre-wrap',
                  result.includes('❌') && 'text-red-500',
                  result.includes('✅') && 'text-green-500'
                )}
              >
                {result}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
