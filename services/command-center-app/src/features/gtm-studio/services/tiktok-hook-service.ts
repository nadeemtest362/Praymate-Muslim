import {
  getTopChristianTikTokHooks,
  analyzeChristianHookPatterns,
} from './supabase-service'

export interface HookTemplate {
  id: string
  category:
    | 'transformation'
    | 'question'
    | 'revelation'
    | 'challenge'
    | 'relatable'
  template: string
  example: string
  psychologyNotes: string
  expectedEngagement: 'high' | 'very-high' | 'viral'
  bestTimeToPost?: string
}

export interface ViralHook {
  id: string
  hook: string
  views: number
  engagementRate: number
  author: string
  category?: string
  wordCount: number
}

// Pre-analyzed hook templates based on viral data
export const CHRISTIAN_HOOK_TEMPLATES: HookTemplate[] = [
  // Transformation Stories
  {
    id: 'trans-1',
    category: 'transformation',
    template:
      'I used to [negative behavior/state], but then [God/Jesus] [specific transformation]',
    example:
      'I used to scroll for hours feeling empty, but then God showed me how to find peace in prayer',
    psychologyNotes:
      'Before/after structure creates narrative tension. Personal vulnerability builds trust.',
    expectedEngagement: 'very-high',
  },
  {
    id: 'trans-2',
    category: 'transformation',
    template: "From [old identity] to [new identity] - here's what God did",
    example: "From atheist to worship leader - here's what God did",
    psychologyNotes:
      'Identity transformation is deeply compelling. Clear contrast creates curiosity.',
    expectedEngagement: 'viral',
  },
  {
    id: 'trans-3',
    category: 'transformation',
    template:
      "[Time period] ago I was [struggling with], today I'm [positive outcome]",
    example: "6 months ago I was suicidal, today I'm helping others find hope",
    psychologyNotes:
      'Specific timeframe makes transformation tangible and achievable.',
    expectedEngagement: 'very-high',
  },

  // Controversial Questions
  {
    id: 'quest-1',
    category: 'question',
    template: 'Why do Christians [seemingly contradictory action]?',
    example:
      'Why do Christians say they love everyone but judge people who sin differently?',
    psychologyNotes:
      'Cognitive dissonance drives engagement. Appeals to both believers and skeptics.',
    expectedEngagement: 'viral',
  },
  {
    id: 'quest-2',
    category: 'question',
    template:
      'Can someone explain why [common Christian practice] if [logical contradiction]?',
    example:
      "Can someone explain why we pray for healing if God's will is perfect?",
    psychologyNotes:
      'Genuine curiosity format reduces defensiveness, increases thoughtful responses.',
    expectedEngagement: 'high',
  },
  {
    id: 'quest-3',
    category: 'question',
    template:
      'Is it just me or does [Christian behavior] seem [unexpected observation]?',
    example:
      'Is it just me or does going to church actually make some people meaner?',
    psychologyNotes:
      'Relatability through shared observation. "Is it just me" creates community.',
    expectedEngagement: 'very-high',
  },

  // Revelations/Secrets
  {
    id: 'reveal-1',
    category: 'revelation',
    template: 'What nobody tells you about [Christian topic]',
    example: 'What nobody tells you about feeling distant from God',
    psychologyNotes:
      'Promise of insider knowledge. Addresses unspoken struggles.',
    expectedEngagement: 'very-high',
  },
  {
    id: 'reveal-2',
    category: 'revelation',
    template: 'The [Christian topic] secret that changed everything for me',
    example: 'The prayer secret that changed everything for me',
    psychologyNotes:
      'Personal testimony + promise of transformation. "Secret" creates FOMO.',
    expectedEngagement: 'high',
  },
  {
    id: 'reveal-3',
    category: 'revelation',
    template: "Churches don't talk about this, but [controversial truth]",
    example:
      "Churches don't talk about this, but most Christians struggle with doubt",
    psychologyNotes:
      'Positions viewer as getting real truth vs sanitized version.',
    expectedEngagement: 'viral',
  },

  // Challenges
  {
    id: 'chall-1',
    category: 'challenge',
    template:
      'I challenge you to [specific action] for [timeframe] and watch what happens',
    example:
      'I challenge you to pray for your enemies for 7 days and watch what happens',
    psychologyNotes:
      'Clear CTA with mysterious outcome. Time-bound creates commitment.',
    expectedEngagement: 'very-high',
  },
  {
    id: 'chall-2',
    category: 'challenge',
    template: 'Try this for [short timeframe]: [simple spiritual practice]',
    example:
      'Try this for 3 days: Thank God before you complain about anything',
    psychologyNotes: 'Low barrier to entry. Practical and achievable.',
    expectedEngagement: 'high',
  },
  {
    id: 'chall-3',
    category: 'challenge',
    template: 'Stop [common behavior] and start [godly alternative] - day 1',
    example: 'Stop doomscrolling and start prayer-scrolling - day 1',
    psychologyNotes:
      'Replace bad habit with good. "Day 1" implies journey/series.',
    expectedEngagement: 'very-high',
  },

  // Relatable Struggles
  {
    id: 'relate-1',
    category: 'relatable',
    template:
      "POV: You're trying to [spiritual practice] but [relatable obstacle]",
    example:
      "POV: You're trying to pray but your mind keeps planning tomorrow's outfit",
    psychologyNotes: 'POV format is native to TikTok. Humor + relatability.',
    expectedEngagement: 'high',
  },
  {
    id: 'relate-2',
    category: 'relatable',
    template: 'That moment when [spiritual situation] but [honest reaction]',
    example:
      'That moment when the worship song hits different and you ugly cry in church',
    psychologyNotes:
      'Shared experience creates community. Vulnerability through humor.',
    expectedEngagement: 'very-high',
  },
  {
    id: 'relate-3',
    category: 'relatable',
    template:
      "Christianity is [unexpected description] and here's why that's actually good",
    example: "Christianity is weird and here's why that's actually good",
    psychologyNotes:
      'Acknowledges outsider perspective. Reframes negative as positive.',
    expectedEngagement: 'high',
  },
]

