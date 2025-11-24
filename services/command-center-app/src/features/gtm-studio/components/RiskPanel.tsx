import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  CheckCircle,
  MessageSquare,
  Calendar,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { GTMRisk } from '../types'

interface RiskPanelProps {
  risks: GTMRisk[]
  onRiskDecision: (riskId: string, decision: string) => void
}

export const RiskPanel = ({ risks, onRiskDecision }: RiskPanelProps) => {
  const [editingRisk, setEditingRisk] = useState<string | null>(null)
  const [decision, setDecision] = useState('')

  const handleSubmit = (riskId: string) => {
    onRiskDecision(riskId, decision)
    setEditingRisk(null)
    setDecision('')
  }

  const openRisks = risks.filter((r) => r.status === 'open')
  const resolvedRisks = risks.filter((r) => r.status === 'resolved')

  return (
    <Card className='relative overflow-hidden border-0 shadow-lg'>
      {/* Background gradient */}
      <div className='absolute inset-0 bg-gradient-to-br from-red-50 to-orange-50 opacity-50' />

      {/* Glass effect */}
      <div className='absolute inset-0 bg-white/70 backdrop-blur-sm' />

      <div className='relative p-6'>
        <div className='mb-6 flex items-center gap-2'>
          <div className='rounded-lg bg-red-100 p-2'>
            <AlertTriangle className='h-5 w-5 text-red-600' />
          </div>
          <h3 className='text-lg font-semibold'>Decisions & Risks</h3>
          <Badge variant='secondary' className='ml-auto'>
            {openRisks.length} Open
          </Badge>
        </div>

        <div className='space-y-4'>
          {/* Open risks */}
          {openRisks.map((risk, index) => (
            <motion.div
              key={risk.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                'rounded-lg border bg-white/80 p-4',
                'transition-all duration-200 hover:shadow-md'
              )}
            >
              <div className='flex items-start gap-3'>
                <AlertTriangle className='mt-0.5 h-5 w-5 text-amber-500' />
                <div className='flex-1 space-y-2'>
                  <p className='text-sm font-medium text-gray-900'>
                    {risk.question}
                  </p>
                  {risk.dueDate && (
                    <div className='flex items-center gap-1 text-xs text-gray-500'>
                      <Calendar className='h-3 w-3' />
                      {risk.dueDate}
                    </div>
                  )}

                  {editingRisk === risk.id ? (
                    <div className='mt-3 space-y-2'>
                      <Textarea
                        value={decision}
                        onChange={(e) => setDecision(e.target.value)}
                        placeholder='Enter your decision...'
                        className='min-h-[80px]'
                      />
                      <div className='flex gap-2'>
                        <Button
                          size='sm'
                          onClick={() => handleSubmit(risk.id)}
                          className='bg-gradient-to-r from-green-500 to-emerald-500'
                        >
                          Resolve
                        </Button>
                        <Button
                          size='sm'
                          variant='outline'
                          onClick={() => {
                            setEditingRisk(null)
                            setDecision('')
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      size='sm'
                      variant='outline'
                      onClick={() => {
                        setEditingRisk(risk.id)
                        setDecision('')
                      }}
                      className='mt-2'
                    >
                      <MessageSquare className='mr-1 h-3 w-3' />
                      Add Decision
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}

          {/* Resolved risks */}
          {resolvedRisks.length > 0 && (
            <>
              <div className='mt-6 border-t pt-4'>
                <h4 className='mb-3 text-sm font-medium text-gray-600'>
                  Resolved
                </h4>
              </div>
              {resolvedRisks.map((risk) => (
                <div
                  key={risk.id}
                  className='rounded-lg border border-green-200/50 bg-green-50/50 p-3'
                >
                  <div className='flex items-start gap-3'>
                    <CheckCircle className='mt-0.5 h-4 w-4 text-green-600' />
                    <div className='flex-1 space-y-1'>
                      <p className='text-sm text-gray-700'>{risk.question}</p>
                      {risk.decision && (
                        <p className='text-xs text-gray-600 italic'>
                          Decision: {risk.decision}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </Card>
  )
}
