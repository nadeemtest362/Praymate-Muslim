// Example endpoint to add to your Prayer API service on Railway
// Add this to your existing Express/Fastify backend
import { Request, Response } from 'express'

export async function replicateProxyHandler(req: Request, res: Response) {
  const { model, input } = req.body
  const REPLICATE_API_KEY = process.env.REPLICATE_API_KEY

  if (!REPLICATE_API_KEY) {
    return res.status(500).json({ error: 'Replicate API key not configured' })
  }

  try {
    // Create prediction
    const createResponse = await fetch(
      'https://api.replicate.com/v1/predictions',
      {
        method: 'POST',
        headers: {
          Authorization: `Token ${REPLICATE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          version: model,
          input: input,
        }),
      }
    )

    if (!createResponse.ok) {
      const error = await createResponse.text()
      return res.status(createResponse.status).json({ error })
    }

    const prediction = await createResponse.json()

    // Poll for completion
    let result = prediction
    let pollCount = 0
    const maxPolls = 60 // Max 60 seconds

    while (
      result.status !== 'succeeded' &&
      result.status !== 'failed' &&
      pollCount < maxPolls
    ) {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      pollCount++

      const pollResponse = await fetch(
        `https://api.replicate.com/v1/predictions/${result.id}`,
        {
          headers: {
            Authorization: `Token ${REPLICATE_API_KEY}`,
          },
        }
      )

      result = await pollResponse.json()
    }

    if (result.status === 'failed') {
      return res.status(400).json({ error: result.error })
    }

    if (pollCount >= maxPolls) {
      return res.status(408).json({ error: 'Prediction timed out' })
    }

    return res.status(200).json({ output: result.output })
  } catch (error: any) {
    console.error('Replicate proxy error:', error)
    return res.status(500).json({ error: error.message })
  }
}

// Add this route to your Express app:
// app.post('/api/replicate', replicateProxyHandler);
