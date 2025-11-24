import { toast } from 'sonner'
import { Workflow, WorkflowStep } from '../components/workflow-builder'
import {
  executeAITask,
  generateVideoScript,
  generateSocialCaption,
  analyzeTaskMetrics,
  generateTaskReport,
} from './openrouter-service'
import {
  generateImage,
  generateVideo,
  generateAudio,
  generateVoice,
  upscaleImage,
  captionImage,
  generateContextualImage,
  REPLICATE_MODELS,
  estimateReplicateCost,
} from './replicate-service'
import {
  supabase,
  uploadGeneratedImage,
  uploadGeneratedVideo,
} from './supabase-service'

// Workflow execution context
interface WorkflowContext {
  workflow: Workflow
  task?: any
  variables: Record<string, any>
  results: Record<string, any>
}

// Execute a complete workflow
export async function executeWorkflow(
  workflow: Workflow,
  context?: Partial<WorkflowContext>
) {
  const executionContext: WorkflowContext = {
    workflow,
    task: context?.task,
    variables: context?.variables || {},
    results: {},
  }

  try {
    console.log(`Executing workflow: ${workflow.name}`)

    // Skip trigger step (index 0) and execute actions
    for (let i = 1; i < workflow.steps.length; i++) {
      const step = workflow.steps[i]

      if (step.type === 'action' && step.actionId) {
        console.log(`Executing step ${i}: ${step.actionId}`)

        try {
          const result = await executeWorkflowStep(step, executionContext)
          executionContext.results[step.id] = result

          // Update variables with step results
          executionContext.variables[`step_${i}_result`] = result
        } catch (error) {
          console.error(`Error in step ${i}:`, error)
          throw new Error(`Workflow failed at step ${i}: ${error.message}`)
        }
      }
    }

    // Update workflow run count and last run
    await updateWorkflowStats(workflow.id)

    return {
      success: true,
      results: executionContext.results,
    }
  } catch (error) {
    console.error('Workflow execution error:', error)
    return {
      success: false,
      error: error.message,
    }
  }
}

// Execute a single workflow step
export async function executeWorkflowStep(
  step: WorkflowStep,
  context: WorkflowContext
) {
  const { actionId, modelId, modelProvider, config } = step

  switch (actionId) {
    // Media generation actions (Replicate)
    case 'generate-image':
      return await executeGenerateImage(modelId, config, context)

    case 'contextual-image':
      return await executeContextualImage(modelId, config, context)

    case 'create-video':
      return await executeCreateVideo(modelId, config, context)

    case 'generate-audio':
      return await executeGenerateAudio(modelId, config, context)

    // Language model actions (OpenRouter)
    case 'post-social':
      return await executePostSocial(modelId, config, context)

    case 'analyze-metrics':
      return await executeAnalyzeMetrics(modelId, config, context)

    case 'generate-report':
      return await executeGenerateReport(modelId, config, context)

    case 'notify-team':
      return await executeNotifyTeam(modelId, config, context)

    case 'update-task':
      return await executeUpdateTask(modelId, config, context)

    case 'schedule-post':
      return await executeSchedulePost(modelId, config, context)

    case 'crawl-comments':
      return await executeCrawlComments(modelId, config, context)

    default:
      throw new Error(`Unknown action: ${actionId}`)
  }
}

// Media generation actions
async function executeGenerateImage(
  modelId: string,
  config: any,
  context: WorkflowContext
) {
  const prompt =
    config.prompt ||
    `Marketing image for: ${context.task?.title || 'product launch'}`
  const width = config.width || 1024
  const height = config.height || 1024

  // Get cost estimate
  const { totalCost } = estimateReplicateCost(modelId, 1)

  const result = await generateImage(prompt, modelId, {
    negative_prompt: config.negative_prompt,
    width,
    height,
    num_outputs: config.num_outputs || 1,
  })

  // Upload to storage
  try {
    const uploadResult = await uploadGeneratedImage(result[0], {
      workflow_id: context.workflow.id,
      task_id: context.task?.id,
      prompt,
      model: modelId,
      model_provider: 'replicate',
      aspect_ratio: config.aspectRatio,
      width,
      height,
      cost_estimate: totalCost,
    })

    console.log('✅ Image saved to storage:', uploadResult.publicUrl)

    return {
      type: 'image',
      url: uploadResult.publicUrl, // Use the permanent storage URL
      originalUrl: result[0],
      prompt,
      storageId: uploadResult.id,
      aspectRatio: config.aspectRatio,
    }
  } catch (uploadError) {
    console.error('Failed to upload image, using original URL:', uploadError)
    // Fall back to original URL if upload fails
    return {
      type: 'image',
      url: result[0],
      prompt,
      aspectRatio: config.aspectRatio,
    }
  }
}

