"use client";

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Users, UserCog, Briefcase, Activity, ArrowUpRight, UserPlus, FileText as FileTextIcon, CalendarClock, BarChart3, CheckCircle2, UserX, CalendarOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

const metrics = [
  {
    icon: Users,
    label: "Total Users",
    value: "1,234",
    growth: "+12%",
    color: "text-emerald-500",
  },
  {
    icon: UserCog,
    label: "Total Managers",
    value: "56",
    growth: "+5%",
    color: "text-emerald-500",
  },
  {
    icon: Briefcase,
    label: "Total Employees",
    value: "1,178",
    growth: "+8%",
    color: "text-emerald-500",
  },
    {
    icon: Activity,
    label: "Active Today",
    value: "892",
    growth: "+2%",
    color: "text-emerald-500",
  },
];

const recentActivity = [
  { name: 'John Doe', action: 'clocked in', time: '9:00 AM', status: 'success' as const },
  { name: 'Jane Smith', action: 'requested leave', time: '8:45 AM', status: 'pending' as const },
  { name: 'Mike Johnson', action: 'clocked out', time: '8:30 AM', status: 'success' as const },
  { name: 'Sarah Wilson', action: 'late arrival', time: '8:15 AM', status: 'warning' as const },
];

const quickActions = [
  { title: 'Add New Employee', description: 'Create employee profile', href: '/admin/employees', icon: UserPlus, className: "bg-blue-100 dark:bg-blue-900/50 hover:bg-blue-200/70 dark:hover:bg-blue-900/80 border border-blue-200 dark:border-blue-800" },
  { title: 'Generate Report', description: 'Export attendance data', href: '/admin/reports', icon: FileTextIcon, className: "bg-emerald-100 dark:bg-emerald-900/50 hover:bg-emerald-200/70 dark:hover:bg-emerald-900/80" },
  { title: 'Manage Shifts', description: 'Update work schedules', href: '#', icon: CalendarClock, className: "bg-purple-100 dark:bg-purple-900/50 hover:bg-purple-200/70 dark:hover:bg-purple-900/80" },
];

const chartData = [
  { status: "Present", count: 750, fill: "hsl(var(--chart-2))", icon: CheckCircle2 },
  { status: "On Leave", count: 120, fill: "hsl(var(--chart-4))", icon: CalendarOff },
  { status: "Absent", count: 22, fill: "hsl(var(--chart-1))", icon: UserX },
]

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

export default function AdminDashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold font-headline">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome, Admin! Here&apos;s an overview of your platform.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric) => (
          <Card key={metric.label} className="transition-all duration-300 ease-in-out hover:shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                {metric.label}
              </CardTitle>
              <metric.icon className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <span className={`${metric.color} font-semibold flex items-center`}>
                    <ArrowUpRight className="h-4 w-4 mr-1" />
                    {metric.growth}
                </span>
                from last month
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Today's Attendance Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
             <ChartContainer config={chartConfig} className="w-full h-[250px]">
                <BarChart data={chartData} accessibilityLayer>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="status"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                    tickFormatter={(value) => value.slice(0, 10)}
                  />
                  <YAxis />
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent
                        indicator="dot"
                        labelKey="status"
                        nameKey="count"
                      />
                    }
                  />
                  <Bar dataKey="count" radius={4} />
                </BarChart>
              </ChartContainer>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
            <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                        <div>
                            <p className="font-medium">{activity.name}</p>
                            <p className="text-muted-foreground">{activity.action}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-muted-foreground">{activity.time}</p>
                             <Badge variant={activity.status} className="mt-1 capitalize">{activity.status}</Badge>
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
      </div>
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <CardHeader className="md:col-span-3 p-0">
                <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            {quickActions.map((action) => (
                <Link href={action.href} key={action.title} className={cn("block p-4 rounded-lg transition-colors", action.className)}>
                    <div className="flex items-start gap-3">
                         <action.icon className="h-6 w-6 text-muted-foreground mt-1" />
                        <div>
                            <p className="font-semibold text-base">{action.title}</p>
                            <p className="text-sm text-muted-foreground">{action.description}</p>
                        </div>
                    </div>
                </Link>
            ))}
        </div>
    </div>
  );
}
