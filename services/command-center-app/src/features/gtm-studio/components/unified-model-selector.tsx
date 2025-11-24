import React, { useState } from 'react'
import {
  Zap,
  Brain,
  Sparkles,
  DollarSign,
  Info,
  Check,
  Image,
  Video,
  Music,
  MessageSquare,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import {
  REPLICATE_MODELS,
  getRecommendedReplicateModel,
} from '../services/replicate-service'

interface UnifiedModelSelectorProps {
  actionId?: string
  selectedModelId?: string
  selectedProvider?: 'openrouter' | 'replicate'
  onModelSelect: (modelId: string, provider: 'openrouter' | 'replicate') => void
  showCosts?: boolean
}

const categoryIcons = {
  fast: Zap,
  balanced: Brain,
  premium: Sparkles,
  specialized: Info,
  image: Image,
  video: Video,
  audio: Music,
  language: MessageSquare,
}

const categoryColors = {
  fast: 'from-green-500/10 to-emerald-500/10 border-green-500/20',
  balanced: 'from-blue-500/10 to-cyan-500/10 border-blue-500/20',
  premium: 'from-purple-500/10 to-pink-500/10 border-purple-500/20',
  specialized: 'from-orange-500/10 to-amber-500/10 border-orange-500/20',
  image: 'from-violet-500/10 to-purple-500/10 border-violet-500/20',
  video: 'from-pink-500/10 to-rose-500/10 border-pink-500/20',
  audio: 'from-yellow-500/10 to-amber-500/10 border-yellow-500/20',
  language: 'from-indigo-500/10 to-blue-500/10 border-indigo-500/20',
}

export function UnifiedModelSelector({
  actionId,
  selectedModelId,
  selectedProvider = 'openrouter',
  onModelSelect,
  showCosts = true,
}: UnifiedModelSelectorProps) {
  const [activeTab, setActiveTab] = useState(selectedProvider)

  // Determine if action supports Replicate
  const action = actionId
    ? {
        supportsReplicate: [
          'generate-image',
          'create-video',
          'generate-audio',
        ].includes(actionId),
      }
    : { supportsReplicate: true }

  // Get recommended models
  const recommendedOpenRouter = actionId ? getRecommendedModel(actionId) : null
  const recommendedReplicate =
    actionId && action.supportsReplicate
      ? getRecommendedReplicateModel(actionId)
      : null

  return (
    <div className='space-y-4'>
      <div className='space-y-2'>
        <Label className='text-sm font-medium'>AI Model</Label>
        <p className='text-muted-foreground text-xs'>
          Choose the AI provider and model for this action
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className='grid w-full grid-cols-2'>
          <TabsTrigger value='openrouter'>
            <MessageSquare className='mr-2 h-4 w-4' />
            Language Models
          </TabsTrigger>
          {action.supportsReplicate && (
            <TabsTrigger value='replicate'>
              <Sparkles className='mr-2 h-4 w-4' />
              Media Models
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value='openrouter' className='mt-4 space-y-3'>
          {recommendedOpenRouter && (
            <div className='bg-primary/5 border-primary/20 rounded-lg border p-3'>
              <div className='flex items-center gap-2 text-sm'>
                <Badge variant='outline' className='gap-1'>
                  <Check className='h-3 w-3' />
                  Recommended
                </Badge>
                <span className='font-medium'>
                  {recommendedOpenRouter.name}
                </span>
                <span className='text-muted-foreground'>
                  for this task type
                </span>
              </div>
            </div>
          )}

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
                    const isSelected =
                      selectedModelId === model.id &&
                      selectedProvider === 'openrouter'
                    const isRecommended = recommendedOpenRouter?.id === model.id

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
                        onClick={() => onModelSelect(model.id, 'openrouter')}
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
                                          <span>
                                            ${model.costPer1M}/M tokens
                                          </span>
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
        </TabsContent>

        {action.supportsReplicate && (
          <TabsContent value='replicate' className='mt-4 space-y-3'>
            {recommendedReplicate && (
              <div className='bg-primary/5 border-primary/20 rounded-lg border p-3'>
                <div className='flex items-center gap-2 text-sm'>
                  <Badge variant='outline' className='gap-1'>
                    <Check className='h-3 w-3' />
                    Recommended
                  </Badge>
                  <span className='font-medium'>
                    {recommendedReplicate.name}
                  </span>
                  <span className='text-muted-foreground'>
                    for media generation
                  </span>
                </div>
              </div>
            )}

            {Object.entries(REPLICATE_MODELS).map(([category, models]) => {
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
                      const isSelected =
                        selectedModelId === model.id &&
                        selectedProvider === 'replicate'
                      const isRecommended =
                        recommendedReplicate?.id === model.id

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
                          onClick={() => onModelSelect(model.id, 'replicate')}
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
                                            <span>
                                              $
                                              {(model.costPer1K / 1000).toFixed(
                                                5
                                              )}
                                              /
                                              {model.type === 'text'
                                                ? 'token'
                                                : model.type}
                                            </span>
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>
                                            Cost per{' '}
                                            {model.type === 'text'
                                              ? 'token'
                                              : 'generation'}
                                          </p>
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
          </TabsContent>
        )}
      </Tabs>

      {showCosts && (
        <div className='bg-muted/50 border-muted rounded-lg border p-3'>
          <div className='flex items-start gap-2 text-xs'>
            <Info className='text-muted-foreground mt-0.5 h-3 w-3' />
            <div className='text-muted-foreground space-y-1'>
              {activeTab === 'openrouter' ? (
                <>
                  <p>
                    <span className='font-medium'>Language models</span> handle
                    text generation, analysis, and reasoning.
                  </p>
                  <p>
                    Most tasks use 500-2000 tokens, costing fractions of a cent.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    <span className='font-medium'>Media models</span> generate
                    images, videos, audio, and music.
                  </p>
                  <p>Costs are per generation, typically under $0.01.</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
