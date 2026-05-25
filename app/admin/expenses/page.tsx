'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingDown, Plus, Trash2, CheckCircle, XCircle, Download, FileText, Filter } from 'lucide-react';
import { PriceDisplay } from '@/components/common/price-display';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getDateRange, isDateInRange, downloadCsv, downloadPdf, DateRangePreset } from '@/lib/report-utils';

interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  vendor: string;
  status: 'approved' | 'pending' | 'rejected';
}

const EXPENSE_CATEGORIES = [
  'Ingredients', 'Utilities', 'Staff Wages', 'Maintenance', 'Equipment',
  'Rent', 'Supplies', 'Marketing', 'Other',
];

const EXPENSE_STATUSES = {
  approved: { label: 'Approved', color: 'bg-green-100 text-green-800' },
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800' },
};

const PRESETS: { value: DateRangePreset; label: string }[] = [
  { value: 'current-month', label: 'This Month' },
  { value: 'last-month', label: 'Last Month' },
  { value: 'last-3-months', label: 'Last 3 Months' },
  { value: 'current-financial-year', label: 'Current FY' },
  { value: 'last-financial-year', label: 'Last FY' },
  { value: 'custom', label: 'Custom Range' },
];

function mapRow(row: Record<string, unknown>): Expense {
  return {
    id: row.id as string,
    category: row.category as string,
    description: row.description as string,
    amount: parseFloat(row.amount as string),
    date: (row.created_at as string).split('T')[0],
    vendor: (row.submitted_by as string) || '',
    status: row.status as 'approved' | 'pending' | 'rejected',
  };
}

