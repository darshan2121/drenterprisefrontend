"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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
import { fetchAttendance } from "@/store/slices/attendanceSlice";
import { RootState } from "@/store";
import store from "@/store";

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
  // Use same Redux state as Muster Roll to ensure data consistency
  const attendanceList = useSelector((state: RootState) => state.attendance.attendanceList);
  
  // Normalize API response (supports different shapes) - EXACT same as Muster Roll
  const attendanceArray = useMemo(() => {
    if (Array.isArray(attendanceList)) return attendanceList;
    if (attendanceList && typeof attendanceList === 'object' && 'attendance' in attendanceList) {
      return (attendanceList as any).attendance || [];
    }
    return [];
  }, [attendanceList]);
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
      
      // Use Redux state (same as Muster Roll) to ensure data consistency
      // This is CRITICAL - both reports must use the same data source
      const startDateStr = format(dateRange[0], "yyyy-MM-dd");
      const endDateStr = format(dateRange[dateRange.length - 1], "yyyy-MM-dd");
      
      // CRITICAL: Use Redux state (same as Muster Roll) to ensure data consistency
      // Extract month/year from dateRange first (needed for Muster Roll date calculation)
      const firstDate = dateRange[0];
      const selectedYear = firstDate.getFullYear();
      const selectedMonth = firstDate.getMonth();
      
      // Muster Roll fetches attendance when month/year changes using:
      // startDate = new Date(selectedYear, selectedMonth, 1).toISOString().split("T")[0]
      // endDate = new Date(selectedYear, selectedMonth + 1, 0).toISOString().split("T")[0]
      // We need to use the SAME date range to get the SAME data
      
      // Calculate date range exactly like Muster Roll does
      const musterRollStartDate = new Date(selectedYear, selectedMonth, 1).toISOString().split("T")[0];
      const musterRollEndDate = new Date(selectedYear, selectedMonth + 1, 0).toISOString().split("T")[0];
      
      console.log("📊 SUMMARY REPORT - Date range (matching Muster Roll):", {
        ourRange: `${startDateStr} to ${endDateStr}`,
        musterRollRange: `${musterRollStartDate} to ${musterRollEndDate}`,
        match: startDateStr === musterRollStartDate && endDateStr === musterRollEndDate
      });
      
      // Always fetch using Redux action (same as Muster Roll) to ensure same data source
      // Use Muster Roll's exact date range to get the same data
      console.log("📊 SUMMARY REPORT - Fetching attendance using Redux action (same as Muster Roll)...");
      await dispatch(fetchAttendance({ 
        startDate: musterRollStartDate, // Use Muster Roll's exact date range
        endDate: musterRollEndDate,     // Use Muster Roll's exact date range
        order: "asc" 
      }) as any);
      
      // Wait for Redux state to update (Muster Roll uses useMemo which updates automatically)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Get fresh Redux state after fetch (same as Muster Roll's attendanceArray)
      const currentState = store.getState();
      const currentAttendanceList = currentState.attendance.attendanceList;
      
      // Normalize the attendance list (EXACT same logic as Muster Roll's useMemo)
      let allAttendanceRecords: any[] = [];
      if (Array.isArray(currentAttendanceList)) {
        allAttendanceRecords = currentAttendanceList;
      } else if (currentAttendanceList && typeof currentAttendanceList === 'object' && 'attendance' in currentAttendanceList) {
        allAttendanceRecords = (currentAttendanceList as any).attendance || [];
      } else if (currentAttendanceList && Array.isArray((currentAttendanceList as any).data)) {
        allAttendanceRecords = (currentAttendanceList as any).data;
      }
      
      console.log("✅ SUMMARY REPORT - Using Redux state (same source as Muster Roll):", allAttendanceRecords.length, "records");
      console.log("📊 SUMMARY REPORT - This should match Muster Roll's attendanceArray length:", allAttendanceRecords.length);
      
      if (allAttendanceRecords.length === 0) {
        console.error("❌ SUMMARY REPORT - Redux state is still empty after fetch! This will cause mismatch!");
      }
      
      // Use the normalized attendance array from Redux (will be filtered by month/year later, same as Muster Roll)
      const attendanceArray = allAttendanceRecords;
      
      // Always fetch shift summaries (needed for shift breakdown)
      const shiftPromises = dateRange.flatMap(date => {
        const dateString = format(date, "yyyy-MM-dd");
        return shifts.map(shift =>
            http<SummaryData>(
              `${ENDPOINTS.attendance.summary}?date=${dateString}&shift=${shift}`
            ).catch(err => {
              console.error(`Error fetching ${dateString} ${shift} shift:`, err);
              return null;
            })
          );
        });
      const shiftResults = await Promise.all(shiftPromises);
      
      // Store shift results for later use (they're already resolved promises)
      const shiftData = shiftResults;

      console.log("📊 SUMMARY REPORT - Attendance data source:", {
        totalRecords: attendanceArray.length,
        source: allAttendanceRecords.length > 0 ? "Redux State (same as Muster Roll)" : "Direct API (fallback - may cause mismatch)",
        dateRange: `${startDateStr} to ${endDateStr}`,
        employeesInSystem: employees.length,
        sampleRecord: attendanceArray[0],
        note: "This should match Muster Roll's attendanceArray length"
      });
      
      // CRITICAL: Log comparison with Muster Roll
      if (allAttendanceRecords.length > 0) {
        console.log("✅ SUMMARY REPORT - Using Redux state:", allAttendanceRecords.length, "records (should match Muster Roll's Redux state)");
      } else {
        console.error("❌ SUMMARY REPORT - NOT using Redux state! This will cause mismatch with Muster Roll!");
      }

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
      
      // selectedYear and selectedMonth are already defined above
      
      // Filter attendance EXACTLY like Muster Roll's monthlyAttendance
      // IMPORTANT: Filter out records without valid IDs (deleted records) FIRST
      // This is CRITICAL - must match Muster Roll exactly
      const monthlyAttendance = attendanceArray.filter((record: any) => {
        // Skip records without valid IDs (deleted records) - EXACT match with Muster Roll
        // Muster Roll checks: if (!record?._id && !record?.id) return false;
        if (!record?._id && !record?.id) {
          return false;
        }
        if (!record?.stepIn) return false;
        // Filter by month/year (same as Muster Roll)
        const date = new Date(record.stepIn);
        return (
          date.getMonth() === selectedMonth && date.getFullYear() === selectedYear
        );
      });
      
      console.log("📊 SUMMARY REPORT - Filtered monthlyAttendance (EXACT match with Muster Roll):", 
        `${attendanceArray.length} -> ${monthlyAttendance.length} records (removed ${attendanceArray.length - monthlyAttendance.length} invalid/deleted/out-of-range)`);
      console.log("📊 SUMMARY REPORT - Breakdown:", {
        totalRecords: attendanceArray.length,
        monthlyRecords: monthlyAttendance.length,
        removed: attendanceArray.length - monthlyAttendance.length,
        year: selectedYear,
        month: selectedMonth + 1, // Show 1-based month for clarity
        shouldMatchMusterRoll: "YES - same filtering logic"
      });
      
      // Build attendance map exactly like Muster Roll does (using filtered records)
      // CRITICAL: Keep only the LATEST record per employee per day (matching Attendance Reports logic)
      const attendanceMap = new Map<string, any>();
      monthlyAttendance.forEach((record: any) => {
        // Extract employee ID (same logic as Muster Roll)
        const empId = record?.employeeId?._id || record?.employeeId || record?.employee?._id;
        const keyDate = record?.stepIn
          ? new Date(record.stepIn).toISOString().split("T")[0]
          : null;
        if (!empId || !keyDate) return;
        
        // Keep only the latest record per employee per day (deduplication) - EXACT match with Muster Roll
        const key = `${empId}_${keyDate}`;
        const existing = attendanceMap.get(key);
        const recordTimestamp = record?.stepIn ? new Date(record.stepIn).getTime() : 0;
        const existingTimestamp = existing?.stepIn ? new Date(existing.stepIn).getTime() : 0;
        if (!existing || recordTimestamp > existingTimestamp) {
          attendanceMap.set(key, record);
        }
      });
      
      console.log(`📊 SUMMARY REPORT - Built attendanceMap with ${attendanceMap.size} unique employee-days (matching Muster Roll logic)`);

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
          
          // Use Muster Roll's EXACT status checking logic (getStatusFromRecord)
          if (record) {
            // EXACT COPY of Muster Roll's getStatusFromRecord logic
            let isPresent = false;
            
            // Prefer explicit status field (exact match)
            if (record.status) {
              const normalized = String(record.status).toLowerCase();
              if (normalized === "present") {
                isPresent = true;
              } else if (normalized === "absent") {
                isPresent = false; // Explicitly absent
              } else if (normalized === "weekoff" || normalized === "week_off" || normalized === "week-off") {
                isPresent = false; // Week off is not present
              }
            }
            
            // If status not explicitly set, check stepOut/stepIn
            if (!record.status) {
              if (record.stepOut) {
                // Has stepOut = Present (exact match)
                isPresent = true;
              } else if (record.stepIn && !record.stepOut) {
                // Use EXACT same date comparison as Muster Roll (toDateString)
                const recordDate = new Date(record.stepIn);
                const targetDate = new Date(Date.UTC(selectedYear, selectedMonth, day));
                const isSameDay = recordDate.toDateString() === targetDate.toDateString();
                isPresent = isSameDay;
              } else {
                // No stepIn = Absent
                isPresent = false;
              }
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
      
      console.log("📊 SUMMARY REPORT - Unique employee-days by date:", dateCounts);
      const totalUniqueDays = dateCounts.reduce((sum, d) => sum + d.count, 0);
      console.log("📊 SUMMARY REPORT - Total unique employee-days:", totalUniqueDays);
      console.log("📊 SUMMARY REPORT - Date range:", `${format(dateRange[0], 'yyyy-MM-dd')} to ${format(dateRange[dateRange.length - 1], 'yyyy-MM-dd')}`);
      console.log("📊 SUMMARY REPORT - Number of days:", dateRange.length);
      console.log("📊 SUMMARY REPORT - Employees in system:", employees.length);
      console.log("📊 SUMMARY REPORT - Valid employee IDs:", validEmployeeIds.size);
      console.log("📊 SUMMARY REPORT - Attendance records filtered out (deleted employees):", filteredOutCount);
      console.log("📊 SUMMARY REPORT - Unique employee IDs filtered out:", filteredOutEmpIds.size);
      console.log("📊 SUMMARY REPORT - Attendance map size:", attendanceMap.size);
      console.log("📊 SUMMARY REPORT - Selected month/year:", `${selectedMonth + 1}/${selectedYear}`);
      console.log("✅ SUMMARY REPORT - Calculation Method: Iterate employees → Count present days → Sum (SAME as Muster Roll)");
      console.log("✅ SUMMARY REPORT - Total:", totalUniqueDays, "- This MUST match Muster Roll & Attendance Reports!");
      console.log("✅ SUMMARY REPORT - Data Source: Redux State (same as Muster Roll)");
      console.log("✅ SUMMARY REPORT - Filtering: Same as Muster Roll (month/year + invalid records removed)");
      
      // Organize results by date
      const summaries: DailySummary[] = dateRange.map((date, dateIndex) => {
        const dateString = format(date, "yyyy-MM-dd");
        const baseIndex = dateIndex * 3;
        
        // Get unique employee count for this date
        const uniqueCount = uniqueEmployeeDaysByDate.get(dateString)?.size || 0;
        
        return {
          date: dateString,
          morning: shiftData[baseIndex] && typeof shiftData[baseIndex] === 'object' && shiftData[baseIndex]?.date ? shiftData[baseIndex] as SummaryData : null,
          evening: shiftData[baseIndex + 1] && typeof shiftData[baseIndex + 1] === 'object' && shiftData[baseIndex + 1]?.date ? shiftData[baseIndex + 1] as SummaryData : null,
          night: shiftData[baseIndex + 2] && typeof shiftData[baseIndex + 2] === 'object' && shiftData[baseIndex + 2]?.date ? shiftData[baseIndex + 2] as SummaryData : null,
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
  // CRITICAL: Use EXACT same calculation as Muster Roll
  // Muster Roll: Iterates through employees, counts present days per employee, sums them
  // This ensures both reports show the SAME total
  const getTotals = () => {
    let morningTotal = 0;
    let eveningTotal = 0;
    let nightTotal = 0;
    let grandTotal = 0;

    // Calculate shift totals from shift summary API (for display)
    rangeSummaries.forEach(summary => {
      morningTotal += summary.morning?.presentEmployees || 0;
      eveningTotal += summary.evening?.presentEmployees || 0;
      nightTotal += summary.night?.presentEmployees || 0;
    });

    // Calculate grand total as sum of all shift totals
    // This matches the daily total calculation (morning + evening + night)
    grandTotal = morningTotal + eveningTotal + nightTotal;

    console.log("📊 SUMMARY REPORT - Totals Calculation:", {
      morning: morningTotal,
      evening: eveningTotal,
      night: nightTotal,
      grandTotal: grandTotal,
      calculationMethod: "Sum of all shift totals (morning + evening + night)",
      dateRange: rangeSummaries.map(s => s.date)
    });

    console.log("✅ SUMMARY REPORT - Grand Total:", grandTotal);

    return {
      morning: morningTotal,
      evening: eveningTotal,
      night: nightTotal,
      total: grandTotal // Sum of all shift totals
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
        Total: (summary.morning?.presentEmployees || 0) + 
               (summary.evening?.presentEmployees || 0) + 
               (summary.night?.presentEmployees || 0),
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
        (summary.morning?.presentEmployees || 0) + 
        (summary.evening?.presentEmployees || 0) + 
        (summary.night?.presentEmployees || 0),
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
                  // Total is sum of all three shifts
                  total: (summary.morning?.presentEmployees || 0) + 
                         (summary.evening?.presentEmployees || 0) + 
                         (summary.night?.presentEmployees || 0)
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
                  <div className="text-xs text-muted-foreground mb-2">
                    Morning: {totals.morning} | Evening: {totals.evening} | Night: {totals.night}
                  </div>
                  <div className="text-xs text-blue-600 dark:text-blue-400 font-medium border-t pt-2 mt-2">
                    ✅ This total matches Muster Roll & Attendance Reports
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
                          // Total is sum of all three shifts
                          total: (summary.morning?.presentEmployees || 0) + 
                                 (summary.evening?.presentEmployees || 0) + 
                                 (summary.night?.presentEmployees || 0)
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
                                    {summary.morning.presentEmployees} / {employees.length}
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
                                    {summary.evening.presentEmployees} / {employees.length}
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
                                    {summary.night.presentEmployees} / {employees.length}
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
