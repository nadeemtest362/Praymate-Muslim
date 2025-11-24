import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { UnifiedModelSelectorV2 } from './unified-model-selector-v2'

interface ModelSelectorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  actionId?: string
  actionName?: string
  selectedModelId?: string
  selectedProvider?: 'openrouter' | 'replicate'
  onModelSelect: (modelId: string, provider: 'openrouter' | 'replicate') => void
}

export function ModelSelectorDialog({
  open,
  onOpenChange,
  actionId,
  actionName,
  selectedModelId,
  selectedProvider,
  onModelSelect,
}: ModelSelectorDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex max-h-[80vh] flex-col overflow-hidden sm:max-w-[600px]'>
        <DialogHeader>
          <DialogTitle>Choose AI Model</DialogTitle>
          <DialogDescription>
            Select the best model for {actionName || 'this action'}
          </DialogDescription>
        </DialogHeader>

        <div className='flex-1 overflow-hidden'>
          <UnifiedModelSelectorV2
            actionId={actionId}
            selectedModelId={selectedModelId}
            selectedProvider={selectedProvider}
            onModelSelect={(modelId, provider) => {
              onModelSelect(modelId, provider)
              onOpenChange(false) // Close on selection
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
