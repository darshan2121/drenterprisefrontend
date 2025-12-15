"use client";

import {
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
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
import {
  LayoutDashboard,
  Users,
  UserCog,
  FileText,
  LogOut,
  Shield,
  Table,
  BarChart3,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";
import { authService } from "@/services/authService";
import { useCallback, useState, startTransition, useMemo } from "react";
import { Loader2 } from "lucide-react";

const menuItems = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/employees", label: "Employees", icon: Users },
  { href: "/admin/managers", label: "Supervisor", icon: UserCog },
  { href: "/admin/admins", label: "Admins", icon: Shield },
  { href: "/admin/attendance", label: "Attendance", icon: Clock },
  { href: "/admin/reports/muster", label: "Muster Roll", icon: Table },
  { href: "/admin/reports", label: "Reports", icon: FileText },
  { href: "/admin/reports/summary", label: "Summary Report", icon: BarChart3 },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { state, setOpenMobile, isMobile } = useSidebar();
  const { logout } = useAuth();
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);
  
  // Memoize readonly check to prevent re-renders
  const isReadonly = useMemo(() => {
    return authService.getCurrentUser()?.role === "readonly";
  }, []);
  
  // Memoize filtered menu items
  const filteredMenuItems = useMemo(() => {
    return isReadonly
      ? menuItems.filter(item => ["Reports", "Muster Roll", "Summary Report"].includes(item.label))
      : menuItems;
  }, [isReadonly]);

  const handleNavigation = useCallback((href: string) => {
    // Close mobile sidebar immediately for instant feedback
    if (isMobile) {
      setOpenMobile(false);
    }
    
    // Don't navigate if already on this page
    if (pathname.startsWith(href)) {
      return;
    }
    
    // Set loading state immediately for visual feedback
    setNavigatingTo(href);
    
    // Use startTransition for non-blocking navigation
    startTransition(() => {
      // Use replace for faster navigation on mobile
      if (isMobile) {
        router.replace(href);
      } else {
        router.push(href);
      }
      // Clear loading state after navigation
      setTimeout(() => {
        setNavigatingTo(null);
      }, 200);
    });
  }, [router, isMobile, setOpenMobile, pathname]);

  return (
    <>
      <SidebarHeader>
        <div className={cn(
          "flex items-center",
          state === "expanded" ? "justify-between" : "justify-center"
        )}>
            <div className={cn("flex items-center gap-3", state === 'collapsed' && "hidden")}>
                <Image src="/dr-enterprise-logo.png" alt="D.R. Enterprise Logo" width={40} height={40} className="h-10 w-10" />
                <div className="flex flex-col">
                    <span className="font-bold text-lg sm:text-base">D.R Enterprise</span>
                    <span className="text-sm sm:text-xs text-muted-foreground">Admin Panel</span>
                </div>
            </div>
            {/* The trigger is now in the AdminHeader component */}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {filteredMenuItems.map((item) => {
            const isNavigating = navigatingTo === item.href;
            const isActive = pathname.startsWith(item.href);
            
            return (
              <SidebarMenuItem key={item.label}>
                <SidebarMenuButton
                  isActive={isActive}
                  tooltip={item.label}
                  onClick={() => handleNavigation(item.href)}
                  onMouseEnter={() => {
                    // Prefetch on hover for faster navigation (desktop only)
                    if (!isMobile && !isActive && !isNavigating) {
                      router.prefetch(item.href);
                    }
                  }}
                  onTouchStart={() => {
                    // Prefetch on touch start for mobile (faster than click)
                    if (isMobile && !isActive && !isNavigating) {
                      router.prefetch(item.href);
                    }
                  }}
                  disabled={isNavigating}
                  className={
                    cn(
                      isActive ? "bg-primary/10 text-primary" : "",
                      "w-full h-full flex items-center gap-3 px-4 py-3 rounded-md transition-colors hover:bg-accent hover:text-accent-foreground",
                      "text-base sm:text-sm lg:text-base",
                      "min-h-[48px] sm:min-h-[40px]",
                      isNavigating && "opacity-70"
                    )
                  }
                >
                  {isNavigating ? (
                    <Loader2 className="h-6 w-6 flex-shrink-0 animate-spin" />
                  ) : (
                    <item.icon className="h-6 w-6 flex-shrink-0" />
                  )}
                  <span className="font-medium truncate">{item.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
      
      {/* User Info Section */}
      <div className="px-4 py-3 border-t">
        <div className={cn(
          "flex items-center gap-3",
          state === 'collapsed' && "justify-center"
        )}>
          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-primary">
              {authService.getCurrentUser()?.name?.charAt(0)?.toUpperCase() || 'A'}
            </span>
          </div>
          {state !== 'collapsed' && (
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium text-foreground truncate">
                {authService.getCurrentUser()?.name || 'Admin'}
              </span>
              <span className="text-xs text-muted-foreground truncate">
                {authService.getCurrentUser()?.email || 'admin@example.com'}
              </span>
            </div>
          )}
        </div>
      </div>
      
      <SidebarFooter>
        <SidebarSeparator />
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <SidebarMenuButton className="text-destructive hover:bg-destructive/10 hover:text-destructive focus:bg-destructive/10 focus:text-destructive data-[active=true]:bg-destructive/10 data-[active=true]:text-destructive">
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
            </SidebarMenuButton>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure you want to log out?</AlertDialogTitle>
              <AlertDialogDescription>
                You will be redirected to the login page.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction asChild>
                <button onClick={logout}>Logout</button>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SidebarFooter>
    </>
  );
}
