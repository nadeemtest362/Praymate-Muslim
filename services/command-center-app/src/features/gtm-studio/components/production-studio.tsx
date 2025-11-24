import React, { useState, useEffect } from 'react'
import {
  Play,
  Loader2,
  CheckCircle2,
  Image,
  Video,
  Sparkles,
  ArrowRight,
  Grid3x3,
  Settings,
  Zap,
  Copy,
  Download,
  Trash2,
  RefreshCw,
  Plus,
  X,
  Wand2,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Upload,
  Link,
  GripVertical,
  PlusCircle,
  Users,
  Send,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  enhancePrompt,
  generatePromptVariations,
} from '../services/claude-service'
import { generateImage, generateVideo } from '../services/replicate-service'
import {
  generateSlideshowContent,
  generateImagePromptVariations,
  generateCaptionOverlay,
} from '../services/slideshow-service'
import {
  uploadGeneratedImage,
  uploadGeneratedVideo,
  productionSessionService,
} from '../services/supabase-service'
import { generateMultipleTikTokHooks } from '../services/tiktok-hook-service'
import { generateMultipleUGCTikTokHooks } from '../services/tiktok-hook-service-ugc-viral'
import {
  tiktokPortfolioService,
  type TikTokAccount,
} from '../services/tiktok-portfolio-service'
import { Workflow } from './workflow-builder'

interface ProductionStudioProps {
  workflow?: Workflow
  sessionId?: string | null
  onClose?: () => void
  workflowType?: 'jesus' | 'ugc' | 'slideshow' | 'ugc-slideshow' | '6-verses'
}

interface GeneratedAsset {
  id: string
  type: 'image' | 'video' | 'audio'
  url: string
  prompt: string
  selected: boolean
  status: 'pending' | 'generating' | 'completed' | 'failed'
  createdAt: Date
  metadata?: any
  childAssets?: GeneratedAsset[]
}

const IMAGE_GEN_URL =
  import.meta.env.VITE_IMAGE_GEN_URL ||
  'https://cc-image-gen-service-production.up.railway.app'

