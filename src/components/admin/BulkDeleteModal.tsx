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
import { bulkDeleteAttendance } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface BulkDeleteModalProps {
  selectedIds: string[];
  selectedRecords: Array<{
    _id: string;
    employee: string;
    date: string;
  }>;
  onSuccess: () => void;
  children: React.ReactNode;
}

export function BulkDeleteModal({
  selectedIds,
  selectedRecords,
  onSuccess,
  children,
}: BulkDeleteModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) {
      toast({
        title: "Error",
        description: "No records selected for deletion.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      console.log('🗑️ Bulk delete attendance request:', {
        count: selectedIds.length,
        ids: selectedIds
      });
      
      await bulkDeleteAttendance(selectedIds);
      console.log('✅ Bulk delete attendance response: Success');
      
      toast({
        title: "Success",
        description: `Successfully deleted ${selectedIds.length} attendance record${selectedIds.length !== 1 ? 's' : ''}.`,
      });
      
      setOpen(false);
      onSuccess();
    } catch (error: any) {
      console.error('❌ Error bulk deleting attendance:', error);
      toast({
        title: "Error",
        description: error.message || `Failed to delete ${selectedIds.length} attendance record${selectedIds.length !== 1 ? 's' : ''}.`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div onClick={() => setOpen(true)}>
        {children}
      </div>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-red-500" />
            Delete {selectedIds.length} Attendance Record{selectedIds.length !== 1 ? 's' : ''}
          </DialogTitle>
          <DialogDescription className="space-y-2">
            <p>
              Are you sure you want to delete <strong>{selectedIds.length}</strong> attendance record{selectedIds.length !== 1 ? 's' : ''}?
            </p>
            {selectedRecords.length > 0 && selectedRecords.length <= 5 && (
              <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-md max-h-40 overflow-y-auto">
                <p className="text-sm font-medium mb-2">Records to be deleted:</p>
                <ul className="text-sm space-y-1">
                  {selectedRecords.map((record) => (
                    <li key={record._id} className="text-gray-600 dark:text-gray-400">
                      • {record.employee} - {record.date}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {selectedRecords.length > 5 && (
              <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedRecords.length} records selected
                </p>
              </div>
            )}
            <p className="text-red-600 font-medium mt-3">
              This action cannot be undone.
            </p>
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
            onClick={handleBulkDelete}
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
                Delete {selectedIds.length} Record{selectedIds.length !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


