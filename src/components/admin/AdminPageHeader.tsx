import React from "react";

interface AdminPageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export const AdminPageHeader: React.FC<AdminPageHeaderProps> = ({ title, subtitle, action }) => (
  <header className="mb-4 px-2 sm:px-0">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex-1 min-w-0">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-headline truncate" tabIndex={0} aria-label={title}>{title}</h1>
        {subtitle && <p className="text-muted-foreground mt-1 text-sm sm:text-base lg:text-lg truncate" tabIndex={0}>{subtitle}</p>}
      </div>
      {action && (
        <div className="w-full sm:w-auto flex-shrink-0 flex justify-start sm:justify-end mt-2 sm:mt-0">
          {action}
        </div>
      )}
    </div>
  </header>
); 