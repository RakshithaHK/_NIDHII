import { useEffect, useState } from "react";
import api from "../lib/api";
import { useAuth } from "../lib/auth";
import { Download, Check, X, Droplets, Zap, Trash2, Sparkles, Phone, Sheet, RefreshCw, ArrowDownToLine, Settings, MapPin } from "lucide-react";
import { toast } from "sonner";

const ICONS = { water: Droplets, energy: Zap, waste: Trash2, other: Sparkles };
const COLORS = { water: "#246356", energy: "#F5A623", waste: "#E05A3D", other: "#0F172A" };

export default function Admin() {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [tab, setTab] = useState("pending");
  const [integrations, setIntegrations] = useState(null);
  const [syncing, setSyncing] = useState(false);

  const load = () => api.get("/reports/all?limit=500").then(r => setReports(r.data));
  const loadIntegrations = () => api.get("/admin/integrations/status").then(r => setIntegrations(r.data)).catch(()=>{});
  useEffect(() => { load(); loadIntegrations(); }, []);

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

  const fullSync = async () => {
    setSyncing(true);
    try {
      const { data } = await api.post("/admin/sheets/sync");
      if (data.ok) toast.success(`Synced ${data.reports} reports + ${data.users} users`);
      else toast.error(data.reason || "Sync failed");
    } catch (e) { toast.error(e?.response?.data?.detail || "Sync failed"); }
    finally { setSyncing(false); }
  };

  const pullSheets = async () => {
    setSyncing(true);
    try {
      const { data } = await api.post("/admin/sheets/pull-status");
      toast.success(`${data.changed} status changes pulled from sheet`);
      load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Pull failed"); }
    finally { setSyncing(false); }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8" data-testid="admin-page">
      <div className="flex items-end justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="heading text-4xl font-black tracking-tighter">Admin / Supervisor</h1>
          <p className="text-slate-600">Verify reports. Export data for ward leaders.</p>
          {user?.role === "supervisor" && user?.area && (
            <span className="civic-chip mt-2 inline-flex bg-[#246356] text-white" data-testid="area-filter-chip">
              <MapPin className="w-3 h-3" strokeWidth={3}/> Area: {user.area}
            </span>
          )}
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

      <div className="grid md:grid-cols-2 gap-4 mb-6" data-testid="integrations-panel">
        <div className="civic-card p-5" data-testid="twilio-card">
          <div className="flex items-center gap-2 mb-2">
            <Phone className="w-5 h-5 text-[#246356]" strokeWidth={2.5}/>
            <h3 className="heading text-xl font-black">Twilio Voice IVR</h3>
            <span className={`civic-chip text-[10px] !py-0 ml-auto ${integrations?.twilio?.configured ? "bg-[#16A34A] text-white" : "bg-slate-200"}`}>
              {integrations?.twilio?.configured ? "Live" : "Stub mode"}
            </span>
          </div>
          {integrations?.twilio?.configured ? (
            <p className="text-sm text-slate-700">Calls to <b>{integrations.twilio.phone_number}</b> route here. TwiML endpoints active.</p>
          ) : (
            <p className="text-sm text-slate-700">
              Add <code className="text-xs bg-slate-100 px-1 rounded">TWILIO_ACCOUNT_SID</code>, <code className="text-xs bg-slate-100 px-1 rounded">TWILIO_AUTH_TOKEN</code>, and <code className="text-xs bg-slate-100 px-1 rounded">TWILIO_PHONE_NUMBER</code> to <code className="text-xs bg-slate-100 px-1 rounded">backend/.env</code>, then point your Twilio number's "A Call Comes In" webhook to <code className="text-xs bg-slate-100 px-1 rounded break-all">{process.env.REACT_APP_BACKEND_URL}/api/twilio/voice</code>.
            </p>
          )}
        </div>
        <div className="civic-card p-5" data-testid="sheets-card">
          <div className="flex items-center gap-2 mb-2">
            <Sheet className="w-5 h-5 text-[#E05A3D]" strokeWidth={2.5}/>
            <h3 className="heading text-xl font-black">Google Sheets sync</h3>
            <span className={`civic-chip text-[10px] !py-0 ml-auto ${integrations?.sheets?.configured ? "bg-[#16A34A] text-white" : "bg-slate-200"}`}>
              {integrations?.sheets?.configured ? "Live" : "Stub mode"}
            </span>
          </div>
          {integrations?.sheets?.configured ? (
            <div className="flex flex-wrap gap-2">
              <button onClick={fullSync} disabled={syncing} className="civic-btn civic-btn-secondary !py-2 text-sm" data-testid="sheets-sync-btn">
                <RefreshCw className="w-4 h-4" strokeWidth={3}/> Push all
              </button>
              <button onClick={pullSheets} disabled={syncing} className="civic-btn civic-btn-accent !py-2 text-sm" data-testid="sheets-pull-btn">
                <ArrowDownToLine className="w-4 h-4" strokeWidth={3}/> Pull edits
              </button>
            </div>
          ) : (
            <p className="text-sm text-slate-700">
              Create a Google service account, share a sheet with its email, then add <code className="text-xs bg-slate-100 px-1 rounded">GOOGLE_SHEETS_CREDS_JSON</code> + <code className="text-xs bg-slate-100 px-1 rounded">GOOGLE_SHEETS_SPREADSHEET_ID</code> to <code className="text-xs bg-slate-100 px-1 rounded">backend/.env</code>.
            </p>
          )}
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
