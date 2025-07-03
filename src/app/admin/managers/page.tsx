"use client";

import { ManagersList } from "@/components/admin/ManagersList";
import { Card } from "@/components/ui/card";
import { AddManagerModal } from "@/components/admin/AddManagerModal";
import { useEffect, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchManagers } from "@/store/slices/managerSlice";
import Image from "next/image";

export default function ManagersPage() {
  const dispatch = useDispatch();
  const { managers, isLoading } = useSelector((state: any) => state.manager);

  const fetchManagersCallback = useCallback(() => {
    dispatch(fetchManagers() as any);
  }, [dispatch]);

  useEffect(() => {
    fetchManagersCallback();
  }, [fetchManagersCallback]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline">Managers</h1>
          <p className="text-muted-foreground">Manage all managers in the system.</p>
        </div>
        <AddManagerModal />
      </div>
      <Card className="shadow-sm">
        {isLoading ? (
          <div className="p-8 text-center flex justify-center">
            <Image src="/dr-enterprise-logo.png" alt="D.R. Enterprise Logo" width={80} height={80} className="mx-auto animate-pulse" />
          </div>
        ) : (
          <ManagersList />
        )}
      </Card>
    </div>
  );
}
