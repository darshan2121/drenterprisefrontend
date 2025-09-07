"use client";

import { LogOut } from "lucide-react";
import Link from "next/link";
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
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";

export function Header() {
  const [managerData, setManagerData] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const { logout } = useAuth();

  useEffect(() => {
    setMounted(true);
    try {
      const data = localStorage.getItem("managerData");
      if (data) {
        setManagerData(JSON.parse(data));
      }
    } catch (error) {
      console.error('Error parsing manager data:', error);
    }
  }, []);

  if (!mounted) return null;

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center border-b bg-background px-4 justify-between">
      {/* Logo always visible on the left */}
      <div className="flex items-center gap-2">
        <Link href="/manager/dashboard" className="flex items-center gap-2">
          <Image src="/dr-enterprise-logo.png" alt="D.R. Enterprise Logo" width={32} height={32} className="h-8 w-8" />
          <span className="font-semibold hidden md:inline">D.R. Enterprise</span>
        </Link>
      </div>
      <div className="flex items-center space-x-2 sm:space-x-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <Avatar className="h-8 w-8 sm:h-9 sm:w-9">
            <AvatarImage src="https://placehold.co/40x40.png" alt="Manager" data-ai-hint="person woman" />
            <AvatarFallback className="text-sm">{managerData?.name?.charAt(0) || "S"}</AvatarFallback>
          </Avatar>
          <div className="flex-col hidden xs:flex">
            <span className="text-sm font-semibold truncate max-w-[120px]">{managerData?.name || "Supervisor"}</span>
            <span className="text-xs text-muted-foreground truncate max-w-[120px]">
              {managerData?.email || "manager@example.com"}
            </span>
          </div>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="p-2 sm:p-2 rounded-full sm:rounded-md min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <LogOut className="h-4 w-4 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline ml-2">Logout</span>
            </Button>
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
      </div>
    </header>
  );
}
