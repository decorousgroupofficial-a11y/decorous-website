import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { erpApi, formatPaise } from "@/lib/erp-api";

const TONE = {
  PLANNED: "bg-blue-100 text-blue-800",
  ACTIVE: "bg-green-100 text-green-800",
  ON_HOLD: "bg-amber-100 text-amber-900",
  COMPLETED: "bg-slate-200 text-slate-800",
  ARCHIVED: "bg-slate-100 text-slate-600",
};

export default function ErpProjectsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  async function reload() {
    setLoading(true);
    try { setRows(await erpApi.listProjects()); }
    finally { setLoading(false); }
  }
  useEffect(() => { reload(); }, []);

  return (
    <div data-testid="erp-projects-page">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Projects</h1>
          <p className="text-sm text-slate-500 mt-1">Sites under execution.</p>
        </div>
        <Button onClick={() => setOpen(true)} data-testid="erp-new-project-btn">+ New project</Button>
      </div>

      {loading && <p className="text-sm text-slate-500">Loading…</p>}
      {!loading && rows.length === 0 && (
        <Card className="p-10 text-center">
          <p className="font-semibold">No projects yet</p>
          <p className="text-sm text-slate-500 mt-1">Create your first project to track DPR & spend.</p>
          <Button className="mt-4" onClick={() => setOpen(true)}>+ New project</Button>
        </Card>
      )}
      {rows.length > 0 && (
        <Card className="overflow-hidden p-0">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Budget</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs">{p.code}</td>
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-slate-600">{p.client_name || "—"}</td>
                  <td className="px-4 py-3">
                    <Badge className={TONE[p.status] || ""}>{p.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-medium">{formatPaise(p.budget_cents)}</td>
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
  const [f, setF] = useState({ code: "", name: "", client_name: "", location: "", budget: "" });
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await erpApi.createProject({
        code: f.code.toUpperCase(),
        name: f.name,
        client_name: f.client_name || null,
        location: f.location || null,
        budget_cents: f.budget ? Math.round(Number(f.budget) * 100) : null,
      });
      toast.success("Project created");
      setF({ code: "", name: "", client_name: "", location: "", budget: "" });
      onOpenChange(false);
      onCreated();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed");
    } finally { setBusy(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>New project</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3" data-testid="erp-new-project-form">
          <div><Label>Code *</Label>
            <Input required placeholder="VILLA-A2" value={f.code}
              onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase() })} /></div>
          <div><Label>Name *</Label>
            <Input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
          <div><Label>Client</Label>
            <Input value={f.client_name} onChange={(e) => setF({ ...f, client_name: e.target.value })} /></div>
          <div><Label>Location</Label>
            <Input value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} /></div>
          <div><Label>Budget (₹)</Label>
            <Input type="number" min={0} value={f.budget}
              onChange={(e) => setF({ ...f, budget: e.target.value })} /></div>
          <Button type="submit" className="w-full" disabled={busy} data-testid="erp-submit-project-btn">
            {busy ? "Creating…" : "Create"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
