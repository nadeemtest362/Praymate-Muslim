import React from 'react'
import { SimpleWorkflowBuilder } from './components/simple-workflow-builder'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Wand2 } from 'lucide-react'

export function GTMStudioV6() {
  return (
    <div className='container mx-auto space-y-6 p-6'>
      <div className='space-y-2'>
        <h1 className='text-3xl font-bold tracking-tight'>GTM Studio</h1>
        <p className='text-muted-foreground'>
          One-click content generation at scale. No configuration needed.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Wand2 className='h-5 w-5' />
            Smart Content Workflows
          </CardTitle>
        </CardHeader>
        <CardContent className='p-0'>
          <SimpleWorkflowBuilder />
        </CardContent>
      </Card>
    </div>
  )
}