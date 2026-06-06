import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import {
  Home,
  LogOut,
  PlayCircle,
  Trophy,
  UserPlus,
  Users,
  Video,
  Wallet,
} from 'lucide-react';

import type { Marathon, Submission, User } from './types';

import LandingPage from './components/LandingPage';
import Leaderboard from './components/Leaderboard';
import PlayerCabinet from './components/PlayerCabinet';
import VideoFeed from './components/VideoFeed';

import { authService } from './services/authService';
import { backupService } from './services/backupService';
import { marathonService } from './services/marathonService';
import { playerService } from './services/playerService';
import { submissionService } from './services/submissionService';
import { storageKeys, storageService } from './services/storageService';

type Tab =
  | 'home'
  | 'marathons'
  | 'challenges'
  | 'submissions'
  | 'leaderboard'
  | 'profile';

type AuthMode = 'login' | 'register';

type AuthForm = {
  identifier: string;
  password: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  nickname: string;
};

function createGuestUser(): User {
  return {
    id: 'guest',
    firstName: 'სტუმარი',
    lastName: '',
    email: '',
    phone: '',
    nickname: 'სტუმარი',
    points: 0,
    avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=guest',
    fictionalNameEnabled: true,
    status: 'guest',
    consentAccepted: false,
    consentDate: new Date().toISOString(),
    completedChallenges: [],
    hiddenChallenges: [],
    publicChallenges: [],
    skippedChallenges: [],
    votesReceived: 0,
    braveryBonuses: 0,
    coachQuestionsRemaining: 0,
    videoCallAvailable: false,
    banned: false,
    badges: [],
    achievements: [],
    notifications: [],
  };
}

function normalizeMarathonId(id: string) {
  return id.startsWith('marathon-') ? id : `marathon-${id}`;
}

function shortMarathonId(id: string) {
  return id.replace('marathon-', '');
}

