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
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useDispatch, useSelector } from 'react-redux';
import { fetchAttendanceId } from '@/store/slices/attendanceSlice';
import { Dialog, DialogTrigger, DialogContent } from "@/components/ui/dialog";
import Image from "next/image";
import { BASE_URL } from "@/lib/endpoints";
import { AddEmployeeModal } from "./AddEmployeeModal";

type TeamMember = {
    id: string;
    name: string;
    email: string;
    status: 'Clocked In' | 'Clocked Out' | 'On Leave';
    shift: string;
};

export function TeamAttendanceTable({ teamMembers }: { teamMembers: TeamMember[] }) {
  const isMobile = useIsMobile();
  const dispatch = useDispatch();
  const attendanceIds = useSelector((state: any) => state.attendance.attendanceIds || {});
  const attendanceRecords = useSelector((state: any) => state.attendance.attendanceRecords || {});
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    teamMembers.forEach((member) => {
      if (!attendanceIds[member.id]) {
        dispatch(fetchAttendanceId(member.id) as any);
      }
    });
  }, [teamMembers, attendanceIds, dispatch]);

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
        {typeof previewImage === 'string' && (
          <Image src={previewImage} alt="Preview" width={350} height={350} className="rounded-lg object-contain max-h-[70vh]" />
        )}
      </DialogContent>
    </Dialog>
  );

  if (isMobile) {
    return (
      <div className="space-y-3 p-2 sm:p-4 md:p-0">
        {teamMembers.map((member) => (
          <Card key={member.id} className="shadow-md">
            <CardHeader className="flex flex-row items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-10 w-10 cursor-pointer" onClick={() => {
                      const img = attendanceRecords[member.id]?.stepInImage ? `${BASE_URL.replace('/api', '')}/static/${attendanceRecords[member.id].stepInImage}` : null;
                      if (img) setPreviewImage(img);
                    }}>
                      <AvatarImage 
                        src={
                          attendanceRecords[member.id]?.stepInImage 
                            ? `${BASE_URL.replace('/api', '')}/static/${attendanceRecords[member.id].stepInImage}` 
                            : `https://placehold.co/40x40.png`
                        } 
                        alt={member.name} 
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
                <Badge variant={getStatusVariant(member.status)} className="w-fit text-xs sm:text-base">{member.status}</Badge>
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
                  status={member.status}
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
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="hidden lg:table-cell">Email</TableHead>
              <TableHead className="hidden md:table-cell">Shift</TableHead>
              <TableHead>Status for Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teamMembers.map((member) => (
              <TableRow key={member.id}>
                <TableCell className="font-medium flex items-center gap-3">
                  <Avatar className="cursor-pointer" onClick={() => {
                    const img = attendanceRecords[member.id]?.stepInImage ? `${BASE_URL.replace('/api', '')}/static/${attendanceRecords[member.id].stepInImage}` : null;
                    if (img) setPreviewImage(img);
                  }}>
                      <AvatarImage 
                        src={
                          attendanceRecords[member.id]?.stepInImage 
                            ? `${BASE_URL.replace('/api', '')}/static/${attendanceRecords[member.id].stepInImage}` 
                            : `https://placehold.co/40x40.png`
                        } 
                        data-ai-hint="person portrait" 
                      />
                      <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  {member.name}
                </TableCell>
                <TableCell className="hidden lg:table-cell text-muted-foreground">{member.email}</TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground">{member.shift}</TableCell>
                <TableCell>
                  <Badge variant={getStatusVariant(member.status)}>
                    {member.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                    <ClockInModal 
                      employee={{ name: member.name, id: member.id }} 
                      attendanceId={attendanceIds[member.id]}
                      status={member.status}
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
