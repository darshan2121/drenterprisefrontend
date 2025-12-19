"use client";

import { useState, useEffect, useCallback } from "react";
import { format, eachDayOfInterval, startOfDay, endOfDay, isSameDay } from "date-fns";
import { Calendar as CalendarIcon, RefreshCw, Loader2, FileDown } from "lucide-react";

// Lazy load heavy libraries only when needed
const loadXLSX = () => import("xlsx").then(mod => mod.default || mod);
const loadPDF = async () => {
  const [jsPDF, autoTable] = await Promise.all([
    import("jspdf").then(mod => mod.default),
    import("jspdf-autotable").then(mod => mod.default)
  ]);
  return { jsPDF, autoTable };
};
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ENDPOINTS } from "@/lib/endpoints";
import { http } from "@/lib/http";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDispatch, useSelector } from "react-redux";
import { fetchEmployees } from "@/store/slices/employeeSlice";
import { RootState } from "@/store";

interface SummaryData {
  date: string;
  shift: string;
  totalEmployees: number;
  presentEmployees: number;
  summary: string;
}

interface DailySummary {
  date: string;
  morning: SummaryData | null;
  evening: SummaryData | null;
  night: SummaryData | null;
  _uniqueEmployeeDays?: number; // Unique employee count for this date
}

