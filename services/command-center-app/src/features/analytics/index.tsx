import {
  Activity,
  Users,
  DollarSign,
  Zap,
  BarChart3,
  GitBranch,
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { TopNav } from '@/components/layout/top-nav'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { CostOptimization } from '@/features/dashboard/components/cost-optimization'
import { OnboardingAnalytics } from '@/features/dashboard/components/onboarding-analytics'
import { RealTimeMetrics } from '@/features/dashboard/components/real-time-metrics'
import { RetentionAnalytics } from '@/features/dashboard/components/retention-analytics'

export default function Analytics() {
  return (
    <>
      {/* ===== Top Heading ===== */}
      <Header>
        <TopNav links={topNav} />
        <div className='ml-auto flex items-center space-x-4'>
          <Search />
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      {/* ===== Main ===== */}
      <Main>
        <div className='mb-6 flex flex-col gap-2'>
          <h1 className='text-3xl font-bold tracking-tight'>Analytics Hub</h1>
          <p className='text-muted-foreground'>
            Deep insights, real-time monitoring, and optimization tools for your
            prayer app
          </p>
        </div>

        <Tabs defaultValue='realtime' className='space-y-6'>
          <TabsList className='grid w-full grid-cols-4 lg:w-auto lg:grid-cols-none'>
            <TabsTrigger value='realtime' className='gap-2'>
              <Activity size={16} />
              Real-time
            </TabsTrigger>
            <TabsTrigger value='retention' className='gap-2'>
              <Users size={16} />
              Retention
            </TabsTrigger>
            <TabsTrigger value='onboarding' className='gap-2'>
              <GitBranch size={16} />
              Onboarding
            </TabsTrigger>
            <TabsTrigger value='costs' className='gap-2'>
              <DollarSign size={16} />
              Cost Analysis
            </TabsTrigger>
          </TabsList>

          <TabsContent value='realtime' className='space-y-6'>
            <RealTimeMetrics />
          </TabsContent>

          <TabsContent value='retention' className='space-y-6'>
            <RetentionAnalytics />
          </TabsContent>

          <TabsContent value='onboarding' className='space-y-6'>
            <OnboardingAnalytics />
          </TabsContent>

          <TabsContent value='costs' className='space-y-6'>
            <CostOptimization />
          </TabsContent>
        </Tabs>
      </Main>
    </>
  )
}

const topNav = [
  {
    title: 'Dashboard',
    href: '/',
    isActive: false,
    disabled: false,
  },
  {
    title: 'Analytics',
    href: '/analytics',
    isActive: true,
    disabled: false,
  },
  {
    title: 'Prayer Studio',
    href: '/prayer-studio',
    isActive: false,
    disabled: false,
  },
  {
    title: 'User Journey',
    href: '/user-journey',
    isActive: false,
    disabled: false,
  },
]
