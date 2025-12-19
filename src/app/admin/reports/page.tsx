"use client";

import { ReportsFilter } from "@/components/admin/ReportsFilter";
import { ReportsTable } from "@/components/admin/ReportsTable";
import { Card, CardContent } from "@/components/ui/card";
import { useDispatch, useSelector } from "react-redux";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { fetchAttendance } from "@/store/slices/attendanceSlice";
import { RootState } from "@/store";
import { format } from "date-fns";
import { ENDPOINTS } from "@/lib/endpoints";
import { http } from "@/lib/http";
import { getApiUrl } from "@/lib/config";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { EditReportModal } from "@/components/admin/EditReportModal";
import { DeleteAttendanceModal } from "@/components/admin/DeleteAttendanceModal";
import { BulkUpdateModal } from "@/components/admin/BulkUpdateModal";
import { BulkDeleteModal } from "@/components/admin/BulkDeleteModal";
import { authService } from "@/services/authService";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { HeaderActions } from "@/components/admin/ReportsTable";
import { Edit3, Download, FileDown, RefreshCw, Loader2, Trash2, Search, X } from "lucide-react";
import { PDFDownloadButton } from "@/components/ui/pdf-download-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/useDebounce";
import dynamic from "next/dynamic";

// Lazy load heavy libraries only when needed
const loadXLSX = () => import("xlsx").then(mod => mod.default || mod);
const loadPDF = async () => {
  const [jsPDF, autoTable] = await Promise.all([
    import("jspdf").then(mod => mod.default),
    import("jspdf-autotable").then(mod => mod.default)
  ]);
  return { jsPDF, autoTable };
};

