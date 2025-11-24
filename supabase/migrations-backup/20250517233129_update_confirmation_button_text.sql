UPDATE public.onboarding_flow_steps
SET config = jsonb_set(
    config,
    '{doneButton,text}',
    '"Continue"'::jsonb
)
WHERE screen_type = 'OnboardingIntentionsSetConfirmationScreen'; 