import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

export default function Login() {
  const { signIn } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await signIn(form.email, form.password);
      toast.success("Welcome back!");
      nav("/dashboard");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Login failed");
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-4 dot-bg">
      <div className="civic-card p-8 max-w-md w-full">
        <Link to="/" className="text-sm font-bold inline-flex items-center gap-1 mb-4" data-testid="login-back-home">
          <ArrowLeft className="w-4 h-4" strokeWidth={3}/> Home
        </Link>
        <div className="w-12 h-12 rounded-lg bg-[#E05A3D] border-2 border-slate-900 flex items-center justify-center text-white font-black text-2xl shadow-[3px_3px_0_0_#0F172A] heading mb-6">N</div>
        <h1 className="heading text-3xl font-black mb-2">Welcome back</h1>
        <p className="text-slate-600 mb-6">Sign in to keep your community accountable.</p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="font-bold text-sm uppercase tracking-widest">Email</label>
            <input className="civic-input mt-1" type="email" required data-testid="login-email"
              value={form.email} onChange={(e)=>setForm({...form, email: e.target.value})} />
          </div>
          <div>
            <label className="font-bold text-sm uppercase tracking-widest">Password</label>
            <input className="civic-input mt-1" type="password" required data-testid="login-password"
              value={form.password} onChange={(e)=>setForm({...form, password: e.target.value})} />
          </div>
          <button className="civic-btn w-full text-lg" disabled={busy} data-testid="login-submit">
            {busy ? "Signing in..." : "Sign In"}
          </button>
        </form>
        <p className="mt-6 text-sm text-slate-700">No account? <Link to="/signup" className="font-black underline" data-testid="login-to-signup">Join Nidhii</Link></p>
      </div>
    </div>
  );
}
