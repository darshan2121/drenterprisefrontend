/**
 * Standalone Unified PDF Download Button
 * 
 * This component provides a simple, standalone PDF download button
 * that works consistently across all devices (desktop, mobile, React Native WebView).
 * 
 * Usage:
 * <UnifiedPDFDownloadButton reports={reports} />
 */

"use client";

import React from 'react';
import { PDFDownloadButton } from '@/components/ui/pdf-download-button';
import { ReportData } from '@/services/pdfDownloadService';
import { Download } from 'lucide-react';

export interface UnifiedPDFDownloadButtonProps {
  reports: ReportData[];
  fileName?: string;
  showProgress?: boolean;
  quality?: 'low' | 'medium' | 'high';
  variant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  children?: React.ReactNode;
  disabled?: boolean;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function UnifiedPDFDownloadButton({
  reports,
  fileName,
  showProgress = true,
  quality = 'medium',
  variant = 'default',
  size = 'sm',
  className,
  children,
  disabled = false,
  onSuccess,
  onError
}: UnifiedPDFDownloadButtonProps) {
  // Don't render if no reports
  if (!reports || reports.length === 0) {
    return null;
  }

  const defaultFileName = fileName || `attendance-report-${new Date().toISOString().split('T')[0]}.pdf`;

  return (
    <PDFDownloadButton
      reports={reports}
      fileName={defaultFileName}
      showProgress={showProgress}
      includeImages={true}
      quality={quality}
      variant={variant}
      size={size}
      className={className}
      disabled={disabled}
      onSuccess={onSuccess}
      onError={onError}
    >
      {children || (
        <>
          <Download className="mr-2 h-4 w-4" />
          Download PDF
        </>
      )}
    </PDFDownloadButton>
  );
}

// Convenience exports for different use cases
export function QuickPDFDownloadButton({ reports, ...props }: Omit<UnifiedPDFDownloadButtonProps, 'showProgress' | 'quality'>) {
  return (
    <UnifiedPDFDownloadButton
      reports={reports}
      showProgress={false}
      quality="low"
      {...props}
    />
  );
}

export function HighQualityPDFDownloadButton({ reports, ...props }: Omit<UnifiedPDFDownloadButtonProps, 'showProgress' | 'quality'>) {
  return (
    <UnifiedPDFDownloadButton
      reports={reports}
      showProgress={true}
      quality="high"
      {...props}
    />
  );
}

export function MobileOptimizedPDFDownloadButton({ reports, ...props }: Omit<UnifiedPDFDownloadButtonProps, 'showProgress' | 'quality'>) {
  return (
    <UnifiedPDFDownloadButton
      reports={reports}
      showProgress={true}
      quality="medium"
      size="lg"
      variant="default"
      {...props}
    >
      <Download className="mr-2 h-5 w-5" />
      Download Report
    </UnifiedPDFDownloadButton>
  );
}
