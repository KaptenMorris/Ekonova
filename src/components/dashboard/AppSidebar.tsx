
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
import { LayoutDashboard, Lightbulb, Settings, LogOut, LineChart, ReceiptText, UserCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePathname } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function AppSidebar() {
  const { logout, currentUserEmail, currentUserName } = useMockAuth();
  const pathname = usePathname();

  const menuItems = [
    { href: '/dashboard', label: 'Kontrollpanel', icon: LayoutDashboard },
    { href: '/dashboard/overview', label: 'Ekonomisk Översikt', icon: LineChart },
    { href: '/dashboard/bills', label: 'Räkningar', icon: ReceiptText },
    { href: '/dashboard/budget-ai', label: 'AI Budgetrådgivare', icon: Lightbulb },
    // { href: '/dashboard/settings', label: 'Inställningar', icon: Settings }, // Placeholder
  ];

  const userInitial = currentUserName ? currentUserName.charAt(0).toUpperCase() : (currentUserEmail ? currentUserEmail.charAt(0).toUpperCase() : 'A');
  const displayName = currentUserName || (currentUserEmail ? currentUserEmail.split('@')[0] : "Användare");


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
      
      <SidebarFooter className="p-2 mt-auto"> {/* Use mt-auto to push to bottom */}
        <SidebarSeparator className="my-2"/>
        <div className="flex items-center gap-3 p-2 mb-2">
          <Avatar className="h-9 w-9">
            <AvatarImage src="https://picsum.photos/40/40" alt={displayName} data-ai-hint="person avatar" />
            <AvatarFallback>{userInitial}</AvatarFallback>
          </Avatar>
          <div className="text-sm overflow-hidden group-data-[collapsible=icon]:hidden">
            <p className="font-semibold truncate" title={displayName}>{displayName}</p>
            {currentUserEmail && <p className="text-xs text-muted-foreground truncate" title={currentUserEmail}>{currentUserEmail}</p>}
          </div>
        </div>
         <SidebarSeparator className="my-2"/>
        <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-destructive group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:aspect-square group-data-[collapsible=icon]:p-0" onClick={logout} title="Logga Ut">
          <LogOut className="mr-2 h-5 w-5 group-data-[collapsible=icon]:mr-0" />
          <span className="group-data-[collapsible=icon]:hidden">Logga Ut</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
