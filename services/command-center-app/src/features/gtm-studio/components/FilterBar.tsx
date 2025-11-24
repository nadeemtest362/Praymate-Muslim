import { Filter, Users, Layers, Activity } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface FilterBarProps {
  filters: {
    owner: string
    phase: string
    status: string
  }
  onFilterChange: (filters: any) => void
}

export const FilterBar = ({ filters, onFilterChange }: FilterBarProps) => {
  return (
    <div className='flex flex-wrap items-center gap-4 rounded-xl border bg-white/80 p-4 backdrop-blur-sm'>
      <div className='flex items-center gap-2'>
        <Filter className='h-4 w-4 text-gray-500' />
        <span className='text-sm font-medium text-gray-700'>Filters:</span>
      </div>

      <Select
        value={filters.owner}
        onValueChange={(value) => onFilterChange({ ...filters, owner: value })}
      >
        <SelectTrigger className='w-[140px]'>
          <Users className='mr-2 h-4 w-4' />
          <SelectValue placeholder='Owner' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='all'>All Owners</SelectItem>
          <SelectItem value='PM'>PM - Growth</SelectItem>
          <SelectItem value='BE'>BE - Backend</SelectItem>
          <SelectItem value='CR'>CR - Creative</SelectItem>
          <SelectItem value='HC'>HC - Host</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filters.phase}
        onValueChange={(value) => onFilterChange({ ...filters, phase: value })}
      >
        <SelectTrigger className='w-[180px]'>
          <Layers className='mr-2 h-4 w-4' />
          <SelectValue placeholder='Phase' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='all'>All Phases</SelectItem>
          <SelectItem value='0'>Phase 0 - Foundation</SelectItem>
          <SelectItem value='1'>Phase 1 - Assets</SelectItem>
          <SelectItem value='2'>Phase 2 - Launch</SelectItem>
          <SelectItem value='3'>Phase 3 - Scale</SelectItem>
          <SelectItem value='4'>Phase 4 - Community</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filters.status}
        onValueChange={(value) => onFilterChange({ ...filters, status: value })}
      >
        <SelectTrigger className='w-[160px]'>
          <Activity className='mr-2 h-4 w-4' />
          <SelectValue placeholder='Status' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='all'>All Statuses</SelectItem>
          <SelectItem value='not-started'>Not Started</SelectItem>
          <SelectItem value='in-progress'>In Progress</SelectItem>
          <SelectItem value='completed'>Completed</SelectItem>
          <SelectItem value='blocked'>Blocked</SelectItem>
        </SelectContent>
      </Select>

      {(filters.owner !== 'all' ||
        filters.phase !== 'all' ||
        filters.status !== 'all') && (
        <Button
          variant='ghost'
          size='sm'
          onClick={() =>
            onFilterChange({ owner: 'all', phase: 'all', status: 'all' })
          }
          className='ml-auto'
        >
          Clear Filters
        </Button>
      )}
    </div>
  )
}