export default function AdminExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newExpense, setNewExpense] = useState({ category: '', description: '', amount: '', vendor: '' });
  const [preset, setPreset] = useState<DateRangePreset>('current-month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [exporting, setExporting] = useState(false);

  const fetchExpenses = async () => {
    try {
      const res = await fetch('/api/expenses');
      const data = await res.json();
      if (Array.isArray(data)) setExpenses(data.map(mapRow));
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchExpenses(); }, []);

  const dateRange = useMemo(() => getDateRange(preset, customStart, customEnd), [preset, customStart, customEnd]);
  const filtered = useMemo(() => expenses.filter((e) => isDateInRange(e.date, dateRange)), [expenses, dateRange]);

  const totalExpenses = filtered.reduce((sum, e) => sum + e.amount, 0);
  const approvedExpenses = filtered.filter((e) => e.status === 'approved').reduce((sum, e) => sum + e.amount, 0);
  const pendingExpenses = filtered.filter((e) => e.status === 'pending').reduce((sum, e) => sum + e.amount, 0);

  const categoryData = EXPENSE_CATEGORIES.map((cat) => ({
    name: cat,
    amount: filtered.filter((e) => e.category === cat && e.status === 'approved').reduce((s, e) => s + e.amount, 0),
  })).filter((item) => item.amount > 0);

  const handleAddExpense = async () => {
    if (!newExpense.category || !newExpense.description || !newExpense.amount || !newExpense.vendor) return;
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: newExpense.category, description: newExpense.description, amount: parseFloat(newExpense.amount), submittedBy: newExpense.vendor, status: 'approved' }),
      });
      if (res.ok) { setNewExpense({ category: '', description: '', amount: '', vendor: '' }); setShowAddForm(false); fetchExpenses(); }
    } catch { /* ignore */ }
  };

  const handleDeleteExpense = async (id: string) => {
    await fetch(`/api/expenses/${id}`, { method: 'DELETE', headers: { 'x-user-role': 'admin' } });
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  const handleApproveExpense = async (id: string) => {
    await fetch(`/api/expenses/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-user-role': 'admin' }, body: JSON.stringify({ status: 'approved' }) });
    setExpenses((prev) => prev.map((e) => e.id === id ? { ...e, status: 'approved' } : e));
  };

  const handleRejectExpense = async (id: string) => {
    await fetch(`/api/expenses/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-user-role': 'admin' }, body: JSON.stringify({ status: 'rejected' }) });
    setExpenses((prev) => prev.map((e) => e.id === id ? { ...e, status: 'rejected' } : e));
  };

  const csvHeaders = ['Date', 'Category', 'Description', 'Vendor', 'Amount (INR)', 'Status'];
  const csvRows = () => filtered.map((e) => [new Date(e.date).toLocaleDateString('en-IN'), e.category, e.description, e.vendor, e.amount.toFixed(2), EXPENSE_STATUSES[e.status].label]);

  const handleExportCsv = () => downloadCsv(`expenses-${dateRange.label.replace(/\s+/g, '-').toLowerCase()}.csv`, csvHeaders, csvRows());

  const handleExportPdf = async () => {
    setExporting(true);
    try {
      await downloadPdf(
        `expenses-${dateRange.label.replace(/\s+/g, '-').toLowerCase()}.pdf`,
        'Spicee Street — Expense Report',
        `Period: ${dateRange.label}  |  ${dateRange.start.toLocaleDateString('en-IN')} – ${dateRange.end.toLocaleDateString('en-IN')}  |  Total: INR ${totalExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
        csvHeaders, csvRows(),
      );
    } finally { setExporting(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading expenses...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-col sm:flex-row gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-2xl md:text-3xl font-bold text-foreground">Expense Management</h1>
          <p className="text-muted-foreground">Track, approve, and analyze all restaurant expenses</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleExportCsv} disabled={filtered.length === 0}>
            <Download size={14} className="mr-1" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPdf} disabled={filtered.length === 0 || exporting}>
            <FileText size={14} className="mr-1" /> {exporting ? 'Generating…' : 'PDF'}
          </Button>
          <Button size="sm" onClick={() => setShowAddForm(true)} className="bg-primary hover:bg-primary/90">
            <Plus size={14} className="mr-1" /> Record Expense
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
            {' · '}{filtered.length} record{filtered.length !== 1 ? 's' : ''}
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-muted-foreground">Total Expenses</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground"><PriceDisplay amount={totalExpenses} /></div>
            <p className="text-xs text-muted-foreground mt-1">{filtered.length} items in period</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-muted-foreground">Approved</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600"><PriceDisplay amount={approvedExpenses} /></div>
            <p className="text-xs text-muted-foreground mt-1">{filtered.filter((e) => e.status === 'approved').length} items</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-yellow-500">
          <CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-muted-foreground">Pending Review</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600"><PriceDisplay amount={pendingExpenses} /></div>
            <p className="text-xs text-muted-foreground mt-1">{filtered.filter((e) => e.status === 'pending').length} items</p>
          </CardContent>
        </Card>
      </div>

      {categoryData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Expenses by Category</CardTitle>
            <CardDescription>Approved expenses — {dateRange.label}</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }} formatter={(v: number) => `INR ${v.toLocaleString('en-IN')}`} />
                <Bar dataKey="amount" fill="var(--primary)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {showAddForm && (
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader><CardTitle className="text-lg">Record New Expense</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Category</label>
                <select value={newExpense.category} onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })} className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="">Select category</option>
                  {EXPENSE_CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Vendor</label>
                <input type="text" placeholder="Vendor name" value={newExpense.vendor} onChange={(e) => setNewExpense({ ...newExpense, vendor: e.target.value })} className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Description</label>
                <input type="text" placeholder="Expense description" value={newExpense.description} onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })} className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Amount (₹)</label>
                <input type="number" placeholder="Amount" value={newExpense.amount} onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })} className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
              <Button onClick={handleAddExpense} className="bg-primary hover:bg-primary/90"><Plus size={16} className="mr-2" />Add Expense</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Expenses — {dateRange.label}</CardTitle>
          <CardDescription>{filtered.length} record{filtered.length !== 1 ? 's' : ''} in selected period</CardDescription>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="text-center py-8">
              <TrendingDown size={32} className="mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No expenses found for {dateRange.label}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-3 font-semibold">Date</th>
                    <th className="text-left py-3 px-3 font-semibold">Category</th>
                    <th className="text-left py-3 px-3 font-semibold">Description</th>
                    <th className="text-left py-3 px-3 font-semibold">Vendor</th>
                    <th className="text-right py-3 px-3 font-semibold">Amount</th>
                    <th className="text-center py-3 px-3 font-semibold">Status</th>
                    <th className="text-center py-3 px-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((expense) => (
                    <tr key={expense.id} className="border-b border-border hover:bg-muted/50">
                      <td className="py-3 px-3 text-muted-foreground">{new Date(expense.date).toLocaleDateString('en-IN')}</td>
                      <td className="py-3 px-3 font-medium">{expense.category}</td>
                      <td className="py-3 px-3 text-muted-foreground">{expense.description}</td>
                      <td className="py-3 px-3 text-muted-foreground">{expense.vendor}</td>
                      <td className="py-3 px-3 text-right font-semibold"><PriceDisplay amount={expense.amount} /></td>
                      <td className="py-3 px-3 text-center">
                        <Badge variant="outline" className={EXPENSE_STATUSES[expense.status].color}>{EXPENSE_STATUSES[expense.status].label}</Badge>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex gap-2 justify-center">
                          {expense.status === 'pending' && (
                            <>
                              <Button size="sm" variant="ghost" onClick={() => handleApproveExpense(expense.id)} className="text-green-600 hover:text-green-700 hover:bg-green-50" title="Approve"><CheckCircle size={16} /></Button>
                              <Button size="sm" variant="ghost" onClick={() => handleRejectExpense(expense.id)} className="text-red-600 hover:text-red-700 hover:bg-red-50" title="Reject"><XCircle size={16} /></Button>
                            </>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => handleDeleteExpense(expense.id)} className="text-red-600 hover:text-red-700 hover:bg-red-50" title="Delete"><Trash2 size={16} /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border bg-muted/30">
                    <td colSpan={4} className="py-3 px-3 font-bold">Total (filtered)</td>
                    <td className="py-3 px-3 text-right font-bold"><PriceDisplay amount={totalExpenses} /></td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
