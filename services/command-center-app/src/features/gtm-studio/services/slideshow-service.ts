import { callClaude } from './claude-proxy-service'

interface Slide {
  text: string
  imagePrompt: string
}

interface SlideshowContent {
  hook: string
  slides: Slide[]
  theme: string
  style: string
}

export async function generateSlideshowContent(
  topic: string,
  slideCount: number = 7,
  type: 'standard' | 'ugc' | '6-verses' = 'standard'
): Promise<SlideshowContent> {
  const basePrompt =
    type === '6-verses'
      ? `You are creating a beautiful Bible verse slideshow for TikTok. 
    
The topic is: ${topic}

Generate a slideshow with EXACTLY ${slideCount} slides following this format:
1. Slide 1: HOOK/TITLE ONLY - Just the title text like "6 Beautiful Bible Verses When You Feel Like God Has Given Up On You" - NO verse on this slide
2. Slides 2-7: Each slide shows ONE Bible verse with context
3. Slide 8: Encouraging conclusion with call to action

SLIDE 1 MUST BE: Just the title/hook, NO Bible verse. Example: "6 Beautiful Bible Verses When You Feel Like God Has Given Up On You"

CRITICAL: Slides 2-7 (verse slides) MUST follow this exact format:
"[Book Chapter:Verse]

"[The actual Bible verse text in quotes]"

[2-3 lines explaining how this helps]"

Example format:
"Psalm 34:18

"The Lord is close to the brokenhearted 
and saves those who are crushed in spirit."

When you feel alone and broken,
God is actually closest to you
in those moments of pain."

The slideshow should:
- Address a specific emotional state or life situation
- Provide 6 powerful, relevant Bible verses
- Include practical application for each verse
- Feel like a warm hug from Scripture
- Build hope progressively through the verses

CRITICAL IMAGE GUIDELINES:
- For the imagePrompt field: Create scenes that match the emotional tone of each verse
- Simply add "Disney 2D animation style, hand drawn animation" to your scene descriptions
- Let the verse content inspire unique, creative scenes - don't use template imagery
- Focus on emotional resonance rather than specific locations

Return in this exact JSON format with EXACTLY ${slideCount} items in the slides array:
{
  "hook": "DEPRECATED - ignore this field",
  "theme": "disney animation",
  "style": "Disney 2D animation style, hand drawn animation",
  "slides": [
    {
      "text": "[Your hook/title text here]", 
      "imagePrompt": "[Scene description that matches the emotional tone], Disney 2D animation style"
    },
    {
      "text": "[Verse and application text]", 
      "imagePrompt": "[Another unique scene], Disney 2D animation style"
    }
  ]
}`
      : type === 'ugc'
        ? `You are creating a POV day-in-the-life Christian TikTok slideshow about: ${topic}

Generate a personal, authentic slideshow with EXACTLY ${slideCount} slides:
1. Slide 1: A relatable HOOK that shows vulnerability/authenticity
2. Slides 2-${slideCount - 1}: Personal daily practices with specific details
3. Slide ${slideCount}: Encouraging message or invitation to try

IMPORTANT: You MUST generate EXACTLY ${slideCount} slides in the "slides" array.

Each slide should have:
   - Text formatted as: "PERSONAL MOMENT\n\nHOW IT HELPS" (use actual newlines)
   - Personal moment: A specific daily practice (e.g., "Morning coffee with my Bible")
   - How it helps: Why this brings you closer to God (2-3 lines)
   - Keep total text under 50 words but make it PERSONAL and SPECIFIC
   - A SEPARATE image prompt for generating POV-style background image

The slideshow should feel like:
- A friend sharing their actual daily routine
- Vulnerable and honest about faith journey
- Specific times, places, and practices
- Relatable struggles and victories

CRITICAL WRITING RULES:
- Use first person ("I", "my", "me")
- Include specific times and places
- Be vulnerable about struggles
- Share real transformation moments

CRITICAL IMAGE GUIDELINES FOR UGC POV CONTENT:
- For the imagePrompt field: Just write "POV scene" - we'll use the slide text as the actual prompt
- The image generation will use your slide text directly to create contextual images
- Don't worry about describing the image - focus on making the text powerful


Return in this exact JSON format with EXACTLY ${slideCount} items in the slides array:
{
  "hook": "DEPRECATED - ignore this field",
  "theme": "pov aesthetic",
  "style": "low quality photo, amateur photography",
  "slides": [
    {
      "text": "THE HOOK TEXT GOES HERE FOR SLIDE 1", 
      "imagePrompt": "Image prompt for slide 1"
    },
    {
      "text": "Slide 2 text", 
      "imagePrompt": "Image prompt for slide 2"
    }
  ]
}

CRITICAL: The first slide in the slides array should contain your hook text. The slides array MUST contain EXACTLY ${slideCount} slide objects.`
        : `You are creating a viral Christian TikTok slideshow about: ${topic}

Generate a compelling slideshow with EXACTLY ${slideCount} slides:
1. Slide 1: A strong HOOK that stops scrolling
2. Slides 2-${slideCount - 1}: Build the content/list items
3. Slide ${slideCount}: Call to action or powerful conclusion

IMPORTANT: You MUST generate EXACTLY ${slideCount} slides in the "slides" array.

Each slide should have:
   - Text formatted as: "TITLE\n\nSHORT DESCRIPTION" (use actual newlines)
   - Title: The list item (e.g., "1. Flipping Tables")
   - Description: 2-3 line explanation that adds context/detail
   - Keep total text under 50 words but make it INFORMATIVE
   - A SEPARATE image prompt for generating the background image
   
The slideshow should follow proven viral patterns:
- Start with a bold claim or question
- Build tension/curiosity 
- Reveal information progressively
- End with a call to action or powerful statement

CRITICAL WRITING RULES:
- AVOID REPETITION - don't use the same phrase more than once per slideshow
- Keep a consistent tone throughout but vary the specific words and phrases

CRITICAL IMAGE GUIDELINES FOR CHRISTIAN CONTENT:
- For the imagePrompt field: Just write "scene illustration" - we'll use the slide text as the actual prompt
- The image generation will use your slide text directly to create contextual tumblr-style images
- Focus on making the text content compelling - the images will automatically match

Example slide text format:
"1. Flipping Tables in the Temple

Jesus went BALLISTIC on merchants
turning His Father's house into
a marketplace for profit"

Return in this exact JSON format with EXACTLY ${slideCount} items in the slides array:
{
  "hook": "DEPRECATED - ignore this field",
  "theme": "tumblr aesthetic",
  "style": "tumblr aesthetic, film photography, disposable camera, high ISO grain, underexposed, vintage digital camera",
  "slides": [
    {
      "text": "THE HOOK TEXT GOES HERE FOR SLIDE 1", 
      "imagePrompt": "Image prompt for the hook slide"
    },
    {
      "text": "Slide 2 title\\n\\nDescription for slide 2", 
      "imagePrompt": "Image prompt for slide 2"
    }
  ]
}

CRITICAL: The first slide in the slides array should contain your hook text. The slides array MUST contain EXACTLY ${slideCount} slide objects.`

  const fullPrompt = basePrompt

  const response = await callClaude(
    [
      {
        role: 'user',
        content: fullPrompt,
      },
    ],
    'claude-3-5-sonnet-20241022',
    4000,
    0.7
  )

  console.log('🤖 Raw AI response:', response)

  try {
    // Clean the response to remove any control characters
    const cleanedResponse = response.replace(/[\x00-\x1F\x7F-\x9F]/g, '')
    const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      console.log('✅ Parsed slideshow content:', {
        hook: parsed.hook,
        theme: parsed.theme,
        style: parsed.style,
        slideCount: parsed.slides?.length,
        slides: parsed.slides,
      })

      // Validate we have the correct number of slides
      if (parsed.slides && parsed.slides.length === slideCount) {
        return parsed
      } else {
        console.warn(
          `Expected ${slideCount} slides but got ${parsed.slides?.length}`
        )
        throw new Error('Incorrect slide count')
      }
    }
    throw new Error('No JSON found in response')
  } catch (error) {
    console.error('Failed to parse slideshow content:', error)
    console.log('Raw response that failed:', response)

    // Better fallback structure that generates the requested number of slides
    const slides = []
    const baseStyle =
      type === '6-verses'
        ? 'Disney 2D animation style, hand drawn animation'
        : type === 'ugc'
          ? 'low quality photo, amateur photography'
          : 'tumblr aesthetic, film photography, disposable camera, high ISO grain'

    // First slide is the hook
    slides.push({
      text: topic,
      imagePrompt:
        type === '6-verses'
          ? `Scene representing "${topic}", ${baseStyle}`
          : `${topic}, ${baseStyle}`,
    })

    // Generate middle slides
    for (let i = 2; i < slideCount; i++) {
      slides.push({
        text: `Point ${i}\n\nDetails about this point`,
        imagePrompt:
          type === '6-verses'
            ? `Emotional scene for verse ${i}, ${baseStyle}`
            : `Illustration for point ${i} of ${topic}, ${baseStyle}`,
      })
    }

    // Last slide is CTA
    if (slideCount > 1) {
      slides.push({
        text:
          type === '6-verses'
            ? `Remember: God is with you\n\nSave this for when you need it`
            : `Try this yourself\n\nShare your experience`,
        imagePrompt:
          type === '6-verses'
            ? `Hopeful, uplifting scene, ${baseStyle}`
            : `Encouraging conclusion for ${topic}, ${baseStyle}`,
      })
    }

    return {
      hook: topic,
      theme:
        type === '6-verses'
          ? 'cinematic nature'
          : type === 'ugc'
            ? 'pov aesthetic'
            : 'tumblr aesthetic',
      style: baseStyle,
      slides,
    }
  }
}

