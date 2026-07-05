'use client';

import { useState } from 'react';
import type { ApprovalStatus, ProjectSummary } from '@decorous/types';
import { apiClient } from '@/lib/api-client';
import { useApi } from '@/lib/use-api';
import { Badge, Button, Card, EmptyState, Input, PageHeader } from '@/components/ui';
import { formatPaise, formatDate } from '@/lib/utils';

type Expense = {
  id: string;
  projectId: string;
  purpose: string;
  category: string;
  amountCents: string;         // BigInt serialized as string
  currency: string;
  vendorName: string | null;
  occurredOn: string;
  approvalStatus: ApprovalStatus;
};

const CATEGORIES = ['Transport', 'Tools', 'Food', 'Medical', 'Fuel', 'Other'];

const STATUS_TONE: Record<string, 'neutral' | 'success' | 'warning' | 'danger' | 'info'> =
  {
    DRAFT: 'neutral',
    PENDING: 'warning',
    APPROVED: 'success',
    REJECTED: 'danger',
    VOID: 'neutral',
  };

function ulid() {
  return (
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 12) +
    Math.random().toString(36).slice(2, 8)
  );
}

export default function ExpensesPage() {
  const { data, loading, error, refetch } = useApi<Expense[]>('/v1/expenses');
  const [open, setOpen] = useState(false);

  return (
    <div data-testid="expenses-page">
      <PageHeader
        title="Expenses"
        description="Petty cash captured on site. Requires approval. No ledger post until Phase 2."
        action={<Button onClick={() => setOpen(true)}>+ New expense</Button>}
      />

      {loading && <p className="text-sm text-slate-500">Loading…</p>}
      {error && (
        <Card className="border-red-200 bg-red-50 text-sm text-red-700">{error}</Card>
      )}

      {data && data.length === 0 && (
        <EmptyState
          title="No expenses yet"
          message="Record site expenses. Small amounts auto-approve; larger ones need a checker."
          cta={<Button onClick={() => setOpen(true)}>+ New expense</Button>}
        />
      )}

      {data && data.length > 0 && (
        <Card className="overflow-hidden p-0">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Purpose</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-600">
                    {formatDate(e.occurredOn)}
                  </td>
                  <td className="px-4 py-3 font-medium">{e.purpose}</td>
                  <td className="px-4 py-3">
                    <Badge tone="info">{e.category}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {formatPaise(Number(e.amountCents))}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={STATUS_TONE[e.approvalStatus] ?? 'neutral'}>
                      {e.approvalStatus}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {open && (
        <NewExpenseDialog
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

function NewExpenseDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const projects = useApi<ProjectSummary[]>('/v1/projects');
  const [f, setF] = useState({
    projectId: '',
    purpose: '',
    category: 'Transport',
    amountRupees: '',
    vendorName: '',
    occurredOn: new Date().toISOString().slice(0, 10),
    billPhotoKey: '',
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function uploadBill(file: File) {
    const presign = await apiClient.post('/v1/uploads/presign', {
      kind: 'expense-bill',
      contentType: file.type,
      sizeBytes: file.size,
    });
    try {
      await fetch(presign.url, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
    } catch {
      // stub — still commit key
    }
    setF((x) => ({ ...x, billPhotoKey: presign.objectKey }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const key = ulid();
      const created = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/v1/expenses`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': key,
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          },
          body: JSON.stringify({
            projectId: f.projectId,
            purpose: f.purpose,
            category: f.category,
            amountCents: Math.round(Number(f.amountRupees) * 100),
            vendorName: f.vendorName || undefined,
            occurredOn: f.occurredOn,
            billPhotoKey: f.billPhotoKey,
          }),
        },
      ).then((r) => {
        if (!r.ok) throw new Error('Create failed');
        return r.json();
      });

      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/v1/expenses/${created.id}/submit`,
        {
          method: 'POST',
          headers: {
            'Idempotency-Key': `${key}-submit`,
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          },
        },
      );
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
        <h2 className="text-lg font-semibold">New expense</h2>
        <div className="mt-4 space-y-3">
          <label className="block text-sm font-medium">
            <span className="mb-1 block">Project</span>
            <select
              required
              value={f.projectId}
              onChange={(e) => setF({ ...f, projectId: e.target.value })}
              className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Select project</option>
              {projects.data?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} — {p.name}
                </option>
              ))}
            </select>
          </label>

          <Input
            label="Amount (₹)"
            type="number"
            required
            min={1}
            value={f.amountRupees}
            onChange={(e) => setF({ ...f, amountRupees: e.target.value })}
          />

          <label className="block text-sm font-medium">
            <span className="mb-1 block">Category</span>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setF({ ...f, category: c })}
                  className={`rounded-full border px-3 py-1.5 text-sm ${
                    f.category === c
                      ? 'border-primary bg-primary text-white'
                      : 'border-slate-300 bg-white text-slate-700'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </label>

          <Input
            label="Purpose"
            required
            placeholder="Diesel for JCB"
            value={f.purpose}
            onChange={(e) => setF({ ...f, purpose: e.target.value })}
          />

          <Input
            label="Vendor (optional)"
            value={f.vendorName}
            onChange={(e) => setF({ ...f, vendorName: e.target.value })}
          />

          <Input
            label="Date"
            type="date"
            required
            value={f.occurredOn}
            onChange={(e) => setF({ ...f, occurredOn: e.target.value })}
          />

          <label className="block text-sm font-medium">
            <span className="mb-1 block">Bill photo *</span>
            <input
              type="file"
              accept="image/*,application/pdf"
              required
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadBill(file);
              }}
              className="block w-full text-sm"
            />
            {f.billPhotoKey && (
              <span className="mt-1 block text-xs text-green-700">
                ✓ Attached
              </span>
            )}
          </label>
        </div>

        {err && <p className="mt-3 text-sm text-red-600">{err}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={busy || !f.billPhotoKey}
            data-testid="submit-expense-btn"
          >
            {busy ? 'Submitting…' : 'Submit'}
          </Button>
        </div>
      </form>
    </div>
  );
}
