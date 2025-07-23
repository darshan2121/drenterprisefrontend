"use client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Users, LogIn, LogOut, FileText } from "lucide-react";
import { TeamAttendanceTable } from "@/components/manager/TeamAttendanceTable";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchEmployees } from "@/store/slices/employeeSlice";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AddEmployeeModal } from "@/components/manager/AddEmployeeModal";

function isManagerAuthenticated() {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem("managerToken");
}

export default function ManagerDashboardPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [checking, setChecking] = useState(true);
  const dispatch = useDispatch();
  const { employees, isLoading } = useSelector((state: any) => state.employee);

  useEffect(() => {
    setMounted(true);
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
        // include any other fields you need
    }));

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-3xl font-bold font-headline">Supervisor Dashboard</h1>
                <p className="text-muted-foreground">
                    Here&apos;s an overview of your team.
                </p>
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
