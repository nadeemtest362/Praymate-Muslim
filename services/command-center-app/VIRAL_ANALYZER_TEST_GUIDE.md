# Viral Video Analyzer Test Guide

## Overview
The Viral Video Analyzer with ScrapeCreators integration is now ready for testing. All major issues have been fixed.

## Fixed Issues
1. ✅ **Environment Variables**: Removed .env.local that was overriding real API keys
2. ✅ **Buffer Error**: Changed to use Blob instead of Buffer for browser compatibility
3. ✅ **Video Proxy**: Created custom Vite plugin to proxy video/image downloads and avoid CORS
4. ✅ **GPT-4o Auth**: Fixed API key loading and model name (now uses 'gpt-4o')
5. ✅ **Database Queries**: Fixed column names (views not view_count, author_unique_id not author_name)
6. ✅ **Async Proxy**: Fixed proxy middleware to properly handle async/await
7. ✅ **Variable Reference**: Fixed undefined variable reference in error handling

## How to Test

### 1. Access the Tool
- Navigate to: http://localhost:5173/gtm-studio
- Click on the "Video Analyzer" tab

### 2. Test Single Video Analysis
Try these sample TikTok URLs:
```
https://www.tiktok.com/@niyah.lyric/video/7371213458838056238
https://www.tiktok.com/@godlywomanhood/video/7326374267671326251
https://www.tiktok.com/@thechristiancowgirl/video/7251720905097293102
```

Expected flow:
1. Enter URL in the single video analysis input
2. Click "Analyze"
3. The system will:
   - Fetch video details via ScrapeCreators API
   - If transcript available → Claude analysis
   - If no transcript → Gemini video analysis
   - If Gemini fails → GPT-4o thumbnail analysis
   - Last resort → Description analysis

### 3. Test Bulk Analysis
- Click "Analyze 100 Videos" button
- Monitor the progress and analysis breakdown
- Check the different tabs for insights:
  - Concepts: Most frequent viral concepts
  - Emotions: Emotional drivers
  - Elements: Success elements
  - Formulas: Winning emotion + theme combos
  - Sources: Breakdown of analysis methods

### 4. Expected Analysis Sources Distribution
- **Transcript Analysis**: ~20-30% (videos with available transcripts)
- **Gemini Video Analysis**: ~40-50% (videos without transcripts)
- **Thumbnail Analysis**: ~10-20% (when video analysis fails)
- **Description Analysis**: ~5-10% (fallback when all else fails)

## Monitoring & Debugging

### Check Console Logs
The analyzer provides detailed logging:
```
[ANALYZE-VIDEO] Using transcript for Claude structuring
[ANALYZE-VIDEO] No transcript available, attempting Gemini video analysis
[ANALYZE-VIDEO] Using Gemini video analysis output for Claude structuring
[ANALYZE-VIDEO] Gemini video analysis failed, trying thumbnail analysis
[ANALYZE-VIDEO] Using thumbnail text for Claude structuring
[ANALYZE-VIDEO] Using description for Claude structuring
```

### Rate Limiting
- Claude API: Limited to 14,000 tokens/minute (conservative)
- The bulk analyzer includes automatic rate limiting
- If you see "Rate limit approaching" messages, the system is working correctly

### Database Storage
Successfully analyzed videos are stored in:
- `ai_analyses` table with analysis_type: 'claude_3.5_sonnet_structured_v2'
- Raw Gemini analyses stored separately when used

## Troubleshooting

### If Analysis Fails
1. Check browser console for errors
2. Verify API keys are loaded (no 'your-openai-api-key-here' values)
3. Check network tab for failed requests
4. Ensure video URLs are valid TikTok URLs

### Common Issues
- **403 on thumbnails**: Now fixed with proxy, should work
- **CORS errors**: Now fixed with proxy plugin
- **"Buffer not defined"**: Now fixed, uses Blob
- **Rate limiting**: System handles automatically with delays

## Next Steps
After testing is complete:
1. Run bulk analysis on larger datasets
2. Export insights for hook generation
3. Use patterns to create new viral content