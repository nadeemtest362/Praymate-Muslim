// Simple local proxy server for Replicate API during development
// Run with: node server/replicate-proxy.js

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/replicate', async (req, res) => {
  const { model, input } = req.body;
  const REPLICATE_API_KEY = process.env.REPLICATE_API_KEY;

  if (!REPLICATE_API_KEY) {
    return res.status(500).json({ error: 'REPLICATE_API_KEY not set in .env' });
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
    console.log('Prediction created:', prediction.id);

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
      console.log('Status:', result.status);
    }

    if (result.status === 'failed') {
      return res.status(400).json({ error: result.error });
    }

    return res.status(200).json({ output: result.output });
  } catch (error) {
    console.error('Replicate proxy error:', error);
    return res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PROXY_PORT || 3002;
app.listen(PORT, () => {
  console.log(`Replicate proxy running on http://localhost:${PORT}`);
});