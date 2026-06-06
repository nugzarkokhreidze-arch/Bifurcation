import {
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import {
  Home,
  Info,
  LogOut,
  PlayCircle,
  UserPlus,
  Wallet,
} from 'lucide-react';

import type { Marathon, Submission, User } from './types';

import LandingPage from './components/LandingPage';
import PlayerCabinet from './components/PlayerCabinet';

import { authService } from './services/authService';
import { backupService } from './services/backupService';
import { marathonService } from './services/marathonService';
import { playerService } from './services/playerService';
import { submissionService } from './services/submissionService';
import { storageKeys, storageService } from './services/storageService';

type Tab = 'home' | 'challenges' | 'about' | 'profile';

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

const EXTRA_SUBMISSIONS_KEY = 'submissions';

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

function getSubmissionStorageKeys() {
  return Array.from(
    new Set(
      [storageKeys.submissions, EXTRA_SUBMISSIONS_KEY].filter(
        (key): key is string => Boolean(key)
      )
    )
  );
}

function mergeById<T extends { id?: string }>(...lists: T[][]) {
  const map = new Map<string, T>();

  lists.flat().forEach(item => {
    if (!item?.id) return;
    map.set(item.id, { ...(map.get(item.id) || ({} as T)), ...item });
  });

  return Array.from(map.values());
}

function isActivePlayer(user: User) {
  const status = user.status || 'active';

  return (
    !user.isAdmin &&
    !user.banned &&
    status !== 'cancelled' &&
    status !== 'deleted' &&
    status !== 'inactive'
  );
}

function loadLocalSubmissions() {
  const lists = getSubmissionStorageKeys().map(key =>
    storageService.loadData<Submission[]>(key, [])
  );

  return mergeById(...lists) as Submission[];
}

function saveLocalSubmissions(items: Submission[]) {
  for (const key of getSubmissionStorageKeys()) {
    try {
      storageService.saveData(key, items);
    } catch (error) {
      console.warn(`Could not save submissions to ${key}:`, error);
    }
  }
}

function loadLocalUsers(currentUser?: User | null) {
  const users = storageService.loadData<User[]>(storageKeys.users, []);
  const merged = mergeById(users, currentUser ? [currentUser] : []);

  return merged.filter(isActivePlayer);
}

export default function App() {
  const [tab, setTab] = useState<Tab>('home');
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [, setUsers] = useState<User[]>([]);
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

    const localSubmissions = loadLocalSubmissions();

    const localUsers = loadLocalUsers(localCurrentUser);

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

      const localSubmissions = loadLocalSubmissions();
      const localUsers = loadLocalUsers(localCurrentUser);

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
        const serviceSubmissions = await submissionService.getSubmissions();
        const latestLocalSubmissions = loadLocalSubmissions();

        loadedSubmissions = mergeById(
          localSubmissions,
          latestLocalSubmissions,
          serviceSubmissions
        ) as Submission[];

        saveLocalSubmissions(loadedSubmissions);
      } catch (error) {
        console.warn('Submissions load failed, using local:', error);
      }

      try {
        const serviceUsers = await playerService.getAllPlayers();

        loadedUsers = mergeById(
          localUsers,
          serviceUsers,
          sessionUser ? [sessionUser] : []
        ).filter(isActivePlayer);
      } catch (error) {
        console.warn('Players load failed, using local:', error);
      }

      const latestRecords = storageService.loadData<any[]>(
        storageKeys.monthlyPlayerRecords,
        []
      );

      setCurrentUser(sessionUser || null);
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

  function clearAuthForm() {
    setForm({
      identifier: '',
      password: '',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      nickname: '',
    });
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
      setUsers(loadLocalUsers(user));
      setMessage('წარმატებით შეხვედით თქვენს კაბინეტში.');
      setTab('challenges');
      setActiveCabinetTab('progress');
      clearAuthForm();

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
      setUsers(loadLocalUsers(user));
      setMessage('რეგისტრაცია დასრულდა. თქვენი კაბინეტი შენახულია.');
      setTab('challenges');
      setActiveCabinetTab('progress');
      clearAuthForm();

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
    setMessage('პროფილიდან გამოსვლა შესრულდა. შესვლას ისევ შეძლებთ ელფოსტით და პაროლით.');
    await loadAppState();
  }

  async function handleUpdateProfile(data: Partial<User>) {
    if (!currentUser) return null;

    const updated = await playerService.updatePlayer(currentUser.id, data);

    storageService.saveData(storageKeys.currentUser, updated);
    setCurrentUser(updated);
    setUsers(loadLocalUsers(updated));
    await loadAppState();

    return updated;
  }

  async function handleLeaveGame() {
    if (!currentUser) return false;

    const confirmed = window.confirm(
      'ნამდვილად გსურთ კაბინეტის გაუქმება? საჯარო აქტივობების ისტორია დარჩება, მაგრამ ამ კაბინეტში შესვლა აღარ შეგეძლებათ.'
    );

    if (!confirmed) return false;

    try {
      await playerService.deactivatePlayer(currentUser.id);
      await authService.logoutPlayer();

      setCurrentUser(null);
      setTab('home');
      setMessage('კაბინეტი გაუქმდა. საჯარო აქტივობების ისტორია შენარჩუნებულია.');
      await loadAppState();

      return true;
    } catch (error: any) {
      setErrorMessage(error?.message || 'კაბინეტის გაუქმება ვერ მოხერხდა.');
      return false;
    }
  }

  async function handleLandingVote(submissionId: string) {
    try {
      setErrorMessage('');

      const voterId =
        currentUser?.id ||
        localStorage.getItem('bifurcation_guest_voter_id') ||
        `guest-voter-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

      localStorage.setItem('bifurcation_guest_voter_id', voterId);

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
    if (nextTab === 'home') {
      setTab('home');
      return;
    }

    if (
      nextTab === 'cabinet' ||
      nextTab === 'challenges' ||
      nextTab === 'marathons' ||
      nextTab === 'submissions' ||
      nextTab === 'leaderboard'
    ) {
      setTab('challenges');
      return;
    }

    if (nextTab === 'profile' || nextTab === 'login' || nextTab === 'register') {
      setTab('profile');
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

  const nav: { id: Tab; label: string; icon: ReactNode }[] = [
    { id: 'home', label: 'მთავარი', icon: <Home size={18} /> },
    { id: 'challenges', label: 'ჩემი კაბინეტი', icon: <PlayCircle size={18} /> },
    { id: 'about', label: 'ჩვენ შესახებ', icon: <Info size={18} /> },
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
          {tab === 'about' && <AboutPage />}

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

          {tab === 'profile' && (
            <section className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-[2rem] bg-white p-6 shadow-xl">
                <SectionTitle
                  title={currentUser ? 'პროფილი' : 'შესვლა / რეგისტრაცია'}
                  subtitle={
                    currentUser
                      ? 'თქვენი კაბინეტი შენახულია. გასვლის შემდეგ დაბრუნება შეგიძლიათ ელფოსტით და პაროლით.'
                      : 'შექმენით კაბინეტი ან დაბრუნდით უკვე შექმნილ კაბინეტში.'
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

                    <button
                      type="button"
                      onClick={handleLeaveGame}
                      className="w-full rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-black text-rose-700"
                    >
                      კაბინეტის გაუქმება
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
                        placeholder="ელფოსტა ან ნიკნეიმი"
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

              <div className="space-y-6">
                <div className="rounded-[2rem] border border-amber-100 bg-gradient-to-br from-amber-50 via-white to-violet-50 p-6 shadow-xl">
                  <SectionTitle
                    title="პრიზი და მხარდაჭერა"
                    subtitle="თამაში უფასოა, გამარჯვებული კი იღებს ფულად პრიზს."
                  />

                  <div className="space-y-3 text-sm leading-7 text-slate-600">
                    <p>
                      „ბიფურკაციაში“ გამარჯვებული ვლინდება მხოლოდ თამაშის ქულებით:
                      შესრულებული გამოწვევებით, საიტზე მიღებული უნიკალური ნახვებით,
                      გულებითა და კომენტარებით.
                    </p>

                    <p className="rounded-2xl bg-white/80 p-4 font-bold text-slate-700">
                      ნებაყოფლობითი დონაცია არ ზრდის ქულებს, არ ცვლის რეიტინგს და
                      არ იძლევა თამაშში უპირატესობას. ის არის საზოგადოების მხარდაჭერა,
                      რომ თამაში გაგრძელდეს, ფულადი პრიზი შენარჩუნდეს და RICDOG-მა
                      შექმნას მეტი საინტერესო საგანმანათლებლო პროგრამა.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setTab('about')}
                    className="mt-5 w-full rounded-2xl bg-gradient-to-r from-violet-700 to-fuchsia-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-violet-900/20"
                  >
                    💜 როგორ დავუჭირო მხარი პროექტს?
                  </button>
                </div>

                <div className="rounded-[2rem] bg-white p-6 shadow-xl">
                  <SectionTitle
                    title="Backup"
                    subtitle="სატესტო რეჟიმში შეგიძლიათ მონაცემების ასლის ჩამოტვირთვა ან აღდგენა."
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


function AboutPage() {
  return (
    <section className="mx-auto max-w-5xl space-y-8">
      <div className="overflow-hidden rounded-[2rem] bg-[#15123A] p-8 text-white shadow-xl md:p-12">
        <div className="grid gap-8 md:grid-cols-[1.2fr_0.8fr] md:items-center">
          <div>
            <p className="mb-4 inline-flex rounded-full bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-violet-200">
              პლატფორმის შესახებ
            </p>

            <h2 className="text-3xl font-black leading-tight md:text-4xl">
              ბიფურკაციის შესახებ
            </h2>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-violet-100">
              თამაში პიროვნული გამბედაობის, სიმამაცისა და შემოქმედებითი თვითგამოხატვისთვის.
              მონაწილეები იღებენ უსაფრთხო გამოწვევებს, ასრულებენ მათ TikTok-ზე და
              აგროვებენ ქულებს საიტზე მიღებული ნახვებით, გულებითა და კომენტარებით.
              თამაში უფასოა, ხოლო გამარჯვებული იღებს ფულად პრიზს.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/8 p-5">
            <div className="relative h-48 overflow-hidden rounded-2xl bg-[#0b0924]">
              <div className="absolute left-8 top-24 h-28 w-2 rounded-full bg-violet-400" />
              <div className="absolute left-8 top-24 h-3 w-36 rotate-[-7deg] rounded-full bg-violet-500/30" />
              <div className="absolute left-8 top-24 h-3 w-40 rotate-[-35deg] rounded-full bg-slate-600/40" />
              <div className="absolute left-8 top-24 h-3 w-44 rotate-[-58deg] rounded-full bg-slate-700/40" />
              <div className="absolute left-8 top-24 h-3 w-44 origin-left rotate-[-58deg] rounded-full bg-gradient-to-r from-violet-500 via-pink-500 to-amber-400 shadow-[0_0_30px_rgba(236,72,153,0.45)]" />
              <div className="absolute left-[2.9rem] top-[5.8rem] h-5 w-5 rounded-full bg-violet-300" />
              <div className="absolute right-12 top-8 h-8 w-8 rounded-full bg-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.7)]" />
              <div className="absolute right-10 top-5 text-[10px] font-black text-amber-300">
                # BIFURCATION
              </div>
              <div className="absolute left-2 top-24 text-[9px] font-black uppercase tracking-widest text-slate-500">
                Comfort
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[0.85fr_1.15fr]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-violet-100 bg-white p-6 shadow-sm">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
              👤
            </div>
            <h3 className="text-lg font-black text-slate-950">თამაშის ავტორი</h3>
            <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-600">
              თამაშის ავტორი ჯერ არ არის მითითებული.
            </p>
          </div>

          <div className="rounded-3xl border border-violet-100 bg-white p-6 shadow-sm">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              🌐
            </div>
            <h3 className="text-lg font-black text-slate-950">ვებგვერდი</h3>
            <a
              href="https://www.ricdog.org"
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-2 text-sm font-black text-violet-700 hover:text-violet-900"
            >
              www.ricdog.org →
            </a>
          </div>
        </div>

        <div className="rounded-3xl border border-violet-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            👥
          </div>

          <h3 className="text-xl font-black text-slate-950">
            პროექტის განმახორციელებელი ორგანიზაცია
          </h3>

          <p className="mt-2 text-xs font-bold uppercase tracking-widest text-slate-400">
            კვლევა-ინტელექტუალური კლუბი „თაობათა დიალოგი“ — RICDOG
          </p>

          <div className="mt-6 space-y-4 text-sm leading-7 text-slate-600">
            <p>
              პროექტის განმახორციელებელია კვლევა-ინტელექტუალური კლუბი
              „თაობათა დიალოგი“ — სამოქალაქო ორგანიზაცია, რომელიც მუშაობს
              ახალგაზრდების განვითარებაზე, საზოგადოებრივ მონაწილეობაზე,
              მშვიდობის კულტურაზე და შემოქმედებით განათლებაზე.
            </p>

            <p>
              „ბიფურკაცია“ აერთიანებს თამაშის, სოციალური მედიისა და
              თვითგამოხატვის ელემენტებს. მისი მიზანია, მონაწილეებს მისცეს
              უსაფრთხო სივრცე საკუთარი შესაძლებლობების გამოცდისთვის,
              გამბედაობის გაძლიერებისთვის და პოზიტიური ჩართულობისთვის.
            </p>

            <p>
              თამაში ყველასთვის უფასოა. გამარჯვებული იღებს ფულად პრიზს, რომელიც
              დაკავშირებულია მხოლოდ თამაშის შედეგებთან — ქულებთან, შესრულებულ
              გამოწვევებთან და საიტზე მიღებულ რეალურ ჩართულობასთან.
            </p>

            <p>
              ნებაყოფლობითი დონაცია არ მოქმედებს ქულებზე, რეიტინგზე ან გამარჯვების
              შანსზე. მხარდაჭერა ეხმარება RICDOG-ს, რომ პლატფორმა გაგრძელდეს,
              ფულადი პრიზი შენარჩუნდეს და შეიქმნას ახალი ახალგაზრდული,
              შემოქმედებითი და საგანმანათლებლო პროგრამები.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-3xl border border-amber-100 bg-amber-50 p-6 shadow-sm">
          <div className="mb-4 text-3xl">🏆</div>
          <h3 className="text-lg font-black text-slate-950">ფულადი პრიზი</h3>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            გამარჯვებული ვლინდება თამაშის ქულებით და იღებს ფულად პრიზს. პრიზი
            არის მოტივაცია, მაგრამ მთავარი მიზანი არის გამბედაობა, განვითარება
            და პოზიტიური სოციალური ჩართულობა.
          </p>
        </div>

        <div className="rounded-3xl border border-violet-100 bg-violet-50 p-6 shadow-sm">
          <div className="mb-4 text-3xl">💜</div>
          <h3 className="text-lg font-black text-slate-950">ნებაყოფლობითი დონაცია</h3>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            დონაცია არის მხარდაჭერა და არა თამაშში მონაწილეობისთვის საჭირო გადასახადი.
            ის არ ამატებს ქულებს და არ ქმნის უპირატესობას რეიტინგში.
          </p>
        </div>

        <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-6 shadow-sm">
          <div className="mb-4 text-3xl">🌱</div>
          <h3 className="text-lg font-black text-slate-950">რატომ გვჭირდება მხარდაჭერა?</h3>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            მხარდაჭერა ეხმარება ორგანიზაციას, გააგრძელოს თამაში, გააუმჯობესოს საიტი,
            შეინარჩუნოს პრიზები და შექმნას მეტი საგანმანათლებლო პროგრამა ახალგაზრდებისთვის.
          </p>
        </div>
      </div>

      <div className="rounded-[2rem] border border-violet-100 bg-white p-6 text-center shadow-sm">
        <p className="text-xs font-black uppercase tracking-widest text-violet-500">
          მხარდაჭერა თავისუფალი არჩევანია
        </p>
        <h3 className="mt-2 text-2xl font-black text-slate-950">
          თუ გჯერა ასეთი თამაშების ძალის, შეგიძლია მხარი დაგვიჭირო
        </h3>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-600">
          შენი მხარდაჭერა გვეხმარება, რომ „ბიფურკაცია“ დარჩეს უფასო, უსაფრთხო და
          საინტერესო. დონაციის დეტალური მექანიზმი შეიძლება დაემატოს ცალკე ბმულით
          ან ორგანიზაციის ოფიციალური არხებით.
        </p>
        <a
          href="https://www.ricdog.org"
          target="_blank"
          rel="noreferrer"
          className="mt-5 inline-flex rounded-2xl bg-gradient-to-r from-violet-700 to-fuchsia-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-violet-900/20"
        >
          💜 მხარი დაუჭირე RICDOG-ს
        </a>
      </div>

      <footer className="rounded-3xl bg-[#050311] p-8 text-center text-xs leading-6 text-slate-400">
        <div className="mb-3 flex justify-center gap-6 font-bold text-slate-300">
          <button type="button" className="hover:text-white">
            მთავარი
          </button>
          <button type="button" className="hover:text-white">
            ჩვენს შესახებ
          </button>
        </div>

        <p>© ბიფურკაცია. თამაში უფასოა; დონაცია ნებაყოფლობითია და რეიტინგზე არ მოქმედებს.</p>
        <p>
          კვლევა-ინტელექტუალური კლუბი „თაობათა დიალოგი“ — RICDOG
        </p>
        <p className="mt-3 font-black text-violet-300">🌐 www.ricdog.org</p>
      </footer>
    </section>
  );
}

