export interface Prayer {
  id: string;
  user_id: string;
  content: string | null;
  generated_at: string | null;
  slot: string | null;
  verse_ref: string | null;
  liked: boolean | null;
  completed_at: string | null;
  input_snapshot: any | null;
  engaged: boolean;
  engaged_at: string | null;
}

export interface EnhancedPrayer extends Prayer {
  enhancedPeople: any[];
}
