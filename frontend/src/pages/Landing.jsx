import { Link } from "react-router-dom";
import { Phone, Droplets, Zap, Trash2, Trophy, Gift, MessageCircle, ArrowRight, Languages, ShieldCheck } from "lucide-react";

export default function Landing() {
  return (
    <div className="bg-[#FDFBF7] min-h-screen">
      {/* nav */}
      <header className="border-b-2 border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-[#E05A3D] border-2 border-slate-900 flex items-center justify-center text-white font-black text-xl shadow-[3px_3px_0_0_#0F172A] heading">N</div>
            <div>
              <div className="heading text-2xl font-black leading-none">Nidhii</div>
              <div className="text-[10px] tracking-[0.18em] uppercase text-slate-600 font-bold">Community Watch</div>
            </div>
          </div>
          <div className="flex gap-2">
            <Link to="/login" className="civic-btn civic-btn-ghost" data-testid="landing-login-btn">Sign In</Link>
            <Link to="/signup" className="civic-btn" data-testid="landing-signup-btn">Join Nidhii</Link>
          </div>
        </div>
      </header>

      {/* hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-20 grid lg:grid-cols-12 gap-10 items-center">
        <div className="lg:col-span-7">
          <span className="civic-chip mb-6 bg-[#F5A623]" data-testid="hero-tag">
            <ShieldCheck className="w-4 h-4" strokeWidth={3} /> Built for every neighbourhood
          </span>
          <h1 className="heading text-5xl sm:text-6xl lg:text-7xl font-black tracking-tighter leading-[0.95]">
            Stop the leak.<br/>
            <span className="text-[#E05A3D]">Save the bijli.</span><br/>
            Earn for it.
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-slate-700 max-w-2xl leading-relaxed">
            Nidhii is a community accountability system for informal settlements — call, speak, or
            tap to report water waste, electricity leaks and garbage dumping. Get <b>₹10 every 25 verified reports</b>.
            No fancy phone needed.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/signup" className="civic-btn text-lg" data-testid="hero-cta-primary">
              Start Reporting <ArrowRight className="w-5 h-5" strokeWidth={3}/>
            </Link>
            <Link to="/login" className="civic-btn civic-btn-secondary text-lg" data-testid="hero-cta-secondary">
              I'm a Supervisor
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap gap-4 text-sm text-slate-700 font-bold">
            <div className="flex items-center gap-2"><Languages className="w-5 h-5 text-[#246356]" strokeWidth={2.5}/> 6 languages</div>
            <div className="flex items-center gap-2"><Phone className="w-5 h-5 text-[#246356]" strokeWidth={2.5}/> Works on any phone</div>
            <div className="flex items-center gap-2"><Gift className="w-5 h-5 text-[#246356]" strokeWidth={2.5}/> Real ₹ rewards</div>
          </div>
        </div>
        <div className="lg:col-span-5">
          <div className="civic-card p-2 grain rotate-1" data-testid="hero-image">
            <img
              src="https://images.pexels.com/photos/3079978/pexels-photo-3079978.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
              alt="Children at a community water pump"
              className="rounded-lg w-full h-[420px] object-cover"
            />
          </div>
          <div className="civic-card mt-4 p-4 bg-[#246356] text-white -rotate-1 max-w-xs ml-auto">
            <div className="text-xs uppercase tracking-widest font-bold opacity-80">This week</div>
            <div className="heading text-3xl font-black">412 leaks fixed</div>
            <div className="text-sm opacity-90">across 7 neighbourhoods</div>
          </div>
        </div>
      </section>

      {/* how it works */}
      <section className="bg-[#246356] text-white py-16 border-y-2 border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <h2 className="heading text-4xl sm:text-5xl font-black tracking-tighter mb-2">Three steps. That's it.</h2>
          <p className="text-lg opacity-90 mb-10 max-w-2xl">Anyone with a basic phone can become a water and energy guardian.</p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { n: "01", t: "Call or tap", d: "Dial the 10-digit Nidhii number, or open the app. The IVR speaks your language.", i: Phone },
              { n: "02", t: "Speak the issue", d: "Say your name, area and what is wrong. Our AI writes it down for you.", i: MessageCircle },
              { n: "03", t: "Earn ₹10", d: "Supervisor verifies the report. Every 25 verified reports = ₹10 in your account.", i: Gift },
            ].map((s) => (
              <div key={s.n} className="civic-card text-slate-900 p-6" data-testid={`step-${s.n}`}>
                <div className="flex items-center justify-between mb-4">
                  <span className="heading text-5xl font-black text-[#E05A3D]">{s.n}</span>
                  <s.i className="w-10 h-10" strokeWidth={2.5}/>
                </div>
                <h3 className="heading text-2xl font-black mb-2">{s.t}</h3>
                <p className="text-slate-700">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <h2 className="heading text-4xl sm:text-5xl font-black tracking-tighter mb-2">What can you report?</h2>
        <p className="text-lg text-slate-700 mb-10 max-w-2xl">Anything that wastes a shared resource in your basti. Big or small.</p>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { i: Droplets, c: "#246356", t: "Water leaks", d: "Burst pipes, dripping pumps, open taps." },
            { i: Zap, c: "#F5A623", t: "Electricity waste", d: "Street lights left on, illegal hooks, faulty meters." },
            { i: Trash2, c: "#E05A3D", t: "Garbage dumping", d: "Open dumps, missed pickups, blocked drains." },
          ].map((cat) => (
            <div key={cat.t} className="civic-card p-6" data-testid={`category-${cat.t.toLowerCase().replace(/ /g,'-')}`}>
              <div className="w-14 h-14 rounded-xl border-2 border-slate-900 flex items-center justify-center mb-4" style={{ background: cat.c, color: cat.c === "#F5A623" ? "#0F172A" : "#fff" }}>
                <cat.i className="w-8 h-8" strokeWidth={2.5}/>
              </div>
              <h3 className="heading text-2xl font-black mb-2">{cat.t}</h3>
              <p className="text-slate-700">{cat.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* leaderboard CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-20">
        <div className="civic-card p-8 sm:p-12 bg-[#F5A623] text-slate-900">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <Trophy className="w-12 h-12 mb-3" strokeWidth={2.5}/>
              <h2 className="heading text-4xl sm:text-5xl font-black tracking-tighter">Top 5 Reporters get name + fame.</h2>
              <p className="mt-4 text-lg max-w-md">Your area, your community, your leaderboard. We celebrate the people who watch out for everyone.</p>
              <Link to="/signup" className="civic-btn civic-btn-secondary mt-6 inline-flex" data-testid="bottom-cta">
                Make me a guardian <ArrowRight className="w-5 h-5" strokeWidth={3}/>
              </Link>
            </div>
            <div className="civic-card bg-white p-6">
              <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">This week's leaders</div>
              {[
                { n: "Asha B.", p: 47 },
                { n: "Ramesh K.", p: 41 },
                { n: "Sunita D.", p: 36 },
                { n: "Imran S.", p: 28 },
                { n: "Lakshmi P.", p: 22 },
              ].map((u, i) => (
                <div key={u.n} className="flex items-center justify-between py-2 border-b border-slate-200 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg border-2 border-slate-900 flex items-center justify-center font-black ${i===0?"bg-[#F5A623]":i===1?"bg-slate-200":i===2?"bg-[#E05A3D] text-white":"bg-white"}`}>{i+1}</div>
                    <span className="font-bold">{u.n}</span>
                  </div>
                  <span className="font-black heading text-lg">{u.p}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t-2 border-slate-900 py-8 text-center text-sm text-slate-600">
        Nidhii — built for community resilience. © 2026
      </footer>
    </div>
  );
}
