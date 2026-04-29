import { useState, useRef } from "react";
import api from "../lib/api";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Mic, MicOff, Droplets, Zap, Trash2, Sparkles, Save } from "lucide-react";

const TYPES = [
  { v: "water", l: "Water leak", i: Droplets, c: "#246356" },
  { v: "energy", l: "Energy waste", i: Zap, c: "#F5A623" },
  { v: "waste", l: "Garbage / waste", i: Trash2, c: "#E05A3D" },
  { v: "other", l: "Other", i: Sparkles, c: "#0F172A" },
];

export default function NewReport() {
  const nav = useNavigate();
  const [form, setForm] = useState({ type: "water", description: "", location: "", language: "en" });
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);

  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => chunksRef.current.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        await transcribe(blob);
      };
      mediaRef.current = mr;
      mr.start();
      setRecording(true);
    } catch (e) {
      toast.error("Microphone access denied");
    }
  };

  const stopRec = () => {
    mediaRef.current?.stop();
    setRecording(false);
  };

  const transcribe = async (blob) => {
    setTranscribing(true);
    try {
      const fd = new FormData();
      fd.append("file", blob, "report.webm");
      fd.append("language", form.language);
      const { data } = await api.post("/voice/transcribe", fd, { headers: { "Content-Type": "multipart/form-data" } });
      const parsed = data.parsed || {};
      setForm(f => ({
        ...f,
        description: data.transcript,
        location: parsed.address || f.location,
        type: parsed.type || f.type,
      }));
      toast.success("Transcribed! Review and submit.");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Could not transcribe");
    } finally { setTranscribing(false); }
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/reports", { ...form, source: "web" });
      toast.success("Report submitted! Awaiting verification.");
      nav("/reports");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed");
    } finally { setBusy(false); }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8" data-testid="new-report-page">
      <h1 className="heading text-4xl font-black tracking-tighter">File a new report</h1>
      <p className="text-slate-600 mb-6">Speak it or type it. Both work.</p>

      <div className="civic-card p-6 mb-6 bg-[#F5A623]" data-testid="voice-card">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl border-2 border-slate-900 flex items-center justify-center bg-white">
            <Mic className="w-6 h-6" strokeWidth={2.5}/>
          </div>
          <div>
            <h2 className="heading text-2xl font-black">Speak your report</h2>
            <p className="text-sm font-medium">Tip: say "My name is ___, I live at ___, the issue is ___."</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          {!recording ? (
            <button type="button" onClick={startRec} className="civic-btn civic-btn-secondary" data-testid="start-recording-btn" disabled={transcribing}>
              <Mic className="w-5 h-5" strokeWidth={3}/> Start recording
            </button>
          ) : (
            <button type="button" onClick={stopRec} className="civic-btn" data-testid="stop-recording-btn">
              <MicOff className="w-5 h-5" strokeWidth={3}/> Stop & transcribe
            </button>
          )}
          {transcribing && <span className="font-bold text-sm" data-testid="transcribing-indicator">Transcribing...</span>}
          {recording && <span className="font-bold text-sm flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#DC2626] animate-pulse"/>Recording...</span>}
        </div>
      </div>

      <form onSubmit={submit} className="civic-card p-6 space-y-5" data-testid="report-form">
        <div>
          <label className="font-bold text-xs uppercase tracking-widest">Type of issue</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
            {TYPES.map(t => (
              <button type="button" key={t.v}
                data-testid={`type-${t.v}`}
                onClick={()=>setForm({...form, type: t.v})}
                className={`p-4 border-2 border-slate-900 rounded-lg flex flex-col items-center gap-2 font-bold transition-all ${form.type===t.v ? "shadow-[3px_3px_0_0_#0F172A] -translate-y-0.5" : "bg-white"}`}
                style={{ background: form.type===t.v ? t.c : undefined, color: form.type===t.v ? (t.c==="#F5A623"?"#0F172A":"#fff") : undefined }}>
                <t.i className="w-7 h-7" strokeWidth={2.5}/>
                <span className="text-sm">{t.l}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="font-bold text-xs uppercase tracking-widest">Location / address</label>
          <input className="civic-input mt-1" required data-testid="report-location"
            placeholder="e.g., Behind Sector 7 water tank"
            value={form.location} onChange={(e)=>setForm({...form, location: e.target.value})}/>
        </div>

        <div>
          <label className="font-bold text-xs uppercase tracking-widest">Description</label>
          <textarea className="civic-input mt-1 !h-auto py-3" rows={4} required data-testid="report-description"
            placeholder="Describe the issue in your own words"
            value={form.description} onChange={(e)=>setForm({...form, description: e.target.value})}/>
        </div>

        <button className="civic-btn w-full text-lg" disabled={busy} data-testid="report-submit">
          <Save className="w-5 h-5" strokeWidth={3}/>{busy ? "Submitting..." : "Submit report"}
        </button>
      </form>
    </div>
  );
}
