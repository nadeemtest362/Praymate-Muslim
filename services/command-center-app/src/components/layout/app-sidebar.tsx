import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar'
import { NavGroup } from '@/components/layout/nav-group'
import { NavUser } from '@/components/layout/nav-user'
import { sidebarData } from './data/sidebar-data'

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible='icon' variant='floating' {...props}>
      <SidebarHeader className='p-4 group-[[data-state=collapsed]]:items-center'>
        <div className='group flex items-center transition-opacity duration-200 group-data-[state=collapsed]:w-auto group-data-[state=collapsed]:justify-start group-data-[state=expanded]:gap-3 hover:opacity-90'>
          <span className='text-3xl drop-shadow-md filter group-hover:animate-pulse'>
            🧬
          </span>
          <div className='flex flex-row items-center group-data-[state=collapsed]:hidden'>
            <span className='text-2xl font-black tracking-tight text-white uppercase'>
              SYNAPSE&nbsp;
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {sidebarData.navGroups.map((props) => (
          <NavGroup key={props.title} {...props} />
        ))}
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
