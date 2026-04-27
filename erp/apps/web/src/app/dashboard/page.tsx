export default function DashboardHome() {
  return (
    <div className="space-y-6" data-testid="dashboard-home">
      <div>
        <h1 className="text-3xl font-bold">Overview</h1>
        <p className="mt-1 text-sm text-slate-500">
          Phase 0 — capture & master data only. Financial views are unlocked in
          Phase 2 after CA sign-off.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Active projects', '—'],
          ['Pending approvals', '—'],
          ['DPRs today', '—'],
          ['Ledger', 'Frozen'],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-xl border border-slate-200 bg-white p-5"
          >
            <div className="text-xs font-medium uppercase tracking-wider text-slate-500">
              {label}
            </div>
            <div className="mt-2 text-2xl font-semibold">{value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
        Wire real counts once Phase 0 APIs are deployed (projects, DPR,
        approvals endpoints are live — this page is a placeholder).
      </div>
    </div>
  );
}
