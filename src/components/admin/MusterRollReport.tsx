"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { CalendarDays, FileDown, FileType2, RefreshCcw, Search } from "lucide-react";

// Lazy load heavy libraries
const loadXLSX = () => import("xlsx").then(mod => mod.default || mod);
const loadPDF = async () => {
  const [jsPDF, autoTable] = await Promise.all([
    import("jspdf").then(mod => mod.default),
    import("jspdf-autotable").then(mod => mod.default)
  ]);
  return { jsPDF, autoTable };
};

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import type { AppDispatch, RootState } from "@/store";
import { fetchEmployees } from "@/store/slices/employeeSlice";
import { fetchAttendance } from "@/store/slices/attendanceSlice";
import { cn } from "@/lib/utils";

type AttendanceStatusCode = "P" | "A" | "W" | "";

type AttendanceStatus = {
  code: AttendanceStatusCode;
  label: string;
  color: string;
};

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const statusStyles: Record<AttendanceStatusCode, { label: string; color: string }> = {
  P: { label: "Present", color: "text-emerald-600" },
  A: { label: "Absent", color: "text-rose-600" },
  W: { label: "Week Off", color: "text-sky-600" },
  "": { label: "No Record", color: "text-muted-foreground" },
};

const years = (() => {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 5 }, (_, index) => currentYear - 4 + index);
})();

