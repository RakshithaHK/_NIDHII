import { useAuth } from "../lib/auth";
import { Gift, IndianRupee, Trophy, Sparkles } from "lucide-react";

export default function Rewards() {
  const { user } = useAuth();
  const points = user?.points || 0;
  const earned = user?.rewards_earned || 0;
  const next = 25 - (points % 25);
  const progress = ((points % 25) / 25) * 100;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8" data-testid="rewards-page">
      <h1 className="heading text-4xl font-black tracking-tighter">Your rewards</h1>
      <p className="text-slate-600 mb-6">Every 25 verified reports = ₹10. No catch.</p>

      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <div className="civic-card p-6 bg-[#246356] text-white" data-testid="rewards-earned-card">
          <IndianRupee className="w-8 h-8 mb-3" strokeWidth={2.5}/>
          <div className="heading text-5xl font-black">₹{earned}</div>
          <div className="text-xs uppercase tracking-widest font-bold opacity-80 mt-2">Total earned</div>
        </div>
        <div className="civic-card p-6" data-testid="rewards-points-card">
          <Trophy className="w-8 h-8 mb-3 text-[#F5A623]" strokeWidth={2.5}/>
          <div className="heading text-5xl font-black">{points}</div>
          <div className="text-xs uppercase tracking-widest font-bold text-slate-500 mt-2">Verified reports</div>
        </div>
        <div className="civic-card p-6 bg-[#F5A623]" data-testid="rewards-next-card">
          <Gift className="w-8 h-8 mb-3" strokeWidth={2.5}/>
          <div className="heading text-5xl font-black">{next}</div>
          <div className="text-xs uppercase tracking-widest font-bold mt-2">Reports to next ₹10</div>
        </div>
      </div>

      <div className="civic-card p-6 mb-6" data-testid="progress-card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="heading text-2xl font-black">Progress to next reward</h2>
          <span className="font-black">{points % 25}/25</span>
        </div>
        <div className="h-6 border-2 border-slate-900 rounded-lg overflow-hidden bg-slate-100">
          <div className="h-full bg-[#E05A3D] border-r-2 border-slate-900 transition-all" style={{ width: `${progress}%` }}/>
        </div>
        <p className="text-sm text-slate-600 mt-3">Once you hit 25, ₹10 is added to your earnings instantly. Cash out via your supervisor.</p>
      </div>

      <div className="civic-card p-6" data-testid="how-it-works">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-6 h-6 text-[#F5A623]" strokeWidth={2.5}/>
          <h2 className="heading text-2xl font-black">How rewards work</h2>
        </div>
        <ol className="space-y-3 text-slate-700">
          <li className="flex gap-3"><span className="w-7 h-7 rounded-full bg-slate-900 text-white font-black flex items-center justify-center shrink-0">1</span> File a report (text, voice, or via the IVR phone line).</li>
          <li className="flex gap-3"><span className="w-7 h-7 rounded-full bg-slate-900 text-white font-black flex items-center justify-center shrink-0">2</span> A local supervisor verifies it (usually within 48 hours).</li>
          <li className="flex gap-3"><span className="w-7 h-7 rounded-full bg-slate-900 text-white font-black flex items-center justify-center shrink-0">3</span> Every 25 verified reports automatically credits ₹10 to your account.</li>
          <li className="flex gap-3"><span className="w-7 h-7 rounded-full bg-slate-900 text-white font-black flex items-center justify-center shrink-0">4</span> Top 5 reporters every week get an extra community recognition.</li>
        </ol>
      </div>
    </div>
  );
}
