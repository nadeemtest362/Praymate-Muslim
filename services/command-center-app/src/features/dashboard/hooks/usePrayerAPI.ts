import { useState, useCallback } from 'react'
import {
  prayerApiService,
  PrayerGenerationRequest,
  PrayerHistoryEntry,
} from '../services/prayer-api'

export function usePrayerAPI() {
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<Error | null>(null)

  // Function to generate a new prayer
  const generatePrayer = useCallback(
    async (request: PrayerGenerationRequest) => {
      setLoading(true)
      setError(null)
      try {
        const response = await prayerApiService.generatePrayer(request)
        setLoading(false)
        return response
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error('Unknown error occurred')
        )
        setLoading(false)
        throw err
      }
    },
    []
  )

  // Function to fetch prayer history
  const getPrayerHistory = useCallback(async (): Promise<
    PrayerHistoryEntry[]
  > => {
    setLoading(true)
    setError(null)
    try {
      const history = await prayerApiService.getPrayerHistory()
      setLoading(false)
      return history
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error occurred'))
      setLoading(false)
      return []
    }
  }, [])

  // Function to get prayer details
  const getPrayerDetails = useCallback(async (prayerId: string) => {
    setLoading(true)
    setError(null)
    try {
      const details = await prayerApiService.getPrayerDetails(prayerId)
      setLoading(false)
      return details
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error occurred'))
      setLoading(false)
      throw err
    }
  }, [])

  // Function to update a prayer template
  const updatePrayerTemplate = useCallback(
    async (templateId: string, content: string) => {
      setLoading(true)
      setError(null)
      try {
        await prayerApiService.updatePrayerTemplate(templateId, content)
        setLoading(false)
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error('Unknown error occurred')
        )
        setLoading(false)
        throw err
      }
    },
    []
  )

  return {
    loading,
    error,
    generatePrayer,
    getPrayerHistory,
    getPrayerDetails,
    updatePrayerTemplate,
  }
}
