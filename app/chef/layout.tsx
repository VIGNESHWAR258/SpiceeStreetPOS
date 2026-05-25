'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Navbar } from '@/components/navigation/navbar';

export default function ChefLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (user && user.role !== 'chef') {
      router.push(`/${user.role}`);
    } else if (!user) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading session...</div>;
  }

  if (!user || user.role !== 'chef') {
    return null;
  }

  return (
    <div className="flex h-screen bg-background">
      <Navbar />
      <main className="flex-1 overflow-auto md:ml-64 md:mt-16 mt-16 pt-4 pb-6 px-4 md:px-6 md:pt-6">
        {children}
      </main>
    </div>
  );
}
