/**
 * ERP — shared page shell helpers.
 * Consistent page header, empty state, status chips, and async photo loader.
 */
import { Children, cloneElement, isValidElement, useCallback, useEffect, useId, useRef, useState } from "react";
import { erpApi, erpAuth, fileToCompressedBase64 } from "@/lib/erp-api";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ImageIcon, Camera, X, Check } from "lucide-react";

export function ErpPageHeader({ eyebrow, title, description, action }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4 flex-wrap border-b border-slate-200 pb-5">
      <div>
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-widest text-orange-600">
            {eyebrow}
          </p>
        )}
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-1" data-testid="erp-page-title">
          {title}
        </h1>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {action && <div className="flex gap-2">{action}</div>}
    </div>
  );
}

export function ErpEmptyState({ icon: Icon, title, desc, action }) {
  return (
    <Card className="p-12 text-center border-dashed" data-testid="erp-empty-state">
      {Icon && (
        <div className="mx-auto mb-4 h-14 w-14 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center">
          <Icon size={24} />
        </div>
      )}
      <p className="font-semibold text-slate-900">{title}</p>
      {desc && <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">{desc}</p>}
      {action && <div className="mt-4 inline-flex">{action}</div>}
    </Card>
  );
}

export function ErpMiniStat({ label, value, accent }) {
  const tone = accent === "orange"
    ? "border-orange-200 bg-orange-50"
    : "border-slate-200 bg-white";
  return (
    <div className={`rounded-lg border ${tone} px-4 py-3`}>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div className="mt-0.5 text-lg font-bold tabular-nums">{value}</div>
    </div>
  );
}

const STATUS_STYLES = {
  PLANNED: "bg-blue-50 text-blue-700 ring-blue-200",
  ACTIVE: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  ON_HOLD: "bg-amber-50 text-amber-800 ring-amber-200",
  COMPLETED: "bg-slate-100 text-slate-700 ring-slate-200",
  ARCHIVED: "bg-slate-50 text-slate-500 ring-slate-200",
  DRAFT: "bg-slate-100 text-slate-700 ring-slate-200",
  PENDING: "bg-amber-50 text-amber-800 ring-amber-200",
  APPROVED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  REJECTED: "bg-rose-50 text-rose-700 ring-rose-200",
  VOID: "bg-slate-50 text-slate-400 ring-slate-200",
  PAID: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  PARTIAL: "bg-amber-50 text-amber-800 ring-amber-200",
  UNPAID: "bg-slate-100 text-slate-700 ring-slate-200",
  OVERDUE: "bg-rose-50 text-rose-700 ring-rose-200",
  LOW: "bg-rose-50 text-rose-700 ring-rose-200",
};

export function ErpStatusPill({ status }) {
  const style = STATUS_STYLES[status] || "bg-slate-50 text-slate-600 ring-slate-200";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${style}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {status}
    </span>
  );
}

/**
 * Async-loads an inline upload by object_key and renders it.
 * Falls back to a lucide placeholder while loading / on error.
 */
const photoCache = new Map();

export function ErpPhoto({ objectKey, alt = "", className = "", zoomable = false }) {
  const [src, setSrc] = useState(() => photoCache.get(objectKey) || null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!objectKey || photoCache.has(objectKey)) return;
    let alive = true;
    erpApi
      .getUpload(objectKey)
      .then((r) => {
        if (!alive) return;
        photoCache.set(objectKey, r.data_url);
        setSrc(r.data_url);
      })
      .catch(() => alive && setFailed(true));
    return () => { alive = false; };
  }, [objectKey]);

  if (failed || !objectKey) {
    return (
      <div className={`flex items-center justify-center bg-slate-100 text-slate-400 ${className}`}>
        <ImageIcon size={16} />
      </div>
    );
  }
  if (!src) {
    return <div className={`animate-pulse bg-slate-200 ${className}`} />;
  }
  if (!zoomable) {
    return <img src={src} alt={alt} className={`object-cover ${className}`} loading="lazy" />;
  }
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="block cursor-zoom-in" aria-label="Enlarge photo">
        <img src={src} alt={alt} className={`object-cover ${className}`} loading="lazy" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl p-2">
          <DialogHeader className="sr-only"><DialogTitle>Photo</DialogTitle></DialogHeader>
          <img src={src} alt={alt} className="max-h-[80vh] w-full rounded object-contain" />
        </DialogContent>
      </Dialog>
    </>
  );
}


/**
 * Role helper. Role is re-read from the server by the layout (see ErpLayout), so
 * this reflects a role change without a re-login. OWNER can always do everything,
 * mirroring the backend's require_role().
 */
export function useErpRole() {
  const role = erpAuth.user?.role;
  const can = (...roles) => role === "OWNER" || roles.includes(role);
  return { role, can };
}

/**
 * Load-on-mount data with reload(). Re-fetches whenever `deps` change (they should be
 * primitives — ids, filters, a version counter). The latest `fn` is always used, so the
 * closure can never be stale.
 */
