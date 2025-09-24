"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Trash2, Loader2 } from "lucide-react";
import { deleteAttendance } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface DeleteAttendanceModalProps {
  attendanceId: string;
  employeeName: string;
  date: string;
  onSuccess: () => void;
  children: React.ReactNode;
}

export function DeleteAttendanceModal({
  attendanceId,
  employeeName,
  date,
  onSuccess,
  children,
}: DeleteAttendanceModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  console.log('🗑️ DeleteAttendanceModal rendered with:', {
    attendanceId,
    employeeName,
    date,
    open
  });

  const handleDelete = async () => {
    try {
      setLoading(true);
      console.log('🗑️ Delete attendance request:', {
        attendanceId,
        employeeName,
        date
      });
      
      const result = await deleteAttendance(attendanceId);
      console.log('✅ Delete attendance response:', result);
      
      toast({
        title: "Success",
        description: "Attendance record deleted successfully.",
      });
      
      setOpen(false);
      onSuccess();
    } catch (error: any) {
      console.error('❌ Error deleting attendance:', error);
      console.error('❌ Error details:', {
        message: error.message,
        status: error.status,
        response: error.response
      });
      toast({
        title: "Error",
        description: error.message || "Failed to delete attendance record.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      console.log('🗑️ Delete modal open state changing:', newOpen);
      setOpen(newOpen);
    }}>
      <div data-modal="delete-attendance" onClick={() => {
        console.log('🗑️ Modal trigger clicked');
        setOpen(true);
      }}>
        {children}
      </div>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-red-500" />
            Delete Attendance Record
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete the attendance record for{" "}
            <strong>{employeeName}</strong> on <strong>{date}</strong>?
            <br />
            <br />
            <span className="text-red-600 font-medium">
              This action cannot be undone.
            </span>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
