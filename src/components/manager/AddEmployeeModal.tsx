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
import { useDispatch } from "react-redux";
import { addEmployeeByManager } from "@/store/slices/employeeSlice";

export function AddEmployeeModal() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    shift: '',
    address: '',
    mobile: '',
  });
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const dispatch = useDispatch();

  const shiftMap: Record<string, string> = {
    "7 AM - 3 PM": "morning",
    "2 PM - 10 PM": "evening",
    "10 PM - 7 AM": "night",
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleShiftChange = (value: string) => {
    setForm(f => ({ ...f, shift: value }));
  };

  const validateForm = () => {
    const requiredFields = {
      name: form.name,
      shift: form.shift,
      address: form.address,
    };

    const missingFields = Object.entries(requiredFields)
      .filter(([_, value]) => !value)
      .map(([key]) => key);

    if (missingFields.length > 0) {
      toast({
        title: "Validation Error",
        description: `Missing required fields: ${missingFields.join(', ')}`,
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleSaveChanges = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const backendShift = shiftMap[form.shift] || form.shift;
      const payload = {
        name: form.name,
        email: form.email,
        shift: backendShift,
        address: form.address,
        mobile: form.mobile,
      };

      await dispatch(addEmployeeByManager(payload) as any).unwrap();

      toast({
        title: "Success!",
        description: "New employee has been added.",
      });
      setIsOpen(false);
      setForm({
        name: '',
        email: '',
        shift: '',
        address: '',
        mobile: '',
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to add employee. Please check console for details.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Employee
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] sm:w-full sm:max-w-md md:max-w-lg max-h-[90vh] overflow-y-auto rounded-lg p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Add New Employee</DialogTitle>
          <DialogDescription>
            Fill in the details for the new employee.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-left sm:text-right">Full Name</Label>
            <Input
              id="name"
              name="name"
              value={form.name}
              onChange={handleInputChange}
              placeholder="John Doe"
              className="sm:col-span-3"
              disabled={isLoading}
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className="text-left sm:text-right">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleInputChange}
              placeholder="john.d@example.com"
              className="sm:col-span-3"
              disabled={isLoading}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
            <Label htmlFor="shift" className="text-left sm:text-right">Shift</Label>
            <Select value={form.shift} onValueChange={handleShiftChange} disabled={isLoading}>
              <SelectTrigger className="sm:col-span-3">
                <SelectValue placeholder="Select a shift" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7 AM - 3 PM">7 AM - 3 PM (Morning)</SelectItem>
                <SelectItem value="2 PM - 10 PM">2 PM - 10 PM (Evening)</SelectItem>
                <SelectItem value="10 PM - 7 AM">10 PM - 7 AM (Night)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
            <Label htmlFor="address" className="text-left sm:text-right">Address</Label>
            <Input
              id="address"
              name="address"
              value={form.address}
              onChange={handleInputChange}
              placeholder="Enter address"
              className="sm:col-span-3"
              disabled={isLoading}
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
            <Label htmlFor="mobile" className="text-left sm:text-right">Mobile</Label>
            <Input
              id="mobile"
              name="mobile"
              value={form.mobile}
              onChange={handleInputChange}
              placeholder="10-digit mobile number"
              className="sm:col-span-3"
              disabled={isLoading}
            />
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