// Service for fetching TikTok profile details from ScrapeCreators API

const SCRAPE_CREATORS_API_KEY =
  import.meta.env.VITE_SCRAPE_CREATORS_API_KEY || ''
const SCRAPE_CREATORS_API_URL =
  'https://api.scrapecreators.com/v1/tiktok/profile'

export interface TikTokProfileV1 {
  user: {
    id: string
    uniqueId: string // username without @
    nickname: string // display name
    avatarLarger: string
    avatarMedium: string
    avatarThumb: string
    signature: string // bio
    verified: boolean
    secUid: string
    privateAccount: boolean
    region: string
    language: string
  }
  stats: {
    followerCount: number
    followingCount: number
    heart: number
    heartCount: number
    videoCount: number
    diggCount: number
    friendCount: number
  }
  itemList: any[]
}

export async function fetchTikTokProfile(
  username: string
): Promise<TikTokProfileV1 | null> {
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
    return data
  } catch (error) {
    console.error('Error fetching TikTok profile:', error)
    return null
  }
}

// Helper to extract clean profile data
export function extractProfileData(profile: TikTokProfileV1 | null) {
  if (!profile?.user || !profile?.stats) return null

  const { user, stats } = profile
  return {
    username: `@${user.uniqueId}`,
    displayName: user.nickname,
    bio: user.signature,
    followers: stats.followerCount,
    totalLikes: stats.heartCount,
    videoCount: stats.videoCount,
    verified: user.verified,
    avatarUrl: user.avatarLarger || null,
  }
}
