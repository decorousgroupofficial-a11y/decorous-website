import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { erpApi } from "@/lib/erp-api";

const ROLES = ["OWNER", "ACCOUNTANT", "PM", "ENGINEER", "STOREKEEPER", "VIEWER"];

export default function ErpSettingsPage() {
  const [org, setOrg] = useState(null);
  const [members, setMembers] = useState([]);
  const [invOpen, setInvOpen] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);

  async function reload() {
    setOrg(await erpApi.getMyOrg());
    setMembers(await erpApi.listMembers());
  }
  useEffect(() => { reload(); }, []);

  return (
    <div className="space-y-6" data-testid="erp-settings-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Settings</h1>
          <p className="text-sm text-slate-500 mt-1">Organisation, members, your approval PIN.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setPinOpen(true)}>Set my PIN</Button>
          <Button onClick={() => setInvOpen(true)}>+ Invite member</Button>
        </div>
      </div>

      {org && (
        <Card className="p-5">
          <h2 className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Organisation</h2>
          <dl className="mt-3 grid sm:grid-cols-2 gap-3 text-sm">
            <div><dt className="text-xs text-slate-500">Name</dt><dd className="font-medium">{org.name}</dd></div>
            <div><dt className="text-xs text-slate-500">Slug</dt><dd className="font-mono text-xs">{org.slug}</dd></div>
            <div><dt className="text-xs text-slate-500">Currency</dt><dd>{org.currency}</dd></div>
            <div><dt className="text-xs text-slate-500">Timezone</dt><dd>{org.timezone}</dd></div>
          </dl>
        </Card>
      )}

      <Card className="p-0 overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-3">
          <h2 className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
            Members ({members.length})
          </h2>
        </div>
        {members.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">No members yet.</p>
        ) : (
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
              <tr><th className="px-5 py-3">Name</th><th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Role</th><th className="px-5 py-3">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {members.map((m) => (
                <tr key={m.id}>
                  <td className="px-5 py-3 font-medium">{m.user.full_name}</td>
                  <td className="px-5 py-3 text-slate-600">{m.user.email}</td>
                  <td className="px-5 py-3"><Badge variant="secondary">{m.role}</Badge></td>
                  <td className="px-5 py-3">
                    <Badge className={m.accepted_at ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-900"}>
                      {m.accepted_at ? "Active" : "Invited"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <InviteDialog open={invOpen} onOpenChange={setInvOpen} onDone={reload} />
      <PinDialog open={pinOpen} onOpenChange={setPinOpen} />
    </div>
  );
}

function InviteDialog({ open, onOpenChange, onDone }) {
  const [f, setF] = useState({ email: "", full_name: "", role: "ENGINEER", temp_password: "" });
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await erpApi.inviteMember(f);
      toast.success("Member invited");
      setF({ email: "", full_name: "", role: "ENGINEER", temp_password: "" });
      onOpenChange(false);
      onDone();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed");
    } finally { setBusy(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Invite member</DialogTitle></DialogHeader>
        <p className="text-xs text-slate-500">Share the temp password securely. User can change it later.</p>
        <form onSubmit={submit} className="space-y-3">
          <div><Label>Email *</Label>
            <Input type="email" required value={f.email}
              onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
          <div><Label>Full name *</Label>
            <Input required value={f.full_name}
              onChange={(e) => setF({ ...f, full_name: e.target.value })} /></div>
          <div>
            <Label>Role</Label>
            <select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}
              className="w-full border rounded-md px-3 py-2 text-sm">
              {ROLES.map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div><Label>Temporary password *</Label>
            <Input required minLength={8} value={f.temp_password}
              onChange={(e) => setF({ ...f, temp_password: e.target.value })} /></div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Inviting…" : "Invite"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PinDialog({ open, onOpenChange }) {
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (pin !== confirm) return toast.error("PINs do not match");
    if (!/^\d{4}$/.test(pin)) return toast.error("PIN must be 4 digits");
    setBusy(true);
    try {
      await erpApi.setPin(pin);
      setDone(true);
      toast.success("PIN saved");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed");
    } finally { setBusy(false); }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { setPin(""); setConfirm(""); setDone(false); } onOpenChange(v); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Set approval PIN</DialogTitle></DialogHeader>
        <p className="text-xs text-slate-500">4 digits. Required for approvals ≥ ₹50,000.</p>
        {done ? (
          <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">
            ✓ PIN saved. Use it on your next high-value approval.
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <div><Label>New PIN</Label>
              <Input type="password" inputMode="numeric" pattern="[0-9]*" maxLength={4} required
                value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} /></div>
            <div><Label>Confirm PIN</Label>
              <Input type="password" inputMode="numeric" pattern="[0-9]*" maxLength={4} required
                value={confirm} onChange={(e) => setConfirm(e.target.value.replace(/\D/g, ""))} /></div>
            <Button type="submit" className="w-full" disabled={busy || !pin || !confirm}>
              {busy ? "Saving…" : "Set PIN"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
