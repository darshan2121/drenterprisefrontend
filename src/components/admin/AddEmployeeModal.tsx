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
import { useToast } from "@/hooks/use-toast";
import { Loader2, PlusCircle } from "lucide-react";
import { useState } from "react";

type Manager = { id: string; name:string; };

export function AddEmployeeModal({ managers }: { managers: Manager[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSaveChanges = async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    toast({
        title: "Success!",
        description: `New employee has been added.`,
    })
    setIsLoading(false);
    setIsOpen(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Employee
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Employee</DialogTitle>
          <DialogDescription>
            Fill in the details for the new employee.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">Full Name</Label>
            <Input id="name" placeholder="John Doe" className="col-span-3" disabled={isLoading}/>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className="text-right">Email</Label>
            <Input id="email" type="email" placeholder="john.d@example.com" className="col-span-3" disabled={isLoading} />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="manager" className="text-right">Manager</Label>
            <Select disabled={isLoading}>
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
            <Select disabled={isLoading}>
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
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isLoading}>Cancel</Button>
          </DialogClose>
          <Button type="submit" onClick={handleSaveChanges} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add Employee
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
