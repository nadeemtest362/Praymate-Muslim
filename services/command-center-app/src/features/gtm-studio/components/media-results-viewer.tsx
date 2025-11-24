import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Download,
  Copy,
  Play,
  Pause,
  Maximize2,
  X,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
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
  imageUrls?: string[] // Multiple images for text overlays
  videoUrl?: string
  audioUrl?: string
  error?: string
}

interface MediaResultsViewerProps {
  isOpen: boolean
  onClose: () => void
  results: Record<string, BatchResult[]> | null
  onRerollImage?: (contentId: string, imageIndex: number) => Promise<void>
}

// CSS for progress animation
const progressAnimation = `
  @keyframes progress {
    from { width: 0; }
    to { width: 100%; }
  }
  .animate-progress {
    animation: progress 3s linear;
  }
`

export function MediaResultsViewer({
  isOpen,
  onClose,
  results,
  onRerollImage,
}: MediaResultsViewerProps) {
  const [selectedItem, setSelectedItem] = useState<BatchResult | null>(null)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [isAutoPlaying, setIsAutoPlaying] = useState(false)
  const [rerollingId, setRerollingId] = useState<string | null>(null)
  
  // Auto-advance slides when playing
  React.useEffect(() => {
    if (isAutoPlaying && selectedItem?.imageUrls) {
      const timer = setTimeout(() => {
        if (selectedImageIndex < selectedItem.imageUrls!.length - 1) {
          setSelectedImageIndex(prev => prev + 1)
        } else {
          // Loop back to start or stop
          setSelectedImageIndex(0)
        }
      }, 3000) // 3 seconds per slide
      
      return () => clearTimeout(timer)
    }
  }, [isAutoPlaying, selectedImageIndex, selectedItem])

  if (!results) return null

  // Get all content bundles
  const allResults = Object.values(results).flat()
  const successfulResults = allResults.filter(r => !r.error && (r.imageUrls?.length > 0 || r.imageUrl))
  const failedResults = allResults.filter(r => r.error)

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      toast.success('Copied!')
      setTimeout(() => setCopiedId(null), 2000)
    } catch (err) {
      toast.error('Failed to copy')
    }
  }

  const downloadMedia = (url: string, filename: string) => {
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  // Story card component for content bundles
  const StoryCard = ({ item }: { item: BatchResult }) => {
    const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0)
    const isHovering = playingId === item.id
    const hasMultipleImages = item.imageUrls && item.imageUrls.length > 1
    
    // Extract hook text
    const lines = item.result?.split('\n').filter(l => l.trim()) || []
    const hookText = lines[0]?.replace(/^HOOK:\s*/i, '') || 'No hook'
    
    // Auto-cycle through images on hover
    React.useEffect(() => {
      if (isHovering && hasMultipleImages) {
        const interval = setInterval(() => {
          setCurrentPreviewIndex(prev => 
            prev < item.imageUrls!.length - 1 ? prev + 1 : 0
          )
        }, 800) // Change image every 800ms
        return () => clearInterval(interval)
      } else {
        setCurrentPreviewIndex(0)
      }
    }, [isHovering, hasMultipleImages, item.imageUrls])

    const displayUrl = hasMultipleImages 
      ? item.imageUrls![currentPreviewIndex]
      : item.imageUrl || item.videoUrl

    return (
      <div
        className={cn(
          'relative group cursor-pointer overflow-hidden rounded-xl bg-black',
          item.error && 'border-2 border-red-500'
        )}
        onClick={() => {
          setSelectedItem(item)
          setSelectedImageIndex(0)
        }}
        onMouseEnter={() => setPlayingId(item.id)}
        onMouseLeave={() => setPlayingId(null)}
      >
        {/* Story Preview Container */}
        <div className='aspect-[9/16] relative bg-gray-900'>
          {/* Media Display */}
          {displayUrl ? (
            <>
              {item.videoUrl ? (
                <video
                  src={displayUrl}
                  className='w-full h-full object-cover'
                  loop
                  muted
                  playsInline
                  autoPlay={isHovering}
                />
              ) : (
                <img
                  src={displayUrl}
                  alt='Story preview'
                  className='w-full h-full object-cover transition-opacity duration-300'
                />
              )}
              
              {/* Progress dots for multi-image stories */}
              {hasMultipleImages && (
                <div className='absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1 z-10'>
                  {item.imageUrls!.map((_, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        'w-1.5 h-1.5 rounded-full transition-all duration-300',
                        idx === currentPreviewIndex 
                          ? 'bg-white w-4' 
                          : 'bg-white/50'
                      )}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            !item.error && (
              <div className='absolute inset-0 flex items-center justify-center bg-gray-900'>
                <div className='text-center p-4'>
                  <AlertCircle className='h-8 w-8 text-gray-500 mx-auto mb-2' />
                  <p className='text-sm text-gray-400'>No media generated</p>
                </div>
              </div>
            )
          )}
          
          {/* Gradient overlay */}
          <div className='absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent' />
        </div>

        {/* Error State */}
        {item.error && (
          <div className='absolute inset-0 flex items-center justify-center bg-black/80'>
            <div className='text-center p-4'>
              <AlertCircle className='h-8 w-8 text-red-500 mx-auto mb-2' />
              <p className='text-sm text-red-400'>Generation Failed</p>
            </div>
          </div>
        )}

        {/* Story Info Overlay */}
        <div className='absolute bottom-0 left-0 right-0 p-4 z-20'>
          {/* Hook text */}
          <div className='text-white font-bold text-lg mb-2 drop-shadow-lg line-clamp-2'>
            {hookText.replace(/["']/g, '')}
          </div>
          
          {/* Story metadata */}
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <Badge 
                variant='secondary' 
                className='capitalize bg-black/50 text-white border-0'
              >
                {item.pipelineType}
              </Badge>
              {hasMultipleImages && (
                <span className='text-white/80 text-sm'>
                  {item.imageUrls!.length} slides
                </span>
              )}
            </div>
            
            {/* Play indicator */}
            <div className='bg-white/20 backdrop-blur-sm rounded-full p-2'>
              <Play className='h-4 w-4 text-white' fill='white' />
            </div>
          </div>
        </div>

        {/* Hover overlay with action */}
        <div className='absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-30'>
          <div className='text-center'>
            <div className='bg-white/20 backdrop-blur-sm rounded-full p-4 mb-2 mx-auto w-fit'>
              <Play className='h-8 w-8 text-white' fill='white' />
            </div>
            <p className='text-white font-medium'>View Story</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <style>{progressAnimation}</style>
      {/* Main Gallery Dialog */}
      <Dialog open={isOpen && !selectedItem} onOpenChange={onClose}>
        <DialogContent className='!max-w-7xl w-full h-[90vh] p-0 overflow-hidden sm:!max-w-7xl'>
          <DialogHeader className='p-6 pb-4'>
            <DialogTitle className='flex items-center justify-between'>
              <span>Generated Content</span>
              <div className='flex gap-2 text-sm'>
                <Badge variant='secondary' className='font-normal'>
                  {successfulResults.length} generated
                </Badge>
                {failedResults.length > 0 && (
                  <Badge variant='destructive' className='font-normal'>
                    {failedResults.length} failed
                  </Badge>
                )}
                <Button
                  size='sm'
                  variant='outline'
                  onClick={() => {
                    // Export all content as JSON
                    const exportData = {
                      timestamp: new Date().toISOString(),
                      content: allResults,
                    }
                    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `content-export-${new Date().toISOString().split('T')[0]}.json`
                    a.click()
                    URL.revokeObjectURL(url)
                    toast.success('Content exported!')
                  }}
                >
                  <Download className='mr-2 h-3 w-3' />
                  Export All
                </Button>
              </div>
            </DialogTitle>
            <DialogDescription className='sr-only'>
              View and download your generated TikTok content including text overlays, images, and videos
            </DialogDescription>
          </DialogHeader>

          <div className='px-6 pb-6 overflow-y-auto h-full'>
            {/* Story Grid */}
            <div className='grid grid-cols-2 lg:grid-cols-4 gap-6'>
              {successfulResults.map((item) => (
                <StoryCard key={item.id} item={item} />
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail View Dialog */}
      {selectedItem && (
        <Dialog open={!!selectedItem} onOpenChange={() => {
          setSelectedItem(null)
          setSelectedImageIndex(0)
          setIsAutoPlaying(false)
        }}>
          <DialogContent className='!max-w-4xl h-[90vh] p-0 sm:!max-w-4xl'>
            <DialogHeader className='sr-only'>
              <DialogTitle>Content Details</DialogTitle>
              <DialogDescription>
                Detailed view of generated content with download options
              </DialogDescription>
            </DialogHeader>
            <div className='flex h-full'>
              {/* Full Screen Story Viewer */}
              <div className='flex-1 bg-black relative flex items-center justify-center'>
                {selectedItem.videoUrl ? (
                  <video
                    src={selectedItem.videoUrl}
                    className='max-w-full max-h-full'
                    controls
                    autoPlay
                    loop
                  />
                ) : (selectedItem.imageUrls && selectedItem.imageUrls.length > 0) ? (
                  <>
                    {/* Image with text overlay */}
                    <div className='relative max-w-[400px] w-full aspect-[9/16]'>
                      <img
                        src={selectedItem.imageUrls[selectedImageIndex]}
                        alt='Generated content'
                        className='w-full h-full object-cover rounded-lg'
                      />
                      
                      {/* Text overlay on image */}
                      {selectedItem.result && (
                        <div className='absolute inset-0 flex items-center justify-center p-8'>
                          <div className='text-white text-center font-bold text-2xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] leading-tight'>
                            {(() => {
                              const lines = selectedItem.result.split('\n').filter(l => l.trim())
                              const currentLine = lines[selectedImageIndex]
                              return currentLine ? currentLine.replace(/^[A-Z\s\d]+:\s*/i, '').replace(/["']/g, '') : ''
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Navigation arrows for multiple images */}
                    {selectedItem.imageUrls.length > 1 && (
                      <>
                        <Button
                          className='absolute left-4 top-1/2 -translate-y-1/2'
                          size='icon'
                          variant='secondary'
                          onClick={() => setSelectedImageIndex(prev => 
                            prev > 0 ? prev - 1 : selectedItem.imageUrls!.length - 1
                          )}
                        >
                          <ChevronLeft className='h-4 w-4' />
                        </Button>
                        <Button
                          className='absolute right-4 top-1/2 -translate-y-1/2'
                          size='icon'
                          variant='secondary'
                          onClick={() => setSelectedImageIndex(prev => 
                            prev < selectedItem.imageUrls!.length - 1 ? prev + 1 : 0
                          )}
                        >
                          <ChevronRight className='h-4 w-4' />
                        </Button>
                        
                        {/* Reroll button for current image */}
                        <Button
                          className='absolute top-4 left-4'
                          size='icon'
                          variant='secondary'
                          onClick={async () => {
                            if (!selectedItem || !selectedItem.imageUrls) return
                            
                            const rerollKey = `${selectedItem.id}-${selectedImageIndex}`
                            setRerollingId(rerollKey)
                            
                            try {
                              // Call parent's reroll function
                              if (onRerollImage) {
                                await onRerollImage(selectedItem.id, selectedImageIndex)
                              }
                            } finally {
                              setRerollingId(null)
                            }
                          }}
                          disabled={rerollingId === `${selectedItem.id}-${selectedImageIndex}`}
                          title='Regenerate this image'
                        >
                          <RefreshCw 
                            className={cn(
                              'h-4 w-4',
                              rerollingId === `${selectedItem.id}-${selectedImageIndex}` && 'animate-spin'
                            )} 
                          />
                        </Button>
                        
                        {/* Progress bar and controls */}
                        <div className='absolute bottom-0 left-0 right-0 p-6'>
                          {/* Progress indicators */}
                          <div className='flex gap-1 mb-4'>
                            {selectedItem.imageUrls.map((_, idx) => (
                              <div
                                key={idx}
                                className='flex-1 h-1 bg-white/30 rounded-full overflow-hidden cursor-pointer'
                                onClick={() => setSelectedImageIndex(idx)}
                              >
                                <div
                                  className={cn(
                                    'h-full bg-white transition-all duration-300',
                                    idx < selectedImageIndex && 'w-full',
                                    idx === selectedImageIndex && isAutoPlaying && 'w-full animate-progress',
                                    idx === selectedImageIndex && !isAutoPlaying && 'w-full',
                                    idx > selectedImageIndex && 'w-0'
                                  )}
                                />
                              </div>
                            ))}
                          </div>
                          
                          {/* Playback controls */}
                          <div className='flex items-center justify-between'>
                            <Button
                              variant='ghost'
                              className='text-white hover:bg-white/20'
                              onClick={() => setSelectedImageIndex(prev => 
                                prev > 0 ? prev - 1 : selectedItem.imageUrls!.length - 1
                              )}
                            >
                              Previous
                            </Button>
                            
                            <Button
                              size='icon'
                              variant='ghost'
                              className='text-white hover:bg-white/20'
                              onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                            >
                              {isAutoPlaying ? <Pause className='h-5 w-5' /> : <Play className='h-5 w-5' />}
                            </Button>
                            
                            <Button
                              variant='ghost'
                              className='text-white hover:bg-white/20'
                              onClick={() => setSelectedImageIndex(prev => 
                                prev < selectedItem.imageUrls!.length - 1 ? prev + 1 : 0
                              )}
                            >
                              Next
                            </Button>
                          </div>
                        </div>
                      </>
                    )}
                  </>
                ) : selectedItem.imageUrl ? (
                  <img
                    src={selectedItem.imageUrl}
                    alt='Generated content'
                    className='max-w-full max-h-full object-contain'
                  />
                ) : (
                  <div className='text-white'>No media available</div>
                )}

                <Button
                  className='absolute top-4 right-4'
                  size='icon'
                  variant='ghost'
                  onClick={() => {
                    setSelectedItem(null)
                    setSelectedImageIndex(0)
                    setIsAutoPlaying(false)
                  }}
                >
                  <X className='h-4 w-4' />
                </Button>
              </div>

              {/* Details Panel */}
              <div className='w-96 p-6 overflow-y-auto bg-background'>
                <div className='space-y-4'>
                  <div>
                    <h3 className='font-semibold mb-2 capitalize'>
                      {selectedItem.pipelineType} Content
                    </h3>
                    <Badge variant='outline'>Variant {selectedItem.variant}</Badge>
                  </div>

                  {/* Generated Text */}
                  {selectedItem.result && (
                    <div className='space-y-2'>
                      <div className='flex items-center justify-between'>
                        <span className='text-sm font-medium'>
                          {selectedItem.imageUrls ? (
                            <>
                              Slide {selectedImageIndex + 1} of {selectedItem.imageUrls.length}
                            </>
                          ) : (
                            'Generated Text'
                          )}
                        </span>
                        <Button
                          size='sm'
                          variant='ghost'
                          onClick={() => {
                            if (selectedItem.imageUrls) {
                              // Copy just the current overlay text
                              const lines = selectedItem.result.split('\n').filter(l => l.trim())
                              const currentText = lines[selectedImageIndex] || ''
                              copyToClipboard(currentText, selectedItem.id)
                            } else {
                              copyToClipboard(selectedItem.result!, selectedItem.id)
                            }
                          }}
                        >
                          {copiedId === selectedItem.id ? 'Copied!' : <Copy className='h-4 w-4' />}
                        </Button>
                      </div>
                      <div className='bg-muted p-3 rounded-lg text-sm whitespace-pre-wrap'>
                        {selectedItem.imageUrls ? (
                          // Show just the current overlay text
                          (() => {
                            const lines = selectedItem.result.split('\n').filter(l => l.trim())
                            return lines[selectedImageIndex] || 'No text for this overlay'
                          })()
                        ) : (
                          // Show all text for single image
                          selectedItem.result
                        )}
                      </div>
                    </div>
                  )}

                  {/* Download Buttons */}
                  <div className='space-y-2'>
                    {selectedItem.videoUrl && (
                      <Button
                        className='w-full'
                        onClick={() => downloadMedia(
                          selectedItem.videoUrl!,
                          `${selectedItem.pipelineType}-${selectedItem.variant}.mp4`
                        )}
                      >
                        <Download className='mr-2 h-4 w-4' />
                        Download Video
                      </Button>
                    )}
                    {selectedItem.imageUrls && selectedItem.imageUrls.length > 0 && (
                      <>
                        <Button
                          className='w-full'
                          onClick={() => downloadMedia(
                            selectedItem.imageUrls![selectedImageIndex],
                            `${selectedItem.pipelineType}-${selectedItem.variant}-${selectedImageIndex + 1}.png`
                          )}
                        >
                          <Download className='mr-2 h-4 w-4' />
                          Download Current Image
                        </Button>
                        {selectedItem.imageUrls.length > 1 && (
                          <Button
                            className='w-full'
                            variant='outline'
                            onClick={() => {
                              // Download all images
                              selectedItem.imageUrls!.forEach((url, idx) => {
                                setTimeout(() => {
                                  downloadMedia(url, `${selectedItem.pipelineType}-${selectedItem.variant}-${idx + 1}.png`)
                                }, idx * 500) // Stagger downloads
                              })
                              toast.success(`Downloading ${selectedItem.imageUrls!.length} images...`)
                            }}
                          >
                            <Download className='mr-2 h-4 w-4' />
                            Download All {selectedItem.imageUrls.length} Images
                          </Button>
                        )}
                      </>
                    )}
                    {selectedItem.imageUrl && !selectedItem.videoUrl && !selectedItem.imageUrls && (
                      <Button
                        className='w-full'
                        onClick={() => downloadMedia(
                          selectedItem.imageUrl!,
                          `${selectedItem.pipelineType}-${selectedItem.variant}.png`
                        )}
                      >
                        <Download className='mr-2 h-4 w-4' />
                        Download Image
                      </Button>
                    )}
                  </div>

                  {/* Prompt Info */}
                  <div className='space-y-2'>
                    <span className='text-sm font-medium'>Prompt Used</span>
                    <div className='bg-muted/50 p-3 rounded-lg text-xs text-muted-foreground'>
                      {selectedItem.prompt}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}