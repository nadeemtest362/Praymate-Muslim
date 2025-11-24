// Service for fetching TikTok account videos using ScrapeCreators API

const SCRAPE_CREATORS_API_KEY =
  import.meta.env.VITE_SCRAPE_CREATORS_API_KEY || ''
const SCRAPE_CREATORS_API_URL =
  'https://api.scrapecreators.com/v3/tiktok/profile/videos'

export interface TikTokAccountVideo {
  id: string
  desc: string // caption
  createTime: number
  shareUrl: string
  video: {
    duration: number
    playAddr: string[]
    cover: string[]
    dynamicCover: string[]
  }
  stats: {
    playCount: number
    diggCount: number // likes
    shareCount: number
    commentCount: number
  }
  author: {
    id: string
    uniqueId: string
    nickname: string
    avatarThumb: string
  }
}

export interface AccountVideosResponse {
  username: string
  videos: TikTokAccountVideo[]
  totalVideos: number
  profile: {
    followerCount: number
    heartCount: number
    videoCount: number
    verified: boolean
    avatarUrl: string
    bio: string
  }
}

export async function fetchTikTokAccountVideos(
  username: string,
  count: number = 20
): Promise<AccountVideosResponse | null> {
  try {
    if (!SCRAPE_CREATORS_API_KEY) {
      throw new Error('ScrapeCreators API key not configured')
    }

    // Remove @ if present
    const cleanUsername = username.startsWith('@')
      ? username.slice(1)
      : username

    const response = await fetch(
      `${SCRAPE_CREATORS_API_URL}?handle=${cleanUsername}`,
      {
        method: 'GET',
        headers: {
          'x-api-key': SCRAPE_CREATORS_API_KEY,
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          Accept: 'image/webp,image/avif,image/*,*/*;q=0.8',
        },
      }
    )

    if (!response.ok) {
      if (response.status === 404) {
        console.error(`TikTok user @${cleanUsername} not found`)
        return null
      }
      throw new Error(
        `ScrapeCreators API error: ${response.status} ${response.statusText}`
      )
    }

    const data = await response.json()

    // DEBUG: Log first video structure only
    if (data.aweme_list && data.aweme_list[0]) {
      console.log('First video structure:', data.aweme_list[0].video)
    }

    // Check if we got video data
    if (!data.aweme_list || data.aweme_list.length === 0) {
      console.warn(`No videos found for @${cleanUsername}`)
    }

    // Transform the response to our format
    return {
      username: `@${cleanUsername}`,
      videos: (data.aweme_list || []).slice(0, count).map((item: any) => ({
        id: item.aweme_id,
        desc: item.desc || '',
        createTime: item.create_time * 1000, // Convert to milliseconds
        shareUrl:
          item.share_url ||
          `https://www.tiktok.com/@${cleanUsername}/video/${item.aweme_id}`,
        video: {
          duration: item.video?.duration || 0,
          playAddr: item.video?.play_addr?.url_list || [],
          cover: item.video?.cover?.url_list || [],
          dynamicCover: item.video?.dynamic_cover?.url_list || [],
        },
        stats: {
          playCount: item.statistics?.play_count || 0,
          diggCount: item.statistics?.digg_count || 0,
          shareCount: item.statistics?.share_count || 0,
          commentCount: item.statistics?.comment_count || 0,
        },
        author: {
          id: item.author?.uid || '',
          uniqueId: item.author?.unique_id || cleanUsername,
          nickname: item.author?.nickname || '',
          avatarThumb: item.author?.avatar_thumb?.url_list?.[0] || '',
        },
      })),
      totalVideos: data.aweme_list?.length || 0,
      profile: {
        followerCount: data.aweme_list?.[0]?.author?.follower_count || 0,
        heartCount: data.aweme_list?.[0]?.author?.total_favorited || 0,
        videoCount: data.aweme_list?.[0]?.author?.aweme_count || 0,
        verified: data.aweme_list?.[0]?.author?.verification_type === 1,
        avatarUrl: '', // Don't use HEIC avatars from v3 API - use v1 API for profile data
        bio: data.aweme_list?.[0]?.author?.signature || '',
      },
    }
  } catch (error) {
    console.error('Error fetching TikTok account videos:', error)
    return null
  }
}

export function formatVideoStats(video: TikTokAccountVideo): {
  views: string
  likes: string
  shares: string
  comments: string
} {
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M'
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K'
    }
    return num.toString()
  }

  return {
    views: formatNumber(video.stats.playCount),
    likes: formatNumber(video.stats.diggCount),
    shares: formatNumber(video.stats.shareCount),
    comments: formatNumber(video.stats.commentCount),
  }
}

export function getVideoCover(video: TikTokAccountVideo): string {
  // Get all available URLs, prioritizing dynamic covers
  const covers = video.video.cover || []
  const dynamicCovers = video.video.dynamicCover || []
  const allUrls = [...dynamicCovers, ...covers]

  // Try to find a non-HEIC URL first (should be .image or .webp)
  const nonHeicUrl = allUrls.find(
    (url) => url && !url.toLowerCase().includes('.heic')
  )

  if (nonHeicUrl) {
    return nonHeicUrl
  }

  // If all are HEIC, try to convert to webp as fallback
  const firstUrl = allUrls[0] || ''
  return firstUrl
    .replace(/\.heic\?/, '.webp?')
    .replace(/:q72\.heic/, ':q72.webp')
    .replace(/\.heic$/, '.webp')
}

export function getVideoUrl(video: TikTokAccountVideo): string {
  return video.video.playAddr?.[0] || ''
}
