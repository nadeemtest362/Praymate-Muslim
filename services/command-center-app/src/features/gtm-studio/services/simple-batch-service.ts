import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'
import Anthropic from '@anthropic-ai/sdk'
import { 
  generateImage, 
  generateVideo, 
  generateAudio
} from './replicate-service'
import { 
  uploadGeneratedImage,
  uploadGeneratedVideo 
} from './supabase-service'

// Initialize providers with your ACTUAL WORKING API keys
const openaiProvider = createOpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
})

const anthropic = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true,
})

export interface BatchPromptOptions {
  basePrompt: string
  variations: number
  templates: string[]
  varyTone?: boolean
  varyStyle?: boolean
  varyHook?: boolean
  varyLength?: boolean
  generateVideo?: boolean
  generateAudio?: boolean
  runSeed?: number
}

export interface BatchResult {
  id: string
  variant: number
  prompt: string
  pipelineType: string
  result?: string
  imageUrl?: string
  imageUrls?: string[] // Multiple images for each text overlay
  videoUrl?: string
  audioUrl?: string
  error?: string
}

// Generate prompt variations for batch processing
export async function generateBatchPrompts(options: BatchPromptOptions): Promise<string[]> {
  const uniqueId = `${options.runSeed || 0}-${Date.now()}-${Math.random()}`
  const {
    basePrompt,
    variations,
    templates,
    varyTone = true,
    varyStyle = true,
    varyHook = true,
    varyLength = true,
  } = options

  const prompts: string[] = []

  // Define variation options
  const tones = varyTone 
    ? ['uplifting', 'emotional', 'direct', 'conversational', 'inspiring'] 
    : ['default']
  
  const styles = varyStyle
    ? ['cinematic', 'testimonial', 'documentary', 'viral', 'traditional']
    : ['default']
  
  const hooks = varyHook
    ? [
        'start with a question',
        'start with a bold statement',
        'start with a story',
        'start with a statistic',
        'start with a challenge'
      ]
    : ['default']
  
  const lengths = varyLength
    ? ['15 seconds', '30 seconds', '60 seconds']
    : ['30 seconds']

  // Generate variations
  for (let i = 0; i < variations; i++) {
    const tone = tones[i % tones.length]
    const style = styles[Math.floor(i / tones.length) % styles.length]
    const hook = hooks[Math.floor(i / (tones.length * styles.length)) % hooks.length]
    const length = lengths[Math.floor(i / (tones.length * styles.length * hooks.length)) % lengths.length]
    const pipelineType = templates[i % templates.length]
    
    // Generate specific prompt for this content type
    let variedPrompt = ''
    
    // Use AI to generate FRESH, VIRAL content every time
    switch (pipelineType) {
      case 'jesus':
        variedPrompt = `Create compelling content about Jesus Christ. Focus on lesser-known stories, surprising teachings, or powerful moments from the Gospels. Make it relevant to modern struggles.

Format your response EXACTLY like this (no markdown, no bold, just plain text):
HOOK: Opening line that grabs attention
TEXT 1: Build the story/context
TEXT 2: Add surprising element
TEXT 3: Deeper meaning
REVEAL: Powerful conclusion`
        break
        
      case 'bible':
        variedPrompt = `Share a powerful Bible verse that speaks to modern struggles like anxiety, purpose, broken relationships, or feeling lost. Choose something unexpected or overlooked.

Format your response EXACTLY like this (no markdown, no bold, just plain text):
HOOK: The struggle or question
PROBLEM: Expand on the pain point
VERSE: The scripture reference and text
MEANING: What it really means
APPLY: How it changes everything`
        break
        
      case 'testimony':
        variedPrompt = `Tell a powerful story of life transformation through encountering God. Be specific about the before, the moment of change, and the after.

Format exactly like this:
HOOK: [The rock bottom or struggle]
TEXT 1: [The darkest moment]
TEXT 2: [The encounter/turning point]
TEXT 3: [The transformation]
REVEAL: [Where they are now]`
        break
        
      case 'prayer':
        variedPrompt = `Write an honest prayer for someone struggling with real pain - depression, addiction, broken relationships, or feeling abandoned by God. Write like the Psalms - raw, honest, but reaching for hope.

Write 5-7 short paragraphs, each a complete thought. Start from the pain, move toward hope.`
        break
    }
    
    prompts.push(variedPrompt)
  }

  return prompts
}

