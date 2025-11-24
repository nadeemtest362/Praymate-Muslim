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
  Crown,
  Rocket,
  ChevronRight,
  Star,
  TrendingUp,
  ArrowRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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

const categoryConfig = {
  fast: {
    icon: Zap,
    gradient: 'from-green-500 to-emerald-600',
    badge:
      'bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20',
    glow: 'shadow-green-500/20',
  },
  balanced: {
    icon: Brain,
    gradient: 'from-blue-500 to-cyan-600',
    badge: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20',
    glow: 'shadow-blue-500/20',
  },
  premium: {
    icon: Crown,
    gradient: 'from-purple-500 to-pink-600',
    badge:
      'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20',
    glow: 'shadow-purple-500/20',
  },
  specialized: {
    icon: Rocket,
    gradient: 'from-orange-500 to-red-600',
    badge:
      'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20',
    glow: 'shadow-orange-500/20',
  },
  image: {
    icon: Image,
    gradient: 'from-violet-500 to-purple-600',
    badge:
      'bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20',
    glow: 'shadow-violet-500/20',
  },
  video: {
    icon: Video,
    gradient: 'from-pink-500 to-rose-600',
    badge: 'bg-pink-500/10 text-pink-700 dark:text-pink-300 border-pink-500/20',
    glow: 'shadow-pink-500/20',
  },
  audio: {
    icon: Music,
    gradient: 'from-yellow-500 to-orange-600',
    badge:
      'bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border-yellow-500/20',
    glow: 'shadow-yellow-500/20',
  },
  language: {
    icon: MessageSquare,
    gradient: 'from-indigo-500 to-purple-600',
    badge:
      'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20',
    glow: 'shadow-indigo-500/20',
  },
}

// Compact model card component
function ModelCard({
  model,
  category,
  isSelected,
  isRecommended,
  onClick,
  showCost = true,
}: any) {
  const config = categoryConfig[category as keyof typeof categoryConfig]
  const Icon = config.icon

  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative cursor-pointer rounded-lg border p-2 transition-all duration-200',
        'from-background to-muted/30 bg-gradient-to-br',
        isSelected
          ? `ring-primary ring-2 ${config.glow} border-primary/50 shadow-lg`
          : 'border-border hover:border-primary/50 hover:shadow-md',
        'hover:scale-[1.02] active:scale-[0.98]'
      )}
    >
      {/* Background gradient on hover */}
      <div
        className={cn(
          'absolute inset-0 rounded-lg bg-gradient-to-br opacity-0 transition-opacity group-hover:opacity-10',
          config.gradient
        )}
      />

      {/* Selected indicator */}
      {isSelected && (
        <div
          className={cn(
            'absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br',
            config.gradient
          )}
        >
          <Check className='h-3 w-3 text-white' />
        </div>
      )}

      {/* Content */}
      <div className='relative flex items-start gap-2'>
        {/* Icon */}
        <div
          className={cn(
            'shrink-0 rounded-md bg-gradient-to-br p-1.5 text-white',
            config.gradient,
            'shadow-lg'
          )}
        >
          <Icon className='h-3.5 w-3.5' />
        </div>

        {/* Text content */}
        <div className='min-w-0 flex-1'>
          <div className='mb-1 flex items-center gap-2'>
            <h4 className='truncate text-sm font-semibold'>{model.name}</h4>
            {isRecommended && (
              <Badge variant='secondary' className='h-5 gap-1 px-1.5 text-xs'>
                <Star className='h-3 w-3' />
                Best
              </Badge>
            )}
          </div>

          <p className='text-muted-foreground mb-2 line-clamp-1 text-xs'>
            {model.description}
          </p>

          <div className='flex items-center justify-between'>
            <span className='text-muted-foreground text-xs'>
              {model.provider}
            </span>
            {showCost && (
              <div className='flex items-center gap-1 text-xs font-medium'>
                <DollarSign className='text-muted-foreground h-3 w-3' />
                <span
                  className={
                    model.costPer1M === 0
                      ? 'text-green-600 dark:text-green-400'
                      : ''
                  }
                >
                  {model.costPer1M === 0
                    ? 'Free'
                    : `$${model.costPer1M || model.costPer1K}`}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Hover arrow */}
        <ChevronRight className='text-muted-foreground mt-3 h-4 w-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100' />
      </div>
    </div>
  )
}

