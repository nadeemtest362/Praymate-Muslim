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

// Enhanced workflow types for parallel and batch processing
interface WorkflowNode {
  id: string
  type: 'trigger' | 'action' | 'splitter' | 'merge' | 'batch'
  actionId?: string
  triggerId?: string
  flowId?: string
  config: Record<string, any>
  modelId?: string
  modelProvider?: string
  // Batch-specific fields
  variations?: number
  strategy?: 'parallel' | 'sequential' | 'adaptive'
  basePrompt?: string
  varyTone?: boolean
  varyStyle?: boolean
  varyHook?: boolean
  varyLength?: boolean
  templates?: string[]
  // Progress tracking
  progress?: number
  completedCount?: number
  totalCount?: number
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
  batchItems?: BatchItem[] // Track batch items
  onProgress?: (nodeId: string, progress: number, completedCount: number, totalCount: number) => void
}

interface BatchItem {
  id: string
  variant: number
  prompt: string
  pipelineType: string
  tone?: string
  style?: string
  hook?: string
  length?: string
}

// Generate variations for batch processing
async function generateBatchVariations(node: WorkflowNode): Promise<BatchItem[]> {
  const variations = node.variations || 10
  const basePrompt = node.basePrompt || ''
  const items: BatchItem[] = []

  // Define variation options
  const tones = node.varyTone 
    ? ['uplifting', 'emotional', 'direct', 'conversational', 'inspiring'] 
    : ['default']
  
  const styles = node.varyStyle
    ? ['cinematic', 'testimonial', 'documentary', 'viral', 'traditional']
    : ['default']
  
  const hooks = node.varyHook
    ? [
        'start with a question',
        'start with a bold statement',
        'start with a story',
        'start with a statistic',
        'start with a challenge'
      ]
    : ['default']
  
  const lengths = node.varyLength
    ? ['15 seconds', '30 seconds', '60 seconds', '90 seconds']
    : ['30 seconds']

  // Generate variations by combining different parameters
  for (let i = 0; i < variations; i++) {
    const tone = tones[i % tones.length]
    const style = styles[Math.floor(i / tones.length) % styles.length]
    const hook = hooks[Math.floor(i / (tones.length * styles.length)) % hooks.length]
    const length = lengths[Math.floor(i / (tones.length * styles.length * hooks.length)) % lengths.length]
    
    // Determine which pipeline this variation should go to
    const templates = node.templates || ['jesus', 'bible', 'testimony', 'prayer']
    const pipelineType = templates[i % templates.length]
    
    // Build the varied prompt
    let variedPrompt = basePrompt
    
    if (tone !== 'default') {
      variedPrompt = `[Tone: ${tone}] ${variedPrompt}`
    }
    
    if (style !== 'default') {
      variedPrompt = `[Style: ${style}] ${variedPrompt}`
    }
    
    if (hook !== 'default') {
      variedPrompt = `[Hook: ${hook}] ${variedPrompt}`
    }
    
    if (length !== '30 seconds') {
      variedPrompt = `[Length: ${length}] ${variedPrompt}`
    }
    
    // Add pipeline-specific context
    switch (pipelineType) {
      case 'jesus':
        variedPrompt = `Create content about Jesus. ${variedPrompt}`
        break
      case 'bible':
        variedPrompt = `Create Bible verse content. ${variedPrompt}`
        break
      case 'testimony':
        variedPrompt = `Create testimony content. ${variedPrompt}`
        break
      case 'prayer':
        variedPrompt = `Create prayer content. ${variedPrompt}`
        break
    }
    
    items.push({
      id: `batch-${i}`,
      variant: i + 1,
      prompt: variedPrompt,
      pipelineType,
      tone,
      style,
      hook,
      length,
    })
  }

  return items
}