function getOrCreateGuestVoterId() {
  if (typeof window === 'undefined') return '';

  const existing = localStorage.getItem('bifurcation_guest_voter_id');

  if (existing) return existing;

  const created = `guest-voter-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;

  localStorage.setItem('bifurcation_guest_voter_id', created);

  return created;
}

function mergeById<T extends { id?: string }>(...lists: T[][]) {
  const map = new Map<string, T>();

  lists.flat().forEach(item => {
    if (!item?.id) return;
    map.set(item.id, { ...(map.get(item.id) || ({} as T)), ...item });
  });

  return Array.from(map.values());
}

export default function App() {
  const [tab, setTab] = useState<Tab>('home');
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [users, setUsers] = useState<User[]>([]);
  const [marathons, setMarathons] = useState<Marathon[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [monthlyPlayerRecords, setMonthlyPlayerRecords] = useState<any[]>([]);

  const [selectedMarathonId, setSelectedMarathonId] = useState('june');
  const [activeCabinetTab, setActiveCabinetTab] = useState('progress');

  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [form, setForm] = useState<AuthForm>({
    identifier: '',
    password: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    nickname: '',
  });

  const displayUser = currentUser || createGuestUser();

  function refreshFromLocal() {
    const localCurrentUser = storageService.loadData<User | null>(
      storageKeys.currentUser,
      null
    );

    const localMarathons = storageService.loadData<Marathon[]>(
      storageKeys.marathons,
      []
    );

    const localSubmissions = storageService.loadData<Submission[]>(
      storageKeys.submissions,
      []
    );

    const localUsers = storageService.loadData<User[]>(storageKeys.users, []);

    const localRecords = storageService.loadData<any[]>(
      storageKeys.monthlyPlayerRecords,
      []
    );

    setCurrentUser(localCurrentUser);
    setMarathons(localMarathons);
    setSubmissions(localSubmissions);
    setUsers(localUsers);
    setMonthlyPlayerRecords(localRecords);
  }

  async function loadAppState() {
    try {
      setErrorMessage('');

      const localCurrentUser = storageService.loadData<User | null>(
        storageKeys.currentUser,
        null
      );

      const localMarathons = storageService.loadData<Marathon[]>(
        storageKeys.marathons,
        []
      );

      const localSubmissions = storageService.loadData<Submission[]>(
        storageKeys.submissions,
        []
      );

      const localUsers = storageService.loadData<User[]>(storageKeys.users, []);

      const localRecords = storageService.loadData<any[]>(
        storageKeys.monthlyPlayerRecords,
        []
      );

      setCurrentUser(localCurrentUser);
      setMarathons(localMarathons);
      setSubmissions(localSubmissions);
      setUsers(localUsers);
      setMonthlyPlayerRecords(localRecords);

      let sessionUser: User | null = localCurrentUser;
      let loadedMarathons: Marathon[] = localMarathons;
      let loadedSubmissions: Submission[] = localSubmissions;
      let loadedUsers: User[] = localUsers;

      try {
        sessionUser = await authService.restoreSession();
      } catch (error) {
        console.warn('Session restore failed, using local user:', error);
      }

      try {
        const onlineMarathons = (await marathonService.getMarathons()) as Marathon[];
        loadedMarathons = onlineMarathons.length
          ? mergeById(localMarathons, onlineMarathons)
          : localMarathons;
      } catch (error) {
        console.warn('Marathons online load failed, using local:', error);
      }

      try {
        const onlineSubmissions = await submissionService.getSubmissions();
        const latestLocalSubmissions = storageService.loadData<Submission[]>(
          storageKeys.submissions,
          []
        );

        loadedSubmissions = mergeById(
          localSubmissions,
          latestLocalSubmissions,
          onlineSubmissions
        ) as Submission[];

        storageService.saveData(storageKeys.submissions, loadedSubmissions);
      } catch (error) {
        console.warn('Submissions online load failed, using local:', error);
      }

      try {
        const onlineUsers = await playerService.getAllPlayers();
        loadedUsers = mergeById(localUsers, onlineUsers) as User[];
      } catch (error) {
        console.warn('Players online load failed, using local:', error);
      }

      const latestRecords = storageService.loadData<any[]>(
        storageKeys.monthlyPlayerRecords,
        []
      );

      setCurrentUser(sessionUser || localCurrentUser);
      setMarathons(loadedMarathons);
      setSubmissions(loadedSubmissions);
      setUsers(loadedUsers);
      setMonthlyPlayerRecords(latestRecords);

      if (sessionUser) {
        storageService.saveData(storageKeys.currentUser, sessionUser);
      }
    } catch (error: any) {
      console.warn('App state load failed. Using local cache:', error);
      refreshFromLocal();
    }
  }

  useEffect(() => {
    async function init() {
      setLoading(true);
      await loadAppState();
      setLoading(false);
    }

    init();

    const unsubscribe = storageService.subscribe(() => {
      refreshFromLocal();
    });

    return unsubscribe;
  }, []);

  async function handleStateUpdate() {
    refreshFromLocal();
  }

  async function handleLogin(event: FormEvent) {
    event.preventDefault();

    try {
      setAuthLoading(true);
      setErrorMessage('');
      setMessage('');

      const user = await authService.loginPlayer(form.identifier, form.password);

      storageService.saveData(storageKeys.currentUser, user);
      storageService.saveData(storageKeys.currentUserId, user.id);

      setCurrentUser(user);
      setMessage('წარმატებით შეხვედით თამაშში.');
      setTab('challenges');
      setActiveCabinetTab('challenges');

      await loadAppState();
    } catch (error: any) {
      setErrorMessage(error?.message || 'შესვლა ვერ მოხერხდა.');
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleRegister(event: FormEvent) {
    event.preventDefault();

    try {
      setAuthLoading(true);
      setErrorMessage('');
      setMessage('');

      const user = await authService.registerPlayer({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone,
        nickname: form.nickname,
        passwordHash: form.password,
        avatar: '',
        fictionalNameEnabled: true,
        consentAccepted: true,
        preferredLanguage: 'ka',
      });

      storageService.saveData(storageKeys.currentUser, user);
      storageService.saveData(storageKeys.currentUserId, user.id);

      setCurrentUser(user);
      setMessage('რეგისტრაცია წარმატებით დასრულდა.');
      setTab('challenges');
      setActiveCabinetTab('challenges');

      await loadAppState();
    } catch (error: any) {
      setErrorMessage(error?.message || 'რეგისტრაცია ვერ მოხერხდა.');
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleLogout() {
    await authService.logoutPlayer();
    setCurrentUser(null);
    setTab('home');
    setMessage('პროფილიდან გამოსვლა შესრულდა.');
    await loadAppState();
  }

  async function handleUpdateProfile(data: Partial<User>) {
    if (!currentUser) return null;

    const updated = await playerService.updatePlayer(currentUser.id, data);

    storageService.saveData(storageKeys.currentUser, updated);
    setCurrentUser(updated);
    await loadAppState();

    return updated;
  }

  async function handleLeaveGame() {
    await handleLogout();
    return true;
  }

  async function handleLandingVote(submissionId: string) {
    try {
      setErrorMessage('');

      const voterId = currentUser?.id || getOrCreateGuestVoterId();

      await submissionService.voteSubmission(submissionId, voterId);

      refreshFromLocal();
      setMessage(
        currentUser
          ? 'მხარდაჭერა დაფიქსირდა. ავტორს დაემატება +5 ქულა, თქვენ კი +2 ქულა.'
          : 'მხარდაჭერა დაფიქსირდა. ავტორს დაემატება +5 ქულა.'
      );
    } catch (error: any) {
      setErrorMessage(error?.message || 'ხმის მიცემა ვერ მოხერხდა.');
    }
  }

  function handleLandingSetCurrentTab(nextTab: string) {
    if (nextTab === 'cabinet') {
      setTab('challenges');
      return;
    }

    if (
      nextTab === 'home' ||
      nextTab === 'marathons' ||
      nextTab === 'challenges' ||
      nextTab === 'submissions' ||
      nextTab === 'leaderboard' ||
      nextTab === 'profile'
    ) {
      setTab(nextTab);
    }
  }

  async function handleDownloadBackup() {
    const backup = await backupService.exportFullBackup();
    backupService.downloadJSONBackup(backup);
  }

  async function handleRestoreBackup(file: File) {
    const reader = new FileReader();

    reader.onload = async () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const result = await backupService.restoreFromBackup(parsed);

        if (!result.success) {
          alert(result.error || 'Backup-ის აღდგენა ვერ მოხერხდა.');
          return;
        }

        alert('Backup წარმატებით აღდგა.');
        await loadAppState();
      } catch {
        alert('Backup ფაილი არასწორი ფორმატისაა.');
      }
    };

    reader.readAsText(file);
  }

  const leaderboard = useMemo(() => {
    return users
      .filter(user => !user.isAdmin && !user.banned)
      .map(user => {
        const userSubmissions = submissions.filter(
          submission => submission.playerId === user.id
        );

        const publicSubmissions = userSubmissions.filter(
          submission =>
            submission.visibility === 'public' ||
            (submission as any).publishToWall === true ||
            (submission as any).publish_to_wall === true
        );

        const votesReceived = userSubmissions.reduce(
          (sum, submission) =>
            sum +
            (submission.votes ||
              submission.likes ||
              submission.likedBy?.length ||
              submission.votedUserIds?.length ||
              0),
          0
        );

        return {
          id: user.id,
          nickname: user.nickname || 'მოთამაშე',
          avatar:
            user.avatar ||
            `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(
              user.nickname || user.email || user.id
            )}`,
          points: user.points || 0,
          completedCount:
            user.completedChallenges?.length || userSubmissions.length || 0,
          publicCount:
            user.publicChallenges?.length || publicSubmissions.length || 0,
          votesReceived: user.votesReceived || votesReceived || 0,
          braveryBonuses: user.braveryBonuses || 0,
          isAdmin: user.isAdmin,
        };
      })
      .sort((a, b) => {
        return (
          b.points - a.points ||
          b.completedCount - a.completedCount ||
          b.votesReceived - a.votesReceived
        );
      });
  }, [users, submissions]);

  const nav: { id: Tab; label: string; icon: ReactNode }[] = [
    { id: 'home', label: 'მთავარი', icon: <Home size={18} /> },
    { id: 'marathons', label: 'მარათონები', icon: <Trophy size={18} /> },
    { id: 'challenges', label: 'გამოწვევები', icon: <PlayCircle size={18} /> },
    { id: 'submissions', label: 'კედელი', icon: <Video size={18} /> },
    { id: 'leaderboard', label: 'ლიდერები', icon: <Users size={18} /> },
    {
      id: 'profile',
      label: currentUser ? 'პროფილი' : 'შესვლა',
      icon: <Wallet size={18} />,
    },
  ];

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#04020d] p-6 text-center">
        <div className="rounded-3xl border border-violet-500/20 bg-[#100B24] p-8 shadow-xl">
          <p className="text-sm font-black uppercase tracking-widest text-violet-300">
            Bifurcation
          </p>
          <h1 className="mt-2 text-2xl font-black text-white">
            იტვირთება თამაში...
          </h1>
        </div>
      </div>
    );
  }

  const appBackground = tab === 'home' ? 'bg-[#04020d]' : 'bg-[#FAF8FF]';

  return (
    <div className={`min-h-screen ${appBackground}`}>
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#050311]/90 text-white backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between">
          <button
            type="button"
            onClick={() => setTab('home')}
            className="text-left"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-violet-400">
              Bifurcation
            </p>
            <h1 className="text-2xl font-black text-white">
              ბიფურკაცია — ონლაინ თამაში
            </h1>
          </button>

          <div className="flex items-center gap-3 rounded-2xl bg-white/8 px-4 py-2">
            <img
              src={displayUser.avatar}
              className="h-10 w-10 rounded-full object-cover"
              alt="avatar"
            />

            <div>
              <p className="font-semibold text-white">@{displayUser.nickname}</p>
              <p className="text-sm text-slate-300">
                {currentUser ? `${displayUser.points || 0} ქულა` : 'სტუმარი'}
              </p>
            </div>

            {currentUser && (
              <button
                type="button"
                onClick={handleLogout}
                className="ml-2 rounded-full bg-white/10 p-2 text-slate-300 hover:text-rose-300"
                title="გასვლა"
              >
                <LogOut size={16} />
              </button>
            )}
          </div>
        </div>

        <nav className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 pb-4">
          {nav.map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                tab === item.id
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-900/30'
                  : 'bg-white/8 text-slate-200 hover:bg-white/12'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>
      </header>

      {message && (
        <div className="mx-auto mt-5 max-w-7xl px-4">
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
            {message}
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="mx-auto mt-5 max-w-7xl px-4">
          <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-bold text-rose-700">
            {errorMessage}
          </div>
        </div>
      )}

      {tab === 'home' ? (
        <LandingPage
          currentUser={currentUser}
          submissions={submissions as any}
          onStartRegister={() => {
            setTab('profile');
            setAuthMode('register');
          }}
          onStartLogin={() => {
            setTab('profile');
            setAuthMode('login');
          }}
          setCurrentTab={handleLandingSetCurrentTab}
          currentTab={tab}
          onVote={handleLandingVote}
          lang="ka"
          marathons={marathons}
          monthlyPlayerRecords={monthlyPlayerRecords}
          onStateUpdate={handleStateUpdate}
          setActiveCabinetTab={setActiveCabinetTab}
          selectedMarathonId={selectedMarathonId}
          setSelectedMarathonId={id => {
            if (id) {
              setSelectedMarathonId(id.replace('marathon-', ''));
            }
          }}
        />
      ) : (
        <main className="mx-auto max-w-7xl px-4 py-8">
          {tab === 'marathons' && (
            <section>
              <SectionTitle
                title="მარათონები"
                subtitle="აირჩიე თვე და გადადი შესაბამის გამოწვევებზე."
              />

              {marathons.length === 0 ? (
                <EmptyBox text="მარათონები ჯერ არ არის ჩატვირთული." />
              ) : (
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                  {marathons.map(marathon => {
                    const shortId = shortMarathonId(marathon.id);
                    const count = marathon.challenges?.length || 0;

                    return (
                      <article
                        key={marathon.id}
                        className="rounded-[1.6rem] bg-white p-6 shadow-lg shadow-slate-200"
                      >
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            marathon.status === 'active'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {marathon.status}
                        </span>

                        <h3 className="mt-4 text-2xl font-black">
                          {marathon.title_ka || marathon.title}
                        </h3>

                        <p className="mt-2 text-sm text-slate-500">
                          {marathon.startDate
                            ? new Date(marathon.startDate).toLocaleDateString()
                            : 'დაწყება'}{' '}
                          —{' '}
                          {marathon.endDate
                            ? new Date(marathon.endDate).toLocaleDateString()
                            : 'დასრულება'}
                        </p>

                        <p className="mt-3 font-semibold text-violet-600">
                          {count} გამოწვევა
                        </p>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedMarathonId(shortId);
                            setActiveCabinetTab('challenges');
                            setTab('challenges');
                          }}
                          className="mt-6 w-full rounded-2xl bg-violet-600 px-4 py-3 font-bold text-white"
                        >
                          ნახვა
                        </button>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {tab === 'challenges' && (
            <PlayerCabinet
              currentUser={currentUser}
              submissions={submissions}
              monthlyPlayerRecords={monthlyPlayerRecords}
              onUpdateProfile={handleUpdateProfile}
              onLeaveGame={handleLeaveGame}
              onStateUpdate={handleStateUpdate}
              lang="ka"
              activeCabinetTab={activeCabinetTab}
              setActiveCabinetTab={setActiveCabinetTab}
              selectedMarathonId={selectedMarathonId}
              setSelectedMarathonId={setSelectedMarathonId}
              onStartRegister={() => {
                setTab('profile');
                setAuthMode('register');
              }}
              onStartLogin={() => {
                setTab('profile');
                setAuthMode('login');
              }}
            />
          )}

          {tab === 'submissions' && (
            <section>
              <SectionTitle
                title="საჯარო კედელი"
                subtitle="აქ გამოჩნდება მონაწილეების მიერ მთავარ გვერდზე გამოსაქვეყნებლად დადასტურებული ვიდეო, ფოტო, აუდიო და ტექსტური აქტივობები."
              />

              <VideoFeed
                currentUser={currentUser}
                onStateUpdate={handleStateUpdate}
                lang="ka"
              />
            </section>
          )}

          {tab === 'leaderboard' && (
            <section>
              <SectionTitle
                title="ლიდერები"
                subtitle="რეიტინგი ითვლება ქულების, შესრულებული გამოწვევებისა და მიღებული ხმების მიხედვით."
              />

              <Leaderboard leaderboard={leaderboard} lang="ka" />
            </section>
          )}

          {tab === 'profile' && (
            <section className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-[2rem] bg-white p-6 shadow-xl">
                <SectionTitle
                  title={currentUser ? 'პროფილი' : 'შესვლა / რეგისტრაცია'}
                  subtitle={
                    currentUser
                      ? 'თქვენ უკვე შესული ხართ თამაშში.'
                      : 'Supabase Auth-ის საშუალებით შექმენით ან გახსენით პროფილი.'
                  }
                />

                {currentUser ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 rounded-2xl bg-slate-50 p-4">
                      <img
                        src={currentUser.avatar}
                        className="h-14 w-14 rounded-full"
                        alt="avatar"
                      />

                      <div>
                        <p className="font-black">@{currentUser.nickname}</p>
                        <p className="text-sm text-slate-500">
                          {currentUser.email}
                        </p>
                        <p className="text-sm font-bold text-violet-600">
                          {currentUser.points || 0} ქულა
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 font-black text-white"
                    >
                      <LogOut size={18} />
                      გამოსვლა
                    </button>
                  </div>
                ) : (
                  <form
                    onSubmit={authMode === 'login' ? handleLogin : handleRegister}
                    className="space-y-3"
                  >
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setAuthMode('login')}
                        className={`rounded-full px-4 py-2 font-bold ${
                          authMode === 'login'
                            ? 'bg-violet-600 text-white'
                            : 'bg-slate-100'
                        }`}
                      >
                        შესვლა
                      </button>

                      <button
                        type="button"
                        onClick={() => setAuthMode('register')}
                        className={`rounded-full px-4 py-2 font-bold ${
                          authMode === 'register'
                            ? 'bg-violet-600 text-white'
                            : 'bg-slate-100'
                        }`}
                      >
                        რეგისტრაცია
                      </button>
                    </div>

                    {authMode === 'login' ? (
                      <input
                        value={form.identifier}
                        onChange={event =>
                          setForm({ ...form, identifier: event.target.value })
                        }
                        placeholder="ელფოსტა"
                        className="w-full rounded-2xl border p-3"
                        required
                      />
                    ) : (
                      <>
                        <input
                          value={form.firstName}
                          onChange={event =>
                            setForm({ ...form, firstName: event.target.value })
                          }
                          placeholder="სახელი"
                          className="w-full rounded-2xl border p-3"
                          required
                        />

                        <input
                          value={form.lastName}
                          onChange={event =>
                            setForm({ ...form, lastName: event.target.value })
                          }
                          placeholder="გვარი"
                          className="w-full rounded-2xl border p-3"
                        />

                        <input
                          value={form.nickname}
                          onChange={event =>
                            setForm({ ...form, nickname: event.target.value })
                          }
                          placeholder="ნიკნეიმი"
                          className="w-full rounded-2xl border p-3"
                          required
                        />

                        <input
                          type="email"
                          value={form.email}
                          onChange={event =>
                            setForm({ ...form, email: event.target.value })
                          }
                          placeholder="ელფოსტა"
                          className="w-full rounded-2xl border p-3"
                          required
                        />

                        <input
                          value={form.phone}
                          onChange={event =>
                            setForm({ ...form, phone: event.target.value })
                          }
                          placeholder="ტელეფონი"
                          className="w-full rounded-2xl border p-3"
                        />
                      </>
                    )}

                    <input
                      type="password"
                      value={form.password}
                      onChange={event =>
                        setForm({ ...form, password: event.target.value })
                      }
                      placeholder="პაროლი მინ. 6 სიმბოლო"
                      className="w-full rounded-2xl border p-3"
                      required
                    />

                    <button
                      type="submit"
                      disabled={authLoading}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 font-black text-white disabled:opacity-60"
                    >
                      <UserPlus size={18} />
                      {authLoading
                        ? 'მუშავდება...'
                        : authMode === 'login'
                          ? 'შესვლა'
                          : 'რეგისტრაცია'}
                    </button>
                  </form>
                )}
              </div>

              <div className="rounded-[2rem] bg-white p-6 shadow-xl">
                <SectionTitle
                  title="Backup"
                  subtitle="შეგიძლიათ ჩამოტვირთოთ ან აღადგინოთ თამაშის მონაცემების ასლი."
                />

                <button
                  type="button"
                  onClick={handleDownloadBackup}
                  className="w-full rounded-2xl bg-slate-950 px-5 py-3 font-black text-white"
                >
                  Backup ჩამოტვირთვა
                </button>

                <label className="mt-3 block cursor-pointer rounded-2xl border border-dashed p-5 text-center font-bold text-slate-600">
                  Backup ატვირთვა
                  <input
                    type="file"
                    accept="application/json"
                    className="hidden"
                    onChange={event =>
                      event.target.files?.[0] &&
                      handleRestoreBackup(event.target.files[0])
                    }
                  />
                </label>
              </div>
            </section>
          )}
        </main>
      )}
    </div>
  );
}

function SectionTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-6">
      <h2 className="text-3xl font-black text-slate-950">{title}</h2>
      <p className="mt-2 text-slate-500">{subtitle}</p>
    </div>
  );
}

function EmptyBox({ text }: { text: string }) {
  return (
    <div className="rounded-3xl border border-violet-100 bg-white p-10 text-center text-sm font-bold text-slate-400">
      {text}
    </div>
  );
}
