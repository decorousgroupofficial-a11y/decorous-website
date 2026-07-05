import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  ArrowLeft, ArrowRight, Camera, Check, Sun, Cloud, CloudRain, CloudLightning,
  Users, Hammer, ClipboardList, X,
} from "lucide-react";
import { erpApi, fileToCompressedBase64 } from "@/lib/erp-api";

const WEATHERS = [
  { v: "SUNNY", icon: Sun, label: "Sunny" },
  { v: "CLOUDY", icon: Cloud, label: "Cloudy" },
  { v: "RAINY", icon: CloudRain, label: "Rainy" },
  { v: "STORMY", icon: CloudLightning, label: "Stormy" },
];
const TRADES = ["MASON", "STEEL", "ELECTRICAL", "PLUMBING", "CARPENTER", "HELPER"];
const CHIPS = [
  "Excavation", "PCC", "Footing", "Slab casting", "Curing", "Masonry",
  "Plastering", "Plumbing", "Electrical", "Painting", "Flooring", "Finishing",
];

const STEP_LABEL = {
  1: { title: "Work & activity", icon: ClipboardList },
  2: { title: "Labour on site", icon: Users },
  3: { title: "Photo evidence", icon: Camera },
};

const emptyCounts = () =>
  TRADES.reduce((acc, t) => ({ ...acc, [t]: { skilled: 0, helper: 0 } }), {});

