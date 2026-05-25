'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Minus, Trash2, ShoppingCart, PlusCircle, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SearchFilter } from '@/components/common/search-filter';
import { PriceDisplay } from '@/components/common/price-display';
import { Modal } from '@/components/common/modal';
import { toast } from '@/hooks/use-toast';

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  menu_item_id?: string;
  status?: 'pending' | 'preparing' | 'completed';
}
interface Order {
  id: string;
  status: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  order_type: 'dining' | 'takeaway';
  payment_status: 'unpaid' | 'paid';
  items: OrderItem[];
  subtotal: number | string;
  total: number | string;
  notes?: string;
  table_number?: string;
  table_id?: string;
  created_at: string;
}
interface MenuItem { id: string; name: string; price: number; category: string; available: boolean }
interface DiningTable { id: string; name: string; capacity: number; active: boolean }
type CartItem = { id: string; name: string; price: number; quantity: number };

const STATUS_COLORS: Record<Order['status'], string> = {
  pending: 'bg-yellow-100 text-yellow-900',
  preparing: 'bg-blue-100 text-blue-900',
  ready: 'bg-green-100 text-green-900',
  completed: 'bg-gray-100 text-gray-700',
  cancelled: 'bg-red-100 text-red-900',
};

const STATUS_LABELS: Record<Order['status'], string> = {
  pending: 'Placed',
  preparing: 'Preparing',
  ready: 'Ready',
  completed: 'Closed',
  cancelled: 'Cancelled',
};

const ITEM_STATUS_LABELS = {
  pending: 'Not Started',
  preparing: 'Preparing',
  completed: 'Completed',
} as const;

function getItemStatus(item: OrderItem): 'pending' | 'preparing' | 'completed' {
  return item.status ?? 'pending';
}

function itemStatusBadgeClass(status: 'pending' | 'preparing' | 'completed') {
  if (status === 'completed') return 'bg-green-100 text-green-900';
  if (status === 'preparing') return 'bg-blue-100 text-blue-900';
  return 'bg-yellow-100 text-yellow-900';
}

function allItemsCompleted(order: Order) {
  return (order.items ?? []).length > 0 && (order.items ?? []).every((item) => getItemStatus(item) === 'completed');
}

function canModifyBeforePreparing(order: Order) {
  return (order.items ?? []).length > 0 && (order.items ?? []).every((item) => getItemStatus(item) === 'pending');
}

