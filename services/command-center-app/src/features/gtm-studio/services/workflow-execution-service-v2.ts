import { toast } from 'sonner'
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

// Enhanced workflow types for parallel processing
interface WorkflowNode {
  id: string
  type: 'trigger' | 'action' | 'splitter' | 'merge'
  actionId?: string
  triggerId?: string
  flowId?: string
  config: Record<string, any>
  modelId?: string
  modelProvider?: string
}

interface WorkflowContext {
  workflow: {
    id: string
    name: string
    steps: WorkflowNode[]
  }
  task?: any
  variables: Record<string, any>
  results: Record<string, any>
  parallelBranches?: Record<string, string[]> // Track parallel execution paths
}

// Main workflow execution with parallel support
export async function executeWorkflowV2(
  workflow: any,
  context?: Partial<WorkflowContext>
) {
  const executionContext: WorkflowContext = {
    workflow,
    task: context?.task,
    variables: context?.variables || {},
    results: {},
    parallelBranches: {},
  }

  try {
    console.log(`🚀 Executing workflow: ${workflow.name}`)

    // Build execution graph from nodes and edges
    const executionGraph = buildExecutionGraph(workflow)

    // Execute workflow based on graph
    await executeGraph(executionGraph, executionContext)

    return {
      success: true,
      results: executionContext.results,
      summary: generateExecutionSummary(executionContext),
    }
  } catch (error) {
    console.error('❌ Workflow execution error:', error)
    return {
      success: false,
      error: error.message,
    }
  }
}

// Build execution graph from workflow definition
function buildExecutionGraph(workflow: any) {
  const { nodes = [], edges = [] } = workflow
  const graph: Record<string, string[]> = {}
  const nodeMap: Record<string, any> = {}

  // Create node map
  nodes.forEach((node: any) => {
    nodeMap[node.id] = node
    graph[node.id] = []
  })

  // Build adjacency list
  edges.forEach((edge: any) => {
    if (!graph[edge.source]) graph[edge.source] = []
    graph[edge.source].push(edge.target)
  })

  return { graph, nodeMap, nodes, edges }
}

// Execute the workflow graph with parallel support
async function executeGraph(executionGraph: any, context: WorkflowContext) {
  const { graph, nodeMap } = executionGraph
  const visited = new Set<string>()
  const executing = new Map<string, Promise<any>>()

  // Find trigger nodes (nodes with no incoming edges)
  const triggerNodes = Object.keys(nodeMap).filter((nodeId) => {
    const node = nodeMap[nodeId]
    return node.type === 'trigger'
  })

  // Start execution from trigger nodes
  for (const triggerId of triggerNodes) {
    await executeNode(triggerId, graph, nodeMap, visited, executing, context)
  }
}

// Execute a single node with support for parallel branches
async function executeNode(
  nodeId: string,
  graph: Record<string, string[]>,
  nodeMap: Record<string, any>,
  visited: Set<string>,
  executing: Map<string, Promise<any>>,
  context: WorkflowContext
): Promise<any> {
  // Skip if already visited
  if (visited.has(nodeId)) return context.results[nodeId]

  // Wait if currently executing
  if (executing.has(nodeId)) {
    return await executing.get(nodeId)
  }

  const node = nodeMap[nodeId]
  if (!node) throw new Error(`Node ${nodeId} not found`)

  console.log(`📍 Executing node: ${nodeId} (${node.type})`)

  // Mark as executing
  const executionPromise = (async () => {
    let result: any

    switch (node.type) {
      case 'trigger':
        result = await executeTrigger(node, context)
        break

      case 'splitter':
        result = await executeSplitter(
          node,
          graph,
          nodeMap,
          visited,
          executing,
          context
        )
        break

      case 'merge':
        result = await executeMerge(
          node,
          graph,
          nodeMap,
          visited,
          executing,
          context
        )
        break

      case 'action':
        result = await executeAction(node, context)
        break

      default:
        throw new Error(`Unknown node type: ${node.type}`)
    }

    // Store result
    context.results[nodeId] = result
    visited.add(nodeId)

    // Execute downstream nodes (except for splitter which handles its own)
    if (node.type !== 'splitter') {
      const downstreamNodes = graph[nodeId] || []
      for (const downstreamId of downstreamNodes) {
        await executeNode(
          downstreamId,
          graph,
          nodeMap,
          visited,
          executing,
          context
        )
      }
    }

    return result
  })()

  executing.set(nodeId, executionPromise)
  return await executionPromise
}

// Execute trigger node
async function executeTrigger(node: any, context: WorkflowContext) {
  const { triggerId, data } = node

  switch (triggerId) {
    case 'manual':
      return { triggered: true, timestamp: new Date() }

    case 'schedule':
      return {
        triggered: true,
        timestamp: new Date(),
        schedule: data.config?.schedule,
      }

    case 'batch':
      const batchSize = data.config?.batchSize || 10
      return {
        triggered: true,
        timestamp: new Date(),
        batch: Array.from({ length: batchSize }, (_, i) => ({
          id: `batch-${i}`,
          variation: i + 1,
        })),
      }

    default:
      return { triggered: true }
  }
}

