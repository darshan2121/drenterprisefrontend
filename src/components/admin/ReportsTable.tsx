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
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileDown, RefreshCw } from "lucide-react";
import { EditReportModal } from "./EditReportModal";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";


type Report = {
    date: string;
    employee: string;
    shift: string;
    location: string;
    status: 'Present' | 'Absent' | 'On Leave';
    clockIn: string;
    clockOut: string;
};

export function ReportsTable({ reports, onRefresh }: { reports: Report[], onRefresh?: () => void }) {  const isMobile = useIsMobile();

  const getStatusVariant = (status: Report['status']) => {
    switch(status) {
        case 'Present': return 'default';
        case 'On Leave': return 'secondary';
        case 'Absent': return 'destructive';
        default: return 'outline';
    }
  }

  const handleDownloadPdf = () => {
    const doc = new jsPDF();
    doc.text("Attendance Report", 14, 16);
    autoTable(doc, {
      head: [['Date', 'Employee', 'Shift', 'Location', 'Status', 'Clock In', 'Clock Out']],
      body: reports.map(report => [
        report.date,
        report.employee,
        report.shift,
        report.location,
        report.status,
        report.clockIn,
        report.clockOut,
      ]),
      startY: 20,
    });
    doc.save("attendance-report.pdf");
  };

  const handleDownloadXls = () => {
    const worksheet = XLSX.utils.json_to_sheet(reports.map(report => ({
        Date: report.date,
        Employee: report.employee,
        Shift: report.shift,
        Location: report.location,
        Status: report.status,
        'Clock In': report.clockIn,
        'Clock Out': report.clockOut,
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");
    XLSX.writeFile(workbook, "attendance-report.xlsx");
  };

  const HeaderActions = () => (
    <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={handleDownloadPdf}>
            <FileDown className="mr-2 h-4 w-4" />
            PDF
        </Button>
        <Button variant="outline" size="sm" onClick={handleDownloadXls}>
            <FileDown className="mr-2 h-4 w-4" />
            XLS
        </Button>
        <Button variant="ghost" size="icon" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4" />
        </Button>
    </div>
  );

  if (isMobile) {
    return (
      <div className="p-6 md:p-0">
         <div className="flex justify-end mb-4">
            <HeaderActions />
         </div>
        <div className="space-y-4">
            {reports.map((report, index) => (
            <Card key={index} className="shadow-md">
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle>{report.employee}</CardTitle>
                            <CardDescription>{report.date}</CardDescription>
                        </div>
                        <Badge variant={getStatusVariant(report.status)}>{report.status}</Badge>
                    </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                    <p><strong className="text-muted-foreground">Shift:</strong> {report.shift}</p>
                    <div className="flex items-center justify-between">
                        <p><strong className="text-muted-foreground">Location:</strong> {report.location}</p>
                        <EditReportModal report={report} />
                    </div>
                    <p><strong className="text-muted-foreground">Clock In:</strong> {report.clockIn}</p>
                    <p><strong className="text-muted-foreground">Clock Out:</strong> {report.clockOut}</p>
                </CardContent>
            </Card>
            ))}
        </div>
      </div>
    );
  }

  return (
    <>
    <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Results</CardTitle>
        <HeaderActions />
    </CardHeader>
    <CardContent className="p-0">
        <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead className="hidden md:table-cell">Shift</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden sm:table-cell">Clock In</TableHead>
                    <TableHead className="hidden sm:table-cell">Clock Out</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {reports.map((report, index) => (
                    <TableRow key={index}>
                        <TableCell className="font-medium text-muted-foreground">{report.date}</TableCell>
                        <TableCell>{report.employee}</TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">{report.shift}</TableCell>
                        <TableCell className="text-muted-foreground">{report.location}</TableCell>
                        <TableCell>
                            <Badge variant={getStatusVariant(report.status)}>
                                {report.status}
                            </Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground">{report.clockIn}</TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground">{report.clockOut}</TableCell>
                        <TableCell className="text-right">
                           <EditReportModal report={report} />
                        </TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
        </div>
    </CardContent>
    </>
  );
}
function onRefresh(event: MouseEvent<HTMLButtonElement, MouseEvent>): void {
  throw new Error("Function not implemented.");
}

