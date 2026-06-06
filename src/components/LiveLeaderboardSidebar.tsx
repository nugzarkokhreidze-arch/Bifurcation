import { useEffect, useMemo, useState } from 'react';
import { Trophy } from 'lucide-react';

import { User } from '../types';
import {
  STORAGE_UPDATE_EVENT,
  storageKeys,
  storageService,
} from '../services/storageService';

interface LiveLeaderboardSidebarProps {
  currentUser: User | null;
  lang?: 'ka' | 'en';
  monthlyPlayerRecords?: any[];
}

function getFallbackAvatar(nickname?: string) {
  return `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(
    nickname || 'player'
  )}`;
}

function isActivePlayer(player: any) {
  const status = player?.status || 'active';

  return (
    player?.id &&
    !player.isAdmin &&
    !player.banned &&
    status !== 'cancelled' &&
    status !== 'deleted' &&
    status !== 'inactive'
  );
}

function loadSubmissions() {
  const fromMain = storageService.loadData<any[]>(storageKeys.submissions, []);
  const fromLegacy = storageService.loadData<any[]>('submissions', []);

  const map = new Map<string, any>();

  [...fromMain, ...fromLegacy].forEach(item => {
    if (!item?.id) return;
    map.set(item.id, { ...(map.get(item.id) || {}), ...item });
  });

  return Array.from(map.values());
}

function uniquePlayers(players: any[]) {
  const map = new Map<string, any>();

  players.forEach(player => {
    if (!player?.id) return;

    const existing = map.get(player.id);

    map.set(player.id, {
      ...(existing || {}),
      ...player,
      points: Number(player.points ?? existing?.points ?? 100),
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
  const [submissions, setSubmissions] = useState<any[]>([]);

  function loadLeaderboardData() {
    const cachedUsers = storageService.loadData<any[]>(storageKeys.users, []);
    const cachedCurrentUser = storageService.loadData<any | null>(
      storageKeys.currentUser,
      null
    );

    setPlayers(
      uniquePlayers([
        ...cachedUsers,
        ...(cachedCurrentUser ? [cachedCurrentUser] : []),
        ...(currentUser ? [currentUser] : []),
      ]).filter(isActivePlayer)
    );

    setRecords(
      monthlyPlayerRecords?.length
        ? monthlyPlayerRecords
        : storageService.loadData<any[]>(storageKeys.monthlyPlayerRecords, [])
    );

    setSubmissions(loadSubmissions());
  }

  useEffect(() => {
    loadLeaderboardData();

    const onStorageUpdate = () => loadLeaderboardData();
    const onFocus = () => loadLeaderboardData();

    window.addEventListener(STORAGE_UPDATE_EVENT, onStorageUpdate);
    window.addEventListener('focus', onFocus);

    return () => {
      window.removeEventListener(STORAGE_UPDATE_EVENT, onStorageUpdate);
      window.removeEventListener('focus', onFocus);
    };
  }, [currentUser?.id, currentUser?.points, monthlyPlayerRecords]);

  const rankedPlayers = useMemo(() => {
    const mergedPlayers = uniquePlayers([
      ...players,
      ...(currentUser ? [currentUser] : []),
      ...storageService.loadData<any[]>(storageKeys.users, []),
    ]).filter(isActivePlayer);

    return mergedPlayers
      .map(player => {
        const userSubmissions = submissions.filter(
          submission => submission.playerId === player.id || submission.userId === player.id
        );

        const record =
          records.find(item => item.playerId === player.id) || null;

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
          livePoints: Number(player.points ?? 100),
          completedCount:
            player.completedChallenges?.length ||
            record?.completedChallenges?.length ||
            userSubmissions.length ||
            0,
          votesReceived: userSubmissions.reduce(
            (sum, submission) =>
              sum +
              (submission.votes ||
                submission.likes ||
                submission.likedBy?.length ||
                submission.votedUserIds?.length ||
                0),
            0
          ),
        };
      })
      .filter(player => player.id && !player.banned)
      .sort((a, b) => {
        if (b.livePoints !== a.livePoints) return b.livePoints - a.livePoints;
        if (b.completedCount !== a.completedCount) {
          return b.completedCount - a.completedCount;
        }
        return b.votesReceived - a.votesReceived;
      })
      .slice(0, 10);
  }, [players, records, submissions, currentUser, lang]);

  return (
    <div className="w-full shrink-0 select-none rounded-3xl border border-violet-900/40 bg-[#131129] p-5 text-white shadow-xl lg:w-72">
      <div className="flex items-center justify-between border-b border-violet-950 pb-3 text-left">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 fill-amber-400 text-amber-400" />

          <div>
            <h4 className="text-xs font-black uppercase tracking-wider">
              {lang === 'ka' ? 'TOP 10 რეიტინგი' : 'Top 10 leaderboard'}
            </h4>

            <span className="block font-mono text-[8px] font-bold uppercase text-purple-400/80">
              ● REGISTERED PLAYERS
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
                    <p className="truncate text-xs font-black text-white">
                      @{player.nickname}
                    </p>

                    <p className="text-[9px] font-bold text-slate-400">
                      {player.completedCount}{' '}
                      {lang === 'ka' ? 'შესრულება' : 'completed'}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="font-mono text-sm font-black text-amber-300">
                    {player.livePoints}
                  </p>

                  <p className="text-[8px] font-bold uppercase text-slate-500">
                    {lang === 'ka' ? 'ქულა' : 'pts'}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
