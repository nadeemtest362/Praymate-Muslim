// Define type for prayer person data from Supabase - Keep interface here or move to types?
// Let's keep it in home.tsx for now as it's closely tied to the data fetching there.

// Prayer Data (Remove MOCK_PRAYERS when fetching real data)
export interface Prayer {
  id: string; // Need ID for completion tracking
  content: string;
  verse: string | null;
  timestamp: Date | string | null; // Or string if fetched as ISO
  liked: boolean | null;
  completed_at: Date | string | null; // Added for completion tracking
}

// MOCK_PRAYERS removed - using real prayer fetching with React Query

// Avatars (Consider moving image requires to assets management if complex)
export const AVATARS: {[key: string]: any} = {
  'Jesus': require('../../assets/images/avatar-placeholder-1.png'),
  'Mom': require('../../assets/images/avatar-placeholder-2.png'),
  // Add other avatars as needed
}

export const DEFAULT_AVATAR = require('../../assets/images/avatar-placeholder-1.png');

// Static Helpers (Could also go in a utils file)
export const extractNames = (text: string): string[] => {
  const names: string[] = [];
  // Basic example, could be made more robust
  if (text.includes('Sarah')) names.push('Sarah');
  if (text.includes('mom') || text.includes('Mom')) names.push('Mom');
  if (text.includes('Jesus')) names.push('Jesus');
  return names;
};

export const getTimeBasedGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'good morning';
  if (hour < 18) return 'good afternoon';
  return 'good evening';
}; 