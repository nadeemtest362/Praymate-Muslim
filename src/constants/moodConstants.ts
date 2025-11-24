export interface MoodOption {
  id: string;
  label: string;
  emoji: string;
}

// Consolidated Mood options for use across the app
// Arranged from positive/light to negative/darker moods
export const APP_MOOD_OPTIONS: MoodOption[] = [
  // Positive/Light moods (Row 1-3)
  { id: 'joyful', label: 'Joyful', emoji: '😊' },
  { id: 'grateful', label: 'Grateful', emoji: '🙌' },
  { id: 'blessed', label: 'Blessed', emoji: '🌟' },
  { id: 'peaceful', label: 'Peaceful', emoji: '😌' },
  { id: 'loved', label: 'Loved', emoji: '❤️' },
  { id: 'hopeful', label: 'Hopeful', emoji: '✨' },
  { id: 'excited', label: 'Excited', emoji: '🥳' },
  { id: 'confident', label: 'Confident', emoji: '💪' },
  { id: 'content', label: 'Content', emoji: '😇' },
  // Neutral/Reflective moods (Row 4)
  { id: 'reflective', label: 'Reflective', emoji: '🧘' },
  { id: 'seeking', label: 'Seeking', emoji: '🔍' },
  { id: 'confused', label: 'Confused', emoji: '🤔' },
  // Negative/Darker moods (Row 5-7)
  { id: 'anxious', label: 'Anxious', emoji: '😟' },
  { id: 'weary', label: 'Weary', emoji: '😔' },
  { id: 'lonely', label: 'Lonely', emoji: '🥀' },
  { id: 'sad', label: 'Sad', emoji: '😢' },
  { id: 'overwhelmed', label: 'Overwhelmed', emoji: '😩' },
  { id: 'frustrated', label: 'Frustrated', emoji: '😤' },
  { id: 'angry', label: 'Angry', emoji: '😠' },
  { id: 'hurt', label: 'Hurt', emoji: '💔' },
  // Other (final)
  { id: 'other', label: 'Other', emoji: '💬' },
]; 