// Execute splitter node - creates parallel branches
async function executeSplitter(
  node: any,
  graph: Record<string, string[]>,
  nodeMap: Record<string, any>,
  visited: Set<string>,
  executing: Map<string, Promise<any>>,
  context: WorkflowContext
) {
  const { id: splitterId, data } = node
  const strategy = data.config?.strategy || 'parallel'

  console.log(`🔀 Splitter ${splitterId} with strategy: ${strategy}`)

  // Get all downstream branches
  const branches = graph[splitterId] || []

  switch (strategy) {
    case 'parallel':
      // Execute all branches in parallel
      const parallelPromises = branches.map((branchId) =>
        executeNode(branchId, graph, nodeMap, visited, executing, context)
      )

      const results = await Promise.all(parallelPromises)

      // Track parallel branches for merge nodes
      context.parallelBranches[splitterId] = branches

      return {
        type: 'splitter',
        strategy: 'parallel',
        branches: branches.length,
        results,
      }

    case 'conditional':
      // TODO: Implement conditional routing based on context
      break

    case 'random':
      // Execute random branch
      const randomBranch = branches[Math.floor(Math.random() * branches.length)]
      return await executeNode(
        randomBranch,
        graph,
        nodeMap,
        visited,
        executing,
        context
      )

    default:
      throw new Error(`Unknown splitter strategy: ${strategy}`)
  }
}

// Execute merge node - collects results from parallel branches
async function executeMerge(
  node: any,
  graph: Record<string, string[]>,
  nodeMap: Record<string, any>,
  visited: Set<string>,
  executing: Map<string, Promise<any>>,
  context: WorkflowContext
) {
  const { id: mergeId, data } = node
  const strategy = data.config?.strategy || 'collect'

  console.log(`🔃 Merge ${mergeId} with strategy: ${strategy}`)

  // Find all upstream nodes that should connect to this merge
  const upstreamResults: any[] = []

  // Look through execution graph to find nodes that connect to this merge
  Object.entries(graph).forEach(([sourceId, targets]) => {
    if (targets.includes(mergeId)) {
      const result = context.results[sourceId]
      if (result) {
        upstreamResults.push(result)
      }
    }
  })

  switch (strategy) {
    case 'collect':
      // Collect all results into an array
      return {
        type: 'merge',
        strategy: 'collect',
        collected: upstreamResults,
        count: upstreamResults.length,
      }

    case 'first':
      // Return first completed result
      return {
        type: 'merge',
        strategy: 'first',
        result: upstreamResults[0],
      }

    case 'best':
      // TODO: Implement logic to select best performing result
      return {
        type: 'merge',
        strategy: 'best',
        result: upstreamResults[0], // Placeholder
      }

    default:
      return {
        type: 'merge',
        results: upstreamResults,
      }
  }
}

// Execute action node
async function executeAction(node: any, context: WorkflowContext) {
  const { actionId, data } = node
  const { modelId, modelProvider, config } = data

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
    case 'generate-script':
      return await executeGenerateScript(modelId, config, context)

    case 'post-social':
      return await executePostSocial(modelId, config, context)

    case 'analyze-metrics':
      return await executeAnalyzeMetrics(modelId, config, context)

    default:
      throw new Error(`Unknown action: ${actionId}`)
  }
}

// Generate execution summary
function generateExecutionSummary(context: WorkflowContext) {
  const { results } = context
  const summary = {
    totalNodes: Object.keys(results).length,
    mediaGenerated: {
      images: 0,
      videos: 0,
      audio: 0,
    },
    scriptsGenerated: 0,
    errors: 0,
  }

  Object.values(results).forEach((result: any) => {
    if (result?.type === 'image') summary.mediaGenerated.images++
    if (result?.type === 'video') summary.mediaGenerated.videos++
    if (result?.type === 'audio') summary.mediaGenerated.audio++
    if (result?.type === 'script') summary.scriptsGenerated++
    if (result?.error) summary.errors++
  })

  return summary
}

// Media generation actions
async function executeGenerateImage(
  modelId: string,
  config: any,
  context: WorkflowContext
) {
  try {
    console.log('🎨 Generating image with config:', config)

    // Add context-aware prompt enhancement
    let prompt = config.prompt || 'Beautiful landscape'

    // If part of a pipeline, add style modifiers
    if (config.style) {
      prompt = `${prompt}, ${config.style} style`
    }

    const result = await generateImage(
      prompt,
      modelId || 'black-forest-labs/flux-1.1-pro-ultra',
      {
        width: config.width || 1080,
        height: config.height || 1920,
        ...config,
      }
    )

    return {
      type: 'image',
      url: result[0],
      prompt,
      model: modelId,
      config,
    }
  } catch (error) {
    console.error('Failed to generate image:', error)
    throw error
  }
}

