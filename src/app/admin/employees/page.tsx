"use client";

import { EmployeesList } from "@/components/admin/EmployeesList";
import { Card } from "@/components/ui/card";
import { AddEmployeeModal } from "@/components/admin/AddEmployeeModal";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchEmployees } from "@/store/slices/employeeSlice";
import { fetchManagers } from "@/store/slices/managerSlice";
import type { AppDispatch, RootState } from "@/store";
import Image from "next/image";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Users, Mail, UserCheck, Clock, MoreVertical } from "lucide-react";
import { getApiUrl } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { EditEmployeeModal } from "@/components/admin/EditEmployeeModal";
import { useToast } from "@/hooks/use-toast";
import { removeEmployee } from "@/store/slices/employeeSlice";
import { DebouncedSearch } from "@/components/ui/debounced-search";

export default function EmployeesPage() {
  const { toast } = useToast();
  const dispatch = useDispatch<AppDispatch>();
  const { employees, isLoading } = useSelector((state: RootState) => state.employee);
  const { managers } = useSelector((state: RootState) => state.manager);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
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

  // Filter employees based on search term
  const filteredEmployees = employees.filter(emp => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      emp.name?.toLowerCase().includes(searchLower) ||
      emp.email?.toLowerCase().includes(searchLower) ||
      emp.shift?.toLowerCase().includes(searchLower)
    );
  });

  const employeesList = filteredEmployees.map(emp => ({
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

  // Pagination calculations
  const totalPages = Math.ceil(employeesList.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentEmployees = employeesList.slice(startIndex, endIndex);

  // Reset to first page when employees change
  useEffect(() => {
    setCurrentPage(1);
  }, [employeesList.length]);

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top when page changes
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
          
          {/* Search Bar */}
          <div className="mt-4">
            <DebouncedSearch
              placeholder="Search employees by name, email, or shift..."
              onSearch={setSearchTerm}
              onClear={() => setSearchTerm('')}
              debounceDelay={300}
            />
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
                <EmployeesList employees={employeesList} managers={managersList} onRefresh={() => dispatch(fetchEmployees())} />
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