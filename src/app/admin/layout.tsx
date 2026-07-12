"use client";
import type { ReactNode } from "react";
import { SidebarProvider, Sidebar, SidebarInset } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { useEffect, useState, useCallback } from "react";
import { useNavigation } from "@/hooks/useNavigation";

function isAdminAuthenticated() {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem("adminToken");
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { navigateReplace } = useNavigation();
  const [mounted, setMounted] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);

  const handleNavigateToLogin = useCallback(() => {
    navigateReplace("/admin/login");
  }, [navigateReplace]);

  useEffect(() => {
    setMounted(true);
    if (!isAdminAuthenticated()) {
      setIsAuthed(false);
      handleNavigateToLogin();
      return;
    }
    setIsAuthed(true);
  }, [handleNavigateToLogin]);

  // Avoid SSR/client HTML mismatch from auth + browser extensions
  if (!mounted || !isAuthed) {
    return (
      <div
        className="flex justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-950 px-4"
        suppressHydrationWarning
      >
        <div className="flex flex-col items-center space-y-4" suppressHydrationWarning>
          <span className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          <p className="text-sm text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <style jsx global>{`
        body { 
          overflow-x: hidden !important; 
          margin: 0;
          padding: 0;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          text-rendering: optimizeLegibility;
        }
        * {
          box-sizing: border-box;
        }
        
        @media (max-width: 768px) {
          * {
            -webkit-transform: translateZ(0);
            transform: translateZ(0);
            -webkit-backface-visibility: hidden;
            backface-visibility: hidden;
          }
        }
        
        .admin-container {
          width: 100vw;
          max-width: 100%;
          overflow-x: hidden;
          contain: layout style paint;
        }
        
        @media (max-width: 640px) {
          .admin-main {
            padding: 0.5rem !important;
          }
        }
        
        @media (min-width: 641px) and (max-width: 1024px) {
          .admin-main {
            padding: 1rem !important;
          }
        }
        
        @media (min-width: 1025px) {
          .admin-main {
            padding: 2rem !important;
          }
        }
        
        @media (max-width: 480px) {
          .admin-main {
            padding: 0.25rem !important;
          }
          
          .text-xs {
            font-size: 0.75rem !important;
          }
          .text-sm {
            font-size: 0.875rem !important;
          }
          
          button, a, [role="button"] {
            min-height: 44px;
            min-width: 44px;
            -webkit-tap-highlight-color: transparent;
            touch-action: manipulation;
          }
          
          .space-y-3 > * + * {
            margin-top: 0.5rem !important;
          }
          
          .card-mobile-optimized {
            padding: 0.75rem !important;
          }
          
          * {
            -webkit-overflow-scrolling: touch;
          }
        }
        
        @media (max-width: 768px) {
          [data-sidebar="sidebar"] {
            will-change: transform;
            transition: transform 0.2s ease-out;
          }
        }
        
        @media (min-width: 768px) {
          .admin-container {
            height: 100vh;
            overflow: hidden;
          }
          
          [data-sidebar="sidebar"] {
            overflow-y: auto;
            overflow-x: hidden;
            -webkit-overflow-scrolling: touch;
          }
          
          .admin-main {
            flex: 1;
            overflow-y: auto;
            overflow-x: hidden;
            min-height: 0;
            -webkit-overflow-scrolling: touch;
          }
        }
        
        @media (max-height: 500px) and (orientation: landscape) {
          .admin-main {
            padding: 0.5rem !important;
          }
        }
        
        @media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
          .text-sm {
            font-size: 0.9375rem;
          }
        }
      `}</style>
      
      <div className="admin-container flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">
        <Sidebar className="w-64 border-r border-gray-200 dark:border-gray-800">
          <AdminSidebar />
        </Sidebar>
        
        <SidebarInset className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
            <AdminHeader />
          </div>
          
          <main className="admin-main flex-1 w-full max-w-full overflow-y-auto overflow-x-hidden">
            <div className="w-full max-w-none">
              {children}
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
