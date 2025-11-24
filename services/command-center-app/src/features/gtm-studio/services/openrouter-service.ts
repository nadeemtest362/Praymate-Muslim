import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { generateText, streamText } from 'ai'

// Initialize OpenRouter client
const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || ''
const USE_MOCK =
  !OPENROUTER_API_KEY || import.meta.env.VITE_USE_MOCK_OPENROUTER === 'true'

const openrouter = createOpenRouter({
  apiKey: OPENROUTER_API_KEY,
})

// Available models categorized by use case (prices are per 1M tokens)
export const OPENROUTER_MODELS = {
  // Fast & Cheap models for simple tasks
  fast: [
    {
      id: 'deepseek/deepseek-r1-0528-qwen3-8b:free',
      name: 'DeepSeek R1 8B (Free)',
      provider: 'DeepSeek',
      description: 'Free reasoning model, great for testing',
      costPer1M: 0,
    },
    {
      id: 'deepseek/deepseek-r1-distill-qwen-7b',
      name: 'DeepSeek R1 Distill 7B',
      provider: 'DeepSeek',
      description: 'Ultra-cheap reasoning model',
      costPer1M: 0.15, // $0.10 input + $0.20 completion avg
    },
    {
      id: 'google/gemini-2.5-flash-preview-05-20',
      name: 'Gemini 2.5 Flash',
      provider: 'Google',
      description: 'Latest Google fast model',
      costPer1M: 0.38, // $0.15 input + $0.60 completion avg
    },
    {
      id: 'mistralai/devstral-small',
      name: 'Mistral Devstral Small',
      provider: 'Mistral AI',
      description: 'Optimized for code tasks',
      costPer1M: 0.09, // $0.06 input + $0.12 completion avg
    },
  ],

  // Balanced models for general tasks
  balanced: [
    {
      id: 'anthropic/claude-sonnet-4',
      name: 'Claude Sonnet 4',
      provider: 'Anthropic',
      description: 'Latest balanced Claude model',
      costPer1M: 9, // $3 input + $15 completion avg
    },
    {
      id: 'mistralai/mistral-medium-3',
      name: 'Mistral Medium 3',
      provider: 'Mistral AI',
      description: 'Strong general purpose model',
      costPer1M: 1.2, // $0.40 input + $2 completion avg
    },
    {
      id: 'deepseek/deepseek-r1-0528',
      name: 'DeepSeek R1',
      provider: 'DeepSeek',
      description: 'Reasoning model with exposed thoughts',
      costPer1M: 1.33, // $0.50 input + $2.15 completion avg
    },
    {
      id: 'openai/gpt-4o-mini',
      name: 'GPT-4o Mini',
      provider: 'OpenAI',
      description: 'Efficient GPT-4 quality',
      costPer1M: 0.45, // $0.15 input + $0.60 completion avg
    },
  ],

  // Premium models for complex tasks
  premium: [
    {
      id: 'anthropic/claude-opus-4',
      name: 'Claude Opus 4',
      provider: 'Anthropic',
      description: 'Best for coding & complex reasoning',
      costPer1M: 45, // $15 input + $75 completion avg
    },
    {
      id: 'google/gemini-2.5-pro-preview',
      name: 'Gemini 2.5 Pro',
      provider: 'Google',
      description: "Google's most advanced model",
      costPer1M: 5.63, // $1.25 input + $10 completion avg
    },
    {
      id: 'openai/gpt-4o',
      name: 'GPT-4o',
      provider: 'OpenAI',
      description: "OpenAI's flagship model",
      costPer1M: 7.5, // $2.50 input + $10 completion avg
    },
    {
      id: 'openai/o1',
      name: 'OpenAI o1',
      provider: 'OpenAI',
      description: 'Advanced reasoning with hidden CoT',
      costPer1M: 45, // $15 input + $60 completion avg
    },
  ],

  // Specialized models
  specialized: [
    {
      id: 'perplexity/llama-3.1-sonar-large-128k-online',
      name: 'Perplexity Sonar',
      provider: 'Perplexity',
      description: 'With internet access for current info',
      costPer1M: 1,
    },
    {
      id: 'google/gemini-2.5-flash-preview-05-20:thinking',
      name: 'Gemini 2.5 Flash (Thinking)',
      provider: 'Google',
      description: 'Shows reasoning process',
      costPer1M: 1.83, // $0.15 input + $3.50 completion avg
    },
    {
      id: 'meta-llama/llama-3.3-8b-instruct:free',
      name: 'Llama 3.3 8B (Free)',
      provider: 'Meta',
      description: 'Latest free Llama model',
      costPer1M: 0,
    },
    {
      id: 'x-ai/grok-beta',
      name: 'Grok Beta',
      provider: 'xAI',
      description: "Elon's model with humor",
      costPer1M: 7.5, // $5 input + $10 completion avg
    },
  ],
}

// Get recommended model for specific task type
export function getRecommendedModel(taskType: string) {
  switch (taskType) {
    case 'generate-video':
    case 'analyze-metrics':
      return OPENROUTER_MODELS.balanced[0] // Claude Sonnet 4

    case 'post-social':
    case 'schedule-post':
      return OPENROUTER_MODELS.fast[0] // DeepSeek Free

    case 'generate-report':
    case 'crawl-comments':
      return OPENROUTER_MODELS.premium[0] // Claude Opus 4

    case 'notify-team':
    case 'update-task':
      return OPENROUTER_MODELS.fast[1] // DeepSeek Distill 7B

    default:
      return OPENROUTER_MODELS.balanced[3] // GPT-4o Mini
  }
}

