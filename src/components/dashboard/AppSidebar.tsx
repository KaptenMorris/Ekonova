"use client";

import Link from 'next/link';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { Logo } from '@/components/shared/Logo';
import { useMockAuth } from '@/hooks/useMockAuth';
import { LayoutDashboard, Lightbulb, Settings, LogOut, DollarSign, LineChart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePathname } from 'next/navigation';

export function AppSidebar() {
  const { logout } = useMockAuth();
  const pathname = usePathname();

  const menuItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/overview', label: 'Financial Overview', icon: LineChart },
    { href: '/dashboard/budget-ai', label: 'AI Budget Advisor', icon: Lightbulb },
    // { href: '/dashboard/settings', label: 'Settings', icon: Settings }, // Placeholder
  ];

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="p-4">
        <Logo showText={true} />
      </SidebarHeader>
      <SidebarContent className="flex-1 p-2">
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <Link href={item.href} legacyBehavior passHref>
                <SidebarMenuButton 
                  asChild 
                  isActive={pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))}
                  tooltip={item.label}
                >
                  <a>
                    <item.icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </a>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarSeparator />
      <SidebarFooter className="p-4">
        {/* User profile placeholder */}
        {/* <div className="flex items-center gap-2 mb-4">
          <Avatar>
            <AvatarImage src="https://picsum.photos/40/40" alt="User" data-ai-hint="person avatar" />
            <AvatarFallback>U</AvatarFallback>
          </Avatar>
          <div className="text-sm">
            <p className="font-semibold">User Name</p>
            <p className="text-xs text-muted-foreground">user@example.com</p>
          </div>
        </div> */}
        <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-destructive" onClick={logout}>
          <LogOut className="mr-2 h-5 w-5" />
          Logout
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
