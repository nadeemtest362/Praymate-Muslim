import { callClaude } from './claude-proxy-service'

// This version is for UGC demo videos - saved for later use
export async function generateUGCTikTokHook(
  videoContext: string
): Promise<string> {
  try {
    const content = await callClaude(
      [
        {
          role: 'system',
          content: `You are creating TikTok hooks that make viewers curious about a transformation without directly mentioning any app or solution.

CONTEXT: These UGC videos will show someone using an app. The goal is to make viewers ask "what app is that?" in the comments.

Target these deep psychological pain points:
- Feeling like prayers are just words hitting the ceiling
- Prayer feeling repetitive, like homework
- Not knowing how to pray for specific people/situations  
- Feeling disconnected despite trying to pray
- Wanting deeper spiritual connection but not knowing how
- Feeling like everyone else "gets it" but you don't

WINNING FORMULA: State a relatable transformation or realization that implies there's a specific way/method without saying what it is.

Examples that create curiosity (VARY THE STRUCTURE):
- "finally stopped feeling like i was just talking to myself when i pray"
- "turns out i've been praying wrong my whole life"
- "this completely changed how i pray for my family"
- "discovered why my prayers felt so empty before"
- "my prayer time actually feels like a conversation now"
- "figured out what was missing from my prayer life"
- "stopped copying other people's prayers and found my own words"
- "3 months ago i couldn't pray for more than 30 seconds"
- "used to dread prayer time now it's my favorite part of the day"
- "thought i was bad at praying till i learned this"
- "my mom asked what changed about how i pray"
- "never knew prayer could feel this personal"
- "jesus watching me say i'll pray for someone then immediately forgetting"
- "sometimes i wonder if He gets tired of my same 3 prayers"
- "that feeling when you realize He's been waiting for you to talk all day"
- "been praying the same prayer since i was 12 and still don't know if i'm doing it right"
- "jesus probably wondering why i only talk to Him during emergencies"
- "realized today that i pray AT God instead of WITH Him"
- "imagine if we talked to our friends the way we pray"
- "sat in silence for 5 minutes and realized that's prayer too"

IMPORTANT: Vary your sentence structure. Don't always start with "when you" or similar patterns. Mix it up with:
- First person statements ("i finally...")
- Time comparisons ("used to... now...")
- Discoveries ("turns out...")
- Observations ("my friend noticed...")
- Realizations ("never knew...")

Keep it:
- Under 35 words
- Lowercase, conversational
- Personal discovery/transformation focused
- Creating a curiosity gap
- NO direct pitch or app mention
- NO emojis

Return ONLY the hook text.`,
        },
        {
          role: 'user',
          content: `Generate a TikTok hook for this video context: ${videoContext}`,
        },
      ],
      'claude-3-5-sonnet-20241022',
      256
    )

    return content.trim()
  } catch (error) {
    console.error('Failed to generate UGC TikTok hook:', error)
    throw new Error('Failed to generate UGC TikTok hook')
  }
}