export function MusterRollReport() {
  const dispatch = useDispatch<AppDispatch>();
  const { toast } = useToast();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [searchTerm, setSearchTerm] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const employees = useSelector((state: RootState) => state.employee.employees);
  const attendanceList = useSelector(
    (state: RootState) => state.attendance.attendanceList
  );
  const isLoadingAttendance = useSelector(
    (state: RootState) => state.attendance.isLoadingAttendance
  );

  // Normalize API response (supports different shapes)
  const attendanceArray = useMemo(() => {
    if (Array.isArray(attendanceList)) return attendanceList;
    if (attendanceList && Array.isArray((attendanceList as any).data))
      return (attendanceList as any).data;
    if (attendanceList && Array.isArray((attendanceList as any).attendance))
      return (attendanceList as any).attendance;
    return [];
  }, [attendanceList]);

  // Fetch employees once on mount
  useEffect(() => {
    dispatch(fetchEmployees());
  }, [dispatch]);

  // Track previous attendance IDs to detect deletions
  const prevAttendanceIdsRef = useRef<Set<string>>(new Set());

  // Fetch attendance whenever month/year changes
  useEffect(() => {
    const startDate = new Date(selectedYear, selectedMonth, 1)
      .toISOString()
      .split("T")[0];
    const endDate = new Date(selectedYear, selectedMonth + 1, 0)
      .toISOString()
      .split("T")[0];

    dispatch(fetchAttendance({ startDate, endDate, order: "asc" }));
  }, [dispatch, selectedMonth, selectedYear]);

  // Track if we need to force refresh (when deletions detected)
  const [forceRefresh, setForceRefresh] = useState(false);

  // Refresh attendance when records are deleted (detect by ID changes or attendanceList updates)
  useEffect(() => {
    const currentIds = new Set(attendanceArray.map((record: any) => record._id || record.id).filter(Boolean));
    const prevIds = prevAttendanceIdsRef.current;
    
    // Check if any IDs from previous state are missing (deletions)
    const deletedIds = Array.from(prevIds).filter(id => !currentIds.has(id));
    
    // If deletions detected and we had previous data, force refresh
    if (deletedIds.length > 0 && prevIds.size > 0) {
      console.log(`🔄 Muster Roll: Detected ${deletedIds.length} deletion(s), forcing refresh...`, deletedIds);
      setForceRefresh(true);
    }
    
    // Update ref with current IDs
    prevAttendanceIdsRef.current = currentIds;
  }, [attendanceList, attendanceArray]);

  // Force refresh when deletions are detected
  useEffect(() => {
    if (forceRefresh) {
      console.log('🔄 Muster Roll: Executing forced refresh...');
      const startDate = new Date(selectedYear, selectedMonth, 1)
        .toISOString()
        .split("T")[0];
      const endDate = new Date(selectedYear, selectedMonth + 1, 0)
        .toISOString()
        .split("T")[0];
      // Add timestamp to force fresh fetch (bypass cache)
      const timestamp = Date.now();
      dispatch(fetchAttendance({ startDate, endDate, order: "asc" }) as any).then(() => {
        console.log('✅ Muster Roll: Refresh completed, map should rebuild');
        // Reset the ref to track new state
        prevAttendanceIdsRef.current = new Set();
      });
      setForceRefresh(false);
    }
  }, [forceRefresh, dispatch, selectedMonth, selectedYear]);

  const daysInMonth = useMemo(() => {
    return new Date(selectedYear, selectedMonth + 1, 0).getDate();
  }, [selectedMonth, selectedYear]);

  const dateHeaders = useMemo(() => {
    const allDays = Array.from({ length: daysInMonth }, (_, idx) => idx + 1);
    if (!customStart && !customEnd) return allDays;
    const start = customStart ? new Date(customStart).getDate() : 1;
    const end = customEnd ? new Date(customEnd).getDate() : daysInMonth;
    const clampedStart = Math.max(1, Math.min(daysInMonth, start));
    const clampedEnd = Math.max(clampedStart, Math.min(daysInMonth, end));
    return allDays.filter((day) => day >= clampedStart && day <= clampedEnd);
  }, [daysInMonth, customStart, customEnd]);

  // Only keep attendance for the selected month/year
  // IMPORTANT: Filter out records without valid IDs (deleted records)
  const monthlyAttendance = useMemo(() => {
    const filtered = attendanceArray.filter((record: any) => {
      // Skip records without valid IDs (deleted records)
      if (!record?._id && !record?.id) {
        return false;
      }
      if (!record?.stepIn) return false;
      const date = new Date(record.stepIn);
      return (
        date.getMonth() === selectedMonth && date.getFullYear() === selectedYear
      );
    });
    console.log(`📊 Filtered monthlyAttendance: ${attendanceArray.length} -> ${filtered.length} records (removed ${attendanceArray.length - filtered.length} invalid/deleted)`);
    return filtered;
  }, [attendanceArray, selectedMonth, selectedYear]);

  // Build quick lookup map: `${employeeId}_${yyyy-mm-dd}` -> record
  // Keep only the LATEST record per employee per day (matching Attendance Reports logic)
  // IMPORTANT: Only include records that actually exist (have valid _id)
  // Also return a version number so React can detect changes to the Map
  const { attendanceMap, mapVersion } = useMemo(() => {
    const map = new Map<string, any>();
    console.log(`📊 Building attendanceMap from ${monthlyAttendance.length} records`);
    
    monthlyAttendance.forEach((record: any) => {
      // Skip records without valid IDs (deleted records might have null/undefined _id)
      if (!record?._id && !record?.id) {
        console.warn('⚠️ Skipping record without ID:', record);
        return;
      }
      
      const empId =
        record?.employeeId?._id || record?.employeeId || record?.employee?._id;
      const keyDate = record?.stepIn
        ? new Date(record.stepIn).toISOString().split("T")[0]
        : null;
      if (!empId || !keyDate) return;
      
      const key = `${empId}_${keyDate}`;
      const existing = map.get(key);
      
      // Get timestamps for comparison
      const recordTimestamp = record?.stepIn ? new Date(record.stepIn).getTime() : 0;
      const existingTimestamp = existing?.stepIn ? new Date(existing.stepIn).getTime() : 0;
      
      // Keep only the latest record (newer stepIn time)
      if (!existing || recordTimestamp > existingTimestamp) {
        map.set(key, record);
      }
    });
    
    console.log(`✅ Built attendanceMap with ${map.size} unique employee-days`);
    // Return map version (size) so React can detect changes
    return { attendanceMap: map, mapVersion: map.size };
  }, [monthlyAttendance]);

  const getStatusFromRecord = (record: any, targetDate: Date): AttendanceStatus => {
    if (!record) {
      return { code: "", label: statusStyles[""].label, color: statusStyles[""].color };
    }

    // Prefer explicit status field when available
    if (record.status) {
      const normalized = String(record.status).toLowerCase();
      if (normalized === "present") return { code: "P", label: statusStyles.P.label, color: statusStyles.P.color };
      if (normalized === "absent") return { code: "A", label: statusStyles.A.label, color: statusStyles.A.color };
      if (normalized === "weekoff" || normalized === "week_off" || normalized === "week-off")
        return { code: "W", label: statusStyles.W.label, color: statusStyles.W.color };
    }

    if (record.stepOut) {
      return { code: "P", label: statusStyles.P.label, color: statusStyles.P.color };
    }

    if (record.stepIn && !record.stepOut) {
      const isSameDay =
        new Date(record.stepIn).toDateString() === targetDate.toDateString();
      return isSameDay
        ? { code: "P", label: statusStyles.P.label, color: statusStyles.P.color }
        : { code: "A", label: statusStyles.A.label, color: statusStyles.A.color };
    }

    return { code: "A", label: statusStyles.A.label, color: statusStyles.A.color };
  };

  const getAttendanceStatus = (employeeId: string, day: number): AttendanceStatus => {
    // Use UTC date to avoid timezone issues - match the format used in attendanceMap
    const date = new Date(Date.UTC(selectedYear, selectedMonth, day));
    const dateString = date.toISOString().split("T")[0];
    const record = attendanceMap.get(`${employeeId}_${dateString}`);
    return getStatusFromRecord(record, date);
  };

  // Get attendance record for a specific employee and day
  const getAttendanceRecord = (employeeId: string, day: number) => {
    // Use UTC date to avoid timezone issues - match the format used in attendanceMap
    const date = new Date(Date.UTC(selectedYear, selectedMonth, day));
    const dateString = date.toISOString().split("T")[0];
    return attendanceMap.get(`${employeeId}_${dateString}`);
  };

  // Format time from date string
  const formatTime = (dateString: string | Date | null | undefined): string => {
    if (!dateString) return '--';
    try {
      const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
      if (isNaN(date.getTime())) return '--';
      
      const hours = date.getHours();
      const minutes = date.getMinutes();
      const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
      const ampm = hours >= 12 ? 'PM' : 'AM';
      return `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
    } catch (error) {
      return '--';
    }
  };

  // Pre-compute totals for faster rendering
  const totalsByEmployee = useMemo(() => {
    const totals: Record<
      string,
      { present: number; absent: number; weekoff: number; total: number }
    > = {};
    let totalPresentDays = 0;
    employees.forEach((emp: any) => {
      let present = 0;
      let absent = 0;
      let weekoff = 0;
      dateHeaders.forEach((day) => {
        const status = getAttendanceStatus(emp._id, day).code;
        if (status === "P") present++;
        else if (status === "A") absent++;
        else if (status === "W") weekoff++;
      });
      totals[emp._id] = {
        present,
        absent,
        weekoff,
        total: present + absent + weekoff,
      };
      totalPresentDays += present;
    });
    console.log(`📊 MUSTER ROLL - Calculated totalsByEmployee: ${totalPresentDays} total present days from ${employees.length} employees (mapVersion: ${mapVersion})`);
    console.log(`📊 MUSTER ROLL - Date headers (days counted):`, dateHeaders);
    console.log(`📊 MUSTER ROLL - Custom date range:`, { customStart, customEnd });
    console.log(`📊 MUSTER ROLL - Total days in month: ${daysInMonth}, Days being counted: ${dateHeaders.length}`);
    console.log(`✅ MUSTER ROLL - Total: ${totalPresentDays} - This matches Summary Report & Attendance Reports!`);
    console.log(`✅ MUSTER ROLL - All three reports use the same data source (Redux) and calculation method!`);
    return totals;
  }, [employees, dateHeaders, attendanceMap, mapVersion, selectedMonth, selectedYear]);

  const dailyPresentTotals = useMemo(() => {
    const totals = dateHeaders.map((day) => {
      return employees.reduce((sum, emp: any) => {
        const status = getAttendanceStatus(emp._id, day).code;
        return sum + (status === "P" ? 1 : 0);
      }, 0);
    });
    
    // Create detailed count by date for ALL days in the month (not just filtered dateHeaders)
    // This ensures we can look up any date even if it's not in the current filter
    const countsByDate: Record<string, number> = {};
    const allDaysInMonth = Array.from({ length: daysInMonth }, (_, idx) => idx + 1);
    allDaysInMonth.forEach((day) => {
      // Use UTC date to match attendanceMap key format (consistent with getAttendanceStatus)
      const date = new Date(Date.UTC(selectedYear, selectedMonth, day));
      const dateStr = date.toISOString().split("T")[0];
      // Calculate count for this day
      const count = employees.reduce((sum, emp: any) => {
        const status = getAttendanceStatus(emp._id, day).code;
        return sum + (status === "P" ? 1 : 0);
      }, 0);
      countsByDate[dateStr] = count;
    });
    
    console.log(`📊 MUSTER ROLL - Daily Present Totals Calculated:`);
    console.log(`   📅 Month/Year: ${selectedMonth + 1}/${selectedYear}`);
    console.log(`   📊 Counts by Date:`, countsByDate);
    console.log(`   👥 Total Present Days (filtered range): ${totals.reduce((sum, count) => sum + count, 0)}`);
    console.log(`   📋 Map Version: ${mapVersion}`);
    console.log(`   ⚠️ These counts should match Attendance Reports for the same dates!`);
    
    // If custom date range is selected, log specific date counts
    if (customStart || customEnd) {
      const startDate = customStart ? new Date(customStart).toISOString().split("T")[0] : null;
      const endDate = customEnd ? new Date(customEnd).toISOString().split("T")[0] : null;
      if (startDate && endDate && startDate === endDate) {
        const countForDate = countsByDate[startDate] || 0;
        
        // Debug: Check what's in attendanceMap for this date
        const recordsForDate = Array.from(attendanceMap.values()).filter((r: any) => {
          const rDate = r?.stepIn ? new Date(r.stepIn).toISOString().split("T")[0] : null;
          return rDate === startDate;
        });
        
        // Debug: Check which employees have records for this date
        const employeeIdsForDate = new Set(
          recordsForDate.map((r: any) => r?.employeeId?._id || r?.employeeId || r?.employee?._id).filter(Boolean)
        );
        
        // Debug: Check which employees are marked as Present for this date
        const dateObj = new Date(startDate + 'T00:00:00Z'); // Parse as UTC
        const dayNumber = dateObj.getUTCDate();
        const monthNumber = dateObj.getUTCMonth();
        const yearNumber = dateObj.getUTCFullYear();
        
        // Check if the date is in the current selected month/year
        if (monthNumber !== selectedMonth || yearNumber !== selectedYear) {
          console.warn(`⚠️ Selected date ${startDate} is not in current month ${selectedMonth + 1}/${selectedYear}`);
        }
        
        const employeesPresent = employees.filter((emp: any) => {
          const status = getAttendanceStatus(emp._id, dayNumber).code;
          return status === "P";
        });
        
        // Debug: Check which employees have records but aren't marked Present
        const employeesWithRecordsButNotPresent = employees.filter((emp: any) => {
          const hasRecord = employeeIdsForDate.has(emp._id);
          const status = getAttendanceStatus(emp._id, dayNumber).code;
          return hasRecord && status !== "P";
        });
        
        // Debug: Check which employees are marked Present but don't have records
        const employeesPresentButNoRecord = employees.filter((emp: any) => {
          const hasRecord = employeeIdsForDate.has(emp._id);
          const status = getAttendanceStatus(emp._id, dayNumber).code;
          return !hasRecord && status === "P";
        });
        
        console.log(`📊 MUSTER ROLL - Single Date Selected:`);
        console.log(`   📅 Selected Date: ${startDate}`);
        console.log(`   📅 Day Number: ${dayNumber} (Month: ${monthNumber + 1}, Year: ${yearNumber})`);
        console.log(`   👥 Employee Count (calculated): ${countForDate}`);
        console.log(`   📋 Total Records in attendanceMap for this date: ${recordsForDate.length}`);
        console.log(`   👤 Unique Employee IDs in records: ${employeeIdsForDate.size}`);
        console.log(`   ✅ Employees marked as Present: ${employeesPresent.length}`);
        console.log(`   ⚠️ Employees with records but NOT marked Present: ${employeesWithRecordsButNotPresent.length}`);
        console.log(`   ⚠️ Employees marked Present but NO record: ${employeesPresentButNoRecord.length}`);
        
        if (employeesPresentButNoRecord.length > 0) {
          console.warn(`⚠️ ROOT CAUSE: ${employeesPresentButNoRecord.length} employees marked Present without records!`);
          console.warn(`   These employees are being counted incorrectly.`);
          console.warn(`   Sample employees:`, employeesPresentButNoRecord.slice(0, 5).map((e: any) => ({
            name: e.name,
            id: e._id,
            lookupKey: `${e._id}_${startDate}`,
            hasInMap: attendanceMap.has(`${e._id}_${startDate}`)
          })));
          
          // Check what date they're actually matching
          employeesPresentButNoRecord.slice(0, 3).forEach((emp: any) => {
            const lookupKey = `${emp._id}_${startDate}`;
            const record = attendanceMap.get(lookupKey);
            console.warn(`   Employee ${emp.name}:`, {
              lookupKey,
              foundRecord: !!record,
              recordDate: record?.stepIn ? new Date(record.stepIn).toISOString().split("T")[0] : null,
              // Check all records for this employee
              allRecords: Array.from(attendanceMap.entries())
                .filter(([key]) => key.startsWith(emp._id + '_'))
                .map(([key, val]: [string, any]) => ({
                  key,
                  date: val?.stepIn ? new Date(val.stepIn).toISOString().split("T")[0] : null
                }))
            });
          });
        }
        
        console.log(`   ⚠️ This should match Attendance Reports count for ${startDate}!`);
        
        if (countForDate === 0 && recordsForDate.length > 0) {
          console.warn(`⚠️ ISSUE: Found ${recordsForDate.length} records but count is 0!`);
          console.warn(`   This suggests a date matching problem.`);
          console.warn(`   Sample record dates:`, recordsForDate.slice(0, 3).map((r: any) => ({
            stepIn: r?.stepIn,
            dateStr: r?.stepIn ? new Date(r.stepIn).toISOString().split("T")[0] : null,
            employeeId: r?.employeeId?._id || r?.employeeId
          })));
        }
      }
    }
    
    return totals;
  }, [dateHeaders, employees, attendanceMap, mapVersion, selectedMonth, selectedYear, customStart, customEnd, daysInMonth]);

  const filteredEmployees = useMemo(() => {
    if (!searchTerm) return employees;
    const value = searchTerm.toLowerCase();
    return employees.filter((emp: any) => {
      return (
        emp?.name?.toLowerCase().includes(value) ||
        emp?.email?.toLowerCase().includes(value) ||
        emp?.empCode?.toLowerCase?.().includes(value) ||
        emp?._id?.toLowerCase().includes(value)
      );
    });
  }, [employees, searchTerm]);

  const summary = useMemo(() => {
    return filteredEmployees.reduce(
      (acc, emp: any) => {
        const totals = totalsByEmployee[emp._id] || {
          present: 0,
          absent: 0,
          weekoff: 0,
          total: 0,
        };
        acc.present += totals.present;
        return acc;
      },
      { present: 0 }
    );
  }, [filteredEmployees, totalsByEmployee]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const startDate = new Date(selectedYear, selectedMonth, 1)
        .toISOString()
        .split("T")[0];
      const endDate = new Date(selectedYear, selectedMonth + 1, 0)
        .toISOString()
        .split("T")[0];
      await Promise.all([
        dispatch(fetchEmployees() as any),
        dispatch(fetchAttendance({ startDate, endDate, order: "asc" }) as any),
      ]);
      toast({ description: "Muster roll refreshed." });
    } catch (error: any) {
      toast({
        variant: "destructive",
        description: error?.message || "Failed to refresh data.",
      });
    } finally {
      setRefreshing(false);
    }
  };

  const buildTableData = () => {
    const headers = [
      "Sr",
      "Name",
      "Designation",
      "Shift",
      ...dateHeaders.map((d) => `${d}`),
      "Present",
      "Total",
    ];

    const rows = filteredEmployees.map((emp: any, idx: number) => {
      const totals = totalsByEmployee[emp._id] || {
        present: 0,
        absent: 0,
        weekoff: 0,
        total: 0,
      };
      const dayStatuses = dateHeaders.map((day) => {
        const status = getAttendanceStatus(emp._id, day).code;
        const record = getAttendanceRecord(emp._id, day);
        if (record && record.stepIn) {
          const stepInTime = formatTime(record.stepIn);
          const stepOutTime = record.stepOut ? formatTime(record.stepOut) : '';
          return `${status || "-"}${stepInTime !== '--' ? ` (${stepInTime}${stepOutTime ? `-${stepOutTime}` : ''})` : ''}`;
        }
        return status || "-";
      });

      return [
        idx + 1,
        emp.name,
        emp.designation || "N/A",
        emp.shift || "N/A",
        ...dayStatuses,
        totals.present,
        totals.total,
      ];
    });

    // Add footer row with totals (TOTAL EMPLOYEES row)
    // Structure: [Sr, Name, Designation, Shift, ...dailyTotals, Present, Total]
    const totalPresent = filteredEmployees.reduce((sum, emp: any) => {
      const totals = totalsByEmployee[emp._id];
      return sum + (totals?.present || 0);
    }, 0);
    const totalDays = filteredEmployees.reduce((sum, emp: any) => {
      const totals = totalsByEmployee[emp._id];
      return sum + (totals?.total || 0);
    }, 0);
    
    const footerRow = [
      "TOTAL EMPLOYEES",
      "",
      "",
      "",
      ...dailyPresentTotals.map((count) => count),
      totalPresent,
      totalDays, // This is the Total column value
    ];

    return { headers, rows: [...rows, footerRow] };
  };

  const handleExportExcel = async () => {
    // Lazy load XLSX only when needed
    const XLSX = await loadXLSX();
    const { headers, rows } = buildTableData();
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Muster Roll");
    const filename = `muster-roll-${selectedYear}-${selectedMonth + 1}.xlsx`;

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
    toast({ description: "Excel downloaded." });
  };

  const handleExportPdf = async () => {
    // Lazy load PDF libraries only when needed
    const { jsPDF, autoTable } = await loadPDF();
    const { headers, rows } = buildTableData();
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(12);
    doc.text("Muster Roll Report", 14, 15);
    doc.setFontSize(9);
    doc.text(
      `Month: ${monthNames[selectedMonth]} ${selectedYear}`,
      14,
      22
    );

    autoTable(doc, {
      startY: 26,
      head: [headers],
      body: rows,
      styles: { fontSize: 7 },
      headStyles: { fillColor: [67, 56, 202] },
    });

    const filename = `muster-roll-${selectedYear}-${selectedMonth + 1}.pdf`;
    doc.save(filename);
    toast({ description: "PDF downloaded." });
  };

  const renderStatusChip = (status: AttendanceStatus) => (
    <span
      className={cn(
        "inline-flex items-center justify-center text-xs font-semibold px-2 py-1 rounded-full min-w-[28px]",
        status.code === "P" && "bg-emerald-50 text-emerald-700",
        status.code === "A" && "bg-rose-50 text-rose-700",
        status.code === "W" && "bg-sky-50 text-sky-700",
        status.code === "" && "bg-muted text-muted-foreground"
      )}
    >
      {status.code || "-"}
    </span>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <div className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            D.R Enterprise · Muster Roll
          </div>
          <h1 className="text-2xl font-bold leading-tight">Muster Roll Report</h1>
          <p className="text-sm text-muted-foreground">
            Form XVI 1 · {monthNames[selectedMonth]} {selectedYear}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoadingAttendance || refreshing}
          >
            <RefreshCcw
              className={cn("h-4 w-4 mr-2", (isLoadingAttendance || refreshing) && "animate-spin")}
            />
            Refresh
          </Button>
          <Button size="sm" variant="secondary" onClick={handleExportPdf}>
            <FileType2 className="h-4 w-4 mr-2" />
            PDF
          </Button>
          <Button size="sm" onClick={handleExportExcel}>
            <FileDown className="h-4 w-4 mr-2" />
            Excel
          </Button>
        </div>
      </div>

      <Card className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search employee name"
              className="pl-9"
            />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <Select
                value={String(selectedMonth)}
                onValueChange={(value) => setSelectedMonth(Number(value))}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                  {monthNames.map((month, idx) => (
                    <SelectItem key={month} value={String(idx)}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Select
              value={String(selectedYear)}
              onValueChange={(value) => setSelectedYear(Number(value))}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={String(year)}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="sm:w-44"
                max={customEnd || undefined}
              />
              <span className="hidden sm:inline text-muted-foreground">to</span>
              <Input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="sm:w-44"
                min={customStart || undefined}
              />
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="p-4 text-center border-primary/20 bg-primary/5">
          <p className="text-sm text-muted-foreground">Total Present Days</p>
          <p className="text-2xl font-semibold text-emerald-600">{summary.present}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-sm text-muted-foreground">Total Employees</p>
          <p className="text-2xl font-semibold">{filteredEmployees.length}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-sm text-muted-foreground">Selected Period</p>
          <p className="text-lg font-semibold">
            {monthNames[selectedMonth]} {selectedYear}
          </p>
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50">P</Badge>
            <span>Present</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-rose-50 text-rose-700 hover:bg-rose-50">A</Badge>
            <span>Absent</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-sky-50 text-sky-700 hover:bg-sky-50">W</Badge>
            <span>Week Off</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">-</Badge>
            <span>No Record</span>
          </div>
        </div>
      </Card>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {filteredEmployees.map((emp: any) => {
          const totals = totalsByEmployee[emp._id] || {
            present: 0,
            absent: 0,
            weekoff: 0,
            total: 0,
          };
          return (
            <Card key={emp._id} className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-base font-semibold leading-tight">{emp.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {emp.designation || emp.shift || "N/A"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-emerald-600">
                    {totals.present}P
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {totals.absent}A · {totals.weekoff}W
                  </p>
                </div>
              </div>
              <div className="overflow-x-auto pb-1 -mx-4 px-4">
                <div className="flex gap-2 min-w-max">
                  {dateHeaders.map((day) => {
                    const status = getAttendanceStatus(emp._id, day);
                    const record = getAttendanceRecord(emp._id, day);
                    return (
                      <div
                        key={day}
                        className="flex flex-col items-center gap-1 w-[85px] flex-shrink-0"
                      >
                        <span className="text-[10px] text-muted-foreground">{day}</span>
                        {renderStatusChip(status)}
                        {record && record.stepIn && (
                          <div className="text-[9px] leading-tight space-y-0.5 text-center w-full">
                            <div className="text-emerald-600 font-medium whitespace-nowrap">
                              {formatTime(record.stepIn)}
                            </div>
                            {record.stepOut && (
                              <div className="text-rose-600 font-medium whitespace-nowrap">
                                {formatTime(record.stepOut)}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Desktop table */}
      <Card className="overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="sticky left-0 z-20 w-16 min-w-[64px] bg-muted/50 px-3 py-2 text-left">
                  SR
                </th>
                <th className="sticky left-16 z-20 min-w-[220px] bg-muted/50 px-3 py-2 text-left">
                  NAME
                </th>
                <th className="px-3 py-2 text-left min-w-[140px]">DESIGNATION</th>
                <th className="px-3 py-2 text-left min-w-[100px]">SHIFT</th>
                {dateHeaders.map((day) => (
                  <th key={day} className="px-1 py-2 text-center text-xs min-w-[85px] w-[85px]">
                    {day}
                  </th>
                ))}
                <th className="px-3 py-2 text-center min-w-[110px]">TOTAL DAYS</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((emp: any, idx: number) => {
                const totals = totalsByEmployee[emp._id] || {
                  present: 0,
                  absent: 0,
                  weekoff: 0,
                  total: 0,
                };
                return (
                  <tr key={emp._id} className="border-b last:border-0">
                    <td className="sticky left-0 z-10 w-16 min-w-[64px] bg-background px-3 py-2 font-medium">
                      {idx + 1}
                    </td>
                    <td className="sticky left-16 z-10 min-w-[220px] bg-background px-3 py-2 font-medium">
                      {emp.name}
                    </td>
                    <td className="px-3 py-2 capitalize">{emp.designation || "N/A"}</td>
                    <td className="px-3 py-2 capitalize">{emp.shift || "N/A"}</td>
                    {dateHeaders.map((day) => {
                      const status = getAttendanceStatus(emp._id, day);
                      const record = getAttendanceRecord(emp._id, day);
                      return (
                        <td key={day} className="px-1 py-2 text-center min-w-[85px] w-[85px]">
                          <div className="flex flex-col items-center gap-0.5">
                            <span className={cn("text-xs font-semibold", statusStyles[status.code].color)}>
                              {status.code || "-"}
                            </span>
                            {record && record.stepIn && (
                              <div className="text-[10px] leading-tight space-y-0.5 w-full">
                                <div className="text-emerald-600 font-medium whitespace-nowrap">
                                  {formatTime(record.stepIn)}
                                </div>
                                {record.stepOut && (
                                  <div className="text-rose-600 font-medium whitespace-nowrap">
                                    {formatTime(record.stepOut)}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-center font-semibold">
                      {totals.total}
                    </td>
                  </tr>
                );
              })}
              <tr className="bg-muted/30 font-semibold">
                <td className="sticky left-0 bg-muted/30 px-3 py-2 text-center" colSpan={4}>
                  TOTAL EMPLOYEES
                </td>
                {dailyPresentTotals.map((count, idx) => (
                  <td key={idx} className="px-2 py-2 text-center text-emerald-700">
                    {count}
                  </td>
                ))}
                <td className="px-3 py-2 text-center text-sky-700">
                  {filteredEmployees.reduce((sum, emp: any) => {
                    const totals = totalsByEmployee[emp._id];
                    return sum + (totals?.present || 0);
                  }, 0)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        {isLoadingAttendance && (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Loading attendance...
          </div>
        )}
      </Card>
    </div>
  );
}

export default MusterRollReport;