export default function ReportsPage() {
    const router = useRouter();
    const pathname = usePathname();
    const isReadonly = authService.getCurrentUser()?.role === "readonly";
    
    // Removed console.logs from render to prevent performance issues

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
    
    // Search state
    const [searchInput, setSearchInput] = useState("");
    const debouncedSearchQuery = useDebounce(searchInput, 300);
    const [searchQuery, setSearchQuery] = useState("");
    
    // Update search query when debounced value changes
    useEffect(() => {
      setSearchQuery(debouncedSearchQuery);
    }, [debouncedSearchQuery]);
    
    // State for checkbox selection
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 15; // Show 15 reports per page for better performance

    // Helper function to get image URL
    const getImageUrl = (image: string | undefined) => {
      if (!image) return undefined;
      const apiUrl = getApiUrl();
      let baseUrl = apiUrl;
      
      // Remove /api from the end if it exists
      if (baseUrl.endsWith('/api')) {
        baseUrl = baseUrl.slice(0, -4); // Remove '/api'
      } else if (baseUrl.endsWith('/api/')) {
        baseUrl = baseUrl.slice(0, -5); // Remove '/api/'
      }
      
      const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
      const imageUrl = `${cleanBaseUrl}/static/${image}`;
      return imageUrl;
    };

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
    
    // Clear selectedIds when readonly status changes (keep selection when filters change)
    useEffect(() => {
      if (isReadonly) {
        setSelectedIds([]);
      }
    }, [isReadonly]);

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
          employeeImage: att.employeeId?.image,
          stepInImage: att.stepInImage,
          stepInDate: att.stepIn ? new Date(att.stepIn) : null,
          stepOutDate: att.stepOut ? new Date(att.stepOut) : null
        })));
      }
      
      return attendanceList.map(att => {
        const formatISTTime = (dateString: string) => {
          if (!dateString) return '--';
          
          try {
            // Parse the date string (this is UTC from database)
            const utcDate = new Date(dateString);
            
            // Check if the date is valid
            if (isNaN(utcDate.getTime())) {
              console.warn('Invalid date string:', dateString);
              return '--';
            }
            
            // The time was stored as UTC, so we need to convert it back to local time for display
            // Use the browser's built-in timezone conversion
            const localTime = new Date(utcDate);
            
            // Extract time components (browser automatically converts UTC to local)
            const hours = localTime.getHours();
            const minutes = localTime.getMinutes();
            
            // Convert to 12-hour format
            const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
            const ampm = hours >= 12 ? 'PM' : 'AM';
            const formattedTime = `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
            
            console.log(`Time formatting: ${dateString} (UTC) -> ${formattedTime} (local 12-hour format)`);
            return formattedTime;
          } catch (error) {
            console.error('Error formatting time:', error, dateString);
            return '--';
          }
        };

        // Debug original date format
        if (att.stepIn) {
          console.log('📅 Original stepIn date:', {
            original: att.stepIn,
            parsed: new Date(att.stepIn),
            formatted: format(new Date(att.stepIn), 'yyyy-MM-dd'),
            employee: att.employeeId?.name
          });
        }

        // Store original record for Present status checking (same as Muster Roll)
        const originalRecord = att;

        const formatted = {
          _id: att._id,
          date: att.stepIn ? format(new Date(att.stepIn), 'yyyy-MM-dd') : '--',
          employee: att.employeeId?.name || att.employeeId || 'Unknown',
          employeeId: att.employeeId ? {
            _id: att.employeeId._id,
            name: att.employeeId.name,
            image: att.employeeId.image
          } : undefined,
          employeePhoto: att.employeeId?.photo || null,
          stepIn: att.stepInImage,
          shift: att.shift || att.employeeId?.shift || 'Regular',
          location: att.address || '--',
          status: att.stepOut ? 'Present' as const : 'Present' as const,
          clockIn: formatISTTime(att.stepIn),
          clockOut: formatISTTime(att.stepOut),
          note: att.note || '',
          totalTime: att.totalTime || '',
          // Store original stepIn timestamp for deduplication (latest record)
          _stepInTimestamp: att.stepIn ? new Date(att.stepIn).getTime() : 0,
          // Store original record for Present status checking (same as Muster Roll)
          _originalRecord: originalRecord,
          // Include raw location data for editing
          _raw: {
            longitude: att.longitude,
            latitude: att.latitude,
            address: att.address,
            stepInLongitude: att.stepInLongitude,
            stepInLatitude: att.stepInLatitude,
            stepInAddress: att.stepInAddress,
            stepOutLongitude: att.stepOutLongitude,
            stepOutLatitude: att.stepOutLatitude,
            stepOutAddress: att.stepOutAddress,
          }
        };
        
        return formatted;
      });
    }, [attendanceList]); // Removed dataVersion dependency to reduce re-renders

    // Track previous filter key to only log when filters actually change
    const prevFilterKeyRef = useRef<string>('');

    // Apply all filters on the frontend
    const filteredReports = useMemo(() => {
      // Only log when filters actually change, not on every render
      const filterKey = JSON.stringify(filters);
      if (filterKey !== prevFilterKeyRef.current) {
        // Only log when filters change
      console.log('Filtering reports with filters:', filters);
      console.log('Available employees:', employees.length);
      console.log('Available managers:', managers.length);
        prevFilterKeyRef.current = filterKey;
      }
      
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
          
          // Date filter - handle single date, date range, or both
          let matchDate = true;
          
          // Single date filter (exact match) - takes precedence over date range
          if (filters.date) {
            const filterDateStr = format(filters.date, 'yyyy-MM-dd');
            matchDate = report.date === filterDateStr;
          }
          // Date range filter (startDate to endDate) - only if single date is not set
          else if (filters.startDate || filters.endDate) {
            const reportDate = report.date; // Format: 'yyyy-MM-dd'
            
            if (filters.startDate && filters.endDate) {
              // Both dates provided - check if report date is within range
              matchDate = reportDate >= filters.startDate && reportDate <= filters.endDate;
            } else if (filters.startDate) {
              // Only start date - check if report date is on or after start date
              matchDate = reportDate >= filters.startDate;
            } else if (filters.endDate) {
              // Only end date - check if report date is on or before end date
              matchDate = reportDate <= filters.endDate;
            }
          }
          
          // Search filter - search across multiple fields
          const matchSearch = !searchQuery || 
            report.employee?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            report.date?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            report.shift?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            report.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            report.clockIn?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            report.clockOut?.toLowerCase().includes(searchQuery.toLowerCase());
          
          return matchManager && matchEmployee && matchShift && matchDate && matchSearch;
        } catch (error) {
          console.error('Error filtering report:', error, report);
          return false;
        }
      });
      
      console.log('Filtered reports count (before deduplication):', filtered.length);
      
      // First, filter out invalid records (no employee ID or invalid date)
      const validReports = filtered.filter(report => {
        return report.employeeId?._id && report.date && report.date !== '--';
      });
      
      // Only log when filters change (not on every recalculation)
      if (filterKey !== prevFilterKeyRef.current) {
        console.log('Valid reports (with employee ID and date):', validReports.length);
        console.log('Invalid reports (excluded):', filtered.length - validReports.length);
      }
      
      // Calculate shift-wise totals to match Summary Report API
      const shiftTotals = {
        morning: 0,
        evening: 0,
        night: 0
      };
      
      // Count distinct employees per shift (matching Summary API logic)
      const shiftEmployeeSets = {
        morning: new Set<string>(),
        evening: new Set<string>(),
        night: new Set<string>()
      };
      
      validReports.forEach(report => {
        if (report.employeeId?._id && report.shift && ['morning', 'evening', 'night'].includes(report.shift)) {
          const empId = report.employeeId._id;
          shiftEmployeeSets[report.shift as keyof typeof shiftEmployeeSets].add(empId);
        }
      });
      
      shiftTotals.morning = shiftEmployeeSets.morning.size;
      shiftTotals.evening = shiftEmployeeSets.evening.size;
      shiftTotals.night = shiftEmployeeSets.night.size;
      
      const sumOfShiftTotals = shiftTotals.morning + shiftTotals.evening + shiftTotals.night;
      
      // Only log when filters change
      if (filterKey !== prevFilterKeyRef.current) {
        console.log('📊 Shift-wise totals (matching Summary API):', shiftTotals);
        console.log('📊 Sum of shift totals:', sumOfShiftTotals);
      }
      
      // CRITICAL: Filter by "Present" status (same logic as Muster Roll and Summary Report)
      // This ensures we only count records that are actually "Present", not all records
      // This is the KEY difference - Muster Roll and Summary Report only count "Present" records
      const presentReports = validReports.filter(report => {
        // Get the original attendance record to check status
        const originalRecord = (report as any)._originalRecord || attendanceList.find(att => att._id === report._id);
        if (!originalRecord) return false;
        
        // Use EXACT same logic as Muster Roll's getStatusFromRecord
        // Prefer explicit status field
        if (originalRecord.status) {
          const normalized = String(originalRecord.status).toLowerCase();
          if (normalized === "present") return true;
          if (normalized === "absent") return false;
          if (normalized === "weekoff" || normalized === "week_off" || normalized === "week-off") return false;
        }
        
        // If status not explicitly set, check stepOut/stepIn
        if (originalRecord.stepOut) {
          // Has stepOut = Present (exact match with Muster Roll)
          return true;
        } else if (originalRecord.stepIn && !originalRecord.stepOut) {
          // Check if same day (exact match with Muster Roll's date comparison)
          const recordDate = new Date(originalRecord.stepIn);
          const targetDate = new Date(report.date + 'T00:00:00');
          const isSameDay = recordDate.toDateString() === targetDate.toDateString();
          return isSameDay;
        }
        
        return false; // No stepIn = Absent
      });
      
      // Deduplicate: Keep only the latest entry per employee per day (only for Present records)
      const deduplicatedMap = new Map<string, typeof filtered[0]>();
      
      presentReports.forEach(report => {
        const key = `${report.employeeId!._id}_${report.date}`;
        const existing = deduplicatedMap.get(key);
        
        // If no existing record or this one is newer (later stepIn time), keep this one
        if (!existing || (report._stepInTimestamp > existing._stepInTimestamp)) {
          deduplicatedMap.set(key, report);
        }
      });
      
      const deduplicated = Array.from(deduplicatedMap.values());
      
      // Only log when filters change (not on every recalculation)
      if (filterKey !== prevFilterKeyRef.current) {
        console.log('📊 ATTENDANCE REPORTS - Present status filter:', {
          validReports: validReports.length,
          presentReports: presentReports.length,
          excluded: validReports.length - presentReports.length,
          note: 'Only counting records marked as "Present" (same as Muster Roll & Summary Report)'
        });
        console.log('📊 ATTENDANCE REPORTS - Deduplicated count (unique employee-days, Present only):', deduplicated.length);
        console.log('📊 ATTENDANCE REPORTS - Removed duplicates:', presentReports.length - deduplicated.length);
        console.log('📊 ATTENDANCE REPORTS - Total excluded (invalid + non-present + duplicates):', filtered.length - deduplicated.length);
        console.log('✅ ATTENDANCE REPORTS - This count should match Muster Roll & Summary Report:', deduplicated.length);
        console.log('📊 Difference (Sum of shifts - Unique count):', sumOfShiftTotals - deduplicated.length);
      }
      
      // If there's a difference, log which employees have multiple shifts (only when filters change)
      if (sumOfShiftTotals !== deduplicated.length && filterKey !== prevFilterKeyRef.current) {
        const employeesWithMultipleShifts = new Map<string, string[]>();
        validReports.forEach(report => {
          if (report.employeeId?._id && report.shift) {
            const empId = report.employeeId._id;
            if (!employeesWithMultipleShifts.has(empId)) {
              employeesWithMultipleShifts.set(empId, []);
            }
            const shifts = employeesWithMultipleShifts.get(empId)!;
            if (!shifts.includes(report.shift)) {
              shifts.push(report.shift);
            }
          }
        });
        
        const multiShiftEmployees = Array.from(employeesWithMultipleShifts.entries())
          .filter(([_, shifts]) => shifts.length > 1);
        
        console.log('📊 Employees with multiple shifts on same day:', multiShiftEmployees.length);
        console.log('📊 Sample multi-shift employees:', multiShiftEmployees.slice(0, 5));
      }
      
      // Log count by date when date filter is applied (only when filters change)
      if (filterKey !== prevFilterKeyRef.current) {
        if (filters.date || (filters.startDate && filters.endDate && filters.startDate === filters.endDate)) {
          const targetDate = filters.date ? format(filters.date, 'yyyy-MM-dd') : filters.startDate;
          const countForDate = deduplicated.filter(r => r.date === targetDate).length;
          console.log(`📊 ATTENDANCE REPORTS - Date Filter Applied:`);
          console.log(`   📅 Selected Date: ${targetDate}`);
          console.log(`   👥 Employee Count: ${countForDate}`);
          console.log(`   📋 Total Records: ${deduplicated.length}`);
          console.log(`   ⚠️ This count should match Muster Roll for the same date!`);
        } else if (filters.startDate && filters.endDate) {
          // Date range - count per day
          const countsByDate: Record<string, number> = {};
          deduplicated.forEach(report => {
            if (report.date && report.date !== '--') {
              countsByDate[report.date] = (countsByDate[report.date] || 0) + 1;
            }
          });
          console.log(`📊 ATTENDANCE REPORTS - Date Range Filter Applied:`);
          console.log(`   📅 Date Range: ${filters.startDate} to ${filters.endDate}`);
          console.log(`   📊 Counts by Date:`, countsByDate);
          console.log(`   👥 Total Unique Employees: ${deduplicated.length}`);
        }
      }
      
      return deduplicated;
    }, [formattedReports, filters, employees, managers, attendanceList, searchQuery]); // Added searchQuery dependency

    // Calculate unique employee-days count (should match filteredReports.length after deduplication)
    const uniqueEmployeeDaysCount = useMemo(() => {
      // Ensure we only count valid records with employee ID and date
      const validCount = filteredReports.filter(r => 
        r.employeeId?._id && r.date && r.date !== '--'
      ).length;
      
      // Log if there's a discrepancy
      if (validCount !== filteredReports.length) {
        console.warn('⚠️ Count discrepancy:', {
          total: filteredReports.length,
          valid: validCount,
          invalid: filteredReports.length - validCount
        });
      }
      
      return validCount; // Return only valid records count
    }, [filteredReports]);
    
    // Calculate shift totals and unique count for the ENTIRE date range (sum across all days)
    // This matches Summary Report logic - sum of shift totals across all days in range
    const [rangeShiftTotals, setRangeShiftTotals] = useState({
      morning: 0,
      evening: 0,
      night: 0,
      uniqueCount: 0,
      loading: false
    });

    // Fetch shift totals and unique count for the entire date range when dates are selected
    useEffect(() => {
      const fetchRangeData = async () => {
        if (!filters.startDate || !filters.endDate) {
          setRangeShiftTotals({ morning: 0, evening: 0, night: 0, uniqueCount: 0, loading: false });
          return;
        }

        setRangeShiftTotals(prev => ({ ...prev, loading: true }));

        try {
          // Generate array of dates between startDate and endDate
          const start = new Date(filters.startDate);
          const end = new Date(filters.endDate);
          const dateRange: string[] = [];
          
          for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            dateRange.push(format(d, 'yyyy-MM-dd'));
          }

          // Fetch shift summaries for all dates in parallel
          const shifts = ['morning', 'evening', 'night'];
          const promises = dateRange.flatMap(date =>
            shifts.map(shift =>
              http<{ presentEmployees: number }>(
                `${ENDPOINTS.attendance.summary}?date=${date}&shift=${shift}`
              ).catch(() => ({ presentEmployees: 0 }))
            )
          );

          // Also fetch all attendance data for unique count calculation
          const attendancePromise = http<{ attendance: any[] }>(
            `${ENDPOINTS.attendance.all}?startDate=${filters.startDate}&endDate=${filters.endDate}&order=asc`
          ).catch(() => ({ attendance: [] }));

          const [attendanceResponse, ...shiftResults] = await Promise.all([
            attendancePromise,
            ...promises
          ]);
          
          // Sum up shift totals across all days
          let morningTotal = 0;
          let eveningTotal = 0;
          let nightTotal = 0;

          shiftResults.forEach((result, index) => {
            const shiftIndex = index % 3;
            const count = result.presentEmployees || 0;
            
            if (shiftIndex === 0) morningTotal += count;
            else if (shiftIndex === 1) eveningTotal += count;
            else nightTotal += count;
          });

          // Calculate unique employee-days count from attendance data
          const attendanceArray = Array.isArray(attendanceResponse) ? attendanceResponse : 
            (attendanceResponse as any)?.attendance || (attendanceResponse as any)?.data || [];
          
          // Build attendance map and count unique employee-days (same logic as filteredReports)
          const uniqueMap = new Map<string, any>();
          attendanceArray.forEach((record: any) => {
            if (!record?._id && !record?.id) return;
            const empId = record?.employeeId?._id || record?.employeeId || record?.employee?._id;
            const keyDate = record?.stepIn ? new Date(record.stepIn).toISOString().split("T")[0] : null;
            if (!empId || !keyDate) return;
            
            const key = `${empId}_${keyDate}`;
            const existing = uniqueMap.get(key);
            const recordTimestamp = record?.stepIn ? new Date(record.stepIn).getTime() : 0;
            const existingTimestamp = existing?.stepIn ? new Date(existing.stepIn).getTime() : 0;
            if (!existing || recordTimestamp > existingTimestamp) {
              uniqueMap.set(key, record);
            }
          });

          const uniqueCount = uniqueMap.size;

          setRangeShiftTotals({
            morning: morningTotal,
            evening: eveningTotal,
            night: nightTotal,
            uniqueCount: uniqueCount,
            loading: false
          });
        } catch (error) {
          console.error('Error fetching range data:', error);
          setRangeShiftTotals({ morning: 0, evening: 0, night: 0, uniqueCount: 0, loading: false });
        }
      };

      fetchRangeData();
    }, [filters.startDate, filters.endDate]);

    // Use unique count from range data (for entire date range) as the main display number
    // Fall back to uniqueEmployeeDaysCount if range data not loaded yet
    const displayCount = rangeShiftTotals.uniqueCount > 0 ? rangeShiftTotals.uniqueCount : uniqueEmployeeDaysCount;
    
    // Pagination calculations
    const totalPages = Math.ceil(filteredReports.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentReports = filteredReports.slice(startIndex, endIndex);

    // Reset to first page when filters or search change
    useEffect(() => {
      setCurrentPage(1);
    }, [filters.managerId, filters.employeeId, filters.shift, filters.date, searchQuery]);

    const handlePageChange = (page: number) => {
      setCurrentPage(page);
      // Scroll to top when page changes
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    
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
                  onStartDateChange={(date) => setFilters((f) => ({ ...f, startDate: date }))}
                  onEndDateChange={(date) => setFilters((f) => ({ ...f, endDate: date }))}
                  startDate={filters.startDate}
                  endDate={filters.endDate}
                />
              </div>
            )}
          </Card>

          {/* Search Bar */}
          <Card className="w-full border-0 shadow-sm">
            <div className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search by employee name, date, shift, location, or time..."
                  className="w-full pl-10 pr-10"
                />
                {searchInput && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                    onClick={() => setSearchInput("")}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          </Card>

          {/* Attendance Statistics Card - Show when date range is selected */}
          {(filters.startDate || filters.endDate || filters.date) && !isLoading && (
            <Card className="w-full border-0 shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">
                      Total Attendance Count
                      {(filters.startDate && filters.endDate) && (
                        <span className="ml-2 text-xs">
                          ({format(new Date(filters.startDate), 'MMM dd, yyyy')} - {format(new Date(filters.endDate), 'MMM dd, yyyy')})
                        </span>
                      )}
                      {filters.date && (
                        <span className="ml-2 text-xs">
                          ({format(filters.date, 'MMM dd, yyyy')})
                        </span>
                      )}
                    </h3>
                    <div className="space-y-2">
                      {/* Unique Employee-Days Count */}
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl sm:text-4xl font-bold text-blue-600 dark:text-blue-400">
                          {displayCount.toLocaleString()}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          <span className="text-xs font-medium">Unique Employee-Days</span>
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        One employee counted once per day (regardless of shifts worked)
                      </p>
                      
                      {/* Sum of Shift Totals */}
                      {rangeShiftTotals.morning + rangeShiftTotals.evening + rangeShiftTotals.night !== displayCount && (
                        <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800">
                          <div className="flex items-baseline gap-2">
                            <span className="text-2xl sm:text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                              {(rangeShiftTotals.morning + rangeShiftTotals.evening + rangeShiftTotals.night).toLocaleString()}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              <span className="text-xs font-medium">Sum of Shift Totals</span>
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Employees counted per shift (if worked multiple shifts, counted multiple times)
                          </p>
                          <p className="text-xs text-orange-600 dark:text-orange-400 mt-1 font-medium">
                            Difference: {(rangeShiftTotals.morning + rangeShiftTotals.evening + rangeShiftTotals.night) - displayCount} employees worked multiple shifts
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Shift Breakdown */}
                  <div className="grid grid-cols-3 gap-3 sm:gap-4 w-full sm:w-auto">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-3 text-center border border-orange-200 dark:border-orange-800">
                      <div className="text-xs font-medium text-muted-foreground mb-1">Morning</div>
                      {rangeShiftTotals.loading ? (
                        <Loader2 className="h-5 w-5 animate-spin mx-auto text-orange-600" />
                      ) : (
                        <div className="text-lg sm:text-xl font-bold text-orange-600 dark:text-orange-400">
                          {rangeShiftTotals.morning.toLocaleString()}
                        </div>
                      )}
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-3 text-center border border-purple-200 dark:border-purple-800">
                      <div className="text-xs font-medium text-muted-foreground mb-1">Evening</div>
                      {rangeShiftTotals.loading ? (
                        <Loader2 className="h-5 w-5 animate-spin mx-auto text-purple-600" />
                      ) : (
                        <div className="text-lg sm:text-xl font-bold text-purple-600 dark:text-purple-400">
                          {rangeShiftTotals.evening.toLocaleString()}
                        </div>
                      )}
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-3 text-center border border-indigo-200 dark:border-indigo-800">
                      <div className="text-xs font-medium text-muted-foreground mb-1">Night</div>
                      {rangeShiftTotals.loading ? (
                        <Loader2 className="h-5 w-5 animate-spin mx-auto text-indigo-600" />
                      ) : (
                        <div className="text-lg sm:text-xl font-bold text-indigo-600 dark:text-indigo-400">
                          {rangeShiftTotals.night.toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Additional Info */}
                <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="font-medium text-muted-foreground mb-1">Unique Employee-Days:</p>
                      <p className="text-blue-600 dark:text-blue-400 font-semibold">
                        {displayCount.toLocaleString()}
                      </p>
                      <p className="text-muted-foreground mt-1">
                        Each employee counted once per day
                      </p>
                    </div>
                    <div>
                      <p className="font-medium text-muted-foreground mb-1">Sum of Shift Totals:</p>
                      <p className="text-indigo-600 dark:text-indigo-400 font-semibold">
                        {(rangeShiftTotals.morning + rangeShiftTotals.evening + rangeShiftTotals.night).toLocaleString()}
                      </p>
                      <p className="text-muted-foreground mt-1">
                        Morning ({rangeShiftTotals.morning.toLocaleString()}) + Evening ({rangeShiftTotals.evening.toLocaleString()}) + Night ({rangeShiftTotals.night.toLocaleString()})
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

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
                        <div className="flex items-center gap-3 flex-wrap">
                          <div className="flex flex-col">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                              Reports ({displayCount}) {totalPages > 1 && `- Page ${currentPage} of ${totalPages}`}
                              {(rangeShiftTotals.morning + rangeShiftTotals.evening + rangeShiftTotals.night) !== uniqueEmployeeDaysCount && (
                                <span className="text-xs text-muted-foreground mt-1 block">
                                  (Sum of shifts: {(rangeShiftTotals.morning + rangeShiftTotals.evening + rangeShiftTotals.night).toLocaleString()})
                                </span>
                              )}
                              {searchQuery && (
                                <span className="text-sm font-normal text-blue-600 dark:text-blue-400 ml-2">
                                  (searching: "{searchQuery}")
                                </span>
                              )}
                              {filteredReports.length !== uniqueEmployeeDaysCount && (
                                <span className="text-xs text-muted-foreground mt-1 block">
                                  ({filteredReports.length} total records)
                                </span>
                              )}
                          </h3>
                            {(filters.startDate || filters.endDate || filters.date) && (
                              <span className="text-xs text-muted-foreground mt-1">
                                {filters.date 
                                  ? `Date: ${format(filters.date, 'MMM dd, yyyy')}`
                                  : filters.startDate && filters.endDate
                                  ? `Date Range: ${format(new Date(filters.startDate), 'MMM dd, yyyy')} - ${format(new Date(filters.endDate), 'MMM dd, yyyy')}`
                                  : filters.startDate
                                  ? `From: ${format(new Date(filters.startDate), 'MMM dd, yyyy')}`
                                  : filters.endDate
                                  ? `To: ${format(new Date(filters.endDate), 'MMM dd, yyyy')}`
                                  : ''}
                              </span>
                            )}
                          </div>
                          {selectedIds.length > 0 && (
                            <span className="text-sm text-blue-600 dark:text-blue-400 font-medium bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
                              {selectedIds.length} selected
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2 items-center">
                          <PDFDownloadButton
                            reports={currentReports} // Use paginated data for display
                            allReports={filteredReports} // Use all filtered data for PDF generation
                            fileName={`attendance-report-${new Date().toISOString().split('T')[0]}.pdf`}
                            showProgress={true}
                            includeImages={true}
                            quality="high"
                            onSuccess={() => {
                              console.log('✅ Mobile PDF download completed successfully using enhanced service');
                            }}
                            onError={(error: Error) => {
                              console.error('❌ Mobile PDF download failed:', error);
                              alert('Failed to generate PDF. Please try again.');
                            }}
                          >
                            {/* <Download className="mr-2 h-4 w-4" /> */}
                            PDF
                          </PDFDownloadButton>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              // Lazy load XLSX only when needed
                              const XLSX = await loadXLSX();
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
                          >
                            <FileDown className="mr-2 h-4 w-4" />
                            XLS
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleRefresh}
                            disabled={isLoading || isUpdating}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {/* Full Width Bulk Action Buttons */}
                      {selectedIds.length > 0 && !isReadonly && (
                        <div className="mb-4 flex flex-col sm:flex-row gap-2">
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
                              <button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 touch-button shadow-sm">
                                <Edit3 className="h-4 w-4" />
                                Bulk Update {selectedIds.length} Record{selectedIds.length !== 1 ? 's' : ''}
                              </button>
                            }
                          />
                          <BulkDeleteModal
                            selectedIds={selectedIds}
                            selectedRecords={selectedIds.map(id => {
                              const report = filteredReports.find(r => r._id === id);
                              return {
                                _id: id,
                                employee: report?.employee || 'Unknown',
                                date: report?.date || ''
                              };
                            })}
                            onSuccess={() => {
                              setSelectedIds([]);
                              handleRefresh();
                            }}
                          >
                            <button className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 touch-button shadow-sm">
                              <Trash2 className="h-4 w-4" />
                              Bulk Delete {selectedIds.length} Record{selectedIds.length !== 1 ? 's' : ''}
                            </button>
                          </BulkDeleteModal>
                        </div>
                      )}
                    
                    {filteredReports.length === 0 ? (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        No reports found
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {/* Mobile Select All Header */}
                        {!isReadonly && (
                          <div className="flex items-center gap-3 mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                            <input
                              type="checkbox"
                              checked={currentReports.length > 0 && currentReports.every(report => 
                                selectedIds.includes(report._id || '')
                              )}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedIds(currentReports.map(report => report._id || '').filter(Boolean));
                                } else {
                                  setSelectedIds([]);
                                }
                              }}
                              className="h-5 w-5 rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                            />
                            <div className="flex-1">
                              <span className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                                Select All ({currentReports.length} records on this page)
                              </span>
                              {selectedIds.length > 0 && (
                                <div className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                                  {selectedIds.length} selected (from all pages)
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {currentReports.map((report) => (
                          <div key={report._id} className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                {!isReadonly && (
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
                                {/* Employee Profile Image */}
                                <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                                  {(report.employeeId?.image || report.employeePhoto) ? (
                                    <img
                                      src={getImageUrl(report.employeeId?.image || report.employeePhoto) || `https://placehold.co/400x400/6366f1/ffffff?text=${report.employee?.charAt(0).toUpperCase() || 'E'}`}
                                      alt={report.employee}
                                      className="w-full h-full object-cover"
                                      loading="lazy"
                                      onError={(e) => {
                                        e.currentTarget.src = `https://placehold.co/400x400/6366f1/ffffff?text=${report.employee?.charAt(0).toUpperCase() || 'E'}`;
                                      }}
                                    />
                                  ) : (
                                    <img
                                      src={`https://placehold.co/400x400/6366f1/ffffff?text=${report.employee?.charAt(0).toUpperCase() || 'E'}`}
                                      alt={report.employee}
                                      className="w-full h-full object-cover"
                                    />
                                  )}
                                </div>
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
                            
                            {/* {report.note && (
                              <div className="mt-2 text-sm">
                                <span className="text-gray-500 dark:text-gray-400">Note:</span>
                                <div className="font-medium text-gray-900 dark:text-gray-100 mt-1">
                                  {report.note}
                                </div>
                              </div>
                            )} */}
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
                                <DeleteAttendanceModal
                                  attendanceId={report._id || ''}
                                  employeeName={report.employee}
                                  date={report.date}
                                  onSuccess={() => {
                                    console.log('🔄 Delete success - refreshing mobile view');
                                    handleRefresh();
                                  }}
                                >
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    className="text-white bg-red-600 hover:bg-red-700 flex-1"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </Button>
                                </DeleteAttendanceModal>
                              </div>
                            )}
                          </div>
                        ))}
                        
                        {/* Mobile Bulk Action Buttons */}
                        {selectedIds.length > 0 && !isReadonly && (
                          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 space-y-2">
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
                            <BulkDeleteModal
                              selectedIds={selectedIds}
                              selectedRecords={selectedIds.map(id => {
                                const report = filteredReports.find(r => r._id === id);
                                return {
                                  _id: id,
                                  employee: report?.employee || 'Unknown',
                                  date: report?.date || ''
                                };
                              })}
                              onSuccess={() => {
                                setSelectedIds([]);
                                handleRefresh();
                              }}
                            >
                              <button className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-4 rounded-lg transition-colors touch-button">
                                <Trash2 className="inline mr-2 h-4 w-4" />
                                Bulk Delete {selectedIds.length} Record{selectedIds.length !== 1 ? 's' : ''}
                              </button>
                            </BulkDeleteModal>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Pagination Controls - Mobile */}
                    {totalPages > 1 && (
                      <div className="flex flex-col items-center gap-3 p-4 border-t">
                        {/* Page Info */}
                        <span className="text-sm text-muted-foreground">
                          Page {currentPage} of {totalPages}
                        </span>
                        
                        {/* Touch Slider */}
                        <div className="flex items-center gap-3 w-full max-w-xs">
                          <button
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="flex-shrink-0 w-10 h-10 border border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            ←
                          </button>
                          
                          {/* Mobile Slider Track */}
                          <div className="flex-1 relative">
                            <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-blue-500 rounded-full transition-all duration-300 ease-out"
                                style={{ 
                                  width: `${(currentPage / totalPages) * 100}%`
                                }}
                              />
                            </div>
                            
                            {/* Mobile Slider Handle */}
                            <div 
                              className="absolute top-1/2 w-8 h-8 bg-blue-500 rounded-full border-3 border-white dark:border-gray-800 shadow-lg cursor-pointer transform -translate-y-1/2 -translate-x-4 transition-all duration-300 ease-out active:scale-95"
                              style={{ 
                                left: `${((currentPage - 1) / (totalPages - 1)) * 100}%`
                              }}
                              onTouchStart={(e) => {
                                e.preventDefault();
                                const handle = e.currentTarget;
                                const track = handle.parentElement;
                                if (!track) return;
                                
                                const handleTouchMove = (e: TouchEvent) => {
                                  e.preventDefault();
                                  const rect = track.getBoundingClientRect();
                                  const touchX = e.touches[0].clientX - rect.left;
                                  const percentage = Math.max(0, Math.min(1, touchX / rect.width));
                                  const newPage = Math.round(percentage * (totalPages - 1)) + 1;
                                  handlePageChange(Math.max(1, Math.min(totalPages, newPage)));
                                };
                                
                                const handleTouchEnd = () => {
                                  document.removeEventListener('touchmove', handleTouchMove);
                                  document.removeEventListener('touchend', handleTouchEnd);
                                };
                                
                                document.addEventListener('touchmove', handleTouchMove, { passive: false });
                                document.addEventListener('touchend', handleTouchEnd);
                              }}
                              onClick={(e) => {
                                const rect = e.currentTarget.parentElement?.getBoundingClientRect();
                                if (rect) {
                                  const clickX = e.clientX - rect.left;
                                  const percentage = clickX / rect.width;
                                  const newPage = Math.round(percentage * (totalPages - 1)) + 1;
                                  handlePageChange(Math.max(1, Math.min(totalPages, newPage)));
                                }
                              }}
                            />
                          </div>
                          
                          <button
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="flex-shrink-0 w-10 h-10 border border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            →
                          </button>
                        </div>
                        
                        {/* Quick Page Numbers for Mobile */}
                        <div className="flex items-center gap-1 flex-wrap justify-center">
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum;
                            if (totalPages <= 5) {
                              pageNum = i + 1;
                            } else if (currentPage <= 3) {
                              pageNum = i + 1;
                            } else if (currentPage >= totalPages - 2) {
                              pageNum = totalPages - 4 + i;
                            } else {
                              pageNum = currentPage - 2 + i;
                            }
                            
                            return (
                              <button
                                key={pageNum}
                                onClick={() => handlePageChange(pageNum)}
                                className={`w-8 h-8 text-xs rounded-lg border transition-colors ${
                                  currentPage === pageNum 
                                    ? 'bg-blue-500 text-white border-blue-500' 
                                    : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                                }`}
                              >
                                {pageNum}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Desktop Table Layout */}
                <div className="hidden sm:block">
                  <ReportsTable 
                    key={`reports-${attendanceList.length}`} // Force re-render when data changes
                    reports={currentReports} // Use paginated data for table display
                    allReports={filteredReports} // Pass all reports for PDF generation
                    onRefresh={handleRefresh} 
                    disableActions={isReadonly}
                    loading={isLoading || isUpdating}
                    totalCount={displayCount}
                    totalRecords={filteredReports.length}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    dateFilter={{
                      date: filters.date,
                      startDate: filters.startDate,
                      endDate: filters.endDate,
                    }}
                    filters={{
                      managerId: filters.managerId,
                      employeeId: filters.employeeId,
                      startDate: filters.startDate,
                      endDate: filters.endDate,
                      order: filters.order,
                      shift: filters.shift,
                    }}
                  />
                  
                  {/* Desktop Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t bg-white dark:bg-gray-900">
                      {/* Page Info */}
                      <div className="text-sm text-gray-700 dark:text-gray-300">
                        Showing {startIndex + 1} to {Math.min(endIndex, displayCount)} of {displayCount} results
                      </div>
                      
                      {/* Pagination Controls */}
                      <div className="flex items-center space-x-2">
                        {/* Previous Button */}
                        <button
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                          className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
                        >
                          Previous
                        </button>
                        
                        {/* Page Numbers */}
                        <div className="flex items-center space-x-1">
                          {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                            let pageNum;
                            if (totalPages <= 7) {
                              pageNum = i + 1;
                            } else if (currentPage <= 4) {
                              pageNum = i + 1;
                            } else if (currentPage >= totalPages - 3) {
                              pageNum = totalPages - 6 + i;
                            } else {
                              pageNum = currentPage - 3 + i;
                            }
                            
                            return (
                              <button
                                key={pageNum}
                                onClick={() => handlePageChange(pageNum)}
                                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                                  currentPage === pageNum 
                                    ? 'bg-blue-600 text-white' 
                                    : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700'
                                }`}
                              >
                                {pageNum}
                              </button>
                            );
                          })}
                        </div>
                        
                        {/* Next Button */}
                        <button
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    );
}