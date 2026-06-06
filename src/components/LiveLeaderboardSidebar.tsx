import React, { useEffect, useMemo, useState } from 'react';
import { User } from '../types';
import { storageService, storageKeys } from '../services/storageService';
import { playerService } from '../services/playerService';
import { Trophy } from 'lucide-react';

interface LiveLeaderboardSidebarProps {
  currentUser: User | null;
  lang?: 'ka' | 'en';
  monthlyPlayerRecords?: any[];
}

function normalizeMarathonId(id?: string) {
  if (!id) return 'marathon-june';
  return id.startsWith('marathon-') ? id : `marathon-${id}`;
}

function getFallbackAvatar(nickname?: string) {
  return `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(
    nickname || 'player'
  )}`;
}

function uniquePlayers(players: any[]) {
  const map = new Map<string, any>();

  players.forEach(player => {
    if (!player?.id) return;

    const existing = map.get(player.id);

    map.set(player.id, {
      ...(existing || {}),
      ...player,
      points: player.points ?? existing?.points ?? 100,
      nickname:
        player.nickname ||
        existing?.nickname ||
        player.firstName ||
        player.email ||
        'მოთამაშე',
      avatar:
        player.avatar ||
        existing?.avatar ||
        getFallbackAvatar(player.nickname || player.email || player.id),
    });
  });

  return Array.from(map.values());
}

export default function LiveLeaderboardSidebar({
  currentUser,
  lang = 'ka',
  monthlyPlayerRecords,
}: LiveLeaderboardSidebarProps) {
  const [players, setPlayers] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;

    async function loadPlayers() {
      const cachedUsers = storageService.loadData<any[]>(storageKeys.users, []);
      const cachedCurrentUser = storageService.loadData<any | null>(
        storageKeys.currentUser,
        null
      );

      const localPlayers = uniquePlayers([
        ...cachedUsers,
        ...(cachedCurrentUser ? [cachedCurrentUser] : []),
        ...(currentUser ? [currentUser] : []),
      ]);

      if (mounted) {
        setPlayers(localPlayers);
      }

      try {
        const onlinePlayers = await playerService.getAllPlayers();

        if (!mounted) return;

        setPlayers(
          uniquePlayers([
            ...localPlayers,
            ...(onlinePlayers || []),
            ...(currentUser ? [currentUser] : []),
          ])
        );
      } catch (error) {
        console.warn('Leaderboard online players load failed:', error);
      }
    }

    function loadRecords() {
      const localRecords = storageService.loadData<any[]>(
        storageKeys.monthlyPlayerRecords,
        []
      );

      setRecords(monthlyPlayerRecords?.length ? monthlyPlayerRecords : localRecords);
    }

    loadPlayers();
    loadRecords();

    const interval = window.setInterval(() => {
      loadPlayers();
      loadRecords();
    }, 2500);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [currentUser, monthlyPlayerRecords]);

  const rankedPlayers = useMemo(() => {
    const activeMarathonId = normalizeMarathonId('june');

    const mergedPlayers = uniquePlayers([
      ...players,
      ...(currentUser ? [currentUser] : []),
      ...storageService.loadData<any[]>(storageKeys.users, []),
    ]);

    return mergedPlayers
      .map(player => {
        const record =
          records.find(
            item =>
              item.playerId === player.id &&
              normalizeMarathonId(item.marathonId) === activeMarathonId
          ) ||
          records.find(item => item.playerId === player.id);

        return {
          ...player,
          nickname:
            player.nickname ||
            player.firstName ||
            player.email ||
            (lang === 'ka' ? 'მოთამაშე' : 'Player'),
          avatar:
            player.avatar ||
            getFallbackAvatar(player.nickname || player.email || player.id),
          livePoints: Number(record?.points ?? player.points ?? 100),
          completedCount: record?.completedChallenges?.length || 0,
        };
      })
      .filter(player => player.id && !player.banned)
      .sort((a, b) => {
        if (b.livePoints !== a.livePoints) return b.livePoints - a.livePoints;
        return b.completedCount - a.completedCount;
      })
      .slice(0, 10);
  }, [players, records, currentUser, lang]);

  return (
    <div className="w-full shrink-0 select-none rounded-3xl border border-violet-900/40 bg-[#131129] p-5 text-white shadow-xl lg:w-72">
      <div className="flex items-center justify-between border-b border-violet-950 pb-3 text-left">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 fill-amber-400 text-amber-400" />

          <div>
            <h4 className="text-xs font-black uppercase tracking-wider">
              {lang === 'ka' ? 'LIVE რეიტინგი' : 'Leaderboard'}
            </h4>

            <span className="block font-mono text-[8px] font-bold uppercase text-purple-400/80">
              ● ONLINE SYNC
            </span>
          </div>
        </div>

        <span className="rounded bg-purple-950 px-2 py-0.5 font-mono text-[9px] font-bold text-purple-300">
          TOP 10
        </span>
      </div>

      <div className="mt-4 space-y-2">
        {rankedPlayers.length === 0 ? (
          <div className="rounded-2xl border border-violet-950/60 bg-[#0d0b21]/70 p-4 text-center">
            <p className="text-[11px] font-bold text-slate-400">
              {lang === 'ka'
                ? 'რეიტინგი ჯერ ცარიელია.'
                : 'Leaderboard is empty yet.'}
            </p>
          </div>
        ) : (
          rankedPlayers.map((player, index) => {
            const isMe = currentUser?.id === player.id;
            const rank = index + 1;

            return (
              <div
                key={player.id}
                className={`flex items-center justify-between rounded-xl border p-2.5 text-left transition-all ${
                  isMe
                    ? 'border-[#7C4DFF] bg-[#7C4DFF]/20'
                    : 'border-violet-950/40 bg-[#0d0b21]/60'
                }`}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="w-5 text-center font-mono text-xs font-bold text-slate-400">
                    {rank === 1
                      ? '👑'
                      : rank === 2
                        ? '🥈'
                        : rank === 3
                          ? '🥉'
                          : `#${rank}`}
                  </span>

                  <img
                    src={player.avatar}
                    className="h-8 w-8 rounded-lg border border-violet-950 object-cover"
                    alt="Avatar"
                  />

                  <div className="min-w-0">
                    <p
                      className={`max-w-[95px] truncate text-xs font-black ${
                        isMe ? 'text-purple-200' : 'text-slate-200'
                      }`}
                    >
                      @{player.nickname}
                    </p>

                    <p className="text-[9px] font-bold text-slate-500">
                      {lang === 'ka'
                        ? `${player.completedCount} შესრულებული`
                        : `${player.completedCount} completed`}
                    </p>
                  </div>
                </div>

                <span className="shrink-0 font-mono text-xs font-black text-amber-400">
                  {player.livePoints}{' '}
                  <span className="text-[10px]">
                    {lang === 'ka' ? 'ქულა' : 'pts'}
                  </span>
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
