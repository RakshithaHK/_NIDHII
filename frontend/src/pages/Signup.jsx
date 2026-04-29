import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

const LANGS = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी (Hindi)" },
  { code: "ta", label: "தமிழ் (Tamil)" },
  { code: "te", label: "తెలుగు (Telugu)" },
  { code: "bn", label: "বাংলা (Bengali)" },
  { code: "mr", label: "मराठी (Marathi)" },
  { code: "kn", label: "ಕನ್ನಡ (Kannada)" },
];

export default function Signup() {
  const { signUp } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "", area: "", language: "en", role: "resident" });
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await signUp(form);
      toast.success("Welcome to Nidhii!");
      nav("/dashboard");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Signup failed");
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-4 dot-bg">
      <div className="civic-card p-8 max-w-lg w-full">
        <Link to="/" className="text-sm font-bold inline-flex items-center gap-1 mb-4" data-testid="signup-back-home">
          <ArrowLeft className="w-4 h-4" strokeWidth={3}/> Home
        </Link>
        <div className="w-12 h-12 rounded-lg bg-[#E05A3D] border-2 border-slate-900 flex items-center justify-center text-white font-black text-2xl shadow-[3px_3px_0_0_#0F172A] heading mb-6">N</div>
        <h1 className="heading text-3xl font-black mb-2">Become a guardian</h1>
        <p className="text-slate-600 mb-6">Free to join. Earn rewards for verified reports.</p>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-xs uppercase tracking-widest">Full name</label>
              <input className="civic-input mt-1" required data-testid="signup-name"
                value={form.name} onChange={(e)=>setForm({...form, name: e.target.value})} />
            </div>
            <div>
              <label className="font-bold text-xs uppercase tracking-widest">Phone</label>
              <input className="civic-input mt-1" data-testid="signup-phone"
                value={form.phone} onChange={(e)=>setForm({...form, phone: e.target.value})} />
            </div>
          </div>
          <div>
            <label className="font-bold text-xs uppercase tracking-widest">Email</label>
            <input className="civic-input mt-1" type="email" required data-testid="signup-email"
              value={form.email} onChange={(e)=>setForm({...form, email: e.target.value})} />
          </div>
          <div>
            <label className="font-bold text-xs uppercase tracking-widest">Password</label>
            <input className="civic-input mt-1" type="password" required minLength={6} data-testid="signup-password"
              value={form.password} onChange={(e)=>setForm({...form, password: e.target.value})} />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-xs uppercase tracking-widest">Area / Basti</label>
              <input className="civic-input mt-1" placeholder="e.g., Sector 5, Yamuna Vihar" data-testid="signup-area"
                value={form.area} onChange={(e)=>setForm({...form, area: e.target.value})} />
            </div>
            <div>
              <label className="font-bold text-xs uppercase tracking-widest">Language</label>
              <select className="civic-input mt-1" data-testid="signup-language"
                value={form.language} onChange={(e)=>setForm({...form, language: e.target.value})}>
                {LANGS.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="font-bold text-xs uppercase tracking-widest">I am a</label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {[
                { v: "resident", l: "Resident" },
                { v: "supervisor", l: "Supervisor" },
                { v: "admin", l: "Admin" },
              ].map(r => (
                <button type="button" key={r.v}
                  data-testid={`signup-role-${r.v}`}
                  onClick={()=>setForm({...form, role: r.v})}
                  className={`py-3 border-2 border-slate-900 rounded-lg font-bold ${form.role===r.v ? "bg-slate-900 text-white" : "bg-white"}`}>
                  {r.l}
                </button>
              ))}
            </div>
          </div>
          <button className="civic-btn w-full text-lg" disabled={busy} data-testid="signup-submit">
            {busy ? "Creating account..." : "Create account"}
          </button>
        </form>
        <p className="mt-6 text-sm text-slate-700">Already a member? <Link to="/login" className="font-black underline" data-testid="signup-to-login">Sign in</Link></p>
      </div>
    </div>
  );
}
