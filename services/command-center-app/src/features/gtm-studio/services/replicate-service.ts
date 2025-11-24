// Replicate API integration
// Note: Direct browser API calls to Replicate are blocked by CORS
// Solutions:
// 1. Use a backend proxy endpoint
// 2. Use Vercel/Netlify functions
// 3. Use mock mode for development

const REPLICATE_API_KEY = import.meta.env.VITE_REPLICATE_API_KEY || ''
const USE_MOCK = false // ALWAYS use real API

// Use image generation service
async function runReplicateThroughProxy(modelId: string, options: any) {
  // Use dedicated image gen service (local or Railway)
  const IMAGE_GEN_URL =
    import.meta.env.VITE_IMAGE_GEN_URL || 'https://cc-image-gen-service-production.up.railway.app'

  console.log(`🖼️ Calling image service at: ${IMAGE_GEN_URL}`)

  try {
    // Set timeout based on model type
    const isVideoModel =
      modelId.includes('video') ||
      modelId.includes('i2v') ||
      modelId.includes('wan-2.1') ||
      modelId.includes('pixverse')
    const timeoutMs = isVideoModel ? 25 * 60 * 1000 : 10 * 60 * 1000 // 25 min for video, 10 min for images

    // Create abort controller for timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    const response = await fetch(`${IMAGE_GEN_URL}/api/replicate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelId,
        input: options.input,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: response.statusText }))
      console.error('Image service error:', error)
      throw new Error(
        error.error || `Image service error: ${response.statusText}`
      )
    }

    const result = await response.json()
    return result.output
  } catch (error: any) {
    console.error('Failed to connect to image service:', error)

    // Handle abort error
    if (error.name === 'AbortError') {
      throw new Error(
        'Request timed out. The generation is taking longer than expected, possibly due to queue. ' +
          'Try again later or use a different model.'
      )
    }

    // Provide helpful error message
    if (
      error.message.includes('fetch failed') ||
      error.message.includes('ECONNREFUSED')
    ) {
      throw new Error(
        'Image generation service is not reachable. ' +
          'Please ensure the service is running and VITE_IMAGE_GEN_URL is set correctly.'
      )
    }

    throw error
  }
}

// Main run function
async function runReplicate(modelId: string, options: any) {
  // ALWAYS try to use real API through proxy
  try {
    console.log('🚀 Running REAL Replicate API:', modelId)
    return await runReplicateThroughProxy(modelId, options)
  } catch (error) {
    console.error('Replicate API error:', error)
    throw error // Don't fall back to mock - show the real error
  }
}