// Execute a single prompt using OpenAI (YOUR WORKING SERVICE)
export async function executePromptWithOpenAI(prompt: string): Promise<string> {
  try {
    const { text } = await generateText({
      model: openaiProvider('gpt-4o'),
      prompt,
      temperature: 0.8,
      maxTokens: 500,
    })
    return text
  } catch (error) {
    console.error('OpenAI generation failed:', error)
    throw error
  }
}

// Execute a single prompt using Claude (YOUR WORKING SERVICE)
export async function executePromptWithClaude(prompt: string): Promise<string> {
  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
    })
    
    return message.content[0].type === 'text' ? message.content[0].text : ''
  } catch (error) {
    console.error('Claude generation failed:', error)
    throw error
  }
}

// Generate complete content (text, image, video, audio) for a single prompt
export async function generateCompleteContent(
  prompt: string,
  pipelineType: string,
  useOpenAI: boolean = true,
  shouldGenerateVideo: boolean = false,
  shouldGenerateAudio: boolean = false,
  options?: BatchPromptOptions,
  index: number = 0
): Promise<Partial<BatchResult>> {
  let textContent = ''
  
  try {
    // Step 1: Generate text content
    console.log(`📝 Generating ${pipelineType} content...`)
    textContent = useOpenAI
      ? await executePromptWithOpenAI(prompt)
      : await executePromptWithClaude(prompt)
    
    console.log(`✅ Generated ${pipelineType} content:\n${textContent}`)
    
    // Check if content was actually generated
    if (!textContent || textContent.trim().length === 0) {
      console.error(`Empty content generated for ${pipelineType}`)
      return {
        result: 'Failed to generate content',
        error: 'Empty content'
      }
    }
    
    // Step 2: Parse text overlays and generate image for EACH one
    console.log(`📄 Parsing text overlays for ${pipelineType}...`)
    
    const lines = textContent.split('\n').filter(l => l.trim())
    const textOverlays: { label: string; text: string }[] = []
    
    // Extract each overlay - handle different formats
    lines.forEach(line => {
      // Standard format: "LABEL: text"
      const match = line.match(/^(HOOK|TEXT \d|REVEAL|PROBLEM|VERSE|MEANING|APPLY|BEFORE|MOMENT|NOW):\s*(.+)$/i)
      if (match) {
        textOverlays.push({ label: match[1], text: match[2].trim() })
      } else if (line.trim() && !line.includes(':')) {
        // Handle prayer format without labels - treat each paragraph as a slide
        if (pipelineType === 'prayer' && lines.length > 3) {
          // For prayers, break into logical sections
          const prayerLabels = ['OPENING', 'STRUGGLE', 'DECLARATION', 'PROMISE', 'CLOSING']
          const lineIndex = lines.indexOf(line)
          if (lineIndex < prayerLabels.length) {
            textOverlays.push({ label: prayerLabels[lineIndex], text: line.trim() })
          }
        }
      }
    })
    
    // Special handling for formats without clear labels
    if (textOverlays.length === 0) {
      console.log(`No standard overlays found for ${pipelineType}, trying alternative parsing...`)
      
      if (pipelineType === 'bible') {
        // Try to parse the multi-line format first
        const text = textContent
        const hookMatch = text.match(/HOOK:\s*\n(.+?)(?=\n\nPROBLEM:|$)/s)
        const problemMatch = text.match(/PROBLEM:\s*\n(.+?)(?=\n\nVERSE:|$)/s)
        const verseMatch = text.match(/VERSE:\s*\n(.+?)(?=\n\nMEANING:|$)/s)
        const meaningMatch = text.match(/MEANING:\s*\n(.+?)(?=\n\nAPPLY:|$)/s)
        const applyMatch = text.match(/APPLY:\s*\n(.+?)$/s)
        
        if (hookMatch) {
          textOverlays.push({ label: 'HOOK', text: hookMatch[1].trim() })
          if (problemMatch) textOverlays.push({ label: 'PROBLEM', text: problemMatch[1].trim() })
          if (verseMatch) textOverlays.push({ label: 'VERSE', text: verseMatch[1].trim() })
          if (meaningMatch) textOverlays.push({ label: 'MEANING', text: meaningMatch[1].trim() })
          if (applyMatch) textOverlays.push({ label: 'APPLY', text: applyMatch[1].trim() })
        } else {
          // Fallback: treat each paragraph as a slide for narrative format
          const paragraphs = textContent.split('\n\n').filter(p => p.trim())
          paragraphs.slice(0, 5).forEach((para, idx) => {
            const labels = ['HOOK', 'CONTEXT', 'VERSE', 'INSIGHT', 'APPLICATION']
            textOverlays.push({ label: labels[idx] || `SLIDE ${idx + 1}`, text: para.trim() })
          })
        }
      } else if (pipelineType === 'prayer') {
        // For prayers, split by paragraphs - let it flow naturally
        const paragraphs = textContent.split('\n\n').filter(p => p.trim())
        const prayerLabels = ['OPENING', 'STRUGGLE', 'DECLARATION', 'PROMISE', 'CLOSING', 'PETITION', 'FAITH', 'AMEN']
        paragraphs.forEach((para, idx) => {
          textOverlays.push({ label: prayerLabels[idx] || `PRAYER ${idx + 1}`, text: para.trim() })
        })
      }
    }
    
    console.log(`Found ${textOverlays.length} text overlays to generate images for`)
    
    // Generate images for each overlay
    const imageUrls: string[] = []
    
    for (const [idx, overlay] of textOverlays.entries()) {
      console.log(`🎨 Generating image ${idx + 1}/${textOverlays.length} for: ${overlay.label}`)
      
      // Create contextual image prompt based on the specific overlay
      const imagePromptRequest = `Create a cinematic, photorealistic background image for this TikTok text overlay:

"${overlay.text}"

Context: This is ${overlay.label} in a ${pipelineType} TikTok
Previous text: ${idx > 0 ? textOverlays[idx - 1].text : 'None (first slide)'}

The image should be:
- Photorealistic and cinematic (NOT stock photography)
- Raw, authentic, emotional
- Dark/moody if appropriate
- ${overlay.label === 'HOOK' ? 'Attention-grabbing, controversial' : ''}
- ${overlay.label === 'REVEAL' || overlay.label === 'NOW' ? 'Climactic, powerful, transformative' : ''}
- ${overlay.label.includes('BEFORE') ? 'Dark, struggling, broken' : ''}
- ${overlay.label.includes('MOMENT') ? 'Breakthrough, light breaking through darkness' : ''}
- Simple enough for text overlay visibility
- 9:16 vertical format

Cinematic image prompt (avoid generic stock photo look):`
      
      const imagePrompt = useOpenAI
        ? await executePromptWithOpenAI(imagePromptRequest)
        : await executePromptWithClaude(imagePromptRequest)
      
      const imageModel = 'black-forest-labs/flux-1.1-pro-ultra'
      
      try {
        const imageResult = await generateImage(imagePrompt.trim(), imageModel, {
          width: 1080,
          height: 1920, // 9:16 for TikTok
          raw: false,
          num_outputs: 1,
        })
        
        if (imageResult && imageResult[0]) {
          const uploadResult = await uploadGeneratedImage(imageResult[0], {
            prompt: `${overlay.label}: ${imagePrompt}`,
            model: imageModel,
            model_provider: 'replicate',
            aspect_ratio: '9:16',
            width: 1080,
            height: 1920,
          })
          imageUrls.push(uploadResult.publicUrl)
        }
      } catch (error) {
        console.error(`Failed to generate image for ${overlay.label}:`, error)
      }
    }
    
    // Use the first image as the main preview
    const imageUrl = imageUrls[0]
    
    // If we failed to generate enough images, log it
    if (imageUrls.length === 0) {
      console.error(`No images generated for ${pipelineType}`)
    } else if (imageUrls.length < textOverlays.length) {
      console.warn(`Only generated ${imageUrls.length}/${textOverlays.length} images for ${pipelineType}`)
    }
    
    // Step 3: Generate video (image-to-video) - OPTIONAL
    let videoUrl: string | undefined
    if (shouldGenerateVideo && imageUrl) {
      console.log(`🎥 Generating video from image...`)
      const videoModel = 'pixverse/pixverse-v4.5' // Use the SAME MODEL as working implementations
      const videoResult = await generateVideo(
        imageUrl, // generateVideo expects imageUrl as first param
        videoModel,
        {
          prompt: 'Smooth cinematic motion, subtle animation, professional quality',
          quality: '720p',
          duration: 5,
          aspect_ratio: '9:16',
        }
      )
      
      
      // Video generation returns either a URL string or an object
      console.log(`Video result for ${pipelineType}:`, videoResult)
      
      let videoUrlToUpload: string | undefined
      if (typeof videoResult === 'string') {
        videoUrlToUpload = videoResult
      } else if (videoResult && typeof videoResult === 'object') {
        // Could be { url: string } or { output: string } or just the URL
        videoUrlToUpload = videoResult.url || videoResult.output || videoResult
      }
      
      if (videoUrlToUpload && typeof videoUrlToUpload === 'string') {
        const uploadResult = await uploadGeneratedVideo(videoUrlToUpload, {
          prompt: 'Smooth cinematic motion, subtle animation, professional quality',
          model: videoModel,
          model_provider: 'replicate',
          aspect_ratio: '9:16',
          duration: 5,
        })
        videoUrl = uploadResult.publicUrl
        console.log(`✅ Video uploaded for ${pipelineType}: ${videoUrl}`)
      } else {
        console.error(`No video URL found for ${pipelineType}. Result:`, videoResult)
      }
    }
    
    // Step 4: Generate audio/music - OPTIONAL
    let audioUrl: string | undefined
    if (shouldGenerateAudio) {
      console.log(`🎵 Generating audio...`)
      const audioPrompt = pipelineType === 'prayer' ? 'peaceful worship music' :
                         pipelineType === 'testimony' ? 'emotional piano music' :
                         pipelineType === 'jesus' ? 'uplifting orchestral music' :
                         'inspirational background music'
      
      const audioModel = 'meta/musicgen:671ac645ce5e552cc63a54a2bbff63fcf798043055d2dac5fc9e36a837eedcfb' // MusicGen model
      const audioResult = await generateAudio(audioPrompt, audioModel, {
        duration: 30,
      })
      audioUrl = audioResult.url
      console.log(`✅ Audio generated for ${pipelineType}`)
    }
    
    console.log(`Final result for ${pipelineType}:`, {
      hasText: !!textContent,
      imageUrlsCount: imageUrls.length,
      hasVideo: !!videoUrl
    })
    
    return {
      result: textContent,
      imageUrl,
      imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
      videoUrl,
      audioUrl,
    }
  } catch (error: any) {
    console.error('Complete content generation failed:', error)
    console.error('Full error details:', error.stack || error)
    // Don't throw - return partial result with error
    return {
      result: textContent || 'Error generating content',
      error: error.message
    }
  }
}

