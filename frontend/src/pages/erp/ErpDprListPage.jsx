import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, ClipboardList, Cloud, CloudRain, Sun, CloudLightning, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { erpApi, formatDate } from "@/lib/erp-api";
import { ErpPageHeader, ErpEmptyState, ErpMiniStat, ErpStatusPill, ErpPhoto } from "./_shared";

const WEATHER_ICON = {
  SUNNY: Sun, CLOUDY: Cloud, RAINY: CloudRain, STORMY: CloudLightning,
};

const FILTERS = ["ALL", "PENDING", "APPROVED", "REJECTED", "DRAFT"];

export default function ErpDprListPage() {
  const [rows, setRows] = useState([]);
  const [projects, setProjects] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [list, pjs] = await Promise.all([erpApi.listDpr(), erpApi.listProjects()]);
        setRows(list);
        setProjects(Object.fromEntries(pjs.map((p) => [p.id, p])));
      } finally { setLoading(false); }
    })();
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((d) => {
      if (filter !== "ALL" && d.approval_status !== filter) return false;
      if (!needle) return true;
      const proj = projects[d.project_id];
      return [d.work_narrative, proj?.name, proj?.code, ...(d.activity_tags || [])]
        .filter(Boolean).some((v) => v.toLowerCase().includes(needle));
    });
  }, [rows, q, filter, projects]);

  const stats = useMemo(() => {
    const pending = rows.filter((d) => d.approval_status === "PENDING").length;
    const approved = rows.filter((d) => d.approval_status === "APPROVED").length;
    const today = new Date().toISOString().slice(0, 10);
    const todayCount = rows.filter((d) => d.report_date === today).length;
    return { total: rows.length, pending, approved, todayCount };
  }, [rows]);

  return (
    <div data-testid="erp-dpr-page">
      <ErpPageHeader
        eyebrow="Field log"
        title="Daily Progress Reports"
        description="What got done on site today — labour, work, and photos. Target entry time ≤ 10 sec."
        action={
          <Link to="/erp/dpr/new">
            <Button data-testid="erp-new-dpr-btn" className="gap-1.5">
              <Plus size={16} /> New DPR
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <ErpMiniStat label="Reports today" value={stats.todayCount} accent="orange" />
        <ErpMiniStat label="Awaiting approval" value={stats.pending} />
        <ErpMiniStat label="Approved" value={stats.approved} />
        <ErpMiniStat label="All-time" value={stats.total} />
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search work, project, activity tags…"
            className="pl-9"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            data-testid="erp-dpr-search"
          />
        </div>
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
          {FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                filter === s ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {s === "ALL" ? "All" : s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <Card className="p-10 text-center text-sm text-slate-500">Loading reports…</Card>
      ) : rows.length === 0 ? (
        <ErpEmptyState
          icon={ClipboardList}
          title="No daily reports yet"
          desc="Submit your first 3-step report to start tracking work, labour and photo evidence."
          action={
            <Link to="/erp/dpr/new">
              <Button className="gap-1.5"><Plus size={16} /> Submit DPR</Button>
            </Link>
          }
        />
      ) : filtered.length === 0 ? (
        <ErpEmptyState icon={Search} title="No matches" desc="Try a different search or filter." />
      ) : (
        <div className="space-y-3">
          {filtered.map((d) => {
            const proj = projects[d.project_id];
            const WIcon = d.weather ? WEATHER_ICON[d.weather] : null;
            const labourTotal = Object.values(d.labour_counts || {}).reduce(
              (n, c) => n + (c.skilled || 0) + (c.helper || 0), 0,
            );
            return (
              <Card
                key={d.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row items-start gap-4 hover:border-slate-300 transition"
                data-testid={`erp-dpr-card-${d.id}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <span className="text-xs font-mono text-orange-600 font-semibold">
                      {proj?.code || "—"}
                    </span>
                    <span className="text-slate-300">·</span>
                    <span className="text-xs text-slate-500">{formatDate(d.report_date)}</span>
                    {WIcon && (
                      <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                        <WIcon size={12} /> {d.weather?.toLowerCase()}
                      </span>
                    )}
                    <ErpStatusPill status={d.approval_status} />
                  </div>
                  <p className="text-sm text-slate-800 line-clamp-2">{d.work_narrative}</p>
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    {(d.activity_tags || []).slice(0, 6).map((t) => (
                      <Badge key={t} variant="secondary" className="text-[10px] font-medium">{t}</Badge>
                    ))}
                    {labourTotal > 0 && (
                      <span className="text-[11px] text-slate-500 ml-1">
                        · {labourTotal} worker{labourTotal > 1 ? "s" : ""} on site
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  {(d.photo_keys || []).slice(0, 3).map((k, i) => (
                    <ErpPhoto
                      key={i}
                      objectKey={k}
                      alt={`DPR photo ${i + 1}`}
                      className="h-14 w-14 rounded-md ring-1 ring-slate-200"
                    />
                  ))}
                  {d.photo_keys?.length > 3 && (
                    <div className="flex h-14 w-14 items-center justify-center rounded-md bg-slate-100 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                      +{d.photo_keys.length - 3}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
