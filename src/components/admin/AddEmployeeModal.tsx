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
import { addEmployee } from "@/store/slices/employeeSlice";
import type { Manager } from "@/store/slices/managerSlice";

export function AddEmployeeModal({ managers, adminId }: { managers: { _id: string; name: string }[], adminId: string }) {

  console.log("managers--->",managers)
  const [form, setForm] = useState({
    name: '',
    email: '',
    managerId: '',
    shift: '',
    address: '',
    mobile: '',
  });
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const dispatch = useDispatch();

  const shiftMap: Record<string, string> = {
    "9 AM - 5 PM": "morning",
    "1 PM - 9 PM": "evening",
    "5 PM - 1 AM": "night",
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleManagerChange = (value: string) => {
    setForm(f => ({ ...f, managerId: value }));
  };

  const handleShiftChange = (value: string) => {
    setForm(f => ({ ...f, shift: value }));
  };

  const validateForm = () => {
    const requiredFields = {
      name: form.name,
      email: form.email,
      managerId: form.managerId,
      shift: form.shift,
      address: form.address,
      mobile: form.mobile
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

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return false;
    }

    // Mobile number validation (basic)
    if (form.mobile.length < 10 || !/^\d+$/.test(form.mobile)) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid 10-digit mobile number",
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
        managerId: form.managerId,
        shift: backendShift,
        address: form.address,
        mobile: form.mobile,
        createdBy: adminId,
        isCreatedByAdmin: true
      };

      // Use Redux thunk
      await dispatch(addEmployee(payload) as any).unwrap();

      toast({
        title: "Success!",
        description: `New employee has been added.`,
      });
      setIsOpen(false);
      setForm({
        name: '',
        email: '',
        managerId: '',
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

  console.log("Managers:", managers);

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
            <Input
              id="name"
              name="name"
              value={form.name}
              onChange={handleInputChange}
              placeholder="John Doe"
              className="col-span-3"
              disabled={isLoading}
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className="text-right">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleInputChange}
              placeholder="john.d@example.com"
              className="col-span-3"
              disabled={isLoading}
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="manager" className="text-right">Manager</Label>
            <Select
              value={form.managerId}
              onValueChange={handleManagerChange}
              disabled={isLoading}
              required
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select Manager" />
              </SelectTrigger>
              <SelectContent>
                {managers.map(manager => (
                  <SelectItem key={manager._id} value={manager._id}>
                    {manager.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="shift" className="text-right">Shift</Label>
            <Select
              value={form.shift}
              onValueChange={handleShiftChange}
              disabled={isLoading}
              required
            >
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
            <Label htmlFor="address" className="text-right">Address</Label>
            <Input
              id="address"
              name="address"
              value={form.address}
              onChange={handleInputChange}
              placeholder="Ahmedabad"
              className="col-span-3"
              disabled={isLoading}
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="mobile" className="text-right">Mobile</Label>
            <Input
              id="mobile"
              name="mobile"
              value={form.mobile}
              onChange={handleInputChange}
              placeholder="8128841553"
              className="col-span-3"
              disabled={isLoading}
              required
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