import React from 'react'
import { Zap, Brain, Sparkles, DollarSign, Info, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  OPENROUTER_MODELS,
  getRecommendedModel,
} from '../services/openrouter-service'

interface ModelSelectorProps {
  actionId?: string
  selectedModelId?: string
  onModelSelect: (modelId: string) => void
  showCosts?: boolean
}

const categoryIcons = {
  fast: Zap,
  balanced: Brain,
  premium: Sparkles,
  specialized: Info,
}

const categoryColors = {
  fast: 'from-green-500/10 to-emerald-500/10 border-green-500/20',
  balanced: 'from-blue-500/10 to-cyan-500/10 border-blue-500/20',
  premium: 'from-purple-500/10 to-pink-500/10 border-purple-500/20',
  specialized: 'from-orange-500/10 to-amber-500/10 border-orange-500/20',
}

export function ModelSelector({
  actionId,
  selectedModelId,
  onModelSelect,
  showCosts = true,
}: ModelSelectorProps) {
  // Get recommended model if action is provided
  const recommendedModel = actionId ? getRecommendedModel(actionId) : null

  return (
    <div className='space-y-4'>
      <div className='space-y-2'>
        <Label className='text-sm font-medium'>AI Model</Label>
        <p className='text-muted-foreground text-xs'>
          Choose the AI model for this action
        </p>
      </div>

      {recommendedModel && (
        <div className='bg-primary/5 border-primary/20 rounded-lg border p-3'>
          <div className='flex items-center gap-2 text-sm'>
            <Badge variant='outline' className='gap-1'>
              <Check className='h-3 w-3' />
              Recommended
            </Badge>
            <span className='font-medium'>{recommendedModel.name}</span>
            <span className='text-muted-foreground'>for this task type</span>
          </div>
        </div>
      )}

      <div className='space-y-3'>
        {Object.entries(OPENROUTER_MODELS).map(([category, models]) => {
          const Icon = categoryIcons[category as keyof typeof categoryIcons]
          const colorClass =
            categoryColors[category as keyof typeof categoryColors]

          return (
            <div key={category} className='space-y-2'>
              <div className='text-muted-foreground flex items-center gap-2 text-xs uppercase'>
                <Icon className='h-3 w-3' />
                <span>{category} Models</span>
              </div>

              <div className='grid gap-2'>
                {models.map((model) => {
                  const isSelected = selectedModelId === model.id
                  const isRecommended = recommendedModel?.id === model.id

                  return (
                    <Card
                      key={model.id}
                      className={cn(
                        'cursor-pointer transition-all',
                        colorClass,
                        isSelected
                          ? 'ring-primary ring-2'
                          : 'hover:border-primary/50'
                      )}
                      onClick={() => onModelSelect(model.id)}
                    >
                      <CardContent className='p-3'>
                        <div className='flex items-start justify-between gap-3'>
                          <div className='flex-1 space-y-1'>
                            <div className='flex items-center gap-2'>
                              <h4 className='text-sm font-medium'>
                                {model.name}
                              </h4>
                              {isRecommended && (
                                <Badge
                                  variant='outline'
                                  className='h-5 text-xs'
                                >
                                  Recommended
                                </Badge>
                              )}
                            </div>
                            <p className='text-muted-foreground text-xs'>
                              {model.description}
                            </p>
                            <div className='flex items-center gap-3 text-xs'>
                              <span className='text-muted-foreground'>
                                by {model.provider}
                              </span>
                              {showCosts && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className='text-muted-foreground flex items-center gap-1'>
                                        <DollarSign className='h-3 w-3' />
                                        <span>${model.costPer1M}/M tokens</span>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Cost per 1 million tokens</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </div>
                          </div>
                          {isSelected && (
                            <div className='bg-primary text-primary-foreground rounded-full p-1'>
                              <Check className='h-3 w-3' />
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {showCosts && (
        <div className='bg-muted/50 border-muted rounded-lg border p-3'>
          <div className='flex items-start gap-2 text-xs'>
            <Info className='text-muted-foreground mt-0.5 h-3 w-3' />
            <div className='text-muted-foreground space-y-1'>
              <p>
                <span className='font-medium'>Fast models</span> are best for
                simple tasks like formatting or basic analysis.
              </p>
              <p>
                <span className='font-medium'>Balanced models</span> handle most
                workflow tasks effectively.
              </p>
              <p>
                <span className='font-medium'>Premium models</span> excel at
                complex reasoning and creative tasks.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
