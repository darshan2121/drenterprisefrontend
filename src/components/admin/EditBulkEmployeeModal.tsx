// "use client";

// import { useState } from "react";
// import { Button } from "@/components/ui/button";
// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
//   DialogDescription,
//   DialogFooter,
// } from "@/components/ui/dialog";
// import { Label } from "@/components/ui/label";
// import { Input } from "@/components/ui/input";
// import { Loader2 } from "lucide-react";
// import { useToast } from "@/components/ui/use-toast";

// export function BulkEditModal({
//   isOpen,
//   onClose,
//   attendanceIds,
//   onComplete,
//   shift,
// }: {
//   isOpen: boolean;
//   onClose: () => void;
//   attendanceIds: string[];
//   onComplete: (success: boolean) => void;
//   shift?: string;
// }) {
//   const { toast } = useToast();
//   const [stepIn, setStepIn] = useState("");
//   const [stepOut, setStepOut] = useState("");
//   const [isLoading, setIsLoading] = useState(false);
//   const [error, setError] = useState("");

//   const handleSubmit = async () => {
//     if (!stepIn && !stepOut) {
//       setError("Please provide at least Step In or Step Out time");
//       return;
//     }

//     setIsLoading(true);
//     setError("");

//     try {
//       const response = await fetch("/api/attendance/bulk-update", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({
//           attendanceIds,
//           stepIn: stepIn || undefined,
//           stepOut: stepOut || undefined,
//           shift,
//         }),
//       });

//       const data = await response.json();

//       if (!response.ok) {
//         throw new Error(data.message || "Failed to update attendance");
//       }

//       toast({
//         title: "Success",
//         description: `Updated ${data.modifiedCount} attendance records`,
//         variant: "default",
//       });

//       onComplete(true);
//     } catch (err) {
//       console.error("Bulk update failed:", err);
//       setError(err instanceof Error ? err.message : "Failed to update attendance");
//       toast({
//         title: "Error",
//         description: "Failed to update attendance records",
//         variant: "destructive",
//       });
//       onComplete(false);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   return (
//     <Dialog open={isOpen} onOpenChange={onClose}>
//       <DialogContent>
//         <DialogHeader>
//           <DialogTitle>Bulk Edit Attendance</DialogTitle>
//           <DialogDescription>
//             Update clock in/out times for {attendanceIds.length} selected records
//           </DialogDescription>
//         </DialogHeader>

//         <div className="grid gap-4 py-4">
//           <div className="grid grid-cols-4 items-center gap-4">
//             <Label htmlFor="stepIn" className="text-right">
//               Step In
//             </Label>
//             <Input
//               id="stepIn"
//               type="datetime-local"
//               className="col-span-3"
//               value={stepIn}
//               onChange={(e) => setStepIn(e.target.value)}
//             />
//           </div>
//           <div className="grid grid-cols-4 items-center gap-4">
//             <Label htmlFor="stepOut" className="text-right">
//               Step Out
//             </Label>
//             <Input
//               id="stepOut"
//               type="datetime-local"
//               className="col-span-3"
//               value={stepOut}
//               onChange={(e) => setStepOut(e.target.value)}
//             />
//           </div>
//           {error && (
//             <div className="text-red-500 text-sm text-center col-span-4">{error}</div>
//           )}
//         </div>

//         <DialogFooter>
//           <Button variant="outline" onClick={onClose} disabled={isLoading}>
//             Cancel
//           </Button>
//           <Button onClick={handleSubmit} disabled={isLoading}>
//             {isLoading ? (
//               <>
//                 <Loader2 className="mr-2 h-4 w-4 animate-spin" />
//                 Updating...
//               </>
//             ) : (
//               "Update Records"
//             )}
//           </Button>
//         </DialogFooter>
//       </DialogContent>
//     </Dialog>
//   );
// }


"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

export function BulkEditModal({
  isOpen,
  onClose,
  attendanceIds,
  onComplete,
  shift,
}: {
  isOpen: boolean;
  onClose: () => void;
  attendanceIds: string[];
  onComplete: (success: boolean) => void;
  shift?: string;
}) {
  const [stepIn, setStepIn] = useState("");
  const [stepOut, setStepOut] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleSubmit = async () => {
    if (!stepIn && !stepOut) {
      setError("Please provide at least Step In or Step Out time");
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      const response = await fetch("/api/attendance/bulk-update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          attendanceIds,
          stepIn: stepIn || undefined,
          stepOut: stepOut || undefined,
          shift,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to update attendance");
      }

      setSuccessMessage(`Successfully updated ${data.modifiedCount} attendance records`);
      onComplete(true);
    } catch (err) {
      console.error("Bulk update failed:", err);
      setError(err instanceof Error ? err.message : "Failed to update attendance");
      onComplete(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bulk Edit Attendance</DialogTitle>
          <DialogDescription>
            Update clock in/out times for {attendanceIds.length} selected records
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="stepIn" className="text-right">
              Step In
            </Label>
            <Input
              id="stepIn"
              type="datetime-local"
              className="col-span-3"
              value={stepIn}
              onChange={(e) => setStepIn(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="stepOut" className="text-right">
              Step Out
            </Label>
            <Input
              id="stepOut"
              type="datetime-local"
              className="col-span-3"
              value={stepOut}
              onChange={(e) => setStepOut(e.target.value)}
            />
          </div>
          {error && (
            <div className="text-red-500 text-sm text-center col-span-4">{error}</div>
          )}
          {successMessage && (
            <div className="text-green-500 text-sm text-center col-span-4">
              {successMessage}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              "Update Records"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}