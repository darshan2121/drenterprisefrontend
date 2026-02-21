"use client";
import { Header } from "@/components/manager/Header";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function isManagerAuthenticated() {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem("managerToken");
}

export default function ManagerLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    if (!isManagerAuthenticated()) {
      setIsAuthed(false);
      setChecking(false);
      router.replace("/login");
    } else {
      setIsAuthed(true);
      setChecking(false);
    }
  }, [router]);

  if (checking || !isAuthed) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <span className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></span>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-1 container mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
