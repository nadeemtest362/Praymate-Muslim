UPDATE public.onboarding_flow_steps
SET config = '{
  "intentionCollectionPhase": {
    "introTitle": "what''s on your ❤️ for {personName}?",
    "introSubtitle": "Let''s add a starting prayer focus for each person you''ve added.",
    "intentionPrompt": {
      "titleTemplate": "What is your prayer for {personName}?",
      "categorySelectorLabel": "Select a starting category:",
      "detailsInputPlaceholder": "Add a few words about this prayer focus...",
      "madlibConnectorNeeds": "needs",
      "madlibConnectorFor": "for",
      "madlibPlaceholderWhat": "what...",
      "madlibPlaceholderDetails": "details..."
    },
    "nextButtonText": "Next Person",
    "finishButtonText": "Finish & Continue",
    "displayedCategoryIds": [
      "healing", "peace", "protection", "guidance", "wisdom",
      "strength", "faith", "love", "forgiveness", "joy",
      "comfort", "gratitude"
    ]
  },
  "alerts": {
    "missingNeedError": "Please select a prayer category first.",
    "missingDetailsError": "Please add a few details for this prayer.",
    "genericSaveError": "Oops! Could not save this intention. Please try again."
  },
  "tracking": {
    "screenViewEvent": "onboarding_add_intention_viewed"
  }
}'::jsonb
WHERE screen_type = 'AddIntentionScreen'; 