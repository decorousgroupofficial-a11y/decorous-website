import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Search, Users, Wallet, FileText, Pencil } from "lucide-react";
import { erpApi, formatPaise, formatDate, toPaise, todayIST, newKey } from "@/lib/erp-api";
import {
  ErpPageHeader, ErpEmptyState, ErpMiniStat, ErpField, ErpSelect, ErpLoading, ErpPhotoPicker,
  apiError, useErpData, useErpRole,
} from "./_shared";

const TRADES = ["MASON", "CARPENTER", "BAR_BENDER", "ELECTRICIAN", "PLUMBER", "PAINTER", "TILER", "WELDER", "HELPER", "SUPERVISOR", "DRIVER", "OTHER"];
const SKILLS = [["SKILLED", "Skilled"], ["SEMI_SKILLED", "Semi-skilled"], ["HELPER", "Helper"]];
const label = (s) => s.replace(/_/g, " ").toLowerCase().replace(/^./, (c) => c.toUpperCase());

export default function ErpLabourPage() {
  const { can } = useErpRole();
  const manage = can("PM", "ACCOUNTANT");
  const [showInactive, setShowInactive] = useState(false);
  const { data: rows, loading, reload } = useErpData(() => erpApi.listWorkers({ include_inactive: showInactive }), [showInactive]);
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState(null);       // worker | {} for new
  const [pay, setPay] = useState(null);
  const [stmt, setStmt] = useState(null);

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    return (rows || []).filter((w) => !n || [w.name, w.trade, w.phone].filter(Boolean).some((v) => v.toLowerCase().includes(n)));
  }, [rows, q]);

  const stats = useMemo(() => {
    const r = rows || [];
    return {
      workers: r.filter((w) => w.is_active).length,
      payable: r.reduce((n, w) => n + Math.max(w.balance_cents, 0), 0),
      advances: r.reduce((n, w) => n + Math.max(-w.balance_cents, 0), 0),
    };
  }, [rows]);

  return (
    <div data-testid="erp-labour-page">
      <ErpPageHeader eyebrow="Site" title="Workers & Wages"
        description="Who is on your payroll, what they've earned from approved attendance, and what's been paid."
        action={manage && <Button onClick={() => setEdit({})} className="gap-1.5" data-testid="erp-new-worker-btn"><Plus size={16} /> Add worker</Button>} />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <ErpMiniStat label="Active workers" value={stats.workers} />
        <ErpMiniStat label="Wages payable" value={formatPaise(stats.payable)} accent="orange" />
        <ErpMiniStat label="Advances to recover" value={formatPaise(stats.advances)} />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input className="pl-9" placeholder="Search name, trade, phone…" value={q} onChange={(e) => setQ(e.target.value)} data-testid="erp-workers-search" />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} /> Show inactive
        </label>
      </div>

      {loading && !rows ? <ErpLoading /> : (rows || []).length === 0 ? (
        <ErpEmptyState icon={Users} title="No workers yet" desc="Add each worker once with their daily wage; attendance and wages build from there."
          action={manage && <Button onClick={() => setEdit({})} className="gap-1.5"><Plus size={16} /> Add first worker</Button>} />
      ) : filtered.length === 0 ? (
        <ErpEmptyState icon={Search} title="No matches" desc={`Nothing matched "${q}".`} />
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-left text-[11px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Worker</th>
                  <th className="px-4 py-3 text-right font-semibold">Daily wage</th>
                  <th className="px-4 py-3 text-right font-semibold">Days</th>
                  <th className="px-4 py-3 text-right font-semibold">Earned</th>
                  <th className="px-4 py-3 text-right font-semibold">Paid</th>
                  <th className="px-4 py-3 text-right font-semibold">Balance</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((w) => (
                  <tr key={w.id} className={w.is_active ? "hover:bg-orange-50/30" : "bg-slate-50 text-slate-400"} data-testid={`erp-worker-row-${w.name}`}>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{w.name}</div>
                      <div className="text-xs text-slate-500">{label(w.trade)} · {label(w.skill_level)}{w.phone ? ` · ${w.phone}` : ""}{!w.is_active ? " · inactive" : ""}</div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatPaise(w.daily_wage_cents)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{w.days_worked}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatPaise(w.earned_cents)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatPaise(w.paid_cents)}
                      {w.pending_paid_cents > 0 && <div className="text-[11px] text-amber-700">+{formatPaise(w.pending_paid_cents)} pending</div>}
                    </td>
                    <td className={`px-4 py-3 text-right font-bold tabular-nums ${w.balance_cents < 0 ? "text-rose-600" : ""}`}>
                      {w.balance_cents < 0 ? `${formatPaise(-w.balance_cents)} adv.` : formatPaise(w.balance_cents)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" className="gap-1" onClick={() => setStmt(w)} data-testid={`erp-worker-statement-${w.name}`}><FileText size={14} /> Statement</Button>
                        {manage && w.is_active && <Button size="sm" variant="outline" className="gap-1" onClick={() => setPay(w)} data-testid={`erp-worker-pay-${w.name}`}><Wallet size={14} /> Pay</Button>}
                        {manage && <Button size="icon" variant="ghost" onClick={() => setEdit(w)} aria-label="Edit worker"><Pencil size={14} /></Button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      <p className="mt-3 text-[11px] text-slate-400">Balances come from approved attendance and approved payments only — an operational view, not an accounting ledger.</p>

      {edit && <WorkerDialog worker={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload(); }} />}
      {pay && <PayDialog worker={pay} onClose={() => setPay(null)} onSaved={() => { setPay(null); reload(); }} />}
      {stmt && <StatementDialog worker={stmt} onClose={() => setStmt(null)} />}
    </div>
  );
}

function WorkerDialog({ worker, onClose, onSaved }) {
  const isNew = !worker.id;
  const [f, setF] = useState({
    name: worker.name || "", phone: worker.phone || "", trade: worker.trade || "MASON",
    skill_level: worker.skill_level || "SKILLED",
    wage: worker.daily_wage_cents ? String(worker.daily_wage_cents / 100) : "",
    ot: worker.ot_rate_cents != null ? String(worker.ot_rate_cents / 100) : "",
    is_active: worker.is_active ?? true,
  });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    const wage = toPaise(f.wage);
    const ot = f.ot === "" ? null : toPaise(f.ot);
    if (!wage) return toast.error("Enter the daily wage in rupees, e.g. 700");
    if (f.ot !== "" && ot == null) return toast.error("Overtime rate must be a number");
    const body = { name: f.name.trim(), phone: f.phone.trim() || null, trade: f.trade, skill_level: f.skill_level, daily_wage_cents: wage, ot_rate_cents: ot };
    setBusy(true);
    try {
      if (isNew) await erpApi.createWorker(body);
      else await erpApi.updateWorker(worker.id, { ...body, is_active: f.is_active });
      toast.success(isNew ? "Worker added" : "Worker updated");
      onSaved();
    } catch (err) { toast.error(apiError(err)); } finally { setBusy(false); }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{isNew ? "Add worker" : "Edit worker"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3.5" data-testid="erp-worker-form">
          <ErpField label="Full name *"><Input required minLength={2} value={f.name} onChange={(e) => set("name", e.target.value)} data-testid="erp-worker-name" /></ErpField>
          <div className="grid grid-cols-2 gap-3">
            <ErpField label="Trade"><ErpSelect value={f.trade} onChange={(v) => set("trade", v)}>{TRADES.map((t) => <option key={t} value={t}>{label(t)}</option>)}</ErpSelect></ErpField>
            <ErpField label="Skill level"><ErpSelect value={f.skill_level} onChange={(v) => set("skill_level", v)}>{SKILLS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</ErpSelect></ErpField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <ErpField label="Daily wage (₹) *"><Input required inputMode="decimal" placeholder="700" value={f.wage} onChange={(e) => set("wage", e.target.value)} data-testid="erp-worker-wage" /></ErpField>
            <ErpField label="Overtime / hour (₹)" hint="Blank = wage ÷ 8"><Input inputMode="decimal" value={f.ot} onChange={(e) => set("ot", e.target.value)} /></ErpField>
          </div>
          <ErpField label="Phone"><Input inputMode="tel" value={f.phone} onChange={(e) => set("phone", e.target.value)} /></ErpField>
          {!isNew && (
            <>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.is_active} onChange={(e) => set("is_active", e.target.checked)} /> Active (can be marked present)</label>
              <p className="text-[11px] text-slate-400">A new wage applies to future attendance only — days already marked keep the rate they were marked at.</p>
            </>
          )}
          <Button type="submit" className="w-full" disabled={busy} data-testid="erp-worker-submit">{busy ? "Saving…" : isNew ? "Add worker" : "Save changes"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PayDialog({ worker, onClose, onSaved }) {
  const key = useRef(newKey());                      // one key per intent → safe to retry
  const [f, setF] = useState({ kind: "WAGE", amount: "", paid_on: todayIST(), mode: "CASH", ref_no: "", note: "" });
  const [proof, setProof] = useState([]);
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const owed = worker.balance_cents;

  async function submit(e) {
    e.preventDefault();
    const amount = toPaise(f.amount);
    if (!amount) return toast.error("Enter a valid amount");
    setBusy(true);
    try {
      const r = await erpApi.createWorkerPayment({
        worker_id: worker.id, kind: f.kind, amount_cents: amount, paid_on: f.paid_on, mode: f.mode,
        ref_no: f.ref_no || null, note: f.note || null, proof_photo_key: proof[0]?.key || null,
      }, key.current);
      toast.success(r.approval_status === "APPROVED" ? "Payment recorded" : "Payment sent for approval");
      onSaved();
    } catch (err) { toast.error(apiError(err)); } finally { setBusy(false); }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Pay {worker.name}</DialogTitle></DialogHeader>
        <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
          {owed >= 0 ? <>Currently owed: <strong>{formatPaise(owed)}</strong></> : <>Advance outstanding: <strong className="text-rose-600">{formatPaise(-owed)}</strong></>}
        </div>
        <form onSubmit={submit} className="space-y-3.5" data-testid="erp-worker-pay-form">
          <div className="grid grid-cols-2 gap-2">
            {[["WAGE", "Wage payment"], ["ADVANCE", "Advance"]].map(([v, l]) => (
              <button key={v} type="button" onClick={() => set("kind", v)}
                className={`rounded-lg border py-2.5 text-sm font-semibold ${f.kind === v ? "border-orange-500 bg-orange-50 text-orange-700" : "border-slate-200 bg-white text-slate-600"}`}>{l}</button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <ErpField label="Amount (₹) *"><Input required inputMode="decimal" value={f.amount} onChange={(e) => set("amount", e.target.value)} data-testid="erp-worker-pay-amount" /></ErpField>
            <ErpField label="Date"><Input type="date" required max={todayIST()} value={f.paid_on} onChange={(e) => set("paid_on", e.target.value)} /></ErpField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <ErpField label="Mode"><ErpSelect value={f.mode} onChange={(v) => set("mode", v)}>{["CASH", "UPI", "BANK"].map((m) => <option key={m}>{m}</option>)}</ErpSelect></ErpField>
            <ErpField label="Reference (UTR)"><Input value={f.ref_no} onChange={(e) => set("ref_no", e.target.value)} /></ErpField>
          </div>
          <ErpField label="Proof photo (optional)"><ErpPhotoPicker kind="worker-payment" value={proof} onChange={setProof} max={1} label="Add proof" /></ErpField>
          <p className="text-[11px] text-slate-400">Up to ₹5,000 is recorded straight away; larger amounts need approval (PIN from ₹50,000).</p>
          <Button type="submit" className="w-full" disabled={busy} data-testid="erp-worker-pay-submit">{busy ? "Saving…" : "Record payment"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function StatementDialog({ worker, onClose }) {
  const { data, loading } = useErpData(() => erpApi.workerStatement(worker.id), [worker.id]);
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>{worker.name} — statement</DialogTitle></DialogHeader>
        {loading || !data ? <ErpLoading /> : (
          <div className="space-y-4" data-testid="erp-worker-statement">
            <div className="grid grid-cols-3 gap-2">
              <ErpMiniStat label="Earned" value={formatPaise(data.earned_cents)} />
              <ErpMiniStat label="Paid" value={formatPaise(data.paid_cents)} />
              <ErpMiniStat label={data.balance_cents < 0 ? "Advance" : "Owed"} value={formatPaise(Math.abs(data.balance_cents))} accent="orange" />
            </div>
            {data.pending_payments.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                {data.pending_payments.length} payment{data.pending_payments.length > 1 ? "s" : ""} awaiting approval ({formatPaise(data.pending_payments.reduce((n, p) => n + p.amount_cents, 0))}) — not yet counted as paid.
              </div>
            )}
            {data.lines.length === 0 ? <p className="py-6 text-center text-sm text-slate-500">No approved attendance or payments yet.</p> : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="border-b text-left text-[11px] uppercase tracking-wider text-slate-500">
                    <tr><th className="py-2 pr-3">Date</th><th className="pr-3">Detail</th><th className="pr-3 text-right">Earned</th><th className="pr-3 text-right">Paid</th><th className="text-right">Balance</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.lines.map((l, i) => (
                      <tr key={i}>
                        <td className="whitespace-nowrap py-2 pr-3">{formatDate(l.date)}</td>
                        <td className="pr-3"><span className="font-medium">{l.description}</span>{l.project_code && <span className="ml-1 font-mono text-[11px] text-slate-400">{l.project_code}</span>}</td>
                        <td className="pr-3 text-right tabular-nums">{l.earned_cents ? formatPaise(l.earned_cents) : ""}</td>
                        <td className="pr-3 text-right tabular-nums">{l.paid_cents ? formatPaise(l.paid_cents) : ""}</td>
                        <td className="text-right font-semibold tabular-nums">{formatPaise(l.balance_cents)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="text-[11px] text-slate-400">{data.note}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
