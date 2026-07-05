'use client';

import { useState } from 'react';
import type { MaterialCategory } from '@decorous/types';
import { apiClient } from '@/lib/api-client';
import { useApi } from '@/lib/use-api';
import { Badge, Button, Card, EmptyState, Input, PageHeader } from '@/components/ui';

type Material = {
  id: string;
  sku: string;
  name: string;
  category: MaterialCategory;
  uom: string;
  hsnCode: string | null;
};

const CATEGORIES: MaterialCategory[] = [
  'CEMENT',
  'STEEL',
  'AGGREGATE',
  'SAND',
  'BRICK',
  'ELECTRICAL',
  'PLUMBING',
  'PAINT',
  'WOOD',
  'TILES',
  'HARDWARE',
  'CONSUMABLE',
  'OTHER',
];

const UOMS = ['bag', 'kg', 'tonne', 'nos', 'cft', 'cum', 'sqft', 'sqm', 'ltr', 'm'];

export default function MaterialsPage() {
  const { data, loading, error, refetch } = useApi<Material[]>('/v1/materials');
  const [open, setOpen] = useState(false);

  return (
    <div data-testid="materials-page">
      <PageHeader
        title="Materials"
        description="Master catalogue — used by GRN and consumption flows."
        action={<Button onClick={() => setOpen(true)}>+ New material</Button>}
      />

      {loading && <p className="text-sm text-slate-500">Loading…</p>}
      {error && (
        <Card className="border-red-200 bg-red-50 text-sm text-red-700">{error}</Card>
      )}
      {data && data.length === 0 && (
        <EmptyState
          title="No materials yet"
          message="Define the items you receive on site — cement, steel, aggregate…"
          cta={<Button onClick={() => setOpen(true)}>+ New material</Button>}
        />
      )}
      {data && data.length > 0 && (
        <Card className="overflow-hidden p-0">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">UoM</th>
                <th className="px-4 py-3">HSN</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs">{m.sku}</td>
                  <td className="px-4 py-3 font-medium">{m.name}</td>
                  <td className="px-4 py-3">
                    <Badge tone="info">{m.category}</Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{m.uom}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">
                    {m.hsnCode ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {open && (
        <NewMaterialDialog
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

function NewMaterialDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [f, setF] = useState({
    sku: '',
    name: '',
    category: 'CEMENT' as MaterialCategory,
    uom: 'bag',
    hsnCode: '',
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await apiClient.post('/v1/materials', {
        sku: f.sku.toUpperCase(),
        name: f.name,
        category: f.category,
        uom: f.uom,
        hsnCode: f.hsnCode || undefined,
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
        <h2 className="text-lg font-semibold">New material</h2>
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="SKU"
              required
              placeholder="CEM-OPC-43"
              value={f.sku}
              onChange={(e) => setF({ ...f, sku: e.target.value.toUpperCase() })}
            />
            <Input
              label="HSN code"
              value={f.hsnCode}
              onChange={(e) => setF({ ...f, hsnCode: e.target.value })}
            />
          </div>
          <Input
            label="Name"
            required
            value={f.name}
            onChange={(e) => setF({ ...f, name: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm font-medium text-slate-700">
              <span className="mb-1 block">Category</span>
              <select
                className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={f.category}
                onChange={(e) =>
                  setF({ ...f, category: e.target.value as MaterialCategory })
                }
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium text-slate-700">
              <span className="mb-1 block">Unit of measure</span>
              <select
                className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={f.uom}
                onChange={(e) => setF({ ...f, uom: e.target.value })}
              >
                {UOMS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </label>
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
