import React, { useEffect, useState } from "react";
import { User } from "../types";
import { storageService, storageKeys } from "../services/storageService";
import { Trophy, Medal, Crown, Flame } from "lucide-react";

interface LiveLeaderboardSidebarProps {
  currentUser: User | null;
  lang?: "ka" | "en";
  monthlyPlayerRecords?: any[];
}

export default function LiveLeaderboardSidebar({ currentUser, lang = "ka", monthlyPlayerRecords }: LiveLeaderboardSidebarProps) {
  const [globalPlayers, setGlobalPlayers] = useState<any[]>([]);

  useEffect(() => {
    const updateScores = () => {
      const players = storageService.loadData<any[]>(storageKeys.players, []);
      const records = monthlyPlayerRecords || storageService.loadData<any[]>(storageKeys.monthlyPlayerRecords, []);

      const mappedPlayers = players.map(p => {
        const pRec = records.find(r => r.playerId === p.id && (r.marathonId === "june" || r.marathonId === "marathon-june"));
        return {
          ...p,
          livePoints: pRec ? pRec.points : (p.points || 100)
        };
      });

      mappedPlayers.sort((a, b) => b.livePoints - a.livePoints);
      setGlobalPlayers(mappedPlayers);
    };

    updateScores();
    const interval = setInterval(updateScores, 2000);
    return () => clearInterval(interval);
  }, [currentUser, monthlyPlayerRecords]);

  return (
    <div className="w-full lg:w-72 shrink-0 bg-[#131129] border border-violet-900/40 rounded-3xl p-5 space-y-4 shadow-xl text-white select-none">
      
      {/* ჰედერი - გასწორებული ტეგებით */}
      <div className="flex items-center justify-between border-b border-violet-950 pb-3 text-left">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-400 fill-amber-400" />
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider">
              {lang === "ka" ? "LIVE რეიტინგი" : "Leaderboard"}
            </h4>
            <span className="text-[8px] text-purple-400/80 uppercase font-bold block font-mono">
              ● ONLINE SYNC
            </span>
          </div>
        </div>
        <span className="text-[9px] bg-purple-950 text-purple-300 px-2 py-0.5 rounded font-mono font-bold">TOP 10</span>
      </div>

      {/* მოთამაშეების სია */}
      <div className="space-y-2">
        {globalPlayers.slice(0, 10).map((player, idx) => {
          const isMe = currentUser?.id === player.id;
          const rank = idx + 1;

          return (
            <div key={player.id} className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition-all ${isMe ? "bg-[#7C4DFF]/20 border-[#7C4DFF]" : "bg-[#0d0b21]/60 border-violet-950/40"}`}>
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-4 text-xs font-bold text-center text-slate-500 font-mono">
                  {rank === 1 ? "👑" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`}
                </span>
                <img src={player.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=50&h=50"} className="w-7 h-7 rounded-md object-cover border border-violet-950" alt="Avatar" />
                <p className={`text-xs font-black truncate max-w-[90px] ${isMe ? "text-purple-300" : "text-slate-200"}`}>
                  {player.nickname}
                </p>
              </div>
              <span className="font-mono text-xs font-black text-amber-400 shrink-0">
                {player.livePoints} 🪙
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}