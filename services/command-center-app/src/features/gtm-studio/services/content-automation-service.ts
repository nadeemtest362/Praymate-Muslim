// Content Automation Service - Simplified automation
import { generateImage, generateVideo } from './replicate-service'

// Video caption burning service using EXACT same service as Jesus workflow
async function burnCaptionOnVideo(
  videoUrl: string,
  caption: string
): Promise<string> {
  console.log('Caption burning requested for video:', { videoUrl, caption })

  try {
    // Use the same FFmpeg service as Production Studio Jesus workflow
    const IMAGE_GEN_URL =
      import.meta.env.VITE_IMAGE_GEN_URL ||
      'https://cc-image-gen-service-production.up.railway.app'

    // Clean caption text same as Jesus workflow
    let cleanedCaption = caption
      .replace(/\n\n+/g, ' ') // Replace double newlines with space
      .replace(/\n/g, ' ') // Replace single newlines with space
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .trim()

    // Smart line breaking for better formatting
    const words = cleanedCaption.split(' ')
    if (words.length > 8) {
      // For long captions, break into 2 lines at a natural point
      const midPoint = Math.floor(words.length / 2)
      const firstLine = words.slice(0, midPoint).join(' ')
      const secondLine = words.slice(midPoint).join(' ')
      cleanedCaption = `${firstLine}\n${secondLine}`
    }

    console.log(
      'Sending caption burn request to:',
      `${IMAGE_GEN_URL}/api/video/add-caption`
    )
    console.log('Request payload:', {
      videoUrl: videoUrl,
      caption: cleanedCaption,
      style: 'tiktok',
    })

    const response = await fetch(`${IMAGE_GEN_URL}/api/video/add-caption`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        videoUrl: videoUrl,
        caption: cleanedCaption,
        style: 'tiktok', // Same style as Jesus workflow
        // Add text formatting options to prevent wrapping
        fontSize: 72,
        maxWidth: 900,
        textAlign: 'center',
        fontWeight: 'bold',
        fontFamily: 'Arial, sans-serif',
      }),
    })

    console.log('Caption burn response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Caption burning service error response:', errorText)
      let error
      try {
        error = JSON.parse(errorText)
      } catch {
        error = { error: errorText || response.statusText }
      }
      throw new Error(
        error.error ||
          error.message ||
          `Caption service error: ${response.statusText}`
      )
    }

    const result = await response.json()
    console.log('Caption burning response:', result)

    // Check all possible response fields for the processed video URL
    const processedUrl =
      result.processedVideoUrl || result.videoUrl || result.url || result.output
    if (!processedUrl) {
      console.error('No processed video URL in response:', result)
      throw new Error('Caption burning completed but no video URL returned')
    }

    return processedUrl
  } catch (error) {
    console.error('Failed to burn caption on video:', error)
    throw error
  }
}

// Simple automation: Just generate an image for now, skip the complex pipeline
export async function createSimpleContentPipeline(
  prompt: string,
  accountUsername?: string,
  modelId = 'black-forest-labs/flux-1.1-pro-ultra'
) {
  console.log('🚀 Starting simple content creation...')
  console.log('📝 Prompt:', prompt)
  console.log('🎨 Model:', modelId)

  try {
    // Step 1: Generate a high-quality image
    console.log('🎨 Generating image...')
    const imageResult = await generateImage(prompt, modelId, {
      width: 1080, // Standard TikTok width
      height: 1920, // 9:16 aspect ratio (1080x1920)
      raw: false, // Turn off raw mode for better stylization
      num_outputs: 1,
    })

    console.log('✅ Image generated:', imageResult)

    // Step 2: Generate video from the image using Jesus workflow model
    console.log('🎬 Generating video from image...')
    const videoResult = await generateVideo(
      imageResult[0], // Use the first generated image
      'pixverse/pixverse-v4.5', // Same model as Jesus workflow
      {
        prompt:
          'Smooth cinematic motion, subtle animation, professional quality', // Same as Jesus workflow
        quality: '720p',
        duration: 5,
        aspect_ratio: '9:16',
      }
    )

    console.log('✅ Video generated:', videoResult)

    // Step 3: Generate viral hooks for the content
    console.log('🔥 Generating viral hooks...')
    const hooksResult = await generateViralHooks(prompt)

    console.log('✅ Hooks generated:', hooksResult)

    // Return image, video, and hooks
    const result = {
      success: true,
      results: {
        image: imageResult,
        video: videoResult,
        hooks: hooksResult,
        status:
          'Content created! Choose a hook to preview and burn onto video.',
      },
    }

    console.log('🎉 Returning result:', result)
    return result
  } catch (error) {
    console.error('❌ Pipeline failed:', error)
    return {
      success: false,
      error: error.message,
    }
  }
}

