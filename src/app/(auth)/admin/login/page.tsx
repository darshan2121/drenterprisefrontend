"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDispatch, useSelector } from "react-redux";
import { loginAdminAction, clearError } from "@/store/slices/adminSlice";

export default function AdminLoginPage() {
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });
  const router = useRouter();
  const dispatch = useDispatch();
  const { isLoading, error } = useSelector((state: any) => state.admin);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) dispatch(clearError());
  };

  const handleLogin = async () => {
    if (!formData.email || !formData.password) {
      dispatch(clearError());
      return;
    }
    const resultAction = await dispatch(loginAdminAction(formData) as any);
    if (loginAdminAction.fulfilled.match(resultAction)) {
      router.push('/admin/dashboard');
    }
    // error is handled by Redux state
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isLoading) {
      handleLogin();
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="mx-auto max-w-sm w-full shadow-lg">
        <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center pb-2">
                <Image src="/dr-enterprise-logo.png" alt="D.R. Enterprise Logo" width={80} height={80} />
            </div>
          <CardTitle className="text-2xl font-headline">
            Admin Login
          </CardTitle>
          <CardDescription>
            Access the D.R. Enterprise Admin Panel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {error && (
              <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm">
                {error}
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="admin@example.com"
                required
                value={formData.email}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                name="password"
                type="password" 
                required 
                value={formData.password}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                disabled={isLoading} 
              />
            </div>
            <Button onClick={handleLogin} disabled={isLoading} className="w-full">
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLoading ? 'Logging in...' : 'Login'}
            </Button>
          </div>
          <div className="mt-4 text-center text-sm">
            <Link href="/login" className={cn("underline hover:text-primary", isLoading && "pointer-events-none opacity-50")}>
              Login as Manager
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
