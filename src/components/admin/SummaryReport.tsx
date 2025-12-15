"use client";

import { useState, useEffect, useCallback } from "react";
import { format, eachDayOfInterval, startOfDay, endOfDay, isSameDay } from "date-fns";
import { Calendar as CalendarIcon, RefreshCw, Loader2 } from "lucide-react";
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
}

export function SummaryReport() {
  const [fromDate, setFromDate] = useState<Date | undefined>(new Date());
  const [toDate, setToDate] = useState<Date | undefined>(new Date());
  const [rangeSummaries, setRangeSummaries] = useState<DailySummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMobile = useIsMobile();

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

    setLoading(true);
    setError(null);

    try {
      const dateRange = getDateRange();
      const shifts = ['morning', 'evening', 'night'];
      
      // Fetch data for all dates and all shifts
      const allPromises: Promise<SummaryData | null>[] = [];
      
      dateRange.forEach(date => {
        const dateString = format(date, "yyyy-MM-dd");
        shifts.forEach(shift => {
          allPromises.push(
            http<SummaryData>(
              `${ENDPOINTS.attendance.summary}?date=${dateString}&shift=${shift}`
            ).catch(err => {
              console.error(`Error fetching ${dateString} ${shift} shift:`, err);
              return null;
            })
          );
        });
      });

      const results = await Promise.all(allPromises);
      
      // Organize results by date
      const summaries: DailySummary[] = dateRange.map((date, dateIndex) => {
        const dateString = format(date, "yyyy-MM-dd");
        const baseIndex = dateIndex * 3;
        
        return {
          date: dateString,
          morning: results[baseIndex] && typeof results[baseIndex] === 'object' && results[baseIndex]?.date ? results[baseIndex] as SummaryData : null,
          evening: results[baseIndex + 1] && typeof results[baseIndex + 1] === 'object' && results[baseIndex + 1]?.date ? results[baseIndex + 1] as SummaryData : null,
          night: results[baseIndex + 2] && typeof results[baseIndex + 2] === 'object' && results[baseIndex + 2]?.date ? results[baseIndex + 2] as SummaryData : null,
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
  }, [fromDate, toDate, getDateRange]);

  useEffect(() => {
    // Auto-fetch when both dates are selected
    if (fromDate && toDate) {
      fetchRangeData();
    } else {
      setRangeSummaries([]);
    }
  }, [fromDate, toDate, fetchRangeData]);

  const formatDateForTable = (dateString: string) => {
    return format(new Date(dateString), "dd-MM-yyyy");
  };

  // Calculate totals for all dates
  const getTotals = () => {
    let morningTotal = 0;
    let eveningTotal = 0;
    let nightTotal = 0;
    let grandTotal = 0;

    rangeSummaries.forEach(summary => {
      morningTotal += summary.morning?.presentEmployees || 0;
      eveningTotal += summary.evening?.presentEmployees || 0;
      nightTotal += summary.night?.presentEmployees || 0;
    });

    grandTotal = morningTotal + eveningTotal + nightTotal;

    return {
      morning: morningTotal,
      evening: eveningTotal,
      night: nightTotal,
      total: grandTotal
    };
  };

  const totals = getTotals();
  const dateRange = getDateRange();

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

          {/* Refresh Button */}
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
