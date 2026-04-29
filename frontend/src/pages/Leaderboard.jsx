import { useEffect, useState } from "react";
import api from "../lib/api";
import { Trophy, MapPin } from "lucide-react";

export default function Leaderboard() {
  const [leaders, setLeaders] = useState([]);
  useEffect(() => { api.get("/stats/leaderboard?limit=50").then(r => setLeaders(r.data)); }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8" data-testid="leaderboard-page">
      <div className="civic-card p-8 bg-[#F5A623] mb-6">
        <Trophy className="w-12 h-12 mb-3" strokeWidth={2.5}/>
        <h1 className="heading text-4xl sm:text-5xl font-black tracking-tighter">Community Leaders</h1>
        <p className="text-lg mt-2">Every report makes the basti better. These are the people doing the most.</p>
      </div>

      {/* podium */}
      {leaders.length >= 3 && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[1,0,2].map((idx, i) => {
            const u = leaders[idx];
            const heights = ["h-32", "h-44", "h-24"];
            const colors = ["bg-slate-200", "bg-[#F5A623]", "bg-[#E05A3D] text-white"];
            return (
              <div key={u.id} className="flex flex-col items-center" data-testid={`podium-${idx}`}>
                <div className="civic-card p-3 mb-2 w-full text-center bg-white">
                  <div className="font-black truncate">{u.name}</div>
                  <div className="heading text-2xl font-black">{u.points}</div>
                </div>
                <div className={`${heights[i]} w-full ${colors[i]} border-2 border-slate-900 rounded-t-xl flex items-start justify-center pt-3 heading font-black text-3xl shadow-[4px_4px_0_0_#0F172A]`}>
                  #{idx+1}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="civic-card divide-y-2 divide-slate-200">
        {leaders.length === 0 && <div className="p-10 text-center text-slate-500">No reporters yet.</div>}
        {leaders.map((u, i) => (
          <div key={u.id} className="p-4 flex items-center gap-4" data-testid={`leader-row-${i}`}>
            <div className={`w-10 h-10 rounded-lg border-2 border-slate-900 flex items-center justify-center font-black ${i===0?"bg-[#F5A623]":i===1?"bg-slate-200":i===2?"bg-[#E05A3D] text-white":"bg-white"}`}>{i+1}</div>
            <div className="flex-1">
              <div className="font-black">{u.name}</div>
              <div className="text-xs text-slate-500 flex items-center gap-1"><MapPin className="w-3 h-3"/>{u.area || "—"}</div>
            </div>
            <div className="text-right">
              <div className="heading text-2xl font-black">{u.points}</div>
              <div className="text-xs text-slate-500">verified</div>
            </div>
            <div className="text-right">
              <div className="heading text-xl font-black text-[#246356]">₹{u.rewards_earned || 0}</div>
              <div className="text-xs text-slate-500">earned</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
