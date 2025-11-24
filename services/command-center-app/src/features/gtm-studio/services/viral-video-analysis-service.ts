// Complete viral video analysis service with ScrapeCreators integration
// Routes videos based on transcript availability: transcript → Claude, no transcript → Gemini
import { callClaude } from './claude-proxy-service'
import { fetchTikTokVideoDetails } from './scrape-creators-service'
import { supabase } from './supabase-service'

interface AnalysisResult {
  overall_summary: string
  original_video_analysis: {
    title: string
    sections: Array<{
      subheading: string
      points: string[]
    }>
    high_probability_viral_reasoning: string
  }
  new_video_concepts: {
    introduction: string
    concepts: Array<{
      theme_title: string
      concept_title: string
      details: {
        concept_description: string
        visuals: string
        audio: string
        emotion: string
      }
    }>
  }
  key_elements_for_success: string[]
}

// Helper function to download video from TikTok via proxy
async function downloadTikTokVideo(videoUrl: string): Promise<Blob | null> {
  try {
    console.log('Downloading video from:', videoUrl)
    // Use proxy to avoid CORS
    const proxyUrl = `/api/proxy-video?url=${encodeURIComponent(videoUrl)}`
    const response = await fetch(proxyUrl)

    if (!response.ok) {
      throw new Error(
        `Failed to download video: ${response.status} ${response.statusText}`
      )
    }

    const blob = await response.blob()
    return blob
  } catch (error) {
    console.error('Error downloading video:', error)
    return null
  }
}

