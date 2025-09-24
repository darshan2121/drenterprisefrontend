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
import { http } from "@/lib/http";
import { ENDPOINTS } from "@/lib/endpoints";

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

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      // Clear all fields - let user choose what to update
      console.log('Modal opening - clearing all fields');
      console.log('Current state before clearing:', { shift, stepIn, stepOut });
      setShift("");
      setStepIn("");
      setStepOut("");
    } else {
      // Also clear when modal closes to ensure clean state
      console.log('Modal closing - clearing all fields');
      setShift("");
      setStepIn("");
      setStepOut("");
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Debug: Log current form state
    console.log('Form submission - Current state:', { shift, stepIn, stepOut });
    
    // Validate that at least one field is provided
    // Note: stepOut can be empty string to clear the value, so we don't count it as "no field provided"
    const hasShift = shift && shift.trim() !== '';
    const hasStepIn = stepIn && stepIn.trim() !== '';
    const hasStepOut = stepOut && stepOut.trim() !== '';
    
    if (!hasShift && !hasStepIn && !hasStepOut) {
      toast({
        title: "Error",
        description: "Please provide at least one field to update (shift, clock in, or clock out).",
        variant: "destructive",
      });
      return;
    }
    
    // Validate that if times are provided, they are valid
    if ((stepIn && stepIn.trim() !== '' && !stepIn.match(/^\d{2}:\d{2}$/)) || 
        (stepOut && stepOut.trim() !== '' && !stepOut.match(/^\d{2}:\d{2}$/))) {
      toast({
        title: "Error",
        description: "Please provide valid time format (HH:MM).",
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

      // Prepare update data - only include fields that have values
      const updateData: any = {
        attendanceIds: selectedIds,
      };

      // Add shift if provided
      if (shift) {
        updateData.shift = shift;
      }

      // Handle stepIn: send ISO string if valid, or null if empty
      if (stepIn && stepIn.trim() !== '') {
        const stepInDateTime = new Date(`${targetDate}T${stepIn}:00`);
        updateData.stepIn = stepInDateTime.toISOString();
        console.log(`Bulk Clock In: ${stepIn} -> ${updateData.stepIn} (UTC)`);
      } else if (stepIn !== undefined) { // If stepIn was explicitly cleared (empty string)
        updateData.stepIn = null;
        console.log(`Bulk Clock In: Cleared -> ${updateData.stepIn}`);
      }

      // Handle stepOut: send ISO string if valid, or null if empty
      if (stepOut && stepOut.trim() !== '') {
        const stepOutDateTime = new Date(`${targetDate}T${stepOut}:00`);
        
        // Handle night shift that spans across midnight
        if (shift === 'night' && stepIn && stepOut < stepIn) {
          // If stepOut is earlier than stepIn, it means it's the next day
          stepOutDateTime.setDate(stepOutDateTime.getDate() + 1);
        }
        
        updateData.stepOut = stepOutDateTime.toISOString();
        console.log(`Bulk Clock Out: ${stepOut} -> ${updateData.stepOut} (UTC)`);
      } else if (stepOut !== undefined) { // If stepOut was explicitly cleared (empty string)
        updateData.stepOut = null;
        console.log(`Bulk Clock Out: Cleared -> ${updateData.stepOut}`);
      }

      console.log('Bulk update data being sent:', updateData);
      console.log('Raw form values:', { shift, stepIn, stepOut });

      // Use direct API call for bulk update
      const result = await http<{ modifiedCount: number }>(ENDPOINTS.attendance.bulkUpdate, {
        method: 'POST',
        body: JSON.stringify(updateData),
      });

      console.log('Bulk update successful, result:', result);
      
      toast({
        title: "Success",
        description: `Successfully updated ${result.modifiedCount || selectedIds.length} attendance record(s).`,
      });

      // Close modal and call success callback
      setOpen(false);
      onSuccess();

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
    // Don't automatically set times - let users choose what they want to update
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
            Update shift, clock-in, and/or clock-out times for {selectedIds.length} selected record(s). You can update any combination of these fields.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-md">
              💡 <strong>Tip:</strong> You can update any combination of fields. Leave fields empty if you don't want to change them. Use the "Use [shift] time" buttons to quickly set suggested times.
            </div>
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
              <div className="flex items-center justify-between">
                <Label htmlFor="stepIn">Clock In Time (Optional)</Label>
                {shift && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const times = getShiftTimes(shift);
                      setStepIn(times.stepIn);
                    }}
                    className="text-xs"
                  >
                    Use {shift} time
                  </Button>
                )}
              </div>
              <div className="relative">
                <Clock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="stepIn"
                  type="time"
                  value={stepIn || ""}
                  onChange={(e) => setStepIn(e.target.value)}
                  className="pl-10"
                  placeholder="HH:MM"
                  key={`stepIn-${open}`}
                />
              </div>
            </div>
            
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="stepOut">Clock Out Time (Optional)</Label>
                {shift && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const times = getShiftTimes(shift);
                      console.log('Use night time button clicked for stepOut:', times.stepOut);
                      setStepOut(times.stepOut);
                    }}
                    className="text-xs"
                  >
                    Use {shift} time
                  </Button>
                )}
              </div>
              <div className="relative">
                <Clock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="stepOut"
                  type="time"
                  value={stepOut || ""}
                  onChange={(e) => {
                    console.log('Clock out input changed:', e.target.value);
                    setStepOut(e.target.value);
                  }}
                  className="pl-10"
                  placeholder="HH:MM"
                  key={`stepOut-${open}`}
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