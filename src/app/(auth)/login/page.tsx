"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import Image from "next/image";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDispatch, useSelector } from "react-redux";
import { loginManager } from "@/store/slices/authSlice";
import { useToast } from "@/hooks/use-toast";

function isAuthenticated() {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem("managerToken") || !!localStorage.getItem("adminToken");
}

export default function ManagerLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const dispatch = useDispatch();
  const { toast } = useToast();
  const { isLoading, error } = useSelector((state: any) => state.auth);
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (isAuthenticated()) {
      // Redirect to dashboard based on role
      const role = localStorage.getItem("userRole");
      if (role === "admin") {
        router.replace("/admin/dashboard");
      } else if (role === "manager") {
        router.replace("/manager/dashboard");
      } else {
        setChecking(false);
      }
    } else {
      setChecking(false);
    }
  }, [router]);

  if (checking) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <span className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></span>
      </div>
    );
  }

  const handleLogin = async () => {
    try {
      await dispatch(loginManager({ email, password }) as any);
      router.push('/manager/dashboard');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
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
            Welcome to D.R. Enterprise
          </CardTitle>
          <CardDescription>
            Enter your credentials to access your supervisor dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="grid gap-2 relative">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={isLoading}
                className="pr-10"
              />
              <button
                type="button"
                tabIndex={-1}
                className="absolute right-2 top-9 text-muted-foreground hover:text-primary focus:outline-none"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {error && <div className="text-red-500 text-sm text-center">{error}</div>}
            <Button onClick={handleLogin} disabled={isLoading} className="w-full">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Login
            </Button>
          </div>
          <div className="mt-4 text-center text-sm">
            <Link href="/admin/login" className={cn("underline hover:text-primary", isLoading && "pointer-events-none opacity-50")}>Login as Admin</Link>
          </div>
          <div className="mt-2 text-center text-sm">
            <Link href="/login/forgot-password" className={cn("underline hover:text-primary", isLoading && "pointer-events-none opacity-50")}>Forgot Password?</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
