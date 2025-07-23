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
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Users, Mail, UserCheck, Clock, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EditEmployeeModal } from "@/components/admin/EditEmployeeModal";
import { useToast } from "@/hooks/use-toast";
import { removeEmployee } from "@/store/slices/employeeSlice";

export default function EmployeesPage() {
  const { toast } = useToast();
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

  const handleDelete = async (employee: any) => {
    try {
      await dispatch(removeEmployee({ id: employee.id }) as any).unwrap();
      toast({ title: "Deleted", description: `Employee ${employee.name} deleted.` });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to delete employee.", variant: "destructive" });
    }
  };

  // Get adminId from localStorage if available
  let adminId = "";
  if (typeof window !== "undefined") {
    adminId = localStorage.getItem("adminId") || "";
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Mobile-first container */}
      <div className="w-full max-w-7xl mx-auto px-3 py-4 space-y-4 sm:px-6 lg:px-8">
        
        {/* Header Section */}
        <div className="mb-6">
          <AdminPageHeader
            title="Employees"
            subtitle="Manage all employees in the system."
            action={<AddEmployeeModal managers={managersList} createdBy={adminId} />}
          />
        </div>

        {/* Employees Content */}
        <Card className="w-full border-0 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="flex flex-col items-center space-y-4">
                <Image 
                  src="/dr-enterprise-logo.png" 
                  alt="D.R. Enterprise Logo" 
                  width={60} 
                  height={60} 
                  className="animate-pulse" 
                />
                <span className="text-gray-500 dark:text-gray-400">Loading employees...</span>
              </div>
            </div>
          ) : (
            <div className="overflow-hidden">
              {/* Mobile: Card-based layout, Desktop: Table layout */}
              <div className="block sm:hidden">
                {/* Mobile Cards Layout */}
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      Employees ({employeesList.length})
                    </h3>
                  </div>
                  
                  {employeesList.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                      <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No employees found</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {employeesList.map((employee) => (
                        <div key={employee.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center space-x-3 min-w-0 flex-1">
                              <div className="flex-shrink-0 w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                                  {employee.name}
                                </h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                  {employee.email}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                employee.status === 'Active' 
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                  : employee.status === 'On Leave'
                                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              }`}>
                                {employee.status}
                              </span>
                              {/* <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button> */}
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="flex items-center space-x-2">
                              <Clock className="h-4 w-4 text-gray-400" />
                              <div>
                                <span className="text-gray-500 dark:text-gray-400">Shift:</span>
                                <div className="font-medium text-gray-900 dark:text-gray-100">
                                  {employee.shift === 'morning' ? '7 AM - 3 PM (Morning)' :
                                   employee.shift === 'evening' ? '2 PM - 10 PM (Evening)' :
                                   employee.shift === 'night' ? '10 PM - 7 AM (Night)' :
                                   employee.shift || 'Regular'}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <UserCheck className="h-4 w-4 text-gray-400" />
                              <div>
                                <span className="text-gray-500 dark:text-gray-400">Working:</span>
                                <div className="font-medium text-gray-900 dark:text-gray-100">
                                  {employee.isWorking ? 'Yes' : 'No'}
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Manager Info */}
                          {employee.managerId && (
                            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                              <div className="flex items-center space-x-2 text-sm">
                                <UserCheck className="h-4 w-4 text-gray-400" />
                                <span className="text-gray-500 dark:text-gray-400">Manager ID:</span>
                                <span className="font-medium text-gray-900 dark:text-gray-100 text-xs">
                                  {employee.managerId}
                                </span>
                              </div>
                            </div>
                          )}
                          {/* Action Buttons */}
                          <div className="flex gap-2 pt-4">
                            <EditEmployeeModal employee={employee} managers={managersList} />
                            <Button variant="destructive" size="sm" onClick={() => handleDelete(employee)}>
                              Delete
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Desktop Table Layout */}
              <div className="hidden sm:block">
                <EmployeesList employees={employeesList} managers={managersList} />
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}