// Burn caption on video (creates a new video with caption burned in)
export async function burnCaptionOnAutomationVideo(
  videoUrl: string,
  caption: string
): Promise<string> {
  try {
    console.log('🔥 Burning caption on video:', { videoUrl, caption })

    // This would integrate with the same FFmpeg service used in Production Studio
    // For now, we'll simulate the video burning process
    const burnedVideoUrl = await burnCaptionOnVideo(videoUrl, caption)

    console.log('✅ Caption burned on video:', burnedVideoUrl)
    return burnedVideoUrl
  } catch (error) {
    console.error('❌ Failed to burn caption:', error)
    throw error
  }
}

// Generate viral hooks for content using ACTUAL proven Jesus-specific viral hooks
export async function generateViralHooks(prompt: string): Promise<string[]> {
  // REAL viral JESUS hooks that hit pain points and trigger deep emotions
  const jesusViralHooks = [
    "POV: You're struggling with addiction and someone tells you Jesus loves you...",
    'Why did Jesus choose to be born poor if God owns everything?',
    "Jesus said 'follow me' but your family thinks you're crazy for believing",
    'POV: You prayed for years and God was silent, then Jesus shows up when you least expect it',
    "If Jesus died for everyone, why do Christians act like they're better than everyone else?",
    'Jesus was cancelled by his own people... sound familiar?',
    "You know that voice in your head telling you you're not enough? Jesus died to silence that lie",
    'Jesus had panic attacks too (Matthew 26:37-38)',
    'Jesus chose 12 friends and still got betrayed... your trust issues are valid',
    'If Jesus can forgive the people who killed him, maybe he can forgive what you did last night',
    'Jesus was homeless and broke... he gets your financial stress',
    "POV: Everyone's praying for a miracle and you're just praying to make it through today",
    "Jesus cried when his friend died even though he knew he'd raise him... grief is holy",
    "You think you're too far gone? Jesus literally saved a terrorist on a cross",
    'Jesus got angry and flipped tables... your righteous anger is not sin',
    "POV: You're the only Christian in your friend group and they think you're brainwashed",
    "Jesus chose fishermen over PhDs... God doesn't need your credentials",
    'If Jesus is real, why did my prayers go unanswered when I needed him most?',
    "Jesus said 'it is finished' but your healing feels like it's just beginning",
    "POV: You've been hurt by the church but can't let go of Jesus",
    "Jesus didn't come to make bad people good, he came to make dead people alive",
    "You're not too broken for Jesus... he specializes in ruins",
    "Jesus asked 'why have you forsaken me?' He knows what it feels like to be abandoned",
    "POV: You're losing your faith and everyone's telling you to just pray harder",
    'Jesus hung out with prostitutes and tax collectors... who are you judging?',
    'If Jesus loves everyone the same, why does life feel so unfair?',
    "Jesus was accused of being drunk and crazy... following him isn't always pretty",
    "POV: You're struggling and someone says 'Jesus has a plan for your life'",
    "Jesus said 'take up your cross'... he never promised easy",
    'You think your mental illness disqualifies you? Jesus chose Paul who murdered Christians',
    "Jesus wept over a city that rejected him... he's weeping over your pain too",
    "POV: You're gay and Christians say Jesus doesn't love you",
    "Jesus touched lepers when everyone else ran away... he's not afraid of your mess",
    'If Jesus rose from the dead, why does depression still feel so heavy?',
    "Jesus said 'I will never leave you'... where was he when trauma happened?",
    "POV: You're tired of performing Christianity and just want to be loved",
    'Jesus called Judas friend even after the betrayal... forgiveness hits different',
    "You're not backsliding, you're learning that grace isn't earned",
    'Jesus spent 40 days alone in the desert... he understands isolation',
    'POV: Your pastor failed you but Jesus never did',
    "Jesus said 'blessed are those who mourn'... your tears matter to God",
    'If Jesus conquered death, why does anxiety feel so alive in your chest?',
    "Jesus was tempted in every way but didn't sin... he gets your struggle without judgment",
    "POV: You're deconstructing your faith and people say you're losing Jesus",
    'Jesus asked God to remove his suffering and God said no... unanswered prayers are biblical',
    "You're not too much for Jesus... he made you exactly as you are",
    "Jesus chose to be born in a barn, not a palace... he's comfortable with your mess",
    "POV: You feel guilty for struggling when you 'should' trust Jesus more",
    "Jesus said 'my yoke is easy' but life feels impossible right now",
  ]

  // Return 5 random Jesus-focused hooks from actual viral content
  console.log(
    '🎯 Generating hooks from',
    jesusViralHooks.length,
    'available hooks'
  )

  // Better randomization using Fisher-Yates shuffle
  const shuffled = [...jesusViralHooks]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  const selected = shuffled.slice(0, 5)
  console.log('🎯 Selected hooks:', selected)
  return selected
}

