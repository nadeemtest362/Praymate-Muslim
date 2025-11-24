import { callClaude } from './claude-proxy-service'

// Active UGC hook generation using the transformation examples
export async function generateUGCTikTokHook(): Promise<string> {
  try {
    const content = await callClaude(
      [
        {
          role: 'system',
          content: `You are creating TikTok hooks that tap into the deepest desires of Gen Z Christians.

CORE PSYCHOLOGY:
Gen Z Christians desperately want:
- To feel God's presence (not just believe in it intellectually)
- Their prayers to feel real and heard (not just reciting words)
- To be the friend others come to for prayer (spiritual influence)
- Proof their faith is working (tangible spiritual growth)

THE WINNING FORMULA:
Imply you discovered a SPECIFIC WAY to achieve what they're desperately seeking, without saying what it is.

The hook must:
1. Address a universal struggle (everyone relates)
2. Show a transformation (not just improvement)
3. Imply there's a replicable method (not just personal growth)
4. Create hope they could have this too (accessibility)
5. Use social proof subtly (others noticing)

AVOID:
- Direct comparisons or put-downs
- "I'm better than you" energy
- Vague spiritual platitudes

Examples that create "I need this" urgency:
- "my friend texted asking why she feels peace after I pray for her now"
- "started this 30 days ago and I actually hear God's voice"
- "my anxiety about prayer disappeared when I found this"
- "3 people asked me to pray for them this week... that never happened before"
- "discovered why my prayers felt one-sided for 10 years"
- "this is what made prayer stop feeling like homework"
- "my roommate started doing this after seeing my prayer journal"
- "found what I needed to stop faking it during group prayer"
- "this changed prayer from obligation to conversation"
- "my mom noticed I don't avoid praying anymore"
- "finally understand what 'praying without ceasing' actually means"
- "stopped googling 'how to pray' after finding this"
- "this made me go from dreading to craving prayer time"
- "my pastor asked what resource I've been using"
- "discovered why some people's prayers feel so powerful"
- "this is how prayer became my favorite part of the day"
- "found what helped me pray for others without running out of words"
- "my small group asked me to lead prayer now"
- "this took my prayer life from 2 minutes to 20 without trying"
- "discovered the difference between praying and actually connecting"

PSYCHOLOGICAL TRIGGERS THAT WORK:
- Specific time frames ("30 days ago", "after 2 weeks")
- Others asking/noticing (social proof without bragging)
- Solved a universal problem (anxiety, emptiness, confusion)
- Tangible outcomes (peace, hearing God, longer prayers)
- Accessibility hints ("found", "discovered", "started using")

Keep it:
- Under 35 words
- Lowercase, conversational
- Focused on transformation, not comparison
- Hopeful (they could have this too)
- Specific enough to be believable
- NO direct app names
- NO emojis

Return ONLY the hook text.`,
        },
        {
          role: 'user',
          content: `Generate a hook about discovering something specific that solved a universal prayer struggle. Make viewers think "I need whatever they found" without insulting them or bragging.`,
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

export async function generateMultipleUGCTikTokHooks(
  videoContexts: { id: string; context: string }[]
): Promise<{ [id: string]: string }> {
  const hooks: { [id: string]: string } = {}

  // Generate hooks in parallel for better performance
  const promises = videoContexts.map(async ({ id }) => {
    try {
      const hook = await generateUGCTikTokHook() // Don't pass context for UGC
      hooks[id] = hook
    } catch (error) {
      console.error(`Failed to generate hook for video ${id}:`, error)
      hooks[id] = 'finally figured out why my prayers felt so empty' // Fallback hook
    }
  })

  await Promise.all(promises)
  return hooks
}
