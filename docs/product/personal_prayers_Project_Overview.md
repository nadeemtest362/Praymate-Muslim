# Just Pray – Project Overview (One‑Pager)

## Mission
**Help a new generation feel God’s presence every morning and night through prayers that speak directly to *their* life – delivered in an app that feels alive, comforting and delightfully “juicy.”**

## Problem
Gen‑Z Christians struggle to keep a daily prayer habit; most existing prayer apps feel like static libraries or pay‑walled content dumps, lacking emotional resonance and modern UX flair.

## Solution
A **single‑player iOS app** that asks a few reflective questions, then uses GPT‑4o to craft ultra‑personal morning & night prayers.  Subtle micro‑interactions, gentle haptics, ambient sounds, and soft visual depth (neumorphic cards, warm gradients) turn those 30 seconds into a micro‑retreat, not just text on a screen.

## Target Audience
18‑29‑year‑old Christians active on TikTok/IG Reels (USA launch) who already use Headspace/Calm‑style wellness apps and crave faith‑aligned emotional support.

## Differentiator
* **Hyper‑personal content** (AI‑generated from user input) – no rival prayer app does this yet.  
* **Experience focus (“juice”)** – emotional design, sound, and haptics make prayer consumption pleasurable, not perfunctory.

## Success Metrics
| Metric                   | North‑Star Target |
|--------------------------|-------------------|
| Onboarding completion    | ≥ 75 % |
| “Prayer wow” thumbs‑up   | ≥ 80 % |
| Download → Paid conv.    | ≥ 6 % |
| Day‑7 paid retention     | ≥ 85 % |

## Scope Boundaries (MVP)
✅ Onboarding, daily prayers, streaks, paywall, share‑card.  
❌ Community feed, TTS voices, referrals – post‑MVP.

## High‑Level Roadmap
1. Build core engine (Supabase + OpenAI).  
2. Layer “juice”: micro‑interaction kit (haptics, easing, subtle parallax).  
3. Nail first‑prayer wow & paywall.  
4. Launch TikTok UGC loop; iterate on prompts & vibe.

## Key Risks & Mitigations
| Risk                         | Mitigation |
|------------------------------|------------|
| AI theological errors        | Prompt guards + human review for first 1 k users |
| Experience feels generic     | Invest sprint time in motion/sonic polish before launch |
| App‑Store subscription rejection | Use StoreKit via Adapty, follow Apple HIG |

## Stakeholders
* **PM / Founder:** (You)  
* **Tech Lead:** AI + Supabase  
* **Design Lead:** Motion & sonic UX  
* **Growth:** TikTok & influencer ops