// Available Replicate models for different use cases
export const REPLICATE_MODELS = {
  // Image generation models
  image: [
    {
      id: 'black-forest-labs/flux-1.1-pro-ultra',
      name: 'FLUX 1.1 Pro Ultra',
      provider: 'Black Forest Labs',
      description: 'Ultra high-res (4MP) with raw mode for realism',
      type: 'image',
      costPer1K: 60, // $0.06 per image
    },
    {
      id: 'google/imagen-4',
      name: 'Imagen 4',
      provider: 'Google',
      description: 'Flagship model with exceptional detail and typography',
      type: 'image',
      costPer1K: 0.5, // $0.0005 per image (estimate)
    },
    {
      id: 'black-forest-labs/flux-schnell:5599ed30703defd1d160a25a63321b4dec97101d98b4674bcc56e41f62f35637',
      name: 'FLUX Schnell',
      provider: 'Black Forest Labs',
      description: 'Fast high-quality images',
      type: 'image',
      costPer1K: 0.36, // $0.00036 per image
    },
    {
      id: 'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b',
      name: 'SDXL',
      provider: 'Stability AI',
      description: 'High-quality image generation',
      type: 'image',
      costPer1K: 0.32, // $0.00032 per image
    },
    {
      id: 'lucataco/dreamshaper-xl-v2-turbo:0a1710e0187b01a255302738ca0158ff02a22a4638679533e111082f9dd1b615',
      name: 'DreamShaper XL Turbo',
      provider: 'LucaTaco',
      description: 'Fast artistic image generation',
      type: 'image',
      costPer1K: 0.28, // $0.00028 per image
    },
  ],

  // Video generation models
  video: [
    {
      id: 'pixverse/pixverse-v4.5',
      name: 'PixVerse v4.5',
      provider: 'PixVerse',
      description: 'Fast 5-8s videos with enhanced motion and text rendering',
      type: 'video',
      costPer1K: 40, // $0.40 for 5s 720p
    },
    {
      id: 'wavespeedai/wan-2.1-i2v-720p',
      name: 'Wan 2.1 I2V 720p',
      provider: 'WaveSpeed AI',
      description: 'High-quality image-to-video generation',
      type: 'video',
      costPer1K: 20, // Estimate based on quality
    },
    {
      id: 'stability-ai/stable-video-diffusion:3f0457e4619daac51203dedb472816fd4af51f3149fa7a9e0b5ffcf1b8172438',
      name: 'Stable Video Diffusion',
      provider: 'Stability AI',
      description: 'Image-to-video generation with stable diffusion',
      type: 'video',
      costPer1K: 15, // Estimate based on quality
    },
  ],

  // Audio/Music models
  audio: [
    {
      id: 'riffusion/riffusion:8cf61ea6c56afd61d8f5b9ffd14d7c216c0a93844ce2d82ac1c9ecc9c7f24e05',
      name: 'Riffusion',
      provider: 'Riffusion',
      description: 'Music generation from text',
      type: 'audio',
      costPer1K: 2, // $0.002 per audio
    },
    {
      id: 'suno-ai/bark:b76242b40d67c76ab6742e987628a2a9ac019e11d56ab96c4e91ce03b79b2787',
      name: 'Bark',
      provider: 'Suno AI',
      description: 'Realistic voice synthesis',
      type: 'audio',
      costPer1K: 1.5, // $0.0015 per audio
    },
  ],

  // Language models (specialized)
  language: [
    {
      id: 'meta/llama-2-70b-chat:2d19859030ff705a87c746f7e96eea03aefb71f166725aee39692f1476566d48',
      name: 'Llama 2 70B Chat',
      provider: 'Meta',
      description: 'Large language model for chat',
      type: 'text',
      costPer1K: 0.65, // $0.00065 per 1K tokens
    },
    {
      id: 'mistralai/mixtral-8x7b-instruct-v0.1:7b3212fbaf88310cfef07a061ce94224e82efc8403c26fc67e8f6c065de51f21',
      name: 'Mixtral 8x7B',
      provider: 'Mistral AI',
      description: 'MoE model for efficiency',
      type: 'text',
      costPer1K: 0.45, // $0.00045 per 1K tokens
    },
  ],

  // Specialized models
  specialized: [
    {
      id: 'salesforce/blip:2e1dddc8621f72155f24cf2e0adbde548458d3cab9f00c0139eea840d0ac4746',
      name: 'BLIP',
      provider: 'Salesforce',
      description: 'Image captioning and Q&A',
      type: 'vision',
      costPer1K: 0.22, // $0.00022 per image
    },
    {
      id: 'xinntao/realesrgan:1b976a4d456ed9e4d1a846597b7614e79eadad3032e9124fa63859db0fd59b56',
      name: 'Real-ESRGAN',
      provider: 'xinntao',
      description: 'Image upscaling and enhancement',
      type: 'vision',
      costPer1K: 0.46, // $0.00046 per image
    },
    {
      id: 'sczhou/codeformer:7de2ea26c616d5bf2245ad0d5e24f0ff9a6204578a5c876db53142edd9d2cd56',
      name: 'CodeFormer',
      provider: 'sczhou',
      description: 'Face restoration',
      type: 'vision',
      costPer1K: 0.32, // $0.00032 per image
    },
  ],

  // Context-aware models (new category for FLUX Kontext)
  contextual: [
    {
      id: 'black-forest-labs/flux-1-kontext-dev:4f5c0e5e6c1a4b5c8f5e5e6c1a4b5c8f5e5e6c1a4b5c8f5e5e6c1a4b5c8f',
      name: 'FLUX 1 [Kontext] Dev',
      provider: 'Black Forest Labs',
      description:
        'Character consistency & style transfer with reference images',
      type: 'contextual',
      costPer1K: 0.5, // $0.0005 per image
    },
  ],
}

