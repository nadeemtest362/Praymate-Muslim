# Personal Prayers – Security Audit Findings

_Last updated: <!-- date placeholder, will update with actual date -->_

This document captures potential security vulnerabilities and privacy concerns identified during a manual code-review of the **@/app** (mobile) surface and related backend-integrations.

> ⚠️  This file is **living documentation**. As additional code areas are reviewed, new findings should be appended here rather than replacing earlier ones.

## Executive Summary

- **Critical Issues**: 0
- **High Severity**: 2
- **Medium Severity**: 12  
- **Low Severity**: 9
- **Total Issues**: 23

---

## 🔴 HIGH SEVERITY ISSUES

### #12: Public Avatar Storage Bucket
**Location**: Supabase storage bucket `avatars`  
**Risk**: Avatar URLs are publicly accessible without authentication. Filenames follow predictable pattern `avatar-<userId>-<timestamp>.*` allowing enumeration of all user avatars.  
**Impact**: Privacy breach - all user profile photos exposed  
**Remediation**: 
- Make bucket private with RLS policies
- Use signed URLs with expiration
- Store files with random UUID paths instead of predictable names

### #14: Unrestricted Media Asset Tables  
**Location**: `command-center` tables: `*_image_assets`, `*_video_assets`  
**Risk**: Policies grant **public read/insert/update** access or "Enable all access for authenticated users"  
**Impact**: Attackers can upload malicious media or tamper with admin assets, impacting brand integrity  
**Remediation**:
- Implement owner-based RLS policies
- Restrict INSERT/UPDATE to service-role only
- Expose only signed-URL SELECT where needed

---

## 🟠 MEDIUM SEVERITY ISSUES

### #1: Hard-coded Supabase Anon Key
**Location**: `src/lib/supabaseClient.ts`  
**Risk**: Fallback string exposes anon key in source code  
**Remediation**: Remove fallback value, rely solely on runtime env vars. Rotate the anon key after removal.

### #2: PII in Console Logs
**Location**: Multiple components (`manage-modal.tsx`, `intention-review.tsx`, others)  
**Risk**: Extensive logging of contact names, IDs, prayer text, and mood data that could leak to remote aggregators  
**Remediation**: Strip verbose logging or gate behind `__DEV__`. Never log raw contact or prayer data in production.

### #3: Contact Data Processing Logs
**Location**: `app/(app)/people/manage-modal.tsx` + contact flows  
**Risk**: Raw contact IDs and names logged before hashing, could reconstruct address books  
**Remediation**: Remove debug logging, minimize in-memory storage, hash phone numbers before any telemetry.

### #4: Unvalidated Avatar Uploads
**Location**: `EditProfileScreen` avatar upload  
**Risk**: No server-side MIME validation, allows malicious uploads & hot-linking  
**Remediation**: Enforce MIME whitelist server-side, enable RLS on bucket, use signed URLs.

### #11: Missing RLS Migration Files
**Location**: Core tables (`prayer_focus_people`, `prayer_intentions`, `prayers`)  
**Risk**: Schema created manually outside version control, risk of inconsistent environments  
**Remediation**: Export current DB schema & migrations, verify RLS policies, commit to VCS.

### #15: Unconfirmed RLS Policies  
**Location**: Mobile DB tables  
**Risk**: Without explicit migrations, cannot confirm policies exist. Default would expose PII & prayers  
**Remediation**: Confirm production tables have proper policies tied to `auth.uid()`, commit them to repo.

### #16: Anonymous User Data Persistence
**Location**: Onboarding flow  
**Risk**: Anonymous user JWTs never expire, device reset could leak data to next owner  
**Remediation**: Force sign-up before prayer generation OR implement secure device encryption & data purge.

### #17: Unsanitized SDUI Configs
**Location**: `app/(onboarding)/_layout.tsx`  
**Risk**: Raw JSON configs from DB could cause memory crashes, DoS, or social engineering  
**Remediation**: Validate JSON schema server-side, enforce limits, sign configs with server key.

### #19: Full Prayer Data to OpenAI
**Location**: `generate-prayer` Edge function  
**Risk**: Forwards full intention details and mood without redaction, unclear data retention  
**Remediation**: Strip/alias personal names, set strict data protection once available, add opt-out.

### #21: Cross-Tenant Privilege Risk
**Location**: `services/command-center-app` migrations  
**Risk**: Tables allow all operations for authenticated users, potential cross-tenant escalation  
**Remediation**: Use separate Supabase projects or strict schema-scoping, never share anon keys.

### #23: MIME Detection by Extension Only  
**Location**: Avatar & image uploads  
**Risk**: Deceptive filenames like `.jpg.exe` may bypass UI checks  
**Remediation**: Implement server-side MIME detection with magic-bytes before saving.

---

## 🟡 LOW SEVERITY ISSUES

### #5: Silent Fallback to Unencrypted Storage
**Location**: `src/lib/supabaseClient.ts`  
**Risk**: Falls back to unencrypted storage if SecureStore fails, exposing JWTs on compromised devices  
**Remediation**: Abort initialization or show fatal error if secure storage unavailable.

### #6: Unscrubbed Client Error Logs
**Location**: Edge function `log-client-error`  
**Risk**: Free-form payloads may contain PII  
**Remediation**: Add server-side scrubbing of known sensitive keys.

### #7: OpenAI Data Processing
**Location**: OpenAI Responses API flow  
**Risk**: May violate user privacy expectations  
**Remediation**: Update privacy policy, provide consent toggle, consider encryption.

### #8: Storage Upload Race Condition
**Location**: Supabase storage upload  
**Risk**: Filename collisions before `upsert:false` rejection  
**Remediation**: Use UUID prefixes, check existence, enforce RLS owner checks.

### #9: Unauthenticated Phone Hashing
**Location**: `supabase/functions/hash-phone-number/index.ts`  
**Risk**: Public endpoint enables privacy abuse or rainbow-table creation  
**Remediation**: Require JWT authentication, rate-limit, restrict to server calls.

### #10: Missing Phone Hash Salt
**Location**: Same edge function  
**Risk**: Falls back to unsalted SHA-256 if env var undefined  
**Remediation**: Abort if salt missing, enforce non-empty salt in CI tests.

### #13: No Client-Side Upload Limits
**Location**: `EditProfileScreen`, `manage-modal.tsx`  
**Risk**: Could upload huge files  
**Remediation**: Add local file-size checks (<5MB) and server bucket limits.

### #18: Dev Override in Production
**Location**: SDUI `DEV_OVERRIDE_SCREEN_TYPE`  
**Risk**: May load test configs in production  
**Remediation**: Guard with `if (__DEV__)`, fail CI if non-empty in prod.

### #20: Legacy Screen Access
**Location**: `legacy-screens/` directory  
**Risk**: Unmaintained screens remain routable  
**Remediation**: Remove from bundle or add auth & feature flag gating.

### #22: Device Info in Error Logs
**Location**: Multiple components via `log-client-error`  
**Risk**: Full stack traces contain device identifiers  
**Remediation**: Scrub before transmit, store hashed device IDs only.

---

## Next Steps

1. **Immediate**: Address HIGH severity issues (#12, #14) - these expose user data directly
2. **Short-term**: Fix MEDIUM issues with PII exposure (#2, #3) and missing RLS (#11, #15)  
3. **Medium-term**: Implement proper authentication and data sanitization across all components
4. **Long-term**: Establish security review process for all new features

### Tracking
- After fixes are merged, update this document with **status** (e.g., _Resolved in commit abc123_)
- Perform follow-up penetration testing focusing on storage bucket RLS and edge-function auth