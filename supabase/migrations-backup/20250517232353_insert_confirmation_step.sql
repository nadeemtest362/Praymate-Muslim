INSERT INTO public.onboarding_flow_steps (
  flow_id, 
  screen_type, 
  step_order, 
  config, 
  tracking_event_name,
  created_at,
  updated_at
) VALUES (
  '3c39463f-2c0f-4829-977d-a98fb3e15db2', -- CORRECTED flow_id for "Default Onboarding V1"
  'OnboardingIntentionsSetConfirmationScreen',
  6, -- Ensure this step_order is unique and correct for its position in the flow
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
  'onboarding_intentions_set_confirmation_viewed',
  NOW(),
  NOW()
); 