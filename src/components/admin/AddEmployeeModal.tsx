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
import { Loader2, PlusCircle, Camera, Upload, RefreshCcw } from "lucide-react";
import { useState, useRef, useCallback, useEffect } from "react";
import { useDispatch } from "react-redux";
import { addEmployee } from "@/store/slices/employeeSlice";
import type { Manager } from "@/store/slices/managerSlice";
import { authService } from "@/services/authService";
import Image from "next/image";
import { getApiUrl } from "@/lib/config";
import { useDebouncedCallback } from "@/hooks/useDebounce";

export function AddEmployeeModal({ managers = [], managerId, createdBy, ...props }: { managers?: { _id: string; name: string }[]; managerId?: string, createdBy?: string }) {

  console.log("managers--->",managers)
  const [form, setForm] = useState({
    name: '',
    email: '',
    managerId: '',
    shift: '',
    address: '',
    mobile: '',
  });
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [photoDataUri, setPhotoDataUri] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [step, setStep] = useState<"idle" | "capturing" | "preview" | "loading">("idle");
  const { toast } = useToast();
  const dispatch = useDispatch();
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const shiftMap: Record<string, string> = {
    "7 AM - 3 PM": "morning",
    "2 PM - 10 PM": "evening",
    "10 PM - 7 AM": "night",
  };

  const isReadonly = authService.getCurrentUser()?.role === "readonly";

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
    setForm({
      name: '',
      email: '',
      managerId: '',
      shift: '',
      address: '',
      mobile: '',
    });
  }, [stopCamera]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Debounced handlers for form inputs
  const debouncedSetForm = useDebouncedCallback((name: string, value: string) => {
    setForm(f => ({ ...f, [name]: value }));
  }, 300);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // Update immediately for UI responsiveness
    setForm(f => ({ ...f, [name]: value }));
    // Also debounce for any side effects
    debouncedSetForm(name, value);
  };

  const handleManagerChange = (value: string) => {
    setForm(f => ({ ...f, managerId: value }));
  };

  const handleShiftChange = (value: string) => {
    setForm(f => ({ ...f, shift: value }));
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
      const dataUri = canvas.toDataURL("image/jpeg", 0.8); // 80% quality for better file size
      console.log('Photo captured, dimensions:', canvas.width, 'x', canvas.height);
      setPhotoDataUri(dataUri);
    }
    stopCamera();
    setStep("preview");
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        variant: "destructive",
        title: "Invalid File",
        description: "Please select an image file (JPEG, PNG, etc.).",
      });
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast({
        variant: "destructive",
        title: "File Too Large",
        description: "Please select an image smaller than 5MB.",
      });
      return;
    }
    
    setStep("loading");
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      console.log('File loaded, size:', file.size, 'type:', file.type);
      setPhotoDataUri(result);
      setStep("preview");
    };
    reader.onerror = () => {
      setStep("idle");
      toast({
        variant: "destructive",
        title: "File Read Error",
        description: "Failed to read the selected file. Please try again.",
      });
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

  const validateForm = () => {
    const requiredFields = {
      name: form.name,
      managerId: form.managerId,
      shift: form.shift,
      address: form.address,
    };

    const missingFields = Object.entries(requiredFields)
      .filter(([_, value]) => !value)
      .map(([key]) => key);

    if (missingFields.length > 0) {
      toast({
        title: "Validation Error",
        description: `Missing required fields: ${missingFields.join(', ')}`,
        variant: "destructive",
      });
      return false;
    }

    if (!photoDataUri) {
      toast({
        title: "Validation Error",
        description: "Please add an employee photo.",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleSaveChanges = async () => {
    if (!validateForm()) return;

    if (!createdBy || typeof createdBy !== 'string' || createdBy.trim() === "") {
      toast({
        title: "Error",
        description: "Admin ID is missing. Please log in again.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const backendShift = shiftMap[form.shift] || form.shift;
      
      // Create FormData for image upload
      const formData = new FormData();
      if (photoDataUri) {
        const timestamp = Date.now();
        const filename = `employee_${timestamp}.jpg`;
        const imageFile = dataURItoFile(photoDataUri, filename);
        console.log('Image file being uploaded:', imageFile);
        formData.append('image', imageFile);
      }
      formData.append('name', form.name);
      formData.append('email', form.email);
      formData.append('managerId', form.managerId);
      formData.append('shift', backendShift);
      formData.append('address', form.address);
      formData.append('mobile', form.mobile);
      formData.append('createdBy', createdBy);
      formData.append('isCreatedByAdmin', 'true');

      console.log('FormData contents:');
      for (let [key, value] of formData.entries()) {
        console.log(key, value);
      }

      // Use the API function that handles FormData
      const response = await fetch(`${getApiUrl()}/employee`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add employee');
      }

      const result = await response.json();
      console.log('API Response:', result);

      toast({
        title: "Success!",
        description: `New employee has been added.`,
      });
      setIsOpen(false);
      resetState();
    } catch (err: any) {
      console.error('Error adding employee:', err);
      toast({
        title: "Error",
        description: err.message || "Failed to add employee. Please check console for details.",
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

  console.log("Managers:", managers);

    const renderImageSection = () => {
    switch(step) {
      case 'idle':
        return (
          <div className="my-4 w-full h-48 sm:h-64 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
            <div className="text-center text-muted-foreground flex flex-col items-center gap-2">
              <Camera className="h-12 w-12" />
              <p>Add Employee Photo</p>
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
      case 'loading':
        return (
          <div className="my-4 w-full h-48 sm:h-64 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
            <div className="text-center text-muted-foreground flex flex-col items-center gap-2">
              <Loader2 className="h-12 w-12 animate-spin" />
              <p>Processing image...</p>
            </div>
          </div>
        );
      case 'preview':
        return (
          <div className="my-4 w-full h-48 sm:h-64 rounded-lg bg-muted flex items-center justify-center overflow-hidden relative">
            {photoDataUri && (
              <Image 
                src={photoDataUri} 
                alt="Employee photo preview" 
                fill
                className="object-cover"
              />
            )}
          </div>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {!isReadonly && (
        <DialogTrigger asChild>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Employee
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="w-[95vw] sm:w-full sm:max-w-md md:max-w-lg max-h-[90vh] overflow-y-auto rounded-lg p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Add New Employee</DialogTitle>
          <DialogDescription>
            Fill in the details for the new employee.
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

          <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-left sm:text-right">Full Name</Label>
            <Input
              id="name"
              name="name"
              value={form.name}
              onChange={handleInputChange}
              placeholder="John Doe"
              className="sm:col-span-3"
              disabled={isLoading}
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className="text-left sm:text-right">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleInputChange}
              placeholder="john.d@example.com"
              className="sm:col-span-3"
              disabled={isLoading}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
            <Label htmlFor="managerId" className="text-left sm:text-right">Manager</Label>
            <Select value={form.managerId} onValueChange={handleManagerChange} disabled={isLoading}>
              <SelectTrigger className="sm:col-span-3">
                <SelectValue placeholder="Select a manager" />
              </SelectTrigger>
              <SelectContent>
                {managers.map((manager) => (
                  <SelectItem key={manager._id} value={manager._id}>
                    {manager.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
            <Label htmlFor="shift" className="text-left sm:text-right">Shift</Label>
            <Select value={form.shift} onValueChange={handleShiftChange} disabled={isLoading}>
              <SelectTrigger className="sm:col-span-3">
                <SelectValue placeholder="Select a shift" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7 AM - 3 PM">7 AM - 3 PM (Morning)</SelectItem>
                <SelectItem value="2 PM - 10 PM">2 PM - 10 PM (Evening)</SelectItem>
                <SelectItem value="10 PM - 7 AM">10 PM - 7 AM (Night)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
            <Label htmlFor="address" className="text-left sm:text-right">Address</Label>
            <Input
              id="address"
              name="address"
              value={form.address}
              onChange={handleInputChange}
              placeholder="Enter address"
              className="sm:col-span-3"
              disabled={isLoading}
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
            <Label htmlFor="mobile" className="text-left sm:text-right">Mobile</Label>
            <Input
              id="mobile"
              name="mobile"
              value={form.mobile}
              onChange={handleInputChange}
              placeholder="10-digit mobile number"
              className="sm:col-span-3"
              disabled={isLoading}
            />
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
            Add Employee
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}