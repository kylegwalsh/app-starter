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
  useSidebar,
} from '@repo/design';
import { ChevronRight, LayoutDashboard, MessageSquare, Settings } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useSyncExternalStore, type ComponentType, type SVGProps } from 'react';

import { OrganizationSwitcher, UserButton } from '@/components/auth';
import { ChatDrawer, useChatContext } from '@/components/chat';

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

/**
 * Route prefixes that should auto-collapse the app sidebar on entry
 * (usually used when the page would otherwise feel cramped)
 */
const AUTO_COLLAPSE_ROUTES = ['/chat'];

/** Below this width, opening the chat drawer collapses the app sidebar to make room */
const CHAT_DRAWER_COLLAPSE_QUERY = '(max-width: 1535px)';

/** Subscribes to changes in whether the viewport is below the chat drawer breakpoint */
const subscribeToViewport = (onChange: () => void) => {
  const mql = window.matchMedia(CHAT_DRAWER_COLLAPSE_QUERY);
  mql.addEventListener('change', onChange);
  return () => mql.removeEventListener('change', onChange);
};

/** Whether the screen is too narrow for both the app sidebar and the chat drawer */
const useIsNarrowForChatDrawer = () =>
  useSyncExternalStore(
    subscribeToViewport,
    () => window.matchMedia(CHAT_DRAWER_COLLAPSE_QUERY).matches,
    // Rendered on the server before we know the viewport
    () => false,
  );

/** The sidebar for the application */
export const AppSidebar: FC = ({ children }) => {
  const pathname = usePathname();
  const { open, setOpen } = useSidebar();
  const { isDrawerOpen } = useChatContext();
  const isNarrow = useIsNarrowForChatDrawer();

  // Collapse on chat routes, or when the chat drawer opens on a narrow screen. Close on entry only
  // if currently open, and re-open on exit only if we were the one who closed it — so a
  // manually-collapsed sidebar stays collapsed on return.
  const shouldAutoCollapse =
    AUTO_COLLAPSE_ROUTES.some((prefix) => pathname.startsWith(prefix)) ||
    (isDrawerOpen && isNarrow);
  const lastAutoCollapse = useRef<boolean | null>(null);
  const autoCollapsedByUs = useRef(false);
  useEffect(() => {
    // Only act when the auto-collapse condition flips, not when the user toggles the sidebar
    if (lastAutoCollapse.current === shouldAutoCollapse) {
      return;
    }
    lastAutoCollapse.current = shouldAutoCollapse;
    if (shouldAutoCollapse) {
      if (open) {
        autoCollapsedByUs.current = true;
        setOpen(false);
      }
    } else if (autoCollapsedByUs.current) {
      autoCollapsedByUs.current = false;
      setOpen(true);
    }
  }, [shouldAutoCollapse, open, setOpen]);

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
                {
                  title: 'Chat',
                  url: '/chat',
                  icon: MessageSquare,
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
      <ChatDrawer />
    </>
  );
};

/** Renders a group of navigation items in the sidebar */
const AppSidebarGroup: FC<{ navItems: NavItem[]; label?: string }> = ({ navItems, label }) => {
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
              <SidebarMenuButton
                asChild
                isActive={item.url === '/' ? pathname === item.url : pathname.startsWith(item.url)}
                tooltip={item.title}
              >
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