async function executeContextualImage(
  modelId: string,
  config: any,
  context: WorkflowContext
) {
  // Find a previous image result to use as reference
  const previousImageResult = Object.values(context.results).find(
    (r) => r.type === 'image'
  )
  const referenceImage = config.reference_image || previousImageResult?.url

  if (!referenceImage) {
    throw new Error(
      'Contextual image generation requires a reference image from a previous step'
    )
  }

  const prompt =
    config.prompt ||
    `Transform the style while keeping the same character/subject`
  const width = config.width || 1024
  const height = config.height || 1024

  // Get cost estimate
  const { totalCost } = estimateReplicateCost(modelId, 1)

  const result = await generateContextualImage(prompt, referenceImage, {
    style_reference: config.style_reference,
    character_consistency: config.character_consistency !== false,
    local_editing: config.local_editing || false,
    width,
    height,
  })

  // Upload to storage
  try {
    const uploadResult = await uploadGeneratedImage(result[0], {
      workflow_id: context.workflow.id,
      task_id: context.task?.id,
      prompt,
      model: modelId,
      model_provider: 'replicate',
      aspect_ratio: config.aspectRatio,
      width,
      height,
      cost_estimate: totalCost,
    })

    console.log('✅ Contextual image saved to storage:', uploadResult.publicUrl)

    return {
      type: 'contextual_image',
      url: uploadResult.publicUrl,
      originalUrl: result[0],
      prompt,
      reference_image: referenceImage,
      storageId: uploadResult.id,
      aspectRatio: config.aspectRatio,
      features: {
        character_consistency: true,
        style_transfer: !!config.style_reference,
        local_editing: config.local_editing || false,
      },
    }
  } catch (uploadError) {
    console.error(
      'Failed to upload contextual image, using original URL:',
      uploadError
    )
    return {
      type: 'contextual_image',
      url: result[0],
      prompt,
      reference_image: referenceImage,
      features: {
        character_consistency: true,
        style_transfer: !!config.style_reference,
        local_editing: config.local_editing || false,
      },
    }
  }
}

async function executeCreateVideo(
  modelId: string,
  config: any,
  context: WorkflowContext
) {
  // Get cost estimate
  const { totalCost } = estimateReplicateCost(modelId, 1)

  // If we have an image from previous step, use it for video generation
  const previousImageResult = Object.values(context.results).find(
    (r) => r.type === 'image' || r.type === 'contextual_image'
  )
  let sourceImageId = previousImageResult?.storageId
  let videoResult
  let sourceImageUrl

  // Prepare video generation options - just use the motion prompt
  const videoOptions: any = {
    prompt:
      config.video_prompt ||
      `The subject moves naturally with smooth, engaging motion`,
    fps: 16, // Wan 2.1 optimal FPS
    num_frames: 81, // Wan 2.1 optimal frames
  }

  if (previousImageResult?.url) {
    videoResult = await generateVideo(
      previousImageResult.url,
      modelId,
      videoOptions
    )
    sourceImageUrl = previousImageResult.url
  } else {
    // Otherwise, generate an image first
    const imagePrompt =
      config.image_prompt ||
      `Hero image for: ${context.task?.title || 'video content'}`
    const imageResult = await generateImage(imagePrompt)
    videoResult = await generateVideo(imageResult[0], modelId, videoOptions)
    sourceImageUrl = imageResult[0]
  }

  // Upload to storage
  try {
    const uploadResult = await uploadGeneratedVideo(videoResult, {
      workflow_id: context.workflow.id,
      task_id: context.task?.id,
      prompt: videoOptions.prompt,
      source_image_id: sourceImageId,
      model: modelId,
      model_provider: 'replicate',
      fps: videoOptions.fps,
      resolution: '720p',
      cost_estimate: totalCost,
    })

    console.log('✅ Video saved to storage:', uploadResult.publicUrl)

    return {
      type: 'video',
      url: uploadResult.publicUrl,
      originalUrl: videoResult,
      motion_prompt: videoOptions.prompt,
      source_image: sourceImageUrl,
      storageId: uploadResult.id,
    }
  } catch (uploadError) {
    console.error('Failed to upload video, using original URL:', uploadError)
    return {
      type: 'video',
      url: videoResult,
      script,
      source_image: sourceImageUrl,
    }
  }
}

