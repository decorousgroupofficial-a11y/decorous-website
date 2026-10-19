import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { erpAuth, erpApi } from "@/lib/erp-api";
import { useErpTheme } from "./_shared";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  LayoutDashboard, Briefcase, Users, Package, ClipboardList, Wallet, CheckCircle2,
  Settings, LogOut, HardHat, Menu, CalendarCheck, Contact, Plus,
} from "lucide-react";

// Grouped like Onsite / RDash: what happens on site, what moves in the store,
// where the money goes, and the controls that guard it.
const NAV_GROUPS = [
  {
    label: "Workspace",
    items: [
      { href: "/erp", label: "Overview", icon: LayoutDashboard, exact: true },
      { href: "/erp/projects", label: "Projects", icon: Briefcase },
    ],
  },
  {
    label: "Site",
    items: [
      { href: "/erp/dpr", label: "Daily Reports", icon: ClipboardList },
      { href: "/erp/attendance", label: "Attendance", icon: CalendarCheck },
      { href: "/erp/labour", label: "Workers & Wages", icon: Contact },
      { href: "/erp/materials", label: "Stock & Materials", icon: Package },
    ],
  },
  {
    label: "Money",
    items: [
      { href: "/erp/expenses", label: "Expenses", icon: Wallet },
      { href: "/erp/vendors", label: "Vendors & Bills", icon: Users },
    ],
  },
  {
    label: "Control",
    items: [
      { href: "/erp/approvals", label: "Approvals", icon: CheckCircle2, showBadge: true },
      { href: "/erp/settings", label: "Settings", icon: Settings },
    ],
  },
];

// The five things a supervisor does all day, one thumb away on a phone.
const BOTTOM_TABS = [
  { href: "/erp", label: "Home", icon: LayoutDashboard, exact: true },
  { href: "/erp/dpr", label: "Reports", icon: ClipboardList },
  { href: "/erp/attendance", label: "Attendance", icon: CalendarCheck },
  { href: "/erp/approvals", label: "Approvals", icon: CheckCircle2, showBadge: true },
];

