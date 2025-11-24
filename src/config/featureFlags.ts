/**
 * Feature flags for architectural migration
 * 
 * ✅ COMPLETED MIGRATIONS:
 * - UUID_PRIMARY_KEYS: Dual-ID system elimination
 * - REACT_QUERY_MIGRATION: Server state migration to React Query (COMPLETE)
 */

export const FEATURE_FLAGS = {
  // Completed migrations
  UUID_PRIMARY_KEYS: true,
  
  // Active infrastructure flags
  EVENT_BUS_ENABLED: true,     // Event-driven updates
  REPOSITORY_PATTERN: true,    // Data access layer
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

/**
 * Helper function to check if a feature flag is enabled
 */
export const isFeatureEnabled = (flag: FeatureFlag): boolean => {
  return FEATURE_FLAGS[flag];
};
