# CLAUDE.md - Command Center Viral Video Analysis System

## Overview
The Command Center contains a viral video analysis system designed to extract insights from TikTok videos to inform content strategy. This document explains the complete flow and architecture.

## System Architecture

### 1. Viral Video Analysis Pipeline
Located in `/src/features/gtm-studio/services/viral-video-analysis-service.ts`

**Multi-Source Analysis:**
- **Gemini 1.5 Flash**: Analyzes VIDEO content (visual elements, pacing, effects)
- **ScrapeCreators API**: Extracts TRANSCRIPT (what's actually being said)
- **GPT-4o Vision**: Analyzes THUMBNAIL (text overlays, visual hooks)
- **Claude 3.5 Sonnet**: Synthesizes ALL sources into structured insights

**Current Issue**: Gemini only analyzes VISUAL elements, not audio/speech. This means we're NOT getting actual spoken hooks.

### 2. Data Storage
- **Database**: Supabase (toktrendz project)
- **Tables**:
  - `videos`: TikTok video metadata
  - `ai_analyses`: Individual video analysis results
  - `viral_insights_*`: Aggregated patterns across videos

### 3. Insights Aggregation
Located in `/src/features/gtm-studio/services/supabase-service.ts`

**Functions:**
- `getTopChristianTikTokHooks()`: Fetches videos with AI analysis
- `analyzeChristianHookPatterns()`: Aggregates patterns across videos

**What it extracts:**
- Viral techniques
- Emotional triggers
- Visual elements
- Success factors
- Content themes

### 4. UI Components
- **Christian Hooks Analyzer**: Shows aggregated insights
- **Problem**: Currently showing AI summaries as "hooks" instead of actual spoken hooks

## Understanding Hooks

**What constitutes a "hook" in viral videos:**
- **Videos WITH transcripts**: The opening line/first thing said
- **Videos WITHOUT transcripts**: The text on the thumbnail (what stops scrolling)

The system DOES get both:
- Transcripts from ScrapeCreators API (when available)
- Thumbnail text from GPT-4o analysis

The issue is the hook extraction logic needs to properly identify and extract these from the analysis.

## What Needs to Happen

1. **Update Gemini Prompt**: Include audio transcription or hook extraction
2. **Extract Real Hooks**: From transcript data when available
3. **Fix UI Labels**: Show what we actually have (insights, not hooks)
4. **Run Bulk Analysis**: Process more Christian content with corrected analyzer

## Key Commands

```bash
# Run the app
pnpm dev

# Check database
# Use Supabase dashboard or MCP tools
```

## Important Context

- This is part of a GTM (Go-To-Market) strategy tool
- Goal is to understand what makes content viral
- Focus on Christian/transformation content initially
- System should continuously learn from new analyses

## CRITICAL DATABASE RULE
**NEVER do anything with the database before querying it for the schema.** Always check what tables and columns actually exist before writing any database-related code. Use MCP tools or create a query script to inspect the schema first.