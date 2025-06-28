"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
  DialogClose
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Edit, Loader2 } from "lucide-react";
import { useState } from "react";

type Employee = { id: string; name: string; email: string; manager: string; status: 'Active' | 'On Leave' | 'Terminated'; shift: string; };
type Manager = { id: string; name:string; };

export function EditEmployeeModal({ employee, managers }: { employee: Employee, managers: Manager[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSaveChanges = async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));

    toast({
        title: "Success!",
        description: `Employee ${employee.name}'s profile has been updated.`,
    })
    setIsLoading(false);
    setIsOpen(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Employee</DialogTitle>
          <DialogDescription>
            Make changes to {employee.name}&apos;s profile here. Click save when you&apos;re done.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">Full Name</Label>
            <Input id="name" defaultValue={employee.name} className="col-span-3" disabled={isLoading} />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className="text-right">Email</Label>
            <Input id="email" type="email" defaultValue={employee.email} className="col-span-3" disabled={isLoading} />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="manager" className="text-right">Manager</Label>
            <Select defaultValue={managers.find(m => m.name === employee.manager)?.id} disabled={isLoading}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select a manager" />
              </SelectTrigger>
              <SelectContent>
                {managers.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="shift" className="text-right">Shift</Label>
            <Select defaultValue={employee.shift} disabled={isLoading}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select a shift" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="9 AM - 5 PM">9 AM - 5 PM</SelectItem>
                <SelectItem value="1 PM - 9 PM">1 PM - 9 PM</SelectItem>
                <SelectItem value="5 PM - 1 AM">5 PM - 1 AM</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="status" className="text-right">Status</Label>
            <div className="col-span-3 flex items-center space-x-2">
              <Switch id="status" defaultChecked={employee.status === 'Active'} disabled={isLoading} />
              <Label htmlFor="status">{employee.status === 'Active' ? 'Active' : 'Inactive'}</Label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isLoading}>Cancel</Button>
          </DialogClose>
          <Button type="submit" onClick={handleSaveChanges} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
