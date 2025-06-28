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

export function ClockInModal({ employeeName }: { employeeName: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<"idle" | "capturing" | "preview" | "verifying" | "result">("idle");
  const [photoDataUri, setPhotoDataUri] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [verificationResult, setVerificationResult] = useState<VerifyClockInOutput | null>(null);
  const [manualLocation, setManualLocation] = useState('');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

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
  }, [stopCamera]);


  useEffect(() => {
    // Cleanup camera on unmount
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
        resetState();
    }
    setIsOpen(open);
  }

  const startCamera = useCallback(async () => {
    setStep('capturing');
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
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
  }, [toast]);
  
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

    setStep("verifying");

    try {
      const result = await verifyClockIn({
        photoDataUri,
        currentLocation: clockInLocation,
        employeeName,
      });
      
      setVerificationResult(result);
      setStep("result");
    } catch (error) {
      console.error("Verification failed:", error);
      toast({
        variant: "destructive",
        title: "Verification Failed",
        description: "An error occurred during verification. Please try again.",
      });
      setStep("preview");
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
  
  const renderContent = () => {
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
                <div className="my-4 w-full h-64 sm:aspect-square rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                    <video ref={videoRef} autoPlay playsInline className="h-full w-full object-cover" />
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
        <Button size="sm">Clock In</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Clock-In for {employeeName}</DialogTitle>
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
                    <Button onClick={handleClockIn} className="w-full" disabled={isClockInDisabled()}><UserCheck className="mr-2 h-4 w-4" />Confirm & Clock In</Button>
                </div>
            )}
            {step === 'result' && <Button onClick={() => handleOpenChange(false)} className="w-full">Done</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
