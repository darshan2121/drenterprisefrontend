"use client"

import { useEffect, useState } from "react";
import { getManagers } from "@/lib/api";
import { ReportsFilter } from "./ReportsFilter";
import { useDispatch } from "react-redux";
import { fetchEmployees } from "@/store/slices/employeeSlice";

export function ReportsFilterContainer({ onManagerChange, onEmployeeChange }: {
  onManagerChange?: (id: string) => void;
  onEmployeeChange?: (id: string) => void;
}) {
  const [managers, setManagers] = useState<{ name: string; _id: string }[]>([]);
  const [employees, setEmployees] = useState<{ name: string; _id: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getManagers(),
      getEmployees()
    ]).then(([mgrRes, empRes]) => {
      const managers = (mgrRes as { data?: { name: string; _id: string }[] }).data || [];
      const employees = (empRes as { data?: { name: string; _id: string }[] }).data || [];
      setManagers(managers);
      setEmployees(employees);
      setLoading(false);
    }).catch(err => {
      setError("Failed to load managers or employees");
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="p-4">Loading filters...</div>;
  if (error) return <div className="p-4 text-destructive">{error}</div>;

  return (
    <ReportsFilter 
      managers={managers} 
      employees={employees} 
      onManagerChange={onManagerChange}
      onEmployeeChange={onEmployeeChange}
    />
  );
} 