// Mock response generator
async function generateMockResponse(prompt: string, modelId: string) {
  console.log('🤖 Mock OpenRouter model run:', modelId)
  console.log('📝 Prompt:', prompt.substring(0, 100) + '...')

  // Simulate API delay
  await new Promise((resolve) =>
    setTimeout(resolve, 500 + Math.random() * 1000)
  )

  // Generate context-aware mock responses
  if (prompt.includes('video script')) {
    return `HOOK: Did you know 73% of people struggle with daily prayer?
PROBLEM: It's hard to stay consistent and focused
SOLUTION: Personal Prayers app - your AI prayer companion
DEMO: Custom prayers, reminders, prayer circles
CTA: Download now and transform your prayer life!`
  }

  if (prompt.includes('caption')) {
    return `🙏 Transform your prayer life with AI! 

Ever struggled to find the right words? Our app creates personalized prayers just for you.

✨ Features:
• AI-generated prayers
• Daily reminders
• Prayer circles
• Track your journey

Download now! Link in bio 🔗

#PrayerApp #ChristianTech #FaithJourney #PrayerLife #TechForGood #AIForFaith #DailyPrayer #ChristianApp`
  }

  if (prompt.includes('analyze')) {
    return `Analysis Results:
1. Key Performance: Task completion rate is 78%
2. Trends: Increasing engagement on weekends
3. Recommendations: Focus on mobile optimization
4. Predicted outcome: 45% growth potential
5. Risk factors: Competition from similar apps`
  }

  // Default response
  return `Generated response for: ${prompt.substring(0, 50)}...
This is a mock response. Connect your OpenRouter API key for real AI responses.`
}

// Execute AI task with selected model
export async function executeAITask(
  modelId: string,
  prompt: string,
  systemPrompt?: string,
  stream = false
) {
  try {
    if (USE_MOCK) {
      return generateMockResponse(prompt, modelId)
    }

    console.log('🚀 Running real OpenRouter API:', modelId)

    if (stream) {
      const result = await streamText({
        model: openrouter(modelId),
        messages: [
          ...(systemPrompt
            ? [{ role: 'system' as const, content: systemPrompt }]
            : []),
          { role: 'user' as const, content: prompt },
        ],
      })

      return result
    } else {
      const result = await generateText({
        model: openrouter(modelId),
        messages: [
          ...(systemPrompt
            ? [{ role: 'system' as const, content: systemPrompt }]
            : []),
          { role: 'user' as const, content: prompt },
        ],
      })

      return result.text
    }
  } catch (error) {
    console.error('OpenRouter API error:', error)
    throw error
  }
}

// Task-specific AI functions
export async function generateVideoScript(
  taskDetails: string,
  modelId = 'anthropic/claude-sonnet-4'
) {
  const prompt = `Create a compelling video script for a TikTok video about: ${taskDetails}
  
  Format the response as:
  HOOK: (first 3 seconds)
  PROBLEM: (identify pain point)
  SOLUTION: (introduce the app)
  DEMO: (quick feature showcase)
  CTA: (call to action)
  
  Keep it under 60 seconds when read aloud.`

  return executeAITask(modelId, prompt)
}

export async function generateSocialCaption(
  content: string,
  platform: 'tiktok' | 'instagram' | 'youtube',
  modelId = 'deepseek/deepseek-r1-0528-qwen3-8b:free'
) {
  const prompt = `Write an engaging ${platform} caption for: ${content}
  
  Include:
  - Attention-grabbing first line
  - Relevant hashtags (5-10)
  - Call to action
  - Emoji usage appropriate for ${platform}
  
  Keep it concise and platform-appropriate.`

  return executeAITask(modelId, prompt)
}

export async function analyzeTaskMetrics(
  taskData: any,
  modelId = 'anthropic/claude-opus-4'
) {
  const prompt = `Analyze the following task performance data and provide insights:
  
  ${JSON.stringify(taskData, null, 2)}
  
  Provide:
  1. Key performance indicators
  2. Trends and patterns
  3. Actionable recommendations
  4. Predicted outcomes
  5. Risk factors`

  const systemPrompt = `You are a data analyst specializing in social media marketing and GTM campaigns.`

  return executeAITask(modelId, prompt, systemPrompt)
}

export async function generateTaskReport(
  taskInfo: any,
  modelId = 'anthropic/claude-opus-4'
) {
  const prompt = `Generate a comprehensive report for the following GTM task:
  
  ${JSON.stringify(taskInfo, null, 2)}
  
  Include:
  1. Executive Summary
  2. Progress Status
  3. Key Achievements
  4. Challenges & Solutions
  5. Next Steps
  6. Resource Requirements`

  return executeAITask(modelId, prompt)
}

// Model cost estimation
export function estimateTokenCost(
  text: string,
  modelId: string,
  tokensPerChar = 0.25 // Rough estimate: 1 token ≈ 4 characters
): { tokens: number; estimatedCost: number } {
  const tokens = Math.ceil(text.length * tokensPerChar)
  const model = Object.values(OPENROUTER_MODELS)
    .flat()
    .find((m) => m.id === modelId)

  const costPer1M = model?.costPer1M || 1
  const estimatedCost = (tokens / 1_000_000) * costPer1M

  return { tokens, estimatedCost }
}
