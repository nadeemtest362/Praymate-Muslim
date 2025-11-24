import { createFileRoute } from '@tanstack/react-router'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { TopNav } from '@/components/layout/top-nav'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { PrayerStudioV2 } from '@/features/prayer-studio'

export const Route = createFileRoute('/_authenticated/prayer-studio/')({
  component: PrayerStudioPage,
})

function PrayerStudioPage() {
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
        <PrayerStudioV2 />
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
    isActive: true,
    disabled: false,
  },
  {
    title: 'Prayer Lab',
    href: '/prayer-lab',
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
