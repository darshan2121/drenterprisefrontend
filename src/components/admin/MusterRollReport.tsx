"use client";

import { useEffect, useMemo, useState } from "react";
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
  const monthlyAttendance = useMemo(() => {
    return attendanceArray.filter((record: any) => {
      if (!record?.stepIn) return false;
      const date = new Date(record.stepIn);
      return (
        date.getMonth() === selectedMonth && date.getFullYear() === selectedYear
      );
    });
  }, [attendanceArray, selectedMonth, selectedYear]);

  // Build quick lookup map: `${employeeId}_${yyyy-mm-dd}` -> record
  const attendanceMap = useMemo(() => {
    const map = new Map<string, any>();
    monthlyAttendance.forEach((record: any) => {
      const empId =
        record?.employeeId?._id || record?.employeeId || record?.employee?._id;
      const keyDate = record?.stepIn
        ? new Date(record.stepIn).toISOString().split("T")[0]
        : null;
      if (!empId || !keyDate) return;
      map.set(`${empId}_${keyDate}`, record);
    });
    return map;
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
    const date = new Date(selectedYear, selectedMonth, day);
    const dateString = date.toISOString().split("T")[0];
    const record = attendanceMap.get(`${employeeId}_${dateString}`);
    return getStatusFromRecord(record, date);
  };

  // Get attendance record for a specific employee and day
  const getAttendanceRecord = (employeeId: string, day: number) => {
    const date = new Date(selectedYear, selectedMonth, day);
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
    });
    return totals;
  }, [employees, daysInMonth, attendanceMap, selectedMonth, selectedYear]);

  const dailyPresentTotals = useMemo(() => {
    return dateHeaders.map((day) => {
      return employees.reduce((sum, emp: any) => {
        const status = getAttendanceStatus(emp._id, day).code;
        return sum + (status === "P" ? 1 : 0);
      }, 0);
    });
  }, [dateHeaders, employees, attendanceMap, selectedMonth, selectedYear]);

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

    return { headers, rows };
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

