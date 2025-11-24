# FLUX 1 [Kontext] Integration Guide

## Overview

FLUX 1 [Kontext] is a groundbreaking model that enables **in-context image generation** - the ability to use both text AND images as prompts. This opens up powerful new capabilities for maintaining character consistency, style transfer, and iterative image editing.

## Key Capabilities

### 1. 🎭 Character Consistency

Keep the same character across different scenes and poses:

- Generate a character once
- Use it as reference for new scenes
- Maintains facial features, clothing, style

### 2. 🎨 Style Transfer

Apply the visual style of one image to new content:

- Extract artistic style from reference
- Apply to completely different subjects
- Mix multiple style references

### 3. ✏️ Local Editing

Make targeted changes to specific parts of an image:

- Change backgrounds while keeping subjects
- Modify objects without affecting the rest
- Iterative refinement with minimal latency

### 4. ⚡ Interactive Speed

- 8x faster than traditional models
- Near real-time iterations
- Perfect for rapid prototyping

## Using in Workflows

### New Action: "Contextual Image"

We've added a new workflow action specifically for FLUX Kontext:

```
Action: Contextual Image
Model: FLUX 1 [Kontext] Dev
Features:
- Uses previous image as reference
- Maintains character/style consistency
- Supports iterative refinement
```

### Example Workflow: Character-Based Content

```
1. Generate Image → Create initial character
2. Contextual Image → Same character in office
3. Contextual Image → Same character at beach
4. Create Video → Animate the sequence
```

### Example Workflow: Brand Style Consistency

```
1. Generate Image → Create brand style reference
2. Contextual Image → Product shot in brand style
3. Contextual Image → Social media post in brand style
4. Post to Social → Publish consistent content
```

## Configuration Options

When using the Contextual Image action, you can configure:

- **Prompt**: Describe the desired transformation
- **Reference Image**: Automatically uses previous step or specify
- **Character Consistency**: Keep same character (default: true)
- **Style Reference**: Optional second image for style
- **Local Editing**: Edit specific regions only

## Best Practices

### For Character Consistency

1. Start with a clear, well-lit character image
2. Use descriptive prompts for new scenes
3. Keep clothing/features in prompt for best results

### For Style Transfer

1. Choose reference images with distinct styles
2. Separate style from content in prompts
3. Experiment with style strength

### For Local Editing

1. Be specific about what to change
2. Use masks or region descriptions
3. Iterate in small steps

## Limitations

- May produce artifacts after many iterations
- Occasional instruction accuracy issues
- Limited world knowledge compared to base models
- Best for visual transformations, not complex reasoning

## Cost & Performance

- **Cost**: ~$0.0005 per image
- **Speed**: 8x faster than comparable models
- **Quality**: On par with FLUX Pro for most use cases
- **Iterations**: Optimized for multiple quick edits

## Tips & Tricks

1. **Chain Operations**: Each contextual image can reference the previous
2. **Style Mixing**: Use multiple reference images for unique styles
3. **Progressive Editing**: Make small changes iteratively
4. **Prompt Engineering**: Be specific about what to keep vs change

## Example Prompts

### Character in New Scene

```
"Same person sitting at a coffee shop, warm lighting,
holding a laptop, professional attire"
```

### Style Transfer

```
"Transform into watercolor painting style,
keep the subject but make it artistic"
```

### Local Edit

```
"Change only the background to a sunset beach,
keep the person exactly the same"
```

## Integration Details

The FLUX Kontext model is available through:

- Replicate API
- Model ID: `black-forest-labs/flux-1-kontext-dev`
- Supports reference images and style transfers
- Returns high-quality 1024x1024 images

This powerful new capability enables creating consistent visual narratives, maintaining brand identity across content, and rapidly iterating on creative concepts!
