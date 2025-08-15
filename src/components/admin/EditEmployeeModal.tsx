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
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Edit, Loader2, Camera, Upload, RefreshCcw } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useDispatch } from "react-redux";
import { editEmployee } from "@/store/slices/employeeSlice";
import Image from "next/image";

type Employee = { id: string; name: string; email: string; managerId: string; shift: string; isWorking: boolean; };
type Manager = { _id: string; name: string; };

export function EditEmployeeModal({ employee, managers = [], ...props }: { employee: Employee; managers: Manager[] }) {
  if (!employee) return null;
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [photoDataUri, setPhotoDataUri] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [step, setStep] = useState<"idle" | "capturing" | "preview">("idle");
  const { toast } = useToast();
  const dispatch = useDispatch();
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Local state for editable fields
  const [name, setName] = useState(employee.name);
  const [email, setEmail] = useState(employee.email);
  const [managerId, setManagerId] = useState(
    employee.managerId && managers.some(m => String(m._id) === String(employee.managerId))
      ? String(employee.managerId)
      : (managers[0]?._id ? String(managers[0]._id) : '')
  );
  const [shift, setShift] = useState(employee.shift);
  const [isWorking, setIsWorking] = useState(employee.isWorking);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }, [stream]);

  const resetState = useCallback(() => {
    stopCamera();
    setStep("idle");
    setPhotoDataUri(null);
  }, [stopCamera]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Sync all fields with employee prop when modal opens
  useEffect(() => {
    if (isOpen) {
      setName(employee.name);
      setEmail(employee.email);
      setShift(employee.shift);
      setIsWorking(employee.isWorking);
      // Defensive: fallback to first manager if not found or empty
      const found = managers.find(m => String(m._id) === String(employee.managerId));
      setManagerId(found ? String(employee.managerId) : (managers[0]?._id ? String(managers[0]._id) : ''));
    }
  }, [isOpen, employee, managers]);

  const shiftMap: Record<string, string> = {
    "9 AM - 5 PM": "morning",
    "1 PM - 9 PM": "evening",
    "5 PM - 1 AM": "night",
    "morning": "morning",
    "evening": "evening",
    "night": "night",
  };

  const startCamera = useCallback(async () => {
    setStep('capturing');
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
        audio: false
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      toast({
        variant: "destructive",
        title: "Camera Error",
        description: "Could not access your camera. Please check permissions and try again.",
      });
      setStep('idle');
    }
  }, [toast, facingMode]);

  const takePhoto = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      toast({
        variant: "destructive",
        title: "Camera Not Ready",
        description: "The camera is still initializing. Please wait a moment and try again.",
      });
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUri = canvas.toDataURL("image/jpeg");
      setPhotoDataUri(dataUri);
    }
    stopCamera();
    setStep("preview");
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        variant: "destructive",
        title: "Invalid File",
        description: "Please select an image file.",
      });
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      setPhotoDataUri(e.target?.result as string);
      setStep("preview");
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const flipCamera = useCallback(() => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
    stopCamera();
    setTimeout(() => {
      startCamera();
    }, 200);
  }, [stopCamera, startCamera]);

  // Helper to convert data URI to File
  function dataURItoFile(dataURI: string, filename: string) {
    const arr = dataURI.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) throw new Error('Invalid data URI');
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    const n = bstr.length;
    const u8arr = new Uint8Array(n);
    for (let i = 0; i < n; i++) u8arr[i] = bstr.charCodeAt(i);
    return new File([u8arr], filename, { type: mime });
  }

  const handleSaveChanges = async () => {
    setIsLoading(true);
    try {
      if (!managerId) {
        toast({
          title: "Error",
          description: "Please select a manager.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
      const backendShift = shiftMap[shift] || shift;
      
      // Create FormData for image upload (if photo was taken/uploaded)
      const formData = new FormData();
      if (photoDataUri) {
        formData.append('image', dataURItoFile(photoDataUri, 'employee.jpg'));
      }
      formData.append('name', name);
      formData.append('email', email);
      formData.append('managerId', String(managerId));
      formData.append('shift', backendShift);
      formData.append('isWorking', String(isWorking));

      // Use the API function that handles FormData
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5678/api'}/employee/${employee.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update employee');
      }

      const result = await response.json();

      toast({
        title: "Success!",
        description: `Employee ${name}'s profile has been updated.`,
      });
      setIsOpen(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update employee.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetState();
    }
    setIsOpen(open);
  };

  const renderImageSection = () => {
    switch(step) {
      case 'idle':
        return (
          <div className="my-4 w-full h-48 sm:h-64 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
            <div className="text-center text-muted-foreground flex flex-col items-center gap-2">
              <Camera className="h-12 w-12" />
              <p>Update Employee Photo (Optional)</p>
            </div>
          </div>
        );
      case 'capturing':
        return (
          <div className="my-4 w-full h-48 sm:h-64 rounded-lg bg-muted flex items-center justify-center overflow-hidden relative">
            <video ref={videoRef} autoPlay playsInline className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={flipCamera}
              className="absolute top-3 right-3 z-10 bg-white/80 hover:bg-white rounded-full p-2 shadow-md border border-gray-200 transition-colors"
              aria-label="Flip Camera"
              title="Flip Camera"
            >
              <RefreshCcw className="h-6 w-6 text-gray-700" />
            </button>
          </div>
        );
      case 'preview':
        return (
          <div className="my-4 w-full h-48 sm:h-64 rounded-lg bg-muted flex items-center justify-center overflow-hidden relative">
            {photoDataUri && (
              <Image src={photoDataUri} alt="Employee photo preview" layout="fill" objectFit="cover" />
            )}
          </div>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] sm:w-full sm:max-w-md md:max-w-lg max-h-[90vh] overflow-y-auto rounded-lg p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Edit Employee</DialogTitle>
          <DialogDescription>
            Update the details for the employee.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {/* Image Upload Section */}
          <div className="space-y-2">
            <Label>Employee Photo</Label>
            {renderImageSection()}
            {step === 'idle' && (
              <div className="flex flex-col sm:flex-row gap-2">
                <Button onClick={startCamera} variant="outline" className="flex-1">
                  <Camera className="mr-2 h-4 w-4" /> Take Photo
                </Button>
                <Button onClick={handleUploadClick} variant="outline" className="flex-1">
                  <Upload className="mr-2 h-4 w-4" /> Upload Photo
                </Button>
              </div>
            )}
            {step === 'capturing' && (
              <Button onClick={takePhoto} className="w-full">
                <Camera className="mr-2 h-4 w-4" /> Take Photo
              </Button>
            )}
            {step === 'preview' && (
              <div className="flex gap-2">
                <Button onClick={() => { setStep('idle'); setPhotoDataUri(null); }} variant="outline" className="flex-1">
                  <RefreshCcw className="mr-2 h-4 w-4" /> Retake
                </Button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">Full Name</Label>
            <Input id="name" value={name} onChange={e => setName(e.target.value)} className="col-span-3" disabled={isLoading} />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className="text-right">Email</Label>
            <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} className="col-span-3" disabled={isLoading} />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="manager" className="text-right">Supervisor</Label>
            <Select value={managerId} onValueChange={setManagerId} disabled={isLoading}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select a manager" />
              </SelectTrigger>
              <SelectContent>
                {managers.map(m => <SelectItem key={m._id} value={String(m._id)}>{m.name}</SelectItem>)}
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
                <SelectItem value="morning">9 AM - 5 PM</SelectItem>
                <SelectItem value="evening">1 PM - 9 PM</SelectItem>
                <SelectItem value="night">5 PM - 1 AM</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="status" className="text-right">Status</Label>
            <div className="col-span-3 flex items-center space-x-2">
              <Switch id="status" checked={isWorking} onCheckedChange={setIsWorking} disabled={isLoading} />
              <Label htmlFor="status">{isWorking ? 'Active' : 'Inactive'}</Label>
            </div>
          </div>
        </div>

        <input 
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          className="hidden"
          accept="image/*"
        />

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
