"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PDFDownloadButton } from "@/components/ui/pdf-download-button";
import { Download, Smartphone, Monitor, Globe } from "lucide-react";

// Mock data for testing
const mockReports = [
  {
    _id: "1",
    date: "2024-01-15",
    employee: "John Doe",
    employeeId: { _id: "emp1", name: "John Doe", image: "https://placehold.co/400x400/6366f1/ffffff?text=J" },
    employeePhoto: "https://placehold.co/400x400/6366f1/ffffff?text=J",
    stepIn: "08:00",
    shift: "morning",
    location: "Office A",
    status: "Present" as const,
    clockIn: "08:00",
    clockOut: "17:00"
  },
  {
    _id: "2",
    date: "2024-01-15",
    employee: "Jane Smith",
    employeeId: { _id: "emp2", name: "Jane Smith", image: "https://placehold.co/400x400/10b981/ffffff?text=J" },
    employeePhoto: "https://placehold.co/400x400/10b981/ffffff?text=J",
    stepIn: "09:00",
    shift: "morning",
    location: "Office B",
    status: "Present" as const,
    clockIn: "09:00",
    clockOut: "18:00"
  },
  {
    _id: "3",
    date: "2024-01-15",
    employee: "Mike Johnson",
    employeeId: { _id: "emp3", name: "Mike Johnson", image: "https://placehold.co/400x400/f59e0b/ffffff?text=M" },
    employeePhoto: "https://placehold.co/400x400/f59e0b/ffffff?text=M",
    stepIn: "22:00",
    shift: "night",
    location: "Office C",
    status: "Present" as const,
    clockIn: "22:00",
    clockOut: "07:00"
  }
];

export default function MobilePDFTestPage() {
  const [deviceInfo, setDeviceInfo] = useState<any>({});
  const [testResults, setTestResults] = useState<string[]>([]);

  useEffect(() => {
    // Detect device information
    const info = {
      userAgent: navigator.userAgent,
      isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
      isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent),
      isAndroid: /Android/.test(navigator.userAgent),
      isReactNative: typeof window !== 'undefined' && !!window.ReactNativeWebView,
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      platform: navigator.platform
    };
    setDeviceInfo(info);
  }, []);

  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const convertReportsForPDF = () => {
    return mockReports.map(report => ({
      _id: report._id,
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
    <div className="container mx-auto p-4 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">📱 Mobile PDF Test</h1>
        <p className="text-muted-foreground">Test PDF download functionality on mobile devices</p>
      </div>

      {/* Device Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Device Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <strong>Device Type:</strong>
              <div className="flex gap-2 mt-1">
                {deviceInfo.isMobile && <Badge variant="default">📱 Mobile</Badge>}
                {deviceInfo.isIOS && <Badge variant="secondary">🍎 iOS</Badge>}
                {deviceInfo.isAndroid && <Badge variant="secondary">🤖 Android</Badge>}
                {deviceInfo.isReactNative && <Badge variant="destructive">⚛️ React Native</Badge>}
                {!deviceInfo.isMobile && <Badge variant="outline">💻 Desktop</Badge>}
              </div>
            </div>
            <div>
              <strong>Screen Size:</strong>
              <p className="text-sm text-muted-foreground">
                {deviceInfo.screenWidth} x {deviceInfo.screenHeight}
              </p>
            </div>
            <div>
              <strong>Platform:</strong>
              <p className="text-sm text-muted-foreground">{deviceInfo.platform}</p>
            </div>
            <div>
              <strong>User Agent:</strong>
              <p className="text-xs text-muted-foreground truncate">{deviceInfo.userAgent}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mobile-Optimized PDF Buttons */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Mobile PDF Download Buttons
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Fast PDF Button */}
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">⚡ Fast PDF (2-5 seconds)</h3>
              <PDFDownloadButton
                reports={convertReportsForPDF()}
                fileName={`mobile-test-fast-${new Date().toISOString().split('T')[0]}.pdf`}
                showProgress={false}
                includeImages={false}
                quality="low"
                variant="outline"
                size="sm"
                className="w-full"
                onSuccess={() => addTestResult('✅ Fast PDF download completed successfully')}
                onError={(error) => addTestResult(`❌ Fast PDF download failed: ${error.message}`)}
              >
                <Download className="mr-2 h-4 w-4" />
                Fast PDF (No Images)
              </PDFDownloadButton>
            </div>

            {/* Full PDF Button */}
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">📄 Full PDF (10-30 seconds)</h3>
              <PDFDownloadButton
                reports={convertReportsForPDF()}
                fileName={`mobile-test-full-${new Date().toISOString().split('T')[0]}.pdf`}
                showProgress={true}
                includeImages={true}
                quality="medium"
                variant="default"
                size="sm"
                className="w-full"
                onSuccess={() => addTestResult('✅ Full PDF download completed successfully')}
                onError={(error) => addTestResult(`❌ Full PDF download failed: ${error.message}`)}
              >
                <Download className="mr-2 h-4 w-4" />
                Full PDF (With Images)
              </PDFDownloadButton>
            </div>

            {/* High Quality PDF Button */}
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">🎨 High Quality PDF (20-60 seconds)</h3>
              <PDFDownloadButton
                reports={convertReportsForPDF()}
                fileName={`mobile-test-hq-${new Date().toISOString().split('T')[0]}.pdf`}
                showProgress={true}
                includeImages={true}
                quality="high"
                variant="default"
                size="sm"
                className="w-full"
                onSuccess={() => addTestResult('✅ High Quality PDF download completed successfully')}
                onError={(error) => addTestResult(`❌ High Quality PDF download failed: ${error.message}`)}
              >
                <Download className="mr-2 h-4 w-4" />
                High Quality PDF
              </PDFDownloadButton>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Test Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {testResults.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No tests run yet. Try downloading a PDF to see results.
              </p>
            ) : (
              testResults.map((result, index) => (
                <div key={index} className="text-sm p-2 bg-gray-50 rounded">
                  {result}
                </div>
              ))
            )}
          </div>
          {testResults.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTestResults([])}
              className="mt-2"
            >
              Clear Results
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Instructions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-sm space-y-1">
            <p><strong>1.</strong> This page is optimized for mobile testing</p>
            <p><strong>2.</strong> Try all three PDF download options</p>
            <p><strong>3.</strong> Check the test results below</p>
            <p><strong>4.</strong> Fast PDF should work in 2-5 seconds</p>
            <p><strong>5.</strong> Full PDF includes employee photos</p>
            <p><strong>6.</strong> High Quality PDF is for important documents</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
