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

export default function AdminLoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = () => {
    setIsLoading(true);
    // Simulate a network request
    setTimeout(() => {
      router.push('/admin/dashboard');
    }, 1000);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="mx-auto max-w-sm w-full shadow-lg">
        <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center pb-2">
                <Image src="https://i.postimg.cc/VvNcC0Cw/image-removebg-preview-1.png" alt="D.R. Enterprise Logo" width={80} height={80} />
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
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                required
                defaultValue="admin@example.com"
                disabled={isLoading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required defaultValue="password" disabled={isLoading} />
            </div>
            <Button onClick={handleLogin} disabled={isLoading} className="w-full">
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Login
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
