'use client';

import { useApi } from '@/lib/use-api';
import { Card } from '@/components/ui';
import { formatPaise } from '@/lib/utils';

type ProjectSummary = {
  id: string;
  status: string;
  budgetCents: string | null;
};
type ApprovalSummary = { id: string; amountCents: string | null };
type Dpr = { id: string; reportDate: string };
type Expense = { id: string; amountCents: string; occurredOn: string };

export default function DashboardHome() {
  const projects = useApi<ProjectSummary[]>('/v1/projects');
  const approvals = useApi<ApprovalSummary[]>('/v1/approvals/pending');
  const dprs = useApi<Dpr[]>('/v1/dpr');
  const expenses = useApi<Expense[]>('/v1/expenses');

  const activeProjects =
    projects.data?.filter((p) => p.status === 'ACTIVE').length ?? 0;
  const pendingCount = approvals.data?.length ?? 0;
  const today = new Date().toISOString().slice(0, 10);
  const dprsToday =
    dprs.data?.filter((d) => d.reportDate.slice(0, 10) === today).length ?? 0;
  const pendingAmount = (approvals.data ?? []).reduce(
    (sum, a) => sum + Number(a.amountCents ?? 0),
    0,
  );

  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthSpend = (expenses.data ?? [])
    .filter((e) => e.occurredOn.slice(0, 7) === thisMonth)
    .reduce((sum, e) => sum + Number(e.amountCents), 0);

  return (
    <div className="space-y-6" data-testid="dashboard-home">
      <div>
        <h1 className="text-3xl font-bold">Overview</h1>
        <p className="mt-1 text-sm text-slate-500">
          Phase 0 + 1 — capture & master data. Financial views unlock Phase 2
          after CA sign-off.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Active projects" value={String(activeProjects)} />
        <Kpi
          label="Pending approvals"
          value={String(pendingCount)}
          sub={pendingAmount ? formatPaise(pendingAmount) : undefined}
        />
        <Kpi label="DPRs today" value={String(dprsToday)} />
        <Kpi
          label="This month spend"
          value={formatPaise(monthSpend)}
          sub="captured (pre-ledger)"
        />
      </div>

      {pendingCount > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-amber-900">
                {pendingCount} approval{pendingCount > 1 ? 's' : ''} waiting
              </p>
              <p className="mt-1 text-sm text-amber-800">
                Review and decide — SLA is 24 hours for PM, 48 hours for Owner.
              </p>
            </div>
            <a
              href="/dashboard/approvals"
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
            >
              Review →
            </a>
          </div>
        </Card>
      )}
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="text-xs font-medium uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}
    </div>
  );
}
