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
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, PlusCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { createManager } from "@/store/slices/managerSlice";
import axios from "axios";
import { authService } from "@/services/authService";
import { useDebouncedCallback } from "@/hooks/useDebounce";

// Type for field suggestions
type FieldSuggestions = {
  name: string[];
  email: string[];
  location: string[];
  mobile: string[];
};

export function AddManagerModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const dispatch = useDispatch();

  // Form state
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    teamSize: "",
    location: "",
    mobile: "",
  });

  // Status state
  const [isActive, setIsActive] = useState(true);

  // Suggestions state
  const [suggestions, setSuggestions] = useState<FieldSuggestions>({
    name: [],
    email: [],
    location: [],
    mobile: [],
  });

  const [activeField, setActiveField] = useState<string | null>(null);

  const isReadonly = authService.getCurrentUser()?.role === "readonly";

  // Fetch suggestions based on field type
  const fetchSuggestions = async (field: string, value: string) => {
    if (!value) {
      setSuggestions(prev => ({ ...prev, [field]: [] }));
      return;
    }

    try {
      let newSuggestions: string[] = [];
      
      switch (field) {
        case "location":
          const res = await axios.get("https://nominatim.openstreetmap.org/search", {
            params: {
              q: value,
              format: "json",
              addressdetails: 1,
              limit: 5,
              countrycodes: "in",
            },
          });
          newSuggestions = res.data
            .filter((item: any) => 
              item.address?.state === "Gujarat" || 
              item.display_name.toLowerCase().includes("gujarat")
            )
            .map((item: any) => item.display_name);
          break;
          
        case "name":
          // You might want to connect this to your API for existing names
          break;
          
        case "email":
          // Common email patterns based on name
          if (form.name) {
            const nameParts = form.name.toLowerCase().split(" ");
        
          }
          break;
          
        case "mobile":
          // Common Indian mobile number prefixes
     
          break;
      }

      setSuggestions(prev => ({ ...prev, [field]: newSuggestions }));
    } catch (error) {
      console.error(`Error fetching ${field} suggestions:`, error);
    }
  };

  // Debounced suggestion fetcher
  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeField && form[activeField as keyof typeof form]) {
        fetchSuggestions(activeField, form[activeField as keyof typeof form]);
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [form, activeField]);

  // Debounced handler for form inputs
  const debouncedSetForm = useDebouncedCallback((field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  }, 300);

  const handleInputChange = (field: string, value: string) => {
    // Update immediately for UI responsiveness
    setForm(prev => ({ ...prev, [field]: value }));
    // Also debounce for any side effects
    debouncedSetForm(field, value);
    setActiveField(field);
  };

  const handleSuggestionSelect = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setActiveField(null);
  };

  const validateForm = () => {
    if (!form.name.trim()) {
      toast({ title: "Validation Error", description: "Name is required", variant: "destructive" });
      return false;
    }
    if (!form.email.trim()) {
      toast({ title: "Validation Error", description: "Email is required", variant: "destructive" });
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      toast({ title: "Validation Error", description: "Please enter a valid email address", variant: "destructive" });
      return false;
    }
    if (!form.password.trim()) {
      toast({ title: "Validation Error", description: "Password is required", variant: "destructive" });
      return false;
    }
    if (form.password.length < 8) {
      toast({ title: "Validation Error", description: "Password must be at least 8 characters", variant: "destructive" });
      return false;
    }
    if (!form.teamSize.trim()) {
      toast({ title: "Validation Error", description: "Team size is required", variant: "destructive" });
      return false;
    }
    if (!form.location.trim()) {
      toast({ title: "Validation Error", description: "Location is required", variant: "destructive" });
      return false;
    }
    if (!form.mobile.trim()) {
      toast({ title: "Validation Error", description: "Mobile number is required", variant: "destructive" });
      return false;
    }
    if (!/^\d{10}$/.test(form.mobile)) {
      toast({ title: "Validation Error", description: "Mobile number must be 10 digits", variant: "destructive" });
      return false;
    }
    return true;
  };

  const handleSaveChanges = async () => {
    console.log('🔍 [AddManagerModal] Starting handleSaveChanges');
    console.log('🔍 [AddManagerModal] Form data:', form);
    console.log('🔍 [AddManagerModal] isActive:', isActive);
    
    if (!validateForm()) {
      console.log('❌ [AddManagerModal] Form validation failed');
      return;
    }
    
    const currentAdmin = authService.getCurrentUser();
    console.log('🔍 [AddManagerModal] Current admin:', currentAdmin);
    
    if (!currentAdmin?._id) {
      console.log('❌ [AddManagerModal] No current admin found');
      toast({
        title: "Error",
        description: "Unable to identify current admin. Please log in again.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    const managerData = {
      name: form.name,
      email: form.email,
      adminId: currentAdmin.id || currentAdmin.id,
      password: form.password,
      address: form.location,
      location: form.location,
      teamSize: form.teamSize ? Number(form.teamSize) : undefined,
      mobile: form.mobile,
      isActive: isActive,
      status: isActive ? "Active" : "Inactive",
    };
    
    console.log('🔄 [AddManagerModal] Creating manager with data:', managerData);
    console.log('🔄 [AddManagerModal] isActive value:', isActive);
    console.log('🔄 [AddManagerModal] status value:', isActive ? "Active" : "Inactive");
    
    try {
      console.log('🚀 [AddManagerModal] Dispatching createManager with data:', managerData);
      const result = await dispatch(createManager(managerData) as any);
      console.log('✅ [AddManagerModal] createManager result:', result);
      
      toast({
        title: "Success!",
        description: `New manager has been added.`,
      });
      
      setIsOpen(false);
      setForm({
        name: "",
        email: "",
        password: "",
        teamSize: "",
        location: "",
        mobile: "",
      });
      setIsActive(true);
    } catch (error: any) {
      console.error('❌ [AddManagerModal] Error creating manager:', error);
      console.error('❌ [AddManagerModal] Error details:', {
        message: error.message,
        payload: error.payload,
        type: error.type
      });
      
      toast({
        title: "Error",
        description: error.message || "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Render suggestion dropdown
  const renderSuggestions = (field: string) => {
    if (activeField !== field || suggestions[field as keyof FieldSuggestions].length === 0) {
      return null;
    }
    
    return (
      <ul className="absolute z-10 mt-1 w-full bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
        {suggestions[field as keyof FieldSuggestions].map((item, index) => (
          <li
            key={index}
            className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm"
            onClick={() => handleSuggestionSelect(field, item)}
          >
            {item}
          </li>
        ))}
      </ul>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {!isReadonly && (
        <DialogTrigger asChild>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Supervisors
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="w-[95vw] sm:w-full sm:max-w-md md:max-w-lg max-h-[90vh] overflow-y-auto rounded-lg p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Add New Supervisor</DialogTitle>
          <DialogDescription>
            Fill in the details for the new manager.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* Name Field with Suggestions */}
          <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-left sm:text-right">Full Name</Label>
            <div className="sm:col-span-3 relative">
              <Input
                id="name"
                placeholder="Jane Roe"
                disabled={isLoading}
                value={form.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                onFocus={() => setActiveField("name")}
                autoComplete="off"
              />
              {renderSuggestions("name")}
            </div>
          </div>

          {/* Email Field with Suggestions */}
          <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className="text-left sm:text-right">Email</Label>
            <div className="sm:col-span-3 relative">
              <Input
                id="email"
                type="email"
                placeholder="jane.r@example.com"
                disabled={isLoading}
                value={form.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                onFocus={() => setActiveField("email")}
                autoComplete="off"
              />
              {renderSuggestions("email")}
            </div>
          </div>

          {/* Password Field */}
          <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
            <Label htmlFor="password" className="text-left sm:text-right">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="********"
              className="sm:col-span-3"
              disabled={isLoading}
              value={form.password}
              onChange={(e) => handleInputChange("password", e.target.value)}
            />
          </div>

          {/* Team Size Field */}
          <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
            <Label htmlFor="teamSize" className="text-left sm:text-right">Team Size</Label>
            <Input
              id="teamSize"
              type="number"
              placeholder="10"
              className="sm:col-span-3"
              disabled={isLoading}
              value={form.teamSize}
              onChange={(e) => handleInputChange("teamSize", e.target.value)}
            />
          </div>

          {/* Location Field with Suggestions */}
          <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
            <Label htmlFor="location" className="text-left sm:text-right">Location</Label>
            <div className="sm:col-span-3 relative">
              <Input
                id="location"
                placeholder="e.g., Main Office"
                disabled={isLoading}
                value={form.location}
                onChange={(e) => handleInputChange("location", e.target.value)}
                onFocus={() => setActiveField("location")}
                autoComplete="off"
              />
              {renderSuggestions("location")}
            </div>
          </div>

          {/* Mobile Field with Suggestions */}
          <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
            <Label htmlFor="mobile" className="text-left sm:text-right">Mobile</Label>
            <div className="sm:col-span-3 relative">
              <Input
                id="mobile"
                placeholder="8128841553"
                disabled={isLoading}
                value={form.mobile}
                onChange={(e) => handleInputChange("mobile", e.target.value)}
                onFocus={() => setActiveField("mobile")}
                autoComplete="off"
              />
              {renderSuggestions("mobile")}
            </div>
          </div>

          {/* Status Field */}
          <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
            <Label htmlFor="status" className="text-left sm:text-right">Account Status</Label>
            <div className="sm:col-span-3 flex items-center space-x-2">
              <Switch 
                id="status" 
                checked={isActive} 
                onCheckedChange={setIsActive} 
                disabled={isLoading} 
              />
              <Label htmlFor="status" className="text-sm">
                {isActive ? 'Active (Can login)' : 'Inactive (Cannot login)'}
              </Label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isLoading}>Cancel</Button>
          </DialogClose>
          <Button type="submit" onClick={handleSaveChanges} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add Manager
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}