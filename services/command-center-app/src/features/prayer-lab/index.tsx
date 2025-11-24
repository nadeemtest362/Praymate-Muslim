import { useState, useEffect } from 'react'
import {
  Sparkles,
  Brain,
  Zap,
  Copy,
  RefreshCw,
  Wand2,
  Edit2,
  Loader2,
  ChevronRight,
  AlertCircle,
  ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  generateTestUser,
  generateNewMood,
  type GeneratedUserData,
  availableModels,
  testOpenAIConnection,
} from './services/ai-user-generator'
import { generateIntentions } from './services/intention-generator'
import { generatePrayer } from './services/prayer-generator'
import { getUserIntentions } from './services/prayer-lab-data'
import {
  updateUserMood,
  updateIntentionStatus,
} from './services/prayer-lab-updates'
import {
  saveTestUser,
  savePrayer,
  getTestUsers,
  getUserPrayers,
  saveGeneratedIntentions,
} from './services/supabase-service'

// Types based on actual database schema
interface PrayerFocusPerson {
  id: string
  name: string
  relationship?: string
  gender?: string
  email?: string
  image_uri?: string
}

interface PrayerIntention {
  id: string
  person_id?: string
  person?: PrayerFocusPerson
  category: string
  details?: string
  is_active: boolean
}

// UserData type matches what the AI generates
type UserData = GeneratedUserData

// Prayer categories from actual constants
const prayerCategories = [
  { id: 'guidance', label: 'Guidance', emoji: '🧭' },
  { id: 'wisdom', label: 'Wisdom', emoji: '🧠' },
  { id: 'healing', label: 'Healing', emoji: '🩹' },
  { id: 'peace', label: 'Peace', emoji: '☮️' },
  { id: 'strength', label: 'Strength', emoji: '💪' },
  { id: 'gratitude', label: 'Gratitude', emoji: '🙏' },
  { id: 'forgiveness', label: 'Forgiveness', emoji: '🕊️' },
  { id: 'blessing', label: 'Blessing', emoji: '✨' },
  { id: 'financialHelp', label: 'Financial Help', emoji: '💵' },
  { id: 'protection', label: 'Protection', emoji: '🛡️' },
  { id: 'faith', label: 'Faith', emoji: '✝️' },
  { id: 'comfort', label: 'Comfort', emoji: '🤗' },
  { id: 'joy', label: 'Joy', emoji: '😊' },
  { id: 'patience', label: 'Patience', emoji: '⏳' },
  { id: 'love', label: 'Love', emoji: '❤️' },
  { id: 'hope', label: 'Hope', emoji: '🌟' },
  { id: 'success', label: 'Success', emoji: '🎯' },
  { id: 'other', label: 'Other', emoji: '📝' },
]

type TimelineItem = PrayerResult | MoodChangeEvent

interface PrayerResult {
  type: 'prayer'
  id: string
  model: string
  prayer: string
  timestamp: Date
  isFirstPrayer: boolean
  previousResponseId?: string
  prompt?: string
  responseId?: string
  intentions?: any[]
  modelKnew?: {
    prompt: string // What was sent to the model
    isFirstPrayer: boolean
    previousResponseId?: string
  }
  modelKnows?: {
    mood: string
    moodContext: string
    activeIntentions: any[]
    cumulativeChanges: string[] // All changes made so far
  }
}

interface MoodChangeEvent {
  type: 'mood-change'
  id: string
  timestamp: Date
  previousMood: string
  newMood: string
  moodContext: string
}

// Helper function to extract prayer text from JSON string if needed
function extractPrayerText(prayer: string): string {
  // If it's already clean text, return it
  if (!prayer.startsWith('[{') && !prayer.startsWith('{')) {
    return prayer
  }

  try {
    // Try to parse as JSON
    const parsed = JSON.parse(prayer) as any

    // Handle array format from Responses API
    if (Array.isArray(parsed) && parsed.length > 0) {
      const lastMessage = parsed[parsed.length - 1]
      if (
        lastMessage &&
        lastMessage.content &&
        Array.isArray(lastMessage.content)
      ) {
        const textContent = lastMessage.content.find(
          (c: any) => c.type === 'output_text' || c.type === 'text'
        )
        if (textContent && textContent.text) {
          return textContent.text
        }
      }
    }

    // Handle other possible formats
    if (parsed.text) return parsed.text
    if (parsed.content) return parsed.content
    if (parsed.output) return parsed.output

    // If we can't extract, return the original
    return prayer
  } catch (e) {
    // If parsing fails, return the original
    return prayer
  }
}

