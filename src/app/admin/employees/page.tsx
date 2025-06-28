import { EmployeesList } from "@/components/admin/EmployeesList";
import { Card } from "@/components/ui/card";
import { AddEmployeeModal } from "@/components/admin/AddEmployeeModal";

const employees = [
  { id: 'EMP001', name: 'Alice Johnson', email: 'alice.j@example.com', manager: 'John Doe', status: 'Active', shift: '9 AM - 5 PM' },
  { id: 'EMP002', name: 'Bob Smith', email: 'bob.s@example.com', manager: 'Jane Roe', status: 'On Leave', shift: '1 PM - 9 PM' },
  { id: 'EMP003', name: 'Charlie Brown', email: 'charlie.b@example.com', manager: 'John Doe', status: 'Active', shift: '9 AM - 5 PM' },
  { id: 'EMP004', name: 'Diana Prince', email: 'diana.p@example.com', manager: 'Jane Roe', status: 'Terminated', shift: '9 AM - 5 PM' },
  { id: 'EMP005', name: 'Ethan Hunt', email: 'ethan.h@example.com', manager: 'John Doe', status: 'Active', shift: '1 PM - 9 PM' },
];

const managers = [
  { id: 'MGR01', name: 'John Doe' },
  { id: 'MGR02', name: 'Jane Roe' },
];

export default function EmployeesPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline">Employees</h1>
          <p className="text-muted-foreground">Manage all employees in the system.</p>
        </div>
        <AddEmployeeModal managers={managers} />
      </div>
      <Card className="shadow-sm">
        <EmployeesList employees={employees} managers={managers} />
      </Card>
    </div>
  );
}