// Hook generator functions
export function generateHookVariations(
  template: HookTemplate,
  topic: string
): string[] {
  // This would use AI to generate variations, but for now returns examples
  const variations: string[] = []

  switch (template.category) {
    case 'transformation':
      variations.push(
        `I used to think ${topic} was stupid, but then God showed me its power`,
        `From doubting ${topic} to depending on it daily - my story`,
        `How ${topic} took me from broken to blessed in 30 days`
      )
      break
    case 'question':
      variations.push(
        `Why do Christians say ${topic} is important but rarely do it?`,
        `Can someone explain why ${topic} feels so hard?`,
        `Is it just me or is ${topic} the most misunderstood part of faith?`
      )
      break
    case 'revelation':
      variations.push(
        `What nobody tells you about ${topic} in real life`,
        `The ${topic} truth that your pastor won't share`,
        `Why everything you know about ${topic} might be wrong`
      )
      break
    case 'challenge':
      variations.push(
        `I dare you to practice ${topic} for 7 days straight`,
        `Try this: ${topic} before you check your phone each morning`,
        `Join me: 30 days of ${topic} - day 1 starts now`
      )
      break
    case 'relatable':
      variations.push(
        `POV: You're trying ${topic} but life keeps interrupting`,
        `That moment when ${topic} actually works and you're shook`,
        `${topic} is hard and pretending it's not doesn't help anyone`
      )
      break
  }

  return variations
}

