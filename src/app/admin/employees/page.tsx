"use client";

import { EmployeesList } from "@/components/admin/EmployeesList";
import { Card } from "@/components/ui/card";
import { AddEmployeeModal } from "@/components/admin/AddEmployeeModal";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchEmployees, removeEmployee, editEmployee, patchEmployeeLocal } from "@/store/slices/employeeSlice";
import { fetchManagers } from "@/store/slices/managerSlice";
import type { AppDispatch, RootState } from "@/store";
import Image from "next/image";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Users, UserCheck, Clock } from "lucide-react";
import { getApiUrl } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { EditEmployeeModal } from "@/components/admin/EditEmployeeModal";
import { useToast } from "@/hooks/use-toast";
import { DebouncedSearch } from "@/components/ui/debounced-search";
import { Switch } from "@/components/ui/switch";
import { updateEmployee } from "@/lib/api";
import {
  AUTO_PUNCH_TARGETS,
  SHIFT_LABELS,
  getAutoPunchCounts,
  isAutoPunchEnabled,
  type AutoPunchShift,
} from "@/lib/autoPunchTargets";

export default function EmployeesPage() {
  const { toast } = useToast();
  const dispatch = useDispatch<AppDispatch>();
  const { employees, isLoading } = useSelector((state: RootState) => state.employee);
  const { managers } = useSelector((state: RootState) => state.manager);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedShift, setSelectedShift] = useState<AutoPunchShift | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [adminId, setAdminId] = useState("");

  useEffect(() => {
    setAdminId(localStorage.getItem("adminId") || "");
  }, []);
  
  // Pagination state
  // const [currentPage, setCurrentPage] = useState(1);
  // const itemsPerPage = 10; // Show 10 employees per page
  
  // Search state
  // const [searchTerm, setSearchTerm] = useState('');

  // Helper function to get image URL
  const getImageUrl = (image: string | undefined) => {
    if (!image) return undefined;
    const apiUrl = getApiUrl();
    let baseUrl = apiUrl;
    
    // Remove /api from the end if it exists
    if (baseUrl.endsWith('/api')) {
      baseUrl = baseUrl.slice(0, -4); // Remove '/api'
    } else if (baseUrl.endsWith('/api/')) {
      baseUrl = baseUrl.slice(0, -5); // Remove '/api/'
    }
    
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const imageUrl = `${cleanBaseUrl}/static/${image}`;
    return imageUrl;
  };

  // Simple image component without complex retry logic
  const ResponsiveEmployeeImage = ({ employee }: { employee: any }) => {
    const actualImageUrl = employee._raw?.image || employee.image;
    const placeholderUrl = `https://placehold.co/400x400/6366f1/ffffff?text=${employee.name?.charAt(0).toUpperCase() || 'E'}`;
    
    return (
      <img 
        src={actualImageUrl ? getImageUrl(actualImageUrl) || placeholderUrl : placeholderUrl}
        alt={employee.name || 'Employee'}
        className="w-full h-full object-cover rounded-full"
        loading="lazy"
        onError={(e) => {
          e.currentTarget.src = placeholderUrl;
        }}
        style={{ 
          display: 'block',
          width: '100%',
          height: '100%',
          objectFit: 'cover'
        }}
      />
    );
  };

  useEffect(() => {
    dispatch(fetchEmployees());
    dispatch(fetchManagers());
  }, [dispatch]);

  // Filter by search + optional shift (auto-punch ON only when a shift card is selected)
  const filteredEmployees = employees.filter((emp) => {
    if (selectedShift) {
      if (emp.shift !== selectedShift) return false;
      if (!isAutoPunchEnabled(emp)) return false;
    }

    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      emp.name?.toLowerCase().includes(searchLower) ||
      emp.email?.toLowerCase().includes(searchLower) ||
      emp.shift?.toLowerCase().includes(searchLower)
    );
  });

  const employeesList = filteredEmployees.map((emp) => ({
    id: emp._id,
    name: emp.name,
    email: emp.email,
    managerId: typeof emp.managerId === "string"
      ? emp.managerId
      : ((emp.managerId as any)?._id || ""),
    manager: "",
    isWorking: emp.isWorking,
    enableAutoPunch: emp.enableAutoPunch !== false,
    status: emp.isWorking ? "Active" : ("On Leave" as "On Leave" | "Active" | "Terminated"),
    shift: emp.shift,
    _raw: emp,
  }));
  const managersList = managers;

  const autoPunchCounts = useMemo(
    () => getAutoPunchCounts(employees),
    [employees],
  );

  const handleShiftFilterClick = (shift: AutoPunchShift) => {
    setSelectedShift((prev) => (prev === shift ? null : shift));
    setCurrentPage(1);
  };

  const handleToggleAutoPunch = async (employee: {
    id: string;
    name: string;
    enableAutoPunch?: boolean;
  }) => {
    const previousValue = isAutoPunchEnabled(employee);
    const nextValue = !previousValue;
    setTogglingId(employee.id);

    // Update UI immediately so counts change right away
    dispatch(
      patchEmployeeLocal({
        id: employee.id,
        changes: { enableAutoPunch: nextValue },
      }),
    );

    try {
      // JSON body (not FormData) so boolean is saved correctly
      const res: any = await updateEmployee(employee.id, {
        enableAutoPunch: nextValue,
      });

      const saved = res?.employee;
      if (saved?._id) {
        dispatch(
          patchEmployeeLocal({
            id: employee.id,
            changes: {
              ...saved,
              // Force the value we set — old APIs may omit this field
              enableAutoPunch: nextValue,
            },
          }),
        );
      }

      toast({
        title: nextValue ? "Auto punch enabled" : "Auto punch disabled",
        description: `${employee.name}: count updated (${nextValue ? "+1" : "-1"}).`,
      });
    } catch (error: any) {
      // Revert UI if API failed
      dispatch(
        patchEmployeeLocal({
          id: employee.id,
          changes: { enableAutoPunch: previousValue },
        }),
      );
      toast({
        title: "Error",
        description: error.message || "Failed to update auto punch. Is the new backend deployed?",
        variant: "destructive",
      });
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (employee: any) => {
    try {
      await dispatch(removeEmployee({ id: employee.id }) as any).unwrap();
      toast({ title: "Deleted", description: `Employee ${employee.name} deleted.` });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to delete employee.", variant: "destructive" });
    }
  };

  // Pagination calculations
  const totalPages = Math.ceil(employeesList.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentEmployees = employeesList.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [employeesList.length, selectedShift, searchTerm]);

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
          
          {/* Search Bar */}
          <div className="mt-4">
            <DebouncedSearch
              placeholder="Search employees by name, email, or shift..."
              onSearch={setSearchTerm}
              onClear={() => setSearchTerm('')}
              debounceDelay={300}
            />
          </div>

          {/* Totals + shift filters */}
          <div className="mt-4 space-y-3">
            <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Total employees
                </div>
                <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">
                  {employees.length}
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                Auto punch on:{" "}
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {autoPunchCounts.morning + autoPunchCounts.evening + autoPunchCounts.night}
                </span>
                {" · "}
                Showing:{" "}
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {employeesList.length}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {([
                ["morning", "1st shift"],
                ["evening", "2nd shift"],
                ["night", "3rd shift"],
              ] as const).map(([shift, label]) => {
                const count = autoPunchCounts[shift];
                const target = AUTO_PUNCH_TARGETS[shift];
                const over = count > target;
                const under = count < target;
                const isSelected = selectedShift === shift;
                return (
                  <button
                    type="button"
                    key={shift}
                    onClick={() => handleShiftFilterClick(shift)}
                    aria-pressed={isSelected}
                    className={`relative rounded-xl border-2 px-4 py-3 text-left transition ${
                      isSelected
                        ? "border-blue-600 bg-blue-600 text-white shadow-md scale-[1.01]"
                        : "border-gray-200 bg-white text-gray-900 hover:border-blue-300 hover:bg-blue-50/60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:border-blue-500"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div
                        className={`text-xs font-semibold uppercase tracking-wide ${
                          isSelected ? "text-blue-100" : "text-muted-foreground"
                        }`}
                      >
                        {label}
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                          isSelected
                            ? "bg-white text-blue-700"
                            : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                        }`}
                      >
                        {isSelected ? "Selected" : "Tap to filter"}
                      </span>
                    </div>
                    <div className={`mt-1 text-2xl font-bold ${isSelected ? "text-white" : ""}`}>
                      {count}
                      <span className={`text-base font-medium ${isSelected ? "text-blue-100" : "text-muted-foreground"}`}>
                        {" "}/ {target} target
                      </span>
                    </div>
                    <div className={`text-xs mt-1 ${isSelected ? "text-blue-100" : "text-muted-foreground"}`}>
                      {SHIFT_LABELS[shift]}
                      {" · "}
                      {over ? "over target" : under ? "under target" : "on target"}
                    </div>
                    {!isSelected && (
                      <div className="mt-2 text-[11px] text-blue-600 dark:text-blue-400">
                        Shows auto-punch On only
                      </div>
                    )}
                    {isSelected && (
                      <div className="mt-2 text-[11px] font-medium text-white/90">
                        Filtering auto-punch On · click again to clear
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {selectedShift && (
              <div className="flex items-center justify-between gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm dark:border-blue-800 dark:bg-blue-950/40">
                <span className="text-blue-900 dark:text-blue-100">
                  Filter active: <strong>{SHIFT_LABELS[selectedShift]}</strong> · auto-punch On only
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-blue-300 bg-white hover:bg-blue-50"
                  onClick={() => setSelectedShift(null)}
                >
                  Show all employees
                </Button>
              </div>
            )}
          </div>
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
                      {searchTerm ? (
                        <>
                          Search Results ({employeesList.length} of {employees.length})
                          <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">
                            for "{searchTerm}"
                          </span>
                        </>
                      ) : (
                        `Employees (${employeesList.length})`
                      )}
                    </h3>
                  </div>
                  
                  {employeesList.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                      <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      {searchTerm ? (
                        <>
                          <p>No employees found for "{searchTerm}"</p>
                          <p className="text-sm mt-2">Try a different search term or clear the search</p>
                        </>
                      ) : (
                        <p>No employees found</p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {currentEmployees.map((employee) => (
                        <div key={employee.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center space-x-3 min-w-0 flex-1">
                              <div 
                                className="flex-shrink-0 w-10 h-10 rounded-full overflow-hidden cursor-pointer"
                                onClick={() => {
                                  const img = getImageUrl(employee._raw?.image);
                                  if (img) {
                                    setPreviewImage(img);
                                  }
                                }}
                              >
                                <ResponsiveEmployeeImage employee={employee} />
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
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="flex items-center space-x-2">
                              <Clock className="h-4 w-4 text-gray-400" />
                              <div>
                                <span className="text-gray-500 dark:text-gray-400">Shift:</span>
                                <div className="font-medium text-gray-900 dark:text-gray-100">
                                  {SHIFT_LABELS[employee.shift as keyof typeof SHIFT_LABELS] ||
                                    employee.shift ||
                                    "Regular"}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <UserCheck className="h-4 w-4 text-gray-400" />
                              <div className="flex-1">
                                <span className="text-gray-500 dark:text-gray-400">Auto punch:</span>
                                <div className="mt-1 flex items-center gap-2">
                                  <Switch
                                    checked={isAutoPunchEnabled(employee)}
                                    disabled={togglingId === employee.id}
                                    onCheckedChange={() => handleToggleAutoPunch(employee)}
                                  />
                                  <span className="font-medium text-gray-900 dark:text-gray-100">
                                    {isAutoPunchEnabled(employee) ? "On" : "Off"}
                                  </span>
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
                            <EditEmployeeModal employee={employee} managers={managersList} onRefresh={() => dispatch(fetchEmployees())} />
                            <Button variant="destructive" size="sm" onClick={() => handleDelete(employee)}>
                              Delete
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Pagination Controls - Mobile */}
                {totalPages > 1 && (
                  <div className="flex flex-col items-center gap-3 p-4 border-t">
                    {/* Page Info */}
                    <span className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </span>
                    
                    {/* Simple Pagination Controls */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="flex-shrink-0"
                      >
                        ← Previous
                      </Button>
                      
                      <span className="text-sm text-muted-foreground px-2">
                        {currentPage} of {totalPages}
                      </span>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="flex-shrink-0"
                      >
                        Next →
                      </Button>
                    </div>
                    
                    {/* Quick Page Numbers for Mobile */}
                    <div className="flex items-center gap-1 flex-wrap justify-center">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePageChange(pageNum)}
                            className="w-8 h-8 text-xs"
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Desktop Table Layout */}
              <div className="hidden sm:block">
                <EmployeesList
                  employees={employeesList}
                  managers={managersList}
                  onRefresh={() => dispatch(fetchEmployees())}
                  onToggleAutoPunch={handleToggleAutoPunch}
                  togglingId={togglingId}
                />
              </div>
            </div>
          )}
        </Card>
      </div>


      {/* Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Employee Photo</h3>
              <button
                onClick={() => setPreviewImage(null)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>
            <div className="relative w-full h-64 rounded-lg overflow-hidden">
              <Image 
                src={previewImage} 
                alt="Employee photo" 
                fill
                className="object-cover"
                onError={() => {
                  console.log('❌ Preview image failed to load:', previewImage);
                }}
                onLoad={() => {
                  console.log('✅ Preview image loaded successfully:', previewImage);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}