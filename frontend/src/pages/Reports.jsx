import { useEffect, useState } from "react";
import api from "../lib/api";
import { Link } from "react-router-dom";
import { Droplets, Zap, Trash2, Sparkles, Plus, Filter } from "lucide-react";

const ICONS = { water: Droplets, energy: Zap, waste: Trash2, other: Sparkles };
const COLORS = { water: "#246356", energy: "#F5A623", waste: "#E05A3D", other: "#0F172A" };

export default function Reports() {
  const [reports, setReports] = useState([]);
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [mineOnly, setMineOnly] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filterType) params.set("type", filterType);
    if (filterStatus) params.set("status", filterStatus);
    if (mineOnly) params.set("mine", "true");
    api.get(`/reports?${params}`).then(r => setReports(r.data));
  }, [filterType, filterStatus, mineOnly]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8" data-testid="reports-page">
      <div className="flex items-end justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 className="heading text-4xl font-black tracking-tighter">Reports</h1>
          <p className="text-slate-600">{reports.length} reports filed</p>
        </div>
        <Link to="/new-report" className="civic-btn" data-testid="reports-new-btn">
          <Plus className="w-5 h-5" strokeWidth={3}/> New report
        </Link>
      </div>

      <div className="civic-card p-4 mb-6 flex flex-wrap gap-3 items-center" data-testid="filters">
        <Filter className="w-5 h-5"/>
        <select value={filterType} onChange={(e)=>setFilterType(e.target.value)} className="border-2 border-slate-900 rounded-lg px-3 py-2 font-bold text-sm" data-testid="filter-type">
          <option value="">All types</option>
          <option value="water">Water</option>
          <option value="energy">Energy</option>
          <option value="waste">Waste</option>
          <option value="other">Other</option>
        </select>
        <select value={filterStatus} onChange={(e)=>setFilterStatus(e.target.value)} className="border-2 border-slate-900 rounded-lg px-3 py-2 font-bold text-sm" data-testid="filter-status">
          <option value="">All status</option>
          <option value="pending">Pending</option>
          <option value="verified">Verified</option>
          <option value="rejected">Rejected</option>
        </select>
        <button onClick={()=>setMineOnly(!mineOnly)} className={`px-4 py-2 border-2 border-slate-900 rounded-lg font-bold text-sm ${mineOnly?"bg-slate-900 text-white":"bg-white"}`} data-testid="filter-mine">
          {mineOnly ? "Showing mine" : "Show mine only"}
        </button>
      </div>

      <div className="space-y-3">
        {reports.length === 0 ? (
          <div className="civic-card p-10 text-center text-slate-500" data-testid="reports-empty">No reports match these filters.</div>
        ) : reports.map(r => {
          const Icon = ICONS[r.type] || Sparkles;
          return (
            <div key={r.id} className="civic-card p-4 flex gap-4" data-testid={`report-${r.id}`}>
              <div className="w-14 h-14 shrink-0 rounded-lg border-2 border-slate-900 flex items-center justify-center" style={{ background: COLORS[r.type] }}>
                <Icon className="w-7 h-7 text-white" strokeWidth={2.5}/>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-black capitalize">{r.type}</span>
                  <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded border-2 border-slate-900 ${r.status==="verified"?"bg-[#16A34A] text-white":r.status==="rejected"?"bg-[#DC2626] text-white":"bg-slate-200"}`}>{r.status}</span>
                  <span className="text-xs text-slate-500">{new Date(r.created_at).toLocaleString()}</span>
                  {r.source !== "web" && <span className="civic-chip text-[10px] !py-0">{r.source}</span>}
                </div>
                <p className="text-slate-800">{r.description}</p>
                <div className="text-xs text-slate-500 mt-2">📍 {r.location} · by {r.user_name}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
