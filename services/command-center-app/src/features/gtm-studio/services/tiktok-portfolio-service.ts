import { supabase } from './supabase-service'
// Use the viral DB instance
import {
  fetchTikTokAccountVideos,
  type TikTokAccountVideo,
  type AccountVideosResponse,
} from './tiktok-account-videos-service'
import {
  fetchTikTokProfile,
  extractProfileData,
} from './tiktok-profile-service'

export interface TikTokAccount {
  id: string
  username: string
  display_name?: string
  content_strategies: (
    | 'jesus'
    | 'ugc'
    | 'slideshow'
    | 'ugc-slideshow'
    | '6-verses'
  )[]
  is_active: boolean
  metadata?: {
    bio?: string
    followers?: number
    totalLikes?: number
    videoCount?: number
    verified?: boolean
    avatarUrl?: string
  }
  created_at: string
  updated_at: string
}

export interface ContentAssignment {
  id: string
  account_id: string
  session_id: string
  asset_id: string
  asset_url: string
  asset_type: string
  caption?: string
  workflow_type?: string
  status: 'pending' | 'posted' | 'scheduled'
  posted_at?: string
  created_at: string
}

export interface ContentQueueItem {
  assignment_id: string
  status: string
  posted_at?: string
  account_username: string
  content_strategies: string[]
  asset_type: string
  asset_url: string
  caption?: string
  workflow_type?: string
  session_id: string
  asset_id: string
}

