'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { useApi } from '@/lib/use-api';
import { Button, Card, EmptyState, Input, PageHeader } from '@/components/ui';

type Vendor = {
  id: string;
  name: string;
  gstin: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
};

export default function VendorsPage() {
  const { data, loading, error, refetch } = useApi<Vendor[]>('/v1/vendors');
  const [open, setOpen] = useState(false);

  return (
    <div data-testid="vendors-page">
      <PageHeader
        title="Vendors"
        description="Suppliers and contractors. Bills & material receipts link here."
        action={<Button onClick={() => setOpen(true)}>+ New vendor</Button>}
      />

      {loading && <p className="text-sm text-slate-500">Loading…</p>}
      {error && (
        <Card className="border-red-200 bg-red-50 text-sm text-red-700">{error}</Card>
      )}
      {data && data.length === 0 && (
        <EmptyState
          title="No vendors yet"
          message="Add your first supplier to start recording material receipts."
          cta={<Button onClick={() => setOpen(true)}>+ New vendor</Button>}
        />
      )}
      {data && data.length > 0 && (
        <Card className="overflow-hidden p-0">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">GSTIN</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Location</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{v.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">
                    {v.gstin ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{v.phone ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {[v.city, v.state].filter(Boolean).join(', ') || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {open && (
        <NewVendorDialog
          onClose={() => setOpen(false)}
          onCreated={() => {
            setOpen(false);
            refetch();
          }}
        />
      )}
    </div>
  );
}

function NewVendorDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [f, setF] = useState({
    name: '',
    gstin: '',
    phone: '',
    email: '',
    city: '',
    state: '',
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await apiClient.post('/v1/vendors', {
        name: f.name,
        gstin: f.gstin || undefined,
        phone: f.phone || undefined,
        email: f.email || undefined,
        city: f.city || undefined,
        state: f.state || undefined,
      });
      onCreated();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
      >
        <h2 className="text-lg font-semibold">New vendor</h2>
        <div className="mt-4 space-y-3">
          <Input label="Name" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="GSTIN" value={f.gstin} onChange={(e) => setF({ ...f, gstin: e.target.value.toUpperCase() })} />
            <Input label="Phone" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
          </div>
          <Input label="Email" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="City" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} />
            <Input label="State" value={f.state} onChange={(e) => setF({ ...f, state: e.target.value })} />
          </div>
        </div>
        {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </form>
    </div>
  );
}
