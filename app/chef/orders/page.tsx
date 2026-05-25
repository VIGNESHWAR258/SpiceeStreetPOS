'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/common/modal';
import { Clock, AlertCircle, CheckCircle, ChefHat, Bell, TriangleAlert } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

type KitchenItemStatus = 'pending' | 'preparing' | 'completed';
interface OrderItem { id: string; name: string; quantity: number; price: number; status?: KitchenItemStatus }
interface Order {
  id: string;
  status: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  payment_status?: 'unpaid' | 'paid';
  order_type?: 'dining' | 'takeaway';
  items: OrderItem[];
  notes?: string;
  table_number?: string;
  created_at: string;
}

const STATUS_LABELS: Record<Order['status'], string> = {
  pending: 'Placed',
  preparing: 'Preparing',
  ready: 'Ready',
  completed: 'Closed',
  cancelled: 'Cancelled',
};

const ITEM_STATUS_LABELS: Record<KitchenItemStatus, string> = {
  pending: 'Not Started',
  preparing: 'Preparing',
  completed: 'Completed',
};

function getItemStatus(item: OrderItem): KitchenItemStatus {
  return item.status ?? 'pending';
}

function itemStatusBadgeClass(status: KitchenItemStatus) {
  if (status === 'completed') return 'bg-green-100 text-green-900';
  if (status === 'preparing') return 'bg-blue-100 text-blue-900';
  return 'bg-yellow-100 text-yellow-900';
}

function getKitchenBucket(order: Order): 'new' | 'progress' | 'done' {
  const statuses = (order.items ?? []).map(getItemStatus);
  if (statuses.length > 0 && statuses.every((status) => status === 'completed')) return 'done';
  if (statuses.includes('pending')) return 'new';
  return 'progress';
}

function getOrderSignature(order: Order): string {
  const itemSignature = (order.items ?? [])
    .map((item) => `${item.id}:${item.quantity}:${getItemStatus(item)}`)
    .sort()
    .join('|');
  return `${order.status}|${order.payment_status ?? 'unpaid'}|${itemSignature}`;
}

