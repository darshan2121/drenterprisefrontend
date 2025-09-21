"use client";

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Users, UserCog, Briefcase, Activity, ArrowUpRight, UserPlus, FileText as FileTextIcon, CalendarClock, BarChart3, CheckCircle2, UserX, CalendarOff, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { useEffect, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchDashboard } from "@/store/slices/dashboardSlice";
import type { AppDispatch, RootState } from "@/store";
import Image from "next/image";
import { authService } from "@/services/authService";
import { useNavigation } from "@/hooks/useNavigation";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { BulkStepInModal } from "@/components/admin/BulkStepInModal";

// Function to get time-based greeting
const getTimeBasedGreeting = (time: Date = new Date()) => {
  const hour = time.getHours();
  
  if (hour >= 5 && hour < 12) {
    return "Good Morning";
  } else if (hour >= 12 && hour < 17) {
    return "Good Afternoon";
  } else if (hour >= 17 && hour < 21) {
    return "Good Evening";
  } else {
    return "Good Night";
  }
};

// Function to get greeting emoji based on time
const getGreetingEmoji = (time: Date = new Date()) => {
  const hour = time.getHours();
  
  if (hour >= 5 && hour < 12) {
    return "🌅"; // Sunrise for morning
  } else if (hour >= 12 && hour < 17) {
    return "☀️"; // Sun for afternoon
  } else if (hour >= 17 && hour < 21) {
    return "🌆"; // Sunset for evening
  } else {
    return "🌙"; // Moon for night
  }
};

const quickActions = [
  { title: 'Add New Employee', description: 'Create employee profile', href: '/admin/employees', icon: UserPlus, className: "bg-blue-50 dark:bg-blue-950 hover:bg-blue-100 dark:hover:bg-blue-900 border border-blue-200 dark:border-blue-800" },
  { title: 'Generate Report', description: 'Export attendance data', href: '/admin/reports', icon: FileTextIcon, className: "bg-emerald-50 dark:bg-emerald-950 hover:bg-emerald-100 dark:hover:bg-emerald-900 border border-emerald-200 dark:border-emerald-800" },
];

const chartConfig = {
  count: {
    label: "Employees",
  },
  Present: {
    label: "Present",
    color: "hsl(var(--chart-2))",
  },
  'On Leave': {
    label: "On Leave",
    color: "hsl(var(--chart-4))",
  },
  Absent: {
    label: "Absent",
    color: "hsl(var(--chart-1))",
  },
}

function isAdminAuthenticated() {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem("adminToken");
}

function isAuthorizedForBulkStepIn() {
  if (typeof window === "undefined") return false;
  const currentUser = authService.getCurrentUser();
  return currentUser?.email === "mohit123456rathod@gmail.com";
}

