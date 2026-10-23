import { Link, usePage } from '@inertiajs/react';
import {
    LayoutGrid,
    PlusCircle,
    Settings2,
    Users2,
    Building2,
    FileText,
    Boxes,
    Users,
    Shield,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarSeparator,
} from '@/components/ui/sidebar';
import { dashboard } from '@/routes';
import type { NavItem, User } from '@/types';

export function AppSidebar() {
    const { auth } = usePage().props as { auth?: { user?: User } };
    const user = auth?.user;
    const isSuperAdmin = Boolean(user?.is_superadmin || user?.role?.name === 'superadmin');

    // Get current URL pathname and search query for accurate active state
    let currentPath = '';
    let currentTab = '';
    let currentSubTab = '';
    if (typeof window !== 'undefined') {
        currentPath = window.location.pathname;
        const searchParams = new URLSearchParams(window.location.search);
        currentTab = searchParams.get('tab') || '';
        currentSubTab = searchParams.get('subtab') || '';
    }

    const mainNavItems: NavItem[] = [
        {
            title: 'Dashboard',
            href: dashboard(),
            icon: LayoutGrid,
            isActive: currentPath === '/dashboard' && !currentTab,
        },
        {
            title: 'Create Requisition',
            href: '/purchase-requisitions/create',
            icon: PlusCircle,
            isActive: currentPath === '/purchase-requisitions/create',
        },
    ];

    const prConfigNavItems: NavItem[] = isSuperAdmin
        ? [
              {
                  title: 'PR Configuration Center',
                  href: '/dashboard?tab=pr-configuration',
                  icon: Settings2,
                  isActive:
                      currentPath === '/dashboard' &&
                      currentTab === 'pr-configuration' &&
                      (!currentSubTab || currentSubTab === 'header-options'),
              },
              {
                  title: 'Purchasing Groups',
                  href: '/dashboard?tab=pr-configuration&subtab=purchasing-groups',
                  icon: Users2,
                  isActive:
                      currentPath === '/dashboard' &&
                      currentTab === 'pr-configuration' &&
                      currentSubTab === 'purchasing-groups',
              },
              {
                  title: 'Plants & Purchasing Orgs',
                  href: '/dashboard?tab=pr-configuration&subtab=plants-sourcing',
                  icon: Building2,
                  isActive:
                      currentPath === '/dashboard' &&
                      currentTab === 'pr-configuration' &&
                      currentSubTab === 'plants-sourcing',
              },
              {
                  title: 'Document Types',
                  href: '/dashboard?tab=pr-configuration&subtab=document-types',
                  icon: FileText,
                  isActive:
                      currentPath === '/dashboard' &&
                      currentTab === 'pr-configuration' &&
                      currentSubTab === 'document-types',
              },
              {
                  title: 'Manage Item Categories',
                  href: '/dashboard?tab=pr-configuration&subtab=item-categories',
                  icon: Boxes,
                  isActive:
                      currentPath === '/dashboard' &&
                      currentTab === 'pr-configuration' &&
                      currentSubTab === 'item-categories',
              },
          ]
        : [];

    const systemConfigNavItems: NavItem[] = isSuperAdmin
        ? [
              {
                  title: 'Manage Users',
                  href: '/users',
                  icon: Users,
                  isActive: currentPath.startsWith('/users'),
              },
              {
                  title: 'Manage Departments',
                  href: '/departments',
                  icon: Shield,
                  isActive: currentPath.startsWith('/departments'),
              },
          ]
        : [];

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} label="Procurement" />

                {isSuperAdmin && prConfigNavItems.length > 0 && (
                    <>
                        <SidebarSeparator className="my-1" />
                        <NavMain items={prConfigNavItems} label="PR Configuration" />
                        <SidebarSeparator className="my-1" />
                        <NavMain items={systemConfigNavItems} label="System Administration" />
                    </>
                )}
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
