import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { erpApi } from "@/lib/erp-api";

export default function ErpVendorsPage() {
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);

  async function reload() { setRows(await erpApi.listVendors()); }
  useEffect(() => { reload(); }, []);

  return (
    <div data-testid="erp-vendors-page">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Vendors</h1>
          <p className="text-sm text-slate-500 mt-1">Suppliers & contractors.</p>
        </div>
        <Button onClick={() => setOpen(true)}>+ New vendor</Button>
      </div>

      {rows.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="font-semibold">No vendors yet</p>
          <p className="text-sm text-slate-500 mt-1">Add suppliers to capture material receipts.</p>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">GSTIN</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Location</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{v.name}</td>
                  <td className="px-4 py-3 font-mono text-xs">{v.gstin || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{v.phone || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {[v.city, v.state].filter(Boolean).join(", ") || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <NewVendor open={open} onOpenChange={setOpen} onCreated={reload} />
    </div>
  );
}

function NewVendor({ open, onOpenChange, onCreated }) {
  const [f, setF] = useState({ name: "", gstin: "", phone: "", email: "", city: "", state: "" });
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await erpApi.createVendor({
        name: f.name,
        gstin: f.gstin || null,
        phone: f.phone || null,
        email: f.email || null,
        city: f.city || null,
        state: f.state || null,
      });
      toast.success("Vendor created");
      setF({ name: "", gstin: "", phone: "", email: "", city: "", state: "" });
      onOpenChange(false);
      onCreated();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed");
    } finally { setBusy(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>New vendor</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div><Label>Name *</Label>
            <Input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>GSTIN</Label>
              <Input value={f.gstin} onChange={(e) => setF({ ...f, gstin: e.target.value.toUpperCase() })} /></div>
            <div><Label>Phone</Label>
              <Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
          </div>
          <div><Label>Email</Label>
            <Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>City</Label>
              <Input value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /></div>
            <div><Label>State</Label>
              <Input value={f.state} onChange={(e) => setF({ ...f, state: e.target.value })} /></div>
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
