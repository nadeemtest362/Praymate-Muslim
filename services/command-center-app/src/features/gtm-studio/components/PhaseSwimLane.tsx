import { motion } from 'framer-motion'
import { Target, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Progress } from '@/components/ui/progress'
import { GTMPhase } from '../types'
import { TaskCard } from './TaskCard'

interface PhaseSwimLaneProps {
  phase: GTMPhase
  onTaskStatusChange: (taskId: string, status: any) => void
  onTaskNotesUpdate: (taskId: string, notes: string) => void
  onTaskClick: (task: any) => void
}

export const PhaseSwimLane = ({
  phase,
  onTaskStatusChange,
  onTaskNotesUpdate,
  onTaskClick,
}: PhaseSwimLaneProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: phase.id * 0.1 }}
      className='relative'
    >
      {/* Phase background gradient */}
      <div
        className={cn(
          'absolute inset-0 rounded-2xl bg-gradient-to-r opacity-5',
          phase.color
        )}
      />

      <div className='relative space-y-4 rounded-2xl border bg-white/50 p-6 backdrop-blur-sm'>
        {/* Phase header */}
        <div className='flex items-start justify-between'>
          <div className='space-y-1'>
            <div className='flex items-center gap-2'>
              <h2
                className={cn(
                  'bg-gradient-to-r bg-clip-text text-2xl font-bold text-transparent',
                  phase.color
                )}
              >
                {phase.title}
              </h2>
              {phase.hasMilestone && (
                <Target className='h-5 w-5 text-purple-500' />
              )}
            </div>
            <p className='text-gray-600'>{phase.subtitle}</p>
            <p className='text-sm text-gray-500'>{phase.dateRange}</p>
          </div>

          <div className='text-right'>
            <div className='mb-1 flex items-center gap-2'>
              <TrendingUp className='h-4 w-4 text-gray-500' />
              <span className='text-2xl font-bold text-gray-900'>
                {Math.round(phase.progress)}%
              </span>
            </div>
            <Progress value={phase.progress} className='h-2 w-32' />
          </div>
        </div>

        {/* Tasks grid */}
        <div className='grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3'>
          {phase.tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onStatusChange={onTaskStatusChange}
              onNotesUpdate={onTaskNotesUpdate}
              onClick={() => onTaskClick(task)}
            />
          ))}
        </div>
      </div>
    </motion.div>
  )
}
