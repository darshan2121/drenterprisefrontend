/**
 * Universal PDF Download Button Component
 * 
 * This component provides a consistent PDF download experience across all devices:
 * - Desktop browsers (Chrome, Firefox, Safari, Edge)
 * - Mobile browsers (iOS Safari, Android Chrome, etc.)
 * - React Native WebView
 * 
 * Features:
 * - Automatic device detection and appropriate download method
 * - Progress tracking with visual feedback
 * - Error handling with user-friendly messages
 * - Loading states and disabled states
 * - Customizable styling and behavior
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { PDFDownloadService, type Report } from '@/services/pdfDownloadService';
import { useToast } from '@/hooks/use-toast';

interface PDFDownloadButtonProps {
  reports: Report[];
  allReports?: Report[]; // Add this prop for PDF generation with all data
  fileName?: string;
  showProgress?: boolean;
  includeImages?: boolean;
  quality?: 'low' | 'medium' | 'high';
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  children?: React.ReactNode;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function PDFDownloadButton({
  reports,
  allReports, // Add this prop
  fileName,
  showProgress = true,
  includeImages = true,
  quality = 'medium',
  variant = 'default',
  size = 'default',
  className = '',
  children,
  onSuccess,
  onError
}: PDFDownloadButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleDownload = async () => {
    const reportsToUse = allReports || reports; // Use allReports if available, otherwise use reports
    
    if (reportsToUse.length === 0) {
      toast({
        title: "No Data",
        description: "No reports available for download.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      await PDFDownloadService.downloadPDF({
        reports: reportsToUse, // Use the reports with all data
        fileName: fileName || `attendance-report-${new Date().toISOString().split('T')[0]}.pdf`,
        showProgress,
        includeImages,
        quality
      });

      toast({
        title: "Success",
        description: "PDF downloaded successfully!",
      });

      onSuccess?.();
    } catch (error) {
      console.error('PDF download failed:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to download PDF';
      
      toast({
        title: "Download Failed",
        description: errorMessage,
        variant: "destructive"
      });

      onError?.(error instanceof Error ? error : new Error(errorMessage));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleDownload}
      disabled={isLoading || reports.length === 0}
      className={className}
    >
      {isLoading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Download className="mr-2 h-4 w-4" />
      )}
      {children || 'Download PDF'}
    </Button>
  );
}
