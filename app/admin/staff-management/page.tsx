'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { DataTable, DataTableColumn } from '@/components/common/data-table';
import { SearchFilter } from '@/components/common/search-filter';
import { Modal } from '@/components/common/modal';
import { ROLE_LABELS } from '@/lib/constants';

interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'chef' | 'accountant' | 'waiter';
  status: 'active' | 'inactive';
  phone?: string;
  joined_at?: string;
}

const ROLES: StaffMember['role'][] = ['admin', 'accountant', 'chef', 'waiter'];
const emptyForm = { name: '', email: '', role: '' as StaffMember['role'] | '', status: 'active' as StaffMember['status'], phone: '' };

export default function StaffManagementPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editMember, setEditMember] = useState<StaffMember | null>(null);
  const [deleteMember, setDeleteMember] = useState<StaffMember | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch('/api/staff')
      .then((r) => r.json())
      .then(setStaff)
      .finally(() => setLoading(false));
  }, []);

  const filteredStaff = staff.filter((m) =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openAdd = () => { setEditMember(null); setForm(emptyForm); setErrors({}); setModalOpen(true); };
  const openEdit = (member: StaffMember) => {
    setEditMember(member);
    setForm({ name: member.name, email: member.email, role: member.role, status: member.status, phone: member.phone ?? '' });
    setErrors({});
    setModalOpen(true);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.email.trim() || !/^[^@]+@[^@]+\.[^@]+$/.test(form.email)) e.email = 'Valid email required';
    if (!form.role) e.role = 'Role is required';
    return e;
  };

  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    const payload = { name: form.name.trim(), email: form.email.trim(), role: form.role, status: form.status, phone: form.phone || null };
    if (editMember) {
      const res = await fetch(`/api/staff/${editMember.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.status === 409) { setErrors({ email: 'Email already exists' }); return; }
      const updated = await res.json();
      setStaff(staff.map((m) => m.id === editMember.id ? updated : m));
    } else {
      const res = await fetch('/api/staff', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.status === 409) { setErrors({ email: 'Email already exists' }); return; }
      const created = await res.json();
      setStaff([created, ...staff]);
    }
    setModalOpen(false);
  };

  const handleToggleStatus = async (id: string, current: StaffMember['status']) => {
    const member = staff.find((m) => m.id === id);
    if (!member) return;
    const newStatus = current === 'active' ? 'inactive' : 'active';
    const res = await fetch(`/api/staff/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...member, status: newStatus }) });
    const updated = await res.json();
    setStaff(staff.map((m) => m.id === id ? updated : m));
  };

  const handleDelete = async () => {
    if (!deleteMember) return;
    await fetch(`/api/staff/${deleteMember.id}`, { method: 'DELETE' });
    setStaff(staff.filter((m) => m.id !== deleteMember.id));
    setDeleteMember(null);
  };

  const columns: DataTableColumn<StaffMember>[] = [
    { key: 'name', label: 'Staff Member', render: (value, row) => (<div><div className="font-semibold">{value}</div><div className="text-xs text-muted-foreground">{row.email}</div></div>) },
    { key: 'role', label: 'Role', render: (value) => <Badge variant="outline">{ROLE_LABELS[value as keyof typeof ROLE_LABELS] ?? value}</Badge> },
    { key: 'joined_at', label: 'Joined', render: (value) => value ? new Date(value as string).toLocaleDateString() : '—' },
    { key: 'status', label: 'Status', render: (value, row) => (
      <button onClick={() => handleToggleStatus(row.id, value as StaffMember['status'])}>
        <Badge className={`cursor-pointer ${value === 'active' ? 'bg-green-100 text-green-900 hover:bg-green-200' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'}`}>
          {value === 'active' ? <><Check size={14} className="mr-1 inline" />Active</> : <><X size={14} className="mr-1 inline" />Inactive</>}
        </Badge>
      </button>
    )},
    { key: 'id', label: 'Actions', render: (_v, row) => (
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={() => openEdit(row)}><Edit2 size={16} /></Button>
        <Button variant="ghost" size="sm" onClick={() => setDeleteMember(row)} className="text-red-600 hover:text-red-700 hover:bg-red-50"><Trash2 size={16} /></Button>
      </div>
    )},
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-col sm:flex-row">
        <div>
          <h1 className="text-2xl md:text-2xl md:text-3xl font-bold text-foreground">Staff Management</h1>
          <p className="text-muted-foreground">Manage your team members</p>
        </div>
        <Button className="w-full sm:w-auto" onClick={openAdd}><Plus size={18} /><span className="ml-2">Add Staff</span></Button>
      </div>

      <SearchFilter placeholder="Search by name or email..." value={searchTerm} onChange={setSearchTerm} />

      {loading ? <p className="text-muted-foreground">Loading...</p> : (
        <DataTable columns={columns} data={filteredStaff} rowKey="id" title="Team Members" description={`${filteredStaff.length} staff members`} />
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Staff</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{staff.length}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Active</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-green-600">{staff.filter((s) => s.status === 'active').length}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Admins</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{staff.filter((s) => s.role === 'admin').length}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Chefs</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{staff.filter((s) => s.role === 'chef').length}</div></CardContent></Card>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editMember ? 'Edit Staff Member' : 'Add Staff Member'} size="md">
        <div className="space-y-4 py-2">
          <div><label className="text-sm font-medium">Full Name *</label><Input className="mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Rahul Kumar" />{errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}</div>
          <div><label className="text-sm font-medium">Email *</label><Input className="mt-1" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="staff@spiceestreet.com" />{errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}</div>
          <div><label className="text-sm font-medium">Phone</label><Input className="mt-1" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0400-000-000" /></div>
          <div><label className="text-sm font-medium">Role *</label>
            <select className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as StaffMember['role'] })}>
              <option value="">Select role</option>{ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r as keyof typeof ROLE_LABELS] ?? r}</option>)}
            </select>
            {errors.role && <p className="text-xs text-red-600 mt-1">{errors.role}</p>}
          </div>
          {editMember && (
            <div><label className="text-sm font-medium">Status</label>
              <select className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as StaffMember['status'] })}>
                <option value="active">Active</option><option value="inactive">Inactive</option>
              </select>
            </div>
          )}
          <div className="flex gap-2 pt-2"><Button className="flex-1" onClick={handleSave}>{editMember ? 'Save Changes' : 'Add Staff'}</Button><Button variant="outline" className="flex-1" onClick={() => setModalOpen(false)}>Cancel</Button></div>
        </div>
      </Modal>

      <Modal isOpen={!!deleteMember} onClose={() => setDeleteMember(null)} title="Remove Staff Member" size="sm">
        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">Remove <strong>{deleteMember?.name}</strong> from the team? This cannot be undone.</p>
          <div className="flex gap-2"><Button variant="destructive" className="flex-1" onClick={handleDelete}>Remove</Button><Button variant="outline" className="flex-1" onClick={() => setDeleteMember(null)}>Cancel</Button></div>
        </div>
      </Modal>
    </div>
  );
}
