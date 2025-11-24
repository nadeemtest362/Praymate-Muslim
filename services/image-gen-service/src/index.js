const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const fetch = require('node-fetch');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const tmp = require('tmp');
const { createClient } = require('@supabase/supabase-js');

dotenv.config();

const app = express();
// Railway provides PORT, fallback to 4000 for local dev
const PORT = process.env.PORT || 4000;

// Initialize Supabase client for viral video DB
const supabaseUrl = process.env.VIRAL_SUPABASE_URL;
const supabaseKey = process.env.VIRAL_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// Enable CORS for all origins (configure this for production)
app.use(cors());
app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'Image Generation Service',
    version: '1.0.0',
    node: process.version,
    apiKeyConfigured: !!process.env.REPLICATE_API_KEY
  });
});

// Test endpoint to verify external requests work
app.get('/test', async (req, res) => {
  try {
    const response = await fetch('https://api.replicate.com/v1/models', {
      headers: {
        'Authorization': `Token ${process.env.REPLICATE_API_KEY}`,
      },
    });
    
    res.json({
      status: 'ok',
      replicateApiStatus: response.status,
      replicateApiOk: response.ok
    });
  } catch (error) {
    res.json({
      status: 'error',
      error: error.message
    });
  }
});

// Replicate proxy endpoint
app.post('/api/replicate', async (req, res) => {
  const { model, input } = req.body;
  const REPLICATE_API_KEY = process.env.REPLICATE_API_KEY;

  if (!REPLICATE_API_KEY) {
    return res.status(500).json({ 
      error: 'Service not configured properly',
      message: 'REPLICATE_API_KEY is missing'
    });
  }

  try {
    console.log(`[${new Date().toISOString()}] Creating prediction for model: ${model}`);
    
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
      console.error('Replicate API error:', error);
      return res.status(createResponse.status).json({ 
        error: 'Failed to create prediction',
        details: error 
      });
    }

    const prediction = await createResponse.json();
    console.log(`Prediction ${prediction.id} created, status: ${prediction.status}`);

    // Poll for completion
    let result = prediction;
    let pollCount = 0;
    // Much longer timeouts to account for queueing
    const isVideoModel = model.includes('video') || model.includes('i2v') || model.includes('wan-2.1');
    const maxPolls = isVideoModel ? 1200 : 300; // 20 minutes for video, 5 minutes for images
    
    console.log(`Using ${maxPolls}s timeout for ${isVideoModel ? 'video' : 'image'} model`);
    
    // Track queue time
    let queueStartTime = Date.now();
    let processingStartTime = null;
    
    while (result.status !== 'succeeded' && result.status !== 'failed' && pollCount < maxPolls) {
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
      
      if (!pollResponse.ok) {
        throw new Error('Failed to poll prediction status');
      }
      
      result = await pollResponse.json();
      
      // Track when we move from queued to processing
      if (result.status === 'processing' && !processingStartTime) {
        processingStartTime = Date.now();
        const queueTime = Math.round((processingStartTime - queueStartTime) / 1000);
        console.log(`✅ Started processing after ${queueTime}s in queue`);
      }
      
      if (pollCount % 10 === 0) {
        const status = result.status === 'starting' ? 'queued' : result.status;
        console.log(`Still ${status}... (${pollCount}s total)`);
        
        // Log metrics if available
        if (result.metrics?.predict_time) {
          console.log(`  Processing time: ${result.metrics.predict_time}s`);
        }
      }
    }

    if (result.status === 'failed') {
      console.error('Prediction failed:', result.error);
      return res.status(400).json({ 
        error: 'Prediction failed',
        details: result.error 
      });
    }

    if (pollCount >= maxPolls) {
      const timeoutMinutes = Math.round(maxPolls / 60);
      return res.status(408).json({ 
        error: 'Prediction timeout',
        message: `${isVideoModel ? 'Video' : 'Image'} generation took longer than ${timeoutMinutes} minutes. The queue might be very long.`,
        predictionId: result.id,
        lastStatus: result.status,
        tip: 'You can check the status at: https://replicate.com/predictions/' + result.id
      });
    }

    console.log(`✅ Prediction completed in ${pollCount}s`);
    return res.status(200).json({ output: result.output });
    
  } catch (error) {
    console.error('Service error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

// Claude proxy endpoint
app.post('/api/claude', async (req, res) => {
  const { messages, model = 'claude-3-5-sonnet-20241022', max_tokens = 1024 } = req.body;
  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ 
      error: 'Service not configured properly',
      message: 'ANTHROPIC_API_KEY is missing'
    });
  }

  try {
    console.log(`[${new Date().toISOString()}] Calling Claude API with model: ${model}`);
    
    // Extract system message if present
    let system = undefined;
    let userMessages = messages;
    
    if (messages && messages.length > 0 && messages[0].role === 'system') {
      system = messages[0].content;
      userMessages = messages.slice(1);
    }
    
    // Build request body according to Anthropic API documentation
    const requestBody = {
      model,
      max_tokens,
      messages: userMessages
    };
    
    // Add system as top-level parameter if present
    if (system) {
      requestBody.system = system;
    }
    
    console.log('Claude API request:', JSON.stringify(requestBody, null, 2));
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Claude API error:', error);
      return res.status(response.status).json({ 
        error: 'Failed to call Claude API',
        details: error 
      });
    }

    const data = await response.json();
    console.log(`✅ Claude API response received`);
    
    return res.status(200).json({ 
      content: data.content[0].text 
    });
    
  } catch (error) {
    console.error('Service error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

// Video caption burning endpoint
app.post('/api/video/add-caption', async (req, res) => {
  const { videoUrl, caption, style = 'tiktok' } = req.body;
  
  if (!videoUrl || !caption) {
    return res.status(400).json({ 
      error: 'Missing required parameters',
      message: 'videoUrl and caption are required'
    });
  }

  // Create temp directory for processing
  const tmpDir = tmp.dirSync({ unsafeCleanup: true });
  const inputPath = path.join(tmpDir.name, 'input.mp4');
  const outputPath = path.join(tmpDir.name, 'output.mp4');

  try {
    console.log(`[${new Date().toISOString()}] Adding caption to video: ${caption}`);
    
    // Download video to temp file
    console.log('Downloading video...');
    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) throw new Error('Failed to download video');
    
    const videoBuffer = await videoResponse.buffer();
    fs.writeFileSync(inputPath, videoBuffer);
    
    // Process video with FFmpeg
    console.log('Processing video with caption...');
    await new Promise((resolve, reject) => {
      // TikTok style text settings - smaller and positioned to avoid side controls
      // Use fontconfig default font on Linux (Railway), fallback to system font
      const fontFile = process.platform === 'darwin' 
        ? '/System/Library/Fonts/Helvetica.ttc' 
        : 'DejaVuSans'; // Default font available on most Linux systems
      const fontSize = 32; // Reduced from 48 for TikTok compatibility
      const fontColor = 'white';
      const borderWidth = 3; // Reduced from 4
      const borderColor = 'black';
      
      // Split caption into lines if too long (max 25 chars per line to leave room for side controls)
      const maxCharsPerLine = 25;
      const words = caption.split(' ');
      const lines = [];
      let currentLine = '';
      
      words.forEach(word => {
        if ((currentLine + ' ' + word).trim().length <= maxCharsPerLine) {
          currentLine = currentLine ? currentLine + ' ' + word : word;
        } else {
          if (currentLine) lines.push(currentLine);
          currentLine = word;
        }
      });
      if (currentLine) lines.push(currentLine);
      
      // Create drawtext filter for each line
      const lineHeight = fontSize + 10;
      const totalHeight = lines.length * lineHeight;
      const startY = `(h-${totalHeight})/2`;
      
      const drawtextFilters = lines.map((line, index) => {
        const yPosition = `${startY}+${index * lineHeight}`;
        // Shift text slightly left to avoid TikTok's right-side controls
        return `drawtext=text='${line.replace(/'/g, "\\'")}':fontfile='${fontFile}':fontsize=${fontSize}:fontcolor=${fontColor}:borderw=${borderWidth}:bordercolor=${borderColor}:x=(w-text_w-80)/2:y=${yPosition}`;
      }).join(',');
      
      ffmpeg(inputPath)
        .outputOptions([
          '-vf', drawtextFilters,
          '-codec:a', 'copy', // Keep audio as-is
          '-preset', 'fast',
          '-movflags', '+faststart' // Optimize for web streaming
        ])
        .output(outputPath)
        .on('start', (commandLine) => {
          console.log('FFmpeg command:', commandLine);
        })
        .on('progress', (progress) => {
          console.log(`Processing: ${progress.percent}% done`);
        })
        .on('end', () => {
          console.log('Video processing completed');
          resolve();
        })
        .on('error', (err) => {
          console.error('FFmpeg error:', err);
          reject(err);
        })
        .run();
    });
    
    // Read processed video
    const processedVideo = fs.readFileSync(outputPath);
    
    // Upload to Supabase storage
    let processedVideoUrl;
    
    if (supabase) {
      const timestamp = Date.now();
      const fileName = `captioned-${timestamp}.mp4`;
      const filePath = `captioned-videos/${fileName}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('toktrendz-media')
        .upload(filePath, processedVideo, {
          contentType: 'video/mp4',
          cacheControl: '3600',
          upsert: false
        });
      
      if (uploadError) {
        console.error('Failed to upload to Supabase:', uploadError);
        throw new Error('Failed to upload processed video');
      }
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('toktrendz-media')
        .getPublicUrl(filePath);
      
      processedVideoUrl = publicUrl;
    } else {
      // Fallback to base64 if Supabase not configured
      console.warn('Supabase not configured, returning base64 video');
      const base64Video = processedVideo.toString('base64');
      processedVideoUrl = `data:video/mp4;base64,${base64Video}`;
    }
    
    // Clean up temp files
    tmpDir.removeCallback();
    
    return res.status(200).json({ 
      processedVideoUrl,
      message: 'Video processed successfully',
      caption: caption,
      style: style
    });
    
  } catch (error) {
    console.error('Video processing error:', error);
    tmpDir.removeCallback();
    return res.status(500).json({ 
      error: 'Failed to process video',
      message: error.message 
    });
  }
});

// Add process error handlers
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`
🎨 Image Generation Service
📍 Running on port ${PORT}
🔑 Replicate API Key: ${process.env.REPLICATE_API_KEY ? '✅ Configured' : '❌ Missing'}
🤖 Anthropic API Key: ${process.env.ANTHROPIC_API_KEY ? '✅ Configured' : '❌ Missing'}
💾 Supabase Storage: ${supabase ? '✅ Configured' : '❌ Missing'}
🎬 FFmpeg: Ready for video processing
🌐 Node version: ${process.version}
🚀 Ready to generate images, enhance prompts, and add captions to videos!
  `);
});