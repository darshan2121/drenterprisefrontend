"use client";

import { useState, useMemo, useEffect } from "react";
import { format } from "date-fns";
import { ReportsFilter } from "@/components/admin/ReportsFilter";
import { EditReportModal } from "@/components/admin/EditReportModal";
import { DeleteAttendanceModal } from "@/components/admin/DeleteAttendanceModal";
import { BulkUpdateModal } from "@/components/admin/BulkUpdateModal";
import { BulkDeleteModal } from "@/components/admin/BulkDeleteModal";
import { Button } from "@/components/ui/button";
import { getApiUrl } from "@/lib/config";
import { RefreshCw, Edit3, Trash2, CheckSquare, Square } from "lucide-react";
import { CardContent } from "@/components/ui/card";
import { DebouncedSearch } from "@/components/ui/debounced-search";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type AttendanceManagementProps = {
  attendanceList: any[];
  isLoading: boolean;
  managers: { name: string; _id: string }[];
  employees: { name: string; _id: string }[];
  filters: {
    managerId: string;
    employeeId: string;
    shift: string;
    date?: Date;
    startDate?: string;
    endDate?: string;
    order: string;
  };
  onFiltersChange: (filters: any) => void;
  onRefresh: () => void;
};

export function AttendanceManagement({
  attendanceList,
  isLoading,
  managers,
  employees,
  filters,
  onFiltersChange,
  onRefresh,
}: AttendanceManagementProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [searchQuery, setSearchQuery] = useState("");

  // Helper function to get image URL - memoized to avoid recalculation
  const getImageUrl = useMemo(() => {
    const apiUrl = getApiUrl();
    let baseUrl = apiUrl;
    
    if (baseUrl.endsWith('/api')) {
      baseUrl = baseUrl.slice(0, -4);
    } else if (baseUrl.endsWith('/api/')) {
      baseUrl = baseUrl.slice(0, -5);
    }
    
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    
    return (image: string | undefined) => {
      if (!image) return undefined;
      return `${cleanBaseUrl}/static/${image}`;
    };
  }, []);

  // Format attendance data
  const formattedReports = useMemo(() => {
    const formatISTTime = (dateString: string) => {
      if (!dateString) return '--';
      
      try {
        const utcDate = new Date(dateString);
        if (isNaN(utcDate.getTime())) return '--';
        
        const localTime = new Date(utcDate);
        const hours = localTime.getHours();
        const minutes = localTime.getMinutes();
        const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
        const ampm = hours >= 12 ? 'PM' : 'AM';
        return `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
      } catch (error) {
        return '--';
      }
    };

    return attendanceList.map(att => ({
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
      stepInDate: att.stepIn ? format(new Date(att.stepIn), 'yyyy-MM-dd') : '--',
      stepOutDate: att.stepOut ? format(new Date(att.stepOut), 'yyyy-MM-dd') : '--',
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
    }));
  }, [attendanceList]);

  // Apply filters and search
  const filteredReports = useMemo(() => {
    return formattedReports.filter(report => {
      const matchEmployee = !filters.employeeId || 
        (report.employee && employees.find(e => e._id === filters.employeeId && e.name === report.employee));
      
      const matchManager = !filters.managerId || 
        (attendanceList.find(att => att._id === report._id)?.managerId?._id === filters.managerId);
      
      const matchShift = !filters.shift || report.shift === filters.shift;
      
      let matchDate = true;
      if (filters.date) {
        const filterDateStr = format(filters.date, 'yyyy-MM-dd');
        matchDate = report.date === filterDateStr;
      }
      
      // Search filter
      const matchSearch = !searchQuery || 
        report.employee?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.date?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.shift?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.clockIn?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.clockOut?.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchManager && matchEmployee && matchShift && matchDate && matchSearch;
    });
  }, [formattedReports, filters, employees, managers, attendanceList, searchQuery]);

  // Pagination
  const itemsToShow = itemsPerPage === -1 ? filteredReports.length : itemsPerPage;
  const totalPages = Math.ceil(filteredReports.length / itemsToShow);
  const startIndex = (currentPage - 1) * itemsToShow;
  const endIndex = startIndex + itemsToShow;
  const currentReports = filteredReports.slice(startIndex, endIndex);

  // Reset to first page when filters or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters.managerId, filters.employeeId, filters.shift, filters.date, searchQuery, itemsPerPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(currentReports.map(report => report._id || '').filter(Boolean));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
    }
  };

  const allSelected = currentReports.length > 0 && currentReports.every(report => 
    selectedIds.includes(report._id || '')
  );

  return (
    <div className="overflow-hidden">
      {/* Filters */}
      <ReportsFilter
        employees={employees}
        managers={managers}
        onManagerChange={(id) => onFiltersChange({ ...filters, managerId: id })}
        onEmployeeChange={(id) => onFiltersChange({ ...filters, employeeId: id })}
        onShiftChange={(shift) => onFiltersChange({ ...filters, shift })}
        onDateChange={(date) => onFiltersChange({ ...filters, date })}
      />

      {/* Search and Controls */}
      <CardContent className="p-4 sm:p-6 border-b space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Attendance Records ({filteredReports.length})
            </h3>
            {selectedIds.length > 0 && (
              <span className="text-sm text-blue-600 dark:text-blue-400 font-medium bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
                {selectedIds.length} selected
              </span>
            )}
          </div>
          <div className="flex gap-2 items-center w-full sm:w-auto">
            <Select
              value={itemsPerPage === -1 ? "all" : itemsPerPage.toString()}
              onValueChange={(value) => {
                setItemsPerPage(value === "all" ? -1 : parseInt(value));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[120px] h-9 text-sm">
                <SelectValue placeholder="Limit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="40">40</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        
        {/* Search Bar */}
        <div className="w-full">
          <DebouncedSearch
            placeholder="Search by employee, date, shift, location, or time..."
            value={searchQuery}
            onChange={setSearchQuery}
            onSearch={setSearchQuery}
            className="w-full"
          />
        </div>
      </CardContent>

      {/* Bulk Actions Buttons */}
      {selectedIds.length > 0 && (
        <CardContent className="p-4 border-b bg-blue-50 dark:bg-blue-900/20">
          <div className="flex flex-col sm:flex-row gap-2">
            <BulkUpdateModal
              selectedIds={selectedIds}
              onSuccess={() => {
                setSelectedIds([]);
                onRefresh();
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
                <Button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white">
                  <Edit3 className="h-4 w-4 mr-2" />
                  Bulk Update {selectedIds.length} Record{selectedIds.length !== 1 ? 's' : ''}
                </Button>
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
                onRefresh();
              }}
            >
              <Button 
                variant="destructive" 
                className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete {selectedIds.length} Record{selectedIds.length !== 1 ? 's' : ''}
              </Button>
            </BulkDeleteModal>
          </div>
        </CardContent>
      )}

      {/* Loading State */}
      {isLoading ? (
        <CardContent className="p-8 text-center text-gray-500 dark:text-gray-400">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span>Loading attendance records...</span>
          </div>
        </CardContent>
      ) : filteredReports.length === 0 ? (
        <CardContent className="p-8 text-center text-gray-500 dark:text-gray-400">
          No attendance records found
        </CardContent>
      ) : (
        <>
          {/* Select All Header */}
          <CardContent className="p-4 border-b">
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleSelectAll(!allSelected)}
                className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
              >
                {allSelected ? (
                  <CheckSquare className="h-5 w-5 text-blue-600" />
                ) : (
                  <Square className="h-5 w-5 text-gray-400" />
                )}
                <span>Select All ({currentReports.length} on this page)</span>
              </button>
            </div>
          </CardContent>

          {/* Attendance List */}
          <div className="divide-y">
            {currentReports.map((report, index) => {
              const isSelected = selectedIds.includes(report._id || '');
              
              return (
                <CardContent key={report._id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <div className="flex items-start gap-4">
                    {/* Checkbox */}
                    <button
                      onClick={() => handleSelectOne(report._id || '', !isSelected)}
                      className="mt-1"
                    >
                      {isSelected ? (
                        <CheckSquare className="h-5 w-5 text-blue-600" />
                      ) : (
                        <Square className="h-5 w-5 text-gray-400" />
                      )}
                    </button>

                    {/* Employee Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                          {(report.employeeId?.image || report.employeePhoto) ? (
                            <img
                              src={getImageUrl(report.employeeId?.image || report.employeePhoto) || `https://placehold.co/400x400/6366f1/ffffff?text=${report.employee?.charAt(0).toUpperCase() || 'E'}`}
                              alt={report.employee}
                              className="w-full h-full object-cover"
                              loading="lazy"
                              decoding="async"
                              onError={(e) => {
                                e.currentTarget.src = `https://placehold.co/400x400/6366f1/ffffff?text=${report.employee?.charAt(0).toUpperCase() || 'E'}`;
                              }}
                            />
                          ) : (
                            <img
                              src={`https://placehold.co/400x400/6366f1/ffffff?text=${report.employee?.charAt(0).toUpperCase() || 'E'}`}
                              alt={report.employee}
                              className="w-full h-full object-cover"
                              loading="lazy"
                              decoding="async"
                            />
                          )}
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-gray-100">
                            {report.employee}
                          </h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {report.date} • {report.shift}
                          </p>
                        </div>
                      </div>

                      {/* Attendance Details */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm mt-3">
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Clock In:</span>
                          <div className="font-medium text-gray-900 dark:text-gray-100">{report.clockIn}</div>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Clock Out:</span>
                          <div className="font-medium text-gray-900 dark:text-gray-100">{report.clockOut}</div>
                        </div>
                        {report.totalTime && (
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Total Time:</span>
                            <div className="font-medium text-gray-900 dark:text-gray-100">{report.totalTime} min</div>
                          </div>
                        )}
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Status:</span>
                          <div>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              report.status === 'Present' 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            }`}>
                              {report.status}
                            </span>
                          </div>
                        </div>
                      </div>

                      {report.location && report.location !== '--' && (
                        <div className="mt-2 text-sm">
                          <span className="text-gray-500 dark:text-gray-400">Location: </span>
                          <span className="text-gray-900 dark:text-gray-100">{report.location}</span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <EditReportModal 
                        report={report} 
                        onRefresh={onRefresh}
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
                          onRefresh();
                        }}
                      >
                        <Button
                          variant="destructive"
                          size="sm"
                          className="text-white bg-red-600 hover:bg-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </DeleteAttendanceModal>
                    </div>
                  </div>
                </CardContent>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && itemsPerPage !== -1 && (
            <CardContent className="p-4 border-t">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  Showing {startIndex + 1} to {Math.min(currentReports.length, filteredReports.length)} of {filteredReports.length} results
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
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
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </CardContent>
          )}
        </>
      )}
    </div>
  );
}


