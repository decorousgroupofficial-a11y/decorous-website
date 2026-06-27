import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { erpAuth } from "@/lib/erp-api";
import {
  LayoutDashboard, Briefcase, Users, Package, ClipboardList, Wallet,
  CheckCircle2, Settings, LogOut, HardHat,
} from "lucide-react";

const NAV = [
  { href: "/erp", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/erp/projects", label: "Projects", icon: Briefcase },
  { href: "/erp/dpr", label: "Daily Reports", icon: ClipboardList },
  { href: "/erp/expenses", label: "Expenses", icon: Wallet },
  { href: "/erp/approvals", label: "Approvals", icon: CheckCircle2, showBadge: true },
  { href: "/erp/vendors", label: "Vendors", icon: Users },
  { href: "/erp/materials", label: "Materials", icon: Package },
  { href: "/erp/settings", label: "Settings", icon: Settings },
];

export default function ErpLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = erpAuth.user;

  useEffect(() => { if (!erpAuth.token) navigate("/erp/login"); }, [navigate]);

  const isActive = (item) =>
    item.exact
      ? location.pathname === item.href
      : location.pathname === item.href || location.pathname.startsWith(item.href + "/");

  function logout() { erpAuth.clear(); navigate("/erp/login"); }
  if (!user) return null;

  const initials = (user.full_name || user.email || "?")
    .split(/\s+/).map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="min-h-screen grid grid-cols-[260px_1fr] bg-slate-50" data-testid="erp-layout">
      {/* ERP is an internal application — do NOT index any of its routes. */}
      <Helmet>
        <meta name="robots" content="noindex, nofollow, noarchive, nosnippet" />
        <meta name="googlebot" content="noindex, nofollow" />
        <title>Decorous ERP</title>
      </Helmet>
      {/* Sidebar */}
      <aside className="bg-slate-900 text-slate-300 flex flex-col px-3 py-5 sticky top-0 h-screen">
        <div className="flex items-center gap-2 px-3 mb-8">
          <div className="h-9 w-9 rounded-lg bg-orange-500 flex items-center justify-center">
            <HardHat className="text-white" size={20} />
          </div>
          <div>
            <div className="text-white font-bold tracking-tight leading-none">Decorous</div>
            <div className="text-[10px] uppercase tracking-widest text-orange-400 mt-1">ERP</div>
          </div>
        </div>

        <nav className="flex flex-col gap-0.5 text-sm flex-1">
          {NAV.map((n) => {
            const Icon = n.icon;
            const active = isActive(n);
            return (
              <Link
                key={n.href}
                to={n.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition relative ${
                  active
                    ? "bg-orange-500 text-white font-medium shadow-lg shadow-orange-500/20"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
                data-testid={`erp-sidebar-${n.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <Icon size={18} strokeWidth={active ? 2.5 : 2} />
                <span>{n.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-4 px-3 py-3 bg-slate-800 rounded-lg">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-xs font-bold">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-white text-sm font-medium truncate">{user.full_name || user.email}</div>
              <div className="text-[10px] uppercase tracking-wider text-orange-400 font-semibold">{user.role}</div>
            </div>
          </div>
          <button
            onClick={logout}
            className="mt-3 w-full flex items-center justify-center gap-2 rounded-md py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-700"
            data-testid="erp-logout-btn"
          >
            <LogOut size={13} /> Logout
          </button>
        </div>

        <div className="mt-3 text-[10px] text-slate-500 px-3">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            Ledger frozen · CA pending
          </span>
        </div>
      </aside>

      {/* Main */}
      <main className="overflow-x-hidden">
        <div className="p-6 sm:p-8 max-w-[1400px] mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
