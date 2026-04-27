import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { erpApi, formatPaise, formatDate } from "@/lib/erp-api";

const CATS = ["Transport", "Tools", "Food", "Medical", "Fuel", "Other"];
const TONE = {
  DRAFT: "bg-slate-100 text-slate-700",
  PENDING: "bg-amber-100 text-amber-900",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  VOID: "bg-slate-100 text-slate-500",
};

export default function ErpExpensesPage() {
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);

  async function reload() { setRows(await erpApi.listExpenses()); }
  useEffect(() => { reload(); }, []);

  return (
    <div data-testid="erp-expenses-page">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Expenses</h1>
          <p className="text-sm text-slate-500 mt-1">Petty cash. ≤ ₹5,000 auto-approves. Larger goes to PM.</p>
        </div>
        <Button onClick={() => setOpen(true)} data-testid="erp-new-expense-btn">+ New expense</Button>
      </div>

      {rows.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="font-semibold">No expenses yet</p>
          <p className="text-sm text-slate-500 mt-1">Record site expenses with bill photo.</p>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Purpose</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-600">{formatDate(e.occurred_on)}</td>
                  <td className="px-4 py-3 font-medium">{e.purpose}</td>
                  <td className="px-4 py-3"><Badge variant="secondary">{e.category}</Badge></td>
                  <td className="px-4 py-3 text-right font-medium">{formatPaise(e.amount_cents)}</td>
                  <td className="px-4 py-3"><Badge className={TONE[e.approval_status] || ""}>{e.approval_status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <NewDialog open={open} onOpenChange={setOpen} onCreated={reload} />
    </div>
  );
}

function NewDialog({ open, onOpenChange, onCreated }) {
  const [projects, setProjects] = useState([]);
  const [f, setF] = useState({
    project_id: "", amount: "", category: "Transport", purpose: "",
    vendor_name: "", occurred_on: new Date().toISOString().slice(0, 10),
    bill_photo_key: "",
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (open) erpApi.listProjects().then(setProjects); }, [open]);

  async function uploadBill(file) {
    try {
      const pres = await erpApi.presignUpload({
        kind: "expense-bill", content_type: file.type, size_bytes: file.size,
      });
      try { await fetch(pres.url, { method: "PUT", headers: { "Content-Type": file.type }, body: file }); } catch {}
      setF((x) => ({ ...x, bill_photo_key: pres.object_key }));
      toast.success("Photo attached");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Upload failed");
    }
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const created = await erpApi.createExpense({
        project_id: f.project_id,
        purpose: f.purpose,
        category: f.category,
        amount_cents: Math.round(Number(f.amount) * 100),
        vendor_name: f.vendor_name || null,
        bill_photo_key: f.bill_photo_key,
        occurred_on: f.occurred_on,
      });
      await erpApi.submitExpense(created.id);
      toast.success("Expense submitted");
      setF({ project_id: "", amount: "", category: "Transport", purpose: "", vendor_name: "",
        occurred_on: new Date().toISOString().slice(0, 10), bill_photo_key: "" });
      onOpenChange(false);
      onCreated();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed");
    } finally { setBusy(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>New expense</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label>Project *</Label>
            <select required value={f.project_id}
              onChange={(e) => setF({ ...f, project_id: e.target.value })}
              className="w-full border rounded-md px-3 py-2 text-sm">
              <option value="">Select project</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
            </select>
          </div>
          <div><Label>Amount (₹) *</Label>
            <Input type="number" required min={1} value={f.amount}
              onChange={(e) => setF({ ...f, amount: e.target.value })} /></div>
          <div>
            <Label>Category</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {CATS.map((c) => (
                <button key={c} type="button" onClick={() => setF({ ...f, category: c })}
                  className={`rounded-full border px-3 py-1.5 text-sm ${
                    f.category === c ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white"}`}>
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div><Label>Purpose *</Label>
            <Input required placeholder="Diesel for JCB" value={f.purpose}
              onChange={(e) => setF({ ...f, purpose: e.target.value })} /></div>
          <div><Label>Vendor (optional)</Label>
            <Input value={f.vendor_name} onChange={(e) => setF({ ...f, vendor_name: e.target.value })} /></div>
          <div><Label>Date</Label>
            <Input type="date" required value={f.occurred_on}
              onChange={(e) => setF({ ...f, occurred_on: e.target.value })} /></div>
          <div>
            <Label>Bill photo *</Label>
            <Input type="file" accept="image/*,application/pdf" required
              onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadBill(file); }} />
            {f.bill_photo_key && <p className="text-xs text-green-700 mt-1">✓ Attached</p>}
          </div>
          <Button type="submit" className="w-full" disabled={busy || !f.bill_photo_key}
            data-testid="erp-submit-expense-btn">
            {busy ? "Submitting…" : "Submit"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
