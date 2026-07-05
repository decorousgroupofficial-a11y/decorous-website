import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Briefcase, Plus, Search, MapPin, Building2 } from "lucide-react";
import { erpApi, formatPaise, formatDate } from "@/lib/erp-api";
import { ErpPageHeader, ErpEmptyState, ErpMiniStat, ErpStatusPill } from "./_shared";

const STATUS_FILTERS = ["ALL", "PLANNED", "ACTIVE", "ON_HOLD", "COMPLETED"];

export default function ErpProjectsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("ALL");

  async function reload() {
    setLoading(true);
    try { setRows(await erpApi.listProjects()); }
    finally { setLoading(false); }
  }
  useEffect(() => { reload(); }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((p) => {
      if (filter !== "ALL" && p.status !== filter) return false;
      if (!needle) return true;
      return [p.code, p.name, p.client_name, p.location]
        .filter(Boolean).some((v) => v.toLowerCase().includes(needle));
    });
  }, [rows, q, filter]);

  const stats = useMemo(() => {
    const active = rows.filter((p) => p.status === "ACTIVE").length;
    const planned = rows.filter((p) => p.status === "PLANNED").length;
    const budget = rows.reduce((n, p) => n + (p.budget_cents || 0), 0);
    return { active, planned, budget, total: rows.length };
  }, [rows]);

  return (
    <div data-testid="erp-projects-page">
      <ErpPageHeader
        eyebrow="Workspace"
        title="Projects"
        description="Every site you're running — from planning through handover."
        action={
          <Button onClick={() => setOpen(true)} data-testid="erp-new-project-btn" className="gap-1.5">
            <Plus size={16} /> New project
          </Button>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <ErpMiniStat label="Total" value={stats.total} />
        <ErpMiniStat label="Active" value={stats.active} accent="orange" />
        <ErpMiniStat label="Planned" value={stats.planned} />
        <ErpMiniStat label="Combined budget" value={formatPaise(stats.budget)} />
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search code, name, client, location…"
            className="pl-9"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            data-testid="erp-projects-search"
          />
        </div>
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg" data-testid="erp-projects-filter">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                filter === s ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {s === "ALL" ? "All" : s.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <Card className="p-10 text-center text-sm text-slate-500">Loading projects…</Card>
      ) : rows.length === 0 ? (
        <ErpEmptyState
          icon={Briefcase}
          title="No projects yet"
          desc="Create your first project to start capturing DPRs, vendors and expenses against it."
          action={
            <Button onClick={() => setOpen(true)} className="gap-1.5">
              <Plus size={16} /> Create project
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <ErpEmptyState
          icon={Search}
          title="No matches"
          desc={`Nothing matched "${q}" in ${filter === "ALL" ? "any status" : filter}.`}
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50/80 text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-semibold">Code</th>
                  <th className="px-4 py-3 font-semibold">Project</th>
                  <th className="px-4 py-3 font-semibold">Client · Location</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Budget</th>
                  <th className="px-4 py-3 font-semibold text-right">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-orange-50/30 transition" data-testid={`erp-project-row-${p.code}`}>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600 whitespace-nowrap">{p.code}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{p.name}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Building2 size={13} className="text-slate-400 flex-shrink-0" />
                        <span className="truncate">{p.client_name || "—"}</span>
                      </div>
                      {p.location && (
                        <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-500">
                          <MapPin size={11} className="text-slate-400 flex-shrink-0" />
                          <span className="truncate">{p.location}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3"><ErpStatusPill status={p.status} /></td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums whitespace-nowrap">
                      {formatPaise(p.budget_cents)}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-slate-500 whitespace-nowrap">
                      {formatDate(p.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
      toast.error(err.response?.data?.detail || "Failed to create project");
    } finally { setBusy(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">New project</DialogTitle>
          <p className="text-xs text-slate-500 mt-1">
            Give it a short code — you'll use it on every DPR, bill and expense.
          </p>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3.5 pt-2" data-testid="erp-new-project-form">
          <div className="grid grid-cols-[120px_1fr] gap-3">
            <div>
              <Label className="text-xs">Code *</Label>
              <Input
                required placeholder="VILLA-A2" value={f.code}
                onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase() })}
                className="font-mono"
              />
            </div>
            <div>
              <Label className="text-xs">Project name *</Label>
              <Input required placeholder="Villa at Koramangala"
                value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Client</Label>
            <Input placeholder="Mr. Rakesh Menon" value={f.client_name}
              onChange={(e) => setF({ ...f, client_name: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Location</Label>
            <Input placeholder="Koramangala, Bengaluru" value={f.location}
              onChange={(e) => setF({ ...f, location: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Budget (₹)</Label>
            <Input type="number" min={0} placeholder="e.g. 12500000"
              value={f.budget} onChange={(e) => setF({ ...f, budget: e.target.value })} />
            <p className="text-[10px] text-slate-400 mt-1">Total approved value. Leave blank if TBD.</p>
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={busy} data-testid="erp-submit-project-btn">
              {busy ? "Creating…" : "Create project"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
