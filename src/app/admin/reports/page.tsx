"use client";

import { ReportsFilter } from "@/components/admin/ReportsFilter";
import { ReportsTable } from "@/components/admin/ReportsTable";
import { Card } from "@/components/ui/card";
import { useDispatch, useSelector } from "react-redux";
import { useEffect, useState } from "react";
import { fetchAttendance } from "@/store/slices/attendanceSlice";
import { RootState } from "@/store";
import { format } from "date-fns";
import { ENDPOINTS } from "@/lib/endpoints";
import { http } from "@/lib/http";

export default function ReportsPage() {
    const dispatch = useDispatch();
    const attendanceList = useSelector((state: RootState) => state.attendance.attendanceList);
    const isLoading = useSelector((state: RootState) => state.attendance.isLoadingAttendance);

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
      startDate: undefined as string | undefined,
      endDate: undefined as string | undefined,
      order: "desc",
    });

    useEffect(() => {
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

    // Convert API data to expected format
    const formattedReports = attendanceList.map(att => ({
        date: att.stepIn ? format(new Date(att.stepIn), 'yyyy-MM-dd') : '--',
        employee: att.employeeId?.name || att.employeeId || 'Unknown',
        shift: att.employeeId?.shift || att.shift || 'Regular',
        location: att.address || '--',
        status: att.status || (att.stepOut ? 'Present' : 'Absent'),
        clockIn: att.stepIn ? format(new Date(att.stepIn), 'HH:mm') : '--',
        clockOut: att.stepOut ? format(new Date(att.stepOut), 'HH:mm') : '--',
      }));

      const handleRefresh = () => {
        dispatch(
          fetchAttendance({
            managerId: filters.managerId || undefined,
            employeeId: filters.employeeId || undefined,
            startDate: filters.startDate,
            endDate: filters.endDate,
            order: filters.order,
          }) as any
        );
      };

    return (
      <div className="flex flex-col gap-6 px-4 w-full max-w-md md:max-w-3xl lg:max-w-5xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold font-headline">Attendance Reports</h1>
          <p className="text-muted-foreground">Generate, filter, and edit attendance reports.</p>
        </div>
        <Card className="shadow-sm w-full">
          {filtersLoading ? (
            <div className="p-6 text-center text-muted-foreground">Loading filters...</div>
          ) : (
            <ReportsFilter
              employees={employees}
              managers={managers}
              onManagerChange={(id) => setFilters((f) => ({ ...f, managerId: id }))}
              onEmployeeChange={(id) => setFilters((f) => ({ ...f, employeeId: id }))}
            />
          )}
        </Card>
        <Card className="shadow-sm w-full">
          {isLoading ? (
            <div className="p-6 text-center text-muted-foreground">Loading...</div>
          ) : (
            <ReportsTable reports={formattedReports} onRefresh={handleRefresh} />
          )}
        </Card>
      </div>
    );
  }
