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
import { Edit, Loader2 } from "lucide-react";
import { useState } from "react";

type Report = {
    date: string;
    employee: string;
    shift: string;
    location: string;
    status: 'Present' | 'Absent' | 'On Leave';
    clockIn: string;
    clockOut: string;
};

export function EditReportModal({ report }: { report: Report }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const [location, setLocation] = useState(report.location);
  const [status, setStatus] = useState<Report['status']>(report.status);
  const [shift, setShift] = useState(report.shift);
  const [clockIn, setClockIn] = useState(report.clockIn);
  const [clockOut, setClockOut] = useState(report.clockOut);


  const handleSaveChanges = async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    toast({
        title: "Success!",
        description: `Report has been updated for ${report.employee} on ${report.date}.`,
    })
    setIsLoading(false);
    setIsOpen(false);
  }

  const handleOpenChange = (open: boolean) => {
    if (open) {
        // Reset state to props when opening modal to avoid stale data
        setLocation(report.location);
        setStatus(report.status);
        setShift(report.shift);
        setClockIn(report.clockIn);
        setClockOut(report.clockOut);
    }
    setIsOpen(open);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Edit className="h-4 w-4" />
          <span className="sr-only">Edit Report</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Report Entry</DialogTitle>
          <DialogDescription>
            Update the attendance record for {report.employee} on {report.date}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="status" className="text-right">Status</Label>
            <Select value={status} onValueChange={(value) => setStatus(value as Report['status'])} disabled={isLoading}>
                <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="Present">Present</SelectItem>
                    <SelectItem value="Absent">Absent</SelectItem>
                    <SelectItem value="On Leave">On Leave</SelectItem>
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
                <SelectItem value="9 AM - 5 PM">9 AM - 5 PM</SelectItem>
                <SelectItem value="1 PM - 9 PM">1 PM - 9 PM</SelectItem>
                <SelectItem value="5 PM - 1 AM">5 PM - 1 AM</SelectItem>
                <SelectItem value="-">-</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="clockIn" className="text-right">Clock In</Label>
            <Input 
                id="clockIn" 
                value={clockIn} 
                onChange={(e) => setClockIn(e.target.value)} 
                className="col-span-3" 
                disabled={isLoading}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="clockOut" className="text-right">Clock Out</Label>
            <Input 
                id="clockOut" 
                value={clockOut} 
                onChange={(e) => setClockOut(e.target.value)} 
                className="col-span-3" 
                disabled={isLoading}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="location" className="text-right">Location</Label>
            <Input 
                id="location" 
                value={location} 
                onChange={(e) => setLocation(e.target.value)} 
                className="col-span-3" 
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
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
