import { createFileRoute } from '@tanstack/react-router'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { TopNav } from '@/components/layout/top-nav'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { PrayerLab } from '@/features/prayer-lab'

export const Route = createFileRoute('/_authenticated/prayer-lab/')({
  component: PrayerLabPage,
})

function PrayerLabPage() {
  return (
    <>
      <Header>
        <TopNav links={topNav} />
        <div className='ml-auto flex items-center space-x-4'>
          <Search />
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className='mb-6 flex flex-col gap-2'>
          <div className='flex items-center justify-between'>
            <div>
              <h1 className='bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-3xl font-black tracking-tight text-transparent uppercase'>
                <span className='text-5xl text-white'>🧪 </span> Prayer
                <span className='text-3xl text-white'>Lab</span>
              </h1>
              <p className='text-muted-foreground mt-1'>
                Test and experiment with prayer generation configurations
              </p>
            </div>
          </div>
        </div>

        <PrayerLab />
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
    isActive: false,
    disabled: false,
  },
  {
    title: 'Prayer Studio',
    href: '/prayer-studio',
    isActive: false,
    disabled: false,
  },
  {
    title: 'Prayer Lab',
    href: '/prayer-lab',
    isActive: true,
    disabled: false,
  },
  {
    title: 'User Journey',
    href: '/user-journey',
    isActive: false,
    disabled: false,
  },
]
