/**
 * React Query keys for Command Center app
 * Centralized query key management
 */

export const queryKeys = {
  // Auth queries
  session: () => ['session'] as const,
  profile: (userId: string) => ['profile', userId] as const,
  
  // Additional query keys can be added here as needed
  users: () => ['users'] as const,
  analytics: () => ['analytics'] as const,
} as const

export type QueryKeys = typeof queryKeys
