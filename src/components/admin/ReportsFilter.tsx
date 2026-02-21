"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon, Filter, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CardContent, CardFooter } from "../ui/card"
import { useIsMobile } from "@/hooks/use-mobile"

type Props = {
    employees: { name: string; _id: string }[];
    managers: { name: string; _id: string }[];
    onManagerChange?: (id: string) => void;
    onEmployeeChange?: (id: string) => void;
    onShiftChange?: (shift: string) => void;
    onDateChange?: (date: Date | undefined) => void;
}

export function ReportsFilter({ employees, managers, onManagerChange, onEmployeeChange, onShiftChange, onDateChange }: Props) {
    const [date, setDate] = React.useState<Date>();
    const [selectedManager, setSelectedManager] = React.useState<string>("");
    const [selectedEmployee, setSelectedEmployee] = React.useState<string>("");
    const [selectedShift, setSelectedShift] = React.useState<string>("");
    const isMobile = useIsMobile();
  
    const handleClear = () => {
      setDate(undefined);
      setSelectedManager("");
      setSelectedEmployee("");
      setSelectedShift("");
      onManagerChange?.("");
      onEmployeeChange?.("");
      onShiftChange?.("");
      onDateChange?.(undefined);
    };
  
    return (
      <>
        <CardContent className="p-2 sm:p-4 md:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal h-10 sm:h-9 text-sm sm:text-base",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align={isMobile ? "center" : "start"}>
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => {
                    setDate(d);
                    onDateChange?.(d);
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <Select 
              value={selectedManager} 
              onValueChange={(val) => {
                setSelectedManager(val);
                onManagerChange?.(val);
              }}
            >
              <SelectTrigger className="h-10 sm:h-9 text-sm sm:text-base">
                <SelectValue placeholder="Filter by Supervisor" />
              </SelectTrigger>
              <SelectContent>
                {managers.map(m => <SelectItem key={m._id} value={m._id}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select 
              value={selectedEmployee} 
              onValueChange={(val) => {
                setSelectedEmployee(val);
                onEmployeeChange?.(val);
              }}
            >
              <SelectTrigger className="h-10 sm:h-9 text-sm sm:text-base">
                <SelectValue placeholder="Filter by Employee" />
              </SelectTrigger>
              <SelectContent>
                {employees.map(e => <SelectItem key={e._id} value={e._id}>{e.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select
              value={selectedShift}
              onValueChange={(val) => {
                setSelectedShift(val);
                onShiftChange?.(val);
              }}
            >
              <SelectTrigger className="h-10 sm:h-9 text-sm sm:text-base">
                <SelectValue placeholder="Filter by Shift" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="morning">Morning</SelectItem>
                <SelectItem value="evening">Evening</SelectItem>
                <SelectItem value="night">Night</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row justify-end gap-2 border-t pt-4 sm:pt-6 px-2 sm:px-4 md:px-6">
          <Button variant="outline" size={isMobile ? "sm" : "default"} className="w-full sm:w-auto" onClick={handleClear}>
            <X className="mr-2 h-4 w-4" />
            Clear
          </Button>
        </CardFooter>
      </>
    );
  }
