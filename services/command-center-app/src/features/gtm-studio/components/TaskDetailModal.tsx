import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  User,
  Calendar,
  Link2,
  Target,
  MessageSquare,
  CheckSquare,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { GTMTask, TaskStatus } from '../types'

interface TaskDetailModalProps {
  task: GTMTask | null
  isOpen: boolean
  onClose: () => void
  onStatusChange: (taskId: string, status: TaskStatus) => void
  onNotesUpdate: (taskId: string, notes: string) => void
}

const statusOptions: { value: TaskStatus; label: string; color: string }[] = [
  {
    value: 'not-started',
    label: 'Not Started',
    color: 'bg-gray-100 text-gray-700',
  },
  {
    value: 'in-progress',
    label: 'In Progress',
    color: 'bg-blue-100 text-blue-700',
  },
  {
    value: 'completed',
    label: 'Completed',
    color: 'bg-green-100 text-green-700',
  },
  { value: 'blocked', label: 'Blocked', color: 'bg-red-100 text-red-700' },
]

export const TaskDetailModal = ({
  task,
  isOpen,
  onClose,
  onStatusChange,
  onNotesUpdate,
}: TaskDetailModalProps) => {
  const [notes, setNotes] = useState(task?.notes || '')
  const [isEditingNotes, setIsEditingNotes] = useState(false)

  if (!task) return null

  const handleNotesSubmit = () => {
    onNotesUpdate(task.id, notes)
    setIsEditingNotes(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='max-w-2xl'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-3'>
            <span className='font-mono text-sm text-gray-500'>
              {task.taskNumber}
            </span>
            {task.isMilestone && <Target className='h-5 w-5 text-purple-500' />}
            <span className='text-xl'>{task.title}</span>
          </DialogTitle>
        </DialogHeader>

        <div className='space-y-6 pt-4'>
          {/* Status selector */}
          <div>
            <label className='mb-2 block text-sm font-medium text-gray-700'>
              Status
            </label>
            <div className='flex gap-2'>
              {statusOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={task.status === option.value ? 'default' : 'outline'}
                  size='sm'
                  onClick={() => onStatusChange(task.id, option.value)}
                  className={cn(task.status === option.value && option.color)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Metadata */}
          <div className='grid grid-cols-2 gap-4'>
            <div className='flex items-center gap-2 text-sm'>
              <User className='h-4 w-4 text-gray-400' />
              <span className='text-gray-600'>Owner:</span>
              <Badge variant='outline'>{task.owner}</Badge>
            </div>
            <div className='flex items-center gap-2 text-sm'>
              <Calendar className='h-4 w-4 text-gray-400' />
              <span className='text-gray-600'>Due:</span>
              <span className='font-medium'>{task.dueDate}</span>
            </div>
            {task.dependencies.length > 0 && (
              <div className='col-span-2 flex items-center gap-2 text-sm'>
                <Link2 className='h-4 w-4 text-gray-400' />
                <span className='text-gray-600'>Dependencies:</span>
                <span className='font-medium'>
                  {task.dependencies.join(', ')}
                </span>
              </div>
            )}
          </div>

          {/* Subtasks */}
          {task.subtasks && task.subtasks.length > 0 && (
            <div>
              <h4 className='mb-2 flex items-center gap-2 text-sm font-medium text-gray-700'>
                <CheckSquare className='h-4 w-4' />
                Subtasks
              </h4>
              <div className='space-y-2'>
                {task.subtasks.map((subtask) => (
                  <div
                    key={subtask.id}
                    className='flex items-center gap-3 rounded-lg bg-gray-50 p-2'
                  >
                    <span className='font-mono text-xs text-gray-500'>
                      {subtask.id})
                    </span>
                    <span
                      className={cn(
                        'flex-1 text-sm',
                        subtask.status === 'completed' &&
                          'text-gray-500 line-through'
                      )}
                    >
                      {subtask.title}
                    </span>
                    <span className='text-xs text-gray-500'>
                      {subtask.dueDate}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <h4 className='mb-2 flex items-center gap-2 text-sm font-medium text-gray-700'>
              <MessageSquare className='h-4 w-4' />
              Notes
            </h4>
            {isEditingNotes ? (
              <div className='space-y-2'>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder='Add notes about this task...'
                  className='min-h-[120px]'
                />
                <div className='flex gap-2'>
                  <Button size='sm' onClick={handleNotesSubmit}>
                    Save Notes
                  </Button>
                  <Button
                    size='sm'
                    variant='outline'
                    onClick={() => {
                      setIsEditingNotes(false)
                      setNotes(task.notes || '')
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => setIsEditingNotes(true)}
                className='min-h-[80px] cursor-pointer rounded-lg bg-gray-50 p-3 transition-colors hover:bg-gray-100'
              >
                {task.notes ? (
                  <p className='text-sm whitespace-pre-wrap text-gray-700'>
                    {task.notes}
                  </p>
                ) : (
                  <p className='text-sm text-gray-400'>Click to add notes...</p>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
