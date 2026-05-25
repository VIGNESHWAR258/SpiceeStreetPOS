'use client';

import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/common/modal';

interface DiningTable {
  id: string;
  name: string;
  capacity: number;
  active: boolean;
}

const emptyForm = { name: '', capacity: '4', active: true };

export default function TableManagementPage() {
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteItem, setDeleteItem] = useState<DiningTable | null>(null);
  const [editItem, setEditItem] = useState<DiningTable | null>(null);
  const [form, setForm] = useState(emptyForm);

  const loadTables = () => {
    setLoading(true);
    fetch('/api/tables')
      .then((r) => r.json())
      .then((data) => setTables(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadTables();
  }, []);

  const openAdd = () => {
    setEditItem(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (table: DiningTable) => {
    setEditItem(table);
    setForm({ name: table.name, capacity: String(table.capacity), active: table.active });
    setModalOpen(true);
  };

  const saveTable = async () => {
    const payload = { name: form.name.trim(), capacity: Number(form.capacity), active: form.active };
    if (!payload.name) return;

    if (editItem) {
      await fetch(`/api/tables/${editItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch('/api/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }

    setModalOpen(false);
    loadTables();
  };

  const deleteTable = async () => {
    if (!deleteItem) return;
    await fetch(`/api/tables/${deleteItem.id}`, { method: 'DELETE' });
    setDeleteItem(null);
    loadTables();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-col sm:flex-row">
        <div>
          <h1 className="text-2xl md:text-2xl md:text-3xl font-bold text-foreground">Table Management</h1>
          <p className="text-muted-foreground">Add and manage dining tables used by the cashier while taking dine-in orders</p>
        </div>
        <Button className="w-full sm:w-auto" onClick={openAdd}>
          <Plus size={18} className="mr-2" /> Add Table
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Tables</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{tables.length}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Active Tables</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{tables.filter((t) => t.active).length}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Seats</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{tables.reduce((sum, t) => sum + Number(t.capacity), 0)}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dining Tables</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading tables...</p>
          ) : tables.length === 0 ? (
            <p className="text-muted-foreground">No tables configured yet.</p>
          ) : (
            <div className="space-y-3">
              {tables.map((table) => (
                <div key={table.id} className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <div className="font-semibold">{table.name}</div>
                    <div className="text-sm text-muted-foreground">Capacity: {table.capacity} guests</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={table.active ? 'bg-green-100 text-green-900' : 'bg-gray-100 text-gray-700'}>
                      {table.active ? 'Active' : 'Inactive'}
                    </Badge>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(table)}><Edit2 size={16} /></Button>
                    <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setDeleteItem(table)}><Trash2 size={16} /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Edit Table' : 'Add Table'} size="md">
        <div className="space-y-4 py-2">
          <div>
            <label className="text-sm font-medium">Table Name</label>
            <Input className="mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Table 1" />
          </div>
          <div>
            <label className="text-sm font-medium">Capacity</label>
            <Input className="mt-1" type="number" min="1" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <div className="font-medium text-sm">Table active</div>
              <div className="text-xs text-muted-foreground">Inactive tables will not appear in dining order selection</div>
            </div>
            <Button type="button" variant={form.active ? 'default' : 'outline'} onClick={() => setForm({ ...form, active: !form.active })}>
              {form.active ? 'Active' : 'Inactive'}
            </Button>
          </div>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={saveTable}>{editItem ? 'Save Changes' : 'Add Table'}</Button>
            <Button variant="outline" className="flex-1" onClick={() => setModalOpen(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!deleteItem} onClose={() => setDeleteItem(null)} title="Delete Table" size="sm">
        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">Delete <strong>{deleteItem?.name}</strong>?</p>
          <div className="flex gap-2">
            <Button variant="destructive" className="flex-1" onClick={deleteTable}>Delete</Button>
            <Button variant="outline" className="flex-1" onClick={() => setDeleteItem(null)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
