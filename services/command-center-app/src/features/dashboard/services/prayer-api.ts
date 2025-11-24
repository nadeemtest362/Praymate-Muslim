import axios from 'axios'
import { supabase } from '@/lib/supabaseClient'

// Import our Supabase client

// Types for the API (ensure these match what your Edge Functions will return)
export interface PrayerGenerationRequest {
  userId: string
  slot: string
  changes_from_review_screen?: {
    mood?: {
      from: string | null
      to: string
    }
    toggledIntentions?: {
      id: string
      toState: boolean
    }[]
  }
}

export interface PrayerGenerationResponse {
  prayer: string
  responseId?: string
}

// Interface now matches the comprehensive data from get-prayer-history Edge Function
export interface PrayerHistoryEntry {
  id: string
  userId: string
  userName: string
  slot: string
  generatedAt: string
  status: 'success' | 'error' | 'pending'
  liked: boolean | null
  categories: string[]
  openaiResponseId: string | null
  openaiModelUsed: string | null
  errorMessage: string | null
  durationMs: number | null
  inputTokens: number | null
  outputTokens: number | null
  totalTokens: number | null
  cachedTokens: number | null
  estimatedCost?: number | null
  rawPrayerOutput: string | null
  inputPrompt: string | null
  sessionChangesPayload: Record<string, any> | null
  openaiInstructions: string | null
  openaiPreviousResponseId: string | null
}

// Base API URL - VITE_SUPABASE_FUNCTIONS_URL should point to your Supabase functions endpoint
const API_BASE_URL =
  import.meta.env.VITE_SUPABASE_FUNCTIONS_URL ||
  'http://localhost:54321/functions/v1' // Default to local Supabase studio URL if not set
// For direct table access, you'd use VITE_SUPABASE_URL and the anon key, but Edge Functions are preferred for app logic.

class PrayerApiService {
  private axiosInstance = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
    },
  })

  constructor() {
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession()
        if (error) {
          console.error(
            '[API Service Interceptor] Error getting session:',
            error
          )
          return config // Proceed without token if session fetch fails
        }
        if (session?.access_token) {
          config.headers.Authorization = `Bearer ${session.access_token}`
        }
        return config
      },
      (error) => {
        return Promise.reject(error)
      }
    )
  }

  // Generate a prayer using the Edge Function
  async generatePrayer(
    request: PrayerGenerationRequest
  ): Promise<PrayerGenerationResponse> {
    console.log('[API Service] Generating prayer with request:', request)
    try {
      const response = await this.axiosInstance.post(
        '/generate-prayer',
        request
      )
      console.log('[API Service] Prayer generation response:', response.data)
      return response.data
    } catch (error) {
      console.error('[API Service] Error generating prayer:', error)
      throw error
    }
  }

  // Fetch prayer history
  // This would typically hit a dedicated Edge Function or a Supabase view/query
  async getPrayerHistory(): Promise<PrayerHistoryEntry[]> {
    console.log(
      '[API Service] Fetching prayer history (now with full details)...'
    )
    try {
      // Ensure you have an Edge Function named 'get-prayer-history' in Supabase
      const response = await this.axiosInstance.get('/get-prayer-history')
      console.log(
        '[API Service] Prayer history fetched successfully:',
        response.data
      )
      return response.data as PrayerHistoryEntry[]
    } catch (error) {
      console.error('[API Service] Error fetching prayer history:', error)
      // Return empty array on error to prevent UI crash, error is handled in usePrayerAPI hook
      return []
    }
  }

  // Get prayer details, including content
  // This might hit an Edge Function that fetches a specific prayer by ID
  async getPrayerDetails(logId: string): Promise<PrayerHistoryEntry> {
    console.log(`[API Service] Fetching details for log ID: ${logId}`)
    try {
      // Ensure you have an Edge Function like 'get-prayer-details/:id' or a way to pass ID
      // For example, if using a single function: /get-prayer-details?id=${prayerId}
      const response = await this.axiosInstance.get(
        `/get-prayer-details/${logId}`
      ) // Adjust endpoint as needed
      console.log(
        `[API Service] Prayer log details for ${logId} fetched successfully:`,
        response.data
      )
      return response.data as PrayerHistoryEntry
    } catch (error) {
      console.error(
        `[API Service] Error fetching prayer log details for ${logId}:`,
        error
      )
      throw error
    }
  }

  // Update prayer template (example, adapt as needed)
  async updatePrayerTemplate(
    templateId: string,
    content: string
  ): Promise<void> {
    console.log(
      `[API Service] Updating template ${templateId} with content:`,
      content
    )
    try {
      // Example: await this.axiosInstance.post(`/templates/${templateId}`, { content });
      console.log(
        '[API Service] Prayer template update call made (no actual update).'
      )
      return Promise.resolve()
    } catch (error) {
      console.error('[API Service] Error updating prayer template:', error)
      throw error
    }
  }
}

export const prayerApiService = new PrayerApiService()
