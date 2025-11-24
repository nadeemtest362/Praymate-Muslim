export default `================================================================================
PERSONAL PRAYERS • TIKTOK GTM TASK BOARD
================================================================================
Legend
● = milestone         → = dependency          (?) = decision required
Owner tags: [PM] Growth PM  [BE] Backend dev  [CR] Creative  [HC] Host/Creator

────────────────────────────────────────────────────────────────────────────────
PHASE 0 • INTERNAL TOOLING & FOUNDATION  (Day –21 to –1)                  M/V: ●
────────────────────────────────────────────────────────────────────────────────
[PM] 0.1  Define success metrics doc (hook %, hold, CPI)          Due D-14
[PM] 0.2  Create TikTok, IG, YT brand handles; secure emails       Due D-14
[BE] 0.3  Stand-up "content" S3 bucket + public CDN                Due D-14
[BE] 0.4  Slide Generator
         → 0.3
         a) HTML/CSS template (1080×1920, 5-slide)                D-12
         b) Node/puppeteer → ffmpeg merge to MP4                  D-11
[BE] 0.5  Midjourney Render Queue
         a) MJ API key + prompt JSON schema                       D-12
         b) Lambda to poll MJ, save to S3                         D-10
[BE] 0.6  TTS Pipeline
         a) ElevenLabs key + voice config                         D-12
         b) FFmpeg concat voice + bg track                        D-9
[BE] 0.7  Reaction Video Templater
         a) PiP layout JSON (face top, UI bottom)                 D-8
         b) FFmpeg overlay script                                 D-7
[BE] 0.8  Comment-Crawler Bot
         a) TikTok unofficial API wrapper                         D-6
         b) Cron job: store comments → Postgres queue             D-5
[BE] 0.9  Scheduler & Cross-poster
         a) TikTok Direct Post API integration                    D-4
         b) Watermark-remover module                              D-4
         c) IG Reels + YT Shorts basic endpoints                  D-3
[BE] 0.10 Analytics ETL
         a) AppsFlyer → BigQuery pipe                             D-3
         b) Metabase dashboards (daily export)                    D-2
● 0.11  End-to-end "hello world" test: generate 1 slideshow, post to private acct, confirm metrics ingest                                                         D-1

────────────────────────────────────────────────────────────────────────────────
PHASE 1 • ASSET FACTORY & CONTENT STOCKPILE  (Day –7 to 0)         M/V: ●
────────────────────────────────────────────────────────────────────────────────
[CR] 1.1  Draft 50 verse + prayer pairs CSV                       D-7
[CR] 1.2  Run MJ queue → 200 BG images                            D-6
[CR] 1.3  Batch generate 50 slideshow videos via 0.4              D-5
[HC] 1.4  Film 30 reaction clips (12 outfits, 4 angles)           D-5
[CR] 1.5  Screen-record 5 UI demos (onboarding, gen prayer, etc.) D-4
[CR] 1.6  Use 0.7 to create 20 PiP "problem→solution" edits       D-3
[CR] 1.7  Prepare 10 comment-reply template videos                D-2
● 1.8  Upload all assets to Scheduler queue                       D-1

────────────────────────────────────────────────────────────────────────────────
PHASE 2 • LAUNCH BLAST  (Day 1–7)                                 M/V: ●
────────────────────────────────────────────────────────────────────────────────
[PM] 2.1  Finalize bios & link-in-bio (deep-link iOS)             Day 1
[PM] 2.2  Publish 15 videos/day across 3 accounts                 Day 1-7
[PM] 2.3  Hourly comment engagement rota (Notion checklist)       Day 1-7
[PM] 2.4  Pin best performer nightly                              Day 2-7
[CR] 2.5  Draft 1 Live show rundown (15-min group prayer)         Day 4
[PM] 2.6  Host first TikTok Live from @PrayBuddy                  Day 5
[BE] 2.7  Spark boost any video >20 % hold & >2 installs/1K views Day 6-7
● 2.8  Week-1 retro; kill bottom 30 % creatives                   Day 8

────────────────────────────────────────────────────────────────────────────────
PHASE 3 • ITERATE & SCALE  (Day 8–30)                             M/V: ●
────────────────────────────────────────────────────────────────────────────────
[CR] 3.1  Clone winning formats ×5 variants each                  Day 8-10
[PM] 3.2  Draft outreach list: 20 micro-influencers               Day 10
[PM] 3.3  Launch affiliate links + creator kit                    Day 12
[BE] 3.4  Add ES/PT language toggle to Slide Generator            Day 14
[PM] 3.5  Spin-up @OracionesPersonales & @OracoesPessoais         Day 15
[PM] 3.6  Weekly metric review + spend reallocation               Day 15,22,29
● 3.7  30-day KPI checkpoint: CPI, hook %, UGC volume             Day 30

────────────────────────────────────────────────────────────────────────────────
PHASE 4 • COMMUNITY & MOAT  (Day 31–90)                           M/V: ●
────────────────────────────────────────────────────────────────────────────────
[PM] 4.1  Launch #PersonalPrayerChallenge (UGC duets)             Day 31
[PM] 4.2  Schedule weekly Lives (Sun nights)                      Recurring
[BE] 4.3  TikTok LeadGen form → email funnel (prayer ebook)       Day 40
[CR] 4.4  Produce 100-video evergreen bank (seasonal)             Day 60
[PM] 4.5  Quarterly influencer cohort #2 (50 creators)            Day 75
● 4.6  90-day review; decide on paid scale or new vertical        Day 90

────────────────────────────────────────────────────────────────────────────────
OPEN QUESTIONS / RISKS
(?) Which AI voice (male vs female, calm vs energetic)? Decide by D-13
(?) Do we need manual content moderation for comment-crawler output?
(?) Legal sign-off on auto-generated prayers (theology accuracy guardrails)

================================================================================`
