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
import { FileDown, RefreshCw, Loader2 } from "lucide-react";
import { EditReportModal } from "./EditReportModal";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { useState, useEffect } from "react";
// import { getReports } from "@/lib/api";


type Report = {
    date: string;
    employee: string;
    shift: string;
    location: string;
    status: 'Present' | 'Absent' | 'On Leave';
    clockIn: string;
    clockOut: string;
};

export function ReportsTable({
  reports,
  onRefresh,
  loading = false,
  disableActions = false,
}: {
  reports: Report[];
  onRefresh?: () => void;
  loading?: boolean;
  disableActions?: boolean;
}) {
  const isMobile = useIsMobile();

  const getStatusVariant = (status: Report['status']) => {
    switch(status) {
        case 'Present': return 'default';
        case 'On Leave': return 'secondary';
        case 'Absent': return 'destructive';
        default: return 'outline';
    }
  }

  const getShiftLabel = (shift: string) => {
    switch (shift) {
      case "morning":
        return "7 AM - 3 PM (Morning)";
      case "evening":
        return "2 PM - 10 PM (Evening)";
      case "night":
        return "10 PM - 7 AM (Night)";
      default:
        return shift || "-";
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
        getShiftLabel(report.shift),
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
        Shift: getShiftLabel(report.shift),
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

  if (loading) {
    // Show a skeleton or spinner here
    return (
      <div className="p-6 flex justify-center items-center min-h-[200px]">
        <span className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></span>
        {/* Or use a Skeleton component if you have one */}
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="p-2 sm:p-4 md:p-0">
         <div className="flex justify-end mb-4">
            <HeaderActions />
         </div>
        <div className="space-y-3">
            {reports.map((report, index) => (
            <Card key={index} className="shadow-sm">
                <CardHeader className="flex flex-row items-start justify-between gap-2">
                    <div className="min-w-0">
                        <CardTitle className="text-base sm:text-lg font-bold truncate">{report.employee}</CardTitle>
                        <CardDescription className="text-xs sm:text-base truncate">{report.date}</CardDescription>
                    </div>
                    <Badge variant={getStatusVariant(report.status)} className="text-xs sm:text-base">{report.status}</Badge>
                </CardHeader>
                <CardContent className="space-y-2 text-sm sm:text-base">
                    <p className="truncate"><strong className="text-muted-foreground">Shift:</strong> {getShiftLabel(report.shift)}</p>
                    <p className="truncate"><strong className="text-muted-foreground">Location:</strong> {report.location}</p>
                    <p className="truncate"><strong className="text-muted-foreground">Clock In:</strong> {report.clockIn}</p>
                    <p className="truncate"><strong className="text-muted-foreground">Clock Out:</strong> {report.clockOut}</p>
                    <div className="flex flex-col sm:flex-row gap-2 pt-2">
                        {!disableActions && <EditReportModal report={report} onRefresh={onRefresh} />}
                    </div>
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
        <div className="overflow-x-auto w-full">
          {loading ? (
            <div className="flex justify-center items-center min-h-[200px]">
              <span className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></span>
            </div>
          ) : (
            <Table className="min-w-[700px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[100px]">Date</TableHead>
                  <TableHead className="min-w-[120px]">Employee</TableHead>
                  <TableHead className="hidden md:table-cell min-w-[120px]">Shift</TableHead>
                  <TableHead className="min-w-[120px]">Location</TableHead>
                  <TableHead className="min-w-[80px]">Status</TableHead>
                  <TableHead className="hidden sm:table-cell min-w-[80px]">Clock In</TableHead>
                  <TableHead className="hidden sm:table-cell min-w-[80px]">Clock Out</TableHead>
                  <TableHead className="text-right min-w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium text-muted-foreground truncate max-w-[100px]">{report.date}</TableCell>
                    <TableCell className="truncate max-w-[120px]">{report.employee}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground truncate max-w-[120px]">{getShiftLabel(report.shift)}</TableCell>
                    <TableCell className="text-muted-foreground truncate max-w-[120px]">{report.location}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(report.status)}>
                        {report.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground truncate max-w-[80px]">{report.clockIn}</TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground truncate max-w-[80px]">{report.clockOut}</TableCell>
                    <TableCell className="text-right">
                      {!disableActions && <EditReportModal report={report} onRefresh={onRefresh} />}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </CardContent>
    </>
  );
}

