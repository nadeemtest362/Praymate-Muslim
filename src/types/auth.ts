// Auth-related types
export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  has_completed_onboarding?: boolean | null;
  onboarding_completed_at?: string | null;
  timezone?: string | null;
  has_seen_streak_start_popup?: boolean | null;
  has_seen_praylock_intro?: boolean | null;
  streak_goal_days?: number | null;
  prayer_needs?: string[] | null;
  custom_prayer_need?: string | null;
  initial_motivation?: string | null;
  updated_at?: string | null;
  // Set by migrate-anonymous-data edge function when upgrading from anon → full
  migrated_from_user_id?: string | null;
}

export interface AuthResponse {
  data: any;
  error: { message: string; status?: number } | null;
}
