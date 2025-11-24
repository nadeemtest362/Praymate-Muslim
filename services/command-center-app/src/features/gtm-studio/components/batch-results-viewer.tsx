import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Church,
  Book,
  Heart,
  BookOpen,
  Image,
  Video,
  Music,
  Copy,
  Download,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface BatchResult {
  id: string
  variant: number
  prompt: string
  pipelineType: string
  result?: string
  imageUrl?: string
  videoUrl?: string
  audioUrl?: string
  error?: string
}

interface BatchResultsViewerProps {
  isOpen: boolean
  onClose: () => void
  results: Record<string, BatchResult[]> | null
}

const PIPELINE_ICONS = {
  jesus: Church,
  bible: Book,
  testimony: Heart,
  prayer: BookOpen,
}

export function BatchResultsViewer({
  isOpen,
  onClose,
  results,
}: BatchResultsViewerProps) {
  const [selectedTab, setSelectedTab] = useState<string>('jesus')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  if (!results) return null

  const pipelineTypes = Object.keys(results)
  
  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      toast.success('Copied to clipboard!')
      setTimeout(() => setCopiedId(null), 2000)
    } catch (err) {
      toast.error('Failed to copy')
    }
  }

  const downloadImage = (url: string, filename: string) => {
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    toast.success('Download started!')
  }

  const renderResult = (item: BatchResult) => {
    const isError = !!item.error
    const hasMedia = item.imageUrl || item.videoUrl || item.audioUrl

    return (
      <Card
        key={item.id}
        className={cn(
          'overflow-hidden',
          isError && 'border-red-500/20 bg-red-50/50 dark:bg-red-950/20'
        )}
      >
        <CardContent className='p-4 space-y-4'>
          {/* Header */}
          <div className='flex items-start justify-between'>
            <div className='flex items-center gap-2'>
              <Badge variant='outline'>Variant {item.variant}</Badge>
              {isError ? (
                <AlertCircle className='h-4 w-4 text-red-500' />
              ) : (
                <CheckCircle2 className='h-4 w-4 text-green-500' />
              )}
            </div>
            <div className='flex gap-1'>
              {item.imageUrl && (
                <Badge variant='secondary' className='gap-1'>
                  <Image className='h-3 w-3' />
                  Image
                </Badge>
              )}
              {item.videoUrl && (
                <Badge variant='secondary' className='gap-1'>
                  <Video className='h-3 w-3' />
                  Video
                </Badge>
              )}
              {item.audioUrl && (
                <Badge variant='secondary' className='gap-1'>
                  <Music className='h-3 w-3' />
                  Audio
                </Badge>
              )}
            </div>
          </div>

          {/* Prompt */}
          <div className='space-y-2'>
            <div className='flex items-center justify-between'>
              <span className='text-sm font-medium'>Prompt</span>
              <Button
                variant='ghost'
                size='sm'
                className='h-7 px-2'
                onClick={() => copyToClipboard(item.prompt, `${item.id}-prompt`)}
              >
                {copiedId === `${item.id}-prompt` ? (
                  <CheckCircle2 className='h-3 w-3' />
                ) : (
                  <Copy className='h-3 w-3' />
                )}
              </Button>
            </div>
            <div className='text-sm text-muted-foreground bg-muted/50 p-3 rounded-md'>
              {item.prompt}
            </div>
          </div>

          {/* Generated Text */}
          {item.result && (
            <div className='space-y-2'>
              <div className='flex items-center justify-between'>
                <span className='text-sm font-medium'>Generated Content</span>
                <Button
                  variant='ghost'
                  size='sm'
                  className='h-7 px-2'
                  onClick={() => copyToClipboard(item.result!, `${item.id}-result`)}
                >
                  {copiedId === `${item.id}-result` ? (
                    <CheckCircle2 className='h-3 w-3' />
                  ) : (
                    <Copy className='h-3 w-3' />
                  )}
                </Button>
              </div>
              <div className='text-sm bg-muted/30 p-3 rounded-md max-h-[200px] overflow-y-auto'>
                {item.result}
              </div>
            </div>
          )}

          {/* Media Preview */}
          {hasMedia && (
            <div className='space-y-2'>
              <span className='text-sm font-medium'>Media</span>
              <div className='grid gap-2'>
                {item.imageUrl && (
                  <div className='relative group'>
                    <img
                      src={item.imageUrl}
                      alt='Generated image'
                      className='w-full rounded-md'
                    />
                    <div className='absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-md flex items-center justify-center gap-2'>
                      <Button
                        size='sm'
                        variant='secondary'
                        onClick={() => window.open(item.imageUrl, '_blank')}
                      >
                        <ExternalLink className='h-4 w-4' />
                      </Button>
                      <Button
                        size='sm'
                        variant='secondary'
                        onClick={() =>
                          downloadImage(
                            item.imageUrl!,
                            `${item.pipelineType}-${item.variant}.png`
                          )
                        }
                      >
                        <Download className='h-4 w-4' />
                      </Button>
                    </div>
                  </div>
                )}
                
                {item.videoUrl && (
                  <div className='flex items-center gap-2 p-3 bg-muted/50 rounded-md'>
                    <Video className='h-4 w-4 text-muted-foreground' />
                    <span className='text-sm flex-1'>Video generated</span>
                    <Button
                      size='sm'
                      variant='outline'
                      onClick={() => window.open(item.videoUrl, '_blank')}
                    >
                      <ExternalLink className='h-4 w-4 mr-2' />
                      View
                    </Button>
                  </div>
                )}
                
                {item.audioUrl && (
                  <div className='flex items-center gap-2 p-3 bg-muted/50 rounded-md'>
                    <Music className='h-4 w-4 text-muted-foreground' />
                    <span className='text-sm flex-1'>Audio generated</span>
                    <Button
                      size='sm'
                      variant='outline'
                      onClick={() => window.open(item.audioUrl, '_blank')}
                    >
                      <ExternalLink className='h-4 w-4 mr-2' />
                      Play
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Error */}
          {item.error && (
            <div className='text-sm text-red-600 dark:text-red-400 p-3 bg-red-100/50 dark:bg-red-900/20 rounded-md'>
              Error: {item.error}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='max-w-4xl max-h-[90vh]'>
        <DialogHeader>
          <DialogTitle>Generated Content Results</DialogTitle>
        </DialogHeader>

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className='mt-4'>
          <TabsList className='grid w-full grid-cols-4'>
            {pipelineTypes.map((type) => {
              const Icon = PIPELINE_ICONS[type as keyof typeof PIPELINE_ICONS]
              const items = results[type] || []
              const successCount = items.filter((i) => !i.error).length
              
              return (
                <TabsTrigger key={type} value={type} className='gap-2'>
                  <Icon className='h-4 w-4' />
                  <span className='capitalize'>{type}</span>
                  <Badge variant='secondary' className='ml-1'>
                    {successCount}/{items.length}
                  </Badge>
                </TabsTrigger>
              )
            })}
          </TabsList>

          {pipelineTypes.map((type) => (
            <TabsContent key={type} value={type} className='mt-4'>
              <ScrollArea className='h-[60vh] pr-4'>
                <div className='space-y-4'>
                  {results[type]?.map(renderResult) || (
                    <div className='text-center text-muted-foreground py-8'>
                      No results for {type}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}