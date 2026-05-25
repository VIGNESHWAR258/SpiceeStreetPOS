'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { DataTable, DataTableColumn } from '@/components/common/data-table';
import { SearchFilter } from '@/components/common/search-filter';
import { PriceDisplay } from '@/components/common/price-display';
import { Modal } from '@/components/common/modal';

interface MenuItem {
  id: string;
  name: string;
  category: string;
  dietaryType: 'veg' | 'non-veg';
  price: number;
  description: string;
  image: string;
  available: boolean;
}

interface FormState {
  name: string;
  categorySelect: string;
  customCategory: string;
  dietaryType: 'veg' | 'non-veg';
  price: string;
  description: string;
  image: string;
}

const SUGGESTED_CATEGORIES = ['Mains', 'Starters', 'Breads', 'Drinks', 'Desserts', 'Rice Dishes'];
const CUSTOM_CATEGORY_KEY = '__custom__';

const emptyForm: FormState = {
  name: '',
  categorySelect: '',
  customCategory: '',
  dietaryType: 'veg',
  price: '',
  description: '',
  image: '',
};

function mapMenuRow(row: Record<string, unknown>): MenuItem {
  return {
    id: row.id as string,
    name: row.name as string,
    category: row.category as string,
    dietaryType: ((row.dietary_type as string) ?? 'veg') === 'non-veg' ? 'non-veg' : 'veg',
    price: parseFloat(String(row.price ?? 0)),
    description: (row.description as string) ?? '',
    image: (row.image as string) ?? '',
    available: Boolean(row.available),
  };
}

