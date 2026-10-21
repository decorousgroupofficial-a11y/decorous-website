import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Search, Users, FileText, Receipt, Wallet, Pencil } from "lucide-react";
import { erpApi, formatPaise, formatDate, formatQty, toPaise, todayIST, newKey } from "@/lib/erp-api";
import {
  ErpPageHeader, ErpEmptyState, ErpMiniStat, ErpField, ErpSelect, ErpLoading, ErpPhotoPicker,
  ErpStatusPill, ErpPhoto, apiError, useErpData, useErpRole,
} from "./_shared";

const KINDS = [["SUPPLIER", "Supplier"], ["SUBCONTRACTOR", "Subcontractor"], ["LABOUR_CONTRACTOR", "Labour contractor"], ["OTHER", "Other"]];
const kindLabel = (k) => (KINDS.find(([v]) => v === k) || [, "Supplier"])[1];

export default function ErpVendorsPage() {
  const { can } = useErpRole();
  const manage = can("PM", "ACCOUNTANT");
  const { data: vendors, loading, reload: reloadVendors } = useErpData(() => erpApi.listVendors({ include_inactive: true }), []);
  const { data: bal, reload: reloadBal } = useErpData(() => erpApi.vendorBalances(), []);
  const { data: projects } = useErpData(() => erpApi.listProjects(), []);
  const [version, setVersion] = useState(0);
  const refresh = () => { reloadBal(); reloadVendors(); setVersion((v) => v + 1); };

  const [q, setQ] = useState("");
  const [edit, setEdit] = useState(null);
  const [billFor, setBillFor] = useState(null);     // vendor | {} (choose inside dialog)
  const [payFor, setPayFor] = useState(null);
  const [stmt, setStmt] = useState(null);

  const byVendor = useMemo(() => Object.fromEntries((bal?.vendors || []).map((b) => [b.vendor_id, b])), [bal]);
  const rows = useMemo(() => {
    const n = q.trim().toLowerCase();
    return (vendors || []).filter((v) => !n || [v.name, v.gstin, v.phone, v.city].filter(Boolean).some((x) => x.toLowerCase().includes(n)));
  }, [vendors, q]);
  const openProjects = (projects || []).filter((p) => p.status !== "ARCHIVED");

  return (
    <div data-testid="erp-vendors-page">
      <ErpPageHeader eyebrow="Money" title="Vendors & Bills"
        description="Suppliers and contractors, the bills they send, what you've paid, and what's still owed."
        action={manage && <>
          <Button variant="outline" className="gap-1.5" onClick={() => setBillFor({})} data-testid="erp-new-bill-btn"><Receipt size={15} /> Enter bill</Button>
          <Button className="gap-1.5" onClick={() => setEdit({})} data-testid="erp-new-vendor-btn"><Plus size={16} /> New vendor</Button>
        </>} />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <ErpMiniStat label="Vendors" value={(vendors || []).filter((v) => v.is_active).length} />
        <ErpMiniStat label="You owe" value={formatPaise(bal?.total_outstanding_cents ?? 0)} accent="orange" />
        <ErpMiniStat label="Paid in advance" value={formatPaise(bal?.total_advances_cents ?? 0)} />
        <ErpMiniStat label="Bills awaiting approval" value={formatPaise((bal?.vendors || []).reduce((n, v) => n + v.pending_bills_cents, 0))} />
      </div>

      <Tabs defaultValue="vendors">
        <TabsList>
          <TabsTrigger value="vendors" data-testid="erp-vendors-tab-vendors">Vendors</TabsTrigger>
          <TabsTrigger value="bills" data-testid="erp-vendors-tab-bills">Bills</TabsTrigger>
          <TabsTrigger value="payments" data-testid="erp-vendors-tab-payments">Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="vendors" className="mt-4">
          <div className="relative mb-3 max-w-md">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input className="pl-9" placeholder="Search name, GSTIN, phone, city…" value={q} onChange={(e) => setQ(e.target.value)} data-testid="erp-vendors-search" />
          </div>
          {loading && !vendors ? <ErpLoading /> : (vendors || []).length === 0 ? (
            <ErpEmptyState icon={Users} title="No vendors yet" desc="Add suppliers and contractors once; bills, receipts and payments pick from this list."
              action={manage && <Button onClick={() => setEdit({})} className="gap-1.5"><Plus size={16} /> Add vendor</Button>} />
          ) : rows.length === 0 ? <ErpEmptyState icon={Search} title="No matches" desc={`Nothing matched "${q}".`} /> : (
            <Card className="overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50/80 text-left text-[11px] uppercase tracking-wider text-slate-500">
                    <tr><th className="px-4 py-3">Vendor</th><th className="px-4 py-3 text-right">Billed</th><th className="px-4 py-3 text-right">Paid</th><th className="px-4 py-3 text-right">Outstanding</th><th className="px-4 py-3" /></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((v) => {
                      const b = byVendor[v.id];
                      return (
                        <tr key={v.id} className={v.is_active ? "hover:bg-orange-50/30" : "bg-slate-50 text-slate-400"} data-testid={`erp-vendor-row-${v.name}`}>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-900">{v.name}{!v.is_active && " (inactive)"}</div>
                            <div className="text-xs text-slate-500">{kindLabel(v.kind)}{v.gstin ? ` · ${v.gstin}` : ""}{v.phone ? ` · ${v.phone}` : ""}{v.city ? ` · ${v.city}` : ""}</div>
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">{b ? formatPaise(b.billed_cents) : "—"}</td>
                          <td className="px-4 py-3 text-right tabular-nums">{b ? formatPaise(b.paid_cents) : "—"}</td>
                          <td className={`px-4 py-3 text-right font-bold tabular-nums ${b && b.outstanding_cents < 0 ? "text-emerald-600" : ""}`}>
                            {b ? (b.outstanding_cents < 0 ? `${formatPaise(-b.outstanding_cents)} adv.` : formatPaise(b.outstanding_cents)) : "—"}
                            {b && (b.pending_bills_cents > 0 || b.pending_payments_cents > 0) && <div className="text-[11px] font-normal text-amber-700">pending approval</div>}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right">
                            <Button size="sm" variant="ghost" className="gap-1" onClick={() => setStmt(v)} data-testid={`erp-vendor-statement-${v.name}`}><FileText size={14} /> Statement</Button>
                            {manage && v.is_active && <Button size="sm" variant="ghost" className="gap-1" onClick={() => setBillFor(v)}><Receipt size={14} /> Bill</Button>}
                            {manage && v.is_active && <Button size="sm" variant="outline" className="ml-1 gap-1" onClick={() => setPayFor(v)} data-testid={`erp-vendor-pay-${v.name}`}><Wallet size={14} /> Pay</Button>}
                            {manage && <Button size="icon" variant="ghost" onClick={() => setEdit(v)} aria-label="Edit vendor"><Pencil size={14} /></Button>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
          <p className="mt-3 text-[11px] text-slate-400">{bal?.note || "Operational balance from approved records — not an accounting ledger."}</p>
        </TabsContent>

        <TabsContent value="bills" className="mt-4"><BillsTab version={version} /></TabsContent>
        <TabsContent value="payments" className="mt-4"><PaymentsTab version={version} /></TabsContent>
      </Tabs>

      {edit && <VendorDialog vendor={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); refresh(); }} />}
      {billFor && <BillDialog vendors={(vendors || []).filter((v) => v.is_active)} projects={openProjects} vendor={billFor.id ? billFor : null} onClose={() => setBillFor(null)} onSaved={() => { setBillFor(null); refresh(); }} />}
      {payFor && <PaymentDialog vendor={payFor} projects={openProjects} outstanding={byVendor[payFor.id]?.outstanding_cents ?? 0} onClose={() => setPayFor(null)} onSaved={() => { setPayFor(null); refresh(); }} />}
      {stmt && <StatementDialog vendor={stmt} onClose={() => setStmt(null)} />}
    </div>
  );
}

function BillsTab({ version }) {
  const { data, loading } = useErpData(() => erpApi.listBills(), [version]);
  if (loading && !data) return <ErpLoading />;
  if (!(data || []).length) return <ErpEmptyState icon={Receipt} title="No bills yet" desc="Enter each supplier invoice with a photo; it goes to a PM (or the Owner for ₹50,000+) for approval." />;
  return (
    <div className="space-y-2" data-testid="erp-bills-list">
      {data.map((b) => (
        <Card key={b.id} className="flex items-center gap-3 p-3">
          <ErpPhoto objectKey={b.photo_keys?.[0]} zoomable className="h-14 w-14 flex-shrink-0 rounded-md" />
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold">{b.vendor_name} <span className="font-mono text-xs font-normal text-slate-500">#{b.bill_no}</span></div>
            <div className="text-xs text-slate-500">{formatDate(b.bill_date)} · {b.project_code}{b.due_date ? ` · due ${formatDate(b.due_date)}` : ""}{b.grn_ids?.length ? ` · ${b.grn_ids.length} receipt${b.grn_ids.length > 1 ? "s" : ""}` : ""}</div>
          </div>
          <div className="text-right"><div className="font-bold tabular-nums">{formatPaise(b.amount_cents)}</div><div className="mt-1"><ErpStatusPill status={b.approval_status} /></div></div>
        </Card>
      ))}
    </div>
  );
}

function PaymentsTab({ version }) {
  const { data, loading } = useErpData(() => erpApi.listVendorPayments(), [version]);
  if (loading && !data) return <ErpLoading />;
  if (!(data || []).length) return <ErpEmptyState icon={Wallet} title="No payments yet" desc="Record each payment you make to a vendor. It needs approval before it reduces what you owe." />;
  return (
    <Card className="divide-y divide-slate-100 p-0" data-testid="erp-vendor-payments-list">
      {data.map((p) => (
        <div key={p.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
          <div className="min-w-0"><div className="font-medium">{p.vendor_name}</div><div className="text-xs text-slate-500">{formatDate(p.paid_on)} · {p.mode}{p.ref_no ? ` · ${p.ref_no}` : ""}</div></div>
          <div className="text-right"><div className="font-bold tabular-nums">{formatPaise(p.amount_cents)}</div><div className="mt-1"><ErpStatusPill status={p.approval_status} /></div></div>
        </div>
      ))}
    </Card>
  );
}

function VendorDialog({ vendor, onClose, onSaved }) {
  const isNew = !vendor.id;
  const [f, setF] = useState({ name: vendor.name || "", kind: vendor.kind || "SUPPLIER", contact_person: vendor.contact_person || "", gstin: vendor.gstin || "", phone: vendor.phone || "", email: vendor.email || "", city: vendor.city || "", state: vendor.state || "", is_active: vendor.is_active ?? true });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  async function submit(e) {
    e.preventDefault();
    const body = { name: f.name.trim(), kind: f.kind, contact_person: f.contact_person || null, gstin: f.gstin.trim() || null, phone: f.phone || null, email: f.email || null, city: f.city || null, state: f.state || null };
    setBusy(true);
    try {
      if (isNew) await erpApi.createVendor(body); else await erpApi.updateVendor(vendor.id, { ...body, is_active: f.is_active });
      toast.success(isNew ? "Vendor added" : "Vendor updated");
      onSaved();
    } catch (err) { toast.error(apiError(err)); } finally { setBusy(false); }
  }
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{isNew ? "New vendor" : "Edit vendor"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3" data-testid="erp-vendor-form">
          <ErpField label="Name *"><Input required value={f.name} onChange={(e) => set("name", e.target.value)} data-testid="erp-vendor-name" /></ErpField>
          <div className="grid grid-cols-2 gap-3">
            <ErpField label="Type"><ErpSelect value={f.kind} onChange={(v) => set("kind", v)}>{KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</ErpSelect></ErpField>
            <ErpField label="Contact person"><Input value={f.contact_person} onChange={(e) => set("contact_person", e.target.value)} /></ErpField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <ErpField label="GSTIN"><Input maxLength={15} value={f.gstin} onChange={(e) => set("gstin", e.target.value.toUpperCase())} data-testid="erp-vendor-gstin" /></ErpField>
            <ErpField label="Phone"><Input inputMode="tel" value={f.phone} onChange={(e) => set("phone", e.target.value)} /></ErpField>
          </div>
          <ErpField label="Email"><Input type="email" value={f.email} onChange={(e) => set("email", e.target.value)} /></ErpField>
          <div className="grid grid-cols-2 gap-3">
            <ErpField label="City"><Input value={f.city} onChange={(e) => set("city", e.target.value)} /></ErpField>
            <ErpField label="State"><Input value={f.state} onChange={(e) => set("state", e.target.value)} /></ErpField>
          </div>
          {!isNew && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.is_active} onChange={(e) => set("is_active", e.target.checked)} /> Active</label>}
          <Button type="submit" className="w-full" disabled={busy} data-testid="erp-vendor-submit">{busy ? "Saving…" : "Save"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function BillDialog({ vendors, projects, vendor, onClose, onSaved }) {
  const key = useRef(newKey());
  const [f, setF] = useState({ vendor_id: vendor?.id || "", project_id: projects[0]?.id || "", bill_no: "", bill_date: todayIST(), due_date: "", amount: "", gst: "", description: "" });
  const [photos, setPhotos] = useState([]);
  const [picked, setPicked] = useState([]);                      // goods-receipt ids this bill invoices
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const { data: grns } = useErpData(() => (f.vendor_id ? erpApi.listGrns({ vendor_id: f.vendor_id, unbilled: true }) : Promise.resolve([])), [f.vendor_id]);
  const pickedTotal = (grns || []).filter((g) => picked.includes(g.id)).reduce((n, g) => n + g.total_cents, 0);

  async function submit(e) {
    e.preventDefault();
    const amount = toPaise(f.amount), gst = f.gst === "" ? 0 : toPaise(f.gst);
    if (!amount) return toast.error("Enter the bill amount in rupees (GST included)");
    if (gst == null) return toast.error("GST must be a number");
    if (photos.length < 1) return toast.error("Attach a photo of the bill");
    setBusy(true);
    try {
      await erpApi.createBill({
        vendor_id: f.vendor_id, project_id: f.project_id, bill_no: f.bill_no.trim(), bill_date: f.bill_date,
        due_date: f.due_date || null, amount_cents: amount, gst_cents: gst, description: f.description.trim() || null,
        photo_keys: photos.map((p) => p.key), grn_ids: picked,
      }, key.current);
      toast.success("Bill sent for approval");
      onSaved();
    } catch (err) { toast.error(apiError(err)); } finally { setBusy(false); }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-xl overflow-y-auto">
        <DialogHeader><DialogTitle>Enter vendor bill</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3.5" data-testid="erp-bill-form">
          <div className="grid gap-3 sm:grid-cols-2">
            <ErpField label="Vendor *"><ErpSelect value={f.vendor_id} onChange={(v) => { set("vendor_id", v); setPicked([]); }} data-testid="erp-bill-vendor" required><option value="">Choose…</option>{vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</ErpSelect></ErpField>
            <ErpField label="Project *"><ErpSelect value={f.project_id} onChange={(v) => set("project_id", v)} data-testid="erp-bill-project">{projects.map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}</ErpSelect></ErpField>
            <ErpField label="Bill no. *" hint="The same number from the same vendor can't be entered twice."><Input required value={f.bill_no} onChange={(e) => set("bill_no", e.target.value)} data-testid="erp-bill-no" /></ErpField>
            <ErpField label="Bill date"><Input type="date" required max={todayIST()} value={f.bill_date} onChange={(e) => set("bill_date", e.target.value)} /></ErpField>
            <ErpField label="Total amount (₹, incl. GST) *"><Input required inputMode="decimal" value={f.amount} onChange={(e) => set("amount", e.target.value)} data-testid="erp-bill-amount" /></ErpField>
            <ErpField label="of which GST (₹)"><Input inputMode="decimal" value={f.gst} onChange={(e) => set("gst", e.target.value)} /></ErpField>
            <ErpField label="Due date"><Input type="date" min={f.bill_date} value={f.due_date} onChange={(e) => set("due_date", e.target.value)} /></ErpField>
            <ErpField label="Description"><Input value={f.description} onChange={(e) => set("description", e.target.value)} /></ErpField>
          </div>

          {(grns || []).length > 0 && (
            <div className="rounded-lg border border-slate-200 p-3" data-testid="erp-bill-grns">
              <div className="text-xs font-semibold text-slate-700">Goods received from this vendor, not yet billed</div>
              <p className="mb-2 text-[11px] text-slate-400">Tick the deliveries this bill covers so the material isn't counted twice in project cost.</p>
              {grns.map((g) => (
                <label key={g.id} className="flex cursor-pointer items-start gap-2 py-1 text-sm">
                  <input type="checkbox" className="mt-1" checked={picked.includes(g.id)} onChange={(e) => setPicked((p) => (e.target.checked ? [...p, g.id] : p.filter((x) => x !== g.id)))} />
                  <span className="flex-1">{formatDate(g.received_on)} · {g.project_code}{g.challan_no ? ` · #${g.challan_no}` : ""}<span className="block text-[11px] text-slate-500">{g.lines.map((l) => `${l.material_name} ${formatQty(l.qty_milli)} ${l.uom}`).join(", ")}</span></span>
                  <span className="font-semibold tabular-nums">{formatPaise(g.total_cents)}</span>
                </label>
              ))}
              {picked.length > 0 && <div className="mt-1 text-xs text-slate-500">Selected receipts total {formatPaise(pickedTotal)}</div>}
            </div>
          )}

          <ErpField label="Bill photo *"><ErpPhotoPicker kind="vendor-bill" value={photos} onChange={setPhotos} max={4} min={1} /></ErpField>
          <Button type="submit" className="w-full" disabled={busy} data-testid="erp-bill-submit">{busy ? "Submitting…" : "Submit for approval"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PaymentDialog({ vendor, projects, outstanding, onClose, onSaved }) {
  const owner = useErpRole().can();                     // Owner-only: payments take effect at once
  const key = useRef(newKey());
  const [f, setF] = useState({ amount: "", paid_on: todayIST(), mode: "BANK", ref_no: "", note: "", project_id: "" });
  const [proof, setProof] = useState([]);
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  async function submit(e) {
    e.preventDefault();
    const amount = toPaise(f.amount);
    if (!amount) return toast.error("Enter a valid amount");
    setBusy(true);
    try {
      const r = await erpApi.createVendorPayment({ vendor_id: vendor.id, project_id: f.project_id || null, amount_cents: amount, paid_on: f.paid_on, mode: f.mode, ref_no: f.ref_no || null, note: f.note || null, proof_photo_key: proof[0]?.key || null }, key.current);
      toast.success(r.approval_status === "APPROVED" ? "Payment recorded" : "Payment sent for approval");
      onSaved();
    } catch (err) { toast.error(apiError(err)); } finally { setBusy(false); }
  }
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Pay {vendor.name}</DialogTitle></DialogHeader>
        <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm">{outstanding > 0 ? <>You owe <strong>{formatPaise(outstanding)}</strong></> : outstanding < 0 ? <>Already paid in advance: <strong>{formatPaise(-outstanding)}</strong></> : "Nothing outstanding."}</div>
        <form onSubmit={submit} className="space-y-3.5" data-testid="erp-vendor-pay-form">
          <div className="grid grid-cols-2 gap-3">
            <ErpField label="Amount (₹) *"><Input required inputMode="decimal" value={f.amount} onChange={(e) => set("amount", e.target.value)} data-testid="erp-vendor-pay-amount" /></ErpField>
            <ErpField label="Date"><Input type="date" required max={todayIST()} value={f.paid_on} onChange={(e) => set("paid_on", e.target.value)} /></ErpField>
            <ErpField label="Mode"><ErpSelect value={f.mode} onChange={(v) => set("mode", v)}>{["BANK", "UPI", "CHEQUE", "CASH"].map((m) => <option key={m}>{m}</option>)}</ErpSelect></ErpField>
            <ErpField label="UTR / cheque no."><Input value={f.ref_no} onChange={(e) => set("ref_no", e.target.value)} /></ErpField>
          </div>
          <ErpField label="Project (optional)"><ErpSelect value={f.project_id} onChange={(v) => set("project_id", v)}><option value="">—</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.code}</option>)}</ErpSelect></ErpField>
          <ErpField label="Proof (optional)"><ErpPhotoPicker kind="vendor-payment" value={proof} onChange={setProof} max={1} label="Add proof" /></ErpField>
          <p className="text-[11px] text-slate-400">{owner ? "As the Owner, your payments are recorded immediately with no approval step." : "Payments need approval: a PM up to ₹50,000, the Owner above that (with PIN)."}</p>
          <Button type="submit" className="w-full" disabled={busy} data-testid="erp-vendor-pay-submit">{busy ? "Saving…" : owner ? "Record payment" : "Submit for approval"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function StatementDialog({ vendor, onClose }) {
  const { data, loading } = useErpData(() => erpApi.vendorStatement(vendor.id), [vendor.id]);
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>{vendor.name} — statement</DialogTitle></DialogHeader>
        {loading || !data ? <ErpLoading /> : (
          <div className="space-y-4" data-testid="erp-vendor-statement">
            <div className="grid grid-cols-3 gap-2">
              <ErpMiniStat label="Billed" value={formatPaise(data.billed_cents)} />
              <ErpMiniStat label="Paid" value={formatPaise(data.paid_cents)} />
              <ErpMiniStat label={data.advance_cents > 0 ? "Advance" : "Outstanding"} value={formatPaise(data.advance_cents > 0 ? data.advance_cents : data.outstanding_cents)} accent="orange" />
            </div>
            {(data.pending_bills_cents > 0 || data.pending_payments_cents > 0) && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Awaiting approval: {formatPaise(data.pending_bills_cents)} in bills, {formatPaise(data.pending_payments_cents)} in payments — not counted above yet.
              </div>
            )}
            {data.bills.length > 0 && (
              <div>
                <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">Bills (payments clear the oldest first)</div>
                <div className="overflow-x-auto"><table className="min-w-full text-sm">
                  <thead className="border-b text-left text-[11px] uppercase tracking-wider text-slate-500"><tr><th className="py-2 pr-3">Bill</th><th className="pr-3">Date</th><th className="pr-3 text-right">Amount</th><th className="pr-3 text-right">Open</th><th>Status</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.bills.map((b) => (
                      <tr key={b.id}><td className="py-2 pr-3 font-mono text-xs">{b.bill_no}</td><td className="pr-3">{formatDate(b.bill_date)}</td>
                        <td className="pr-3 text-right tabular-nums">{formatPaise(b.amount_cents)}</td><td className="pr-3 text-right font-semibold tabular-nums">{formatPaise(b.outstanding_cents)}</td>
                        <td className="space-x-1"><ErpStatusPill status={b.status} />{b.overdue && <ErpStatusPill status="OVERDUE" />}</td></tr>
                    ))}
                  </tbody></table></div>
              </div>
            )}
            {data.lines.length > 0 && (
              <div>
                <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">Ledger of movements</div>
                <div className="overflow-x-auto"><table className="min-w-full text-sm">
                  <thead className="border-b text-left text-[11px] uppercase tracking-wider text-slate-500"><tr><th className="py-2 pr-3">Date</th><th className="pr-3">Detail</th><th className="pr-3 text-right">Billed</th><th className="pr-3 text-right">Paid</th><th className="text-right">Balance</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.lines.map((l, i) => (
                      <tr key={i}><td className="whitespace-nowrap py-2 pr-3">{formatDate(l.date)}</td><td className="pr-3">{l.type === "BILL" ? `Bill ${l.ref}` : `Payment · ${l.ref}`}{l.project_code && <span className="ml-1 font-mono text-[11px] text-slate-400">{l.project_code}</span>}</td>
                        <td className="pr-3 text-right tabular-nums">{l.billed_cents ? formatPaise(l.billed_cents) : ""}</td><td className="pr-3 text-right tabular-nums">{l.paid_cents ? formatPaise(l.paid_cents) : ""}</td>
                        <td className="text-right font-semibold tabular-nums">{formatPaise(l.balance_cents)}</td></tr>
                    ))}
                  </tbody></table></div>
              </div>
            )}
            {data.lines.length === 0 && <p className="py-6 text-center text-sm text-slate-500">No approved bills or payments yet.</p>}
            <p className="text-[11px] text-slate-400">{data.note}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
