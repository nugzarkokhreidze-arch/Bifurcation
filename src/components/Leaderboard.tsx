import { Trophy } from 'lucide-react';

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
  lang?: 'ka' | 'en';
}

export default function Leaderboard({
  leaderboard,
  lang = 'ka',
}: LeaderboardProps) {
  const players = leaderboard.filter(player => !player.isAdmin);

  const getSymbolicTitle = (points: number, completedCount: number) => {
    if (completedCount >= 5) {
      return lang === 'ka' ? 'შიშის დამმარცხებელი' : 'Fearless Trailblazer';
    }

    if (points >= 200) {
      return lang === 'ka' ? 'საკუთარი თავის გამარჯვებული' : 'Self-Conqueror';
    }

    if (points >= 120) {
      return lang === 'ka' ? 'სიმამაცის შემქმნელი' : 'Courage Creator';
    }

    if (points >= 60) {
      return lang === 'ka' ? 'შემოქმედებითი მოთამაშე' : 'Creative Player';
    }

    return lang === 'ka' ? 'თავდაჯერების გზაზე' : 'On the Way to Confidence';
  };

  const getRankMarker = (index: number) => {
    if (index === 0) {
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-400 font-bold text-slate-950 shadow-lg shadow-amber-400/20">
          🥇
        </div>
      );
    }

    if (index === 1) {
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 font-bold text-slate-950 shadow-lg shadow-slate-200/20">
          🥈
        </div>
      );
    }

    if (index === 2) {
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-700 font-bold text-slate-100 shadow-lg shadow-amber-800/20">
          🥉
        </div>
      );
    }

    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 font-mono text-sm font-semibold text-slate-400">
        #{index + 1}
      </div>
    );
  };

  return (
    <div id="leaderboard-section" className="mx-auto max-w-4xl space-y-8">
      <div className="flex items-center gap-4 rounded-2xl border border-slate-800 bg-gradient-to-r from-violet-950/40 via-amber-950/20 to-slate-900 p-6 text-left md:p-8">
        <div className="rounded-xl bg-amber-500/10 p-3 text-amber-400">
          <Trophy className="h-8 w-8" />
        </div>

        <div className="space-y-1">
          <h2 className="text-2xl font-bold uppercase tracking-tight text-slate-100">
            {lang === 'ka' ? 'საერთო რეიტინგი' : 'Overall Ranking'}
          </h2>

          <p className="text-xs text-slate-400">
            {lang === 'ka'
              ? 'თამაშის რეიტინგში არ ჩანს რეალური გვარები ან ტელეფონები. თქვენ შეგიძლიათ იასპარეზოთ გამოგონილი საიდუმლო სახელით.'
              : 'The leaderboard does not display real names or phone numbers. You can compete using a fictional secret pseudonym.'}
          </p>
        </div>
      </div>

      {players.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm font-bold text-slate-400">
          {lang === 'ka'
            ? 'რეიტინგში მოთამაშეები ჯერ არ არიან.'
            : 'No players in the ranking yet.'}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 pt-2 md:grid-cols-3">
            {players.slice(0, 3).map((player, index) => (
              <div
                key={player.id}
                className={`relative flex flex-col items-center justify-center space-y-3 overflow-hidden rounded-2xl border p-6 text-center ${
                  index === 0
                    ? 'z-10 scale-105 border-amber-400/30 bg-amber-400/5'
                    : index === 1
                      ? 'border-slate-200/20 bg-slate-200/5'
                      : 'border-amber-700/20 bg-amber-700/5'
                }`}
              >
                <div className="absolute left-3 top-3 text-[10px] font-semibold text-slate-400">
                  {index === 0
                    ? lang === 'ka'
                      ? '🏆 პირველი ადგილი'
                      : '🏆 1st Place'
                    : index === 1
                      ? lang === 'ka'
                        ? '🥈 მეორე ადგილი'
                        : '🥈 2nd Place'
                      : lang === 'ka'
                        ? '🥉 მესამე ადგილი'
                        : '🥉 3rd Place'}
                </div>

                <img
                  src={player.avatar}
                  alt={player.nickname}
                  referrerPolicy="no-referrer"
                  className={`h-14 w-14 rounded-full border-2 object-cover ${
                    index === 0
                      ? 'border-amber-400'
                      : index === 1
                        ? 'border-slate-300'
                        : 'border-amber-700'
                  }`}
                />

                <div className="space-y-1">
                  <h4 className="font-bold text-slate-100">
                    @{player.nickname}
                  </h4>

                  <span className="inline-block rounded-full bg-slate-800 px-2.5 py-1 text-[10px] font-semibold text-amber-300">
                    {getSymbolicTitle(player.points, player.completedCount)}
                  </span>
                </div>

                <div className="font-mono text-2xl font-bold text-amber-400">
                  {player.points} 🪙
                </div>

                <div className="grid w-full grid-cols-2 gap-3 border-t border-slate-800/80 pt-3 text-[10px] text-slate-400">
                  <div>
                    <span>{lang === 'ka' ? 'შესრულებული:' : 'Completed:'}</span>
                    <p className="font-bold text-slate-200">
                      {player.completedCount}
                    </p>
                  </div>

                  <div>
                    <span>{lang === 'ka' ? 'ხმები:' : 'Votes:'}</span>
                    <p className="font-bold text-slate-200">
                      ❤️ {player.votesReceived}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40">
            <div className="grid grid-cols-12 gap-2 border-b border-slate-800 bg-slate-900/80 p-4 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <div className="col-span-1 text-center">
                {lang === 'ka' ? 'ადგილი' : 'Rank'}
              </div>

              <div className="col-span-5 md:col-span-4">
                {lang === 'ka' ? 'მოთამაშე / ტიტული' : 'Player / Title'}
              </div>

              <div className="col-span-2 text-center">
                {lang === 'ka' ? 'ქულები' : 'Points'}
              </div>

              <div className="col-span-2 text-center">
                {lang === 'ka'
                  ? 'შესრულებული'
                  : 'Completed'}
              </div>

              <div className="col-span-2 text-center md:col-span-1">
                {lang === 'ka' ? 'ხმები' : 'Votes'}
              </div>

              <div className="hidden text-center md:col-span-2 md:block">
                {lang === 'ka' ? 'სტატუსი' : 'Status'}
              </div>
            </div>

            <div className="divide-y divide-slate-800">
              {players.map((player, index) => (
                <div
                  key={player.id}
                  className={`grid grid-cols-12 items-center gap-2 p-4 text-left text-xs transition-colors hover:bg-slate-800/30 ${
                    index % 2 === 0 ? 'bg-slate-900/10' : 'bg-transparent'
                  }`}
                >
                  <div className="col-span-1 flex justify-center">
                    {getRankMarker(index)}
                  </div>

                  <div className="col-span-5 flex items-center gap-3 md:col-span-4">
                    <img
                      src={player.avatar}
                      alt={player.nickname}
                      referrerPolicy="no-referrer"
                      className="h-8 w-8 rounded-full border border-slate-700 object-cover"
                    />

                    <div className="min-w-0 space-y-0.5">
                      <h4 className="truncate font-semibold text-slate-200">
                        @{player.nickname}
                      </h4>

                      <span className="block truncate text-[9px] text-slate-400">
                        {getSymbolicTitle(player.points, player.completedCount)}
                      </span>
                    </div>
                  </div>

                  <div className="col-span-2 text-center font-mono font-bold text-amber-400">
                    {player.points} 🪙
                  </div>

                  <div className="col-span-2 text-center font-mono text-slate-300">
                    {player.completedCount}{' '}
                    <span className="text-[10px] text-slate-500">
                      ({player.publicCount}{' '}
                      {lang === 'ka' ? 'საჯარო' : 'Public'})
                    </span>
                  </div>

                  <div className="col-span-2 text-center font-mono text-slate-300 md:col-span-1">
                    ❤️ {player.votesReceived}
                  </div>

                  <div className="hidden text-center md:col-span-2 md:block">
                    <span className="rounded border border-violet-500/10 bg-violet-600/10 px-2 py-0.5 text-[9px] font-bold text-violet-400">
                      {lang === 'ka' ? 'აქტიური მოთამაშე' : 'Active Player'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
