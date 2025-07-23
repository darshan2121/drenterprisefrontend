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
import { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { editEmployee } from "@/store/slices/employeeSlice";

type Employee = { id: string; name: string; email: string; managerId: string; shift: string; isWorking: boolean; };
type Manager = { _id: string; name: string; };

export function EditEmployeeModal({ employee, managers = [], ...props }) {
  if (!employee) return null;
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const dispatch = useDispatch();

  // Local state for editable fields
  const [name, setName] = useState(employee.name);
  const [email, setEmail] = useState(employee.email);
  const [managerId, setManagerId] = useState(
    employee.managerId && managers.some(m => String(m._id) === String(employee.managerId))
      ? String(employee.managerId)
      : (managers[0]?._id ? String(managers[0]._id) : '')
  );
  const [shift, setShift] = useState(employee.shift);
  const [isWorking, setIsWorking] = useState(employee.isWorking);

  // Sync all fields with employee prop when modal opens
  useEffect(() => {
    if (isOpen) {
      setName(employee.name);
      setEmail(employee.email);
      setShift(employee.shift);
      setIsWorking(employee.isWorking);
      // Defensive: fallback to first manager if not found or empty
      const found = managers.find(m => String(m._id) === String(employee.managerId));
      setManagerId(found ? String(employee.managerId) : (managers[0]?._id ? String(managers[0]._id) : ''));
    }
  }, [isOpen, employee, managers]);

  const shiftMap: Record<string, string> = {
    "9 AM - 5 PM": "morning",
    "1 PM - 9 PM": "evening",
    "5 PM - 1 AM": "night",
    "morning": "morning",
    "evening": "evening",
    "night": "night",
  };

  const handleSaveChanges = async () => {
    setIsLoading(true);
    try {
      if (!managerId) {
        toast({
          title: "Error",
          description: "Please select a manager.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
      const backendShift = shiftMap[shift] || shift;
      const body = {
        name,
        email,
        managerId: String(managerId),
        shift: backendShift,
        isWorking,
      };
      await dispatch(editEmployee({ id: employee.id, body }) as any).unwrap();
      toast({
        title: "Success!",
        description: `Employee ${name}'s profile has been updated.`,
      });
      setIsOpen(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update employee.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] sm:w-full sm:max-w-md md:max-w-lg max-h-[90vh] overflow-y-auto rounded-lg p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Edit Employee</DialogTitle>
          <DialogDescription>
            Update the details for the employee.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">Full Name</Label>
            <Input id="name" value={name} onChange={e => setName(e.target.value)} className="col-span-3" disabled={isLoading} />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className="text-right">Email</Label>
            <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} className="col-span-3" disabled={isLoading} />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="manager" className="text-right">Supervisor</Label>
            <Select value={managerId} onValueChange={setManagerId} disabled={isLoading}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select a manager" />
              </SelectTrigger>
              <SelectContent>
                {managers.map(m => <SelectItem key={m._id} value={String(m._id)}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="shift" className="text-right">Shift</Label>
            <Select value={shift} onValueChange={setShift} disabled={isLoading}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select a shift" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="morning">9 AM - 5 PM</SelectItem>
                <SelectItem value="evening">1 PM - 9 PM</SelectItem>
                <SelectItem value="night">5 PM - 1 AM</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="status" className="text-right">Status</Label>
            <div className="col-span-3 flex items-center space-x-2">
              <Switch id="status" checked={isWorking} onCheckedChange={setIsWorking} disabled={isLoading} />
              <Label htmlFor="status">{isWorking ? 'Active' : 'Inactive'}</Label>
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
