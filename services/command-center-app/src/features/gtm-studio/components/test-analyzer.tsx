import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { testSingleVideo } from '../services/test-single-video'

export function TestAnalyzer() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [logs, setLogs] = useState<string[]>([])

  const runTest = async () => {
    setLoading(true)
    setLogs([])
    setResult(null)

    // Capture console logs
    const originalLog = console.log
    const originalError = console.error

    console.log = (...args) => {
      setLogs((prev) => [...prev, args.join(' ')])
      originalLog(...args)
    }

    console.error = (...args) => {
      setLogs((prev) => [...prev, '❌ ' + args.join(' ')])
      originalError(...args)
    }

    try {
      const testResult = await testSingleVideo('7178976611662826795')
      setResult(testResult)
    } catch (error) {
      console.error('Test failed:', error)
    } finally {
      console.log = originalLog
      console.error = originalError
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Test Single Video Analysis</CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        <Button onClick={runTest} disabled={loading}>
          {loading ? 'Testing...' : 'Run Test'}
        </Button>

        {logs.length > 0 && (
          <div className='max-h-96 overflow-auto rounded bg-black p-4 font-mono text-xs text-green-400'>
            {logs.map((log, i) => (
              <div key={i}>{log}</div>
            ))}
          </div>
        )}

        {result && (
          <div className='mt-4'>
            <h3 className='mb-2 font-bold'>Result:</h3>
            <pre className='overflow-auto rounded bg-gray-100 p-4 text-xs'>
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
