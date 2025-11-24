import { useEffect, useState } from 'react'
import { formatDistanceToNow, parseISO } from 'date-fns'
import {
  Bookmark,
  Clock,
  Check,
  Share2,
  AlertTriangle,
  Loader2,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { usePrayerAPI } from '../hooks/usePrayerAPI'
import { PrayerHistoryEntry } from '../services/prayer-api'

// Helper to get initials from a name
const getInitials = (name: string) => {
  if (!name) return '??'
  const parts = name.split(' ')
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + (parts[parts.length - 1][0] || '')).toUpperCase()
}

// Helper to determine avatar border color based on status or user ID
const getAvatarBorderColor = (
  status: 'success' | 'error' | 'pending',
  userId: string
) => {
  if (status === 'error') return 'border-red-300 dark:border-red-700'
  if (status === 'pending') return 'border-amber-300 dark:border-amber-700'
  // Simple deterministic color based on userId for variety
  if (!userId) return 'border-gray-300 dark:border-gray-700'
  const hash = userId
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const colors = [
    'border-green-300 dark:border-green-600',
    'border-blue-300 dark:border-blue-600',
    'border-purple-300 dark:border-purple-600',
    'border-pink-300 dark:border-pink-600',
    'border-teal-300 dark:border-teal-600',
  ]
  return colors[hash % colors.length]
}

const getStatusBadge = (
  status: 'success' | 'error' | 'pending',
  liked: boolean | null
) => {
  if (status === 'success') {
    // For simplicity, let's assume 'shared' isn't a direct status from history but an action.
    // We'll use 'liked' as a proxy for positive engagement, or just 'Completed'.
    if (liked) {
      return (
        <Badge
          variant='outline'
          className='gap-1 border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800/30 dark:bg-purple-900/20 dark:text-purple-400'
        >
          <Check size={12} />
          <span>Engaged</span>
        </Badge>
      )
    }
    return (
      <Badge
        variant='outline'
        className='gap-1 border-green-200 bg-green-50 text-green-700 dark:border-green-800/30 dark:bg-green-900/20 dark:text-green-400'
      >
        <Check size={12} />
        <span>Completed</span>
      </Badge>
    )
  }
  if (status === 'error') {
    return (
      <Badge
        variant='outline'
        className='gap-1 border-red-200 bg-red-50 text-red-700 dark:border-red-800/30 dark:bg-red-900/20 dark:text-red-400'
      >
        <AlertTriangle size={12} />
        <span>Error</span>
      </Badge>
    )
  }
  if (status === 'pending') {
    return (
      <Badge
        variant='outline'
        className='gap-1 border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/30 dark:bg-amber-900/20 dark:text-amber-400'
      >
        <Clock size={12} />
        <span>Pending</span>
      </Badge>
    )
  }
  return null
}

export function RecentPrayers() {
  const { getPrayerHistory, loading, error: apiError } = usePrayerAPI()
  const [history, setHistory] = useState<PrayerHistoryEntry[]>([])

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await getPrayerHistory()
        // For "Recent Prayers", let's take the latest 3 instead of 4.
        setHistory(data.slice(0, 3))
      } catch (err) {
        // Error is handled by usePrayerAPI hook and exposed as apiError
        console.error('Error fetching prayer history in component:', err)
      }
    }
    fetchHistory()
  }, [getPrayerHistory])

  if (loading) {
    return (
      <div className='text-muted-foreground flex items-center justify-center py-10'>
        <Loader2 className='mr-2 h-5 w-5 animate-spin' />
        Loading recent activity...
      </div>
    )
  }

  if (apiError) {
    return (
      <div className='flex flex-col items-center justify-center py-10 text-red-600 dark:text-red-400'>
        <AlertTriangle className='mb-2 h-8 w-8' />
        <p className='font-semibold'>Failed to load prayer activity</p>
        <p className='text-muted-foreground text-sm'>{apiError.message}</p>
      </div>
    )
  }

  if (history.length === 0) {
    return (
      <div className='text-muted-foreground py-10 text-center'>
        <Bookmark className='mx-auto mb-2 h-8 w-8' />
        <p>No recent prayer activity found.</p>
      </div>
    )
  }

  return (
    <div className='max-h-[330px] space-y-6 overflow-y-auto pr-2'>
      {history.map((entry) => (
        <div key={entry.id} className='flex items-start gap-4'>
          <Avatar
            className={`h-10 w-10 border-2 ${getAvatarBorderColor(entry.status, entry.userId)}`}
          >
            {/* The avatars are static in the original design, we can try to make them dynamic if user images are available */}
            {/* For now, using a generic pattern and good fallbacks */}
            <AvatarImage
              src={
                entry.userId
                  ? `/avatars/${entry.userId.substring(entry.userId.length - 2)}.png`
                  : undefined
              }
              alt={entry.userName}
            />
            <AvatarFallback className='bg-muted-foreground/20 text-muted-foreground font-semibold'>
              {getInitials(entry.userName)}
            </AvatarFallback>
          </Avatar>
          <div className='flex-1 space-y-1.5'>
            <div className='flex flex-wrap items-center justify-between gap-2'>
              <div>
                <p className='font-medium'>{entry.userName}</p>
                <div className='text-muted-foreground flex items-center gap-1.5 text-xs'>
                  <Clock size={12} />
                  <span>
                    {entry.slot.endsWith('-am') ? 'Morning' : 'Evening'} prayer,{' '}
                    {formatDistanceToNow(parseISO(entry.generatedAt), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
              </div>
              <div className='flex items-center gap-1.5'>
                {getStatusBadge(entry.status, entry.liked)}
              </div>
            </div>
            {entry.inputPrompt && (
              <div className='bg-muted/10 dark:bg-muted/30 text-muted-foreground border-border/50 rounded-md border border-dashed p-2.5 text-sm italic'>
                {/* Using inputPrompt as a placeholder for the "quote" if available and concise enough */}
                "{/* Truncate if too long, or choose a more suitable field */}
                {entry.inputPrompt.length > 150
                  ? `${entry.inputPrompt.substring(0, 147)}...`
                  : entry.inputPrompt}
                "
              </div>
            )}
            {entry.categories && entry.categories.length > 0 && (
              <div className='flex flex-wrap gap-2 pt-1 text-xs'>
                {entry.categories.slice(0, 3).map(
                  (
                    category // Show max 3 categories
                  ) => (
                    <Badge
                      key={category}
                      variant='secondary'
                      className='gap-1 rounded-sm text-xs'
                    >
                      <Bookmark size={10} />
                      <span>{category}</span>
                    </Badge>
                  )
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
