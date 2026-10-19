import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Package, ArrowDownToLine, ArrowUpFromLine, Trash2, Pencil } from "lucide-react";
import { erpApi, formatPaise, formatDate, formatQty, toPaise, toMilli, todayIST, newKey } from "@/lib/erp-api";
import {
  ErpPageHeader, ErpEmptyState, ErpMiniStat, ErpField, ErpSelect, ErpLoading, ErpPhotoPicker,
  ErpStatusPill, ErpPhoto, apiError, useErpData, useErpRole,
} from "./_shared";

const CATEGORIES = ["CEMENT", "STEEL", "AGGREGATE", "SAND", "BRICK", "ELECTRICAL", "PLUMBING", "PAINT", "WOOD", "TILES", "HARDWARE", "CONSUMABLE", "OTHER"];
const UOMS = ["bag", "kg", "tonne", "nos", "cft", "cum", "sqft", "sqm", "ltr", "m"];

export default function ErpMaterialsPage() {
  const { can } = useErpRole();
  const { data: projects } = useErpData(() => erpApi.listProjects(), []);
  const { data: materials, reload: reloadMaterials } = useErpData(() => erpApi.listMaterials(), []);
  const [project, setProject] = useState("");           // "" = all sites
  const [version, setVersion] = useState(0);            // bump to refresh every tab after a write
  const bump = () => setVersion((v) => v + 1);

  const [grnOpen, setGrnOpen] = useState(false);
  const [issue, setIssue] = useState(null);             // null | { material_id?, project_id?, kind }
  const [matEdit, setMatEdit] = useState(null);

  const open = (projects || []).filter((p) => p.status !== "ARCHIVED");

  return (
    <div data-testid="erp-materials-page">
      <ErpPageHeader eyebrow="Site" title="Stock & Materials"
        description="What's in each site store, what arrived, and what was used. Stock counts approved receipts only."
        action={<>
          {can("PM", "STOREKEEPER", "ENGINEER") && <Button variant="outline" className="gap-1.5" onClick={() => setIssue({ kind: "ISSUE" })} data-testid="erp-issue-btn"><ArrowUpFromLine size={15} /> Issue / return</Button>}
          {can("PM", "STOREKEEPER", "ENGINEER") && <Button className="gap-1.5" onClick={() => setGrnOpen(true)} data-testid="erp-new-grn-btn"><ArrowDownToLine size={15} /> Receive material</Button>}
        </>} />

      <Tabs defaultValue="stock">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="stock" data-testid="erp-materials-tab-stock">Stock</TabsTrigger>
            <TabsTrigger value="receipts" data-testid="erp-materials-tab-receipts">Receipts</TabsTrigger>
            <TabsTrigger value="issues" data-testid="erp-materials-tab-issues">Issues</TabsTrigger>
            <TabsTrigger value="catalogue" data-testid="erp-materials-tab-catalogue">Catalogue</TabsTrigger>
          </TabsList>
          <div className="w-full sm:w-72">
            <ErpSelect value={project} onChange={setProject} data-testid="erp-materials-project">
              <option value="">All sites</option>
              {(projects || []).map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
            </ErpSelect>
          </div>
        </div>

        <TabsContent value="stock"><StockTab project={project} version={version} onIssue={(row) => setIssue({ kind: "ISSUE", material_id: row.material_id, project_id: row.project_id })} canIssue={can("PM", "STOREKEEPER", "ENGINEER")} /></TabsContent>
        <TabsContent value="receipts"><ReceiptsTab project={project} version={version} /></TabsContent>
        <TabsContent value="issues"><IssuesTab project={project} version={version} /></TabsContent>
        <TabsContent value="catalogue">
          <CatalogueTab rows={materials} onNew={() => setMatEdit({})} onEdit={setMatEdit} canManage={can("PM", "ACCOUNTANT", "STOREKEEPER")} />
        </TabsContent>
      </Tabs>

      {grnOpen && <GrnDialog projects={open} materials={materials || []} defaultProject={project} onClose={() => setGrnOpen(false)} onSaved={() => { setGrnOpen(false); bump(); }} />}
      {issue && <IssueDialog projects={open} materials={materials || []} preset={issue} onClose={() => setIssue(null)} onSaved={() => { setIssue(null); bump(); }} />}
      {matEdit && <MaterialDialog material={matEdit} onClose={() => setMatEdit(null)} onSaved={() => { setMatEdit(null); reloadMaterials(); bump(); }} />}
    </div>
  );
}

/* ───────────────────────────── Stock ───────────────────────────── */

function StockTab({ project, version, onIssue, canIssue }) {
  const { data, loading } = useErpData(() => erpApi.stock(project ? { project_id: project } : undefined), [project, version]);
  const stats = useMemo(() => {
    const r = data || [];
    return { items: r.length, value: r.reduce((n, x) => n + x.value_cents, 0), low: r.filter((x) => x.low_stock).length, incoming: r.filter((x) => x.incoming_milli > 0).length };
  }, [data]);
  if (loading && !data) return <ErpLoading />;
  return (
    <>
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <ErpMiniStat label="Items in stock" value={stats.items} />
        <ErpMiniStat label="Stock value" value={formatPaise(stats.value)} accent="orange" />
        <ErpMiniStat label="Low stock" value={stats.low} />
        <ErpMiniStat label="Awaiting receipt approval" value={stats.incoming} />
      </div>
      {(data || []).length === 0 ? (
        <ErpEmptyState icon={Package} title="No stock yet" desc="Record a goods receipt — once a PM approves it, it shows up here." />
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-left text-[11px] uppercase tracking-wider text-slate-500">
                <tr><th className="px-4 py-3">Material</th><th className="px-4 py-3">Site</th>
                  <th className="px-4 py-3 text-right">Received</th><th className="px-4 py-3 text-right">Used</th>
                  <th className="px-4 py-3 text-right">Incoming</th><th className="px-4 py-3 text-right">On hand</th>
                  <th className="px-4 py-3 text-right">Value</th><th className="px-4 py-3" /></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((s) => (
                  <tr key={`${s.project_id}-${s.material_id}`} className="hover:bg-orange-50/30" data-testid={`erp-stock-row-${s.material_name}`}>
                    <td className="px-4 py-3"><div className="font-semibold">{s.material_name}</div><div className="font-mono text-[11px] text-slate-400">{s.sku}</div></td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{s.project_code}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatQty(s.received_milli)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatQty(s.issued_milli - s.returned_milli)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-500">{s.incoming_milli ? formatQty(s.incoming_milli) : "—"}</td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums">{formatQty(s.balance_milli)} <span className="font-normal text-slate-400">{s.uom}</span> {s.low_stock && <ErpStatusPill status="LOW" />}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatPaise(s.value_cents)}</td>
                    <td className="px-4 py-3 text-right">{canIssue && s.balance_milli > 0 && <Button size="sm" variant="ghost" onClick={() => onIssue(s)}>Issue</Button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      <p className="mt-3 text-[11px] text-slate-400">Value uses the weighted-average rate of approved receipts. Operational view, not an accounting ledger.</p>
    </>
  );
}

/* ──────────────────────────── Receipts ─────────────────────────── */

function ReceiptsTab({ project, version }) {
  const { data, loading } = useErpData(() => erpApi.listGrns(project ? { project_id: project } : undefined), [project, version]);
  if (loading && !data) return <ErpLoading />;
  if (!(data || []).length) return <ErpEmptyState icon={ArrowDownToLine} title="No receipts yet" desc="Every delivery is recorded here with its challan photo and sent to a PM for approval." />;
  return (
    <div className="space-y-2" data-testid="erp-receipts-list">
      {data.map((g) => (
        <Card key={g.id} className="flex items-start gap-3 p-3">
          <ErpPhoto objectKey={g.photo_keys?.[0]} zoomable className="h-16 w-16 flex-shrink-0 rounded-md" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">{g.vendor_name}</span>
              {g.challan_no && <span className="font-mono text-[11px] text-slate-500">#{g.challan_no}</span>}
              <span className="font-mono text-[11px] text-slate-400">{g.project_code}</span>
            </div>
            <div className="mt-0.5 text-xs text-slate-500">
              {g.lines.map((l) => `${l.material_name} ${formatQty(l.qty_milli)} ${l.uom}`).join(" · ")}
            </div>
            <div className="mt-0.5 text-[11px] text-slate-400">{formatDate(g.received_on)}{g.billed_by_bill_id ? " · billed" : ""}</div>
          </div>
          <div className="text-right">
            <div className="font-bold tabular-nums">{formatPaise(g.total_cents)}</div>
            <div className="mt-1"><ErpStatusPill status={g.approval_status} /></div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function GrnDialog({ projects, materials, defaultProject, onClose, onSaved }) {
  const { data: vendors } = useErpData(() => erpApi.listVendors(), []);
  const key = useRef(newKey());
  const [f, setF] = useState({ project_id: defaultProject || projects[0]?.id || "", vendor_id: "", vendor_name: "", challan_no: "", received_on: todayIST(), note: "" });
  const [lines, setLines] = useState([{ material_id: "", qty: "", rate: "" }]);
  const [photos, setPhotos] = useState([]);
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const setLine = (i, k, v) => setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, [k]: v } : l)));

  const total = lines.reduce((n, l) => {
    const q = toMilli(l.qty), r = toPaise(l.rate);
    return q && r != null ? n + Math.floor((r * q + 500) / 1000) : n;
  }, 0);

  async function submit(e) {
    e.preventDefault();
    const out = [];
    for (const [i, l] of lines.entries()) {
      const q = toMilli(l.qty), r = toPaise(l.rate);
      if (!l.material_id || !q) return toast.error(`Line ${i + 1}: choose a material and a quantity`);
      if (r == null) return toast.error(`Line ${i + 1}: enter the rate in rupees`);
      out.push({ material_id: l.material_id, qty: (q / 1000).toFixed(3), rate_cents: r });
    }
    if (photos.length < 1) return toast.error("Attach a photo of the delivery challan");
    if (!f.vendor_id && !f.vendor_name.trim()) return toast.error("Choose a vendor or type the supplier's name");
    setBusy(true);
    try {
      await erpApi.createGrn({
        project_id: f.project_id, vendor_id: f.vendor_id || null, vendor_name: f.vendor_id ? null : f.vendor_name.trim(),
        challan_no: f.challan_no.trim() || null, received_on: f.received_on, lines: out,
        photo_keys: photos.map((p) => p.key), note: f.note.trim() || null,
      }, key.current);
      toast.success("Receipt sent for approval");
      onSaved();
    } catch (err) { toast.error(apiError(err)); } finally { setBusy(false); }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-xl overflow-y-auto">
        <DialogHeader><DialogTitle>Receive material</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4" data-testid="erp-grn-form">
          <div className="grid gap-3 sm:grid-cols-2">
            <ErpField label="Site *"><ErpSelect value={f.project_id} onChange={(v) => set("project_id", v)} data-testid="erp-grn-project">{projects.map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}</ErpSelect></ErpField>
            <ErpField label="Received on"><Input type="date" required max={todayIST()} value={f.received_on} onChange={(e) => set("received_on", e.target.value)} /></ErpField>
            <ErpField label="Vendor"><ErpSelect value={f.vendor_id} onChange={(v) => set("vendor_id", v)} data-testid="erp-grn-vendor">
              <option value="">— one-off supplier —</option>{(vendors || []).map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</ErpSelect></ErpField>
            {!f.vendor_id
              ? <ErpField label="Supplier name *"><Input value={f.vendor_name} onChange={(e) => set("vendor_name", e.target.value)} data-testid="erp-grn-vendor-name" /></ErpField>
              : <div />}
            <ErpField label="Challan / delivery no." className="sm:col-span-2" hint="The same challan from the same vendor can't be recorded twice."><Input value={f.challan_no} onChange={(e) => set("challan_no", e.target.value)} data-testid="erp-grn-challan" /></ErpField>
          </div>

          <div>
            <div className="mb-1.5 text-xs font-medium text-slate-700">Items received *</div>
            <div className="space-y-2">
              {lines.map((l, i) => {
                const mat = materials.find((m) => m.id === l.material_id);
                return (
                  <div key={i} className="grid grid-cols-[1fr_88px_96px_32px] items-start gap-2" data-testid={`erp-grn-line-${i}`}>
                    <ErpSelect value={l.material_id} onChange={(v) => setLine(i, "material_id", v)} data-testid={`erp-grn-material-${i}`}>
                      <option value="">Material…</option>{materials.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.uom})</option>)}</ErpSelect>
                    <Input inputMode="decimal" placeholder={`Qty${mat ? ` (${mat.uom})` : ""}`} value={l.qty} onChange={(e) => setLine(i, "qty", e.target.value)} data-testid={`erp-grn-qty-${i}`} />
                    <Input inputMode="decimal" placeholder="Rate ₹" value={l.rate} onChange={(e) => setLine(i, "rate", e.target.value)} data-testid={`erp-grn-rate-${i}`} />
                    <button type="button" disabled={lines.length === 1} onClick={() => setLines((ls) => ls.filter((_, idx) => idx !== i))} className="mt-2 text-slate-400 hover:text-rose-600 disabled:opacity-30" aria-label="Remove line"><Trash2 size={16} /></button>
                  </div>
                );
              })}
            </div>
            <Button type="button" variant="ghost" size="sm" className="mt-1 gap-1" onClick={() => setLines((ls) => [...ls, { material_id: "", qty: "", rate: "" }])}><Plus size={14} /> Add item</Button>
            <div className="mt-2 flex justify-between rounded-lg bg-slate-900 px-4 py-2.5 text-white"><span className="text-sm text-slate-300">Receipt value</span><span className="font-bold tabular-nums" data-testid="erp-grn-total">{formatPaise(total)}</span></div>
          </div>

          <ErpField label="Challan / material photos *"><ErpPhotoPicker kind="grn" value={photos} onChange={setPhotos} max={4} min={1} /></ErpField>
          <ErpField label="Note"><Input value={f.note} onChange={(e) => set("note", e.target.value)} /></ErpField>
          <Button type="submit" className="w-full" disabled={busy} data-testid="erp-grn-submit">{busy ? "Submitting…" : "Submit for approval"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ───────────────────────────── Issues ──────────────────────────── */

function IssuesTab({ project, version }) {
  const { data, loading } = useErpData(() => erpApi.listIssues(project ? { project_id: project } : undefined), [project, version]);
  if (loading && !data) return <ErpLoading />;
  if (!(data || []).length) return <ErpEmptyState icon={ArrowUpFromLine} title="Nothing issued yet" desc="Issue material from the store to the work front; it reduces stock straight away." />;
  return (
    <Card className="divide-y divide-slate-100 p-0" data-testid="erp-issues-list">
      {data.map((i) => (
        <div key={i.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
          <div className="min-w-0"><div className="font-medium">{i.material_name}</div><div className="text-xs text-slate-500">{formatDate(i.issued_on)}{i.purpose ? ` · ${i.purpose}` : ""}</div></div>
          <div className={`font-bold tabular-nums ${i.kind === "RETURN" ? "text-emerald-600" : ""}`}>{i.kind === "RETURN" ? "+" : "−"}{formatQty(i.qty_milli)} {i.uom}</div>
        </div>
      ))}
    </Card>
  );
}

function IssueDialog({ projects, materials, preset, onClose, onSaved }) {
  const key = useRef(newKey());
  const [f, setF] = useState({ kind: preset.kind || "ISSUE", project_id: preset.project_id || projects[0]?.id || "", material_id: preset.material_id || "", qty: "", issued_on: todayIST(), purpose: "" });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const { data: stock } = useErpData(() => (f.project_id ? erpApi.stock({ project_id: f.project_id }) : Promise.resolve([])), [f.project_id]);
  const onHand = (stock || []).find((s) => s.material_id === f.material_id);
  const mat = materials.find((m) => m.id === f.material_id);

  async function submit(e) {
    e.preventDefault();
    const q = toMilli(f.qty);
    if (!q) return toast.error("Enter a quantity greater than zero (up to 3 decimals)");
    setBusy(true);
    try {
      await erpApi.createIssue({ project_id: f.project_id, material_id: f.material_id, qty: (q / 1000).toFixed(3), kind: f.kind, issued_on: f.issued_on, purpose: f.purpose.trim() || null }, key.current);
      toast.success(f.kind === "ISSUE" ? "Material issued" : "Return recorded");
      onSaved();
    } catch (err) { toast.error(apiError(err)); } finally { setBusy(false); }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{f.kind === "ISSUE" ? "Issue material to site" : "Return material to store"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3.5" data-testid="erp-issue-form">
          <div className="grid grid-cols-2 gap-2">
            {[["ISSUE", "Issue"], ["RETURN", "Return"]].map(([v, l]) => (
              <button key={v} type="button" onClick={() => set("kind", v)} className={`rounded-lg border py-2 text-sm font-semibold ${f.kind === v ? "border-orange-500 bg-orange-50 text-orange-700" : "border-slate-200 bg-white text-slate-600"}`}>{l}</button>
            ))}
          </div>
          <ErpField label="Site"><ErpSelect value={f.project_id} onChange={(v) => set("project_id", v)} data-testid="erp-issue-project">{projects.map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}</ErpSelect></ErpField>
          <ErpField label="Material" hint={onHand ? `${formatQty(onHand.balance_milli)} ${onHand.uom} on hand at this site` : f.material_id ? "None in stock at this site" : undefined}>
            <ErpSelect value={f.material_id} onChange={(v) => set("material_id", v)} data-testid="erp-issue-material"><option value="">Choose…</option>{materials.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.uom})</option>)}</ErpSelect>
          </ErpField>
          <div className="grid grid-cols-2 gap-3">
            <ErpField label={`Quantity${mat ? ` (${mat.uom})` : ""} *`}><Input required inputMode="decimal" value={f.qty} onChange={(e) => set("qty", e.target.value)} data-testid="erp-issue-qty" /></ErpField>
            <ErpField label="Date"><Input type="date" required max={todayIST()} value={f.issued_on} onChange={(e) => set("issued_on", e.target.value)} /></ErpField>
          </div>
          <ErpField label="Used for"><Input placeholder="e.g. 2nd floor slab" value={f.purpose} onChange={(e) => set("purpose", e.target.value)} /></ErpField>
          <Button type="submit" className="w-full" disabled={busy || !f.material_id} data-testid="erp-issue-submit">{busy ? "Saving…" : f.kind === "ISSUE" ? "Issue" : "Record return"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ─────────────────────────── Catalogue ─────────────────────────── */

function CatalogueTab({ rows, onNew, onEdit, canManage }) {
  if (!rows) return <ErpLoading />;
  return (
    <>
      <div className="mb-3 flex justify-end">{canManage && <Button onClick={onNew} className="gap-1.5" data-testid="erp-new-material-btn"><Plus size={15} /> New material</Button>}</div>
      {rows.length === 0 ? <ErpEmptyState icon={Package} title="No materials yet" desc="Define cement, steel, aggregate, etc. once; receipts and issues pick from this list." /> : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-[11px] uppercase tracking-wider text-slate-500">
                <tr><th className="px-4 py-3">SKU</th><th className="px-4 py-3">Name</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">UoM</th><th className="px-4 py-3">Reorder at</th><th className="px-4 py-3" /></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs">{m.sku}</td><td className="px-4 py-3 font-medium">{m.name}</td>
                    <td className="px-4 py-3"><Badge variant="secondary">{m.category}</Badge></td><td className="px-4 py-3 text-slate-600">{m.uom}</td>
                    <td className="px-4 py-3 text-slate-600">{m.min_stock_milli != null ? `${formatQty(m.min_stock_milli)} ${m.uom}` : "—"}</td>
                    <td className="px-4 py-3 text-right">{canManage && <Button size="icon" variant="ghost" onClick={() => onEdit(m)} aria-label="Edit material"><Pencil size={14} /></Button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}

function MaterialDialog({ material, onClose, onSaved }) {
  const isNew = !material.id;
  const [f, setF] = useState({ sku: material.sku || "", name: material.name || "", category: material.category || "CEMENT", uom: material.uom || "bag", hsn_code: material.hsn_code || "", min: material.min_stock_milli != null ? String(material.min_stock_milli / 1000) : "" });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    const min = f.min === "" ? null : toMilli(f.min);
    if (f.min !== "" && min == null) return toast.error("Reorder level must be a number");
    setBusy(true);
    try {
      if (isNew) await erpApi.createMaterial({ sku: f.sku.trim().toUpperCase(), name: f.name.trim(), category: f.category, uom: f.uom, hsn_code: f.hsn_code || null, min_stock_milli: min });
      else await erpApi.updateMaterial(material.id, { name: f.name.trim(), category: f.category, uom: f.uom, hsn_code: f.hsn_code || null, min_stock_milli: min });
      toast.success(isNew ? "Material created" : "Material updated");
      onSaved();
    } catch (err) { toast.error(apiError(err)); } finally { setBusy(false); }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{isNew ? "New material" : "Edit material"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3" data-testid="erp-material-form">
          <div className="grid grid-cols-2 gap-3">
            <ErpField label="SKU *" hint={isNew ? undefined : "SKU can't be changed"}><Input required disabled={!isNew} placeholder="CEM-OPC-43" value={f.sku} onChange={(e) => set("sku", e.target.value.toUpperCase())} data-testid="erp-material-sku" /></ErpField>
            <ErpField label="HSN code"><Input value={f.hsn_code} onChange={(e) => set("hsn_code", e.target.value)} /></ErpField>
          </div>
          <ErpField label="Name *"><Input required value={f.name} onChange={(e) => set("name", e.target.value)} data-testid="erp-material-name" /></ErpField>
          <div className="grid grid-cols-2 gap-3">
            <ErpField label="Category"><ErpSelect value={f.category} onChange={(v) => set("category", v)}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</ErpSelect></ErpField>
            <ErpField label="Unit of measure"><ErpSelect value={f.uom} onChange={(v) => set("uom", v)}>{UOMS.map((u) => <option key={u}>{u}</option>)}</ErpSelect></ErpField>
          </div>
          <ErpField label={`Reorder level (${f.uom})`} hint="Stock at or below this is flagged as low."><Input inputMode="decimal" value={f.min} onChange={(e) => set("min", e.target.value)} data-testid="erp-material-min" /></ErpField>
          <Button type="submit" className="w-full" disabled={busy} data-testid="erp-material-submit">{busy ? "Saving…" : "Save"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
