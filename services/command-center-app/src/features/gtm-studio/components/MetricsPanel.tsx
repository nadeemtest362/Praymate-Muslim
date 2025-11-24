import { motion } from 'framer-motion'
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Target,
  TrendingUp,
  Activity,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { GTMMetrics } from '../types'

interface MetricsPanelProps {
  metrics: GTMMetrics
}

export const MetricsPanel = ({ metrics }: MetricsPanelProps) => {
  const cards = [
    {
      title: 'Total Progress',
      value: `${Math.round((metrics.completedTasks / metrics.totalTasks) * 100)}%`,
      subtitle: `${metrics.completedTasks} of ${metrics.totalTasks} tasks`,
      icon: TrendingUp,
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'from-blue-50 to-cyan-50',
    },
    {
      title: 'In Progress',
      value: metrics.inProgressTasks,
      subtitle: 'Active tasks',
      icon: Clock,
      color: 'from-amber-500 to-orange-500',
      bgColor: 'from-amber-50 to-orange-50',
    },
    {
      title: 'Blocked',
      value: metrics.blockedTasks,
      subtitle: 'Need attention',
      icon: AlertCircle,
      color: 'from-red-500 to-pink-500',
      bgColor: 'from-red-50 to-pink-50',
    },
    {
      title: 'Milestones',
      value: metrics.upcomingMilestones,
      subtitle: 'Upcoming',
      icon: Target,
      color: 'from-purple-500 to-indigo-500',
      bgColor: 'from-purple-50 to-indigo-50',
    },
  ]

  return (
    <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4'>
      {cards.map((card, index) => (
        <motion.div
          key={card.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card className='relative overflow-hidden border-0 shadow-lg'>
            {/* Background gradient */}
            <div
              className={cn(
                'absolute inset-0 bg-gradient-to-br opacity-10',
                card.bgColor
              )}
            />

            {/* Glass effect */}
            <div className='absolute inset-0 bg-white/50 backdrop-blur-sm' />

            <div className='relative p-6'>
              <div className='flex items-start justify-between'>
                <div>
                  <p className='text-sm font-medium text-gray-600'>
                    {card.title}
                  </p>
                  <p
                    className={cn(
                      'mt-2 bg-gradient-to-r bg-clip-text text-3xl font-bold text-transparent',
                      card.color
                    )}
                  >
                    {card.value}
                  </p>
                  <p className='mt-1 text-xs text-gray-500'>{card.subtitle}</p>
                </div>
                <div
                  className={cn(
                    'rounded-xl bg-gradient-to-br p-3',
                    card.bgColor
                  )}
                >
                  <card.icon
                    className={cn(
                      'h-6 w-6 bg-gradient-to-br bg-clip-text',
                      card.color.replace('from-', 'text-').split(' ')[0]
                    )}
                  />
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}