// Scheduled automation - runs daily at specified time
export async function scheduleContentCreation(
  prompts: string[],
  accountUsername: string,
  scheduleTime: string // e.g., "09:00"
) {
  const workflow: Workflow = {
    id: `scheduled-${Date.now()}`,
    name: 'Daily Content Automation',
    description: 'Creates content automatically each day',
    steps: [
      // Trigger: Daily schedule
      {
        id: 'trigger',
        type: 'trigger',
        triggerId: 'schedule',
        config: {
          schedule: 'daily',
          time: scheduleTime,
        },
      },

      // Generate content for each prompt
      ...prompts.flatMap((prompt, index) => [
        {
          id: `image-${index}`,
          type: 'action',
          actionId: 'generate-image',
          modelId: 'flux-schnell',
          modelProvider: 'replicate',
          config: {
            prompt: prompt,
            aspect_ratio: '9:16',
          },
        },
        {
          id: `video-${index}`,
          type: 'action',
          actionId: 'create-video',
          modelId: 'stable-video-diffusion',
          modelProvider: 'replicate',
          config: {
            input_image: `{{step_${index * 2 + 1}_result.url}}`,
            video_length: 'short',
          },
        },
      ]),

      // Final step: Queue for posting
      {
        id: 'queue-content',
        type: 'action',
        actionId: 'schedule-post',
        config: {
          account: accountUsername,
          schedule_time: 'next_available_slot',
        },
      },
    ],
    status: 'active',
    createdAt: new Date(),
    runCount: 0,
  }

  return workflow
}

// Batch automation - process multiple prompts in sequence
export async function batchCreateContent(
  prompts: string[],
  options?: {
    accountUsername?: string
    addHooks?: boolean
    addCaptions?: boolean
    queueForPosting?: boolean
  }
) {
  const results = []

  for (const prompt of prompts) {
    console.log(`Processing prompt: ${prompt}`)

    try {
      const result = await createSimpleContentPipeline(
        prompt,
        options?.accountUsername
      )
      results.push({
        prompt,
        success: result.success,
        result: result.results,
        error: result.error,
      })

      // Add delay between requests to avoid rate limits
      await new Promise((resolve) => setTimeout(resolve, 2000))
    } catch (error) {
      console.error(`Failed to process prompt: ${prompt}`, error)
      results.push({
        prompt,
        success: false,
        error: error.message,
      })
    }
  }

  return results
}

// Quick start templates
export const AUTOMATION_TEMPLATES = {
  SIMPLE_PIPELINE: 'Simple: Prompt → Image → Video → Hook → Caption',
  DAILY_SCHEDULER: 'Daily: Automated content creation at scheduled time',
  BATCH_PROCESSOR: 'Batch: Process multiple prompts in sequence',
  VIRAL_OPTIMIZER: 'Advanced: A/B test hooks and optimize for engagement',
}

// Test automation with sample prompts
export async function testAutomation() {
  const testPrompts = [
    'Jesus walking on water, golden hour lighting, cinematic',
    'Person praying in peaceful garden, soft morning light',
    'Bible open with glowing text, warm ambient lighting',
  ]

  console.log('Testing automation with sample prompts...')

  const result = await batchCreateContent(testPrompts, {
    addHooks: true,
    addCaptions: true,
  })

  console.log('Automation test results:', result)
  return result
}