export function PrayerLab() {
  // User data state
  const [userData, setUserData] = useState<UserData | null>(null)
  const [savedUserId, setSavedUserId] = useState<string | null>(null)
  const [isGeneratingUser, setIsGeneratingUser] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editablePrompt, setEditablePrompt] = useState('')
  const [reviewChanges, setReviewChanges] = useState<string>('')
  const [intentionChanges, setIntentionChanges] = useState<
    Array<{ intentionId: string; action: 'added' | 'removed'; details: string }>
  >([])
  const [cumulativeChanges, setCumulativeChanges] = useState<string[]>([])
  const [selectedModel, setSelectedModel] = useState('gpt-4o')
  const [error, setError] = useState<string | null>(null)

  // Existing test users
  const [existingUsers, setExistingUsers] = useState<any[]>([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  const [isAutoLoading, setIsAutoLoading] = useState(true) // Track if we're auto-loading

  // Test configuration
  const [slot, setSlot] = useState<'morning' | 'evening'>('morning')

  // Results
  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>([])
  const [isGenerating, setIsGenerating] = useState(false)

  // Intention generation
  const [isGeneratingIntentions, setIsGeneratingIntentions] = useState(false)

  // Track the original state of intentions when a prayer was last generated
  const [originalIntentionStates, setOriginalIntentionStates] = useState<
    Record<string, boolean>
  >({})

  // Load existing test users on mount
  useEffect(() => {
    loadExistingUsers()
  }, [])

  // Update prompt when slot changes
  useEffect(() => {
    if (userData?.lastOpenaiResponseId) {
      setEditablePrompt(`Generate my ${slot} prayer.`)
    }
  }, [slot, userData?.lastOpenaiResponseId])

  // Debug: Monitor userData changes
  useEffect(() => {
    if (userData) {
      console.log('=== USER DATA UPDATED ===')
      console.log('Prayer intentions:', userData.prayerIntentions)
      console.log(
        'Intention IDs:',
        userData.prayerIntentions.map((i) => ({ id: i.id, type: typeof i.id }))
      )
    }
  }, [userData])

  // Auto-update review changes when intention changes occur
  useEffect(() => {
    if (userData?.lastOpenaiResponseId && intentionChanges.length > 0) {
      console.log('=== AUTO-UPDATING REVIEW CHANGES ===')
      console.log('intentionChanges:', intentionChanges)

      const addedIntentions = intentionChanges.filter(
        (c) => c.action === 'added'
      )
      const removedIntentions = intentionChanges.filter(
        (c) => c.action === 'removed'
      )

      let intentionDiff = ''

      if (removedIntentions.length > 0) {
        intentionDiff += 'Please remove these intentions from my prayer: '
        intentionDiff += removedIntentions.map((c) => c.details).join(', ')
        intentionDiff += '.'
      }

      if (addedIntentions.length > 0) {
        if (intentionDiff) intentionDiff += '\n\n'
        intentionDiff += 'Please add these intentions to my prayer: '
        intentionDiff += addedIntentions.map((c) => c.details).join(', ')
        intentionDiff += '.'
      }

      console.log('Generated intentionDiff for UI:', intentionDiff)

      // Update the review changes UI (preserve any manual edits, append intention changes)
      setReviewChanges((prev) => {
        // Remove any previous intention changes from the text (use multiline/dotall flags)
        let cleanedPrev = prev.replace(
          /Please remove these intentions from my prayer:.*?\./gs,
          ''
        )
        cleanedPrev = cleanedPrev.replace(
          /Please add these intentions to my prayer:.*?\./gs,
          ''
        )
        cleanedPrev = cleanedPrev.trim()

        if (cleanedPrev && intentionDiff) {
          return cleanedPrev + '\n\n' + intentionDiff
        } else if (intentionDiff) {
          return intentionDiff
        } else {
          return cleanedPrev
        }
      })
    } else if (intentionChanges.length === 0) {
      // Clear intention changes from review changes when no changes remain
      setReviewChanges((prev) => {
        let cleanedPrev = prev.replace(
          /Please remove these intentions from my prayer:.*?\./gs,
          ''
        )
        cleanedPrev = cleanedPrev.replace(
          /Please add these intentions to my prayer:.*?\./gs,
          ''
        )
        return cleanedPrev.trim()
      })
    }
  }, [intentionChanges, userData?.lastOpenaiResponseId])

  const loadExistingUsers = async () => {
    setIsLoadingUsers(true)
    try {
      const users = await getTestUsers()
      console.log('Loaded existing users:', users)
      // Check if they're all the same
      if (users.length > 1) {
        const names = users.map((u) => u.first_name)
        const moods = users.map((u) => u.mood)
        console.log('User names:', names)
        console.log('User moods:', moods)
      }
      setExistingUsers(users)

      // TEMPORARY FIX: Clear localStorage if stored ID doesn't exist in loaded users
      const lastUsedId = localStorage.getItem('prayer_lab_last_user_id')
      if (lastUsedId && !users.find((u) => u.id === lastUsedId)) {
        console.log('Clearing invalid stored user ID:', lastUsedId)
        localStorage.removeItem('prayer_lab_last_user_id')
      }

      // Auto-load the most recently used user
      if (users.length > 0) {
        // Get the last used user ID from localStorage (after it was cleaned up above)
        const lastUsedId = localStorage.getItem('prayer_lab_last_user_id')

        // Find the user in the list - first try stored ID, then fall back to first user
        let userToLoad = null

        if (lastUsedId) {
          userToLoad = users.find((u) => u.id === lastUsedId)
          if (userToLoad) {
            console.log(
              'Loading previously used user:',
              userToLoad.first_name,
              'ID:',
              userToLoad.id
            )
          } else {
            console.log(
              'ERROR: Stored user ID still not found after cleanup:',
              lastUsedId
            )
            // Force clear it again and use first user
            localStorage.removeItem('prayer_lab_last_user_id')
            userToLoad = users[0]
            console.log(
              'Force fallback to first user:',
              userToLoad.first_name,
              'ID:',
              userToLoad.id
            )
          }
        } else {
          console.log('No stored user ID, loading first user')
          userToLoad = users[0]
          console.log(
            'Using first user:',
            userToLoad.first_name,
            'ID:',
            userToLoad.id
          )
        }

        if (userToLoad) {
          console.log('Auto-loading user:', userToLoad.first_name)
          await loadTestUserFromData(userToLoad)
        } else {
          console.log('No users available to load')
          setIsAutoLoading(false)
        }
      } else {
        setIsAutoLoading(false) // No users exist
      }
    } catch (error) {
      console.error('Error loading test users:', error)
      setIsAutoLoading(false)
    } finally {
      setIsLoadingUsers(false)
    }
  }

  // Load a specific test user from data object
  const loadTestUserFromData = async (user: any) => {
    try {
      console.log(
        '=== LOADING TEST USER FROM DATA ===',
        user.first_name,
        user.id
      )

      // Load intentions for this user
      console.log('About to load intentions for user:', user.id)
      const intentions = await getUserIntentions(user.id)
      console.log('Loaded intentions for user:', user.id, intentions)

      // Convert database user to UserData format
      const userData: UserData = {
        firstName: user.first_name,
        mood: user.mood,
        moodContext: user.mood_context || '',
        initialMotivation: user.initial_motivation,
        relationshipWithGod: user.relationship_with_god,
        prayerFrequency: user.prayer_frequency,
        faithTradition: user.faith_tradition,
        commitmentLevel: user.commitment_level,
        streakGoalDays: user.streak_goal_days,
        prayerTimes: user.prayer_times || [],
        prayerNeeds: user.prayer_needs || [],
        customPrayerNeed: user.custom_prayer_need,
        lastOpenaiResponseId: user.last_openai_response_id,
        prayerIntentions: intentions,
      }

      setSavedUserId(user.id)
      setUserData(userData)
      setTimelineItems([]) // Clear previous results

      // Save this as the last used user
      localStorage.setItem('prayer_lab_last_user_id', user.id)

      // Initialize intention states tracking
      const states: Record<string, boolean> = {}
      intentions.forEach((intention: any) => {
        states[intention.id] = intention.is_active
      })
      setOriginalIntentionStates(states)

      // Generate initial prompt for this user
      regeneratePromptForUser(userData, intentions)

      // Load previous prayers for this user
      try {
        const prayers = await getUserPrayers(user.id)
        // Convert to timeline items format with model knowledge
        const previousItems: TimelineItem[] = prayers.map((p, index) => {
          const inputSnapshot = p.input_snapshot as any
          const modelKnowledge = inputSnapshot?.modelKnowledge
          const isFirstPrayer =
            index === prayers.length - 1 && !p.openai_response_id

          return {
            type: 'prayer',
            id: p.id,
            model: p.model || 'gpt-4o',
            prayer: p.content,
            timestamp: new Date(p.created_at),
            isFirstPrayer,
            previousResponseId: p.openai_response_id,
            prompt: p.prompt,
            responseId: p.openai_response_id,
            intentions: modelKnowledge?.modelKnows?.activeIntentions || [],
            modelKnew: modelKnowledge?.modelKnew,
            modelKnows: modelKnowledge?.modelKnows,
          } as PrayerResult
        })

        setTimelineItems(previousItems)

        // Restore cumulative changes and latest mood from the latest prayer
        if (previousItems.length > 0 && previousItems[0].type === 'prayer') {
          const latestPrayer = previousItems[0] as PrayerResult

          if (latestPrayer.modelKnows?.cumulativeChanges) {
            setCumulativeChanges(latestPrayer.modelKnows.cumulativeChanges)
          }

          // Update user data with the latest mood from prayers
          if (latestPrayer.modelKnows?.mood) {
            setUserData((prev) => ({
              ...prev!,
              mood: latestPrayer.modelKnows!.mood,
              moodContext: latestPrayer.modelKnows!.moodContext,
            }))
            console.log(
              'Updated user mood to latest from prayers:',
              latestPrayer.modelKnows.mood
            )
          }
        }
      } catch (error) {
        console.error('Error loading user prayers:', error)
      }

      setIsAutoLoading(false)
      console.log('Successfully auto-loaded user:', user.first_name)
    } catch (error) {
      console.error('Error loading test user from data:', error)
      setIsAutoLoading(false)
    }
  }

  // Load a specific test user
  const loadTestUser = async (userId: string) => {
    try {
      console.log('=== LOADING TEST USER ===', userId)
      const user = existingUsers.find((u) => u.id === userId)
      if (!user) {
        console.error('User not found in existingUsers:', userId)
        setIsAutoLoading(false)
        return
      }
      console.log('Found user:', user)

      await loadTestUserFromData(user)
    } catch (error) {
      console.error('Error loading test user:', error)
      setIsAutoLoading(false)
    }
  }

  // Helper function to generate prompt for a user
  const regeneratePromptForUser = (user: UserData, intentions?: any[]) => {
    if (!user.lastOpenaiResponseId) {
      let prompt = `Generate my first prayer. This is for the '${slot}' slot.\n`
      prompt += `My name is ${user.firstName}.\n`

      // Initial motivation
      if (user.initialMotivation) {
        let motivationPhrase = ''
        if (user.initialMotivation === 'consistency')
          motivationPhrase =
            'I want to pray more, but I keep getting distracted'
        else if (user.initialMotivation === 'personalization')
          motivationPhrase = 'I struggle to find the right words when I pray'
        else if (user.initialMotivation === 'closer')
          motivationPhrase = 'I miss feeling connected to God'
        else if (user.initialMotivation === 'restart')
          motivationPhrase = "I'm trying to rebuild my faith journey"
        else if (user.initialMotivation === 'intercession')
          motivationPhrase =
            'I carry others in my heart but rarely pray for them'
        else if (user.initialMotivation === 'inspiration')
          motivationPhrase = 'My spiritual life feels dry and routine'
        prompt += `I'm starting this prayer journey because ${motivationPhrase}.\n`
      }

      if (user.faithTradition)
        prompt += `My faith tradition is ${user.faithTradition}.\n`
      if (user.prayerFrequency)
        prompt += `I typically pray ${user.prayerFrequency.replace(/_/g, ' ')}.\n`
      if (user.relationshipWithGod)
        prompt += `I currently feel my relationship with God is ${user.relationshipWithGod.replace(/_/g, ' ')}.\n`
      if (user.commitmentLevel) {
        const commitmentText = {
          extremely: 'extremely committed',
          very: 'very committed',
          somewhat: 'somewhat committed',
          neutral: 'neutral',
          not_very: 'not very committed',
        }[user.commitmentLevel]
        prompt += `I'm feeling ${commitmentText} about my prayer commitment.\n`
      }
      if (user.streakGoalDays)
        prompt += `I'm aiming for a prayer streak of ${user.streakGoalDays} days.\n`

      // Mood
      prompt += `Today, I'm feeling ${user.mood}`
      if (user.moodContext) {
        prompt += ` (specifically about: ${user.moodContext})`
      }
      prompt += '.\n'

      // Personal needs
      let personalNeedsAdded = false
      if (user.prayerNeeds && user.prayerNeeds.length > 0) {
        prompt +=
          '\nFor myself, I ask for Your guidance and strength regarding:\n'
        user.prayerNeeds.forEach((need: string) => {
          prompt += `- ${need.replace(/_/g, ' ')}\n`
        })
        personalNeedsAdded = true
      }
      if (user.customPrayerNeed) {
        if (!personalNeedsAdded)
          prompt +=
            '\nFor myself, I ask for Your guidance and strength regarding:\n'
        prompt += `- And specifically: ${user.customPrayerNeed}\n`
        personalNeedsAdded = true
      }

      // Intentions - use the provided intentions or the user's intentions
      const intentionsToUse = intentions || user.prayerIntentions
      if (
        intentionsToUse &&
        intentionsToUse.filter((i: any) => i.is_active).length > 0
      ) {
        prompt +=
          '\nI have these prayer intentions for the people in my life. Please expand on each one meaningfully in the prayer, adding depth and spiritual insight:\n'
        intentionsToUse
          .filter((i: any) => i.is_active)
          .forEach((intention: any) => {
            if (!intention.person && intention.person_id === null) {
              prompt += `- For myself: ${intention.details} (theme: ${intention.category}).\n`
            } else if (intention.person) {
              let intentionLine = `- For ${intention.person.name}`
              if (intention.person.relationship)
                intentionLine += ` (${intention.person.relationship})`
              intentionLine += `: ${intention.details} (theme: ${intention.category}).\n`
              prompt += intentionLine
            }
          })
      } else if (!personalNeedsAdded) {
        prompt +=
          "\nI am open to God's guidance and blessings in all areas of my life.\n"
      }

      // Add encouragement for first prayer
      prompt +=
        '\nPlease include encouragement for me on this new prayer journey to bring me closer to God.\n'

      setEditablePrompt(prompt)
      setReviewChanges('')
    } else {
      // Subsequent prayer - simple prompt
      setEditablePrompt(`Generate my ${slot} prayer.`)
      setReviewChanges('')
    }
  }

  // Generate user with AI
  const generateUser = async () => {
    setIsGeneratingUser(true)
    setError(null)

    // Clear previous data when generating new user
    setTimelineItems([])
    setCumulativeChanges([])
    setIntentionChanges([])

    let savedIntentions: any[] = [] // Declare here so it's accessible in the whole function

    try {
      const generatedUser = await generateTestUser(selectedModel)

      // Automatically save the user to the database
      try {
        const savedUser = await saveTestUser(generatedUser)
        setSavedUserId(savedUser.id)

        // Reload intentions from database to get the actual UUIDs
        savedIntentions = await getUserIntentions(savedUser.id)
        console.log('=== INTENTION UUID UPDATE ===')
        console.log(
          'Generated intentions (before save):',
          generatedUser.prayerIntentions
        )
        console.log('Reloaded intentions (after save):', savedIntentions)

        // Update user data with saved ID and actual database intentions
        const updatedUserData = {
          ...generatedUser,
          prayerIntentions: savedIntentions, // Use the intentions with real UUIDs from database
          lastOpenaiResponseId: savedUser.last_openai_response_id || null,
        }
        setUserData(updatedUserData)

        console.log(
          'Updated user data with new intentions:',
          updatedUserData.prayerIntentions
        )

        // Initialize original intention states for new user
        const initialStates: Record<string, boolean> = {}
        savedIntentions.forEach((intention: any) => {
          initialStates[intention.id] = intention.is_active
        })
        setOriginalIntentionStates(initialStates)

        // IMPORTANT: Regenerate the prompt with the updated intentions that have real UUIDs
        // This fixes the issue where the prompt was using old intention IDs
        regeneratePromptForUser(updatedUserData, savedIntentions)

        console.log('User automatically saved:', savedUser)

        // Save as last used user
        localStorage.setItem('prayer_lab_last_user_id', savedUser.id)

        // Reload existing users list to include the new user
        await loadExistingUsers()
      } catch (saveError) {
        console.error('Error auto-saving user:', saveError)
        // Still set the user data even if save fails
        setUserData(generatedUser)
        setError('Generated user but failed to save to database')
      }

      // Generate initial prompt using the helper function
      // Note: Don't regenerate here because we'll do it after saving with real UUIDs
      // For now, just set a placeholder or use the helper with the generated data
      if (!generatedUser.lastOpenaiResponseId) {
        // We'll regenerate this after save with real UUIDs, but set something for now
        regeneratePromptForUser(generatedUser)
        // Reset tracking states for new user
        setCumulativeChanges([])
        setIntentionChanges([])
      } else {
        // Subsequent prayer - simple prompt
        setEditablePrompt(`Generate my ${slot} prayer.`)
        setReviewChanges('') // Mood change will be auto-generated
      }
    } catch (error) {
      console.error('Error generating user:', error)
      setError(
        error instanceof Error ? error.message : 'Failed to generate user'
      )
    } finally {
      setIsGeneratingUser(false)
    }
  }

  // Generate new intentions
  const generateNewIntentions = async () => {
    if (!userData || !savedUserId) return

    setIsGeneratingIntentions(true)
    setError(null)

    try {
      // Generate 2-3 new intentions with AI
      const generatedData = await generateIntentions(selectedModel)

      // Save to database
      await saveGeneratedIntentions(savedUserId, generatedData.intentions)

      // Reload intentions from database to get proper UUIDs
      const updatedIntentions = await getUserIntentions(savedUserId)

      // Update user data with new intentions
      const updatedUserData = {
        ...userData,
        prayerIntentions: updatedIntentions,
      }
      setUserData(updatedUserData)

      // Always regenerate the prompt with the new intentions
      // This ensures the AI prompt immediately reflects the new intentions
      regeneratePromptForUser(updatedUserData)

      // For subsequent prayers, we need to show the new intentions as additions
      if (userData.lastOpenaiResponseId) {
        // Get all the newly generated intentions (those not in original states)
        const newIntentionsList = updatedIntentions.filter(
          (intention: any) =>
            !(intention.id in originalIntentionStates) && intention.is_active
        )

        if (newIntentionsList.length > 0) {
          // Create intention changes for all new active intentions
          const newChanges = newIntentionsList.map((intention: any) => ({
            intentionId: intention.id,
            action: 'added' as const,
            details: intention.person
              ? `${intention.details} for ${intention.person.name}${intention.person.relationship ? ` (${intention.person.relationship})` : ''}`
              : `${intention.details} for myself`,
          }))

          // Add these to existing intention changes
          setIntentionChanges((prev) => [...prev, ...newChanges])

          console.log(
            'Added new intentions as changes for subsequent prayer:',
            newChanges
          )
        }
      }

      // Update original intention states to include the new intentions
      const newOriginalStates: Record<string, boolean> = {
        ...originalIntentionStates,
      }
      updatedIntentions.forEach((intention: any) => {
        // Only set original state if it's a new intention (not already tracked)
        if (!(intention.id in newOriginalStates)) {
          newOriginalStates[intention.id] = intention.is_active
        }
      })
      setOriginalIntentionStates(newOriginalStates)

      console.log(
        'Successfully generated and saved new intentions:',
        updatedIntentions
      )
      console.log(
        'Updated original states with new intentions:',
        newOriginalStates
      )
    } catch (error) {
      console.error('Error generating intentions:', error)
      setError(
        error instanceof Error ? error.message : 'Failed to generate intentions'
      )
    } finally {
      setIsGeneratingIntentions(false)
    }
  }

  // Toggle intention active state
  const toggleIntention = async (intentionId: string) => {
    if (!userData) return

    // Enhanced debug logging
    console.log('=== TOGGLE INTENTION DEBUG ===')
    console.log('Intention ID to toggle:', intentionId)
    console.log('Type of intention ID:', typeof intentionId)
    console.log('Current user data intentions:', userData.prayerIntentions)
    console.log('Saved user ID:', savedUserId)

    const intention = userData.prayerIntentions.find(
      (i) => i.id === intentionId
    )
    if (!intention) {
      console.error('Intention not found! Looking for ID:', intentionId)
      console.error(
        'Available intention IDs:',
        userData.prayerIntentions.map((i) => ({ id: i.id, type: typeof i.id }))
      )
      return
    }

    console.log('Found intention:', intention)

    const newActiveState = !intention.is_active

    // Update local state immediately
    const updatedUserData = {
      ...userData,
      prayerIntentions: userData.prayerIntentions.map((i) =>
        i.id === intentionId ? { ...i, is_active: newActiveState } : i
      ),
    }
    setUserData(updatedUserData)

    // Track this change for all prayers - both first and subsequent
    // For first prayers, we need to regenerate the prompt
    // For subsequent prayers, we track it as a natural language diff
    const intentionDescription = intention.person
      ? `${intention.details} for ${intention.person.name}${intention.person.relationship ? ` (${intention.person.relationship})` : ''}`
      : `${intention.details} for myself`

    if (userData.lastOpenaiResponseId) {
      // For subsequent prayers, track as intention changes
      setIntentionChanges((prev) => {
        console.log('Current intention changes before update:', prev)
        console.log(
          'Updating intention:',
          intentionId,
          'to',
          newActiveState ? 'added' : 'removed'
        )

        // Remove any existing change for this intention
        const filtered = prev.filter((c) => c.intentionId !== intentionId)
        console.log('Filtered changes (removed existing):', filtered)

        // Get the original state from when the last prayer was generated
        const wasOriginallyActive =
          originalIntentionStates[intentionId] ?? false

        console.log(
          'Original state from last prayer:',
          wasOriginallyActive,
          'New state:',
          newActiveState
        )

        // If the state is back to original, don't track a change
        if (wasOriginallyActive === newActiveState) {
          console.log('State is back to original, removing from changes')
          return filtered
        }

        // Add the new change
        const newChanges = [
          ...filtered,
          {
            intentionId,
            action: newActiveState ? 'added' : 'removed',
            details: intentionDescription,
          },
        ]
        console.log('New intention changes:', newChanges)
        return newChanges
      })
    } else {
      // For first prayer, regenerate the entire prompt with updated intentions
      // Use the updated data that includes the toggle change
      setTimeout(() => {
        regeneratePromptForUser(updatedUserData)
      }, 0)
    }

    // Save to database if we have a saved user
    if (savedUserId) {
      const success = await updateIntentionStatus(intentionId, newActiveState)
      if (!success) {
        // Revert on failure
        setUserData({
          ...userData,
          prayerIntentions: userData.prayerIntentions.map((i) =>
            i.id === intentionId ? { ...i, is_active: !newActiveState } : i
          ),
        })
        setError('Failed to save intention change')
      }
    }
  }

  // Generate prayers
  const generatePrayers = async () => {
    if (!userData) return

    setIsGenerating(true)
    setError(null)

    try {
      // For subsequent prayers, generate new mood reflecting life events since last prayer
      let currentMood = userData.mood
      let currentMoodContext = userData.moodContext
      const previousMood = userData.mood // Store for mood change event

      if (userData.lastOpenaiResponseId) {
        // Time has passed since last prayer - generate new mood
        try {
          const moodData = await generateNewMood(selectedModel, currentMood)
          currentMood = moodData.mood as typeof userData.mood
          currentMoodContext = moodData.moodContext
          console.log(
            'New mood for this prayer session:',
            currentMood,
            '(was:',
            previousMood,
            ')'
          )

          // Update user data with new mood
          setUserData({
            ...userData,
            mood: currentMood as typeof userData.mood,
            moodContext: currentMoodContext,
          })

          // Update mood in database
          if (savedUserId) {
            await updateUserMood(savedUserId, currentMood, currentMoodContext)
          }
        } catch (moodError) {
          console.error('Error generating new mood:', moodError)
          // Continue with existing mood if generation fails
        }
      } else {
        console.log('First prayer - using initial mood:', currentMood)
      }

      // Prepare the initial onboarding snapshot with CURRENT mood
      const initialOnboardingSnapshot = {
        userId: 'test-user-' + Date.now(),
        firstName: userData.firstName,
        initialMotivation: userData.initialMotivation,
        mood: currentMood,
        moodContext: currentMoodContext,
        prayerNeeds: userData.prayerNeeds,
        customPrayerNeed: userData.customPrayerNeed,
        relationshipWithGod: userData.relationshipWithGod,
        prayerFrequency: userData.prayerFrequency,
        faithTradition: userData.faithTradition,
        commitmentLevel: userData.commitmentLevel,
        streakGoalDays: userData.streakGoalDays,
        prayerIntentions: userData.prayerIntentions.filter((i) => i.is_active),
      }

      // Always use saved user ID (user is auto-saved when generated)
      if (!savedUserId) {
        throw new Error(
          'No saved user ID - user should be auto-saved when generated'
        )
      }

      // For subsequent prayers, build the natural language diff
      let finalPrompt = editablePrompt
      let allChanges = reviewChanges

      if (userData.lastOpenaiResponseId) {
        // Build natural language diff from intention changes
        console.log('=== INTENTION CHANGES DEBUG ===')
        console.log('intentionChanges array:', intentionChanges)
        console.log('intentionChanges length:', intentionChanges.length)

        if (intentionChanges.length > 0) {
          const addedIntentions = intentionChanges.filter(
            (c) => c.action === 'added'
          )
          const removedIntentions = intentionChanges.filter(
            (c) => c.action === 'removed'
          )

          console.log('addedIntentions:', addedIntentions)
          console.log('removedIntentions:', removedIntentions)

          let intentionDiff = ''

          if (removedIntentions.length > 0) {
            intentionDiff += '\nPlease remove these intentions from my prayer: '
            intentionDiff += removedIntentions.map((c) => c.details).join(', ')
            intentionDiff += '.'
          }

          if (addedIntentions.length > 0) {
            intentionDiff += '\nPlease add these intentions to my prayer: '
            intentionDiff += addedIntentions.map((c) => c.details).join(', ')
            intentionDiff += '.'
          }

          console.log('Generated intentionDiff:', intentionDiff)

          // Append intention changes to the review changes
          allChanges = allChanges ? allChanges + intentionDiff : intentionDiff
          console.log(
            'Final allChanges after adding intentionDiff:',
            allChanges
          )
        } else {
          console.log('No intention changes to process')
        }

        console.log('Subsequent prayer changes:', allChanges)
        console.log('Manual prompt edits:', editablePrompt)
      }

      // Log what we're sending to the prayer generator
      console.log('Calling generatePrayer with:', {
        hasLastResponseId: !!userData.lastOpenaiResponseId,
        lastOpenaiResponseId: userData.lastOpenaiResponseId,
        isSubsequent: !!userData.lastOpenaiResponseId,
      })

      // Generate prayer using GPT-4o
      const result = await generatePrayer({
        slot: userData.lastOpenaiResponseId ? slot : 'onboarding-initial',
        initialOnboardingSnapshot: userData.lastOpenaiResponseId
          ? undefined
          : initialOnboardingSnapshot,
        lastOpenaiResponseId: userData.lastOpenaiResponseId,
        // For subsequent prayers, pass the combined prompt and changes
        manualPromptEdits: userData.lastOpenaiResponseId
          ? finalPrompt
          : undefined,
        reviewChanges: userData.lastOpenaiResponseId ? allChanges : undefined,
      })

      // Debug logging
      console.log('Prayer generation result:', result)
      console.log('Type of result.prayer:', typeof result.prayer)
      console.log('result.prayer value:', result.prayer)

      // Ensure prayer is a string
      let prayerText = result.prayer
      if (typeof prayerText !== 'string') {
        console.error('Prayer is not a string:', prayerText)
        // Try to extract text if it's an object
        if (prayerText && typeof prayerText === 'object') {
          const obj = prayerText as any
          prayerText =
            obj.content || obj.text || obj.output || JSON.stringify(prayerText)
        } else {
          prayerText = String(prayerText)
        }
      }

      // Build model knowledge for this prayer
      const modelKnew = {
        prompt: result.prompt,
        isFirstPrayer: !userData.lastOpenaiResponseId,
        previousResponseId: userData.lastOpenaiResponseId || undefined,
      }

      const modelKnows = {
        mood: currentMood,
        moodContext: currentMoodContext,
        activeIntentions: userData.prayerIntentions.filter((i) => i.is_active),
        // Only include manual changes in cumulative changes, not intention changes
        // Intention changes are tracked via activeIntentions comparison
        cumulativeChanges: cumulativeChanges.filter(Boolean),
      }

      // Always save prayer to Supabase with model knowledge
      try {
        await savePrayer(
          savedUserId,
          prayerText,
          userData.lastOpenaiResponseId ? slot : 'onboarding-initial',
          {
            source: userData.lastOpenaiResponseId
              ? 'subsequent-prayer'
              : 'onboarding-initial',
            prompt: result.prompt,
            responseId: result.responseId,
            timestamp: new Date().toISOString(),
            mood: currentMood,
            moodContext: currentMoodContext,
            previousMood: null,
          },
          result.responseId,
          result.prompt,
          { modelKnew, modelKnows }
        )
        console.log(
          'Prayer automatically saved to database with model knowledge'
        )
      } catch (saveError) {
        console.error('Error saving prayer:', saveError)
        // Continue even if save fails
      }

      // Model state tracking is now handled in the TestResult object

      // Track cumulative changes - only add non-intention changes to avoid duplicates
      if (userData.lastOpenaiResponseId && allChanges) {
        // Extract only the manual review changes (not intention changes)
        // Since allChanges = reviewChanges + intentionDiff, we want just reviewChanges
        const manualChangesOnly = reviewChanges.trim()

        if (manualChangesOnly) {
          setCumulativeChanges((prev) => [...prev, manualChangesOnly])
        }

        // Intention changes are tracked separately and shouldn't be in cumulative changes
        // They're already captured in the activeIntentions state
      }

      const newPrayerResult: PrayerResult = {
        type: 'prayer',
        id: Date.now().toString(),
        model: 'gpt-4o',
        prayer: prayerText,
        timestamp: new Date(),
        isFirstPrayer: !userData.lastOpenaiResponseId,
        previousResponseId: userData.lastOpenaiResponseId || undefined,
        prompt: result.prompt,
        responseId: result.responseId,
        intentions: userData.prayerIntentions.filter((i) => i.is_active),
        modelKnew: {
          prompt: result.prompt,
          isFirstPrayer: !userData.lastOpenaiResponseId,
          previousResponseId: userData.lastOpenaiResponseId || undefined,
        },
        modelKnows: {
          mood: currentMood, // The mood DURING the prayer
          moodContext: currentMoodContext,
          activeIntentions: userData.prayerIntentions.filter(
            (i) => i.is_active
          ),
          cumulativeChanges: userData.lastOpenaiResponseId
            ? [...cumulativeChanges, allChanges].filter(Boolean)
            : [],
        },
      }

      // Add new prayer to timeline
      const newItems: TimelineItem[] = [newPrayerResult]

      // Add mood change if this is a subsequent prayer and mood changed
      console.log('Checking mood change:', {
        isSubsequent: !!userData.lastOpenaiResponseId,
        previousMood,
        currentMood,
        changed: previousMood !== currentMood,
      })

      if (userData.lastOpenaiResponseId && previousMood !== currentMood) {
        const moodChangeEvent: MoodChangeEvent = {
          type: 'mood-change',
          id: `mood-${Date.now()}`,
          timestamp: new Date(Date.now() - 1000), // Slightly earlier timestamp so it sorts correctly
          previousMood: previousMood,
          newMood: currentMood,
          moodContext: currentMoodContext,
        }
        // Insert mood change after the new prayer (visually between prayers)
        newItems.push(moodChangeEvent)
        console.log('Added mood change event to timeline')
      }

      // Add all new items to the beginning of the timeline
      setTimelineItems([...newItems, ...timelineItems])

      // Update userData with the new response ID for subsequent prayers
      console.log('Updating userData with new response ID:', result.responseId)
      console.log('Previous response ID was:', userData.lastOpenaiResponseId)

      setUserData({
        ...userData,
        mood: currentMood as typeof userData.mood,
        moodContext: currentMoodContext,
        lastOpenaiResponseId: result.responseId,
      })

      // Clear intention changes after successful prayer generation
      setIntentionChanges([])

      // Capture the current intention states as the new "original" state for the next prayer
      const newOriginalStates: Record<string, boolean> = {}
      userData.prayerIntentions.forEach((intention) => {
        newOriginalStates[intention.id] = intention.is_active
      })
      setOriginalIntentionStates(newOriginalStates)
      console.log(
        'Captured original intention states for next prayer:',
        newOriginalStates
      )

      // Update prompt UI and slot for next prayer
      const wasFirstPrayer = !userData.lastOpenaiResponseId
      if (wasFirstPrayer) {
        // Switch to evening slot after first prayer
        setSlot('evening')
        setEditablePrompt(`Generate my evening prayer.`)
        setReviewChanges('')
      } else {
        // After evening prayer, switch back to morning for next prayer
        if (slot === 'evening') {
          setSlot('morning')
          setEditablePrompt(`Generate my morning prayer.`)
        } else {
          setSlot('evening')
          setEditablePrompt(`Generate my evening prayer.`)
        }
        setReviewChanges('')
      }
    } catch (error) {
      console.error('Error generating prayer:', error)
      setError(
        error instanceof Error ? error.message : 'Failed to generate prayer'
      )
    } finally {
      setIsGenerating(false)
    }
  }

  // Show loading state while auto-loading or generating
  console.log('Rendering conditions:', {
    isAutoLoading,
    isGeneratingUser,
    hasUserData: !!userData,
    existingUsersCount: existingUsers.length,
  })

  if (isAutoLoading || (isGeneratingUser && !userData)) {
    console.log('Showing loading state')
    return (
      <div className='mx-auto flex min-h-screen max-w-4xl items-center justify-center'>
        <div className='text-center'>
          <Loader2 className='mx-auto mb-4 h-8 w-8 animate-spin' />
          <p className='text-muted-foreground'>
            {isAutoLoading ? 'Loading Prayer Lab...' : 'Generating user...'}
          </p>
        </div>
      </div>
    )
  }

  // If no user data and no existing users, show empty state
  if (!userData && !isGeneratingUser && existingUsers.length === 0) {
    console.log('Showing empty state')
    return (
      <div className='mx-auto flex min-h-screen max-w-4xl items-center justify-center'>
        <div className='space-y-4 text-center'>
          <div className='mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600 font-bold text-white'>
            🧪
          </div>
          <h2 className='text-2xl font-semibold'>Prayer Lab</h2>
          <p className='text-muted-foreground max-w-md'>
            Generate test users and iterate on prayer generation before iOS
            implementation.
          </p>
          <Button onClick={generateUser} disabled={isGeneratingUser}>
            {isGeneratingUser ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className='mr-2 h-4 w-4' />
                Generate Test User
              </>
            )}
          </Button>
        </div>
      </div>
    )
  }

  if (!userData) {
    console.log('No userData, returning null - this should not happen!')
    return null // This shouldn't happen but just in case
  }

  console.log('Rendering main Prayer Lab UI with userData:', userData.firstName)

  return (
    <div className='mx-auto max-w-7xl'>
      {/* Floating Header */}
      <div className='bg-background/80 sticky top-0 z-10 -mx-6 mb-6 border-b px-6 py-4 backdrop-blur-xl'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-4'>
            <div className='flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600 font-bold text-white'>
              {userData.firstName[0]}
            </div>
            <div>
              <p className='font-semibold'>{userData.firstName}</p>
              <p className='text-muted-foreground text-xs'>
                {userData.mood} •{' '}
                {userData.lastOpenaiResponseId
                  ? `Previous ID: ${userData.lastOpenaiResponseId}`
                  : 'First Prayer'}
              </p>
            </div>
          </div>
          <div className='flex items-center gap-2'>
            {savedUserId && (
              <Badge variant='secondary' className='text-xs'>
                Auto-saved to Test DB
              </Badge>
            )}
            <div className='relative'>
              <Button
                variant='ghost'
                size='icon'
                className='rounded-full'
                onClick={generateUser}
                disabled={isGeneratingUser}
                title='Generate new test user'
              >
                <RefreshCw
                  className={cn('h-4 w-4', isGeneratingUser && 'animate-spin')}
                />
              </Button>
              {isGeneratingUser && (
                <div className='absolute inset-0 animate-pulse rounded-full bg-gradient-to-r from-purple-500 to-pink-500' />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Loading Overlay */}
      {isGeneratingUser && (
        <div className='bg-background/80 fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm'>
          <div className='relative'>
            {/* Animated rings */}
            <div className='absolute inset-0 -m-8'>
              <div className='h-32 w-32 animate-ping rounded-full border-2 border-purple-500/20' />
            </div>
            <div className='absolute inset-0 -m-6'>
              <div className='animation-delay-200 h-28 w-28 animate-ping rounded-full border-2 border-pink-500/30' />
            </div>
            <div className='absolute inset-0 -m-4'>
              <div className='animation-delay-400 h-24 w-24 animate-ping rounded-full border-2 border-orange-500/40' />
            </div>

            {/* Center content */}
            <div className='bg-background/90 relative rounded-2xl border border-purple-500/20 p-8 shadow-2xl'>
              <div className='flex flex-col items-center space-y-4'>
                <div className='relative'>
                  <div className='flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500'>
                    <Sparkles className='h-8 w-8 animate-pulse text-white' />
                  </div>
                  <div className='absolute inset-0 h-16 w-16 animate-pulse rounded-full bg-gradient-to-br from-purple-500 to-pink-500 blur-xl' />
                </div>

                <div className='text-center'>
                  <p className='mb-1 text-lg font-semibold'>
                    Generating New Persona
                  </p>
                  <p className='text-muted-foreground text-sm'>
                    Creating unique life story with AI...
                  </p>
                </div>

                {/* Loading dots */}
                <div className='flex gap-1.5'>
                  <div className='h-2 w-2 animate-bounce rounded-full bg-purple-500' />
                  <div className='animation-delay-200 h-2 w-2 animate-bounce rounded-full bg-pink-500' />
                  <div className='animation-delay-400 h-2 w-2 animate-bounce rounded-full bg-orange-500' />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <Alert variant='destructive' className='mb-6'>
          <AlertCircle className='h-4 w-4' />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className='grid grid-cols-1 gap-6 overflow-hidden lg:grid-cols-2'>
        {/* Left Column: User Context */}
        <div className='space-y-4'>
          {/* User Profile Card */}
          <div className='relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-orange-500/10 p-6'>
            <div className='grid gap-4'>
              {/* Current State */}
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <p className='text-muted-foreground mb-1 text-xs font-medium'>
                    Current Mood
                  </p>
                  <p className='font-semibold'>{userData.mood}</p>
                </div>
                <div>
                  <p className='text-muted-foreground mb-1 text-xs font-medium'>
                    Commitment Level
                  </p>
                  <p className='font-semibold'>
                    {userData.commitmentLevel === 'extremely' &&
                      'Extremely committed'}
                    {userData.commitmentLevel === 'very' && 'Very committed'}
                    {userData.commitmentLevel === 'somewhat' &&
                      'Somewhat committed'}
                    {userData.commitmentLevel === 'neutral' && 'Neutral'}
                    {userData.commitmentLevel === 'not_very' &&
                      'Not very committed'}
                  </p>
                </div>
              </div>

              <div>
                <p className='text-muted-foreground mb-1 text-xs font-medium'>
                  Mood Context
                </p>
                <p className='text-sm'>{userData.moodContext}</p>
              </div>

              {/* Onboarding Answers */}
              <div className='grid grid-cols-2 gap-4 border-t border-white/10 pt-2'>
                <div>
                  <p className='text-muted-foreground mb-1 text-xs font-medium'>
                    Why They Pray
                  </p>
                  <p className='text-sm'>
                    {userData.initialMotivation === 'consistency' &&
                      'I want to pray more, but I keep getting distracted'}
                    {userData.initialMotivation === 'personalization' &&
                      'I struggle to find the right words when I pray'}
                    {userData.initialMotivation === 'closer' &&
                      'I miss feeling connected to God'}
                    {userData.initialMotivation === 'restart' &&
                      "I'm trying to rebuild my faith journey"}
                    {userData.initialMotivation === 'intercession' &&
                      'I carry others in my heart but rarely pray for them'}
                    {userData.initialMotivation === 'inspiration' &&
                      'My spiritual life feels dry and routine'}
                  </p>
                </div>
                <div>
                  <p className='text-muted-foreground mb-1 text-xs font-medium'>
                    Relationship with God
                  </p>
                  <p className='text-sm'>
                    {userData.relationshipWithGod?.replace(/_/g, ' ')}
                  </p>
                </div>
                <div>
                  <p className='text-muted-foreground mb-1 text-xs font-medium'>
                    Prayer Frequency
                  </p>
                  <p className='text-sm'>
                    {userData.prayerFrequency?.replace(/_/g, ' ')}
                  </p>
                </div>
                <div>
                  <p className='text-muted-foreground mb-1 text-xs font-medium'>
                    Faith Tradition
                  </p>
                  <p className='text-sm'>{userData.faithTradition}</p>
                </div>
              </div>

              {/* Goals */}
              <div className='grid grid-cols-2 gap-4 border-t border-white/10 pt-2'>
                <div>
                  <p className='text-muted-foreground mb-1 text-xs font-medium'>
                    Streak Goal
                  </p>
                  <p className='text-sm'>{userData.streakGoalDays} days</p>
                </div>
                <div>
                  <p className='text-muted-foreground mb-1 text-xs font-medium'>
                    Prayer Times
                  </p>
                  <p className='text-sm'>{userData.prayerTimes?.join(', ')}</p>
                </div>
              </div>

              {/* Prayer Needs */}
              {userData.prayerNeeds && userData.prayerNeeds.length > 0 && (
                <div className='border-t border-white/10 pt-2'>
                  <p className='text-muted-foreground mb-1 text-xs font-medium'>
                    Selected Prayer Themes
                  </p>
                  <div className='mt-1 flex flex-wrap gap-1'>
                    {userData.prayerNeeds.map((need, idx) => {
                      const needLabels: Record<string, string> = {
                        faith_deepening: 'Strengthen My Faith',
                        spiritual_discipline: 'Prayer & Bible Study',
                        discernment: "Hearing God's Voice",
                        worship: 'Heart of Worship',
                        anxiety_peace: 'Calm My Anxious Heart',
                        emotional_healing: 'Emotional Healing',
                        mental_clarity: 'Clear Mind & Focus',
                        rest: 'True Rest',
                        family_harmony: 'Family Unity',
                        forgiveness: 'Forgiveness & Reconciliation',
                        compassion: 'Love Like Jesus',
                        community: 'Christian Community',
                        life_purpose: "God's Purpose for My Life",
                        wisdom_decisions: 'Wisdom in Decisions',
                        breakthrough: 'Breakthrough & Open Doors',
                        provision: "God's Provision",
                      }
                      return (
                        <span
                          key={idx}
                          className='rounded-full bg-purple-500/20 px-2 py-0.5 text-xs text-purple-600 dark:text-purple-400'
                        >
                          {needLabels[need] || need}
                        </span>
                      )
                    })}
                  </div>
                </div>
              )}

              {userData.customPrayerNeed && (
                <div>
                  <p className='text-muted-foreground mb-1 text-xs font-medium'>
                    Custom Prayer Need
                  </p>
                  <p className='text-sm italic'>
                    "{userData.customPrayerNeed}"
                  </p>
                </div>
              )}
            </div>
            <div className='absolute -top-10 -right-10 h-40 w-40 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 blur-3xl' />
          </div>

          {/* Active Intentions */}
          <div>
            <div className='mb-3 flex items-center justify-between'>
              <p className='text-sm font-medium'>Active Intentions</p>
              <div className='flex items-center gap-2'>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={generateNewIntentions}
                  disabled={isGeneratingIntentions || !savedUserId}
                  className='h-7 px-2 text-xs'
                  title='Generate new intentions with AI'
                >
                  {isGeneratingIntentions ? (
                    <>
                      <Loader2 className='mr-1 h-3 w-3 animate-spin' />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Wand2 className='mr-1 h-3 w-3' />
                      Generate New
                    </>
                  )}
                </Button>
                <span className='text-muted-foreground text-xs'>
                  {userData.prayerIntentions.filter((i) => i.is_active).length}{' '}
                  of {userData.prayerIntentions.length}
                </span>
              </div>
            </div>
            <div className='space-y-2'>
              {userData.prayerIntentions.map((intention) => {
                const category = prayerCategories.find(
                  (c) => c.id === intention.category
                )
                return (
                  <div
                    key={intention.id}
                    className={cn(
                      'group relative overflow-hidden rounded-xl border p-4 transition-all',
                      intention.is_active
                        ? 'border-purple-500/20 bg-gradient-to-r from-purple-500/5 to-pink-500/5'
                        : 'bg-card/30 opacity-50'
                    )}
                  >
                    <div className='flex items-start gap-3'>
                      <Switch
                        checked={intention.is_active}
                        onCheckedChange={() => toggleIntention(intention.id)}
                        className='mt-0.5'
                      />
                      <div className='flex-1 space-y-2'>
                        <div className='flex items-center gap-2'>
                          <span className='text-xl'>{category?.emoji}</span>
                          <span className='font-medium'>{category?.label}</span>
                          {intention.person && (
                            <span className='text-muted-foreground text-sm'>
                              for {intention.person.name}
                            </span>
                          )}
                        </div>
                        <p className='text-muted-foreground text-sm leading-relaxed'>
                          {intention.details}
                        </p>
                      </div>
                    </div>
                    {intention.is_active && (
                      <div className='absolute -right-2 -bottom-2 h-20 w-20 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 blur-2xl' />
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Prayer Prompt */}
          <div className='relative overflow-hidden rounded-2xl border bg-black/5 p-6 dark:bg-white/5'>
            <div className='bg-grid-white/10 absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]' />
            <div className='relative'>
              <div className='mb-4 flex items-center justify-between'>
                <p className='text-sm font-medium'>AI Prompt</p>
                <div className='flex gap-2'>
                  <button
                    className={cn(
                      'rounded-full px-3 py-1 text-xs font-medium transition-all',
                      slot === 'morning'
                        ? 'bg-purple-500 text-white'
                        : 'bg-white/10 hover:bg-white/20'
                    )}
                    onClick={() => setSlot('morning')}
                  >
                    Morning
                  </button>
                  <button
                    className={cn(
                      'rounded-full px-3 py-1 text-xs font-medium transition-all',
                      slot === 'evening'
                        ? 'bg-purple-500 text-white'
                        : 'bg-white/10 hover:bg-white/20'
                    )}
                    onClick={() => setSlot('evening')}
                  >
                    Evening
                  </button>
                </div>
              </div>

              {/* Show current mood */}
              <div className='text-muted-foreground mb-2 flex items-center gap-2 text-xs'>
                <span>Current mood:</span>
                <Badge variant='secondary' className='text-xs'>
                  {userData.mood}
                </Badge>
                {userData.lastOpenaiResponseId && (
                  <span className='text-xs'>
                    (will auto-generate new mood on next prayer)
                  </span>
                )}
              </div>

              {userData.lastOpenaiResponseId ? (
                <div className='space-y-4'>
                  <div className='group relative rounded-lg bg-white/5 p-3 font-mono text-sm'>
                    <Button
                      variant='ghost'
                      size='icon'
                      className='absolute -top-2 -right-2 h-8 w-8 rounded-full opacity-0 transition-opacity group-hover:opacity-100'
                      onClick={() => setShowEditDialog(true)}
                    >
                      <Edit2 className='h-3 w-3' />
                    </Button>
                    <p className='text-xs leading-relaxed whitespace-pre-wrap'>
                      {editablePrompt}
                    </p>
                  </div>
                  <div>
                    <p className='text-muted-foreground mb-2 text-xs'>
                      Review Changes
                    </p>
                    <Textarea
                      value={reviewChanges}
                      onChange={(e) => setReviewChanges(e.target.value)}
                      placeholder="Additional changes to include (e.g., pray for Sarah's interview)"
                      className='placeholder:text-muted-foreground/50 h-16 resize-none border-white/10 bg-white/5'
                    />
                    <p className='text-muted-foreground mt-1 text-xs'>
                      Note: Mood will auto-generate to {userData.mood} when you
                      create the prayer
                    </p>
                  </div>
                  <div className='text-muted-foreground flex items-center gap-2 text-xs'>
                    <span className='h-1 w-1 rounded-full bg-green-500' />
                    Connected to {userData.lastOpenaiResponseId}
                  </div>
                </div>
              ) : (
                <div>
                  <div className='group relative rounded-lg bg-white/5 p-3 font-mono text-sm'>
                    <Button
                      variant='ghost'
                      size='icon'
                      className='absolute -top-2 -right-2 h-8 w-8 rounded-full opacity-0 transition-opacity group-hover:opacity-100'
                      onClick={() => setShowEditDialog(true)}
                    >
                      <Edit2 className='h-3 w-3' />
                    </Button>
                    <p className='text-xs leading-relaxed whitespace-pre-wrap'>
                      {editablePrompt}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Prayer Timeline */}
        <div className='flex h-full min-w-0 flex-col'>
          {/* Prayer Generation Button */}
          <div className='mb-4 rounded-2xl border bg-gradient-to-b from-purple-500/5 to-pink-500/5 p-6'>
            <div className='mb-4 flex items-center justify-between'>
              <p className='text-sm font-medium'>Generate Prayer</p>
              <Badge variant='secondary' className='text-xs'>
                GPT-4o
              </Badge>
            </div>

            {savedUserId ? (
              <p className='text-muted-foreground mb-4 text-xs'>
                ✓ All data auto-saved to prayer_lab_* tables • User ID:{' '}
                {savedUserId.slice(0, 8)}...
              </p>
            ) : (
              <p className='text-muted-foreground mb-4 text-xs'>
                Generate a test user to begin
              </p>
            )}

            <Button
              onClick={generatePrayers}
              disabled={isGenerating}
              className='mt-6 w-full border-0 bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600'
            >
              {isGenerating ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className='mr-2 h-4 w-4' />
                  {userData?.lastOpenaiResponseId
                    ? 'Generate Next Prayer'
                    : 'Generate First Prayer'}
                </>
              )}
            </Button>
          </div>

          {/* Prayer Timeline */}
          <div className='flex-1 overflow-x-hidden overflow-y-auto'>
            <div className='space-y-4 pr-2'>
              <p className='bg-background sticky top-0 z-20 py-2 text-sm font-medium'>
                Prayer Timeline
              </p>

              {timelineItems.length === 0 ? (
                <div className='rounded-2xl border border-dashed p-8 text-center'>
                  <p className='text-muted-foreground text-sm'>
                    Generate prayers to see them appear here
                  </p>
                </div>
              ) : (
                <div className='space-y-3'>
                  {timelineItems.map((item, index) => {
                    if (item.type === 'mood-change') {
                      return (
                        <div
                          key={item.id}
                          className='relative rounded-xl border border-purple-500/20 bg-purple-500/5 p-4 transition-all'
                        >
                          {/* Timeline connector */}
                          {index < timelineItems.length - 1 && (
                            <div className='bg-border/50 absolute top-[3.5rem] bottom-[-0.75rem] left-6 w-0.5' />
                          )}

                          <div className='flex items-start gap-3'>
                            {/* Timeline dot */}
                            <div className='ring-background relative z-10 mt-1.5 h-3 w-3 flex-shrink-0 rounded-full bg-purple-500 ring-4' />

                            <div className='min-w-0 flex-1'>
                              <div className='mb-2 flex items-center gap-2'>
                                <span className='text-xs font-medium text-purple-600 dark:text-purple-400'>
                                  Mood Change
                                </span>
                                <span className='text-muted-foreground text-xs'>
                                  {item.timestamp.toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </div>

                              <div className='flex items-center gap-2 text-sm'>
                                <span className='text-muted-foreground'>
                                  {item.previousMood}
                                </span>
                                <ChevronRight className='h-3 w-3' />
                                <span className='font-medium text-purple-600 dark:text-purple-400'>
                                  {item.newMood}
                                </span>
                              </div>

                              {item.moodContext && (
                                <p className='text-muted-foreground mt-2 text-xs italic'>
                                  "{item.moodContext}"
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    }

                    // Prayer item
                    const result = item as PrayerResult
                    const prayerNumber = timelineItems
                      .slice(0, index + 1)
                      .filter((i) => i.type === 'prayer').length

                    return (
                      <div
                        key={result.id}
                        className='group bg-card/50 hover:bg-card/80 relative rounded-xl border p-4 transition-all hover:shadow-lg'
                      >
                        {/* Timeline connector */}
                        {index < timelineItems.length - 1 && (
                          <div className='bg-border/50 absolute top-[3.5rem] bottom-[-0.75rem] left-6 w-0.5' />
                        )}

                        <div className='flex items-start gap-3'>
                          {/* Timeline dot */}
                          <div className='bg-primary ring-background relative z-10 mt-1.5 h-3 w-3 flex-shrink-0 rounded-full ring-4' />

                          <div className='min-w-0 flex-1'>
                            {/* Header */}
                            <div className='mb-2 flex items-center justify-between'>
                              <div className='flex items-center gap-2'>
                                <span className='text-xs font-medium'>
                                  {result.isFirstPrayer
                                    ? 'First Prayer'
                                    : `Prayer ${prayerNumber}`}
                                </span>
                                <span className='text-muted-foreground text-xs'>
                                  {result.timestamp.toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </div>
                              <Button
                                variant='ghost'
                                size='icon'
                                className='h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100'
                                onClick={() =>
                                  navigator.clipboard.writeText(
                                    extractPrayerText(result.prayer)
                                  )
                                }
                              >
                                <Copy className='h-3 w-3' />
                              </Button>
                            </div>

                            {/* Prayer content */}
                            <div className='overflow-hidden text-sm leading-relaxed break-words whitespace-pre-wrap'>
                              {extractPrayerText(result.prayer)}
                            </div>

                            {/* Removed mood change indicator - now shown as separate timeline items */}

                            {/* Prayer Topics/Categories */}
                            {result.intentions &&
                              result.intentions.length > 0 && (
                                <div className='mt-3 flex flex-wrap gap-1.5'>
                                  {result.intentions.map((intention, idx) => {
                                    const category = prayerCategories.find(
                                      (c) => c.id === intention.category
                                    )
                                    return (
                                      <Badge
                                        key={idx}
                                        variant='secondary'
                                        className='px-2 py-0.5 text-xs'
                                      >
                                        <span className='mr-1'>
                                          {category?.emoji || '🙏'}
                                        </span>
                                        {category?.label || intention.category}
                                        {intention.person && (
                                          <span className='ml-1 opacity-70'>
                                            • {intention.person.name}
                                          </span>
                                        )}
                                      </Badge>
                                    )
                                  })}
                                </div>
                              )}

                            {/* Metadata */}
                            {result.previousResponseId && (
                              <div className='text-muted-foreground mt-2 flex items-center gap-2 text-xs'>
                                <Badge
                                  variant='outline'
                                  className='px-1.5 py-0 text-xs'
                                >
                                  Stateful
                                </Badge>
                                <span className='font-mono text-[10px]'>
                                  {result.responseId?.slice(0, 8)}...
                                </span>
                              </div>
                            )}

                            {/* Model Knowledge Sections */}
                            <div className='mt-4 space-y-2'>
                              {/* What the model knew */}
                              {result.modelKnew && (
                                <Collapsible>
                                  <CollapsibleTrigger className='hover:text-primary flex w-full items-center gap-2 text-left text-xs font-medium transition-colors'>
                                    <ChevronDown className='h-3 w-3' />
                                    <Brain className='h-3 w-3' />
                                    What the model knew (sent to API)
                                  </CollapsibleTrigger>
                                  <CollapsibleContent className='mt-2'>
                                    <div className='bg-muted/50 space-y-2 rounded-lg p-3 text-xs'>
                                      {result.modelKnew.isFirstPrayer ? (
                                        <>
                                          <div className='font-medium text-purple-600 dark:text-purple-400'>
                                            Initial Prayer (Full Context)
                                          </div>
                                          <div className='overflow-x-auto font-mono whitespace-pre-wrap'>
                                            {result.modelKnew.prompt}
                                          </div>
                                        </>
                                      ) : (
                                        <>
                                          <div className='font-medium text-purple-600 dark:text-purple-400'>
                                            Subsequent Prayer (Natural Language
                                            Diff)
                                          </div>
                                          <div className='text-muted-foreground flex items-center gap-2'>
                                            <span>Connected to:</span>
                                            <code className='rounded bg-black/10 px-1 text-xs dark:bg-white/10'>
                                              {result.modelKnew.previousResponseId?.slice(
                                                0,
                                                8
                                              )}
                                              ...
                                            </code>
                                          </div>
                                          <div className='overflow-x-auto font-mono whitespace-pre-wrap'>
                                            {result.modelKnew.prompt}
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  </CollapsibleContent>
                                </Collapsible>
                              )}

                              {/* What the model knows */}
                              {result.modelKnows && (
                                <Collapsible>
                                  <CollapsibleTrigger className='hover:text-primary flex w-full items-center gap-2 text-left text-xs font-medium transition-colors'>
                                    <ChevronDown className='h-3 w-3' />
                                    <Zap className='h-3 w-3' />
                                    What the model knows (cumulative state)
                                  </CollapsibleTrigger>
                                  <CollapsibleContent className='mt-2'>
                                    <div className='bg-muted/50 space-y-2 rounded-lg p-3 text-xs'>
                                      <div className='grid grid-cols-2 gap-3'>
                                        <div>
                                          <span className='text-muted-foreground font-medium'>
                                            Current Mood:
                                          </span>
                                          <div className='mt-1'>
                                            <span className='font-medium'>
                                              {result.modelKnows.mood}
                                            </span>
                                            {result.modelKnows.moodContext && (
                                              <p className='text-muted-foreground mt-0.5 italic'>
                                                "{result.modelKnows.moodContext}
                                                "
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                        <div>
                                          <span className='text-muted-foreground font-medium'>
                                            Active Intentions:
                                          </span>
                                          <div className='mt-1 font-medium'>
                                            {
                                              result.modelKnows.activeIntentions
                                                .length
                                            }
                                          </div>
                                        </div>
                                      </div>

                                      {result.modelKnows.cumulativeChanges
                                        .length > 0 && (
                                        <div>
                                          <span className='text-muted-foreground font-medium'>
                                            Cumulative Changes:
                                          </span>
                                          <div className='mt-1 space-y-1'>
                                            {result.modelKnows.cumulativeChanges.map(
                                              (change, idx) => (
                                                <div
                                                  key={idx}
                                                  className='rounded bg-black/5 p-2 text-xs dark:bg-white/5'
                                                >
                                                  {change}
                                                </div>
                                              )
                                            )}
                                          </div>
                                        </div>
                                      )}

                                      <div className='text-muted-foreground italic'>
                                        The model retains full conversation
                                        history through the response ID chain.
                                      </div>
                                    </div>
                                  </CollapsibleContent>
                                </Collapsible>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className='max-w-2xl'>
          <DialogHeader>
            <DialogTitle>Edit Prayer Prompt</DialogTitle>
            <DialogDescription>
              {userData?.lastOpenaiResponseId
                ? 'Edit the prompt for your subsequent prayer. This will be sent along with the review changes.'
                : 'This full context is only sent for first prayers'}
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-4'>
            <Textarea
              value={editablePrompt}
              onChange={(e) => setEditablePrompt(e.target.value)}
              rows={12}
              className='font-mono text-sm'
            />
            <div className='flex justify-end gap-2'>
              <Button
                variant='outline'
                onClick={() => setShowEditDialog(false)}
              >
                Cancel
              </Button>
              <Button onClick={() => setShowEditDialog(false)}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
