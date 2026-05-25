'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Order } from '@/lib/mock-data';
import { Clock, AlertCircle } from 'lucide-react';

interface OrderCardProps {
  order: Order;
  onClick?: () => void;
  showTime?: boolean;
}

const statusConfig = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-900' },
  preparing: { label: 'Preparing', color: 'bg-blue-100 text-blue-900' },
  ready: { label: 'Ready', color: 'bg-green-100 text-green-900' },
  completed: { label: 'Completed', color: 'bg-gray-100 text-gray-900' },
};

export function OrderCard({ order, onClick, showTime }: OrderCardProps) {
  const timeSinceOrder = Math.floor((Date.now() - order.timestamp.getTime()) / 60000);

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1">
            <h4 className="font-semibold text-foreground">Order #{order.id}</h4>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {order.items.map((item) => `${item.name} × ${item.quantity}`).join(', ')}
            </p>
          </div>
          <Badge className={statusConfig[order.status].color}>
            {statusConfig[order.status].label}
          </Badge>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-foreground">₹{order.total}</span>
          {showTime && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock size={14} />
              {timeSinceOrder}m ago
            </span>
          )}
        </div>

        {order.notes && (
          <div className="mt-2 flex items-start gap-2 text-xs text-amber-700 bg-amber-50 p-2 rounded">
            <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
            <span>{order.notes}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
