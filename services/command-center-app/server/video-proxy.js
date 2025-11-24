import express from 'express';
import fetch from 'node-fetch';

const router = express.Router();

router.get('/api/proxy-video', async (req, res) => {
  const { url } = req.query;
  
  if (!url) {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.tiktok.com/'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `Failed to fetch video: ${response.statusText}` });
    }

    // Stream the response
    res.setHeader('Content-Type', response.headers.get('content-type') || 'video/mp4');
    response.body.pipe(res);
  } catch (error) {
    console.error('Video proxy error:', error);
    res.status(500).json({ error: 'Failed to proxy video' });
  }
});

export default router;