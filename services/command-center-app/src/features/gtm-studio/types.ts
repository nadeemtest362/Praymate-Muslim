import { LucideIcon } from 'lucide-react'

export type AgentType =
  | 'strategist'
  | 'developer'
  | 'designer'
  | 'researcher'
  | 'content'

export type AgentStatus = {
  id: string
  name: string
  type: AgentType
  status: 'idle' | 'working' | 'blocked'
  icon: LucideIcon
  color: string
  bgColor: string
  borderColor: string
  currentMission: Mission | null
  thoughts: AgentThought[]
  completedMissions: number
  progress: number
}

export type AgentThought = {
  id: string
  content: string
  timestamp: Date
  type: 'progress' | 'decision' | 'error'
}

export type Mission = {
  id: string
  title: string
  description: string
  agentType: AgentType
  priority: 'high' | 'medium' | 'low'
  week: number
  subtasks?: string[]
  dependencies?: string[]
  status: 'pending' | 'active' | 'completed' | 'blocked'
}

export type TaskOwner = 'PM' | 'BE' | 'CR' | 'HC'

export type TaskStatus = 'not-started' | 'in-progress' | 'completed' | 'blocked'

export type GTMSubtask = {
  id: string
  title: string
  dueDate: string
  status: TaskStatus
}

export type GTMTask = {
  id: string
  phase: number
  phaseTitle: string
  taskNumber: string
  title: string
  owner: TaskOwner
  dueDate: string
  dependencies: string[]
  status: TaskStatus
  isMilestone: boolean
  priority: 'high' | 'medium' | 'low'
  subtasks?: GTMSubtask[]
  notes?: string
  assignedAgent?: string
}

export type GTMPhase = {
  id: number
  title: string
  subtitle: string
  dateRange: string
  color: string
  bgGradient: string
  tasks: GTMTask[]
  progress: number
  hasMilestone: boolean
}

export type GTMRisk = {
  id: string
  question: string
  dueDate?: string
  status: 'open' | 'resolved' | 'mitigated'
  resolution?: string
}
