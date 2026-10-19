import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { ArrowLeft, Pencil, MapPin, Building2, CalendarDays, AlertTriangle } from "lucide-react";
import { erpApi, formatPaise, formatDate, formatQty, toPaise } from "@/lib/erp-api";
import {
  ErpStatusPill, ErpBudgetBar, ErpLoading, ErpEmptyState, ErpPhoto, apiError, useErpData, useErpRole,
} from "./_shared";

// Mirrors PROJECT_TRANSITIONS in the API; the server is the authority, this only decides which buttons to show.
const NEXT = {
  PLANNED: [["ACTIVE", "Start project"], ["ON_HOLD", "Put on hold"], ["ARCHIVED", "Archive"]],
  ACTIVE: [["ON_HOLD", "Put on hold"], ["COMPLETED", "Mark completed"]],
  ON_HOLD: [["ACTIVE", "Resume"], ["COMPLETED", "Mark completed"], ["ARCHIVED", "Archive"]],
  COMPLETED: [["ACTIVE", "Reopen"], ["ARCHIVED", "Archive"]],
  ARCHIVED: [],
};

const SLICES = [
  ["expenses_cents", "Site expenses", "#f97316"],
  ["labour_cents", "Wages", "#0ea5e9"],
  ["bills_cents", "Vendor bills", "#8b5cf6"],
  ["unbilled_receipts_cents", "Received, not billed", "#10b981"],
];

