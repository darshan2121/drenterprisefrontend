"use client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Users, LogIn, LogOut, FileText } from "lucide-react";
import { TeamAttendanceTable } from "@/components/manager/TeamAttendanceTable";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchEmployees } from "@/store/slices/employeeSlice";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AddEmployeeModal } from "@/components/manager/AddEmployeeModal";
import { authService } from "@/services/authService";

function isManagerAuthenticated() {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem("managerToken");
}

export default function ManagerDashboardPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [checking, setChecking] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const dispatch = useDispatch();
  const { employees, isLoading } = useSelector((state: any) => state.employee);

  // Time-based greeting functions
  const getTimeBasedGreeting = useCallback((time: Date) => {
    const hour = time.getHours();
    if (hour >= 5 && hour < 12) return "Good Morning";
    if (hour >= 12 && hour < 17) return "Good Afternoon";
    if (hour >= 17 && hour < 21) return "Good Evening";
    return "Good Night";
  }, []);

  const getGreetingEmoji = useCallback((time: Date) => {
    const hour = time.getHours();
    if (hour >= 5 && hour < 12) return "🌅";
    if (hour >= 12 && hour < 17) return "☀️";
    if (hour >= 17 && hour < 21) return "🌆";
    return "🌙";
  }, []);

  // Get current manager data
  const getCurrentManager = useCallback(() => {
    if (typeof window === 'undefined') return null;
    try {
      const managerData = localStorage.getItem('managerData');
      return managerData ? JSON.parse(managerData) : null;
    } catch (error) {
      console.error('Error parsing manager data:', error);
      return null;
    }
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!isManagerAuthenticated()) {
      router.replace("/login");
    } else {
      setChecking(false);
    }
  }, [router, mounted]);

  useEffect(() => {
    if (!checking && mounted) {
      dispatch(fetchEmployees() as any);
    }
  }, [dispatch, checking, mounted]);

  if (!mounted || checking) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen">
        <Image src="/dr-enterprise-logo.png" alt="D.R. Enterprise Logo" width={80} height={80} className="mx-auto mb-4" />
        <span className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></span>
      </div>
    );
  }

    // Compute metrics from employees
    const metrics = [
        {
            icon: Users,
            label: "Total Employees",
            value: employees.length,
            color: "text-chart-1",
        },
        {
            icon: LogIn,
            label: "Clocked In",
            value: employees.filter((e: any) => e.isWorking).length,
            color: "text-chart-2",
        },
        {
            icon: LogOut,
            label: "On Leave",
            value: employees.filter((e: any) => !e.isWorking).length,
            color: "text-chart-4",
        },
        // {
        //     icon: FileText,
        //     label: "Total Documents",
        //     value: "-",
        //     color: "text-chart-5",
        // },
    ];

    const mappedEmployees = employees.map((e: any) => ({
        id: e._id,
        name: e.name,
        email: e.email,
        status: e.isWorking ? 'Clocked In' : 'On Leave',
        shift: e.shift || '-',
        isActive: e.isWorking,
        image: e.image, // Include employee profile image
        // include any other fields you need
    }));

    const currentManager = getCurrentManager();

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-3xl font-bold font-headline">Supervisor Dashboard</h1>
                <p className="text-muted-foreground">
                    {getTimeBasedGreeting(currentTime)}, {currentManager?.name || 'Supervisor'}! Here&apos;s an overview of your team.
                </p>
            </div>

            {/* Enhanced Greeting Section */}
            <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/50 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                            <span className="text-xl font-bold text-green-600 dark:text-green-400">
                                {currentManager?.name?.charAt(0)?.toUpperCase() || 'S'}
                            </span>
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                                {getTimeBasedGreeting(currentTime)}, {currentManager?.name || 'Supervisor'}! {getGreetingEmoji(currentTime)}
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
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {metrics.map((metric) => (
                    <Card key={metric.label} className="transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-xl">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">
                                {metric.label}
                            </CardTitle>
                            <metric.icon className={`h-5 w-5 ${metric.color}`} />
                        </CardHeader>
                        <CardContent>
                            <div className="text-xl sm:text-2xl font-bold">{metric.value}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="flex flex-col gap-4 sm:gap-6">
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-xl sm:text-2xl font-bold font-headline">Team Attendance</h2>
                    <AddEmployeeModal />
                </div>
                <Card className="shadow-sm">
                    {isLoading ? (
                        <div className="p-8 text-center flex justify-center">
                            <Image src="/dr-enterprise-logo.png" alt="D.R. Enterprise Logo" width={80} height={80} className="mx-auto animate-pulse" />
                        </div>
                    ) : (
                        <TeamAttendanceTable teamMembers={mappedEmployees} />
                    )}
                </Card>
            </div>
        </div>
    );
}