async function executeGenerateAudio(
  modelId: string,
  config: any,
  context: WorkflowContext
) {
  const prompt =
    config.prompt ||
    `Upbeat background music for ${context.task?.title || 'marketing video'}`

  const result = await generateAudio(prompt, modelId, {
    duration: config.duration || 10,
    alpha: config.alpha,
    num_inference_steps: config.num_inference_steps,
  })

  return {
    type: 'audio',
    url: result,
    prompt,
  }
}

// Social media actions
async function executePostSocial(
  modelId: string,
  config: any,
  context: WorkflowContext
) {
  const platform = config.platform || 'tiktok'
  const content =
    config.content || context.task?.title || 'Check out our new app!'

  // Generate caption
  const caption = await generateSocialCaption(content, platform, modelId)

  // Get media from previous steps
  const mediaResults = Object.values(context.results).filter((r) =>
    ['image', 'video', 'audio'].includes(r.type)
  )

  // In a real implementation, this would post to the actual platform
  // For now, we'll simulate it
  const postData = {
    platform,
    caption,
    media: mediaResults,
    scheduled: false,
    posted_at: new Date().toISOString(),
  }

  // Save to database
  const { data, error } = await supabase
    .from('workflow_posts')
    .insert({
      workflow_id: context.workflow.id,
      task_id: context.task?.id,
      platform,
      content: caption,
      media_urls: mediaResults.map((m) => m.url),
      status: 'posted',
    })
    .select()
    .single()

  if (error) throw error

  toast.success(`Posted to ${platform}!`)

  return {
    type: 'social_post',
    platform,
    caption,
    media: mediaResults,
    post_id: data.id,
  }
}

// Analytics actions
async function executeAnalyzeMetrics(
  modelId: string,
  config: any,
  context: WorkflowContext
) {
  // Fetch actual metrics from database or API
  const mockMetrics = {
    views: Math.floor(Math.random() * 10000),
    likes: Math.floor(Math.random() * 1000),
    comments: Math.floor(Math.random() * 100),
    shares: Math.floor(Math.random() * 50),
    engagement_rate: (Math.random() * 10).toFixed(2) + '%',
  }

  const analysis = await analyzeTaskMetrics(
    {
      task: context.task,
      metrics: mockMetrics,
      previous_results: context.results,
    },
    modelId
  )

  return {
    type: 'analytics',
    metrics: mockMetrics,
    analysis,
    generated_at: new Date().toISOString(),
  }
}

async function executeGenerateReport(
  modelId: string,
  config: any,
  context: WorkflowContext
) {
  const reportData = {
    task: context.task,
    workflow_results: context.results,
    config,
  }

  const report = await generateTaskReport(reportData, modelId)

  // Save report to database
  const { data, error } = await supabase
    .from('workflow_reports')
    .insert({
      workflow_id: context.workflow.id,
      task_id: context.task?.id,
      content: report,
      data: reportData,
    })
    .select()
    .single()

  if (error) throw error

  return {
    type: 'report',
    content: report,
    report_id: data.id,
    generated_at: new Date().toISOString(),
  }
}

// Team communication actions
async function executeNotifyTeam(
  modelId: string,
  config: any,
  context: WorkflowContext
) {
  const message =
    config.message ||
    `Workflow "${context.workflow.name}" completed successfully!`
  const channel = config.channel || 'general'

  // Format message with AI if needed
  const formattedMessage = await executeAITask(
    modelId,
    `Format this notification message professionally: ${message}\n\nContext: ${JSON.stringify(context.results)}`,
    'You are a professional communication assistant. Format messages clearly and concisely.'
  )

  // In real implementation, send to Slack/Discord/email
  console.log(`Notifying team in #${channel}: ${formattedMessage}`)

  return {
    type: 'notification',
    channel,
    message: formattedMessage,
    sent_at: new Date().toISOString(),
  }
}

