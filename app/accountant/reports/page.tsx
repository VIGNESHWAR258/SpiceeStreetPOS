'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ReportsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/accountant');
  }, [router]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Reports Restricted</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Detailed reports are now available only for Admin users. Redirecting to dashboard...</p>
        </CardContent>
      </Card>
    </div>
  );
}
