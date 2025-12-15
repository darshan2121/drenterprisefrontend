"use client";

import { MusterRollReport } from "@/components/admin/MusterRollReport";

export default function MusterRollReportPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="mx-auto w-full max-w-7xl px-3 py-6 sm:px-6 lg:px-8">
        <MusterRollReport />
      </div>
    </div>
  );
}