// Execute batch node
async function executeBatch(
  node: WorkflowNode,
  context: WorkflowContext
): Promise<any> {
  console.log('🔄 Executing batch node:', node.id)
  
  // Generate batch variations
  const batchItems = await generateBatchVariations(node)
  
  // Store batch items in context
  context.batchItems = batchItems
  
  // Update progress
  if (context.onProgress) {
    context.onProgress(node.id, 0, 0, batchItems.length)
  }
  
  // Execute based on strategy
  const strategy = node.strategy || 'parallel'
  let results: any[] = []
  
  if (strategy === 'parallel') {
    // Execute all variations in parallel
    const promises = batchItems.map(async (item, index) => {
      try {
        const result = await executeAITask(
          item.prompt,
          getRecommendedModel('creative'),
          'openrouter'
        )
        
        // Update progress
        if (context.onProgress) {
          const completed = index + 1
          const progress = Math.round((completed / batchItems.length) * 100)
          context.onProgress(node.id, progress, completed, batchItems.length)
        }
        
        return {
          ...item,
          result,
        }
      } catch (error) {
        console.error(`Batch item ${item.id} failed:`, error)
        return {
          ...item,
          error: error.message,
        }
      }
    })
    
    results = await Promise.all(promises)
  } else if (strategy === 'sequential') {
    // Execute variations one by one
    for (let i = 0; i < batchItems.length; i++) {
      const item = batchItems[i]
      try {
        const result = await executeAITask(
          item.prompt,
          getRecommendedModel('creative'),
          'openrouter'
        )
        
        results.push({
          ...item,
          result,
        })
        
        // Update progress
        if (context.onProgress) {
          const completed = i + 1
          const progress = Math.round((completed / batchItems.length) * 100)
          context.onProgress(node.id, progress, completed, batchItems.length)
        }
      } catch (error) {
        console.error(`Batch item ${item.id} failed:`, error)
        results.push({
          ...item,
          error: error.message,
        })
      }
    }
  } else if (strategy === 'adaptive') {
    // Execute in small batches to balance speed and cost
    const batchSize = 5
    for (let i = 0; i < batchItems.length; i += batchSize) {
      const batch = batchItems.slice(i, i + batchSize)
      const batchPromises = batch.map(async (item) => {
        try {
          const result = await executeAITask(
            item.prompt,
            'gpt-4o-mini',
            'openrouter'
          )
          return {
            ...item,
            result,
          }
        } catch (error) {
          console.error(`Batch item ${item.id} failed:`, error)
          return {
            ...item,
            error: error.message,
          }
        }
      })
      
      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)
      
      // Update progress
      if (context.onProgress) {
        const completed = Math.min(i + batchSize, batchItems.length)
        const progress = Math.round((completed / batchItems.length) * 100)
        context.onProgress(node.id, progress, completed, batchItems.length)
      }
    }
  }
  
  // Group results by pipeline type
  const groupedResults = results.reduce((acc, item) => {
    if (!acc[item.pipelineType]) {
      acc[item.pipelineType] = []
    }
    acc[item.pipelineType].push(item)
    return acc
  }, {} as Record<string, any[]>)
  
  return {
    totalVariations: batchItems.length,
    strategy,
    results: groupedResults,
    summary: {
      total: results.length,
      successful: results.filter(r => !r.error).length,
      failed: results.filter(r => r.error).length,
    }
  }
}

// Main workflow execution with parallel and batch support
export async function executeWorkflowV3(
  workflow: any,
  task?: any,
  onProgress?: (nodeId: string, progress: number, completedCount: number, totalCount: number) => void
): Promise<any> {
  const context: WorkflowContext = {
    workflow,
    task,
    variables: {},
    results: {},
    parallelBranches: {},
    batchItems: [],
    onProgress,
  }

  // Find trigger node
  const triggerNode = workflow.steps.find((n: WorkflowNode) => n.type === 'trigger')
  if (!triggerNode) {
    throw new Error('No trigger node found in workflow')
  }

  // Build execution graph
  const nodeMap = new Map(workflow.steps.map((n: WorkflowNode) => [n.id, n]))
  const graph = buildExecutionGraph(workflow.steps)

  // Execute workflow starting from trigger
  const result = await executeNode(
    triggerNode.id,
    graph,
    nodeMap,
    new Set(),
    new Set(),
    context
  )

  return {
    success: true,
    results: context.results,
    variables: context.variables,
    batchItems: context.batchItems,
  }
}

