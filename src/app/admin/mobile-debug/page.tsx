"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PDFDownloadButton } from "@/components/ui/pdf-download-button";
import { Download, Smartphone } from "lucide-react";

// Simple mock data
const mockReports = [
  {
    _id: "1",
    date: "2024-01-15",
    employee: "John Doe",
    employeeId: { _id: "emp1", name: "John Doe" },
    employeePhoto: "https://placehold.co/400x400/6366f1/ffffff?text=J",
    stepIn: "08:00",
    shift: "morning",
    location: "Office A",
    status: "Present" as const,
    clockIn: "08:00",
    clockOut: "17:00"
  }
];

export default function MobileDebugPage() {
  const [testResults, setTestResults] = useState<string[]>([]);

  const addResult = (result: string) => {
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
        <h1 className="text-3xl font-bold mb-2">📱 Mobile Debug Test</h1>
        <p className="text-muted-foreground">Simple test for mobile PDF buttons</p>
      </div>

      {/* Device Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Device Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p><strong>Window Width:</strong> {typeof window !== 'undefined' ? window.innerWidth : 'N/A'}px</p>
            <p><strong>Is Mobile:</strong> {typeof window !== 'undefined' && window.innerWidth < 768 ? 'Yes' : 'No'}</p>
            <p><strong>User Agent:</strong> {typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A'}</p>
          </div>
        </CardContent>
      </Card>

      {/* Mobile PDF Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>Mobile PDF Buttons</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Fast PDF */}
            <div className="space-y-2">
              <h3 className="font-semibold">Fast PDF Button</h3>
              <PDFDownloadButton
                reports={convertReportsForPDF()}
                fileName="mobile-debug-fast.pdf"
                showProgress={false}
                includeImages={false}
                quality="low"
                variant="outline"
                size="sm"
                className="w-full"
                onSuccess={() => addResult('✅ Fast PDF download completed')}
                onError={(error) => addResult(`❌ Fast PDF failed: ${error.message}`)}
              >
                <Download className="mr-2 h-4 w-4" />
                Fast PDF (Mobile)
              </PDFDownloadButton>
            </div>

            {/* Full PDF */}
            <div className="space-y-2">
              <h3 className="font-semibold">Full PDF Button</h3>
              <PDFDownloadButton
                reports={convertReportsForPDF()}
                fileName="mobile-debug-full.pdf"
                showProgress={true}
                includeImages={true}
                quality="medium"
                variant="default"
                size="sm"
                className="w-full"
                onSuccess={() => addResult('✅ Full PDF download completed')}
                onError={(error) => addResult(`❌ Full PDF failed: ${error.message}`)}
              >
                <Download className="mr-2 h-4 w-4" />
                Full PDF (Mobile)
              </PDFDownloadButton>
            </div>

            {/* Regular Button */}
            <div className="space-y-2">
              <h3 className="font-semibold">Regular Button</h3>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => addResult('✅ Regular button clicked')}
              >
                <Download className="mr-2 h-4 w-4" />
                Regular Button
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Results */}
      <Card>
        <CardHeader>
          <CardTitle>Test Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {testResults.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No tests run yet. Try the buttons above.
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
          <CardTitle>Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm space-y-2">
            <p><strong>1.</strong> This page tests mobile PDF buttons in isolation</p>
            <p><strong>2.</strong> Try all three buttons above</p>
            <p><strong>3.</strong> Check the test results below</p>
            <p><strong>4.</strong> If buttons work here, the issue is in the main reports page</p>
            <p><strong>5.</strong> If buttons don't work here, there's a component issue</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
