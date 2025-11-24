import { useState } from 'react'
import { motion } from 'framer-motion'
import { Search, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface ScreenPickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (screenId: string) => void
  screens: any[]
}

export function ScreenPicker({
  open,
  onOpenChange,
  onSelect,
  screens,
}: ScreenPickerProps) {
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  // Group screens by category
  const categories = screens.reduce(
    (acc, screen) => {
      if (!acc[screen.category]) acc[screen.category] = []
      acc[screen.category].push(screen)
      return acc
    },
    {} as Record<string, typeof screens>
  )

  // Filter screens based on search
  const filteredScreens = search
    ? screens.filter(
        (s) =>
          s.name.toLowerCase().includes(search.toLowerCase()) ||
          s.description?.toLowerCase().includes(search.toLowerCase())
      )
    : selectedCategory
      ? categories[selectedCategory] || []
      : screens

  const handleSelect = (screenId: string) => {
    onSelect(screenId)
    onOpenChange(false)
    setSearch('')
    setSelectedCategory(null)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[80vh] max-w-4xl'>
        <DialogHeader>
          <DialogTitle>Add Screen</DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className='relative'>
          <Search className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2' />
          <Input
            placeholder='Search screens...'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className='pl-10'
          />
        </div>

        {/* Categories */}
        <Tabs
          value={selectedCategory || 'all'}
          onValueChange={(v) => setSelectedCategory(v === 'all' ? null : v)}
        >
          <TabsList className='grid w-full grid-cols-5'>
            <TabsTrigger value='all'>All</TabsTrigger>
            {Object.keys(categories)
              .slice(0, 4)
              .map((cat) => (
                <TabsTrigger key={cat} value={cat} className='capitalize'>
                  {cat}
                </TabsTrigger>
              ))}
          </TabsList>

          <ScrollArea className='mt-4 h-[400px]'>
            <div className='grid grid-cols-2 gap-3 pr-4'>
              {filteredScreens.map((screen, index) => (
                <motion.div
                  key={screen.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                >
                  <Button
                    variant='outline'
                    className='hover:border-primary group h-auto w-full justify-start p-4 transition-all'
                    onClick={() => handleSelect(screen.id)}
                  >
                    <div className='flex w-full items-start gap-3'>
                      <div
                        className={cn(
                          'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-lg transition-transform group-hover:scale-110',
                          screen.color
                        )}
                      >
                        {screen.emoji}
                      </div>
                      <div className='flex-1 text-left'>
                        <p className='text-sm font-medium'>{screen.name}</p>
                        <p className='text-muted-foreground mt-1 line-clamp-2 text-xs'>
                          {screen.description}
                        </p>
                        <div className='mt-2 flex items-center gap-2'>
                          <Badge variant='secondary' className='text-xs'>
                            {screen.category}
                          </Badge>
                          {screen.isPremium && (
                            <Badge variant='default' className='text-xs'>
                              Premium
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Plus className='h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100' />
                    </div>
                  </Button>
                </motion.div>
              ))}
            </div>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
