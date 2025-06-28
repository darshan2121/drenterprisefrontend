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

type Employee = { id: string; name: string; email: string; manager: string; status: 'Active' | 'On Leave' | 'Terminated'; shift: string; };
type Manager = { id: string; name: string; };

export function EmployeesList({ employees, managers }: { employees: Employee[], managers: Manager[] }) {
  const isMobile = useIsMobile();

  const getStatusVariant = (status: Employee['status']) => {
    switch(status) {
        case 'Active': return 'default';
        case 'On Leave': return 'secondary';
        case 'Terminated': return 'destructive';
        default: return 'outline';
    }
  }

  if (isMobile) {
    return (
      <div className="space-y-4 p-4 md:p-0">
        {employees.map((employee) => (
          <Card key={employee.id} className="shadow-md">
            <CardHeader className="flex flex-row items-start justify-between">
                <div>
                    <CardTitle>{employee.name}</CardTitle>
                    <CardDescription>{employee.id}</CardDescription>
                </div>
                <Badge variant={getStatusVariant(employee.status)} className="w-fit">{employee.status}</Badge>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p><strong className="text-muted-foreground">Email:</strong> {employee.email}</p>
              <p><strong className="text-muted-foreground">Manager:</strong> {employee.manager}</p>
              <div className="flex gap-2 pt-2">
                <EditEmployeeModal employee={employee} managers={managers} />
                <DeleteAction employeeName={employee.name} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead className="hidden md:table-cell">ID</TableHead>
          <TableHead className="hidden lg:table-cell">Email</TableHead>
          <TableHead className="hidden md:table-cell">Assigned Manager</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {employees.map((employee) => (
          <TableRow key={employee.id}>
            <TableCell className="font-medium">{employee.name}</TableCell>
            <TableCell className="hidden md:table-cell text-muted-foreground">{employee.id}</TableCell>
            <TableCell className="hidden lg:table-cell text-muted-foreground">{employee.email}</TableCell>
            <TableCell className="hidden md:table-cell text-muted-foreground">{employee.manager}</TableCell>
            <TableCell>
              <Badge variant={getStatusVariant(employee.status)}>
                {employee.status}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex gap-1 justify-end">
                <EditEmployeeModal employee={employee} managers={managers} />
                <DeleteAction employeeName={employee.name} />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
    </div>
  );
}

function DeleteAction({ employeeName }: { employeeName: string }) {
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
            This action cannot be undone. This will permanently delete the employee record for {employeeName}.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive">Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
