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

type Props = {
    employees: { name: string }[];
    managers: { name: string }[];
}

export function ReportsFilter({ employees, managers }: Props) {
  const [date, setDate] = React.useState<Date>()

  return (
    <>
    <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Popover>
                <PopoverTrigger asChild>
                <Button
                    variant={"outline"}
                    className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                    )}
                >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                />
                </PopoverContent>
            </Popover>
            <Select>
                <SelectTrigger>
                    <SelectValue placeholder="Filter by Manager" />
                </SelectTrigger>
                <SelectContent>
                    {managers.map(m => <SelectItem key={m.name} value={m.name}>{m.name}</SelectItem>)}
                </SelectContent>
            </Select>
            <Select>
                <SelectTrigger>
                    <SelectValue placeholder="Filter by Employee" />
                </SelectTrigger>
                <SelectContent>
                    {employees.map(e => <SelectItem key={e.name} value={e.name}>{e.name}</SelectItem>)}
                </SelectContent>
            </Select>
        </div>
    </CardContent>
    <CardFooter className="flex justify-end gap-2 border-t pt-6">
        <Button variant="outline">
            <X className="mr-2 h-4 w-4" />
            Clear
        </Button>
        <Button>
            <Filter className="mr-2 h-4 w-4" />
            Filter
        </Button>
    </CardFooter>
    </>
  )
}
