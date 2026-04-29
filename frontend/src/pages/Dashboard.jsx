import { useEffect, useState } from "react";
import api from "../lib/api";
import { useAuth } from "../lib/auth";
import { useI18n } from "../lib/i18n";
import { Link } from "react-router-dom";
import { Droplets, Zap, Trash2, Trophy, Gift, Phone, Plus, IndianRupee } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Legend } from "recharts";

export default function Dashboard() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [stats, setStats] = useState(null);
  const [weekly, setWeekly] = useState([]);
  const [leaders, setLeaders] = useState([]);
  const [mine, setMine] = useState([]);

  useEffect(() => {
    Promise.all([
      api.get("/stats/overview").then(r => setStats(r.data)),
      api.get("/stats/weekly").then(r => setWeekly(r.data)),
      api.get("/stats/leaderboard").then(r => setLeaders(r.data)),
      api.get("/reports?mine=true&limit=5").then(r => setMine(r.data)),
    ]).catch(() => {});
  }, []);

  const myRank = leaders.findIndex(l => l.id === user?.id);
  const points = user?.points || 0;
  const toNext = 25 - (points % 25);

  const cards = [
    { label: t("stat_total"), value: stats?.total_reports ?? "—", icon: Plus, color: "#E05A3D" },
    { label: t("stat_verified"), value: stats?.verified ?? "—", icon: Trophy, color: "#246356" },
    { label: t("stat_active"), value: stats?.active_users ?? "—", icon: Phone, color: "#F5A623" },
    { label: t("stat_rupees"), value: `₹${stats?.rupees_distributed ?? 0}`, icon: IndianRupee, color: "#0F172A" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8" data-testid="dashboard-page">
      {/* Welcome */}
      <div className="civic-card p-6 sm:p-8 grid md:grid-cols-3 gap-6 items-center mb-8">
        <div className="md:col-span-2">
          <span className="civic-chip bg-[#F5A623]" data-testid="welcome-chip">{t("dash_namaste")}, {user?.name?.split(" ")[0]}</span>
          <h1 className="heading text-3xl sm:text-4xl font-black mt-3">{t("dash_h1")}</h1>
          <p className="text-slate-700 mt-2">{t("dash_progress", { n: points, m: toNext })}</p>
          <div className="flex flex-wrap gap-3 mt-5">
            <Link to="/new-report" className="civic-btn" data-testid="cta-new-report">
              <Plus className="w-5 h-5" strokeWidth={3}/> {t("dash_new_report")}
            </Link>
            <Link to="/ivr" className="civic-btn civic-btn-secondary" data-testid="cta-call">
              <Phone className="w-5 h-5" strokeWidth={3}/> {t("dash_call")}
            </Link>
          </div>
        </div>
        <div className="bg-[#246356] text-white p-5 rounded-xl border-2 border-slate-900 shadow-[4px_4px_0_0_#0F172A]" data-testid="my-rank-card">
          <div className="text-xs uppercase tracking-widest font-bold opacity-80">{t("your_rank")}</div>
          <div className="heading text-5xl font-black">{myRank >= 0 ? `#${myRank + 1}` : "—"}</div>
          <div className="text-sm opacity-90 mt-1">{t("in_week_lb")}</div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map(c => (
          <div key={c.label} className="civic-card p-5" data-testid={`stat-${c.label.toLowerCase().replace(/[^a-z]/g,'-')}`}>
            <c.icon className="w-7 h-7 mb-3" strokeWidth={2.5} style={{ color: c.color }}/>
            <div className="heading text-3xl sm:text-4xl font-black">{c.value}</div>
            <div className="text-xs uppercase tracking-widest font-bold text-slate-500 mt-1">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Chart + leaderboard */}
      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        <div className="civic-card p-6 lg:col-span-2" data-testid="weekly-chart">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="heading text-2xl font-black">{t("weekly_h")}</h2>
              <p className="text-sm text-slate-600">{t("weekly_p")}</p>
            </div>
            <div className="flex gap-3 text-xs font-bold">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-[#246356] border border-slate-900"/>{t("type_water")}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-[#F5A623] border border-slate-900"/>{t("type_energy")}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-[#E05A3D] border border-slate-900"/>{t("type_waste")}</span>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0"/>
                <XAxis dataKey="day" stroke="#0F172A" tick={{ fontWeight: 700 }}/>
                <YAxis stroke="#0F172A" tick={{ fontWeight: 700 }}/>
                <Tooltip contentStyle={{ border: "2px solid #0F172A", borderRadius: 8, boxShadow: "4px 4px 0 0 #0F172A" }}/>
                <Bar dataKey="water" stackId="a" fill="#246356" stroke="#0F172A" strokeWidth={1.5}/>
                <Bar dataKey="energy" stackId="a" fill="#F5A623" stroke="#0F172A" strokeWidth={1.5}/>
                <Bar dataKey="waste" stackId="a" fill="#E05A3D" stroke="#0F172A" strokeWidth={1.5}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="civic-card p-6" data-testid="leaderboard-widget">
          <h2 className="heading text-2xl font-black mb-1">{t("top5")}</h2>
          <p className="text-sm text-slate-600 mb-4">{t("top5_sub")}</p>
          {leaders.length === 0 ? (
            <p className="text-slate-500 text-sm">{t("no_reporters")}</p>
          ) : leaders.slice(0,5).map((u, i) => (
            <div key={u.id} className="flex items-center justify-between py-2 border-b border-slate-200 last:border-0" data-testid={`leader-${i}`}>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg border-2 border-slate-900 flex items-center justify-center font-black ${i===0?"bg-[#F5A623]":i===1?"bg-slate-200":i===2?"bg-[#E05A3D] text-white":"bg-white"}`}>{i+1}</div>
                <div>
                  <div className="font-bold text-sm">{u.name}</div>
                  <div className="text-xs text-slate-500">{u.area || "—"}</div>
                </div>
              </div>
              <div className="heading font-black">{u.points}</div>
            </div>
          ))}
          <Link to="/leaderboard" className="text-xs font-black uppercase tracking-widest mt-3 inline-block underline" data-testid="see-all-leaders">{t("see_all")}</Link>
        </div>
      </div>

      {/* My recent reports */}
      <div className="civic-card p-6" data-testid="my-recent-reports">
        <div className="flex items-center justify-between mb-4">
          <h2 className="heading text-2xl font-black">{t("my_recent")}</h2>
          <Link to="/reports" className="text-xs font-black uppercase tracking-widest underline">{t("all_reports")}</Link>
        </div>
        {mine.length === 0 ? (
          <div className="text-center py-10 text-slate-500">
            <Plus className="w-10 h-10 mx-auto mb-3 text-slate-400" strokeWidth={2.5}/>
            {t("no_reports_yet")} <Link to="/new-report" className="font-black underline">{t("file_first")}</Link>.
          </div>
        ) : (
          <div className="space-y-2">
            {mine.map(r => <ReportRow key={r.id} r={r}/>)}
          </div>
        )}
      </div>
    </div>
  );
}

function ReportRow({ r }) {
  const ICON = { water: Droplets, energy: Zap, waste: Trash2, other: Gift }[r.type] || Gift;
  const COLOR = { water: "#246356", energy: "#F5A623", waste: "#E05A3D", other: "#0F172A" }[r.type];
  const STATUS_BG = { pending: "bg-slate-200", verified: "bg-[#16A34A] text-white", rejected: "bg-[#DC2626] text-white" }[r.status];
  return (
    <div className="flex items-start gap-3 p-3 border-2 border-slate-200 rounded-lg" data-testid={`report-row-${r.id}`}>
      <div className="w-10 h-10 shrink-0 rounded-lg border-2 border-slate-900 flex items-center justify-center" style={{ background: COLOR }}>
        <ICON className="w-5 h-5 text-white" strokeWidth={2.5}/>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold capitalize">{r.type}</span>
          <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded border-2 border-slate-900 ${STATUS_BG}`}>{r.status}</span>
          <span className="text-xs text-slate-500">{new Date(r.created_at).toLocaleDateString()}</span>
        </div>
        <div className="text-sm text-slate-700 truncate">{r.description}</div>
        <div className="text-xs text-slate-500 mt-1">📍 {r.location}</div>
      </div>
    </div>
  );
}
