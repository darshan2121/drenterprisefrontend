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
import { useDispatch } from 'react-redux';
import { updateAttendanceRecord } from '@/store/slices/attendanceSlice';

type Report = {
    date: string;
    employee: string;
    shift: string;
    location: string;
    status: 'Present' | 'Absent' | 'On Leave';
    clockIn: string;
    clockOut: string;
    _id?: string;
    attendanceId?: string;
    id?: string;
};

export function EditReportModal({ report, onRefresh }: { report: Report, onRefresh?: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const dispatch = useDispatch();

  const [location, setLocation] = useState(report.location);
  // Remove status state
  // const [status, setStatus] = useState<Report['status']>(report.status);
  // Only allow 'morning', 'evening', 'night' for shift
  const [shift, setShift] = useState(report.shift);
  const [clockIn, setClockIn] = useState(report.clockIn);
  const [clockOut, setClockOut] = useState(report.clockOut);

  const handleSaveChanges = async () => {
    setIsLoading(true);
    try {
      const attendanceId = report._id || report.attendanceId || report.id;
      if (!attendanceId) throw new Error('Attendance ID is missing');
      
      const updateData = {
        date: report.date,
        employee: report.employee,
        shift, // send as 'morning', 'evening', or 'night'
        location,
        // status, // removed
        clockIn,
        clockOut,
      };

      await dispatch(updateAttendanceRecord({ id: attendanceId, data: updateData }) as any);
      
      if (onRefresh) await onRefresh(); // <-- ensure this is awaited

      toast({
        title: "Success!",
        description: `Report has been updated for ${report.employee} on ${report.date}.`,
      });
      setIsOpen(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.response?.data?.message || error.message || "Failed to update report.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (open) {
        setLocation(report.location);
        // setStatus(report.status); // removed
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
      <DialogContent className="w-[95vw] sm:w-full sm:max-w-md md:max-w-lg max-h-[90vh] overflow-y-auto rounded-lg p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Edit Report Entry</DialogTitle>
          <DialogDescription>
            Update the attendance record for {report.employee} on {report.date}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* Status field removed */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="shift" className="text-right">Shift</Label>
            <Select value={shift} onValueChange={setShift} disabled={isLoading}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select a shift" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="morning">9 AM - 5 PM (Morning)</SelectItem>
                <SelectItem value="evening">1 PM - 9 PM (Evening)</SelectItem>
                <SelectItem value="night">5 PM - 1 AM (Night)</SelectItem>
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
