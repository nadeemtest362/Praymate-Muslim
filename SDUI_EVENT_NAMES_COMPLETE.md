# Complete SDUI Event Names Logged to `onboarding_analytics_events`

**Extraction Date:** November 14, 2025  
**Source:** Full codebase scan + database query  
**Events Listed In:** Chronological onboarding flow order

---

## Framework Events (Logged Throughout Flow)

These are built-in events logged by the SDUI framework itself during flow navigation:

- **`flow_started`** - Flow begins for the first time
- **`flow_resumed`** - User returns to an in-progress flow (with `resumed_at_step` metadata)
- **`flow_started_new_version`** - Flow version changed, user restarted (with `previous_flow_id`, `previous_step`)
- **`flow_completed_all_steps`** - User reached the end of all steps
- **`step_viewed`** - Generic event when no `tracking_event_name` is defined
- **`navigated_away_next`** - Generic event when proceeding forward without custom tracking
- **`navigated_away_back`** - Generic event when going backward without custom tracking

---

## Onboarding Steps (In Chronological Order)

Each step lists: **viewed** → **interactions** → **navigation** events

### Step 1: Welcome Screen
**Viewed:**
- `onboarding_welcome_viewed`

**Interactions:**
- (None - auto-advances)

**Navigation:**
- `onboarding_welcome_navigated_away_next`
- `onboarding_welcome_navigated_away_back`

---

### Step 2: Validation Message Screen
**Viewed:**
- `onboarding_validation_consistency_viewed`

**Interactions:**
- (None - informational only)

**Navigation:**
- `onboarding_validation_consistency_navigated_away_next`
- `onboarding_validation_consistency_navigated_away_back`

---

### Step 3: First Name Screen
**Viewed:**
- `onboarding_firstname_viewed`

**Interactions:**
- `onboarding_firstname_saved` (success)
- `onboarding_firstname_save_failed` (failure)
- `display_name_updated` (database save event)
- `display_name_update_failed` (database save failure)

**Navigation:**
- `onboarding_firstname_navigated_away_next`
- `onboarding_firstname_navigated_away_back`

---

### Step 4: Relationship with God Question
**Viewed:**
- `onboarding_relationship_with_god_screen_viewed`

**Interactions:**
- `onboarding_relationship_with_god_option_{option_id}`
  - Options: `very_close`, `close`, `complicated`, `distant`, `rebuilding`

**Navigation:**
- `onboarding_relationship_with_god_screen_navigated_away_next`
- `onboarding_relationship_with_god_screen_navigated_away_back`

---

### Step 5: Prayer Frequency Question
**Viewed:**
- `onboarding_prayer_frequency_screen_viewed`

**Interactions:**
- `onboarding_prayer_frequency_option_{option_id}`
  - Options: `multiple_daily`, `daily`, `few_times_week`, `occasionally`, `rarely`

**Navigation:**
- `onboarding_prayer_frequency_screen_navigated_away_next`
- `onboarding_prayer_frequency_screen_navigated_away_back`

---

### Step 6: Self Intention Interstitial
**Viewed:**
- `onboarding_self_intention_interstitial_viewed`

**Interactions:**
- (None - informational transition)

**Navigation:**
- `onboarding_self_intention_interstitial_navigated_away_next`
- `onboarding_self_intention_interstitial_navigated_away_back`

---

### Step 7: Add Self Intention
**Viewed:**
- `onboarding_add_self_intention_viewed`

**Interactions:**
- `intention_need_selected`
- `intention_need_selector_toggled`
- `intention_details_input_toggled`
- `intention_save_clicked`
- `intention_save_completed`

**Navigation:**
- `onboarding_prayerneeds_navigated_away_next`
- `onboarding_prayerneeds_navigated_away_back`

---

### Step 8: Self Intention Confirmation
**Viewed:**
- `onboarding_self_intention_confirmation_viewed`

**Interactions:**
- `intentions_confirmation_done_clicked`
- `intentions_confirmation_done_failed`
- `intentions_confirmation_message_sent`
- `intentions_confirmation_message_unavailable`
- `intentions_confirmation_message_failed`

**Navigation:**
- `onboarding_self_intention_confirmation_navigated_away_next`
- `onboarding_self_intention_confirmation_navigated_away_back`

---

### Step 9: Others Intention Interstitial
**Viewed:**
- `onboarding_others_intention_interstitial_viewed`

**Interactions:**
- (None - informational transition)

**Navigation:**
- `onboarding_others_intention_interstitial_navigated_away_next`
- `onboarding_others_intention_interstitial_navigated_away_back`

---

### Step 10: Prayer People Collection
**Viewed:**
- `onboarding_prayerpeople_viewed`

**Interactions:**
- `prayer_people_contact_selected`
- `prayer_people_person_added`
- `prayer_people_person_removed`
- `prayer_people_remove_failed`
- `prayer_people_attempt_continue_without_people`
- `prayer_people_continue`
- `prayer_people_add_blocked_limit_reached`
- `prayer_people_add_flow_started`
- `prayer_people_choice_contacts_selected`