// Get recommended Replicate model for specific task
export function getRecommendedReplicateModel(
  taskType: string,
  mediaType: 'image' | 'video' | 'audio' | 'text' = 'image'
) {
  switch (taskType) {
    case 'generate-image':
      return REPLICATE_MODELS.image[0] // FLUX 1.1 Pro Ultra

    case 'contextual-image':
      return REPLICATE_MODELS.contextual[0] // FLUX Kontext

    case 'generate-video':
    case 'create-video':
      return REPLICATE_MODELS.video[0] // PixVerse v4.5

    case 'generate-audio':
    case 'generate-music':
      return REPLICATE_MODELS.audio[0] // Riffusion

    case 'generate-voice':
      return REPLICATE_MODELS.audio[1] // Bark

    case 'upscale-image':
      return REPLICATE_MODELS.specialized[1] // Real-ESRGAN

    case 'caption-image':
      return REPLICATE_MODELS.specialized[0] // BLIP

    default:
      return REPLICATE_MODELS.image[0] // FLUX 1.1 Pro Ultra as default
  }
}

// Generate image with Replicate
export async function generateImage(
  prompt: string,
  modelId = 'black-forest-labs/flux-1.1-pro-ultra',
  options?: {
    negative_prompt?: string
    width?: number
    height?: number
    num_outputs?: number
    guidance_scale?: number
    num_inference_steps?: number
    reference_image?: string // For FLUX Kontext
    style_reference?: string // For style transfer
    raw?: boolean // For FLUX 1.1 Pro Ultra
    safety_tolerance?: number // For FLUX 1.1 Pro Ultra (1-5)
    output_format?: string // For FLUX 1.1 Pro Ultra
  }
) {
  try {
    // Different models have different parameters
    const isFluxSchnell = modelId.includes('flux-schnell')
    const isImagen4 = modelId.includes('imagen-4')
    const isFluxUltra = modelId.includes('flux-1.1-pro-ultra')

    const input: any = {
      prompt,
      width: options?.width || 1024,
      height: options?.height || 1024,
      num_outputs: options?.num_outputs || 1,
    }

    // Handle different model parameters
    if (isFluxUltra) {
      // FLUX 1.1 Pro Ultra uses aspect_ratio instead of width/height
      const width = options?.width || 1024
      const height = options?.height || 1024

      // Map dimensions to aspect ratios
      if (width === 720 && height === 1280) {
        input.aspect_ratio = '9:16'
      } else if (width === 1080 && height === 1920) {
        input.aspect_ratio = '9:16' // Add support for 1080x1920
      } else if (width === 1280 && height === 720) {
        input.aspect_ratio = '16:9'
      } else if (width === 1024 && height === 1024) {
        input.aspect_ratio = '1:1'
      } else if (width === 1024 && height === 768) {
        input.aspect_ratio = '4:3'
      } else if (width === 768 && height === 1024) {
        input.aspect_ratio = '3:4'
      } else if (width === 2048 && height === 2048) {
        input.aspect_ratio = '1:1' // 4MP square
      } else if (width === 2560 && height === 1600) {
        input.aspect_ratio = '16:10' // 4MP wide
      } else {
        // Default to 1:1 if we can't match
        input.aspect_ratio = '1:1'
      }

      // FLUX 1.1 Pro Ultra specific parameters
      input.raw = options?.raw !== undefined ? options.raw : false
      input.safety_tolerance = options?.safety_tolerance || 3
      input.output_format = options?.output_format || 'png' // FLUX Ultra only supports jpg or png

      // Remove unsupported parameters
      delete input.width
      delete input.height
      delete input.num_outputs
    } else if (isImagen4) {
      // Google Imagen 4 uses aspect ratio instead of width/height
      const width = options?.width || 1024
      const height = options?.height || 1024

      // Map dimensions to aspect ratios
      if (width === 720 && height === 1280) {
        input.aspect_ratio = '9:16'
      } else if (width === 1080 && height === 1920) {
        input.aspect_ratio = '9:16' // Add support for 1080x1920
      } else if (width === 1280 && height === 720) {
        input.aspect_ratio = '16:9'
      } else if (width === 1024 && height === 1024) {
        input.aspect_ratio = '1:1'
      } else if (width === 1024 && height === 768) {
        input.aspect_ratio = '4:3'
      } else if (width === 768 && height === 1024) {
        input.aspect_ratio = '3:4'
      } else {
        // Default to 1:1 if we can't match
        input.aspect_ratio = '1:1'
      }

      // Imagen 4 specific parameters
      input.safety_filter_level = 'block_medium_and_above'

      // Remove unsupported parameters
      delete input.width
      delete input.height
      delete input.num_outputs
    } else if (isFluxSchnell) {
      // FLUX Schnell has max 4 steps
      input.num_inference_steps = Math.min(options?.num_inference_steps || 4, 4)
    } else {
      // Other models (like SDXL) parameters
      input.negative_prompt = options?.negative_prompt
      input.guidance_scale = options?.guidance_scale || 7.5
      input.num_inference_steps = options?.num_inference_steps || 25
    }

    // Add FLUX Kontext specific inputs
    if (modelId.includes('kontext') && options?.reference_image) {
      input.reference_image = options.reference_image
      input.style_reference = options.style_reference
    }

    const prediction = await runReplicate(modelId, { input })

    console.log('Raw prediction result:', prediction)

    // FLUX 1.1 Pro Ultra and Imagen 4 return a single URL string, not an array
    if ((isFluxUltra || isImagen4) && typeof prediction === 'string') {
      console.log(
        `Converting ${isFluxUltra ? 'FLUX Ultra' : 'Imagen 4'} string to array:`,
        [prediction]
      )
      return [prediction]
    }

    // Ensure we always return an array
    if (!Array.isArray(prediction)) {
      console.log('Converting non-array result to array:', [prediction])
      return [prediction]
    }

    return prediction
  } catch (error) {
    console.error('Replicate image generation error:', error)
    throw error
  }
}

