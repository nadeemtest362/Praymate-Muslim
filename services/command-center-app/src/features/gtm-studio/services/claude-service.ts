// Claude API integration for prompt enhancement
import { callClaude } from './claude-proxy-service'

export async function enhancePrompt(
  prompt: string,
  workflowType:
    | 'jesus'
    | 'ugc'
    | 'slideshow'
    | 'ugc-slideshow'
    | '6-verses' = 'jesus'
): Promise<string> {
  try {
    let systemPrompt: string

    if (workflowType === 'ugc') {
      systemPrompt =
        'You are an expert at writing image generation prompts for authentic selfies. Take the basic prompt and enhance it simply: add "selfie, shot on iPhone, natural lighting". Keep the rest of their original prompt. The goal is authentic smartphone photos. Return ONLY the enhanced prompt, nothing else.'
    } else if (workflowType === 'slideshow') {
      systemPrompt =
        'You are a viral TikTok slideshow expert. Take this topic and create a sharp, edgy listicle hook. Keep it short, direct, controversial but faith-appropriate. Always capitalize God. Examples: "5 prayers God hates", "3 sins Christians ignore", "7 Bible verses nobody talks about", "5 prayer myths ruining your faith". No cheese, no "ancient secrets", no "prayer warriors". Return ONLY the hook, nothing else.'
    } else if (workflowType === 'ugc-slideshow') {
      systemPrompt =
        'You are an expert at creating authentic POV Christian content. Take this topic and make it personal and vulnerable. Format it as "X things I do daily/each day that [result]". Make it UNEXPECTED and specific. Examples: "3 weird places I pray that changed everything", "5 times I found God in my failures", "4 ways I worship without music", "3 daily battles that made my faith real". Avoid clichés like morning routines, coffee, journaling. Be creative and real. Return ONLY the enhanced topic, nothing else.'
    } else if (workflowType === '6-verses') {
      systemPrompt =
        'You are an expert at creating Bible verse slideshows that deeply resonate. Take this topic and format it as "6 beautiful Bible verses when you\'re [emotional state/situation]". Focus on real struggles and emotions people face. Examples: "6 beautiful Bible verses when you\'re feeling forgotten by God", "6 beautiful Bible verses when anxiety won\'t let you sleep", "6 beautiful Bible verses when you\'re tired of pretending you\'re okay". Make it specific and deeply emotional. Return ONLY the enhanced topic, nothing else.'
    } else {
      systemPrompt =
        'You are an expert at writing image generation prompts. Take the basic prompt and enhance it with Disney 2D animation art style. Add these specific style descriptors: "Disney 2D animation style", "traditional Disney cartoon", "hand-drawn animation aesthetic", "classic Disney character design", "smooth 2D illustration", "expressive cartoon features", "vibrant saturated colors", "soft ambient lighting", "cinematic quality". Focus on the technical art style, not movie themes. Keep it concise but impactful. Return ONLY the enhanced prompt, nothing else.'
    }

    const content = await callClaude(
      [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      'claude-3-5-sonnet-20241022',
      1024
    )

    return content.trim()
  } catch (error) {
    console.error('Failed to enhance prompt:', error)
    throw new Error(
      'Failed to enhance prompt. Make sure the image generation service is running.'
    )
  }
}

export async function generatePromptVariations(
  prompt: string,
  workflowType:
    | 'jesus'
    | 'ugc'
    | 'slideshow'
    | 'ugc-slideshow'
    | '6-verses' = 'jesus'
): Promise<string[]> {
  try {
    let systemPrompt: string

    if (workflowType === 'ugc') {
      systemPrompt = `Take the input prompt and create 5 simple variations. Each should be a selfie with iPhone in different settings or contexts. Keep it brief and natural.

Return ONLY the 5 variations as complete image prompts, one per line.`
    } else if (workflowType === 'slideshow') {
      systemPrompt = `Create 5 viral TikTok slideshow hooks for this Christian topic. Make them edgy, direct, controversial but respectful. Always capitalize God. Format: number + thing + angle.

Good examples:
"5 prayers God hates"
"3 sins Christians ignore"
"7 Bible verses nobody talks about"
"5 prayer myths ruining your faith"
"3 questions God won't answer"
"5 times God said no and why"
"7 prayers God probably ignored"

Bad examples (too cheesy):
"Ancient prayer secrets"
"Prayer warriors shocked"
"Hidden knowledge revealed"

Return ONLY 5 hooks, one per line, no explanations.`
    } else if (workflowType === 'ugc-slideshow') {
      systemPrompt = `Create 5 personal, authentic POV Christian daily practice topics. Each should be about specific things you do daily that strengthen your faith. Format: "X things I do [time/frequency] that [spiritual result]".

Good examples:
"3 weird places I pray that changed everything"
"5 times I found God in my biggest failures"
"4 ways I worship without any music"
"3 moments I argue with God daily"
"5 unexpected ways anxiety brought me closer to God"
"3 times I felt God in my darkest moments"
"4 daily battles that actually strengthened my faith"

Keep them:
- First person ("I do", "my day")
- Specific about timing/frequency
- Focused on transformation/growth
- Authentic and relatable

Return ONLY 5 topics, one per line, no explanations.`
    } else if (workflowType === '6-verses') {
      systemPrompt = `Create 5 variations of Bible verse slideshow topics. Format: "6 beautiful Bible verses when you're [specific emotional state/situation]".

Good examples:
"6 beautiful Bible verses when you're feeling forgotten by God"
"6 beautiful Bible verses when anxiety won't let you sleep"
"6 beautiful Bible verses when you're tired of pretending you're okay"
"6 beautiful Bible verses when you feel like giving up on prayer"
"6 beautiful Bible verses when comparison is stealing your joy"
"6 beautiful Bible verses when you're questioning if God still loves you"
"6 beautiful Bible verses when disappointment feels overwhelming"

Focus on:
- Deep, specific emotional states
- Real struggles people face
- Situations that need comfort
- Moments when faith feels hard

Return ONLY 5 topics, one per line, no explanations.`
    } else {
      systemPrompt =
        'You are a creative director. Take the core subject/character from the prompt and generate 5 DIFFERENT scenarios or situations with that subject. Keep Disney 2D animation style but create entirely different scenes, not just different angles of the same scene. For example, if given "Jesus at last supper", create variations like "Jesus healing the sick", "Jesus walking on water", "Jesus teaching children", etc. Always include "Disney 2D animation style". Return ONLY the 5 variations as complete image prompts, one per line, with no numbering, prefixes, or explanations.'
    }

    const content = await callClaude(
      [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      'claude-3-5-sonnet-20241022',
      2048
    )

    const variations = content
      .trim()
      .split('\n')
      .filter((line: string) => line.trim().length > 0)
      .slice(0, 5) // Ensure we only get 5

    return variations
  } catch (error) {
    console.error('Failed to generate variations:', error)
    throw new Error(
      'Failed to generate variations. Make sure the image generation service is running.'
    )
  }
}
