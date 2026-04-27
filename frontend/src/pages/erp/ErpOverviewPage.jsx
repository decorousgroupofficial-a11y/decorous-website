import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import {
  Briefcase, AlertCircle, ClipboardList, TrendingUp,
  ArrowRight, Plus, Camera, Wallet, Package,
} from "lucide-react";
import { erpApi, formatPaise } from "@/lib/erp-api";

export default function ErpOverviewPage() {
  const [kpi, setKpi] = useState(null);

  useEffect(() => { erpApi.overview().then(setKpi).catch(() => {}); }, []);

  const user = JSON.parse(localStorage.getItem("erp_user") || "{}");
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const name = (user.full_name || "").split(" ")[0] || "there";

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div className="space-y-8" data-testid="erp-overview-page">
      {/* Hero greeting */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <p className="text-sm text-slate-500">{today}</p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mt-1">
            {greet}, {name}
          </h1>
          <p className="mt-1.5 text-sm text-slate-600">
            Here's what's happening across your sites today.
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/erp/dpr/new" className="inline-flex items-center gap-2 rounded-lg bg-slate-900 text-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-800 transition">
            <Plus size={16} /> New DPR
          </Link>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi
          icon={Briefcase}
          tone="blue"
          label="Active projects"
          value={kpi?.active_projects ?? "—"}
          hint="Under execution"
        />
        <Kpi
          icon={AlertCircle}
          tone="amber"
          label="Approvals pending"
          value={kpi?.pending_approvals ?? "—"}
          hint={kpi?.pending_amount_cents ? formatPaise(kpi.pending_amount_cents) : "No pending items"}
          urgent={kpi?.pending_approvals > 0}
        />
        <Kpi
          icon={ClipboardList}
          tone="green"
          label="DPRs today"
          value={kpi?.dprs_today ?? "—"}
          hint="Reports submitted"
        />
        <Kpi
          icon={TrendingUp}
          tone="slate"
          label="Month spend"
          value={kpi ? formatPaise(kpi.month_spend_cents) : "—"}
          hint="Captured · pre-ledger"
        />
      </div>

      {/* Alert strip */}
      {kpi?.pending_approvals > 0 && (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-500 text-white flex items-center justify-center flex-shrink-0">
              <AlertCircle size={20} />
            </div>
            <div>
              <p className="font-semibold text-amber-900">
                {kpi.pending_approvals} approval{kpi.pending_approvals > 1 ? "s" : ""} awaiting decision
              </p>
              <p className="text-sm text-amber-800 mt-0.5">
                SLA: 24h (PM) · 48h (Owner). Auto-escalation runs every 10 min.
              </p>
            </div>
          </div>
          <Link to="/erp/approvals" className="inline-flex items-center gap-2 rounded-lg bg-amber-600 text-white px-4 py-2 text-sm font-semibold hover:bg-amber-700 transition whitespace-nowrap">
            Review <ArrowRight size={14} />
          </Link>
        </div>
      )}

      {/* Quick actions */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">
          Quick actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <QuickTile to="/erp/dpr/new" icon={Camera} tone="blue"
            title="Submit DPR" desc="3-step site report with photos" />
          <QuickTile to="/erp/expenses" icon={Wallet} tone="green"
            title="Capture expense" desc="Petty cash with bill proof" />
          <QuickTile to="/erp/projects" icon={Briefcase} tone="purple"
            title="New project" desc="Set code, client, budget" />
          <QuickTile to="/erp/materials" icon={Package} tone="orange"
            title="Add material" desc="Catalogue SKU for GRN" />
        </div>
      </div>

      {/* Two-column summary */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Phase 0 status</h3>
            <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-medium">Live</span>
          </div>
          <div className="space-y-2.5">
            <StatusRow label="Authentication · JWT + lockout" status="done" />
            <StatusRow label="Multi-tenant orgs & roles (6 roles)" status="done" />
            <StatusRow label="Projects · Vendors · Materials" status="done" />
            <StatusRow label="DPR (3-step mobile-friendly)" status="done" />
            <StatusRow label="Expenses · maker-checker · PIN ≥ ₹50k" status="done" />
            <StatusRow label="Approvals · SLA 24h/48h · escalation" status="done" />
            <StatusRow label="Soft delete · idempotency · UTC" status="done" />
            <StatusRow label="Ledger · journal entries · period lock" status="pending" />
          </div>
        </Card>

        <Card className="p-5 bg-slate-900 text-slate-100 border-slate-900">
          <h3 className="font-semibold text-white">Next unlock</h3>
          <p className="text-sm text-slate-400 mt-1">Phase 2 — Financial Ledger</p>
          <div className="mt-5 space-y-4 text-sm">
            <div>
              <div className="text-xs uppercase tracking-wider text-orange-400 font-semibold">Blocker</div>
              <div className="mt-1">Engage construction-experienced CA to design & sign off the ledger governance.</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-orange-400 font-semibold">Unlocks</div>
              <ul className="mt-1 space-y-0.5 text-slate-300">
                <li>· Double-entry journal</li>
                <li>· Project P&L reports</li>
                <li>· Vendor ageing</li>
                <li>· Period lock (monthly close)</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

const TONE_BG = {
  blue: "bg-blue-50 text-blue-700",
  amber: "bg-amber-50 text-amber-700",
  green: "bg-emerald-50 text-emerald-700",
  slate: "bg-slate-100 text-slate-700",
  purple: "bg-violet-50 text-violet-700",
  orange: "bg-orange-50 text-orange-700",
};

function Kpi({ icon: Icon, tone, label, value, hint, urgent }) {
  return (
    <Card className={`p-5 relative overflow-hidden ${urgent ? "ring-1 ring-amber-300" : ""}`}>
      <div className={`h-10 w-10 rounded-lg ${TONE_BG[tone]} flex items-center justify-center mb-3`}>
        <Icon size={18} />
      </div>
      <div className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-1 text-2xl sm:text-3xl font-bold tabular-nums">{value}</div>
      <div className="mt-1 text-xs text-slate-500 truncate">{hint}</div>
    </Card>
  );
}

function QuickTile({ to, icon: Icon, tone, title, desc }) {
  return (
    <Link
      to={to}
      className="group rounded-xl border border-slate-200 bg-white p-4 hover:border-slate-300 hover:shadow-sm transition flex items-start gap-3"
    >
      <div className={`h-10 w-10 rounded-lg ${TONE_BG[tone]} flex items-center justify-center flex-shrink-0`}>
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <div className="font-semibold text-slate-900 text-sm flex items-center gap-1.5">
          {title}
          <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition" />
        </div>
        <div className="text-xs text-slate-500 mt-0.5">{desc}</div>
      </div>
    </Link>
  );
}

function StatusRow({ label, status }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-700">{label}</span>
      {status === "done" ? (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
          <span className="h-1.5 w-1.5 rounded-full bg-green-600" /> Ready
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Phase 2
        </span>
      )}
    </div>
  );
}
