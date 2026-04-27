'use client';

import { useState } from 'react';
import type { ApprovalSummary } from '@decorous/types';
import { apiClient } from '@/lib/api-client';
import { useApi } from '@/lib/use-api';
import { Badge, Button, Card, EmptyState, PageHeader } from '@/components/ui';
import { formatPaise, formatDate } from '@/lib/utils';

const KIND_LABEL: Record<string, string> = {
  EXPENSE: 'Expense',
  MATERIAL_RECEIPT: 'Material receipt',
  VENDOR_BILL: 'Vendor bill',
  PAYMENT: 'Payment',
  DPR: 'Daily report',
};

export default function ApprovalsPage() {
  const { data, loading, error, refetch } = useApi<ApprovalSummary[]>(
    '/v1/approvals/pending',
  );
  const [active, setActive] = useState<ApprovalSummary | null>(null);

  return (
    <div data-testid="approvals-page">
      <PageHeader
        title="Pending approvals"
        description="Maker-checker review queue. Items &gt; ₹50,000 require PIN."
      />

      {loading && <p className="text-sm text-slate-500">Loading…</p>}
      {error && (
        <Card className="border-red-200 bg-red-50 text-sm text-red-700">{error}</Card>
      )}

      {data && data.length === 0 && (
        <EmptyState
          title="Nothing pending"
          message="All approvals are up to date. Nicely done."
        />
      )}

      {data && data.length > 0 && (
        <div className="space-y-3">
          {data.map((a) => (
            <Card
              key={a.id}
              className="flex items-start justify-between gap-4"
              data-testid={`approval-row-${a.id}`}
            >
              <div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Badge tone="info">
                    {KIND_LABEL[a.targetType] ?? a.targetType}
                  </Badge>
                  <span>requested {formatDate(a.createdAt)}</span>
                </div>
                <div className="mt-1 text-lg font-semibold">
                  {a.amountCents != null
                    ? formatPaise(Number(a.amountCents))
                    : 'No amount'}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Requires: {a.requiredRole}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setActive({ ...a, __reject: true } as never)}
                  data-testid={`reject-btn-${a.id}`}
                >
                  Reject
                </Button>
                <Button
                  onClick={() => setActive(a)}
                  data-testid={`approve-btn-${a.id}`}
                >
                  Approve
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {active && (
        <DecideDialog
          approval={active}
          mode={(active as unknown as { __reject?: boolean }).__reject ? 'reject' : 'approve'}
          onClose={() => setActive(null)}
          onDone={() => {
            setActive(null);
            refetch();
          }}
        />
      )}
    </div>
  );
}

function DecideDialog({
  approval,
  mode,
  onClose,
  onDone,
}: {
  approval: ApprovalSummary;
  mode: 'approve' | 'reject';
  onClose: () => void;
  onDone: () => void;
}) {
  const [pin, setPin] = useState('');
  const [comment, setComment] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const pinRequired =
    approval.amountCents != null && Number(approval.amountCents) >= 5_000_000;

  async function submit() {
    setBusy(true);
    setErr(null);
    try {
      await apiClient.post(`/v1/approvals/${approval.id}/decide`, {
        action: mode === 'approve' ? 'APPROVE' : 'REJECT',
        pin: pinRequired ? pin : undefined,
        comment: comment || undefined,
        rejectionReason: mode === 'reject' ? reason : undefined,
      });
      onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold">
          {mode === 'approve' ? 'Approve' : 'Reject'}{' '}
          {KIND_LABEL[approval.targetType]}
        </h2>
        {approval.amountCents != null && (
          <p className="mt-1 text-sm text-slate-600">
            Amount:{' '}
            <span className="font-semibold">
              {formatPaise(Number(approval.amountCents))}
            </span>
          </p>
        )}

        {mode === 'reject' && (
          <label className="mt-4 block text-sm font-medium">
            <span className="mb-1 block">Rejection reason *</span>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="block w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="Why is this being rejected?"
            />
          </label>
        )}

        {mode === 'approve' && (
          <label className="mt-4 block text-sm font-medium">
            <span className="mb-1 block">Comment (optional)</span>
            <input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
        )}

        {mode === 'approve' && pinRequired && (
          <label className="mt-4 block text-sm font-medium">
            <span className="mb-1 block">4-digit PIN *</span>
            <input
              type="password"
              required
              minLength={4}
              maxLength={8}
              pattern="[0-9]*"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="block w-full rounded-md border border-slate-300 px-3 py-2 text-lg tracking-widest"
              data-testid="approval-pin-input"
            />
            <span className="mt-1 block text-xs text-slate-500">
              Required for amounts ≥ ₹50,000
            </span>
          </label>
        )}

        {err && <p className="mt-3 text-sm text-red-600">{err}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            variant={mode === 'reject' ? 'danger' : 'primary'}
            disabled={
              busy ||
              (mode === 'reject' && !reason) ||
              (mode === 'approve' && pinRequired && pin.length < 4)
            }
            data-testid="decide-submit-btn"
          >
            {busy
              ? 'Submitting…'
              : mode === 'approve'
                ? 'Confirm approve'
                : 'Confirm reject'}
          </Button>
        </div>
      </div>
    </div>
  );
}
