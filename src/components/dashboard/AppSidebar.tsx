
"use client";

import Link from 'next/link';
import { useState } from 'react';
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
import { useAuth } from '@/hooks/useMockAuth'; // Use useAuth
import { LayoutDashboard, Lightbulb, Settings, LogOut, LineChart, ReceiptText, UserCircle, Trash2, ShieldAlert, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePathname } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';


export function AppSidebar() {
  const { logout, deleteAccount, currentUserEmail, currentUserName, currentUserAvatarUrl } = useAuth(); // Use useAuth
  const { toast } = useToast();
  const pathname = usePathname();
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);

  const menuItems = [
    { href: '/dashboard', label: 'Kontrollpanel', icon: LayoutDashboard },
    { href: '/dashboard/overview', label: 'Ekonomisk Översikt', icon: LineChart },
    { href: '/dashboard/bills', label: 'Räkningar', icon: ReceiptText },
    { href: '/dashboard/shopping', label: 'Handla', icon: ShoppingCart },
    { href: '/dashboard/budget-ai', label: 'AI Budgetrådgivare', icon: Lightbulb },
    // Settings link removed from here, handled by user profile click below
  ];

  const userInitial = currentUserName ? currentUserName.charAt(0).toUpperCase() : (currentUserEmail ? currentUserEmail.charAt(0).toUpperCase() : 'A');
  const displayName = currentUserName || (currentUserEmail ? currentUserEmail.split('@')[0] : "Användare");

  const handleDeleteAccountConfirm = async () => {
     // Note: deleteAccount in useAuth (Appwrite version) currently just logs out and shows a warning.
     // Actual deletion requires backend implementation.
    await deleteAccount();
    // The toast message might be adjusted based on whether it actually deletes or just logs out
     // Toast might be shown within deleteAccount itself now.
    setIsDeleteAlertOpen(false);
  };

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
           {/* Explicit Settings link */}
           <SidebarMenuItem>
              <Link href="/dashboard/settings/account" legacyBehavior passHref>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith('/dashboard/settings')}
                  tooltip="Kontoinställningar"
                >
                  <a>
                    <Settings className="h-5 w-5" />
                    <span>Kontoinställningar</span>
                  </a>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="p-2 mt-auto"> {/* Use mt-auto to push to bottom */}
        <SidebarSeparator className="my-2"/>
        {/* Make the user info section a link to account settings */}
        <Link href="/dashboard/settings/account" className="block hover:bg-muted/50 rounded-md transition-colors" title="Kontoinställningar">
            <div className="flex items-center gap-3 p-2 mb-2 cursor-pointer">
            <Avatar className="h-9 w-9">
                 {/* Use currentUserAvatarUrl from useAuth */}
                <AvatarImage src={currentUserAvatarUrl || undefined} alt={displayName} />
                <AvatarFallback>{userInitial}</AvatarFallback>
            </Avatar>
            <div className="text-sm overflow-hidden group-data-[collapsible=icon]:hidden">
                <p className="font-semibold truncate" title={displayName}>{displayName}</p>
                {currentUserEmail && <p className="text-xs text-muted-foreground truncate" title={currentUserEmail}>{currentUserEmail}</p>}
            </div>
            </div>
        </Link>
        <SidebarSeparator className="my-1"/>
        <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" className="w-full justify-start text-destructive hover:text-destructive/90 hover:bg-destructive/10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:aspect-square group-data-[collapsible=icon]:p-0" title="Radera Konto">
              <Trash2 className="mr-2 h-5 w-5 group-data-[collapsible=icon]:mr-0" />
              <span className="group-data-[collapsible=icon]:hidden">Radera Konto</span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <div className="flex justify-center mb-3">
                <ShieldAlert className="h-12 w-12 text-destructive" />
              </div>
              <AlertDialogTitle className="text-center">Är du helt säker?</AlertDialogTitle>
              <AlertDialogDescription className="text-center">
                Denna åtgärd kommer permanent att radera ditt konto och all tillhörande data (tavlor, räkningar etc.). Detta kan inte ångras. (Obs: Nuvarande funktion loggar endast ut dig då radering kräver server-side logik).
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="sm:justify-center">
              <AlertDialogCancel>Avbryt</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteAccountConfirm} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                Ja, radera mitt konto
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-primary group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:aspect-square group-data-[collapsible=icon]:p-0" onClick={logout} title="Logga Ut">
          <LogOut className="mr-2 h-5 w-5 group-data-[collapsible=icon]:mr-0" />
          <span className="group-data-[collapsible=icon]:hidden">Logga Ut</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
