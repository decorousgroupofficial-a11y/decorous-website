import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-start justify-center gap-8 px-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-widest text-primary">
          Phase 0 — Scaffolding
        </p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">
          Decorous ERP
        </h1>
        <p className="mt-4 max-w-xl text-base text-slate-600">
          Construction ERP + execution platform. Isolated from the marketing site.
          Ledger code is frozen until CA sign-off (see{' '}
          <code className="rounded bg-slate-200 px-1 font-mono text-xs">
            docs/erp/09-cto-review-amendments.md
          </code>
          ).
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/login"
          className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
          data-testid="home-login-btn"
        >
          Sign in
        </Link>
        <a
          href="/docs"
          className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
          data-testid="home-api-docs-btn"
        >
          API docs
        </a>
      </div>

      <div className="mt-10 w-full rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-base font-semibold">Phase 0 modules live</h2>
        <ul className="mt-3 grid grid-cols-2 gap-2 text-sm text-slate-700">
          <li>• Auth + RBAC</li>
          <li>• Orgs + Users</li>
          <li>• Projects</li>
          <li>• Vendors</li>
          <li>• Materials</li>
          <li>• DPR (sacred)</li>
          <li>• Expenses (no ledger)</li>
          <li>• Approvals (maker-checker)</li>
        </ul>
        <p className="mt-4 text-xs text-slate-500">
          Ledger · Bills · Payments · Sync — intentionally out of scope.
        </p>
      </div>
    </main>
  );
}
