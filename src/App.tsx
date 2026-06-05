import React, { useEffect, useMemo, useState } from 'react';
import { Camera, CheckCircle2, Heart, Home, Lock, LogOut, Mic, PlayCircle, Trophy, Upload, UserPlus, Users, Video, Wallet } from 'lucide-react';
import { initialChallenges, initialMarathons } from './seedData';
import type { Challenge, Marathon, Submission, User } from './types';

type Tab = 'home' | 'marathons' | 'challenges' | 'submissions' | 'leaderboard' | 'profile';
type LocalSubmission = Submission & {
  marathonId: string;
  submissionType: 'video' | 'photo' | 'audio' | 'reflection' | 'text';
  fileName?: string;
  fileMime?: string;
  fileSize?: number;
  fileKey?: string;
  reflectionText?: string;
  likedBy?: string[];
  playerNickname?: string;
  challengeTitle?: string;
};
type PlayerRecord = {
  playerId: string;
  marathonId: string;
  participationConfirmed: boolean;
  acceptedChallenges: string[];
  completedChallenges: string[];
  skippedChallenges: string[];
  points: number;
  likes: number;
};

type AppData = {
  users: User[];
  submissions: LocalSubmission[];
  records: PlayerRecord[];
  currentUserId?: string;
};

const DATA_KEY = 'bifurcation_local_data_v2';
const DB_NAME = 'bifurcation_files_db';
const DB_STORE = 'files';

const defaultAdmin: User = {
  id: 'admin-1',
  firstName: 'ადმინისტრატორი',
  lastName: 'ბიფურკაცია',
  email: 'admin@bifurcation.ge',
  phone: '555111222',
  nickname: 'მეგზური_ადმინი',
  points: 1000,
  avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=admin',
  fictionalNameEnabled: true,
  status: 'active',
  consentAccepted: true,
  consentDate: new Date().toISOString(),
  completedChallenges: [],
  hiddenChallenges: [],
  publicChallenges: [],
  skippedChallenges: [],
  votesReceived: 0,
  braveryBonuses: 0,
  coachQuestionsRemaining: 3,
  videoCallAvailable: true,
  banned: false,
  isAdmin: true,
  badges: [],
  achievements: [],
  notifications: [],
};

const fallbackUser: User = {
  id: 'guest-player',
  firstName: 'მოთამაშე',
  lastName: 'ბიფურკაცია',
  email: 'player@local.app',
  phone: '',
  nickname: 'გამბედავი_მოთამაშე',
  points: 100,
  avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=player',
  fictionalNameEnabled: true,
  status: 'active',
  consentAccepted: true,
  consentDate: new Date().toISOString(),
  completedChallenges: [],
  hiddenChallenges: [],
  publicChallenges: [],
  skippedChallenges: [],
  votesReceived: 0,
  braveryBonuses: 0,
  coachQuestionsRemaining: 3,
  videoCallAvailable: true,
  banned: false,
  badges: [],
  achievements: [],
  notifications: [],
};

const initialData: AppData = {
  users: [defaultAdmin, fallbackUser],
  submissions: [],
  records: [],
  currentUserId: fallbackUser.id,
};

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function loadLocalData(): AppData {
  try {
    const raw = localStorage.getItem(DATA_KEY);
    if (!raw) return initialData;
    const parsed = JSON.parse(raw) as Partial<AppData>;
    return {
      users: parsed.users?.length ? parsed.users : initialData.users,
      submissions: parsed.submissions || [],
      records: parsed.records || [],
      currentUserId: parsed.currentUserId || fallbackUser.id,
    };
  } catch {
    return initialData;
  }
}

function saveLocalData(data: AppData) {
  localStorage.setItem(DATA_KEY, JSON.stringify(data));
}

function openFilesDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(DB_STORE)) db.createObjectStore(DB_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveFileToIndexedDb(key: string, file: File) {
  const db = await openFilesDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readwrite');
    tx.objectStore(DB_STORE).put(file, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function loadFileUrl(key?: string): Promise<string | undefined> {
  if (!key) return undefined;
  const db = await openFilesDb();
  const file = await new Promise<Blob | undefined>((resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readonly');
    const req = tx.objectStore(DB_STORE).get(key);
    req.onsuccess = () => resolve(req.result as Blob | undefined);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return file ? URL.createObjectURL(file) : undefined;
}

function challengeTypeIcon(type: Challenge['submissionType'] | 'audio') {
  if (type === 'photo') return <Camera size={18} />;
  if (type === 'audio') return <Mic size={18} />;
  if (type === 'reflection' || type === 'text') return <CheckCircle2 size={18} />;
  return <Video size={18} />;
}

function getMimeAccept(type: string) {
  if (type === 'photo') return 'image/*';
  if (type === 'audio') return 'audio/*';
  if (type === 'video') return 'video/*';
  return undefined;
}

export default function App() {
  const [tab, setTab] = useState<Tab>('home');
  const [data, setData] = useState<AppData>(() => loadLocalData());
  const [selectedMarathonId, setSelectedMarathonId] = useState('marathon-june');
  const [selectedChallengeId, setSelectedChallengeId] = useState<string>('');
  const [visibility, setVisibility] = useState<'public' | 'hidden'>('public');
  const [reflectionText, setReflectionText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [mediaUrls, setMediaUrls] = useState<Record<string, string>>({});
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState({ identifier: '', password: '', nickname: '', email: '', firstName: '' });

  useEffect(() => saveLocalData(data), [data]);

  useEffect(() => {
    let mounted = true;
    async function hydrateMedia() {
      const next: Record<string, string> = {};
      for (const sub of data.submissions) {
        const url = await loadFileUrl(sub.fileKey);
        if (url) next[sub.id] = url;
      }
      if (mounted) setMediaUrls(next);
    }
    hydrateMedia();
    return () => {
      mounted = false;
      Object.values(mediaUrls).forEach(URL.revokeObjectURL);
    };
  }, [data.submissions.length]);

  const marathons = initialMarathons as Marathon[];
  const challenges = initialChallenges as Challenge[];
  const currentUser = data.users.find(u => u.id === data.currentUserId) || data.users[0];
  const selectedChallenge = challenges.find(c => c.id === selectedChallengeId) || challenges.find(c => c.marathonId === selectedMarathonId);

  const visibleChallenges = useMemo(
    () => challenges.filter(c => c.marathonId === selectedMarathonId && c.status !== 'archived'),
    [selectedMarathonId]
  );

  useEffect(() => {
    if (!selectedChallengeId && visibleChallenges[0]) setSelectedChallengeId(visibleChallenges[0].id);
    if (selectedChallengeId && !visibleChallenges.find(c => c.id === selectedChallengeId) && visibleChallenges[0]) {
      setSelectedChallengeId(visibleChallenges[0].id);
    }
  }, [selectedMarathonId, selectedChallengeId, visibleChallenges]);

  const enrichedSubmissions = data.submissions.map(sub => ({
    ...sub,
    playerNickname: data.users.find(u => u.id === sub.playerId)?.nickname || 'უცნობი',
    challengeTitle: challenges.find(c => c.id === sub.challengeId)?.title || 'გამოწვევა',
  }));

  const leaderboard = data.users
    .filter(u => !u.isAdmin && !u.banned)
    .map(u => ({
      ...u,
      completed: data.submissions.filter(s => s.playerId === u.id).length,
      votes: data.submissions.filter(s => s.playerId === u.id).reduce((sum, s) => sum + (s.votes || 0), 0),
    }))
    .sort((a, b) => b.points - a.points || b.completed - a.completed || b.votes - a.votes);

  function updateUser(user: User) {
    setData(prev => ({ ...prev, users: prev.users.map(u => (u.id === user.id ? user : u)) }));
  }

  function ensureRecord(playerId: string, marathonId: string, prev: AppData): PlayerRecord[] {
    if (prev.records.some(r => r.playerId === playerId && r.marathonId === marathonId)) return prev.records;
    return [
      ...prev.records,
      { playerId, marathonId, participationConfirmed: true, acceptedChallenges: [], completedChallenges: [], skippedChallenges: [], points: 0, likes: 0 },
    ];
  }

  function joinMarathon(marathonId: string) {
    setData(prev => {
      const records = ensureRecord(currentUser.id, marathonId, prev);
      const users = prev.users.map(u => (u.id === currentUser.id ? { ...u, points: u.points + 50 } : u));
      return { ...prev, users, records };
    });
    setSelectedMarathonId(marathonId);
    setTab('challenges');
  }

  async function submitChallenge(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedChallenge) return;
    if (selectedChallenge.submissionType !== 'reflection' && selectedChallenge.submissionType !== 'text' && !file) {
      alert('გთხოვთ ატვირთოთ შესაბამისი ფაილი.');
      return;
    }

    const subId = makeId('sub');
    const fileKey = file ? `file-${subId}` : undefined;
    if (file && fileKey) await saveFileToIndexedDb(fileKey, file);

    const reward = selectedChallenge.completionReward || 20;
    const bonus = visibility === 'public' ? selectedChallenge.publicVideoBonus || selectedChallenge.publicBraveryBonus || 0 : 0;

    const submission: LocalSubmission = {
      id: subId,
      playerId: currentUser.id,
      challengeId: selectedChallenge.id,
      marathonId: selectedChallenge.marathonId || selectedMarathonId,
      videoUrl: '',
      visibility,
      comment: reflectionText,
      reflectionText,
      approved: true,
      votes: 0,
      aiReaction: 'შესანიშნავია! გამოწვევა წარმატებით დაემატა ლოკალურ სივრცეში და შენმა გამბედაობამ ქულებიც მოგიტანა.',
      createdAt: new Date().toISOString(),
      safetyFlag: false,
      votedUserIds: [],
      likedBy: [],
      submissionType: selectedChallenge.submissionType,
      fileName: file?.name,
      fileMime: file?.type,
      fileSize: file?.size,
      fileKey,
    };

    setData(prev => {
      const records = ensureRecord(currentUser.id, submission.marathonId, prev).map(r => {
        if (r.playerId === currentUser.id && r.marathonId === submission.marathonId) {
          return {
            ...r,
            completedChallenges: Array.from(new Set([...r.completedChallenges, selectedChallenge.id])),
            points: r.points + reward + bonus,
          };
        }
        return r;
      });

      const users = prev.users.map(u => {
        if (u.id !== currentUser.id) return u;
        return {
          ...u,
          points: u.points + reward + bonus,
          completedChallenges: Array.from(new Set([...u.completedChallenges, selectedChallenge.id])),
          publicChallenges: visibility === 'public' ? Array.from(new Set([...u.publicChallenges, selectedChallenge.id])) : u.publicChallenges,
          hiddenChallenges: visibility === 'hidden' ? Array.from(new Set([...u.hiddenChallenges, selectedChallenge.id])) : u.hiddenChallenges,
          braveryBonuses: u.braveryBonuses + bonus,
        };
      });
      return { ...prev, users, records, submissions: [submission, ...prev.submissions] };
    });

    setFile(null);
    setReflectionText('');
    setTab('submissions');
  }

  function vote(subId: string) {
    setData(prev => {
      const submissions = prev.submissions.map(s => {
        if (s.id !== subId || s.playerId === currentUser.id) return s;
        const likedBy = s.likedBy || s.votedUserIds || [];
        if (likedBy.includes(currentUser.id)) return s;
        return { ...s, likedBy: [...likedBy, currentUser.id], votedUserIds: [...likedBy, currentUser.id], votes: (s.votes || 0) + 1 };
      });
      const target = prev.submissions.find(s => s.id === subId);
      const users = prev.users.map(u => {
        if (target && u.id === target.playerId && target.playerId !== currentUser.id) {
          return { ...u, points: u.points + 5, votesReceived: u.votesReceived + 1 };
        }
        if (u.id === currentUser.id && target?.playerId !== currentUser.id) return { ...u, points: u.points + 2 };
        return u;
      });
      return { ...prev, submissions, users };
    });
  }

  function loginOrRegister(e: React.FormEvent) {
    e.preventDefault();
    if (authMode === 'login') {
      const found = data.users.find(u => [u.email, u.nickname, u.phone].includes(form.identifier));
      if (!found) {
        alert('მომხმარებელი ვერ მოიძებნა. სცადეთ რეგისტრაცია.');
        return;
      }
      setData(prev => ({ ...prev, currentUserId: found.id }));
      return;
    }
    const nickname = form.nickname.trim() || `მოთამაშე_${Math.random().toString(36).slice(2, 6)}`;
    if (data.users.some(u => u.nickname === nickname || u.email === form.email)) {
      alert('ეს ნიკნეიმი ან ელფოსტა უკვე გამოყენებულია.');
      return;
    }
    const newUser: User = {
      ...fallbackUser,
      id: makeId('usr'),
      firstName: form.firstName || 'მოთამაშე',
      email: form.email || `${nickname}@local.app`,
      nickname,
      avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(nickname)}`,
      points: 100,
      completedChallenges: [],
      hiddenChallenges: [],
      publicChallenges: [],
      skippedChallenges: [],
      votesReceived: 0,
      braveryBonuses: 0,
    };
    setData(prev => ({ ...prev, users: [...prev.users, newUser], currentUserId: newUser.id }));
  }

  function exportBackup() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bifurcation-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importBackup(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (!parsed.users || !parsed.submissions) throw new Error('bad format');
        setData(parsed);
      } catch {
        alert('Backup ფაილი არასწორი ფორმატისაა.');
      }
    };
    reader.readAsText(file);
  }

  const nav: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'home', label: 'მთავარი', icon: <Home size={18} /> },
    { id: 'marathons', label: 'მარათონები', icon: <Trophy size={18} /> },
    { id: 'challenges', label: 'გამოწვევები', icon: <PlayCircle size={18} /> },
    { id: 'submissions', label: 'აქტივობები', icon: <Video size={18} /> },
    { id: 'leaderboard', label: 'ლიდერები', icon: <Users size={18} /> },
    { id: 'profile', label: 'პროფილი', icon: <Wallet size={18} /> },
  ];

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-white/60 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-violet-500">Bifurcation</p>
            <h1 className="text-2xl font-bold text-slate-900">ბიფურკაცია — ლოკალური თამაში</h1>
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-slate-100 px-4 py-2">
            <img src={currentUser.avatar} className="h-10 w-10 rounded-full" alt="avatar" />
            <div>
              <p className="font-semibold">@{currentUser.nickname}</p>
              <p className="text-sm text-slate-500">{currentUser.points} ქულა</p>
            </div>
          </div>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 pb-4">
          {nav.map(item => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${tab === item.id ? 'bg-violet-600 text-white shadow-lg shadow-violet-200' : 'bg-white text-slate-700 hover:bg-violet-50'}`}
            >
              {item.icon}{item.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        {tab === 'home' && (
          <section className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
            <div className="rounded-[2rem] bg-white/85 p-8 shadow-xl shadow-violet-100">
              <h2 className="text-4xl font-black text-slate-950">თამაში მუშაობს AI Studio-ს გარეშე</h2>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">
                ეს ვერსია არის local-first: რეგისტრაცია, ქულები, მარათონში ჩართვა, ფოტო/ვიდეო/აუდიო ატვირთვა და აქტივობები ინახება ბრაუზერში. Vercel-ზე არ სჭირდება Gemini API, Express სერვერი ან AI Studio-ს სპეციალური გარემო.
              </p>
              <div className="mt-8 grid gap-4 md:grid-cols-3">
                <Stat label="მარათონები" value={marathons.length} />
                <Stat label="გამოწვევები" value={challenges.length} />
                <Stat label="ატვირთული აქტივობები" value={data.submissions.length} />
              </div>
            </div>
            <div className="rounded-[2rem] bg-slate-950 p-6 text-white shadow-xl">
              <h3 className="text-xl font-bold">სწრაფი დაწყება</h3>
              <p className="mt-3 text-slate-300">აირჩიე აქტიური მარათონი, მიიღე გამოწვევა და ატვირთე მტკიცებულება ფაილის სახით.</p>
              <button onClick={() => setTab('marathons')} className="mt-6 w-full rounded-2xl bg-white px-4 py-3 font-bold text-slate-950">მარათონში ჩართვა</button>
            </div>
          </section>
        )}

        {tab === 'marathons' && (
          <section>
            <SectionTitle title="მარათონები" subtitle="აქ აღარ არის მენიუს გაორება — ყველა თვე ერთ სივრცეშია." />
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {marathons.map(m => {
                const count = challenges.filter(c => c.marathonId === m.id).length;
                return (
                  <article key={m.id} className="rounded-[1.6rem] bg-white p-6 shadow-lg shadow-slate-200">
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${m.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{m.status}</span>
                    <h3 className="mt-4 text-2xl font-black">{m.title_ka}</h3>
                    <p className="mt-2 text-sm text-slate-500">{new Date(m.startDate).toLocaleDateString()} — {new Date(m.endDate).toLocaleDateString()}</p>
                    <p className="mt-3 font-semibold text-violet-600">{count} გამოწვევა</p>
                    <button onClick={() => joinMarathon(m.id)} className="mt-6 w-full rounded-2xl bg-violet-600 px-4 py-3 font-bold text-white">ჩართვა / ნახვა</button>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {tab === 'challenges' && (
          <section className="grid gap-6 lg:grid-cols-[0.9fr_1.3fr]">
            <div>
              <SectionTitle title="გამოწვევები" subtitle="აირჩიე თვე და კონკრეტული დავალება." />
              <select value={selectedMarathonId} onChange={e => setSelectedMarathonId(e.target.value)} className="mb-4 w-full rounded-2xl border border-slate-200 bg-white p-3">
                {marathons.map(m => <option key={m.id} value={m.id}>{m.title_ka}</option>)}
              </select>
              <div className="max-h-[650px] space-y-3 overflow-auto pr-2">
                {visibleChallenges.map(ch => (
                  <button key={ch.id} onClick={() => setSelectedChallengeId(ch.id)} className={`w-full rounded-2xl p-4 text-left shadow-sm transition ${selectedChallengeId === ch.id ? 'bg-violet-600 text-white' : 'bg-white hover:bg-violet-50'}`}>
                    <div className="flex items-center gap-2 text-sm font-bold opacity-80">{challengeTypeIcon(ch.submissionType)} #{ch.challengeNumber || ''} · {ch.submissionType}</div>
                    <h3 className="mt-2 font-black">{ch.title}</h3>
                    <p className="mt-1 line-clamp-2 text-sm opacity-80">{ch.description}</p>
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-[2rem] bg-white p-6 shadow-xl shadow-violet-100">
              {selectedChallenge && (
                <>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full bg-violet-100 px-3 py-1 text-sm font-bold text-violet-700">{selectedChallenge.difficulty}</span>
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-700">ღირებულება {selectedChallenge.acceptanceCost || selectedChallenge.challengeCost}</span>
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-bold text-emerald-700">ჯილდო {selectedChallenge.completionReward}</span>
                  </div>
                  <h2 className="mt-5 text-3xl font-black">{selectedChallenge.title}</h2>
                  <p className="mt-3 leading-8 text-slate-600">{selectedChallenge.fullInstructions}</p>
                  <div className="mt-5 rounded-2xl bg-rose-50 p-4 text-sm text-rose-700"><b>უსაფრთხოება:</b> {selectedChallenge.safetyRules}</div>
                  <form onSubmit={submitChallenge} className="mt-6 space-y-4">
                    {(selectedChallenge.submissionType === 'video' || selectedChallenge.submissionType === 'photo' || selectedChallenge.submissionType === 'audio') && (
                      <label className="flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-violet-200 bg-violet-50 p-8 text-center">
                        <Upload className="mb-3" />
                        <b>{file ? file.name : 'ატვირთე ფაილი'}</b>
                        <span className="mt-1 text-sm text-slate-500">ფოტო, ვიდეო ან აუდიო ინახება IndexedDB-ში</span>
                        <input type="file" accept={getMimeAccept(selectedChallenge.submissionType)} className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
                      </label>
                    )}
                    <textarea value={reflectionText} onChange={e => setReflectionText(e.target.value)} placeholder="რეფლექსია ან კომენტარი..." className="min-h-32 w-full rounded-2xl border border-slate-200 p-4" />
                    <select value={visibility} onChange={e => setVisibility(e.target.value as 'public' | 'hidden')} className="w-full rounded-2xl border border-slate-200 p-3">
                      <option value="public">საჯარო აქტივობა + ბონუსი</option>
                      <option value="hidden">დამალული აქტივობა</option>
                    </select>
                    <button className="w-full rounded-2xl bg-slate-950 px-5 py-4 font-black text-white">გამოწვევის ჩაბარება</button>
                  </form>
                </>
              )}
            </div>
          </section>
        )}

        {tab === 'submissions' && (
          <section>
            <SectionTitle title="აქტივობები" subtitle="აქ ჩანს ყველა ლოკალურად შენახული ფოტო, ვიდეო, აუდიო და რეფლექსია." />
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {enrichedSubmissions.map(sub => (
                <article key={sub.id} className="overflow-hidden rounded-[1.6rem] bg-white shadow-lg shadow-slate-200">
                  <div className="bg-slate-100 p-3">
                    {sub.submissionType === 'photo' && mediaUrls[sub.id] && <img src={mediaUrls[sub.id]} className="h-64 w-full rounded-2xl object-cover" />}
                    {sub.submissionType === 'video' && mediaUrls[sub.id] && <video src={mediaUrls[sub.id]} controls className="h-64 w-full rounded-2xl bg-black object-contain" />}
                    {sub.submissionType === 'audio' && mediaUrls[sub.id] && <audio src={mediaUrls[sub.id]} controls className="w-full" />}
                    {!mediaUrls[sub.id] && <div className="flex h-48 items-center justify-center rounded-2xl bg-white text-slate-400"><Lock /> <span className="ml-2">ფაილი არ არის ან მხოლოდ ტექსტია</span></div>}
                  </div>
                  <div className="p-5">
                    <p className="text-sm font-bold text-violet-600">@{sub.playerNickname}</p>
                    <h3 className="mt-1 text-lg font-black">{sub.challengeTitle}</h3>
                    {sub.reflectionText && <p className="mt-3 text-sm leading-6 text-slate-600">{sub.reflectionText}</p>}
                    {sub.aiReaction && <p className="mt-3 rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-700">{sub.aiReaction}</p>}
                    <button onClick={() => vote(sub.id)} className="mt-4 flex items-center gap-2 rounded-full bg-rose-50 px-4 py-2 font-bold text-rose-600"><Heart size={18} /> {sub.votes || 0}</button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {tab === 'leaderboard' && (
          <section>
            <SectionTitle title="ლიდერები" subtitle="ქულები ითვლება ლოკალურად შესრულებული გამოწვევებისა და მოწონებების მიხედვით." />
            <div className="overflow-hidden rounded-[1.6rem] bg-white shadow-xl">
              {leaderboard.map((u, index) => (
                <div key={u.id} className="flex items-center justify-between border-b border-slate-100 p-4">
                  <div className="flex items-center gap-4">
                    <b className="text-2xl text-violet-500">#{index + 1}</b>
                    <img src={u.avatar} className="h-12 w-12 rounded-full" />
                    <div><p className="font-black">@{u.nickname}</p><p className="text-sm text-slate-500">{u.completed} შესრულებული · {u.votes} ხმა</p></div>
                  </div>
                  <b>{u.points} ქულა</b>
                </div>
              ))}
            </div>
          </section>
        )}

        {tab === 'profile' && (
          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-[2rem] bg-white p-6 shadow-xl">
              <SectionTitle title="პროფილი" subtitle="შესვლა/რეგისტრაცია ამ ვერსიაში ლოკალურია." />
              <form onSubmit={loginOrRegister} className="space-y-3">
                <div className="flex gap-2">
                  <button type="button" onClick={() => setAuthMode('login')} className={`rounded-full px-4 py-2 font-bold ${authMode === 'login' ? 'bg-violet-600 text-white' : 'bg-slate-100'}`}>შესვლა</button>
                  <button type="button" onClick={() => setAuthMode('register')} className={`rounded-full px-4 py-2 font-bold ${authMode === 'register' ? 'bg-violet-600 text-white' : 'bg-slate-100'}`}>რეგისტრაცია</button>
                </div>
                {authMode === 'login' ? (
                  <input value={form.identifier} onChange={e => setForm({ ...form, identifier: e.target.value })} placeholder="ელფოსტა ან ნიკნეიმი" className="w-full rounded-2xl border p-3" />
                ) : (
                  <>
                    <input value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} placeholder="სახელი" className="w-full rounded-2xl border p-3" />
                    <input value={form.nickname} onChange={e => setForm({ ...form, nickname: e.target.value })} placeholder="ნიკნეიმი" className="w-full rounded-2xl border p-3" />
                    <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="ელფოსტა" className="w-full rounded-2xl border p-3" />
                  </>
                )}
                <button className="flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 font-black text-white"><UserPlus size={18} /> გაგრძელება</button>
              </form>
              <button onClick={() => setData(prev => ({ ...prev, currentUserId: fallbackUser.id }))} className="mt-3 flex items-center gap-2 text-sm text-slate-500"><LogOut size={16} /> სტუმრის პროფილზე გადასვლა</button>
            </div>
            <div className="rounded-[2rem] bg-white p-6 shadow-xl">
              <SectionTitle title="Backup" subtitle="მონაცემები ბრაუზერში ინახება, ამიტომ ექსპორტი სასარგებლოა." />
              <button onClick={exportBackup} className="w-full rounded-2xl bg-slate-950 px-5 py-3 font-black text-white">Backup ჩამოტვირთვა</button>
              <label className="mt-3 block cursor-pointer rounded-2xl border border-dashed p-5 text-center font-bold text-slate-600">
                Backup ატვირთვა
                <input type="file" accept="application/json" className="hidden" onChange={e => e.target.files?.[0] && importBackup(e.target.files[0])} />
              </label>
              <button onClick={() => updateUser({ ...currentUser, nickname: currentUser.nickname + '_new' })} className="mt-3 w-full rounded-2xl bg-slate-100 px-5 py-3 font-bold">ნიკნეიმის საცდელი განახლება</button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return <div className="mb-6"><h2 className="text-3xl font-black text-slate-950">{title}</h2><p className="mt-2 text-slate-500">{subtitle}</p></div>;
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-3xl bg-slate-50 p-5"><p className="text-3xl font-black text-violet-600">{value}</p><p className="text-sm font-semibold text-slate-500">{label}</p></div>;
}
