'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { IndianRupee, Plus, Minus, Trash2, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { SearchFilter } from '@/components/common/search-filter';
import { PriceDisplay } from '@/components/common/price-display';
import { Modal } from '@/components/common/modal';
import { toast } from '@/hooks/use-toast';

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  status?: 'pending' | 'preparing' | 'completed';
}
interface Order {
  id: string;
  status: string;
  order_type: 'dining' | 'takeaway';
  payment_status: 'unpaid' | 'paid';
  payment_method?: 'cash' | 'card' | 'digital' | null;
  misc_label?: string | null;
  misc_amount?: string | number;
  billing_note?: string | null;
  subtotal: string | number;
  total: string | number;
  notes?: string | null;
  table_number?: string | null;
  items: OrderItem[];
  created_at: string;
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  available: boolean;
}

type CartItem = { id: string; name: string; price: number; quantity: number };

const PAYMENT_METHODS = ['cash', 'card', 'digital'] as const;

function getItemStatus(item: OrderItem): 'pending' | 'preparing' | 'completed' {
  return item.status ?? 'pending';
}

function allItemsCompleted(order: Order) {
  return (order.items ?? []).length > 0 && (order.items ?? []).every((item) => getItemStatus(item) === 'completed');
}

function itemStatusBadgeClass(status: 'pending' | 'preparing' | 'completed') {
  if (status === 'completed') return 'bg-green-100 text-green-900';
  if (status === 'preparing') return 'bg-blue-100 text-blue-900';
  return 'bg-yellow-100 text-yellow-900';
}

const ITEM_STATUS_LABELS = {
  pending: 'Not Started',
  preparing: 'Preparing',
  completed: 'Completed',
} as const;

