# Just Pray – MVP Product Requirement Document

## 1. Purpose & Vision
Deliver hyper-personal, AI-generated morning & night prayers that feel written "just for me," **focused both on the user's personal state and their intentions for specific people they care about ('Prayer People')**. Wrapped in a minimalist iOS experience that converts Gen Z Christians discovered on TikTok into paying subscribers.

## 2. Success Metrics
- **D0 onboarding completion ≥ 75 %**
- **Prayer wow score ≥ 80 %** (thumbs-up on first-prayer feedback)
- **Paywall conversion ≥ 6 %** (download→paid, blended weekly + annual)
- **Day‑7 paid retention ≥ 85 %**
- **CAC ≤ $1 via organic TikTok UGC loop**

## 3. Tech Stack
| Layer      | Choice                                 | Notes                                                   |
|------------|----------------------------------------|---------------------------------------------------------|
| Mobile     | React Native 0.79.3 + **Expo 53**      | Managed workflow; OTA updates via expo‑updates          |
| State Mgmt | **React Query + Zustand Hybrid**       | React Query for server state, Zustand for UI state      |
| Payments   | **Adapty** RN SDK                      | StoreKit 2 wrapper, paywall A/B, receipt validation     |
| Backend/DB | **Supabase**                           | Auth, Postgres, Edge Functions, RLS                     |
| AI         | **OpenAI Responses API → gpt‑4o**      | Stateful prayer generation with conversation continuity  |
| Push       | Expo Notifications                     |                                                         |
| Analytics  | Adapty events + Supabase Edge → BigQuery |                                                         |

## 4. Data Model (Supabase)

*(Based on data-model.mdc)*

### 4.1 `profiles`
| Column               | Type        | Notes                                       |
|----------------------|-------------|---------------------------------------------|
| id                   | uuid        | pk = auth.users.id                          |
| created_at           | timestamptz | default now()                               |
| updated_at           | timestamptz | default now(), auto-updates on modification |
| display_name         | text        | User's first name (from onboarding)         |
| avatar_url           | text        | URL to user's profile picture (optional)    |
| onboarding_status    | text        | e.g., 'completed', 'pending_payment'      |
| prayer_times         | _text       | Array of selected time slots (e.g., ['morning', 'night']) |
| mood                 | text        | Last selected mood (e.g., 'grateful|😊')    |
| user_prayer_needs    | _text       | Array of selected general needs (e.g., ['patience', 'guidance']) |
| custom_user_need     | text        | User's custom prayer need description       |
| openai_thread_id     | text        | Stores the conversation thread ID for OpenAI Responses API |
| prayer_cache_version | int         | increment on profile/intention edit         |

### 4.2 `prayer_focus_people`
| Column               | Type        | Notes                                       |
|----------------------|-------------|---------------------------------------------|
| id                   | uuid        | pk, generated on insert                     |
| user_id              | uuid        | fk -> profiles.id                           |
| created_at           | timestamptz | default now()                               |
| name                 | text        | Name of the person                          |
| relationship         | text        | e.g., 'Mom', 'Partner', 'Best Friend'       |
| gender               | text        | Pronoun preference ('he', 'she', 'they', 'name') |
| image_uri            | text        | URL to person's image (optional, from contacts/upload) |
| phone_number_hash    | text        | Salted SHA-256 hash (from Edge Function)    |
| email                | text        | Optional                                    |

### 4.3 `prayer_intentions`
| Column      | Type        | Notes                                       |
|-------------|-------------|---------------------------------------------|
| id          | uuid        | pk, generated on insert                     |
| user_id     | uuid        | fk -> profiles.id                           |
| person_id   | uuid        | fk -> prayer_focus_people.id                |
| created_at  | timestamptz | default now()                               |
| category    | text        | Prayer topic ID (e.g., 'guidance', 'healing') |
| details     | text        | Specific details provided by the user       |
| is_active   | boolean     | default true, used to manage intention history |

### 4.4 `prayers`
| Column           | Type        | Notes                                       |
|------------------|-------------|---------------------------------------------|
| id               | uuid        | pk, generated on insert                     |
| user_id          | uuid        | fk -> profiles.id                           |
| created_at       | timestamptz | default now()                               |
| slot             | varchar     | format YYYY-MM-DD-am / pm                   |
| content          | text        | AI-generated prayer body                    |
| input_snapshot   | jsonb       | Snapshot of people/intentions used for generation |
| liked            | boolean     | nullable                                    |
| completed_at     | timestamptz | When user marked prayer as 'done'           |
| openai_prompt_id | text        | Message ID from OpenAI thread               |
| verse_ref        | text        | Optional, if provided by AI                 |


_RLS_: Standard policies apply - users can only manage their own profiles, people, intentions, and prayers.

## 5. Core User Flows

### 5.1 Onboarding Flow (Revised)
1.  **Welcome:** Animated intro, Bible verse, asks "What brings you here?" (stores initial motivation).
2.  **Understanding Validation:** (Screen likely explains app purpose based on motivation).
3.  **Add Prayer People:** Add up to 3 people via contacts or manual input. Includes relationship & pronoun selection. Saves to `prayer_focus_people`.
4.  **Add Intention:** For each added person, select a prayer need category (e.g., Guidance, Strength) and add specific details. Saves to `prayer_intentions`.
5.  **Prayer Times:** Select preferred time slots (e.g., Morning, Evening). Saves to `profiles`.
6.  **Prayer Needs:** Select general prayer needs for the *user* (e.g., Patience, Wisdom) and/or add a custom need. Saves to `profiles`.
7.  **Mood:** Select current mood (e.g., via emojis). Saves to `profiles`.
8.  **Summary:** Review all selections (People, Intentions, Times, Needs, Mood) with options to edit.
9.  **Consent:** Explain data usage & privacy, require acceptance.
10. **Spinner:** Show loading while first prayer is generated.
11. **First Prayer:** Display the initial AI-generated prayer.
12. **Paywall:** (Post-first prayer) Present Adapty paywall (paywallId `pp‑launch‑v1`).

