UPDATE public.onboarding_flow_steps
SET config = '{ 
  "title": "intentions set! ✨",
  "infoText": "These prayer intentions are now set for your upcoming prayers.",
  "doneButton": {
    "text": "Continue",
    "action": "NAVIGATE_NEXT_ONBOARDING_STEP"
  },
  "tracking": {
    "screenViewEvent": "onboarding_intentions_set_confirmation_viewed"
  }
}'::jsonb
WHERE screen_type = 'OnboardingIntentionsSetConfirmationScreen'; 