// Build execution graph from nodes
function buildExecutionGraph(nodes: WorkflowNode[]): Map<string, string[]> {
  const graph = new Map<string, string[]>()
  
  // Initialize all nodes in graph
  nodes.forEach(node => {
    graph.set(node.id, [])
  })
  
  // This is simplified - in a real implementation, you'd parse edges
  // For now, assume sequential execution based on node order
  for (let i = 0; i < nodes.length - 1; i++) {
    const current = nodes[i].id
    const next = nodes[i + 1].id
    graph.get(current)?.push(next)
  }
  
  return graph
}

// Execute a single node
async function executeNode(
  nodeId: string,
  graph: Map<string, string[]>,
  nodeMap: Map<string, WorkflowNode>,
  visited: Set<string>,
  executing: Set<string>,
  context: WorkflowContext
): Promise<any> {
  // Check if already visited
  if (visited.has(nodeId)) {
    return context.results[nodeId]
  }

  // Check for cycles
  if (executing.has(nodeId)) {
    throw new Error(`Cycle detected at node ${nodeId}`)
  }

  executing.add(nodeId)
  const node = nodeMap.get(nodeId)
  if (!node) {
    throw new Error(`Node ${nodeId} not found`)
  }

  console.log(`Executing node ${nodeId} (${node.type})`)
  
  let result
  
  try {
    switch (node.type) {
      case 'trigger':
        result = await executeTrigger(node, context)
        break
      case 'action':
        result = await executeAction(node, context)
        break
      case 'splitter':
        result = await executeSplitter(nodeId, graph, nodeMap, visited, executing, context)
        break
      case 'merge':
        result = await executeMerge(nodeId, context)
        break
      case 'batch':
        result = await executeBatch(node, context)
        break
      default:
        throw new Error(`Unknown node type: ${node.type}`)
    }
    
    // Store result
    context.results[nodeId] = result
    
    // Mark as visited
    visited.add(nodeId)
    executing.delete(nodeId)
    
    // Execute next nodes (except for splitter which handles its own)
    if (node.type !== 'splitter') {
      const nextNodes = graph.get(nodeId) || []
      for (const nextId of nextNodes) {
        await executeNode(nextId, graph, nodeMap, visited, executing, context)
      }
    }
    
    return result
  } catch (error) {
    executing.delete(nodeId)
    throw error
  }
}

// Execute trigger node
async function executeTrigger(
  node: WorkflowNode,
  context: WorkflowContext
): Promise<any> {
  console.log('🎯 Executing trigger:', node.triggerId)
  
  switch (node.triggerId) {
    case 'manual':
      return { triggered: true, timestamp: new Date().toISOString() }
    case 'schedule':
      return { triggered: true, schedule: node.config.schedule }
    case 'webhook':
      return { triggered: true, data: context.task }
    default:
      return { triggered: true }
  }
}

// Execute action node
async function executeAction(
  node: WorkflowNode,
  context: WorkflowContext
): Promise<any> {
  console.log('⚡ Executing action:', node.actionId)
  
  // Update node status if callback provided
  if (context.onProgress) {
    context.onProgress(node.id, 0, 0, 1)
  }
  
  let result
  
  switch (node.actionId) {
    case 'prompt_generation':
      const prompt = node.config?.prompt || 'Generate creative content'
      // Use getRecommendedModel from existing service
      const modelId = node.modelId || getRecommendedModel('creative')
      const provider = node.modelProvider || 'openrouter'
      
      result = await executeAITask(prompt, modelId, provider)
      context.variables.generatedPrompt = result
      break
      
    case 'image_generation':
      const imagePrompt = context.variables.generatedPrompt || node.config?.prompt || 'Beautiful landscape'
      // Use getRecommendedReplicateModel from existing service
      const imageModel = node.config?.model || getRecommendedReplicateModel('image')
      
      result = await generateImage(imagePrompt, imageModel, {
        style: node.config?.style,
      })
      
      if (result.url) {
        const uploadResult = await uploadGeneratedImage(result.url, 'workflow-image')
        context.variables.imageUrl = uploadResult.publicUrl
        result.uploadedUrl = uploadResult.publicUrl
      }
      break
      
    case 'video_generation':
      const videoPrompt = context.variables.generatedPrompt || node.config?.prompt || 'Create video'
      // Use recommended video model from existing service
      const videoModel = node.config?.model || getRecommendedReplicateModel('video')
      
      result = await generateVideo(videoPrompt, videoModel, {
        duration: node.config?.duration || 10,
      })
      
      if (result.url) {
        const uploadResult = await uploadGeneratedVideo(result.url, 'workflow-video')
        context.variables.videoUrl = uploadResult.publicUrl
        result.uploadedUrl = uploadResult.publicUrl
      }
      break
      
    case 'music_generation':
      const musicPrompt = `${node.config?.style || 'ambient'} music, ${node.config?.duration || 30} seconds`
      // Use recommended audio model from existing service
      const audioModel = getRecommendedReplicateModel('audio')
      
      result = await generateAudio(musicPrompt, audioModel, {
        duration: node.config?.duration || 30,
      })
      
      context.variables.audioUrl = result.url
      break
      
    case 'social_media_post':
      const caption = await generateSocialCaption(
        context.variables.generatedPrompt || 'Content',
        'instagram'
      )
      result = { caption, posted: false }
      break
      
    case 'analytics_tracking':
      result = await analyzeTaskMetrics({
        ...context.task,
        results: context.results,
      })
      break
      
    case 'audience_segmentation':
      result = {
        segments: ['young-adults', 'families', 'seniors'],
        recommendations: 'Focus on family-oriented content',
      }
      break
      
    case 'completion':
      result = await generateTaskReport({
        ...context.task,
        results: context.results,
      })
      break
      
    default:
      result = { completed: true }
  }
  
  // Update progress to complete
  if (context.onProgress) {
    context.onProgress(node.id, 100, 1, 1)
  }
  
  return result
}

