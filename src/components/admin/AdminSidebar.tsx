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

const menuItems = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/employees", label: "Employees", icon: Users },
  { href: "/admin/managers", label: "Managers", icon: UserCog },
  { href: "/admin/reports", label: "Reports", icon: FileText },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { state } = useSidebar();

  return (
    <>
      <SidebarHeader>
        <div className={cn(
          "flex items-center",
          state === "expanded" ? "justify-between" : "justify-center"
        )}>
            <div className={cn("flex items-center gap-3", state === 'collapsed' && "hidden")}>
                <Image src="https://i.postimg.cc/VvNcC0Cw/image-removebg-preview-1.png" alt="D.R. Enterprise Logo" width={40} height={40} className="h-10 w-10" />
                <div className="flex flex-col">
                    <span className="font-bold">D.R Enterprise</span>
                    <span className="text-xs text-muted-foreground">Admin Panel</span>
                </div>
            </div>
            {/* The trigger is now in the AdminHeader component */}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.label}>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith(item.href)}
                tooltip={item.label}
              >
                <Link href={item.href}>
                  <item.icon />
                  <span>{item.label}</span>
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
                <Link href="/admin/login">Logout</Link>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SidebarFooter>
    </>
  );
}
