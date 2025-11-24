import { useState, useEffect, useCallback } from 'react'
import gtmContent from '../data/gtm-content'
import { GTMPhase, GTMRisk, GTMTask, TaskStatus, GTMMetrics } from '../types'
import { parseGTMData } from '../utils/gtm-parser'

export const useGTMData = () => {
  const [phases, setPhases] = useState<GTMPhase[]>([])
  const [risks, setRisks] = useState<GTMRisk[]>([])
  const [metrics, setMetrics] = useState<GTMMetrics>({
    totalTasks: 0,
    completedTasks: 0,
    inProgressTasks: 0,
    blockedTasks: 0,
    overdueTasks: 0,
    upcomingMilestones: 0,
  })
  const [selectedTask, setSelectedTask] = useState<GTMTask | null>(null)
  const [filters, setFilters] = useState({
    owner: 'all',
    phase: 'all',
    status: 'all',
  })

  useEffect(() => {
    const { phases: parsedPhases, risks: parsedRisks } =
      parseGTMData(gtmContent)

    // Load saved state from localStorage
    const savedState = localStorage.getItem('gtm-studio-state')
    if (savedState) {
      const { taskStatuses, taskNotes, riskDecisions } = JSON.parse(savedState)

      // Apply saved statuses and notes
      parsedPhases.forEach((phase) => {
        phase.tasks.forEach((task) => {
          if (taskStatuses[task.id]) {
            task.status = taskStatuses[task.id]
          }
          if (taskNotes[task.id]) {
            task.notes = taskNotes[task.id]
          }
        })
      })

      // Apply saved risk decisions
      parsedRisks.forEach((risk) => {
        if (riskDecisions[risk.id]) {
          risk.decision = riskDecisions[risk.id].decision
          risk.status = riskDecisions[risk.id].status
        }
      })
    }

    setPhases(parsedPhases)
    setRisks(parsedRisks)
    calculateMetrics(parsedPhases)
  }, [])

  const calculateMetrics = (phasesData: GTMPhase[]) => {
    let totalTasks = 0
    let completedTasks = 0
    let inProgressTasks = 0
    let blockedTasks = 0
    let overdueTasks = 0
    let upcomingMilestones = 0

    phasesData.forEach((phase) => {
      phase.tasks.forEach((task) => {
        totalTasks++

        switch (task.status) {
          case 'completed':
            completedTasks++
            break
          case 'in-progress':
            inProgressTasks++
            break
          case 'blocked':
            blockedTasks++
            break
        }

        if (task.isMilestone && task.status !== 'completed') {
          upcomingMilestones++
        }

        // Check if overdue (simplified check)
        if (task.dueDate.includes('D-') && task.status !== 'completed') {
          overdueTasks++
        }
      })
    })

    setMetrics({
      totalTasks,
      completedTasks,
      inProgressTasks,
      blockedTasks,
      overdueTasks,
      upcomingMilestones,
    })
  }

  const updateTaskStatus = useCallback(
    (taskId: string, status: TaskStatus) => {
      setPhases((prevPhases) => {
        const newPhases = prevPhases.map((phase) => ({
          ...phase,
          tasks: phase.tasks.map((task) =>
            task.id === taskId ? { ...task, status } : task
          ),
        }))

        // Save to localStorage
        saveState(newPhases, risks)

        // Recalculate metrics
        calculateMetrics(newPhases)

        return newPhases
      })
    },
    [risks]
  )

  const updateTaskNotes = useCallback(
    (taskId: string, notes: string) => {
      setPhases((prevPhases) => {
        const newPhases = prevPhases.map((phase) => ({
          ...phase,
          tasks: phase.tasks.map((task) =>
            task.id === taskId ? { ...task, notes } : task
          ),
        }))

        saveState(newPhases, risks)
        return newPhases
      })
    },
    [risks]
  )

  const updateRiskDecision = useCallback(
    (riskId: string, decision: string) => {
      setRisks((prevRisks) => {
        const newRisks = prevRisks.map((risk) =>
          risk.id === riskId
            ? { ...risk, decision, status: 'resolved' as const }
            : risk
        )

        saveState(phases, newRisks)
        return newRisks
      })
    },
    [phases]
  )

  const saveState = (phasesData: GTMPhase[], risksData: GTMRisk[]) => {
    const taskStatuses: Record<string, TaskStatus> = {}
    const taskNotes: Record<string, string> = {}
    const riskDecisions: Record<
      string,
      { decision: string; status: 'open' | 'resolved' }
    > = {}

    phasesData.forEach((phase) => {
      phase.tasks.forEach((task) => {
        taskStatuses[task.id] = task.status
        if (task.notes) {
          taskNotes[task.id] = task.notes
        }
      })
    })

    risksData.forEach((risk) => {
      if (risk.decision) {
        riskDecisions[risk.id] = {
          decision: risk.decision,
          status: risk.status,
        }
      }
    })

    localStorage.setItem(
      'gtm-studio-state',
      JSON.stringify({
        taskStatuses,
        taskNotes,
        riskDecisions,
        lastUpdated: new Date().toISOString(),
      })
    )
  }

  const getFilteredTasks = () => {
    let allTasks: GTMTask[] = []

    phases.forEach((phase) => {
      allTasks = [...allTasks, ...phase.tasks]
    })

    return allTasks.filter((task) => {
      if (filters.owner !== 'all' && task.owner !== filters.owner) return false
      if (filters.phase !== 'all' && task.phase.toString() !== filters.phase)
        return false
      if (filters.status !== 'all' && task.status !== filters.status)
        return false
      return true
    })
  }

  return {
    phases,
    risks,
    metrics,
    selectedTask,
    setSelectedTask,
    updateTaskStatus,
    updateTaskNotes,
    updateRiskDecision,
    filters,
    setFilters,
    getFilteredTasks,
  }
}
