import { Workflow, WorkflowStep } from '../components/workflow-builder'
import { supabase } from './supabase-service'

// Create workflows table if it doesn't exist
export async function initializeWorkflowTables() {
  // This would typically be done via migration, but for now we'll check/create
  const { error } = await supabase.rpc(
    'create_workflow_tables_if_not_exists',
    {}
  )
  if (error && !error.message.includes('already exists')) {
    console.error('Error creating workflow tables:', error)
  }
}

// Save workflow to database
export async function saveWorkflow(workflow: Workflow) {
  const { data, error } = await supabase
    .from('gtm_workflows')
    .upsert({
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      task_id: workflow.taskId,
      steps: workflow.steps,
      status: workflow.status,
      created_at: workflow.createdAt,
      last_run: workflow.lastRun,
      run_count: workflow.runCount,
    })
    .select()
    .single()

  if (error) {
    console.error('Error saving workflow:', error)
    throw error
  }

  return data
}

// Load workflows for a project
export async function loadWorkflows(projectId: string) {
  // First get all task IDs for this project
  const { data: tasks } = await supabase
    .from('gtm_tasks')
    .select('id')
    .eq('project_id', projectId)

  if (!tasks || tasks.length === 0) return []

  const taskIds = tasks.map((t) => t.id)

  // Load workflows for these tasks
  const { data: workflows, error } = await supabase
    .from('gtm_workflows')
    .select('*')
    .in('task_id', taskIds)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error loading workflows:', error)
    return []
  }

  return (
    workflows?.map((w) => ({
      id: w.id,
      name: w.name,
      description: w.description,
      taskId: w.task_id,
      steps: w.steps,
      status: w.status,
      createdAt: new Date(w.created_at),
      lastRun: w.last_run ? new Date(w.last_run) : undefined,
      runCount: w.run_count,
    })) || []
  )
}

// Load workflows for a specific task
export async function loadWorkflowsForTask(taskId: string) {
  const { data: workflows, error } = await supabase
    .from('gtm_workflows')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error loading task workflows:', error)
    return []
  }

  return (
    workflows?.map((w) => ({
      id: w.id,
      name: w.name,
      description: w.description,
      taskId: w.task_id,
      steps: w.steps,
      status: w.status,
      createdAt: new Date(w.created_at),
      lastRun: w.last_run ? new Date(w.last_run) : undefined,
      runCount: w.run_count,
    })) || []
  )
}

// Update workflow status
export async function updateWorkflowStatus(
  workflowId: string,
  status: 'active' | 'paused' | 'draft'
) {
  const { error } = await supabase
    .from('gtm_workflows')
    .update({ status })
    .eq('id', workflowId)

  if (error) {
    console.error('Error updating workflow status:', error)
    throw error
  }
}

// Delete workflow
export async function deleteWorkflow(workflowId: string) {
  const { error } = await supabase
    .from('gtm_workflows')
    .delete()
    .eq('id', workflowId)

  if (error) {
    console.error('Error deleting workflow:', error)
    throw error
  }
}

// Execute workflow (placeholder - would integrate with actual services)
export async function executeWorkflow(workflowId: string) {
  // Update last run time and increment run count
  const { error } = await supabase
    .from('gtm_workflows')
    .update({
      last_run: new Date().toISOString(),
      run_count: supabase.rpc('increment', { x: 1 }),
    })
    .eq('id', workflowId)

  if (error) {
    console.error('Error updating workflow execution:', error)
  }

  // TODO: Implement actual workflow execution logic
  console.log('Executing workflow:', workflowId)
}