// Execute splitter node
async function executeSplitter(
  nodeId: string,
  graph: Map<string, string[]>,
  nodeMap: Map<string, WorkflowNode>,
  visited: Set<string>,
  executing: Set<string>,
  context: WorkflowContext
): Promise<any> {
  console.log('🔀 Executing splitter:', nodeId)
  
  // Get all outgoing branches
  const branches = graph.get(nodeId) || []
  
  // Execute all branches in parallel
  const parallelPromises = branches.map(branchId => 
    executeNode(branchId, graph, nodeMap, visited, executing, context)
  )
  
  const results = await Promise.all(parallelPromises)
  
  // Store branch info in context
  context.parallelBranches[nodeId] = branches
  
  return {
    type: 'splitter',
    branches: branches.length,
    results,
  }
}

// Execute merge node
async function executeMerge(
  nodeId: string,
  context: WorkflowContext
): Promise<any> {
  console.log('🔄 Executing merge:', nodeId)
  
  // Collect results from all incoming branches
  const incomingResults = Object.entries(context.results)
    .filter(([id, _]) => {
      // Check if this node was part of a parallel branch
      return Object.values(context.parallelBranches).some(branches => 
        branches.includes(id)
      )
    })
    .map(([_, result]) => result)
  
  return {
    type: 'merge',
    merged: incomingResults.length,
    results: incomingResults,
    summary: {
      totalBranches: incomingResults.length,
      successful: incomingResults.filter(r => r && !r.error).length,
    }
  }
}

// Cost estimation
export function estimateWorkflowCost(workflow: any): number {
  let totalCost = 0
  
  workflow.steps.forEach((node: WorkflowNode) => {
    if (node.type === 'action') {
      switch (node.actionId) {
        case 'prompt_generation':
          totalCost += 0.001 // Rough estimate for GPT-4o-mini
          break
        case 'image_generation':
          const imageModel = node.config?.model || 'flux-dev'
          totalCost += estimateReplicateCost(imageModel, 'image')
          break
        case 'video_generation':
          const videoModel = node.config?.model || 'minimax'
          totalCost += estimateReplicateCost(videoModel, 'video')
          break
        case 'music_generation':
          totalCost += estimateReplicateCost('musicgen', 'audio')
          break
      }
    } else if (node.type === 'batch') {
      // Estimate batch cost
      const variations = node.variations || 10
      totalCost += variations * 0.001 // Base cost per variation
      
      // Add cost for downstream processing
      const templates = node.templates || ['jesus', 'bible', 'testimony', 'prayer']
      templates.forEach(() => {
        totalCost += estimateReplicateCost('flux-dev', 'image')
        totalCost += estimateReplicateCost('minimax', 'video')
        totalCost += estimateReplicateCost('musicgen', 'audio')
      })
    }
  })
  
  return totalCost
}