// Proxy service for Claude API calls through image-gen-service
const IMAGE_GEN_URL =
  import.meta.env.VITE_IMAGE_GEN_URL ||
  'https://cc-image-gen-service-production.up.railway.app'

export async function callClaude(
  messages: any[],
  model = 'claude-3-5-sonnet-20241022',
  maxTokens = 1024
) {
  try {
    const response = await fetch(`${IMAGE_GEN_URL}/api/claude`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        model,
        max_tokens: maxTokens,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Claude proxy error:', error)
      throw new Error('Failed to call Claude API')
    }

    const data = await response.json()
    return data.content
  } catch (error) {
    console.error('Claude proxy error:', error)
    throw error
  }
}