export function SummaryReport() {
  const dispatch = useDispatch();
  const employees = useSelector((state: RootState) => state.employee.employees);
  const [fromDate, setFromDate] = useState<Date | undefined>(new Date());
  const [toDate, setToDate] = useState<Date | undefined>(new Date());
  const [rangeSummaries, setRangeSummaries] = useState<DailySummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMobile = useIsMobile();

  // Fetch employees on mount (same as Muster Roll)
  useEffect(() => {
    dispatch(fetchEmployees() as any);
  }, [dispatch]);

  // Generate array of dates between fromDate and toDate
  const getDateRange = useCallback(() => {
    if (!fromDate || !toDate) return [];
    
    const start = startOfDay(fromDate);
    const end = startOfDay(toDate);
    
    // If fromDate is after toDate, swap them
    if (start > end) {
      return eachDayOfInterval({ start: end, end: start });
    }
    
    return eachDayOfInterval({ start, end });
  }, [fromDate, toDate]);

  const fetchRangeData = useCallback(async () => {
    if (!fromDate || !toDate) {
      setError("Please select both From and To dates");
      return;
    }

    // Ensure employees are loaded first (same as Muster Roll)
    if (employees.length === 0) {
      console.log("⏳ Waiting for employees to load...");
      await dispatch(fetchEmployees() as any);
      // Wait a bit for Redux state to update
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    setLoading(true);
    setError(null);

    try {
      const dateRange = getDateRange();
      const shifts = ['morning', 'evening', 'night'];
      
      // Fetch attendance data for unique employee-day calculation
      const startDateStr = format(dateRange[0], "yyyy-MM-dd");
      const endDateStr = format(dateRange[dateRange.length - 1], "yyyy-MM-dd");
      
      // Fetch attendance data and shift summaries in parallel
      const [attendanceResponse, ...shiftPromises] = await Promise.all([
        http<{ attendance: any[] }>(`${ENDPOINTS.attendance.all}?startDate=${startDateStr}&endDate=${endDateStr}&order=asc`),
        ...dateRange.flatMap(date => {
          const dateString = format(date, "yyyy-MM-dd");
          return shifts.map(shift =>
            http<SummaryData>(
              `${ENDPOINTS.attendance.summary}?date=${dateString}&shift=${shift}`
            ).catch(err => {
              console.error(`Error fetching ${dateString} ${shift} shift:`, err);
              return null;
            })
          );
        })
      ]);

      // Normalize attendance array from API response
      const attendanceArray = Array.isArray(attendanceResponse) ? attendanceResponse : 
        (attendanceResponse as any)?.attendance || (attendanceResponse as any)?.data || [];

      console.log("📊 Summary Report - Attendance data:", {
        totalRecords: attendanceArray.length,
        dateRange: `${startDateStr} to ${endDateStr}`,
        employeesInSystem: employees.length,
        sampleRecord: attendanceArray[0]
      });

      // Create a Set of valid employee IDs (only count employees that exist in the system)
      // This matches Muster Roll's logic - it only counts employees from the employees list
      const validEmployeeIds = new Set<string>();
      employees.forEach((emp: any) => {
        if (emp?._id) {
          // Normalize ID to string for consistent comparison
          const empId = String(emp._id);
          validEmployeeIds.add(empId);
        }
      });

      console.log("📊 Valid employees count:", validEmployeeIds.size);
      console.log("📊 Sample valid employee IDs:", Array.from(validEmployeeIds).slice(0, 5));
      
      // Debug: Check sample attendance record employee IDs
      const sampleEmpIds = attendanceArray.slice(0, 10).map((r: any) => {
        // Use same extraction logic as Muster Roll
        const id = r?.employeeId?._id || r?.employeeId || r?.employee?._id;
        const normalizedId = id ? String(id) : null;
        return { 
          id: normalizedId, 
          isValid: normalizedId ? validEmployeeIds.has(normalizedId) : false,
          employeeIdType: typeof r?.employeeId,
          employeeIdValue: r?.employeeId
        };
      });
      console.log("📊 Sample attendance employee IDs:", sampleEmpIds);
      
      // Count how many unique employee IDs are in attendance but not in employees list
      const attendanceEmpIds = new Set<string>();
      attendanceArray.forEach((r: any) => {
        const id = r?.employeeId?._id || r?.employeeId || r?.employee?._id;
        if (id) attendanceEmpIds.add(String(id));
      });
      const missingFromEmployees = Array.from(attendanceEmpIds).filter(id => !validEmployeeIds.has(id));
      console.log("📊 Employee IDs in attendance but NOT in employees list:", missingFromEmployees.length);
      console.log("📊 Sample missing IDs:", missingFromEmployees.slice(0, 5));

      // Calculate unique employee-days per date
      // CRITICAL: Match Muster Roll's exact logic:
      // 1. Filter attendance by month/year FIRST (like monthlyAttendance)
      // 2. Build attendance map from filtered records
      // 3. Iterate through ALL employees (not attendance records)
      // 4. For each employee, count how many days they were present
      // 5. Sum all present days across all employees
      
      // Extract month and year from dateRange (should all be same month)
      const firstDate = dateRange[0];
      const selectedYear = firstDate.getFullYear();
      const selectedMonth = firstDate.getMonth();
      
      // Filter attendance by month/year FIRST (exactly like Muster Roll's monthlyAttendance)
      const monthlyAttendance = attendanceArray.filter((record: any) => {
        if (!record?.stepIn) return false;
        const date = new Date(record.stepIn);
        return (
          date.getMonth() === selectedMonth && date.getFullYear() === selectedYear
        );
      });
      
      console.log("📊 Filtered monthly attendance:", {
        totalRecords: attendanceArray.length,
        monthlyRecords: monthlyAttendance.length,
        year: selectedYear,
        month: selectedMonth
      });
      
      // Build attendance map exactly like Muster Roll does (using filtered records)
      // CRITICAL: Keep only the LATEST record per employee per day (matching Attendance Reports logic)
      const attendanceMap = new Map<string, any>();
      monthlyAttendance.forEach((record: any) => {
        if (!record?._id && !record?.id) return; // Skip invalid records
        const empId = record?.employeeId?._id || record?.employeeId || record?.employee?._id;
        const keyDate = record?.stepIn
          ? new Date(record.stepIn).toISOString().split("T")[0]
          : null;
        if (!empId || !keyDate) return;
        
        // Keep only the latest record per employee per day (deduplication)
        const key = `${empId}_${keyDate}`;
        const existing = attendanceMap.get(key);
        const recordTimestamp = record?.stepIn ? new Date(record.stepIn).getTime() : 0;
        const existingTimestamp = existing?.stepIn ? new Date(existing.stepIn).getTime() : 0;
        if (!existing || recordTimestamp > existingTimestamp) {
          attendanceMap.set(key, record);
        }
      });

      // Now calculate exactly like Muster Roll: iterate through employees and count their present days
      // CRITICAL: Use the same date logic as Muster Roll - it uses day numbers, not Date objects
      const uniqueEmployeeDaysByDate = new Map<string, Set<string>>();
      
      // For each employee, count their present days (matching Muster Roll's totalsByEmployee logic)
      // Note: selectedYear and selectedMonth are already defined above
      employees.forEach((emp: any) => {
        if (!emp?._id) return;
        const empId = String(emp._id);
        
        // Only count if employee is in valid list (though all should be)
        if (!validEmployeeIds.has(empId)) return;
        
        // Check each date in the range using Muster Roll's exact logic
        dateRange.forEach((date) => {
          // CRITICAL FIX: Use Date.UTC() to avoid timezone issues (same as Muster Roll)
          // Format date directly from dateRange to ensure correct date string
          const dateString = format(date, "yyyy-MM-dd");
          
          // Use UTC date construction for matching (same as Muster Roll's getAttendanceStatus)
          const day = date.getDate();
          const targetDate = new Date(Date.UTC(selectedYear, selectedMonth, day));
          
          // Use Muster Roll's exact map key format
          const mapKey = `${empId}_${dateString}`;
          const record = attendanceMap.get(mapKey);
          
          // Use Muster Roll's exact status checking logic
          if (record) {
            // Check status using same logic as getStatusFromRecord
            let isPresent = false;
            
            // Prefer explicit status field
            if (record.status) {
              const normalized = String(record.status).toLowerCase();
              if (normalized === "present") {
                isPresent = true;
              }
            } else if (record.stepOut) {
              // Has stepOut = Present
              isPresent = true;
            } else if (record.stepIn && !record.stepOut) {
              // Check if same day using UTC dates
              const recordDate = new Date(record.stepIn);
              const recordDateStr = recordDate.toISOString().split("T")[0];
              isPresent = recordDateStr === dateString;
            }
            
            // Only count if present (status === "P")
            if (isPresent) {
              if (!uniqueEmployeeDaysByDate.has(dateString)) {
                uniqueEmployeeDaysByDate.set(dateString, new Set());
              }
              uniqueEmployeeDaysByDate.get(dateString)!.add(empId);
            }
          }
        });
      });

      // Debug: Log unique counts per date
      const dateCounts = Array.from(uniqueEmployeeDaysByDate.entries()).map(([date, set]) => ({
        date,
        count: set.size
      }));
      
      // Count how many records were filtered out (for debugging)
      let filteredOutCount = 0;
      let filteredOutEmpIds = new Set<string>();
      attendanceArray.forEach((record: any) => {
        if (!record?.stepIn) return;
        // Use same extraction logic as in the main loop
        let empId: string | null = null;
        if (record?.employeeId) {
          if (typeof record.employeeId === 'string') {
            empId = record.employeeId;
          } else if (record.employeeId._id) {
            empId = String(record.employeeId._id);
          }
        }
        if (!empId && record?.employee?._id) {
          empId = String(record.employee._id);
        }
        if (empId && !validEmployeeIds.has(String(empId))) {
          filteredOutCount++;
          filteredOutEmpIds.add(String(empId));
        }
      });
      
      console.log("📊 Unique employee-days by date:", dateCounts);
      const totalUniqueDays = dateCounts.reduce((sum, d) => sum + d.count, 0);
      console.log("📊 Total unique employee-days (filtered):", totalUniqueDays);
      console.log("📊 Attendance records filtered out (deleted employees):", filteredOutCount);
      console.log("📊 Unique employee IDs filtered out:", filteredOutEmpIds.size);
      console.log("📊 Sample filtered employee IDs:", Array.from(filteredOutEmpIds).slice(0, 5));
      console.log("📊 Expected match with Muster Roll:", totalUniqueDays === 3267 ? "✅ MATCH" : `❌ DIFFERENCE: ${totalUniqueDays - 3267}`);
      
      // Organize results by date
      const summaries: DailySummary[] = dateRange.map((date, dateIndex) => {
        const dateString = format(date, "yyyy-MM-dd");
        const baseIndex = dateIndex * 3;
        
        // Get unique employee count for this date
        const uniqueCount = uniqueEmployeeDaysByDate.get(dateString)?.size || 0;
        
        return {
          date: dateString,
          morning: shiftPromises[baseIndex] && typeof shiftPromises[baseIndex] === 'object' && shiftPromises[baseIndex]?.date ? shiftPromises[baseIndex] as SummaryData : null,
          evening: shiftPromises[baseIndex + 1] && typeof shiftPromises[baseIndex + 1] === 'object' && shiftPromises[baseIndex + 1]?.date ? shiftPromises[baseIndex + 1] as SummaryData : null,
          night: shiftPromises[baseIndex + 2] && typeof shiftPromises[baseIndex + 2] === 'object' && shiftPromises[baseIndex + 2]?.date ? shiftPromises[baseIndex + 2] as SummaryData : null,
          _uniqueEmployeeDays: uniqueCount, // Store unique count for total calculation
        };
      });

      console.log("Range Summaries:", summaries);
      setRangeSummaries(summaries);
      setError(null);
    } catch (err: any) {
      console.error("Error fetching range summary:", err);
      setError(err?.message || "Failed to fetch summary. Please try again.");
      setRangeSummaries([]);
    } finally {
      setLoading(false);
    }
      }, [fromDate, toDate, getDateRange, employees, dispatch]);

  useEffect(() => {
    // Auto-fetch when both dates are selected AND employees are loaded
    // This ensures we have employees list before calculating (same as Muster Roll)
    if (fromDate && toDate && employees.length > 0) {
      fetchRangeData();
    } else if (fromDate && toDate && employees.length === 0) {
      // If employees aren't loaded yet, fetch them first
      dispatch(fetchEmployees() as any);
    } else {
      setRangeSummaries([]);
    }
  }, [fromDate, toDate, fetchRangeData, employees.length, dispatch]);

  const formatDateForTable = (dateString: string) => {
    return format(new Date(dateString), "dd-MM-yyyy");
  };

  // Calculate totals for all dates
  // This matches Muster Roll Report: sum of all employee present days
  const getTotals = () => {
    let morningTotal = 0;
    let eveningTotal = 0;
    let nightTotal = 0;
    let grandTotal = 0;

    rangeSummaries.forEach(summary => {
      morningTotal += summary.morning?.presentEmployees || 0;
      eveningTotal += summary.evening?.presentEmployees || 0;
      nightTotal += summary.night?.presentEmployees || 0;
      // Use unique employee-days count - this matches Muster Roll's sum of totals.present
      // Each employee-day is counted once, matching how Muster Roll counts present days per employee
      grandTotal += summary._uniqueEmployeeDays || 0;
    });

    console.log("📊 Summary Report Totals:", {
      morning: morningTotal,
      evening: eveningTotal,
      night: nightTotal,
      grandTotal: grandTotal,
      dateRange: rangeSummaries.map(s => s.date),
      uniqueCounts: rangeSummaries.map(s => ({ date: s.date, count: s._uniqueEmployeeDays }))
    });

    return {
      morning: morningTotal,
      evening: eveningTotal,
      night: nightTotal,
      total: grandTotal // Sum of unique employee-days, matching Muster Roll
    };
  };

  const totals = getTotals();
  const dateRange = getDateRange();

  // Excel Export Handler
  const handleExportExcel = async () => {
    if (rangeSummaries.length === 0) {
      return;
    }

    try {
      const XLSX = await loadXLSX();
      
      // Prepare data for Excel
      const excelData = rangeSummaries.map((summary) => ({
        Date: formatDateForTable(summary.date),
        Morning: summary.morning?.presentEmployees || 0,
        Evening: summary.evening?.presentEmployees || 0,
        Night: summary.night?.presentEmployees || 0,
        Total: summary._uniqueEmployeeDays || 0,
      }));

      // Add totals row
      excelData.push({
        Date: "TOTAL",
        Morning: totals.morning,
        Evening: totals.evening,
        Night: totals.night,
        Total: totals.total,
      });

      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Summary Report");
      
      const filename = `summary-report-${fromDate ? format(fromDate, "yyyy-MM-dd") : "report"}-to-${toDate ? format(toDate, "yyyy-MM-dd") : "report"}.xlsx`;
      
      if (typeof window !== "undefined" && (window as any).ReactNativeWebView) {
        const wbout = XLSX.write(workbook, { type: "base64", bookType: "xlsx" });
        (window as any).ReactNativeWebView?.postMessage(
          JSON.stringify({
            type: "download",
            fileType: "xlsx",
            fileName: filename,
            data: wbout,
          })
        );
      } else {
        XLSX.writeFile(workbook, filename);
      }
    } catch (error) {
      console.error("Error exporting to Excel:", error);
    }
  };

  // PDF Export Handler
  const handleExportPDF = async () => {
    if (rangeSummaries.length === 0) {
      return;
    }

    try {
      const { jsPDF, autoTable } = await loadPDF();
      const doc = new jsPDF("landscape");

      // Title
      doc.setFontSize(16);
      doc.text("Summary Report", 14, 15);
      
      if (fromDate && toDate) {
        doc.setFontSize(12);
        doc.text(
          `Date Range: ${format(fromDate, "dd-MM-yyyy")} to ${format(toDate, "dd-MM-yyyy")}`,
          14,
          22
        );
      }

      // Prepare table data
      const tableData = rangeSummaries.map((summary) => [
        formatDateForTable(summary.date),
        summary.morning?.presentEmployees || 0,
        summary.evening?.presentEmployees || 0,
        summary.night?.presentEmployees || 0,
        summary._uniqueEmployeeDays || 0,
      ]);

      // Add totals row
      tableData.push([
        "TOTAL",
        totals.morning,
        totals.evening,
        totals.night,
        totals.total,
      ]);

      (autoTable as any)(doc, {
        head: [["Date", "Morning", "Evening", "Night", "Total"]],
        body: tableData,
        startY: fromDate && toDate ? 28 : 22,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [59, 130, 246], textColor: 255 },
        alternateRowStyles: { fillColor: [245, 247, 250] },
      });

      const filename = `summary-report-${fromDate ? format(fromDate, "yyyy-MM-dd") : "report"}-to-${toDate ? format(toDate, "yyyy-MM-dd") : "report"}.pdf`;
      
      if (typeof window !== "undefined" && (window as any).ReactNativeWebView) {
        const pdfBlob = doc.output("blob");
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = (reader.result as string).split(",")[1];
          (window as any).ReactNativeWebView?.postMessage(
            JSON.stringify({
              type: "download",
              fileType: "pdf",
              fileName: filename,
              data: base64data,
            })
          );
        };
        reader.readAsDataURL(pdfBlob);
      } else {
        doc.save(filename);
      }
    } catch (error) {
      console.error("Error exporting to PDF:", error);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Summary Report"
        subtitle="View attendance count by date range for all shifts"
      />

      <Card className="w-full border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Select Date Range</CardTitle>
          <CardDescription>
            Choose From and To dates to view the attendance summary for all shifts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* From Date Picker */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal h-10 sm:h-9 text-sm sm:text-base",
                    !fromDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {fromDate ? format(fromDate, "PPP") : <span>From Date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align={isMobile ? "center" : "start"}>
                <Calendar
                  mode="single"
                  selected={fromDate}
                  onSelect={(date) => {
                    setFromDate(date);
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            {/* To Date Picker */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal h-10 sm:h-9 text-sm sm:text-base",
                    !toDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {toDate ? format(toDate, "PPP") : <span>To Date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align={isMobile ? "center" : "start"}>
                <Calendar
                  mode="single"
                  selected={toDate}
                  onSelect={(date) => {
                    setToDate(date);
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={fetchRangeData}
              disabled={loading || !fromDate || !toDate}
              className="w-full sm:w-auto"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </>
              )}
            </Button>
            
            {/* Download Buttons */}
            {rangeSummaries.length > 0 && (
              <>
                <Button
                  onClick={handleExportExcel}
                  variant="outline"
                  className="w-full sm:w-auto"
                  disabled={loading}
                >
                  <FileDown className="mr-2 h-4 w-4" />
                  Excel
                </Button>
                <Button
                  onClick={handleExportPDF}
                  variant="outline"
                  className="w-full sm:w-auto"
                  disabled={loading}
                >
                  <FileDown className="mr-2 h-4 w-4" />
                  PDF
                </Button>
              </>
            )}
          </div>

          {/* Date Range Info */}
          {fromDate && toDate && (
            <div className="text-sm text-muted-foreground">
              Showing {dateRange.length} day{dateRange.length !== 1 ? 's' : ''} ({format(fromDate, "dd-MM-yyyy")} to {format(toDate, "dd-MM-yyyy")})
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="w-full border-0 shadow-sm border-red-200 bg-red-50 dark:bg-red-900/20">
          <CardContent className="pt-6">
            <div className="text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Display */}
      {rangeSummaries.length > 0 && !error && (
        <>
          {/* Mobile Card Layout */}
          {isMobile ? (
            <div className="space-y-4">
              {rangeSummaries.map((summary, index) => {
                const dateTotals = {
                  morning: summary.morning?.presentEmployees || 0,
                  evening: summary.evening?.presentEmployees || 0,
                  night: summary.night?.presentEmployees || 0,
                  // Use unique employee-days count to match Muster Roll
                  total: summary._uniqueEmployeeDays || 0
                };

                return (
                  <Card key={summary.date} className="w-full border-0 shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">{formatDateForTable(summary.date)}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Morning Shift */}
                      <div className="bg-muted/30 rounded-lg p-3">
                        <div className="text-xs font-medium text-muted-foreground mb-1">Morning Shift</div>
                        {summary.morning ? (
                          <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                            {summary.morning.summary}
                          </div>
                        ) : (
                          <div className="text-muted-foreground">-</div>
                        )}
                      </div>

                      {/* Evening Shift */}
                      <div className="bg-muted/30 rounded-lg p-3">
                        <div className="text-xs font-medium text-muted-foreground mb-1">Evening Shift</div>
                        {summary.evening ? (
                          <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                            {summary.evening.summary}
                          </div>
                        ) : (
                          <div className="text-muted-foreground">-</div>
                        )}
                      </div>

                      {/* Night Shift */}
                      <div className="bg-muted/30 rounded-lg p-3">
                        <div className="text-xs font-medium text-muted-foreground mb-1">Night Shift</div>
                        {summary.night ? (
                          <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                            {summary.night.summary}
                          </div>
                        ) : (
                          <div className="text-muted-foreground">-</div>
                        )}
                      </div>

                      {/* Daily Total */}
                      <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3 border border-emerald-200 dark:border-emerald-800">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-semibold text-muted-foreground">Daily Total</div>
                          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                            {dateTotals.total}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {/* Grand Total Card */}
              <Card className="bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-200 dark:border-emerald-800">
                <CardContent className="p-4">
                  <div className="text-sm font-semibold text-muted-foreground mb-2">Grand Total</div>
                  <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mb-2">
                    {totals.total}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Morning: {totals.morning} | Evening: {totals.evening} | Night: {totals.night}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            /* Desktop Table Layout */
            <Card className="w-full border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Attendance Summary</CardTitle>
                <CardDescription>
                  Employee count from {fromDate && format(fromDate, "dd-MM-yyyy")} to {toDate && format(toDate, "dd-MM-yyyy")} ({dateRange.length} days)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-semibold">Date</TableHead>
                        <TableHead className="font-semibold text-center">Morning Shift</TableHead>
                        <TableHead className="font-semibold text-center">Evening Shift</TableHead>
                        <TableHead className="font-semibold text-center">Night Shift</TableHead>
                        <TableHead className="font-semibold text-center">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rangeSummaries.map((summary) => {
                        const dateTotals = {
                          morning: summary.morning?.presentEmployees || 0,
                          evening: summary.evening?.presentEmployees || 0,
                          night: summary.night?.presentEmployees || 0,
                          // Use unique employee-days count to match Muster Roll
                          total: summary._uniqueEmployeeDays || 0
                        };

                        return (
                          <TableRow key={summary.date}>
                            <TableCell className="font-medium">
                              {formatDateForTable(summary.date)}
                            </TableCell>
                            <TableCell className="text-center">
                              {summary.morning ? (
                                <div className="flex flex-col">
                                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                    {summary.morning.summary}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {summary.morning.presentEmployees} / {summary.morning.totalEmployees}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {summary.evening ? (
                                <div className="flex flex-col">
                                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                    {summary.evening.summary}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {summary.evening.presentEmployees} / {summary.evening.totalEmployees}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {summary.night ? (
                                <div className="flex flex-col">
                                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                    {summary.night.summary}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {summary.night.presentEmployees} / {summary.night.totalEmployees}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center font-semibold">
                              <div className="flex flex-col">
                                <span className="text-emerald-600 dark:text-emerald-400">
                                  {dateTotals.total}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  Total Present
                                </span>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {/* Total Row */}
                      <TableRow className="bg-muted/30 font-semibold">
                        <TableCell className="font-semibold">Total</TableCell>
                        <TableCell className="text-center font-semibold">
                          {totals.morning}
                        </TableCell>
                        <TableCell className="text-center font-semibold">
                          {totals.evening}
                        </TableCell>
                        <TableCell className="text-center font-semibold">
                          {totals.night}
                        </TableCell>
                        <TableCell className="text-center font-semibold text-emerald-600 dark:text-emerald-400">
                          {totals.total}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {rangeSummaries.length === 0 && !error && fromDate && toDate && !loading && (
        <Card className="w-full border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              Select From and To dates to view the summary
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default SummaryReport;
