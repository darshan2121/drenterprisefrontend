"use client";

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
import { Trash2 } from "lucide-react";
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
import { useDispatch } from "react-redux";
import { removeEmployee } from "@/store/slices/employeeSlice";
import { useToast } from "@/hooks/use-toast";
import { authService } from "@/services/authService";

type Employee = { id: string; name: string; email: string; manager: string; status: 'Active' | 'On Leave' | 'Terminated'; shift: string; managerId: string; isWorking: boolean; };
type Manager = { _id: string; name: string; };

export function EmployeesList({ employees, managers }: { employees: Employee[], managers: Manager[] }) {
  const isMobile = useIsMobile();
  const dispatch = useDispatch();
  const { toast } = useToast();
  const isReadonly = authService.getCurrentUser()?.role === "readonly";

  const getStatusVariant = (status: Employee['status']) => {
    switch(status) {
        case 'Active': return 'default';
        case 'On Leave': return 'secondary';
        case 'Terminated': return 'destructive';
        default: return 'outline';
    }
  }

  const getManagerName = (managerId: string) => managers.find((m: any) => m._id === managerId)?.name || "-";

  const handleDelete = async (employee: any) => {
    try {
      await dispatch(removeEmployee({ id: employee.id }) as any).unwrap();
      toast({ title: "Deleted", description: `Employee ${employee.name} deleted.` });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to delete employee.", variant: "destructive" });
    }
  };

  if (isMobile) {
    return (
      <div className="space-y-3 p-2 sm:p-4 md:p-0">
        {employees.map((employee) => (
          <Card key={employee.id} className="shadow-md">
            <CardHeader className="flex flex-row items-start justify-between gap-2">
                <div className="min-w-0">
                    <CardTitle className="text-base sm:text-lg truncate">{employee.name}</CardTitle>
                    <CardDescription className="text-xs sm:text-base truncate">{employee.id}</CardDescription>
                </div>
                <Badge variant={getStatusVariant(employee.status)} className="w-fit text-xs sm:text-base">{employee.status}</Badge>
            </CardHeader>
            <CardContent className="space-y-2 text-sm sm:text-base">
              <p className="truncate"><strong className="text-muted-foreground">Email:</strong> {employee.email}</p>
              <p className="truncate"><strong className="text-muted-foreground">Manager:</strong> {getManagerName(employee.managerId)}</p>
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                {!isReadonly && <EditEmployeeModal employee={employee} managers={managers} />}
                {!isReadonly && <DeleteAction employee={employee} onDelete={handleDelete} />}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto w-full">
      <Table className="min-w-[600px]">
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[120px]">Name</TableHead>
            <TableHead className="hidden md:table-cell min-w-[100px]">ID</TableHead>
            <TableHead className="hidden lg:table-cell min-w-[180px]">Email</TableHead>
            <TableHead className="hidden md:table-cell min-w-[140px]">Assigned Manager</TableHead>
            <TableHead className="min-w-[80px]">Status</TableHead>
            <TableHead className="text-right min-w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees.map((employee) => (
            <TableRow key={employee.id}>
              <TableCell className="font-medium truncate max-w-[120px]">{employee.name}</TableCell>
              <TableCell className="hidden md:table-cell text-muted-foreground truncate max-w-[100px]">{employee.id}</TableCell>
              <TableCell className="hidden lg:table-cell text-muted-foreground truncate max-w-[180px]">{employee.email}</TableCell>
              <TableCell className="hidden md:table-cell text-muted-foreground truncate max-w-[140px]">{getManagerName(employee.managerId)}</TableCell>
              <TableCell>
                <Badge variant={getStatusVariant(employee.status)}>
                  {employee.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex gap-1 justify-end">
                  {!isReadonly && <EditEmployeeModal employee={employee} managers={managers} />}
                  {!isReadonly && <DeleteAction employee={employee} onDelete={handleDelete} />}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
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
