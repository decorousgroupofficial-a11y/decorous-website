import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { erpApi, erpAuth } from "@/lib/erp-api";

export default function ErpLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await erpApi.login({ email, password });
      erpAuth.set(res);
      toast.success("Welcome back");
      navigate("/erp");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <Helmet>
        <meta name="robots" content="noindex, nofollow, noarchive, nosnippet" />
        <meta name="googlebot" content="noindex, nofollow" />
        <title>Decorous ERP — Login</title>
      </Helmet>
      <Card className="w-full max-w-sm p-8">
        <p className="text-xs uppercase tracking-widest text-blue-700 font-semibold">
          Decorous ERP
        </p>
        <h1 className="text-2xl font-bold mt-1">Sign in</h1>
        <p className="mt-1 text-sm text-slate-500">
          Internal construction platform
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4" data-testid="erp-login-form">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              data-testid="erp-email-input"
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              data-testid="erp-password-input"
            />
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={busy}
            data-testid="erp-login-submit-btn"
          >
            {busy ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-slate-500">
          No account?{" "}
          <Link to="/erp/signup" className="text-blue-700 underline">
            Create organisation
          </Link>
        </p>
      </Card>
    </div>
  );
}
