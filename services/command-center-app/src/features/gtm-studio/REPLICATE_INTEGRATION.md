# Replicate Integration for GTM Studio

## Overview

The workflow builder now supports Replicate models for media generation, complementing OpenRouter's language models. This allows you to create comprehensive workflows that generate images, videos, and audio content.

## Available Replicate Models

### 🖼️ Image Generation

- **FLUX Schnell** (Recommended) - Fast high-quality images
- **SDXL** - Stable Diffusion XL for detailed images
- **DreamShaper XL Turbo** - Artistic image generation

### 🎬 Video Generation

- **Stable Video Diffusion** - Convert images to videos
- **RIFE Video Interpolation** - Smooth frame interpolation

### 🎵 Audio Generation

- **Riffusion** - Music generation from text
- **Bark** - Realistic voice synthesis

### 🔧 Specialized Tools

- **Real-ESRGAN** - Image upscaling
- **BLIP** - Image captioning
- **CodeFormer** - Face restoration

## Using Replicate in Workflows

### 1. Model Selection

When you add a media generation action (image, video, audio), the system automatically:

- Selects Replicate as the provider
- Recommends the best model for the task
- Shows cost estimates

### 2. Unified Model Selector

The new unified model selector provides:

- Tabbed interface for Language (OpenRouter) and Media (Replicate) models
- Automatic recommendations based on action type
- Cost transparency
- Provider badges

### 3. Example Workflow: Content Creation Pipeline

```
Trigger: Task Status → "Ready for Content"
Action 1: Generate Image (FLUX Schnell)
Action 2: Create Video from Image (Stable Video Diffusion)
Action 3: Generate Background Music (Riffusion)
Action 4: Post to Social (OpenRouter - GPT-3.5)
```

## API Setup

1. Get a Replicate API key from [replicate.com](https://replicate.com)
2. Add to your `.env` file:
   ```
   VITE_REPLICATE_API_KEY=your_replicate_api_key_here
   ```

## Cost Considerations

Replicate models are priced per generation:

- **Images**: $0.0003 - $0.0004 per image
- **Videos**: $0.005 - $0.01 per video
- **Audio**: $0.0015 - $0.002 per generation

Most workflows will cost under $0.02 total.

## Workflow Execution

The workflow execution service handles:

- Sequential execution of steps
- Passing results between steps
- Error handling and retries
- Progress tracking
- Result storage

### Testing Workflows

1. Click "Test Workflow" in the workflow builder
2. The tester shows:
   - Real-time execution progress
   - Generated content preview
   - Error messages if any
   - Total execution time

### Media Pipeline Features

- **Smart Context**: Previous step results are automatically available
- **Preview Support**: Images display inline, other media shows links
- **Error Recovery**: Failed steps show detailed errors
- **Cost Tracking**: See estimated costs before execution

## Best Practices

### For Quality

- Use FLUX for modern, high-quality images
- Use Stable Video Diffusion for smooth animations
- Chain models effectively (image → video → caption)

### For Speed

- FLUX Schnell is fastest for images
- Keep video generation under 5 seconds
- Use parallel execution where possible

### For Cost

- Test with free OpenRouter models first
- Batch similar operations
- Cache results when possible

## Example Use Cases

### 1. TikTok Content Pipeline

- Generate eye-catching thumbnail (FLUX)
- Create motion video (Stable Video Diffusion)
- Generate trending music (Riffusion)
- Write viral caption (OpenRouter)

### 2. Product Launch Assets

- Generate product renders (SDXL)
- Upscale for print (Real-ESRGAN)
- Create promo video (Stable Video Diffusion)
- Generate social captions (Claude)

### 3. Automated Reports

- Analyze metrics (Claude Opus)
- Generate data visualizations (FLUX)
- Create summary video (Stable Video Diffusion)
- Send to team (Email integration)

## Troubleshooting

### Common Issues

1. **Model timeout**: Some models take 10-30 seconds
2. **Invalid inputs**: Check model requirements
3. **Rate limits**: Space out requests

### Debug Mode

Enable detailed logging in workflow execution:

```javascript
console.log('Executing step:', step)
```

## Future Enhancements

- Model performance metrics
- Custom model support
- Batch processing
- Result caching
- Webhook triggers