export function UnifiedModelSelectorV2({
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
    <div className='space-y-2'>
      <div>
        <Label className='text-muted-foreground text-xs font-medium'>
          Select AI Model
        </Label>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className='w-full'>
        <TabsList className='grid h-9 w-full grid-cols-2'>
          <TabsTrigger value='openrouter' className='gap-1.5 text-xs'>
            <MessageSquare className='h-3.5 w-3.5' />
            Language
          </TabsTrigger>
          {action.supportsReplicate && (
            <TabsTrigger value='replicate' className='gap-1.5 text-xs'>
              <Sparkles className='h-3.5 w-3.5' />
              Media
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value='openrouter' className='mt-3'>
          <ScrollArea className='h-[200px] pr-3'>
            <div className='space-y-4'>
              {Object.entries(OPENROUTER_MODELS).map(([category, models]) => {
                const config =
                  categoryConfig[category as keyof typeof categoryConfig]
                const Icon = config.icon

                return (
                  <div key={category} className='space-y-2'>
                    {/* Category header */}
                    <div className='bg-background/95 sticky top-0 z-10 flex items-center gap-2 py-1 backdrop-blur'>
                      <div
                        className={cn(
                          'rounded bg-gradient-to-br p-1',
                          config.gradient
                        )}
                      >
                        <Icon className='h-3 w-3 text-white' />
                      </div>
                      <span className='text-xs font-medium tracking-wider uppercase'>
                        {category}
                      </span>
                      <Badge
                        variant='outline'
                        className={cn(
                          'ml-auto h-5 px-1.5 text-xs',
                          config.badge
                        )}
                      >
                        {models.length} models
                      </Badge>
                    </div>

                    {/* Model grid */}
                    <div className='grid gap-2'>
                      {models.map((model) => {
                        const isSelected =
                          selectedModelId === model.id &&
                          selectedProvider === 'openrouter'
                        const isRecommended =
                          recommendedOpenRouter?.id === model.id

                        return (
                          <ModelCard
                            key={model.id}
                            model={model}
                            category={category}
                            isSelected={isSelected}
                            isRecommended={isRecommended}
                            onClick={() =>
                              onModelSelect(model.id, 'openrouter')
                            }
                            showCost={showCosts}
                          />
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        </TabsContent>

        {action.supportsReplicate && (
          <TabsContent value='replicate' className='mt-3'>
            <ScrollArea className='h-[200px] pr-3'>
              <div className='space-y-4'>
                {Object.entries(REPLICATE_MODELS).map(([category, models]) => {
                  const config =
                    categoryConfig[category as keyof typeof categoryConfig]
                  const Icon = config.icon

                  return (
                    <div key={category} className='space-y-2'>
                      {/* Category header */}
                      <div className='bg-background/95 sticky top-0 z-10 flex items-center gap-2 py-1 backdrop-blur'>
                        <div
                          className={cn(
                            'rounded bg-gradient-to-br p-1',
                            config.gradient
                          )}
                        >
                          <Icon className='h-3 w-3 text-white' />
                        </div>
                        <span className='text-xs font-medium tracking-wider uppercase'>
                          {category}
                        </span>
                        <Badge
                          variant='outline'
                          className={cn(
                            'ml-auto h-5 px-1.5 text-xs',
                            config.badge
                          )}
                        >
                          {models.length} models
                        </Badge>
                      </div>

                      {/* Model grid */}
                      <div className='grid gap-2'>
                        {models.map((model) => {
                          const isSelected =
                            selectedModelId === model.id &&
                            selectedProvider === 'replicate'
                          const isRecommended =
                            recommendedReplicate?.id === model.id

                          return (
                            <ModelCard
                              key={model.id}
                              model={model}
                              category={category}
                              isSelected={isSelected}
                              isRecommended={isRecommended}
                              onClick={() =>
                                onModelSelect(model.id, 'replicate')
                              }
                              showCost={showCosts}
                            />
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
