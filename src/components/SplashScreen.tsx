"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

const SplashScreen = () => {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/login');
    }, 2500); // Redirect after 2.5 seconds

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <div className="flex flex-col items-center gap-4 animate-pulse">
        <Image src="/dr-enterprise-logo.png" alt="D.R. Enterprise Logo" width={200} height={200} />
      </div>
      <p className="mt-4 text-muted-foreground">Attendance Management System</p>
    </div>
  );
};

export default SplashScreen;