async function executeCreateVideo(
  modelId: string,
  config: any,
  context: WorkflowContext
) {
  try {
    console.log('🎬 Creating video with config:', config)

    // Look for image in previous results
    const previousResults = Object.values(context.results)
    const imageResult = previousResults.find((r: any) => r?.type === 'image')

    if (!imageResult?.url) {
      throw new Error('No image found for video generation')
    }

    const motionPrompt = config.motion
      ? `${config.motion} motion, professional quality`
      : 'Smooth cinematic motion, subtle animation'

    const result = await generateVideo(
      imageResult.url,
      modelId || 'pixverse/pixverse-v4.5',
      {
        prompt: motionPrompt,
        quality: config.quality || '720p',
        duration: config.duration || 5,
        aspect_ratio: config.aspectRatio || '9:16',
        ...config,
      }
    )

    return {
      type: 'video',
      url: result,
      sourceImage: imageResult.url,
      model: modelId,
      config,
    }
  } catch (error) {
    console.error('Failed to create video:', error)
    throw error
  }
}

async function executeGenerateAudio(
  modelId: string,
  config: any,
  context: WorkflowContext
) {
  try {
    console.log('🎵 Generating audio with config:', config)

    const result = await generateAudio(
      config.prompt || 'Peaceful meditation music',
      modelId || 'stable-audio-open-1.0',
      config
    )

    return {
      type: 'audio',
      url: result,
      prompt: config.prompt,
      model: modelId,
      config,
    }
  } catch (error) {
    console.error('Failed to generate audio:', error)
    throw error
  }
}

async function executeContextualImage(
  modelId: string,
  config: any,
  context: WorkflowContext
) {
  try {
    console.log('✨ Generating contextual image with config:', config)

    // Look for reference image in previous results
    const previousResults = Object.values(context.results)
    const imageResult = previousResults.find((r: any) => r?.type === 'image')

    if (!imageResult?.url) {
      throw new Error('No reference image found for contextual generation')
    }

    const result = await generateContextualImage(
      imageResult.url,
      config.prompt || 'Transform with artistic style',
      modelId || 'fofr/face-to-sticker',
      config
    )

    return {
      type: 'image',
      subtype: 'contextual',
      url: result,
      sourceImage: imageResult.url,
      prompt: config.prompt,
      model: modelId,
      config,
    }
  } catch (error) {
    console.error('Failed to generate contextual image:', error)
    throw error
  }
}

// Language model actions
async function executeGenerateScript(
  modelId: string,
  config: any,
  context: WorkflowContext
) {
  try {
    console.log('📝 Generating script with config:', config)

    let prompt = ''

    switch (config.type) {
      case 'viral_hook':
        prompt =
          'Generate 5 viral Christian video hooks that grab attention immediately. Make them emotional and relatable.'
        break
      case 'bible_verse':
        prompt =
          'Select an inspiring Bible verse about faith or hope. Include the verse reference.'
        break
      case 'testimony':
        prompt =
          'Write a short, powerful testimony story about transformation through faith. 30-60 seconds when spoken.'
        break
      case 'prayer':
        prompt =
          'Write a short, heartfelt prayer for peace and guidance. Make it personal and relatable.'
        break
      default:
        prompt = config.prompt || 'Write engaging content for social media'
    }

    const result = await generateVideoScript(prompt, modelId)

    return {
      type: 'script',
      subtype: config.type,
      content: result,
      model: modelId,
      config,
    }
  } catch (error) {
    console.error('Failed to generate script:', error)
    throw error
  }
}

async function executePostSocial(
  modelId: string,
  config: any,
  context: WorkflowContext
) {
  try {
    console.log('📱 Preparing social post with config:', config)

    // Collect all media from previous results
    const media = {
      images: [],
      videos: [],
      scripts: [],
    }

    Object.values(context.results).forEach((result: any) => {
      if (result?.type === 'image') media.images.push(result.url)
      if (result?.type === 'video') media.videos.push(result.url)
      if (result?.type === 'script') media.scripts.push(result.content)
    })

    // If bulk mode, prepare all content
    if (config.bulk) {
      return {
        type: 'social_post',
        bulk: true,
        platform: config.platform || 'multi',
        media,
        scheduled: new Date(),
        count: media.videos.length || media.images.length,
      }
    }

    // Generate caption if needed
    const caption = await generateSocialCaption(
      media.scripts[0] || 'Christian content',
      config.platform || 'tiktok',
      modelId
    )

    return {
      type: 'social_post',
      platform: config.platform || 'tiktok',
      caption,
      media: media.videos[0] || media.images[0],
      scheduled: new Date(),
    }
  } catch (error) {
    console.error('Failed to post to social:', error)
    throw error
  }
}

async function executeAnalyzeMetrics(
  modelId: string,
  config: any,
  context: WorkflowContext
) {
  try {
    console.log('📊 Analyzing metrics with config:', config)

    const metrics = await analyzeTaskMetrics(
      context.task || { id: 'workflow-task', name: context.workflow.name },
      modelId
    )

    return {
      type: 'metrics',
      analysis: metrics,
      timestamp: new Date(),
    }
  } catch (error) {
    console.error('Failed to analyze metrics:', error)
    throw error
  }
}
