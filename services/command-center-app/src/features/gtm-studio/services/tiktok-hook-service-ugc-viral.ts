import { callClaude } from './claude-proxy-service'
import { supabase } from './supabase-service'

// Cache for viral hooks to avoid repeated DB calls
let viralHooksCache: string[] | null = null
let cacheExpiry = 0

async function getViralUGCHooks(): Promise<string[]> {
  const now = Date.now()

  // Return cached hooks if still valid (1 hour cache)
  if (viralHooksCache && cacheExpiry > now) {
    return viralHooksCache
  }

  try {
    // Query actual viral UGC Christian videos from database
    const { data: videos, error } = await supabase
      .from('videos')
      .select('hook_transcript, view_count, caption')
      .or(
        `caption.ilike.%christian%,caption.ilike.%jesus%,caption.ilike.%god%,caption.ilike.%faith%,caption.ilike.%prayer%,caption.ilike.%testimony%,caption.ilike.%blessed%`
      )
      .gte('view_count', 1000000) // 1M+ views only
      .not('hook_transcript', 'is', null)
      .order('view_count', { ascending: false })
      .limit(100)

    if (error || !videos || videos.length === 0) {
      console.error('Failed to fetch viral hooks:', error)
      return getDefaultViralHooks()
    }

    // Extract hooks and clean them
    const hooks = videos
      .map((v) => v.hook_transcript?.trim())
      .filter((h) => h && h.length > 0 && h.split(' ').length <= 20) // Max 20 words
      .slice(0, 50) // Top 50 hooks

    viralHooksCache = hooks
    cacheExpiry = now + 60 * 60 * 1000 // 1 hour cache

    return hooks
  } catch (error) {
    console.error('Error fetching viral hooks:', error)
    return getDefaultViralHooks()
  }
}

function getDefaultViralHooks(): string[] {
  // Simple hooks that actually create curiosity
  return [
    'wait til the end',
    'this is so real',
    "i can't be the only one",
    'no one talks about this',
    'hear me out',
    'this changed everything',
    'you need to see this',
    'i was not ready',
    'this hit different',
    'why did no one tell me',
    "i'm crying",
    'this is wild',
    'okay but why is this working',
    "i wasn't expecting that",
    'this is actually insane',
  ]
}

export async function generateUGCTikTokHook(): Promise<string> {
  try {
    const viralHooks = await getViralUGCHooks()

    const content = await callClaude(
      [
        {
          role: 'system',
          content: `Pick one of these ACTUAL viral Christian TikTok hooks and modify it slightly:

${viralHooks
  .slice(0, 30)
  .map((h, i) => `${i + 1}. "${h}"`)
  .join('\n')}

Just pick one and change 1-2 words to make it fresh. Keep it under 15 words.
Return ONLY the hook text in lowercase.`,
        },
        {
          role: 'user',
          content: 'Pick a hook from the list and modify it slightly.',
        },
      ],
      'claude-3-5-sonnet-20241022',
      64
    )

    return content.trim().toLowerCase()
  } catch (error) {
    console.error('Failed to generate UGC TikTok hook:', error)
    // Return a data-driven fallback
    const fallbacks = await getViralUGCHooks()
    return fallbacks[Math.floor(Math.random() * Math.min(10, fallbacks.length))]
  }
}

export async function generateMultipleUGCTikTokHooks(
  videoContexts: { id: string; context: string }[]
): Promise<{ [id: string]: string }> {
  const hooks: { [id: string]: string } = {}

  // Generate hooks in parallel for better performance
  const promises = videoContexts.map(async ({ id }) => {
    try {
      const hook = await generateUGCTikTokHook()
      hooks[id] = hook
    } catch (error) {
      console.error(`Failed to generate hook for video ${id}:`, error)
      // Use a random viral hook as fallback
      const fallbacks = await getViralUGCHooks()
      hooks[id] =
        fallbacks[Math.floor(Math.random() * Math.min(10, fallbacks.length))]
    }
  })

  await Promise.all(promises)
  return hooks
}
