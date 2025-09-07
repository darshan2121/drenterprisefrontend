"use client";

import { AdminManagement } from "@/components/admin/AdminManagement";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Card } from "@/components/ui/card";

export default function AdminsPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Admin Management"
        subtitle="Manage admin accounts and their access permissions"
      />
      <Card className="border-0 shadow-sm">
        <AdminManagement />
      </Card>
    </div>
  );
}
