"use client";

import { ReportsFilter } from "@/components/admin/ReportsFilter";
import { ReportsTable } from "@/components/admin/ReportsTable";
import { Card } from "@/components/ui/card";
import { useDispatch, useSelector } from "react-redux";
import { useEffect, useState, useCallback, useMemo } from "react";
import { fetchAttendance } from "@/store/slices/attendanceSlice";
import { RootState } from "@/store";
import { format } from "date-fns";
import { ENDPOINTS } from "@/lib/endpoints";
import { http } from "@/lib/http";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { EditReportModal } from "@/components/admin/EditReportModal";
import { BulkUpdateModal } from "@/components/admin/BulkUpdateModal";
import { authService } from "@/services/authService";
import { useRouter } from "next/navigation";
import { HeaderActions } from "@/components/admin/ReportsTable";
import { Edit3 } from "lucide-react";
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
    
    // State for checkbox selection
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

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

    // Debounced filter effect to prevent excessive API calls
    useEffect(() => {
      const timeoutId = setTimeout(() => {
        fetchAttendanceData();
      }, 300); // 300ms delay

      return () => clearTimeout(timeoutId);
    }, [filters.managerId, filters.employeeId, filters.startDate, filters.endDate, filters.order, fetchAttendanceData]);

    // Initial data fetch
    useEffect(() => {
      fetchAttendanceData();
    }, []); // Only run once on mount
    
    // Clear selectedIds when filters change
    useEffect(() => {
      setSelectedIds([]);
    }, [filters.shift]);

    // Convert API data to expected format
    const formattedReports = useMemo(() => {
      console.log('Processing attendance list:', attendanceList.length, 'records');
      
      // Log a sample of raw data to see what we're working with
      if (attendanceList.length > 0) {
        console.log('Sample raw attendance data:', attendanceList.slice(0, 2).map(att => ({
          _id: att._id,
          stepIn: att.stepIn,
          stepOut: att.stepOut,
          shift: att.shift,
          employeeName: att.employeeId?.name,
          stepInDate: att.stepIn ? new Date(att.stepIn) : null,
          stepOutDate: att.stepOut ? new Date(att.stepOut) : null
        })));
      }
      
      return attendanceList.map(att => {
        const formatISTTime = (dateString: string) => {
          if (!dateString) return '--';
          
          try {
            // Parse the date string
            const date = new Date(dateString);
            
            // Check if the date is valid
            if (isNaN(date.getTime())) {
              console.warn('Invalid date string:', dateString);
              return '--';
            }
            
            // Extract the time directly from the ISO string to avoid timezone issues
            // The time sent was in UTC, so we need to extract it properly
            const timeString = dateString.split('T')[1]; // Get the time part
            if (timeString) {
              const timeOnly = timeString.split('.')[0]; // Remove milliseconds
              const [hours, minutes] = timeOnly.split(':');
              
              // Convert to 12-hour format
              const hour24 = parseInt(hours);
              const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
              const ampm = hour24 >= 12 ? 'PM' : 'AM';
              const formattedTime = `${hour12}:${minutes} ${ampm}`;
              
              console.log(`Time formatting: ${dateString} -> ${formattedTime} (12-hour format)`);
              return formattedTime;
            }
            
            // Fallback to local time if ISO parsing fails
            const hours = date.getHours();
            const minutes = date.getMinutes();
            const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
            const ampm = hours >= 12 ? 'PM' : 'AM';
            const result = `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
            
            console.log(`Time formatting (fallback): ${dateString} -> ${result} (12-hour format)`);
            return result;
          } catch (error) {
            console.error('Error formatting time:', error, dateString);
            return '--';
          }
        };

        const formatted = {
          _id: att._id,
          date: att.stepIn ? format(new Date(att.stepIn), 'yyyy-MM-dd') : '--',
          employee: att.employeeId?.name || att.employeeId || 'Unknown',
          employeePhoto: att.employeeId?.photo || null,
          shift: att.shift || att.employeeId?.shift || 'Regular',
          location: att.address || '--',
          status: att.stepOut ? 'Present' as const : 'Absent' as const,
          clockIn: formatISTTime(att.stepIn),
          clockOut: formatISTTime(att.stepOut),
          note: att.note || '',
          totalTime: att.totalTime || '',
        };
        
        return formatted;
      });
    }, [attendanceList]); // Removed dataVersion dependency to reduce re-renders

    // Apply all filters on the frontend
    const filteredReports = useMemo(() => {
      // Only log when filters actually change, not on every render
      const filterKey = JSON.stringify(filters);
      console.log('Filtering reports with filters:', filters);
      console.log('Available employees:', employees.length);
      console.log('Available managers:', managers.length);
      
      const filtered = formattedReports.filter(report => {
        try {
          // Employee filter - check if the report is for the selected employee
          const matchEmployee = !filters.employeeId || 
            (report.employee && employees.find(e => e._id === filters.employeeId && e.name === report.employee));
          
          // Manager filter - check if the attendance record belongs to the selected manager
          const matchManager = !filters.managerId || 
            (attendanceList.find(att => att._id === report._id)?.managerId?._id === filters.managerId);
          
          // Shift filter
          const matchShift = !filters.shift || report.shift === filters.shift;
          
          // Date filter - handle both date object and string formats
          const matchDate = !filters.date || 
            (filters.date && report.date === format(filters.date, 'yyyy-MM-dd'));
          
          return matchManager && matchEmployee && matchShift && matchDate;
        } catch (error) {
          console.error('Error filtering report:', error, report);
          return false;
        }
      });
      
      console.log('Filtered reports count:', filtered.length);
      return filtered;
    }, [formattedReports, filters, employees, managers, attendanceList]); // Removed dataVersion dependency
    
    // Updated refresh handler that ensures data is refreshed
    const handleRefresh = useCallback(async () => {
      try {
        // Force a fresh fetch by adding a timestamp to bypass cache
        const currentFilters = {
          managerId: filters.managerId || undefined,
          employeeId: filters.employeeId || undefined,
          startDate: filters.startDate,
          endDate: filters.endDate,
          order: filters.order,
          _timestamp: Date.now(), // Add timestamp to force fresh fetch
        };
        
        await dispatch(fetchAttendance(currentFilters) as any);
        
      } catch (error) {
        console.error('Failed to refresh data:', error);
      }
    }, [filters.managerId, filters.employeeId, filters.startDate, filters.endDate, filters.order, dispatch]);

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
                                                                {/* Reports Header */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            Reports ({filteredReports.length})
                          </h3>
                          {filters.shift && selectedIds.length > 0 && (
                            <span className="text-sm text-blue-600 dark:text-blue-400 font-medium bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
                              {selectedIds.length} selected
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2 items-center">
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
                      
                      {/* Full Width Bulk Update Button */}
                      {filters.shift && selectedIds.length > 0 && (
                        <div className="mb-4">
                          <BulkUpdateModal
                            selectedIds={selectedIds}
                            onSuccess={() => {
                              setSelectedIds([]);
                              handleRefresh();
                            }}
                            currentFilters={{
                              managerId: filters.managerId,
                              employeeId: filters.employeeId,
                              startDate: filters.startDate,
                              endDate: filters.endDate,
                              order: filters.order,
                            }}
                            selectedRecords={selectedIds.map(id => {
                              const report = filteredReports.find(r => r._id === id);
                              return {
                                _id: id,
                                date: report?.date || '',
                                stepIn: report?.clockIn || '',
                                stepOut: report?.clockOut || ''
                              };
                            })}
                            trigger={
                              <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 touch-button shadow-sm">
                                <Edit3 className="h-4 w-4" />
                                Bulk Update {selectedIds.length} Record{selectedIds.length !== 1 ? 's' : ''}
                              </button>
                            }
                          />
                        </div>
                      )}
                    
                    {filteredReports.length === 0 ? (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        No reports found
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {/* Mobile Select All Header */}
                        {filters.shift && (
                          <div className="flex items-center gap-3 mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                            <input
                              type="checkbox"
                              checked={filteredReports.length > 0 && filteredReports.every(report => 
                                selectedIds.includes(report._id || '')
                              )}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedIds(filteredReports.map(report => report._id || '').filter(Boolean));
                                } else {
                                  setSelectedIds([]);
                                }
                              }}
                              className="h-5 w-5 rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                            />
                            <div className="flex-1">
                              <span className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                                Select All ({filteredReports.length} records)
                              </span>
                              {selectedIds.length > 0 && (
                                <div className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                                  {selectedIds.length} of {filteredReports.length} selected
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {filteredReports.map((report) => (
                          <div key={report._id} className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                {filters.shift && (
                                  <input
                                    type="checkbox"
                                    checked={selectedIds.includes(report._id || '')}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedIds(prev => [...prev, report._id || '']);
                                      } else {
                                        setSelectedIds(prev => prev.filter(id => id !== report._id));
                                      }
                                    }}
                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                                  />
                                )}
                                <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate pr-2">
                                  {report.employee}
                                </h4>
                              </div>
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
                        
                        {/* Mobile Bulk Update Button */}
                        {filters.shift && selectedIds.length > 0 && (
                          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                            <BulkUpdateModal
                              selectedIds={selectedIds}
                              onSuccess={() => {
                                setSelectedIds([]);
                                handleRefresh();
                              }}
                              currentFilters={{
                                managerId: filters.managerId,
                                employeeId: filters.employeeId,
                                startDate: filters.startDate,
                                endDate: filters.endDate,
                                order: filters.order,
                              }}
                              selectedRecords={selectedIds.map(id => {
                                const report = filteredReports.find(r => r._id === id);
                                return {
                                  _id: id,
                                  date: report?.date || '',
                                  stepIn: report?.clockIn || '',
                                  stepOut: report?.clockOut || ''
                                };
                              })}
                              trigger={
                                <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors touch-button">
                                  <Edit3 className="inline mr-2 h-4 w-4" />
                                  Bulk Update {selectedIds.length} Record{selectedIds.length !== 1 ? 's' : ''}
                                </button>
                              }
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Desktop Table Layout */}
                <div className="hidden sm:block">
                  <ReportsTable 
                    key={`reports-${attendanceList.length}`} // Force re-render when data changes
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
                      shift: filters.shift,
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