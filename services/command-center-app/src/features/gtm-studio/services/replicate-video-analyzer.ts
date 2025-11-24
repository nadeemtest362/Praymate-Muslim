// Analyze video using Replicate's video analysis models
export async function analyzeVideoWithReplicate(
  videoUrl: string
): Promise<{ text: string | null; success: boolean }> {
  console.log('Analyzing video with Replicate API...')

  const replicateApiKey = import.meta.env.VITE_REPLICATE_API_KEY
  if (!replicateApiKey) {
    console.error('Replicate API key not configured')
    return { text: null, success: false }
  }

  try {
    // Use Video-LLaVA model for video understanding
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        Authorization: `Token ${replicateApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version:
          'a494250c93f36e14abb6b12511102a56e2465ae35164b15a260a0a1e1c66a314', // video-llava model
        input: {
          video: videoUrl,
          prompt: `Analyze this TikTok video and extract:
1. HOOK: What is said or shown in the first 3 seconds that grabs attention? (exact words)
2. TEXT ON SCREEN: All text overlays throughout the video
3. WHAT'S BEING SAID: Key quotes or dialogue
4. VISUAL ELEMENTS: What makes it visually engaging
5. EMOTIONAL IMPACT: What emotions does it trigger

Be specific and focus on what makes this video viral.`,
        },
      }),
    })

    if (!response.ok) {
      throw new Error(`Replicate API error: ${response.status}`)
    }

    const prediction = await response.json()

    // Poll for completion
    let result = prediction
    while (result.status === 'starting' || result.status === 'processing') {
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const statusResponse = await fetch(
        `https://api.replicate.com/v1/predictions/${result.id}`,
        {
          headers: {
            Authorization: `Token ${replicateApiKey}`,
          },
        }
      )

      result = await statusResponse.json()
    }

    if (result.status === 'succeeded' && result.output) {
      console.log('Replicate video analysis completed')
      return { text: result.output, success: true }
    } else {
      throw new Error('Replicate analysis failed: ' + result.error)
    }
  } catch (error) {
    console.error('Error analyzing video with Replicate:', error)
    return { text: null, success: false }
  }
}
