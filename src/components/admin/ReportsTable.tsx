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

type Report = {
    date: string;
    employee: string;
    shift: string;
    location: string;
    status: 'Present' | 'Absent' | 'On Leave';
    clockIn: string;
    clockOut: string;
    _id?: string;
    id?: string;
};

// Helper to detect React Native WebView
declare global {
  interface Window {
    ReactNativeWebView?: { postMessage: (msg: string) => void };
  }
}

function isReactNativeWebView() {
  return typeof window !== 'undefined' && !!window.ReactNativeWebView;
}

export function HeaderActions({
  onDownloadPdf,
  onDownloadXls,
  onRefresh,
  loading = false,
}: {
  onDownloadPdf: () => void;
  onDownloadXls: () => void;
  onRefresh?: () => void;
  loading?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={onDownloadPdf} disabled={loading}>
        <FileDown className="mr-2 h-4 w-4" />
        PDF
      </Button>
      <Button variant="outline" size="sm" onClick={onDownloadXls} disabled={loading}>
        <FileDown className="mr-2 h-4 w-4" />
        XLS
      </Button>
      <Button variant="ghost" size="icon" onClick={onRefresh} disabled={loading}>
        <RefreshCw className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function ReportsTable({
  reports,
  onRefresh,
  loading = false,
  disableActions = false,
  filters, // Add filters prop
}: {
  reports: Report[];
  onRefresh?: () => void;
  loading?: boolean;
  disableActions?: boolean;
  filters?: {
    managerId?: string;
    employeeId?: string;
    startDate?: string;
    endDate?: string;
    order?: string;
  };
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
    if (isReactNativeWebView()) {
      const pdfBase64 = doc.output('datauristring');
      window.ReactNativeWebView?.postMessage(
        JSON.stringify({
          type: 'download',
          fileType: 'pdf',
          fileName: 'attendance-report.pdf',
          data: pdfBase64,
        })
      );
    } else {
      doc.save("attendance-report.pdf");
    }
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
    if (isReactNativeWebView()) {
      const wbout = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
      window.ReactNativeWebView?.postMessage(
        JSON.stringify({
          type: 'download',
          fileType: 'xlsx',
          fileName: 'attendance-report.xlsx',
          data: wbout,
        })
      );
    } else {
      XLSX.writeFile(workbook, "attendance-report.xlsx");
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center min-h-[200px]">
        <span className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></span>
      </div>
    );
  }

  if (isMobile || isReactNativeWebView()) {
    return (
      <div className="p-2 sm:p-4 md:p-0">
         <div className="flex justify-end mb-4">
            <HeaderActions onDownloadPdf={handleDownloadPdf} onDownloadXls={handleDownloadXls} onRefresh={onRefresh} loading={loading} />
         </div>
        <div className="space-y-3">
            {reports.map((report) => (
            <Card key={report._id || report.id} className="shadow-sm">
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
                        {!disableActions && (
                          <EditReportModal 
                            report={report} 
                            onRefresh={onRefresh}
                            filters={filters}
                          />
                        )}
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
        <HeaderActions onDownloadPdf={handleDownloadPdf} onDownloadXls={handleDownloadXls} onRefresh={onRefresh} loading={loading} />
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
                {reports.map((report) => (
                  <TableRow key={report._id || report.id}>
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
                      {!disableActions && (
                        <EditReportModal 
                          report={report} 
                          onRefresh={onRefresh}
                          filters={filters}
                        />
                      )}
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