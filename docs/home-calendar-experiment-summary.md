# Home Calendar Experiment – Change Summary

## Navigation & Shell
- Replaced the tab layout’s opaque bar with an `expo-blur` backdrop and translucent overlay to better match the experiment’s visual language.

## Streak Spotlight & Sharing
- Added `StreakSummaryModal` with animated streak breakdowns, daily progress badges, and share-to-image support.
- Wired the modal into Home, Profile, and Plan-with-Calendar screens; streak badges now trigger haptics and open the summary, using fresh prayer history from `usePrayers`/`useHomeData`.
- Updated `HomeHeader`, profile `JourneyCard`/`StreakBadge`, Plan streak badge, and `PrayerJourney` chips with the new green treatment, checkmark icons, and touch affordances.

## Prayer Flow & Calendar Updates
- Plan-with-Calendar now exposes the modal, modernized its streak badge styling, and uses haptics when users inspect progress.
- Home screen aggregates paginated prayer data for the modal and keeps current-day completion flags in sync.
- Prayer card CTAs received slightly smaller typography to balance the new layout.

## Intentions & Subscription UI
- Simplified intention details by removing the unused “Mark as Answered” action from both the modal and list items.
- Tightened RevenueCat types across payment/renewal sheets, onboarding paywalls, and the Intentions tab by passing explicit `PurchasesOfferings | null` shapes.
- Subscription management sheet now safely handles missing expiration timestamps when checking for “Expires Soon”.

## Onboarding & Responsiveness
- Relaxed rigid text containers by switching to `minHeight`, enabling flex shrink, and trimming padding so multi-line answers fit on smaller devices.
- Reduced headline font sizes/padding on welcome and general question screens, and adjusted `useResponsive` scaling to be more aggressive on compact heights while capping large devices.

## Praylock Reliability Improvements
- Introduced `src/lib/deviceActivity.ts` to lazy-load and cache the native DeviceActivity module; the helper now defers to the package’s `isAvailable()` before logging fallback warnings so healthy builds aren’t misclassified.
- Updated the Praylock hook and setup flow to listen for live authorization status changes, surface module-missing guidance, and guard the permissions flow with the new availability signal.
- Hardened unblock/start logic with additional logging, timezone-aware scheduling (explicit `timeZoneIdentifier` on monitoring intervals), and smarter restart rules that avoid rearming DeviceActivity on every refetch—preventing duplicate notifications while still refreshing when schedule or selection changes.

## Platform & Miscellaneous
- Realtime sync now checks `globalThis.location` to keep onboarding skips working outside the browser environment.
- Plan, profile, and praylock flows share home data for streak counts so the new modal reflects the same completion state everywhere.
