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
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";
import { authService } from "@/services/authService";

const menuItems = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/employees", label: "Employees", icon: Users },
  { href: "/admin/managers", label: "Supervisor", icon: UserCog },
  { href: "/admin/reports", label: "Reports", icon: FileText },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { state, setOpenMobile, isMobile } = useSidebar();
  const { logout } = useAuth();
  const isReadonly = authService.getCurrentUser()?.role === "readonly";

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
          {(isReadonly
            ? menuItems.filter(item => item.label === "Reports")
            : menuItems
          ).map((item) => (
            <SidebarMenuItem key={item.label}>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith(item.href)}
                tooltip={item.label}
                className={
                  cn(
                    pathname.startsWith(item.href) ? "bg-primary/10 text-primary" : "",
                    "w-full h-full flex items-center gap-3 px-4 py-3 rounded-md transition-colors hover:bg-accent hover:text-accent-foreground",
                    "text-base sm:text-sm lg:text-base",
                    "min-h-[48px] sm:min-h-[40px]"
                  )
                }
              >
                <Link
                  href={item.href}
                  onClick={() => {
                    // Always close mobile sidebar after navigation
                    if (isMobile) {
                      setOpenMobile(false);
                    }
                  }}
                  className="w-full h-full flex items-center gap-3"
                >
                  <item.icon className="h-6 w-6 flex-shrink-0" />
                  <span className="font-medium truncate">{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
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
