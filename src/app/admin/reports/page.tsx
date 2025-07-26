"use client";

import { ReportsFilter } from "@/components/admin/ReportsFilter";
import { ReportsTable } from "@/components/admin/ReportsTable";
import { Card } from "@/components/ui/card";
import { useDispatch, useSelector } from "react-redux";
import { useEffect, useState, useCallback } from "react";
import { fetchAttendance } from "@/store/slices/attendanceSlice";
import { RootState } from "@/store";
import { format } from "date-fns";
import { ENDPOINTS } from "@/lib/endpoints";
import { http } from "@/lib/http";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { EditReportModal } from "@/components/admin/EditReportModal";
import { authService } from "@/services/authService";
import { useRouter } from "next/navigation";
import { HeaderActions } from "@/components/admin/ReportsTable";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export default function ReportsPage() {
    const router = useRouter();
    const isReadonly = authService.getCurrentUser()?.role === "readonly";

    const dispatch = useDispatch();
    const attendanceList = useSelector((state: RootState) => state.attendance.attendanceList);
    const isLoading = useSelector((state: RootState) => state.attendance.isLoadingAttendance);
    const isUpdating = useSelector((state: RootState) => state.attendance.isUpdating);

    // Fetch managers and employees from backend
    const [managers, setManagers] = useState<{ name: string; _id: string }[]>([]);
    const [employees, setEmployees] = useState<{ name: string; _id: string }[]>([]);
    const [filtersLoading, setFiltersLoading] = useState(true);

    useEffect(() => {
      async function fetchFilters() {
        setFiltersLoading(true);
        try {
          const mgrRes = await http<{ data: { name: string; _id: string }[] }>(ENDPOINTS.manager.all);
          const empRes = await http<{ data: { name: string; _id: string }[] }>(ENDPOINTS.employee.all);
          setManagers(mgrRes.data || []);
          setEmployees(empRes.data || []);
        } catch (e) {
          setManagers([]);
          setEmployees([]);
        } finally {
          setFiltersLoading(false);
        }
      }
      fetchFilters();
    }, []);

    const [filters, setFilters] = useState({
      managerId: "",
      employeeId: "",
      shift: "",
      date: undefined as Date | undefined,
      startDate: undefined as string | undefined,
      endDate: undefined as string | undefined,
      order: "desc",
    });

    // Memoized fetch function
    const fetchAttendanceData = useCallback(() => {
      dispatch(
        fetchAttendance({
          managerId: filters.managerId || undefined,
          employeeId: filters.employeeId || undefined,
          startDate: filters.startDate,
          endDate: filters.endDate,
          order: filters.order,
        }) as any
      );
    }, [filters.managerId, filters.employeeId, filters.startDate, filters.endDate, filters.order, dispatch]);

    useEffect(() => {
      fetchAttendanceData();
    }, [fetchAttendanceData]);

    // Convert API data to expected format
    const formattedReports = attendanceList.map(att => ({
        _id: att._id,
        date: att.stepIn ? format(new Date(att.stepIn), 'yyyy-MM-dd') : '--',
        employee: att.employeeId?.name || att.employeeId || 'Unknown',
        shift: att.shift || att.employeeId?.shift || 'Regular',
        location: att.address || '--',
        status: att.stepOut ? 'Present' as const : 'Absent' as const,
        clockIn: att.stepIn ? format(new Date(att.stepIn), 'HH:mm') : '--',
        clockOut: att.stepOut ? format(new Date(att.stepOut), 'HH:mm') : '--',
        note: att.note || '',
        totalTime: att.totalTime || '',
    }));

    // Apply all filters on the frontend
    const filteredReports = formattedReports.filter(report => {
      const matchManager = !filters.managerId || (report.employee && employees.find(e => e._id === filters.managerId && e.name === report.employee));
      const matchEmployee = !filters.employeeId || (report.employee && employees.find(e => e._id === filters.employeeId && e.name === report.employee));
      const matchShift = !filters.shift || report.shift === filters.shift;
      const matchDate = !filters.date || report.date === format(filters.date, 'yyyy-MM-dd');
      return matchManager && matchEmployee && matchShift && matchDate;
    });

    // Updated refresh handler that ensures data is refreshed
    const handleRefresh = useCallback(async () => {
      try {
        await fetchAttendanceData();
      } catch (error) {
        console.error('Failed to refresh data:', error);
      }
    }, [fetchAttendanceData]);

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        {/* Mobile-first container */}
        <div className="w-full max-w-7xl mx-auto px-3 py-4 space-y-4 sm:px-6 lg:px-8">
          
          {/* Header Section */}
          <div className="mb-6">
            <AdminPageHeader
              title="Attendance Reports"
              subtitle="Generate, filter, and edit attendance reports."
            />
          </div>

          {/* Filters Card */}
          <Card className="w-full border-0 shadow-sm overflow-hidden">
            {filtersLoading ? (
              <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                  <span>Loading filters...</span>
                </div>
              </div>
            ) : (
              <div className="p-4 sm:p-6">
                <ReportsFilter
                  employees={employees}
                  managers={managers}
                  onManagerChange={(id) => setFilters((f) => ({ ...f, managerId: id }))}
                  onEmployeeChange={(id) => setFilters((f) => ({ ...f, employeeId: id }))}
                  onShiftChange={(shift) => setFilters((f) => ({ ...f, shift }))}
                  onDateChange={(date) => setFilters((f) => ({ ...f, date }))}
                />
              </div>
            )}
          </Card>

          {/* Reports Table Card */}
          <Card className="w-full border-0 shadow-sm overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <div className="flex flex-col items-center space-y-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  <span>Loading reports...</span>
                </div>
              </div>
            ) : (
              <div className="overflow-hidden">
                {/* Show updating indicator */}
                {isUpdating && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 p-4 mb-4">
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
                      <span className="text-sm text-blue-700 dark:text-blue-300">Updating report...</span>
                    </div>
                  </div>
                )}

                {/* Mobile: Card-based layout, Desktop: Table layout */}
                <div className="block sm:hidden">
                  {/* Mobile Cards Layout */}
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        Reports ({filteredReports.length})
                      </h3>
                      <div className="flex gap-2">
                        <HeaderActions
                          onDownloadPdf={() => {
                            const doc = new jsPDF();
                            doc.text("Attendance Report", 14, 16);
                            autoTable(doc, {
                              head: [[
                                "Date",
                                "Employee",
                                "Shift",
                                "Location",
                                "Status",
                                "Clock In",
                                "Clock Out",
                              ]],
                              body: filteredReports.map((report) => [
                                report.date,
                                report.employee,
                                report.shift,
                                report.location,
                                report.status,
                                report.clockIn,
                                report.clockOut,
                              ]),
                              startY: 20,
                            });
                            if (
                              typeof window !== "undefined" &&
                              !!window.ReactNativeWebView
                            ) {
                              const pdfBase64 = doc.output("datauristring");
                              window.ReactNativeWebView?.postMessage(
                                JSON.stringify({
                                  type: "download",
                                  fileType: "pdf",
                                  fileName: "attendance-report.pdf",
                                  data: pdfBase64,
                                })
                              );
                            } else {
                              doc.save("attendance-report.pdf");
                            }
                          }}
                          onDownloadXls={() => {
                            const worksheet = XLSX.utils.json_to_sheet(
                              filteredReports.map((report) => ({
                                Date: report.date,
                                Employee: report.employee,
                                Shift: report.shift,
                                Location: report.location,
                                Status: report.status,
                                "Clock In": report.clockIn,
                                "Clock Out": report.clockOut,
                              }))
                            );
                            const workbook = XLSX.utils.book_new();
                            XLSX.utils.book_append_sheet(
                              workbook,
                              worksheet,
                              "Attendance"
                            );
                            if (
                              typeof window !== "undefined" &&
                              !!window.ReactNativeWebView
                            ) {
                              const wbout = XLSX.write(workbook, {
                                type: "base64",
                                bookType: "xlsx",
                              });
                              window.ReactNativeWebView?.postMessage(
                                JSON.stringify({
                                  type: "download",
                                  fileType: "xlsx",
                                  fileName: "attendance-report.xlsx",
                                  data: wbout,
                                })
                              );
                            } else {
                              XLSX.writeFile(
                                workbook,
                                "attendance-report.xlsx"
                              );
                            }
                          }}
                          onRefresh={handleRefresh}
                          loading={isLoading || isUpdating}
                        />
                      </div>
                    </div>
                    
                    {filteredReports.length === 0 ? (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        No reports found
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {filteredReports.map((report) => (
                          <div key={report._id} className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate pr-2">
                                {report.employee}
                              </h4>
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                report.status === 'Present' 
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              }`}>
                                {report.status}
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <span className="text-gray-500 dark:text-gray-400">Date:</span>
                                <div className="font-medium text-gray-900 dark:text-gray-100">{report.date}</div>
                              </div>
                              <div>
                                <span className="text-gray-500 dark:text-gray-400">Shift:</span>
                                <div className="font-medium text-gray-900 dark:text-gray-100">{report.shift}</div>
                              </div>
                              <div>
                                <span className="text-gray-500 dark:text-gray-400">Clock In:</span>
                                <div className="font-medium text-gray-900 dark:text-gray-100">{report.clockIn}</div>
                              </div>
                              <div>
                                <span className="text-gray-500 dark:text-gray-400">Clock Out:</span>
                                <div className="font-medium text-gray-900 dark:text-gray-100">{report.clockOut}</div>
                              </div>
                            </div>
                            
                            {report.totalTime && (
                              <div className="mt-2 text-sm">
                                <span className="text-gray-500 dark:text-gray-400">Total Time:</span>
                                <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">{report.totalTime}</span>
                              </div>
                            )}
                            
                            {report.location && report.location !== '--' && (
                              <div className="mt-2 text-sm">
                                <span className="text-gray-500 dark:text-gray-400">Location:</span>
                                <div className="font-medium text-gray-900 dark:text-gray-100 text-xs mt-1 break-all">
                                  {report.location}
                                </div>
                              </div>
                            )}
                            
                            {report.note && (
                              <div className="mt-2 text-sm">
                                <span className="text-gray-500 dark:text-gray-400">Note:</span>
                                <div className="font-medium text-gray-900 dark:text-gray-100 mt-1">
                                  {report.note}
                                </div>
                              </div>
                            )}
                            {/* Action Buttons */}
                            {!isReadonly && (
                              <div className="flex gap-2 pt-4">
                                <EditReportModal 
                                  report={report} 
                                  onRefresh={handleRefresh}
                                  filters={{
                                    managerId: filters.managerId,
                                    employeeId: filters.employeeId,
                                    startDate: filters.startDate,
                                    endDate: filters.endDate,
                                    order: filters.order,
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Desktop Table Layout */}
                <div className="hidden sm:block">
                  <ReportsTable 
                    reports={filteredReports} 
                    onRefresh={handleRefresh} 
                    disableActions={isReadonly}
                    loading={isLoading || isUpdating}
                    filters={{
                      managerId: filters.managerId,
                      employeeId: filters.employeeId,
                      startDate: filters.startDate,
                      endDate: filters.endDate,
                      order: filters.order,
                    }}
                  />
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    );
}