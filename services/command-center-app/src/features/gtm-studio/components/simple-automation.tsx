import React, { useState } from 'react'
import {
  Play,
  Loader2,
  Sparkles,
  Zap,
  ArrowRight,
  Wand2,
  Download,
  Video,
  Type,
  Image,
  RotateCcw,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { enhancePrompt } from '../services/claude-service'
import {
  createSimpleContentPipeline,
  burnCaptionOnAutomationVideo,
  generateViralHooks,
} from '../services/content-automation-service'
import { generateImage, generateVideo } from '../services/replicate-service'

const JESUS_SCENARIOS = [
  'walking on water at golden hour',
  'healing the sick with glowing hands',
  'teaching disciples on a hillside',
  'calming a storm at sea',
  'multiplying loaves and fishes',
  'praying in the garden of Gethsemane',
  'embracing children with warm light',
  'rising from the tomb with radiant glory',
  'appearing to disciples after resurrection',
  'ascending to heaven surrounded by clouds',
  'turning water into wine at wedding',
  'cleansing the temple with righteous anger',
  'feeding the 5000 with compassion',
  'healing the blind man with mud',
  'raising Lazarus from the dead',
  'washing the disciples feet humbly',
  'carrying the cross with determination',
  'forgiving enemies on the cross',
  'breaking bread at last supper',
  'praying on the mount of transfiguration',
  'calling fishermen to follow him',
  'blessing the beatitudes sermon',
  'healing the paralyzed man',
  'casting out demons with authority',
  'touching the leper with love',
  'welcoming tax collectors and sinners',
  'protecting the woman caught in adultery',
  'weeping over Jerusalem',
  'entering Jerusalem on palm sunday',
  'overturning money changers tables',
  "healing the centurion's servant",
  "raising the widow's son",
  'comforting Mary and Martha',
  'walking through the wheat fields',
  'teaching in parables by the sea',
  'healing on the sabbath',
  'fasting in the wilderness',
  'being tempted by satan',
  'baptized by John in the Jordan',
  'calling Matthew from tax booth',
  "healing Peter's mother in law",
  'stilling the storm with peace',
  'walking to Emmaus with disciples',
  'cooking fish on the beach',
  'commissioning the great commission',
  'breathing on disciples holy spirit',
  'showing thomas his wounds',
  'appearing through locked doors',
  'sitting with children on his lap',
  'looking at rich young ruler with love',
  'weeping at Lazarus tomb',
]

export function SimpleAutomation() {
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [selectedModel, setSelectedModel] = useState(
    'black-forest-labs/flux-1.1-pro-ultra'
  )
  const [currentScenarioIndex, setCurrentScenarioIndex] = useState(0)
  const [selectedHook, setSelectedHook] = useState<string | null>(null)
  const [previewMode, setPreviewMode] = useState(false)
  const [burningCaption, setBurningCaption] = useState(false)
  const [enhancingPrompt, setEnhancingPrompt] = useState(false)
  const [rerollingImage, setRerollingImage] = useState(false)
  const [rerollingVideo, setRerollingVideo] = useState(false)
  const [rerollingHooks, setRerollingHooks] = useState(false)
  const [originalPrompt, setOriginalPrompt] = useState('')

  const handleRerollImage = async () => {
    if (!result?.results?.image || !originalPrompt.trim()) {
      console.log('❌ Cannot reroll image - no result or prompt')
      toast.error('Cannot reroll image - no original prompt found')
      return
    }

    setRerollingImage(true)
    try {
      console.log('🔄 Rerolling image with prompt:', originalPrompt)
      const imageResult = await generateImage(originalPrompt, selectedModel, {
        width: 1080,
        height: 1920,
        raw: false,
        num_outputs: 1,
      })

      setResult((prev) => ({
        ...prev,
        results: {
          ...prev.results,
          image: imageResult,
        },
      }))

      toast.success('Image rerolled! 🎨')
    } catch (error) {
      console.error('Failed to reroll image:', error)
      toast.error('Failed to reroll image')
    } finally {
      setRerollingImage(false)
    }
  }

  const handleRerollVideo = async () => {
    if (!result?.results?.image || !result?.results?.video) return

    setRerollingVideo(true)
    try {
      console.log('🔄 Rerolling video...')
      const videoResult = await generateVideo(
        result.results.image[0],
        'pixverse/pixverse-v4.5',
        {
          prompt:
            'Smooth cinematic motion, subtle animation, professional quality',
          quality: '720p',
          duration: 5,
          aspect_ratio: '9:16',
        }
      )

      setResult((prev) => ({
        ...prev,
        results: {
          ...prev.results,
          video: videoResult,
        },
      }))

      toast.success('Video rerolled! 🎬')
    } catch (error) {
      console.error('Failed to reroll video:', error)
      toast.error('Failed to reroll video')
    } finally {
      setRerollingVideo(false)
    }
  }

  const handleRerollHooks = async () => {
    console.log('🔄 Reroll hooks clicked')
    console.log('Current hooks:', result?.results?.hooks)
    console.log('Stored original prompt:', originalPrompt)

    if (!result?.results?.hooks) {
      console.log('❌ No hooks in result')
      toast.error('No hooks to reroll')
      return
    }

    // Hooks don't actually depend on the prompt - they're just random Jesus hooks
    setRerollingHooks(true)
    try {
      console.log('🔄 Calling generateViralHooks')
      const hooksResult = await generateViralHooks('dummy prompt') // Pass dummy since it's not used
      console.log('🔄 Got new hooks:', hooksResult)

      setResult((prev) => {
        const newResult = {
          ...prev,
          results: {
            ...prev.results,
            hooks: hooksResult,
          },
        }
        console.log('🔄 Updated result:', newResult)
        return newResult
      })

      // Clear selected hook if it's not in the new set
      if (selectedHook && !hooksResult.includes(selectedHook)) {
        console.log("🔄 Clearing selected hook as it's not in new set")
        setSelectedHook(null)
        setPreviewMode(false)
      }

      toast.success('Hooks rerolled! 🔥')
    } catch (error) {
      console.error('❌ Failed to reroll hooks:', error)
      toast.error('Failed to reroll hooks: ' + error.message)
    } finally {
      setRerollingHooks(false)
    }
  }

  const handleCreate = async () => {
    if (!prompt.trim()) {
      toast.error('Enter a prompt first')
      return
    }

    setLoading(true)
    try {
      console.log('🎬 UI: Starting automation...')
      const result = await createSimpleContentPipeline(
        prompt,
        undefined,
        selectedModel
      )

      console.log('🎬 UI: Got result:', result)

      if (result.success) {
        toast.success('Content created! 🎉')
        console.log('🎬 UI: Success toast shown, storing result')
        console.log('🎬 UI: Storing original prompt:', prompt)
        // Store the original prompt in both the result and separate state
        setOriginalPrompt(prompt)
        setResult(result)
        setPrompt('')
      } else {
        toast.error('Failed: ' + result.error)
      }
    } catch (error) {
      console.error('🎬 UI: Error caught:', error)
      toast.error('Something went wrong: ' + error.message)
    } finally {
      console.log('🎬 UI: Setting loading to false')
      setLoading(false)
    }
  }

  return (
    <div className='mx-auto max-w-4xl space-y-8 py-8'>
      {/* Main Creation Card */}
      <Card className='border-0 bg-white/80 shadow-2xl shadow-purple-500/10 backdrop-blur-xl dark:bg-slate-900/80'>
        <CardContent className='space-y-8 p-8'>
          {/* Input Section */}
          <div className='space-y-4'>
            <div className='mb-4 flex items-center gap-3'>
              <div className='flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-sm font-bold text-white'>
                1
              </div>
              <h3 className='text-lg font-semibold'>
                Describe your video idea
              </h3>
            </div>

            <div className='relative'>
              <Input
                placeholder='Jesus walking on water at golden hour...'
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className='h-16 rounded-xl border-slate-200 bg-slate-50/50 pr-24 pl-6 text-lg shadow-sm focus:border-purple-400 dark:border-slate-700 dark:bg-slate-800/50 dark:focus:border-purple-500'
                disabled={loading}
              />

              {/* Enhance Prompt Button */}
              <button
                onClick={async () => {
                  if (!prompt.trim()) {
                    toast.error('Enter a prompt first')
                    return
                  }

                  setEnhancingPrompt(true)
                  try {
                    const enhanced = await enhancePrompt(prompt, 'jesus')
                    setPrompt(enhanced)
                    toast.success('Prompt enhanced! 🌟')
                  } catch (error) {
                    console.error('Failed to enhance prompt:', error)
                    toast.error('Failed to enhance prompt')
                  } finally {
                    setEnhancingPrompt(false)
                  }
                }}
                className='group absolute top-1/2 right-14 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-200 hover:from-blue-600 hover:to-cyan-600'
                disabled={loading || enhancingPrompt}
                title='Enhance prompt with Disney style'
              >
                {enhancingPrompt ? (
                  <Loader2 className='h-4 w-4 animate-spin text-white' />
                ) : (
                  <Sparkles className='h-4 w-4 text-white transition-transform group-hover:scale-110' />
                )}
              </button>

              {/* Wand Button */}
              <button
                onClick={() => {
                  const scenario = JESUS_SCENARIOS[currentScenarioIndex]
                  setPrompt(`disney animated cartoon Jesus ${scenario}`)
                  setCurrentScenarioIndex(
                    (prev) => (prev + 1) % JESUS_SCENARIOS.length
                  )
                }}
                className='group absolute top-1/2 right-4 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-200 hover:from-purple-600 hover:to-pink-600'
                disabled={loading}
                title={`Click for scenario: ${JESUS_SCENARIOS[currentScenarioIndex]}`}
              >
                <Wand2 className='h-4 w-4 text-white transition-transform group-hover:scale-110' />
              </button>
            </div>

            {/* Model Selection */}
            <div className='space-y-4'>
              <div className='mb-4 flex items-center gap-3'>
                <div className='flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-sm font-bold text-white'>
                  2
                </div>
                <h3 className='text-lg font-semibold'>Choose your AI model</h3>
              </div>

              <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
                <button
                  onClick={() =>
                    setSelectedModel('black-forest-labs/flux-1.1-pro-ultra')
                  }
                  className={`relative overflow-hidden rounded-xl border p-4 text-left transition-all duration-200 ${
                    selectedModel === 'black-forest-labs/flux-1.1-pro-ultra'
                      ? 'border-purple-400 bg-gradient-to-br from-purple-50 to-pink-50 shadow-lg dark:from-purple-950/30 dark:to-pink-950/30'
                      : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/50 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:bg-slate-700/50'
                  }`}
                  disabled={loading}
                >
                  <div className='flex items-start gap-3'>
                    <div className='flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-pink-500'>
                      <span className='text-sm font-bold text-white'>F</span>
                    </div>
                    <div className='min-w-0 flex-1'>
                      <div className='text-sm font-semibold'>
                        FLUX 1.1 Pro Ultra
                      </div>
                      <div className='text-muted-foreground mt-1 text-xs'>
                        Ultra high-res with advanced stylization
                      </div>
                      <div className='mt-1 text-xs font-medium text-purple-600 dark:text-purple-400'>
                        Black Forest Labs
                      </div>
                    </div>
                    {selectedModel ===
                      'black-forest-labs/flux-1.1-pro-ultra' && (
                      <div className='flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-purple-500'>
                        <div className='h-2 w-2 rounded-full bg-white'></div>
                      </div>
                    )}
                  </div>
                </button>

                <button
                  onClick={() => setSelectedModel('google/imagen-4')}
                  className={`relative overflow-hidden rounded-xl border p-4 text-left transition-all duration-200 ${
                    selectedModel === 'google/imagen-4'
                      ? 'border-blue-400 bg-gradient-to-br from-blue-50 to-cyan-50 shadow-lg dark:from-blue-950/30 dark:to-cyan-950/30'
                      : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/50 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:bg-slate-700/50'
                  }`}
                  disabled={loading}
                >
                  <div className='flex items-start gap-3'>
                    <div className='flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-cyan-500'>
                      <span className='text-sm font-bold text-white'>I4</span>
                    </div>
                    <div className='min-w-0 flex-1'>
                      <div className='text-sm font-semibold'>Imagen 4</div>
                      <div className='text-muted-foreground mt-1 text-xs'>
                        Flagship model with exceptional detail
                      </div>
                      <div className='mt-1 text-xs font-medium text-blue-600 dark:text-blue-400'>
                        Google
                      </div>
                    </div>
                    {selectedModel === 'google/imagen-4' && (
                      <div className='flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-blue-500'>
                        <div className='h-2 w-2 rounded-full bg-white'></div>
                      </div>
                    )}
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Process Flow */}
          <div className='relative'>
            <div className='mb-6 flex items-center gap-3'>
              <div className='flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 text-sm font-bold text-white'>
                3
              </div>
              <h3 className='text-lg font-semibold'>AI handles everything</h3>
            </div>

            <div className='grid grid-cols-1 gap-4 md:grid-cols-4'>
              <div className='flex flex-col items-center rounded-xl border border-blue-200/50 bg-gradient-to-br from-blue-50 to-cyan-50 p-4 dark:border-blue-800/50 dark:from-blue-950/30 dark:to-cyan-950/30'>
                <div className='mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-cyan-500'>
                  <span className='text-xl'>🎨</span>
                </div>
                <h4 className='mb-1 font-semibold text-blue-700 dark:text-blue-300'>
                  Generate Image
                </h4>
                <p className='text-center text-xs text-blue-600/70 dark:text-blue-400/70'>
                  AI creates stunning visuals from your description
                </p>
              </div>

              <div className='flex flex-col items-center rounded-xl border border-purple-200/50 bg-gradient-to-br from-purple-50 to-pink-50 p-4 dark:border-purple-800/50 dark:from-purple-950/30 dark:to-pink-950/30'>
                <div className='mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-pink-500'>
                  <span className='text-xl'>🎬</span>
                </div>
                <h4 className='mb-1 font-semibold text-purple-700 dark:text-purple-300'>
                  Create Video
                </h4>
                <p className='text-center text-xs text-purple-600/70 dark:text-purple-400/70'>
                  PixVerse v4.5 transforms image into cinematic motion
                </p>
              </div>

              <div className='flex flex-col items-center rounded-xl border border-green-200/50 bg-gradient-to-br from-green-50 to-emerald-50 p-4 dark:border-green-800/50 dark:from-green-950/30 dark:to-emerald-950/30'>
                <div className='mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-green-500 to-emerald-500'>
                  <span className='text-xl'>🔥</span>
                </div>
                <h4 className='mb-1 font-semibold text-green-700 dark:text-green-300'>
                  Viral Hook
                </h4>
                <p className='text-center text-xs text-green-600/70 dark:text-green-400/70'>
                  Proven attention-grabbing opening lines
                </p>
              </div>

              <div className='flex flex-col items-center rounded-xl border border-orange-200/50 bg-gradient-to-br from-orange-50 to-red-50 p-4 dark:border-orange-800/50 dark:from-orange-950/30 dark:to-red-950/30'>
                <div className='mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-red-500'>
                  <span className='text-xl'>📝</span>
                </div>
                <h4 className='mb-1 font-semibold text-orange-700 dark:text-orange-300'>
                  Add Caption
                </h4>
                <p className='text-center text-xs text-orange-600/70 dark:text-orange-400/70'>
                  Burn text overlay directly onto video
                </p>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className='space-y-4'>
            <div className='mb-4 flex items-center gap-3'>
              <div className='flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-green-500 to-emerald-500 text-sm font-bold text-white'>
                4
              </div>
              <h3 className='text-lg font-semibold'>Launch creation</h3>
            </div>

            <Button
              onClick={handleCreate}
              disabled={loading || !prompt.trim()}
              className='h-16 w-full bg-gradient-to-r from-purple-600 to-pink-600 text-lg font-semibold shadow-lg shadow-purple-500/25 transition-all duration-200 hover:from-purple-700 hover:to-pink-700 hover:shadow-xl hover:shadow-purple-500/30'
              size='lg'
            >
              {loading ? (
                <>
                  <Loader2 className='mr-3 h-6 w-6 animate-spin' />
                  Creating your masterpiece...
                </>
              ) : (
                <>
                  <Play className='mr-3 h-6 w-6' />
                  Create Video Now
                  <ArrowRight className='ml-2 h-5 w-5' />
                </>
              )}
            </Button>

            <p className='text-center text-sm text-slate-500 dark:text-slate-400'>
              ⚡ Usually takes 2-3 minutes • 🎯 Optimized for virality
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Quick Examples */}
      <Card className='border-0 bg-white/60 shadow-lg backdrop-blur-lg dark:bg-slate-900/60'>
        <CardContent className='p-6'>
          <div className='mb-4 flex items-center gap-2'>
            <Sparkles className='h-5 w-5 text-purple-500' />
            <h3 className='text-lg font-semibold'>Need inspiration?</h3>
          </div>

          <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
            {[
              {
                text: 'Jesus walking on water during golden hour',
                emoji: '🌅',
              },
              {
                text: 'Person praying in a peaceful garden at dawn',
                emoji: '🌸',
              },
              {
                text: 'Bible glowing with divine light on wooden table',
                emoji: '✨',
              },
              {
                text: 'Cross silhouette against dramatic sunset sky',
                emoji: '🌇',
              },
            ].map((example, i) => (
              <button
                key={i}
                onClick={() => setPrompt(example.text)}
                className='group rounded-xl border border-transparent p-4 text-left transition-all duration-200 hover:border-purple-200 hover:bg-purple-50/50 dark:hover:border-purple-800 dark:hover:bg-purple-950/20'
                disabled={loading}
              >
                <div className='flex items-start gap-3'>
                  <span className='text-xl transition-transform group-hover:scale-110'>
                    {example.emoji}
                  </span>
                  <span className='text-sm font-medium text-slate-700 group-hover:text-purple-700 dark:text-slate-300 dark:group-hover:text-purple-300'>
                    "{example.text}"
                  </span>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Results Section */}
      {result && result.success && (
        <Card className='border-0 bg-gradient-to-br from-green-50 to-emerald-50 shadow-xl dark:from-green-950/20 dark:to-emerald-950/20'>
          <CardContent className='p-6'>
            <div className='mb-4 flex items-center gap-2'>
              <Sparkles className='h-5 w-5 text-green-500' />
              <h3 className='text-lg font-semibold text-green-700 dark:text-green-300'>
                Content Created!
              </h3>
            </div>

            {/* Generated Content */}
            <div className='space-y-4'>
              <div className='mx-auto grid max-w-2xl grid-cols-1 gap-4 md:grid-cols-2'>
                {/* Generated Image */}
                <div className='relative'>
                  <img
                    src={result.results.image[0]}
                    alt='Generated image'
                    className='aspect-[9/16] w-full rounded-xl object-cover shadow-lg'
                  />
                  <div className='absolute top-2 right-2 flex gap-2'>
                    <Button
                      size='sm'
                      variant='secondary'
                      onClick={handleRerollImage}
                      disabled={rerollingImage}
                      title='Reroll image'
                    >
                      {rerollingImage ? (
                        <Loader2 className='h-4 w-4 animate-spin' />
                      ) : (
                        <RotateCcw className='h-4 w-4' />
                      )}
                    </Button>
                    <Button
                      size='sm'
                      variant='secondary'
                      onClick={() =>
                        window.open(result.results.image[0], '_blank')
                      }
                    >
                      <Download className='mr-1 h-4 w-4' />
                      Image
                    </Button>
                  </div>
                  <div className='absolute bottom-2 left-2'>
                    <Badge variant='secondary' className='text-xs'>
                      <Image className='mr-1 h-3 w-3' />
                      Image
                    </Badge>
                  </div>
                </div>

                {/* Generated Video */}
                {result.results.video && (
                  <div className='relative'>
                    <video
                      src={
                        Array.isArray(result.results.video)
                          ? result.results.video[0]
                          : result.results.video
                      }
                      controls
                      muted
                      autoPlay
                      loop
                      className='aspect-[9/16] w-full rounded-xl object-cover shadow-lg'
                    />

                    {/* Hook Preview Overlay - TikTok Style */}
                    {selectedHook && previewMode && (
                      <div className='pointer-events-none absolute inset-0 flex items-center justify-center p-8'>
                        <p
                          className='max-w-full text-center text-2xl leading-[1.3] font-semibold text-white'
                          style={{
                            textShadow:
                              '0 2px 4px rgba(0,0,0,0.9), 0 4px 8px rgba(0,0,0,0.7), 0 6px 12px rgba(0,0,0,0.5)',
                            fontFamily:
                              'Proxima Nova, -apple-system, BlinkMacSystemFont, sans-serif',
                          }}
                        >
                          {selectedHook}
                        </p>
                      </div>
                    )}

                    <div className='absolute top-2 right-2 flex gap-2'>
                      <Button
                        size='sm'
                        variant='secondary'
                        onClick={handleRerollVideo}
                        disabled={rerollingVideo}
                        title='Reroll video'
                      >
                        {rerollingVideo ? (
                          <Loader2 className='h-4 w-4 animate-spin' />
                        ) : (
                          <RotateCcw className='h-4 w-4' />
                        )}
                      </Button>
                      <Button
                        size='sm'
                        variant='secondary'
                        onClick={() =>
                          window.open(
                            Array.isArray(result.results.video)
                              ? result.results.video[0]
                              : result.results.video,
                            '_blank'
                          )
                        }
                      >
                        <Download className='mr-1 h-4 w-4' />
                        Video
                      </Button>
                    </div>
                    <div className='absolute bottom-2 left-2'>
                      <Badge variant='secondary' className='text-xs'>
                        <Video className='mr-1 h-3 w-3' />
                        {selectedHook && previewMode ? 'Preview' : 'Video'}
                      </Badge>
                    </div>
                  </div>
                )}
              </div>

              {/* Viral Hooks Selection */}
              {result.results.hooks && result.results.hooks.length > 0 && (
                <div className='rounded-lg border border-purple-200/50 bg-gradient-to-br from-purple-50 to-pink-50 p-4 dark:border-purple-800/50 dark:from-purple-950/20 dark:to-pink-950/20'>
                  <div className='mb-4 flex items-center justify-between'>
                    <div className='flex items-center gap-2'>
                      <Type className='h-5 w-5 text-purple-500' />
                      <h4 className='font-semibold text-purple-700 dark:text-purple-300'>
                        Choose Your Viral Hook
                      </h4>
                    </div>
                    <Button
                      size='sm'
                      variant='outline'
                      onClick={handleRerollHooks}
                      disabled={rerollingHooks}
                      title='Reroll hooks'
                      className='border-purple-300 hover:bg-purple-50 dark:border-purple-700 dark:hover:bg-purple-950/20'
                    >
                      {rerollingHooks ? (
                        <>
                          <Loader2 className='mr-1 h-4 w-4 animate-spin' />
                          Rerolling...
                        </>
                      ) : (
                        <>
                          <RotateCcw className='mr-1 h-4 w-4' />
                          Reroll
                        </>
                      )}
                    </Button>
                  </div>

                  <div className='mb-4 grid grid-cols-1 gap-2'>
                    {result.results.hooks.map((hook: string, index: number) => (
                      <button
                        key={index}
                        onClick={() => {
                          setSelectedHook(hook)
                          setPreviewMode(true)
                        }}
                        className={`rounded-lg border p-3 text-left transition-all duration-200 ${
                          selectedHook === hook
                            ? 'border-purple-400 bg-purple-100 dark:bg-purple-900/30'
                            : 'border-purple-200 bg-white/50 hover:bg-purple-50 dark:border-purple-700 dark:bg-slate-800/50 dark:hover:bg-purple-950/20'
                        }`}
                      >
                        <span className='text-sm font-medium'>{hook}</span>
                      </button>
                    ))}
                  </div>

                  {selectedHook && (
                    <div className='flex items-center gap-3 border-t border-purple-200 pt-3 dark:border-purple-700'>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => {
                          setSelectedHook(null)
                          setPreviewMode(false)
                        }}
                      >
                        Clear Selection
                      </Button>
                      <Button
                        size='sm'
                        className='bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600'
                        onClick={async () => {
                          if (!selectedHook || !result.results.video) return

                          setBurningCaption(true)
                          try {
                            const videoUrl = Array.isArray(result.results.video)
                              ? result.results.video[0]
                              : result.results.video
                            const burnedVideoUrl =
                              await burnCaptionOnAutomationVideo(
                                videoUrl,
                                selectedHook
                              )

                            // Add the burned video to results
                            setResult((prev) => ({
                              ...prev,
                              results: {
                                ...prev.results,
                                burnedVideo: burnedVideoUrl,
                                selectedHook: selectedHook,
                              },
                            }))

                            toast.success('Caption burned onto video! 🔥')
                          } catch (error) {
                            console.error('Failed to burn caption:', error)
                            toast.error('Failed to burn caption')
                          } finally {
                            setBurningCaption(false)
                          }
                        }}
                        disabled={burningCaption}
                      >
                        {burningCaption ? (
                          <>
                            <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                            Burning Caption...
                          </>
                        ) : (
                          <>
                            <Type className='mr-2 h-4 w-4' />
                            Burn Caption on Video
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Final Video with Caption */}
              {result.results.burnedVideo && (
                <div className='rounded-lg border border-green-200/50 bg-gradient-to-br from-green-50 to-emerald-50 p-4 dark:border-green-800/50 dark:from-green-950/20 dark:to-emerald-950/20'>
                  <div className='mb-4 flex items-center gap-2'>
                    <Sparkles className='h-5 w-5 text-green-500' />
                    <h4 className='font-semibold text-green-700 dark:text-green-300'>
                      Final Video Ready!
                    </h4>
                  </div>

                  <div className='mx-auto max-w-sm'>
                    <div className='relative'>
                      <video
                        src={result.results.burnedVideo}
                        controls
                        muted
                        autoPlay
                        loop
                        className='aspect-[9/16] w-full rounded-xl object-cover shadow-lg'
                      />
                      <div className='absolute top-2 right-2'>
                        <Button
                          size='sm'
                          variant='secondary'
                          onClick={() =>
                            window.open(result.results.burnedVideo, '_blank')
                          }
                        >
                          <Download className='mr-1 h-4 w-4' />
                          Download Final
                        </Button>
                      </div>
                      <div className='absolute bottom-2 left-2'>
                        <Badge
                          variant='secondary'
                          className='bg-green-100 text-xs text-green-700 dark:bg-green-900 dark:text-green-300'
                        >
                          <Type className='mr-1 h-3 w-3' />
                          With Hook
                        </Badge>
                      </div>
                    </div>

                    <div className='mt-3 rounded-lg bg-white/60 p-3 dark:bg-slate-900/60'>
                      <p className='text-muted-foreground mb-1 text-xs'>
                        Selected Hook:
                      </p>
                      <p className='text-sm font-medium'>
                        "{result.results.selectedHook}"
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Next Steps */}
              <div className='rounded-lg bg-white/60 p-4 dark:bg-slate-900/60'>
                <p className='mb-3 text-sm font-medium'>Progress:</p>
                <div className='grid grid-cols-1 gap-3 md:grid-cols-3'>
                  {result.results.video ? (
                    <Button
                      variant='outline'
                      className='justify-start border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950'
                    >
                      <Video className='mr-2 h-4 w-4 text-green-600' />
                      Video Generated
                      <span className='ml-auto rounded bg-green-100 px-2 py-1 text-xs text-green-700 dark:bg-green-900 dark:text-green-300'>
                        ✓ Done
                      </span>
                    </Button>
                  ) : (
                    <Button variant='outline' className='justify-start'>
                      <Video className='mr-2 h-4 w-4' />
                      Generate Video
                      <span className='ml-auto rounded bg-blue-100 px-2 py-1 text-xs dark:bg-blue-900'>
                        In Progress
                      </span>
                    </Button>
                  )}

                  {result.results.hooks ? (
                    <Button
                      variant='outline'
                      className='justify-start border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950'
                    >
                      <Type className='mr-2 h-4 w-4 text-green-600' />
                      Hooks Generated
                      <span className='ml-auto rounded bg-green-100 px-2 py-1 text-xs text-green-700 dark:bg-green-900 dark:text-green-300'>
                        ✓ Done
                      </span>
                    </Button>
                  ) : (
                    <Button variant='outline' className='justify-start'>
                      <Type className='mr-2 h-4 w-4' />
                      Generate Hooks
                      <span className='ml-auto rounded bg-blue-100 px-2 py-1 text-xs dark:bg-blue-900'>
                        In Progress
                      </span>
                    </Button>
                  )}

                  {result.results.burnedVideo ? (
                    <Button
                      variant='outline'
                      className='justify-start border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950'
                    >
                      <Sparkles className='mr-2 h-4 w-4 text-green-600' />
                      Caption Burned
                      <span className='ml-auto rounded bg-green-100 px-2 py-1 text-xs text-green-700 dark:bg-green-900 dark:text-green-300'>
                        ✓ Complete
                      </span>
                    </Button>
                  ) : (
                    <Button variant='outline' className='justify-start'>
                      <Sparkles className='mr-2 h-4 w-4' />
                      Burn Caption
                      <span className='ml-auto rounded bg-purple-100 px-2 py-1 text-xs dark:bg-purple-900'>
                        Select Hook
                      </span>
                    </Button>
                  )}
                </div>
              </div>

              <Button
                variant='ghost'
                onClick={() => {
                  setResult(null)
                  setOriginalPrompt('')
                  setSelectedHook(null)
                  setPreviewMode(false)
                }}
                className='w-full'
              >
                Create Another
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
