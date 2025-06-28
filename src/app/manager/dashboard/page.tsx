import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Users, LogIn, LogOut, FileText } from "lucide-react";
import { TeamAttendanceTable } from "@/components/manager/TeamAttendanceTable";

const metrics = [
    {
        icon: Users,
        label: "Total Employees",
        value: "15",
        color: "text-chart-1",
    },
    {
        icon: LogIn,
        label: "Clocked In",
        value: "12",
        color: "text-chart-2",
    },
    {
        icon: LogOut,
        label: "On Leave",
        value: "3",
        color: "text-chart-4",
    },
    {
        icon: FileText,
        label: "Total Documents",
        value: "27",
        color: "text-chart-5",
    },
];

const teamMembers = [
    { id: 'EMP001', name: 'Alice Johnson', email: 'alice.j@example.com', status: 'Clocked In', shift: '9 AM - 5 PM' },
    { id: 'EMP003', name: 'Charlie Brown', email: 'charlie.b@example.com', status: 'Clocked In', shift: '9 AM - 5 PM' },
    { id: 'EMP005', name: 'Ethan Hunt', email: 'ethan.h@example.com', status: 'On Leave', shift: '1 PM - 9 PM' },
    { id: 'EMP006', name: 'Fiona Glenanne', email: 'fiona.g@example.com', status: 'Clocked Out', shift: '9 AM - 5 PM' },
];

export default function ManagerDashboardPage() {
    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-3xl font-bold font-headline">Manager Dashboard</h1>
                <p className="text-muted-foreground">
                    Here&apos;s an overview of your team.
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {metrics.map((metric) => (
                    <Card key={metric.label} className="transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-xl">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">
                                {metric.label}
                            </CardTitle>
                            <metric.icon className={`h-5 w-5 ${metric.color}`} />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{metric.value}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="flex flex-col gap-6">
                <h2 className="text-2xl font-bold font-headline">Team Attendance</h2>
                <Card className="shadow-sm">
                    <TeamAttendanceTable teamMembers={teamMembers} />
                </Card>
            </div>
        </div>
    );
}