export function useErpData(fn, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const alive = useRef(true);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const depsKey = JSON.stringify(deps);          // re-fetch trigger: changes when any dep changes
  const run = useCallback(async () => {
    setLoading(true);
    try {
      const d = await fnRef.current();
      if (alive.current) { setData(d); setError(null); }
    } catch (e) {
      if (alive.current) setError(e.response?.data?.detail || e.message || "Failed to load");
    } finally {
      if (alive.current) setLoading(false);
    }
  }, []);
  useEffect(() => { run(); }, [run, depsKey]);
  return { data, loading, error, reload: run, setData };
}

export function apiError(err, fallback = "Something went wrong") {
  const d = err?.response?.data?.detail;
  if (typeof d === "string") return d;
  if (Array.isArray(d) && d[0]?.msg) return d.map((x) => x.msg).join("; ");
  return fallback;
}

/** Budget bar: green under 80%, amber 80–100%, red over budget. */
export function ErpBudgetBar({ pct, className = "" }) {
  if (pct == null) return <div className={`text-xs text-slate-400 ${className}`}>No budget set</div>;
  const w = Math.min(pct, 100);
  const tone = pct > 100 ? "bg-rose-500" : pct >= 80 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className={className}>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${w}%` }} />
      </div>
      <div className={`mt-1 text-[11px] font-semibold tabular-nums ${pct > 100 ? "text-rose-600" : "text-slate-500"}`}>
        {pct}% of budget used
      </div>
    </div>
  );
}

export function ErpField({ label, hint, children, className = "" }) {
  // Link the label to its control (screen readers announce it; clicking the label focuses
  // the field). Only done for a single simple control — composite widgets such as the
  // photo picker keep a plain, un-associated caption.
  const id = useId();
  const only = Children.count(children) === 1 && isValidElement(children) ? children : null;
  const linkable = only && typeof only.type !== "function" ? true : only && only.type !== ErpPhotoPicker;
  const control = linkable ? cloneElement(only, { id: only.props.id || id }) : children;
  const htmlFor = linkable ? only.props.id || id : undefined;
  return (
    <div className={className}>
      {label && (htmlFor
        ? <label htmlFor={htmlFor} className="mb-1 block text-xs font-medium text-slate-700">{label}</label>
        : <div className="mb-1 block text-xs font-medium text-slate-700">{label}</div>)}
      {control}
      {hint && <p className="mt-1 text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
}

export const selectClass =
  "block w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500";

export function ErpSelect({ value, onChange, children, ...rest }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={selectClass} {...rest}>
      {children}
    </select>
  );
}

export function ErpLoading({ label = "Loading…" }) {
  return <Card className="p-10 text-center text-sm text-slate-500">{label}</Card>;
}

/**
 * Photo attachments, uploaded to the server as they are picked.
 * `value` is [{ key, preview }]; the parent only ever stores keys the server confirmed,
 * which is what lets the backend guarantee every attached bill/photo really exists.
 */
export function ErpPhotoPicker({ kind, value, onChange, max = 4, min = 0, label = "Add photo", capture = true }) {
  const [uploading, setUploading] = useState(false);

  async function add(file) {
    if (!file) return;
    setUploading(true);
    try {
      const b64 = await fileToCompressedBase64(file, { maxDim: 1280, quality: 0.72 });
      const { object_key } = await erpApi.uploadInline({ kind, content_type: "image/jpeg", data_base64: b64 });
      onChange([...value, { key: object_key, preview: `data:image/jpeg;base64,${b64}` }]);
    } catch (err) {
      toast.error(apiError(err, "Photo upload failed"));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <div className="grid grid-cols-4 gap-2">
        {value.map((p, i) => (
          <div key={p.key} className="relative aspect-square overflow-hidden rounded-lg ring-1 ring-slate-200">
            <img src={p.preview} alt="" className="h-full w-full object-cover" />
            <button type="button" aria-label="Remove photo"
              onClick={() => onChange(value.filter((_, idx) => idx !== i))}
              className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80">
              <X size={11} />
            </button>
            <div className="absolute bottom-1 left-1 rounded-full bg-emerald-600 p-0.5 text-white"><Check size={9} /></div>
          </div>
        ))}
        {value.length < max && (
          <label className={`flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-center transition ${
            uploading ? "border-orange-300 bg-orange-50" : "border-slate-300 bg-white hover:border-orange-400 hover:bg-orange-50"}`}>
            <Camera size={18} className="text-slate-500" />
            <span className="px-1 text-[10px] leading-tight text-slate-500">{uploading ? "Uploading…" : label}</span>
            <input type="file" accept="image/*" {...(capture ? { capture: "environment" } : {})} className="hidden"
              disabled={uploading} data-testid={`erp-photo-input-${kind}`}
              onChange={(e) => { add(e.target.files?.[0]); e.target.value = ""; }} />
          </label>
        )}
      </div>
      {min > 0 && value.length < min && (
        <p className="mt-1.5 text-[11px] text-amber-700">Attach at least {min} photo{min > 1 ? "s" : ""}.</p>
      )}
    </div>
  );
}


/** Apply the ERP's shadcn token scope to <body> while an ERP screen is mounted (see index.css). */
export function useErpTheme() {
  useEffect(() => {
    document.body.classList.add("erp-theme");
    return () => document.body.classList.remove("erp-theme");
  }, []);
}
