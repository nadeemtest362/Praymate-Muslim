import React, { useState, useEffect } from 'react'
import {
  Plus,
  Loader2,
  AlertCircle,
  Play,
  Image as ImageIcon,
  Layers,
  Video,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  type TikTokAccountVideo,
  formatVideoStats,
  getVideoCover,
} from '../services/tiktok-account-videos-service'
import {
  tiktokPortfolioService,
  type TikTokAccount,
  type ContentQueueItem,
} from '../services/tiktok-portfolio-service'
import {
  fetchTikTokProfile,
  extractProfileData,
} from '../services/tiktok-profile-service'

const CONTENT_STRATEGIES = {
  jesus: { label: 'Jesus Animation Videos', icon: Video },
  ugc: { label: 'UGC Transformation', icon: Video },
  slideshow: { label: 'Viral Slideshows', icon: Layers },
  'ugc-slideshow': { label: 'POV Daily Practice', icon: Layers },
  '6-verses': { label: '6 Bible Verses', icon: Layers },
} as const

export function TikTokPortfolioManager() {
  const [accounts, setAccounts] = useState<TikTokAccount[]>([])
  const [accountVideos, setAccountVideos] = useState<
    Record<string, TikTokAccountVideo[]>
  >({})
  const [contentQueue, setContentQueue] = useState<ContentQueueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshingVideos, setRefreshingVideos] = useState<Set<string>>(
    new Set()
  )
  const [refreshingProfile, setRefreshingProfile] = useState<Set<string>>(
    new Set()
  )
  const [showAddAccount, setShowAddAccount] = useState(false)
  const [addingAccount, setAddingAccount] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<TikTokAccount | null>(
    null
  )
  const [newAccount, setNewAccount] = useState({
    username: '',
    display_name: '',
    content_strategies: ['slideshow'] as (keyof typeof CONTENT_STRATEGIES)[],
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [accountsData, queueData] = await Promise.all([
        tiktokPortfolioService.listAccounts(),
        tiktokPortfolioService.getContentQueue(),
      ])

      setAccounts(accountsData)
      setContentQueue(queueData)

      // Load videos for each account from cache
      const videosPromises = accountsData.map(async (account) => {
        try {
          const videos = await tiktokPortfolioService.getAccountVideos(
            account.id,
            false
          )
          return { accountId: account.id, videos }
        } catch (error) {
          console.error(`Failed to load videos for ${account.username}:`, error)
          return { accountId: account.id, videos: [] }
        }
      })

      const videosResults = await Promise.all(videosPromises)
      const videosMap = videosResults.reduce(
        (acc, { accountId, videos }) => {
          acc[accountId] = videos
          return acc
        },
        {} as Record<string, TikTokAccountVideo[]>
      )

      setAccountVideos(videosMap)
    } catch (error) {
      console.error('Failed to load portfolio data:', error)
      toast.error('Failed to load portfolio data')
    } finally {
      setLoading(false)
    }
  }

  const refreshAccountVideos = async (accountId: string) => {
    setRefreshingVideos((prev) => new Set(prev).add(accountId))
    try {
      const videos = await tiktokPortfolioService.getAccountVideos(
        accountId,
        true
      )
      setAccountVideos((prev) => ({
        ...prev,
        [accountId]: videos,
      }))
      toast.success('Videos refreshed!')
    } catch (error) {
      console.error('Failed to refresh videos:', error)
      toast.error('Failed to refresh videos')
    } finally {
      setRefreshingVideos((prev) => {
        const newSet = new Set(prev)
        newSet.delete(accountId)
        return newSet
      })
    }
  }

  const refreshAccountProfile = async (accountId: string) => {
    setRefreshingProfile((prev) => new Set(prev).add(accountId))
    try {
      const updatedAccount =
        await tiktokPortfolioService.refreshProfileMetadata(accountId)
      setAccounts((prev) =>
        prev.map((acc) => (acc.id === accountId ? updatedAccount : acc))
      )
      toast.success('Profile refreshed!')
    } catch (error) {
      console.error('Failed to refresh profile:', error)
      toast.error('Failed to refresh profile')
    } finally {
      setRefreshingProfile((prev) => {
        const newSet = new Set(prev)
        newSet.delete(accountId)
        return newSet
      })
    }
  }

  const handleAddAccount = async () => {
    if (!newAccount.username.startsWith('@')) {
      newAccount.username = '@' + newAccount.username
    }

    setAddingAccount(true)
    try {
      const profile = await fetchTikTokProfile(newAccount.username)
      const profileData = extractProfileData(profile)

      await tiktokPortfolioService.createAccount({
        username: newAccount.username,
        display_name: profileData?.displayName || newAccount.display_name,
        content_strategies: newAccount.content_strategies,
        is_active: true,
        metadata: profileData
          ? {
              bio: profileData.bio,
              followers: profileData.followers,
              totalLikes: profileData.totalLikes,
              videoCount: profileData.videoCount,
              verified: profileData.verified,
              avatarUrl: profileData.avatarUrl,
            }
          : undefined,
      })

      toast.success(`Added ${newAccount.username}`)
      setShowAddAccount(false)
      setNewAccount({
        username: '',
        display_name: '',
        content_strategies: ['slideshow'],
      })
      loadData()
    } catch (error) {
      console.error('Failed to add account:', error)
      toast.error('Failed to add account')
    } finally {
      setAddingAccount(false)
    }
  }

  const getAccountStats = (account: TikTokAccount) => {
    const queue = contentQueue.filter(
      (item) => item.account_username === account.username
    )
    const pending = queue.filter((q) => q.status === 'pending').length
    const posted = queue.filter((q) => q.status === 'posted').length
    return { pending, posted }
  }

  if (loading) {
    return (
      <div className='flex h-64 items-center justify-center'>
        <Loader2 className='text-muted-foreground h-8 w-8 animate-spin' />
      </div>
    )
  }

  return (
    <div className='mx-auto max-w-7xl space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h3 className='text-2xl font-semibold'>TikTok Portfolio</h3>
          <p className='text-muted-foreground text-sm'>
            Manage your {accounts.length} TikTok accounts and content monitoring
          </p>
        </div>
        <Button onClick={() => setShowAddAccount(true)}>
          <Plus className='mr-1 h-4 w-4' />
          Add Account
        </Button>
      </div>

      {/* TikTok Accounts Portfolio */}
      <div className='space-y-6'>
        <div className='flex items-center gap-2'>
          <h4 className='text-lg font-semibold'>
            TikTok Accounts ({accounts.length})
          </h4>
        </div>

        {accounts.length === 0 ? (
          <Card className='p-8 text-center'>
            <p className='text-muted-foreground'>
              No TikTok accounts added yet
            </p>
            <Button className='mt-4' onClick={() => setShowAddAccount(true)}>
              <Plus className='mr-2 h-4 w-4' />
              Add Your First Account
            </Button>
          </Card>
        ) : (
          <div className='space-y-4'>
            {accounts.map((account) => {
              const stats = getAccountStats(account)
              const needsContent = stats.pending === 0
              const videos = accountVideos[account.id] || []
              const recentVideos = videos.slice(0, 4) // Show last 4 videos
              const isRefreshing = refreshingVideos.has(account.id)
              const isRefreshingProfile = refreshingProfile.has(account.id)

              return (
                <Card
                  key={account.id}
                  className={cn(
                    'transition-all hover:shadow-lg',
                    needsContent && 'border-destructive'
                  )}
                >
                  <CardContent className='p-6'>
                    <div className='flex gap-6'>
                      {/* Account Info */}
                      <div className='w-48 flex-shrink-0'>
                        <div className='mb-3 flex items-center gap-3'>
                          {account.metadata?.avatarUrl ? (
                            <>
                              <img
                                src={account.metadata.avatarUrl}
                                alt=''
                                className='h-12 w-12 rounded-full'
                                onError={(e) => {
                                  // Hide the broken image and show fallback
                                  e.currentTarget.style.display = 'none'
                                  if (e.currentTarget.nextElementSibling) {
                                    e.currentTarget.nextElementSibling.style.display =
                                      'flex'
                                  }
                                }}
                              />
                              {/* Fallback avatar - hidden by default, shown when image fails */}
                              <div
                                className='bg-muted flex h-12 w-12 items-center justify-center rounded-full'
                                style={{ display: 'none' }}
                              >
                                <span className='text-lg font-semibold'>
                                  {account.username.charAt(1).toUpperCase()}
                                </span>
                              </div>
                            </>
                          ) : (
                            <div className='bg-muted flex h-12 w-12 items-center justify-center rounded-full'>
                              <span className='text-lg font-semibold'>
                                {account.username.charAt(1).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div>
                            <h4 className='text-lg font-semibold'>
                              {account.username}
                            </h4>
                            {account.display_name && (
                              <p className='text-muted-foreground text-sm'>
                                {account.display_name}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Account Stats */}
                        <div className='bg-muted mb-4 grid grid-cols-2 gap-4 rounded-lg p-3'>
                          <div className='text-center'>
                            <p className='text-primary text-xl font-bold'>
                              {stats.pending}
                            </p>
                            <p className='text-muted-foreground text-xs'>
                              Queued
                            </p>
                          </div>
                          <div className='text-center'>
                            <p className='text-xl font-bold text-green-600'>
                              {stats.posted}
                            </p>
                            <p className='text-muted-foreground text-xs'>
                              Posted
                            </p>
                          </div>
                        </div>

                        {/* Profile Stats */}
                        {account.metadata && (
                          <div className='space-y-1 text-sm'>
                            {account.metadata.followers && (
                              <p>
                                <span className='font-medium'>
                                  {account.metadata.followers.toLocaleString()}
                                </span>{' '}
                                followers
                              </p>
                            )}
                            {account.metadata.totalLikes && (
                              <p>
                                <span className='font-medium'>
                                  {account.metadata.totalLikes.toLocaleString()}
                                </span>{' '}
                                likes
                              </p>
                            )}
                            {account.metadata.videoCount && (
                              <p>
                                <span className='font-medium'>
                                  {account.metadata.videoCount}
                                </span>{' '}
                                videos
                              </p>
                            )}
                          </div>
                        )}

                        {/* Refresh Profile Button */}
                        <Button
                          variant='outline'
                          size='sm'
                          className='mt-3 w-full'
                          onClick={() => refreshAccountProfile(account.id)}
                          disabled={isRefreshingProfile}
                        >
                          {isRefreshingProfile ? (
                            <>
                              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                              Refreshing...
                            </>
                          ) : (
                            'Refresh Profile'
                          )}
                        </Button>

                        {needsContent && (
                          <Badge variant='destructive' className='mt-3'>
                            Needs Content
                          </Badge>
                        )}
                      </div>

                      {/* TikTok Videos */}
                      <div className='flex-1'>
                        <div className='mb-4 flex items-center justify-between'>
                          <h5 className='font-medium'>Recent TikTok Videos</h5>
                          <div className='flex gap-2'>
                            <Button
                              variant='outline'
                              size='sm'
                              onClick={() => refreshAccountVideos(account.id)}
                              disabled={isRefreshing}
                            >
                              {isRefreshing ? (
                                <Loader2 className='h-4 w-4 animate-spin' />
                              ) : (
                                'Refresh'
                              )}
                            </Button>
                            <Button
                              variant='outline'
                              size='sm'
                              onClick={() => setSelectedAccount(account)}
                            >
                              Manage Queue
                            </Button>
                          </div>
                        </div>

                        {recentVideos.length === 0 ? (
                          <div className='border-muted flex h-32 items-center justify-center rounded-lg border-2 border-dashed'>
                            <div className='text-muted-foreground text-center'>
                              <AlertCircle className='mx-auto mb-2 h-8 w-8 opacity-50' />
                              <p className='text-sm'>No videos cached</p>
                              <p className='mb-2 text-xs'>
                                {account.metadata?.videoCount
                                  ? `Profile shows ${account.metadata.videoCount} videos`
                                  : 'Profile data available'}
                              </p>
                              <Button
                                variant='link'
                                size='sm'
                                onClick={() => refreshAccountVideos(account.id)}
                                disabled={isRefreshing}
                              >
                                {isRefreshing ? 'Fetching...' : 'Fetch videos'}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className='grid grid-cols-4 gap-3'>
                            {recentVideos.map((video) => {
                              const stats = formatVideoStats(video)
                              const coverUrl = getVideoCover(video)

                              return (
                                <div key={video.id} className='group relative'>
                                  <div className='aspect-[9/16] overflow-hidden rounded-lg bg-black'>
                                    {coverUrl ? (
                                      <img
                                        src={coverUrl}
                                        alt=''
                                        className='h-full w-full object-cover'
                                        onError={(e) => {
                                          console.log(
                                            'Video cover failed to load:',
                                            coverUrl,
                                            'for video:',
                                            video.id
                                          )
                                          console.log(
                                            'Available covers:',
                                            video.video.cover
                                          )
                                          console.log(
                                            'Available dynamic covers:',
                                            video.video.dynamicCover
                                          )

                                          // Replace broken image with video icon
                                          const parent =
                                            e.currentTarget.parentElement
                                          if (parent) {
                                            parent.innerHTML =
                                              '<div class="w-full h-full flex items-center justify-center bg-muted"><svg class="h-8 w-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg></div>'
                                          }
                                        }}
                                      />
                                    ) : (
                                      <div className='bg-muted flex h-full w-full items-center justify-center'>
                                        <Video className='text-muted-foreground h-8 w-8' />
                                      </div>
                                    )}

                                    {/* Video Stats Overlay */}
                                    <div className='absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100'>
                                      <div className='absolute right-2 bottom-2 left-2'>
                                        <div className='flex justify-between text-xs text-white'>
                                          <span>❤️ {stats.likes}</span>
                                          <span>👁️ {stats.views}</span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Play icon */}
                                    <div className='absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100'>
                                      <Play className='h-6 w-6 rounded-full bg-black/50 p-1 text-white' />
                                    </div>
                                  </div>

                                  {/* Video Stats */}
                                  <div className='text-muted-foreground mt-1 text-xs'>
                                    <p className='font-medium'>
                                      {stats.views} views
                                    </p>
                                    <p>
                                      {stats.likes} likes • {stats.comments}{' '}
                                      comments
                                    </p>
                                  </div>
                                </div>
                              )
                            })}

                            {/* Show more indicator */}
                            {videos.length > 4 && (
                              <div
                                className='border-muted hover:bg-muted/50 flex aspect-[9/16] cursor-pointer items-center justify-center rounded-lg border-2 border-dashed transition-colors'
                                onClick={() => setSelectedAccount(account)}
                              >
                                <div className='text-muted-foreground text-center'>
                                  <span className='text-lg font-semibold'>
                                    +{videos.length - 4}
                                  </span>
                                  <p className='text-xs'>more</p>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Content Strategies */}
                        <div className='mt-4'>
                          <p className='text-muted-foreground mb-2 text-xs'>
                            Content Types
                          </p>
                          <div className='flex flex-wrap gap-1'>
                            {account.content_strategies.map((strategy) => {
                              const strategyInfo =
                                CONTENT_STRATEGIES[
                                  strategy as keyof typeof CONTENT_STRATEGIES
                                ]
                              const Icon = strategyInfo?.icon || ImageIcon
                              return (
                                <Badge
                                  key={strategy}
                                  variant='outline'
                                  className='text-xs'
                                >
                                  <Icon className='mr-1 h-3 w-3' />
                                  {strategyInfo?.label || strategy}
                                </Badge>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Account Queue Management Modal */}
      {selectedAccount && (
        <Dialog
          open={!!selectedAccount}
          onOpenChange={() => setSelectedAccount(null)}
        >
          <DialogContent className='max-w-2xl'>
            <DialogHeader>
              <DialogTitle>
                {selectedAccount.username} - Content Queue
              </DialogTitle>
            </DialogHeader>

            <div className='space-y-4'>
              {/* Account Info */}
              <div className='bg-muted flex items-center justify-between rounded-lg p-4'>
                <div>
                  <h4 className='font-semibold'>{selectedAccount.username}</h4>
                  <p className='text-muted-foreground text-sm'>
                    {selectedAccount.content_strategies.length} content types
                  </p>
                </div>
                <div className='flex gap-4 text-center'>
                  <div>
                    <p className='text-lg font-semibold'>
                      {getAccountStats(selectedAccount).pending}
                    </p>
                    <p className='text-muted-foreground text-xs'>Queued</p>
                  </div>
                  <div>
                    <p className='text-lg font-semibold'>
                      {getAccountStats(selectedAccount).posted}
                    </p>
                    <p className='text-muted-foreground text-xs'>Posted</p>
                  </div>
                </div>
              </div>

              {/* Content Queue */}
              <div className='space-y-3'>
                <h5 className='font-medium'>Queued Content</h5>
                {(() => {
                  const accountQueue = contentQueue.filter(
                    (item) => item.account_username === selectedAccount.username
                  )
                  const pendingItems = accountQueue.filter(
                    (item) => item.status === 'pending'
                  )

                  if (pendingItems.length === 0) {
                    return (
                      <div className='text-muted-foreground py-8 text-center'>
                        <AlertCircle className='mx-auto mb-2 h-8 w-8 opacity-50' />
                        <p>No content queued</p>
                        <p className='text-xs'>This account needs content!</p>
                      </div>
                    )
                  }

                  return (
                    <div className='grid max-h-60 gap-3 overflow-y-auto'>
                      {pendingItems.map((item) => (
                        <div
                          key={item.assignment_id}
                          className='flex items-center gap-3 rounded-lg border p-3'
                        >
                          <div className='bg-muted h-16 w-16 overflow-hidden rounded'>
                            {item.asset_type === 'video' ? (
                              <Video className='text-muted-foreground h-full w-full p-4' />
                            ) : (
                              <ImageIcon className='text-muted-foreground h-full w-full p-4' />
                            )}
                          </div>
                          <div className='flex-1'>
                            <p className='text-sm font-medium'>
                              {item.workflow_type || 'Content'}
                            </p>
                            <p className='text-muted-foreground line-clamp-2 text-xs'>
                              {item.caption || 'No caption'}
                            </p>
                          </div>
                          <Badge variant='outline' size='sm'>
                            {item.asset_type}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )
                })()}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Add Account Dialog */}
      <Dialog open={showAddAccount} onOpenChange={setShowAddAccount}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add TikTok Account</DialogTitle>
          </DialogHeader>
          <div className='space-y-4 pt-4'>
            <div className='space-y-2'>
              <Label htmlFor='username'>TikTok Handle</Label>
              <Input
                id='username'
                placeholder='@youraccount'
                value={newAccount.username}
                onChange={(e) =>
                  setNewAccount({ ...newAccount, username: e.target.value })
                }
              />
            </div>

            <div className='space-y-2'>
              <Label>Content Strategies</Label>
              <div className='space-y-2'>
                {Object.entries(CONTENT_STRATEGIES).map(([key, value]) => (
                  <label key={key} className='flex items-center gap-2'>
                    <Checkbox
                      checked={newAccount.content_strategies.includes(
                        key as keyof typeof CONTENT_STRATEGIES
                      )}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setNewAccount({
                            ...newAccount,
                            content_strategies: [
                              ...newAccount.content_strategies,
                              key as keyof typeof CONTENT_STRATEGIES,
                            ],
                          })
                        } else {
                          setNewAccount({
                            ...newAccount,
                            content_strategies:
                              newAccount.content_strategies.filter(
                                (s) => s !== key
                              ),
                          })
                        }
                      }}
                    />
                    <span className='text-sm'>{value.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className='flex justify-end gap-2 pt-4'>
              <Button
                variant='outline'
                onClick={() => setShowAddAccount(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddAccount}
                disabled={
                  !newAccount.username ||
                  newAccount.content_strategies.length === 0 ||
                  addingAccount
                }
              >
                {addingAccount ? (
                  <>
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    Adding...
                  </>
                ) : (
                  'Add Account'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
