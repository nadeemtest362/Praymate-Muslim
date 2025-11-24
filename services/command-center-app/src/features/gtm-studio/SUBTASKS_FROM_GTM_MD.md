# Subtasks from gtm.MD

## Issue

The gtm.MD file contains sub-items (a, b, c) for many tasks that weren't being saved to the database.

Example from gtm.MD:

```
[BE] 0.4  Slide Generator
         → 0.3
         a) HTML/CSS template (1080×1920, 5-slide)                D-12
         b) Node/puppeteer → ffmpeg merge to MP4                  D-11
```

## Fix Applied

### 1. Parser Already Works

The GTM parser was already correctly parsing these sub-items into subtasks, but they weren't being saved.

### 2. Updated Database Initialization

Modified `initializeGTMData` to:

- Save the parsed subtasks when initializing from gtm.MD
- Log how many subtasks are saved per task

### 3. How to Apply the Fix

1. Click the "Reset Data" button (visible in dev mode)
2. Confirm the reset
3. Data will be re-parsed from gtm.MD
4. All tasks will now include their built-in subtasks

## What You'll See

Tasks like "0.4 Slide Generator" will now show:

- a) HTML/CSS template (1080×1920, 5-slide) - D-12
- b) Node/puppeteer → ffmpeg merge to MP4 - D-11

Tasks like "0.9 Scheduler & Cross-poster" will show:

- a) TikTok Direct Post API integration - D-4
- b) Watermark-remover module - D-4
- c) IG Reels + YT Shorts basic endpoints - D-3

## Console Output

When resetting, you'll see:

```
📋 Task 0.4 has 2 subtasks: ["HTML/CSS template (1080×1920, 5-slide)", "Node/puppeteer → ffmpeg merge to MP4"]
✅ Inserted 2 subtasks for task 0.4
```

## Note

These built-in subtasks from gtm.MD are separate from AI-generated subtasks. You can:

- Add more subtasks with AI
- Mark any subtask as complete
- Remove subtasks if needed
