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

type Manager = { id: string; name: string; email: string; teamSize: number; status: 'Active' | 'Inactive'; location: string; };

export function ManagersList({ managers }: { managers: Manager[] }) {
  const isMobile = useIsMobile();
  
  const getStatusVariant = (status: Manager['status']) => {
    return status === 'Active' ? 'default' : 'secondary';
  }

  if (isMobile) {
    return (
      <div className="space-y-4 p-4 md:p-0">
        {managers.map((manager) => (
          <Card key={manager.id} className="shadow-md">
            <CardHeader className="flex flex-row items-start justify-between">
                <div className="flex items-center gap-4">
                    <Avatar>
                        <AvatarImage src={`https://i.postimg.cc/VvNcC0Cw/image-removebg-preview-1.png`} data-ai-hint="person" />
                        <AvatarFallback>{manager.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                        <CardTitle>{manager.name}</CardTitle>
                        <CardDescription>{manager.email}</CardDescription>
                    </div>
                </div>
                <Badge variant={getStatusVariant(manager.status)} className="w-fit">{manager.status}</Badge>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p><strong className="text-muted-foreground">Team Size:</strong> {manager.teamSize}</p>
              <p><strong className="text-muted-foreground">Location:</strong> {manager.location}</p>
              <div className="flex gap-2 pt-2">
                <EditManagerModal manager={manager} />
                <DeleteAction managerName={manager.name} />
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
          {managers.map((manager) => (
            <TableRow key={manager.id}>
              <TableCell className="font-medium flex items-center gap-3">
                <Avatar>
                    <AvatarImage src={`https://i.postimg.cc/VvNcC0Cw/image-removebg-preview-1.png`} data-ai-hint="person" />
                    <AvatarFallback>{manager.name.charAt(0)}</AvatarFallback>
                </Avatar>
                {manager.name}
              </TableCell>
              <TableCell className="hidden lg:table-cell text-muted-foreground">{manager.email}</TableCell>
              <TableCell className="hidden md:table-cell text-muted-foreground">{manager.teamSize}</TableCell>
              <TableCell className="hidden md:table-cell text-muted-foreground">{manager.location}</TableCell>
              <TableCell>
                <Badge variant={getStatusVariant(manager.status)}>
                  {manager.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex gap-1 justify-end">
                  <EditManagerModal manager={manager} />
                  <DeleteAction managerName={manager.name} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function DeleteAction({ managerName }: { managerName: string }) {
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
            This action cannot be undone. This will permanently delete the manager record for {managerName}.
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
