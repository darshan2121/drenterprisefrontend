"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Loader2, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useDispatch } from "react-redux";
import { bulkUpdateAttendance, fetchAttendance } from "@/store/slices/attendanceSlice";

type BulkUpdateModalProps = {
  selectedIds: string[];
  onSuccess: () => void;
  trigger: React.ReactNode;
  disabled?: boolean;
  currentFilters?: {
    managerId?: string;
    employeeId?: string;
    startDate?: string;
    endDate?: string;
    order?: string;
  };
  selectedRecords?: Array<{
    _id?: string;
    id?: string;
    date: string;
    stepIn?: string;
    stepOut?: string;
  }>;
};

export function BulkUpdateModal({ selectedIds, onSuccess, trigger, disabled, currentFilters, selectedRecords }: BulkUpdateModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stepIn, setStepIn] = useState("");
  const [stepOut, setStepOut] = useState("");
  const [shift, setShift] = useState("");
  const { toast } = useToast();
  const dispatch = useDispatch();

  // Set default values when modal opens
  useEffect(() => {
    if (open) {
      // Set default to morning shift
      setShift("morning");
      const defaultTimes = getShiftTimes("morning");
      setStepIn(defaultTimes.stepIn);
      setStepOut(defaultTimes.stepOut);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stepIn || !stepOut || !shift) {
      toast({
        title: "Error",
        description: "Please fill in all fields.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setLoading(true);
      
      // Get the date from the selected records - use the first record's date
      let targetDate = new Date().toISOString().split('T')[0]; // Default to today
      if (selectedRecords && selectedRecords.length > 0) {
        const firstRecord = selectedRecords[0];
        if (firstRecord.date && firstRecord.date !== '--') {
          targetDate = firstRecord.date;
        }
      }

      // Create datetime strings in the correct format with proper timezone handling
      // Convert local time to UTC for proper storage
      const stepInDateTime = new Date(`${targetDate}T${stepIn}:00`);
      const stepOutDateTime = new Date(`${targetDate}T${stepOut}:00`);
      
      // Handle night shift that spans across midnight
      if (shift === 'night' && stepOut < stepIn) {
        // If stepOut is earlier than stepIn, it means it's the next day
        stepOutDateTime.setDate(stepOutDateTime.getDate() + 1);
      }

      // Convert to UTC but preserve the local time values
      // This ensures the time stored in the database matches what the user selected
      const stepInUTC = new Date(stepInDateTime.getTime() - (stepInDateTime.getTimezoneOffset() * 60000));
      const stepOutUTC = new Date(stepOutDateTime.getTime() - (stepOutDateTime.getTimezoneOffset() * 60000));

      console.log('Bulk update data:', {
        attendanceIds: selectedIds,
        originalStepIn: stepInDateTime.toISOString(),
        originalStepOut: stepOutDateTime.toISOString(),
        stepIn: stepInUTC.toISOString(),
        stepOut: stepOutUTC.toISOString(),
        shift
      });

      // Use Redux action for bulk update
      const result = await dispatch(bulkUpdateAttendance({
        attendanceIds: selectedIds,
        stepIn: stepInUTC.toISOString(),
        stepOut: stepOutUTC.toISOString(),
        shift,
      }) as any);

      // Check if the action was successful
      if (bulkUpdateAttendance.fulfilled.match(result)) {
        
        console.log('Bulk update successful, result:', result.payload);
        
        toast({
          title: "Success",
          description: `Successfully updated ${selectedIds.length} attendance record(s).`,
        });

        // Force refresh the data immediately
        
        // Refresh with current filters and force cache bust
        if (currentFilters) {
          console.log('Refreshing data with filters:', currentFilters);
          
          // Force a fresh fetch with timestamp
          const refreshResult = await dispatch(fetchAttendance({
            ...currentFilters,
            _timestamp: Date.now(),
          }) as any);
          
          console.log('Refresh result:', refreshResult);
          
          // Force another refresh after a short delay to ensure data is updated
          setTimeout(async () => {
            console.log('Forcing second refresh...');
            await dispatch(fetchAttendance({
              ...currentFilters,
              _timestamp: Date.now() + 2000,
            }) as any);
          }, 1000);
          
          // If refresh failed, try again after a short delay
          if (refreshResult.error) {
            console.log('First refresh failed, retrying...');
            setTimeout(async () => {
              await dispatch(fetchAttendance({
                ...currentFilters,
                _timestamp: Date.now() + 1000,
              }) as any);
            }, 1000);
          }
        }
        
        // Close modal and call success callback
        setOpen(false);
        onSuccess();

      } else if (bulkUpdateAttendance.rejected.match(result)) {
        throw new Error(result.payload as string || 'Bulk update failed');
      }

    } catch (error: any) {
      console.error('Bulk update error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update attendance records. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getShiftTimes = (selectedShift: string) => {
    switch (selectedShift) {
      case "morning":
        return { stepIn: "08:00", stepOut: "17:00" };
      case "evening":
        return { stepIn: "14:00", stepOut: "22:00" };
      case "night":
        return { stepIn: "22:00", stepOut: "07:00" };
      default:
        return { stepIn: "", stepOut: "" };
    }
  };

  const handleShiftChange = (newShift: string) => {
    setShift(newShift);
    const times = getShiftTimes(newShift);
    setStepIn(times.stepIn);
    setStepOut(times.stepOut);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div>{trigger}</div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Bulk Update Attendance</DialogTitle>
          <DialogDescription>
            Update clock-in, clock-out times and shift for {selectedIds.length} selected record(s).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="shift">Shift</Label>
              <Select value={shift} onValueChange={handleShiftChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select shift" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="morning">Morning (8 AM - 5 PM)</SelectItem>
                  <SelectItem value="evening">Evening (2 PM - 10 PM)</SelectItem>
                  <SelectItem value="night">Night (10 PM - 7 AM)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="stepIn">Clock In Time</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="stepIn"
                  type="time"
                  value={stepIn}
                  onChange={(e) => setStepIn(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="stepOut">Clock Out Time</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="stepOut"
                  type="time"
                  value={stepOut}
                  onChange={(e) => setStepOut(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || selectedIds.length === 0}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update {selectedIds.length} Record{selectedIds.length !== 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}