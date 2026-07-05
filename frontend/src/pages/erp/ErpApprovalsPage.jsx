import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { erpApi, formatPaise, formatDate } from "@/lib/erp-api";

const KIND_LABEL = {
  EXPENSE: "Expense", MATERIAL_RECEIPT: "Material receipt",
  VENDOR_BILL: "Vendor bill", PAYMENT: "Payment", DPR: "Daily report",
};
const PIN_THRESHOLD = 5_000_000;

export default function ErpApprovalsPage() {
  const [rows, setRows] = useState([]);
  const [active, setActive] = useState(null);
  const [mode, setMode] = useState("approve");

  async function reload() { setRows(await erpApi.listPendingApprovals()); }
  useEffect(() => { reload(); }, []);

  return (
    <div data-testid="erp-approvals-page">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">Pending approvals</h1>
        <p className="text-sm text-slate-500 mt-1">Maker-checker. Items ≥ ₹50,000 require PIN.</p>
      </div>

      {rows.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="font-semibold">Nothing pending</p>
          <p className="text-sm text-slate-500 mt-1">All approvals up to date. Nicely done.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((a) => (
            <Card key={a.id} className="p-4 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Badge variant="secondary">{KIND_LABEL[a.target_type] || a.target_type}</Badge>
                  <span>requested {formatDate(a.created_at)}</span>
                </div>
                <div className="mt-1 text-lg font-semibold">
                  {a.amount_cents != null ? formatPaise(a.amount_cents) : "No amount"}
                </div>
                <div className="mt-1 text-xs text-slate-500">Requires: {a.required_role}</div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setActive(a); setMode("reject"); }}>
                  Reject
                </Button>
                <Button onClick={() => { setActive(a); setMode("approve"); }}>
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
          mode={mode}
          onClose={() => setActive(null)}
          onDone={() => { setActive(null); reload(); }}
        />
      )}
    </div>
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
        pin: pinRequired ? pin : null,
        comment: comment || null,
        rejection_reason: mode === "reject" ? reason : null,
      });
      toast.success(mode === "approve" ? "Approved" : "Rejected");
      onDone();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed");
    } finally { setBusy(false); }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "approve" ? "Approve" : "Reject"} {KIND_LABEL[approval.target_type]}
          </DialogTitle>
        </DialogHeader>
        {approval.amount_cents != null && (
          <p className="text-sm text-slate-600">
            Amount: <span className="font-semibold">{formatPaise(approval.amount_cents)}</span>
          </p>
        )}
        {mode === "reject" && (
          <div><Label>Rejection reason *</Label>
            <Textarea required rows={3} value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this being rejected?" /></div>
        )}
        {mode === "approve" && (
          <div><Label>Comment (optional)</Label>
            <Input value={comment} onChange={(e) => setComment(e.target.value)} /></div>
        )}
        {pinRequired && (
          <div>
            <Label>4-digit PIN *</Label>
            <Input type="password" required minLength={4} maxLength={4}
              inputMode="numeric" pattern="[0-9]*" value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              className="text-lg tracking-widest" data-testid="erp-approval-pin-input" />
            <p className="text-xs text-slate-500 mt-1">Required for amounts ≥ ₹50,000</p>
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button
            onClick={submit}
            variant={mode === "reject" ? "destructive" : "default"}
            disabled={busy || (mode === "reject" && !reason) || (pinRequired && pin.length < 4)}
            data-testid="erp-decide-submit-btn"
          >
            {busy ? "…" : mode === "approve" ? "Confirm approve" : "Confirm reject"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
