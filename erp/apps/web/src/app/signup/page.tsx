'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';

export default function SignupPage() {
  const router = useRouter();
  const [f, setF] = useState({
    orgName: '',
    fullName: '',
    email: '',
    password: '',
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await apiClient.post('/v1/auth/signup', f);
      localStorage.setItem('accessToken', res.accessToken);
      localStorage.setItem('refreshToken', res.refreshToken);
      router.push('/dashboard');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Signup failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm"
        data-testid="signup-form"
      >
        <h1 className="text-2xl font-bold">Create org</h1>
        <p className="mt-1 text-sm text-slate-500">Decorous ERP · Phase 0</p>

        <label className="mt-6 block text-sm font-medium">
          <span className="mb-1 block">Organisation name</span>
          <input
            required
            value={f.orgName}
            onChange={(e) => setF({ ...f, orgName: e.target.value })}
            className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>

        <label className="mt-4 block text-sm font-medium">
          <span className="mb-1 block">Your name</span>
          <input
            required
            value={f.fullName}
            onChange={(e) => setF({ ...f, fullName: e.target.value })}
            className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>

        <label className="mt-4 block text-sm font-medium">
          <span className="mb-1 block">Email</span>
          <input
            type="email"
            required
            value={f.email}
            onChange={(e) => setF({ ...f, email: e.target.value })}
            className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>

        <label className="mt-4 block text-sm font-medium">
          <span className="mb-1 block">Password</span>
          <input
            type="password"
            required
            minLength={8}
            value={f.password}
            onChange={(e) => setF({ ...f, password: e.target.value })}
            className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <span className="mt-1 block text-xs text-slate-500">
            Min 8 characters.
          </span>
        </label>

        {err && <p className="mt-3 text-sm text-red-600">{err}</p>}

        <button
          type="submit"
          disabled={busy}
          className="mt-6 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-50"
        >
          {busy ? 'Creating…' : 'Create org'}
        </button>

        <p className="mt-4 text-center text-xs text-slate-500">
          Already have an account?{' '}
          <Link href="/login" className="text-primary underline">
            Sign in
          </Link>
        </p>
      </form>
    </main>
  );
}
