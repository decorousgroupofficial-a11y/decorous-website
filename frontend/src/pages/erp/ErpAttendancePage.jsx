import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { CalendarCheck, ChevronLeft, ChevronRight, Lock, Info, Users } from "lucide-react";
import { erpApi, formatPaise, formatDate, todayIST, newKey } from "@/lib/erp-api";
import {
  ErpPageHeader, ErpEmptyState, ErpStatusPill, ErpSelect, ErpLoading, apiError, useErpData, useErpRole,
} from "./_shared";

const HALVES = { PRESENT: 2, HALF: 1, ABSENT: 0 };

/** Same integer maths as the API (erp_labour.entry_amounts) so the live total matches what gets saved. */
export function entryAmount(status, otHalfHours, wage, otRate) {
  const halves = HALVES[status] ?? 0;
  const rate = otRate != null ? otRate : Math.floor(wage / 8);
  const base = halves === 2 ? wage : halves === 1 ? Math.floor(wage / 2) : 0;
  return base + Math.floor((otHalfHours * rate) / 2);
}

function addDays(iso, n) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export default function ErpAttendancePage() {
  const { can } = useErpRole();
  const editor = can("PM", "ENGINEER");
  const { data: projects } = useErpData(() => erpApi.listProjects(), []);
  const [projectId, setProjectId] = useState("");
  const [date, setDate] = useState(todayIST());
  const today = todayIST();

  const open = (projects || []).filter((p) => p.status !== "ARCHIVED");
  useEffect(() => { if (!projectId && open.length) setProjectId(open[0].id); }, [open, projectId]);

  const { data: roster, loading, reload } = useErpData(
    () => (projectId ? erpApi.roster(projectId, date) : Promise.resolve(null)), [projectId, date],
  );
  const { data: recent, reload: reloadRecent } = useErpData(
    () => (projectId ? erpApi.listAttendance({ project_id: projectId, limit: 14 }) : Promise.resolve([])), [projectId],
  );

  const sheet = roster?.sheet;
  const locked = sheet && (sheet.approval_status === "PENDING" || sheet.approval_status === "APPROVED");
  const readOnly = !editor || locked;

  // marks: worker_id → { status, ot (hours) }
  const [marks, setMarks] = useState({});
  useEffect(() => {
    const m = {};
    (sheet?.entries || []).forEach((e) => { m[e.worker_id] = { status: e.status, ot: e.ot_hours || 0 }; });
    setMarks(m);
  }, [sheet, roster]);

  const submitKey = useRef({ sheetId: null, key: null });
  const [busy, setBusy] = useState(false);
  const [rejection, setRejection] = useState(null);
  useEffect(() => {
    setRejection(null);
    if (sheet?.approval_status === "REJECTED" && sheet.approval_id) {
      erpApi.getApproval(sheet.approval_id).then((a) => setRejection(a.rejection_reason)).catch(() => {});
    }
  }, [sheet]);

  const workers = useMemo(() => roster?.workers || [], [roster]);
  const rows = useMemo(() => workers.map((w) => {
    const m = marks[w.id];
    const otHalf = m ? Math.round(m.ot * 2) : 0;
    return { ...w, mark: m, amount: m ? entryAmount(m.status, otHalf, w.daily_wage_cents, w.ot_rate_cents) : 0 };
  }), [workers, marks]);

  const marked = rows.filter((r) => r.mark);
  const total = marked.reduce((n, r) => n + r.amount, 0);
  const count = (s) => marked.filter((r) => r.mark.status === s).length;

  function setStatus(id, status) {
    setMarks((m) => ({ ...m, [id]: { status, ot: status === "ABSENT" ? 0 : m[id]?.ot || 0 } }));
  }
  function stepOt(id, delta) {
    setMarks((m) => {
      const cur = m[id];
      if (!cur || cur.status === "ABSENT") return m;
      return { ...m, [id]: { ...cur, ot: Math.min(12, Math.max(0, cur.ot + delta)) } };
    });
  }
  function markAllPresent() {
    setMarks((m) => {
      const next = { ...m };
      workers.forEach((w) => { if (!next[w.id] && w.halves_on_other_sites === 0) next[w.id] = { status: "PRESENT", ot: 0 }; });
      return next;
    });
  }

  async function save(andSubmit) {
    if (!marked.length) return toast.error("Mark at least one worker first");
    setBusy(true);
    try {
      const saved = await erpApi.saveAttendance({
        project_id: projectId, date,
        entries: marked.map((r) => ({ worker_id: r.id, status: r.mark.status, ot_hours: r.mark.ot })),
      });
      if (andSubmit) {
        if (submitKey.current.sheetId !== saved.id) submitKey.current = { sheetId: saved.id, key: newKey() };
        await erpApi.submitAttendance(saved.id, submitKey.current.key);
        toast.success("Sent for approval");
      } else {
        toast.success("Draft saved");
      }
      reload(); reloadRecent();
    } catch (err) { toast.error(apiError(err)); } finally { setBusy(false); }
  }

  return (
    <div data-testid="erp-attendance-page" className="pb-28 lg:pb-0">
      <ErpPageHeader eyebrow="Site" title="Attendance" description="Daily muster — wages calculate as you mark." />

      {projects && open.length === 0 ? (
        <ErpEmptyState icon={CalendarCheck} title="No open projects" desc="Create a project first, then mark attendance against it."
          action={<Link to="/erp/projects" className="text-sm font-semibold text-orange-600">Go to projects →</Link>} />
      ) : (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_auto]">
            <ErpSelect value={projectId} onChange={setProjectId} data-testid="erp-attendance-project">
              {open.map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
            </ErpSelect>
            <div className="flex items-center gap-1">
              <Button type="button" variant="outline" size="icon" onClick={() => setDate(addDays(date, -1))} aria-label="Previous day"><ChevronLeft size={16} /></Button>
              <Input type="date" value={date} max={addDays(today, 1)} onChange={(e) => e.target.value && setDate(e.target.value)} className="w-40" data-testid="erp-attendance-date" />
              <Button type="button" variant="outline" size="icon" disabled={date >= addDays(today, 1)} onClick={() => setDate(addDays(date, 1))} aria-label="Next day"><ChevronRight size={16} /></Button>
            </div>
          </div>

          {sheet && (
            <div className={`mb-4 flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm ${
              sheet.approval_status === "REJECTED" ? "border-rose-200 bg-rose-50 text-rose-800"
                : locked ? "border-slate-200 bg-slate-100 text-slate-700" : "border-slate-200 bg-white text-slate-600"}`}>
              {locked ? <Lock size={15} className="mt-0.5" /> : <Info size={15} className="mt-0.5" />}
              <div className="flex-1">
                <div className="flex items-center gap-2">Sheet status <ErpStatusPill status={sheet.approval_status} /></div>
                {locked && <div className="mt-1 text-xs">Submitted sheets can't be edited.</div>}
                {rejection && <div className="mt-1 text-xs"><strong>Rejected:</strong> {rejection}. Fix it below and send again.</div>}
              </div>
            </div>
          )}

          {loading && !roster ? <ErpLoading label="Loading workers…" /> : workers.length === 0 ? (
            <ErpEmptyState icon={Users} title="No workers yet" desc="Add your workers and their daily wage first."
              action={<Link to="/erp/labour" className="text-sm font-semibold text-orange-600">Add workers →</Link>} />
          ) : (
            <>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm text-slate-600">
                  <strong className="text-slate-900">{count("PRESENT")}</strong> present ·{" "}
                  <strong className="text-slate-900">{count("HALF")}</strong> half ·{" "}
                  <strong className="text-slate-900">{count("ABSENT")}</strong> absent ·{" "}
                  <span className="text-slate-400">{workers.length - marked.length} unmarked</span>
                </div>
                {!readOnly && <Button type="button" variant="outline" size="sm" onClick={markAllPresent} data-testid="erp-mark-all-present">Mark all present</Button>}
              </div>

              <div className="space-y-2" data-testid="erp-muster-list">
                {rows.map((r) => {
                  const m = r.mark;
                  const bookedElsewhere = r.halves_on_other_sites;
                  return (
                    <Card key={r.id} className={`p-3 ${m?.status === "ABSENT" ? "opacity-70" : ""}`} data-testid={`erp-muster-row-${r.name}`}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-slate-900">{r.name}</div>
                          <div className="text-xs text-slate-500">{r.trade.replace("_", " ").toLowerCase()} · {formatPaise(r.daily_wage_cents)}/day</div>
                        </div>
                        <div className="text-right text-sm font-bold tabular-nums">{m ? formatPaise(r.amount) : <span className="font-normal text-slate-300">—</span>}</div>
                      </div>
                      <div className="mt-2.5 flex items-center gap-2">
                        <div className="grid flex-1 grid-cols-3 gap-1.5">
                          {[["PRESENT", "P", "Present"], ["HALF", "½", "Half"], ["ABSENT", "A", "Absent"]].map(([s, short, long]) => {
                            const blocked = (s === "PRESENT" && bookedElsewhere > 0) || (s === "HALF" && bookedElsewhere > 1);
                            const on = m?.status === s;
                            return (
                              <button key={s} type="button" disabled={readOnly || blocked} onClick={() => setStatus(r.id, s)}
                                title={blocked ? "Already marked on another site today" : long}
                                aria-pressed={on} data-testid={`erp-mark-${s.toLowerCase()}-${r.name}`}
                                className={`rounded-lg border py-2.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                                  on ? s === "PRESENT" ? "border-emerald-600 bg-emerald-600 text-white"
                                    : s === "HALF" ? "border-amber-500 bg-amber-500 text-white" : "border-rose-500 bg-rose-500 text-white"
                                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}>
                                <span className="sm:hidden">{short}</span><span className="hidden sm:inline">{long}</span>
                              </button>
                            );
                          })}
                        </div>
                        <div className={`flex items-center gap-1 ${!m || m.status === "ABSENT" ? "pointer-events-none opacity-30" : ""}`}>
                          <button type="button" disabled={readOnly} onClick={() => stepOt(r.id, -0.5)} aria-label="Less overtime"
                            className="h-9 w-9 rounded-full border border-slate-300 text-lg font-bold disabled:cursor-not-allowed disabled:opacity-40">−</button>
                          <div className="w-12 text-center text-xs leading-tight"><span className="text-sm font-bold tabular-nums">{m?.ot || 0}</span><br />OT hr</div>
                          <button type="button" disabled={readOnly} onClick={() => stepOt(r.id, 0.5)} aria-label="More overtime"
                            className="h-9 w-9 rounded-full border border-slate-300 text-lg font-bold disabled:cursor-not-allowed disabled:opacity-40">+</button>
                        </div>
                      </div>
                      {bookedElsewhere > 0 && <div className="mt-1.5 text-[11px] font-medium text-amber-700">Already {bookedElsewhere >= 2 ? "present" : "half-day"} on another site this day.</div>}
                    </Card>
                  );
                })}
              </div>

              {/* sticky total + actions */}
              <div className="fixed inset-x-0 bottom-[57px] z-20 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:static lg:mt-4 lg:rounded-xl lg:border lg:px-5">
                <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Wages for {formatDate(date)}</div>
                    <div className="text-xl font-bold tabular-nums" data-testid="erp-muster-total">{formatPaise(total)}</div>
                  </div>
                  {!readOnly && (
                    <div className="flex gap-2">
                      <Button variant="outline" disabled={busy || !marked.length} onClick={() => save(false)} data-testid="erp-muster-save">Save draft</Button>
                      <Button disabled={busy || !marked.length} className="bg-orange-500 hover:bg-orange-600" onClick={() => save(true)} data-testid="erp-muster-submit">
                        {busy ? "Working…" : "Submit for approval"}
                      </Button>
                    </div>
                  )}
                  {!editor && <span className="text-xs text-slate-500">View only — your role can't mark attendance.</span>}
                </div>
              </div>
            </>
          )}

          {recent && recent.length > 0 && (
            <div className="mt-8">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-500">Recent sheets</h2>
              <Card className="divide-y divide-slate-100 p-0">
                {recent.map((s) => (
                  <button key={s.id} type="button" onClick={() => setDate(s.date)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm hover:bg-slate-50">
                    <span className="font-medium">{formatDate(s.date)}</span>
                    <span className="text-xs text-slate-500">{s.present} P · {s.half} ½ · {s.absent} A</span>
                    <ErpStatusPill status={s.approval_status} />
                    <span className="w-24 text-right font-semibold tabular-nums">{formatPaise(s.total_cents)}</span>
                  </button>
                ))}
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