// Generate contextual image with FLUX Kontext
export async function generateContextualImage(
  prompt: string,
  referenceImage: string,
  options?: {
    style_reference?: string
    character_consistency?: boolean
    local_editing?: boolean
    width?: number
    height?: number
  }
) {
  try {
    const modelId =
      'black-forest-labs/flux-1-kontext-dev:4f5c0e5e6c1a4b5c8f5e5e6c1a4b5c8f5e5e6c1a4b5c8f5e5e6c1a4b5c8f'

    const prediction = await runReplicate(modelId, {
      input: {
        prompt,
        reference_image: referenceImage,
        style_reference: options?.style_reference,
        character_consistency: options?.character_consistency || true,
        local_editing: options?.local_editing || false,
        width: options?.width || 1024,
        height: options?.height || 1024,
      },
    })

    return prediction
  } catch (error) {
    console.error('FLUX Kontext generation error:', error)
    throw error
  }
}

// Generate video with Replicate
export async function generateVideo(
  imageUrl: string,
  modelId = 'pixverse/pixverse-v4.5',
  options?: {
    prompt?: string
    fps?: number
    motion_bucket_id?: number
    cond_aug?: number
    num_frames?: number
    max_area?: string
    sample_steps?: number
    sample_guide_scale?: number
    sample_shift?: number
    fast_mode?: string
    // PixVerse specific
    quality?: string
    aspect_ratio?: string
    duration?: number
    motion_mode?: string
    negative_prompt?: string
    style?: string
    effect?: string
  }
) {
  try {
    // Check model type
    const isWan21 = modelId.includes('wan-2.1')
    const isPixVerse = modelId.includes('pixverse')

    let input: any

    if (isPixVerse) {
      // PixVerse specific parameters
      input = {
        image: imageUrl,
        prompt: options?.prompt || 'cinematic motion, smooth camera movement',
        quality: options?.quality || '720p',
        aspect_ratio: options?.aspect_ratio || '16:9',
        duration: options?.duration || 5,
        motion_mode: options?.motion_mode || 'normal',
        negative_prompt: options?.negative_prompt || '',
        style: options?.style || 'None',
        effect: options?.effect || 'None',
      }
    } else if (isWan21) {
      // Wan 2.1 specific parameters
      input = {
        image: imageUrl,
        prompt:
          options?.prompt || 'the image comes to life with natural motion',
        num_frames: options?.num_frames || 81, // 81 frames recommended for best results
        max_area: options?.max_area || '1280x720',
        frames_per_second: options?.fps || 16,
        sample_steps: options?.sample_steps || 30,
        sample_guide_scale: options?.sample_guide_scale || 6,
        sample_shift: options?.sample_shift || 8,
        // fast_mode is optional, leave undefined for best quality
      }

      // Add fast_mode if specified
      if (options?.fast_mode) {
        input.fast_mode = options.fast_mode
      }
    } else {
      // Legacy Stable Video Diffusion parameters
      input = {
        input_image: imageUrl,
        fps: options?.fps || 25,
        motion_bucket_id: options?.motion_bucket_id || 127,
        cond_aug: options?.cond_aug || 0.02,
      }
    }

    const prediction = await runReplicate(modelId, { input })

    return prediction
  } catch (error) {
    console.error('Replicate video generation error:', error)
    throw error
  }
}

