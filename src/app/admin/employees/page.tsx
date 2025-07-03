"use client";

import { EmployeesList } from "@/components/admin/EmployeesList";
import { Card } from "@/components/ui/card";
import { AddEmployeeModal } from "@/components/admin/AddEmployeeModal";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchEmployees } from "@/store/slices/employeeSlice";
import { fetchManagers } from "@/store/slices/managerSlice";
import type { AppDispatch, RootState } from "@/store";
import Image from "next/image";

export default function EmployeesPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { employees, isLoading } = useSelector((state: RootState) => state.employee);
  const { managers } = useSelector((state: RootState) => state.manager);

  useEffect(() => {
    dispatch(fetchEmployees());
    dispatch(fetchManagers());
  }, [dispatch]);

  const employeesList = employees.map(emp => ({
    id: emp._id,
    name: emp.name,
    email: emp.email,
    managerId: typeof emp.managerId === 'string'
      ? emp.managerId
      : ((emp.managerId as any)?._id || ''),
    manager: '',
    isWorking: emp.isWorking,
    status: emp.isWorking ? 'Active' : ('On Leave' as 'On Leave' | 'Active' | 'Terminated'),
    shift: emp.shift,
    _raw: emp,
  }));
  const managersList = managers;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline">Employees</h1>
          <p className="text-muted-foreground">Manage all employees in the system.</p>
        </div>
        <AddEmployeeModal managers={managersList} adminId="685f0aeb984f9d6919377447" />
      </div>
      <Card className="shadow-sm">
        {isLoading ? (
          <div className="p-8 text-center flex justify-center">
            <Image src="/dr-enterprise-logo.png" alt="D.R. Enterprise Logo" width={80} height={80} className="mx-auto animate-pulse" />
          </div>
        ) : (
          <EmployeesList employees={employeesList} managers={managersList} />
        )}
      </Card>
    </div>
  );
}
