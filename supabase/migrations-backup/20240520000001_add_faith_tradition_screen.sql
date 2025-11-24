-- First, shift all steps from step_order 20 and higher up by 1
UPDATE onboarding_flow_steps 
SET step_order = step_order + 1
WHERE step_order >= 20;

-- Now insert the new step at step_order 20
INSERT INTO onboarding_flow_steps (
  flow_id, 
  step_order, 
  screen_type, 
  config, 
  created_at, 
  updated_at
)
VALUES (
  '3c39463f-2c0f-4829-977d-a98fb3e15db2', -- Actual UUID of the Default Onboarding V1 flow
  20,
  'FaithTraditionScreen',
  '{
    "title": "Faith Tradition",
    "question": "How would you describe your family''s faith tradition?",
    "subtitle": "This allows us to customize prayers and stories to align with your family''s faith tradition.",
    "options": [
      {
        "id": "catholic",
        "text": "Catholic",
        "action": "SAVE_RESPONSE_AND_NAVIGATE_NEXT",
        "responseValue": "catholic"
      },
      {
        "id": "christian_non_catholic",
        "text": "Christian (Non-Catholic)",
        "action": "SAVE_RESPONSE_AND_NAVIGATE_NEXT",
        "responseValue": "christian_non_catholic"
      },
      {
        "id": "other",
        "text": "Other",
        "action": "SAVE_RESPONSE_AND_NAVIGATE_NEXT",
        "responseValue": "other"
      }
    ],
    "tracking": {
      "screenViewEvent": "view_faith_tradition_screen",
      "optionSelectedEventPrefix": "select_faith_tradition"
    }
  }',
  NOW(),
  NOW()
); 