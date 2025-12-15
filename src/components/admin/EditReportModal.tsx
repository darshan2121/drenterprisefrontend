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
import { updateAttendanceRecord, fetchAttendance } from '@/store/slices/attendanceSlice';

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
    stepInDate?: string;
    stepOutDate?: string;
    // Raw attendance data for location fields
    _raw?: {
        longitude?: number;
        latitude?: number;
        address?: string;
        stepInLongitude?: number;
        stepInLatitude?: number;
        stepInAddress?: string;
        stepOutLongitude?: number;
        stepOutLatitude?: number;
        stepOutAddress?: string;
    };
};

export function EditReportModal({ 
  report, 
  onRefresh,
  filters // Add filters prop to refresh with same filters
}: { 
  report: Report;
  onRefresh?: () => void;
  filters?: {
    managerId?: string;
    employeeId?: string;
    startDate?: string;
    endDate?: string;
    order?: string;
  };
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const dispatch = useDispatch();

  // Helper function to convert 12-hour format to 24-hour format for input
  const convertTo24Hour = (time12h: string): string => {
    if (!time12h || time12h === '--') return '';
    
    try {
      // Handle formats like "2:10 PM" or "2:10PM"
      const time = time12h.trim();
      const [timePart, period] = time.split(/(AM|PM)/i);
      if (!timePart || !period) return ''; // Return empty if not in expected format
      
      const [hours, minutes] = timePart.split(':');
      let hour24 = parseInt(hours);
      
      if (period.toUpperCase() === 'PM' && hour24 !== 12) {
        hour24 += 12;
      } else if (period.toUpperCase() === 'AM' && hour24 === 12) {
        hour24 = 0;
      }
      
      return `${hour24.toString().padStart(2, '0')}:${minutes || '00'}`;
    } catch (error) {
      console.error('Error converting time:', time12h, error);
      return ''; // Return empty if conversion fails
    }
  };

  // Helper function to convert 24-hour format to 12-hour format for display
  const convertTo12Hour = (time24h: string): string => {
    if (!time24h || time24h === '--') return '--';
    
    try {
      const [hours, minutes] = time24h.split(':');
      const hour24 = parseInt(hours);
      const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
      const period = hour24 >= 12 ? 'PM' : 'AM';
      return `${hour12}:${minutes || '00'} ${period}`;
    } catch (error) {
      console.error('Error converting time:', time24h, error);
      return time24h;
    }
  };

  const [location, setLocation] = useState(report.location);
  const [shift, setShift] = useState(report.shift);
  const [clockIn, setClockIn] = useState(convertTo24Hour(report.clockIn));
  const [clockOut, setClockOut] = useState(convertTo24Hour(report.clockOut));
  const [startDate, setStartDate] = useState(report.stepInDate || report.date || '');
  const [endDate, setEndDate] = useState(report.stepOutDate || '');

  const handleSaveChanges = async () => {
    setIsLoading(true);
    try {
      const attendanceId = report._id || report.attendanceId || report.id;
      if (!attendanceId) throw new Error('Attendance ID is missing');
      
      // Convert clockIn and clockOut to ISO strings using the selected dates
      // Only process valid time values (not "--" or empty strings)
      const isValidTime = (time: string) => time && time !== '--' && time.trim() !== '' && time.match(/^\d{2}:\d{2}$/);
      const isValidDate = (date: string) => date && date !== '--' && date.trim() !== '';
      
      let stepIn: string | undefined = undefined;
      let stepOut: string | undefined = undefined;
      
      // Validate startDate is provided if clockIn is set
      if (isValidTime(clockIn) && !isValidDate(startDate)) {
        toast({
          title: "Validation Error",
          description: "Start Date is required when Clock In time is provided.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
      
      if (isValidTime(clockIn) && isValidDate(startDate)) {
        try {
          // Use the selected startDate instead of report.date
          const stepInDate = new Date(`${startDate}T${clockIn}:00`);
          if (!isNaN(stepInDate.getTime())) {
            // Store as UTC (toISOString() automatically converts to UTC)
            stepIn = stepInDate.toISOString();
            console.log(`Clock In: ${startDate} ${clockIn} -> ${stepIn} (UTC)`);
          }
        } catch (error) {
          console.error('Error parsing clockIn time:', clockIn, error);
        }
      }
      
      if (isValidTime(clockOut) && endDate) {
        try {
          // Use the selected endDate for stepOut
          const stepOutDate = new Date(`${endDate}T${clockOut}:00`);
          if (!isNaN(stepOutDate.getTime())) {
            // Store as UTC (toISOString() automatically converts to UTC)
            stepOut = stepOutDate.toISOString();
            console.log(`Clock Out: ${endDate} ${clockOut} -> ${stepOut} (UTC)`);
          }
        } catch (error) {
          console.error('Error parsing clockOut time:', clockOut, error);
        }
      } else if (isValidTime(clockOut) && !endDate && startDate) {
        // If endDate is not provided but clockOut is, use startDate (same day)
        try {
          const stepOutDate = new Date(`${startDate}T${clockOut}:00`);
          // Handle night shift that spans across midnight
          if (shift === 'night' && clockIn && clockOut < clockIn) {
            // If stepOut is earlier than stepIn, it means it's the next day
            stepOutDate.setDate(stepOutDate.getDate() + 1);
          }
          if (!isNaN(stepOutDate.getTime())) {
            stepOut = stepOutDate.toISOString();
            console.log(`Clock Out: ${startDate} ${clockOut} -> ${stepOut} (UTC)`);
          }
        } catch (error) {
          console.error('Error parsing clockOut time:', clockOut, error);
        }
      }

      // Prepare location data - use existing coordinates if available, otherwise keep current values
      const updateData: any = {
        shift,
      };
      
      // Only include stepIn and stepOut if they have valid values
      if (stepIn !== undefined) {
        updateData.stepIn = stepIn;
      }
      if (stepOut !== undefined) {
        updateData.stepOut = stepOut;
      }

      // If location text has changed, update the address field
      if (location !== report.location) {
        updateData.address = location;
        
        // If we have existing coordinates, keep them; otherwise they'll remain unchanged
        if (report._raw?.longitude !== undefined) {
          updateData.longitude = report._raw.longitude;
        }
        if (report._raw?.latitude !== undefined) {
          updateData.latitude = report._raw.latitude;
        }
        
        // Also update step-specific location fields if they exist
        if (report._raw?.stepInLongitude !== undefined) {
          updateData.stepInLongitude = report._raw.stepInLongitude;
        }
        if (report._raw?.stepInLatitude !== undefined) {
          updateData.stepInLatitude = report._raw.stepInLatitude;
        }
        if (report._raw?.stepInAddress !== undefined) {
          updateData.stepInAddress = location; // Update step-in address with new location
        }
      }

      console.log('Sending update data:', updateData);
      // Check for time changes by comparing converted times
      const originalClockIn24 = convertTo24Hour(report.clockIn);
      const originalClockOut24 = convertTo24Hour(report.clockOut);
      const hasClockInChange = clockIn !== originalClockIn24;
      const hasClockOutChange = clockOut !== originalClockOut24;
      
      console.log('Validation check:', {
        originalShift: report.shift,
        newShift: shift,
        hasShiftChange: shift !== report.shift,
        originalClockIn: report.clockIn,
        originalClockIn24,
        newClockIn: clockIn,
        hasClockInChange,
        originalClockOut: report.clockOut,
        originalClockOut24,
        newClockOut: clockOut,
        hasClockOutChange,
        hasTimeChanges: stepIn !== undefined || stepOut !== undefined,
        hasLocationChanges: location !== report.location,
        stepIn,
        stepOut,
        originalLocation: report.location,
        newLocation: location
      });

      // Validate that we have at least some meaningful changes to update
      // Check if shift has actually changed or if we have other valid updates
      const hasShiftChange = shift !== report.shift;
      const hasTimeChanges = stepIn !== undefined || stepOut !== undefined;
      const hasLocationChanges = location !== report.location;
      const hasStartDateChange = startDate !== (report.stepInDate || report.date);
      const hasEndDateChange = endDate !== (report.stepOutDate || '');
      
      if (!hasShiftChange && !hasTimeChanges && !hasLocationChanges && !hasStartDateChange && !hasEndDateChange) {
        toast({
          title: "No Changes",
          description: "Please make some changes before saving.",
          variant: "destructive",
        });
        return;
      }

      await dispatch(updateAttendanceRecord({ id: attendanceId, data: updateData }) as any);
      
      if (onRefresh) await onRefresh(); // <-- ensure this is awaited

      toast({
        title: "Success!",
        description: `Report has been updated for ${report.employee}${startDate ? ` on ${startDate}` : ''}.`,
      });
      setIsOpen(false);
    } catch (error: any) {
      console.error('Error updating attendance:', error);
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
        setShift(report.shift);
        setClockIn(convertTo24Hour(report.clockIn));
        setClockOut(convertTo24Hour(report.clockOut));
        setStartDate(report.stepInDate || report.date || '');
        setEndDate(report.stepOutDate || '');
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
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="shift" className="text-right">Shift</Label>
            <Select value={shift} onValueChange={setShift} disabled={isLoading}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select a shift" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="morning">7 AM - 3 PM (Morning)</SelectItem>
                <SelectItem value="evening">2 PM - 10 PM (Evening)</SelectItem>
                <SelectItem value="night">10 PM - 7 AM (Night)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="startDate" className="text-right">Start Date</Label>
            <Input 
                id="startDate" 
                type="date"
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)} 
                className="col-span-3" 
                disabled={isLoading}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="clockIn" className="text-right">Clock In</Label>
            <Input 
                id="clockIn" 
                type="time"
                value={clockIn} 
                onChange={(e) => setClockIn(e.target.value)} 
                className="col-span-3" 
                disabled={isLoading}
                placeholder="HH:MM"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="endDate" className="text-right">End Date</Label>
            <Input 
                id="endDate" 
                type="date"
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)} 
                className="col-span-3" 
                disabled={isLoading}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="clockOut" className="text-right">Clock Out</Label>
            <Input 
                id="clockOut" 
                type="time"
                value={clockOut} 
                onChange={(e) => setClockOut(e.target.value)} 
                className="col-span-3" 
                disabled={isLoading}
                placeholder="HH:MM"
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