**Navigation:**
- `onboarding_prayerpeople_navigated_away_next`
- `onboarding_prayerpeople_navigated_away_back`

---

### Step 11: Add Others Intention
**Viewed:**
- `onboarding_add_intention_viewed`

**Interactions:**
- `intention_need_selected`
- `intention_need_selector_toggled`
- `intention_details_input_toggled`
- `intention_save_clicked`
- `intention_save_completed`

**Navigation:**
- `onboarding_add_intention_navigated_away_next`
- `onboarding_add_intention_navigated_away_back`

---

### Step 12: Others Intentions Confirmation
**Viewed:**
- `onboarding_intentions_set_confirmation_viewed`

**Interactions:**
- `intentions_confirmation_done_clicked`
- `intentions_confirmation_done_failed`
- `intentions_confirmation_message_sent`
- `intentions_confirmation_message_unavailable`
- `intentions_confirmation_message_failed`

**Navigation:**
- `onboarding_intentions_set_confirmation_navigated_away_next`
- `onboarding_intentions_set_confirmation_navigated_away_back`

---

### Step 13: Mood Selection
**Viewed:**
- `onboarding_mood_viewed`

**Interactions:**
- `onboarding_mood_selected_{mood_id}`
  - Mood IDs: `peaceful`, `stressed`, `joyful`, `anxious`, `grateful`, `overwhelmed`, `hopeful`, `sad`

**Navigation:**
- `onboarding_mood_navigated_away_next`
- `onboarding_mood_navigated_away_back`

---

### Step 14: Mood Context
**Viewed:**
- `onboarding_moodcontext_viewed`

**Interactions:**
- `onboarding_moodcontext_skipped`
- `onboarding_moodcontext_provided`
- `mood_and_context_updated` (database save event)

**Navigation:**
- `onboarding_moodcontext_navigated_away_next`
- `onboarding_moodcontext_navigated_away_back`

---

### Step 15: Creating Profile Loader
**Viewed:**
- `onboarding_creating_profile_viewed`
- `step_viewed_CreatingProfileLoaderScreen` (fallback)

**Interactions:**
- (Auto-advances after animation)

**Navigation:**
- `step_viewed_CreatingProfileLoaderScreen_navigated_away_next`
- `step_viewed_CreatingProfileLoaderScreen_navigated_away_back`

---

### Step 16: Summary Screen
**Viewed:**
- `onboarding_summary_viewed`

**Interactions:**
- `summary_next_clicked`

**Navigation:**
- `onboarding_summary_navigated_away_next`
- `onboarding_summary_navigated_away_back`

---

### Step 17: Commitment Question
**Viewed:**
- `onboarding_commitmentq_viewed`

**Interactions:**
- `onboarding_commitmentq_option_{option_id}`
  - Options: `very_committed`, `ready_to_start`, `want_to_try`

**Navigation:**
- `onboarding_commitmentq_navigated_away_next`
- `onboarding_commitmentq_navigated_away_back`

---

### Step 18: Streak Goal
**Viewed:**
- `onboarding_streakgoal_viewed`

**Interactions:**
- `onboarding_streakgoal_selected_{option_id}`
  - Options: `7`, `14`, `30`
- `streak_goal_continue_clicked`
- `streak_goal_continue_blocked`

**Navigation:**
- `onboarding_streakgoal_navigated_away_next`
- `onboarding_streakgoal_navigated_away_back`

---

### Step 19: Prayer Schedule (Times)
**Viewed:**
- `onboarding_prayertimes_viewed`

**Interactions:**
- `onboarding_prayertime_selected_{slot_id}`
  - Slots: `morning`, `midday`, `evening`, `night`
- `onboarding_notification_permission_requested`
- `onboarding_notification_permission_granted`
- `onboarding_notification_permission_denied`
- `prayer_schedule_permission_request_failed`
- `prayer_schedule_open_settings`
- `prayer_schedule_time_slot_toggled`
- `prayer_schedule_time_slots_updated`
- `prayer_schedule_onesignal_tags_set`
- `prayer_schedule_continue_clicked`
- `prayer_schedule_no_time_selected`

**Navigation:**
- `onboarding_prayertimes_navigated_away_next`
- `onboarding_prayertimes_navigated_away_back`

---

### Step 20: Prayer Needs Selection
**Viewed:**
- `onboarding_prayerneeds_viewed`

**Interactions:**
- `prayer_needs_selection_blocked`
- `prayer_needs_selection_changed`
- `prayer_needs_custom_toggle`
- `prayer_needs_custom_cancelled`
- `prayer_needs_custom_saved`
- `prayer_needs_continue_clicked`
- `prayer_needs_continue_blocked`

**Navigation:**
- `onboarding_prayerneeds_navigated_away_next`
- `onboarding_prayerneeds_navigated_away_back`

