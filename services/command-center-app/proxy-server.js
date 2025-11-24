#!/usr/bin/env node

// STANDALONE Replicate proxy - run this separately!
// npm install express cors dotenv
// node proxy-server.js

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 4000; // Different port from everything else

app.post('/api/replicate', async (req, res) => {
  const { model, input } = req.body;
  const REPLICATE_API_KEY = process.env.VITE_REPLICATE_API_KEY;

  if (!REPLICATE_API_KEY) {
    return res.status(500).json({ error: 'VITE_REPLICATE_API_KEY not found in .env' });
  }

  try {
    console.log(`🎨 Creating prediction for ${model}...`);
    
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
      console.error('Replicate error:', error);
      return res.status(createResponse.status).json({ error });
    }

    const prediction = await createResponse.json();
    console.log(`✅ Prediction ${prediction.id} created, polling...`);

    // Poll for completion
    let result = prediction;
    let pollCount = 0;
    
    while (result.status !== 'succeeded' && result.status !== 'failed' && pollCount < 60) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      pollCount++;
      
      const pollResponse = await fetch(
        `https://api.replicate.com/v1/predictions/${result.id}`,
        {
          headers: {
            'Authorization': `Token ${REPLICATE_API_KEY}`,
          },
        }
      );
      
      result = await pollResponse.json();
      process.stdout.write(`\r⏳ Status: ${result.status} (${pollCount}s)`);
    }

    console.log(''); // New line after status updates

    if (result.status === 'failed') {
      console.error('❌ Prediction failed:', result.error);
      return res.status(400).json({ error: result.error });
    }

    console.log('🎉 Image generated:', result.output);
    return res.status(200).json({ output: result.output });
  } catch (error) {
    console.error('❌ Proxy error:', error);
    return res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`
🚀 Replicate Proxy Server Running!
📍 URL: http://localhost:${PORT}
🔑 Using API Key: ${process.env.VITE_REPLICATE_API_KEY ? '✅ Found' : '❌ Missing'}

Ready to generate real images...
  `);
});