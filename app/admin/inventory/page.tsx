'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Plus, AlertTriangle, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DataTable, DataTableColumn } from '@/components/common/data-table';
import { SearchFilter } from '@/components/common/search-filter';
import { Modal } from '@/components/common/modal';

interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  min_threshold: number;
  cost_per_unit: number;
  supplier?: string;
  last_restocked?: string;
}

const UNITS = ['kg', 'g', 'L', 'ml', 'pcs', 'dozen', 'box'];
const emptyForm = { name: '', quantity: '', unit: 'kg', min_threshold: '', cost_per_unit: '', supplier: '' };

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [restockItem, setRestockItem] = useState<InventoryItem | null>(null);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [restockQty, setRestockQty] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch('/api/inventory')
      .then((r) => r.json())
      .then(setInventory)
      .finally(() => setLoading(false));
  }, []);

  const filteredInventory = useMemo(() =>
    inventory.filter((item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.supplier ?? '').toLowerCase().includes(searchTerm.toLowerCase())
    ), [inventory, searchTerm]);

  const lowStockItems = inventory.filter((item) => item.quantity <= item.min_threshold);

  const openAdd = () => { setEditItem(null); setForm(emptyForm); setErrors({}); setAddModalOpen(true); };
  const openEdit = (item: InventoryItem) => {
    setEditItem(item);
    setForm({ name: item.name, quantity: String(item.quantity), unit: item.unit, min_threshold: String(item.min_threshold), cost_per_unit: String(item.cost_per_unit), supplier: item.supplier ?? '' });
    setErrors({});
    setAddModalOpen(true);
  };

  const validateForm = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.quantity || isNaN(Number(form.quantity)) || Number(form.quantity) < 0) e.quantity = 'Valid quantity required';
    if (!form.min_threshold || isNaN(Number(form.min_threshold)) || Number(form.min_threshold) < 0) e.min_threshold = 'Valid reorder level required';
    return e;
  };

  const handleSaveItem = async () => {
    const e = validateForm();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    const payload = { name: form.name.trim(), quantity: Number(form.quantity), unit: form.unit, minThreshold: Number(form.min_threshold), costPerUnit: Number(form.cost_per_unit || 0), supplier: form.supplier || null };
    if (editItem) {
      const res = await fetch(`/api/inventory/${editItem.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const updated = await res.json();
      setInventory(inventory.map((i) => i.id === editItem.id ? updated : i));
    } else {
      const res = await fetch('/api/inventory', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const created = await res.json();
      setInventory([created, ...inventory]);
    }
    setAddModalOpen(false);
  };

  const handleRestock = async () => {
    if (!restockItem || !restockQty || isNaN(Number(restockQty)) || Number(restockQty) <= 0) return;
    const res = await fetch(`/api/inventory/${restockItem.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ restock: Number(restockQty) }) });
    const updated = await res.json();
    setInventory(inventory.map((i) => i.id === restockItem.id ? updated : i));
    setRestockItem(null);
    setRestockQty('');
  };

  const columns: DataTableColumn<InventoryItem>[] = [
    { key: 'name', label: 'Item Name', render: (value, row) => (<div><div className="font-semibold">{value}</div><div className="text-xs text-muted-foreground">Supplier: {row.supplier ?? '—'}</div></div>) },
    { key: 'quantity', label: 'Current Stock', render: (value, row) => (<div className={(value as number) <= row.min_threshold ? 'text-red-600 font-semibold' : ''}>{value} {row.unit}</div>) },
    { key: 'min_threshold', label: 'Reorder Level', render: (value, row) => `${value} ${row.unit}` },
    { key: 'quantity', label: 'Status', render: (value, row) => {
      if ((value as number) <= 0) return <Badge className="bg-red-100 text-red-900">Out of Stock</Badge>;
      if ((value as number) <= row.min_threshold) return <Badge className="bg-yellow-100 text-yellow-900">Low Stock</Badge>;
      return <Badge className="bg-green-100 text-green-900">In Stock</Badge>;
    }},
    { key: 'last_restocked', label: 'Last Restocked', render: (value) => {
      if (!value) return '—';
      const daysAgo = Math.floor((Date.now() - new Date(value as string).getTime()) / (1000 * 60 * 60 * 24));
      return `${daysAgo} day${daysAgo !== 1 ? 's' : ''} ago`;
    }},
    { key: 'id', label: 'Actions', render: (_v, row) => (
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={() => openEdit(row)}><Edit2 size={16} /></Button>
        <Button variant="outline" size="sm" onClick={() => { setRestockItem(row); setRestockQty(''); }} className="text-green-700 border-green-300 hover:bg-green-50">Restock</Button>
      </div>
    )},
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-col sm:flex-row">
        <div>
          <h1 className="text-2xl md:text-2xl md:text-3xl font-bold text-foreground">Inventory Management</h1>
          <p className="text-muted-foreground">Track your stock levels</p>
        </div>
        <Button className="w-full sm:w-auto" onClick={openAdd}><Plus size={18} /><span className="ml-2">Add Item</span></Button>
      </div>

      {lowStockItems.length > 0 && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            {lowStockItems.length} item{lowStockItems.length !== 1 ? 's' : ''} running low: {lowStockItems.map((i) => i.name).join(', ')}. Consider reordering soon.
          </AlertDescription>
        </Alert>
      )}

      <SearchFilter placeholder="Search items or supplier..." value={searchTerm} onChange={setSearchTerm} />

      {loading ? <p className="text-muted-foreground">Loading...</p> : (
        <DataTable columns={columns} data={filteredInventory} rowKey="id" title="Inventory Items" description={`${filteredInventory.length} items tracked`} />
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Items</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{inventory.length}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">In Stock</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-green-600">{inventory.filter((i) => i.quantity > i.min_threshold).length}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Low Stock</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-yellow-600">{lowStockItems.length}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Out of Stock</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-red-600">{inventory.filter((i) => i.quantity === 0).length}</div></CardContent></Card>
      </div>

      <Modal isOpen={addModalOpen} onClose={() => setAddModalOpen(false)} title={editItem ? 'Edit Inventory Item' : 'Add Inventory Item'} size="md">
        <div className="space-y-4 py-2">
          <div><label className="text-sm font-medium">Item Name *</label><Input className="mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Chicken Breast" />{errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}</div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm font-medium">Quantity *</label><Input className="mt-1" type="number" min="0" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} placeholder="0" />{errors.quantity && <p className="text-xs text-red-600 mt-1">{errors.quantity}</p>}</div>
            <div><label className="text-sm font-medium">Unit</label>
              <select className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div><label className="text-sm font-medium">Reorder Level *</label><Input className="mt-1" type="number" min="0" value={form.min_threshold} onChange={(e) => setForm({ ...form, min_threshold: e.target.value })} placeholder="Minimum stock before alert" />{errors.min_threshold && <p className="text-xs text-red-600 mt-1">{errors.min_threshold}</p>}</div>
          <div><label className="text-sm font-medium">Cost per Unit (₹)</label><Input className="mt-1" type="number" min="0" value={form.cost_per_unit} onChange={(e) => setForm({ ...form, cost_per_unit: e.target.value })} placeholder="0.00" /></div>
          <div><label className="text-sm font-medium">Supplier</label><Input className="mt-1" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} placeholder="e.g. Fresh Farms Ltd" /></div>
          <div className="flex gap-2 pt-2"><Button className="flex-1" onClick={handleSaveItem}>{editItem ? 'Save Changes' : 'Add Item'}</Button><Button variant="outline" className="flex-1" onClick={() => setAddModalOpen(false)}>Cancel</Button></div>
        </div>
      </Modal>

      <Modal isOpen={!!restockItem} onClose={() => setRestockItem(null)} title={`Restock: ${restockItem?.name}`} size="sm">
        <div className="space-y-4 py-2">
          <div className="text-sm text-muted-foreground bg-muted p-3 rounded">Current stock: <strong>{restockItem?.quantity} {restockItem?.unit}</strong></div>
          <div><label className="text-sm font-medium">Quantity to add ({restockItem?.unit})</label><Input className="mt-1" type="number" min="1" value={restockQty} onChange={(e) => setRestockQty(e.target.value)} placeholder="e.g. 10" autoFocus /></div>
          <div className="flex gap-2"><Button className="flex-1" onClick={handleRestock} disabled={!restockQty || Number(restockQty) <= 0}>Add Stock</Button><Button variant="outline" className="flex-1" onClick={() => setRestockItem(null)}>Cancel</Button></div>
        </div>
      </Modal>
    </div>
  );
}
