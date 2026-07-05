import Link from 'next/link';

const NAV = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/dashboard/projects', label: 'Projects' },
  { href: '/dashboard/vendors', label: 'Vendors' },
  { href: '/dashboard/materials', label: 'Materials' },
  { href: '/dashboard/dpr', label: 'DPR' },
  { href: '/dashboard/expenses', label: 'Expenses' },
  { href: '/dashboard/approvals', label: 'Approvals' },
  { href: '/dashboard/settings', label: 'Settings' },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen grid-cols-[240px_1fr] bg-slate-50">
      <aside className="border-r border-slate-200 bg-white px-4 py-6">
        <div className="mb-8 text-lg font-bold">Decorous ERP</div>
        <nav className="flex flex-col gap-1 text-sm">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="rounded-md px-3 py-2 text-slate-700 transition hover:bg-slate-100"
              data-testid={`sidebar-${n.label.toLowerCase()}-link`}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="mt-10 rounded-md bg-amber-50 p-3 text-xs text-amber-900">
          <strong>Ledger freeze:</strong> no financial posting until CA sign-off.
        </div>
      </aside>
      <main className="p-8">{children}</main>
    </div>
  );
}
