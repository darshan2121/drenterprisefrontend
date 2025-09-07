/**
 * Universal PDF Download Service
 * 
 * This service provides a unified PDF download experience across all devices:
 * - Desktop browsers (Chrome, Firefox, Safari, Edge)
 * - Mobile browsers (iOS Safari, Android Chrome, etc.)
 * - React Native WebView
 * 
 * Features:
 * - Automatic device detection
 * - Fallback mechanisms for different environments
 * - Comprehensive error handling and logging
 * - Progress tracking and user feedback
 * - Image processing and optimization
 * - Professional PDF formatting
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getApiUrl } from '@/lib/config';

// Types for the PDF service
export interface Report {
  _id?: string;
  id?: string;
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
}

// Employee type for fetching employee data (same as ReportsTable)
type Employee = {
  id: string;
  name: string;
  image?: string;
  _raw?: {
    _id?: string;
    image?: string;
  };
};

export interface PDFDownloadOptions {
  reports: Report[];
  fileName?: string;
  showProgress?: boolean;
  includeImages?: boolean;
  quality?: 'low' | 'medium' | 'high';
}

export interface DownloadProgress {
  current: number;
  total: number;
  percentage: number;
  status: string;
}

// Device detection functions
function isReactNativeWebView(): boolean {
  return typeof window !== 'undefined' && !!window.ReactNativeWebView;
}

function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function isIOS(): boolean {
  if (typeof window === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function isAndroid(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android/.test(navigator.userAgent);
}

// Helper function to get image URL (same as ReportsTable)
function getImageUrl(image: string | undefined): string | undefined {
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
}

// Fetch employees data to get their profile images (same as ReportsTable)
async function fetchEmployees(): Promise<Employee[]> {
  try {
    const response = await fetch(`${getApiUrl()}/employee/all`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
      }
    });
    
    if (response.ok) {
      const responseData = await response.json();
      
      // Check if response has a data property (common API pattern)
      const data = responseData.data || responseData;
      
      if (!Array.isArray(data)) {
        console.error('❌ Employees data is not an array:', data);
        return [];
      }
      
      return data;
    } else {
      console.error('❌ Failed to fetch employees:', response.status);
      console.error('❌ Response text:', await response.text());
      return [];
    }
  } catch (error) {
    console.error('❌ Error fetching employees:', error);
    return [];
  }
}

// Get employee profile image by employee ID or name (same as ReportsTable)
function getEmployeeImage(report: Report, employees: Employee[]): string | undefined {
  // First try to get image directly from the report's employeeId object
  if (report.employeeId && report.employeeId.image) {
    const imageUrl = getImageUrl(report.employeeId.image);
    return imageUrl;
  }
  
  // Fallback to finding by employee ID in employees list
  if (report.employeeId?._id) {
    const employee = employees.find(emp => emp.id === report.employeeId!._id || emp._raw?._id === report.employeeId!._id);
    if (employee) {
      const image = employee._raw?.image || employee.image;
      if (image) {
        const imageUrl = getImageUrl(image);
        return imageUrl;
      }
    }
  }
  
  // Fallback to finding by employee name
  const employee = employees.find(emp => emp.name === report.employee);
  if (employee) {
    const image = employee._raw?.image || employee.image;
    if (image) {
      const imageUrl = getImageUrl(image);
      return imageUrl;
    }
  }
  return undefined;
}

// Helper function to get the best available image (same as ReportsTable)
function getBestImageUrl(report: Report, employees: Employee[] = []): string | undefined {
  // FIRST PRIORITY: Employee profile image from user record (report.employeeId.image)
  if (report.employeeId && report.employeeId.image) {
    const employeeProfileUrl = getImageUrl(report.employeeId.image);
    if (employeeProfileUrl) {
      console.log('✅ PDF: Using employee profile image for:', report.employee, 'Image:', report.employeeId.image);
      return employeeProfileUrl;
    }
  }
  
  // SECOND PRIORITY: Employee profile image from fetched employees data
  const employeeImageUrl = getEmployeeImage(report, employees);
  if (employeeImageUrl) {
    console.log('✅ PDF: Using fetched employee image for:', report.employee);
    return employeeImageUrl;
  }
  
  // THIRD PRIORITY: Employee photo field
  if (report.employeePhoto) {
    const employeePhotoUrl = getImageUrl(report.employeePhoto);
    if (employeePhotoUrl) {
      console.log('✅ PDF: Using employee photo for:', report.employee);
      return employeePhotoUrl;
    }
  }
  
  // LAST PRIORITY: Step-in image (clock-in photo) - only if no profile image available
  if (report.stepIn) {
    const stepInUrl = getImageUrl(report.stepIn);
    if (stepInUrl) {
      console.log('⚠️ PDF: Using step-in image for:', report.employee, 'No profile image available');
      return stepInUrl;
    }
  }
  
  // No image available, will use placeholder
  console.log('❌ PDF: No image available for:', report.employee, 'Using placeholder');
  return undefined;
}

// Image processing utilities
async function convertImageToBase64(imageUrl: string, quality: 'low' | 'medium' | 'high' = 'medium'): Promise<string | null> {
  try {
    const response = await fetch(imageUrl, {
      mode: 'cors',
      cache: 'no-cache'
    });
    
    if (!response.ok) {
      console.warn(`❌ Image fetch failed with status ${response.status}: ${imageUrl}`);
      return null;
    }
    
    const blob = await response.blob();
    
    if (blob.size === 0) {
      console.warn(`❌ Empty image blob received: ${imageUrl}`);
      return null;
    }
    
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        try {
          // Set quality-based dimensions
          let targetWidth = img.width;
          let targetHeight = img.height;
          
          switch (quality) {
            case 'low':
              targetWidth = Math.min(img.width, 100);
              targetHeight = Math.min(img.height, 100);
              break;
            case 'medium':
              targetWidth = Math.min(img.width, 200);
              targetHeight = Math.min(img.height, 200);
              break;
            case 'high':
              targetWidth = Math.min(img.width, 400);
              targetHeight = Math.min(img.height, 400);
              break;
          }
          
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          
          // Draw and compress image
          if (ctx) {
            ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
            
            // Convert to base64 with quality setting
            const qualityValue = quality === 'low' ? 0.6 : quality === 'medium' ? 0.8 : 0.9;
            const base64 = canvas.toDataURL('image/jpeg', qualityValue);
            
            resolve(base64);
          } else {
            console.warn(`❌ Could not get canvas context for: ${imageUrl}`);
            resolve(null);
          }
        } catch (error) {
          console.error(`❌ Error processing image on canvas:`, error, 'URL:', imageUrl);
          resolve(null);
        }
      };
      
      img.onerror = () => {
        console.warn(`❌ Image failed to load: ${imageUrl}`);
        resolve(null);
      };
      
      img.crossOrigin = 'anonymous';
      img.src = URL.createObjectURL(blob);
    });
  } catch (error) {
    console.error(`❌ Error converting image to base64:`, error, 'URL:', imageUrl);
    return null;
  }
}

// Download handler for different environments
class DownloadHandler {
  static async downloadPDF(pdfDoc: jsPDF, fileName: string): Promise<void> {
    if (isReactNativeWebView()) {
      const pdfBase64 = pdfDoc.output('datauristring');
      
      const message = {
        type: 'download',
        fileType: 'pdf',
        fileName: fileName,
        data: pdfBase64,
        version: 'enhanced-v2.0',
        timestamp: Date.now(),
        size: pdfBase64.length,
        quality: 'high'
      };
      
      window.ReactNativeWebView?.postMessage(JSON.stringify(message));
    } else if (isMobileDevice()) {
      const pdfBlob = pdfDoc.output('blob');
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      pdfDoc.save(fileName);
    }
  }
}

// Main PDF download service
export class PDFDownloadService {
  static async downloadPDF(options: PDFDownloadOptions): Promise<void> {
    const {
      reports,
      fileName = `attendance-report-${new Date().toISOString().split('T')[0]}.pdf`,
      showProgress = true,
      includeImages = true,
      quality = 'medium'
    } = options;

    try {
      // Create PDF document
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
      doc.text(`Total Records: ${reports.length}`, 148.5, 48, { align: 'center' });

      // Helper function to get shift label
      const getShiftLabel = (shift: string) => {
        switch (shift) {
          case "morning": return "7 AM - 3 PM (Morning)";
          case "evening": return "2 PM - 10 PM (Evening)";
          case "night": return "10 PM - 7 AM (Night)";
          default: return shift || "-";
        }
      };

      // Prepare table data with images using EXACT SAME LOGIC as legacy method
      const tableData = await Promise.all(
        reports.map(async (report, index) => {
          // Use employee profile image directly from report.employeeId.image
          const imageUrl = getBestImageUrl(report, []); // Empty array since we prioritize report.employeeId.image
          
          let imageBase64 = null;
          
          if (imageUrl) {
            imageBase64 = await convertImageToBase64(imageUrl, quality);
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
          0: { cellWidth: 35, halign: 'center' }, // Photo column
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
              const imageSize = 31;
              
              try {
                // Add a border around the image
                doc.setDrawColor(200, 200, 200);
                doc.setLineWidth(0.5);
                doc.rect(cellX - 1, cellY - 1, imageSize + 2, imageSize + 2);
                
                // Add the image
                const imageData = rowData.image;
                if (imageData && imageData.startsWith('data:image/')) {
                  let format = 'JPEG';
                  if (imageData.includes('data:image/png')) {
                    format = 'PNG';
                  } else if (imageData.includes('data:image/jpeg') || imageData.includes('data:image/jpg')) {
                    format = 'JPEG';
                  }
                  
                  doc.addImage(imageData, format, cellX, cellY, imageSize, imageSize, undefined, 'FAST');
                } else {
                  console.warn(`❌ Invalid image data format for ${rowData.employee}:`, imageData?.substring(0, 100));
                  throw new Error('Invalid image format');
                }
              } catch (error) {
                console.error(`❌ Error adding image to PDF for ${rowData.employee}:`, error);
                // Fallback to placeholder
                doc.setFillColor(240, 240, 240);
                doc.rect(cellX, cellY, imageSize, imageSize, 'F');
                doc.setTextColor(150, 150, 150);
                doc.setFontSize(8);
                doc.text('Error', cellX + imageSize/2, cellY + imageSize/2 + 3, { align: 'center' });
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

      // Download the PDF
      await DownloadHandler.downloadPDF(doc, fileName);
      
    } catch (error) {
      console.error('❌ Unified PDF download failed:', error);
      throw error;
    }
  }

  // Test function for debugging
  static async testDownload(): Promise<void> {
    const testReports: Report[] = [
      {
        _id: 'test-1',
        date: '2024-01-15',
        employee: 'John Doe',
        shift: 'morning',
        location: 'Office',
        status: 'Present',
        clockIn: '07:00 AM',
        clockOut: '03:00 PM'
      }
    ];

    await this.downloadPDF({
      reports: testReports,
      fileName: 'test-report.pdf',
      includeImages: false,
      quality: 'low'
    });
  }

  // Debug function to test image processing
  static async testImageProcessing(): Promise<void> {
    // Test with a sample image URL
    const testImageUrl = getImageUrl('test-image.jpg');
    
    if (testImageUrl) {
      const result = await convertImageToBase64(testImageUrl, 'high');
    } else {
      console.log('❌ No test image URL generated');
    }
  }

  // Debug function to test with sample reports
  static async testWithSampleReports(): Promise<void> {
    // Fetch real employee data for testing
    const employees = await fetchEmployees();
    
    const sampleReports: Report[] = [
      {
        _id: 'test-1',
        date: '2024-01-15',
        employee: 'John Doe',
        employeeId: {
          _id: 'emp-1',
          name: 'John Doe',
          image: '1754844759866-employee.jpg' // Employee profile image filename
        },
        shift: 'morning',
        location: 'Office',
        status: 'Present',
        clockIn: '07:00 AM',
        clockOut: '03:00 PM'
      },
      {
        _id: 'test-2',
        date: '2024-01-15',
        employee: 'Jane Smith',
        employeeId: {
          _id: 'emp-2',
          name: 'Jane Smith',
          image: '1754845155584-employee.jpg' // Another employee profile image
        },
        shift: 'evening',
        location: 'Office',
        status: 'Present',
        clockIn: '02:00 PM',
        clockOut: '10:00 PM'
      }
    ];

    try {
      await this.downloadPDF({
        reports: sampleReports,
        fileName: 'test-employee-profile-images.pdf',
        includeImages: true,
        quality: 'high'
      });
    } catch (error) {
      console.error('❌ Sample PDF generation failed:', error);
    }
  }
}

// Export a singleton instance
export const pdfDownloadService = new PDFDownloadService();
