'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Download, FileText, Filter } from 'lucide-react';
import { getDateRange, isDateInRange, downloadCsv, downloadPdf, DateRangePreset } from '@/lib/report-utils';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

interface OrderRow {
  id: string;
  total: string;
  created_at: string;
  status: string;
  payment_status?: string;
}

interface MenuRow {
  name: string;
  category: string;
}

const PRESETS: { value: DateRangePreset; label: string }[] = [
  { value: 'current-month', label: 'This Month' },
  { value: 'last-month', label: 'Last Month' },
  { value: 'last-3-months', label: 'Last 3 Months' },
  { value: 'current-financial-year', label: 'Current FY' },
  { value: 'last-financial-year', label: 'Last FY' },
  { value: 'custom', label: 'Custom Range' },
];

export default function AnalyticsPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [menu, setMenu] = useState<MenuRow[]>([]);
  const [preset, setPreset] = useState<DateRangePreset>('current-month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/orders').then((r) => r.json()),
      fetch('/api/menu').then((r) => r.json()),
    ])
      .then(([o, m]) => {
        if (Array.isArray(o)) setOrders(o);
        if (Array.isArray(m)) setMenu(m);
      })
      .catch(() => {});
  }, []);

  const dateRange = useMemo(() => getDateRange(preset, customStart, customEnd), [preset, customStart, customEnd]);

  const filtered = useMemo(() =>
    orders.filter((o) => isDateInRange(o.created_at.split('T')[0], dateRange)),
  [orders, dateRange]);

  const totalRevenue = useMemo(() =>
    filtered.filter((o) => o.payment_status === 'paid').reduce((s, o) => s + parseFloat(o.total), 0),
  [filtered]);

  const totalOrders = filtered.length;
  const avgOrderValue = totalOrders ? totalRevenue / totalOrders : 0;

  const dailySalesData = useMemo(() => {
    const map = new Map<string, { date: string; sales: number; orders: number }>();
    filtered.forEach((o) => {
      const d = new Date(o.created_at);
      const label = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      const existing = map.get(label) || { date: label, sales: 0, orders: 0 };
      existing.sales += parseFloat(o.total);
      existing.orders += 1;
      map.set(label, existing);
    });
    return Array.from(map.values());
  }, [filtered]);

  const categoryData = useMemo(() => {
    const counts = new Map<string, number>();
    menu.forEach((item) => counts.set(item.category, (counts.get(item.category) || 0) + 1));
    return Array.from(counts.entries()).map(([name, value]) => ({ name, value }));
  }, [menu]);

  const csvHeaders = ['Date', 'Order ID', 'Total (INR)', 'Payment Status'];
  const csvRows = () => filtered.map((o) => [
    new Date(o.created_at).toLocaleDateString('en-IN'),
    o.id,
    parseFloat(o.total).toFixed(2),
    o.payment_status || o.status,
  ]);

  const handleExportCsv = () =>
    downloadCsv(`analytics-${dateRange.label.replace(/\s+/g, '-').toLowerCase()}.csv`, csvHeaders, csvRows());

  const handleExportPdf = async () => {
    setExporting(true);
    try {
      await downloadPdf(
        `analytics-${dateRange.label.replace(/\s+/g, '-').toLowerCase()}.pdf`,
        'Spicee Street — Sales Analytics Report',
        `Period: ${dateRange.label}  |  Revenue: INR ${totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}  |  Orders: ${totalOrders}  |  Avg: INR ${Math.round(avgOrderValue).toLocaleString('en-IN')}`,
        csvHeaders, csvRows(),
      );
    } finally { setExporting(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-col sm:flex-row gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-2xl md:text-3xl font-bold text-foreground">Sales Analytics</h1>
          <p className="text-muted-foreground">View your restaurant performance metrics</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleExportCsv} disabled={filtered.length === 0}>
            <Download size={14} className="mr-1" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPdf} disabled={filtered.length === 0 || exporting}>
            <FileText size={14} className="mr-1" /> {exporting ? 'Generating…' : 'PDF'}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Filter size={16} className="text-muted-foreground shrink-0" />
            <span className="text-sm font-medium text-muted-foreground mr-1">Period:</span>
            {PRESETS.map((p) => (
              <Button key={p.value} size="sm" variant={preset === p.value ? 'default' : 'outline'} onClick={() => setPreset(p.value)} className="text-xs h-7">
                {p.label}
              </Button>
            ))}
          </div>
          {preset === 'custom' && (
            <div className="flex items-center gap-3 mt-3 flex-wrap">
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground">From</label>
                <input type="date" className="h-8 rounded-md border border-input bg-background px-3 text-sm" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground">To</label>
                <input type="date" className="h-8 rounded-md border border-input bg-background px-3 text-sm" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
              </div>
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-2">
            Showing: <span className="font-medium text-foreground">{dateRange.label}</span>
            {' — '}{dateRange.start.toLocaleDateString('en-IN')} to {dateRange.end.toLocaleDateString('en-IN')}
            {' · '}{filtered.length} order{filtered.length !== 1 ? 's' : ''}
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{Math.round(totalRevenue).toLocaleString('en-IN')}</div>
            <p className="text-xs text-muted-foreground">From settled bills</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders}</div>
            <p className="text-xs text-muted-foreground">In selected period</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{Math.round(avgOrderValue).toLocaleString('en-IN')}</div>
            <p className="text-xs text-muted-foreground">Average per order</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Daily Sales Trend</CardTitle>
            <CardDescription>Revenue per day — {dateRange.label}</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailySalesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" angle={-30} textAnchor="end" height={60} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="sales" stroke="#3B82F6" name="Sales (₹)" dot={{ fill: '#3B82F6', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Menu Category Distribution</CardTitle>
            <CardDescription>Items by category</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name}: ${value}`} outerRadius={90} dataKey="value">
                  {categoryData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Daily Orders</CardTitle>
            <CardDescription>Order count per day — {dateRange.label}</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailySalesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" angle={-30} textAnchor="end" height={60} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="orders" fill="#10B981" name="Orders" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
