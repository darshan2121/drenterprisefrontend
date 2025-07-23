"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { forgotPassword, verifyOtp } from "@/lib/api";
import { Eye, EyeOff } from "lucide-react";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();

  const handleSendOtp = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await forgotPassword({ email, userType: "manager" });
      setStep("otp");
      setSuccess("OTP sent to your email. Please check your inbox.");
    } catch (err: any) {
      setError(err.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await verifyOtp({ email, userType: "manager", otp, newPassword });
      setSuccess("Password updated successfully! Redirecting to login...");
      setTimeout(() => router.push("/login"), 2000);
    } catch (err: any) {
      setError(err.message || "Failed to verify OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="mx-auto max-w-sm w-full shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-headline">Forgot Password</CardTitle>
          <CardDescription>
            {step === "email"
              ? "Enter your email to receive an OTP."
              : "Enter the OTP sent to your email and set a new password."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {step === "email" && (
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  disabled={loading}
                />
                <Button onClick={handleSendOtp} disabled={loading || !email} className="w-full mt-4">
                  {loading ? "Sending..." : "Send OTP"}
                </Button>
              </div>
            )}
            {step === "otp" && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="otp">OTP</Label>
                  <Input
                    id="otp"
                    type="text"
                    placeholder="Enter OTP"
                    required
                    value={otp}
                    onChange={e => setOtp(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div className="grid gap-2 mt-2 relative">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter new password"
                    required
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    disabled={loading}
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
                <Button onClick={handleVerifyOtp} disabled={loading || !otp || !newPassword} className="w-full mt-4">
                  {loading ? "Verifying..." : "Update Password"}
                </Button>
              </>
            )}
            {error && <div className="text-red-500 text-sm text-center mt-2">{error}</div>}
            {success && <div className="text-green-600 text-sm text-center mt-2">{success}</div>}
            <div className="mt-4 text-center text-sm">
              <Link href="/login" className="underline hover:text-primary">
                Back to Login
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 