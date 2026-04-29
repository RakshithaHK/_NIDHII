import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { LogOut, LayoutDashboard, Phone, FileText, Trophy, Gift, MessageCircle, ShieldCheck, Menu } from "lucide-react";
import { useState } from "react";

export default function Header() {
  const { user, signOut } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);

  const links = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, testid: "nav-dashboard" },
    { to: "/ivr", label: "Phone Line", icon: Phone, testid: "nav-ivr" },
    { to: "/reports", label: "Reports", icon: FileText, testid: "nav-reports" },
    { to: "/leaderboard", label: "Leaderboard", icon: Trophy, testid: "nav-leaderboard" },
    { to: "/rewards", label: "Rewards", icon: Gift, testid: "nav-rewards" },
    { to: "/chat", label: "Sahayak", icon: MessageCircle, testid: "nav-chat" },
  ];
  if (user?.role === "admin" || user?.role === "supervisor") {
    links.push({ to: "/admin", label: "Admin", icon: ShieldCheck, testid: "nav-admin" });
  }

  return (
    <header className="bg-[#FDFBF7] border-b-2 border-slate-900 sticky top-0 z-40" data-testid="app-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-4">
        <Link to="/" className="flex items-center gap-2 shrink-0" data-testid="logo-home-link">
          <div className="w-10 h-10 rounded-lg bg-[#E05A3D] border-2 border-slate-900 flex items-center justify-center text-white font-black text-xl shadow-[3px_3px_0_0_#0F172A] heading">N</div>
          <div>
            <div className="heading text-2xl font-black leading-none">Nidhii</div>
            <div className="text-[10px] tracking-[0.18em] uppercase text-slate-600 font-bold">Community Watch</div>
          </div>
        </Link>

        <nav className="hidden lg:flex items-center gap-1 ml-6">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              data-testid={l.testid}
              className={({ isActive }) =>
                `px-3 py-2 text-sm font-bold rounded-lg flex items-center gap-2 ${isActive ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"}`
              }
            >
              <l.icon className="w-4 h-4" strokeWidth={2.5} />{l.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {user && (
            <>
              <div className="hidden sm:flex flex-col items-end leading-tight">
                <span className="font-bold text-sm" data-testid="user-name">{user.name}</span>
                <span className="text-xs text-slate-500 uppercase tracking-wider">{user.role}</span>
              </div>
              <button
                onClick={() => { signOut(); nav("/"); }}
                className="civic-btn civic-btn-ghost !py-2 !px-3"
                data-testid="logout-button"
              >
                <LogOut className="w-4 h-4" strokeWidth={2.5} />
              </button>
            </>
          )}
          <button className="lg:hidden civic-btn civic-btn-ghost !py-2 !px-3" onClick={() => setOpen(!open)} data-testid="mobile-menu-toggle">
            <Menu className="w-5 h-5" strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden border-t-2 border-slate-900 bg-white px-4 py-3 grid grid-cols-2 gap-2" data-testid="mobile-menu">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              onClick={() => setOpen(false)}
              data-testid={`mobile-${l.testid}`}
              className={({ isActive }) =>
                `px-3 py-3 text-sm font-bold rounded-lg flex items-center gap-2 border-2 ${isActive ? "bg-slate-900 text-white border-slate-900" : "border-slate-300"}`
              }
            >
              <l.icon className="w-4 h-4" strokeWidth={2.5} />{l.label}
            </NavLink>
          ))}
        </div>
      )}
    </header>
  );
}
