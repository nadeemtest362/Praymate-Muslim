import { callClaude } from './claude-proxy-service'

// Check if Claude API is healthy and responsive
export async function checkClaudeHealth(): Promise<{
  healthy: boolean
  message: string
  responseTime?: number
}> {
  const startTime = Date.now()

  try {
    const testPrompt =
      'Respond with just the JSON: {"status":"ok","model":"claude"}'
    const response = await callClaude(
      [
        {
          role: 'user',
          content: testPrompt,
        },
      ],
      'claude-3-5-sonnet-20241022',
      128
    )

    const responseTime = Date.now() - startTime

    // Check if response looks valid
    if (response && response.includes('ok')) {
      return {
        healthy: true,
        message: 'Claude API is responding normally',
        responseTime,
      }
    } else {
      return {
        healthy: false,
        message: 'Claude API returned unexpected response',
        responseTime,
      }
    }
  } catch (error: any) {
    return {
      healthy: false,
      message: `Claude API error: ${error.message || 'Unknown error'}`,
      responseTime: Date.now() - startTime,
    }
  }
}

// Rate limit tracker
let requestCount = 0
let windowStart = Date.now()
const RATE_WINDOW = 60000 // 1 minute
const MAX_REQUESTS_PER_WINDOW = 50 // Conservative limit

export function checkRateLimit(): {
  canProceed: boolean
  requestsRemaining: number
  resetIn: number
} {
  const now = Date.now()

  // Reset window if needed
  if (now - windowStart > RATE_WINDOW) {
    requestCount = 0
    windowStart = now
  }

  const canProceed = requestCount < MAX_REQUESTS_PER_WINDOW
  const requestsRemaining = Math.max(0, MAX_REQUESTS_PER_WINDOW - requestCount)
  const resetIn = Math.max(0, RATE_WINDOW - (now - windowStart))

  return { canProceed, requestsRemaining, resetIn }
}

export function incrementRequestCount() {
  requestCount++
}