export default function ErpLayout() {
  useErpTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const user = erpAuth.user;
  const [menuOpen, setMenuOpen] = useState(false);
  const [badge, setBadge] = useState(0);

  useEffect(() => { if (!erpAuth.token) navigate("/erp/login"); }, [navigate]);

  // Re-read the role from the server so a role change shows up without re-login
  // (the API already enforces the live role; this keeps the UI honest too).
  useEffect(() => {
    if (!erpAuth.token) return;
    erpApi.me().then((m) => erpAuth.update({ role: m.role, full_name: m.full_name })).catch(() => {});
  }, []);

  // Approvals badge = items *you* can decide, refreshed every minute and on navigation.
  useEffect(() => {
    if (!erpAuth.token) return undefined;
    let alive = true;
    const load = () => erpApi.overview().then((o) => alive && setBadge(o.awaiting_my_decision || 0)).catch(() => {});
    load();
    const t = setInterval(load, 60000);
    return () => { alive = false; clearInterval(t); };
  }, [location.pathname]);

  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  const isActive = (item) =>
    item.exact
      ? location.pathname === item.href
      : location.pathname === item.href || location.pathname.startsWith(item.href + "/");

  function logout() { erpAuth.clear(); navigate("/erp/login"); }
  if (!user) return null;

  const initials = (user.full_name || user.email || "?")
    .split(/\s+/).map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  const NavLinks = ({ onNavigate }) => (
    <nav className="flex flex-1 flex-col gap-5 overflow-y-auto text-sm">
      {NAV_GROUPS.map((g) => (
        <div key={g.label}>
          <div className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500">{g.label}</div>
          <div className="flex flex-col gap-0.5">
            {g.items.map((n) => {
              const Icon = n.icon;
              const active = isActive(n);
              return (
                <Link
                  key={n.href} to={n.href} onClick={onNavigate}
                  className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 transition ${
                    active
                      ? "bg-orange-500 font-medium text-white shadow-lg shadow-orange-500/20"
                      : "text-slate-400 hover:bg-slate-800 hover:text-white"
                  }`}
                  data-testid={`erp-sidebar-${n.label.toLowerCase().replace(/[^a-z]+/g, "-")}`}
                >
                  <Icon size={18} strokeWidth={active ? 2.5 : 2} />
                  <span className="flex-1">{n.label}</span>
                  {n.showBadge && badge > 0 && (
                    <span className="min-w-[20px] rounded-full bg-amber-400 px-1.5 text-center text-[11px] font-bold text-slate-900" data-testid="erp-approvals-badge">
                      {badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  const UserCard = () => (
    <div className="rounded-lg bg-slate-800 px-3 py-3">
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-xs font-bold text-white">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-white">{user.full_name || user.email}</div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-orange-400">{user.role}</div>
        </div>
      </div>
      <button onClick={logout} data-testid="erp-logout-btn"
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-md py-2 text-xs text-slate-300 hover:bg-slate-700 hover:text-white">
        <LogOut size={13} /> Logout
      </button>
    </div>
  );

  const Brand = () => (
    <div className="flex items-center gap-2">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-500"><HardHat className="text-white" size={20} /></div>
      <div>
        <div className="font-bold leading-none tracking-tight text-white">Decorous</div>
        <div className="mt-1 text-[10px] uppercase tracking-widest text-orange-400">ERP</div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-[260px_1fr]" data-testid="erp-layout">
      {/* ERP is an internal application — do NOT index any of its routes. */}
      <Helmet>
        <meta name="robots" content="noindex, nofollow, noarchive, nosnippet" />
        <meta name="googlebot" content="noindex, nofollow" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <title>Decorous ERP</title>
      </Helmet>

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen flex-col bg-slate-900 px-3 py-5 text-slate-300 lg:flex">
        <div className="mb-6 px-3"><Brand /></div>
        <NavLinks />
        <div className="mt-4"><UserCard /></div>
        <div className="mt-3 px-3 text-[10px] text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> Ledger frozen · CA pending
          </span>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between bg-slate-900 px-4 py-3 lg:hidden">
        <Brand />
        <button onClick={() => setMenuOpen(true)} aria-label="Open menu" data-testid="erp-mobile-menu-btn"
          className="rounded-lg p-2 text-slate-200 hover:bg-slate-800"><Menu size={22} /></button>
      </header>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="flex w-[290px] flex-col gap-4 border-slate-800 bg-slate-900 p-4 text-slate-300">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <Brand />
          <NavLinks onNavigate={() => setMenuOpen(false)} />
          <UserCard />
        </SheetContent>
      </Sheet>

      <main className="min-w-0 overflow-x-hidden pb-24 lg:pb-0">
        <div className="mx-auto max-w-[1400px] p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom tabs */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden" data-testid="erp-bottom-nav">
        {BOTTOM_TABS.map((t) => {
          const Icon = t.icon;
          const active = isActive(t);
          return (
            <Link key={t.href} to={t.href}
              className={`relative flex flex-col items-center gap-0.5 py-2 text-[10px] font-semibold ${active ? "text-orange-600" : "text-slate-500"}`}>
              <Icon size={20} strokeWidth={active ? 2.6 : 2} />
              {t.label}
              {t.showBadge && badge > 0 && (
                <span className="absolute right-[22%] top-1 min-w-[16px] rounded-full bg-amber-400 px-1 text-center text-[10px] font-bold text-slate-900">{badge}</span>
              )}
            </Link>
          );
        })}
        <button onClick={() => setMenuOpen(true)} className="flex flex-col items-center gap-0.5 py-2 text-[10px] font-semibold text-slate-500">
          <Plus size={20} /> More
        </button>
      </nav>
    </div>
  );
}
