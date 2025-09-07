"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { getApiUrl } from "@/lib/config";
import { authService } from "@/services/authService";
import { Loader2, UserCog, Shield, Eye, EyeOff } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Admin {
  _id: string;
  name: string;
  email: string;
  role: string;
  isActive?: boolean; // Optional since backend doesn't have this field yet
  mobile: string;
  address: string;
  createdAt: string;
}

export function AdminManagement() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const { toast } = useToast();
  const currentUser = authService.getCurrentUser();
  const isMobile = useIsMobile();

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${getApiUrl()}/admin/all`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch admins');
      }

      const data = await response.json();
      setAdmins(data);
    } catch (error) {
      console.error('Error fetching admins:', error);
      toast({
        title: "Error",
        description: "Failed to fetch admins",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleAdminStatus = async (adminId: string, isActive: boolean) => {
    try {
      setUpdatingStatus(adminId);
      const response = await fetch(`${getApiUrl()}/admin/${adminId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({ isActive })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update admin status');
      }

      const data = await response.json();
      
      // Update local state
      setAdmins(prev => prev.map(admin => 
        admin._id === adminId ? { ...admin, isActive } : admin
      ));

      toast({
        title: "Success",
        description: `Admin ${isActive ? 'activated' : 'deactivated'} successfully`,
      });
    } catch (error: any) {
      console.error('Error updating admin status:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update admin status",
        variant: "destructive",
      });
    } finally {
      setUpdatingStatus(null);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'superadmin':
        return <Shield className="h-4 w-4" />;
      case 'readonly':
        return <Eye className="h-4 w-4" />;
      default:
        return <UserCog className="h-4 w-4" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'superadmin':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'readonly':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="p-2 sm:p-4 md:p-6">
        {/* Mobile Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Admin Management
          </h2>
          <Badge variant="outline" className="text-sm">
            {admins.length} Admin{admins.length !== 1 ? 's' : ''}
          </Badge>
        </div>

        {/* Mobile Cards Layout */}
        <div className="space-y-3">
          {admins.map((admin) => (
            <Card key={admin._id} className="shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Avatar className="h-10 w-10 flex-shrink-0">
                      <AvatarImage src={`https://placehold.co/100x100/6366f1/ffffff?text=${admin.name.charAt(0).toUpperCase()}`} />
                      <AvatarFallback className="bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400">
                        {admin.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {admin.name}
                        </h3>
                        <Badge className={`${getRoleColor(admin.role)} text-xs`}>
                          <div className="flex items-center gap-1">
                            {getRoleIcon(admin.role)}
                            <span className="capitalize">{admin.role}</span>
                          </div>
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                        {admin.email}
                      </p>
                      
                      {admin.mobile && (
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                          📱 {admin.mobile}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <Badge variant={admin.isActive !== false ? "default" : "secondary"} className="text-xs">
                      {admin.isActive !== false ? "Active" : "Inactive"}
                    </Badge>
                    
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      {new Date(admin.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {admin.address && (
                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                    <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                      📍 {admin.address}
                    </p>
                  </div>
                )}

                {admin.role === 'superadmin' && admin._id === currentUser?.id && (
                  <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                    <p className="text-xs text-yellow-800 dark:text-yellow-200">
                      ⚠️ You cannot deactivate your own superadmin account
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {admins.length === 0 && (
          <Card className="text-center py-8">
            <CardContent>
              <UserCog className="h-10 w-10 mx-auto text-gray-400 mb-3" />
              <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">
                No Admins Found
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                There are no admin accounts in the system.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Desktop Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Admin Management
        </h2>
        <Badge variant="outline" className="text-sm">
          {admins.length} Admin{admins.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Desktop Table Layout */}
      <div className="overflow-x-auto w-full">
        <Table className="min-w-[800px]">
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[80px]">Avatar</TableHead>
              <TableHead className="min-w-[200px]">Name</TableHead>
              <TableHead className="min-w-[200px]">Email</TableHead>
              <TableHead className="min-w-[120px]">Role</TableHead>
              <TableHead className="min-w-[100px]">Status</TableHead>
              <TableHead className="min-w-[120px]">Mobile</TableHead>
              <TableHead className="min-w-[150px]">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {admins.map((admin) => (
              <TableRow key={admin._id}>
                <TableCell>
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={`https://placehold.co/100x100/6366f1/ffffff?text=${admin.name.charAt(0).toUpperCase()}`} />
                    <AvatarFallback className="bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400">
                      {admin.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </TableCell>
                <TableCell className="font-medium">
                  <div className="flex flex-col">
                    <span className="truncate">{admin.name}</span>
                    {admin.address && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        📍 {admin.address}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground truncate">
                  {admin.email}
                </TableCell>
                <TableCell>
                  <Badge className={getRoleColor(admin.role)}>
                    <div className="flex items-center gap-1">
                      {getRoleIcon(admin.role)}
                      <span className="capitalize">{admin.role}</span>
                    </div>
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={admin.isActive !== false ? "default" : "secondary"}>
                    {admin.isActive !== false ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {admin.mobile || "-"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(admin.createdAt).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {admins.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <UserCog className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No Admins Found
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              There are no admin accounts in the system.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
