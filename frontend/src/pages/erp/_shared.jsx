/**
 * ERP — shared page shell helpers.
 * Provides a consistent top-of-page pattern used across Projects/Vendors/etc.
 */
export function ErpPageHeader({ eyebrow, title, description, action }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4 flex-wrap border-b border-slate-200 pb-5">
      <div>
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-widest text-orange-600">
            {eyebrow}
          </p>
        )}
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-1">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {action && <div className="flex gap-2">{action}</div>}
    </div>
  );
}
