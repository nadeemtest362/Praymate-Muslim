// Example Vercel/Netlify serverless function for Replicate proxy
// Deploy this to handle Replicate API calls from your frontend

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { model, input } = req.body;
  const REPLICATE_API_KEY = process.env.REPLICATE_API_KEY;

  if (!REPLICATE_API_KEY) {
    return res.status(500).json({ error: 'Replicate API key not configured' });
  }

  try {
    // Create prediction
    const createResponse = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${REPLICATE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: model,
        input: input,
      }),
    });

    if (!createResponse.ok) {
      const error = await createResponse.text();
      return res.status(createResponse.status).json({ error });
    }

    const prediction = await createResponse.json();

    // Poll for completion
    let result = prediction;
    while (result.status !== 'succeeded' && result.status !== 'failed') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const pollResponse = await fetch(
        `https://api.replicate.com/v1/predictions/${result.id}`,
        {
          headers: {
            'Authorization': `Token ${REPLICATE_API_KEY}`,
          },
        }
      );
      
      result = await pollResponse.json();
    }

    if (result.status === 'failed') {
      return res.status(400).json({ error: result.error });
    }

    return res.status(200).json({ output: result.output });
  } catch (error) {
    console.error('Replicate proxy error:', error);
    return res.status(500).json({ error: error.message });
  }
}