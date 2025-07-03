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
import { Edit, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { editManager, Manager } from "@/store/slices/managerSlice";
import axios from "axios";

type FieldSuggestions = {
  name: string[];
  email: string[];
  location: string[];
};

export function EditManagerModal({ manager }: { manager: Manager }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const dispatch = useDispatch();

  // Form state
  const [form, setForm] = useState({
    name: manager.name,
    email: manager.email,
    teamSize: manager.teamSize,
    location: manager.location || manager.address || "",
  });

  // Suggestions state
  const [suggestions, setSuggestions] = useState<FieldSuggestions>({
    name: [],
    email: [],
    location: [],
  });

  const [activeField, setActiveField] = useState<string | null>(null);
  const [status, setStatus] = useState(
    (manager.status || (manager.isActive ? "Active" : "Inactive")) === "Active"
  );

  // Sync form state when modal opens or manager changes
  useEffect(() => {
    if (isOpen) {
      setForm({
        name: manager.name,
        email: manager.email,
        teamSize: manager.teamSize,
        location: manager.location || manager.address || "",
      });
      setStatus(
        (manager.status || (manager.isActive ? "Active" : "Inactive")) === "Active"
      );
    }
  }, [isOpen, manager]);

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
          // newSuggestions = res.data
          //   .filter((item: any) => 
          //     item.address?.state === "Gujarat" || 
          //     item.display_name.toLowerCase().includes("gujarat")
          //   )
          //   .map((item: any) => item.display_name);
          break;
          
        case "name":
          // You might want to connect this to your API for existing names
          // newSuggestions = ["John Doe", "Jane Smith", "Robert Johnson"];
          break;
          
        case "email":
          // Common email patterns based on name
          if (form.name) {
            const nameParts = form.name.toLowerCase().split(" ");
        
          }
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

  const handleInputChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setActiveField(field);
  };

  const handleSuggestionSelect = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setActiveField(null);
  };

  const handleSaveChanges = async () => {
    setIsLoading(true);
    try {
      await dispatch(editManager({
        id: manager._id,
        body: {
          name: form.name,
          email: form.email,
          teamSize: form.teamSize,
          address: form.location,
          location: form.location,
          status: status ? "Active" : "Inactive",
        },
      }) as any);
      
      toast({
        title: "Success!",
        description: `Manager ${form.name}'s profile has been updated.`,
      });
      
      setIsOpen(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update manager.",
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
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Manager</DialogTitle>
          <DialogDescription>
            Make changes to {manager.name}&apos;s profile here. Click save when you&apos;re done.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* Name Field with Suggestions */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">Full Name</Label>
            <div className="col-span-3 relative">
              <Input
                id="name"
                value={form.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                onFocus={() => setActiveField("name")}
                className="w-full"
                disabled={isLoading}
                autoComplete="off"
              />
              {renderSuggestions("name")}
            </div>
          </div>

          {/* Email Field with Suggestions */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className="text-right">Email</Label>
            <div className="col-span-3 relative">
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                onFocus={() => setActiveField("email")}
                className="w-full"
                disabled={isLoading}
                autoComplete="off"
              />
              {renderSuggestions("email")}
            </div>
          </div>

          {/* Team Size Field */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="teamSize" className="text-right">Team Size</Label>
            <Input
              id="teamSize"
              type="number"
              value={form.teamSize}
              onChange={(e) => handleInputChange("teamSize", e.target.value)}
              className="col-span-3"
              disabled={isLoading}
            />
          </div>

          {/* Location Field with Suggestions */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="location" className="text-right">Location</Label>
            <div className="col-span-3 relative">
              <Input
                id="location"
                value={form.location}
                onChange={(e) => handleInputChange("location", e.target.value)}
                onFocus={() => setActiveField("location")}
                className="w-full"
                disabled={isLoading}
                autoComplete="off"
              />
              {renderSuggestions("location")}
            </div>
          </div>

          {/* Status Field */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="status" className="text-right">Status</Label>
            <div className="col-span-3 flex items-center space-x-2">
              <Switch 
                id="status" 
                checked={status} 
                onCheckedChange={setStatus} 
                disabled={isLoading} 
              />
              <Label htmlFor="status">{status ? 'Active' : 'Inactive'}</Label>
            </div>
          </div>
        </div>
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