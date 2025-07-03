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

export function ManagersList() {
  const { managers, isLoading, error } = useSelector((state: any) => state.manager);
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const dispatch = useDispatch<AppDispatch>();

  const getStatusVariant = (status: string) => {
    return status === 'Active' ? 'default' : 'secondary';
  };

  const handleDelete = async (manager: Manager) => {
    try {
      await dispatch(removeManager({ id: manager._id, body: { name: manager.name, email: manager.email } }) as any).unwrap();
      toast({ title: "Deleted", description: `Manager ${manager.name} deleted.` });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to delete manager.", variant: "destructive" });
    }
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading managers...</div>;
  if (error) return <div className="p-8 text-center text-destructive">{error}</div>;

  if (isMobile) {
    return (
      <div className="space-y-4 p-4 md:p-0">
        {managers.map((manager: Manager) => (
          <Card key={manager._id} className="shadow-md">
            <CardHeader className="pb-2 flex flex-row items-start justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={`/dr-enterprise-logo.png`} data-ai-hint="person" />
                  <AvatarFallback>{manager.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-base font-bold leading-tight">{manager.name}</CardTitle>
                  <CardDescription className="text-xs">{manager.email}</CardDescription>
                </div>
              </div>
              <Badge variant={getStatusVariant(manager.status || (manager.isActive ? 'Active' : 'Inactive'))} className="w-fit text-xs px-2 py-1">{manager.status || (manager.isActive ? 'Active' : 'Inactive')}</Badge>
            </CardHeader>
            <CardContent className="space-y-1 text-sm pb-2">
              <p><strong className="text-muted-foreground">Team Size:</strong> {manager.teamSize ?? ''}</p>
              <p><strong className="text-muted-foreground">Location:</strong> {manager.location || manager.address || ''}</p>
              <div className="flex gap-2 pt-2 justify-end">
                <EditManagerModal manager={manager} />
                <DeleteAction manager={manager} onDelete={handleDelete} />
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
            <TableHead className="hidden lg:table-cell">Email</TableHead>
            <TableHead className="hidden md:table-cell">Team Size</TableHead>
            <TableHead className="hidden md:table-cell">Location</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {managers.map((manager: Manager) => (
           <TableRow key={manager._id}>
              <TableCell className="font-medium flex items-center gap-3">
                <Avatar>
                    <AvatarImage src={`/dr-enterprise-logo.png`} data-ai-hint="person" />
                    <AvatarFallback>{manager.name.charAt(0)}</AvatarFallback>
                </Avatar>
                {manager.name}
              </TableCell>
              <TableCell className="hidden lg:table-cell text-muted-foreground">{manager.email}</TableCell>
              <TableCell className="hidden md:table-cell text-muted-foreground">{manager.teamSize ?? ''}</TableCell>
              <TableCell className="hidden md:table-cell text-muted-foreground">{manager.location || manager.address || ''}</TableCell>
              <TableCell>
                <Badge variant={getStatusVariant(manager.status || (manager.isActive ? 'Active' : 'Inactive'))}>
                  {manager.status || (manager.isActive ? 'Active' : 'Inactive')}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex gap-1 justify-end">
                  <EditManagerModal manager={manager} />
                  <DeleteAction manager={manager} onDelete={handleDelete} />
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
            This action cannot be undone. This will permanently delete the manager record for {manager.name}.
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
