> **LEGACY DOCUMENT**: This document refers to the pre-2025 component layout (`src/components/**`). Paths are preserved for historical accuracy but are no longer valid. See current architecture in README.md.

# MadLib Sentence Responsive Design Fix

## Problem
The add intention madlib sentence ("Anna needs gratitude") was wrapping to multiple lines on smaller screens, causing the button to be hidden behind the keyboard. This was especially problematic on iPhone SE.

## Solution
Converted both MadlibSentence components to responsive design and reduced all sizes to prevent line wrapping.

## Changes Made

### 1. Font Size Reductions
- **Connector text** ("needs"): `24px` → `R.font(18)`
- **Pill text**: `22px` → `R.font(18)`
- **Pill emoji**: `22px` → `R.font(18)`

### 2. Spacing Reductions
- **Pill padding horizontal**: `12px` → `R.w(2.5)`
- **Pill padding vertical**: `11px` → `R.h(1)`
- **Text margins**: `10px` → `R.w(2)`
- **Icon margins**: `6px` → `R.w(1.5)`

### 3. Icon Size Reductions
- **Person icon**: `16px` → `R.font(14)`
- **Avatar size**: `20px` → `R.w(4.5)`

## Visual Impact
- Pills are now ~25% smaller overall
- Text remains readable but takes up less horizontal space
- Sentence stays on one line even with longer names
- Button remains visible above keyboard

## Components Updated
1. `src/components/add-intention/MadlibSentence.tsx`
2. `src/components/onboarding/add-intention/OnboardingMadlibSentence.tsx`

Both components now use the same responsive sizing for consistency across the app. 