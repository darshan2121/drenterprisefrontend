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
  const [checking, setChecking] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);

  // Memoize navigation function to prevent infinite loops
  const handleNavigateToLogin = useCallback(() => {
    navigateReplace("/admin/login");
  }, [navigateReplace]);

  useEffect(() => {
    // Optimized auth check for mobile - run immediately
    if (!isAdminAuthenticated()) {
      setIsAuthed(false);
      setChecking(false);
      handleNavigateToLogin();
    } else {
      setIsAuthed(true);
      setChecking(false);
    }
  }, [handleNavigateToLogin]);

  if (checking || !isAuthed) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-950 px-4">
        <div className="flex flex-col items-center space-y-4">
          <span className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></span>
          <p className="text-sm text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      {/* Global styles for mobile responsiveness */}
      <style jsx global>{`
        body { 
          overflow-x: hidden !important; 
          margin: 0;
          padding: 0;
          /* Mobile performance optimizations */
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          text-rendering: optimizeLegibility;
        }
        * {
          box-sizing: border-box;
        }
        
        /* Mobile performance: GPU acceleration for animations */
        @media (max-width: 768px) {
          * {
            -webkit-transform: translateZ(0);
            transform: translateZ(0);
            -webkit-backface-visibility: hidden;
            backface-visibility: hidden;
          }
        }
        
        /* Ensure no horizontal scroll on mobile */
        .admin-container {
          width: 100vw;
          max-width: 100%;
          overflow-x: hidden;
          /* Mobile: prevent layout shifts */
          contain: layout style paint;
        }
        
        /* Mobile-first responsive breakpoints */
        @media (max-width: 640px) {
          .admin-main {
            padding: 0.5rem !important;
          }
        }
        
        /* Tablet styles */
        @media (min-width: 641px) and (max-width: 1024px) {
          .admin-main {
            padding: 1rem !important;
          }
        }
        
        /* Desktop styles */
        @media (min-width: 1025px) {
          .admin-main {
            padding: 2rem !important;
          }
        }
        
        /* WebView specific optimizations */
        @media (max-width: 480px) {
          /* Extra small mobile devices */
          .admin-main {
            padding: 0.25rem !important;
          }
          
          /* Ensure text is readable on small screens */
          .text-xs {
            font-size: 0.75rem !important;
          }
          .text-sm {
            font-size: 0.875rem !important;
          }
          
          /* Ensure touch targets are large enough */
          button, a, [role="button"] {
            min-height: 44px;
            min-width: 44px;
            /* Mobile: prevent tap highlight delay */
            -webkit-tap-highlight-color: transparent;
            touch-action: manipulation;
          }
          
          /* Improve spacing on very small screens */
          .space-y-3 > * + * {
            margin-top: 0.5rem !important;
          }
          
          /* Optimize card padding for mobile */
          .card-mobile-optimized {
            padding: 0.75rem !important;
          }
          
          /* Mobile: optimize scrolling */
          * {
            -webkit-overflow-scrolling: touch;
          }
        }
        
        /* Mobile: Optimize sidebar transitions */
        @media (max-width: 768px) {
          [data-sidebar="sidebar"] {
            will-change: transform;
            transition: transform 0.2s ease-out;
          }
        }
        
        /* Fix sidebar to be fixed and only content scrolls */
        @media (min-width: 768px) {
          .admin-container {
            height: 100vh;
            overflow: hidden;
          }
          
          /* Ensure sidebar content can scroll if needed */
          [data-sidebar="sidebar"] {
            overflow-y: auto;
            overflow-x: hidden;
            -webkit-overflow-scrolling: touch;
          }
          
          /* Make content area scrollable - SidebarInset already handles spacing via peer */
          .admin-main {
            flex: 1;
            overflow-y: auto;
            overflow-x: hidden;
            min-height: 0; /* Important for flex scrolling */
            -webkit-overflow-scrolling: touch;
          }
        }
        
        /* Landscape orientation optimizations */
        @media (max-height: 500px) and (orientation: landscape) {
          .admin-main {
            padding: 0.5rem !important;
          }
        }
        
        /* High DPI displays */
        @media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
          .text-sm {
            font-size: 0.9375rem;
          }
        }
      `}</style>
      
      <div className="admin-container flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">
        {/* Sidebar - Responsive with mobile support */}
        <Sidebar className="w-64 border-r border-gray-200 dark:border-gray-800">
          <AdminSidebar />
        </Sidebar>
        
        {/* Main Content Area - Scrollable */}
        <SidebarInset className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Header - Responsive - Fixed at top */}
          <div className="sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
            <AdminHeader />
          </div>
          
          {/* Main Content - Fully responsive - Scrollable */}
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