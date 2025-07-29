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

export function ClockInModal({ employee, attendanceId: propAttendanceId, status, onAttendanceChange }: {
  employee: { name: string; id: string };
  attendanceId?: string | null;
  status: 'Clocked In' | 'Clocked Out' | 'On Leave';
  onAttendanceChange?: (newId: string | null) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<"idle" | "capturing" | "preview" | "verifying" | "result" | "clockedIn">("idle");
  const [photoDataUri, setPhotoDataUri] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [verificationResult, setVerificationResult] = useState<VerifyClockInOutput | null>(null);
  const [manualLocation, setManualLocation] = useState('');
  const [note, setNote] = useState('');
  const [latitude, setLatitude] = useState<string>('');
  const [longitude, setLongitude] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user'); // Add this state
  const [shift, setShift] = useState('morning');
  const attendanceIdFromRedux = useSelector((state: any) => state.attendance.attendanceIds[employee.id] || null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const dispatch = useDispatch();
  const { isClockingIn, isClockingOut, error: attendanceError } = useSelector((state: any) => state.attendance);

  // Debug log for attendanceId
  console.log("[DEBUG] ClockInModal for", employee.name, "employeeId:", employee.id, "attendanceId from Redux:", attendanceIdFromRedux);

  // Add a loading state for attendanceId
  const isAttendanceIdLoading = attendanceIdFromRedux === undefined;

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
    setVerificationResult(null);
    setManualLocation('');
    setNote('');
    setLatitude('');
    setLongitude('');
  }, [stopCamera]);

  useEffect(() => {
    // Cleanup camera on unmount
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  useEffect(() => {
    if (isOpen) {
      console.log("[DEBUG] Modal opened for", employee.name, "employeeId:", employee.id);
      
      // Enhanced location handling for mobile WebView
      const getLocation = () => {
        // Check if location is injected by React Native WebView
        if (typeof window !== 'undefined' && (window as any).injectedLocation) {
          const injectedLocation = (window as any).injectedLocation;
          console.log("[DEBUG] Using injected location from React Native:", injectedLocation);
          setLatitude(injectedLocation.latitude.toString());
          setLongitude(injectedLocation.longitude.toString());
          return;
        }
        
        // Fallback to browser geolocation
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              console.log("[DEBUG] Using browser geolocation:", position.coords);
              setLatitude(position.coords.latitude.toString());
              setLongitude(position.coords.longitude.toString());
            },
            (error) => {
              console.warn("[DEBUG] Geolocation error:", error);
              // Fallback to static coordinates (Bangalore example)
              setLatitude("12.9716");
              setLongitude("77.5946");
            },
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 300000 // 5 minutes cache
            }
          );
        } else {
          console.warn("[DEBUG] Geolocation not available, using fallback");
          setLatitude("12.9716");
          setLongitude("77.5946");
        }
      };
      
      getLocation();
      
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
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode }, // Use facingMode
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
      setIsOpen(false);
    }
  }, [toast, facingMode]); // Add facingMode as dependency
  
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
      // Reset file input value to allow selecting the same file again
      event.target.value = '';
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };
  
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

  const handleClockIn = async () => {
    if (!photoDataUri) return;
    const clockInLocation = manualLocation.trim();
    if (!clockInLocation) {
      toast({
        variant: "destructive",
        title: "Location Required",
        description: "Please enter your location manually.",
      });
      return;
    }
    if (!latitude || !longitude) {
      toast({
        variant: "destructive",
        title: "Location Error",
        description: "Could not get your current location.",
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
        toast({
          variant: 'destructive',
          title: 'Clock In Failed',
          description: attendanceError || 'Failed to clock in.',
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
        setIsOpen(false);
      } else {
        toast({
          variant: 'destructive',
          title: 'Clock Out Failed',
          description: attendanceError || 'Failed to clock out.',
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
    return !manualLocation.trim();
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
                    <video ref={videoRef} autoPlay playsInline className="h-full w-full object-cover" />
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
        case 'preview':
            return (
                <>
                    <div className="my-4 w-full h-64 sm:aspect-square rounded-lg bg-muted flex items-center justify-center overflow-hidden relative">
                         {photoDataUri && (
                            <Image src={photoDataUri} alt="Selfie preview" layout="fill" objectFit="cover" />
                         )}
                    </div>
                    <div className="space-y-4">
                        <Card>
                            <CardContent className="p-4 space-y-2">
                                <Label htmlFor="manual-location">Location Name</Label>
                                <Input 
                                    id="manual-location"
                                    value={manualLocation}
                                    onChange={(e) => setManualLocation(e.target.value)}
                                    placeholder="e.g., Main Office, Client Site"
                                />
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
                                    value={note}
                                    onChange={e => setNote(e.target.value)}
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
            {step === 'capturing' && <Button onClick={takePhoto} className="w-full"><Camera className="mr-2 h-4 w-4" />Take Photo</Button>}
            {step === 'preview' && (
                <div className="w-full flex flex-col gap-2">
                    <Button onClick={() => { setStep('idle'); resetState(); }} variant="outline" className="w-full"><RefreshCcw className="mr-2 h-4 w-4" />Start Over</Button>
                    {!attendanceIdFromRedux ? (
                      <Button onClick={handleClockIn} className="w-full" disabled={isClockInDisabled() || isSubmitting}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserCheck className="mr-2 h-4 w-4" />}Confirm & Clock In
                      </Button>
                    ) : (
                      <Button onClick={handleClockOut} className="w-full" disabled={isClockInDisabled() || isSubmitting}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserCheck className="mr-2 h-4 w-4" />}Confirm & Clock Out
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
