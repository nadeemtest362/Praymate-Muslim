import { GTMTask, GTMPhase, GTMRisk, TaskStatus, TaskOwner } from '../types'

const parseOwner = (text: string): TaskOwner | null => {
  const match = text.match(/\[(PM|BE|CR|HC)\]/)
  return match ? (match[1] as TaskOwner) : null
}

const parseTaskNumber = (text: string): string | null => {
  const match = text.match(/(\d+\.\d+)/)
  return match ? match[1] : null
}

const parseDueDate = (text: string): string => {
  const match = text.match(
    /Due D[+-]?\d+|D[+-]?\d+|Day \d+[-–]\d+|Day \d+|Recurring/
  )
  return match ? match[0] : ''
}

const parseTaskTitle = (text: string): string => {
  return text
    .replace(/\[(PM|BE|CR|HC)\]/, '')
    .replace(/\d+\.\d+/, '')
    .replace(/Due D[+-]?\d+|D[+-]?\d+|Day \d+[-–]\d+|Day \d+|Recurring/, '')
    .replace(/→.*/, '')
    .trim()
}

const parseDependencies = (lines: string[], currentIndex: number): string[] => {
  const deps: string[] = []
  // Check the next few lines for dependencies
  for (
    let i = currentIndex + 1;
    i < Math.min(currentIndex + 5, lines.length);
    i++
  ) {
    if (lines[i].includes('→')) {
      const depMatch = lines[i].match(/→\s*([\d.]+)/)
      if (depMatch) {
        deps.push(depMatch[1])
      }
    }
    // Stop if we hit a new task or phase
    if (lines[i].match(/\[(PM|BE|CR|HC)\]/) || lines[i].includes('PHASE')) {
      break
    }
  }
  return deps
}

const parseSubtasks = (
  lines: string[],
  startIndex: number
): { subtasks: any[]; endIndex: number } => {
  const subtasks: any[] = []
  let i = startIndex + 1

  while (i < lines.length && lines[i].match(/^\s+[a-z]\)/)) {
    const subtaskMatch = lines[i].match(
      /^\s+([a-z])\)\s+(.+?)\s+(D[+-]?\d+|Day \d+)/
    )
    if (subtaskMatch) {
      subtasks.push({
        id: `temp-sub-${subtaskMatch[1]}`, // Temp ID for subtasks too
        title: subtaskMatch[2].trim(),
        dueDate: subtaskMatch[3],
        status: 'not-started' as TaskStatus,
      })
    }
    i++
  }

  return { subtasks, endIndex: i - 1 }
}

export const parseGTMData = (
  content: string
): {
  phases: GTMPhase[]
  risks: GTMRisk[]
  ownerLegend: Record<string, string>
} => {
  const lines = content.split('\n')
  const phases: GTMPhase[] = []
  const risks: GTMRisk[] = []
  let currentPhase: GTMPhase | null = null

  const phaseColors = {
    0: {
      color: 'from-purple-500 to-indigo-600',
      bgGradient: 'from-purple-50 to-indigo-50',
    },
    1: {
      color: 'from-blue-500 to-cyan-600',
      bgGradient: 'from-blue-50 to-cyan-50',
    },
    2: {
      color: 'from-green-500 to-emerald-600',
      bgGradient: 'from-green-50 to-emerald-50',
    },
    3: {
      color: 'from-orange-500 to-red-600',
      bgGradient: 'from-orange-50 to-red-50',
    },
    4: {
      color: 'from-pink-500 to-rose-600',
      bgGradient: 'from-pink-50 to-rose-50',
    },
  }

  // Parse owner legend
  const ownerLegend: Record<string, string> = {
    PM: 'Growth PM',
    BE: 'Backend dev',
    CR: 'Creative',
    HC: 'Host/Creator',
  }

  let inRiskSection = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Check if we're in the risks section
    if (line.includes('OPEN QUESTIONS / RISKS')) {
      inRiskSection = true
      continue
    }

    // Parse phase headers
    const phaseMatch = line.match(/PHASE (\d+)\s*•\s*(.+?)\s*\((.+?)\)/)
    if (phaseMatch) {
      if (currentPhase) {
        phases.push(currentPhase)
      }
      const phaseNum = parseInt(phaseMatch[1])
      currentPhase = {
        id: phaseNum,
        title: `Phase ${phaseNum}`,
        subtitle: phaseMatch[2].trim(),
        dateRange: phaseMatch[3],
        color: phaseColors[phaseNum]?.color || 'from-gray-500 to-gray-600',
        bgGradient:
          phaseColors[phaseNum]?.bgGradient || 'from-gray-50 to-gray-100',
        tasks: [],
        progress: 0,
        hasMilestone: line.includes('M/V: ●'),
      }
      continue
    }

    // Parse tasks
    if (!inRiskSection) {
      const owner = parseOwner(line)
      const taskNumber = parseTaskNumber(line)
      if (owner && taskNumber && currentPhase) {
        const dependencies = parseDependencies(lines, i)
        const task: GTMTask = {
          id: `temp-${taskNumber}`, // Use temp ID, will be replaced by DB UUID
          phase: currentPhase.id,
          phaseTitle: currentPhase.subtitle,
          taskNumber,
          title: parseTaskTitle(line),
          owner,
          dueDate: parseDueDate(line),
          dependencies,
          status: 'not-started',
          isMilestone: line.includes('●'),
          priority:
            taskNumber.endsWith('.1') || taskNumber.endsWith('.2')
              ? 'high'
              : 'medium',
        }

        // Check for subtasks
        if (i + 1 < lines.length && lines[i + 1].match(/^\s+[a-z]\)/)) {
          const { subtasks, endIndex } = parseSubtasks(lines, i)
          task.subtasks = subtasks
          i = endIndex
          console.log(
            `📋 Task ${taskNumber} has ${subtasks.length} subtasks:`,
            subtasks.map((s) => s.title)
          )
        }

        currentPhase.tasks.push(task)
      }
    }

    // Parse risks/questions
    if (inRiskSection && line.includes('(?)')) {
      const riskMatch = line.match(/\(\?\)\s*(.+?)(?:\?\s*Decide by\s+(.+))?$/)
      if (riskMatch) {
        risks.push({
          id: `risk-${risks.length + 1}`,
          question: riskMatch[1].trim().replace(/\?$/, ''),
          dueDate: riskMatch[2] || '',
          status: 'open',
        })
      }
    }
  }

  if (currentPhase) {
    phases.push(currentPhase)
  }

  // Calculate progress for each phase
  phases.forEach((phase) => {
    const completed = phase.tasks.filter((t) => t.status === 'completed').length
    phase.progress =
      phase.tasks.length > 0 ? (completed / phase.tasks.length) * 100 : 0
  })

  return { phases, risks, ownerLegend }
}

export const loadGTMFile = async (): Promise<string> => {
  try {
    // In a real implementation, this would read from the file system
    // For now, we'll return the content that should be loaded
    const response = await fetch('/gtm.MD')
    if (!response.ok) {
      throw new Error('Failed to load GTM file')
    }
    return await response.text()
  } catch (error) {
    console.error('Error loading GTM file:', error)
    // Return empty string if file not found
    return ''
  }
}