// Execute batch with COMPLETE content generation
export async function executeBatchWithWorkingServices(
  options: BatchPromptOptions,
  onProgress?: (progress: number, completed: number, total: number) => void
): Promise<BatchResult[]> {
  const prompts = await generateBatchPrompts(options)
  
  console.log(`🚀 Running ${prompts.length} generations in PARALLEL...`)
  console.log(`🎲 Using run seed: ${options.runSeed || 0}`)
  
  let completedCount = 0
  
  // Create all promises at once for TRUE parallel execution
  const allPromises = prompts.map(async (prompt, index) => {
    const pipelineType = options.templates[index % options.templates.length]
    
    try {
      // Generate COMPLETE content (text + image + optional video/audio)
      const content = await generateCompleteContent(
        prompt,
        pipelineType,
        false, // Always use Claude for better, less robotic output
        options.generateVideo || false,
        options.generateAudio || false,
        options,
        index
      )
      
      console.log(`✅ Content ready for ${pipelineType} #${index + 1}`)
      
      const result = {
        id: `batch-${index}`,
        variant: index + 1,
        prompt,
        pipelineType,
        ...content,
      }
      
      // Update progress counter
      completedCount++
      if (onProgress) {
        const progress = Math.round((completedCount / prompts.length) * 100)
        onProgress(progress, completedCount, prompts.length)
      }
      
      return result
    } catch (error: any) {
      console.error(`❌ Error in ${pipelineType} #${index + 1}:`, error.message)
      return {
        id: `batch-${index}`,
        variant: index + 1,
        prompt,
        pipelineType,
        error: error.message,
      }
    }
  })
  
  // Wait for ALL to complete in parallel
  const results = await Promise.all(allPromises)
  
  if (onProgress) {
    onProgress(100, prompts.length, prompts.length)
  }
  
  return results
}

// Group results by pipeline type
export function groupResultsByPipeline(results: BatchResult[]): Record<string, BatchResult[]> {
  return results.reduce((acc, item) => {
    if (!acc[item.pipelineType]) {
      acc[item.pipelineType] = []
    }
    acc[item.pipelineType].push(item)
    return acc
  }, {} as Record<string, BatchResult[]>)
}