export default function ErpProjectDetailPage() {
  const { id } = useParams();
  const { data, loading, error, reload } = useErpData(() => erpApi.dashboardProject(id), [id]);
  const { can } = useErpRole();
  const [editOpen, setEditOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  if (loading && !data) return <ErpLoading label="Loading project…" />;
  if (error || !data) {
    return (
      <ErpEmptyState icon={AlertTriangle} title="Project not found" desc={error || "It may have been removed."}
        action={<Link to="/erp/projects" className="text-sm font-semibold text-orange-600">← Back to projects</Link>} />
    );
  }

  const { project: p, cost, budget, dpr, workforce_today: wf, stock } = data;

  async function move(status) {
    setBusy(true);
    try {
      await erpApi.updateProject(id, { status });
      toast.success(`Project is now ${status.replace("_", " ").toLowerCase()}`);
      reload();
    } catch (err) { toast.error(apiError(err)); } finally { setBusy(false); }
  }

  const pie = SLICES.map(([k, label, color]) => ({ key: k, name: label, color, value: cost[k] })).filter((s) => s.value > 0);

  return (
    <div className="space-y-6" data-testid="erp-project-detail">
      <Link to="/erp/projects" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft size={14} /> All projects
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-slate-500">{p.code}</span>
            <ErpStatusPill status={p.status} />
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{p.name}</h1>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
            {p.client_name && <span className="inline-flex items-center gap-1.5"><Building2 size={14} className="text-slate-400" />{p.client_name}</span>}
            {p.location && <span className="inline-flex items-center gap-1.5"><MapPin size={14} className="text-slate-400" />{p.location}</span>}
            {(p.start_date || p.end_date) && (
              <span className="inline-flex items-center gap-1.5"><CalendarDays size={14} className="text-slate-400" />
                {p.start_date ? formatDate(p.start_date) : "—"} → {p.end_date ? formatDate(p.end_date) : "—"}
              </span>
            )}
          </div>
        </div>
        {can("PM") && (
          <div className="flex flex-wrap gap-2">
            {NEXT[p.status].map(([to, label]) => (
              <Button key={to} size="sm" variant={to === "ACTIVE" ? "default" : "outline"} disabled={busy}
                onClick={() => move(to)} data-testid={`erp-project-move-${to}`}>{label}</Button>
            ))}
            {p.status !== "ARCHIVED" && (
              <Button size="sm" variant="outline" onClick={() => setEditOpen(true)} data-testid="erp-project-edit-btn" className="gap-1.5">
                <Pencil size={13} /> Edit
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Budget" value={budget.budget_cents ? formatPaise(budget.budget_cents) : "Not set"} />
        <Stat label="Cost to date" value={formatPaise(cost.total_cost_cents)} accent />
        <Stat label="Remaining" value={budget.remaining_cents == null ? "—" : formatPaise(budget.remaining_cents)}
          tone={budget.over_budget ? "bad" : undefined} sub={budget.over_budget ? "Over budget" : undefined} />
        <Stat label="Waiting approval" value={formatPaise(cost.pending_cents)} sub={`${cost.pending_count} item${cost.pending_count === 1 ? "" : "s"}`} />
      </div>
      <ErpBudgetBar pct={budget.utilization_pct} />

      <Tabs defaultValue="overview">
        <TabsList className="flex h-auto flex-wrap justify-start gap-1">
          {["overview", "reports", "spend", "attendance", "stock", "bills"].map((t) => (
            <TabsTrigger key={t} value={t} className="capitalize" data-testid={`erp-project-tab-${t}`}>{t === "spend" ? "Expenses" : t}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="mt-4 grid gap-4 lg:grid-cols-3">
          <Card className="p-5 lg:col-span-2">
            <h3 className="font-semibold">Where the money went</h3>
            {pie.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">No approved spend yet.</p>
            ) : (
              <div className="mt-2 grid items-center gap-4 sm:grid-cols-2">
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pie} dataKey="value" nameKey="name" innerRadius={52} outerRadius={84} paddingAngle={2}>
                        {pie.map((s) => <Cell key={s.key} fill={s.color} />)}
                      </Pie>
                      <Tooltip formatter={(v) => formatPaise(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="space-y-2 text-sm">
                  {SLICES.map(([k, label, color]) => (
                    <li key={k} className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 text-slate-600"><span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />{label}</span>
                      <span className="font-semibold tabular-nums">{formatPaise(cost[k])}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="mt-3 text-[11px] leading-snug text-slate-400">
              A vendor bill that lists its goods receipts replaces them in this total, so material is never counted twice.
              Operational view of approved records — not an accounting ledger.
            </p>
          </Card>

          <div className="space-y-4">
            <Card className="p-5">
              <h3 className="font-semibold">On site today</h3>
              {wf.sheet_status ? (
                <div className="mt-2 text-sm">
                  <div className="text-3xl font-bold tabular-nums">{wf.present + wf.half}</div>
                  <div className="text-slate-500">{wf.present} full · {wf.half} half day · wages {formatPaise(wf.wages_cents)}</div>
                  <div className="mt-2"><ErpStatusPill status={wf.sheet_status} /></div>
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-500">Attendance not marked yet. <Link to="/erp/attendance" className="font-semibold text-orange-600">Mark now →</Link></p>
              )}
            </Card>
            <Card className="p-5">
              <h3 className="font-semibold">Stock alerts</h3>
              {stock.low_stock.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">{stock.items} item{stock.items === 1 ? "" : "s"} tracked · none low.</p>
              ) : (
                <ul className="mt-2 space-y-1.5 text-sm">
                  {stock.low_stock.map((s) => (
                    <li key={s.material_id} className="flex justify-between"><span>{s.material_name}</span>
                      <span className="font-semibold text-rose-600">{formatQty(s.balance_milli)} {s.uom}</span></li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reports" className="mt-4">
          {dpr.recent.length === 0 ? <ErpEmptyState title="No daily reports yet" desc="Reports filed from site will appear here." /> : (
            <div className="space-y-2">
              {dpr.recent.map((d) => (
                <Card key={d.id} className="flex items-center gap-3 p-3">
                  <ErpPhoto objectKey={d.photo_key} className="h-14 w-14 flex-shrink-0 rounded-md" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{d.title || "—"}</div>
                    <div className="text-xs text-slate-500">{formatDate(d.report_date)} · {d.labour_total} workers</div>
                  </div>
                  <ErpStatusPill status={d.approval_status} />
                </Card>
              ))}
              <Link to="/erp/dpr" className="block pt-1 text-xs font-semibold text-orange-600">All reports ({dpr.total}) →</Link>
            </div>
          )}
        </TabsContent>

        <TabsContent value="spend" className="mt-4"><ProjectExpenses id={id} /></TabsContent>
        <TabsContent value="attendance" className="mt-4"><ProjectAttendance id={id} /></TabsContent>
        <TabsContent value="stock" className="mt-4"><ProjectStock id={id} /></TabsContent>
        <TabsContent value="bills" className="mt-4"><ProjectBills id={id} /></TabsContent>
      </Tabs>

      <EditDialog open={editOpen} onOpenChange={setEditOpen} project={p} budgetCents={budget.budget_cents} onSaved={reload} />
    </div>
  );
}

function Stat({ label, value, sub, accent, tone }) {
  return (
    <div className={`rounded-lg border px-4 py-3 ${accent ? "border-orange-200 bg-orange-50" : tone === "bad" ? "border-rose-200 bg-rose-50" : "border-slate-200 bg-white"}`}>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`mt-0.5 text-lg font-bold tabular-nums ${tone === "bad" ? "text-rose-700" : ""}`}>{value}</div>
      {sub && <div className="text-[11px] text-slate-500">{sub}</div>}
    </div>
  );
}

function SimpleTable({ head, rows, empty }) {
  if (!rows.length) return <ErpEmptyState title={empty} />;
  return (
    <Card className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50/80 text-left text-[11px] uppercase tracking-wider text-slate-500">
            <tr>{head.map((h, i) => <th key={h} className={`px-4 py-3 font-semibold ${i === head.length - 1 ? "text-right" : ""}`}>{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">{rows}</tbody>
        </table>
      </div>
    </Card>
  );
}

function ProjectExpenses({ id }) {
  const { data, loading } = useErpData(() => erpApi.listExpenses({ project_id: id }), [id]);
  if (loading) return <ErpLoading />;
  return (
    <SimpleTable empty="No expenses on this project" head={["Date", "Purpose", "Category", "Status", "Amount"]}
      rows={(data || []).map((e) => (
        <tr key={e.id}><td className="px-4 py-2.5 text-slate-600">{formatDate(e.occurred_on)}</td>
          <td className="px-4 py-2.5 font-medium">{e.purpose}</td><td className="px-4 py-2.5 text-slate-600">{e.category}</td>
          <td className="px-4 py-2.5"><ErpStatusPill status={e.approval_status} /></td>
          <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{formatPaise(e.amount_cents)}</td></tr>
      ))} />
  );
}

function ProjectAttendance({ id }) {
  const { data, loading } = useErpData(() => erpApi.listAttendance({ project_id: id, limit: 30 }), [id]);
  if (loading) return <ErpLoading />;
  return (
    <SimpleTable empty="No attendance recorded" head={["Date", "Present", "Half", "Status", "Wages"]}
      rows={(data || []).map((s) => (
        <tr key={s.id}><td className="px-4 py-2.5">{formatDate(s.date)}</td>
          <td className="px-4 py-2.5">{s.present}</td><td className="px-4 py-2.5">{s.half}</td>
          <td className="px-4 py-2.5"><ErpStatusPill status={s.approval_status} /></td>
          <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{formatPaise(s.total_cents)}</td></tr>
      ))} />
  );
}

function ProjectStock({ id }) {
  const { data, loading } = useErpData(() => erpApi.stock({ project_id: id }), [id]);
  if (loading) return <ErpLoading />;
  return (
    <SimpleTable empty="No stock at this site" head={["Material", "Received", "Issued", "Incoming", "On hand"]}
      rows={(data || []).map((s) => (
        <tr key={s.material_id}><td className="px-4 py-2.5 font-medium">{s.material_name} {s.low_stock && <ErpStatusPill status="LOW" />}</td>
          <td className="px-4 py-2.5">{formatQty(s.received_milli)} {s.uom}</td><td className="px-4 py-2.5">{formatQty(s.issued_milli - s.returned_milli)} {s.uom}</td>
          <td className="px-4 py-2.5 text-slate-500">{s.incoming_milli ? `${formatQty(s.incoming_milli)} ${s.uom}` : "—"}</td>
          <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{formatQty(s.balance_milli)} {s.uom}</td></tr>
      ))} />
  );
}

function ProjectBills({ id }) {
  const { data, loading } = useErpData(() => erpApi.listBills({ project_id: id }), [id]);
  if (loading) return <ErpLoading />;
  return (
    <SimpleTable empty="No vendor bills on this project" head={["Date", "Vendor", "Bill no.", "Status", "Amount"]}
      rows={(data || []).map((b) => (
        <tr key={b.id}><td className="px-4 py-2.5 text-slate-600">{formatDate(b.bill_date)}</td>
          <td className="px-4 py-2.5 font-medium">{b.vendor_name}</td><td className="px-4 py-2.5 font-mono text-xs">{b.bill_no}</td>
          <td className="px-4 py-2.5"><ErpStatusPill status={b.approval_status} /></td>
          <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{formatPaise(b.amount_cents)}</td></tr>
      ))} />
  );
}

function EditDialog({ open, onOpenChange, project, budgetCents, onSaved }) {
  const { can } = useErpRole();
  const [f, setF] = useState(null);
  const [busy, setBusy] = useState(false);
  const form = f || {
    name: project.name, client_name: project.client_name || "", location: project.location || "",
    start_date: project.start_date || "", end_date: project.end_date || "",
    budget: budgetCents ? String(budgetCents / 100) : "",
  };
  const set = (k, v) => setF({ ...form, [k]: v });

  async function save(e) {
    e.preventDefault();
    const body = {
      name: form.name, client_name: form.client_name || null, location: form.location || null,
      start_date: form.start_date || null, end_date: form.end_date || null,
    };
    if (can()) {                                     // Owner only — the API enforces this too
      const paise = form.budget === "" ? null : toPaise(form.budget);
      if (form.budget !== "" && paise == null) return toast.error("Enter the budget as a number, e.g. 12500000");
      if (paise !== (budgetCents || null)) body.budget_cents = paise;
    }
    setBusy(true);
    try {
      await erpApi.updateProject(project.id, body);
      toast.success("Project updated");
      setF(null);
      onOpenChange(false);
      onSaved();
    } catch (err) { toast.error(apiError(err)); } finally { setBusy(false); }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) setF(null); onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Edit project</DialogTitle></DialogHeader>
        <form onSubmit={save} className="space-y-3.5">
          <div><Label className="text-xs">Project name</Label><Input required value={form.name} onChange={(e) => set("name", e.target.value)} /></div>
          <div><Label className="text-xs">Client</Label><Input value={form.client_name} onChange={(e) => set("client_name", e.target.value)} /></div>
          <div><Label className="text-xs">Location</Label><Input value={form.location} onChange={(e) => set("location", e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Start date</Label><Input type="date" value={form.start_date} onChange={(e) => set("start_date", e.target.value)} /></div>
            <div><Label className="text-xs">Planned handover</Label><Input type="date" min={form.start_date || undefined} value={form.end_date} onChange={(e) => set("end_date", e.target.value)} /></div>
          </div>
          <div>
            <Label className="text-xs">Budget (₹)</Label>
            <Input inputMode="decimal" disabled={!can()} value={form.budget} onChange={(e) => set("budget", e.target.value)} />
            {!can() && <p className="mt-1 text-[11px] text-slate-400">Only an Owner can change the budget.</p>}
          </div>
          <Button type="submit" className="w-full" disabled={busy}>{busy ? "Saving…" : "Save changes"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
