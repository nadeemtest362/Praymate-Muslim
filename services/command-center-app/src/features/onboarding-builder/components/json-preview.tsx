import { useState } from 'react'
import {
  Copy,
  Download,
  Upload,
  Check,
  AlertCircle,
  Code2,
  CloudUpload,
  RefreshCw,
} from 'lucide-react'
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
import { ScrollArea } from '@/components/ui/scroll-area'

interface JsonPreviewProps {
  flow: any
  onImport?: (json: any) => void
}

export function JsonPreview({ flow, onImport }: JsonPreviewProps) {
  const [copied, setCopied] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>(
    'idle'
  )

  const jsonString = JSON.stringify(flow, null, 2)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(jsonString)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${flow.name.toLowerCase().replace(/\s+/g, '-')}-flow.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleSyncToSupabase = async () => {
    setSyncing(true)
    setSyncStatus('idle')

    try {
      // Simulate API call to sync with Supabase
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // In real implementation, this would call your Supabase function
      // const { data, error } = await supabase
      //   .from('onboarding_flows')
      //   .upsert(flow)

      setSyncStatus('success')
      setTimeout(() => setSyncStatus('idle'), 3000)
    } catch (error) {
      setSyncStatus('error')
      setTimeout(() => setSyncStatus('idle'), 3000)
    } finally {
      setSyncing(false)
    }
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      try {
        const text = await file.text()
        const json = JSON.parse(text)
        if (onImport) {
          onImport(json)
        }
      } catch (error) {
        console.error('Failed to parse JSON:', error)
      }
    }
    input.click()
  }

  return (
    <Card>
      <CardHeader>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <Code2 className='h-5 w-5' />
            <CardTitle>JSON Configuration</CardTitle>
          </div>
          <div className='flex items-center gap-2'>
            <Button variant='outline' size='sm' onClick={handleImport}>
              <Upload className='mr-2 h-4 w-4' />
              Import
            </Button>
            <Button variant='outline' size='sm' onClick={handleDownload}>
              <Download className='mr-2 h-4 w-4' />
              Export
            </Button>
            <Button variant='outline' size='sm' onClick={handleCopy}>
              {copied ? (
                <>
                  <Check className='mr-2 h-4 w-4' />
                  Copied
                </>
              ) : (
                <>
                  <Copy className='mr-2 h-4 w-4' />
                  Copy
                </>
              )}
            </Button>
          </div>
        </div>
        <CardDescription>
          Raw JSON configuration for SDUI screens
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className='h-[400px] w-full rounded-md border p-4'>
          <pre className='text-sm'>
            <code>{jsonString}</code>
          </pre>
        </ScrollArea>

        <div className='mt-4 space-y-3'>
          {/* Sync Status */}
          {syncStatus === 'success' && (
            <Alert className='border-green-500 bg-green-50 dark:bg-green-950/20'>
              <Check className='h-4 w-4 text-green-600' />
              <AlertDescription className='text-green-600'>
                Successfully synced to Supabase
              </AlertDescription>
            </Alert>
          )}

          {syncStatus === 'error' && (
            <Alert className='border-red-500 bg-red-50 dark:bg-red-950/20'>
              <AlertCircle className='h-4 w-4 text-red-600' />
              <AlertDescription className='text-red-600'>
                Failed to sync to Supabase
              </AlertDescription>
            </Alert>
          )}

          {/* Sync Button */}
          <Button
            className='w-full'
            onClick={handleSyncToSupabase}
            disabled={syncing}
          >
            {syncing ? (
              <>
                <RefreshCw className='mr-2 h-4 w-4 animate-spin' />
                Syncing...
              </>
            ) : (
              <>
                <CloudUpload className='mr-2 h-4 w-4' />
                Sync to Supabase
              </>
            )}
          </Button>

          <div className='text-muted-foreground flex items-center justify-between text-sm'>
            <span>Format: SDUI v2.0</span>
            <Badge variant='outline'>{flow.steps?.length || 0} steps</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
