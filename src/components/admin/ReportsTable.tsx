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
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { FileDown, RefreshCw, Loader2, Check, CheckCircle, Download, Trash2 } from "lucide-react";
import { EditReportModal } from "./EditReportModal";
import { BulkUpdateModal } from "@/components/admin/BulkUpdateModal";
import { DeleteAttendanceModal } from "./DeleteAttendanceModal";
import { PDFDownloadButton } from "@/components/ui/pdf-download-button";
import { pdfDownloadService } from "@/services/pdfDownloadService";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { useState, useEffect } from "react";
import { getApiUrl } from "@/lib/config";

// Employee type for fetching employee data
type Employee = {
  id: string;
  name: string;
  image?: string;
  _raw?: {
    _id?: string;
    image?: string;
  };
};

type Report = {
  date: string;
  employee: string;
  employeeId?: {
    _id: string;
    name?: string;
    image?: string;
  };
  employeePhoto?: string;
  stepIn?: string;
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
  reports,
  allReports, // Add this prop
}: {
  onDownloadPdf: () => Promise<void>;
  onDownloadXls: () => Promise<void>;
  onRefresh?: () => void;
  loading?: boolean;
  reports?: Report[];
  allReports?: Report[]; // Add this prop
}) {
  const [pdfLoading, setPdfLoading] = useState(false);
  const [xlsLoading, setXlsLoading] = useState(false);

  const handlePdfDownload = async () => {
    setPdfLoading(true);
    try {
      await onDownloadPdf();
    } catch (error) {
      console.error('Error downloading PDF:', error);
    } finally {
      setPdfLoading(false);
    }
  };

  const handleXlsDownload = async () => {
    setXlsLoading(true);
    try {
      await onDownloadXls();
    } catch (error) {
      console.error('Error downloading XLS:', error);
    } finally {
      setXlsLoading(false);
    }
  };

  // Convert reports to the format expected by the PDF service
  const convertReportsForPDF = () => {
    if (!reports) return [];
    
    return reports.map(report => ({
      _id: report._id || report.id || '',
      date: report.date,
      employee: report.employee,
      employeeId: report.employeeId,
      employeePhoto: report.employeePhoto,
      stepIn: report.stepIn,
      shift: report.shift,
      location: report.location,
      status: report.status,
      clockIn: report.clockIn,
      clockOut: report.clockOut
    }));
  };

  // Convert allReports to the format expected by the PDF service
  const convertAllReportsForPDF = () => {
    if (!allReports) return [];
    
    return allReports.map(report => ({
      _id: report._id || report.id || '',
      date: report.date,
      employee: report.employee,
      employeeId: report.employeeId,
      employeePhoto: report.employeePhoto,
      stepIn: report.stepIn,
      shift: report.shift,
      location: report.location,
      status: report.status,
      clockIn: report.clockIn,
      clockOut: report.clockOut
    }));
  };

  return (
    <div className="flex items-center gap-2">
      {/* Unified PDF Button - Enhanced with better logging */}
      <PDFDownloadButton
        reports={convertReportsForPDF()}
        allReports={convertAllReportsForPDF()} // Pass allReports for complete PDF generation
        fileName={`attendance-report-${new Date().toISOString().split('T')[0]}.pdf`}
        showProgress={true}
        includeImages={true}
        quality="high"
        variant="default"
        size="sm"
        onSuccess={() => {
          console.log('✅ Unified PDF download completed successfully');
        }}
        onError={(error) => {
          console.error('❌ Unified PDF download failed:', error);
        }}
      >
        {/* <Download className="mr-2 h-4 w-4" /> */}
        PDF
      </PDFDownloadButton>
      
      {/* Original PDF Button - Now clearly labeled */}
      {/* <Button 
        variant="outline" 
        size="sm" 
        onClick={handlePdfDownload} 
        disabled={loading || pdfLoading}
      >
        {pdfLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <FileDown className="mr-2 h-4 w-4" />
        )}
        PDF (Legacy)
      </Button> */}
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleXlsDownload} 
        disabled={loading || xlsLoading}
      >
        {xlsLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <FileDown className="mr-2 h-4 w-4" />
        )}
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
  allReports, // Add this prop for PDF generation
  onRefresh,
  loading = false,
  disableActions = false,
  filters,
}: {
  reports: Report[];
  allReports?: Report[]; // Optional prop for PDF generation
  onRefresh?: () => void;
  loading?: boolean;
  disableActions?: boolean;
  filters?: {
    managerId?: string;
    employeeId?: string;
    startDate?: string;
    endDate?: string;
    order?: string;
    shift?: string;
  };
}) {
  const isMobile = useIsMobile();
  const [selectedReports, setSelectedReports] = useState<string[]>([]);
  const [isAllSelected, setIsAllSelected] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);

  // Helper function to get image URL (EXACT SAME as legacy)
  const getImageUrl = (image: string | undefined): string | undefined => {
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
    const imageUrl = `${cleanBaseUrl}/static/${image}?t=${Date.now()}`;
    return imageUrl;
  };

  // Fetch employees data to get their profile images
  const fetchEmployees = async () => {
    try {
      setEmployeesLoading(true);
      const response = await fetch(`${getApiUrl()}/employee/all`, { // Changed to /employee/all
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });
      
      if (response.ok) {
        const responseData = await response.json();
        const data = responseData.data || responseData; // Handle {data: [...]}
        if (!Array.isArray(data)) {
          console.error('❌ Employee data is not an array:', data);
          setEmployees([]);
          return;
        }
        setEmployees(data);
      } else {
        console.error('❌ Failed to fetch employees:', response.status);
      }
    } catch (error) {
      console.error('❌ Error fetching employees:', error);
    } finally {
      setEmployeesLoading(false);
    }
  };

  // Get employee profile image by employee ID or name
  const getEmployeeImage = (report: Report) => {
    if (!Array.isArray(employees)) { // Safety check
      console.error('❌ LEGACY: Employees is not an array:', employees);
      return undefined;
    }
    
    // First try to find by employee ID
    if (report.employeeId && report.employeeId._id) {
      const employee = employees.find(emp => emp.id === report.employeeId!._id);
      if (employee && employee.image) {
        const imageUrl = getImageUrl(employee.image);
        return imageUrl;
      }
    }
    
    // Fallback: try to find by employee name
    const employee = employees.find(emp => emp.name === report.employee);
    if (employee && employee.image) {
      const imageUrl = getImageUrl(employee.image);
      return imageUrl;
    }
    
    return undefined;
  };

  // Helper function to get the best available image (employee profile image first, then stepIn, then placeholder)
  const getBestImageUrl = (report: Report) => {
    // FIRST PRIORITY: Employee profile image from user record (report.employeeId.image)
    if (report.employeeId && report.employeeId.image) {
      const employeeProfileUrl = getImageUrl(report.employeeId.image);
      if (employeeProfileUrl) {
        console.log('✅ Using employee profile image for:', report.employee, 'Image:', report.employeeId.image);
        return employeeProfileUrl;
      }
    }
    
    // SECOND PRIORITY: Employee profile image from fetched employees data
    const employeeImageUrl = getEmployeeImage(report);
    if (employeeImageUrl) {
      console.log('✅ Using fetched employee image for:', report.employee);
      return employeeImageUrl;
    }
    
    // THIRD PRIORITY: Employee photo field
    if (report.employeePhoto) {
      const employeePhotoUrl = getImageUrl(report.employeePhoto);
      if (employeePhotoUrl) {
        console.log('✅ Using employee photo for:', report.employee);
        return employeePhotoUrl;
      }
    }
    
    // LAST PRIORITY: Step-in image (clock-in photo) - only if no profile image available
    if (report.stepIn) {
      const stepInUrl = getImageUrl(report.stepIn);
      if (stepInUrl) {
        console.log('⚠️ Using step-in image for:', report.employee, 'No profile image available');
        return stepInUrl;
      }
    }
    
    // No image available, will use placeholder
    console.log('❌ No image available for:', report.employee, 'Using placeholder');
    return undefined;
  };

  // Toggle selection for a single report
  const toggleReportSelection = (reportId: string) => {
    setSelectedReports(prev => 
      prev.includes(reportId) 
        ? prev.filter(id => id !== reportId) 
        : [...prev, reportId]
    );
  };

  // Toggle selection for all reports
  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedReports([]);
    } else {
      setSelectedReports(reports.map(report => report._id || report.id || ''));
    }
    setIsAllSelected(!isAllSelected);
  };

  // Fetch employees when component mounts or reports change
  useEffect(() => {
    fetchEmployees();
  }, []);

  // Debug: Log reports data structure when it changes
  useEffect(() => {
    if (reports.length > 0) {
      console.log('📊 Reports data structure:', reports[0]);
      console.log('📊 First report employeeId:', reports[0].employeeId);
      console.log('📊 First report employee:', reports[0].employee);
      console.log('📊 First report employeeId.image:', reports[0].employeeId?.image);
      console.log('📊 First report stepIn:', reports[0].stepIn);
    }
  }, [reports]);

  // Reset selection when reports or filters change
  useEffect(() => {
    setSelectedReports([]);
    setIsAllSelected(false);
  }, [reports, filters]);

  // Check if bulk edit should be available (shift filter is applied)
  const isBulkEditAvailable = Boolean(filters?.shift);

  // Handle bulk edit completion
  const handleBulkEditComplete = (success: boolean) => {
    if (success) {
      setSelectedReports([]);
      setIsAllSelected(false);
      onRefresh?.();
    }
  };

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

  // Enhanced PDF Export Function
  const handleDownloadPdf = async () => {
    console.log('📄 LEGACY: Starting PDF export with', (allReports || reports).length, 'reports');
    console.log('📄 LEGACY: This is the working PDF generation method');
    
    const doc = new jsPDF('l', 'mm', 'a4'); // Landscape for more space
    
    // Add professional header
    doc.setFillColor(41, 128, 185);
    doc.rect(0, 0, 297, 25, 'F');
    
    // Company logo/name in header
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text("D.R. ENTERPRISE", 148.5, 12, { align: 'center' });
    
    // Subtitle in header
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text("Attendance Management System", 148.5, 20, { align: 'center' });
    
    // Reset text color for body
    doc.setTextColor(0, 0, 0);
    
    // Report title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text("ATTENDANCE REPORT", 148.5, 35, { align: 'center' });
    
    // Report details
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const currentDate = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    doc.text(`Generated on: ${currentDate}`, 148.5, 42, { align: 'center' });
    doc.text(`Total Records: ${(allReports || reports).length}`, 148.5, 48, { align: 'center' });
    
    // Function to convert image URL to base64
    const getImageAsBase64 = async (imageUrl: string): Promise<string | null> => {
      try {
        const response = await fetch(imageUrl);
        
        if (!response.ok) {
          return null;
        }
        
        const blob = await response.blob();
        
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result);
          };
          reader.onerror = () => {
            resolve(null);
          };
          reader.readAsDataURL(blob);
        });
      } catch (error) {
        console.error('❌ LEGACY: Error converting image to base64:', error);
        return null;
      }
    };

    // Prepare table data with images
    const tableData = await Promise.all(
      (allReports || reports).map(async (report, index) => {
        const imageUrl = getBestImageUrl(report);
        
        let imageBase64 = null;
        
        if (imageUrl) {
          imageBase64 = await getImageAsBase64(imageUrl);
        }
        
        return {
          date: report.date,
          employee: report.employee,
          shift: getShiftLabel(report.shift),
          location: report.location,
          status: report.status,
          clockIn: report.clockIn,
          clockOut: report.clockOut,
          image: imageBase64
        };
      })
    );

    // Create the table with autoTable
    autoTable(doc, {
      head: [['Photo', 'Date', 'Employee', 'Shift', 'Location', 'Status', 'Clock In', 'Clock Out']],
      body: tableData.map((row) => [
        '', // Empty cell for photo - we'll add images manually
        row.date,
        row.employee,
        row.shift,
        row.location,
        row.status,
        row.clockIn,
        row.clockOut
      ]),
      startY: 55,
      styles: {
        fontSize: 9,
        cellPadding: 2,
        minCellHeight: 35,
        halign: 'center',
        valign: 'middle',
        lineColor: [200, 200, 200],
        lineWidth: 0.1
      },
      headStyles: {
        fillColor: [52, 73, 94],
        textColor: 255,
        fontSize: 10,
        fontStyle: 'bold',
        halign: 'center'
      },
      columnStyles: {
        0: { cellWidth: 35, halign: 'center' }, // Photo column - wider for better images
        1: { cellWidth: 25, halign: 'center' }, // Date column
        2: { cellWidth: 40, halign: 'left' },   // Employee column
        3: { cellWidth: 40, halign: 'left' },   // Shift column
        4: { cellWidth: 35, halign: 'left' },   // Location column
        5: { cellWidth: 25, halign: 'center' }, // Status column
        6: { cellWidth: 30, halign: 'center' }, // Clock In column
        7: { cellWidth: 30, halign: 'center' }  // Clock Out column
      },
      alternateRowStyles: {
        fillColor: [248, 249, 250]
      },
      didDrawCell: (data) => {
        // Add images to the photo column (column 0)
        if (data.column.index === 0 && data.cell.section === 'body') {
          const rowIndex = data.row.index;
          const rowData = tableData[rowIndex];
          
          if (rowData && rowData.image) {
            const cellX = data.cell.x + 2;
            const cellY = data.cell.y + 2;
            const imageSize = 31; // Much larger size for better visibility
            
            try {
              // Add a border around the image
              doc.setDrawColor(200, 200, 200);
              doc.setLineWidth(0.5);
              doc.rect(cellX - 1, cellY - 1, imageSize + 2, imageSize + 2);
              
              // Add the image
              doc.addImage(rowData.image, 'JPEG', cellX, cellY, imageSize, imageSize);
            } catch (error) {
              console.error('Error adding image to PDF:', error);
            }
          } else {
            // Add placeholder for no image
            const cellX = data.cell.x + 2;
            const cellY = data.cell.y + 2;
            const size = 31;
            
            doc.setDrawColor(200, 200, 200);
            doc.setLineWidth(0.5);
            doc.rect(cellX - 1, cellY - 1, size + 2, size + 2);
            
            doc.setFillColor(240, 240, 240);
            doc.rect(cellX, cellY, size, size, 'F');
            
            doc.setTextColor(150, 150, 150);
            doc.setFontSize(8);
            doc.text('No Photo', cellX + size/2, cellY + size/2 + 3, { align: 'center' });
          }
        }
      }
    });

    // Add professional footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      
      // Footer background
      doc.setFillColor(52, 73, 94);
      doc.rect(0, (doc as any).internal.pageSize.height - 15, 297, 15, 'F');
      
      // Footer text
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.text(`Page ${i} of ${pageCount}`, 148.5, (doc as any).internal.pageSize.height - 8, { align: 'center' });
      doc.text("D.R. Enterprise - Confidential", 20, (doc as any).internal.pageSize.height - 8);
      doc.text("Generated by Attendance System", 277, (doc as any).internal.pageSize.height - 8, { align: 'right' });
    }

    // Save or send to React Native
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
    
    console.log('✅ PDF export completed');
  };

  // Enhanced Excel Export Function
  const handleDownloadXls = async () => {
    console.log('📊 Starting Excel export with', (allReports || reports).length, 'reports');
    
    try {
      // Prepare main worksheet data (simplified)
      const worksheetData = (allReports || reports).map((report) => {
        const imageUrl = getBestImageUrl(report);
        
        return {
          'Photo Available': imageUrl ? 'YES' : 'NO',
          'Photo URL': imageUrl || 'No photo',
          Date: report.date,
          Employee: report.employee,
          'Employee ID': report.employeeId?._id || 'N/A',
          Shift: getShiftLabel(report.shift),
          Location: report.location,
          Status: report.status,
          'Clock In': report.clockIn,
          'Clock Out': report.clockOut,
          'Photo Type': report.employeeId?.image ? 'Profile Photo' : 
                       report.stepIn ? 'Clock-in Photo' : 
                       report.employeePhoto ? 'Employee Photo' : 'None'
        };
      });

      // Create main worksheet
      const worksheet = XLSX.utils.json_to_sheet(worksheetData);
      
      // Set column widths
      worksheet['!cols'] = [
        { width: 15 }, // Photo Available
        { width: 60 }, // Photo URL
        { width: 12 }, // Date
        { width: 25 }, // Employee
        { width: 20 }, // Employee ID
        { width: 30 }, // Shift
        { width: 20 }, // Location
        { width: 12 }, // Status
        { width: 12 }, // Clock In
        { width: 12 }, // Clock Out
        { width: 20 }  // Photo Type
      ];

      // Create summary worksheet
      const summaryData = [
        {
          'Report Summary': 'D.R. Enterprise Attendance Report',
          'Generated Date': new Date().toLocaleDateString(),
          'Total Records': (allReports || reports).length,
          'Records with Photos': (allReports || reports).filter(r => getBestImageUrl(r)).length
        },
        {},
        {
          'Instructions': 'To view employee photos:',
          'Step 1': 'Copy the Photo URL from the main sheet',
          'Step 2': 'Paste it into your web browser',
          'Step 3': 'The photo will open in a new tab'
        }
      ];

      const summaryWorksheet = XLSX.utils.json_to_sheet(summaryData);

      // Create workbook and add sheets
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance Report");
      XLSX.utils.book_append_sheet(workbook, summaryWorksheet, "Summary");

      // Save or send to React Native
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
      
      console.log('✅ Excel export completed successfully');
    } catch (error) {
      console.error('❌ Error during Excel export:', error);
      alert('Error generating Excel file. Please try again.');
    }
  };

  // Add bulk edit button to header actions when shift filter is applied
  const EnhancedHeaderActions = () => (
    <div className="flex items-center gap-2">
      {isBulkEditAvailable && selectedReports.length > 0 && (
        <BulkUpdateModal
          selectedIds={selectedReports}
          onSuccess={() => handleBulkEditComplete(true)}
          currentFilters={filters || {}}
          selectedRecords={selectedReports.map(id => {
            const report = reports.find(r => r._id === id || r.id === id);
            return {
              _id: id,
              date: report?.date || '',
              stepIn: report?.clockIn || '',
              stepOut: report?.clockOut || ''
            };
          })}
          trigger={
            <Button 
              variant="default" 
              size="sm" 
              disabled={loading}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Bulk Edit ({selectedReports.length})
            </Button>
          }
        />
      )}
      <HeaderActions 
        onDownloadPdf={handleDownloadPdf} 
        onDownloadXls={handleDownloadXls} 
        onRefresh={onRefresh} 
        loading={loading}
        reports={reports}
        allReports={allReports}
      />
    </div>
  );

  // Modify the table header to include bulk edit controls when shift filter is applied
  const renderTableHeader = () => (
    <TableHeader>
      <TableRow>
        {isBulkEditAvailable && (
          <TableHead className="w-[40px]">
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={isAllSelected && reports.length > 0}
                onChange={toggleSelectAll}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                disabled={reports.length === 0}
              />
            </div>
          </TableHead>
        )}
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
  );

  // Modify the table row to include checkbox when shift filter is applied
  const renderTableRow = (report: Report) => (
    <TableRow key={report._id || report.id}>
      {isBulkEditAvailable && (
        <TableCell>
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={selectedReports.includes(report._id || report.id || '')}
              onChange={() => toggleReportSelection(report._id || report.id || '')}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
          </div>
        </TableCell>
      )}
      <TableCell className="font-medium text-muted-foreground truncate max-w-[100px]">
        {report.date}
      </TableCell>
      <TableCell className="truncate max-w-[120px]">
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarImage 
              src={getBestImageUrl(report)} 
              alt={report.employee}
              onError={(e) => {
                console.log('❌ Report table image failed to load for:', report.employee);
                e.currentTarget.src = `https://placehold.co/400x400/6366f1/ffffff?text=${report.employee.charAt(0).toUpperCase()}`;
              }}
              onLoad={() => {
                console.log('✅ Report table image loaded for:', report.employee);
              }}
            />
            <AvatarFallback className="text-xs bg-gray-100">
              {report.employee.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="truncate">{report.employee}</span>
        </div>
      </TableCell>
      <TableCell className="hidden md:table-cell text-muted-foreground truncate max-w-[120px]">
        {getShiftLabel(report.shift)}
      </TableCell>
      <TableCell className="text-muted-foreground truncate max-w-[120px]">
        {report.location}
      </TableCell>
      <TableCell>
        <Badge variant={getStatusVariant(report.status)}>
          {report.status}
        </Badge>
      </TableCell>
      <TableCell className="hidden sm:table-cell text-muted-foreground truncate max-w-[80px]">
        {report.clockIn}
      </TableCell>
      <TableCell className="hidden sm:table-cell text-muted-foreground truncate max-w-[80px]">
        {report.clockOut}
      </TableCell>
      <TableCell className="text-right">
        {!disableActions && (
          <div className="flex items-center justify-end gap-2">
            <EditReportModal 
              report={report} 
              onRefresh={onRefresh}
              filters={filters}
            />
            <DeleteAttendanceModal
              attendanceId={report._id || report.id || ''}
              employeeName={report.employee}
              date={report.date}
              onSuccess={() => {
                console.log('🔄 Delete success - refreshing table');
                onRefresh?.();
              }}
            >
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </DeleteAttendanceModal>
          </div>
        )}
        {disableActions && (
          <div className="text-muted-foreground text-sm">Actions disabled</div>
        )}
      </TableCell>
    </TableRow>
  );

  // Mobile view with checkboxes
  const renderMobileCard = (report: Report) => {
    // console.log('📱 Rendering mobile card for:', report.employee, 'disableActions:', disableActions);
    return (
    <Card key={report._id || report.id} className="shadow-sm">
      {isBulkEditAvailable && (
        <div className="absolute top-4 left-4">
          <input
            type="checkbox"
            checked={selectedReports.includes(report._id || report.id || '')}
            onChange={() => toggleReportSelection(report._id || report.id || '')}
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
          />
        </div>
      )}
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="h-10 w-10">
            <AvatarImage 
              src={getBestImageUrl(report)} 
              alt={report.employee}
              onError={(e) => {
                console.log('❌ Mobile report image failed to load for:', report.employee);
                e.currentTarget.src = `https://placehold.co/400x400/6366f1/ffffff?text=${report.employee.charAt(0).toUpperCase()}`;
              }}
              onLoad={() => {
                console.log('✅ Mobile report image loaded for:', report.employee);
              }}
            />
            <AvatarFallback className="bg-gray-100">
              {report.employee.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <CardTitle className="text-base sm:text-lg font-bold truncate">{report.employee}</CardTitle>
            <CardDescription className="text-xs sm:text-base truncate">{report.date}</CardDescription>
          </div>
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
            <div className="flex gap-2 w-full">
              <EditReportModal 
                report={report} 
                onRefresh={onRefresh}
                filters={filters}
              />
              <DeleteAttendanceModal
                attendanceId={report._id || report.id || ''}
                employeeName={report.employee}
                date={report.date}
                onSuccess={() => onRefresh?.()}
              >
                <Button
                  variant="destructive"
                  size="sm"
                  className="text-white bg-red-600 hover:bg-red-700 flex-1 sm:flex-none min-w-[80px]"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </DeleteAttendanceModal>
            </div>
          )}
          {disableActions && (
            <div className="text-muted-foreground text-sm">Actions disabled</div>
          )}
          {/* Debug: Always show a test button */}
      <></>
        </div>
      </CardContent>
    </Card>
    );
  };

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isMobile || isReactNativeWebView()) {
    console.log('📱 Mobile view rendered with', reports.length, 'reports');
    console.log('📱 disableActions:', disableActions);
    return (
      <div className="p-2 sm:p-4 md:p-0">
        <div className="flex justify-end mb-4">
          <EnhancedHeaderActions />
        </div>
        <div className="space-y-3 relative">
          {reports.map(renderMobileCard)}
        </div>
      </div>
    );
  }

  return (
    <>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Results</CardTitle>
        <EnhancedHeaderActions />
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto w-full">
          <Table className="min-w-[700px]">
            {renderTableHeader()}
            <TableBody>
              {reports.length > 0 ? (
                reports.map(renderTableRow)
              ) : (
                <TableRow>
                  <TableCell colSpan={isBulkEditAvailable ? 8 : 7} className="text-center py-8 text-muted-foreground">
                    No attendance records found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </>
  );
}