---

### Step 21: Faith Tradition
**Viewed:**
- `faith_tradition_screen_viewed`

**Interactions:**
- `onboarding_faith_tradition_selected_{option_id}`
  - Options: `catholic`, `christian_non_catholic`, `other`
- `faith_tradition_response_saved` (database save event)

**Navigation:**
- `faith_tradition_screen_navigated_away_next`
- `faith_tradition_screen_navigated_away_back`

---

### Step 22: Prayer Generation Loading
**Viewed:**
- `prayer_generation_loading_viewed`
- `onboarding_spinner_viewed` (legacy tracking name)

**Interactions:**
- `prayer_generation_stage_completed_{stage_id}`
- `first_prayer_generation_started`
- `first_prayer_generation_context_ready`
- `first_prayer_generation_queued`
- `first_prayer_generation_succeeded`
- `first_prayer_generation_failed`
- `first_prayer_generation_finished`

**Navigation:**
- `onboarding_spinner_navigated_away_next`
- `onboarding_spinner_navigated_away_back`

---

### Step 23: Prayer Journey Ready
**Viewed:**
- `onboarding_journey_ready_viewed`
- `prayer_journey_ready_viewed` (legacy tracking name)

**Interactions:**
- `journey_ready_continue_clicked`

**Navigation:**
- `prayer_journey_ready_navigated_away_next`
- `prayer_journey_ready_navigated_away_back`

---

### Step 24: First Paywall
**Viewed:**
- `first_paywall_viewed`

**Interactions:**
- `paywall_offerings_fetch_failed`
- `paywall_no_offerings_available`
- `paywall_load_failed`
- `paywall_cta_clicked`
- `paywall_payment_sheet_shown`
- `paywall_payment_success`
- `paywall_payment_failed`
- `paywall_payment_closed`
- `paywall_restore_success`
- `paywall_restore_no_purchases`
- `paywall_stub_auto_skip_started`
- `paywall_stub_state_saved`
- `paywall_stub_state_save_failed`
- `paywall_stub_auto_skip_completed`

**Navigation:**
- `first_paywall_navigated_away_next`
- `first_paywall_navigated_away_back`

---

### Step 25: First Prayer Display
**Viewed:**
- `onboarding_firstprayer_viewed`

**Interactions:**
- `onboarding_firstprayer_action_{action_id}`
- `first_prayer_continue_clicked`

**Navigation:**
- `onboarding_firstprayer_navigated_away_next`
- `onboarding_firstprayer_navigated_away_back`

---

### Step 26: Value Paywall (Prayer Share)
**Viewed:**
- `prayer_share_screen_viewed`
- `value_paywall_viewed` (legacy tracking name)

**Interactions:**
- `prayer_share_skip_tapped`
- `prayer_share_button_tapped`
- `prayer_share_modal_opened`
- `prayer_share_bypass_failed`
- `prayer_share_bypass_ignored`
- `prayer_share_routing_to_home`
- `prayer_share_routing_to_benefits`
- `prayer_share_subscription_check_failed`
- `prayer_share_skip_clicked`
- `prayer_share_continue_after_sharing`

**Navigation:**
- `value_paywall_navigated_away_next`
- `value_paywall_navigated_away_back`

---

### Step 27: Benefits Highlight
**Viewed:**
- `onboarding_benefits_viewed`

**Interactions:**
- `benefits_highlight_offerings_failed`
- `benefits_highlight_bypass_failed`
- `benefits_highlight_bypass_ignored`

**Navigation:**
- `onboarding_benefits_navigated_away_next`
- `onboarding_benefits_navigated_away_back`
- **`flow_completed_all_steps`** (Framework event - marks completion)

---

## Technical Notes

### Event Logging Mechanism
1. All events use `logSduiEvent()` in `OnboardingFlowContext.tsx`
2. Events route through `OnboardingApiService.logOnboardingEvent()`
3. Edge function `log-onboarding-event` inserts into `onboarding_analytics_events` table
4. Metadata includes: `user_id`, `flow_id`, `step_id`, `event_name`, `session_id`, `event_data`

### Event Patterns
- **Viewed events**: `{tracking_event_name}` from database config
- **Navigation events**: `{tracking_event_name.replace('_viewed', '_navigated_away_next/back')}`
- **Interaction events**: Use prefixes from `config.tracking` + dynamic IDs (e.g., `onboarding_mood_selected_{mood_id}`)

### Configuration Sources
- `onboarding_flow_steps.tracking_event_name` - viewed events
- `onboarding_flow_steps.config.tracking.*` - interaction event prefixes
- Database stores all event names and prefixes; screens reference them dynamically

### Critical Rules
- Events are **DB-only** (not sent to PostHog) - used for A/B testing and flow diagnostics
- Analytics failures are silently caught - **never block user flow**
- All analytics functions implement defensive error handling per AGENTS.md
