-- Generate a new UUID for 'NEW_CONFIRMATION_SCREEN_ID_PLACEHOLDER' (e.g., using an online generator or psql `SELECT uuid_generate_v4();`)
-- and replace it in BOTH statements below.

-- Statement 1: Insert the new OnboardingIntentionsSetConfirmationScreen step
INSERT INTO public.onboarding_flow_steps (
  id, 
  flow_id, 
  screen_type, 
  step_order, 
  config, 
  next_step_id, 
  skippable, 
  tracking_event_name,
  created_at,
  updated_at
) VALUES (
  'NEW_CONFIRMATION_SCREEN_ID_PLACEHOLDER', -- <<< REPLACE THIS WITH A NEW UUID
  'd2a9d8f7-224a-4f6c-8586-0f10f8a8c2cc', -- Verify this flow_id from your onboarding_flows table
  'OnboardingIntentionsSetConfirmationScreen',
  6, -- Step order after AddIntentionScreen (order 5)
  '{
    "title": "intentions set! ✨",
    "infoText": "These prayer intentions are now set for your upcoming prayers.",
    "doneButton": {
      "text": "Continue",
      "action": "NAVIGATE_NEXT_ONBOARDING_STEP"
    },
    "tracking": {
      "screenViewEvent": "onboarding_intentions_set_confirmation_viewed"
    }
  }'::jsonb,
  'b054068e-f3bf-4883-8fd5-2ed78fafc3ee', -- ID of OnboardingSummaryScreen (next step)
  false,
  'onboarding_intentions_set_confirmation_viewed',
  NOW(),
  NOW()
);

-- Statement 2: Update AddIntentionScreen to point to the new confirmation screen
UPDATE public.onboarding_flow_steps
SET next_step_id = 'NEW_CONFIRMATION_SCREEN_ID_PLACEHOLDER' -- <<< REPLACE THIS WITH THE SAME NEW UUID USED ABOVE
WHERE id = '466866a9-5863-44bf-a95a-fbfa24fdb012'; -- This is the ID of AddIntentionScreen 