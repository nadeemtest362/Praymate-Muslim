# OpenRouter Model Integration

## Overview

The workflow builder now supports multiple AI models through OpenRouter, allowing you to choose the best model for each workflow step based on task requirements, cost, and performance needs.

## Available Models

### 🚀 Fast Models (Best for simple tasks)

- **GPT-3.5 Turbo** - $0.50/1M tokens
  - Quick responses for basic formatting and simple tasks
  - Great for social media captions
- **Mistral 7B** - $0.07/1M tokens
  - Very cost-effective open-source model
  - Good for notifications and simple updates
- **Gemini Flash** - $0.25/1M tokens
  - Google's fast model
  - Balanced speed and quality

### ⚖️ Balanced Models (General purpose)

- **Claude 3 Haiku** - $0.25/1M tokens ⭐ RECOMMENDED
  - Fast Claude model with great quality
  - Perfect for most workflow tasks
- **GPT-4 Turbo** - $10/1M tokens
  - High quality with reasonable cost
  - Good for content generation
- **Gemini Pro** - $1.25/1M tokens
  - Google's balanced offering
  - Strong multilingual support

### 💎 Premium Models (Complex tasks)

- **Claude 3 Opus** - $15/1M tokens
  - Most capable for analysis and reports
  - Best for complex reasoning
- **GPT-4** - $30/1M tokens
  - OpenAI's most capable model
  - Excellent for creative tasks
- **Gemini Ultra** - $25/1M tokens
  - Google's top-tier model
  - Strong multimodal capabilities

### 🔧 Specialized Models

- **Perplexity Sonar** - $1/1M tokens
  - Has internet access for current information
  - Great for research tasks
- **Llama 3 70B** - $0.8/1M tokens
  - Powerful open-source model
  - Good value for performance
- **Nous Hermes Mixtral** - $0.45/1M tokens
  - Fine-tuned for creative tasks
  - Good for content variation

## Model Selection by Task Type

The system automatically recommends models based on the action type:

| Action Type      | Recommended Model | Why                                  |
| ---------------- | ----------------- | ------------------------------------ |
| Generate Video   | Claude 3 Haiku    | Balance of quality and speed         |
| Post to Social   | GPT-3.5 Turbo     | Fast and cheap for simple formatting |
| Analyze Metrics  | Claude 3 Opus     | Complex analysis capabilities        |
| Generate Report  | Claude 3 Opus     | Comprehensive reasoning              |
| Notify Team      | Mistral 7B        | Simple task, lowest cost             |
| Update Task      | Mistral 7B        | Basic operations                     |
| Schedule Content | GPT-3.5 Turbo     | Simple scheduling logic              |
| Crawl Comments   | Claude 3 Opus     | Sentiment analysis needs             |

## How to Use

### 1. Automatic Selection

When you add an action to a workflow, the system automatically selects the recommended model.

### 2. Manual Override

Click "Configure" on any action to:

- See all available models
- Compare costs and capabilities
- Select a different model
- See the recommendation

### 3. Cost Considerations

- Token costs are shown per 1 million tokens
- Most workflow actions use 500-2000 tokens
- Actual costs are typically fractions of a cent

## Setup

1. Get an OpenRouter API key from [openrouter.ai](https://openrouter.ai)
2. Add to your `.env` file:
   ```
   VITE_OPENROUTER_API_KEY=your_key_here
   ```
3. Models are now available in workflow builder

## Best Practices

### For Cost Efficiency

- Use fast models for simple tasks
- Reserve premium models for complex analysis
- Batch similar tasks to reduce overhead

### For Quality

- Use Claude models for nuanced tasks
- Use GPT-4 for creative content
- Use specialized models for their strengths

### For Speed

- Fast tier models respond in <1 second
- Balanced models take 1-3 seconds
- Premium models may take 3-10 seconds

## Example Workflow Configurations

### High-Volume Social Posting

- Trigger: Schedule (every hour)
- Action 1: Generate Caption (Mistral 7B) - $0.07/1M
- Action 2: Post to Social (GPT-3.5) - $0.50/1M
- Total cost: ~$0.001 per run

### Weekly Analytics Report

- Trigger: Schedule (weekly)
- Action 1: Analyze Metrics (Claude 3 Opus) - $15/1M
- Action 2: Generate Report (Claude 3 Opus) - $15/1M
- Action 3: Notify Team (Mistral 7B) - $0.07/1M
- Total cost: ~$0.05 per run

### Content Creation Pipeline

- Trigger: Task Status (new content needed)
- Action 1: Generate Script (Claude 3 Haiku) - $0.25/1M
- Action 2: Create Variations (GPT-4 Turbo) - $10/1M
- Action 3: Schedule Posts (GPT-3.5) - $0.50/1M
- Total cost: ~$0.02 per run

## Monitoring Usage

Future features will include:

- Token usage tracking per workflow
- Cost analytics dashboard
- Budget alerts
- Model performance metrics