export default function KitchenOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefreshEnabled] = useState(true);
  const previousSnapshotRef = useRef<Map<string, string>>(new Map());
  const hasHydratedRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  const getAudioContext = () => {
    if (typeof window === 'undefined') return null;
    if (audioContextRef.current) return audioContextRef.current;
    const AudioCtx = (window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
    if (!AudioCtx) return null;
    audioContextRef.current = new AudioCtx();
    return audioContextRef.current;
  };

  const playAlertSound = async (kind: 'new' | 'update') => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      const now = ctx.currentTime;
      const first = ctx.createOscillator();
      const firstGain = ctx.createGain();
      first.type = 'sine';
      first.frequency.setValueAtTime(kind === 'new' ? 880 : 740, now);
      firstGain.gain.setValueAtTime(0.0001, now);
      firstGain.gain.exponentialRampToValueAtTime(0.08, now + 0.01);
      firstGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
      first.connect(firstGain);
      firstGain.connect(ctx.destination);
      first.start(now);
      first.stop(now + 0.17);

      const second = ctx.createOscillator();
      const secondGain = ctx.createGain();
      const secondStart = now + 0.2;
      second.type = 'sine';
      second.frequency.setValueAtTime(kind === 'new' ? 988 : 660, secondStart);
      secondGain.gain.setValueAtTime(0.0001, secondStart);
      secondGain.gain.exponentialRampToValueAtTime(0.08, secondStart + 0.01);
      secondGain.gain.exponentialRampToValueAtTime(0.0001, secondStart + 0.16);
      second.connect(secondGain);
      secondGain.connect(ctx.destination);
      second.start(secondStart);
      second.stop(secondStart + 0.17);
    } catch {
      // Ignore sound failures; visual toast still appears.
    }
  };

  const loadOrders = (notifyChanges = false) => {
    fetch('/api/orders')
      .then((r) => r.json())
      .then((data) => {
        const nextOrders = Array.isArray(data) ? data : [];
        setOrders(nextOrders);

        const nextSnapshot = new Map<string, string>();
        nextOrders.forEach((order) => {
          nextSnapshot.set(order.id, getOrderSignature(order));
        });

        if (notifyChanges && hasHydratedRef.current) {
          const previousSnapshot = previousSnapshotRef.current;

          nextOrders
            .filter((order) => order.payment_status !== 'paid' && order.status !== 'cancelled')
            .forEach((order) => {
              const prev = previousSnapshot.get(order.id);
              const next = nextSnapshot.get(order.id);
              if (!prev && next) {
                toast({
                  title: 'New order placed',
                  description: `${order.order_type === 'takeaway' ? 'Takeaway' : `Table ${order.table_number}`} • #${order.id.slice(-6)}`,
                });
                void playAlertSound('new');
              } else if (prev && next && prev !== next) {
                toast({
                  title: 'Order updated',
                  description: `${order.order_type === 'takeaway' ? 'Takeaway' : `Table ${order.table_number}`} • #${order.id.slice(-6)}`,
                });
                void playAlertSound('update');
              }
            });
        }

        previousSnapshotRef.current = nextSnapshot;
        if (!hasHydratedRef.current) hasHydratedRef.current = true;
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadOrders(false);

    if (!autoRefreshEnabled) return;
    const intervalId = setInterval(() => {
      loadOrders(true);
    }, 5000);

    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const unlockAudio = () => {
      const ctx = getAudioContext();
      if (ctx && ctx.state === 'suspended') {
        void ctx.resume();
      }
    };

    window.addEventListener('pointerdown', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });

    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeOrders = orders.filter((order) => order.payment_status !== 'paid' && order.status !== 'cancelled');
  const pendingOrders = activeOrders.filter((order) => getKitchenBucket(order) === 'new');
  const preparingOrders = activeOrders.filter((order) => getKitchenBucket(order) === 'progress');
  const readyOrders = activeOrders.filter((order) => getKitchenBucket(order) === 'done');

  const updateItemStatus = async (orderId: string, itemId: string, status: KitchenItemStatus) => {
    const res = await fetch(`/api/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId, itemStatus: status }),
    });
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      toast({ title: 'Unable to update item', description: payload.error || 'Please try again.' });
      return;
    }
    const updated = await res.json();
    setOrders((prev) => prev.map((order) => order.id === updated.id ? updated : order));
    setSelectedOrder((prev) => prev?.id === updated.id ? updated : prev);
  };

  const requestStockOutCancellation = async (orderId: string, payload: { requestCancelOrder?: boolean; requestCancelItemId?: string; requestReason?: string }) => {
    const res = await fetch(`/api/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorPayload = await res.json().catch(() => ({}));
      toast({ title: 'Unable to notify admin', description: errorPayload.error || 'Please try again.' });
      return;
    }

    const updated = await res.json();
    setOrders((prev) => prev.map((order) => order.id === updated.id ? updated : order));
    setSelectedOrder((prev) => prev?.id === updated.id ? updated : prev);
    toast({ title: 'Admin notified', description: 'Stock-out cancellation request sent.' });
  };

  const OrderCard = ({ order }: { order: Order }) => {
    const timeSinceOrder = Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000);
    const isUrgent = timeSinceOrder > 15 && getKitchenBucket(order) !== 'done';
    const pendingCount = (order.items ?? []).filter((item) => getItemStatus(item) === 'pending').length;
    const preparingCount = (order.items ?? []).filter((item) => getItemStatus(item) === 'preparing').length;
    const completedCount = (order.items ?? []).filter((item) => getItemStatus(item) === 'completed').length;

    return (
      <Card
        className={`transition-all cursor-pointer border-2 ${
          getKitchenBucket(order) === 'new' ? (isUrgent ? 'border-red-400 bg-red-50' : 'border-yellow-300 bg-yellow-50')
          : getKitchenBucket(order) === 'progress' ? 'border-blue-300 bg-blue-50'
          : 'border-green-300 bg-green-50'
        }`}
        onClick={() => setSelectedOrder(order)}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div>
              <h4 className="font-bold text-lg">#{order.id}</h4>
              <p className="text-xs text-muted-foreground">{order.order_type === 'takeaway' ? 'Takeaway' : `Table ${order.table_number}`}</p>
            </div>
            {getKitchenBucket(order) === 'new' && (
              <Badge className={isUrgent ? 'bg-red-100 text-red-900 animate-pulse' : 'bg-yellow-100 text-yellow-900 animate-pulse'}>
                <AlertCircle size={12} className="mr-1" />New Items
              </Badge>
            )}
            {getKitchenBucket(order) === 'progress' && <Badge className="bg-blue-100 text-blue-900"><Clock size={12} className="mr-1" />In Progress</Badge>}
            {getKitchenBucket(order) === 'done' && <Badge className="bg-green-100 text-green-900"><CheckCircle size={12} className="mr-1" />All Completed</Badge>}
          </div>
          <div className="space-y-2 mb-3">
            {(order.items ?? []).map((item) => {
              const status = getItemStatus(item);
              return (
                <div key={item.id} className="rounded border bg-white/80 p-2">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-sm font-medium truncate">{item.name} ×{item.quantity}</span>
                    <Badge className={`text-[10px] px-2 py-0.5 ${itemStatusBadgeClass(status)}`}>{ITEM_STATUS_LABELS[status]}</Badge>
                  </div>
                  <div className="flex justify-end">
                    {status === 'pending' && (
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700 h-6 text-[11px]" onClick={(e) => { e.stopPropagation(); updateItemStatus(order.id, item.id, 'preparing'); }}>
                        <ChefHat size={12} className="mr-1" />Start Item
                      </Button>
                    )}
                    {status === 'preparing' && (
                      <Button size="sm" className="bg-green-600 hover:bg-green-700 h-6 text-[11px]" onClick={(e) => { e.stopPropagation(); updateItemStatus(order.id, item.id, 'completed'); }}>
                        <CheckCircle size={12} className="mr-1" />Complete Item
                      </Button>
                    )}
                    {status !== 'completed' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-[11px] text-red-700 border-red-300 hover:bg-red-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          requestStockOutCancellation(order.id, { requestCancelItemId: item.id, requestReason: 'Out of stock' });
                        }}
                      >
                        <TriangleAlert size={12} className="mr-1" />Stock Out
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {order.notes && (
            <div className="flex items-start gap-2 text-xs font-semibold text-red-700 bg-red-100 p-2 rounded border border-red-300 mb-3">
              <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />{order.notes}
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock size={12} />{timeSinceOrder}m ago
            </span>
            <Button
              size="sm"
              variant="outline"
              className="h-6 text-[11px] text-red-700 border-red-300 hover:bg-red-50"
              onClick={(e) => {
                e.stopPropagation();
                requestStockOutCancellation(order.id, { requestCancelOrder: true, requestReason: 'Key ingredients unavailable' });
              }}
            >
              <TriangleAlert size={12} className="mr-1" />Notify Cancel Order
            </Button>
            <div className="text-[11px] text-muted-foreground">
              P: {pendingCount} · C: {preparingCount} · D: {completedCount}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Kitchen Display System</h1>
        <p className="text-muted-foreground">Track each item separately so newly added items start as Not Started.</p>
        <div className="mt-2 inline-flex items-center gap-2 rounded-md border bg-muted/30 px-2.5 py-1 text-xs text-muted-foreground">
          <Bell size={13} /> Auto refresh every 5s with alerts for new and updated orders
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Orders with New Items</CardTitle></CardHeader><CardContent><div className="text-2xl md:text-3xl font-bold text-yellow-600">{pendingOrders.length}</div><p className="text-xs text-muted-foreground">Need item start</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">In Progress</CardTitle></CardHeader><CardContent><div className="text-2xl md:text-3xl font-bold text-blue-600">{preparingOrders.length}</div><p className="text-xs text-muted-foreground">Some items cooking</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Completed</CardTitle></CardHeader><CardContent><div className="text-2xl md:text-3xl font-bold text-green-600">{readyOrders.length}</div><p className="text-xs text-muted-foreground">Awaiting billing</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Items</CardTitle></CardHeader><CardContent><div className="text-2xl md:text-3xl font-bold">{activeOrders.reduce((sum, order) => sum + (order.items?.length ?? 0), 0)}</div><p className="text-xs text-muted-foreground">Across active orders</p></CardContent></Card>
      </div>

      {loading && <Card><CardContent className="py-8 text-center text-muted-foreground">Loading kitchen orders...</CardContent></Card>}

      <div className="space-y-6">
        <div>
          <div className="mb-4 flex items-center gap-2">
            <AlertCircle className="text-yellow-600" size={22} />
            <h2 className="text-xl font-bold">Orders with New Items ({pendingOrders.length})</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {pendingOrders.length > 0 ? pendingOrders.map((o) => <OrderCard key={o.id} order={o} />) : (
              <Card className="md:col-span-2 lg:col-span-3"><CardContent className="py-8 text-center text-muted-foreground">No orders waiting to start items</CardContent></Card>
            )}
          </div>
        </div>

        <div>
          <div className="mb-4 flex items-center gap-2">
            <Clock className="text-blue-600" size={22} />
            <h2 className="text-xl font-bold">In Progress ({preparingOrders.length})</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {preparingOrders.length > 0 ? preparingOrders.map((o) => <OrderCard key={o.id} order={o} />) : (
              <Card className="md:col-span-2 lg:col-span-3"><CardContent className="py-8 text-center text-muted-foreground">No orders being prepared</CardContent></Card>
            )}
          </div>
        </div>

        <div>
          <div className="mb-4 flex items-center gap-2">
            <CheckCircle className="text-green-600" size={22} />
            <h2 className="text-xl font-bold">All Items Completed ({readyOrders.length})</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {readyOrders.length > 0 ? readyOrders.map((o) => <OrderCard key={o.id} order={o} />) : (
              <Card className="md:col-span-2 lg:col-span-3"><CardContent className="py-8 text-center text-muted-foreground">No fully completed orders yet</CardContent></Card>
            )}
          </div>
        </div>
      </div>

      <Modal isOpen={!!selectedOrder} onClose={() => setSelectedOrder(null)} title={`Order #${selectedOrder?.id}`} size="md">
        {selectedOrder && (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">{selectedOrder.order_type === 'takeaway' ? 'Takeaway' : `Table ${selectedOrder.table_number}`}</div>
            <div className="space-y-1">
              {(selectedOrder.items ?? []).map((item) => {
                const status = getItemStatus(item);
                return (
                <div key={item.id} className="flex justify-between items-center gap-2 text-sm py-1 border-b last:border-0">
                  <span className="font-medium">{item.name} ×{item.quantity}</span>
                  <div className="flex items-center gap-2">
                    <Badge className={`text-[10px] px-2 py-0.5 ${itemStatusBadgeClass(status)}`}>{ITEM_STATUS_LABELS[status]}</Badge>
                    {status === 'pending' && (
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700 h-6 text-[11px]" onClick={() => updateItemStatus(selectedOrder.id, item.id, 'preparing')}>
                        Start
                      </Button>
                    )}
                    {status === 'preparing' && (
                      <Button size="sm" className="bg-green-600 hover:bg-green-700 h-6 text-[11px]" onClick={() => updateItemStatus(selectedOrder.id, item.id, 'completed')}>
                        Complete
                      </Button>
                    )}
                    {status !== 'completed' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-[11px] text-red-700 border-red-300 hover:bg-red-50"
                        onClick={() => requestStockOutCancellation(selectedOrder.id, { requestCancelItemId: item.id, requestReason: 'Out of stock' })}
                      >
                        Stock Out
                      </Button>
                    )}
                  </div>
                </div>
              )})}
            </div>
            {selectedOrder.notes && (
              <div className="flex items-start gap-2 text-sm font-semibold text-red-700 bg-red-50 p-3 rounded border border-red-200">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />{selectedOrder.notes}
              </div>
            )}
            <div className="text-sm text-muted-foreground">
              {(selectedOrder.items ?? []).every((item) => getItemStatus(item) === 'completed')
                ? 'All items completed ✓ Billing can proceed.'
                : 'Complete every item to enable billing.'}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
