"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getApiUrl } from "@/lib/config";
import { Loader2, Users, MapPin, Clock, Camera, AlertCircle, Navigation } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface BulkStepInModalProps {
  children: React.ReactNode;
}

export function BulkStepInModal({ children }: BulkStepInModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [formData, setFormData] = useState({
    shift: "",
    longitude: "72.8777", // Default Mumbai coordinates
    latitude: "19.0760",
    address: "Office Location",
    note: "",
    stepInImage: null as File | null,
  });
  const { toast } = useToast();

  const detectLocation = async () => {
    if (!navigator.geolocation) {
      toast({
        title: "Error",
        description: "Geolocation is not supported by this browser",
        variant: "destructive",
      });
      return;
    }

    setLocationLoading(true);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // 5 minutes
        });
      });

      const { latitude, longitude } = position.coords;
      
      // Get address using reverse geocoding
      const address = await getAddressFromCoordinates(latitude, longitude);
      
      setFormData(prev => ({
        ...prev,
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        address: address || "Current Location"
      }));

      toast({
        title: "Location Detected! 📍",
        description: `Location updated: ${address || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`}`,
      });

    } catch (error: any) {
      console.error("Location detection error:", error);
      let errorMessage = "Failed to detect location";
      
      if (error.code === 1) {
        errorMessage = "Location access denied. Please allow location access.";
      } else if (error.code === 2) {
        errorMessage = "Location unavailable. Please check your connection.";
      } else if (error.code === 3) {
        errorMessage = "Location request timed out. Please try again.";
      }

      toast({
        title: "Location Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLocationLoading(false);
    }
  };

  const getAddressFromCoordinates = async (lat: number, lng: number): Promise<string> => {
    try {
      // Using a free reverse geocoding service
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
      );
      
      if (!response.ok) {
        throw new Error('Reverse geocoding failed');
      }
      
      const data = await response.json();
      
      // Format the address
      const parts = [];
      if (data.locality) parts.push(data.locality);
      if (data.principalSubdivision) parts.push(data.principalSubdivision);
      if (data.countryName) parts.push(data.countryName);
      
      return parts.join(', ') || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    } catch (error) {
      console.error("Reverse geocoding error:", error);
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  };

  // Auto-detect location when modal opens
  useEffect(() => {
    if (open) {
      detectLocation();
    }
  }, [open]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setFormData(prev => ({
      ...prev,
      stepInImage: file
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.shift) {
      toast({
        title: "Error",
        description: "Please select a shift",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      const formDataToSend = new FormData();
      formDataToSend.append("adminEmail", "mohit123456rathod@gmail.com");
      formDataToSend.append("shift", formData.shift);
      formDataToSend.append("longitude", formData.longitude);
      formDataToSend.append("latitude", formData.latitude);
      formDataToSend.append("address", formData.address);
      formDataToSend.append("note", formData.note || ``);
      
      if (formData.stepInImage) {
        formDataToSend.append("stepInImage", formData.stepInImage);
      }

      const response = await fetch(`${getApiUrl()}/attendence/bulk-step-in`, {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: formDataToSend,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to perform bulk step-in");
      }

      toast({
        title: "Success! 🎉",
        description: `Bulk step-in completed successfully! ${data.summary?.successful || 0} employees clocked in.`,
      });

      // Reset form and close modal
      setFormData({
        shift: "",
        longitude: "72.8777",
        latitude: "19.0760",
        address: "Office Location",
        note: "",
        stepInImage: null,
      });
      setOpen(false);

    } catch (error: any) {
      console.error("Bulk step-in error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to perform bulk step-in",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            Bulk Step-In
          </DialogTitle>
          <DialogDescription>
            Clock in all available employees for the selected shift. This action will mark all non-working employees as present.
          </DialogDescription>
        </DialogHeader>

        <Alert className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            This feature is restricted to authorized administrators only. All employees will be clocked in with the same shift and location.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="shift" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Shift *
            </Label>
            <Select value={formData.shift} onValueChange={(value) => handleInputChange("shift", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select shift" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="morning">Morning (7 AM - 3 PM)</SelectItem>
                <SelectItem value="evening">Evening (3 PM - 11 PM)</SelectItem>
                <SelectItem value="night">Night (11 PM - 7 AM)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Navigation className="h-4 w-4" />
                Location Coordinates
                {locationLoading && (
                  <span className="text-xs text-blue-600 ml-2">
                    <Loader2 className="inline h-3 w-3 animate-spin mr-1" />
                    Auto-detecting...
                  </span>
                )}
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={detectLocation}
                disabled={locationLoading}
                className="text-xs"
              >
                {locationLoading ? (
                  <>
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    Detecting...
                  </>
                ) : (
                  <>
                    <Navigation className="mr-1 h-3 w-3" />
                    Re-detect
                  </>
                )}
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="longitude">Longitude</Label>
                <Input
                  id="longitude"
                  type="number"
                  step="any"
                  value={formData.longitude}
                  onChange={(e) => handleInputChange("longitude", e.target.value)}
                  placeholder="72.8777"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="latitude">Latitude</Label>
                <Input
                  id="latitude"
                  type="number"
                  step="any"
                  value={formData.latitude}
                  onChange={(e) => handleInputChange("latitude", e.target.value)}
                  placeholder="19.0760"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Address
              {locationLoading && (
                <span className="text-xs text-blue-600 ml-2">
                  <Loader2 className="inline h-3 w-3 animate-spin mr-1" />
                  Auto-detecting...
                </span>
              )}
            </Label>
            <div className="flex gap-2">
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => handleInputChange("address", e.target.value)}
                placeholder="Office Location"
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={detectLocation}
                disabled={locationLoading}
                className="px-3"
              >
                {locationLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Navigation className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              {locationLoading 
                ? "Auto-detecting your current location..." 
                : "Location is auto-detected when modal opens. Click to re-detect if needed."
              }
            </p>
          </div>

          <div className="space-y-2 hidden md:block">
            <Label htmlFor="note">Note (Optional)</Label>
            <Textarea
              id="note"
              value={formData.note}
              onChange={(e) => handleInputChange("note", e.target.value)}
              placeholder="Additional notes for this bulk step-in..."
              rows={3}
            />
          </div>

          <div className="space-y-2 hidden md:block">
            <Label htmlFor="stepInImage" className="flex items-center gap-2">
              <Camera className="h-4 w-4" />
              Step-in Image (Optional)
            </Label>
            <Input
              id="stepInImage"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {formData.stepInImage && (
              <p className="text-sm text-gray-600">
                Selected: {formData.stepInImage.name}
              </p>
            )}
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
            <Button type="submit" disabled={loading || !formData.shift}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Users className="mr-2 h-4 w-4" />
                  Bulk Step-In
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