// Get real hooks from viral videos
export async function getViralHookExamples(
  category?: string,
  minViews: number = 500000
): Promise<ViralHook[]> {
  const videos = await getTopChristianTikTokHooks(200, minViews)

  return videos
    .filter((v) => v.hook_transcript && v.hook_transcript.length > 10)
    .map((v) => ({
      id: v.id,
      hook: v.hook_transcript,
      views: v.view_count,
      engagementRate:
        ((v.like_count + v.comment_count + v.share_count) / v.view_count) * 100,
      author: v.author_name,
      wordCount: v.hook_transcript.split(' ').length,
      category: categorizeHook(v.hook_transcript),
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 50)
}

// Categorize a hook based on its content
function categorizeHook(hook: string): string {
  const lower = hook.toLowerCase()

  if (
    lower.includes('i used to') ||
    (lower.includes('from') && lower.includes('to'))
  ) {
    return 'transformation'
  }
  if (lower.includes('?') || lower.includes('why') || lower.includes('how')) {
    return 'question'
  }
  if (
    lower.includes('nobody') ||
    lower.includes('secret') ||
    lower.includes('truth')
  ) {
    return 'revelation'
  }
  if (
    lower.includes('challenge') ||
    lower.includes('dare') ||
    lower.includes('try this')
  ) {
    return 'challenge'
  }
  if (
    lower.includes('pov') ||
    lower.includes('that moment') ||
    lower.includes('when you')
  ) {
    return 'relatable'
  }

  return 'other'
}

// Generate hooks for Personal Prayers app specifically
export function generatePrayerAppHooks(): Record<string, string[]> {
  return {
    transformation: [
      "I used to pray for 30 seconds, now I can't stop talking to God",
      "From forgetting to pray to praying without ceasing - here's how",
      'Prayer used to feel fake to me, but then I learned this one thing',
      'I went from prayer anxiety to prayer addiction in 21 days',
    ],
    question: [
      "Why does prayer feel so awkward when you're just starting?",
      'Is it just me or do prayer apps make prayer feel like a chore?',
      "Why don't we talk about how hard it is to pray when you're depressed?",
      'Can someone explain why my prayers feel more real at 3am?',
    ],
    revelation: [
      'What nobody tells you about unanswered prayers',
      'The prayer mistake everyone makes (including pastors)',
      "Why your prayers might feel empty (it's not what you think)",
      'The scientific reason prayer actually changes your brain',
    ],
    challenge: [
      'I challenge you to pray for 2 minutes without asking for anything',
      'Try this: Pray for your enemies before you pray for yourself',
      '7-day challenge: Thank God before you ask for anything',
      'Join me: 30 days of prayer journaling using this app',
    ],
    relatable: [
      'POV: You download a prayer app but still forget to pray',
      "That moment when you realize you've been praying to your ceiling fan",
      "Prayer is basically spiritual therapy and I'm here for it",
      "When the prayer app notification hits while you're sinning >>>",
    ],
  }
}

// Analyze hook performance potential
export function analyzeHookPotential(hook: string): {
  score: number
  strengths: string[]
  improvements: string[]
} {
  const analysis = {
    score: 0,
    strengths: [] as string[],
    improvements: [] as string[],
  }

  // Check length (12-15 words is optimal)
  const wordCount = hook.split(' ').length
  if (wordCount >= 10 && wordCount <= 18) {
    analysis.score += 20
    analysis.strengths.push('Optimal length for retention')
  } else if (wordCount < 10) {
    analysis.improvements.push(
      'Consider adding more detail - aim for 12-15 words'
    )
  } else {
    analysis.improvements.push(
      'Consider shortening - hooks over 18 words lose attention'
    )
  }

  // Check for power words
  const powerWords = [
    'god',
    'jesus',
    'truth',
    'secret',
    'nobody',
    'change',
    'real',
    'actually',
  ]
  const hookLower = hook.toLowerCase()
  const foundPowerWords = powerWords.filter((word) => hookLower.includes(word))
  if (foundPowerWords.length > 0) {
    analysis.score += 10 * foundPowerWords.length
    analysis.strengths.push(
      `Contains power words: ${foundPowerWords.join(', ')}`
    )
  } else {
    analysis.improvements.push(
      'Add power words like "truth", "secret", or "real"'
    )
  }

  // Check for personal element
  if (
    hookLower.includes('i ') ||
    hookLower.includes('my ') ||
    hookLower.includes('me ')
  ) {
    analysis.score += 15
    analysis.strengths.push('Personal perspective increases relatability')
  } else {
    analysis.improvements.push('Consider adding personal element ("I", "my")')
  }

  // Check for curiosity gap
  if (
    hook.includes('?') ||
    hookLower.includes('how') ||
    hookLower.includes('why')
  ) {
    analysis.score += 15
    analysis.strengths.push('Creates curiosity gap')
  }

  // Check for specificity
  if (/\d+/.test(hook) || hook.includes('day') || hook.includes('minute')) {
    analysis.score += 10
    analysis.strengths.push('Specific details increase credibility')
  } else {
    analysis.improvements.push('Add specific numbers or timeframes')
  }

  return analysis
}

// Generate multiple hooks for Jesus animation videos
export async function generateMultipleTikTokHooks(
  videoContexts: { id: string; context: string }[]
): Promise<{ [id: string]: string }> {
  const hooks: { [id: string]: string } = {}

  // For Jesus videos, we'll use guilt/conviction strategy
  const jesusHooks = [
    'watch how Jesus reacts when you ignore him again',
    'this is what Jesus sees when you choose sin over him',
    'the moment Jesus realizes you forgot about him today',
    'when Jesus watches you scroll past without praying',
    'what happens in heaven when you deny him on earth',
    'Jesus waiting for you to finally trust him with that problem',
    'the prayer Jesus has been waiting to hear from you',
    "watch Jesus's face when you choose the world over him",
    'this is why Jesus cried over your choices yesterday',
    'when you realize Jesus never stopped pursuing you',
  ]

  videoContexts.forEach(({ id }, index) => {
    // Rotate through hooks or pick randomly
    hooks[id] = jesusHooks[index % jesusHooks.length]
  })

  return hooks
}
