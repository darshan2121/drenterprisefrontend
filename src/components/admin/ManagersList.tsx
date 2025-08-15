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
import { EditManagerModal } from "@/components/admin/EditManagerModal";
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
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useSelector, useDispatch } from "react-redux";
import { fetchManagers, removeManager, Manager } from "@/store/slices/managerSlice";
import type { AppDispatch } from "@/store";
import { authService } from "@/services/authService";

export function ManagersList() {
  const { managers, isLoading, error } = useSelector((state: any) => state.manager);
  const { isMobile } = useIsMobile();
  const { toast } = useToast();
  const dispatch = useDispatch<AppDispatch>();
  const isReadonly = authService.getCurrentUser()?.role === "readonly";

  const getStatusVariant = (status: string) => {
    return status === 'Active' ? 'default' : 'secondary';
  };

  const handleDelete = async (manager: Manager) => {
    try {
      await dispatch(removeManager({ id: manager._id, body: { name: manager.name, email: manager.email } }) as any).unwrap();
      toast({ title: "Deleted", description: `Supervisor ${manager.name} deleted.` });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to delete supervisor.", variant: "destructive" });
    }
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading supervisors...</div>;
  if (error) return <div className="p-8 text-center text-destructive">{error}</div>;

  if (isMobile) {
    return (
      <div className="space-y-3 p-2 sm:p-4 md:p-0">
        {managers.map((manager: Manager) => (
          <Card key={manager._id} className="shadow-sm">
            <CardHeader className="flex flex-row items-start justify-between gap-2">
              <div className="min-w-0">
                <CardTitle className="text-base sm:text-lg font-bold truncate">{manager.name}</CardTitle>
                <CardDescription className="text-xs sm:text-base truncate">{manager._id}</CardDescription>
              </div>
              <Badge variant={getStatusVariant(manager.status || (manager.isActive ? 'Active' : 'Inactive'))} className="w-fit text-xs sm:text-base">
                {manager.status || (manager.isActive ? 'Active' : 'Inactive')}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-2 text-sm sm:text-base">
              <p className="truncate"><strong className="text-muted-foreground">Email:</strong> {manager.email}</p>
              <p className="truncate"><strong className="text-muted-foreground">Team Size:</strong> {manager.teamSize || '0'}</p>
              <p className="truncate"><strong className="text-muted-foreground">Location:</strong> {manager.location || manager.address || 'Not specified'}</p>
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                {!isReadonly && <EditManagerModal manager={manager} />}
                {!isReadonly && <DeleteAction manager={manager} onDelete={handleDelete} />}
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
            <TableHead className="hidden lg:table-cell min-w-[180px]">Email</TableHead>
            <TableHead className="hidden md:table-cell min-w-[100px]">Team Size</TableHead>
            <TableHead className="hidden md:table-cell min-w-[140px]">Location</TableHead>
            <TableHead className="min-w-[80px]">Status</TableHead>
            <TableHead className="text-right min-w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {managers.map((manager: Manager) => (
           <TableRow key={manager._id}>
              <TableCell className="font-medium flex items-center gap-3 max-w-[120px] truncate">
                <Avatar className="h-8 w-8">
                    <AvatarImage src={`https://placehold.co/40x40.png`} data-ai-hint="person" />
                    <AvatarFallback className="text-sm">{manager.name.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="truncate">{manager.name}</span>
              </TableCell>
              <TableCell className="hidden lg:table-cell text-muted-foreground max-w-[180px] truncate">
                <span className="truncate block" title={manager.email}>{manager.email}</span>
              </TableCell>
              <TableCell className="hidden md:table-cell text-muted-foreground max-w-[100px] truncate">{manager.teamSize || '0'}</TableCell>
              <TableCell className="hidden md:table-cell text-muted-foreground max-w-[140px] truncate">
                <span className="truncate block" title={manager.location || manager.address || ''}>
                  {manager.location || manager.address || 'Not specified'}
                </span>
              </TableCell>
              <TableCell>
                <Badge variant={getStatusVariant(manager.status || (manager.isActive ? 'Active' : 'Inactive'))}>
                  {manager.status || (manager.isActive ? 'Active' : 'Inactive')}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex gap-1 justify-end">
                  {!isReadonly && <EditManagerModal manager={manager} />}
                  {!isReadonly && <DeleteAction manager={manager} onDelete={handleDelete} />}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function DeleteAction({ manager, onDelete }: { manager: Manager, onDelete: (manager: Manager) => void }) {
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
            This action cannot be undone. This will permanently delete the supervisor record for {manager.name}.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => onDelete(manager)}>Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