export default function MenuManagementPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDietary, setSelectedDietary] = useState<'all' | 'veg' | 'non-veg'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<MenuItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<MenuItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const refreshItems = () => {
    setLoading(true);
    fetch('/api/menu')
      .then((r) => r.json())
      .then((data) => setItems(Array.isArray(data) ? data.map(mapMenuRow) : []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    refreshItems();
  }, []);

  const categoryOptions = useMemo(
    () => Array.from(new Set([...SUGGESTED_CATEGORIES, ...items.map((i) => i.category)])).sort(),
    [items]
  );

  const categories = ['all', ...Array.from(new Set(items.map((i) => i.category)))];

  const filteredItems = useMemo(() =>
    items.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const matchesDietary = selectedDietary === 'all' || item.dietaryType === selectedDietary;
      return matchesSearch && matchesCategory && matchesDietary;
    }), [items, searchTerm, selectedCategory, selectedDietary]);

  const openAdd = () => { setEditItem(null); setForm(emptyForm); setErrors({}); setModalOpen(true); };
  const openEdit = (item: MenuItem) => {
    setEditItem(item);
    setForm({
      name: item.name,
      categorySelect: item.category,
      customCategory: '',
      dietaryType: item.dietaryType,
      price: String(item.price),
      description: item.description,
      image: item.image ?? '',
    });
    setErrors({});
    setModalOpen(true);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Name is required';
    const categoryValue = form.categorySelect === CUSTOM_CATEGORY_KEY ? form.customCategory.trim() : form.categorySelect;
    if (!categoryValue) e.category = 'Category is required';
    if (!form.price || isNaN(Number(form.price)) || Number(form.price) <= 0) e.price = 'Valid price required';
    return e;
  };

  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    const categoryValue = form.categorySelect === CUSTOM_CATEGORY_KEY ? form.customCategory.trim() : form.categorySelect;
    const payload = {
      name: form.name.trim(),
      category: categoryValue,
      dietaryType: form.dietaryType,
      price: Number(form.price),
      description: form.description.trim(),
      image: form.image.trim() || null,
      available: editItem ? editItem.available : true,
    };

    if (editItem) {
      const res = await fetch(`/api/menu/${editItem.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) {
        const updated = mapMenuRow(await res.json());
        setItems(items.map((i) => i.id === editItem.id ? updated : i));
      }
    } else {
      const res = await fetch('/api/menu', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) {
        const created = mapMenuRow(await res.json());
        setItems([created, ...items]);
      }
    }
    setModalOpen(false);
  };

  const handleToggleAvailability = async (id: string, current: boolean) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    const res = await fetch(`/api/menu/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: item.name,
        category: item.category,
        dietaryType: item.dietaryType,
        price: item.price,
        description: item.description,
        image: item.image,
        available: !current,
      }),
    });
    if (res.ok) {
      const updated = mapMenuRow(await res.json());
      setItems(items.map((i) => i.id === id ? updated : i));
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    await fetch(`/api/menu/${deleteItem.id}`, { method: 'DELETE' });
    setItems(items.filter((i) => i.id !== deleteItem.id));
    setDeleteItem(null);
  };

  const columns: DataTableColumn<MenuItem>[] = [
    { key: 'name', label: 'Item Name', render: (value, row) => (<div><div className="font-semibold">{value}</div><div className="text-xs text-muted-foreground">{row.description}</div></div>) },
    { key: 'category', label: 'Category', render: (value) => <Badge variant="outline">{value}</Badge> },
    {
      key: 'dietaryType',
      label: 'Type',
      render: (value) => (
        <Badge className={value === 'veg' ? 'bg-green-100 text-green-900' : 'bg-red-100 text-red-900'}>
          {value === 'veg' ? 'Veg' : 'Non-Veg'}
        </Badge>
      ),
    },
    { key: 'price', label: 'Price', render: (value) => <PriceDisplay amount={value as number} /> },
    { key: 'available', label: 'Status', render: (value, row) => (
      <button onClick={() => handleToggleAvailability(row.id, value as boolean)}>
        <Badge className={`cursor-pointer ${value ? 'bg-green-100 text-green-900 hover:bg-green-200' : 'bg-red-100 text-red-900 hover:bg-red-200'}`}>{value ? 'Available' : 'Out of Stock'}</Badge>
      </button>
    )},
    { key: 'id', label: 'Actions', render: (_v, row) => (
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={() => openEdit(row)}><Edit2 size={16} /></Button>
        <Button variant="ghost" size="sm" onClick={() => setDeleteItem(row)} className="text-red-600 hover:text-red-700 hover:bg-red-50"><Trash2 size={16} /></Button>
      </div>
    )},
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-col sm:flex-row">
        <div>
          <h1 className="text-2xl md:text-2xl md:text-3xl font-bold text-foreground">Menu Management</h1>
          <p className="text-muted-foreground">Manage your restaurant menu items</p>
        </div>
        <Button className="w-full sm:w-auto" onClick={openAdd}><Plus size={18} /><span className="ml-2">Add Item</span></Button>
      </div>

      <div className="space-y-4 md:flex md:gap-4 md:space-y-0">
        <SearchFilter placeholder="Search items..." value={searchTerm} onChange={setSearchTerm} className="flex-1" />
        <div className="overflow-x-auto flex gap-2">
          {(['all', 'veg', 'non-veg'] as const).map((diet) => (
            <Button
              key={diet}
              variant={selectedDietary === diet ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedDietary(diet)}
              className="whitespace-nowrap"
            >
              {diet === 'all' ? 'All Types' : diet === 'veg' ? 'Veg' : 'Non-Veg'}
            </Button>
          ))}
        </div>
        <div className="overflow-x-auto flex gap-2">
          {categories.map((cat) => (
            <Button key={cat} variant={selectedCategory === cat ? 'default' : 'outline'} size="sm" onClick={() => setSelectedCategory(cat)} className="whitespace-nowrap">
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {loading ? <p className="text-muted-foreground">Loading...</p> : (
        <DataTable columns={columns} data={filteredItems} rowKey="id" title="Menu Items"
          description={`Showing ${filteredItems.length} of ${items.length} items`} />
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Items</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{items.length}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Categories</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{categories.length - 1}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Available</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{items.filter((i) => i.available).length}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Avg Price</CardTitle></CardHeader><CardContent><PriceDisplay amount={items.length > 0 ? Math.round(items.reduce((s, i) => s + i.price, 0) / items.length) : 0} size="lg" /></CardContent></Card>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Edit Menu Item' : 'Add Menu Item'} size="lg">
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Name *</label>
              <Input className="mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Butter Chicken" />
              {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="text-sm font-medium">Price (₹) *</label>
              <Input className="mt-1" type="number" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="e.g. 14.99" />
              {errors.price && <p className="text-xs text-red-600 mt-1">{errors.price}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Category *</label>
              <select
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.categorySelect}
                onChange={(e) => setForm({ ...form, categorySelect: e.target.value })}
              >
                <option value="">Select category</option>
                {categoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                <option value={CUSTOM_CATEGORY_KEY}>+ Add new category</option>
              </select>
              {errors.category && <p className="text-xs text-red-600 mt-1">{errors.category}</p>}
            </div>

            <div>
              <label className="text-sm font-medium">Type *</label>
              <div className="mt-1 flex gap-2">
                <Button
                  type="button"
                  variant={form.dietaryType === 'veg' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setForm({ ...form, dietaryType: 'veg' })}
                >
                  Veg
                </Button>
                <Button
                  type="button"
                  variant={form.dietaryType === 'non-veg' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setForm({ ...form, dietaryType: 'non-veg' })}
                >
                  Non-Veg
                </Button>
              </div>
            </div>
          </div>

          {form.categorySelect === CUSTOM_CATEGORY_KEY && (
            <div>
              <label className="text-sm font-medium">New Category Name *</label>
              <Input
                className="mt-1"
                value={form.customCategory}
                onChange={(e) => setForm({ ...form, customCategory: e.target.value })}
                placeholder="e.g. Street Specials"
              />
            </div>
          )}

          <div>
            <label className="text-sm font-medium">Description</label>
            <Input className="mt-1" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Short description" />
          </div>

          <div>
            <label className="text-sm font-medium">Image path</label>
            <Input className="mt-1" value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="/menu-1.jpg" />
          </div>

          <div className="flex gap-2 pt-2">
            <Button className="flex-1" onClick={handleSave}>{editItem ? 'Save Changes' : 'Add Item'}</Button>
            <Button variant="outline" className="flex-1" onClick={() => setModalOpen(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!deleteItem} onClose={() => setDeleteItem(null)} title="Delete Menu Item" size="sm">
        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">Are you sure you want to delete <strong>{deleteItem?.name}</strong>? This cannot be undone.</p>
          <div className="flex gap-2"><Button variant="destructive" className="flex-1" onClick={handleDelete}>Delete</Button><Button variant="outline" className="flex-1" onClick={() => setDeleteItem(null)}>Cancel</Button></div>
        </div>
      </Modal>
    </div>
  );
}
