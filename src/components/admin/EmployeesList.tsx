"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, User } from "lucide-react";
import { EditEmployeeModal } from "@/components/admin/EditEmployeeModal";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useDispatch } from "react-redux";
import { removeEmployee } from "@/store/slices/employeeSlice";
import { useToast } from "@/hooks/use-toast";
import { authService } from "@/services/authService";
import Image from "next/image";
import { getApiUrl, API_CONFIG } from "@/lib/config";
import { SHIFT_LABELS, isAutoPunchEnabled } from "@/lib/autoPunchTargets";
import { Switch } from "@/components/ui/switch";

type Employee = { 
  id: string; 
  name: string; 
  email: string; 
  manager: string; 
  status: 'Active' | 'On Leave' | 'Terminated'; 
  shift: string; 
  managerId: string; 
  isWorking: boolean;
  enableAutoPunch?: boolean;
  image?: string;
  _raw?: {
    _id: string;
    email: string;
    name: string;
    mobile: string;
    address: string;
    managerId: {
      _id: string;
      name: string;
      email: string;
    };
    shift: string;
    isWorking: boolean;
    enableAutoPunch?: boolean;
    image: string;
    isCreatedByAdmin: boolean;
    createdAt: string;
    updatedAt: string;
  };
};
type Manager = { _id: string; name: string; };

