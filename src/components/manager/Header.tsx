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

export function Header() {
  const [managerName, setManagerName] = useState<string>("");
  const [managerEmail, setManagerEmail] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setManagerName(localStorage.getItem("managerName") || "");
      setManagerEmail(localStorage.getItem("managerEmail") || "");
    }
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <div className="mr-auto flex">
          <Link href="/manager/dashboard" className="flex items-center space-x-2">
            <Image src="/dr-enterprise-logo.png" alt="D.R. Enterprise Logo" width={128} height={128} className="h-10 w-10" />
            <span className="font-bold sm:hidden">D.R. Enterprise</span>
          </Link>
        </div>
        <div className="flex items-center justify-end space-x-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarImage src="https://placehold.co/40x40.png" alt="Manager" data-ai-hint="person woman" />
                <AvatarFallback>M</AvatarFallback>
              </Avatar>
              <div className="flex-col hidden sm:flex">
                <span className="text-sm font-semibold">{managerName || "Manager"}</span>
                <span className="text-xs text-muted-foreground">
                  {managerEmail || "manager@example.com"}
                </span>
              </div>
            </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline">
                <LogOut className="mr-0 sm:mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
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
                  <Link href="/login">Logout</Link>
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </header>
  );
}
