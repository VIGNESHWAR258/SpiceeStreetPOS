'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  TrendingDown,
  Plus,
  Trash2,
} from 'lucide-react';
import { PriceDisplay } from '@/components/common/price-display';
import { useAuth } from '@/lib/auth-context';

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
  'Ingredients',
  'Utilities',
  'Staff Wages',
  'Maintenance',
  'Equipment',
  'Rent',
  'Supplies',
  'Marketing',
  'Other',
];

const EXPENSE_STATUSES = {
  approved: { label: 'Approved', color: 'bg-green-100 text-green-800' },
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800' },
};

export default function ExpensesPage() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newExpense, setNewExpense] = useState({ category: '', description: '', amount: '', vendor: '' });

  const fetchExpenses = async () => {
    try {
      const res = await fetch('/api/expenses');
      const data = await res.json();
      if (Array.isArray(data)) {
        setExpenses(data.map((row: Record<string, unknown>) => ({
          id: row.id as string,
          category: row.category as string,
          description: row.description as string,
          amount: parseFloat(row.amount as string),
          date: (row.created_at as string).split('T')[0],
          vendor: (row.submitted_by as string) || '',
          status: row.status as 'approved' | 'pending' | 'rejected',
        })));
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  useEffect(() => { fetchExpenses(); }, []);

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const approvedExpenses = expenses.filter((e) => e.status === 'approved').reduce((s, e) => s + e.amount, 0);
  const pendingExpenses = expenses.filter((e) => e.status === 'pending').reduce((s, e) => s + e.amount, 0);

  const handleAddExpense = async () => {
    if (!newExpense.category || !newExpense.description || !newExpense.amount || !newExpense.vendor) return;
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: newExpense.category, description: newExpense.description, amount: parseFloat(newExpense.amount), submittedBy: newExpense.vendor, status: 'pending' }),
      });
      if (res.ok) { setNewExpense({ category: '', description: '', amount: '', vendor: '' }); setShowAddForm(false); fetchExpenses(); }
    } catch { /* ignore */ }
  };

  const handleDeleteExpense = async (id: string) => {
    const target = expenses.find((expense) => expense.id === id);
    if (!target || target.status === 'approved') return;

    await fetch(`/api/expenses/${id}`, {
      method: 'DELETE',
      headers: { 'x-user-role': user?.role ?? 'accountant' },
    });
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading expenses...</div>;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl md:text-2xl md:text-3xl font-bold text-foreground">Expense Tracker</h1>
        <p className="text-muted-foreground">Monitor and manage restaurant expenses</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              <PriceDisplay amount={totalExpenses} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">All time recorded</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Approved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              <PriceDisplay amount={approvedExpenses} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Ready to process</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Approval
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              <PriceDisplay amount={pendingExpenses} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {expenses.filter((e) => e.status === 'pending').length} items
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Add Expense Form */}
      {showAddForm && (
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg">Add New Expense</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Category
                </label>
                <select
                  value={newExpense.category}
                  onChange={(e) =>
                    setNewExpense({ ...newExpense, category: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select category</option>
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Vendor
                </label>
                <input
                  type="text"
                  placeholder="Vendor name"
                  value={newExpense.vendor}
                  onChange={(e) =>
                    setNewExpense({ ...newExpense, vendor: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Description
                </label>
                <input
                  type="text"
                  placeholder="Expense description"
                  value={newExpense.description}
                  onChange={(e) =>
                    setNewExpense({ ...newExpense, description: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Amount (₹)
                </label>
                <input
                  type="number"
                  placeholder="Amount"
                  value={newExpense.amount}
                  onChange={(e) =>
                    setNewExpense({ ...newExpense, amount: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowAddForm(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleAddExpense} className="bg-primary hover:bg-primary/90">
                <Plus size={16} className="mr-2" />
                Add Expense
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!showAddForm && (
        <Button onClick={() => setShowAddForm(true)} className="bg-primary hover:bg-primary/90">
          <Plus size={16} className="mr-2" />
          Add Expense
        </Button>
      )}

      {/* Expenses Table */}
      <Card>
        <CardHeader>
          <CardTitle>Expense Records</CardTitle>
          <CardDescription>
            {expenses.length} expenses recorded
          </CardDescription>
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <div className="text-center py-8">
              <TrendingDown size={32} className="mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No expenses recorded yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-3 font-semibold text-foreground">Date</th>
                    <th className="text-left py-3 px-3 font-semibold text-foreground">Category</th>
                    <th className="text-left py-3 px-3 font-semibold text-foreground">Description</th>
                    <th className="text-left py-3 px-3 font-semibold text-foreground">Vendor</th>
                    <th className="text-right py-3 px-3 font-semibold text-foreground">Amount</th>
                    <th className="text-center py-3 px-3 font-semibold text-foreground">Status</th>
                    <th className="text-center py-3 px-3 font-semibold text-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((expense) => (
                    <tr key={expense.id} className="border-b border-border hover:bg-muted/50">
                      <td className="py-3 px-3 text-muted-foreground">
                        {new Date(expense.date).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-3 text-foreground font-medium">
                        {expense.category}
                      </td>
                      <td className="py-3 px-3 text-muted-foreground">
                        {expense.description}
                      </td>
                      <td className="py-3 px-3 text-muted-foreground">
                        {expense.vendor}
                      </td>
                      <td className="py-3 px-3 text-right font-semibold text-foreground">
                        <PriceDisplay amount={expense.amount} />
                      </td>
                      <td className="py-3 px-3 text-center">
                        <Badge
                          variant="outline"
                          className={EXPENSE_STATUSES[expense.status].color}
                        >
                          {EXPENSE_STATUSES[expense.status].label}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex gap-2 justify-center">
                          {expense.status !== 'approved' ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteExpense(expense.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 size={16} />
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">Admin only</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