// Use Gemini to analyze video content (with duration cap)
async function analyzeVideoWithGemini(
  videoData: any,
  maxDurationSeconds: number = 30
): Promise<{
  text: string | null
  success: boolean
  modelIdUsed: string | null
}> {
  console.log(`Analyzing video with Gemini API (max ${maxDurationSeconds}s)`)
  const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY

  if (!geminiApiKey) {
    console.error('Gemini API key is missing')
    return { text: null, success: false, modelIdUsed: null }
  }

  try {
    let directVideoUrl: string | undefined
    let tiktokPageUrl: string | undefined

    if (videoData?.video?.play_addr?.url_list?.[0]) {
      directVideoUrl = videoData.video.play_addr.url_list[0]
    } else if (videoData?.share_info?.share_url) {
      tiktokPageUrl = videoData.share_info.share_url
    } else if (videoData?.share_url) {
      tiktokPageUrl = videoData.share_url
    } else if (videoData?.video_url) {
      tiktokPageUrl = videoData.video_url
    } else if (videoData?.aweme_detail) {
      const nestedAwemeDetail = videoData.aweme_detail
      if (nestedAwemeDetail.video?.play_addr?.url_list?.[0]) {
        directVideoUrl = nestedAwemeDetail.video.play_addr.url_list[0]
      }
      if (nestedAwemeDetail.share_info?.share_url) {
        tiktokPageUrl = nestedAwemeDetail.share_info.share_url
      } else if (nestedAwemeDetail.share_url) {
        tiktokPageUrl = nestedAwemeDetail.share_url
      }
    }

    if (!directVideoUrl && tiktokPageUrl) {
      try {
        const fetchedDetails = await fetchTikTokVideoDetails(
          tiktokPageUrl,
          false
        )
        if (fetchedDetails?.aweme_detail?.video?.play_addr?.url_list?.[0]) {
          directVideoUrl =
            fetchedDetails.aweme_detail.video.play_addr.url_list[0]
        }
      } catch (fetchError: any) {
        console.error(
          `Error fetching video details for Gemini for ${tiktokPageUrl}:`,
          fetchError.message
        )
      }
    }

    if (!directVideoUrl) {
      console.error('No direct video URL available for Gemini analysis.')
      return { text: null, success: false, modelIdUsed: null }
    }

    const videoBlob = await downloadTikTokVideo(directVideoUrl)
    if (!videoBlob) {
      console.error('Failed to download video for Gemini analysis.')
      return { text: null, success: false, modelIdUsed: null }
    }

    const sizeMB = (videoBlob.size / (1024 * 1024)).toFixed(2)
    console.log(`Video size: ${sizeMB}MB`)

    if (videoBlob.size > 19 * 1024 * 1024) {
      // Gemini API limit (approx 20MB)
      console.error(
        `Video file size (${sizeMB}MB) exceeds Gemini API limit (20MB).`
      )
      return { text: null, success: false, modelIdUsed: null }
    }

    // Upload video to Gemini and analyze
    const formData = new FormData()
    formData.append('file', videoBlob, 'video.mp4')

    // Upload file to Gemini
    const uploadResponse = await fetch(
      `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${geminiApiKey}`,
      {
        method: 'POST',
        body: formData,
      }
    )

    if (!uploadResponse.ok) {
      throw new Error(
        `Failed to upload video to Gemini: ${uploadResponse.status}`
      )
    }

    const uploadResult = await uploadResponse.json()
    console.log('Gemini upload result:', uploadResult)

    if (!uploadResult.file) {
      console.error('No file in upload result:', uploadResult)
      throw new Error('Upload failed - no file returned')
    }

    const fileUri = uploadResult.file.uri
    const fileName = uploadResult.file.name

    // Fix the file name if it already includes "files/"
    const fileNameForStatus = fileName.startsWith('files/')
      ? fileName
      : `files/${fileName}`

    // Wait for file to be processed
    let fileReady = false
    let attempts = 0
    while (!fileReady && attempts < 30) {
      try {
        const statusResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/${fileNameForStatus}?key=${geminiApiKey}`
        )

        if (!statusResponse.ok) {
          console.error('Gemini file status error:', statusResponse.status)
          throw new Error(`File status check failed: ${statusResponse.status}`)
        }

        const statusResult = await statusResponse.json()
        console.log(
          `Gemini file status (attempt ${attempts + 1}):`,
          statusResult.state
        )

        if (statusResult.state === 'ACTIVE') {
          fileReady = true
        } else if (statusResult.state === 'FAILED') {
          console.log(
            'Gemini file processing failed. Error details:',
            statusResult.error
          )
          throw new Error(
            `File processing failed: ${statusResult.error?.message || 'Unknown error'}`
          )
        } else {
          await new Promise((resolve) => setTimeout(resolve, 1000))
          attempts++
        }
      } catch (error) {
        console.error('Error checking Gemini file status:', error)
        await new Promise((resolve) => setTimeout(resolve, 1000))
        attempts++
      }
    }

    if (!fileReady) {
      throw new Error('File processing timeout')
    }

    // Analyze with Gemini - Extract HOOK and visual elements
    const prompt = `This video went viral on TikTok. Analyze what makes it successful:

FIRST AND MOST IMPORTANT - Extract the HOOK:
- If there's TEXT ON SCREEN in the first 3 seconds, transcribe it EXACTLY
- If someone is SPEAKING in the first 3 seconds, transcribe what they say EXACTLY
- This is the HOOK that stops people scrolling - I need the EXACT words

Then analyze:
1. OPENING HOOK (0-3 seconds) - What viewers see/hear that makes them stop
2. TEXT ON SCREEN - ALL text overlays, captions, timing (transcribe exactly)
3. VISUAL PACING - Shot changes, rhythm, energy level
4. VISUAL STORYTELLING - How the story unfolds
5. TRANSITIONS/EFFECTS - Cuts, transitions, filters used
6. KEY MOMENTS - Most impactful/shareable moments
7. COLOR/LIGHTING/MOOD - Visual atmosphere
8. AUDIO/MUSIC - What's being said, music choice, sound effects

Format your response with clear sections:
HOOK: [exact text or speech from first 3 seconds]
TEXT ON SCREEN: [all text that appears]
[continue with other sections...]`

    const analysisResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  fileData: {
                    mimeType: 'video/mp4',
                    fileUri: fileUri,
                  },
                },
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.4,
            topP: 0.9,
            maxOutputTokens: 8192,
          },
        }),
      }
    )

    if (!analysisResponse.ok) {
      throw new Error(`Gemini analysis failed: ${analysisResponse.status}`)
    }

    const analysisResult = await analysisResponse.json()
    const analysisText =
      analysisResult.candidates?.[0]?.content?.parts?.[0]?.text

    if (!analysisText) {
      console.error('Gemini analysis resulted in no text output')
      return { text: null, success: false, modelIdUsed: 'gemini-1.5-flash' }
    }

    console.log('Gemini video analysis completed successfully')
    return {
      text: analysisText,
      success: true,
      modelIdUsed: 'gemini-1.5-flash',
    }
  } catch (error) {
    console.error('Error analyzing video with Gemini:', error)
    return { text: null, success: false, modelIdUsed: 'gemini-1.5-flash' }
  }
}

// Analyze thumbnail with GPT-4o Vision
async function analyzeImageWithClaude(thumbnailUrl: string): Promise<string> {
  console.log('Analyzing thumbnail with GPT-4o:', thumbnailUrl)

  try {
    // Use GPT-4o for image analysis
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY
    if (!apiKey || apiKey === 'your-openai-api-key-here') {
      console.error('OpenAI API key not configured properly')
      return ''
    }

    // Download image first since GPT-4o can't access TikTok CDN
    const imageResponse = await fetch(
      `/api/proxy-video?url=${encodeURIComponent(thumbnailUrl)}`
    )
    if (!imageResponse.ok) {
      console.error('Failed to download thumbnail via proxy')
      return ''
    }

    const imageBlob = await imageResponse.blob()
    const reader = new FileReader()
    const base64Promise = new Promise<string>((resolve) => {
      reader.onloadend = () => {
        const base64 = reader.result as string
        resolve(base64)
      }
    })
    reader.readAsDataURL(imageBlob)
    const base64Image = await base64Promise

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this TikTok thumbnail as a VISUAL HOOK. Tell me:\n1. TEXT ON SCREEN: What text is visible? (exact words)\n2. VISUAL HOOK: What makes someone stop scrolling?\n3. DESIGN: Colors, contrast, composition\n4. EMOTIONAL IMPACT: What feeling does it create?\n\nBe specific about what grabs attention in the first split second.',
              },
              {
                type: 'image_url',
                image_url: {
                  url: base64Image,
                  detail: 'high',
                },
              },
            ],
          },
        ],
        max_tokens: 1000,
        temperature: 0.0,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      console.error('GPT-4o API error:', response.status, errorData)
      console.error('Full error details:', JSON.stringify(errorData, null, 2))

      // If it's a format issue, we need to handle it
      if (
        errorData?.error?.message?.includes('format') ||
        errorData?.error?.message?.includes('HEIC')
      ) {
        console.error(
          'HEIC format not supported by GPT-4o, need to convert or use proxy'
        )
      }

      return ''
    }

    const data = await response.json()
    const extractedText = data.choices[0]?.message?.content || ''

    if (extractedText.includes('No visible text')) {
      console.log('No text detected in thumbnail')
      return ''
    }

    console.log('Text extracted from thumbnail:', extractedText)
    return extractedText
  } catch (error) {
    console.error('Error analyzing image with GPT-4o:', error)
    return ''
  }
}

// Main analysis function
export async function analyzeViralVideo(
  videoUrl: string,
  videoId?: string
): Promise<{
  analysis: AnalysisResult
  rawAnalysis?: string
  source: string
  videoId?: string
  error?: string
}> {
  try {
    // Fetch video details with transcript
    const videoData = await fetchTikTokVideoDetails(videoUrl, true)

    if (!videoData) {
      return {
        error: 'Failed to fetch video details',
        analysis: {} as AnalysisResult,
        source: 'error',
      }
    }

    // Check if video exists in database
    let video_id_internal: number | null = null
    const awemeId = videoData.aweme_detail.aweme_id

    if (awemeId) {
      const { data: videoDbEntry, error: videoDbError } = await supabase
        .from('videos')
        .select('id')
        .eq('video_id', awemeId)
        .single()

      if (!videoDbError && videoDbEntry) {
        video_id_internal = videoDbEntry.id
      } else {
        console.warn(`Video with TikTok ID ${awemeId} not found in DB`)
      }
    }

    // Collect ALL available data sources for comprehensive analysis
    const analysisSources = {
      transcript: null as string | null,
      videoAnalysis: null as string | null,
      thumbnailAnalysis: null as string | null,
      description:
        videoData.aweme_detail.desc || videoData.aweme_detail.caption || null,
    }

    let rawGeminiAnalysisText: string | null = null
    let geminiModelIdUsed: string | null = null

    // 1. ALWAYS try to analyze video (first 30 seconds) with Gemini
    console.log('[ANALYZE-VIDEO] Starting video analysis with Gemini...')
    const geminiResult = await analyzeVideoWithGemini(videoData, 30) // 30 second cap

    if (geminiResult.success && geminiResult.text) {
      analysisSources.videoAnalysis = geminiResult.text
      rawGeminiAnalysisText = geminiResult.text
      geminiModelIdUsed = geminiResult.modelIdUsed
      console.log('[ANALYZE-VIDEO] ✅ Got Gemini video analysis')
    } else {
      console.log('[ANALYZE-VIDEO] ⚠️ Gemini video analysis failed')
    }

    // 2. Get transcript if available
    if (videoData.transcript && videoData.transcript.trim().length > 10) {
      analysisSources.transcript = videoData.transcript
      console.log('[ANALYZE-VIDEO] ✅ Got transcript')
    } else {
      console.log('[ANALYZE-VIDEO] ⚠️ No transcript available')
    }

    // 3. Try to analyze thumbnail with GPT-4o (but don't fail if it doesn't work)
    const thumbnailUrl =
      videoData.aweme_detail?.video?.origin_cover?.url_list?.[0]
    if (thumbnailUrl) {
      console.log('[ANALYZE-VIDEO] Thumbnail URL:', thumbnailUrl)

      // Check what format this is
      const urlLower = thumbnailUrl.toLowerCase()
      if (urlLower.includes('.heic') || urlLower.includes('heic')) {
        console.log(
          '[ANALYZE-VIDEO] ⚠️ HEIC format detected - need to use different thumbnail'
        )

        // Try other thumbnail URLs
        const coverUrls = videoData.aweme_detail?.video?.cover?.url_list || []
        const dynamicCoverUrls =
          videoData.aweme_detail?.video?.dynamic_cover?.url_list || []

        console.log('[ANALYZE-VIDEO] Available thumbnail URLs:')
        console.log('- origin_cover:', thumbnailUrl)
        console.log('- cover URLs:', coverUrls.length, 'available')
        console.log(
          '- dynamic_cover URLs:',
          dynamicCoverUrls.length,
          'available'
        )

        // Find a non-HEIC thumbnail
        let workingThumbnailUrl = null
        for (const url of [...coverUrls, ...dynamicCoverUrls]) {
          if (url && !url.toLowerCase().includes('heic')) {
            workingThumbnailUrl = url
            console.log(
              '[ANALYZE-VIDEO] Found non-HEIC thumbnail:',
              url.substring(0, 100) + '...'
            )
            break
          }
        }

        if (workingThumbnailUrl) {
          try {
            const thumbnailText =
              await analyzeImageWithClaude(workingThumbnailUrl)
            if (thumbnailText && thumbnailText.trim().length > 0) {
              analysisSources.thumbnailAnalysis = thumbnailText
              console.log('[ANALYZE-VIDEO] ✅ Got thumbnail analysis')
            } else {
              console.log('[ANALYZE-VIDEO] ⚠️ No text found in thumbnail')
            }
          } catch (error) {
            console.log(
              '[ANALYZE-VIDEO] ⚠️ Thumbnail analysis failed:',
              error.message
            )
          }
        }
      } else {
        // Not HEIC, try normal analysis
        try {
          const thumbnailText = await analyzeImageWithClaude(thumbnailUrl)
          if (thumbnailText && thumbnailText.trim().length > 0) {
            analysisSources.thumbnailAnalysis = thumbnailText
            console.log('[ANALYZE-VIDEO] ✅ Got thumbnail analysis')
          } else {
            console.log('[ANALYZE-VIDEO] ⚠️ No text found in thumbnail')
          }
        } catch (error) {
          console.log(
            '[ANALYZE-VIDEO] ⚠️ Thumbnail analysis failed:',
            error.message
          )
        }
      }
    }

    // Check if we have REAL content (NOT just description)
    const hasRealContent =
      analysisSources.transcript ||
      analysisSources.videoAnalysis ||
      analysisSources.thumbnailAnalysis

    if (!hasRealContent) {
      console.log(
        '[ANALYZE-VIDEO] ❌ No real content available - skipping to avoid description-only analysis'
      )
      return {
        error: 'No transcript, video, or thumbnail analysis available',
        analysis: {} as AnalysisResult,
        source: 'error',
      }
    }

    // Combine all sources for comprehensive analysis
    let combinedAnalysisText = ''
    let primarySource = 'multi_source'

    if (analysisSources.videoAnalysis) {
      combinedAnalysisText += `VIDEO ANALYSIS (Visual Content):\n${analysisSources.videoAnalysis}\n\n`
    }

    if (analysisSources.transcript) {
      combinedAnalysisText += `TRANSCRIPT (Spoken Content):\n${analysisSources.transcript}\n\n`
    }

    if (analysisSources.thumbnailAnalysis) {
      combinedAnalysisText += `THUMBNAIL ANALYSIS (Visual Hook):\n${analysisSources.thumbnailAnalysis}\n\n`
    }

    // Determine primary source based on what we have
    if (analysisSources.transcript && analysisSources.videoAnalysis) {
      primarySource = 'multi_source'
    } else if (analysisSources.transcript) {
      primarySource = 'transcript'
    } else if (analysisSources.videoAnalysis) {
      primarySource = 'gemini_video'
    } else if (analysisSources.thumbnailAnalysis) {
      primarySource = 'thumbnail'
    }

    const analysisInputText = combinedAnalysisText
    const analysisInputSource = primarySource

    // Log the input for Claude
    console.log(
      `[ANALYZE-VIDEO] Combined input for Claude structuring (source: ${analysisInputSource})`
    )
    console.log(
      `[ANALYZE-VIDEO] Total content length: ${analysisInputText.length} chars`
    )

    // Structure the analysis with Claude
    const structuringPrompt = `You are an expert TikTok content analyst. Your task is to analyze a viral TikTok video using multiple data sources and structure your insights into a specific JSON format.

Here is the comprehensive analysis data:
${analysisInputText}

Based on ALL the information provided above (which may include video analysis, transcript, and/or thumbnail analysis), synthesize and transform it into the following JSON format:

IMPORTANT FOR HOOK EXTRACTION:
1. If there's a VIDEO ANALYSIS section, look for "HOOK:" and extract the EXACT text after it
2. If there's a TRANSCRIPT section, extract the FIRST SPOKEN LINE (not the title/description)
3. If there's a THUMBNAIL ANALYSIS section with "TEXT ON SCREEN:", use that text
4. The hook is what viewers SEE or HEAR in the first 3 seconds - NOT the video description

{
  "hook": "string (The EXACT text/speech from the first 3 seconds that hooks viewers - what they SEE on screen or HEAR spoken)",
  "overall_summary": "string (The introductory sentence(s) from the analysis, before the detailed breakdown. e.g., 'Okay, this video hit a perfect storm... brainstorm similar concepts.')",
  "original_video_analysis": {
    "title": "string (The title of the original video analysis section. e.g., 'Analysis of the Viral Video (Jesus & Laughing Baby)')",
    "sections": [
      {
        "subheading": "string (The subheading for a part of the analysis. e.g., 'Strong Emotional Core', 'Visual Appeal', 'Audio Enhancement', 'TikTok Algorithm & Shareability')",
        "points": [
          "string (Each point or item listed under that subheading. e.g., 'Joy & Innocence: The baby's infectious laughter is universally heartwarming...')"
        ]
      }
    ],
    "high_probability_viral_reasoning": "string (The paragraph explaining why the video is 'High Probability Viral'. e.g., 'It taps into fundamental human emotions...')"
  },
  "new_video_concepts": {
    "introduction": "string (The introductory text for the new video concepts section. e.g., 'The key is to combine strong positive emotion...')",
    "concepts": [
      {
        "theme_title": "string (The title of the theme for a group of concepts. e.g., 'Theme 1: The \"Heavenly/Afterlife Comfort\" Angle (like the original)')",
        "concept_title": "string (The specific title for a new video concept. e.g., 'Beloved Pets in Paradise', 'Baby Discovering Magic')",
        "details": {
          "concept_description": "string (The text following 'Concept:'. e.g., 'Similar AI-generated heavenly scene...')",
          "visuals": "string (The text following 'Visuals:'. e.g., 'Soft focus, sparkling light...')",
          "audio": "string (The text following 'Audio:'. e.g., 'Gentle, calming music...')",
          "emotion": "string (The text following 'Emotion:'. e.g., 'Comfort for those who've lost pets...')"
        }
      }
    ]
  },
  "key_elements_for_success": [
    "string (Each point listed under 'Key Elements for Success (Reiterated)'. e.g., 'Keep it Short: TikTok favors brevity.')"
  ]
}

Important Parsing Instructions:
- For "original_video_analysis.sections.points", combine the heading part (e.g., "Joy & Innocence:") with its descriptive text into a single string for each point.
- For "new_video_concepts.concepts.details", extract the text specifically associated with 'Concept:', 'Visuals:', 'Audio:', and 'Emotion:' labels.
- Ensure all text is extracted as accurately as possible from the source. Do not add your own interpretations or miss any sections.
- If a section or sub-section from the JSON structure is not present in the input text, omit that key or set its value to null or an empty array/string as appropriate for the type.

Ensure your entire output is a single, valid JSON object.`

    const claudeResponse = await callClaude(
      [
        {
          role: 'user',
          content: structuringPrompt,
        },
      ],
      'claude-3-5-sonnet-20241022',
      4000,
      0.1
    )

    let claudeAnalysisResult: AnalysisResult
    try {
      // Try to extract JSON from the response
      const jsonMatch = claudeResponse.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        claudeAnalysisResult = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('No JSON found in response')
      }
    } catch (error) {
      console.error(
        '[ANALYZE_VIDEO] Failed to parse Claude JSON response:',
        error,
        'Raw text:',
        claudeResponse
      )

      // For minimal content, create a basic valid response
      if (analysisInputText.length < 100) {
        claudeAnalysisResult = {
          overall_summary: analysisInputText.trim(),
          original_video_analysis: {
            title: null,
            sections: [],
            high_probability_viral_reasoning:
              'Insufficient content for analysis',
          },
          new_video_concepts: {
            introduction: null,
            concepts: [],
          },
          key_elements_for_success: [],
        }
      } else {
        return {
          error: 'Failed to parse Claude analysis JSON',
          analysis: {} as AnalysisResult,
          source: 'error',
        }
      }
    }

    // Save analyses to DB if video exists in database
    if (video_id_internal) {
      const now = new Date().toISOString()

      // Save Claude structured analysis
      const { error: claudeSaveError } = await supabase
        .from('ai_analyses')
        .insert({
          video_id_internal,
          analysis_type: 'claude_3.5_sonnet_structured_v2',
          model_version: 'claude-3-5-sonnet-20241022',
          content: claudeAnalysisResult,
          source_of_analysis_input: analysisInputSource,
          analyzed_at: now,
        })
      if (claudeSaveError)
        console.error(
          '[ANALYZE_VIDEO] Error saving Claude structured analysis:',
          claudeSaveError
        )

      // Save raw Gemini analysis if it was used
      if (
        analysisInputSource === 'gemini_video' &&
        rawGeminiAnalysisText &&
        geminiModelIdUsed
      ) {
        const { error: geminiRawSaveError } = await supabase
          .from('ai_analyses')
          .insert({
            video_id_internal,
            analysis_type: 'gemini_1.5_flash_raw_v1',
            model_version: geminiModelIdUsed,
            raw_text_content: rawGeminiAnalysisText,
            source_of_analysis_input: 'gemini_video',
            analyzed_at: now,
          })
        if (geminiRawSaveError)
          console.error(
            '[ANALYZE_VIDEO] Error saving raw Gemini analysis:',
            geminiRawSaveError
          )
      }
    } else {
      console.warn(
        `[ANALYZE_VIDEO] Analysis was generated but NOT saved as video was not found in local DB`
      )
    }

    return {
      analysis: claudeAnalysisResult,
      rawAnalysis: rawGeminiAnalysisText || undefined,
      source: analysisInputSource,
      videoId: awemeId,
    }
  } catch (error) {
    console.error('Error in viral video analysis:', error)
    return {
      error: error instanceof Error ? error.message : 'Failed to analyze video',
      analysis: {} as AnalysisResult,
      source: 'error',
    }
  }
}