class TikTokPortfolioService {
  // Account Management
  async createAccount(
    account: Omit<TikTokAccount, 'id' | 'created_at' | 'updated_at'>
  ): Promise<TikTokAccount> {
    const { data, error } = await supabase
      .from('tiktok_accounts')
      .insert(account)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async listAccounts(): Promise<TikTokAccount[]> {
    const { data, error } = await supabase
      .from('tiktok_accounts')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  async updateAccount(
    id: string,
    updates: Partial<TikTokAccount>
  ): Promise<TikTokAccount> {
    const { data, error } = await supabase
      .from('tiktok_accounts')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async deleteAccount(id: string): Promise<void> {
    const { error } = await supabase
      .from('tiktok_accounts')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  // Content Assignment
  async assignContent(
    sessionId: string,
    assetId: string,
    assetUrl: string,
    assetType: string,
    accountId: string,
    caption?: string,
    workflowType?: string
  ): Promise<ContentAssignment> {
    // Create the assignment
    const { data, error } = await supabase
      .from('content_assignments')
      .insert({
        session_id: sessionId,
        asset_id: assetId,
        asset_url: assetUrl,
        asset_type: assetType,
        account_id: accountId,
        caption: caption,
        workflow_type: workflowType,
        status: 'pending',
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  async unassignContent(assignmentId: string): Promise<void> {
    // Delete the assignment
    const { error } = await supabase
      .from('content_assignments')
      .delete()
      .eq('id', assignmentId)

    if (error) throw error
  }

  async markAsPosted(assignmentId: string): Promise<ContentAssignment> {
    const { data, error } = await supabase
      .from('content_assignments')
      .update({
        status: 'posted',
        posted_at: new Date().toISOString(),
      })
      .eq('id', assignmentId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async getContentQueue(accountId?: string): Promise<ContentQueueItem[]> {
    let query = supabase.from('content_assignments').select(`
        id,
        status,
        posted_at,
        account_id,
        session_id,
        asset_id,
        asset_url,
        asset_type,
        caption,
        workflow_type,
        tiktok_accounts!inner (
          username,
          content_strategies
        )
      `)

    if (accountId) {
      query = query.eq('account_id', accountId)
    }

    const { data, error } = await query.order('created_at', {
      ascending: false,
    })

    if (error) throw error

    // Transform to ContentQueueItem format
    return (data || []).map((item) => ({
      assignment_id: item.id,
      status: item.status,
      posted_at: item.posted_at,
      account_username: item.tiktok_accounts.username,
      content_strategies: item.tiktok_accounts.content_strategies,
      asset_type: item.asset_type,
      asset_url: item.asset_url,
      caption: item.caption,
      workflow_type: item.workflow_type,
      session_id: item.session_id,
      asset_id: item.asset_id,
    }))
  }

  async getUnassignedAssets(workflowType?: string): Promise<any[]> {
    // Get all production sessions with assets
    const { data: sessions, error } = await supabase
      .from('production_sessions')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (error) throw error

    // Get all assigned asset IDs
    const { data: assignments } = await supabase
      .from('content_assignments')
      .select('asset_id')

    const assignedAssetIds = new Set((assignments || []).map((a) => a.asset_id))

    // Extract unassigned assets from sessions
    const unassignedAssets: any[] = []
    const processedSlideshowGroups = new Set<string>()

    for (const session of sessions || []) {
      const sessionAssets = session.assets || []

      // Group assets by slideshow group ID
      const slideshowGroups: { [key: string]: any[] } = {}
      const standaloneAssets: any[] = []

      for (const asset of sessionAssets) {
        if (asset.metadata?.slideshowGroup) {
          if (!slideshowGroups[asset.metadata.slideshowGroup]) {
            slideshowGroups[asset.metadata.slideshowGroup] = []
          }
          slideshowGroups[asset.metadata.slideshowGroup].push(asset)
        } else {
          standaloneAssets.push(asset)
        }
      }

      // Process slideshow groups
      for (const [groupId, groupAssets] of Object.entries(slideshowGroups)) {
        if (processedSlideshowGroups.has(groupId)) continue
        processedSlideshowGroups.add(groupId)

        // Sort by slide number
        const sortedSlides = groupAssets
          .filter((a) => a.type === 'image')
          .sort(
            (a, b) =>
              (a.metadata?.slideNumber || 0) - (b.metadata?.slideNumber || 0)
          )

        // Find if there's a video for this group (compiled slideshow)
        const video = groupAssets.find((a) => a.type === 'video')

        if (sortedSlides.length > 0) {
          const firstSlide = sortedSlides[0]
          const slideshowWorkflowType =
            firstSlide.metadata?.workflowType ||
            session.settings?.workflowType ||
            'slideshow'

          if (!workflowType || slideshowWorkflowType === workflowType) {
            // Create a single entry for the slideshow group
            unassignedAssets.push({
              id: groupId,
              type: 'slideshow',
              url: video?.url || sortedSlides[0].url, // Use video if available, otherwise first slide
              session_id: session.id,
              session_name: session.name,
              workflow_type: slideshowWorkflowType,
              is_slideshow: true,
              metadata: {
                ...firstSlide.metadata,
                // Use captioned images from childAssets if available, otherwise original
                images: sortedSlides.map((s) => {
                  // If this slide has a captioned version in childAssets, use that
                  const captionedVersion = s.childAssets?.find(
                    (child: any) =>
                      child.type === 'image' && child.metadata?.hasCaptions
                  )
                  return captionedVersion?.url || s.url
                }),
                slides: sortedSlides.map((s) => ({
                  text: s.metadata?.slideText || '',
                  imageUrl:
                    s.childAssets?.find(
                      (child: any) =>
                        child.type === 'image' && child.metadata?.hasCaptions
                    )?.url || s.url,
                  slideNumber: s.metadata?.slideNumber || 0,
                })),
                videoUrl: video?.url || null,
                slideshowTopic:
                  firstSlide.metadata?.slideshowTopic || 'Slideshow',
              },
            })
          }
        }
      }

      // Process standalone assets (videos and single images)
      for (const asset of standaloneAssets) {
        if (!assignedAssetIds.has(asset.id)) {
          const assetWorkflowType =
            asset.metadata?.workflowType ||
            session.settings?.workflowType ||
            'standard'

          if (!workflowType || assetWorkflowType === workflowType) {
            unassignedAssets.push({
              ...asset,
              session_id: session.id,
              session_name: session.name,
              workflow_type: assetWorkflowType,
              is_slideshow: false,
            })
          }
        }
      }
    }

    return unassignedAssets
  }

  // Analytics
  async getAccountStats(accountId: string): Promise<{
    total_queued: number
    total_posted: number
    posts_this_week: number
  }> {
    const { count: queued } = await supabase
      .from('content_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('account_id', accountId)
      .eq('status', 'pending')

    const { count: posted } = await supabase
      .from('content_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('account_id', accountId)
      .eq('status', 'posted')

    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)

    const { count: weekPosts } = await supabase
      .from('content_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('account_id', accountId)
      .eq('status', 'posted')
      .gte('posted_at', weekAgo.toISOString())

    return {
      total_queued: queued || 0,
      total_posted: posted || 0,
      posts_this_week: weekPosts || 0,
    }
  }

  // TikTok Video Monitoring
  async refreshAccountVideos(accountId: string): Promise<TikTokAccountVideo[]> {
    // Get the account
    const { data: account, error: accountError } = await supabase
      .from('tiktok_accounts')
      .select('username')
      .eq('id', accountId)
      .single()

    if (accountError || !account) {
      throw new Error('Account not found')
    }

    // Fetch videos from TikTok
    const videoData = await fetchTikTokAccountVideos(account.username, 20)
    if (!videoData) {
      throw new Error('Failed to fetch videos from TikTok')
    }

    // DON'T update profile metadata from video API - it has HEIC avatars
    // Profile metadata should only be updated when explicitly refreshing profile with v1 API

    // Store/update videos in database (we'll create a videos table)
    const videosToStore = videoData.videos.map((video) => ({
      account_id: accountId,
      tiktok_video_id: video.id,
      caption: video.desc,
      video_url: video.video.playAddr?.[0] || '',
      cover_url: video.video.cover?.[0] || '',
      duration: video.video.duration,
      created_at_tiktok: new Date(video.createTime).toISOString(),
      stats: video.stats,
      share_url: video.shareUrl,
      updated_at: new Date().toISOString(),
    }))

    // Upsert videos (update if exists, insert if new)
    const { data: storedVideos, error: videosError } = await supabase
      .from('tiktok_videos')
      .upsert(videosToStore, {
        onConflict: 'account_id,tiktok_video_id',
        ignoreDuplicates: false,
      })
      .select()

    if (videosError) {
      console.warn('Error storing videos:', videosError)
      // Don't throw - still return the scraped data
    }

    return videoData.videos
  }

  async getAccountVideos(
    accountId: string,
    refresh: boolean = false
  ): Promise<TikTokAccountVideo[]> {
    if (refresh) {
      return this.refreshAccountVideos(accountId)
    }

    // Try to get from database first
    const { data: videos, error } = await supabase
      .from('tiktok_videos')
      .select('*')
      .eq('account_id', accountId)
      .order('created_at_tiktok', { ascending: false })
      .limit(20)

    if (error || !videos || videos.length === 0) {
      // Fallback to refresh if no cached data
      return this.refreshAccountVideos(accountId)
    }

    // Transform back to TikTokAccountVideo format
    return videos.map((video) => ({
      id: video.tiktok_video_id,
      desc: video.caption || '',
      createTime: new Date(video.created_at_tiktok).getTime(),
      shareUrl: video.share_url || '',
      video: {
        duration: video.duration || 0,
        playAddr: video.video_url ? [video.video_url] : [],
        cover: video.cover_url ? [video.cover_url] : [],
        dynamicCover: [],
      },
      stats: video.stats || {
        playCount: 0,
        diggCount: 0,
        shareCount: 0,
        commentCount: 0,
      },
      author: {
        id: '',
        uniqueId: '',
        nickname: '',
        avatarThumb: '',
      },
    }))
  }

  async refreshAllAccountVideos(): Promise<void> {
    const accounts = await this.listAccounts()

    for (const account of accounts.filter((a) => a.is_active)) {
      try {
        console.log(`Refreshing videos for ${account.username}...`)
        await this.refreshAccountVideos(account.id)
        // Add delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 1000))
      } catch (error) {
        console.error(`Failed to refresh ${account.username}:`, error)
      }
    }
  }

  // Refresh profile metadata with JPEG avatars from v1 API
  async refreshProfileMetadata(accountId: string): Promise<TikTokAccount> {
    // Get the account
    const { data: account, error: accountError } = await supabase
      .from('tiktok_accounts')
      .select('username')
      .eq('id', accountId)
      .single()

    if (accountError || !account) {
      throw new Error('Account not found')
    }

    // Fetch profile from v1 API (has JPEG avatars)
    const profile = await fetchTikTokProfile(account.username)
    const profileData = extractProfileData(profile)

    if (!profileData) {
      throw new Error('Failed to fetch profile data')
    }

    // Update account with fresh profile metadata
    const { data: updatedAccount, error: updateError } = await supabase
      .from('tiktok_accounts')
      .update({
        metadata: {
          bio: profileData.bio,
          followers: profileData.followers,
          totalLikes: profileData.totalLikes,
          videoCount: profileData.videoCount,
          verified: profileData.verified,
          avatarUrl: profileData.avatarUrl, // JPEG from v1 API
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', accountId)
      .select()
      .single()

    if (updateError) throw updateError
    return updatedAccount
  }
}

export const tiktokPortfolioService = new TikTokPortfolioService()
