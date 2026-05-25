'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Package, ShoppingCart, TrendingUp, IndianRupee, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

type DashboardOrder = {
  id: string;
  status: string;
  payment_status?: string;
  order_type?: 'dining' | 'takeaway';
  table_number?: string;
  total: string;
  created_at: string;
  items?: Array<{ id: string; quantity: number; status?: string }>;
};

function getOrderSnapshot(order: DashboardOrder) {
  const itemSig = (order.items ?? []).map((item) => `${item.id}:${item.quantity}:${item.status ?? 'pending'}`).sort().join('|');
  return `${order.status}|${order.payment_status ?? 'unpaid'}|${itemSig}`;
}

export default function AdminDashboard() {
  const [showSensitiveStats, setShowSensitiveStats] = useState(false);
  const [stats, setStats] = useState({
    totalOrders: 0,
    revenue: 0,
    todayOrders: 0,
    todaySales: 0,
    staffCount: 0,
    inventoryCount: 0,
    totalExpenses: 0,
    lowStockCount: 0,
  });
  const previousOrdersRef = useRef<Map<string, DashboardOrder>>(new Map());
  const hasHydratedRef = useRef(false);

  const loadDashboard = (notifyChanges = false) => {
    Promise.all([
      fetch('/api/orders').then((r) => r.json()),
      fetch('/api/staff').then((r) => r.json()),
      fetch('/api/inventory').then((r) => r.json()),
      fetch('/api/expenses').then((r) => r.json()),
    ])
      .then(([orders, staff, inventory, expenses]) => {
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
              if (getOrderSnapshot(prev) !== getOrderSnapshot(order)) {
                toast({ title: 'Order updated', description: `${order.order_type === 'dining' ? `Table ${order.table_number}` : 'Takeaway'} • #${order.id.slice(-6)}` });
              }
            });
        }

        previousOrdersRef.current = new Map(ordersList.map((order) => [order.id, order]));
        if (!hasHydratedRef.current) hasHydratedRef.current = true;

        const revenue = ordersList
          ? ordersList.filter((o: { payment_status?: string }) => o.payment_status === 'paid').reduce((s: number, o: { total: string }) => s + parseFloat(o.total), 0)
          : 0;
        const today = new Date().toDateString();
        const todayOrders = ordersList.filter((o) => new Date(o.created_at).toDateString() === today);
        const todaySales = todayOrders
          .filter((o) => o.payment_status === 'paid')
          .reduce((sum, o) => sum + parseFloat(o.total), 0);
        const totalExpenses = Array.isArray(expenses)
          ? expenses.filter((e: { status: string }) => e.status === 'approved').reduce((s: number, e: { amount: string }) => s + parseFloat(e.amount), 0)
          : 0;
        const lowStockCount = Array.isArray(inventory)
          ? inventory.filter((i: { quantity: string; min_threshold: string }) => parseFloat(i.quantity) <= parseFloat(i.min_threshold)).length
          : 0;
        setStats({
          totalOrders: ordersList.length,
          revenue,
          todayOrders: todayOrders.length,
          todaySales,
          staffCount: Array.isArray(staff) ? staff.filter((s: { status: string }) => s.status === 'active').length : 0,
          inventoryCount: Array.isArray(inventory) ? inventory.length : 0,
          totalExpenses,
          lowStockCount,
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
        <h1 className="text-2xl md:text-2xl md:text-3xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-muted-foreground">Complete restaurant management and operations control</p>
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
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-5 w-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{showSensitiveStats ? stats.totalOrders.toLocaleString() : '••••'}</div>
            <p className="text-xs text-muted-foreground">All time orders</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today&apos;s Orders</CardTitle>
            <TrendingUp className="h-5 w-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{showSensitiveStats ? stats.todayOrders.toLocaleString() : '••••'}</div>
            <p className="text-xs text-muted-foreground">Orders created today</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Staff</CardTitle>
            <Users className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.staffCount}</div>
            <p className="text-xs text-muted-foreground">Active staff</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today&apos;s Sales</CardTitle>
            <Package className="h-5 w-5 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{showSensitiveStats ? `₹${stats.todaySales.toLocaleString()}` : '₹••••'}</div>
            <p className="text-xs text-muted-foreground">Paid sales today</p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-l-4 border-l-red-500 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Expenses</CardTitle>
            <IndianRupee className="h-5 w-5 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{showSensitiveStats ? `₹${stats.totalExpenses.toLocaleString()}` : '₹••••'}</div>
            <p className="text-xs text-muted-foreground">Approved expenses</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <AlertCircle className="h-5 w-5 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.lowStockCount}</div>
            <p className="text-xs text-yellow-600 font-medium">Need replenishment</p>
          </CardContent>
        </Card>
      </div>

      {/* Features Overview */}
      <Card className="bg-gradient-to-br from-orange-50 to-transparent border-orange-200">
        <CardHeader>
          <CardTitle className="text-lg">Management Features</CardTitle>
          <CardDescription>
            Access all tools to manage your restaurant
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
                <h3 className="font-semibold text-foreground">Menu Management</h3>
                <p className="text-sm text-muted-foreground">Add, edit, or remove menu items and categories</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-blue-500 text-white">
                  <Users size={20} />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Staff Management</h3>
                <p className="text-sm text-muted-foreground">Manage employee accounts and roles</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-emerald-500 text-white">
                  <Package size={20} />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Inventory Tracking</h3>
                <p className="text-sm text-muted-foreground">Monitor stock levels and reorder items</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-red-500 text-white">
                  <TrendingUp size={20} />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Analytics & Reports</h3>
                <p className="text-sm text-muted-foreground">View sales trends and detailed insights</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-purple-500 text-white">
                  <IndianRupee size={20} />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Expense Management</h3>
                <p className="text-sm text-muted-foreground">Track and approve all business expenses</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-indigo-500 text-white">
                  <TrendingUp size={20} />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Performance Metrics</h3>
                <p className="text-sm text-muted-foreground">Monitor KPIs and business health</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
