import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { erpApi } from "@/lib/erp-api";

const CATEGORIES = ["CEMENT","STEEL","AGGREGATE","SAND","BRICK","ELECTRICAL","PLUMBING","PAINT","WOOD","TILES","HARDWARE","CONSUMABLE","OTHER"];
const UOMS = ["bag","kg","tonne","nos","cft","cum","sqft","sqm","ltr","m"];

export default function ErpMaterialsPage() {
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);

  async function reload() { setRows(await erpApi.listMaterials()); }
  useEffect(() => { reload(); }, []);

  return (
    <div data-testid="erp-materials-page">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Materials</h1>
          <p className="text-sm text-slate-500 mt-1">Catalogue — used by GRN & consumption.</p>
        </div>
        <Button onClick={() => setOpen(true)}>+ New material</Button>
      </div>

      {rows.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="font-semibold">No materials yet</p>
          <p className="text-sm text-slate-500 mt-1">Define cement, steel, aggregate, etc.</p>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">UoM</th>
                <th className="px-4 py-3">HSN</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs">{m.sku}</td>
                  <td className="px-4 py-3 font-medium">{m.name}</td>
                  <td className="px-4 py-3"><Badge variant="secondary">{m.category}</Badge></td>
                  <td className="px-4 py-3 text-slate-600">{m.uom}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{m.hsn_code || "—"}</td>
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
  const [f, setF] = useState({ sku: "", name: "", category: "CEMENT", uom: "bag", hsn_code: "" });
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await erpApi.createMaterial({
        sku: f.sku.toUpperCase(),
        name: f.name,
        category: f.category,
        uom: f.uom,
        hsn_code: f.hsn_code || null,
      });
      toast.success("Material created");
      setF({ sku: "", name: "", category: "CEMENT", uom: "bag", hsn_code: "" });
      onOpenChange(false);
      onCreated();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed");
    } finally { setBusy(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>New material</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>SKU *</Label>
              <Input required placeholder="CEM-OPC-43" value={f.sku}
                onChange={(e) => setF({ ...f, sku: e.target.value.toUpperCase() })} /></div>
            <div><Label>HSN code</Label>
              <Input value={f.hsn_code} onChange={(e) => setF({ ...f, hsn_code: e.target.value })} /></div>
          </div>
          <div><Label>Name *</Label>
            <Input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Category</Label>
              <select className="w-full border rounded-md px-3 py-2 text-sm" value={f.category}
                onChange={(e) => setF({ ...f, category: e.target.value })}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select></div>
            <div><Label>Unit of measure</Label>
              <select className="w-full border rounded-md px-3 py-2 text-sm" value={f.uom}
                onChange={(e) => setF({ ...f, uom: e.target.value })}>
                {UOMS.map((u) => <option key={u}>{u}</option>)}
              </select></div>
          </div>
          <Button type="submit" className="w-full" disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
