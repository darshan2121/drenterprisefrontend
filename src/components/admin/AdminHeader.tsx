"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import Image from "next/image";

export function AdminHeader() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center border-b bg-background px-4">
        {/* Logo for mobile view */}
        <div className="flex items-center gap-2 md:hidden">
            <Image src="https://i.postimg.cc/VvNcC0Cw/image-removebg-preview-1.png" alt="D.R. Enterprise Logo" width={32} height={32} />
            <span className="font-semibold">D.R. Enterprise</span>
        </div>

        {/* Desktop trigger, appears on left */}
        <div className="hidden md:block">
            <SidebarTrigger />
        </div>
        
        {/* Mobile trigger, appears on right */}
        <div className="ml-auto md:hidden">
            <SidebarTrigger />
        </div>
    </header>
  );
}
