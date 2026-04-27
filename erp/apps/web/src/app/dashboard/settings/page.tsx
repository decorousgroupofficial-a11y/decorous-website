'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { useApi } from '@/lib/use-api';
import { Badge, Button, Card, Input, PageHeader } from '@/components/ui';

type Role = 'OWNER' | 'ACCOUNTANT' | 'PM' | 'ENGINEER' | 'STOREKEEPER' | 'VIEWER';

type Member = {
  id: string;
  role: Role;
  acceptedAt: string | null;
  user: { id: string; email: string; fullName: string; isActive: boolean };
};

const ROLES: Role[] = ['OWNER', 'ACCOUNTANT', 'PM', 'ENGINEER', 'STOREKEEPER', 'VIEWER'];

const ROLE_TONE: Record<Role, 'success' | 'info' | 'warning' | 'neutral'> = {
  OWNER: 'success',
  ACCOUNTANT: 'info',
  PM: 'info',
  ENGINEER: 'warning',
  STOREKEEPER: 'warning',
  VIEWER: 'neutral',
};

export default function SettingsPage() {
  const org = useApi<{ name: string; slug: string; timezone: string; currency: string }>(
    '/v1/orgs/me',
  );
  const members = useApi<Member[]>('/v1/users');
  const [invite, setInvite] = useState(false);
  const [pinModal, setPinModal] = useState(false);

  return (
    <div className="space-y-8" data-testid="settings-page">
      <PageHeader
        title="Settings"
        description="Organisation, members, and your security PIN."
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setPinModal(true)}>
              Set my PIN
            </Button>
            <Button onClick={() => setInvite(true)}>+ Invite member</Button>
          </div>
        }
      />

      {/* Org info */}
      <Card>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
          Organisation
        </h2>
        {org.loading && <p className="mt-3 text-sm text-slate-500">Loading…</p>}
        {org.data && (
          <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Row label="Name" value={org.data.name} />
            <Row label="Slug" value={org.data.slug} mono />
            <Row label="Currency" value={org.data.currency} />
            <Row label="Timezone" value={org.data.timezone} />
          </dl>
        )}
      </Card>

      {/* Members */}
      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            Members ({members.data?.length ?? 0})
          </h2>
        </div>
        {members.data && members.data.length > 0 ? (
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {members.data.map((m) => (
                <tr key={m.id}>
                  <td className="px-5 py-3 font-medium">{m.user.fullName}</td>
                  <td className="px-5 py-3 text-slate-600">{m.user.email}</td>
                  <td className="px-5 py-3">
                    <Badge tone={ROLE_TONE[m.role]}>{m.role}</Badge>
                  </td>
                  <td className="px-5 py-3">
                    <Badge tone={m.acceptedAt ? 'success' : 'warning'}>
                      {m.acceptedAt ? 'Active' : 'Invited'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="px-5 py-6 text-sm text-slate-500">No members yet.</p>
        )}
      </Card>

      {invite && (
        <InviteDialog
          onClose={() => setInvite(false)}
          onDone={() => {
            setInvite(false);
            members.refetch();
          }}
        />
      )}

      {pinModal && <PinDialog onClose={() => setPinModal(false)} />}
    </div>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className={`mt-0.5 text-sm ${mono ? 'font-mono' : 'font-medium'}`}>
        {value}
      </dd>
    </div>
  );
}

function InviteDialog({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: () => void;
}) {
  const [f, setF] = useState({
    email: '',
    fullName: '',
    role: 'ENGINEER' as Role,
    tempPassword: '',
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await apiClient.post('/v1/users/invite', f);
      onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
      >
        <h2 className="text-lg font-semibold">Invite member</h2>
        <p className="mt-1 text-xs text-slate-500">
          Share the temporary password securely. User must change it on first
          login.
        </p>

        <div className="mt-4 space-y-3">
          <Input
            label="Email"
            type="email"
            required
            value={f.email}
            onChange={(e) => setF({ ...f, email: e.target.value })}
          />
          <Input
            label="Full name"
            required
            value={f.fullName}
            onChange={(e) => setF({ ...f, fullName: e.target.value })}
          />
          <label className="block text-sm font-medium">
            <span className="mb-1 block">Role</span>
            <select
              value={f.role}
              onChange={(e) => setF({ ...f, role: e.target.value as Role })}
              className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <Input
            label="Temporary password"
            required
            minLength={8}
            value={f.tempPassword}
            onChange={(e) => setF({ ...f, tempPassword: e.target.value })}
          />
        </div>

        {err && <p className="mt-3 text-sm text-red-600">{err}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? 'Sending…' : 'Invite'}
          </Button>
        </div>
      </form>
    </div>
  );
}

function PinDialog({ onClose }: { onClose: () => void }) {
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pin !== confirm) return setErr('PINs do not match');
    if (!/^\d{4}$/.test(pin)) return setErr('PIN must be exactly 4 digits');
    setBusy(true);
    setErr(null);
    try {
      await apiClient.post('/v1/users/pin', { pin });
      setDone(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
      >
        <h2 className="text-lg font-semibold">Set approval PIN</h2>
        <p className="mt-1 text-xs text-slate-500">
          4 digits. Required to approve transactions ≥ ₹50,000.
        </p>

        {done ? (
          <div className="mt-4 rounded-md bg-green-50 p-3 text-sm text-green-700">
            ✓ PIN saved. Use it on your next high-value approval.
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <Input
              label="New PIN"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              required
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            />
            <Input
              label="Confirm PIN"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value.replace(/\D/g, ''))}
            />
          </div>
        )}

        {err && <p className="mt-3 text-sm text-red-600">{err}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
            {done ? 'Close' : 'Cancel'}
          </Button>
          {!done && (
            <Button type="submit" disabled={busy || !pin || !confirm}>
              {busy ? 'Saving…' : 'Set PIN'}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
