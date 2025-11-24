import React, { useState } from 'react'
import {
  Play,
  Loader2,
  Calendar,
  Layers,
  Zap,
  Settings,
  Image as ImageIcon,
  Video,
  Type,
  Share,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import {
  createSimpleContentPipeline,
  batchCreateContent,
  testAutomation,
  AUTOMATION_TEMPLATES,
} from '../services/content-automation-service'

export function ContentAutomationPanel() {
  const [loading, setLoading] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [batchPrompts, setBatchPrompts] = useState('')
  const [results, setResults] = useState<any>(null)

  const handleSimplePipeline = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt')
      return
    }

    setLoading(true)
    try {
      const result = await createSimpleContentPipeline(prompt)
      setResults(result)

      if (result.success) {
        toast.success('Pipeline completed successfully!')
      } else {
        toast.error('Pipeline failed: ' + result.error)
      }
    } catch (error) {
      console.error('Pipeline error:', error)
      toast.error('Pipeline failed: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleBatchProcessing = async () => {
    const prompts = batchPrompts
      .split('\n')
      .map((p) => p.trim())
      .filter((p) => p.length > 0)

    if (prompts.length === 0) {
      toast.error('Please enter at least one prompt')
      return
    }

    setLoading(true)
    try {
      const results = await batchCreateContent(prompts, {
        addHooks: true,
        addCaptions: true,
      })
      setResults(results)

      const successCount = results.filter((r) => r.success).length
      toast.success(
        `Batch completed: ${successCount}/${results.length} successful`
      )
    } catch (error) {
      console.error('Batch error:', error)
      toast.error('Batch processing failed: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleTestAutomation = async () => {
    setLoading(true)
    try {
      const result = await testAutomation()
      setResults(result)
      toast.success('Test automation completed!')
    } catch (error) {
      console.error('Test error:', error)
      toast.error('Test failed: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div>
        <h3 className='flex items-center gap-2 text-2xl font-semibold'>
          <Zap className='h-6 w-6 text-blue-500' />
          Content Automation
        </h3>
        <p className='text-muted-foreground mt-1 text-sm'>
          Automated pipelines: Prompt → Image → Video → Hook → Caption
        </p>
      </div>

      {/* Templates Overview */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2 text-lg'>
            <Settings className='h-5 w-5' />
            Available Templates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
            {Object.entries(AUTOMATION_TEMPLATES).map(([key, description]) => (
              <div
                key={key}
                className='flex items-center justify-between rounded-lg border p-3'
              >
                <div>
                  <p className='text-sm font-medium'>
                    {key.replace(/_/g, ' ')}
                  </p>
                  <p className='text-muted-foreground text-xs'>{description}</p>
                </div>
                <Badge variant='outline' className='text-xs'>
                  Template
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Simple Pipeline */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2 text-lg'>
            <Play className='h-5 w-5' />
            Simple Pipeline
          </CardTitle>
          <p className='text-muted-foreground text-sm'>
            Single prompt → Full content creation
          </p>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='prompt'>Content Prompt</Label>
            <Textarea
              id='prompt'
              placeholder='e.g., Jesus walking on water, golden hour lighting, cinematic'
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
            />
          </div>

          {/* Pipeline Steps */}
          <div className='text-muted-foreground flex items-center gap-2 text-sm'>
            <div className='flex items-center gap-1'>
              <ImageIcon className='h-4 w-4' />
              <span>Image</span>
            </div>
            <span>→</span>
            <div className='flex items-center gap-1'>
              <Video className='h-4 w-4' />
              <span>Video</span>
            </div>
            <span>→</span>
            <div className='flex items-center gap-1'>
              <Type className='h-4 w-4' />
              <span>Hook</span>
            </div>
            <span>→</span>
            <div className='flex items-center gap-1'>
              <Share className='h-4 w-4' />
              <span>Caption</span>
            </div>
          </div>

          <Button
            onClick={handleSimplePipeline}
            disabled={loading}
            className='w-full'
          >
            {loading ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                Processing Pipeline...
              </>
            ) : (
              <>
                <Play className='mr-2 h-4 w-4' />
                Run Simple Pipeline
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Batch Processing */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2 text-lg'>
            <Layers className='h-5 w-5' />
            Batch Processing
          </CardTitle>
          <p className='text-muted-foreground text-sm'>
            Multiple prompts → Automated content creation
          </p>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='batch-prompts'>
              Content Prompts (one per line)
            </Label>
            <Textarea
              id='batch-prompts'
              placeholder={`Jesus walking on water, cinematic lighting
Person praying in garden, peaceful morning
Bible with glowing text, warm light`}
              value={batchPrompts}
              onChange={(e) => setBatchPrompts(e.target.value)}
              rows={6}
            />
          </div>

          <Button
            onClick={handleBatchProcessing}
            disabled={loading}
            className='w-full'
            variant='outline'
          >
            {loading ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                Processing Batch...
              </>
            ) : (
              <>
                <Layers className='mr-2 h-4 w-4' />
                Run Batch Processing
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Test Section */}
      <Card>
        <CardHeader>
          <CardTitle className='text-lg'>Test Automation</CardTitle>
          <p className='text-muted-foreground text-sm'>
            Run with sample prompts to test the pipeline
          </p>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleTestAutomation}
            disabled={loading}
            variant='secondary'
            className='w-full'
          >
            {loading ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                Running Test...
              </>
            ) : (
              'Test with Sample Prompts'
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {results && (
        <Card>
          <CardHeader>
            <CardTitle className='text-lg'>Results</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className='bg-muted max-h-60 overflow-auto rounded-lg p-4 text-xs'>
              {JSON.stringify(results, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
