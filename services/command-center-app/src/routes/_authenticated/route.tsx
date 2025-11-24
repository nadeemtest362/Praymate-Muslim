import Cookies from 'js-cookie'
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { getAuthSnapshot, initializeAuth } from '@/lib/authUtils'
import { cn } from '@/lib/utils'
import { SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/app-sidebar'
import SkipToMain from '@/components/skip-to-main'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async () => {
    console.log('[Route] Starting beforeLoad auth check...')
    
    try {
      // Initialize auth to ensure session is loaded
      await initializeAuth()
      
      // Get current auth state
      const authState = await getAuthSnapshot()
      
      console.log('[Route] Auth state:', {
        isAuthenticated: authState.isAuthenticated,
        isAdmin: authState.isAdmin,
        hasUser: !!authState.user,
        hasSession: !!authState.session,
      })

      // Redirect to sign-in if not authenticated or not admin
      if (!authState.isAuthenticated || !authState.isAdmin) {
        console.log('[Route] Auth failed, redirecting to sign-in')
        throw redirect({
          to: '/sign-in',
          search: {
            redirect: typeof window !== 'undefined' ? window.location.pathname : '/',
          },
        })
      }

      console.log('[Route] Auth check passed!')
    } catch (error) {
      console.error('[Route] Auth check error:', error)
      // On any auth error, redirect to sign-in
      throw redirect({
        to: '/sign-in',
        search: {
          redirect: typeof window !== 'undefined' ? window.location.pathname : '/',
        },
      })
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  // beforeLoad already verified auth - no need to check anything here
  const defaultOpen = Cookies.get('sidebar_state') !== 'false'

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <SkipToMain />
      <AppSidebar />
      <div
        id='content'
        className={cn(
          'ml-auto w-full max-w-full',
          'peer-data-[state=collapsed]:w-[calc(100%-var(--sidebar-width-icon)-1rem)]',
          'peer-data-[state=expanded]:w-[calc(100%-var(--sidebar-width))]',
          'sm:transition-[width] sm:duration-200 sm:ease-linear',
          'flex h-svh flex-col',
          'group-data-[scroll-locked=1]/body:h-full',
          'has-[main.fixed-main]:group-data-[scroll-locked=1]/body:h-svh'
        )}
      >
        <Outlet />
      </div>
    </SidebarProvider>
  )
}
