import { useState } from 'react'
import { Loader2, Database, Search, Download } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  exploreViralVideoSchema,
  generateExplorationReport,
  testWorkflowQueries,
} from '../services/viral-video-schema-explorer'

export function SchemaExplorer() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [report, setReport] = useState<string | null>(null)
  const [exploration, setExploration] = useState<any>(null)
  const [queryResults, setQueryResults] = useState<any>(null)

  const handleExploreSchema = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await exploreViralVideoSchema()
      setExploration(result)
      const reportText = generateExplorationReport(result)
      setReport(reportText)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to explore schema')
    } finally {
      setIsLoading(false)
    }
  }

  const handleTestQueries = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const results = await testWorkflowQueries()
      setQueryResults(results)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to test queries')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownloadReport = () => {
    if (!report) return

    const blob = new Blob([report], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `viral-video-schema-${new Date().toISOString().split('T')[0]}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className='space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Database className='h-5 w-5' />
            Viral Video Database Schema Explorer
          </CardTitle>
          <CardDescription>
            Explore the database schema to understand table relationships for
            workflow integration
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='flex gap-2'>
            <Button
              onClick={handleExploreSchema}
              disabled={isLoading}
              className='flex items-center gap-2'
            >
              {isLoading ? (
                <Loader2 className='h-4 w-4 animate-spin' />
              ) : (
                <Search className='h-4 w-4' />
              )}
              Explore Schema
            </Button>

            <Button
              onClick={handleTestQueries}
              disabled={isLoading}
              variant='secondary'
            >
              Test Workflow Queries
            </Button>

            {report && (
              <Button
                onClick={handleDownloadReport}
                variant='outline'
                className='flex items-center gap-2'
              >
                <Download className='h-4 w-4' />
                Download Report
              </Button>
            )}
          </div>

          {error && (
            <Alert variant='destructive'>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {exploration && (
            <div className='space-y-4'>
              <div className='grid grid-cols-3 gap-4'>
                <Card>
                  <CardHeader className='pb-2'>
                    <CardTitle className='text-sm'>Tables Found</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className='text-2xl font-bold'>
                      {exploration.tables.length}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className='pb-2'>
                    <CardTitle className='text-sm'>Workflow Tables</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className='text-2xl font-bold'>
                      {exploration.potentialWorkflowTables.length}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className='pb-2'>
                    <CardTitle className='text-sm'>Foreign Keys</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className='text-2xl font-bold'>
                      {exploration.potentialForeignKeys.length}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className='text-sm'>Tables Discovered</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='flex flex-wrap gap-2'>
                    {exploration.tables.map((table: string) => (
                      <span
                        key={table}
                        className={`rounded-md px-2 py-1 text-xs ${
                          exploration.potentialWorkflowTables.includes(table)
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {table}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {queryResults && (
            <Card>
              <CardHeader>
                <CardTitle className='text-sm'>Query Test Results</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className='max-h-96 overflow-auto rounded bg-gray-100 p-2 text-xs'>
                  {JSON.stringify(queryResults, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}

          {report && (
            <Card>
              <CardHeader>
                <CardTitle className='text-sm'>Schema Report</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className='max-h-96 overflow-auto rounded bg-gray-100 p-2 text-xs whitespace-pre-wrap'>
                  {report}
                </pre>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
