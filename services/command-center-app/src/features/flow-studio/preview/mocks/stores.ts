// Mock store implementations for preview environment

export const useOnboardingStore = () => ({
  firstName: '',
  setFirstName: () => {},
  mood: null,
  setMood: () => {},
  faithTradition: null,
  setFaithTradition: () => {},
  prayerPeople: [],
  setPrayerPeople: () => {},
  commitmentLevel: null,
  setCommitmentLevel: () => {},
  prayerFrequency: null,
  setPrayerFrequency: () => {},
  relationshipWithGod: null,
  setRelationshipWithGod: () => {},
  prayerNeeds: [],
  setPrayerNeeds: () => {},
  reset: () => {},
})

// Mock for new useAuth hook (React Query based)
export const useAuth = () => ({
  user: null,
  session: null,
  profile: null,
  isLoading: false,
  isAuthenticated: false,
  isAdmin: false,
  initialize: async () => {},
  signIn: async () => ({ error: null }),
  signOut: async () => {},
  checkAdminStatus: async () => false,
  isSigningIn: false,
  isSigningOut: false,
  setLoading: () => {},
})

// Legacy mock for compatibility (deprecated)
export const useAuthStore = () => ({
  user: null,
  session: null,
  signIn: async () => {},
  signOut: async () => {},
  isAuthenticated: false,
})

export const usePrayerStore = () => ({
  prayers: [],
  addPrayer: () => {},
  removePrayer: () => {},
  updatePrayer: () => {},
  getPrayerById: () => null,
})
