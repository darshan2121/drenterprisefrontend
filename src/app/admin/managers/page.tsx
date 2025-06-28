import { ManagersList } from "@/components/admin/ManagersList";
import { Card } from "@/components/ui/card";
import { AddManagerModal } from "@/components/admin/AddManagerModal";

const managers = [
  { id: 'MGR01', name: 'John Doe', email: 'john.d@example.com', teamSize: 15, status: 'Active', location: 'Main Office' },
  { id: 'MGR02', name: 'Jane Roe', email: 'jane.r@example.com', teamSize: 12, status: 'Active', location: 'Branch Office' },
  { id: 'MGR03', name: 'Peter Jones', email: 'peter.j@example.com', teamSize: 8, status: 'Inactive', location: 'Remote' },
];

export default function ManagersPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline">Managers</h1>
          <p className="text-muted-foreground">Manage all managers in the system.</p>
        </div>
        <AddManagerModal />
      </div>
      <Card className="shadow-sm">
        <ManagersList managers={managers} />
      </Card>
    </div>
  );
}
