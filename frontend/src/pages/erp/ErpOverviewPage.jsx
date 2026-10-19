import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import {
  Briefcase, AlertCircle, ClipboardList, TrendingUp, ArrowRight, Plus,
  CalendarCheck, Wallet, Package, Receipt, Activity,
} from "lucide-react";
import { erpApi, erpAuth, formatPaise, formatDate } from "@/lib/erp-api";
import { ErpStatusPill, ErpBudgetBar, useErpData } from "./_shared";

const TONE_BG = {
  blue: "bg-blue-50 text-blue-700",
  amber: "bg-amber-50 text-amber-700",
  green: "bg-emerald-50 text-emerald-700",
  slate: "bg-slate-100 text-slate-700",
  purple: "bg-violet-50 text-violet-700",
  orange: "bg-orange-50 text-orange-700",
};

export default function ErpOverviewPage() {
  const { data: kpi } = useErpData(() => erpApi.overview(), []);
  const { data: proj } = useErpData(() => erpApi.dashboardProjects(), []);
  const { data: mine } = useErpData(() => erpApi.listPendingApprovals({ mine: true }), []);
  const { data: feed } = useErpData(() => erpApi.activity(10), []);

  const user = erpAuth.user || {};
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const name = (user.full_name || "").split(" ")[0] || "there";
  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata",
  });
  const projects = (proj?.projects || []).filter((p) => p.status !== "ARCHIVED");
  const awaiting = kpi?.awaiting_my_decision ?? 0;

  return (
    <div className="space-y-8" data-testid="erp-overview-page">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{today}</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">{greet}, {name}</h1>
          <p className="mt-1.5 text-sm text-slate-600">Here's what's happening across your sites today.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/erp/attendance" className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50">
            <CalendarCheck size={16} /> Attendance
          </Link>
          <Link to="/erp/dpr/new" className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">
            <Plus size={16} /> New DPR
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi icon={Briefcase} tone="blue" label="Active projects" value={kpi?.active_projects ?? "—"} hint="Under execution" to="/erp/projects" />
        <Kpi icon={AlertCircle} tone="amber" label="Awaiting your decision" value={kpi ? awaiting : "—"}
          hint={kpi ? `${kpi.pending_approvals} open in total · ${formatPaise(kpi.pending_amount_cents)}` : ""}
          urgent={awaiting > 0} to="/erp/approvals" />
        <Kpi icon={ClipboardList} tone="green" label="Reports today" value={kpi?.dprs_today ?? "—"} hint="Daily reports filed" to="/erp/dpr" />
        <Kpi icon={TrendingUp} tone="slate" label="Spend this month" value={kpi ? formatPaise(kpi.month_spend_cents) : "—"}
          hint={kpi?.month_spend_pending_cents ? `+ ${formatPaise(kpi.month_spend_pending_cents)} awaiting approval` : "Approved expenses"} to="/erp/expenses" />
      </div>

      {awaiting > 0 && (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white"><AlertCircle size={20} /></div>
            <div>
              <p className="font-semibold text-amber-900">{awaiting} request{awaiting > 1 ? "s" : ""} waiting for you</p>
              <p className="mt-0.5 text-sm text-amber-800">Requests not decided within 24h (PM) / 48h (Owner) are escalated automatically.</p>
            </div>
          </div>
          <Link to="/erp/approvals" className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700">
            Review <ArrowRight size={14} />
          </Link>
        </div>
      )}

      {/* Projects against budget */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Projects · budget vs cost</h2>
          <Link to="/erp/projects" className="text-xs font-semibold text-orange-600 hover:underline">All projects →</Link>
        </div>
        {!proj ? (
          <Card className="p-6 text-sm text-slate-500">Loading…</Card>
        ) : projects.length === 0 ? (
          <Card className="border-dashed p-8 text-center text-sm text-slate-500">
            No projects yet. <Link to="/erp/projects" className="font-semibold text-orange-600">Create your first project →</Link>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {projects.slice(0, 6).map((p) => (
              <Link key={p.id} to={`/erp/projects/${p.id}`}>
                <Card className="p-4 transition hover:border-slate-300 hover:shadow-sm" data-testid={`erp-overview-project-${p.code}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-mono text-[11px] text-slate-500">{p.code}</div>
                      <div className="truncate font-semibold text-slate-900">{p.name}</div>
                    </div>
                    <ErpStatusPill status={p.status} />
                  </div>
                  <div className="mt-3 flex items-baseline justify-between text-sm">
                    <span className="text-slate-500">Cost so far</span>
                    <span className="font-bold tabular-nums">{formatPaise(p.total_cost_cents)}</span>
                  </div>
                  <ErpBudgetBar pct={p.utilization_pct} className="mt-2" />
                  {p.pending_count > 0 && (
                    <div className="mt-2 text-[11px] font-medium text-amber-700">{p.pending_count} item{p.pending_count > 1 ? "s" : ""} pending approval · {formatPaise(p.pending_cents)}</div>
                  )}
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">Needs your decision</h3>
            <Link to="/erp/approvals" className="text-xs font-semibold text-orange-600 hover:underline">Open inbox →</Link>
          </div>
          {!mine ? <p className="text-sm text-slate-500">Loading…</p> : mine.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">Nothing waiting on you. 🎉</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {mine.slice(0, 5).map((a) => (
                <li key={a.id}>
                  <Link to="/erp/approvals" className="flex items-center justify-between gap-3 py-2.5 hover:bg-slate-50">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-slate-900">{a.target?.title || a.target_type}</div>
                      <div className="text-xs text-slate-500">
                        {a.target?.project_code || "—"} · {a.requested_by_name || "Unknown"} · {formatDate(a.created_at)}
                      </div>
                    </div>
                    <div className="whitespace-nowrap text-sm font-semibold tabular-nums">{a.amount_cents != null ? formatPaise(a.amount_cents) : ""}</div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="mb-3 flex items-center gap-2 font-semibold"><Activity size={15} className="text-slate-400" /> Recent activity</h3>
          {!feed ? <p className="text-sm text-slate-500">Loading…</p> : feed.length === 0 ? (
            <p className="text-sm text-slate-500">No activity yet.</p>
          ) : (
            <ul className="space-y-3">
              {feed.slice(0, 8).map((f) => (
                <li key={f.id} className="text-sm leading-snug">
                  <span className="font-semibold text-slate-900">{f.actor_name}</span>{" "}
                  <span className="text-slate-600">{f.label}</span>
                  <div className="text-[11px] text-slate-400">{formatDate(f.at)}</div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">Quick actions</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QuickTile to="/erp/dpr/new" icon={ClipboardList} tone="blue" title="Submit DPR" desc="3-step site report with photos" />
          <QuickTile to="/erp/attendance" icon={CalendarCheck} tone="green" title="Mark attendance" desc="Today's muster, wages auto-calculated" />
          <QuickTile to="/erp/materials" icon={Package} tone="orange" title="Receive / issue material" desc="Goods receipt, stock, issue to site" />
          <QuickTile to="/erp/expenses" icon={Wallet} tone="purple" title="Capture expense" desc="Petty cash with bill proof" />
          <QuickTile to="/erp/vendors" icon={Receipt} tone="slate" title="Vendor bill / payment" desc="What you owe each supplier" />
        </div>
      </section>
    </div>
  );
}

function Kpi({ icon: Icon, tone, label, value, hint, urgent, to }) {
  const body = (
    <Card className={`relative h-full overflow-hidden p-5 transition hover:shadow-sm ${urgent ? "ring-1 ring-amber-300" : ""}`}>
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg ${TONE_BG[tone]}`}><Icon size={18} /></div>
      <div className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-bold tabular-nums sm:text-3xl">{value}</div>
      <div className="mt-1 truncate text-xs text-slate-500">{hint}</div>
    </Card>
  );
  return to ? <Link to={to}>{body}</Link> : body;
}

function QuickTile({ to, icon: Icon, tone, title, desc }) {
  return (
    <Link to={to} className="group flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm">
      <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${TONE_BG[tone]}`}><Icon size={18} /></div>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
          {title}<ArrowRight size={12} className="opacity-0 transition group-hover:opacity-100" />
        </div>
        <div className="mt-0.5 text-xs text-slate-500">{desc}</div>
      </div>
    </Link>
  );
}
