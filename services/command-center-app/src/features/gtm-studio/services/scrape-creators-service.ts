// Service for fetching TikTok video details from ScrapeCreators API

const SCRAPE_CREATORS_API_KEY =
  import.meta.env.VITE_SCRAPE_CREATORS_API_KEY || ''
const SCRAPE_CREATORS_API_URL = 'https://api.scrapecreators.com/v2/tiktok/video'

export interface TikTokVideoDetails {
  aweme_detail: {
    desc: string
    video: {
      play_addr: {
        url_list: string[]
      }
      duration: number
      origin_cover?: {
        url_list: string[]
      }
    }
    statistics: {
      play_count: number
      digg_count: number
      comment_count: number
      share_count: number
    }
    author: {
      nickname: string
      unique_id: string
    }
    aweme_id: string
    share_info?: {
      share_url: string
    }
  }
  transcript?: string
}

export async function fetchTikTokVideoDetails(
  videoUrl: string,
  getTranscript: boolean = true
): Promise<TikTokVideoDetails | null> {
  try {
    if (!SCRAPE_CREATORS_API_KEY) {
      throw new Error('ScrapeCreators API key not configured')
    }

    const response = await fetch(
      `${SCRAPE_CREATORS_API_URL}?url=${encodeURIComponent(videoUrl)}&get_transcript=${getTranscript}`,
      {
        method: 'GET',
        headers: {
          'x-api-key': SCRAPE_CREATORS_API_KEY,
        },
      }
    )

    if (!response.ok) {
      throw new Error(
        `ScrapeCreators API error: ${response.status} ${response.statusText}`
      )
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error fetching TikTok video details:', error)
    return null
  }
}

// Helper to extract video ID from TikTok URL
export function extractTikTokVideoId(url: string): string | null {
  try {
    // Handle different TikTok URL formats
    const patterns = [
      /\/video\/(\d+)/,
      /v=(\d+)/,
      /\/(\d{19})/, // Direct video ID in path
    ]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match?.[1]) {
        return match[1]
      }
    }

    return null
  } catch (error) {
    console.error('Error extracting video ID:', error)
    return null
  }
}
