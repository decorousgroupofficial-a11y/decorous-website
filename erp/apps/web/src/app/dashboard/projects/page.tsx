'use client';

import { useState } from 'react';
import type { ProjectSummary } from '@decorous/types';
import { apiClient } from '@/lib/api-client';
import { useApi } from '@/lib/use-api';
import { Badge, Button, Card, EmptyState, Input, PageHeader } from '@/components/ui';
import { formatPaise } from '@/lib/utils';

const STATUS_TONE: Record<string, 'neutral' | 'success' | 'warning' | 'info'> = {
  PLANNED: 'info',
  ACTIVE: 'success',
  ON_HOLD: 'warning',
  COMPLETED: 'neutral',
  ARCHIVED: 'neutral',
};

export default function ProjectsPage() {
  const { data, loading, error, refetch } =
    useApi<ProjectSummary[]>('/v1/projects');
  const [open, setOpen] = useState(false);

  return (
    <div data-testid="projects-page">
      <PageHeader
        title="Projects"
        description="Sites, villas, and commercial builds under execution."
        action={
          <Button
            onClick={() => setOpen(true)}
            data-testid="new-project-btn"
          >
            + New project
          </Button>
        }
      />

      {loading && <p className="text-sm text-slate-500">Loading…</p>}
      {error && (
        <Card className="border-red-200 bg-red-50 text-sm text-red-700">
          {error}
        </Card>
      )}

      {data && data.length === 0 && (
        <EmptyState
          title="No projects yet"
          message="Create your first project to start tracking budget, DPR, and expenses."
          cta={<Button onClick={() => setOpen(true)}>+ New project</Button>}
        />
      )}

      {data && data.length > 0 && (
        <Card className="overflow-hidden p-0">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Budget</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((p) => (
                <tr
                  key={p.id}
                  className="hover:bg-slate-50"
                  data-testid={`project-row-${p.code}`}
                >
                  <td className="px-4 py-3 font-mono text-xs">{p.code}</td>
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {p.clientName ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={STATUS_TONE[p.status] ?? 'neutral'}>
                      {p.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {formatPaise(p.budgetCents as unknown as number)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {open && (
        <NewProjectDialog
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

function NewProjectDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    code: '',
    name: '',
    clientName: '',
    location: '',
    budgetRupees: '',
  });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await apiClient.post('/v1/projects', {
        code: form.code.toUpperCase(),
        name: form.name,
        clientName: form.clientName || undefined,
        location: form.location || undefined,
        budgetCents: form.budgetRupees
          ? Math.round(Number(form.budgetRupees) * 100)
          : undefined,
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
        data-testid="new-project-form"
      >
        <h2 className="text-lg font-semibold">New project</h2>
        <div className="mt-4 space-y-3">
          <Input
            label="Project code"
            required
            placeholder="e.g. VILLA-A2"
            value={form.code}
            onChange={(e) =>
              setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))
            }
            data-testid="project-code-input"
          />
          <Input
            label="Name"
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            data-testid="project-name-input"
          />
          <Input
            label="Client name"
            value={form.clientName}
            onChange={(e) =>
              setForm((f) => ({ ...f, clientName: e.target.value }))
            }
          />
          <Input
            label="Location"
            value={form.location}
            onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
          />
          <Input
            label="Budget (₹)"
            type="number"
            min={0}
            value={form.budgetRupees}
            onChange={(e) =>
              setForm((f) => ({ ...f, budgetRupees: e.target.value }))
            }
          />
        </div>
        {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={busy} data-testid="submit-project-btn">
            {busy ? 'Creating…' : 'Create'}
          </Button>
        </div>
      </form>
    </div>
  );
}
