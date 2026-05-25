'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, CheckCircle, AlertCircle, UtensilsCrossed } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

interface OrderItem { id: string; name: string; quantity: number; price: number }
interface Order {
  id: string;
  status: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  order_type?: 'dining' | 'takeaway';
  table_number?: string;
  items: OrderItem[];
  notes?: string;
  created_at: string;
}

export default function ChefDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/orders')
      .then((r) => r.json())
      .then(setOrders);
  }, []);

  const pendingCount   = orders.filter((o) => o.status === 'pending').length;
  const preparingCount = orders.filter((o) => o.status === 'preparing').length;
  const readyCount     = orders.filter((o) => o.status === 'ready').length;

  const recentOrders = orders
    .filter((o) => o.status !== 'completed' && o.status !== 'cancelled')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl md:text-2xl md:text-3xl font-bold text-foreground">Kitchen Display System</h1>
        <p className="text-muted-foreground">Monitor and manage active orders</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-yellow-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
            <p className="text-xs text-muted-foreground">Ready to prepare</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{preparingCount}</div>
            <p className="text-xs text-muted-foreground">Being prepared</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ready</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{readyCount}</div>
            <p className="text-xs text-muted-foreground">Awaiting pickup</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-gray-400">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Items</CardTitle>
            <UtensilsCrossed className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {orders.filter((o) => o.status !== 'completed' && o.status !== 'cancelled').reduce((s, o) => s + (o.items?.length ?? 0), 0)}
            </div>
            <p className="text-xs text-muted-foreground">Items to cook</p>
          </CardContent>
        </Card>
      </div>

      {recentOrders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Active Orders</CardTitle>
            <CardDescription>Orders currently in the kitchen</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentOrders.map((order) => {
              const minutesAgo = Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000);
              return (
                <div key={order.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <span className="font-semibold text-sm">#{order.id}</span>
                    <p className="text-xs text-muted-foreground">{order.order_type === 'takeaway' ? 'Takeaway' : `Table ${order.table_number}`} • {(order.items ?? []).map((i) => `${i.name} ×${i.quantity}`).join(', ')}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{minutesAgo}m ago</span>
                    <Badge className={
                      order.status === 'pending'   ? 'bg-yellow-100 text-yellow-900' :
                      order.status === 'preparing' ? 'bg-blue-100 text-blue-900' :
                      'bg-green-100 text-green-900'
                    }>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
        <CardContent>
          <Button onClick={() => router.push('/chef/orders')} className="w-full">
            Open Full Kitchen Display →
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