export default function AdminDashboardPage() {
  const { navigateReplace, navigate } = useNavigation();
  const [checking, setChecking] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const dispatch = useDispatch<AppDispatch>();
  const { totalEmployees, totalManagers, workingEmployees, shiftWise, isLoading } = useSelector((state: RootState) => state.dashboard);
  
  // Memoize the readonly check to prevent unnecessary re-renders
  const isReadonly = useCallback(() => {
    return authService.getCurrentUser()?.role === "readonly";
  }, []);

  // Memoize navigation functions to prevent infinite loops
  const handleNavigateToLogin = useCallback(() => {
    navigateReplace("/admin/login");
  }, [navigateReplace]);

  const handleNavigateToReports = useCallback(() => {
    navigateReplace("/admin/reports");
  }, [navigateReplace]);

  useEffect(() => {
    if (!isAdminAuthenticated()) {
      setIsAuthed(false);
      setChecking(false);
      handleNavigateToLogin();
    } else {
      setIsAuthed(true);
      setChecking(false);
    }
  }, [handleNavigateToLogin]);

  useEffect(() => {
    if (isAuthed) {
      dispatch(fetchDashboard());
    }
  }, [isAuthed, dispatch]);

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  // Redirect readonly users to reports
  useEffect(() => {
    if (isReadonly()) {
      handleNavigateToReports();
    }
  }, [isReadonly, handleNavigateToReports]);

  if (checking || !isAuthed) {
    return (
      <div className="flex justify-center items-center min-h-screen px-4">
        <span className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></span>
      </div>
    );
  }

  const metrics = [
    {
      icon: Users,
      label: "Total Employees",
      value: totalEmployees,
      growth: "",
      color: "text-emerald-500",
    },
    {
      icon: UserCog,
      label: "Total Supervisors",
      value: totalManagers,
      growth: "",
      color: "text-blue-500",
    },
    {
      icon: Briefcase,
      label: "Working Employees",
      value: workingEmployees,
      growth: "",
      color: "text-purple-500",
    },
    {
      icon: Activity,
      label: "Night Shift",
      value: shiftWise.night ?? 0,
      growth: "",
      color: "text-orange-500",
    },
  ];

  const chartData = [
    { status: "Morning", count: shiftWise.morning ?? 0, fill: "hsl(var(--chart-2))", icon: CheckCircle2 },
    { status: "Evening", count: shiftWise.evening ?? 0, fill: "hsl(var(--chart-3))", icon: Activity },
    { status: "Night", count: shiftWise.night ?? 0, fill: "hsl(var(--chart-4))", icon: CalendarOff },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Mobile-first container with proper padding */}
      <div className="w-full max-w-7xl mx-auto px-3 py-4 space-y-4 sm:px-6 lg:px-8">
        
        {/* Header Section */}
        <div className="mb-6">
          <AdminPageHeader
            title="Dashboard"
            subtitle={`${getTimeBasedGreeting(currentTime)}, ${authService.getCurrentUser()?.name || 'Admin'}! Here's an overview of your platform.`}
          />
          
          {/* Enhanced Greeting Section */}
          <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                  <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                    {authService.getCurrentUser()?.name?.charAt(0)?.toUpperCase() || 'A'}
                  </span>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                    {getTimeBasedGreeting(currentTime)}, {authService.getCurrentUser()?.name || 'Admin'}! {getGreetingEmoji(currentTime)}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {currentTime.toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {currentTime.toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: true 
                  })}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Current Time
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Metrics Cards Grid - Responsive */}
        <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {isLoading ? (
            <div className="col-span-full flex justify-center items-center py-12">
              <Image 
                src="/dr-enterprise-logo.png" 
                alt="D.R. Enterprise Logo" 
                width={60} 
                height={60} 
                className="animate-pulse" 
              />
            </div>
          ) : (
            metrics.map((metric, index) => (
              <Card key={metric.label} className="w-full transition-all duration-200 hover:shadow-md border-0 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300 leading-tight">
                    {metric.label}
                  </CardTitle>
                  <metric.icon className={cn("h-4 w-4 flex-shrink-0", metric.color)} />
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {metric.value}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Chart Section - Full width on mobile */}
        <div className="w-full">
          <Card className="w-full border-0 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                Shift-wise Attendance
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center py-12 text-gray-500">
                  Loading chart...
                </div>
              ) : (
                <div className="w-full">
                  <ChartContainer config={chartConfig} className="w-full h-[200px] sm:h-[250px] md:h-[300px]">
                    <BarChart data={chartData} accessibilityLayer margin={{ left: 20, right: 20, top: 20, bottom: 5 }}>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.3} />
                      <XAxis
                        dataKey="status"
                        tickLine={false}
                        tickMargin={10}
                        axisLine={false}
                        fontSize={12}
                        className="text-gray-600 dark:text-gray-400"
                      />
                      <YAxis 
                        fontSize={12} 
                        className="text-gray-600 dark:text-gray-400"
                        tickLine={false}
                        axisLine={false}
                      />
                      <ChartTooltip
                        cursor={{ fill: 'rgba(0,0,0,0.1)' }}
                        content={
                          <ChartTooltipContent
                            indicator="dot"
                            labelKey="status"
                            nameKey="count"
                          />
                        }
                      />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions Section */}
        {!isReadonly() && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 px-1">
              Quick Actions
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {quickActions.map((action) => (
                <button 
                  onClick={() => navigate(action.href)}
                  key={action.title} 
                  className={cn(
                    "block p-4 rounded-xl transition-all duration-200 hover:scale-[1.02] border text-left w-full",
                    action.className
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <action.icon className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                        {action.title}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
                        {action.description}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
              
              {/* Bulk Step-In Button - Only for authorized admin */}
              {isAuthorizedForBulkStepIn() && (
                <BulkStepInModal>
                  <button className="block p-4 rounded-xl transition-all duration-200 hover:scale-[1.02] border text-left w-full bg-orange-50 dark:bg-orange-950 hover:bg-orange-100 dark:hover:bg-orange-900 border-orange-200 dark:border-orange-800">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <Clock className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                          Bulk Step-In
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
                          Clock in all employees for a shift
                        </p>
                      </div>
                    </div>
                  </button>
                </BulkStepInModal>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}