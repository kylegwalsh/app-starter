'use client';

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Separator,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from '@repo/design';
import { BuildingIcon, LogOutIcon, ShieldCheckIcon, UsersIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

import { RequireAdmin } from '@/components/require-admin';
import { useAuth } from '@/contexts/auth-context';

const navItems = [
  {
    title: 'Users',
    url: '/dashboard/users',
    icon: UsersIcon,
  },
  {
    title: 'Organizations',
    url: '/dashboard/organizations',
    icon: BuildingIcon,
  },
];

/**
 * Dashboard shell — sidebar navigation, user avatar, and logout. Wrapped in `RequireAdmin`
 * so unauthenticated / non-admin users are redirected to login.
 */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Sign out via Better Auth then redirect to login
  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <RequireAdmin>
      <SidebarProvider>
        <Sidebar collapsible="none" className="min-h-svh">
          <SidebarHeader>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton size="lg" asChild>
                  <Link href="/dashboard">
                    <ShieldCheckIcon className="text-primary size-5" />
                    <span className="font-semibold">Admin</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Navigation</SidebarGroupLabel>
              <SidebarMenu>
                {navItems.map((item) => {
                  const isActive = pathname.startsWith(item.url);
                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                        <Link href={item.url}>
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter>
            <Separator />
            <SidebarMenu>
              <SidebarMenuItem>
                <Popover>
                  <PopoverTrigger asChild>
                    <SidebarMenuButton size="lg">
                      <Avatar className="size-8">
                        <AvatarImage src={user?.image ?? undefined} alt={user?.name ?? ''} />
                        <AvatarFallback>
                          {user?.name?.[0] || user?.email?.[0] || 'A'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex min-w-0 flex-col gap-0.5 leading-none">
                        <span className="truncate text-sm font-medium">
                          {user?.name || 'Admin User'}
                        </span>
                        <span className="text-muted-foreground truncate text-xs">
                          {user?.email}
                        </span>
                      </div>
                    </SidebarMenuButton>
                  </PopoverTrigger>
                  <PopoverContent side="top" align="start" className="w-48 p-1">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="hover:bg-accent flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm"
                    >
                      <LogOutIcon className="size-4" />
                      <span>Logout</span>
                    </button>
                  </PopoverContent>
                </Popover>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset>
          <main className="p-4 lg:p-6">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </RequireAdmin>
  );
}