export function ProductionStudio({
  workflow,
  sessionId: providedSessionId,
  onClose,
  workflowType: initialWorkflowType = 'jesus',
}: ProductionStudioProps) {
  const [assets, setAssets] = useState<GeneratedAsset[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedCount, setSelectedCount] = useState(0)
  const [activeTab, setActiveTab] = useState('generate')

  // Generation settings
  const [prompt, setPrompt] = useState('')
  const [variations, setVariations] = useState(4)
  const [aspectRatio, setAspectRatio] = useState('9:16')
  const [model, setModel] = useState('black-forest-labs/flux-1.1-pro-ultra')
  const [videoModel, setVideoModel] = useState('pixverse/pixverse-v4.5')
  const [videoQuality, setVideoQuality] = useState('720p')
  const [videoDuration, setVideoDuration] = useState(5)

  // Session management
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sessionName, setSessionName] = useState('')
  const [recentSessions, setRecentSessions] = useState<any[]>([])
  const [isLoadingSession, setIsLoadingSession] = useState(false)

  // Video preview
  const [previewVideo, setPreviewVideo] = useState<string | null>(null)
  const [showOnlyWithVideos, setShowOnlyWithVideos] = useState(false)

  // TikTok hook generation
  const [selectedVideos, setSelectedVideos] = useState<Set<string>>(new Set())
  const [showHookDialog, setShowHookDialog] = useState(false)
  const [generatedHooks, setGeneratedHooks] = useState<{
    [videoId: string]: string
  }>({})
  const [isGeneratingHooks, setIsGeneratingHooks] = useState(false)
  const [isProcessingVideos, setIsProcessingVideos] = useState(false)

  // Track which video is currently shown for each asset
  const [currentVideoIndex, setCurrentVideoIndex] = useState<{
    [assetId: string]: number
  }>({})

  // Reroll dialog state
  const [rerollDialog, setRerollDialog] = useState<{
    open: boolean
    assetId: string
    childAssetId: string
    currentPrompt: string
    sourceImageUrl: string
  } | null>(null)
  const [rerollPrompt, setRerollPrompt] = useState('')
  const [isRerolling, setIsRerolling] = useState(false)

  // Prompt enhancement state
  const [isEnhancing, setIsEnhancing] = useState(false)
  const [isGeneratingVariations, setIsGeneratingVariations] = useState(false)
  const [promptVariations, setPromptVariations] = useState<string[]>([])
  const [showVariations, setShowVariations] = useState(false)

  // Store workflowType in state so it can be saved/restored with sessions
  const [workflowType, setWorkflowType] = useState<
    'jesus' | 'ugc' | 'slideshow' | 'ugc-slideshow' | '6-verses'
  >(initialWorkflowType)

  // Track if we've completed initial load to prevent auto-save during initialization
  const [hasInitialized, setHasInitialized] = useState(false)

  // Slideshow specific state
  const [slideshowContent, setSlideshowContent] = useState<any>(null)
  const [isGeneratingSlideshow, setIsGeneratingSlideshow] = useState(false)
  const [slideCount, setSlideCount] = useState(7)
  const [autoAddCaptions, setAutoAddCaptions] = useState(true) // Auto-caption by default
  const [currentSlideshowGroup, setCurrentSlideshowGroup] = useState<
    string | null
  >(null)

  // Session rename state
  const [isRenamingSession, setIsRenamingSession] = useState(false)
  const [tempSessionName, setTempSessionName] = useState('')

  // Slideshow preview state
  const [previewSlideshow, setPreviewSlideshow] = useState<string | null>(null)
  const [previewSlideIndex, setPreviewSlideIndex] = useState(0)

  // Caption editing state
  const [editingCaption, setEditingCaption] = useState<{
    assetId: string
    text: string
    slideNumber?: number
  } | null>(null)

  // Image prompt editing state
  const [editingPrompt, setEditingPrompt] = useState<{
    assetId: string
    prompt: string
    style?: string
  } | null>(null)

  // Drag and drop state
  const [draggedSlide, setDraggedSlide] = useState<string | null>(null)
  const [dragOverSlide, setDragOverSlide] = useState<string | null>(null)

  // TikTok portfolio state
  const [tiktokAccounts, setTiktokAccounts] = useState<TikTokAccount[]>([])
  const [showAssignDialog, setShowAssignDialog] = useState<{
    assetId: string
    assetType: string
    assetPrompt: string
  } | null>(null)

  // Initialize or load session
  useEffect(() => {
    const initSession = async () => {
      try {
        // If a specific session ID was provided (from clicking a session card), load it
        if (providedSessionId) {
          setIsLoadingSession(true)
          const session = await productionSessionService.get(providedSessionId)
          console.log(
            'Loading session:',
            session.id,
            'Assets count:',
            session.assets?.length
          )
          setSessionId(session.id)
          setSessionName(session.name)
          // Parse assets to ensure dates are Date objects
          const parsedAssets = (session.assets || []).map((asset: any) => ({
            ...asset,
            createdAt: asset.createdAt ? new Date(asset.createdAt) : new Date(),
            childAssets:
              asset.childAssets?.map((child: any) => ({
                ...child,
                createdAt: child.createdAt
                  ? new Date(child.createdAt)
                  : new Date(),
              })) || [],
            // Force slideshow images to be visible
            metadata: {
              ...asset.metadata,
              ...(asset.metadata?.slideshowGroup && {
                hideWithoutVideo: false,
              }),
            },
          }))
          console.log('Parsed assets:', parsedAssets.length)
          setAssets(parsedAssets)

          // Restore settings
          if (session.settings) {
            setPrompt(session.settings.prompt || '')
            setVariations(session.settings.variations || 4)
            setAspectRatio(session.settings.aspectRatio || '9:16')
            setModel(
              session.settings.model || 'black-forest-labs/flux-1.1-pro-ultra'
            )
            setVideoModel(
              session.settings.videoModel || 'pixverse/pixverse-v4.5'
            )
            setVideoQuality(session.settings.videoQuality || '720p')
            setVideoDuration(session.settings.videoDuration || 5)
            // Restore workflowType if it was saved
            if (session.settings.workflowType) {
              setWorkflowType(session.settings.workflowType)
            }
          }

          localStorage.setItem('lastProductionSessionId', session.id)
          toast.success('Session loaded')
        } else {
          // Always create a new session when no specific session is requested
          const newSession = await productionSessionService.create()
          setSessionId(newSession.id)
          setSessionName(newSession.name)
          localStorage.setItem('lastProductionSessionId', newSession.id)

          // Immediately save the workflowType for new sessions
          await productionSessionService.update(newSession.id, {
            settings: { workflowType },
          })
        }

        // Load recent sessions
        const recent = await productionSessionService.listRecent()
        setRecentSessions(recent)

        // Load TikTok accounts
        const accounts = await tiktokPortfolioService.listAccounts()
        setTiktokAccounts(accounts)
      } catch (error) {
        console.error('Failed to init session:', error)
        // Create a new session if loading fails
        try {
          const newSession = await productionSessionService.create()
          setSessionId(newSession.id)
          setSessionName(newSession.name)
          localStorage.setItem('lastProductionSessionId', newSession.id)
        } catch (createError) {
          console.error('Failed to create session:', createError)
          toast.error('Failed to initialize session')
        }
      } finally {
        setIsLoadingSession(false)
        // Mark as initialized after first load completes
        setHasInitialized(true)
      }
    }

    initSession()
  }, [providedSessionId])

  // Auto-save session when assets change
  useEffect(() => {
    if (!sessionId || isLoadingSession || !hasInitialized) return

    const saveSession = async () => {
      try {
        await productionSessionService.update(sessionId, {
          assets,
          settings: {
            prompt,
            variations,
            aspectRatio,
            model,
            videoModel,
            videoQuality,
            videoDuration,
            workflowType,
          },
        })
      } catch (error) {
        console.error('Failed to save session:', error)
        // Don't show error toast during auto-save to avoid disrupting user
      }
    }

    // Debounce saves
    const timer = setTimeout(saveSession, 1000)
    return () => {
      clearTimeout(timer)
    }
  }, [
    assets,
    sessionId,
    prompt,
    variations,
    aspectRatio,
    model,
    videoModel,
    videoQuality,
    videoDuration,
    workflowType,
    isLoadingSession,
  ])

  // Load TikTok accounts
  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const accounts = await tiktokPortfolioService.listAccounts()
        setTiktokAccounts(accounts)
      } catch (error) {
        console.error('Failed to load TikTok accounts:', error)
      }
    }
    loadAccounts()
  }, [])

  // Generate multiple image variations
  const generateImageVariations = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt')
      return
    }

    setIsGenerating(true)
    const newAssets: GeneratedAsset[] = []

    // Create placeholder assets
    for (let i = 0; i < variations; i++) {
      const asset: GeneratedAsset = {
        id: `img-${Date.now()}-${i}`,
        type: 'image',
        url: '',
        prompt: `${prompt} (variation ${i + 1})`,
        selected: false,
        status: 'pending',
        createdAt: new Date(),
        metadata: { aspectRatio, model },
      }
      newAssets.push(asset)
    }

    setAssets((prev) => [...prev, ...newAssets])
    setActiveTab('assets')

    // Generate images in parallel
    const generatePromises = newAssets.map(async (asset, index) => {
      try {
        // Mark as generating
        setAssets((prev) =>
          prev.map((a) =>
            a.id === asset.id ? { ...a, status: 'generating' } : a
          )
        )

        // Add subtle prompt variations for diversity without text
        const variations = [
          '', // First one uses exact prompt
          ', different angle',
          ', alternative composition',
          ', creative interpretation',
          ', unique perspective',
          ', artistic approach',
          ', fresh take',
          ', innovative style',
          ', dynamic view',
          ', original vision',
        ]
        const promptVariation = `${prompt}${variations[index] || ''}`

        // Set dimensions based on aspect ratio
        let width = 1024,
          height = 1024
        if (aspectRatio === '9:16') {
          width = 720
          height = 1280
        } else if (aspectRatio === '16:9') {
          width = 1280
          height = 720
        } else if (aspectRatio === '4:3') {
          width = 1024
          height = 768
        }

        const result = await generateImage(promptVariation, model, {
          width,
          height,
          num_outputs: 1,
        })

        // Upload to storage
        const uploadResult = await uploadGeneratedImage(result[0], {
          prompt: promptVariation,
          model,
          aspect_ratio: aspectRatio,
          production_batch: true,
        })

        // Update asset with result
        setAssets((prev) =>
          prev.map((a) =>
            a.id === asset.id
              ? {
                  ...a,
                  status: 'completed',
                  url: uploadResult.publicUrl,
                }
              : a
          )
        )
      } catch (error) {
        console.error(`Failed to generate image ${index + 1}:`, error)
        setAssets((prev) =>
          prev.map((a) => (a.id === asset.id ? { ...a, status: 'failed' } : a))
        )
      }
    })

    await Promise.allSettled(generatePromises)
    setIsGenerating(false)
    toast.success(`Generated ${variations} image variations!`)
  }

  // Generate slideshow with all slides
  const generateSlideshow = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a topic for your slideshow')
      return
    }

    setIsGeneratingSlideshow(true)
    try {
      // Auto-detect number from topic (e.g., "5 prayers" -> 7 slides total)
      const numberMatch = prompt.match(/(\d+)/)
      const detectedNumber = numberMatch ? parseInt(numberMatch[1]) : 5
      const autoSlideCount = detectedNumber + 2 // +1 for hook, +1 for CTA

      console.log(
        `📊 Auto-detected: ${detectedNumber} items → ${autoSlideCount} total slides`
      )

      // Step 1: Generate slideshow content (hook + slides)
      toast.info('Generating slideshow content...')
      const content = await generateSlideshowContent(
        prompt,
        autoSlideCount,
        workflowType === 'ugc-slideshow'
          ? 'ugc'
          : workflowType === '6-verses'
            ? '6-verses'
            : 'standard'
      )
      console.log(
        '🎬 FULL SLIDESHOW CONTENT:',
        JSON.stringify(content, null, 2)
      )
      setSlideshowContent(content)

      // Step 2: Create assets for each slide
      const newAssets: GeneratedAsset[] = []
      const slideshowGroupId = `slideshow-${Date.now()}`
      setCurrentSlideshowGroup(slideshowGroupId)

      for (let i = 0; i < content.slides.length; i++) {
        const slide = content.slides[i]
        console.log(`📝 Slide ${i + 1}:`, {
          text: slide.text,
          imagePrompt: slide.imagePrompt,
        })

        const asset: GeneratedAsset = {
          id: `slide-${Date.now()}-${i}`,
          type: 'image',
          url: '',
          prompt: slide.imagePrompt, // USE THE FUCKING IMAGE PROMPT FROM THE SLIDESHOW SERVICE
          selected: false,
          status: 'pending',
          createdAt: new Date(),
          metadata: {
            aspectRatio: '9:16',
            model,
            slideText: slide.text,
            slideNumber: i + 1,
            isHook: i === 0,
            theme: content.theme,
            style: content.style,
            slideshowGroup: slideshowGroupId,
            slideshowTopic: prompt, // Store the original topic
            hasCaptions: autoAddCaptions, // Use the auto-caption setting
          },
        }
        newAssets.push(asset)
      }

      setAssets((prev) => [...prev, ...newAssets])
      setActiveTab('assets')
      toast.success(`Created ${content.slides.length} slides!`)

      // Step 3: Generate images for each slide
      const generatePromises = newAssets.map(async (asset) => {
        try {
          setAssets((prev) =>
            prev.map((a) =>
              a.id === asset.id ? { ...a, status: 'generating' } : a
            )
          )

          // Generate the image with enhanced prompt based on workflow type
          const imagePrompt =
            workflowType === 'ugc-slideshow'
              ? `${asset.prompt}, ${asset.metadata.style || 'low quality photo, amateur photography'}`
              : workflowType === '6-verses'
                ? `${asset.prompt}, ${asset.metadata.style || 'Disney 2D animation style, hand drawn animation, classic Disney art style, traditional cel animation, Disney Renaissance era, painted backgrounds, expressive linework, vibrant colors, storybook illustration, NOT 3D, NOT Pixar, NOT CGI, no text, no words, no captions'}`
                : `${asset.prompt}, ${asset.metadata.style || 'tumblr aesthetic, film photography, disposable camera, high ISO grain'}`

          const result = await generateImage(imagePrompt, model, {
            width: 1080,
            height: 1920,
            num_outputs: 1,
          })

          if (result && result[0]) {
            // Upload to Supabase
            const uploadResult = await uploadGeneratedImage(result[0], {
              prompt: asset.prompt,
              aspectRatio: '9:16',
              model,
              metadata: asset.metadata,
            })

            // Update asset with URL
            setAssets((prev) =>
              prev.map((a) =>
                a.id === asset.id
                  ? {
                      ...a,
                      url: uploadResult.publicUrl,
                      status: 'completed',
                      metadata: { ...a.metadata, uploadId: uploadResult.id },
                    }
                  : a
              )
            )
          }
        } catch (error) {
          console.error(
            `Failed to generate slide ${asset.metadata.slideNumber}:`,
            error
          )
          setAssets((prev) =>
            prev.map((a) =>
              a.id === asset.id ? { ...a, status: 'failed' } : a
            )
          )
        }
      })

      await Promise.allSettled(generatePromises)
      toast.success('Slideshow generation complete!')
    } catch (error) {
      console.error('Failed to generate slideshow:', error)
      toast.error('Failed to generate slideshow')
    } finally {
      setIsGeneratingSlideshow(false)
    }
  }

  // Burn captions on slideshow images
  const burnCaptionsOnSlideshow = async () => {
    // Only affect images from the current slideshow group
    const slideshowAssets = assets.filter(
      (a) =>
        a.type === 'image' &&
        a.status === 'completed' &&
        a.metadata?.slideText &&
        !a.metadata?.hasCaptions &&
        a.metadata?.slideshowGroup === currentSlideshowGroup // Only current group
    )

    if (slideshowAssets.length === 0) {
      toast.error('No slideshow images found to process in current group')
      return
    }

    // Just mark the images as having captions - the UI will show the overlay
    setAssets((prev) =>
      prev.map((a) => {
        const shouldAddCaption = slideshowAssets.some((sa) => sa.id === a.id)
        if (shouldAddCaption) {
          return {
            ...a,
            metadata: {
              ...a.metadata,
              hasCaptions: true,
            },
          }
        }
        return a
      })
    )

    toast.success(`Captions added to ${slideshowAssets.length} slides!`)
  }

  // Generate videos from selected images
  const generateVideosFromSelected = async () => {
    const selectedImages = assets.filter(
      (a) => a.type === 'image' && a.selected && a.status === 'completed'
    )

    if (selectedImages.length === 0) {
      toast.error('Please select at least one image')
      return
    }

    setIsGenerating(true)

    // Create video assets
    const videoAssets: GeneratedAsset[] = selectedImages.map((img) => ({
      id: `vid-${Date.now()}-${img.id}`,
      type: 'video' as const,
      url: '',
      prompt: `Animate: ${img.prompt}`,
      selected: false,
      status: 'pending' as const,
      createdAt: new Date(),
      metadata: {
        sourceImage: img.url,
        // Preserve slideshow metadata if this is from a slideshow
        ...(img.metadata?.slideshowGroup && {
          slideshowGroup: img.metadata.slideshowGroup,
          slideText: img.metadata.slideText,
          slideNumber: img.metadata.slideNumber,
          isFromSlideshow: true,
        }),
      },
    }))

    // Add video assets to the list, deselect the images, and mark them as having video generation started
    selectedImages.forEach((img, index) => {
      setAssets((prev) =>
        prev.map((a) =>
          a.id === img.id
            ? {
                ...a,
                selected: false, // Deselect after video generation starts
                childAssets: [...(a.childAssets || []), videoAssets[index]],
              }
            : a
        )
      )
    })

    // Only hide unselected non-slideshow images that don't have videos
    setAssets((prev) =>
      prev.map((a) => {
        // If it's an image that wasn't selected and doesn't have child assets and isn't part of a slideshow
        if (
          a.type === 'image' &&
          !a.selected &&
          !a.childAssets?.length &&
          !a.metadata?.slideshowGroup
        ) {
          return { ...a, metadata: { ...a.metadata, hideWithoutVideo: true } }
        }
        // Make sure slideshow images are never hidden
        if (
          a.type === 'image' &&
          a.metadata?.slideshowGroup &&
          a.metadata?.hideWithoutVideo
        ) {
          return { ...a, metadata: { ...a.metadata, hideWithoutVideo: false } }
        }
        return a
      })
    )

    // Reset selected count
    setSelectedCount(0)

    // Generate videos in parallel
    const videoPromises = videoAssets.map(async (videoAsset, index) => {
      try {
        // Mark as generating
        setAssets((prev) =>
          prev.map((a) => ({
            ...a,
            childAssets: a.childAssets?.map((child) =>
              child.id === videoAsset.id
                ? { ...child, status: 'generating' }
                : child
            ),
          }))
        )

        const sourceImage = selectedImages[index]

        // Configure options based on selected model and workflow type
        const videoOptions: any = {
          prompt:
            workflowType === 'ugc'
              ? 'Selfie video, subtle handheld camera movement, natural smartphone recording feel, slight breathing motion'
              : 'Smooth cinematic motion, subtle animation, professional quality',
        }

        if (videoModel.includes('pixverse')) {
          videoOptions.quality = videoQuality
          videoOptions.duration = videoDuration
          videoOptions.aspect_ratio =
            aspectRatio === '9:16'
              ? '9:16'
              : aspectRatio === '16:9'
                ? '16:9'
                : '1:1'
          videoOptions.motion_mode = 'normal'
        } else if (videoModel.includes('wan-2.1')) {
          videoOptions.num_frames = 81
          videoOptions.fps = 16
        }

        const videoResult = await generateVideo(
          sourceImage.url,
          videoModel,
          videoOptions
        )

        // Upload video
        const uploadResult = await uploadGeneratedVideo(videoResult, {
          prompt: videoAsset.prompt,
          source_image_url: sourceImage.url,
          model: videoModel,
          production_batch: true,
        })

        // If this is a slideshow video with caption text, try to burn the caption onto it
        let captionBurnSuccess = false
        if (
          sourceImage.metadata?.slideshowGroup &&
          sourceImage.metadata?.slideText &&
          sourceImage.metadata?.hasCaptions
        ) {
          let attempts = 0
          const maxAttempts = 3

          while (attempts < maxAttempts && !captionBurnSuccess) {
            attempts++

            try {
              if (attempts > 1) {
                console.log(
                  `🔄 Retry attempt ${attempts} for slide ${sourceImage.metadata.slideNumber}`
                )
                // Wait longer between retries
                await new Promise((resolve) =>
                  setTimeout(resolve, 3000 * attempts)
                )
              }

              console.log('Burning slideshow caption:', {
                text: sourceImage.metadata.slideText,
                slideNumber: sourceImage.metadata.slideNumber,
                attempt: attempts,
              })

              // Ensure proper spacing in captions by replacing multiple newlines with space
              const cleanedCaption = sourceImage.metadata.slideText
                .replace(/\n\n+/g, ' ') // Replace double newlines with space
                .replace(/\n/g, ' ') // Replace single newlines with space
                .trim()

              const response = await fetch(
                `${IMAGE_GEN_URL}/api/video/add-caption`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    videoUrl: uploadResult.publicUrl,
                    caption: cleanedCaption,
                    style: 'tiktok',
                  }),
                }
              )

              if (response.ok) {
                const result = await response.json()
                uploadResult.publicUrl = result.processedVideoUrl
                captionBurnSuccess = true
                console.log(
                  `✅ Caption burned successfully - Slide ${sourceImage.metadata.slideNumber}: "${sourceImage.metadata.slideText}" (attempt ${attempts})`
                )
              } else {
                const errorText = await response.text()
                console.error(
                  `❌ Caption burn failed (attempt ${attempts}) - Slide ${sourceImage.metadata.slideNumber}:`,
                  errorText
                )

                // If it's the ffmpeg frame=0 error, retry
                if (
                  errorText.includes('frame=    0') &&
                  attempts < maxAttempts
                ) {
                  console.log('Retrying due to ffmpeg frame error...')
                }
              }
            } catch (error) {
              console.error(`Caption burn error (attempt ${attempts}):`, error)
            }
          }

          if (!captionBurnSuccess) {
            console.error(
              `❌ FAILED after ${attempts} attempts - Slide ${sourceImage.metadata.slideNumber}: "${sourceImage.metadata.slideText}"`
            )
          }
        }

        // Update video asset
        setAssets((prev) =>
          prev.map((a) => ({
            ...a,
            childAssets: a.childAssets?.map((child) =>
              child.id === videoAsset.id
                ? {
                    ...child,
                    status: 'completed',
                    url: uploadResult.publicUrl,
                    metadata: {
                      ...child.metadata,
                      // Mark if this video has slideshow captions burned in
                      ...(sourceImage.metadata?.slideshowGroup &&
                        sourceImage.metadata?.hasCaptions && {
                          hasSlideCaption: captionBurnSuccess,
                          attemptedSlideCaption: true,
                          captionText: sourceImage.metadata.slideText,
                          slideNumber: sourceImage.metadata.slideNumber,
                        }),
                    },
                  }
                : child
            ),
          }))
        )
      } catch (error) {
        console.error(`Failed to generate video for image ${index + 1}:`, error)
        setAssets((prev) =>
          prev.map((a) => ({
            ...a,
            childAssets: a.childAssets?.map((child) =>
              child.id === videoAsset.id
                ? { ...child, status: 'failed' }
                : child
            ),
          }))
        )
      }
    })

    const results = await Promise.allSettled(videoPromises)
    setIsGenerating(false)

    // Check if any slideshow videos failed caption burning
    const slideshowVideos = selectedImages.filter(
      (img) => img.metadata?.slideshowGroup && img.metadata?.hasCaptions
    )
    if (slideshowVideos.length > 0) {
      toast.warning(
        `Generated ${selectedImages.length} videos. Note: Slideshow captions may need to be added separately due to service limitations.`
      )
    } else {
      toast.success(`Generated ${selectedImages.length} videos!`)
    }
  }

  // Toggle asset selection
  const toggleAssetSelection = (assetId: string) => {
    setAssets((prev) =>
      prev.map((a) => {
        if (a.id === assetId) {
          const newSelected = !a.selected
          setSelectedCount((prev) => (newSelected ? prev + 1 : prev - 1))
          return { ...a, selected: newSelected }
        }
        return a
      })
    )
  }

  // Select all completed assets
  const selectAll = () => {
    const completedAssets = assets.filter((a) => a.status === 'completed')
    setAssets((prev) =>
      prev.map((a) => ({
        ...a,
        selected: a.status === 'completed',
      }))
    )
    setSelectedCount(completedAssets.length)
  }

  // Deselect all
  const deselectAll = () => {
    setAssets((prev) => prev.map((a) => ({ ...a, selected: false })))
    setSelectedCount(0)
  }

  // Switch to a different session
  const switchSession = async (newSessionId: string) => {
    try {
      setIsLoadingSession(true)
      const session = await productionSessionService.get(newSessionId)
      setSessionId(session.id)
      setSessionName(session.name)
      // Parse assets to ensure dates are Date objects
      const parsedAssets = (session.assets || []).map((asset: any) => ({
        ...asset,
        createdAt: asset.createdAt ? new Date(asset.createdAt) : new Date(),
        childAssets:
          asset.childAssets?.map((child: any) => ({
            ...child,
            createdAt: child.createdAt ? new Date(child.createdAt) : new Date(),
          })) || [],
      }))
      setAssets(parsedAssets)

      // Restore settings
      if (session.settings) {
        setPrompt(session.settings.prompt || '')
        setVariations(session.settings.variations || 4)
        setAspectRatio(session.settings.aspectRatio || '9:16')
        setModel(session.settings.model || 'google/imagen-4')
        setVideoModel(session.settings.videoModel || 'pixverse/pixverse-v4.5')
        setVideoQuality(session.settings.videoQuality || '720p')
        setVideoDuration(session.settings.videoDuration || 5)
        // Restore workflowType if it was saved
        if (session.settings.workflowType) {
          setWorkflowType(session.settings.workflowType)
        }
      }

      localStorage.setItem('lastProductionSessionId', session.id)
      toast.success('Session loaded')
    } catch (error) {
      console.error('Failed to load session:', error)
      toast.error('Failed to load session')
    } finally {
      setIsLoadingSession(false)
    }
  }

  // Create new session
  const createNewSession = async () => {
    try {
      const newSession = await productionSessionService.create()
      setSessionId(newSession.id)
      setSessionName(newSession.name)
      setAssets([])
      setPrompt('')
      localStorage.setItem('lastProductionSessionId', newSession.id)

      // Immediately save the workflowType for new sessions
      await productionSessionService.update(newSession.id, {
        settings: { workflowType },
      })

      // Reload recent sessions
      const recent = await productionSessionService.listRecent()
      setRecentSessions(recent)

      toast.success('New session created')
    } catch (error) {
      console.error('Failed to create session:', error)
      toast.error('Failed to create session')
    }
  }

  // Reorder slides within a slideshow group
  const reorderSlides = (
    groupId: string,
    fromIndex: number,
    toIndex: number
  ) => {
    setAssets((prev) => {
      const groupAssets = prev.filter(
        (a) => a.metadata?.slideshowGroup === groupId
      )
      const otherAssets = prev.filter(
        (a) => a.metadata?.slideshowGroup !== groupId
      )

      // Sort group assets by slide number
      const sortedGroupAssets = [...groupAssets].sort(
        (a, b) =>
          (a.metadata?.slideNumber || 0) - (b.metadata?.slideNumber || 0)
      )

      // Reorder the array
      const reordered = [...sortedGroupAssets]
      const [removed] = reordered.splice(fromIndex, 1)
      reordered.splice(toIndex, 0, removed)

      // Update slide numbers
      const updatedAssets = reordered.map((asset, index) => ({
        ...asset,
        metadata: {
          ...asset.metadata,
          slideNumber: index + 1,
          isHook: index === 0,
        },
      }))

      return [...otherAssets, ...updatedAssets]
    })
  }

  // Add a new slide to a slideshow group
  const addSlideToGroup = async (groupId: string, position: number) => {
    const groupAssets = assets.filter(
      (a) => a.metadata?.slideshowGroup === groupId
    )
    if (groupAssets.length === 0) return

    const firstAsset = groupAssets[0]
    const topic = firstAsset.metadata?.slideshowTopic || 'slideshow'

    // Create a new slide asset
    const newSlide: GeneratedAsset = {
      id: `slide-${Date.now()}`,
      type: 'image',
      url: '',
      prompt: `Additional slide for ${topic}`,
      selected: false,
      status: 'pending',
      createdAt: new Date(),
      metadata: {
        aspectRatio: '9:16',
        model,
        slideText: 'New slide\n\nAdd your content here',
        slideNumber: position + 1,
        isHook: false,
        theme: firstAsset.metadata?.theme,
        style: firstAsset.metadata?.style,
        slideshowGroup: groupId,
        slideshowTopic: topic,
        hasCaptions: firstAsset.metadata?.hasCaptions,
      },
    }

    // Update slide numbers for existing slides
    setAssets((prev) => {
      const groupAssets = prev.filter(
        (a) => a.metadata?.slideshowGroup === groupId
      )
      const otherAssets = prev.filter(
        (a) => a.metadata?.slideshowGroup !== groupId
      )

      const updatedGroupAssets = groupAssets.map((asset) => {
        if ((asset.metadata?.slideNumber || 0) > position) {
          return {
            ...asset,
            metadata: {
              ...asset.metadata,
              slideNumber: (asset.metadata?.slideNumber || 0) + 1,
            },
          }
        }
        return asset
      })

      return [...otherAssets, ...updatedGroupAssets, newSlide]
    })

    // Generate image for the new slide
    try {
      const imagePrompt =
        workflowType === 'ugc-slideshow'
          ? `tumblr aesthetic, grainy film photography, disposable camera flash, heavy ISO grain, 2010s tumblr`
          : `${firstAsset.metadata?.style || 'artistic'}`

      const result = await generateImage(imagePrompt, model, {
        width: 1080,
        height: 1920,
        num_outputs: 1,
      })

      if (result && result[0]) {
        const uploadResult = await uploadGeneratedImage(result[0], {
          prompt: imagePrompt,
          aspect_ratio: '9:16',
          model,
          production_batch: true,
          metadata: newSlide.metadata,
        })

        setAssets((prev) =>
          prev.map((a) =>
            a.id === newSlide.id
              ? { ...a, url: uploadResult.publicUrl, status: 'completed' }
              : a
          )
        )

        toast.success('New slide added!')
      }
    } catch (error) {
      console.error('Failed to generate image for new slide:', error)
      setAssets((prev) =>
        prev.map((a) => (a.id === newSlide.id ? { ...a, status: 'failed' } : a))
      )
      toast.error('Failed to generate image for new slide')
    }
  }

  // Enhance prompt using Claude
  const handleEnhancePrompt = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt to enhance')
      return
    }

    setIsEnhancing(true)
    try {
      const enhanced = await enhancePrompt(prompt, workflowType)
      setPrompt(enhanced)
      toast.success('Prompt enhanced!')
    } catch (error) {
      console.error('Failed to enhance prompt:', error)
      const message =
        error instanceof Error ? error.message : 'Failed to enhance prompt'
      toast.error(message)
    } finally {
      setIsEnhancing(false)
    }
  }

  // Generate prompt variations
  const handleGenerateVariations = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt to generate variations')
      return
    }

    setIsGeneratingVariations(true)
    try {
      const variations = await generatePromptVariations(prompt, workflowType)
      setPromptVariations(variations)
      setShowVariations(true)
      toast.success(`Generated ${variations.length} variations!`)
    } catch (error) {
      console.error('Failed to generate variations:', error)
      const message =
        error instanceof Error ? error.message : 'Failed to generate variations'
      toast.error(message)
    } finally {
      setIsGeneratingVariations(false)
    }
  }

  // Toggle video selection for TikTok hooks
  const toggleVideoSelection = (videoId: string) => {
    const newSelected = new Set(selectedVideos)
    if (newSelected.has(videoId)) {
      newSelected.delete(videoId)
    } else {
      newSelected.add(videoId)
    }
    setSelectedVideos(newSelected)
  }

  // Generate TikTok hooks for selected videos
  const generateTikTokHooks = async () => {
    if (selectedVideos.size === 0) {
      toast.error('Please select at least one video')
      return
    }

    setIsGeneratingHooks(true)

    try {
      // Get video contexts from assets
      const videoContexts = Array.from(selectedVideos).map((videoId) => {
        // Find the video in assets
        const asset = assets.find((a) =>
          a.childAssets?.some((child) => child.id === videoId)
        )
        const video = asset?.childAssets?.find((child) => child.id === videoId)

        return {
          id: videoId,
          context: video?.prompt || asset?.prompt || 'Disney animated video',
        }
      })

      const hooks =
        workflowType === 'ugc'
          ? await generateMultipleUGCTikTokHooks(videoContexts)
          : await generateMultipleTikTokHooks(videoContexts)
      setGeneratedHooks(hooks)
      setShowHookDialog(true)
    } catch (error) {
      console.error('Failed to generate hooks:', error)
      toast.error('Failed to generate TikTok hooks')
    } finally {
      setIsGeneratingHooks(false)
    }
  }

  // Process videos with captions
  const processVideosWithCaptions = async () => {
    setIsProcessingVideos(true)

    try {
      const processPromises = Array.from(selectedVideos).map(
        async (videoId) => {
          const asset = assets.find((a) =>
            a.childAssets?.some((child) => child.id === videoId)
          )
          const video = asset?.childAssets?.find(
            (child) => child.id === videoId
          )

          if (!video || !generatedHooks[videoId] || !asset) return

          // Call the video processing service
          const response = await fetch(
            `${IMAGE_GEN_URL}/api/video/add-caption`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                videoUrl: video.url,
                caption: generatedHooks[videoId],
                style: 'tiktok',
              }),
            }
          )

          if (!response.ok) {
            const errorText = await response.text()
            console.error('Video processing error:', response.status, errorText)
            throw new Error(
              `Failed to process video: ${response.status} - ${errorText}`
            )
          }

          const result = await response.json()

          // Create a new captioned video asset
          const captionedVideoAsset: GeneratedAsset = {
            id: `vid-captioned-${Date.now()}-${videoId}`,
            type: 'video',
            url: result.processedVideoUrl,
            prompt: `${video.prompt} [Captioned: ${generatedHooks[videoId]}]`,
            selected: false,
            status: 'completed',
            createdAt: new Date(),
            metadata: {
              isCaptioned: true,
              originalVideoId: videoId,
              caption: generatedHooks[videoId],
            },
          }

          // Add the captioned video as another child asset
          setAssets((prev) =>
            prev.map((a) => {
              if (a.id === asset.id) {
                return {
                  ...a,
                  childAssets: [...(a.childAssets || []), captionedVideoAsset],
                }
              }
              return a
            })
          )
        }
      )

      await Promise.all(processPromises)

      toast.success('Videos processed with captions!')
      setShowHookDialog(false)
      setSelectedVideos(new Set())
      setGeneratedHooks({})
    } catch (error) {
      console.error('Failed to process videos:', error)
      toast.error('Failed to process videos with captions')
    } finally {
      setIsProcessingVideos(false)
    }
  }

  // Reroll video with new prompt
  const rerollVideo = async () => {
    if (!rerollDialog) return

    setIsRerolling(true)

    try {
      // Create new video asset
      const newVideoAsset: GeneratedAsset = {
        id: `vid-reroll-${Date.now()}-${rerollDialog.assetId}`,
        type: 'video',
        url: '',
        prompt: rerollPrompt,
        selected: false,
        status: 'generating',
        createdAt: new Date(),
        metadata: { sourceImage: rerollDialog.sourceImageUrl, isReroll: true },
      }

      // Update the parent asset to replace the old video with the new one
      setAssets((prev) =>
        prev.map((a) => {
          if (a.id === rerollDialog.assetId) {
            return {
              ...a,
              childAssets: a.childAssets?.map((child) =>
                child.id === rerollDialog.childAssetId ? newVideoAsset : child
              ),
            }
          }
          return a
        })
      )

      // Close dialog
      setRerollDialog(null)
      setRerollPrompt('')

      // Generate the video
      const videoOptions: any = {
        prompt: rerollPrompt,
      }

      if (videoModel.includes('pixverse')) {
        videoOptions.quality = videoQuality
        videoOptions.duration = videoDuration
        videoOptions.aspect_ratio =
          aspectRatio === '9:16'
            ? '9:16'
            : aspectRatio === '16:9'
              ? '16:9'
              : '1:1'
        videoOptions.motion_mode = 'normal'
      } else if (videoModel.includes('wan-2.1')) {
        videoOptions.num_frames = 81
        videoOptions.fps = 16
      }

      const videoResult = await generateVideo(
        rerollDialog.sourceImageUrl,
        videoModel,
        videoOptions
      )

      // Upload video
      const uploadResult = await uploadGeneratedVideo(videoResult, {
        prompt: rerollPrompt,
        source_image_url: rerollDialog.sourceImageUrl,
        model: videoModel,
        production_batch: true,
      })

      // Update with completed video
      setAssets((prev) =>
        prev.map((a) => {
          if (a.id === rerollDialog.assetId) {
            return {
              ...a,
              childAssets: a.childAssets?.map((child) =>
                child.id === newVideoAsset.id
                  ? {
                      ...child,
                      status: 'completed',
                      url: uploadResult.publicUrl,
                    }
                  : child
              ),
            }
          }
          return a
        })
      )

      toast.success('Video rerolled successfully!')
    } catch (error) {
      console.error('Failed to reroll video:', error)
      toast.error('Failed to reroll video')

      // Mark as failed
      setAssets((prev) =>
        prev.map((a) => {
          if (a.id === rerollDialog.assetId) {
            return {
              ...a,
              childAssets: a.childAssets?.map((child) => {
                if (child.metadata?.isReroll && child.status === 'generating') {
                  return { ...child, status: 'failed' }
                }
                return child
              }),
            }
          }
          return a
        })
      )
    } finally {
      setIsRerolling(false)
    }
  }

  const handleAssignToTikTok = async (accountId: string) => {
    if (!showAssignDialog || !sessionId) return

    try {
      const asset = assets.find((a) => a.id === showAssignDialog.assetId)
      if (!asset) return

      await tiktokPortfolioService.assignContent(
        sessionId,
        asset.id,
        asset.url,
        asset.type,
        accountId,
        asset.metadata?.slideText || asset.metadata?.caption || asset.prompt,
        workflowType
      )

      toast.success('Content assigned to TikTok account!')
      setShowAssignDialog(null)
    } catch (error) {
      console.error('Failed to assign content:', error)
      toast.error('Failed to assign content')
    }
  }

  return (
    <div className='flex h-full flex-col overflow-hidden'>
      <div className='flex flex-shrink-0 items-center justify-between border-b p-4'>
        <div className='flex items-center gap-4'>
          <div>
            <h2 className='flex items-center gap-2 text-xl font-semibold'>
              <Zap className='h-5 w-5' />
              Production Studio{' '}
              {workflowType === 'slideshow'
                ? '(Slideshow)'
                : workflowType === 'ugc-slideshow'
                  ? '(UGC Slideshow)'
                  : workflowType === 'ugc'
                    ? '(UGC)'
                    : '(Jesus)'}
            </h2>
            <div className='flex items-center gap-2'>
              {isRenamingSession ? (
                <div className='flex items-center gap-2'>
                  <Input
                    value={tempSessionName}
                    onChange={(e) => setTempSessionName(e.target.value)}
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter') {
                        if (tempSessionName.trim() && sessionId) {
                          await productionSessionService.update(sessionId, {
                            name: tempSessionName.trim(),
                          })
                          setSessionName(tempSessionName.trim())
                          setIsRenamingSession(false)
                          // Update the session in recent sessions list
                          setRecentSessions((prev) =>
                            prev.map((s) =>
                              s.id === sessionId
                                ? { ...s, name: tempSessionName.trim() }
                                : s
                            )
                          )
                          toast.success('Session renamed')
                        }
                      } else if (e.key === 'Escape') {
                        setIsRenamingSession(false)
                        setTempSessionName(sessionName)
                      }
                    }}
                    className='h-7 w-64 text-sm'
                    autoFocus
                  />
                  <Button
                    size='sm'
                    variant='ghost'
                    className='h-7 w-7 p-0'
                    onClick={async () => {
                      if (tempSessionName.trim() && sessionId) {
                        await productionSessionService.update(sessionId, {
                          name: tempSessionName.trim(),
                        })
                        setSessionName(tempSessionName.trim())
                        setIsRenamingSession(false)
                        // Update the session in recent sessions list
                        setRecentSessions((prev) =>
                          prev.map((s) =>
                            s.id === sessionId
                              ? { ...s, name: tempSessionName.trim() }
                              : s
                          )
                        )
                        toast.success('Session renamed')
                      }
                    }}
                  >
                    <CheckCircle2 className='h-4 w-4' />
                  </Button>
                  <Button
                    size='sm'
                    variant='ghost'
                    className='h-7 w-7 p-0'
                    onClick={() => {
                      setIsRenamingSession(false)
                      setTempSessionName(sessionName)
                    }}
                  >
                    <X className='h-4 w-4' />
                  </Button>
                </div>
              ) : (
                <div className='group flex items-center gap-1'>
                  <p className='text-muted-foreground text-sm'>{sessionName}</p>
                  <Button
                    size='sm'
                    variant='ghost'
                    className='h-6 w-6 p-0 opacity-0 transition-opacity group-hover:opacity-100'
                    onClick={() => {
                      setTempSessionName(sessionName)
                      setIsRenamingSession(true)
                    }}
                  >
                    <Pencil className='h-3 w-3' />
                  </Button>
                </div>
              )}
            </div>
          </div>
          {sessionId && (
            <div className='flex items-center gap-2'>
              <select
                className='rounded-md border px-2 py-1 text-sm'
                value={sessionId}
                onChange={(e) => switchSession(e.target.value)}
              >
                <option value={sessionId}>{sessionName}</option>
                {recentSessions
                  .filter((s) => s.id !== sessionId)
                  .map((session) => (
                    <option key={session.id} value={session.id}>
                      {session.name} (
                      {new Date(session.updated_at).toLocaleDateString()})
                    </option>
                  ))}
              </select>
              {/* Workflow type selector */}
              <select
                className='rounded-md border px-2 py-1 text-sm font-medium'
                value={workflowType}
                onChange={async (e) => {
                  const newType = e.target.value as
                    | 'jesus'
                    | 'ugc'
                    | 'slideshow'
                    | 'ugc-slideshow'
                    | '6-verses'
                  setWorkflowType(newType)
                  if (sessionId) {
                    // Force an immediate save with the new workflow type
                    await productionSessionService.update(sessionId, {
                      settings: {
                        prompt,
                        variations,
                        aspectRatio,
                        model,
                        videoModel,
                        videoQuality,
                        videoDuration,
                        workflowType: newType,
                      },
                    })
                    const workflowName =
                      newType === 'slideshow'
                        ? 'Slideshow'
                        : newType === 'ugc'
                          ? 'UGC'
                          : newType === 'ugc-slideshow'
                            ? 'UGC Slideshow'
                            : newType === '6-verses'
                              ? '6 Verses'
                              : 'Jesus'
                    toast.success(`Changed to ${workflowName} workflow`)
                  }
                }}
              >
                <option value='jesus'>Jesus</option>
                <option value='ugc'>UGC</option>
                <option value='slideshow'>Slideshow</option>
                <option value='ugc-slideshow'>UGC Slideshow</option>
                <option value='6-verses'>6 Verses</option>
              </select>
              <Button size='sm' variant='outline' onClick={createNewSession}>
                <Plus className='mr-1 h-3.5 w-3.5' />
                New Session
              </Button>
            </div>
          )}
        </div>
        <div className='flex items-center gap-2'>
          {selectedCount > 0 && (
            <Badge variant='secondary'>{selectedCount} selected</Badge>
          )}
          <Button variant='outline' size='sm' onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className='flex flex-1 flex-col overflow-hidden'
      >
        <TabsList className='mx-4 mt-4 flex-shrink-0'>
          <TabsTrigger value='generate'>Generate</TabsTrigger>
          <TabsTrigger value='assets'>
            Assets {assets.length > 0 && `(${assets.length})`}
          </TabsTrigger>
          <TabsTrigger value='queue'>Queue</TabsTrigger>
        </TabsList>

        <TabsContent value='generate' className='flex-1 overflow-auto p-4'>
          <div className='flex gap-6'>
            <div className='max-w-2xl flex-1 space-y-6'>
              <div>
                <div className='mb-4 flex items-center justify-between'>
                  <h3 className='text-lg font-semibold'>
                    What do you want to create?
                  </h3>
                  <div className='flex gap-2'>
                    <Button
                      size='sm'
                      variant='outline'
                      onClick={handleEnhancePrompt}
                      disabled={isEnhancing || !prompt.trim()}
                    >
                      {isEnhancing ? (
                        <Loader2 className='h-4 w-4 animate-spin' />
                      ) : (
                        <Sparkles className='h-4 w-4' />
                      )}
                      <span className='ml-1'>Enhance</span>
                    </Button>
                    <Button
                      size='sm'
                      variant='outline'
                      onClick={handleGenerateVariations}
                      disabled={isGeneratingVariations || !prompt.trim()}
                    >
                      {isGeneratingVariations ? (
                        <Loader2 className='h-4 w-4 animate-spin' />
                      ) : (
                        <Grid3x3 className='h-4 w-4' />
                      )}
                      <span className='ml-1'>Variations</span>
                    </Button>
                  </div>
                </div>
                <Textarea
                  placeholder={
                    workflowType === 'slideshow'
                      ? "Enter slideshow topic (e.g., '5 Bible verses for anxiety', 'How prayer changed my life')"
                      : workflowType === 'ugc-slideshow'
                        ? "Enter daily spiritual practice topic (e.g., '3 things I do each day that bring me closer to God')"
                        : workflowType === '6-verses'
                          ? "Enter emotional state (e.g., 'feeling forgotten', 'anxious', 'questioning God's love')"
                          : 'Describe your vision...'
                  }
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className='min-h-[100px]'
                />
              </div>

              <div className='grid grid-cols-2 gap-6'>
                {/* Image Settings */}
                <Card>
                  <CardHeader className='pb-3'>
                    <CardTitle className='flex items-center gap-2 text-base'>
                      <Image className='h-4 w-4' />
                      Image Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className='space-y-3'>
                    {workflowType === 'slideshow' ||
                    workflowType === 'ugc-slideshow' ||
                    workflowType === '6-verses' ? (
                      <div className='space-y-3'>
                        <div>
                          <Label className='text-xs'>Slide Count</Label>
                          <p className='text-muted-foreground mt-1 text-sm'>
                            Auto-detected from your topic
                          </p>
                          <p className='text-muted-foreground text-xs'>
                            "5 prayers" → 7 slides total
                          </p>
                        </div>
                        <div className='flex items-center gap-2'>
                          <Checkbox
                            id='auto-captions'
                            checked={autoAddCaptions}
                            onCheckedChange={(checked) =>
                              setAutoAddCaptions(!!checked)
                            }
                          />
                          <Label
                            htmlFor='auto-captions'
                            className='cursor-pointer text-xs'
                          >
                            Auto-add captions to slides
                          </Label>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <Label className='text-xs'>Variations</Label>
                        <Input
                          type='number'
                          min={1}
                          max={10}
                          value={variations}
                          onChange={(e) =>
                            setVariations(parseInt(e.target.value) || 1)
                          }
                          className='mt-1'
                        />
                      </div>
                    )}
                    <div>
                      <Label className='text-xs'>Aspect Ratio</Label>
                      <select
                        className='mt-1 w-full rounded-md border p-2 text-sm'
                        value={aspectRatio}
                        onChange={(e) => setAspectRatio(e.target.value)}
                      >
                        <option value='9:16'>9:16 (Portrait)</option>
                        <option value='1:1'>1:1 (Square)</option>
                        <option value='16:9'>16:9 (Landscape)</option>
                        <option value='4:3'>4:3 (Standard)</option>
                      </select>
                    </div>
                    <div>
                      <Label className='text-xs'>Model</Label>
                      <select
                        className='mt-1 w-full rounded-md border p-2 text-sm'
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                      >
                        <option value='black-forest-labs/flux-1.1-pro-ultra'>
                          FLUX 1.1 Pro Ultra (4MP)
                        </option>
                        <option value='google/imagen-4'>Imagen 4</option>
                        <option value='black-forest-labs/flux-schnell:5599ed30703defd1d160a25a63321b4dec97101d98b4674bcc56e41f62f35637'>
                          FLUX Schnell
                        </option>
                        <option value='stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b'>
                          SDXL
                        </option>
                      </select>
                    </div>
                  </CardContent>
                </Card>

                {/* Video Settings */}
                <Card>
                  <CardHeader className='pb-3'>
                    <CardTitle className='flex items-center gap-2 text-base'>
                      <Video className='h-4 w-4' />
                      Video Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className='space-y-3'>
                    <div>
                      <Label className='text-xs'>Model</Label>
                      <select
                        className='mt-1 w-full rounded-md border p-2 text-sm'
                        value={videoModel}
                        onChange={(e) => setVideoModel(e.target.value)}
                      >
                        <option value='pixverse/pixverse-v4.5'>
                          PixVerse (Fast)
                        </option>
                        <option value='wavespeedai/wan-2.1-i2v-720p'>
                          Wan 2.1
                        </option>
                      </select>
                    </div>
                    {videoModel.includes('pixverse') && (
                      <>
                        <div>
                          <Label className='text-xs'>Quality</Label>
                          <select
                            className='mt-1 w-full rounded-md border p-2 text-sm'
                            value={videoQuality}
                            onChange={(e) => setVideoQuality(e.target.value)}
                          >
                            <option value='540p'>540p ($0.30)</option>
                            <option value='720p'>720p ($0.40)</option>
                            <option value='1080p'>1080p ($0.80)</option>
                          </select>
                        </div>
                        <div>
                          <Label className='text-xs'>Duration</Label>
                          <select
                            className='mt-1 w-full rounded-md border p-2 text-sm'
                            value={videoDuration}
                            onChange={(e) =>
                              setVideoDuration(parseInt(e.target.value))
                            }
                          >
                            <option value='5'>5 seconds</option>
                            {videoQuality !== '1080p' && (
                              <option value='8'>8 seconds</option>
                            )}
                          </select>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Button
                onClick={
                  workflowType === 'slideshow' ||
                  workflowType === 'ugc-slideshow' ||
                  workflowType === '6-verses'
                    ? generateSlideshow
                    : generateImageVariations
                }
                disabled={
                  (workflowType === 'slideshow' ||
                  workflowType === 'ugc-slideshow' ||
                  workflowType === '6-verses'
                    ? isGeneratingSlideshow
                    : isGenerating) || !prompt.trim()
                }
                className='w-full'
                size='lg'
              >
                {(
                  workflowType === 'slideshow' ||
                  workflowType === 'ugc-slideshow' ||
                  workflowType === '6-verses'
                    ? isGeneratingSlideshow
                    : isGenerating
                ) ? (
                  <>
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    {workflowType === 'slideshow' ||
                    workflowType === 'ugc-slideshow' ||
                    workflowType === '6-verses'
                      ? `Generating ${slideCount} slide slideshow...`
                      : `Generating ${variations} images...`}
                  </>
                ) : (
                  <>
                    <Sparkles className='mr-2 h-4 w-4' />
                    {workflowType === 'slideshow' ||
                    workflowType === 'ugc-slideshow' ||
                    workflowType === '6-verses'
                      ? `Generate Slideshow`
                      : `Generate ${variations} Images`}
                  </>
                )}
              </Button>
            </div>

            {/* Variations Panel */}
            {showVariations && promptVariations.length > 0 && (
              <div className='w-80 space-y-4'>
                <div className='flex items-center justify-between'>
                  <h4 className='font-semibold'>Prompt Variations</h4>
                  <Button
                    size='sm'
                    variant='ghost'
                    onClick={() => setShowVariations(false)}
                  >
                    <X className='h-4 w-4' />
                  </Button>
                </div>
                <div className='space-y-2'>
                  {promptVariations.map((variation, index) => (
                    <Card
                      key={index}
                      className='hover:bg-accent cursor-pointer p-3 transition-colors'
                      onClick={() => {
                        setPrompt(variation)
                        toast.success('Variation selected!')
                      }}
                    >
                      <p className='line-clamp-3 text-sm'>{variation}</p>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value='assets' className='flex-1 overflow-hidden p-4'>
          {assets.length === 0 ? (
            <Card className='border-dashed'>
              <CardContent className='p-8 text-center'>
                <Image className='text-muted-foreground/50 mx-auto mb-4 h-12 w-12' />
                <h3 className='mb-2 font-semibold'>No Assets Yet</h3>
                <p className='text-muted-foreground mb-4 text-sm'>
                  Generate some images to get started
                </p>
                <Button
                  variant='outline'
                  onClick={() => setActiveTab('generate')}
                >
                  Go to Generate
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className='flex h-full flex-col gap-4'>
              <div className='flex flex-shrink-0 items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <Button variant='outline' size='sm' onClick={selectAll}>
                    Select All
                  </Button>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={deselectAll}
                    disabled={selectedCount === 0}
                  >
                    Deselect All
                  </Button>
                  {assets.some(
                    (a) => a.childAssets && a.childAssets.length > 0
                  ) && (
                    <div className='ml-4 flex items-center gap-2'>
                      <Checkbox
                        id='show-videos-only'
                        checked={showOnlyWithVideos}
                        onCheckedChange={(checked) =>
                          setShowOnlyWithVideos(!!checked)
                        }
                      />
                      <label
                        htmlFor='show-videos-only'
                        className='cursor-pointer text-sm'
                      >
                        Show only with videos (keeps slideshows)
                      </label>
                    </div>
                  )}
                </div>
                <div className='flex items-center gap-2'>
                  {assets.some(
                    (a) => a.childAssets && a.childAssets.length > 0
                  ) && (
                    <>
                      <Badge variant='secondary' className='text-xs'>
                        {
                          assets.filter(
                            (a) => a.childAssets && a.childAssets.length > 0
                          ).length
                        }{' '}
                        videos
                      </Badge>
                      {selectedVideos.size > 0 && (
                        <Badge variant='primary' className='text-xs'>
                          {selectedVideos.size} videos selected
                        </Badge>
                      )}
                    </>
                  )}
                  {/* Show caption burning button for slideshows */}
                  {workflowType === 'slideshow' && currentSlideshowGroup && (
                    <>
                      {assets.some(
                        (a) =>
                          a.metadata?.slideText &&
                          !a.metadata?.hasCaptions &&
                          a.metadata?.slideshowGroup === currentSlideshowGroup
                      ) && (
                        <Button
                          size='sm'
                          variant='secondary'
                          onClick={burnCaptionsOnSlideshow}
                          disabled={isGenerating}
                        >
                          {isGenerating ? (
                            <Loader2 className='mr-1.5 h-4 w-4 animate-spin' />
                          ) : (
                            <Pencil className='mr-1.5 h-4 w-4' />
                          )}
                          Add Captions to Current Slideshow
                        </Button>
                      )}
                    </>
                  )}

                  {selectedVideos.size > 0 ? (
                    <Button
                      size='sm'
                      onClick={generateTikTokHooks}
                      disabled={isGeneratingHooks}
                    >
                      {isGeneratingHooks ? (
                        <Loader2 className='mr-1.5 h-4 w-4 animate-spin' />
                      ) : (
                        <Sparkles className='mr-1.5 h-4 w-4' />
                      )}
                      Generate TikTok Hooks ({selectedVideos.size})
                    </Button>
                  ) : (
                    <>
                      <Button
                        size='sm'
                        disabled={selectedCount === 0 || isGenerating}
                        onClick={generateVideosFromSelected}
                      >
                        <Video className='mr-1.5 h-4 w-4' />
                        Generate Videos ({selectedCount})
                      </Button>
                      {tiktokAccounts.length > 0 && selectedCount > 0 && (
                        <Button
                          size='sm'
                          variant='outline'
                          onClick={() => {
                            const selectedAsset = assets.find((a) => a.selected)
                            if (selectedAsset) {
                              setShowAssignDialog({
                                assetId: selectedAsset.id,
                                assetType: selectedAsset.type,
                                assetPrompt:
                                  selectedAsset.metadata?.slideText ||
                                  selectedAsset.prompt,
                              })
                            }
                          }}
                        >
                          <Send className='mr-1.5 h-4 w-4' />
                          Assign to TikTok
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className='flex-1 space-y-6 overflow-auto'>
                {/* Group assets by slideshow */}
                {(() => {
                  const imageAssets = assets
                    .filter((a) => a.type === 'image')
                    .filter((a) => a.status !== 'failed')
                    .filter((a) => !a.metadata?.hideWithoutVideo)
                    .filter((a) => {
                      // When "Show only with videos" is checked
                      if (showOnlyWithVideos) {
                        // Always show slideshow images (they're meant to be viewed with captions)
                        if (a.metadata?.slideshowGroup) {
                          return true
                        }
                        // For non-slideshow images, only show if they have videos
                        return a.childAssets && a.childAssets.length > 0
                      }
                      // When not filtered, show all
                      return true
                    })

                  // Group by slideshow
                  const groups = imageAssets.reduce(
                    (acc, asset) => {
                      const groupId =
                        asset.metadata?.slideshowGroup || 'ungrouped'
                      if (!acc[groupId]) acc[groupId] = []
                      acc[groupId].push(asset)
                      return acc
                    },
                    {} as Record<string, typeof imageAssets>
                  )

                  // Sort groups by timestamp (newest first)
                  const sortedGroups = Object.entries(groups).sort(
                    ([aId], [bId]) => {
                      // Extract timestamps from group IDs (format: slideshow-TIMESTAMP)
                      const aTimestamp = aId.includes('slideshow-')
                        ? parseInt(aId.split('-')[1])
                        : 0
                      const bTimestamp = bId.includes('slideshow-')
                        ? parseInt(bId.split('-')[1])
                        : 0
                      return bTimestamp - aTimestamp // Descending order (newest first)
                    }
                  )

                  return sortedGroups.map(([groupId, groupAssets]) => (
                    <div key={groupId} className='space-y-2'>
                      {groupId !== 'ungrouped' && (
                        <div className='mb-2 flex items-center justify-between'>
                          <div className='flex items-center gap-2'>
                            <h3 className='text-base font-semibold'>
                              {groupAssets[0]?.metadata?.slideshowTopic ||
                                `Slideshow ${groupId.split('-').pop()?.slice(0, 6) || ''}`}
                            </h3>
                            {groupId === currentSlideshowGroup && (
                              <Badge
                                variant='default'
                                className='bg-purple-500'
                              >
                                Current
                              </Badge>
                            )}
                            <Badge variant='outline' className='text-xs'>
                              {groupAssets.length} slides
                            </Badge>
                            {groupAssets[0]?.metadata?.hasCaptions && (
                              <Badge variant='secondary' className='text-xs'>
                                Captioned
                              </Badge>
                            )}
                          </div>
                          {groupAssets[0]?.metadata?.hasCaptions && (
                            <Button
                              size='sm'
                              variant='outline'
                              onClick={() => {
                                setPreviewSlideshow(groupId)
                                setPreviewSlideIndex(0)
                              }}
                            >
                              <Play className='mr-1 h-3 w-3' />
                              Preview
                            </Button>
                          )}
                        </div>
                      )}
                      <div className='grid grid-cols-3 gap-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'>
                        {groupAssets
                          .sort(
                            (a, b) =>
                              (a.metadata?.slideNumber || 0) -
                              (b.metadata?.slideNumber || 0)
                          )
                          .map((asset, index) => (
                            <Card
                              key={asset.id}
                              draggable={
                                asset.metadata?.slideshowGroup ? true : false
                              }
                              onDragStart={(e) => {
                                e.stopPropagation()
                                if (asset.metadata?.slideshowGroup) {
                                  setDraggedSlide(asset.id)
                                  e.dataTransfer.effectAllowed = 'move'
                                }
                              }}
                              onDragEnd={() => {
                                setDraggedSlide(null)
                                setDragOverSlide(null)
                              }}
                              onDragOver={(e) => {
                                if (
                                  asset.metadata?.slideshowGroup &&
                                  draggedSlide
                                ) {
                                  e.preventDefault()
                                  setDragOverSlide(asset.id)
                                }
                              }}
                              onDragLeave={() => {
                                setDragOverSlide(null)
                              }}
                              onDrop={(e) => {
                                e.preventDefault()
                                if (
                                  draggedSlide &&
                                  asset.metadata?.slideshowGroup
                                ) {
                                  const draggedAsset = assets.find(
                                    (a) => a.id === draggedSlide
                                  )
                                  if (
                                    draggedAsset?.metadata?.slideshowGroup ===
                                    asset.metadata.slideshowGroup
                                  ) {
                                    const fromIndex =
                                      (draggedAsset.metadata?.slideNumber ||
                                        1) - 1
                                    const toIndex =
                                      (asset.metadata?.slideNumber || 1) - 1
                                    reorderSlides(
                                      asset.metadata.slideshowGroup,
                                      fromIndex,
                                      toIndex
                                    )
                                  }
                                }
                                setDraggedSlide(null)
                                setDragOverSlide(null)
                              }}
                              className={cn(
                                'relative overflow-hidden transition-all',
                                asset.selected && 'ring-primary ring-2',
                                asset.childAssets &&
                                  asset.childAssets.length > 0
                                  ? ''
                                  : 'cursor-pointer',
                                // Highlight current slideshow group
                                asset.metadata?.slideshowGroup ===
                                  currentSlideshowGroup &&
                                  'ring-2 ring-purple-500',
                                // Drag and drop styling
                                draggedSlide === asset.id && 'opacity-50',
                                dragOverSlide === asset.id &&
                                  'ring-2 ring-blue-500',
                                // Preview cursor for slideshow images
                                asset.metadata?.slideshowGroup &&
                                  asset.metadata?.hasCaptions &&
                                  'cursor-pointer hover:ring-2 hover:ring-purple-400'
                              )}
                              onClick={() => {
                                if (
                                  asset.status === 'completed' &&
                                  !asset.childAssets?.length
                                ) {
                                  // If it's a slideshow image with captions, open preview
                                  if (
                                    asset.metadata?.slideshowGroup &&
                                    asset.metadata?.hasCaptions
                                  ) {
                                    setPreviewSlideshow(
                                      asset.metadata.slideshowGroup
                                    )
                                    setPreviewSlideIndex(
                                      (asset.metadata.slideNumber || 1) - 1
                                    )
                                  } else {
                                    // Otherwise toggle selection
                                    toggleAssetSelection(asset.id)
                                  }
                                }
                              }}
                            >
                              <div className='relative aspect-square'>
                                {asset.status === 'pending' && (
                                  <div className='bg-muted absolute inset-0 flex animate-pulse items-center justify-center'>
                                    <Loader2 className='text-muted-foreground h-8 w-8 animate-spin' />
                                  </div>
                                )}
                                {asset.status === 'generating' && (
                                  <div className='bg-muted absolute inset-0 flex items-center justify-center'>
                                    <div className='text-center'>
                                      <Loader2 className='text-primary mx-auto mb-2 h-8 w-8 animate-spin' />
                                      <p className='text-muted-foreground text-xs'>
                                        Generating...
                                      </p>
                                    </div>
                                  </div>
                                )}
                                {asset.status === 'completed' && (
                                  <>
                                    <img
                                      src={asset.url}
                                      alt={asset.prompt}
                                      className='h-full w-full object-cover'
                                    />
                                    {/* Show text overlay for slideshow images with captions */}
                                    {asset.metadata?.slideText &&
                                      asset.metadata?.hasCaptions && (
                                        <div className='pointer-events-none absolute inset-0 flex items-center justify-center p-4'>
                                          <div className='w-full max-w-[85%] text-center'>
                                            <p
                                              className='text-[5px] leading-[1.4] font-semibold whitespace-pre-line text-white'
                                              style={{
                                                fontFamily:
                                                  'Proxima Nova, -apple-system, BlinkMacSystemFont, sans-serif',
                                                textShadow:
                                                  '0 1px 2px rgba(0,0,0,0.9), 0 2px 4px rgba(0,0,0,0.7), 0 3px 6px rgba(0,0,0,0.5)',
                                              }}
                                            >
                                              {asset.metadata.slideText}
                                            </p>
                                          </div>
                                        </div>
                                      )}
                                    {asset.selected && (
                                      <div className='absolute top-2 right-2'>
                                        <CheckCircle2 className='text-primary h-6 w-6 rounded-full bg-white' />
                                      </div>
                                    )}
                                    {/* Drag handle and slide number for slideshow items */}
                                    {asset.metadata?.slideshowGroup && (
                                      <>
                                        <div className='absolute top-2 right-2 rounded bg-black/50 px-2 py-1'>
                                          <span className='text-xs font-semibold text-white'>
                                            {asset.metadata.slideNumber}
                                          </span>
                                        </div>
                                        <div className='absolute right-2 bottom-2 cursor-move'>
                                          <GripVertical className='h-4 w-4 text-white drop-shadow-lg' />
                                        </div>
                                      </>
                                    )}
                                    {/* Action buttons for images without videos */}
                                    {(!asset.childAssets ||
                                      asset.childAssets.length === 0) && (
                                      <div className='absolute top-2 left-2 flex gap-1'>
                                        {/* Edit button for slideshow captions */}
                                        {asset.metadata?.slideshowGroup &&
                                          asset.metadata?.slideText && (
                                            <Button
                                              size='sm'
                                              variant='secondary'
                                              className='h-8 w-8 bg-blue-500/50 p-0 hover:bg-blue-600/70'
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                setEditingCaption({
                                                  assetId: asset.id,
                                                  text: asset.metadata
                                                    .slideText,
                                                  slideNumber:
                                                    asset.metadata.slideNumber,
                                                })
                                              }}
                                              title='Edit caption'
                                            >
                                              <Pencil className='h-4 w-4' />
                                            </Button>
                                          )}
                                        {/* Reroll button for slideshow images */}
                                        {asset.metadata?.slideshowGroup && (
                                          <>
                                            <Button
                                              size='sm'
                                              variant='secondary'
                                              className='h-8 w-8 bg-purple-500/50 p-0 hover:bg-purple-600/70'
                                              onClick={async (e) => {
                                                e.stopPropagation()
                                                try {
                                                  // Mark as generating
                                                  setAssets((prev) =>
                                                    prev.map((a) =>
                                                      a.id === asset.id
                                                        ? {
                                                            ...a,
                                                            status:
                                                              'generating',
                                                          }
                                                        : a
                                                    )
                                                  )

                                                  // Generate new image with style-enhanced prompt
                                                  const rerollPrompt = asset
                                                    .metadata?.slideshowGroup
                                                    ? workflowType ===
                                                      'ugc-slideshow'
                                                      ? `${asset.prompt}, ${asset.metadata.style || 'low quality photo, amateur photography'}`
                                                      : workflowType ===
                                                          '6-verses'
                                                        ? `${asset.prompt}, ${asset.metadata.style || 'Disney 2D animation style, hand drawn animation, classic Disney art style, traditional cel animation, Disney Renaissance era, painted backgrounds, expressive linework, vibrant colors, storybook illustration, NOT 3D, NOT Pixar, NOT CGI, no text, no words, no captions'}`
                                                        : `${asset.prompt}, ${asset.metadata.style || 'tumblr aesthetic, film photography, disposable camera, high ISO grain'}`
                                                    : asset.prompt

                                                  const result =
                                                    await generateImage(
                                                      rerollPrompt,
                                                      model,
                                                      {
                                                        width: 1080,
                                                        height: 1920,
                                                        num_outputs: 1,
                                                      }
                                                    )

                                                  if (result && result[0]) {
                                                    // Upload to Supabase
                                                    const uploadResult =
                                                      await uploadGeneratedImage(
                                                        result[0],
                                                        {
                                                          prompt: asset.prompt,
                                                          aspect_ratio: '9:16',
                                                          model,
                                                          production_batch:
                                                            true,
                                                          metadata:
                                                            asset.metadata,
                                                        }
                                                      )

                                                    // Update asset with new URL
                                                    setAssets((prev) =>
                                                      prev.map((a) =>
                                                        a.id === asset.id
                                                          ? {
                                                              ...a,
                                                              url: uploadResult.publicUrl,
                                                              status:
                                                                'completed',
                                                            }
                                                          : a
                                                      )
                                                    )
                                                    toast.success(
                                                      'Image rerolled!'
                                                    )
                                                  }
                                                } catch (error) {
                                                  console.error(
                                                    'Failed to reroll image:',
                                                    error
                                                  )
                                                  setAssets((prev) =>
                                                    prev.map((a) =>
                                                      a.id === asset.id
                                                        ? {
                                                            ...a,
                                                            status: 'completed',
                                                          }
                                                        : a
                                                    )
                                                  )
                                                  toast.error(
                                                    'Failed to reroll image'
                                                  )
                                                }
                                              }}
                                              title='Reroll image'
                                            >
                                              <RefreshCw className='h-4 w-4' />
                                            </Button>

                                            {/* Replace image button */}
                                            <input
                                              type='file'
                                              id={`replace-image-${asset.id}`}
                                              accept='image/*'
                                              className='hidden'
                                              onChange={async (e) => {
                                                const file = e.target.files?.[0]
                                                if (!file) return

                                                try {
                                                  // Mark as generating
                                                  setAssets((prev) =>
                                                    prev.map((a) =>
                                                      a.id === asset.id
                                                        ? {
                                                            ...a,
                                                            status:
                                                              'generating',
                                                          }
                                                        : a
                                                    )
                                                  )

                                                  // Read file as data URL
                                                  const reader =
                                                    new FileReader()
                                                  reader.onload = async (
                                                    event
                                                  ) => {
                                                    const dataUrl = event.target
                                                      ?.result as string

                                                    try {
                                                      // Upload to Supabase storage
                                                      const uploadResult =
                                                        await uploadGeneratedImage(
                                                          dataUrl,
                                                          {
                                                            prompt:
                                                              asset.prompt,
                                                            aspect_ratio:
                                                              '9:16',
                                                            model:
                                                              'user-upload',
                                                            production_batch:
                                                              true,
                                                            metadata:
                                                              asset.metadata,
                                                          }
                                                        )

                                                      // Update asset with new URL
                                                      setAssets((prev) =>
                                                        prev.map((a) =>
                                                          a.id === asset.id
                                                            ? {
                                                                ...a,
                                                                url: uploadResult.publicUrl,
                                                                status:
                                                                  'completed',
                                                              }
                                                            : a
                                                        )
                                                      )
                                                      toast.success(
                                                        'Image replaced!'
                                                      )
                                                    } catch (error) {
                                                      console.error(
                                                        'Failed to upload image:',
                                                        error
                                                      )
                                                      setAssets((prev) =>
                                                        prev.map((a) =>
                                                          a.id === asset.id
                                                            ? {
                                                                ...a,
                                                                status:
                                                                  'completed',
                                                              }
                                                            : a
                                                        )
                                                      )
                                                      toast.error(
                                                        'Failed to upload image'
                                                      )
                                                    }
                                                  }

                                                  reader.onerror = () => {
                                                    console.error(
                                                      'Failed to read file'
                                                    )
                                                    setAssets((prev) =>
                                                      prev.map((a) =>
                                                        a.id === asset.id
                                                          ? {
                                                              ...a,
                                                              status:
                                                                'completed',
                                                            }
                                                          : a
                                                      )
                                                    )
                                                    toast.error(
                                                      'Failed to read image file'
                                                    )
                                                  }

                                                  reader.readAsDataURL(file)

                                                  // Reset the input
                                                  e.target.value = ''
                                                } catch (error) {
                                                  console.error(
                                                    'Failed to replace image:',
                                                    error
                                                  )
                                                  setAssets((prev) =>
                                                    prev.map((a) =>
                                                      a.id === asset.id
                                                        ? {
                                                            ...a,
                                                            status: 'completed',
                                                          }
                                                        : a
                                                    )
                                                  )
                                                  toast.error(
                                                    'Failed to replace image'
                                                  )
                                                }
                                              }}
                                            />
                                            <Button
                                              size='sm'
                                              variant='secondary'
                                              className='h-8 w-8 bg-green-500/50 p-0 hover:bg-green-600/70'
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                document
                                                  .getElementById(
                                                    `replace-image-${asset.id}`
                                                  )
                                                  ?.click()
                                              }}
                                              title='Replace image'
                                            >
                                              <Upload className='h-4 w-4' />
                                            </Button>
                                          </>
                                        )}
                                        {sessionId &&
                                          tiktokAccounts.length > 0 && (
                                            <Button
                                              size='sm'
                                              variant='secondary'
                                              className='h-8 w-8 bg-purple-500/50 p-0 hover:bg-purple-600/70'
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                // First, save the asset to database if not already saved
                                                if (!asset.dbId) {
                                                  productionSessionService
                                                    .addAsset(sessionId, {
                                                      url: asset.url,
                                                      prompt: asset.prompt,
                                                      type: 'image',
                                                      metadata: asset.metadata,
                                                    })
                                                    .then((savedAsset) => {
                                                      // Update local state with DB ID
                                                      setAssets((prev) =>
                                                        prev.map((a) =>
                                                          a.id === asset.id
                                                            ? {
                                                                ...a,
                                                                dbId: savedAsset.id,
                                                              }
                                                            : a
                                                        )
                                                      )
                                                      setShowAssignDialog({
                                                        assetId: savedAsset.id,
                                                        assetType: 'image',
                                                        assetPrompt:
                                                          asset.prompt,
                                                      })
                                                    })
                                                    .catch((error) => {
                                                      console.error(
                                                        'Failed to save asset:',
                                                        error
                                                      )
                                                      toast.error(
                                                        'Failed to save asset'
                                                      )
                                                    })
                                                } else {
                                                  setShowAssignDialog({
                                                    assetId: asset.dbId,
                                                    assetType: 'image',
                                                    assetPrompt: asset.prompt,
                                                  })
                                                }
                                              }}
                                              title='Assign to TikTok account'
                                            >
                                              <Link className='h-4 w-4' />
                                            </Button>
                                          )}
                                        <Button
                                          size='sm'
                                          variant='secondary'
                                          className='h-8 w-8 bg-red-500/50 p-0 hover:bg-red-600/70'
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            if (
                                              confirm(
                                                'Delete this image? This cannot be undone.'
                                              )
                                            ) {
                                              setAssets((prev) =>
                                                prev.filter(
                                                  (a) => a.id !== asset.id
                                                )
                                              )
                                              toast.success('Image deleted')
                                            }
                                          }}
                                          title='Delete image'
                                        >
                                          <Trash2 className='h-4 w-4' />
                                        </Button>
                                      </div>
                                    )}
                                  </>
                                )}
                                {asset.status === 'failed' && (
                                  <div className='absolute inset-0 flex items-center justify-center bg-red-500/10'>
                                    <p className='text-sm text-red-600'>
                                      Failed
                                    </p>
                                  </div>
                                )}
                              </div>

                              {/* Child assets (videos) - Add toggle for slideshow images */}
                              {asset.childAssets &&
                                asset.childAssets.length > 0 && (
                                  <>
                                    {/* Show toggle button for slideshow images with captions */}
                                    {asset.metadata?.slideshowGroup &&
                                      asset.metadata?.hasCaptions && (
                                        <Button
                                          size='sm'
                                          variant='secondary'
                                          className='absolute top-2 right-2 z-20 h-8 px-2'
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            // Toggle video visibility for this asset
                                            const newIndex =
                                              currentVideoIndex[asset.id] === -1
                                                ? 0
                                                : -1
                                            setCurrentVideoIndex((prev) => ({
                                              ...prev,
                                              [asset.id]: newIndex,
                                            }))
                                          }}
                                        >
                                          {currentVideoIndex[asset.id] ===
                                          -1 ? (
                                            <>
                                              <Video className='mr-1 h-3 w-3' />
                                              Video
                                            </>
                                          ) : (
                                            <>
                                              <Image className='mr-1 h-3 w-3' />
                                              Slide
                                            </>
                                          )}
                                        </Button>
                                      )}

                                    {/* Only show video overlay if not hidden (index !== -1) */}
                                    {currentVideoIndex[asset.id] !== -1 && (
                                      <div className='absolute inset-0 bg-black/90'>
                                        {(() => {
                                          const videoIndex =
                                            currentVideoIndex[asset.id] || 0
                                          const currentVideo =
                                            asset.childAssets[videoIndex]
                                          const hasMultipleVideos =
                                            asset.childAssets.length > 1

                                          if (
                                            currentVideo.status === 'generating'
                                          ) {
                                            return (
                                              <div className='flex h-full items-center justify-center'>
                                                <div className='text-center'>
                                                  <Loader2 className='mx-auto mb-2 h-8 w-8 animate-spin text-white' />
                                                  <p className='text-xs text-white'>
                                                    Generating video...
                                                  </p>
                                                  <p className='mt-1 text-xs text-white/60'>
                                                    May be queued
                                                  </p>
                                                </div>
                                              </div>
                                            )
                                          }

                                          if (
                                            currentVideo.status === 'completed'
                                          ) {
                                            return (
                                              <>
                                                <video
                                                  src={currentVideo.url}
                                                  className='h-full w-full object-cover'
                                                  controls
                                                  loop
                                                  muted
                                                  autoPlay
                                                  playsInline
                                                  onClick={(e) =>
                                                    e.stopPropagation()
                                                  }
                                                  onKeyDown={(e) => {
                                                    if (hasMultipleVideos) {
                                                      if (
                                                        e.key === 'ArrowLeft' &&
                                                        videoIndex > 0
                                                      ) {
                                                        e.preventDefault()
                                                        setCurrentVideoIndex(
                                                          (prev) => ({
                                                            ...prev,
                                                            [asset.id]:
                                                              videoIndex - 1,
                                                          })
                                                        )
                                                      } else if (
                                                        e.key ===
                                                          'ArrowRight' &&
                                                        videoIndex <
                                                          asset.childAssets
                                                            .length -
                                                            1
                                                      ) {
                                                        e.preventDefault()
                                                        setCurrentVideoIndex(
                                                          (prev) => ({
                                                            ...prev,
                                                            [asset.id]:
                                                              videoIndex + 1,
                                                          })
                                                        )
                                                      }
                                                    }
                                                  }}
                                                  tabIndex={0}
                                                />

                                                {/* Video navigation for multiple videos */}
                                                {hasMultipleVideos && (
                                                  <>
                                                    {/* Left/Right navigation buttons */}
                                                    {videoIndex > 0 && (
                                                      <Button
                                                        size='sm'
                                                        variant='ghost'
                                                        className='absolute top-1/2 left-2 h-12 w-12 -translate-y-1/2 transform rounded-full bg-black/50 p-0 text-white hover:bg-black/70'
                                                        onClick={(e) => {
                                                          e.stopPropagation()
                                                          setCurrentVideoIndex(
                                                            (prev) => ({
                                                              ...prev,
                                                              [asset.id]:
                                                                videoIndex - 1,
                                                            })
                                                          )
                                                        }}
                                                      >
                                                        <ChevronLeft className='h-6 w-6' />
                                                      </Button>
                                                    )}

                                                    {videoIndex <
                                                      asset.childAssets.length -
                                                        1 && (
                                                      <Button
                                                        size='sm'
                                                        variant='ghost'
                                                        className='absolute top-1/2 right-2 h-12 w-12 -translate-y-1/2 transform rounded-full bg-black/50 p-0 text-white hover:bg-black/70'
                                                        onClick={(e) => {
                                                          e.stopPropagation()
                                                          setCurrentVideoIndex(
                                                            (prev) => ({
                                                              ...prev,
                                                              [asset.id]:
                                                                videoIndex + 1,
                                                            })
                                                          )
                                                        }}
                                                      >
                                                        <ChevronRight className='h-6 w-6' />
                                                      </Button>
                                                    )}

                                                    {/* Video type indicator at top */}
                                                    <div className='absolute top-12 left-2'>
                                                      <Badge
                                                        variant='secondary'
                                                        className={cn(
                                                          'text-xs',
                                                          currentVideo.metadata
                                                            ?.isCaptioned
                                                            ? 'bg-green-500/90 text-white'
                                                            : currentVideo
                                                                  .metadata
                                                                  ?.hasSlideCaption
                                                              ? 'bg-purple-500/90 text-white'
                                                              : 'bg-blue-500/90 text-white'
                                                        )}
                                                      >
                                                        {currentVideo.metadata
                                                          ?.isCaptioned
                                                          ? 'Captioned'
                                                          : currentVideo
                                                                .metadata
                                                                ?.hasSlideCaption
                                                            ? 'Slide Caption'
                                                            : 'Original'}
                                                      </Badge>
                                                    </div>

                                                    {/* Video counter */}
                                                    <div className='absolute bottom-12 left-2'>
                                                      <Badge
                                                        variant='secondary'
                                                        className='bg-black/70 text-xs text-white'
                                                      >
                                                        {videoIndex + 1} /{' '}
                                                        {
                                                          asset.childAssets
                                                            .length
                                                        }
                                                      </Badge>
                                                    </div>
                                                  </>
                                                )}

                                                {/* Video selection checkbox */}
                                                <div className='absolute top-2 left-2'>
                                                  <Checkbox
                                                    checked={selectedVideos.has(
                                                      currentVideo.id
                                                    )}
                                                    onCheckedChange={(
                                                      checked
                                                    ) => {
                                                      toggleVideoSelection(
                                                        currentVideo.id
                                                      )
                                                    }}
                                                    className='border-2 bg-white/90'
                                                    onClick={(e) =>
                                                      e.stopPropagation()
                                                    }
                                                  />
                                                </div>
                                                <div className='absolute top-2 right-2 flex gap-1'>
                                                  <Button
                                                    size='sm'
                                                    variant='secondary'
                                                    className='h-8 w-8 bg-black/50 p-0 hover:bg-black/70'
                                                    onClick={(e) => {
                                                      e.stopPropagation()
                                                      setRerollDialog({
                                                        open: true,
                                                        assetId: asset.id,
                                                        childAssetId:
                                                          currentVideo.id,
                                                        currentPrompt:
                                                          currentVideo.prompt,
                                                        sourceImageUrl:
                                                          asset.url,
                                                      })
                                                      setRerollPrompt(
                                                        currentVideo.prompt
                                                      )
                                                    }}
                                                    title='Reroll video with new prompt'
                                                  >
                                                    <RefreshCw className='h-4 w-4' />
                                                  </Button>
                                                  <Button
                                                    size='sm'
                                                    variant='secondary'
                                                    className='h-8 w-8 bg-black/50 p-0 hover:bg-black/70'
                                                    onClick={async (e) => {
                                                      e.stopPropagation()
                                                      try {
                                                        // Fetch the video as a blob
                                                        const response =
                                                          await fetch(
                                                            currentVideo.url
                                                          )
                                                        const blob =
                                                          await response.blob()

                                                        // Create a blob URL and download
                                                        const blobUrl =
                                                          URL.createObjectURL(
                                                            blob
                                                          )
                                                        const a =
                                                          document.createElement(
                                                            'a'
                                                          )
                                                        a.href = blobUrl
                                                        const filename =
                                                          currentVideo.metadata
                                                            ?.isCaptioned
                                                            ? `video-${asset.id}-captioned.mp4`
                                                            : `video-${asset.id}.mp4`
                                                        a.download = filename
                                                        document.body.appendChild(
                                                          a
                                                        )
                                                        a.click()
                                                        document.body.removeChild(
                                                          a
                                                        )

                                                        // Clean up the blob URL
                                                        setTimeout(
                                                          () =>
                                                            URL.revokeObjectURL(
                                                              blobUrl
                                                            ),
                                                          100
                                                        )
                                                      } catch (error) {
                                                        console.error(
                                                          'Failed to download video:',
                                                          error
                                                        )
                                                        toast.error(
                                                          'Failed to download video'
                                                        )
                                                      }
                                                    }}
                                                    title='Download video'
                                                  >
                                                    <Download className='h-4 w-4' />
                                                  </Button>
                                                  {sessionId &&
                                                    tiktokAccounts.length >
                                                      0 && (
                                                      <Button
                                                        size='sm'
                                                        variant='secondary'
                                                        className='h-8 w-8 bg-purple-500/50 p-0 hover:bg-purple-600/70'
                                                        onClick={(e) => {
                                                          e.stopPropagation()
                                                          // First, save the asset to database
                                                          if (
                                                            !currentVideo.dbId
                                                          ) {
                                                            productionSessionService
                                                              .addAsset(
                                                                sessionId,
                                                                {
                                                                  url: currentVideo.url,
                                                                  prompt:
                                                                    asset.prompt,
                                                                  type: 'video',
                                                                  metadata:
                                                                    currentVideo.metadata,
                                                                }
                                                              )
                                                              .then(
                                                                (
                                                                  savedAsset
                                                                ) => {
                                                                  // Update local state with DB ID
                                                                  setAssets(
                                                                    (prev) =>
                                                                      prev.map(
                                                                        (a) =>
                                                                          a.id ===
                                                                          asset.id
                                                                            ? {
                                                                                ...a,
                                                                                childAssets:
                                                                                  a.childAssets?.map(
                                                                                    (
                                                                                      child
                                                                                    ) =>
                                                                                      child.id ===
                                                                                      currentVideo.id
                                                                                        ? {
                                                                                            ...child,
                                                                                            dbId: savedAsset.id,
                                                                                          }
                                                                                        : child
                                                                                  ),
                                                                              }
                                                                            : a
                                                                      )
                                                                  )
                                                                  setShowAssignDialog(
                                                                    {
                                                                      assetId:
                                                                        savedAsset.id,
                                                                      assetType:
                                                                        'video',
                                                                      assetPrompt:
                                                                        asset.prompt,
                                                                    }
                                                                  )
                                                                }
                                                              )
                                                              .catch(
                                                                (error) => {
                                                                  console.error(
                                                                    'Failed to save asset:',
                                                                    error
                                                                  )
                                                                  toast.error(
                                                                    'Failed to save asset'
                                                                  )
                                                                }
                                                              )
                                                          } else {
                                                            setShowAssignDialog(
                                                              {
                                                                assetId:
                                                                  currentVideo.dbId,
                                                                assetType:
                                                                  'video',
                                                                assetPrompt:
                                                                  asset.prompt,
                                                              }
                                                            )
                                                          }
                                                        }}
                                                        title='Assign to TikTok account'
                                                      >
                                                        <Link className='h-4 w-4' />
                                                      </Button>
                                                    )}
                                                  <Button
                                                    size='sm'
                                                    variant='secondary'
                                                    className='h-8 w-8 bg-red-500/50 p-0 hover:bg-red-600/70'
                                                    onClick={async (e) => {
                                                      e.stopPropagation()
                                                      if (
                                                        confirm(
                                                          'Delete this video? This cannot be undone.'
                                                        )
                                                      ) {
                                                        try {
                                                          // Check if this is the last video
                                                          const isLastVideo =
                                                            asset.childAssets
                                                              ?.length === 1

                                                          if (isLastVideo) {
                                                            // Remove entire image card if no videos left
                                                            setAssets((prev) =>
                                                              prev.filter(
                                                                (a) =>
                                                                  a.id !==
                                                                  asset.id
                                                              )
                                                            )
                                                            // Clean up video index for this asset
                                                            setCurrentVideoIndex(
                                                              (prev) => {
                                                                const {
                                                                  [asset.id]: _,
                                                                  ...rest
                                                                } = prev
                                                                return rest
                                                              }
                                                            )
                                                            toast.success(
                                                              'Image and video deleted'
                                                            )
                                                          } else {
                                                            // Just remove the video
                                                            setAssets((prev) =>
                                                              prev.map((a) => {
                                                                if (
                                                                  a.id ===
                                                                  asset.id
                                                                ) {
                                                                  const updatedChildAssets =
                                                                    a.childAssets?.filter(
                                                                      (child) =>
                                                                        child.id !==
                                                                        currentVideo.id
                                                                    )
                                                                  // Update video index if needed
                                                                  const newVideoIndex =
                                                                    currentVideoIndex[
                                                                      asset.id
                                                                    ] || 0
                                                                  if (
                                                                    newVideoIndex >=
                                                                      (updatedChildAssets?.length ||
                                                                        0) &&
                                                                    newVideoIndex >
                                                                      0
                                                                  ) {
                                                                    setCurrentVideoIndex(
                                                                      (
                                                                        prev
                                                                      ) => ({
                                                                        ...prev,
                                                                        [asset.id]:
                                                                          newVideoIndex -
                                                                          1,
                                                                      })
                                                                    )
                                                                  }
                                                                  return {
                                                                    ...a,
                                                                    childAssets:
                                                                      updatedChildAssets,
                                                                  }
                                                                }
                                                                return a
                                                              })
                                                            )
                                                            toast.success(
                                                              'Video deleted'
                                                            )
                                                          }

                                                          // TODO: Add database deletion if needed
                                                        } catch (error) {
                                                          console.error(
                                                            'Failed to delete video:',
                                                            error
                                                          )
                                                          toast.error(
                                                            'Failed to delete video'
                                                          )
                                                        }
                                                      }
                                                    }}
                                                    title='Delete video'
                                                  >
                                                    <Trash2 className='h-4 w-4' />
                                                  </Button>
                                                </div>
                                              </>
                                            )
                                          }

                                          if (
                                            currentVideo.status === 'failed'
                                          ) {
                                            return (
                                              <div className='flex h-full items-center justify-center'>
                                                <p className='text-sm text-red-400'>
                                                  Video failed
                                                </p>
                                              </div>
                                            )
                                          }
                                        })()}
                                      </div>
                                    )}
                                  </>
                                )}
                              {/* Prompt display and edit button */}
                              {asset.prompt && (
                                <div className='bg-muted/50 border-t p-2'>
                                  <div className='flex items-start justify-between gap-2'>
                                    <p className='text-muted-foreground line-clamp-3 flex-1 text-xs whitespace-pre-line'>
                                      {asset.prompt}
                                    </p>
                                    <Button
                                      size='sm'
                                      variant='ghost'
                                      className='h-6 w-6 flex-shrink-0 p-0'
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setEditingPrompt({
                                          assetId: asset.id,
                                          prompt: asset.prompt,
                                          style: asset.metadata?.style,
                                        })
                                      }}
                                      title='Edit prompt for reroll'
                                    >
                                      <Pencil className='h-3 w-3' />
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </Card>
                          ))}
                        {/* Add Slide button */}
                        {groupId !== 'ungrouped' && (
                          <Card
                            className='hover:bg-muted/50 relative cursor-pointer overflow-hidden border-dashed transition-all hover:border-solid'
                            onClick={() => {
                              const lastSlideNumber = Math.max(
                                ...groupAssets.map(
                                  (a) => a.metadata?.slideNumber || 0
                                )
                              )
                              addSlideToGroup(groupId, lastSlideNumber)
                            }}
                          >
                            <div className='relative flex aspect-square items-center justify-center'>
                              <div className='text-center'>
                                <PlusCircle className='text-muted-foreground mx-auto mb-2 h-8 w-8' />
                                <p className='text-muted-foreground text-xs'>
                                  Add Slide
                                </p>
                              </div>
                            </div>
                          </Card>
                        )}
                      </div>
                    </div>
                  ))
                })()}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value='queue' className='flex-1 p-4'>
          <Card className='border-dashed'>
            <CardContent className='p-8 text-center'>
              <RefreshCw className='text-muted-foreground/50 mx-auto mb-4 h-12 w-12' />
              <h3 className='mb-2 font-semibold'>Processing Queue</h3>
              <p className='text-muted-foreground text-sm'>
                View and manage ongoing generation tasks
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Reroll Dialog */}
      <Dialog
        open={rerollDialog?.open || false}
        onOpenChange={(open) => {
          if (!open) {
            setRerollDialog(null)
            setRerollPrompt('')
          }
        }}
      >
        <DialogContent className='sm:max-w-[500px]'>
          <DialogHeader>
            <DialogTitle>Reroll Video</DialogTitle>
            <DialogDescription>
              Edit the prompt below to regenerate the video with different
              motion or style.
            </DialogDescription>
          </DialogHeader>
          <div className='grid gap-4 py-4'>
            <div className='space-y-2'>
              <Label htmlFor='reroll-prompt'>Video Prompt</Label>
              <Textarea
                id='reroll-prompt'
                value={rerollPrompt}
                onChange={(e) => setRerollPrompt(e.target.value)}
                placeholder='Describe the motion and style you want...'
                className='min-h-[100px]'
              />
              <p className='text-muted-foreground text-xs'>
                Tips: Be specific about motion, camera movement, and style. For
                example: "slow zoom in with cinematic lighting" or "dynamic
                camera rotation with smooth motion"
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => {
                setRerollDialog(null)
                setRerollPrompt('')
              }}
              disabled={isRerolling}
            >
              Cancel
            </Button>
            <Button
              onClick={rerollVideo}
              disabled={isRerolling || !rerollPrompt.trim()}
            >
              {isRerolling ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Generating...
                </>
              ) : (
                <>
                  <RefreshCw className='mr-2 h-4 w-4' />
                  Reroll Video
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* TikTok Hook Dialog */}
      <Dialog
        open={showHookDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowHookDialog(false)
          }
        }}
      >
        <DialogContent className='sm:max-w-[700px]'>
          <DialogHeader>
            <DialogTitle>TikTok Hooks Generated</DialogTitle>
            <DialogDescription>
              Review and edit the generated hooks before burning them onto
              videos.
            </DialogDescription>
          </DialogHeader>
          <div className='grid max-h-[60vh] gap-4 overflow-y-auto py-4'>
            {Array.from(selectedVideos).map((videoId) => {
              const asset = assets.find((a) =>
                a.childAssets?.some((child) => child.id === videoId)
              )
              const video = asset?.childAssets?.find(
                (child) => child.id === videoId
              )

              if (!video) return null

              return (
                <Card key={videoId} className='p-4'>
                  <div className='flex gap-4'>
                    <div className='flex-shrink-0'>
                      <video
                        src={video.url}
                        className='h-32 w-32 rounded object-cover'
                        muted
                        loop
                      />
                    </div>
                    <div className='flex-grow space-y-2'>
                      <Label>Hook Caption</Label>
                      <Textarea
                        value={generatedHooks[videoId] || ''}
                        onChange={(e) =>
                          setGeneratedHooks({
                            ...generatedHooks,
                            [videoId]: e.target.value,
                          })
                        }
                        placeholder='TikTok hook...'
                        className='min-h-[80px]'
                      />
                      <p className='text-muted-foreground text-xs'>
                        Original: {asset?.prompt}
                      </p>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => {
                setShowHookDialog(false)
                setSelectedVideos(new Set())
                setGeneratedHooks({})
              }}
              disabled={isProcessingVideos}
            >
              Cancel
            </Button>
            <Button
              onClick={processVideosWithCaptions}
              disabled={isProcessingVideos}
            >
              {isProcessingVideos ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Processing...
                </>
              ) : (
                <>
                  <Video className='mr-2 h-4 w-4' />
                  Burn Captions on Videos
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Slideshow Preview Modal */}
      <Dialog
        open={!!previewSlideshow}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewSlideshow(null)
            setPreviewSlideIndex(0)
          }
        }}
      >
        <DialogContent className='max-w-[400px] overflow-hidden p-0'>
          <DialogHeader className='sr-only'>
            <DialogTitle>Slideshow Preview</DialogTitle>
            <DialogDescription>
              Preview your slideshow at actual TikTok size
            </DialogDescription>
          </DialogHeader>
          <div className='relative bg-black' style={{ aspectRatio: '9/16' }}>
            {previewSlideshow &&
              (() => {
                const slideshowAssets = assets
                  .filter(
                    (a) => a.metadata?.slideshowGroup === previewSlideshow
                  )
                  .sort(
                    (a, b) =>
                      (a.metadata?.slideNumber || 0) -
                      (b.metadata?.slideNumber || 0)
                  )

                const currentSlide = slideshowAssets[previewSlideIndex]

                if (!currentSlide) return null

                return (
                  <>
                    {/* Check if image is still generating */}
                    {currentSlide.status === 'generating' ? (
                      <div className='absolute inset-0 flex items-center justify-center'>
                        <div className='text-center'>
                          <Loader2 className='mx-auto mb-3 h-12 w-12 animate-spin text-white' />
                          <p className='text-sm text-white'>
                            Generating slide{' '}
                            {currentSlide.metadata?.slideNumber}...
                          </p>
                        </div>
                      </div>
                    ) : currentSlide.status === 'failed' ? (
                      <div className='absolute inset-0 flex items-center justify-center'>
                        <div className='text-center'>
                          <p className='mb-2 text-lg text-red-400'>
                            Failed to generate
                          </p>
                          <p className='text-sm text-white'>
                            Slide {currentSlide.metadata?.slideNumber}
                          </p>
                        </div>
                      </div>
                    ) : currentSlide.childAssets &&
                      currentSlide.childAssets.length > 0 ? (
                      <>
                        {/* Find the video with caption if available, otherwise use first video */}
                        {(() => {
                          const captionedVideo = currentSlide.childAssets.find(
                            (v) => v.metadata?.hasSlideCaption
                          )
                          const videoToShow =
                            captionedVideo || currentSlide.childAssets[0]

                          return videoToShow ? (
                            <video
                              key={videoToShow.id}
                              src={videoToShow.url}
                              className='h-full w-full object-cover'
                              controls
                              autoPlay
                              loop
                              muted
                              playsInline
                            />
                          ) : null
                        })()}

                        {/* If video doesn't have burned caption, show overlay */}
                        {!currentSlide.childAssets.some(
                          (v) => v.metadata?.hasSlideCaption
                        ) && (
                          <div className='pointer-events-none absolute inset-0 flex items-center justify-center p-6'>
                            <div className='w-full text-center'>
                              <p
                                className='text-2xl leading-[1.3] font-semibold whitespace-pre-line text-white'
                                style={{
                                  fontFamily:
                                    'Proxima Nova, -apple-system, BlinkMacSystemFont, sans-serif',
                                  textShadow:
                                    '0 0 8px rgba(0,0,0,0.8), 0 0 16px rgba(0,0,0,0.6)',
                                  WebkitTextStroke: '1px black',
                                }}
                              >
                                {currentSlide.metadata?.slideText}
                              </p>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        {/* Static image with overlay */}
                        {currentSlide.url ? (
                          <img
                            key={`${currentSlide.id}-${currentSlide.url}`}
                            src={currentSlide.url}
                            alt=''
                            className='h-full w-full object-cover'
                            onError={(e) => {
                              console.error(
                                'Image failed to load in preview:',
                                {
                                  url: currentSlide.url,
                                  slideNumber:
                                    currentSlide.metadata?.slideNumber,
                                }
                              )
                              // Optionally set a fallback image
                              e.currentTarget.src =
                                'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect width="100" height="100" fill="%23333"/%3E%3Ctext x="50" y="50" text-anchor="middle" dy=".3em" fill="%23999" font-family="sans-serif"%3EError%3C/text%3E%3C/svg%3E'
                            }}
                          />
                        ) : (
                          <div className='flex h-full w-full items-center justify-center bg-gray-800'>
                            <p className='text-gray-400'>No image URL</p>
                          </div>
                        )}

                        {/* Text Overlay */}
                        <div className='absolute inset-0 flex items-center justify-center p-8'>
                          <div className='w-full max-w-[80%] text-center'>
                            <p
                              className='text-lg leading-[1.4] font-semibold whitespace-pre-line text-white'
                              style={{
                                fontFamily:
                                  'Proxima Nova, -apple-system, BlinkMacSystemFont, sans-serif',
                                textShadow:
                                  '0 2px 4px rgba(0,0,0,0.9), 0 4px 8px rgba(0,0,0,0.7), 0 6px 12px rgba(0,0,0,0.5)',
                              }}
                            >
                              {currentSlide.metadata?.slideText}
                            </p>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Navigation */}
                    <div className='absolute right-0 bottom-4 left-0 flex justify-center gap-2'>
                      {slideshowAssets.map((_, index) => (
                        <button
                          key={index}
                          className={cn(
                            'h-2 w-2 rounded-full transition-all',
                            index === previewSlideIndex
                              ? 'w-8 bg-white'
                              : 'bg-white/50'
                          )}
                          onClick={() => setPreviewSlideIndex(index)}
                        />
                      ))}
                    </div>

                    {/* Previous/Next buttons */}
                    {previewSlideIndex > 0 && (
                      <Button
                        size='sm'
                        variant='ghost'
                        className='absolute top-1/2 left-2 -translate-y-1/2 text-white hover:bg-white/20'
                        onClick={() => setPreviewSlideIndex((prev) => prev - 1)}
                      >
                        <ChevronLeft className='h-6 w-6' />
                      </Button>
                    )}

                    {previewSlideIndex < slideshowAssets.length - 1 && (
                      <Button
                        size='sm'
                        variant='ghost'
                        className='absolute top-1/2 right-2 -translate-y-1/2 text-white hover:bg-white/20'
                        onClick={() => setPreviewSlideIndex((prev) => prev + 1)}
                      >
                        <ChevronRight className='h-6 w-6' />
                      </Button>
                    )}

                    {/* Slide counter */}
                    <div className='absolute top-4 right-4'>
                      <Badge className='bg-black/50 text-white'>
                        {previewSlideIndex + 1} / {slideshowAssets.length}
                      </Badge>
                    </div>
                  </>
                )
              })()}
          </div>
        </DialogContent>
      </Dialog>

      {/* Caption Edit Dialog */}
      <Dialog
        open={!!editingCaption}
        onOpenChange={(open) => {
          if (!open) setEditingCaption(null)
        }}
      >
        <DialogContent className='sm:max-w-[600px]'>
          <DialogHeader>
            <DialogTitle>Edit Slide Caption</DialogTitle>
            <DialogDescription>
              {editingCaption?.slideNumber &&
                `Slide ${editingCaption.slideNumber}`}
            </DialogDescription>
          </DialogHeader>
          <div className='grid gap-4 py-4'>
            <div className='space-y-2'>
              <Label htmlFor='caption-text'>Caption Text</Label>
              <Textarea
                id='caption-text'
                value={editingCaption?.text || ''}
                onChange={(e) =>
                  setEditingCaption((prev) =>
                    prev ? { ...prev, text: e.target.value } : null
                  )
                }
                placeholder='Enter your caption text...'
                className='min-h-[200px] text-lg'
                style={{ fontFamily: 'monospace' }}
              />
              <p className='text-muted-foreground text-xs'>
                Use line breaks to control text layout. Keep it punchy and
                readable.
              </p>
            </div>
            <div className='rounded-lg bg-black p-4'>
              <p
                className='text-center text-2xl font-semibold whitespace-pre-line text-white'
                style={{
                  fontFamily:
                    'Proxima Nova, -apple-system, BlinkMacSystemFont, sans-serif',
                  textShadow:
                    '0 0 8px rgba(0,0,0,0.8), 0 0 16px rgba(0,0,0,0.6)',
                  WebkitTextStroke: '1px black',
                }}
              >
                {editingCaption?.text || 'Preview will appear here...'}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setEditingCaption(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (editingCaption) {
                  setAssets((prev) =>
                    prev.map((a) =>
                      a.id === editingCaption.assetId
                        ? {
                            ...a,
                            metadata: {
                              ...a.metadata,
                              slideText: editingCaption.text,
                            },
                          }
                        : a
                    )
                  )
                  toast.success('Caption updated')
                  setEditingCaption(null)
                }
              }}
            >
              Save Caption
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Prompt Editing Dialog */}
      <Dialog
        open={!!editingPrompt}
        onOpenChange={(open) => {
          if (!open) {
            setEditingPrompt(null)
          }
        }}
      >
        <DialogContent className='sm:max-w-[600px]'>
          <DialogHeader>
            <DialogTitle>Edit Image Prompt</DialogTitle>
            <DialogDescription>
              Modify the prompt below and click "Apply to Reroll" to regenerate
              the image with your changes.
            </DialogDescription>
          </DialogHeader>
          {editingPrompt && (
            <div className='grid gap-4 py-4'>
              <div className='space-y-2'>
                <Label htmlFor='edit-prompt'>Image Prompt</Label>
                <Textarea
                  id='edit-prompt'
                  value={editingPrompt.prompt}
                  onChange={(e) =>
                    setEditingPrompt({
                      ...editingPrompt,
                      prompt: e.target.value,
                    })
                  }
                  placeholder='Describe what you want to see...'
                  className='min-h-[100px]'
                />
                {editingPrompt.style && (
                  <p className='text-muted-foreground text-xs'>
                    Style: {editingPrompt.style}
                  </p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant='outline' onClick={() => setEditingPrompt(null)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!editingPrompt) return

                // Update the asset's prompt
                setAssets((prev) =>
                  prev.map((a) =>
                    a.id === editingPrompt.assetId
                      ? { ...a, prompt: editingPrompt.prompt }
                      : a
                  )
                )

                // Find the asset and trigger reroll with new prompt
                const asset = assets.find((a) => a.id === editingPrompt.assetId)
                if (asset) {
                  try {
                    // Mark as generating
                    setAssets((prev) =>
                      prev.map((a) =>
                        a.id === asset.id ? { ...a, status: 'generating' } : a
                      )
                    )

                    // Generate new image with edited prompt and style
                    const rerollPrompt = asset.metadata?.slideshowGroup
                      ? workflowType === 'ugc-slideshow'
                        ? `${editingPrompt.prompt}, ${asset.metadata.style || 'low quality photo, amateur photography'}`
                        : workflowType === '6-verses'
                          ? `${editingPrompt.prompt}, ${asset.metadata.style || 'Disney 2D animation style, hand drawn animation, classic Disney art style, traditional cel animation, Disney Renaissance era, painted backgrounds, expressive linework, vibrant colors, storybook illustration, NOT 3D, NOT Pixar, NOT CGI, no text, no words, no captions'}`
                          : `${editingPrompt.prompt}, ${asset.metadata.style || 'tumblr aesthetic, film photography, disposable camera, high ISO grain'}`
                      : editingPrompt.prompt

                    const result = await generateImage(rerollPrompt, model, {
                      width: 1080,
                      height: 1920,
                      num_outputs: 1,
                    })

                    if (result && result[0]) {
                      // Upload to Supabase
                      const uploadResult = await uploadGeneratedImage(
                        result[0],
                        {
                          prompt: editingPrompt.prompt,
                          aspect_ratio: '9:16',
                          model,
                          production_batch: true,
                          metadata: asset.metadata,
                        }
                      )

                      // Update asset with new URL
                      setAssets((prev) =>
                        prev.map((a) =>
                          a.id === asset.id
                            ? {
                                ...a,
                                url: uploadResult.publicUrl,
                                status: 'completed',
                              }
                            : a
                        )
                      )
                      toast.success('Image regenerated with new prompt!')
                    }
                  } catch (error) {
                    console.error('Failed to reroll image:', error)
                    setAssets((prev) =>
                      prev.map((a) =>
                        a.id === asset.id ? { ...a, status: 'completed' } : a
                      )
                    )
                    toast.error('Failed to regenerate image')
                  }
                }

                setEditingPrompt(null)
              }}
            >
              <RefreshCw className='mr-2 h-4 w-4' />
              Apply & Reroll
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign to Account Dialog */}
      <Dialog
        open={!!showAssignDialog}
        onOpenChange={(open) => !open && setShowAssignDialog(null)}
      >
        <DialogContent className='sm:max-w-[425px]'>
          <DialogHeader>
            <DialogTitle>Assign to TikTok Account</DialogTitle>
            <DialogDescription>
              Choose which account should post this{' '}
              {showAssignDialog?.assetType}
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-3 py-4'>
            {tiktokAccounts.map((account) => (
              <Button
                key={account.id}
                variant='outline'
                className='w-full justify-start gap-3'
                onClick={() => handleAssignToTikTok(account.id)}
              >
                <div className='flex flex-wrap gap-1'>
                  {account.content_strategies.map((strategy: string) => (
                    <Badge
                      key={strategy}
                      variant='secondary'
                      className='text-xs'
                    >
                      {strategy}
                    </Badge>
                  ))}
                </div>
                <span className='font-medium'>{account.username}</span>
                {account.display_name && (
                  <span className='text-muted-foreground text-sm'>
                    {account.display_name}
                  </span>
                )}
              </Button>
            ))}
          </div>
          {tiktokAccounts.length === 0 && (
            <p className='text-muted-foreground py-4 text-center'>
              No TikTok accounts configured. Go to the Portfolio tab to add
              accounts.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