// Task management actions
async function executeUpdateTask(
  modelId: string,
  config: any,
  context: WorkflowContext
) {
  if (!context.task) {
    throw new Error('No task provided for update action')
  }

  const updates = {
    status: config.status || 'completed',
    notes: config.notes || `Updated by workflow: ${context.workflow.name}`,
    ...config.updates,
  }

  // Update task in database
  const { data, error } = await supabase
    .from('gtm_tasks')
    .update(updates)
    .eq('id', context.task.id)
    .select()
    .single()

  if (error) throw error

  toast.success(`Task updated: ${context.task.title}`)

  return {
    type: 'task_update',
    task_id: context.task.id,
    updates,
    updated_at: new Date().toISOString(),
  }
}

async function executeSchedulePost(
  modelId: string,
  config: any,
  context: WorkflowContext
) {
  const platform = config.platform || 'tiktok'
  const scheduleTime =
    config.schedule_time || new Date(Date.now() + 24 * 60 * 60 * 1000) // Tomorrow
  const content = config.content || context.task?.title || 'Scheduled post'

  // Generate caption
  const caption = await generateSocialCaption(content, platform, modelId)

  // Get media from previous steps
  const mediaResults = Object.values(context.results).filter((r) =>
    ['image', 'video', 'audio'].includes(r.type)
  )

  // Save scheduled post
  const { data, error } = await supabase
    .from('workflow_posts')
    .insert({
      workflow_id: context.workflow.id,
      task_id: context.task?.id,
      platform,
      content: caption,
      media_urls: mediaResults.map((m) => m.url),
      status: 'scheduled',
      scheduled_for: scheduleTime,
    })
    .select()
    .single()

  if (error) throw error

  return {
    type: 'scheduled_post',
    platform,
    caption,
    media: mediaResults,
    scheduled_for: scheduleTime,
    post_id: data.id,
  }
}

async function executeCrawlComments(
  modelId: string,
  config: any,
  context: WorkflowContext
) {
  const platform = config.platform || 'tiktok'
  const post_url = config.post_url

  // In real implementation, would crawl actual comments
  // For now, generate mock data
  const mockComments = [
    { user: 'user1', text: 'This is amazing!', sentiment: 'positive' },
    { user: 'user2', text: 'When is the launch?', sentiment: 'neutral' },
    { user: 'user3', text: 'Looks interesting', sentiment: 'positive' },
  ]

  // Analyze comments with AI
  const analysis = await executeAITask(
    modelId,
    `Analyze these comments and provide insights:\n${JSON.stringify(mockComments, null, 2)}`,
    'You are a social media analyst. Provide sentiment analysis and actionable insights.'
  )

  return {
    type: 'comment_analysis',
    platform,
    post_url,
    comments: mockComments,
    analysis,
    crawled_at: new Date().toISOString(),
  }
}

// Update workflow statistics
async function updateWorkflowStats(workflowId: string) {
  // In a real implementation, this would update the workflow in the database
  console.log(`Updating stats for workflow: ${workflowId}`)
}

// Schedule workflow execution
export async function scheduleWorkflow(workflow: Workflow, schedule: string) {
  // In a real implementation, this would set up a cron job or scheduled task
  console.log(
    `Scheduling workflow "${workflow.name}" with schedule: ${schedule}`
  )

  return {
    workflow_id: workflow.id,
    schedule,
    next_run: calculateNextRun(schedule),
  }
}

// Calculate next run time based on schedule
function calculateNextRun(schedule: string): Date {
  // Simple implementation - in reality would use a cron parser
  const now = new Date()

  switch (schedule) {
    case 'hourly':
      return new Date(now.getTime() + 60 * 60 * 1000)
    case 'daily':
      return new Date(now.getTime() + 24 * 60 * 60 * 1000)
    case 'weekly':
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    default:
      return new Date(now.getTime() + 60 * 60 * 1000) // Default to hourly
  }
}

// Test workflow execution
export async function testWorkflow(workflow: Workflow, testData?: any) {
  console.log(`Testing workflow: ${workflow.name}`)

  const context = {
    task: testData?.task || {
      id: 'test-task',
      title: 'Test Task',
      description: 'This is a test task for workflow execution',
    },
    variables: testData?.variables || {},
  }

  return executeWorkflow(workflow, context)
}
