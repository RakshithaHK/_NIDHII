import { useEffect, useState } from "react";
import api from "../lib/api";
import { Download, Check, X, Droplets, Zap, Trash2, Sparkles } from "lucide-react";
import { toast } from "sonner";

const ICONS = { water: Droplets, energy: Zap, waste: Trash2, other: Sparkles };
const COLORS = { water: "#246356", energy: "#F5A623", waste: "#E05A3D", other: "#0F172A" };

export default function Admin() {
  const [reports, setReports] = useState([]);
  const [tab, setTab] = useState("pending");

  const load = () => api.get("/reports/all?limit=500").then(r => setReports(r.data));
  useEffect(() => { load(); }, []);

  const filtered = reports.filter(r => tab === "all" || r.status === tab);

  const verify = async (id, status) => {
    try {
      await api.patch(`/reports/${id}/verify`, { status });
      toast.success(`Report ${status}`);
      load();
    } catch (_) { toast.error("Failed"); }
  };

  const downloadCsv = (kind) => {
    const url = `${process.env.REACT_APP_BACKEND_URL}/api/admin/export/${kind}.csv`;
    const t = localStorage.getItem("nidhii_token");
    fetch(url, { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.blob())
      .then(b => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(b);
        a.download = `nidhii-${kind}.csv`;
        a.click();
      });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8" data-testid="admin-page">
      <div className="flex items-end justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="heading text-4xl font-black tracking-tighter">Admin / Supervisor</h1>
          <p className="text-slate-600">Verify reports. Export data for ward leaders.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={()=>downloadCsv("reports")} className="civic-btn civic-btn-secondary" data-testid="export-reports">
            <Download className="w-5 h-5" strokeWidth={3}/> Reports CSV
          </button>
          <button onClick={()=>downloadCsv("users")} className="civic-btn civic-btn-accent" data-testid="export-users">
            <Download className="w-5 h-5" strokeWidth={3}/> Users CSV
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap" data-testid="admin-tabs">
        {["pending", "verified", "rejected", "all"].map(t => (
          <button key={t} onClick={()=>setTab(t)}
            className={`px-4 py-2 border-2 border-slate-900 rounded-lg font-bold capitalize ${tab===t?"bg-slate-900 text-white":"bg-white"}`}
            data-testid={`admin-tab-${t}`}>
            {t} ({reports.filter(r => t==="all" || r.status===t).length})
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="civic-card p-10 text-center text-slate-500">No reports here.</div>
        ) : filtered.map(r => {
          const Icon = ICONS[r.type] || Sparkles;
          return (
            <div key={r.id} className="civic-card p-4" data-testid={`admin-report-${r.id}`}>
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 shrink-0 rounded-lg border-2 border-slate-900 flex items-center justify-center" style={{ background: COLORS[r.type] }}>
                  <Icon className="w-7 h-7 text-white" strokeWidth={2.5}/>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black capitalize">{r.type}</span>
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded border-2 border-slate-900 ${r.status==="verified"?"bg-[#16A34A] text-white":r.status==="rejected"?"bg-[#DC2626] text-white":"bg-slate-200"}`}>{r.status}</span>
                    <span className="civic-chip text-[10px] !py-0">{r.source}</span>
                    <span className="text-xs text-slate-500">{new Date(r.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-slate-800 mt-1">{r.description}</p>
                  <div className="text-xs text-slate-500 mt-1">📍 {r.location} · by {r.user_name}</div>
                </div>
                {r.status === "pending" && (
                  <div className="flex flex-col gap-2 shrink-0">
                    <button onClick={()=>verify(r.id, "verified")} className="civic-btn !py-2 civic-btn-secondary" data-testid={`verify-${r.id}`}>
                      <Check className="w-4 h-4" strokeWidth={3}/> Verify
                    </button>
                    <button onClick={()=>verify(r.id, "rejected")} className="civic-btn !py-2 civic-btn-ghost" data-testid={`reject-${r.id}`}>
                      <X className="w-4 h-4" strokeWidth={3}/> Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
