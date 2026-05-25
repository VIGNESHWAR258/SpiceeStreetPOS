'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShoppingCart, CreditCard, TrendingUp, AlertCircle, IndianRupee, Clock, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';

type DashboardOrder = {
  id: string;
  status: string;
  payment_status?: string;
  payment_method?: string;
  total: string;
  created_at: string;
  order_type?: 'dining' | 'takeaway';
  table_number?: string;
  items?: Array<{ id: string; quantity: number; status?: string }>;
};

function isAllItemsCompleted(order: DashboardOrder) {
  return (order.items ?? []).length > 0 && (order.items ?? []).every((item) => (item.status ?? 'pending') === 'completed');
}

function getOrderSnapshot(order: DashboardOrder) {
  const itemSig = (order.items ?? []).map((item) => `${item.id}:${item.quantity}:${item.status ?? 'pending'}`).sort().join('|');
  return `${order.status}|${order.payment_status ?? 'unpaid'}|${itemSig}|${order.notes ?? ''}`;
}

export default function AccountantDashboard() {
  const [showSensitiveStats, setShowSensitiveStats] = useState(false);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    todaySales: 0,
    todayOrders: 0,
    totalOrdersSoFar: 0,
    completedOrders: 0,
    pendingOrders: 0,
    preparingOrders: 0,
    totalExpenses: 0,
    avgOrderValue: 0,
  });
  const previousOrdersRef = useRef<Map<string, DashboardOrder>>(new Map());
  const hasHydratedRef = useRef(false);

  const loadDashboard = (notifyChanges = false) => {
    Promise.all([
      fetch('/api/orders').then((r) => r.json()),
      fetch('/api/expenses').then((r) => r.json()),
    ])
      .then(([orders, expenses]) => {
        const ordersList: DashboardOrder[] = Array.isArray(orders) ? orders : [];

        if (notifyChanges && hasHydratedRef.current) {
          const previousOrders = previousOrdersRef.current;
          ordersList
            .filter((order) => order.payment_status !== 'paid' && order.status !== 'cancelled')
            .forEach((order) => {
              const prev = previousOrders.get(order.id);
              if (!prev) {
                toast({ title: 'New order placed', description: `${order.order_type === 'dining' ? `Table ${order.table_number}` : 'Takeaway'} • #${order.id.slice(-6)}` });
                return;
              }
              const prevReady = isAllItemsCompleted(prev);
              const nextReady = isAllItemsCompleted(order);
              const snapshotChanged = getOrderSnapshot(prev) !== getOrderSnapshot(order);
              const onlyNotesChanged = snapshotChanged && (prev.notes ?? '') !== (order.notes ?? '') &&
                prev.status === order.status && (prev.payment_status ?? 'unpaid') === (order.payment_status ?? 'unpaid') &&
                isAllItemsCompleted(prev) === isAllItemsCompleted(order);
              if (!prevReady && nextReady) {
                toast({ title: 'Order ready to bill', description: `${order.order_type === 'dining' ? `Table ${order.table_number}` : 'Takeaway'} • #${order.id.slice(-6)}` });
              } else if (onlyNotesChanged) {
                toast({ title: 'Chef stock-out request', description: `${order.order_type === 'dining' ? `Table ${order.table_number}` : 'Takeaway'} • #${order.id.slice(-6)}` });
              } else if (snapshotChanged) {
                toast({ title: 'Order updated', description: `${order.order_type === 'dining' ? `Table ${order.table_number}` : 'Takeaway'} • #${order.id.slice(-6)}` });
              }
            });
        }

        previousOrdersRef.current = new Map(ordersList.map((order) => [order.id, order]));
        if (!hasHydratedRef.current) hasHydratedRef.current = true;

        const completed = ordersList.filter((o: { payment_status?: string }) => o.payment_status === 'paid');
        const today = new Date().toDateString();
        const todayOrders = ordersList.filter((o) => new Date(o.created_at).toDateString() === today);
        const todaySales = todayOrders
          .filter((o) => o.payment_status === 'paid')
          .reduce((sum, o) => sum + parseFloat(o.total), 0);
        const totalRevenue = completed.reduce((s: number, o: { total: string }) => s + parseFloat(o.total), 0);
        const pending = ordersList.filter((o: { status: string }) => o.status === 'pending').length;
        const preparing = ordersList.filter((o: { status: string }) => o.status === 'preparing').length;
        const totalExpenses = Array.isArray(expenses)
          ? expenses.filter((e: { status: string }) => e.status === 'approved').reduce((s: number, e: { amount: string }) => s + parseFloat(e.amount), 0)
          : 0;
        setStats({
          totalRevenue,
          todaySales,
          todayOrders: todayOrders.length,
          totalOrdersSoFar: ordersList.length,
          completedOrders: completed.length,
          pendingOrders: pending,
          preparingOrders: preparing,
          totalExpenses,
          avgOrderValue: completed.length > 0 ? totalRevenue / completed.length : 0,
        });
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadDashboard(false);

    const intervalId = setInterval(() => {
      loadDashboard(true);
    }, 6000);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl md:text-2xl md:text-3xl font-bold text-foreground">Accountant/Cashier Dashboard</h1>
        <p className="text-muted-foreground">Process transactions, manage orders, and track expenses</p>
      </div>

      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => setShowSensitiveStats((prev) => !prev)}>
          {showSensitiveStats ? <EyeOff size={14} className="mr-2" /> : <Eye size={14} className="mr-2" />}
          {showSensitiveStats ? 'Hide amounts & totals' : 'Reveal amounts & totals'}
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-orange-500 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today&apos;s Sales</CardTitle>
            <TrendingUp className="h-5 w-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{showSensitiveStats ? `₹${stats.todaySales.toLocaleString()}` : '₹••••'}</div>
            <p className="text-xs text-green-600 font-medium">{stats.completedOrders} paid bills</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today&apos;s Orders</CardTitle>
            <ShoppingCart className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{showSensitiveStats ? stats.todayOrders.toLocaleString() : '••••'}</div>
            <p className="text-xs text-muted-foreground">Orders created today</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
            <CreditCard className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingOrders}</div>
            <p className="text-xs text-yellow-600 font-medium">{stats.preparingOrders} in kitchen</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders So Far</CardTitle>
            <CreditCard className="h-5 w-5 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{showSensitiveStats ? stats.totalOrdersSoFar.toLocaleString() : '••••'}</div>
            <p className="text-xs text-muted-foreground">All orders recorded</p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-l-4 border-l-red-500 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <IndianRupee className="h-5 w-5 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{showSensitiveStats ? `₹${stats.totalExpenses.toLocaleString()}` : '₹••••'}</div>
            <p className="text-xs text-red-600 font-medium">Approved expenses</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-indigo-500 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Order Value</CardTitle>
            <Clock className="h-5 w-5 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{showSensitiveStats ? `₹${Math.round(stats.avgOrderValue).toLocaleString()}` : '₹••••'}</div>
            <p className="text-xs text-muted-foreground">Per completed order</p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {stats.pendingOrders > 0 && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            You have {stats.pendingOrders} pending order{stats.pendingOrders !== 1 ? 's' : ''} waiting to be processed.{stats.preparingOrders > 0 ? ` ${stats.preparingOrders} are currently being prepared.` : ''}
          </AlertDescription>
        </Alert>
      )}

      {/* Features Overview */}
      <Card className="bg-gradient-to-br from-blue-50 to-transparent border-blue-200">
        <CardHeader>
          <CardTitle className="text-lg">Key Features</CardTitle>
          <CardDescription>
            Use these tools to manage operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-orange-500 text-white">
                  <ShoppingCart size={20} />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Orders Management</h3>
                <p className="text-sm text-muted-foreground">Create, manage and track customer orders</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-green-500 text-white">
                  <CreditCard size={20} />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Transactions</h3>
                <p className="text-sm text-muted-foreground">Process payments and track all sales</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-red-500 text-white">
                  <IndianRupee size={20} />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Expense Tracking</h3>
                <p className="text-sm text-muted-foreground">Monitor and manage business expenses</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-purple-500 text-white">
                  <TrendingUp size={20} />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Reports & Analytics</h3>
                <p className="text-sm text-muted-foreground">View daily summaries and insights</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
