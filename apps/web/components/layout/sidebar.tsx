'use client';

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from '@repo/design';
import { ChevronRight, LayoutDashboard, Settings } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentType, SVGProps } from 'react';

import { OrganizationSwitcher, UserButton } from '@/components';

/** The type for a navigation item */
type NavItem = {
  /** The text to show with this item */
  title: string;
  /** The URL to navigate to when this item is clicked */
  url: string;
  /** The icon to show with this item */
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  /** Whether this item should be auto-expanded to show it's sub-items */
  autoExpand?: boolean;
  /** Any sub-items to show underneath this item */
  items?: NavItem[];
};

/** The sidebar for the application */
export const AppSidebar: FC = ({ children }) => {
  return (
    <>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <OrganizationSwitcher />
        </SidebarHeader>
        <SidebarContent className="overflow-x-hidden">
          <SidebarGroup>
            <AppSidebarGroup
              label="Overview"
              navItems={[
                {
                  title: 'Dashboard',
                  url: '/',
                  icon: LayoutDashboard,
                },
              ]}
            />
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <AppSidebarGroup
            navItems={[
              {
                title: 'Settings',
                url: '/settings',
                icon: Settings,
              },
            ]}
          />
          <Separator className="mb-2 group-data-[collapsible=icon]:mb-1" />
          <SidebarMenu>
            <SidebarMenuItem>
              <UserButton />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset>{children}</SidebarInset>
    </>
  );
};

/** Renders a group of navigation items in the sidebar */
const AppSidebarGroup = ({ navItems, label }: { navItems: NavItem[]; label?: string }) => {
  const pathname = usePathname();

  return (
    <>
      {label && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
      <SidebarMenu>
        {navItems.map((item) => {
          const Icon = item.icon;
          return item?.items && item?.items?.length > 0 ? (
            <Collapsible
              asChild
              className="group/collapsible"
              defaultOpen={item.autoExpand}
              key={item.title}
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton isActive={pathname === item.url} tooltip={item.title}>
                    {Icon ? <Icon /> : null}
                    <span>{item.title}</span>
                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.items?.map((subItem) => (
                      <SidebarMenuSubItem key={subItem.title}>
                        <SidebarMenuSubButton asChild isActive={pathname === subItem.url}>
                          <Link href={subItem.url}>
                            <span>{subItem.title}</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          ) : (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild isActive={pathname === item.url} tooltip={item.title}>
                <Link href={item.url}>
                  {Icon ? <Icon /> : null}
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </>
  );
};
