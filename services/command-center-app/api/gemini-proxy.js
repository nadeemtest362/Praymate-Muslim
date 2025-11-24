import fs from 'fs'
import FormData from 'form-data'
import fetch from 'node-fetch'

export default async function handler(req, res) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const { action, apiKey } = req.body
  
  if (!action || !apiKey) {
    return res.status(400).json({ error: 'Action and API key required' })
  }

  try {
    if (action === 'upload') {
      // Handle file upload
      const { videoUrl } = req.body
      
      // Download video
      const videoResponse = await fetch(videoUrl)
      const videoBuffer = await videoResponse.buffer()
      
      // Create form data
      const formData = new FormData()
      formData.append('file', videoBuffer, {
        filename: 'video.mp4',
        contentType: 'video/mp4'
      })
      
      // Upload to Gemini
      const uploadResponse = await fetch(
        `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`,
        {
          method: 'POST',
          body: formData,
          headers: formData.getHeaders()
        }
      )
      
      const result = await uploadResponse.json()
      return res.json(result)
      
    } else if (action === 'checkStatus') {
      // Check file status
      const { fileName } = req.body
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${apiKey}`
      )
      const result = await response.json()
      return res.json(result)
      
    } else if (action === 'analyze') {
      // Generate content
      const { fileUri, prompt } = req.body
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [
                {
                  fileData: {
                    mimeType: 'video/mp4',
                    fileUri: fileUri
                  }
                },
                {
                  text: prompt
                }
              ]
            }],
            generationConfig: {
              temperature: 0.4,
              topK: 32,
              topP: 0.9,
              maxOutputTokens: 8192
            }
          })
        }
      )
      const result = await response.json()
      return res.json(result)
    }
    
  } catch (error) {
    console.error('Gemini proxy error:', error)
    res.status(500).json({ error: error.message })
  }
}