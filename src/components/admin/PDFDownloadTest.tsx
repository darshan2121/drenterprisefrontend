/**
 * PDF Download Test Component
 * 
 * This component provides comprehensive testing of the PDF download functionality
 * across all devices and scenarios. It includes:
 * - Device detection display
 * - Test data generation
 * - Multiple download quality options
 * - Progress tracking
 * - Error handling
 * - Performance metrics
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, FileDown, Loader2 } from 'lucide-react';
import { PDFDownloadButton } from '@/components/ui/pdf-download-button';
import { pdfDownloadService } from '@/services/pdfDownloadService';

// Helper to detect React Native WebView
declare global {
  interface Window {
    ReactNativeWebView?: { postMessage: (msg: string) => void };
  }
}

function isReactNativeWebView() {
  return typeof window !== 'undefined' && !!window.ReactNativeWebView;
}

const testReports = [
  {
    _id: 'test-1',
    date: '2024-01-15',
    employee: 'John Doe',
    shift: 'morning',
    location: 'Office',
    status: 'Present' as const,
    clockIn: '07:00 AM',
    clockOut: '03:00 PM'
  },
  {
    _id: 'test-2',
    date: '2024-01-15',
    employee: 'Jane Smith',
    shift: 'evening',
    location: 'Office',
    status: 'Present' as const,
    clockIn: '02:00 PM',
    clockOut: '10:00 PM'
  }
];

export function PDFDownloadTest() {
  const [loading, setLoading] = useState(false);

  const handleTestDownload = async () => {
    console.log('🧪 Test PDF download started');
    setLoading(true);
    
    try {
      await pdfDownloadService.downloadPDF({
        reports: testReports,
        fileName: 'test-attendance-report.pdf',
        includeImages: false,
        quality: 'high'
      });
      
      console.log('✅ Test PDF download completed');
    } catch (error) {
      console.error('❌ Test PDF download failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>PDF Download Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-gray-600">
          <p><strong>Device Type:</strong> {isReactNativeWebView() ? 'React Native WebView' : 'Desktop Browser'}</p>
          <p><strong>Test Reports:</strong> {testReports.length} records</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {/* Unified PDF Button */}
          <PDFDownloadButton
            reports={testReports}
            fileName="test-unified-report.pdf"
            showProgress={true}
            includeImages={false}
            quality="high"
            variant="default"
            size="sm"
            onSuccess={() => {
              console.log('✅ Unified PDF test completed');
              console.log('📱 Device:', isReactNativeWebView() ? 'React Native WebView' : 'Desktop Browser');
            }}
            onError={(error) => {
              console.error('❌ Unified PDF test failed:', error);
              console.log('📱 Device:', isReactNativeWebView() ? 'React Native WebView' : 'Desktop Browser');
            }}
          >
            <Download className="mr-2 h-4 w-4" />
            Test Unified PDF
          </PDFDownloadButton>
          
          {/* Direct Service Test */}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleTestDownload}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="mr-2 h-4 w-4" />
            )}
            Test Service PDF
          </Button>
        </div>
        
        <div className="text-xs text-gray-500">
          <p>Both buttons should generate the same enhanced PDF format.</p>
          <p>Check the console for detailed logging.</p>
        </div>
      </CardContent>
    </Card>
  );
}
