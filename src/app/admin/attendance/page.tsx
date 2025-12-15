"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchAttendance } from "@/store/slices/attendanceSlice";
import { RootState } from "@/store";
import { format } from "date-fns";
import { ENDPOINTS } from "@/lib/endpoints";
import { http } from "@/lib/http";
import { getApiUrl } from "@/lib/config";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Card } from "@/components/ui/card";
import { AttendanceManagement } from "@/components/admin/AttendanceManagement";
import { authService } from "@/services/authService";
import { useRouter } from "next/navigation";
import { isAdminAuthenticated } from "@/utils/auth";

export default function AttendancePage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);
  const isReadonly = authService.getCurrentUser()?.role === "readonly";

  const dispatch = useDispatch();
  const attendanceList = useSelector((state: RootState) => state.attendance.attendanceList);
  const isLoading = useSelector((state: RootState) => state.attendance.isLoadingAttendance);

  // Fetch managers and employees from backend
  const [managers, setManagers] = useState<{ name: string; _id: string }[]>([]);
  const [employees, setEmployees] = useState<{ name: string; _id: string }[]>([]);
  const [filtersLoading, setFiltersLoading] = useState(true);

  useEffect(() => {
    if (!isAdminAuthenticated()) {
      setIsAuthed(false);
      setChecking(false);
      router.replace("/admin/login");
    } else {
      setIsAuthed(true);
      setChecking(false);
    }
  }, [router]);

  // Redirect readonly users - they shouldn't access this page
  useEffect(() => {
    if (isReadonly) {
      router.replace("/admin/reports");
    }
  }, [isReadonly, router]);

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

  // Debounced filter effect to prevent excessive API calls
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchAttendanceData();
    }, 300); // 300ms delay

    return () => clearTimeout(timeoutId);
  }, [filters.managerId, filters.employeeId, filters.startDate, filters.endDate, filters.order, fetchAttendanceData]);

  // Initial data fetch
  useEffect(() => {
    if (isAuthed && !isReadonly) {
      fetchAttendanceData();
    }
  }, [isAuthed, isReadonly]); // Only run once on mount

  if (checking || !isAuthed || isReadonly) {
    return (
      <div className="flex justify-center items-center min-h-screen px-4">
        <span className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="w-full max-w-7xl mx-auto px-3 py-4 space-y-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <AdminPageHeader
            title="Attendance Management"
            subtitle="View and manage employee attendance records."
          />
        </div>

        <Card className="w-full border-0 shadow-sm overflow-hidden">
          {filtersLoading ? (
            <div className="p-6 text-center text-gray-500 dark:text-gray-400">
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                <span>Loading filters...</span>
              </div>
            </div>
          ) : (
            <AttendanceManagement
              attendanceList={attendanceList}
              isLoading={isLoading}
              managers={managers}
              employees={employees}
              filters={filters}
              onFiltersChange={setFilters}
              onRefresh={fetchAttendanceData}
            />
          )}
        </Card>
      </div>
    </div>
  );
}

