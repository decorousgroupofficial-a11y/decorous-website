import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Wallet, Send, Info } from "lucide-react";
import { erpApi, formatPaise, formatDate, toPaise, todayIST, newKey } from "@/lib/erp-api";
import {
  ErpPageHeader, ErpEmptyState, ErpMiniStat, ErpField, ErpSelect, ErpLoading, ErpPhotoPicker,
  ErpStatusPill, ErpPhoto, apiError, useErpData,
} from "./_shared";

const CATS = ["Transport", "Tools", "Food", "Medical", "Fuel", "Repairs", "Utilities", "Other"];
const FILTERS = ["ALL", "DRAFT", "PENDING", "APPROVED", "REJECTED"];

export default function ErpExpensesPage() {
  const { data: rows, loading, reload } = useErpData(() => erpApi.listExpenses(), []);
  const { data: projects } = useErpData(() => erpApi.listProjects(), []);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("ALL");
  const [project, setProject] = useState("");
  const [why, setWhy] = useState(null);
  const projectById = useMemo(() => Object.fromEntries((projects || []).map((p) => [p.id, p])), [projects]);

  const shown = useMemo(() => (rows || []).filter((e) => (filter === "ALL" || e.approval_status === filter) && (!project || e.project_id === project)), [rows, filter, project]);
  const stats = useMemo(() => {
    const month = todayIST().slice(0, 7);
    const mine = (rows || []).filter((e) => e.occurred_on?.startsWith(month));
    const sum = (st) => mine.filter((e) => e.approval_status === st).reduce((n, e) => n + e.amount_cents, 0);
    return { approved: sum("APPROVED"), pending: sum("PENDING"), drafts: (rows || []).filter((e) => e.approval_status === "DRAFT").length };
  }, [rows]);

  async function submitDraft(e) {
    try {
      await erpApi.submitExpense(e.id);
      toast.success("Submitted for approval");
      reload();
    } catch (err) { toast.error(apiError(err)); }
  }

  return (
    <div data-testid="erp-expenses-page">
      <ErpPageHeader eyebrow="Money" title="Expenses"
        description="Petty cash with bill proof. Up to ₹5,000 is approved automatically; larger amounts go to a PM, then the Owner."
        action={<Button onClick={() => setOpen(true)} className="gap-1.5" data-testid="erp-new-expense-btn"><Plus size={16} /> New expense</Button>} />

      <div className="mb-5 grid grid-cols-3 gap-3">
        <ErpMiniStat label="Approved this month" value={formatPaise(stats.approved)} accent="orange" />
        <ErpMiniStat label="Awaiting approval" value={formatPaise(stats.pending)} />
        <ErpMiniStat label="Drafts to submit" value={stats.drafts} />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1" data-testid="erp-expenses-filter">
          {FILTERS.map((s) => (
            <button key={s} onClick={() => setFilter(s)} className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${filter === s ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
              {s === "ALL" ? "All" : s[0] + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        <div className="w-full sm:w-64"><ErpSelect value={project} onChange={setProject}><option value="">All projects</option>{(projects || []).map((p) => <option key={p.id} value={p.id}>{p.code}</option>)}</ErpSelect></div>
      </div>

      {loading && !rows ? <ErpLoading /> : (rows || []).length === 0 ? (
        <ErpEmptyState icon={Wallet} title="No expenses yet" desc="Record site expenses with a photo of the bill." action={<Button onClick={() => setOpen(true)} className="gap-1.5"><Plus size={16} /> New expense</Button>} />
      ) : shown.length === 0 ? <ErpEmptyState title="Nothing matches those filters" /> : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-[11px] uppercase tracking-wider text-slate-500">
                <tr><th className="px-4 py-3">Bill</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Project</th><th className="px-4 py-3">Purpose</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Amount</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shown.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50" data-testid={`erp-expense-row-${e.purpose}`}>
                    <td className="px-4 py-2.5"><ErpPhoto objectKey={e.bill_photo_key} zoomable className="h-10 w-10 rounded" /></td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">{formatDate(e.occurred_on)}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-600">{projectById[e.project_id]?.code || "—"}</td>
                    <td className="px-4 py-2.5"><div className="font-medium">{e.purpose}</div><div className="text-xs text-slate-500"><Badge variant="secondary" className="mr-1.5">{e.category}</Badge>{e.vendor_name}</div></td>
                    <td className="px-4 py-2.5">
                      <ErpStatusPill status={e.approval_status} />
                      {e.approval_status === "DRAFT" && <Button size="sm" variant="outline" className="ml-2 h-7 gap-1 px-2 text-xs" onClick={() => submitDraft(e)} data-testid="erp-expense-submit-draft"><Send size={12} /> Submit</Button>}
                      {e.approval_status === "REJECTED" && e.approval_id && <button onClick={() => setWhy(e)} className="ml-2 inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:underline"><Info size={12} /> Why?</button>}
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{formatPaise(e.amount_cents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {open && <NewDialog projects={(projects || []).filter((p) => p.status !== "ARCHIVED")} onClose={() => setOpen(false)} onCreated={() => { setOpen(false); reload(); }} />}
      {why && <WhyDialog expense={why} onClose={() => setWhy(null)} />}
    </div>
  );
}

function WhyDialog({ expense, onClose }) {
  const { data, loading } = useErpData(() => erpApi.getApproval(expense.approval_id), [expense.approval_id]);
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Why it was rejected</DialogTitle></DialogHeader>
        {loading ? <ErpLoading /> : (
          <div className="space-y-2 text-sm">
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-rose-800">{data?.rejection_reason || "No reason recorded."}</p>
            <p className="text-xs text-slate-500">Rejected by {data?.approver_name || "an approver"}. Raise a corrected expense if it still needs paying.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function NewDialog({ projects, onClose, onCreated }) {
  // One idempotency key per *intent*: a double-tap or a retry after a dropped connection
  // reuses it, so the server returns the first result instead of creating a second expense.
  const createKey = useRef(newKey());
  const submitKey = useRef(newKey());
  const created = useRef(null);                     // id of the draft, if create succeeded but submit didn't
  const [f, setF] = useState({ project_id: projects[0]?.id || "", amount: "", category: "Transport", purpose: "", vendor_name: "", occurred_on: todayIST() });
  const [bill, setBill] = useState([]);
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const paise = toPaise(f.amount);

  async function submit(e) {
    e.preventDefault();
    if (!paise) return toast.error("Enter the amount in rupees, e.g. 1250 or 1250.50");
    setBusy(true);
    try {
      if (!created.current) {
        const c = await erpApi.createExpense({
          project_id: f.project_id, purpose: f.purpose.trim(), category: f.category, amount_cents: paise,
          vendor_name: f.vendor_name.trim() || null, bill_photo_key: bill[0].key, occurred_on: f.occurred_on,
        }, createKey.current);
        created.current = c.id;
      }
      const s = await erpApi.submitExpense(created.current, submitKey.current);
      toast.success(s.approval_status === "APPROVED" ? "Expense recorded and approved" : "Expense sent for approval");
      onCreated();
    } catch (err) {
      toast.error(created.current ? `Saved as a draft, but submitting failed: ${apiError(err)}` : apiError(err));
      if (created.current) onCreated();             // the draft is in the list with a Submit button
    } finally { setBusy(false); }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-md overflow-y-auto">
        <DialogHeader><DialogTitle>New expense</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3.5" data-testid="erp-expense-form">
          <ErpField label="Project *"><ErpSelect required value={f.project_id} onChange={(v) => set("project_id", v)} data-testid="erp-expense-project"><option value="">Select project</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}</ErpSelect></ErpField>
          <div className="grid grid-cols-2 gap-3">
            <ErpField label="Amount (₹) *"><Input required inputMode="decimal" placeholder="1250" value={f.amount} onChange={(e) => set("amount", e.target.value)} data-testid="erp-expense-amount" /></ErpField>
            <ErpField label="Date"><Input type="date" required max={todayIST()} value={f.occurred_on} onChange={(e) => set("occurred_on", e.target.value)} /></ErpField>
          </div>
          <div>
            <div className="mb-1 text-xs font-medium text-slate-700">Category</div>
            <div className="flex flex-wrap gap-1.5">
              {CATS.map((c) => (
                <button key={c} type="button" onClick={() => set("category", c)} className={`rounded-full border px-3 py-1.5 text-xs font-medium ${f.category === c ? "border-orange-500 bg-orange-500 text-white" : "border-slate-200 bg-white text-slate-600"}`}>{c}</button>
              ))}
            </div>
          </div>
          <ErpField label="Purpose *"><Input required minLength={2} placeholder="Diesel for JCB" value={f.purpose} onChange={(e) => set("purpose", e.target.value)} data-testid="erp-expense-purpose" /></ErpField>
          <ErpField label="Vendor (optional)"><Input value={f.vendor_name} onChange={(e) => set("vendor_name", e.target.value)} /></ErpField>
          <ErpField label="Bill photo *"><ErpPhotoPicker kind="expense-bill" value={bill} onChange={setBill} max={1} min={1} label="Photograph bill" /></ErpField>
          {paise > 0 && <p className="text-xs text-slate-500">{paise <= 500000 ? "Auto-approved (₹5,000 or less)." : paise <= 2500000 ? "Needs PM approval." : "Needs Owner approval."}{paise >= 5000000 ? " PIN required to approve." : ""}</p>}
          <Button type="submit" className="w-full" disabled={busy || bill.length < 1} data-testid="erp-submit-expense-btn">{busy ? "Submitting…" : "Submit"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
