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

type TeamMember = {
    id: string;
    name: string;
    email: string;
    status: 'Clocked In' | 'Clocked Out' | 'On Leave';
    shift: string;
};

export function TeamAttendanceTable({ teamMembers }: { teamMembers: TeamMember[] }) {
  const isMobile = useIsMobile();

  const getStatusVariant = (status: TeamMember['status']) => {
    switch(status) {
        case 'Clocked In': return 'default';
        case 'On Leave': return 'secondary';
        case 'Clocked Out': return 'outline';
        default: return 'outline';
    }
  }

  if (isMobile) {
    return (
      <div className="space-y-3 px-1">
        {teamMembers.map((member) => (
          <Card key={member.id} className="shadow-sm border-border">
            <CardHeader className="pb-3">
                <div className="flex justify-between items-start gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                        <Avatar className="h-10 w-10 flex-shrink-0">
                            <AvatarImage src={`https://placehold.co/40x40.png`} data-ai-hint="person portrait" />
                            <AvatarFallback className="text-sm">{member.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                            <CardTitle className="text-base truncate">{member.name}</CardTitle>
                            <CardDescription className="text-xs truncate">{member.email}</CardDescription>
                        </div>
                    </div>
                    <Badge variant={getStatusVariant(member.status)} className="flex-shrink-0 text-xs">
                        {member.status}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground font-medium">Shift:</span>
                  <span className="font-medium">{member.shift}</span>
                </div>
                <div className="flex justify-end pt-2">
                  <ClockInModal employeeName={member.name} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
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
                <Avatar>
                    <AvatarImage src={`https://placehold.co/40x40.png`} data-ai-hint="person portrait" />
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
                <ClockInModal employeeName={member.name} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
