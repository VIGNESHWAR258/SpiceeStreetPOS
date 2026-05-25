'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable, DataTableColumn } from '@/components/common/data-table';
import { SearchFilter } from '@/components/common/search-filter';
import { PriceDisplay } from '@/components/common/price-display';
import { CreditCard, Banknote, Smartphone } from 'lucide-react';

interface TransactionRow {
  id: string;
  orderId: string;
  amount: number;
  paymentMethod?: 'cash' | 'card' | 'digital';
  timestamp: Date;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('all');

  useEffect(() => {
    fetch('/api/orders')
      .then((r) => r.json())
      .then((data: Record<string, unknown>[]) => {
        if (Array.isArray(data)) {
          setTransactions(
            data
              .filter((order) => order.payment_method)
              .map((order) => ({
                id: `TXN-${order.id}`,
                orderId: order.id as string,
                amount: parseFloat(order.total as string),
                paymentMethod: (order.payment_method as 'cash' | 'card' | 'digital') || 'cash',
                timestamp: new Date(order.created_at as string),
              }))
          );
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const paymentMethods = ['all', 'cash', 'card', 'digital'];

  const filteredTransactions = transactions.filter((txn) => {
    const matchesSearch =
      txn.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      txn.orderId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMethod = selectedPaymentMethod === 'all' || txn.paymentMethod === selectedPaymentMethod;
    return matchesSearch && matchesMethod;
  });

  const columns: DataTableColumn<TransactionRow>[] = [
    {
      key: 'id',
      label: 'Transaction ID',
      render: (value, row) => (
        <div>
          <div className="font-semibold">{String(value)}</div>
          <div className="text-xs text-muted-foreground">Order: {row.orderId}</div>
        </div>
      ),
    },
    {
      key: 'amount',
      label: 'Amount',
      render: (value) => <PriceDisplay amount={value as number} />,
    },
    {
      key: 'paymentMethod',
      label: 'Method',
      render: (value) => {
        const icons: Record<string, React.ReactNode> = {
          cash: <Banknote size={16} className="text-green-600" />,
          card: <CreditCard size={16} className="text-blue-600" />,
          digital: <Smartphone size={16} className="text-purple-600" />,
        };
        const labels: Record<string, string> = {
          cash: 'Cash',
          card: 'Card',
          digital: 'Digital',
        };
        return (
          <Badge variant="outline" className="flex items-center gap-1 w-fit">
            {icons[value as string]}
            {labels[value as string]}
          </Badge>
        );
      },
    },
    {
      key: 'timestamp',
      label: 'Time',
      render: (value) => {
        const date = new Date(value as Date);
        return date.toLocaleString();
      },
    },
  ];

  const totalRevenue = filteredTransactions.reduce((sum, txn) => sum + txn.amount, 0);
  const cashTotal = transactions
    .filter((txn) => txn.paymentMethod === 'cash')
    .reduce((sum, txn) => sum + txn.amount, 0);
  const cardTotal = transactions
    .filter((txn) => txn.paymentMethod === 'card')
    .reduce((sum, txn) => sum + txn.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-2xl md:text-3xl font-bold text-foreground">Transactions</h1>
        <p className="text-muted-foreground">Monitor all payment transactions</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Banknote size={16} className="text-green-600" />
              Cash
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PriceDisplay amount={cashTotal} size="lg" />
            <p className="text-xs text-muted-foreground mt-1">
              {transactions.filter((t) => t.paymentMethod === 'cash').length} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CreditCard size={16} className="text-blue-600" />
              Card
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PriceDisplay amount={cardTotal} size="lg" />
            <p className="text-xs text-muted-foreground mt-1">
              {transactions.filter((t) => t.paymentMethod === 'card').length} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <PriceDisplay amount={totalRevenue} size="lg" />
            <p className="text-xs text-muted-foreground mt-1">{filteredTransactions.length} transactions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Transaction</CardTitle>
          </CardHeader>
          <CardContent>
            <PriceDisplay
              amount={filteredTransactions.length > 0 ? totalRevenue / filteredTransactions.length : 0}
              size="lg"
            />
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="space-y-4 md:flex md:gap-4 md:space-y-0">
        <SearchFilter
          placeholder="Search transactions..."
          value={searchTerm}
          onChange={setSearchTerm}
          className="flex-1"
        />
        <div className="overflow-x-auto flex gap-2">
          {paymentMethods.map((method) => (
            <Button
              key={method}
              variant={selectedPaymentMethod === method ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedPaymentMethod(method)}
              className="whitespace-nowrap"
            >
              {method.charAt(0).toUpperCase() + method.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Transactions Table */}
      <DataTable
        columns={columns}
        data={filteredTransactions}
        rowKey="id"
        title="Recent Transactions"
        description={`Showing ${filteredTransactions.length} of ${transactions.length} transactions`}
      />
    </div>
  );
}
