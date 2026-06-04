import { Trophy } from "lucide-react";

interface LeaderboardItem {
  id: string;
  nickname: string;
  avatar: string;
  points: number;
  completedCount: number;
  publicCount: number;
  votesReceived: number;
  braveryBonuses: number;
  isAdmin?: boolean;
}

interface LeaderboardProps {
  leaderboard: LeaderboardItem[];
  lang?: "ka" | "en";
}

export default function Leaderboard({ leaderboard, lang = "ka" }: LeaderboardProps) {
  const getSymbolicTitle = (points: number, completedCount: number) => {
    if (completedCount >= 5) {
      return lang === "ka" ? "შიშის დამმარცხებელი" : "Fearless Trailblazer";
    }
    if (points >= 200) {
      return lang === "ka" ? "საკუთარი თავის გამარჯვებული" : "Self-Conqueror";
    }
    if (points >= 120) {
      return lang === "ka" ? "სიმამაცის შემქმნელი" : "Courage Creator";
    }
    if (points >= 60) {
      return lang === "ka" ? "შემოქმედებითი მოთამაშე" : "Creative Player";
    }
    return lang === "ka" ? "თავდაჯერების გზაზე" : "On the Way to Confidence";
  };

  const getRankMarker = (index: number) => {
    switch (index) {
      case 0:
        return (
          <div className="w-8 h-8 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center font-bold shadow-lg shadow-amber-400/20">
            🥇
          </div>
        );
      case 1:
        return (
          <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-950 flex items-center justify-center font-bold shadow-lg shadow-slate-200/20">
            🥈
          </div>
        );
      case 2:
        return (
          <div className="w-8 h-8 rounded-full bg-amber-700 text-slate-100 flex items-center justify-center font-bold shadow-lg shadow-amber-800/20">
            🥉
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center font-mono text-sm font-semibold">
            #{index + 1}
          </div>
        );
    }
  };

  return (
    <div id="leaderboard-section" className="space-y-8 max-w-4xl mx-auto">
      {/* Header Summary */}
      <div className="bg-gradient-to-r from-violet-950/40 via-amber-950/20 to-slate-900 border border-slate-800 p-6 md:p-8 rounded-2xl flex items-center gap-4 text-left">
        <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl">
          <Trophy className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-slate-100 uppercase tracking-tight">
            {lang === "ka" ? "საერთო რეიტინგი" : "Overall Ranking"}
          </h2>
          <p className="text-xs text-slate-400">
            {lang === "ka" 
              ? "თამაშის რეიტინგში არ ჩანს რეალური გვარები ან ტელეფონები. თქვენ შეგიძლიათ იასპარეზოთ გამოგონილი საიდუმლო სახელით."
              : "The leaderboard does not display real names or phone numbers. You can compete using a fictional secret pseudonym."}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        {/* Quick Podiums Summary */}
        {leaderboard.slice(0, 3).map((player, idx) => (
          <div
            key={player.id}
            className={`p-6 rounded-2xl border text-center flex flex-col items-center justify-center space-y-3 relative overflow-hidden ${
              idx === 0
                ? "bg-amber-400/5 border-amber-400/30 scale-105 z-10"
                : idx === 1
                ? "bg-slate-200/5 border-slate-200/20"
                : "bg-amber-700/5 border-amber-705/20"
            }`}
          >
            <div className="absolute top-3 left-3 text-[10px] text-slate-400 font-semibold">
              {idx === 0 
                ? (lang === "ka" ? "🏆 პირველი ადგილი" : "🏆 1st Place") 
                : idx === 1 
                ? (lang === "ka" ? "🥈 მეორე ადგილი" : "🥈 2nd Place") 
                : (lang === "ka" ? "🥉 მესამე ადგილი" : "🥉 3rd Place")}
            </div>
            
            <img
              src={player.avatar}
              alt={player.nickname}
              referrerPolicy="no-referrer"
              className={`w-14 h-14 rounded-full border-2 object-cover ${
                idx === 0 ? "border-amber-400" : idx === 1 ? "border-slate-300" : "border-amber-700"
              }`}
            />
            
            <div className="space-y-1">
              <h4 className="font-bold text-slate-100">{player.nickname}</h4>
              <span className="text-[10px] bg-slate-800 px-2.5 py-1 rounded-full text-amber-305 font-semibold inline-block">
                {getSymbolicTitle(player.points, player.completedCount)}
              </span>
            </div>

            <div className="text-2xl font-mono font-bold text-amber-400">{player.points} 🪙</div>

            <div className="grid grid-cols-2 gap-3 w-full text-[10px] text-slate-400 pt-3 border-t border-slate-800/80">
              <div>
                <span>{lang === "ka" ? "შესრულებული:" : "Completed:"}</span>
                <p className="font-bold text-slate-200">{player.completedCount}</p>
              </div>
              <div>
                <span>{lang === "ka" ? "ხმები:" : "Votes:"}</span>
                <p className="font-bold text-slate-200">❤️ {player.votesReceived}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Leaderboard Table List */}
      <div className="bg-slate-900/40 border border-slate-850 rounded-2xl overflow-hidden">
        <div className="p-4 bg-slate-900/80 border-b border-slate-850 grid grid-cols-12 gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-left">
          <div className="col-span-1 text-center">{lang === "ka" ? "ადგილი" : "Rank"}</div>
          <div className="col-span-5 md:col-span-4">{lang === "ka" ? "მოთამაშე / ტიტული" : "Player / Title"}</div>
          <div className="col-span-2 text-center">{lang === "ka" ? "ქულები" : "Points"}</div>
          <div className="col-span-2 text-center md:col-span-2">{lang === "ka" ? "შესრულებული გამოწვევები" : "Completed Challenges"}</div>
          <div className="col-span-2 text-center md:col-span-1">{lang === "ka" ? "მიღებული ხმები" : "Votes Received"}</div>
          <div className="hidden md:block md:col-span-2 text-center">{lang === "ka" ? "სტატუსი" : "Status"}</div>
        </div>

        <div className="divide-y divide-slate-850">
          {leaderboard.map((player, index) => (
            <div
              key={player.id}
              className={`p-4 grid grid-cols-12 gap-2 items-center text-left text-xs transition-colors hover:bg-slate-800/30 ${
                index % 2 === 0 ? "bg-slate-900/10" : "bg-transparent"
              }`}
            >
              <div className="col-span-1 flex justify-center">{getRankMarker(index)}</div>

              <div className="col-span-5 md:col-span-4 flex items-center gap-3">
                <img
                  src={player.avatar}
                  alt={player.nickname}
                  referrerPolicy="no-referrer"
                  className="w-8 h-8 rounded-full object-cover border border-slate-700"
                />
                <div className="space-y-0.5 min-w-0">
                  <h4 className="font-semibold text-slate-200 truncate">{player.nickname}</h4>
                  <span className="text-[9px] text-slate-450 block truncate">
                    {getSymbolicTitle(player.points, player.completedCount)}
                  </span>
                </div>
              </div>

              <div className="col-span-2 text-center font-mono font-bold text-amber-400">
                {player.points} 🪙
              </div>

              <div className="col-span-2 text-center font-mono text-slate-300">
                {player.completedCount} <span className="text-slate-500 text-[10px]">({player.publicCount} {lang === "ka" ? "საჯარო" : "Public"})</span>
              </div>

              <div className="col-span-2 md:col-span-1 text-center font-mono text-slate-300">
                ❤️ {player.votesReceived}
              </div>

              <div className="hidden md:block col-span-2 text-center">
                <span className="px-2 py-0.5 text-[9px] font-bold rounded bg-violet-600/10 text-violet-400 border border-violet-500/10">
                  {lang === "ka" ? "აქტიური მოთამაშე" : "Active Player"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
