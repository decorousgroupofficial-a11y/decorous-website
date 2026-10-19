import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { CheckCircle2, Clock, ChevronDown, ChevronUp, ShieldAlert, Lock } from "lucide-react";
import { erpApi, formatPaise, formatDate } from "@/lib/erp-api";
import { ErpPageHeader, ErpEmptyState, ErpStatusPill, ErpPhoto, ErpLoading, apiError, useErpData } from "./_shared";

const KIND_LABEL = {
  EXPENSE: "Expense", MATERIAL_RECEIPT: "Material receipt", VENDOR_BILL: "Vendor bill",
  PAYMENT: "Vendor payment", DPR: "Daily report", ATTENDANCE: "Attendance", WORKER_PAYMENT: "Worker payment",
};
const PIN_THRESHOLD = 5_000_000;

function sla(a) {
  if (!a.sla_due_at) return null;
  const ms = new Date(a.sla_due_at).getTime() - Date.now();
  const h = Math.round(Math.abs(ms) / 36e5);
  const span = h >= 48 ? `${Math.round(h / 24)}d` : `${h}h`;
  return ms >= 0 ? { text: `Decide within ${span}`, late: false } : { text: `Overdue by ${span}`, late: true };
}

export default function ErpApprovalsPage() {
  const [scope, setScope] = useState("mine");
  const { data: rows, loading, reload } = useErpData(() => erpApi.listPendingApprovals(scope === "mine" ? { mine: true } : undefined), [scope]);
  const [active, setActive] = useState(null);
  const [mode, setMode] = useState("approve");

  return (
    <div data-testid="erp-approvals-page">
      <ErpPageHeader eyebrow="Control" title="Approvals"
        description="Maker-checker: nobody approves their own request. Anything ₹50,000 or more needs your 4-digit PIN." />

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending" data-testid="erp-approvals-tab-pending">Pending</TabsTrigger>
          <TabsTrigger value="history" data-testid="erp-approvals-tab-history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          <div className="mb-4 inline-flex gap-1 rounded-lg bg-slate-100 p-1" data-testid="erp-approvals-scope">
            {[["mine", "For me"], ["all", "Everyone's"]].map(([v, l]) => (
              <button key={v} onClick={() => setScope(v)} className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${scope === v ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>{l}</button>
            ))}
          </div>

          {loading && !rows ? <ErpLoading /> : (rows || []).length === 0 ? (
            <ErpEmptyState icon={CheckCircle2} title={scope === "mine" ? "Nothing waiting on you" : "No pending approvals"} desc="All caught up. Nicely done." />
          ) : (
            <div className="space-y-3">
              {rows.map((a) => <ApprovalCard key={a.id} a={a} onApprove={() => { setActive(a); setMode("approve"); }} onReject={() => { setActive(a); setMode("reject"); }} />)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4"><History /></TabsContent>
      </Tabs>

      {active && <DecideDialog approval={active} mode={mode} onClose={() => setActive(null)} onDone={() => { setActive(null); reload(); }} />}
    </div>
  );
}

function ApprovalCard({ a, onApprove, onReject }) {
  const t = a.target || {};
  const [open, setOpen] = useState(false);
  const s = sla(a);
  const photos = t.photo_keys?.length ? t.photo_keys : t.bill_photo_key ? [t.bill_photo_key] : [];
  const needsPin = (a.amount_cents || 0) >= PIN_THRESHOLD;

  return (
    <Card className="p-4" data-testid={`erp-approval-card-${a.id}`}>
      <div className="flex flex-col gap-4 sm:flex-row">
        {photos.length > 0 && (
          <div className="flex gap-2 sm:w-40 sm:flex-col">
            {photos.slice(0, 3).map((k) => <ErpPhoto key={k} objectKey={k} zoomable className="h-20 w-20 rounded-lg sm:h-24 sm:w-40" />)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge variant="secondary">{KIND_LABEL[a.target_type] || a.target_type}</Badge>
            {t.project_code && <span className="font-mono text-slate-500">{t.project_code}</span>}
            {a.escalated_at && <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 font-semibold text-rose-700"><ShieldAlert size={11} /> Escalated to {a.escalated_to_role}</span>}
            {needsPin && <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-2 py-0.5 font-semibold text-white"><Lock size={10} /> PIN</span>}
          </div>
          <div className="mt-1.5 text-base font-semibold leading-snug text-slate-900" data-testid="erp-approval-title">{t.title || "Untitled request"}</div>
          <div className="mt-0.5 text-xs text-slate-500">
            {t.project_name && <>{t.project_name} · </>}raised by <strong className="text-slate-700">{a.requested_by_name || "unknown"}</strong> · {formatDate(a.created_at)}
          </div>
          <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-600">
            {t.vendor_name && <div><dt className="inline text-slate-400">Vendor </dt><dd className="inline font-medium">{t.vendor_name}</dd></div>}
            {t.category && <div><dt className="inline text-slate-400">Type </dt><dd className="inline font-medium">{t.category}</dd></div>}
            {t.occurred_on && <div><dt className="inline text-slate-400">Dated </dt><dd className="inline font-medium">{formatDate(t.occurred_on)}</dd></div>}
            {t.report_date && <div><dt className="inline text-slate-400">For </dt><dd className="inline font-medium">{formatDate(t.report_date)}</dd></div>}
            {t.labour_total != null && <div><dt className="inline text-slate-400">Workers </dt><dd className="inline font-medium">{t.labour_total}</dd></div>}
            {t.challan_no && <div><dt className="inline text-slate-400">Challan </dt><dd className="inline font-medium">{t.challan_no}</dd></div>}
          </dl>
          {t.blockers && <p className="mt-2 rounded-md bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800"><strong>Blockers:</strong> {t.blockers}</p>}
          {t.note && <p className="mt-2 text-xs italic text-slate-500">“{t.note}”</p>}
          <button onClick={() => setOpen((o) => !o)} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800">
            {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />} History
          </button>
          {open && <Timeline id={a.id} />}
        </div>

        <div className="flex flex-row items-center justify-between gap-3 sm:w-44 sm:flex-col sm:items-end sm:justify-start">
          <div className="text-right">
            <div className="text-xl font-bold tabular-nums">{a.amount_cents != null ? formatPaise(a.amount_cents) : "—"}</div>
            {s && <div className={`mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold ${s.late ? "text-rose-600" : "text-slate-500"}`}><Clock size={11} /> {s.text}</div>}
            <div className="text-[11px] text-slate-400">needs {a.required_role === "OWNER" ? "Owner" : a.required_role}</div>
          </div>
          <div className="flex gap-2 sm:w-full sm:flex-col">
            <Button onClick={onApprove} disabled={!a.can_decide} className="sm:w-full" data-testid="erp-approve-btn">Approve</Button>
            <Button variant="outline" onClick={onReject} disabled={!a.can_decide} className="sm:w-full" data-testid="erp-reject-btn">Reject</Button>
          </div>
        </div>
      </div>
      {!a.can_decide && a.blocked_reason && (
        <div className="mt-3 rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600" data-testid="erp-blocked-reason">{a.blocked_reason}</div>
      )}
    </Card>
  );
}

function Timeline({ id }) {
  const { data, loading } = useErpData(() => erpApi.getApproval(id), [id]);
  if (loading) return <p className="mt-2 text-xs text-slate-400">Loading…</p>;
  return (
    <ol className="mt-2 space-y-1.5 border-l-2 border-slate-100 pl-3 text-xs">
      {(data?.events || []).map((e, i) => (
        <li key={i}>
          <span className="font-semibold text-slate-700">{e.action.replace(/_/g, " ").toLowerCase()}</span>{" "}
          <span className="text-slate-500">by {e.actor_name || e.actor_role} · {formatDate(e.created_at)}</span>
          {e.pin_verified && <span className="ml-1 text-emerald-600">· PIN verified</span>}
          {e.comment && <div className="text-slate-500">“{e.comment}”</div>}
        </li>
      ))}
    </ol>
  );
}

function History() {
  const { data, loading } = useErpData(() => erpApi.approvalHistory({ limit: 50 }), []);
  if (loading && !data) return <ErpLoading />;
  if (!(data || []).length) return <ErpEmptyState title="No decisions yet" desc="Approved and rejected requests will be listed here." />;
  return (
    <Card className="divide-y divide-slate-100 p-0" data-testid="erp-approval-history">
      {data.map((a) => (
        <div key={a.id} className="flex items-start justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs"><Badge variant="secondary">{KIND_LABEL[a.target_type] || a.target_type}</Badge><span className="font-mono text-slate-500">{a.target?.project_code}</span></div>
            <div className="mt-1 truncate text-sm font-medium">{a.target?.title}</div>
            <div className="text-xs text-slate-500">raised by {a.requested_by_name} · {a.status === "APPROVED" ? "approved" : "rejected"} by {a.approver_name || "—"} · {formatDate(a.decided_at)}</div>
            {a.rejection_reason && <div className="mt-1 text-xs text-rose-700">Reason: {a.rejection_reason}</div>}
            {a.comment && a.status === "APPROVED" && <div className="mt-1 text-xs text-slate-500">“{a.comment}”</div>}
          </div>
          <div className="text-right"><div className="font-semibold tabular-nums">{a.amount_cents != null ? formatPaise(a.amount_cents) : ""}</div><div className="mt-1"><ErpStatusPill status={a.status} /></div></div>
        </div>
      ))}
    </Card>
  );
}

function DecideDialog({ approval, mode, onClose, onDone }) {
  const [pin, setPin] = useState("");
  const [comment, setComment] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const pinRequired = mode === "approve" && (approval.amount_cents || 0) >= PIN_THRESHOLD;

  async function submit() {
    setBusy(true);
    try {
      await erpApi.decideApproval(approval.id, {
        action: mode === "approve" ? "APPROVE" : "REJECT",
        pin: pinRequired ? pin : null, comment: comment || null, rejection_reason: mode === "reject" ? reason : null,
      });
      toast.success(mode === "approve" ? "Approved" : "Rejected");
      onDone();
    } catch (err) { toast.error(apiError(err, "Failed")); } finally { setBusy(false); }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{mode === "approve" ? "Approve" : "Reject"} {KIND_LABEL[approval.target_type]}</DialogTitle></DialogHeader>
        <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
          <div className="font-medium">{approval.target?.title}</div>
          <div className="text-xs text-slate-500">{approval.target?.project_code} · {approval.amount_cents != null ? formatPaise(approval.amount_cents) : "no amount"}</div>
        </div>
        {mode === "reject" ? (
          <div><Label>Reason for rejecting *</Label>
            <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Tell them what to fix — they'll see this." data-testid="erp-reject-reason" /></div>
        ) : (
          <div><Label>Comment (optional)</Label><Input value={comment} onChange={(e) => setComment(e.target.value)} /></div>
        )}
        {pinRequired && (
          <div>
            <Label>Your 4-digit PIN *</Label>
            <Input type="password" inputMode="numeric" pattern="[0-9]*" minLength={4} maxLength={4} autoComplete="off" value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} className="text-lg tracking-widest" data-testid="erp-approval-pin-input" />
            <p className="mt-1 text-xs text-slate-500">Required for amounts ₹50,000 and above. No PIN yet? Set one in Settings.</p>
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={submit} variant={mode === "reject" ? "destructive" : "default"}
            disabled={busy || (mode === "reject" && !reason.trim()) || (pinRequired && pin.length < 4)} data-testid="erp-decide-submit-btn">
            {busy ? "…" : mode === "approve" ? "Confirm approve" : "Confirm reject"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
