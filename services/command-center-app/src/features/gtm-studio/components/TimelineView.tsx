import { motion } from 'framer-motion'
import { Target, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import { GTMPhase, GTMTask } from '../types'

interface TimelineViewProps {
  phases: GTMPhase[]
}

const getDayNumber = (dateStr: string): number => {
  if (dateStr.includes('D-')) {
    return -parseInt(dateStr.replace('D-', ''))
  } else if (dateStr.includes('Day ')) {
    const match = dateStr.match(/Day (\d+)/)
    return match ? parseInt(match[1]) : 0
  }
  return 0
}

export const TimelineView = ({ phases }: TimelineViewProps) => {
  // Calculate timeline range
  let minDay = 0
  let maxDay = 0

  phases.forEach((phase) => {
    phase.tasks.forEach((task) => {
      const day = getDayNumber(task.dueDate)
      minDay = Math.min(minDay, day)
      maxDay = Math.max(maxDay, day)
    })
  })

  const totalDays = maxDay - minDay
  const dayWidth = 100 / (totalDays || 1)

  // Group tasks by owner
  const tasksByOwner: Record<string, GTMTask[]> = {
    PM: [],
    BE: [],
    CR: [],
    HC: [],
  }

  phases.forEach((phase) => {
    phase.tasks.forEach((task) => {
      if (tasksByOwner[task.owner]) {
        tasksByOwner[task.owner].push(task)
      }
    })
  })

  const ownerColors = {
    PM: 'from-purple-400 to-purple-600',
    BE: 'from-blue-400 to-blue-600',
    CR: 'from-orange-400 to-orange-600',
    HC: 'from-pink-400 to-pink-600',
  }

  return (
    <div className='relative overflow-x-auto rounded-2xl border bg-white/80 p-6 backdrop-blur-sm'>
      <h3 className='mb-6 flex items-center gap-2 text-lg font-semibold'>
        <Calendar className='h-5 w-5' />
        Timeline View
      </h3>

      {/* Timeline header */}
      <div className='mb-8 flex min-w-[800px] items-center'>
        <div className='w-20 text-sm font-medium text-gray-600'>Owner</div>
        <div className='relative h-12 flex-1'>
          {/* Day markers */}
          {Array.from({ length: Math.ceil(totalDays / 7) + 1 }).map(
            (_, weekIndex) => {
              const day = minDay + weekIndex * 7
              return (
                <div
                  key={weekIndex}
                  className='absolute top-0 flex flex-col items-center'
                  style={{ left: `${((day - minDay) / totalDays) * 100}%` }}
                >
                  <div className='h-3 w-px bg-gray-300' />
                  <span className='mt-1 text-xs text-gray-500'>
                    {day === 0 ? 'Launch' : day < 0 ? `D${day}` : `Day ${day}`}
                  </span>
                </div>
              )
            }
          )}
        </div>
      </div>

      {/* Swimlanes by owner */}
      {Object.entries(tasksByOwner).map(([owner, tasks], index) => (
        <motion.div
          key={owner}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className='mb-4 flex min-w-[800px] items-center'
        >
          <div className='w-20'>
            <span
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium',
                'bg-gradient-to-r text-white',
                ownerColors[owner as keyof typeof ownerColors]
              )}
            >
              {owner}
            </span>
          </div>

          <div className='relative h-16 flex-1'>
            {/* Background line */}
            <div className='absolute inset-y-1/2 right-0 left-0 h-px bg-gray-200' />

            {/* Tasks */}
            {tasks.map((task) => {
              const day = getDayNumber(task.dueDate)
              const position = ((day - minDay) / totalDays) * 100

              return (
                <motion.div
                  key={task.id}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  whileHover={{ scale: 1.2, zIndex: 10 }}
                  className='absolute top-1/2 -translate-y-1/2'
                  style={{ left: `${position}%` }}
                >
                  <div className='group relative'>
                    <div
                      className={cn(
                        'h-4 w-4 cursor-pointer rounded-full',
                        'bg-gradient-to-r shadow-lg',
                        ownerColors[owner as keyof typeof ownerColors],
                        task.isMilestone && 'h-6 w-6 ring-4 ring-white'
                      )}
                    >
                      {task.isMilestone && (
                        <Target className='absolute inset-0 m-auto h-3 w-3 text-white' />
                      )}
                    </div>

                    {/* Tooltip */}
                    <div className='pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 opacity-0 transition-opacity group-hover:opacity-100'>
                      <div className='rounded-lg bg-gray-900 px-3 py-2 text-xs whitespace-nowrap text-white'>
                        <p className='font-medium'>
                          {task.taskNumber}: {task.title}
                        </p>
                        <p className='text-gray-300'>{task.dueDate}</p>
                      </div>
                      <div className='absolute top-full left-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-gray-900' />
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      ))}

      {/* Phase indicators */}
      <div className='mt-8 border-t pt-4'>
        <div className='flex min-w-[800px] items-center justify-between'>
          {phases.map((phase) => {
            const phaseStart = getDayNumber(
              phase.dateRange.split(' to ')[0] || ''
            )
            const position = ((phaseStart - minDay) / totalDays) * 100

            return (
              <div
                key={phase.id}
                className='text-center'
                style={{ left: `${position}%`, position: 'absolute' }}
              >
                <div
                  className={cn(
                    'rounded-full bg-gradient-to-r px-3 py-1 text-xs font-medium text-white',
                    phase.color
                  )}
                >
                  {phase.title}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
