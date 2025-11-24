import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  User,
  Calendar,
  Flag,
  MessageSquare,
  Link2,
  Target,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Textarea } from '@/components/ui/textarea'
import { GTMTask, TaskStatus } from '../types'

interface TaskCardProps {
  task: GTMTask
  onStatusChange: (taskId: string, status: TaskStatus) => void
  onNotesUpdate: (taskId: string, notes: string) => void
  onClick: () => void
}

const statusIcons = {
  'not-started': Circle,
  'in-progress': Clock,
  completed: CheckCircle2,
  blocked: AlertCircle,
}

const statusColors = {
  'not-started': 'text-gray-400',
  'in-progress': 'text-blue-500',
  completed: 'text-green-500',
  blocked: 'text-red-500',
}

const ownerColors = {
  PM: 'bg-purple-100 text-purple-700 border-purple-200',
  BE: 'bg-blue-100 text-blue-700 border-blue-200',
  CR: 'bg-orange-100 text-orange-700 border-orange-200',
  HC: 'bg-pink-100 text-pink-700 border-pink-200',
}

const priorityColors = {
  critical: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-gray-100 text-gray-700',
}

export const TaskCard = ({
  task,
  onStatusChange,
  onNotesUpdate,
  onClick,
}: TaskCardProps) => {
  const [showNotes, setShowNotes] = useState(false)
  const [notes, setNotes] = useState(task.notes || '')
  const StatusIcon = statusIcons[task.status]

  const handleStatusClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    const statusOrder: TaskStatus[] = [
      'not-started',
      'in-progress',
      'completed',
      'blocked',
    ]
    const currentIndex = statusOrder.indexOf(task.status)
    const nextIndex = (currentIndex + 1) % statusOrder.length
    onStatusChange(task.id, statusOrder[nextIndex])
  }

  const handleNotesSubmit = () => {
    onNotesUpdate(task.id, notes)
    setShowNotes(false)
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ scale: 1.02 }}
      className={cn(
        'group relative cursor-pointer rounded-xl border bg-white/80 p-4 backdrop-blur-sm',
        'transition-all duration-200 hover:shadow-lg',
        task.status === 'completed' && 'opacity-75',
        task.isMilestone &&
          'border-2 border-purple-300 bg-gradient-to-r from-purple-50 to-pink-50'
      )}
      onClick={onClick}
    >
      {/* Glass effect overlay */}
      <div className='pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-br from-white/50 to-transparent' />

      <div className='relative space-y-3'>
        {/* Header */}
        <div className='flex items-start justify-between gap-2'>
          <div className='flex flex-1 items-start gap-3'>
            <button
              onClick={handleStatusClick}
              className={cn(
                'mt-0.5 transition-colors',
                statusColors[task.status]
              )}
            >
              <StatusIcon className='h-5 w-5' />
            </button>

            <div className='flex-1'>
              <div className='mb-1 flex items-center gap-2'>
                <span className='font-mono text-xs text-gray-500'>
                  {task.taskNumber}
                </span>
                {task.isMilestone && (
                  <Target className='h-4 w-4 text-purple-500' />
                )}
              </div>
              <h3
                className={cn(
                  'font-medium text-gray-900',
                  task.status === 'completed' && 'text-gray-500 line-through'
                )}
              >
                {task.title}
              </h3>
            </div>
          </div>

          {/* Priority badge */}
          {task.priority && (
            <Badge
              variant='secondary'
              className={cn('text-xs', priorityColors[task.priority])}
            >
              {task.priority}
            </Badge>
          )}
        </div>

        {/* Subtasks */}
        {task.subtasks && task.subtasks.length > 0 && (
          <div className='ml-8 space-y-1'>
            {task.subtasks.map((subtask) => (
              <div
                key={subtask.id}
                className='flex items-center gap-2 text-sm text-gray-600'
              >
                <span className='font-mono text-xs'>{subtask.id})</span>
                <span
                  className={cn(
                    subtask.status === 'completed' && 'line-through'
                  )}
                >
                  {subtask.title}
                </span>
                <span className='text-xs text-gray-400'>{subtask.dueDate}</span>
              </div>
            ))}
          </div>
        )}

        {/* Metadata */}
        <div className='flex items-center gap-4 text-xs'>
          <Badge
            variant='outline'
            className={cn('gap-1', ownerColors[task.owner])}
          >
            <User className='h-3 w-3' />
            {task.owner}
          </Badge>

          <div className='flex items-center gap-1 text-gray-500'>
            <Calendar className='h-3 w-3' />
            {task.dueDate}
          </div>

          {task.dependencies.length > 0 && (
            <div className='flex items-center gap-1 text-gray-500'>
              <Link2 className='h-3 w-3' />
              {task.dependencies.join(', ')}
            </div>
          )}

          <Popover open={showNotes} onOpenChange={setShowNotes}>
            <PopoverTrigger asChild>
              <Button
                size='sm'
                variant='ghost'
                className='ml-auto h-6 px-2'
                onClick={(e) => {
                  e.stopPropagation()
                }}
              >
                <MessageSquare
                  className={cn('h-3 w-3', task.notes && 'fill-current')}
                />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className='w-80'
              onClick={(e) => e.stopPropagation()}
            >
              <div className='space-y-2'>
                <h4 className='text-sm font-medium'>Task Notes</h4>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder='Add notes...'
                  className='min-h-[100px]'
                />
                <Button
                  size='sm'
                  onClick={handleNotesSubmit}
                  className='w-full'
                >
                  Save Notes
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </motion.div>
  )
}