export function EmployeesList({
  employees,
  managers,
  onRefresh,
  onToggleAutoPunch,
  togglingId,
}: {
  employees: Employee[];
  managers: Manager[];
  onRefresh?: () => void;
  onToggleAutoPunch?: (employee: Employee) => void;
  togglingId?: string | null;
}) {
  const isMobile = useIsMobile();
  const dispatch = useDispatch();
  const { toast } = useToast();
  const isReadonly = authService.getCurrentUser()?.role === "readonly";
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = isMobile ? 8 : 12; // Fewer items on mobile for better performance

  const getStatusVariant = (status: Employee['status']) => {
    switch(status) {
        case 'Active': return 'default';
        case 'On Leave': return 'secondary';
        case 'Terminated': return 'destructive';
        default: return 'outline';
    }
  }

  const getManagerName = (managerId: string) => managers.find((m: any) => m._id === managerId)?.name || "-";

  const getImageUrl = (employee: Employee) => {
    // Check for image in _raw object first (actual API response structure)
    const image = employee._raw?.image || employee.image;
    
    if (!image) {
      return null;
    }
    
    // Use centralized config for base URL - static files are served from the same domain
    const apiUrl = getApiUrl();
    let baseUrl = apiUrl;
    
    // Remove /api from the end if it exists
    if (baseUrl.endsWith('/api')) {
      baseUrl = baseUrl.slice(0, -4); // Remove '/api'
    } else if (baseUrl.endsWith('/api/')) {
      baseUrl = baseUrl.slice(0, -5); // Remove '/api/'
    }
    
    // Ensure the base URL is properly formatted
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const imageUrl = `${cleanBaseUrl}/static/${image}`;
    
    // Validate URL format
    try {
      new URL(imageUrl);
      return imageUrl;
    } catch (error) {
      return null;
    }
  };

  const getPlaceholderImage = (employeeName: string) => {
    return `https://placehold.co/400x400/6366f1/ffffff?text=${employeeName.charAt(0).toUpperCase()}`;
  };

  // Simple image component without complex retry logic
  const ResponsiveEmployeeImage = ({ employee }: { employee: Employee }) => {
    const actualImageUrl = getImageUrl(employee);
    const placeholderUrl = getPlaceholderImage(employee.name);
    
    return (
      <img 
        src={actualImageUrl || placeholderUrl}
        alt={employee.name}
        className="w-full h-full object-cover"
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

  const handleDelete = async (employee: any) => {
    try {
      await dispatch(removeEmployee({ id: employee.id }) as any).unwrap();
      toast({ title: "Deleted", description: `Employee ${employee.name} deleted.` });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to delete employee.", variant: "destructive" });
    }
  };

  // Pagination calculations
  const totalPages = Math.ceil(employees.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentEmployees = employees.slice(startIndex, endIndex);

  // Reset to first page when employees change
  useEffect(() => {
    setCurrentPage(1);
  }, [employees.length]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top when page changes
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (isMobile) {
    return (
      <>
        <div className="space-y-3 p-2 sm:p-4 md:p-0">
          {currentEmployees.map((employee) => (
            <Card key={employee.id} className="shadow-md">
              <CardHeader className="flex flex-row items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div 
                    className="h-12 w-12 rounded-full overflow-hidden relative"
                  >
                    <ResponsiveEmployeeImage employee={employee} />
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="text-base sm:text-lg truncate">{employee.name}</CardTitle>
                    <CardDescription className="text-xs sm:text-base truncate">{employee.id}</CardDescription>
                  </div>
                </div>
                <Badge variant={getStatusVariant(employee.status)} className="w-fit text-xs sm:text-base">{employee.status}</Badge>
              </CardHeader>
              <CardContent className="space-y-2 text-sm sm:text-base">
                <p className="truncate"><strong className="text-muted-foreground">Email:</strong> {employee.email}</p>
                <p className="truncate"><strong className="text-muted-foreground">Manager:</strong> {getManagerName(employee.managerId)}</p>
                <p className="truncate">
                  <strong className="text-muted-foreground">Shift:</strong>{" "}
                  {SHIFT_LABELS[employee.shift as keyof typeof SHIFT_LABELS] || employee.shift}
                </p>
                <p className="truncate">
                  <strong className="text-muted-foreground">Auto punch:</strong>
                </p>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={isAutoPunchEnabled(employee)}
                    disabled={togglingId === employee.id || isReadonly || !onToggleAutoPunch}
                    onCheckedChange={() => onToggleAutoPunch?.(employee)}
                  />
                  <span>{isAutoPunchEnabled(employee) ? "On" : "Off"}</span>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  {!isReadonly && <EditEmployeeModal employee={employee} managers={managers} onRefresh={onRefresh} />}
                  {!isReadonly && <DeleteAction employee={employee} onDelete={handleDelete} />}
                </div>
              </CardContent>
            </Card>
          ))}
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

        {/* Image Preview Modal */}
        <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Employee Photo</DialogTitle>
            </DialogHeader>
            {previewImage && (
              <div className="relative w-full h-64 rounded-lg overflow-hidden">
                <Image 
                  src={previewImage || ''} 
                  alt="Employee photo" 
                  fill
                  className="object-cover"
                />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <>
      <div className="overflow-x-auto w-full">
        <Table className="min-w-[600px]">
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[80px]">Photo</TableHead>
              <TableHead className="min-w-[120px]">Name</TableHead>
              <TableHead className="hidden md:table-cell min-w-[100px]">ID</TableHead>
              <TableHead className="hidden lg:table-cell min-w-[180px]">Email</TableHead>
              <TableHead className="hidden md:table-cell min-w-[140px]">Assigned Manager</TableHead>
              <TableHead className="min-w-[120px]">Shift</TableHead>
              <TableHead className="min-w-[100px]">Auto punch</TableHead>
              <TableHead className="min-w-[80px]">Status</TableHead>
              <TableHead className="text-right min-w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentEmployees.map((employee) => (
              <TableRow key={employee.id}>
                <TableCell>
                  <div 
                    className="h-10 w-10 rounded-full overflow-hidden"
                  >
                    <ResponsiveEmployeeImage employee={employee} />
                  </div>
                </TableCell>
                <TableCell className="font-medium truncate max-w-[120px]">{employee.name}</TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground truncate max-w-[100px]">{employee.id}</TableCell>
                <TableCell className="hidden lg:table-cell text-muted-foreground truncate max-w-[180px]">{employee.email}</TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground truncate max-w-[140px]">{getManagerName(employee.managerId)}</TableCell>
                <TableCell className="text-sm">
                  {SHIFT_LABELS[employee.shift as keyof typeof SHIFT_LABELS] || employee.shift}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={isAutoPunchEnabled(employee)}
                      disabled={togglingId === employee.id || isReadonly || !onToggleAutoPunch}
                      onCheckedChange={() => onToggleAutoPunch?.(employee)}
                    />
                    <Badge variant={isAutoPunchEnabled(employee) ? "default" : "outline"}>
                      {isAutoPunchEnabled(employee) ? "On" : "Off"}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={getStatusVariant(employee.status)}>
                    {employee.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                                  <div className="flex gap-1 justify-end">
                  {!isReadonly && <EditEmployeeModal employee={employee} managers={managers} onRefresh={onRefresh} />}
                  {!isReadonly && <DeleteAction employee={employee} onDelete={handleDelete} />}
                </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls - Desktop */}
      {totalPages > 1 && (
        <div className="flex flex-col items-center gap-4 p-6 border-t">
          {/* Page Info */}
          <span className="text-sm text-muted-foreground">
            Showing {startIndex + 1}-{Math.min(endIndex, employees.length)} of {employees.length} employees
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
          
          {/* Page Numbers */}
          <div className="flex items-center gap-1 flex-wrap justify-center">
            {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 7) {
                pageNum = i + 1;
              } else if (currentPage <= 4) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 3) {
                pageNum = totalPages - 6 + i;
              } else {
                pageNum = currentPage - 3 + i;
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

      {/* Image Preview Modal */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Employee Photo</DialogTitle>
          </DialogHeader>
          {previewImage && (
            <div className="relative w-full h-64 rounded-lg overflow-hidden">
                <Image 
                  src={previewImage || ''} 
                  alt="Employee photo" 
                  fill
                  className="object-cover"
                />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function DeleteAction({ employee, onDelete }: { employee: any, onDelete: (employee: any) => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the employee record for {employee.name}.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => onDelete(employee)}>Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
