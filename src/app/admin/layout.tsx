"use client";
import type { ReactNode } from "react";
import { SidebarProvider, Sidebar, SidebarInset } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function isAdminAuthenticated() {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem("adminToken");
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    if (!isAdminAuthenticated()) {
      setIsAuthed(false);
      setChecking(false);
      router.replace("/admin/login");
    } else {
      setIsAuthed(true);
      setChecking(false);
    }
  }, [router]);

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
        }
        * {
          box-sizing: border-box;
        }
        
        /* Ensure no horizontal scroll on mobile */
        .admin-container {
          width: 100vw;
          max-width: 100%;
          overflow-x: hidden;
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
          }
          
          /* Improve spacing on very small screens */
          .space-y-3 > * + * {
            margin-top: 0.5rem !important;
          }
          
          /* Optimize card padding for mobile */
          .card-mobile-optimized {
            padding: 0.75rem !important;
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
      
      <div className="admin-container flex min-h-screen bg-gray-50 dark:bg-gray-950">
        {/* Sidebar - Hidden on mobile, visible on larger screens */}
        <div className="hidden lg:block">
          <Sidebar className="w-64 border-r border-gray-200 dark:border-gray-800">
            <AdminSidebar />
          </Sidebar>
        </div>
        
        {/* Main Content Area */}
        <SidebarInset className="flex-1 flex flex-col min-w-0">
          {/* Header - Responsive */}
          <div className="sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
            <AdminHeader />
          </div>
          
          {/* Main Content - Fully responsive */}
          <main className="admin-main flex-1 w-full max-w-full overflow-x-hidden">
            <div className="w-full max-w-none">
              {children}
            </div>
          </main>
        </SidebarInset>
      </div>
      
      {/* Mobile Bottom Navigation (Optional) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 z-50">
        {/* <div className="flex items-center justify-around py-2 px-4"> */}
          {/* Add your mobile navigation items here */}
          {/* <button className="flex flex-col items-center space-y-1 py-2 px-3 text-xs text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">
            <div className="w-6 h-6 bg-gray-300 dark:bg-gray-600 rounded"></div>
            <span>Dashboard</span>
          </button>
          <button className="flex flex-col items-center space-y-1 py-2 px-3 text-xs text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">
            <div className="w-6 h-6 bg-gray-300 dark:bg-gray-600 rounded"></div>
            <span>Reports</span>
          </button>
          <button className="flex flex-col items-center space-y-1 py-2 px-3 text-xs text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">
            <div className="w-6 h-6 bg-gray-300 dark:bg-gray-600 rounded"></div>
            <span>Employees</span>
          </button>
          <button className="flex flex-col items-center space-y-1 py-2 px-3 text-xs text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">
            <div className="w-6 h-6 bg-gray-300 dark:bg-gray-600 rounded"></div>
            <span>Managers</span>
          </button> */}
        {/* </div> */}
      </div>
      
      {/* Add bottom padding to account for mobile navigation */}
      {/* <div className="lg:hidden h-16"></div> */}
    </SidebarProvider>
  );
}