// Generate audio/music with Replicate
export async function generateAudio(
  prompt: string,
  modelId = 'riffusion/riffusion:8cf61ea6c56afd61d8f5b9ffd14d7c216c0a93844ce2d82ac1c9ecc9c7f24e05',
  options?: {
    duration?: number
    alpha?: number
    num_inference_steps?: number
  }
) {
  try {
    const prediction = await runReplicate(modelId, {
      input: {
        prompt_a: prompt,
        duration: options?.duration || 5,
        alpha: options?.alpha || 0.5,
        num_inference_steps: options?.num_inference_steps || 50,
      },
    })

    return prediction
  } catch (error) {
    console.error('Replicate audio generation error:', error)
    throw error
  }
}

// Generate voice with Bark
export async function generateVoice(
  text: string,
  options?: {
    voice_preset?: string
    output_full?: boolean
  }
) {
  try {
    const prediction = await runReplicate(
      'suno-ai/bark:b76242b40d67c76ab6742e987628a2a9ac019e11d56ab96c4e91ce03b79b2787',
      {
        input: {
          prompt: text,
          voice_preset: options?.voice_preset || 'bark_voice_en_speaker_1',
          output_full: options?.output_full || false,
        },
      }
    )

    return prediction
  } catch (error) {
    console.error('Replicate voice generation error:', error)
    throw error
  }
}

// Upscale image with Real-ESRGAN
export async function upscaleImage(imageUrl: string, scale: number = 4) {
  try {
    const prediction = await runReplicate(
      'xinntao/realesrgan:1b976a4d456ed9e4d1a846597b7614e79eadad3032e9124fa63859db0fd59b56',
      {
        input: {
          image: imageUrl,
          scale,
          face_enhance: true,
        },
      }
    )

    return prediction
  } catch (error) {
    console.error('Replicate upscale error:', error)
    throw error
  }
}

// Caption image with BLIP
export async function captionImage(imageUrl: string, question?: string) {
  try {
    const prediction = await runReplicate(
      'salesforce/blip:2e1dddc8621f72155f24cf2e0adbde548458d3cab9f00c0139eea840d0ac4746',
      {
        input: {
          image: imageUrl,
          task: question ? 'visual_question_answering' : 'image_captioning',
          question: question || undefined,
        },
      }
    )

    return prediction
  } catch (error) {
    console.error('Replicate caption error:', error)
    throw error
  }
}

// Generate content plan using multiple models
export async function generateContentPlan(
  taskInfo: any,
  includeVisuals: boolean = true
) {
  const results: any = {
    script: null,
    thumbnail: null,
    audio: null,
    caption: null,
  }

  try {
    // Generate script first (using OpenRouter)
    // This would be done via OpenRouter service

    if (includeVisuals) {
      // Generate thumbnail
      const thumbnailPrompt = `Professional app thumbnail for: ${taskInfo.title}. Modern, clean, mobile app aesthetic.`
      results.thumbnail = await generateImage(thumbnailPrompt)

      // Generate caption for the thumbnail
      if (results.thumbnail?.[0]) {
        results.caption = await captionImage(results.thumbnail[0])
      }

      // Generate background music
      const musicPrompt = `Upbeat, modern, tech-inspired background music for app promotion`
      results.audio = await generateAudio(musicPrompt)
    }

    return results
  } catch (error) {
    console.error('Content plan generation error:', error)
    throw error
  }
}

// Estimate costs for Replicate operations
export function estimateReplicateCost(
  modelId: string,
  count: number = 1
): { model: any; totalCost: number } {
  const allModels = [
    ...REPLICATE_MODELS.image,
    ...REPLICATE_MODELS.video,
    ...REPLICATE_MODELS.audio,
    ...REPLICATE_MODELS.language,
    ...REPLICATE_MODELS.specialized,
  ]

  const model = allModels.find((m) => m.id === modelId)
  const costPer1K = model?.costPer1K || 1
  const totalCost = (costPer1K / 1000) * count

  return { model, totalCost }
}
