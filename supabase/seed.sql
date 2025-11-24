DELETE FROM public.onboarding_flow_steps;
DELETE FROM public.onboarding_flows;

WITH default_flow AS (
  INSERT INTO public.onboarding_flows (name, version, status, description)
  VALUES ('Default Onboarding V1', '1.0.0', 'ACTIVE', 'The initial default V1 onboarding flow for new users, including pre-paywall commitment steps.')
  RETURNING id
)
INSERT INTO public.onboarding_flow_steps (flow_id, step_order, screen_type, config, tracking_event_name)
VALUES
  ((SELECT id FROM default_flow), 1, 'WelcomeScreen', '{
    "logoScreen": {
        "logoText": "personal",
        "logoAccent": "prayers",
        "logoEmoji": "🙏"
    },
    "verseScreen": {
        "verses": [
            {
                "text": "But when you pray, go into your room, close the door and pray to your Father, who is unseen. Then your Father, who sees what is done in secret, will reward you.",
                "reference": "Matthew 6:6",
                "theme": "intimate prayer"
            },
            {
                "text": "Rejoice always, pray without ceasing, give thanks in all circumstances; for this is the will of God in Christ Jesus for you.",
                "reference": "1 Thessalonians 5:16-18",
                "theme": "constant prayer"
            }
        ],
        "themePrefix": "on "
    },
    "questionScreen": {
        "greeting": "Hey there.",
        "question": "What brings you here today?",
        "options": [
            {
                "id": "consistency",
                "text": "I struggle with prayer consistency",
                "action": "set_initial_motivation_and_navigate",
                "navigateTo": "/onboarding/understanding-validation"
            },
            {
                "id": "personal",
                "text": "I want prayers that feel personal to me",
                "action": "set_initial_motivation_and_navigate",
                "navigateTo": "/onboarding/understanding-validation"
            }
        ]
    },
    "timers": {
        "logoToVerseDelay": 2500,
        "verseDisplayDuration": 5000
    }
}'::jsonb, 'onboarding_welcome_viewed'),
  ((SELECT id FROM default_flow), 2, 'ValidationMessageScreen', '{
    "logo": {
        "text": "personal",
        "logoAccent": "prayers",
        "logoEmoji": "🙏"
    },
    "title": "you''''re not alone",
    "validationBox": {
        "icon": {
            "type": "MaterialCommunityIcons",
            "name": "human-greeting-variant",
            "size": 50,
            "color": "#FFFFFF"
        },
        "message": {
            "mainText": "it''''s totally normal to struggle with consistency. life gets busy! we''''ll help you build a rhythm that works for you. acknowledging the challenge is the first step.",
            "closingText": "we''''ll keep this in mind as we help you craft your prayers."
        }
    },
    "actionButton": {
        "text": "got it, let''''s continue",
        "action": "NAVIGATE_NEXT",
        "navigateTo": "/onboarding/first-name"
    },
    "tracking": {
        "screenViewEvent": "onboarding_validation_consistency_viewed"
    }
}'::jsonb, 'onboarding_validation_consistency_viewed'),
  ((SELECT id FROM default_flow), 3, 'FirstNameScreen', '{
    "logo": {
        "text": "personal",
        "logoAccent": "prayers",
        "logoEmoji": "🙏"
    },
    "title": "what should we call you?",
    "inputField": {
        "placeholder": "first name",
        "maxLength": 50,
        "autoCapitalize": "words",
        "autoCorrect": false,
        "returnKeyType": "done",
        "validation": {
            "requiredMessage": "Please enter your first name."
        }
    },
    "actionButton": {
        "text": "continue",
        "action": "SAVE_FIRST_NAME_AND_NAVIGATE",
        "successMessage": "Name saved!",
        "errorMessage": "Could not save your name. Please try again.",
        "navigateToOnSuccess": "/onboarding/prayer-people"
    },
    "tracking": {
        "screenViewEvent": "onboarding_firstname_viewed",
        "saveSuccessEvent": "onboarding_firstname_saved",
        "saveFailureEvent": "onboarding_firstname_save_failed"
    }
}'::jsonb, 'onboarding_firstname_viewed'),
  ((SELECT id FROM default_flow), 4, 'PrayerPeopleCollectionScreen', '{
    "title": "who''''s on your ❤️ right now?",
    "subtitleTemplate": "add up to {maxPeople} people to your upcoming personal prayers 👇",
    "maxPeople": 3,
    "emptyState": {
        "icon": {
            "type": "MaterialCommunityIcons",
            "name": "account-plus"
        },
        "text": "tap to add your first person"
    },
    "contactsAccessPrompt": {
        "imageName": "community",
        "title": "Access your contacts",
        "bodyText": "Find people you care about from your address book to add to your prayers",
        "manualAddButtonText": "Add Manually",
        "allowButtonText": "Allow"
    },
    "contactPicker": {
        "title": "Select People",
        "searchInputPlaceholder": "Search contacts...",
        "doneButtonText": "Done",
        "emptySearchText": "No matching contacts found",
        "emptyListText": "No contacts to show"
    },
    "manualAdd": {
        "quickAddTitle": "who would you like to add? 🙌",
        "relationshipChipsTitle": "Quick Add:",
        "relationshipOptions": [
            {
                "id": "mom",
                "label": "Mom",
                "needsCustomName": false
            },
            {
                "id": "dad",
                "label": "Dad",
                "needsCustomName": false
            },
            {
                "id": "custom",
                "label": "Someone Else",
                "needsCustomName": true
            }
        ],
        "customNamePromptTemplate": "What''''s your {relationshipLabel}''''s name?",
        "customNameInputPlaceholder": "Enter their name...",
        "customNameAddButtonText": "add",
        "customNameCancelButtonText": "back",
        "generalCancelButtonText": "cancel"
    },
    "miniProfile": {
        "titleTemplate": "Who is {personName} to you?",
        "relationshipSectionTitle": "Relationship",
        "pronounSectionTitleTemplate": "How should we refer to {personName}?",
        "pronounOptions": [
            {
                "id": "he",
                "label": "He/Him"
            },
            {
                "id": "she",
                "label": "She/Her"
            },
            {
                "id": "they",
                "label": "They/Them"
            },
            {
                "id": "name",
                "label": "Just use name"
            }
        ],
        "cancelButtonText": "Cancel",
        "addButtonText": "Add Person"
    },
    "peopleCollectionPhase": {
        "encouragementMessageWhenMaxReached": {
            "textTemplate": "Perfect! You''''ve selected {count} people. ❤️ (You can always add more later)"
        },
        "mainActionButtonsWhenNotMax": {
            "addFromContactsText": "add from contacts",
            "addFromContactsIcon": {
                "type": "MaterialCommunityIcons",
                "name": "account-group"
            },
            "quickAddText": "quick add",
            "quickAddIcon": {
                "type": "MaterialCommunityIcons",
                "name": "account-plus"
            }
        }
    },
    "intentionCollectionPhase": {
        "introTitle": "Great! Now for their first prayer focus.",
        "introSubtitle": "Let''''s add a starting point for each person.",
        "intentionPrompt": {
            "titleTemplate": "What''''s your prayer for {personName}?",
            "categorySelectorLabel": "Prayer Category:",
            "detailsInputPlaceholder": "A few words about your intention...",
            "saveButtonText": "Save Intention"
        },
        "intentionCategories": [
            {
                "id": "healing",
                "label": "Healing",
                "icon": {
                    "type": "MaterialCommunityIcons",
                    "name": "heart-plus"
                }
            },
            {
                "id": "guidance",
                "label": "Guidance",
                "icon": {
                    "type": "MaterialCommunityIcons",
                    "name": "compass-outline"
                }
            },
            {
                "id": "strength",
                "label": "Strength",
                "icon": {
                    "type": "MaterialCommunityIcons",
                    "name": "arm-flex"
                }
            },
            {
                "id": "gratitude",
                "label": "Gratitude",
                "icon": {
                    "type": "MaterialCommunityIcons",
                    "name": "human-handsup"
                }
            },
            {
                "id": "protection",
                "label": "Protection",
                "icon": {
                    "type": "MaterialCommunityIcons",
                    "name": "shield-check"
                }
            },
            {
                "id": "peace",
                "label": "Peace",
                "icon": {
                    "type": "MaterialCommunityIcons",
                    "name": "peace"
                }
            },
            {
                "id": "other",
                "label": "Other",
                "icon": {
                    "type": "MaterialCommunityIcons",
                    "name": "dots-horizontal"
                }
            }
        ]
    },
    "finalContinueButton": {
        "text": "All Set with People & Intentions",
        "icon": {
            "type": "MaterialCommunityIcons",
            "name": "arrow-right-bold-circle"
        },
        "action": "NAVIGATE_NEXT",
        "navigateTo": "/onboarding/transition-to-mood"
    },
    "alerts": {
        "limitReachedTitle": "Limit Reached",
        "limitReachedMessageTemplate": "You can add up to {maxPeople} people.",
        "addSomeoneFirstTitle": "Add someone first",
        "addSomeoneFirstMessage": "Add at least one person to continue.",
        "contactsAccessDeniedTitle": "Contacts Access Denied",
        "contactsAccessDeniedMessage": "To add from contacts, please enable access in your device settings.",
        "noContactsFoundTitle": "No Contacts Found",
        "noContactsFoundMessage": "We couldn''''t find any contacts. You can add people manually instead.",
        "genericErrorTitle": "Error",
        "genericErrorMessage": "Could not perform action. Please try again."
    },
    "tracking": {
        "screenViewEvent": "onboarding_prayerpeople_viewed"
    }
}'::jsonb, 'onboarding_prayerpeople_viewed'),
  ((SELECT id FROM default_flow), 5, 'InterstitialScreen', '{
    "emoji": "✨",
    "titleTemplate": "Great! Your upcoming prayers will include your {count, select, 1{person} other{people}}.",
    "subtitle": "Now, let''''s talk about YOU...",
    "button": {
        "text": "Ok, I''''m ready",
        "action": "NAVIGATE_NEXT",
        "navigateTo": "/onboarding/mood"
    },
    "tracking": {
        "screenViewEvent": "onboarding_transition_to_mood_viewed"
    }
}'::jsonb, 'onboarding_transition_to_mood_viewed'),
  ((SELECT id FROM default_flow), 6, 'MoodSelectionScreen', '{
    "logo": {
        "text": "personal",
        "logoAccent": "prayers",
        "logoEmoji": "🙏"
    },
    "title": "How are you feeling right now?",
    "subtitle": "Your current mood helps us craft a prayer that resonates with you",
    "moodOptions": [
        {
            "id": "grateful",
            "emoji": "😊",
            "label": "Grateful"
        },
        {
            "id": "peaceful",
            "emoji": "😌",
            "label": "Peaceful"
        },
        {
            "id": "hopeful",
            "emoji": "🙏",
            "label": "Hopeful"
        },
        {
            "id": "weary",
            "emoji": "😔",
            "label": "Weary"
        },
        {
            "id": "anxious",
            "emoji": "😟",
            "label": "Anxious"
        },
        {
            "id": "loved",
            "emoji": "❤️",
            "label": "Loved"
        }
    ],
    "navigation": {
        "action": "NAVIGATE_WITH_PARAMS",
        "navigateTo": "/onboarding/mood-context",
        "params": {
            "moodId": "id",
            "moodEmoji": "emoji",
            "moodLabel": "label"
        }
    },
    "tracking": {
        "screenViewEvent": "onboarding_mood_viewed",
        "moodSelectedEventPrefix": "onboarding_mood_selected_"
    }
}'::jsonb, 'onboarding_mood_viewed'),
  ((SELECT id FROM default_flow), 7, 'MoodContextScreen', '{
    "titleTemplate": {
        "part1": "What''''s got you feeling ",
        "part2": " right now?",
        "moodLabelPlaceholder": "this way"
    },
    "inputField": {
        "placeholder": "A brief thought is perfect...",
        "maxLength": 180,
        "charCountFormat": "{remaining}"
    },
    "continueButton": {
        "text": "Continue",
        "action": "SAVE_MOOD_CONTEXT_AND_NAVIGATE",
        "navigateTo": "/onboarding/prayer-needs"
    },
    "skipButton": {
        "text": "Skip for now",
        "action": "SKIP_MOOD_CONTEXT_AND_NAVIGATE",
        "navigateTo": "/onboarding/prayer-needs"
    },
    "tracking": {
        "screenViewEvent": "onboarding_moodcontext_viewed",
        "contextProvidedEvent": "onboarding_moodcontext_provided",
        "contextSkippedEvent": "onboarding_moodcontext_skipped"
    },
    "errorMessages": {
        "missingMoodInfo": "Error: Missing mood information. Please go back and select a mood."
    }
}'::jsonb, 'onboarding_moodcontext_viewed'),
  ((SELECT id FROM default_flow), 8, 'PrayerNeedsSelectionScreen', '{
    "title": "what do you need?",
    "subtitle": "select areas to include in your prayers",
    "prayerNeedCategories": [
        {
            "id": "guidance",
            "title": "Guidance & Wisdom",
            "options": [
                {
                    "id": "decision_making",
                    "text": "Decision Making"
                },
                {
                    "id": "clarity",
                    "text": "Clarity of Mind"
                },
                {
                    "id": "future_direction",
                    "text": "Future Direction"
                }
            ]
        },
        {
            "id": "strength",
            "title": "Strength & Endurance",
            "options": [
                {
                    "id": "overcome_challenges",
                    "text": "Overcome Challenges"
                },
                {
                    "id": "patience",
                    "text": "Patience"
                },
                {
                    "id": "perseverance",
                    "text": "Perseverance"
                }
            ]
        }
    ],
    "customNeedSection": {
        "addButton": {
            "text": "Add something specific",
            "icon": {
                "type": "MaterialCommunityIcons",
                "name": "plus-circle-outline"
            }
        },
        "inputTitle": "What else do you need prayer for?",
        "inputPlaceholder": "Type your prayer need here...",
        "cancelButtonText": "Cancel",
        "saveButtonText": "Save",
        "displayTitle": "Your custom prayer need:",
        "editButton": {
            "text": "Edit",
            "icon": {
                "type": "MaterialCommunityIcons",
                "name": "pencil"
            }
        }
    },
    "continueButton": {
        "text": "continue",
        "action": "SAVE_PRAYER_NEEDS_AND_NAVIGATE",
        "navigateTo": "/onboarding/times"
    },
    "validation": {
        "selectionRequiredTitle": "Selection needed",
        "selectionRequiredMessage": "Please select at least one area you''''d like prayer for."
    },
    "tracking": {
        "screenViewEvent": "onboarding_prayerneeds_viewed",
        "needSelectedEvent": "onboarding_prayerneed_selected",
        "customNeedAddedEvent": "onboarding_customneed_added",
        "customNeedEditedEvent": "onboarding_customneed_edited"
    }
}'::jsonb, 'onboarding_prayerneeds_viewed'),
  ((SELECT id FROM default_flow), 9, 'PrayerScheduleScreen', '{
    "title": "set your prayer schedule",
    "subtitle": "when will you dedicate time to pray?",
    "timeSlots": [
        {
            "id": "morning",
            "icon": {
                "type": "MaterialCommunityIcons",
                "name": "weather-sunset-up"
            },
            "title": "Morning Prayers",
            "timeRange": "6 AM - 9 AM",
            "description": "Start your day with intention and gratitude."
        },
        {
            "id": "midday",
            "icon": {
                "type": "MaterialCommunityIcons",
                "name": "weather-sunny"
            },
            "title": "Midday Reflection",
            "timeRange": "12 PM - 2 PM",
            "description": "Pause and find peace during your day."
        },
        {
            "id": "evening",
            "icon": {
                "type": "MaterialCommunityIcons",
                "name": "weather-sunset-down"
            },
            "title": "Evening Connection",
            "timeRange": "6 PM - 9 PM",
            "description": "Reflect and give thanks for the day."
        },
        {
            "id": "night",
            "icon": {
                "type": "MaterialCommunityIcons",
                "name": "weather-night"
            },
            "title": "Nighttime Peace",
            "timeRange": "9 PM - 11 PM",
            "description": "End your day with quiet contemplation."
        }
    ],
    "infoMessage": {
        "icon": {
            "type": "MaterialCommunityIcons",
            "name": "lightbulb-on-outline"
        },
        "text": "Select your dedicated prayer times. We''''ll help you stay committed with gentle reminders."
    },
    "permissionDeniedCard": {
        "text": "Want reminders? Prayer notifications are currently disabled.",
        "settingsButtonText": "Open Settings"
    },
    "continueButton": {
        "text": "continue",
        "loadingText": "One sec...",
        "action": "SAVE_PRAYER_TIMES_AND_NAVIGATE",
        "navigateTo": "/onboarding/summary"
    },
    "skipButton": {
        "text": "I''''ll set my own schedule",
        "action": "SKIP_PRAYER_TIMES_AND_NAVIGATE",
        "navigateTo": "/onboarding/summary"
    },
    "alerts": {
        "notificationsDisabledTitle": "Reminders Disabled",
        "notificationsDisabledMessage": "We''''ll save your schedule, but notifications are off. You can enable them in your device settings for prayer reminders.",
        "noTimeSelectedTitle": "No time selected",
        "noTimeSelectedMessage": "Please select at least one preferred prayer time to continue."
    },
    "tracking": {
        "screenViewEvent": "onboarding_prayertimes_viewed",
        "timeSlotSelectedEventPrefix": "onboarding_prayertime_selected_",
        "permissionsRequestedEvent": "onboarding_notification_permission_requested",
        "permissionsGrantedEvent": "onboarding_notification_permission_granted",
        "permissionsDeniedEvent": "onboarding_notification_permission_denied"
    }
}'::jsonb, 'onboarding_prayertimes_viewed'),
  ((SELECT id FROM default_flow), 10, 'OnboardingSummaryScreen', '{
    "title": "Your Prayer Journey",
    "subtitle": "Just one more step before your first prayer",
    "sections": [
        {
            "id": "prayerPeople",
            "title": "People You''''re Praying For",
            "icon": {
                "type": "MaterialCommunityIcons",
                "name": "account-group"
            },
            "editTargetRoute": "/onboarding/prayer-people",
            "emptyStateText": "No one added yet. Tap edit to add people.",
            "peopleDisplayConfig": {
                "gratitudePrefix": "Grateful: ",
                "challengePrefix": "Challenge: ",
                "hopePrefix": "Hope: ",
                "defaultPromptText": "Not specified"
            }
        },
        {
            "id": "personalFocus",
            "title": "Your Personal Focus",
            "icon": {
                "type": "MaterialCommunityIcons",
                "name": "heart-pulse"
            },
            "editTargetRoute": "/onboarding/prayer-needs",
            "emptyStateText": "",
            "personalFocusConfig": {
                "moodSectionTitle": "Current Mood",
                "defaultMoodEmoji": "🤔",
                "defaultMoodLabel": "Not Set",
                "prayerNeedsSectionTitle": "Prayer Needs",
                "defaultNeedsText": "None specified yet."
            }
        },
        {
            "id": "prayerSchedule",
            "title": "Your Prayer Schedule",
            "icon": {
                "type": "MaterialCommunityIcons",
                "name": "calendar-clock"
            },
            "editTargetRoute": "/onboarding/times",
            "emptyStateText": "No prayer times selected. Feel free to set them later!",
            "scheduleConfig": {
                "defaultScheduleText": "No prayer times selected",
                "timeSlotEmojis": {
                    "morning": "🌅",
                    "midday": "☀️",
                    "evening": "🌆",
                    "night": "🌙",
                    "default": "⏰"
                }
            }
        }
    ],
    "editButtonText": "Edit",
    "continueButton": {
        "text": "Create My First Prayer",
        "icon": {
            "type": "MaterialCommunityIcons",
            "name": "arrow-right-thick"
        },
        "action": "NAVIGATE_NEXT",
        "navigateTo": "/onboarding/consent"
    },
    "alerts": {
        "noPeopleSelectedTitle": "No Prayer Focus People",
        "noPeopleSelectedMessage": "It''''s best to add at least one person to pray for. Please go back and add someone."
    },
    "tracking": {
        "screenViewEvent": "onboarding_summary_viewed"
    }
}'::jsonb, 'onboarding_summary_viewed'),
  ((SELECT id FROM default_flow), 11, 'ConsentScreen', '{
    "logo": {
        "text": "personal",
        "logoAccent": "prayers",
        "logoEmoji": "🙏"
    },
    "title": "privacy & your prayers",
    "subtitle": "important info about how your data is used",
    "consentPoints": [
        {
            "icon": {
                "type": "MaterialCommunityIcons",
                "name": "lock-check-outline"
            },
            "text": "Your prayers are personal. We use AI to help craft them based on your input, but they are not stored long-term or linked to your identity after processing."
        },
        {
            "icon": {
                "type": "MaterialCommunityIcons",
                "name": "brain"
            },
            "text": "To improve the prayer generation, anonymized and aggregated data about prayer themes and structures might be used for training purposes. No personal details are included."
        },
        {
            "icon": {
                "type": "MaterialCommunityIcons",
                "name": "shield-account-outline"
            },
            "text": "You own your prayers. We don''''t share your specific prayer text with third parties, except the AI providers needed to generate the prayer."
        },
        {
            "icon": {
                "type": "MaterialCommunityIcons",
                "name": "cog-outline"
            },
            "text": "You can manage your data and preferences in the app settings at any time."
        }
    ],
    "acceptButton": {
        "text": "i understand & accept",
        "action": "ACCEPT_CONSENT_AND_NAVIGATE",
        "navigateTo": "/onboarding/spinner"
    },
    "tracking": {
        "screenViewEvent": "onboarding_consent_viewed",
        "consentAcceptedEvent": "onboarding_consent_accepted",
        "consentDeclinedEvent": "onboarding_consent_declined"
    }
}'::jsonb, 'onboarding_consent_viewed'),
  ((SELECT id FROM default_flow), 12, 'LoadingSpinnerScreen', '{
    "logo": {
        "text": "personal",
        "logoAccent": "prayers",
        "logoEmoji": "🙏"
    },
    "spinnerIcon": {
        "type": "MaterialCommunityIcons",
        "name": "meditation",
        "size": 80,
        "color": "#FFFFFF"
    },
    "messages": [
        "Connecting with the divine...",
        "Crafting your personalized prayer...",
        "Infusing words with intention...",
        "Seeking inspiration...",
        "Translating your heart''''s desires...",
        "Almost ready..."
    ],
    "messageInterval": 2500,
    "actionOnMount": {
        "type": "GENERATE_FIRST_PRAYER_AND_NAVIGATE_ON_SUCCESS",
        "successNavigateTo": "/onboarding/first-prayer",
        "errorNavigateTo": "/onboarding/summary"
    },
    "tracking": {
        "screenViewEvent": "onboarding_spinner_viewed",
        "generationStartEvent": "onboarding_firstprayer_generation_started",
        "generationSuccessEvent": "onboarding_firstprayer_generation_succeeded",
        "generationFailureEvent": "onboarding_firstprayer_generation_failed"
    }
}'::jsonb, 'onboarding_spinner_viewed'),
  ((SELECT id FROM default_flow), 13, 'FirstPrayerDisplayScreen', '{
    "logo": {
        "text": "personal",
        "logoAccent": "prayers",
        "logoEmoji": "🙏"
    },
    "title": "Your First Prayer",
    "subtitle": "Here''''s a starting point from your heart to God''''s ears. You can reflect on it or edit if you wish.",
    "prayerDisplay": {
        "placeholderText": "Loading your prayer...",
        "isEditable": true
    },
    "verseDisplay": {
        "text": "For I know the plans I have for you, declares the LORD, plans to prosper you and not to harm you, plans to give you hope and a future.",
        "reference": "Jeremiah 29:11"
    },
    "actions": [
        {
            "id": "continue_to_commitment",
            "text": "This is a good start",
            "icon": {
                "type": "MaterialCommunityIcons",
                "name": "check-circle-outline"
            },
            "styleType": "PRIMARY",
            "actionCommand": "NAVIGATE_NEXT",
            "navigateTo": "/onboarding/commitment-q"
        },
        {
            "id": "share",
            "text": "Share",
            "icon": {
                "type": "MaterialCommunityIcons",
                "name": "share-variant-outline"
            },
            "styleType": "SECONDARY",
            "actionCommand": "SHARE_PRAYER_CONTENT"
        }
    ],
    "tracking": {
        "screenViewEvent": "onboarding_firstprayer_viewed",
        "actionExecutedEventPrefix": "onboarding_firstprayer_action_"
    },
    "errorMessages": {
        "shareError": "Could not share the prayer at this time.",
        "genericError": "An unexpected error occurred."
    }
}'::jsonb, 'onboarding_firstprayer_viewed'),
  ((SELECT id FROM default_flow), 14, 'CommitmentQuestionScreen', '{
    "title": "A Moment with God",
    "question": "How committed are you to spending a few minutes a day with God?",
    "options": [
        {
            "id": "very_committed",
            "text": "I''''m very committed",
            "action": "NAVIGATE_NEXT",
            "navigateTo": "/onboarding/streak-goal"
        },
        {
            "id": "ready_to_start",
            "text": "I''''m ready to make this a priority",
            "action": "NAVIGATE_NEXT",
            "navigateTo": "/onboarding/streak-goal"
        },
        {
            "id": "want_to_try",
            "text": "I want to try my best",
            "action": "NAVIGATE_NEXT",
            "navigateTo": "/onboarding/streak-goal"
        }
    ],
    "tracking": {
        "screenViewEvent": "onboarding_commitmentq_viewed",
        "optionSelectedEventPrefix": "onboarding_commitmentq_option_"
    }
}'::jsonb, 'onboarding_commitmentq_viewed'),
  ((SELECT id FROM default_flow), 15, 'StreakGoalScreen', '{
    "title": "Set Your Prayer Streak Goal",
    "subtitle": "Families who pick a daily prayer goal are 3.4x more likely to make prayer a habit!",
    "goalOptions": [
        {
            "id": "7_days",
            "daysText": "7 Days",
            "emoji": "🙏",
            "primaryText": "Start simple for a quick win!",
            "value": 7
        },
        {
            "id": "14_days",
            "daysText": "14 Days",
            "emoji": "🙏🙏",
            "primaryText": "Build momentum over two weeks.",
            "value": 14
        },
        {
            "id": "30_days",
            "daysText": "30 Days",
            "emoji": "🙏🙏🙏",
            "primaryText": "Go all-in for a deeper faith habit.",
            "value": 30
        }
    ],
    "continueButton": {
        "text": "Continue",
        "action": "SAVE_STREAK_GOAL_AND_NAVIGATE",
        "navigateTo": "/onboarding/benefits"
    },
    "tracking": {
        "screenViewEvent": "onboarding_streakgoal_viewed",
        "goalSelectedEventPrefix": "onboarding_streakgoal_selected_"
    }
}'::jsonb, 'onboarding_streakgoal_viewed'),
  ((SELECT id FROM default_flow), 16, 'BenefitsHighlightScreen', '{
    "title": "Unlock Your Personal Prayer Journey",
    "benefits": [
        {
            "id": "personalized_prayers",
            "icon": {
                "type": "MaterialCommunityIcons",
                "name": "account-heart-outline"
            },
            "title": "Truly Personal Prayers",
            "description": "Prayers crafted uniquely for you and your loved ones, reflecting your heart."
        },
        {
            "id": "guided_reflection",
            "icon": {
                "type": "MaterialCommunityIcons",
                "name": "meditation"
            },
            "title": "Guided Reflection",
            "description": "Find peace and clarity with prompts that deepen your spiritual connection."
        },
        {
            "id": "habit_building",
            "icon": {
                "type": "MaterialCommunityIcons",
                "name": "calendar-check"
            },
            "title": "Build a Consistent Habit",
            "description": "Stay on track with gentle reminders and by setting meaningful prayer goals."
        },
        {
            "id": "strengthen_faith",
            "icon": {
                "type": "MaterialCommunityIcons",
                "name": "church"
            },
            "title": "Strengthen Your Faith",
            "description": "Grow closer to God through a more intentional and personal prayer life."
        }
    ],
    "continueButton": {
        "text": "See Subscription Plans",
        "action": "NAVIGATE_TO_PAYWALL",
        "navigateTo": "/onboarding/paywall"
    },
    "tracking": {
        "screenViewEvent": "onboarding_benefits_viewed"
    }
}'::jsonb, 'onboarding_benefits_viewed'),
  ((SELECT id FROM default_flow), 17, 'PaywallScreen', '{
    "title": "Unlock Full Access",
    "subtitle": "Choose a plan to continue your personalized prayer journey.",
    "fallbackContent": {
        "message": "Having trouble loading our plans right now. Please check your connection and try again.",
        "retryButtonText": "Try Again"
    },
    "tracking": {
        "screenViewEvent": "onboarding_paywall_viewed",
        "purchaseSuccessEvent": "onboarding_purchase_success",
        "purchaseFailedEvent": "onboarding_purchase_failed",
        "restoreSuccessEvent": "onboarding_restore_success"
    }
}'::jsonb, 'onboarding_paywall_viewed'); 