export async function generateImagePromptVariations(
  basePrompt: string,
  style: string,
  count: number = 4
): Promise<string[]> {
  const prompt = `Generate ${count} variations of this image prompt for a TikTok slideshow:

Base prompt: ${basePrompt}
Style: ${style}

Create ${count} different variations that:
- Maintain the same subject/concept
- Vary the composition, angle, or details
- Are optimized for vertical 9:16 format
- Include specific visual details

Return as a JSON array of strings:
["variation 1", "variation 2", ...]`

  const response = await callClaude(
    [
      {
        role: 'user',
        content: prompt,
      },
    ],
    'claude-3-haiku-20241022',
    1000,
    0.9
  )

  try {
    const jsonMatch = response.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
  } catch (error) {
    console.error('Failed to parse variations:', error)
  }

  // Fallback
  return [basePrompt]
}

export async function generateCaptionOverlay(
  text: string,
  position: 'top' | 'center' | 'bottom' = 'center'
): Promise<{
  text: string
  fontSize: number
  fontWeight: string
  textAlign: string
  position: { x: number; y: number }
  backgroundColor?: string
  textColor: string
  padding?: number
}> {
  // Calculate optimal font size based on text length
  const words = text.split(' ').length
  let fontSize = 72
  if (words > 10) fontSize = 48
  else if (words > 7) fontSize = 56
  else if (words > 5) fontSize = 64

  // Position calculations for 9:16 aspect ratio
  const positions = {
    top: { x: 50, y: 15 },
    center: { x: 50, y: 50 },
    bottom: { x: 50, y: 85 },
  }

  return {
    text,
    fontSize,
    fontWeight: 'bold',
    textAlign: 'center',
    position: positions[position],
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    textColor: '#FFFFFF',
    padding: 20,
  }
}
