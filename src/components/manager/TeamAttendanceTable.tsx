"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ClockInModal } from "./ClockInModal";
import { Avatar, AvatarImage, AvatarFallback } from "../ui/avatar";
import { cn } from "@/lib/utils";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useDispatch, useSelector } from 'react-redux';
import { fetchAttendanceId } from '@/store/slices/attendanceSlice';
import { Dialog, DialogTrigger, DialogContent, DialogTitle } from "@/components/ui/dialog";
import Image from "next/image";
import { getApiUrl } from "@/lib/config";
import { AddEmployeeModal } from "./AddEmployeeModal";
import { RefreshCw } from "lucide-react";

type TeamMember = {
    id: string;
    name: string;
    email: string;
    status: 'Clocked In' | 'Clocked Out' | 'On Leave';
    shift: string;
    image?: string; // Add image field for employee profile photos
};

export function TeamAttendanceTable({ teamMembers }: { teamMembers: TeamMember[] }) {
  const isMobile = useIsMobile();
  const dispatch = useDispatch();
  const attendanceIds = useSelector((state: any) => state.attendance.attendanceIds || {});
  const attendanceRecords = useSelector((state: any) => state.attendance.attendanceRecords || {});
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const loggedMembers = useRef<Set<string>>(new Set());
  const loggedImageEvents = useRef<Set<string>>(new Set());

  // Simple refresh function
  const handleRefresh = () => {
    // Refetch attendance IDs for all team members
    teamMembers.forEach((member) => {
      dispatch(fetchAttendanceId(member.id) as any);
    });
  };

  // Helper function to get image URL
  const getImageUrl = (image: string | undefined) => {
    if (!image) return undefined;
    const apiUrl = getApiUrl();
    let baseUrl = apiUrl;
    
    // Remove /api from the end if it exists
    if (baseUrl.endsWith('/api')) {
      baseUrl = baseUrl.slice(0, -4); // Remove '/api'
    } else if (baseUrl.endsWith('/api/')) {
      baseUrl = baseUrl.slice(0, -5); // Remove '/api/'
    }
    
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const imageUrl = `${cleanBaseUrl}/static/${image}`;
    return imageUrl;
  };

  // Helper function to get the best available image for a team member
  const getBestImageUrl = (member: TeamMember) => {
    const memberKey = `${member.id}-${member.image || 'no-image'}`;
    
    // First try employee profile image (from employee creation)
    if (member.image) {
      const imageUrl = getImageUrl(member.image);
      if (!loggedMembers.current.has(memberKey)) {
        console.log('👤 Using employee profile image for:', member.name, 'URL:', imageUrl);
        loggedMembers.current.add(memberKey);
      }
      return imageUrl;
    }
    
    // Fallback to stepIn image (clock-in photo) from attendance records
    const stepInImage = attendanceRecords[member.id]?.stepInImage;
    if (stepInImage) {
      const imageUrl = getImageUrl(stepInImage);
      if (!loggedMembers.current.has(memberKey)) {
        console.log('📸 Using stepIn image for:', member.name, 'URL:', imageUrl);
        loggedMembers.current.add(memberKey);
      }
      return imageUrl;
    }
    
    // No image available, will use placeholder
    if (!loggedMembers.current.has(memberKey)) {
      console.log('❌ No image available for:', member.name, '- will use placeholder');
      loggedMembers.current.add(memberKey);
    }
    // Return a placeholder image URL instead of undefined
    const placeholderUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&size=40&background=6366f1&color=ffffff&bold=true`;
    console.log('🎨 Generated placeholder URL for:', member.name, 'URL:', placeholderUrl);
    return placeholderUrl;
  };

  useEffect(() => {
    teamMembers.forEach((member) => {
      if (!attendanceIds[member.id]) {
        dispatch(fetchAttendanceId(member.id) as any);
      }
    });
  }, [teamMembers, attendanceIds, dispatch]);

  // Helper to get actual attendance status based on Redux data
  const getActualAttendanceStatus = (memberId: string) => {
    const attendanceId = attendanceIds[memberId];
    if (attendanceId) {
      return 'Clocked In';
    }
    return 'Clocked Out';
  };

  // Helper to update attendanceId for a member after clock in/out
  const handleAttendanceChange = (memberId: string, newAttendanceId: string | null) => {
    dispatch(fetchAttendanceId(memberId) as any);
  };

  const getStatusVariant = (status: TeamMember['status']) => {
    switch(status) {
        case 'Clocked In': return 'default';
        case 'On Leave': return 'secondary';
        case 'Clocked Out': return 'outline';
        default: return 'outline';
    }
  }

  // Image Preview Modal (single instance)
  const imagePreviewModal = (
    <Dialog open={!!previewImage} onOpenChange={(open) => { if (!open) setPreviewImage(null); }}>
      <DialogContent className="max-w-md w-full flex flex-col items-center">
        <DialogTitle className="sr-only">Employee Photo Preview</DialogTitle>
        {typeof previewImage === 'string' && (
          <Image src={previewImage} alt="Employee Photo Preview" width={350} height={350} className="rounded-lg object-contain max-h-[70vh]" />
        )}
      </DialogContent>
    </Dialog>
  );

  if (isMobile) {
    return (
      <div className="space-y-3 p-2 sm:p-4 md:p-0">
        {/* Mobile Header with Refresh Button */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Team Attendance ({teamMembers.length})
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
        
        {teamMembers.map((member) => (
          <Card key={member.id} className="shadow-md">
            <CardHeader className="flex flex-row items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-10 w-10 cursor-pointer" onClick={() => {
                      const img = getBestImageUrl(member);
                      if (img) setPreviewImage(img);
                    }}>
                      <AvatarImage 
                        src={getBestImageUrl(member) || `https://placehold.co/40x40.png`} 
                        alt={member.name}
                        onError={(e) => {
                          const imageKey = `mobile-error-${member.id}`;
                          if (!loggedImageEvents.current.has(imageKey)) {
                            console.log('❌ Mobile manager image failed to load for:', member.name);
                            loggedImageEvents.current.add(imageKey);
                          }
                          e.currentTarget.src = `https://placehold.co/400x400/6366f1/ffffff?text=${member.name.charAt(0).toUpperCase()}`;
                        }}
                        onLoad={() => {
                          const imageKey = `mobile-load-${member.id}`;
                          if (!loggedImageEvents.current.has(imageKey)) {
                            console.log('✅ Mobile manager image loaded for:', member.name);
                            loggedImageEvents.current.add(imageKey);
                          }
                        }}
                      />
                      <AvatarFallback className="bg-gray-100">
                        {member.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                        <CardTitle className="text-base sm:text-lg truncate">{member.name}</CardTitle>
                        <CardDescription className="text-xs sm:text-base truncate">{member.id}</CardDescription>
                    </div>
                </div>
                <Badge variant={getStatusVariant(getActualAttendanceStatus(member.id))} className="w-fit text-xs sm:text-base">
                  {getActualAttendanceStatus(member.id)}
                </Badge>
            </CardHeader>
            <CardContent className="space-y-2 text-sm sm:text-base">
              <p className="truncate"><strong className="text-muted-foreground">Email:</strong> {member.email}</p>
              <p className="truncate"><strong className="text-muted-foreground">Shift:</strong> {
                member.shift === 'morning' ? '7 AM - 3 PM (Morning)' :
                member.shift === 'evening' ? '2 PM - 10 PM (Evening)' :
                member.shift === 'night' ? '10 PM - 7 AM (Night)' :
                member.shift
              }</p>
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <ClockInModal 
                  employee={{ name: member.name, id: member.id }} 
                  attendanceId={attendanceIds[member.id]}
                  status={getActualAttendanceStatus(member.id)}
                  onAttendanceChange={(newId) => handleAttendanceChange(member.id, newId)}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <>
      {/* Desktop Header with Refresh Button */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Team Attendance ({teamMembers.length})
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>
      
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="hidden lg:table-cell">Email</TableHead>
              <TableHead className="hidden md:table-cell">Shift</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teamMembers.map((member) => (
              <TableRow key={member.id}>
                <TableCell className="font-medium flex items-center gap-3">
                  <Avatar className="cursor-pointer" onClick={() => {
                    const img = getBestImageUrl(member);
                    if (img) setPreviewImage(img);
                  }}>
                      <AvatarImage 
                        src={getBestImageUrl(member)} 
                        alt={`${member.name} avatar`}
                        data-ai-hint="person portrait"
                        onError={(e) => {
                          const imageKey = `desktop-error-${member.id}`;
                          if (!loggedImageEvents.current.has(imageKey)) {
                            console.log('❌ Desktop manager image failed to load for:', member.name, 'URL:', e.currentTarget.src);
                            loggedImageEvents.current.add(imageKey);
                          }
                          e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&size=40&background=6366f1&color=ffffff&bold=true`;
                        }}
                        onLoad={() => {
                          const imageKey = `desktop-load-${member.id}`;
                          if (!loggedImageEvents.current.has(imageKey)) {
                            console.log('✅ Desktop manager image loaded for:', member.name, 'URL:', e.currentTarget.src);
                            loggedImageEvents.current.add(imageKey);
                          }
                        }}
                      />
                      <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-sm">
                        {member.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                  </Avatar>
                  {member.name}
                </TableCell>
                <TableCell className="hidden lg:table-cell text-muted-foreground">{member.email}</TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground">{member.shift}</TableCell>
                <TableCell>
                  <Badge variant={getStatusVariant(getActualAttendanceStatus(member.id))}>
                    {getActualAttendanceStatus(member.id)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                    <ClockInModal 
                      employee={{ name: member.name, id: member.id }} 
                      attendanceId={attendanceIds[member.id]}
                      status={getActualAttendanceStatus(member.id)}
                      onAttendanceChange={(newId) => handleAttendanceChange(member.id, newId)}
                    />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {imagePreviewModal}
    </>
  );
}
