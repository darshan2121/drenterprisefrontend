import { ReportsFilter } from "@/components/admin/ReportsFilter";
import { ReportsTable } from "@/components/admin/ReportsTable";
import { Card } from "@/components/ui/card";

const reports = [
    { date: '2024-05-20', employee: 'Alice Johnson', shift: '9 AM - 5 PM', location: 'Main Office', status: 'Present' as const, clockIn: '09:01 AM', clockOut: '05:03 PM' },
    { date: '2024-05-20', employee: 'Bob Smith', shift: '1 PM - 9 PM', location: 'Client Site A', status: 'On Leave' as const, clockIn: '-', clockOut: '-' },
    { date: '2024-05-20', employee: 'Charlie Brown', shift: '9 AM - 5 PM', location: 'Main Office', status: 'Present' as const, clockIn: '08:58 AM', clockOut: '05:00 PM' },
    { date: '2024-05-19', employee: 'Alice Johnson', shift: '9 AM - 5 PM', location: 'Main Office', status: 'Present' as const, clockIn: '09:05 AM', clockOut: '05:01 PM' },
    { date: '2024-05-19', employee: 'Bob Smith', shift: '1 PM - 9 PM', location: 'Remote', status: 'Present' as const, clockIn: '01:00 PM', clockOut: '09:05 PM' },
    { date: '2024-05-19', employee: 'Charlie Brown', shift: '9 AM - 5 PM', location: 'N/A', status: 'Absent' as const, clockIn: '-', clockOut: '-' },
];
const employees = [{ name: 'Alice Johnson' }, { name: 'Bob Smith' }, { name: 'Charlie Brown' }];
const managers = [{ name: 'John Doe' }, { name: 'Jane Roe' }];


export default function ReportsPage() {
    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-3xl font-bold font-headline">Attendance Reports</h1>
                <p className="text-muted-foreground">Generate, filter, and edit attendance reports.</p>
            </div>
            <Card className="shadow-sm">
                <ReportsFilter employees={employees} managers={managers} />
            </Card>
            <Card className="shadow-sm">
                <ReportsTable reports={reports} />
            </Card>
        </div>
    );
}
