"use client";

import { ManagersList } from "@/components/admin/ManagersList";
import { Card } from "@/components/ui/card";
import { AddManagerModal } from "@/components/admin/AddManagerModal";
import { useEffect, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchManagers } from "@/store/slices/managerSlice";
import Image from "next/image";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { UserCog, Mail, Phone, Building, MoreVertical, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EditManagerModal } from "@/components/admin/EditManagerModal";
import { useToast } from "@/hooks/use-toast";
import { removeManager } from "@/store/slices/managerSlice";

export default function ManagersPage() {
  const { toast } = useToast();
  const dispatch = useDispatch();
  const { managers, isLoading } = useSelector((state: any) => state.manager);

  const fetchManagersCallback = useCallback(() => {
    dispatch(fetchManagers() as any);
  }, [dispatch]);

  useEffect(() => {
    fetchManagersCallback();
  }, [fetchManagersCallback]);

  const handleDelete = async (manager: any) => {
    try {
      await dispatch(removeManager({ id: manager._id, body: { name: manager.name, email: manager.email } }) as any).unwrap();
      toast({ title: "Deleted", description: `Manager ${manager.name} deleted.` });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to delete manager.", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Mobile-first container */}
      <div className="w-full max-w-7xl mx-auto px-3 py-4 space-y-4 sm:px-6 lg:px-8">
        
        {/* Header Section */}
        <div className="mb-6">
          <AdminPageHeader
            title="Supervisors"
            subtitle="Manage all supervisors in the system."
            action={<AddManagerModal />}
          />
        </div>

        {/* Managers Content */}
        <Card className="w-full border-0 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="flex flex-col items-center space-y-4">
                <Image 
                  src="/dr-enterprise-logo.png" 
                  alt="D.R. Enterprise Logo" 
                  width={60} 
                  height={60} 
                  className="animate-pulse" 
                />
                <span className="text-gray-500 dark:text-gray-400">Loading managers...</span>
              </div>
            </div>
          ) : (
            <div className="overflow-hidden">
              {/* Mobile: Card-based layout, Desktop: Table layout */}
              <div className="block sm:hidden">
                {/* Mobile Cards Layout */}
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      Managers ({managers?.length || 0})
                    </h3>
                  </div>
                  
                  {!managers || managers.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                      <UserCog className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No managers found</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {managers.map((manager: any, index: number) => (
                        <div key={manager._id || index} className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center space-x-3 min-w-0 flex-1">
                              <div className="flex-shrink-0 w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                                <Shield className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className="font-medium text-gray-900 dark:text-gray-100 break-words">
                                  {manager.name || 'Unnamed Manager'}
                                </h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400 break-words">
                                  {manager.email || 'No email provided'}
                                </p>
                              </div>
                            </div>
                            
                            {/* <div className="flex items-center space-x-2"> */}
                               {/* <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                 <MoreVertical className="h-4 w-4" />
                               </Button> */}
                            {/* </div> */}
                          </div>
                          
                          <div className="space-y-2 text-sm">
                            {manager.phone && (
                              <div className="flex items-center space-x-2">
                                <Phone className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                <span className="text-gray-500 dark:text-gray-400">Phone:</span>
                                <span className="font-medium text-gray-900 dark:text-gray-100">
                                  {manager.phone}
                                </span>
                              </div>
                            )}
                            
                            {manager.department && (
                              <div className="flex items-center space-x-2">
                                <Building className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                <span className="text-gray-500 dark:text-gray-400">Department:</span>
                                <span className="font-medium text-gray-900 dark:text-gray-100">
                                  {manager.department}
                                </span>
                              </div>
                            )}
                            
                            {manager.employeeCount !== undefined && (
                              <div className="flex items-center space-x-2">
                                <UserCog className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                <span className="text-gray-500 dark:text-gray-400">Employees:</span>
                                <span className="font-medium text-gray-900 dark:text-gray-100">
                                  {manager.employeeCount}
                                </span>
                              </div>
                            )}
                          </div>
                          
                          {/* Additional Info */}
                          {manager._id && (
                            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                                <span>ID: {manager._id}</span>
                                {manager.createdAt && (
                                  <span>Created: {new Date(manager.createdAt).toLocaleDateString()}</span>
                                )}
                              </div>
                            </div>
                          )}
                          {/* Action Buttons */}
                          <div className="flex gap-2 pt-4">
                            <EditManagerModal manager={manager} />
                            <Button variant="destructive" size="sm" onClick={() => handleDelete(manager)}>
                              Delete
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Desktop Table Layout */}
              <div className="hidden sm:block">
                <ManagersList />
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}