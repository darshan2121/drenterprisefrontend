"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, Loader2, CheckCircle, XCircle, RefreshCcw, UserCheck, AudioLines, Upload } from "lucide-react";
import { verifyClockIn, type VerifyClockInOutput } from "@/ai/flows/clock-in-verification";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useDispatch, useSelector } from 'react-redux';
import { clockIn, clockOut, fetchAttendanceId } from '@/store/slices/attendanceSlice';
import { Tooltip } from "@/components/ui/tooltip";
import { useDebouncedCallback } from "@/hooks/useDebounce";
import { locationService, type LocationData } from "@/services/locationService";

export function ClockInModal({ employee, attendanceId: propAttendanceId, status, onAttendanceChange }: {
  employee: { name: string; id: string };
  attendanceId?: string | null;
  status: 'Clocked In' | 'Clocked Out' | 'On Leave';
  onAttendanceChange?: (newId: string | null) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<"idle" | "capturing" | "preview" | "verifying" | "result" | "clockedIn" | "processing">("idle");
  const [photoDataUri, setPhotoDataUri] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [verificationResult, setVerificationResult] = useState<VerifyClockInOutput | null>(null);
  const [manualLocation, setManualLocation] = useState('');
  const [note, setNote] = useState('');
  const [latitude, setLatitude] = useState<string>('');
  const [longitude, setLongitude] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string>('');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user'); // Add this state
  const [shift, setShift] = useState('morning');
  const [imageLoading, setImageLoading] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);

  // Debounced handlers for input fields
  const debouncedSetLocation = useDebouncedCallback((value: string) => {
    setManualLocation(value);
  }, 300);

  const debouncedSetNote = useDebouncedCallback((value: string) => {
    setNote(value);
  }, 300);
  const attendanceIdFromRedux = useSelector((state: any) => state.attendance.attendanceIds[employee.id] || null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const dispatch = useDispatch();
  const { isClockingIn, isClockingOut, error: attendanceError } = useSelector((state: any) => state.attendance);

  // Debug log for attendanceId
  // console.log("[DEBUG] ClockInModal for", employee.name, "employeeId:", employee.id, "attendanceId from Redux:", attendanceIdFromRedux);

  // Add a loading state for attendanceId
  const isAttendanceIdLoading = attendanceIdFromRedux === undefined;

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }, [stream]);

  // Auto-detect location when modal opens
  const detectLocation = useCallback(async () => {
    setIsDetectingLocation(true);
    setLocationError('');
    
    try {
      const location = await locationService.getCurrentLocation();
      if (location) {
        setLocationData(location);
        setLatitude(location.latitude.toString());
        setLongitude(location.longitude.toString());
        setManualLocation(location.address);
        toast({
          title: "Location Detected",
          description: `Current location: ${location.address}`,
        });
      } else {
        setLocationError('Unable to detect location. Please enter manually.');
        toast({
          title: "Location Required",
          description: "Please enter your location manually to continue.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Location detection failed:', error);
      setLocationError('Location detection failed. Please enter manually.');
      toast({
        title: "Location Required",
        description: "Please enter your location manually to continue.",
        variant: "destructive",
      });
    } finally {
      setIsDetectingLocation(false);
    }
  }, [toast]);

  const resetState = useCallback(() => {
    stopCamera();
    setStep("idle");
    setPhotoDataUri(null);
    setVerificationResult(null);
    setManualLocation('');
    setNote('');
    setLatitude('');
    setLongitude('');
    setImageLoading(false);
    setCameraReady(false);
    setLocationData(null);
    setLocationError('');
    setIsDetectingLocation(false);
  }, [stopCamera]);

  useEffect(() => {
    // Cleanup camera on unmount
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Auto-detect location when modal opens
  useEffect(() => {
    if (isOpen && step === 'idle') {
      detectLocation();
    }
  }, [isOpen, step, detectLocation]);

  useEffect(() => {
    if (isOpen) {
      console.log("[DEBUG] Modal opened for", employee.name, "employeeId:", employee.id);
      // Fetch current attendance status from Redux
      dispatch(fetchAttendanceId(employee.id) as any);
    }
  }, [isOpen, employee.id, dispatch]);

  // Notify parent on attendanceId change
  useEffect(() => {
    if (onAttendanceChange) onAttendanceChange(attendanceIdFromRedux);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attendanceIdFromRedux]);

  useEffect(() => {
    if (isOpen) {
      if (attendanceIdFromRedux) {
        setStep('clockedIn');
      } else {
        setStep('idle');
      }
    }
  }, [isOpen, attendanceIdFromRedux]);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
        resetState();
    }
    setIsOpen(open);
  }

  const startCamera = useCallback(async () => {
    setStep('capturing');
    setCameraReady(false);
    try {
      // Check if we're on client side and mediaDevices is available
      if (typeof window === 'undefined') {
        throw new Error("Not running in browser environment");
      }
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("MediaDevices API not supported");
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }, // Use facingMode with ideal dimensions
        audio: false
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        // Wait for video to be ready
        videoRef.current.onloadedmetadata = () => {
          console.log("Video loaded with dimensions:", videoRef.current?.videoWidth, "x", videoRef.current?.videoHeight);
        };
        videoRef.current.oncanplay = () => {
          console.log("Video can play - camera is ready");
          setCameraReady(true);
        };
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      toast({
        variant: "destructive",
        title: "Camera Error",
        description: "Could not access your camera. Please check permissions and try again.",
      });
      setIsOpen(false);
    }
  }, [toast, facingMode]); // Add facingMode as dependency
  
  const takePhoto = () => {
    const video = videoRef.current;
    if (!video) {
      console.error("Video element not found");
      return;
    }

    console.log("Taking photo - Video dimensions:", video.videoWidth, "x", video.videoHeight);
    console.log("Video ready state:", video.readyState);
    console.log("Video paused:", video.paused);
    console.log("Camera ready state:", cameraReady);

    if (!cameraReady) {
      toast({
        variant: "destructive",
        title: "Camera Not Ready",
        description: "Please wait for the camera to fully initialize before taking a photo.",
      });
      return;
    }

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      toast({
        variant: "destructive",
        title: "Camera Not Ready",
        description: "The camera is still initializing. Please wait a moment and try again.",
      });
      return;
    }

    // Show loading state
    setStep("processing");
    
    // Use a more reliable approach with multiple attempts
    const attemptCapture = (attempts = 0) => {
      if (attempts >= 3) {
        console.error("Failed to capture photo after 3 attempts");
        toast({
          variant: "destructive",
          title: "Photo Error",
          description: "Failed to capture photo. Please try again.",
        });
        setStep("capturing");
        return;
      }

      try {
        const canvas = document.createElement("canvas");
        
        // Use actual video dimensions
        const width = video.videoWidth;
        const height = video.videoHeight;
        
        console.log(`Capture attempt ${attempts + 1} - Canvas dimensions:`, width, "x", height);
        
        if (width === 0 || height === 0) {
          console.log("Video dimensions still 0, retrying...");
          setTimeout(() => attemptCapture(attempts + 1), 100);
          return;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          console.error("Could not get canvas context");
          toast({
            variant: "destructive",
            title: "Photo Error",
            description: "Could not process the photo. Please try again.",
          });
          setStep("capturing");
          return;
        }

        // Clear canvas first
        ctx.clearRect(0, 0, width, height);
        
        // Draw the video frame to canvas
        ctx.drawImage(video, 0, 0, width, height);
        
        // Try to get the data URI
        let dataUri;
        try {
          dataUri = canvas.toDataURL("image/jpeg", 0.9);
          console.log("Photo captured successfully, data URI length:", dataUri.length);
          console.log("Data URI starts with:", dataUri.substring(0, 50));
        } catch (dataUriError) {
          console.error("Error creating data URI:", dataUriError);
          // Fallback to PNG if JPEG fails
          dataUri = canvas.toDataURL("image/png");
          console.log("Fallback to PNG, data URI length:", dataUri.length);
        }
        
        if (dataUri && dataUri.length > 0) {
          setPhotoDataUri(dataUri);
          setImageLoading(true);
          stopCamera();
          setStep("preview");
        } else {
          throw new Error("Failed to generate data URI");
        }
        
      } catch (error) {
        console.error(`Error taking photo (attempt ${attempts + 1}):`, error);
        if (attempts < 2) {
          console.log("Retrying capture...");
          setTimeout(() => attemptCapture(attempts + 1), 100);
        } else {
          toast({
            variant: "destructive",
            title: "Photo Error",
            description: "An error occurred while taking the photo. Please try again.",
          });
          setStep("capturing");
        }
      }
    };

        // Start the capture process
    attemptCapture();
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
      
      // Show processing state
      setStep("processing");
      
      const reader = new FileReader();
      reader.onload = (e) => {
          const dataUri = e.target?.result as string;
          
          // Compress uploaded image if it's too large
          const img = new window.Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
            const maxSize = 800;
            let { width, height } = img;
            
            if (width > maxSize || height > maxSize) {
              const ratio = Math.min(maxSize / width, maxSize / height);
              width = Math.floor(width * ratio);
              height = Math.floor(height * ratio);
            }
            
            canvas.width = width;
            canvas.height = height;
            
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.imageSmoothingEnabled = true;
              ctx.imageSmoothingQuality = 'high';
              ctx.drawImage(img, 0, 0, width, height);
              const compressedDataUri = canvas.toDataURL("image/jpeg", 0.8);
              setPhotoDataUri(compressedDataUri);
            } else {
              setPhotoDataUri(dataUri);
            }
            setStep("preview");
          };
          img.src = dataUri;
      };
      reader.readAsDataURL(file);
      // Reset file input value to allow selecting the same file again
      event.target.value = '';
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };
  
  // Helper to convert data URI to File with optimization
  function dataURItoFile(dataURI: string, filename: string) {
    const arr = dataURI.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) throw new Error('Invalid data URI');
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    const n = bstr.length;
    const u8arr = new Uint8Array(n);
    
    // Use a more efficient loop for large images
    const chunkSize = 8192; // Process in 8KB chunks
    for (let i = 0; i < n; i += chunkSize) {
      const end = Math.min(i + chunkSize, n);
      for (let j = i; j < end; j++) {
        u8arr[j] = bstr.charCodeAt(j);
      }
    }
    
    return new File([u8arr], filename, { type: mime });
  }

  const handleClockIn = async () => {
    if (!photoDataUri) {
      toast({
        variant: "destructive",
        title: "Photo Required",
        description: "Please take a photo before clocking in.",
      });
      return;
    }
    
    const clockInLocation = manualLocation.trim();
    if (!clockInLocation) {
      toast({
        variant: "destructive",
        title: "Location Required",
        description: "Please enter your location or wait for auto-detection to complete.",
      });
      return;
    }
    
    if (!latitude || !longitude) {
      toast({
        variant: "destructive",
        title: "Location Error",
        description: "Could not get your current location. Please check your GPS settings.",
      });
      return;
    }
    
    // Check if employee ID is available
    if (!employee.id) {
      toast({
        variant: "destructive",
        title: "Employee Error",
        description: "Employee information is missing. Please contact your administrator.",
      });
      return;
    }
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('stepInImage', dataURItoFile(photoDataUri, 'stepin.jpg'));
      formData.append('longitude', longitude);
      formData.append('latitude', latitude);
      formData.append('address', clockInLocation);
      formData.append('note', note);
      formData.append('shift', shift); // <-- Add shift to FormData
      formData.append("employeeId", employee.id);
      // Only append managerId from localStorage if needed
      const managerId = typeof window !== 'undefined' ? localStorage.getItem('managerId') : '';
      if (managerId) formData.append('managerId', managerId);
      const resultAction = await dispatch(clockIn(formData) as any);
      if (clockIn.fulfilled.match(resultAction)) {
        const data = resultAction.payload;
        toast({
          title: 'Success!',
          description: 'Step In marked successfully.',
        });
        if (data.attendance && data.attendance._id) {
          if (typeof window !== 'undefined') localStorage.setItem(`attendanceId_${employee.id}`, data.attendance._id);
          if (onAttendanceChange) onAttendanceChange(data.attendance._id);
        }
        setStep('result');
      } else {
        // Get the specific error from the rejected action
        const errorMessage = resultAction.error?.message || attendanceError || 'Failed to clock in.';
        console.error('[ClockInModal] Clock in failed:', resultAction.error);
        
        toast({
          variant: 'destructive',
          title: 'Clock In Failed',
          description: `Error: ${errorMessage}. Please check your internet connection and try again.`,
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClockOut = async () => {
    console.log("[DEBUG] Attempting clock out for", employee.name, "attendanceId:", attendanceIdFromRedux);
    if (!attendanceIdFromRedux) {
      toast({
        variant: 'destructive',
        title: 'Clock Out Failed',
        description: 'No attendanceId found. Please clock in first.',
      });
      return;
    }
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('longitude', longitude || '0');
      formData.append('latitude', latitude || '0');
      formData.append('address', 'Auto clock out');
      formData.append('note', 'Clock out via button');
      formData.append('stepOut', new Date().toISOString());
      formData.append('attendanceId', attendanceIdFromRedux);
      const resultAction = await dispatch(clockOut(formData) as any);
      if (clockOut.fulfilled.match(resultAction)) {
        toast({
          title: 'Success!',
          description: 'Clock out successful.',
        });
        if (typeof window !== 'undefined') localStorage.removeItem(`attendanceId_${employee.id}`);
        if (onAttendanceChange) onAttendanceChange(null);
        setIsOpen(false);
      } else {
        // Get the specific error from the rejected action
        const errorMessage = resultAction.error?.message || attendanceError || 'Failed to clock out.';
        console.error('[ClockInModal] Clock out failed:', resultAction.error);
        
        toast({
          variant: 'destructive',
          title: 'Clock Out Failed',
          description: `Error: ${errorMessage}. Please check your internet connection and try again.`,
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const playAudioFeedback = () => {
    if(audioRef.current) {
        audioRef.current.play().catch(e => console.error("Error playing audio:", e));
    }
  };

  const isClockInDisabled = () => {
    return !manualLocation.trim() || isDetectingLocation;
  }
  
  const flipCamera = useCallback(() => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
    stopCamera();
    setTimeout(() => {
      startCamera();
    }, 200); // Small delay to ensure camera stops before restarting
  }, [stopCamera, startCamera]);

  const renderContent = () => {
    if (isAttendanceIdLoading && isOpen) {
      return (
        <div className="my-4 w-full h-64 sm:aspect-square rounded-lg bg-muted flex items-center justify-center overflow-hidden">
          <div className="flex flex-col items-center gap-4 text-muted-foreground">
            <Loader2 className="h-12 w-12 animate-spin" />
            <p>Loading attendance status...</p>
          </div>
        </div>
      );
    }
    // If user is clocked in, show only the clock-out UI
    if (attendanceIdFromRedux || step === 'clockedIn') {
      return (
        <div className="my-4 w-full h-64 sm:aspect-square rounded-lg bg-muted flex items-center justify-center overflow-hidden">
          <div className="text-center text-muted-foreground flex flex-col items-center gap-4">
            <UserCheck className="h-12 w-12" />
            <p>Ready to clock out?</p>
            <Button 
              onClick={handleClockOut} 
              disabled={isSubmitting || isAttendanceIdLoading}
              className="w-full max-w-xs"
            >
              {(isSubmitting || isAttendanceIdLoading) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Clock Out
            </Button>
          </div>
        </div>
      );
    }
    // Only show verification method if not clocked in
    switch(step) {
        case 'idle':
            return (
                <div className="my-4 w-full h-64 sm:aspect-square rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                    <div className="text-center text-muted-foreground flex flex-col items-center gap-2">
                        <UserCheck className="h-12 w-12" />
                        <p>Choose verification method</p>
                    </div>
                </div>
            );
        case 'capturing':
            return (
                <div className="my-4 w-full h-64 sm:aspect-square rounded-lg bg-muted flex items-center justify-center overflow-hidden relative">
                    <video 
                        ref={videoRef} 
                        autoPlay 
                        playsInline 
                        className="h-full w-full object-cover rounded-lg"
                        style={{ maxWidth: '100%', maxHeight: '100%' }}
                        onLoadedMetadata={() => {
                            console.log("Video metadata loaded - dimensions:", videoRef.current?.videoWidth, "x", videoRef.current?.videoHeight);
                        }}
                        onCanPlay={() => {
                            console.log("Video can play - ready to capture");
                        }}
                    />
                    {/* Camera Ready Indicator */}
                    {!cameraReady && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                            <div className="flex flex-col items-center gap-2 text-white">
                                <Loader2 className="h-8 w-8 animate-spin" />
                                <p className="text-sm">Initializing camera...</p>
                            </div>
                        </div>
                    )}
                    {/* Flip Camera Button Overlay */}
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
        case 'processing':
            return (
                <div className="my-4 w-full h-64 sm:aspect-square rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                    <div className="flex flex-col items-center gap-4 text-muted-foreground">
                        <Loader2 className="h-12 w-12 animate-spin" />
                        <p>Processing image...</p>
                    </div>
                </div>
            );
        case 'preview':
            return (
                <>
                    <div className="my-4 w-full h-64 sm:aspect-square rounded-lg bg-muted flex items-center justify-center overflow-hidden relative">
                         {photoDataUri ? (
                            <>
                                {imageLoading && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 z-10">
                                        <Loader2 className="h-8 w-8 animate-spin text-white" />
                                    </div>
                                )}
                                <img 
                                    src={photoDataUri} 
                                    alt="Selfie preview" 
                                    className="w-full h-full object-cover rounded-lg"
                                    style={{ maxWidth: '100%', maxHeight: '100%' }}
                                    onLoad={() => {
                                        console.log("Image loaded successfully");
                                        setImageLoading(false);
                                    }}
                                    onError={(e) => {
                                        console.error("Image failed to load:", e);
                                        console.error("PhotoDataUri length:", photoDataUri.length);
                                        console.error("PhotoDataUri starts with:", photoDataUri.substring(0, 100));
                                        setImageLoading(false);
                                        toast({
                                            variant: "destructive",
                                            title: "Image Error",
                                            description: "Failed to load the captured image. Please try again.",
                                        });
                                    }}
                                />
                            </>
                         ) : (
                            <div className="flex flex-col items-center gap-4 text-muted-foreground">
                                <Camera className="h-12 w-12" />
                                <p>No image captured</p>
                                <p className="text-xs">PhotoDataUri: {photoDataUri ? 'Present' : 'Not set'}</p>
                            </div>
                         )}
                    </div>
                    <div className="space-y-4">
                        <Card>
                            <CardContent className="p-4 space-y-2">
                                <Label htmlFor="manual-location">Location Name *</Label>
                                {isDetectingLocation && (
                                    <div className="flex items-center gap-2 text-sm text-blue-600">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Detecting your location...
                                    </div>
                                )}
                                {locationError && (
                                    <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                                        {locationError}
                                    </div>
                                )}
                                {locationData && !isDetectingLocation && (
                                    <div className="text-sm text-green-600 bg-green-50 p-2 rounded">
                                        ✅ Auto-detected: {locationData.address}
                                    </div>
                                )}
                                <Input 
                                    id="manual-location"
                                    value={manualLocation}
                                    onChange={(e) => debouncedSetLocation(e.target.value)}
                                    placeholder="e.g., Main Office, Client Site"
                                    className={!manualLocation.trim() ? "border-red-300" : ""}
                                    required
                                />
                                <div className="flex gap-2">
                                    <Button 
                                        type="button"
                                        variant="outline" 
                                        size="sm"
                                        onClick={detectLocation}
                                        disabled={isDetectingLocation}
                                        className="flex-1"
                                    >
                                        {isDetectingLocation ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                Detecting...
                                            </>
                                        ) : (
                                            <>
                                                <RefreshCcw className="h-4 w-4 mr-2" />
                                                Re-detect Location
                                            </>
                                        )}
                                    </Button>
                                </div>
                                <Label htmlFor="shift">Shift</Label>
                                <select
                                  id="shift"
                                  value={shift}
                                  onChange={e => setShift(e.target.value)}
                                  className="block w-full border rounded px-2 py-1 mt-1 mb-2"
                                >
                                  <option value="morning">Morning</option>
                                  <option value="evening">Evening</option>
                                  <option value="night">Night</option>
                                </select>
                                <Label htmlFor="note">Note</Label>
                                <Input
                                    id="note"
                                    defaultValue={note}
                                    onChange={e => debouncedSetNote(e.target.value)}
                                    placeholder="e.g., clean all area"
                                />
                                <div className="flex gap-2 text-xs text-muted-foreground">
                                    <span>Latitude: {latitude || '...'}</span>
                                    <span>Longitude: {longitude || '...'}</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </>
            );
        case 'verifying':
            return (
                <div className="my-4 w-full h-64 sm:aspect-square rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                    <div className="flex flex-col items-center gap-4 text-muted-foreground">
                        <Loader2 className="h-12 w-12 animate-spin" />
                        <p>Verifying, please wait...</p>
                    </div>
                </div>
            );
        case 'result':
            return (
                 <div className="my-4 w-full h-64 sm:aspect-square rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                    {verificationResult && (
                        <div className="flex flex-col items-center gap-4 p-4 text-center">
                            {verificationResult.verificationResult.isVerified ? (
                                <CheckCircle className="h-16 w-16 text-green-500" />
                            ) : (
                                <XCircle className="h-16 w-16 text-destructive" />
                            )}
                            <h3 className="text-lg font-semibold">{verificationResult.verificationResult.isVerified ? 'Verification Successful' : 'Verification Failed'}</h3>
                            <p className="text-sm text-muted-foreground">{verificationResult.verificationResult.message}</p>
                            <p className="text-xs text-muted-foreground">Confidence: {(verificationResult.verificationResult.confidenceLevel * 100).toFixed(1)}%</p>
                            <audio ref={audioRef} src={verificationResult.audioFeedback} onCanPlayThrough={playAudioFeedback} />
                            <Button onClick={playAudioFeedback} variant="outline">
                                <AudioLines className="mr-2 h-4 w-4"/> Play Feedback
                            </Button>
                        </div>
                    )}
                </div>
            );
    }
  }


  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">{status === 'Clocked In' ? 'Clock Out' : 'Clock In'}</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
        <DialogTitle>{status === 'Clocked In' ? 'Clock-Out' : 'Clock-In'} for {employee.name}</DialogTitle>
            <DialogDescription>
            Verify your identity and confirm your location.
          </DialogDescription>
        </DialogHeader>
        
        {renderContent()}
        
        <input 
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*"
        />

        <DialogFooter className="gap-2 flex-col sm:flex-row sm:justify-center pt-4">
            {step === 'idle' && (
                <div className="w-full flex flex-col gap-2">
                    <Button onClick={startCamera} className="w-full"><Camera className="mr-2 h-4 w-4" /> Take a Selfie</Button>
                    <Button onClick={handleUploadClick} variant="secondary" className="w-full"><Upload className="mr-2 h-4 w-4" /> Upload Photo</Button>
                </div>
            )}
            {step === 'capturing' && (
                <Button 
                    onClick={takePhoto} 
                    className="w-full" 
                    disabled={!cameraReady}
                >
                    {!cameraReady ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Initializing...
                        </>
                    ) : (
                        <>
                            <Camera className="mr-2 h-4 w-4" />
                            Take Photo
                        </>
                    )}
                </Button>
            )}
            {step === 'preview' && (
                <div className="w-full flex flex-col gap-2">
                    <Button onClick={() => { setStep('idle'); resetState(); }} variant="outline" className="w-full"><RefreshCcw className="mr-2 h-4 w-4" />Start Over</Button>
                    {!attendanceIdFromRedux ? (
                      <Button onClick={handleClockIn} className="w-full" disabled={isClockInDisabled() || isSubmitting}>
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <UserCheck className="mr-2 h-4 w-4" />
                            Confirm & Clock In
                          </>
                        )}
                      </Button>
                    ) : (
                      <Button onClick={handleClockOut} className="w-full" disabled={isClockInDisabled() || isSubmitting}>
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <UserCheck className="mr-2 h-4 w-4" />
                            Confirm & Clock Out
                          </>
                        )}
                      </Button>
                    )}
                </div>
            )}
            {step === 'result' && <Button onClick={() => handleOpenChange(false)} className="w-full">Done</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