function MenuPicker({
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
  setMenuSearch: (v: string) => void;
}) {
  const categories = useMemo(() => {
    const cats = Array.from(new Set(menuItems.map((i) => i.category)));
    return cats;
  }, [menuItems]);

  const filtered = useMemo(() =>
    menuItems.filter((item) => item.available && item.name.toLowerCase().includes(menuSearch.toLowerCase())),
    [menuItems, menuSearch]);

  const grouped = useMemo(() => {
    const map = new Map<string, MenuItem[]>();
    filtered.forEach((item) => {
      const list = map.get(item.category) || [];
      list.push(item);
      map.set(item.category, list);
    });
    return map;
  }, [filtered, categories]);

  const [openCats, setOpenCats] = useState<Record<string, boolean>>({});

  const toggleCat = (cat: string) => setOpenCats((prev) => ({ ...prev, [cat]: !prev[cat] }));
  const isCatOpen = (cat: string) => openCats[cat] !== false; // open by default

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === item.id);
      if (existing) return prev.map((c) => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { id: item.id, name: item.name, price: item.price, quantity: 1 }];
    });
  };

  const updateQty = (id: string, delta: number) =>
    setCart((prev) => prev.map((c) => c.id === id ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c).filter((c) => c.quantity > 0));

  return (
    <div className="space-y-3">
      <SearchFilter placeholder="Search menu items..." value={menuSearch} onChange={setMenuSearch} className="w-full" />
      <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
        {Array.from(grouped.entries()).map(([cat, items]) => (
          <div key={cat}>
            <button className="w-full flex items-center justify-between text-xs font-semibold uppercase text-muted-foreground py-1.5 px-2 hover:bg-muted rounded" onClick={() => toggleCat(cat)}>
              {cat} <span>{isCatOpen(cat) ? <ChevronUp size={12} /> : <ChevronDown size={12} />}</span>
            </button>
            {isCatOpen(cat) && (
              <div className="grid grid-cols-2 gap-2">
                {items.map((item) => {
                  const inCart = cart.find((c) => c.id === item.id);
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
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function CartSummary({
  cart,
  setCart,
  label,
}: {
  cart: CartItem[];
  setCart: (fn: (prev: CartItem[]) => CartItem[]) => void;
  label?: string;
}) {
  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  if (cart.length === 0) return null;

  const updateQty = (id: string, delta: number) =>
    setCart((prev) => prev.map((c) => c.id === id ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c).filter((c) => c.quantity > 0));

  const remove = (id: string) => setCart((prev) => prev.filter((c) => c.id !== id));

  return (
    <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
      <div className="font-medium text-sm flex items-center gap-2">
        <ShoppingCart size={15} />
        {label || 'Cart'} <span className="text-muted-foreground">({cart.length} item{cart.length !== 1 ? 's' : ''})</span>
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
        <span>Subtotal</span>
        <span>₹{total.toFixed(2)}</span>
      </div>
    </div>
  );
}

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('active');

  // New order modal state
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [newCart, setNewCart] = useState<CartItem[]>([]);
  const [newMenuSearch, setNewMenuSearch] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [orderType, setOrderType] = useState<'dining' | 'takeaway'>('dining');
  const [tableId, setTableId] = useState('');
  const [tableNumber, setTableNumber] = useState('');

  // Add items to existing order modal state
  const [addItemsTargetOrder, setAddItemsTargetOrder] = useState<Order | null>(null);
  const [addCart, setAddCart] = useState<CartItem[]>([]);
  const [addMenuSearch, setAddMenuSearch] = useState('');

  // Detail modal
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const previousOrdersRef = useRef<Map<string, Order>>(new Map());
  const hasHydratedRef = useRef(false);

  const loadOrders = (notifyChanges = false) => {
    fetch('/api/orders')
      .then((r) => r.json())
      .then((data) => {
        const nextOrders: Order[] = Array.isArray(data) ? data : [];
        setOrders(nextOrders);

        if (notifyChanges && hasHydratedRef.current) {
          const previousOrders = previousOrdersRef.current;

          nextOrders
            .filter((order) => order.payment_status !== 'paid' && order.status !== 'cancelled')
            .forEach((order) => {
              const prev = previousOrders.get(order.id);
              if (!prev) {
                toast({
                  title: 'New order placed',
                  description: `${order.order_type === 'dining' ? `Table ${order.table_number}` : 'Takeaway'} • #${order.id.slice(-6)}`,
                });
                return;
              }

              const prevItemsSig = (prev.items ?? []).map((item) => `${item.id}:${item.quantity}:${getItemStatus(item)}`).sort().join('|');
              const nextItemsSig = (order.items ?? []).map((item) => `${item.id}:${item.quantity}:${getItemStatus(item)}`).sort().join('|');
              const prevAllCompleted = allItemsCompleted(prev);
              const nextAllCompleted = allItemsCompleted(order);

              const prevNotes = prev.notes ?? '';
              const nextNotes = order.notes ?? '';
              const notesChanged = prevNotes !== nextNotes;

              if (prevItemsSig !== nextItemsSig || prev.status !== order.status || notesChanged) {
                if (!prevAllCompleted && nextAllCompleted) {
                  toast({
                    title: 'Order ready for billing',
                    description: `${order.order_type === 'dining' ? `Table ${order.table_number}` : 'Takeaway'} • #${order.id.slice(-6)}`,
                  });
                } else if (notesChanged && prevItemsSig === nextItemsSig && prev.status === order.status) {
                  toast({
                    title: 'Chef stock-out request',
                    description: `${order.order_type === 'dining' ? `Table ${order.table_number}` : 'Takeaway'} • #${order.id.slice(-6)}`,
                  });
                } else {
                  toast({
                    title: 'Order updated by kitchen',
                    description: `${order.order_type === 'dining' ? `Table ${order.table_number}` : 'Takeaway'} • #${order.id.slice(-6)}`,
                  });
                }
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
    fetch('/api/menu').then((r) => r.json()).then(setMenuItems);
    fetch('/api/tables').then((r) => r.json()).then((data) => setTables(Array.isArray(data) ? data.filter((t) => t.active) : []));

    const intervalId = setInterval(() => {
      loadOrders(true);
    }, 5000);

    return () => clearInterval(intervalId);
  }, []);

  // Map table_id => active unpaid order
  const activeOrderByTable = useMemo(() => {
    const map: Record<string, Order> = {};
    orders.forEach((o) => {
      if (o.order_type === 'dining' && o.payment_status !== 'paid' && o.status !== 'cancelled' && o.table_id) {
        map[o.table_id] = o;
      }
    });
    return map;
  }, [orders]);

  const statuses = ['active', 'all', 'pending', 'preparing', 'ready', 'completed', 'cancelled'];

  const filteredOrders = useMemo(() =>
    orders.filter((order) => {
      const matchesSearch =
        order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.items ?? []).some((i) => i.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (order.table_number ?? '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus =
        selectedStatus === 'all' ||
        (selectedStatus === 'active'
          ? order.payment_status !== 'paid' && order.status !== 'cancelled'
          : order.status === selectedStatus);
      return matchesSearch && matchesStatus;
    }), [orders, searchTerm, selectedStatus]);

  // Active order for selected table in new order modal
  const conflictOrder = useMemo(() =>
    tableId && activeOrderByTable[tableId] ? activeOrderByTable[tableId] : null,
  [tableId, activeOrderByTable]);

  const openNewOrder = () => {
    setNewCart([]);
    setNewMenuSearch('');
    setOrderNotes('');
    setOrderType('dining');
    setTableId('');
    setTableNumber('');
    setIsNewOrderModalOpen(true);
  };

  const openAddItems = (order: Order) => {
    setAddItemsTargetOrder(order);
    setAddCart([]);
    setAddMenuSearch('');
  };

  const handleOrderTypeChange = (type: 'dining' | 'takeaway') => {
    setOrderType(type);
    if (type === 'takeaway') { setTableId(''); setTableNumber('Takeaway'); }
    else { setTableId(''); setTableNumber(''); }
  };

  const handleTableChange = (id: string) => {
    setTableId(id);
    const selected = tables.find((t) => t.id === id);
    setTableNumber(selected?.name ?? '');
  };

  const handleSubmitNewOrder = async () => {
    if (newCart.length === 0) return;
    if (orderType === 'dining' && !tableNumber) return;
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderType,
        tableId: orderType === 'dining' ? tableId || null : null,
        tableNumber: orderType === 'dining' ? tableNumber : 'Takeaway',
        items: newCart.map((c) => ({ menuItemId: c.id, name: c.name, price: c.price, quantity: c.quantity })),
        notes: orderNotes || null,
      }),
    });
    const created = await res.json();
    setOrders((prev) => [created, ...prev]);
    setIsNewOrderModalOpen(false);
    const itemCount = newCart.reduce((sum, i) => sum + i.quantity, 0);
    toast({ title: 'Order placed', description: `${orderType === 'dining' ? `Table ${tableNumber}` : 'Takeaway'} • ${itemCount} item${itemCount > 1 ? 's' : ''}` });
  };

  // "Add to existing" from conflict banner in new order modal
  const handleSwitchToAddItems = () => {
    if (!conflictOrder) return;
    setIsNewOrderModalOpen(false);
    openAddItems(conflictOrder);
  };

  const handleSubmitAddItems = async () => {
    if (!addItemsTargetOrder || addCart.length === 0) return;
    const res = await fetch(`/api/orders/${addItemsTargetOrder.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: addCart.map((c) => ({ menuItemId: c.id, name: c.name, price: c.price, quantity: c.quantity })),
      }),
    });
    const updated = await res.json();
    setOrders((prev) => prev.map((o) => o.id === updated.id ? updated : o));
    setSelectedOrder(updated); // open updated order detail
    setAddItemsTargetOrder(null);
    const itemCount = addCart.reduce((sum, i) => sum + i.quantity, 0);
    toast({ title: 'Items added', description: `${itemCount} item${itemCount > 1 ? 's' : ''} added to ${addItemsTargetOrder.order_type === 'dining' ? `Table ${addItemsTargetOrder.table_number}` : 'Takeaway'}` });
  };

  const handleMarkItemComplete = async (orderId: string, itemId: string) => {
    const res = await fetch(`/api/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId, itemStatus: 'completed' }),
    });

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      toast({ title: 'Unable to update item', description: payload.error || 'Please try again.' });
      return;
    }

    const updated = await res.json();
    setOrders((prev) => prev.map((order) => order.id === updated.id ? updated : order));
    setSelectedOrder((prev) => prev?.id === updated.id ? updated : prev);
    toast({ title: 'Item marked complete' });
  };

  const handleCancelItem = async (orderId: string, itemId: string) => {
    const res = await fetch(`/api/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cancelItemId: itemId }),
    });

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      toast({ title: 'Unable to cancel item', description: payload.error || 'Please try again.' });
      return;
    }

    const updated = await res.json();
    setOrders((prev) => prev.map((order) => order.id === updated.id ? updated : order));
    setSelectedOrder((prev) => prev?.id === updated.id ? updated : prev);
    toast({ title: 'Item cancelled' });
  };

  const handleCancelOrder = async (orderId: string) => {
    const res = await fetch(`/api/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cancelOrder: true }),
    });

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      toast({ title: 'Unable to cancel order', description: payload.error || 'Please try again.' });
      return;
    }

    const updated = await res.json();
    setOrders((prev) => prev.map((order) => order.id === updated.id ? updated : order));
    setSelectedOrder((prev) => prev?.id === updated.id ? updated : prev);
    toast({ title: 'Order cancelled' });
  };

  const isActive = (o: Order) => o.payment_status !== 'paid' && o.status !== 'cancelled';

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-2xl md:text-2xl md:text-3xl font-bold text-foreground">Orders</h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">Take dine-in or takeaway orders. Kitchen handled by chef, billing separately.</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" className="flex-1 sm:flex-none text-sm" onClick={() => router.push('/accountant/billing')}>Billing</Button>
          <Button size="sm" className="flex-1 sm:flex-none text-sm" onClick={openNewOrder}><Plus size={16} className="mr-1" />New Order</Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardContent className="py-3 px-4"><div className="text-xs text-muted-foreground">Total</div><div className="text-xl font-bold">{orders.length}</div></CardContent></Card>
        <Card><CardContent className="py-3 px-4"><div className="text-xs text-muted-foreground">Active</div><div className="text-xl font-bold text-orange-600">{orders.filter(isActive).length}</div></CardContent></Card>
        <Card><CardContent className="py-3 px-4"><div className="text-xs text-muted-foreground">Dining</div><div className="text-xl font-bold">{orders.filter((o) => o.order_type === 'dining').length}</div></CardContent></Card>
        <Card><CardContent className="py-3 px-4"><div className="text-xs text-muted-foreground">Takeaway</div><div className="text-xl font-bold">{orders.filter((o) => o.order_type === 'takeaway').length}</div></CardContent></Card>
        <Card><CardContent className="py-3 px-4"><div className="text-xs text-muted-foreground">Cancelled</div><div className="text-xl font-bold text-red-600">{orders.filter((o) => o.status === 'cancelled').length}</div></CardContent></Card>
      </div>

      {/* Filters */}
      <div className="space-y-2 md:space-y-0 md:flex md:gap-3">
        <SearchFilter placeholder="Search orders..." value={searchTerm} onChange={setSearchTerm} className="flex-1" />
        <div className="flex gap-1.5 flex-wrap">
          {statuses.map((status) => (
            <Button key={status} variant={selectedStatus === status ? 'default' : 'outline'} size="sm" onClick={() => setSelectedStatus(status)} className="text-xs h-8 px-3 capitalize whitespace-nowrap">
              {status === 'all' ? 'All' : status === 'active' ? 'Active' : STATUS_LABELS[status as Order['status']]}
            </Button>
          ))}
        </div>
      </div>

      {/* Order cards */}
      {filteredOrders.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">No orders found</CardContent></Card>
      ) : (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filteredOrders.map((order) => (
            <Card key={order.id} className={`transition-shadow hover:shadow-md ${isActive(order) ? 'border-l-4 border-l-orange-400' : ''}`}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <button className="font-bold text-sm hover:text-primary transition-colors text-left" onClick={() => setSelectedOrder(order)}>
                      {order.order_type === 'dining' ? `Table ${order.table_number}` : 'Takeaway'}
                    </button>
                    <p className="text-xs text-muted-foreground">#{order.id.slice(-6)}</p>
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    <Badge className={`text-xs ${STATUS_COLORS[order.status]}`}>{STATUS_LABELS[order.status]}</Badge>
                    <Badge className={`text-xs ${order.payment_status === 'paid' ? 'bg-green-100 text-green-900' : 'bg-orange-100 text-orange-900'}`}>
                      {order.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-1">
                  {(order.items ?? []).slice(0, 3).map((item) => {
                    const status = getItemStatus(item);
                    return (
                      <div key={item.id} className="flex items-center justify-between gap-2 text-xs">
                        <span className="text-muted-foreground truncate">{item.name} ×{item.quantity}</span>
                        <Badge className={`text-[10px] px-2 py-0.5 ${itemStatusBadgeClass(status)}`}>{ITEM_STATUS_LABELS[status]}</Badge>
                      </div>
                    );
                  })}
                  {(order.items?.length ?? 0) > 3 && <div className="text-[11px] text-muted-foreground">+{(order.items?.length ?? 0) - 3} more items</div>}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                  <span className="font-bold text-sm">₹{Number(order.total).toFixed(2)}</span>
                </div>

                {/* Action row */}
                <div className="flex gap-2 pt-1 border-t">
                  <Button variant="ghost" size="sm" className="flex-1 text-xs h-7" onClick={() => setSelectedOrder(order)}>View</Button>
                  {isActive(order) && canModifyBeforePreparing(order) && (
                    <Button variant="outline" size="sm" className="flex-1 text-xs h-7 text-primary border-primary/40 hover:bg-primary/5" onClick={() => openAddItems(order)}>
                      <PlusCircle size={13} className="mr-1" />Add Items
                    </Button>
                  )}
                  {isActive(order) && canModifyBeforePreparing(order) && (
                    <Button variant="outline" size="sm" className="flex-1 text-xs h-7 text-red-600 border-red-300 hover:bg-red-50" onClick={() => handleCancelOrder(order.id)}>
                      Cancel
                    </Button>
                  )}
                  {order.payment_status === 'unpaid' && order.status !== 'cancelled' && allItemsCompleted(order) && (
                    <Button variant="outline" size="sm" className="flex-1 text-xs h-7" onClick={() => router.push(`/accountant/billing?order=${order.id}`)}>Bill</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Order Detail Modal */}
      <Modal isOpen={!!selectedOrder} onClose={() => setSelectedOrder(null)} title={selectedOrder ? (selectedOrder.order_type === 'dining' ? `Table ${selectedOrder.table_number}` : 'Takeaway') : ''} size="lg">
        {selectedOrder && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <div><div className="text-xs text-muted-foreground mb-1">Order ID</div><div className="font-medium">#{selectedOrder.id.slice(-8)}</div></div>
              <div><div className="text-xs text-muted-foreground mb-1">Status</div><Badge className={`text-xs ${STATUS_COLORS[selectedOrder.status]}`}>{STATUS_LABELS[selectedOrder.status]}</Badge></div>
              <div><div className="text-xs text-muted-foreground mb-1">Payment</div><Badge className={`text-xs ${selectedOrder.payment_status === 'paid' ? 'bg-green-100 text-green-900' : 'bg-orange-100 text-orange-900'}`}>{selectedOrder.payment_status === 'paid' ? 'Paid' : 'Unpaid'}</Badge></div>
              <div><div className="text-xs text-muted-foreground mb-1">Time</div><div className="font-medium">{new Date(selectedOrder.created_at).toLocaleString('en-IN')}</div></div>
            </div>

            <div>
              <div className="text-sm font-medium mb-2">Items</div>
              <div className="rounded-lg bg-muted p-3 space-y-1.5">
                {(selectedOrder.items ?? []).map((item) => {
                  const status = getItemStatus(item);
                  return (
                  <div key={item.id} className="flex justify-between items-center gap-2 text-sm">
                    <span>{item.name} × {item.quantity}</span>
                    <div className="flex items-center gap-2">
                      <Badge className={`text-[10px] px-2 py-0.5 ${itemStatusBadgeClass(status)}`}>{ITEM_STATUS_LABELS[status]}</Badge>
                      {selectedOrder.payment_status === 'unpaid' && status !== 'completed' && (
                        <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]" onClick={() => handleMarkItemComplete(selectedOrder.id, item.id)}>
                          Mark Complete
                        </Button>
                      )}
                      {isActive(selectedOrder) && canModifyBeforePreparing(selectedOrder) && (
                        <Button size="sm" variant="outline" className="h-6 px-2 text-[10px] text-red-600 border-red-300 hover:bg-red-50" onClick={() => handleCancelItem(selectedOrder.id, item.id)}>
                          Cancel Item
                        </Button>
                      )}
                      <span className="font-medium">₹{(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  </div>
                )})}
              </div>
            </div>

            {selectedOrder.notes && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-900">{selectedOrder.notes}</div>
            )}

            <div className="border-t pt-3 flex justify-between items-center font-bold">
              <span>Total</span>
              <span className="text-lg">₹{Number(selectedOrder.total).toFixed(2)}</span>
            </div>

            {isActive(selectedOrder) && (
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="w-full text-sm" disabled={!canModifyBeforePreparing(selectedOrder)} onClick={() => { setSelectedOrder(null); openAddItems(selectedOrder); }}>
                  <PlusCircle size={15} className="mr-1" />Add More Items
                </Button>
                <Button className="w-full text-sm" disabled={!allItemsCompleted(selectedOrder)} onClick={() => router.push(`/accountant/billing?order=${selectedOrder.id}`)}>
                  {allItemsCompleted(selectedOrder) ? 'Go to Billing' : 'Complete all items first'}
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* New Order Modal */}
      <Modal isOpen={isNewOrderModalOpen} onClose={() => setIsNewOrderModalOpen(false)} title="New Order" size="xl">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Order Type</label>
              <div className="mt-1.5 flex gap-2">
                <Button type="button" variant={orderType === 'dining' ? 'default' : 'outline'} size="sm" className="flex-1" onClick={() => handleOrderTypeChange('dining')}>Dine In</Button>
                <Button type="button" variant={orderType === 'takeaway' ? 'default' : 'outline'} size="sm" className="flex-1" onClick={() => handleOrderTypeChange('takeaway')}>Takeaway</Button>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Table</label>
              {orderType === 'dining' ? (
                <select className="mt-1.5 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={tableId} onChange={(e) => handleTableChange(e.target.value)}>
                  <option value="">Select table</option>
                  {tables.map((table) => <option key={table.id} value={table.id}>{table.name} • {table.capacity} seats{activeOrderByTable[table.id] ? ' ⚠️ active' : ''}</option>)}
                </select>
              ) : (
                <div className="mt-1.5 flex h-9 items-center rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground">Takeaway</div>
              )}
            </div>
          </div>

          {/* Conflict warning */}
          {conflictOrder && (
            <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 space-y-2">
              <div className="flex items-start gap-2 text-sm text-orange-900">
                <AlertTriangle size={16} className="shrink-0 mt-0.5 text-orange-600" />
                <div>
                  <div className="font-semibold">Table {tableNumber} already has an active order</div>
                  <div className="text-xs mt-0.5 text-orange-800">{(conflictOrder.items ?? []).length} items • ₹{Number(conflictOrder.total).toFixed(2)} • #{conflictOrder.id.slice(-6)}</div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="default" className="flex-1 text-xs bg-orange-600 hover:bg-orange-700" onClick={handleSwitchToAddItems}>
                  <PlusCircle size={13} className="mr-1" />Add to existing order
                </Button>
                <Button size="sm" variant="outline" className="flex-1 text-xs border-orange-300 text-orange-900 hover:bg-orange-100" onClick={() => setTableId('')}>
                  Choose different table
                </Button>
              </div>
            </div>
          )}

          {orderType === 'dining' && tables.length === 0 && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-900">No active tables. Ask admin to add tables.</div>
          )}

          <MenuPicker menuItems={menuItems} cart={newCart} setCart={setNewCart} menuSearch={newMenuSearch} setMenuSearch={setNewMenuSearch} />
          <CartSummary cart={newCart} setCart={setNewCart} />

          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Special Notes</label>
            <input className="mt-1.5 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={orderNotes} onChange={(e) => setOrderNotes(e.target.value)} placeholder="Allergies, special requests..." />
          </div>

          <div className="flex gap-2 pt-1">
            <Button className="flex-1" size="sm" onClick={handleSubmitNewOrder} disabled={newCart.length === 0 || (orderType === 'dining' && !tableNumber)}>
              Place Order{newCart.length > 0 ? ` • ₹${newCart.reduce((s, i) => s + i.price * i.quantity, 0).toFixed(2)}` : ''}
            </Button>
            <Button variant="outline" size="sm" className="flex-1" onClick={() => setIsNewOrderModalOpen(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>

      {/* Add Items to Existing Order Modal */}
      <Modal isOpen={!!addItemsTargetOrder} onClose={() => setAddItemsTargetOrder(null)} title={addItemsTargetOrder ? `Add Items — ${addItemsTargetOrder.order_type === 'dining' ? `Table ${addItemsTargetOrder.table_number}` : 'Takeaway'}` : ''} size="xl">
        {addItemsTargetOrder && (
          <div className="space-y-4">
            {/* Existing items summary */}
            <div className="rounded-lg border bg-muted/20 p-3">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Current order items</div>
              <div className="space-y-1">
                {(addItemsTargetOrder.items ?? []).map((item) => (
                  <div key={item.id} className="flex justify-between text-xs text-muted-foreground">
                    <span>{item.name} × {item.quantity}</span>
                    <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t mt-2 pt-2 flex justify-between text-xs font-semibold">
                <span>Current total</span>
                <span>₹{Number(addItemsTargetOrder.total).toFixed(2)}</span>
              </div>
            </div>

            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Add new items</div>
            <MenuPicker menuItems={menuItems} cart={addCart} setCart={setAddCart} menuSearch={addMenuSearch} setMenuSearch={setAddMenuSearch} />
            <CartSummary cart={addCart} setCart={setAddCart} label="Items to add" />

            <div className="flex gap-2 pt-1">
              <Button className="flex-1" size="sm" onClick={handleSubmitAddItems} disabled={addCart.length === 0}>
                Add to Order{addCart.length > 0 ? ` • +₹${addCart.reduce((s, i) => s + i.price * i.quantity, 0).toFixed(2)}` : ''}
              </Button>
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setAddItemsTargetOrder(null)}>Cancel</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
