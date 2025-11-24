import {
  BookMarked,
  Users,
  Sparkles,
  Heart,
  Bookmark,
  LineChart,
  Calendar,
  BellRing,
  RefreshCw,
  Filter,
  MoreHorizontal,
  MessageSquare,
  AlertTriangle,
  Edit,
  CheckCircle,
  ChevronDown,
  GitBranch,
  TrendingUp,
  TrendingDown,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { TopNav } from '@/components/layout/top-nav'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { OnboardingAnalytics } from './components/onboarding-analytics'
import { Overview } from './components/overview'
import { RecentPrayers } from './components/recent-prayers'

export default function Dashboard() {
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
          <div className='flex items-center justify-between'>
            <div>
              <h1 className='bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-3xl font-black tracking-tight text-transparent uppercase'>
                <span className='text-5xl text-white'>👨‍🚀 </span> Mission
                <span className='text-3xl text-white'>Control</span>
              </h1>
              <p className='text-muted-foreground mt-1'>
                There's no magic in magic. It's all in the details.
              </p>
            </div>
            <div className='flex items-center space-x-2'>
              <Button variant='outline' className='gap-2'>
                <BellRing size={18} />
                Notifications
                <Badge className='ml-1 bg-indigo-500'>3</Badge>
              </Button>
              <Button className='gap-2'>
                <Sparkles size={18} />
                Generate Report
              </Button>
            </div>
          </div>
        </div>

        <Tabs
          orientation='horizontal'
          defaultValue='overview'
          className='space-y-6'
        >
          <div className='w-full overflow-x-auto pb-2'>
            <TabsList className='bg-card border'>
              <TabsTrigger value='overview' className='gap-2'>
                <LineChart size={16} />
                Analytics
              </TabsTrigger>
              <TabsTrigger value='users' className='gap-2'>
                <Users size={16} />
                Users
              </TabsTrigger>
              <TabsTrigger value='onboarding' className='gap-2'>
                <GitBranch size={16} />
                Onboarding
              </TabsTrigger>
              <TabsTrigger value='content' className='gap-2'>
                <Bookmark size={16} />
                Content
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value='overview' className='space-y-6'>
            {/* Highlight cards */}
            <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
              <Card className='overflow-hidden border-none bg-gradient-to-br from-blue-50 to-indigo-50 shadow-md dark:from-blue-950/40 dark:to-indigo-950/40'>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='flex items-center gap-2 text-lg font-bold tracking-tight uppercase'>
                    📈 &nbsp; DAILY ACTIVE USERS
                  </CardTitle>
                  <div className='rounded-full bg-blue-100 p-2 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300'>
                    <Users size={18} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold'>262,573</div>
                  <div className='mt-1 flex items-center'>
                    <Badge
                      variant='outline'
                      className='gap-1 border-none bg-emerald-100 px-1.5 text-xs font-normal text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                    >
                      <span>+12%</span>
                    </Badge>
                    <p className='text-muted-foreground ml-2 text-xs'>
                      vs last week
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className='overflow-hidden border-none bg-gradient-to-br from-purple-50 to-pink-50 shadow-md dark:from-purple-950/40 dark:to-pink-950/40'>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='flex items-center gap-2 text-lg font-bold tracking-tight uppercase'>
                    🙏 &nbsp; Prayers Generated
                  </CardTitle>
                  <div className='rounded-full bg-purple-100 p-2 text-purple-600 dark:bg-purple-900/50 dark:text-purple-300'>
                    <BookMarked size={18} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold'>78.5%</div>
                  <div className='mt-1 flex items-center'>
                    <Badge
                      variant='outline'
                      className='gap-1 border-none bg-emerald-100 px-1.5 text-xs font-normal text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                    >
                      <span>+2.3%</span>
                    </Badge>
                    <p className='text-muted-foreground ml-2 text-xs'>
                      vs target
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className='overflow-hidden border-none bg-gradient-to-br from-amber-50 to-orange-50 shadow-md dark:from-amber-950/40 dark:to-orange-950/40'>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='flex items-center gap-2 text-lg font-bold tracking-tight uppercase'>
                    💫 &nbsp; "Wow" Score
                  </CardTitle>
                  <div className='rounded-full bg-amber-100 p-2 text-amber-600 dark:bg-amber-900/50 dark:text-amber-300'>
                    <Sparkles size={18} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold'>83.2%</div>
                  <div className='mt-1 flex items-center'>
                    <Badge
                      variant='outline'
                      className='gap-1 border-none bg-emerald-100 px-1.5 text-xs font-normal text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                    >
                      <span>+3.2%</span>
                    </Badge>
                    <p className='text-muted-foreground ml-2 text-xs'>
                      vs target (80%)
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className='overflow-hidden border-none bg-gradient-to-br from-rose-50 to-red-50 shadow-md dark:from-rose-950/40 dark:to-red-950/40'>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='flex items-center gap-2 text-lg font-bold tracking-tight uppercase'>
                    💰 &nbsp; WRR
                  </CardTitle>
                  <div className='rounded-full bg-rose-100 p-2 text-rose-600 dark:bg-rose-900/50 dark:text-rose-300'>
                    <Heart size={18} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold'>$192,224</div>
                  <div className='mt-1 flex items-center'>
                    <Badge
                      variant='outline'
                      className='gap-1 border-none bg-emerald-100 px-1.5 text-xs font-normal text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                    >
                      <span>+0.8%</span>
                    </Badge>
                    <p className='text-muted-foreground ml-2 text-xs'>
                      vs target (6%)
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts and data section */}
            <div className='grid grid-cols-1 gap-6 lg:grid-cols-7'>
              <Card className='col-span-1 border shadow-sm lg:col-span-4'>
                <CardHeader>
                  <div className='flex items-center justify-between'>
                    <CardTitle className='flex items-center gap-2 text-2xl font-black tracking-tight uppercase'>
                      🙏 &nbsp; Prayer Trends
                    </CardTitle>
                    <div className='flex gap-2'>
                      <Button variant='outline' size='sm'>
                        Day
                      </Button>
                      <Button variant='outline' size='sm'>
                        Week
                      </Button>
                      <Button variant='default' size='sm'>
                        Month
                      </Button>
                    </div>
                  </div>
                  <CardDescription>
                    User engagement with morning and evening prayers
                  </CardDescription>
                </CardHeader>
                <CardContent className='pl-2'>
                  <Overview />
                </CardContent>
              </Card>

              <Card className='col-span-1 border shadow-sm lg:col-span-3'>
                <CardHeader>
                  <CardTitle className='flex items-center gap-2 text-2xl font-black tracking-tight uppercase'>
                    🗺️ &nbsp; User Journeys
                  </CardTitle>
                  <CardDescription>
                    Recent user prayer activity and engagement
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <RecentPrayers />
                </CardContent>
              </Card>
            </div>

            {/* Additional insights section */}
            <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
              <Card className='border shadow-sm'>
                <CardHeader>
                  <CardTitle className='flex items-center gap-2 text-2xl font-black tracking-tight uppercase'>
                    ✨ &nbsp; Top Prayer Categories
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='space-y-4'>
                    <div className='flex items-center justify-between'>
                      <div className='flex items-center gap-2'>
                        <Badge className='bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900/50 dark:text-indigo-300'>
                          Guidance
                        </Badge>
                        <span className='text-muted-foreground text-sm'>
                          Most requested
                        </span>
                      </div>
                      <span className='font-medium'>24.3%</span>
                    </div>
                    <div className='flex items-center justify-between'>
                      <div className='flex items-center gap-2'>
                        <Badge className='bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/50 dark:text-purple-300'>
                          Healing
                        </Badge>
                        <span className='text-muted-foreground text-sm'>
                          Health concerns
                        </span>
                      </div>
                      <span className='font-medium'>18.7%</span>
                    </div>
                    <div className='flex items-center justify-between'>
                      <div className='flex items-center gap-2'>
                        <Badge className='bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-300'>
                          Peace
                        </Badge>
                        <span className='text-muted-foreground text-sm'>
                          Mental wellness
                        </span>
                      </div>
                      <span className='font-medium'>15.2%</span>
                    </div>
                    <div className='flex items-center justify-between'>
                      <div className='flex items-center gap-2'>
                        <Badge className='bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/50 dark:text-amber-300'>
                          Gratitude
                        </Badge>
                        <span className='text-muted-foreground text-sm'>
                          Morning focus
                        </span>
                      </div>
                      <span className='font-medium'>12.8%</span>
                    </div>
                    <div className='flex items-center justify-between'>
                      <div className='flex items-center gap-2'>
                        <Badge className='bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-300'>
                          Growth
                        </Badge>
                        <span className='text-muted-foreground text-sm'>
                          Self-improvement
                        </span>
                      </div>
                      <span className='font-medium'>10.5%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className='border shadow-sm'>
                <CardHeader>
                  <CardTitle className='flex items-center gap-2 text-2xl font-black tracking-tight uppercase'>
                    🫥 &nbsp; Mood Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='space-y-4'>
                    <div className='flex items-center justify-between'>
                      <div className='flex items-center gap-2'>
                        <div className='flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-lg dark:bg-amber-900/30'>
                          😊
                        </div>
                        <span className='font-medium'>Grateful</span>
                      </div>
                      <span className='font-medium'>32.1%</span>
                    </div>
                    <div className='flex items-center justify-between'>
                      <div className='flex items-center gap-2'>
                        <div className='flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-lg dark:bg-blue-900/30'>
                          😔
                        </div>
                        <span className='font-medium'>Weary</span>
                      </div>
                      <span className='font-medium'>18.7%</span>
                    </div>
                    <div className='flex items-center justify-between'>
                      <div className='flex items-center gap-2'>
                        <div className='flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-lg dark:bg-purple-900/30'>
                          😌
                        </div>
                        <span className='font-medium'>Peaceful</span>
                      </div>
                      <span className='font-medium'>15.4%</span>
                    </div>
                    <div className='flex items-center justify-between'>
                      <div className='flex items-center gap-2'>
                        <div className='flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-lg dark:bg-indigo-900/30'>
                          🙏
                        </div>
                        <span className='font-medium'>Hopeful</span>
                      </div>
                      <span className='font-medium'>14.2%</span>
                    </div>
                    <div className='flex items-center justify-between'>
                      <div className='flex items-center gap-2'>
                        <div className='flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 text-lg dark:bg-rose-900/30'>
                          ❤️
                        </div>
                        <span className='font-medium'>Loved</span>
                      </div>
                      <span className='font-medium'>11.8%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Onboarding Quick Stats */}
            <Card className='border shadow-sm'>
              <CardHeader>
                <div className='flex items-center justify-between'>
                  <CardTitle className='flex items-center gap-2 text-2xl font-black tracking-tight uppercase'>
                    🚀 &nbsp; Onboarding Performance
                  </CardTitle>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => {
                      const tabsList =
                        document.querySelector('[role="tablist"]')
                      const onboardingTab = tabsList?.querySelector(
                        '[value="onboarding"]'
                      )
                      if (onboardingTab instanceof HTMLElement) {
                        onboardingTab.click()
                      }
                    }}
                  >
                    View Details
                    <ChevronDown className='ml-1 h-4 w-4 -rotate-90' />
                  </Button>
                </div>
                <CardDescription>
                  SDUI flow analytics and A/B test results
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className='grid grid-cols-2 gap-4 md:grid-cols-4'>
                  <div className='space-y-1'>
                    <p className='text-muted-foreground text-sm'>
                      Completion Rate
                    </p>
                    <p className='text-2xl font-bold'>75.4%</p>
                    <div className='flex items-center'>
                      <TrendingUp className='mr-1 h-3 w-3 text-green-500' />
                      <span className='text-xs text-green-500'>+8.9%</span>
                    </div>
                  </div>
                  <div className='space-y-1'>
                    <p className='text-muted-foreground text-sm'>Avg Time</p>
                    <p className='text-2xl font-bold'>3:25</p>
                    <div className='flex items-center'>
                      <TrendingDown className='mr-1 h-3 w-3 text-green-500' />
                      <span className='text-xs text-green-500'>-45s</span>
                    </div>
                  </div>
                  <div className='space-y-1'>
                    <p className='text-muted-foreground text-sm'>A/B Winner</p>
                    <p className='text-lg font-bold'>Simplified</p>
                    <Badge variant='outline' className='text-xs'>
                      +8.8% lift
                    </Badge>
                  </div>
                  <div className='space-y-1'>
                    <p className='text-muted-foreground text-sm'>Drop-off</p>
                    <p className='text-2xl font-bold'>24.6%</p>
                    <div className='flex items-center'>
                      <AlertTriangle className='mr-1 h-3 w-3 text-yellow-500' />
                      <span className='text-xs'>Prayer People</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value='users'>
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>
                  View and manage app users and their prayer journey
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className='text-muted-foreground'>
                  User management section in development...
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value='onboarding'>
            <OnboardingAnalytics />
          </TabsContent>

          <TabsContent value='content'>
            <Card>
              <CardHeader>
                <CardTitle>Content Library</CardTitle>
                <CardDescription>
                  Biblical references and prayer templates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className='text-muted-foreground'>
                  Content library section in development...
                </p>
              </CardContent>
            </Card>
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
    isActive: true,
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
