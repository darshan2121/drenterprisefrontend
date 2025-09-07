"use client";

import { PDFDownloadButton } from "@/components/ui/pdf-download-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Smartphone, Monitor, Tablet } from "lucide-react";
import { useState } from "react";

// Test data
const testReports = [
  {
    _id: 'test-1',
    date: '2024-01-15',
    employee: 'John Doe',
    employeeId: {
      _id: 'emp-1',
      name: 'John Doe',
      image: undefined
    },
    employeePhoto: undefined,
    stepIn: undefined,
    shift: 'morning',
    location: 'Office Building A',
    status: 'Present' as const,
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
      image: undefined
    },
    employeePhoto: undefined,
    stepIn: undefined,
    shift: 'evening',
    location: 'Office Building B',
    status: 'Present' as const,
    clockIn: '02:00 PM',
    clockOut: '10:00 PM'
  },
  {
    _id: 'test-3',
    date: '2024-01-15',
    employee: 'Mike Johnson',
    employeeId: {
      _id: 'emp-3',
      name: 'Mike Johnson',
      image: undefined
    },
    employeePhoto: undefined,
    stepIn: undefined,
    shift: 'night',
    location: 'Warehouse',
    status: 'Present' as const,
    clockIn: '10:00 PM',
    clockOut: '07:00 AM'
  }
];

export default function PDFTestPage() {
  const [deviceInfo, setDeviceInfo] = useState({
    userAgent: '',
    isMobile: false,
    isTablet: false,
    isDesktop: false,
    screenSize: '',
    windowSize: ''
  });

  // Detect device info on component mount
  useState(() => {
    if (typeof window !== 'undefined') {
      const userAgent = navigator.userAgent;
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
      const isTablet = /iPad|Android(?=.*\bMobile\b)(?=.*\bSafari\b)/i.test(userAgent);
      const isDesktop = !isMobile && !isTablet;
      
      setDeviceInfo({
        userAgent,
        isMobile,
        isTablet,
        isDesktop,
        screenSize: `${screen.width}x${screen.height}`,
        windowSize: `${window.innerWidth}x${window.innerHeight}`
      });
    }
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Unified PDF Download Test
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Test the new unified PDF download system across all devices
          </p>
        </div>

        {/* Device Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              Device Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium">Device Type:</p>
                <div className="flex items-center gap-2 mt-1">
                  {deviceInfo.isMobile && <Smartphone className="h-4 w-4 text-blue-500" />}
                  {deviceInfo.isTablet && <Tablet className="h-4 w-4 text-green-500" />}
                  {deviceInfo.isDesktop && <Monitor className="h-4 w-4 text-purple-500" />}
                  <span className="text-sm">
                    {deviceInfo.isMobile ? 'Mobile' : deviceInfo.isTablet ? 'Tablet' : 'Desktop'}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium">Screen Size:</p>
                <p className="text-sm text-gray-600">{deviceInfo.screenSize}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Window Size:</p>
                <p className="text-sm text-gray-600">{deviceInfo.windowSize}</p>
              </div>
              <div>
                <p className="text-sm font-medium">User Agent:</p>
                <p className="text-xs text-gray-500 truncate">{deviceInfo.userAgent}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Test Reports Info */}
        <Card>
          <CardHeader>
            <CardTitle>Test Data</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Testing with {testReports.length} sample attendance records
            </p>
            <div className="space-y-2">
              {testReports.map((report) => (
                <div key={report._id} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <span className="font-medium">{report.employee}</span>
                  <span className="text-sm text-gray-600">{report.shift} - {report.status}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* PDF Download Buttons */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              PDF Download Options
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Standard Download */}
            <div>
              <h3 className="font-medium mb-2">Standard Download (Recommended)</h3>
              <PDFDownloadButton
                reports={testReports}
                fileName="test-attendance-report.pdf"
                showProgress={true}
                includeImages={true}
                quality="medium"
                variant="default"
                size="default"
                onSuccess={() => console.log('✅ Standard PDF download completed')}
                onError={(error) => console.error('❌ Standard PDF download failed:', error)}
              >
                <Download className="mr-2 h-4 w-4" />
                Download PDF (Standard)
              </PDFDownloadButton>
            </div>

            {/* Fast Download */}
            <div>
              <h3 className="font-medium mb-2">Fast Download (No Images)</h3>
              <PDFDownloadButton
                reports={testReports}
                fileName="test-attendance-report-fast.pdf"
                showProgress={false}
                includeImages={false}
                quality="low"
                variant="outline"
                size="default"
                onSuccess={() => console.log('✅ Fast PDF download completed')}
                onError={(error) => console.error('❌ Fast PDF download failed:', error)}
              >
                <Download className="mr-2 h-4 w-4" />
                Download PDF (Fast)
              </PDFDownloadButton>
            </div>

            {/* High Quality Download */}
            <div>
              <h3 className="font-medium mb-2">High Quality Download</h3>
              <PDFDownloadButton
                reports={testReports}
                fileName="test-attendance-report-hq.pdf"
                showProgress={true}
                includeImages={true}
                quality="high"
                variant="secondary"
                size="default"
                onSuccess={() => console.log('✅ High quality PDF download completed')}
                onError={(error) => console.error('❌ High quality PDF download failed:', error)}
              >
                <Download className="mr-2 h-4 w-4" />
                Download PDF (High Quality)
              </PDFDownloadButton>
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>How to Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <h4 className="font-medium">Desktop Testing:</h4>
              <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                <li>Click any download button above</li>
                <li>PDF should download directly to your downloads folder</li>
                <li>Check that the PDF opens correctly with images and formatting</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">Mobile Testing:</h4>
              <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                <li>Use browser developer tools to simulate mobile device</li>
                <li>Or test on actual mobile device</li>
                <li>PDF should download and open in mobile PDF viewer</li>
                <li>Check that images are properly sized for mobile viewing</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">React Native WebView Testing:</h4>
              <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                <li>Test within React Native app WebView</li>
                <li>PDF should be sent to native app via postMessage</li>
                <li>Native app should handle the PDF download</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Console Log */}
        <Card>
          <CardHeader>
            <CardTitle>Debug Information</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-2">
              Check the browser console for detailed download logs and any errors.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                console.log('🔍 Device Info:', deviceInfo);
                console.log('📊 Test Reports:', testReports);
                console.log('🌐 Window Object:', typeof window !== 'undefined' ? 'Available' : 'Not Available');
                console.log('📱 React Native WebView:', typeof window !== 'undefined' && window.ReactNativeWebView ? 'Available' : 'Not Available');
              }}
            >
              Log Debug Info
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
