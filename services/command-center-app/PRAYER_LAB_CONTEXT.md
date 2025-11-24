# Prayer Lab - Internal Testing Tool

## Purpose
Prayer Lab is an **internal testing and development tool** for the Personal Prayers iOS app team. It is NOT a user-facing feature.

## Key Context
- **Location**: `/services/command-center-app/src/features/prayer-lab/`
- **Purpose**: Test and iterate on the prayer generation system before implementing in the iOS app
- **Users**: Internal team members only
- **Database**: Uses isolated `prayer_lab_*` tables to avoid affecting production data
- **Supabase Project ID**: `kfrvxoxdehduqrpcbibl`

## Core Features
1. **AI Test User Generation**: Quickly generate realistic test users with diverse personas
2. **Stateful Prayer Generation**: Test the OpenAI Responses API implementation with previous_response_id
3. **Model State Visualization**: See "What the model knew" and "What the model knows" at each step
4. **Natural Language Diffs**: Test how changes (mood, intentions) are communicated in subsequent prayers
5. **Persistence**: All test data and model knowledge is saved for debugging and analysis

## Technical Implementation
- Uses OpenAI's Responses API for stateful conversations
- Implements ACTS prayer model (Adoration, Confession, Thanksgiving, Supplication)
- Tracks conversation state through response ID chains
- Natural language diffs for subsequent prayers (not full context)

## Why This Matters
This tool allows the team to:
- Rapidly test different user scenarios
- Debug prayer generation issues
- Verify stateful conversation flow
- Iterate on prompt engineering
- Ensure prayers maintain context across multiple generations

Remember: This is a development tool for testing the prayer system that will power the iOS app.