function BillingMenuPicker({
  menuItems,
  cart,
  setCart,
  menuSearch,
  setMenuSearch,
}: {
  menuItems: MenuItem[];
  cart: CartItem[];
  setCart: (fn: (prev: CartItem[]) => CartItem[]) => void;
  menuSearch: string;
  setMenuSearch: (value: string) => void;
}) {
  const filtered = useMemo(
    () => menuItems.filter((item) => item.available && item.name.toLowerCase().includes(menuSearch.toLowerCase())),
    [menuItems, menuSearch]
  );

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((cartItem) => cartItem.id === item.id);
      if (existing) {
        return prev.map((cartItem) =>
          cartItem.id === item.id ? { ...cartItem, quantity: cartItem.quantity + 1 } : cartItem
        );
      }
      return [...prev, { id: item.id, name: item.name, price: item.price, quantity: 1 }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((cartItem) =>
          cartItem.id === id ? { ...cartItem, quantity: Math.max(0, cartItem.quantity + delta) } : cartItem
        )
        .filter((cartItem) => cartItem.quantity > 0)
    );
  };

  return (
    <div className="space-y-3">
      <SearchFilter placeholder="Search menu items..." value={menuSearch} onChange={setMenuSearch} className="w-full" />
      <div className="max-h-56 overflow-y-auto grid grid-cols-2 gap-2 pr-1">
        {filtered.map((item) => {
          const inCart = cart.find((cartItem) => cartItem.id === item.id);
          return (
            <Card key={item.id} className={`cursor-pointer transition-all ${inCart ? 'border-primary bg-primary/5' : 'hover:border-primary/40'}`} onClick={() => addToCart(item)}>
              <CardContent className="p-2.5">
                <div className="font-medium text-xs leading-tight truncate">{item.name}</div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs font-semibold text-primary">₹{item.price}</span>
                  {inCart && (
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button className="w-5 h-5 rounded-full bg-muted text-xs flex items-center justify-center hover:bg-primary hover:text-primary-foreground" onClick={() => updateQty(item.id, -1)}>-</button>
                      <span className="text-xs font-bold w-4 text-center">{inCart.quantity}</span>
                      <button className="w-5 h-5 rounded-full bg-muted text-xs flex items-center justify-center hover:bg-primary hover:text-primary-foreground" onClick={() => updateQty(item.id, 1)}>+</button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function BillingCartSummary({
  cart,
  setCart,
}: {
  cart: CartItem[];
  setCart: (fn: (prev: CartItem[]) => CartItem[]) => void;
}) {
  if (cart.length === 0) return null;

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((cartItem) =>
          cartItem.id === id ? { ...cartItem, quantity: Math.max(0, cartItem.quantity + delta) } : cartItem
        )
        .filter((cartItem) => cartItem.quantity > 0)
    );
  };

  const remove = (id: string) => setCart((prev) => prev.filter((cartItem) => cartItem.id !== id));

  return (
    <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
      <div className="font-medium text-sm flex items-center gap-2">
        <ShoppingCart size={15} />
        Items to add <span className="text-muted-foreground">({cart.length} item{cart.length !== 1 ? 's' : ''})</span>
      </div>
      {cart.map((item) => (
        <div key={item.id} className="flex items-center gap-2 text-sm">
          <span className="flex-1 truncate text-xs">{item.name}</span>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => updateQty(item.id, -1)}><Minus size={11} /></Button>
            <span className="w-5 text-center text-xs font-bold">{item.quantity}</span>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => updateQty(item.id, 1)}><Plus size={11} /></Button>
          </div>
          <span className="text-xs font-semibold w-16 text-right shrink-0">₹{(item.price * item.quantity).toFixed(2)}</span>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-500 hover:text-red-700 shrink-0" onClick={() => remove(item.id)}><Trash2 size={11} /></Button>
        </div>
      ))}
      <div className="border-t pt-2 flex justify-between items-center font-semibold text-sm">
        <span>Addition Total</span>
        <span>₹{total.toFixed(2)}</span>
      </div>
    </div>
  );
}

export default function BillingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderIdFromQuery = searchParams.get('order');
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unpaid' | 'paid'>('unpaid');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'digital'>('cash');
  const [miscLabel, setMiscLabel] = useState('');
  const [miscAmount, setMiscAmount] = useState('');
  const [billingNote, setBillingNote] = useState('');
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isAddItemsModalOpen, setIsAddItemsModalOpen] = useState(false);
  const [addMenuSearch, setAddMenuSearch] = useState('');
  const [addCart, setAddCart] = useState<CartItem[]>([]);
  const previousOrdersRef = useRef<Map<string, Order>>(new Map());
  const hasHydratedRef = useRef(false);

  const setUpdatedOrderInState = (updated: Order) => {
    setOrders((prev) => prev.map((order) => order.id === updated.id ? updated : order));
    setSelectedOrder((prev) => prev?.id === updated.id ? updated : prev);
  };

  const loadOrders = (notifyChanges = false) => {
    fetch('/api/orders')
      .then((r) => r.json())
      .then((data) => {
        const nextOrders: Order[] = Array.isArray(data) ? data : [];
        setOrders(nextOrders);

        if (notifyChanges && hasHydratedRef.current) {
          const previousOrders = previousOrdersRef.current;

          nextOrders.forEach((order) => {
            const prev = previousOrders.get(order.id);
            if (!prev) {
              toast({
                title: 'New order for billing',
                description: `${order.order_type === 'dining' ? `Table ${order.table_number}` : 'Takeaway'} • #${order.id.slice(-6)}`,
              });
              return;
            }

            const prevAllCompleted = allItemsCompleted(prev);
            const nextAllCompleted = allItemsCompleted(order);
            const prevItemsSig = (prev.items ?? []).map((item) => `${item.id}:${item.quantity}:${getItemStatus(item)}`).sort().join('|');
            const nextItemsSig = (order.items ?? []).map((item) => `${item.id}:${item.quantity}:${getItemStatus(item)}`).sort().join('|');

            if (!prevAllCompleted && nextAllCompleted && order.payment_status === 'unpaid') {
              toast({
                title: 'Ready to settle',
                description: `${order.order_type === 'dining' ? `Table ${order.table_number}` : 'Takeaway'} • #${order.id.slice(-6)}`,
              });
            } else if (prevItemsSig !== nextItemsSig || prev.payment_status !== order.payment_status) {
              toast({
                title: 'Order updated',
                description: `${order.order_type === 'dining' ? `Table ${order.table_number}` : 'Takeaway'} • #${order.id.slice(-6)}`,
              });
            }
          });
        }

        previousOrdersRef.current = new Map(nextOrders.map((order) => [order.id, order]));
        if (!hasHydratedRef.current) hasHydratedRef.current = true;
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadOrders(false);
    fetch('/api/menu').then((r) => r.json()).then((data) => setMenuItems(Array.isArray(data) ? data : []));

    const intervalId = setInterval(() => {
      loadOrders(true);
    }, 5000);

    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!orderIdFromQuery || orders.length === 0) return;
    const match = orders.find((order) => order.id === orderIdFromQuery);
    if (!match) return;

    if (match.payment_status === 'unpaid') {
      openBilling(match);
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    params.delete('order');
    const next = params.toString();
    router.replace(next ? `/accountant/billing?${next}` : '/accountant/billing');
  }, [orderIdFromQuery, orders, router, searchParams]);

  const closeBillingModal = () => {
    setSelectedOrder(null);
    setIsAddItemsModalOpen(false);

    if (!orderIdFromQuery) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete('order');
    const next = params.toString();
    router.replace(next ? `/accountant/billing?${next}` : '/accountant/billing');
  };

  const openBilling = (order: Order) => {
    setSelectedOrder(order);
    setPaymentMethod((order.payment_method as 'cash' | 'card' | 'digital') || 'cash');
    setMiscLabel(order.misc_label || '');
    const rawMisc = order.misc_amount == null ? '' : String(order.misc_amount).trim();
    const parsedMisc = rawMisc === '' ? NaN : Number(rawMisc);
    setMiscAmount(!Number.isNaN(parsedMisc) && parsedMisc === 0 ? '' : rawMisc);
    setBillingNote(order.billing_note || '');
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch =
        order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.table_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.items.some((item) => item.name.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = statusFilter === 'all' || order.payment_status === statusFilter;
      return matchesSearch && matchesStatus && order.status !== 'cancelled';
    });
  }, [orders, searchTerm, statusFilter]);

  const paidRevenue = orders.filter((order) => order.payment_status === 'paid').reduce((sum, order) => sum + Number(order.total), 0);
  const unpaidCount = orders.filter((order) => order.payment_status === 'unpaid' && order.status !== 'cancelled').length;

  const settleBill = async () => {
    if (!selectedOrder) return;
    if (!allItemsCompleted(selectedOrder)) {
      toast({ title: 'Cannot settle yet', description: 'Complete all items in kitchen before settling bill.' });
      return;
    }

    const res = await fetch(`/api/orders/${selectedOrder.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'completed',
        paymentMethod,
        paymentStatus: 'paid',
        miscLabel: miscLabel.trim() || null,
        miscAmount: Number(miscAmount) || 0,
        billingNote: billingNote.trim() || null,
      }),
    });

    if (res.ok) {
      const updated = await res.json();
      setOrders((prev) => prev.map((order) => order.id === updated.id ? { ...order, ...updated } : order));
      closeBillingModal();
    } else {
      const payload = await res.json().catch(() => ({}));
      toast({ title: 'Unable to settle bill', description: payload.error || 'Please try again.' });
    }
  };

  const updateItemStatus = async (itemId: string, itemStatus: 'completed') => {
    if (!selectedOrder || selectedOrder.payment_status === 'paid') return;
    const res = await fetch(`/api/orders/${selectedOrder.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId, itemStatus }),
    });

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      toast({ title: 'Unable to update item', description: payload.error || 'Please try again.' });
      return;
    }

    const updated = await res.json();
    setUpdatedOrderInState(updated);
    toast({ title: 'Item marked complete' });
  };

  const openAddItems = () => {
    setAddCart([]);
    setAddMenuSearch('');
    setIsAddItemsModalOpen(true);
  };

  const submitAddItems = async () => {
    if (!selectedOrder || addCart.length === 0 || selectedOrder.payment_status === 'paid') return;
    const res = await fetch(`/api/orders/${selectedOrder.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: addCart.map((cartItem) => ({
          menuItemId: cartItem.id,
          name: cartItem.name,
          price: cartItem.price,
          quantity: cartItem.quantity,
        })),
      }),
    });

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      toast({ title: 'Unable to add items', description: payload.error || 'Please try again.' });
      return;
    }

    const updated = await res.json();
    setUpdatedOrderInState(updated);
    setIsAddItemsModalOpen(false);
    const totalQty = addCart.reduce((sum, cartItem) => sum + cartItem.quantity, 0);
    toast({ title: 'Items added', description: `${totalQty} item${totalQty !== 1 ? 's' : ''} added to order.` });
  };

  const subtotal = selectedOrder ? Number(selectedOrder.subtotal) : 0;
  const misc = Number(miscAmount) || 0;
  const grandTotal = subtotal + misc;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-col sm:flex-row">
        <div>
          <h1 className="text-2xl md:text-2xl md:text-3xl font-bold text-foreground">Billing</h1>
          <p className="text-muted-foreground">Settle orders after service with flexible payment and misc billing adjustments</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="py-4"><div className="text-sm text-muted-foreground">Unpaid Bills</div><div className="text-2xl font-bold">{unpaidCount}</div></CardContent></Card>
        <Card><CardContent className="py-4"><div className="text-sm text-muted-foreground">Paid Bills</div><div className="text-2xl font-bold">{orders.filter((order) => order.payment_status === 'paid').length}</div></CardContent></Card>
        <Card><CardContent className="py-4"><div className="text-sm text-muted-foreground">Collected Revenue</div><PriceDisplay amount={paidRevenue} size="lg" /></CardContent></Card>
        <Card><CardContent className="py-4"><div className="text-sm text-muted-foreground">Pending Settlement</div><PriceDisplay amount={orders.filter((order) => order.payment_status === 'unpaid').reduce((sum, order) => sum + Number(order.total), 0)} size="lg" /></CardContent></Card>
      </div>

      <div className="space-y-4 md:flex md:gap-4 md:space-y-0">
        <SearchFilter placeholder="Search bills..." value={searchTerm} onChange={setSearchTerm} className="flex-1" />
        <div className="overflow-x-auto flex gap-2">
          {(['unpaid', 'paid', 'all'] as const).map((filter) => (
            <Button key={filter} variant={statusFilter === filter ? 'default' : 'outline'} size="sm" onClick={() => setStatusFilter(filter)}>
              {filter === 'all' ? 'All Bills' : filter === 'unpaid' ? 'Unpaid' : 'Paid'}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredOrders.map((order) => (
          <Card key={order.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-bold">#{order.id}</div>
                  <div className="text-xs text-muted-foreground">{order.order_type === 'dining' ? `Table ${order.table_number}` : 'Takeaway'}</div>
                </div>
                <Badge className={order.payment_status === 'paid' ? 'bg-green-100 text-green-900' : 'bg-orange-100 text-orange-900'}>
                  {order.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground">{order.items.map((item) => `${item.name} ×${item.quantity}`).join(', ')}</div>
              <div className="flex items-center justify-between">
                <PriceDisplay amount={Number(order.total)} size="lg" />
                <Button onClick={() => openBilling(order)} variant={order.payment_status === 'paid' ? 'outline' : 'default'}>
                  <IndianRupee size={16} className="mr-2" />
                  {order.payment_status === 'paid' ? 'View Bill' : allItemsCompleted(order) ? 'Settle Bill' : 'Kitchen Pending'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredOrders.length === 0 && <Card><CardContent className="py-8 text-center text-muted-foreground">No bills found</CardContent></Card>}

      <Modal isOpen={!!selectedOrder} onClose={closeBillingModal} title={`Billing • ${selectedOrder?.id}`} size="lg">
        {selectedOrder && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Customer Type</div>
                <div className="font-semibold mt-1">{selectedOrder.order_type === 'dining' ? `Dining • Table ${selectedOrder.table_number}` : 'Takeaway'}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Kitchen Status</div>
                <div className="font-semibold mt-1 capitalize">{selectedOrder.status}</div>
              </div>
            </div>

            <div className="rounded-lg bg-muted/40 p-3 space-y-2">
              {selectedOrder.items.map((item) => {
                const status = getItemStatus(item);
                return (
                <div key={item.id} className="flex justify-between items-center gap-2 text-sm">
                  <span>{item.name} × {item.quantity}</span>
                  <div className="flex items-center gap-2">
                    <Badge className={`text-[10px] px-2 py-0.5 ${itemStatusBadgeClass(status)}`}>{ITEM_STATUS_LABELS[status]}</Badge>
                    {selectedOrder.payment_status === 'unpaid' && status !== 'completed' && (
                      <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]" onClick={() => updateItemStatus(item.id, 'completed')}>
                        Mark Complete
                      </Button>
                    )}
                    <PriceDisplay amount={item.price * item.quantity} size="sm" />
                  </div>
                </div>
              )})}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Payment Method</label>
                <select className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as 'cash' | 'card' | 'digital')} disabled={selectedOrder.payment_status === 'paid'}>
                  {PAYMENT_METHODS.map((method) => <option key={method} value={method}>{method.charAt(0).toUpperCase() + method.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Misc Line Amount</label>
                <Input
                  className="mt-1"
                  type="number"
                  min="0"
                  value={miscAmount}
                  onChange={(e) => setMiscAmount(e.target.value)}
                  onFocus={(e) => {
                    const value = e.currentTarget.value.trim();
                    if (value !== '' && !Number.isNaN(Number(value)) && Number(value) === 0) {
                      setMiscAmount('');
                    }
                  }}
                  placeholder="0"
                  disabled={selectedOrder.payment_status === 'paid'}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Misc Line Label / Message</label>
              <Input className="mt-1" value={miscLabel} onChange={(e) => setMiscLabel(e.target.value)} placeholder="e.g. Special dessert, Manual charge, Custom message" disabled={selectedOrder.payment_status === 'paid'} />
            </div>

            <div>
              <label className="text-sm font-medium">Billing Notes</label>
              <Input className="mt-1" value={billingNote} onChange={(e) => setBillingNote(e.target.value)} placeholder="Optional note for final settlement" disabled={selectedOrder.payment_status === 'paid'} />
            </div>

            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><PriceDisplay amount={subtotal} size="sm" /></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Misc</span><PriceDisplay amount={misc} size="sm" /></div>
              <div className="flex justify-between font-semibold text-lg border-t pt-2"><span>Grand Total</span><PriceDisplay amount={grandTotal} size="lg" /></div>
            </div>

            <div className="flex gap-2">
              {selectedOrder.payment_status === 'unpaid' && (
                <Button variant="outline" className="flex-1" onClick={openAddItems}>
                  <Plus size={16} className="mr-2" />Add Items
                </Button>
              )}
              {selectedOrder.payment_status === 'paid' ? (
                <Button className="flex-1" variant="outline" disabled>
                  <IndianRupee size={16} className="mr-2" />Already Paid
                </Button>
              ) : (
                <Button className="flex-1" onClick={settleBill} disabled={!allItemsCompleted(selectedOrder)}>
                  <IndianRupee size={16} className="mr-2" />{allItemsCompleted(selectedOrder) ? 'Settle Bill' : 'Complete kitchen items first'}
                </Button>
              )}
              <Button variant="outline" className="flex-1" onClick={closeBillingModal}>Close</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={isAddItemsModalOpen && !!selectedOrder} onClose={() => setIsAddItemsModalOpen(false)} title={selectedOrder ? `Add Items • ${selectedOrder.id}` : 'Add Items'} size="xl">
        {selectedOrder && (
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/20 p-3">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Current order items</div>
              <div className="space-y-1">
                {selectedOrder.items.map((item) => (
                  <div key={item.id} className="flex justify-between text-xs text-muted-foreground">
                    <span>{item.name} × {item.quantity}</span>
                    <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t mt-2 pt-2 flex justify-between text-xs font-semibold">
                <span>Current total</span>
                <span>₹{Number(selectedOrder.total).toFixed(2)}</span>
              </div>
            </div>

            <BillingMenuPicker
              menuItems={menuItems}
              cart={addCart}
              setCart={setAddCart}
              menuSearch={addMenuSearch}
              setMenuSearch={setAddMenuSearch}
            />
            <BillingCartSummary cart={addCart} setCart={setAddCart} />

            <div className="flex gap-2 pt-1">
              <Button className="flex-1" size="sm" onClick={submitAddItems} disabled={addCart.length === 0 || selectedOrder.payment_status === 'paid'}>
                Add to Order{addCart.length > 0 ? ` • +₹${addCart.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2)}` : ''}
              </Button>
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setIsAddItemsModalOpen(false)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