export default function ErpDprNewPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState("");
  const [reportDate] = useState(new Date().toISOString().slice(0, 10));
  const [narrative, setNarrative] = useState("");
  const [activities, setActivities] = useState([]);
  const [weather, setWeather] = useState("");
  const [blockers, setBlockers] = useState("");
  const [counts, setCounts] = useState(emptyCounts());
  const [photos, setPhotos] = useState([]); // [{key, preview}]
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => { erpApi.listProjects().then(setProjects); }, []);

  const totalLabour = TRADES.reduce(
    (n, t) => n + counts[t].skilled + counts[t].helper, 0,
  );

  async function addPhoto(file) {
    if (!file) return;
    setUploading(true);
    try {
      const b64 = await fileToCompressedBase64(file, { maxDim: 1280, quality: 0.72 });
      const { object_key } = await erpApi.uploadInline({
        kind: "dpr-photo",
        content_type: "image/jpeg",
        data_base64: b64,
      });
      setPhotos((p) => [...p, { key: object_key, preview: `data:image/jpeg;base64,${b64}` }]);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Photo upload failed");
    } finally {
      setUploading(false);
    }
  }

  function removePhoto(i) {
    setPhotos((p) => p.filter((_, idx) => idx !== i));
  }

  async function submit() {
    setBusy(true);
    try {
      const labourCounts = {};
      for (const t of TRADES) {
        const c = counts[t];
        if (c.skilled + c.helper > 0) labourCounts[t.toLowerCase()] = c;
      }
      const dpr = await erpApi.createDpr({
        project_id: projectId,
        report_date: reportDate,
        work_narrative: narrative,
        activity_tags: activities,
        weather: weather || null,
        blockers: blockers || null,
        labour_counts: labourCounts,
        photo_keys: photos.map((p) => p.key),
      });
      await erpApi.submitDpr(dpr.id);
      toast.success("DPR submitted — awaiting PM approval");
      navigate("/erp/dpr");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to submit");
    } finally { setBusy(false); }
  }

  const canNext1 = projectId && narrative.trim().length >= 3;

  return (
    <div className="max-w-xl mx-auto py-2" data-testid="erp-new-dpr-form">
      {/* Top bar */}
      <button
        onClick={() => navigate("/erp/dpr")}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-4"
      >
        <ArrowLeft size={14} /> All reports
      </button>

      <div className="flex items-start justify-between gap-3 mb-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-xs font-semibold uppercase tracking-widest text-orange-600">
              Daily progress report
            </p>
            <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              {step}/3
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight mt-1">
            {STEP_LABEL[step].title}
          </h1>
        </div>
      </div>

      {/* Stepper */}
      <div className="mb-7 flex gap-1.5">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`h-1.5 flex-1 rounded-full transition ${
              step > s ? "bg-orange-500"
                : step === s ? "bg-orange-500"
                : "bg-slate-200"
            }`}
          />
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-5">
          <div>
            <Label className="text-xs">Project *</Label>
            <select
              required value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              data-testid="erp-dpr-project-select"
            >
              <option value="">Select project…</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 mt-1">
              Date: {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>

          <div>
            <Label className="text-xs">Work done today *</Label>
            <Textarea
              required rows={4}
              value={narrative}
              onChange={(e) => setNarrative(e.target.value)}
              placeholder="e.g. Completed slab casting of 2nd floor, curing started."
              className="focus-visible:ring-orange-500"
              data-testid="erp-dpr-narrative"
            />
          </div>

          <div>
            <Label className="text-xs">Activity tags</Label>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {CHIPS.map((c) => {
                const on = activities.includes(c);
                return (
                  <button
                    type="button" key={c}
                    onClick={() =>
                      setActivities((a) => (on ? a.filter((x) => x !== c) : [...a, c]))
                    }
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                      on
                        ? "border-orange-500 bg-orange-500 text-white shadow-sm"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Label className="text-xs">Weather</Label>
            <div className="grid grid-cols-4 gap-2 mt-2">
              {WEATHERS.map((w) => {
                const on = weather === w.v;
                const WI = w.icon;
                return (
                  <button
                    key={w.v} type="button"
                    onClick={() => setWeather(on ? "" : w.v)}
                    className={`flex flex-col items-center gap-1 rounded-lg border py-2.5 text-xs font-semibold transition ${
                      on
                        ? "border-orange-500 bg-orange-50 text-orange-700"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    <WI size={18} />
                    {w.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Label className="text-xs">Blockers / issues</Label>
            <Input
              value={blockers} onChange={(e) => setBlockers(e.target.value)}
              placeholder="Any hold-ups, material pending, client approval needed…"
            />
          </div>

          <Button
            className="w-full py-5 text-base bg-orange-500 hover:bg-orange-600"
            onClick={() => setStep(2)}
            disabled={!canNext1}
            data-testid="erp-dpr-next-1"
          >
            Continue <ArrowRight size={16} className="ml-1" />
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <p className="text-sm text-slate-500 -mt-2">
            <Hammer size={13} className="inline mr-1 -mt-0.5" />
            Tap +/− to adjust worker counts by trade.
          </p>
          {TRADES.map((t) => (
            <div key={t} className="rounded-xl border border-slate-200 bg-white p-3.5">
              <div className="text-sm font-semibold text-slate-900 mb-2">
                {t[0] + t.slice(1).toLowerCase()}
              </div>
              <CountRow
                label="Skilled" value={counts[t].skilled}
                onChange={(n) => setCounts((c) => ({ ...c, [t]: { ...c[t], skilled: n } }))}
              />
              <CountRow
                label="Helper" value={counts[t].helper}
                onChange={(n) => setCounts((c) => ({ ...c, [t]: { ...c[t], helper: n } }))}
              />
            </div>
          ))}

          <div className="flex items-center justify-between rounded-xl bg-slate-900 text-white px-4 py-3 mt-2">
            <span className="text-sm font-medium text-slate-300">Total on site</span>
            <span className="text-lg font-bold tabular-nums">{totalLabour}</span>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => setStep(1)} className="flex-1 py-5 text-base">
              <ArrowLeft size={16} className="mr-1" /> Back
            </Button>
            <Button
              onClick={() => setStep(3)}
              className="flex-1 py-5 text-base bg-orange-500 hover:bg-orange-600"
              data-testid="erp-dpr-next-2"
            >
              Continue <ArrowRight size={16} className="ml-1" />
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
            <strong>Minimum 2 photos</strong> · max 10 · auto-compressed to ~150&nbsp;KB each.
          </div>

          <div className="grid grid-cols-3 gap-2">
            {photos.map((p, i) => (
              <div key={i} className="relative aspect-square rounded-lg overflow-hidden ring-1 ring-slate-200">
                <img src={p.preview} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  className="absolute top-1 right-1 rounded-full bg-black/60 hover:bg-black/80 text-white p-1"
                  aria-label="Remove"
                >
                  <X size={12} />
                </button>
                <div className="absolute bottom-1 left-1 rounded-full bg-emerald-600 text-white p-1">
                  <Check size={10} />
                </div>
              </div>
            ))}
            {photos.length < 10 && (
              <label
                className={`flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed transition ${
                  uploading
                    ? "border-orange-300 bg-orange-50"
                    : "border-slate-300 bg-white hover:border-orange-400 hover:bg-orange-50"
                }`}
              >
                <Camera size={20} className="text-slate-500" />
                <span className="text-[10px] text-slate-500">
                  {uploading ? "Compressing…" : "Add photo"}
                </span>
                <input
                  type="file" accept="image/*" capture="environment"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) addPhoto(f);
                    e.target.value = "";
                  }}
                  data-testid="erp-dpr-photo-input"
                />
              </label>
            )}
          </div>
          <p className="text-xs text-slate-500">{photos.length}/10 attached</p>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline" onClick={() => setStep(2)}
              className="flex-1 py-5 text-base" disabled={busy}
            >
              <ArrowLeft size={16} className="mr-1" /> Back
            </Button>
            <Button
              onClick={submit}
              disabled={photos.length < 2 || busy}
              className="flex-1 py-5 text-base bg-orange-500 hover:bg-orange-600"
              data-testid="erp-submit-dpr-btn"
            >
              {busy ? "Submitting…" : "Submit DPR"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function CountRow({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-slate-600">{label}</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(0, value - 1))}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-white text-lg font-bold text-slate-700 hover:border-orange-400 hover:text-orange-600 active:bg-orange-50"
        >−</button>
        <span className="w-8 text-center text-base font-semibold tabular-nums">{value}</span>
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-white text-lg font-bold text-slate-700 hover:border-orange-400 hover:text-orange-600 active:bg-orange-50"
        >+</button>
      </div>
    </div>
  );
}
