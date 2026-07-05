/**
 * ERP — shared page shell helpers.
 * Consistent page header, empty state, status chips, and async photo loader.
 */
import { useEffect, useState } from "react";
import { erpApi } from "@/lib/erp-api";
import { Card } from "@/components/ui/card";
import { ImageIcon } from "lucide-react";

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

export function ErpPhoto({ objectKey, alt = "", className = "" }) {
  const [src, setSrc] = useState(() => photoCache.get(objectKey) || null);
  const [failed, setFailed] = useState(false);

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
  return <img src={src} alt={alt} className={`object-cover ${className}`} loading="lazy" />;
}
