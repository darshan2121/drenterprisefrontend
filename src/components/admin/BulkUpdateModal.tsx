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
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [location, setLocation] = useState("");
  const { toast } = useToast();

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      // Clear all fields - let user choose what to update
      console.log('📝 Modal opening - resetting form');
      console.log('📋 Selected records:', selectedRecords?.length || 0);
      
      // Default to today's date for easier "old attendance to today" updates
      const today = new Date().toISOString().split('T')[0];
      
      setShift("");
      setStepIn("");
      setStepOut("");
      setStartDate(today); // Default to today
      setEndDate("");
      setLocation("");
      
      console.log('✅ Form reset - Start Date defaulted to today:', today);
    } else {
      // Also clear when modal closes to ensure clean state
      console.log('📝 Modal closing - clearing all fields');
      setShift("");
      setStepIn("");
      setStepOut("");
      setStartDate("");
      setEndDate("");
      setLocation("");
    }
  }, [open, selectedRecords]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Debug: Log current form state
    console.log('Form submission - Current state:', { shift, stepIn, stepOut });
    
    // Validate that at least one field is provided
    const hasShift = shift && shift.trim() !== '';
    const hasStepIn = stepIn && stepIn.trim() !== '';
    const hasStepOut = stepOut && stepOut.trim() !== '';
    const hasStartDate = startDate && startDate.trim() !== '';
    const hasEndDate = endDate && endDate.trim() !== '';
    const hasLocation = location && location.trim() !== '';
    
    if (!hasShift && !hasStepIn && !hasStepOut && !hasStartDate && !hasEndDate && !hasLocation) {
      toast({
        title: "Error",
        description: "Please provide at least one field to update (shift, dates, times, or location).",
        variant: "destructive",
      });
      return;
    }
    
    // Validate that if clockIn is provided, startDate is also provided
    if (hasStepIn && !hasStartDate) {
      toast({
        title: "Validation Error",
        description: "Start Date is required when Clock In time is provided.",
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
      
      // Use startDate if provided, otherwise fall back to first record's date
      let targetDate = new Date().toISOString().split('T')[0]; // Default to today
      if (startDate && startDate.trim() !== '') {
        targetDate = startDate;
      } else if (selectedRecords && selectedRecords.length > 0) {
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
      if (shift && shift.trim() !== '') {
        updateData.shift = shift;
      }

      // Handle stepIn: send ISO string if valid, or null if empty
      if (stepIn && stepIn.trim() !== '') {
        if (!startDate || startDate.trim() === '') {
          toast({
            title: "Validation Error",
            description: "Start Date is required when Clock In time is provided.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
        const stepInDateTime = new Date(`${startDate}T${stepIn}:00`);
        if (!isNaN(stepInDateTime.getTime())) {
          updateData.stepIn = stepInDateTime.toISOString();
          console.log(`Bulk Clock In: ${startDate} ${stepIn} -> ${updateData.stepIn} (UTC)`);
        }
      } else if (stepIn !== undefined && stepIn.trim() === '') { // If stepIn was explicitly cleared (empty string)
        updateData.stepIn = null;
        console.log(`Bulk Clock In: Cleared -> ${updateData.stepIn}`);
      }

      // Handle stepOut: send ISO string if valid, or null if empty
      if (stepOut && stepOut.trim() !== '') {
        // Use endDate if provided, otherwise use startDate (same day)
        const stepOutDate = (endDate && endDate.trim() !== '') ? endDate : startDate;
        if (!stepOutDate || stepOutDate.trim() === '') {
          // If no date is available, use startDate or targetDate
          const fallbackDate = startDate || targetDate;
          if (!fallbackDate) {
            toast({
              title: "Validation Error",
              description: "Date is required when Clock Out time is provided.",
              variant: "destructive",
            });
            setLoading(false);
            return;
          }
        }
        
        const stepOutDateTime = new Date(`${stepOutDate || startDate || targetDate}T${stepOut}:00`);
        
        // Handle night shift that spans across midnight
        if (shift === 'night' && stepIn && stepOut < stepIn) {
          // If stepOut is earlier than stepIn, it means it's the next day
          stepOutDateTime.setDate(stepOutDateTime.getDate() + 1);
        }
        
        if (!isNaN(stepOutDateTime.getTime())) {
          updateData.stepOut = stepOutDateTime.toISOString();
          console.log(`Bulk Clock Out: ${stepOutDate || startDate || targetDate} ${stepOut} -> ${updateData.stepOut} (UTC)`);
        }
      } else if (stepOut !== undefined && stepOut.trim() === '') { // If stepOut was explicitly cleared (empty string)
        updateData.stepOut = null;
        console.log(`Bulk Clock Out: Cleared -> ${updateData.stepOut}`);
      }

      // Add location if provided
      if (location && location.trim() !== '') {
        updateData.address = location.trim();
      }

      console.log('📤 Bulk update data being sent:', updateData);
      console.log('📋 Raw form values:', { shift, stepIn, stepOut, startDate, endDate, location });
      console.log('📅 Date conversion details:', {
        startDate,
        endDate,
        stepInTime: stepIn,
        stepOutTime: stepOut,
        stepInISO: updateData.stepIn,
        stepOutISO: updateData.stepOut,
        selectedRecordsCount: selectedIds.length
      });

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
        return { stepIn: "07:00", stepOut: "15:00" }; // 7 AM - 3 PM
      case "evening":
        return { stepIn: "14:00", stepOut: "22:00" }; // 2 PM - 10 PM
      case "night":
        return { stepIn: "22:00", stepOut: "07:00" }; // 10 PM - 7 AM
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
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Update Attendance</DialogTitle>
          <DialogDescription>
            Update shift, dates, clock-in, clock-out, and/or location for {selectedIds.length} selected record(s). You can update any combination of these fields.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="text-sm text-gray-600 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md space-y-1">
              <div>💡 <strong>Tip:</strong> You can update any combination of fields. Leave fields empty if you don't want to change them.</div>
              <div>📅 <strong>To change old attendance to today:</strong> Set "Start Date" to today's date, then set Clock In/Out times.</div>
              <div>⏰ Use the "Use [shift] time" buttons to quickly set suggested times.</div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="shift">Shift</Label>
              <Select value={shift} onValueChange={handleShiftChange} disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder="Select shift (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="morning">7 AM - 3 PM (Morning)</SelectItem>
                  <SelectItem value="evening">2 PM - 10 PM (Evening)</SelectItem>
                  <SelectItem value="night">10 PM - 7 AM (Night)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input 
                id="startDate" 
                type="date"
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)} 
                disabled={loading}
                placeholder="Select start date"
              />
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
                    disabled={loading}
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
                  disabled={loading}
                  key={`stepIn-${open}`}
                />
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="endDate">End Date (Optional)</Label>
              <Input 
                id="endDate" 
                type="date"
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)} 
                disabled={loading}
                placeholder="Select end date (defaults to start date)"
              />
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
                      setStepOut(times.stepOut);
                    }}
                    className="text-xs"
                    disabled={loading}
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
                  onChange={(e) => setStepOut(e.target.value)}
                  className="pl-10"
                  placeholder="HH:MM"
                  disabled={loading}
                  key={`stepOut-${open}`}
                />
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="location">Location (Optional)</Label>
              <Input 
                id="location" 
                value={location} 
                onChange={(e) => setLocation(e.target.value)} 
                disabled={loading}
                placeholder="Enter location address"
              />
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