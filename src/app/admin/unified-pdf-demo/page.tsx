"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { 
  UnifiedPDFDownloadButton, 
  QuickPDFDownloadButton, 
  HighQualityPDFDownloadButton, 
  MobileOptimizedPDFDownloadButton 
} from "@/components/admin/UnifiedPDFDownloadButton";
import { ReportData } from "@/services/pdfDownloadService";

// Sample data for demonstration
const sampleReports: ReportData[] = [
  {
    _id: '1',
    date: '2024-01-15',
    employee: 'John Doe',
    employeeId: {
      _id: 'emp-1',
      name: 'John Doe',
      image: 'employee-1.jpg'
    },
    shift: 'morning',
    location: 'Office A',
    status: 'Present',
    clockIn: '09:00 AM',
    clockOut: '05:00 PM'
  },
  {
    _id: '2',
    date: '2024-01-15',
    employee: 'Jane Smith',
    employeeId: {
      _id: 'emp-2',
      name: 'Jane Smith',
      image: 'employee-2.jpg'
    },
    shift: 'evening',
    location: 'Office B',
    status: 'Present',
    clockIn: '02:00 PM',
    clockOut: '10:00 PM'
  },
  {
    _id: '3',
    date: '2024-01-15',
    employee: 'Mike Johnson',
    employeeId: {
      _id: 'emp-3',
      name: 'Mike Johnson',
      image: 'employee-3.jpg'
    },
    shift: 'night',
    location: 'Remote',
    status: 'Present',
    clockIn: '10:00 PM',
    clockOut: '07:00 AM'
  }
];

export default function UnifiedPDFDemoPage() {
  const handleSuccess = () => {
    console.log('✅ PDF downloaded successfully!');
  };

  const handleError = (error: Error) => {
    console.error('❌ Download failed:', error.message);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="w-full max-w-7xl mx-auto px-3 py-4 space-y-4 sm:px-6 lg:px-8">
        
        {/* Header Section */}
        <div className="mb-6">
          <AdminPageHeader
            title="Unified PDF Download Demo"
            subtitle="Test the new unified PDF download button that works on all devices."
          />
        </div>

        {/* Demo Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Basic Usage */}
          <Card>
            <CardHeader>
              <CardTitle>1. Basic Usage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                Simple PDF download with default settings. Works on all devices.
              </p>
              <UnifiedPDFDownloadButton 
                reports={sampleReports}
                onSuccess={handleSuccess}
                onError={handleError}
              />
            </CardContent>
          </Card>

          {/* Quick Download */}
          <Card>
            <CardHeader>
              <CardTitle>2. Quick Download</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                Fast download with no progress bar. Best for testing.
              </p>
              <QuickPDFDownloadButton 
                reports={sampleReports}
                onSuccess={handleSuccess}
                onError={handleError}
              />
            </CardContent>
          </Card>

          {/* High Quality */}
          <Card>
            <CardHeader>
              <CardTitle>3. High Quality</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                Best quality with progress tracking. For important reports.
              </p>
              <HighQualityPDFDownloadButton 
                reports={sampleReports}
                onSuccess={handleSuccess}
                onError={handleError}
              />
            </CardContent>
          </Card>

          {/* Mobile Optimized */}
          <Card>
            <CardHeader>
              <CardTitle>4. Mobile Optimized</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                Larger button with mobile-friendly styling.
              </p>
              <MobileOptimizedPDFDownloadButton 
                reports={sampleReports}
                onSuccess={handleSuccess}
                onError={handleError}
              />
            </CardContent>
          </Card>

          {/* Custom Styling */}
          <Card>
            <CardHeader>
              <CardTitle>5. Custom Styling</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                Custom button with different variant and size.
              </p>
              <UnifiedPDFDownloadButton 
                reports={sampleReports}
                variant="outline"
                size="lg"
                className="w-full"
                onSuccess={handleSuccess}
                onError={handleError}
              >
                📄 Download Custom Report
              </UnifiedPDFDownloadButton>
            </CardContent>
          </Card>

          {/* Custom Filename */}
          <Card>
            <CardHeader>
              <CardTitle>6. Custom Filename</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                PDF with custom filename and high quality.
              </p>
              <UnifiedPDFDownloadButton 
                reports={sampleReports}
                fileName="custom-attendance-report.pdf"
                quality="high"
                onSuccess={handleSuccess}
                onError={handleError}
              >
                📊 Download Custom Report
              </UnifiedPDFDownloadButton>
            </CardContent>
          </Card>

        </div>

        {/* Information Section */}
        <Card>
          <CardHeader>
            <CardTitle>How It Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl mb-2">🖥️</div>
                <h3 className="font-semibold">Desktop</h3>
                <p className="text-sm text-gray-600">
                  Downloads directly to your Downloads folder
                </p>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-2">📱</div>
                <h3 className="font-semibold">Mobile</h3>
                <p className="text-sm text-gray-600">
                  Uses browser download or shares the file
                </p>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-2">📲</div>
                <h3 className="font-semibold">React Native</h3>
                <p className="text-sm text-gray-600">
                  Sends to native app for handling
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sample Data Info */}
        <Card>
          <CardHeader>
            <CardTitle>Sample Data</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              This demo uses {sampleReports.length} sample attendance records with employee photos.
            </p>
            <div className="space-y-2">
              {sampleReports.map((report) => (
                <div key={report._id} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <span className="font-medium">{report.employee}</span>
                  <span className="text-sm text-gray-600">{report.shift} - {report.status}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
