-- Update existing steps to make room for the new screen
UPDATE onboarding_flow_steps
SET step_order = step_order + 1
WHERE flow_id = '3c39463f-2c0f-4829-977d-a98fb3e15db2'
  AND step_order >= 6;

-- Insert the 'Prayer Example' screen at step_order 6
INSERT INTO onboarding_flow_steps (
  id,
  flow_id,
  step_order,
  screen_type,
  config,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  '3c39463f-2c0f-4829-977d-a98fb3e15db2',
  6,
  'PrayerExampleScreen',
  $${
    "title": "Your Daily Prayer",
    "message": "A few minutes a day can go a long way in deepening your relationship with Him.",
    "buttonText": "I'm Ready",
    "tracking": {
      "screenViewEvent": "onboarding_prayer_example_viewed"
    }
  }$$,
  NOW(),
  NOW()
);

-- Migration to add RelationshipWithGod and PrayerFrequency steps at positions 4 and 5
-- First, shift all steps from step_order 4 and higher up by 2 positions
UPDATE onboarding_flow_steps
SET step_order = step_order + 2
WHERE step_order >= 4
  AND flow_id = (SELECT id FROM onboarding_flows WHERE status = 'ACTIVE' LIMIT 1);

-- Insert RelationshipWithGod step at position 4
INSERT INTO onboarding_flow_steps (
  flow_id,
  step_order,
  screen_type,
  config,
  tracking_event_name,
  created_at,
  updated_at
) VALUES (
  (SELECT id FROM onboarding_flows WHERE status = 'ACTIVE' LIMIT 1),
  4,
  'GeneralQuestionScreen',
  '{
    "question": "How would you describe your relationship with God right now?",
    "options": [
      {
        "id": "very_close",
        "text": "I feel deeply connected to God every day",
        "emoji": "🥰",
        "action": "SAVE_RESPONSE_AND_NAVIGATE_NEXT",
        "responseValue": "very_close"
      },
      {
        "id": "close",
        "text": "Good, but I''d like to be closer",
        "emoji": "😌",
        "action": "SAVE_RESPONSE_AND_NAVIGATE_NEXT",
        "responseValue": "close"
      },
      {
        "id": "its_complicated",
        "text": "It varies from day to day",
        "emoji": "🤔",
        "action": "SAVE_RESPONSE_AND_NAVIGATE_NEXT",
        "responseValue": "complicated"
      },
      {
        "id": "distant",
        "text": "We''ve grown apart, but I want to reconnect",
        "emoji": "😔",
        "action": "SAVE_RESPONSE_AND_NAVIGATE_NEXT",
        "responseValue": "distant"
      },
      {
        "id": "rebuilding",
        "text": "Working on rebuilding our connection",
        "emoji": "🌱",
        "action": "SAVE_RESPONSE_AND_NAVIGATE_NEXT",
        "responseValue": "rebuilding"
      }
    ],
    "tracking": {
      "screenViewEvent": "onboarding_relationship_with_god_screen_viewed",
      "optionSelectedEventPrefix": "onboarding_relationship_with_god_option_"
    },
    "questionType": "relationshipWithGod"
  }'::jsonb,
  'onboarding_relationship_with_god_screen_viewed',
  NOW(),
  NOW()
);

-- Insert PrayerFrequency step at position 5
INSERT INTO onboarding_flow_steps (
  flow_id,
  step_order,
  screen_type,
  config,
  tracking_event_name,
  created_at,
  updated_at
) VALUES (
  (SELECT id FROM onboarding_flows WHERE status = 'ACTIVE' LIMIT 1),
  5,
  'GeneralQuestionScreen',
  '{
    "question": "How often do you find yourself in prayer these days?",
    "options": [
      {
        "id": "multiple_daily",
        "text": "Multiple times a day",
        "emoji": "⭐",
        "action": "SAVE_RESPONSE_AND_NAVIGATE_NEXT",
        "responseValue": "multiple_daily"
      },
      {
        "id": "daily",
        "text": "About once a day",
        "emoji": "🌅",
        "action": "SAVE_RESPONSE_AND_NAVIGATE_NEXT",
        "responseValue": "daily"
      },
      {
        "id": "few_times_week",
        "text": "A few times a week",
        "emoji": "📅",
        "action": "SAVE_RESPONSE_AND_NAVIGATE_NEXT",
        "responseValue": "few_times_week"
      },
      {
        "id": "occasionally",
        "text": "Only during important moments",
        "emoji": "🙏",
        "action": "SAVE_RESPONSE_AND_NAVIGATE_NEXT",
        "responseValue": "occasionally"
      },
      {
        "id": "rarely",
        "text": "Rarely, but wanting to start",
        "emoji": "✨",
        "action": "SAVE_RESPONSE_AND_NAVIGATE_NEXT",
        "responseValue": "rarely"
      }
    ],
    "tracking": {
      "screenViewEvent": "onboarding_prayer_frequency_screen_viewed",
      "optionSelectedEventPrefix": "onboarding_prayer_frequency_option_"
    },
    "questionType": "prayerFrequency"
  }'::jsonb,
  'onboarding_prayer_frequency_screen_viewed',
  NOW(),
  NOW()
);

-- Insert new InterstitialScreen at position 6 (after prayer frequency questions)
-- First, shift all steps from step_order 6 and higher up by 1 position
UPDATE onboarding_flow_steps
SET step_order = step_order + 1
WHERE step_order >= 6
  AND flow_id = (SELECT id FROM onboarding_flows WHERE status = 'ACTIVE' LIMIT 1);

-- Insert the new interstitial screen
INSERT INTO onboarding_flow_steps (
  flow_id,
  step_order,
  screen_type,
  config,
  tracking_event_name,
  created_at,
  updated_at
) VALUES (
  (SELECT id FROM onboarding_flows WHERE status = 'ACTIVE' LIMIT 1),
  6,
  'InterstitialScreen',
  '{
    "image": "https://kfrvxoxdehduqrpcbibl.supabase.co/storage/v1/object/public/assets/onboarding/interstitials/prayerbeforebed.png",
    "titleTemplate": "{APP_LOGO} helps you build a positive prayer habit that brings you closer to God in just 3-minutes a day",
    "subtitle": "Let''s personalize your prayer experience",
    "button": {
      "text": "I''m ready",
      "action": "NAVIGATE_NEXT"
    },
    "tracking": {
      "screenViewEvent": "onboarding_prayer_habit_interstitial_viewed"
    }
  }'::jsonb,
  'onboarding_prayer_habit_interstitial_viewed',
  NOW(),
  NOW()
);

-- Migration to move steps 13 and 14 to positions 7 and 8, and shift steps 7-12 up to 9-14
-- First, temporarily move steps 13 and 14 to high numbers to avoid conflicts
UPDATE onboarding_flow_steps
SET step_order = step_order + 100
WHERE step_order IN (13, 14)
  AND flow_id = (SELECT id FROM onboarding_flows WHERE status = 'ACTIVE' LIMIT 1);

-- Shift steps 7-12 up by 2 positions (to 9-14)
UPDATE onboarding_flow_steps
SET step_order = step_order + 2
WHERE step_order >= 7 AND step_order <= 12
  AND flow_id = (SELECT id FROM onboarding_flows WHERE status = 'ACTIVE' LIMIT 1);

-- Move the temporarily moved steps (113, 114) to positions 7 and 8
UPDATE onboarding_flow_steps
SET step_order = step_order - 106
WHERE step_order IN (113, 114)
  AND flow_id = (SELECT id FROM onboarding_flows WHERE status = 'ACTIVE' LIMIT 1);

 