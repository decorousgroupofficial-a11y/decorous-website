import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { erpApi, erpAuth } from "@/lib/erp-api";

export default function ErpSignupPage() {
  const navigate = useNavigate();
  const [f, setF] = useState({ org_name: "", full_name: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await erpApi.signup(f);
      erpAuth.set(res);
      toast.success("Organisation created");
      navigate("/erp");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Signup failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-sm p-8">
        <p className="text-xs uppercase tracking-widest text-blue-700 font-semibold">
          Decorous ERP
        </p>
        <h1 className="text-2xl font-bold mt-1">Create organisation</h1>

        <form onSubmit={onSubmit} className="mt-6 space-y-3" data-testid="erp-signup-form">
          <div>
            <Label>Organisation name</Label>
            <Input required value={f.org_name}
              onChange={(e) => setF({ ...f, org_name: e.target.value })} />
          </div>
          <div>
            <Label>Your name</Label>
            <Input required value={f.full_name}
              onChange={(e) => setF({ ...f, full_name: e.target.value })} />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" required value={f.email}
              onChange={(e) => setF({ ...f, email: e.target.value })} />
          </div>
          <div>
            <Label>Password</Label>
            <Input type="password" required minLength={8} value={f.password}
              onChange={(e) => setF({ ...f, password: e.target.value })} />
            <p className="text-xs text-slate-500 mt-1">Min 8 characters</p>
          </div>
          <Button type="submit" className="w-full" disabled={busy}
            data-testid="erp-signup-submit-btn">
            {busy ? "Creating…" : "Create organisation"}
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-slate-500">
          Already have an account?{" "}
          <Link to="/erp/login" className="text-blue-700 underline">Sign in</Link>
        </p>
      </Card>
    </div>
  );
}