### 5.2 Daily Cycle
*   Scheduled push based on `prayer_times` → "Your [morning/evening] prayer is ready."
*   Open → Fetch/display prayer from `prayers` table for the correct `slot`.
*   Trigger AI generation (e.g., via Edge Function) if prayer for the slot is missing, using current `prayer_intentions` and `profiles` data (mood, user needs).
*   Allow feedback (like/dislike) on prayer (`prayers.liked`).
*   Allow marking prayer as completed (`prayers.completed_at`).
*   Allow sharing.
*   (Track streak based on viewing/completing prayers).

## 6. AI Prayer Generation (Revised Approach)
*   Uses **OpenAI Responses API** (likely `gpt-4o` via `openai` npm package in Edge Functions).
*   Maintains a conversation thread per user, stored in `profiles.openai_thread_id`.
*   **Initial Generation (Post-Onboarding):**
    *   An Edge Function (e.g., `generate-first-prayer`) is triggered after consent.
    *   Collects all `prayer_intentions` for the user's `prayer_focus_people`.
    *   Collects user's `mood` and `user_prayer_needs` from `profiles`.
    *   Constructs a detailed initial prompt summarizing this information for the OpenAI `threads.create` endpoint.
    *   Stores the resulting `thread_id` in `profiles.openai_thread_id`.
    *   Processes the AI response, saves the prayer content to the `prayers` table along with an `input_snapshot` (JSONB of intentions/profile state used) and the `openai_prompt_id`.
*   **Subsequent Generation (e.g., Daily Cron or On-Demand):**
    *   An Edge Function retrieves the user's `openai_thread_id`.
    *   Fetches current *active* `prayer_intentions` and relevant `profiles` data (mood, needs).
    *   Constructs a continuation message for the OpenAI `threads.messages.create` endpoint, referencing the existing thread.
    *   Processes the response, saves the new prayer to the `prayers` table with a new `input_snapshot` and `openai_prompt_id`.
*   **Prompting Strategy:** Focuses on weaving together the specific intentions for each Prayer Person with the user's overall mood and needs into a cohesive, personal prayer. Uses relationship/pronoun info (`prayer_focus_people.gender`) for appropriate language. Adapts length/tone based on user preferences (if captured, e.g., in `profiles`). *Specific prompt text is managed within the Edge Function logic.*

## 7. Paywall Configuration (Adapty)
```json
{
  "products": [
    { "store_id": "pp_weekly_499", "duration": "P1W", "trial": 3 },
    { "store_id": "pp_annual_5999", "duration": "P1Y",
      "intro_offer": { "price": 4999, "periods": 1 } }
  ],
  "presentation": "modal",
  "analytics_event_name": "paywall_shown"
}
```

## 8. Notification Rules
* Schedule 14 local notifications in advance (Expo Notifications).  
* Reschedule if user edits preferred times.  
* Secondary push at 20:30 for night prayer.

## 9. Analytics Events (Revised)
| Event                   | Props                  | Notes                                  |
|-------------------------|------------------------|----------------------------------------|
| onboarding_started      |                        |                                        |
| onboarding_motivation_set | motivation             | e.g., 'consistency', 'personal'        |
| prayer_person_added     | method ('contacts', 'manual') |                                |
| intention_added         | category               | Prayer need category ID                |
| prayer_time_selected    |                        |                                        |
| user_need_selected      |                        |                                        |
| mood_selected           |                        |                                        |
| onboarding_summary_viewed |                        |                                        |
| onboarding_consent_given|                        |                                        |
| first_prayer_generated  |                        | Triggered after spinner                |
| first_prayer_viewed     |                        |                                        |
| paywall_shown           | placement ('onboarding') | Adapty handles variant tracking        |
| purchase_success        | plan                   | Adapty event                           |
| prayer_viewed           | slot ('morning', 'night') | Daily usage                          |
| prayer_liked            | slot, liked (true/false) | Feedback                              |
| prayer_completed        | slot                   | User tapped 'Amen'                     |
| prayer_shared           | channel                |                                        |
| streak_day              | count                  | If streak logic is implemented         |

## 10. Security & Privacy (Revised)
*   Prayer intentions and details are stored linked to user and Prayer Person IDs.
*   Phone numbers are never stored directly; only salted SHA-256 hashes in `prayer_focus_people.phone_number_hash`.
*   Data sent to OpenAI for prayer generation includes user ID hash, prayer intention categories/details, Prayer Person relationships/pronouns, user mood/needs. Raw names might be included if necessary for personalization context (needs verification).
*   User can manage/delete their Prayer People and intentions via app settings (requires implementation).
*   Follow standard Supabase security practices (RLS, API key management).

## 11. Error & Offline Handling
* Show cached prayer when offline.  
* On OpenAI timeout (> 2 s) display generic prayer; queue retry.  
* Streak grace window: user can view prayer up to +12 h late without loss.

## 12. Post‑MVP Backlog (Out of Scope)
* TTS voices  
* Friend referral flow  
* Widget with verse‑only mode  
* In‑app gratitude journal
