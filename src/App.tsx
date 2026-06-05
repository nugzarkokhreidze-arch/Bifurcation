import { useEffect, useMemo, useState } from 'react';
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

import Leaderboard from './components/Leaderboard';
import PlayerCabinet from './components/PlayerCabinet';
import VideoFeed from './components/VideoFeed';

import { authService } from './services/authService';
import { backupService } from './services/backupService';
import { marathonService } from './services/marathonService';
import { playerService } from './services/playerService';
import { submissionService } from './services/submissionService';
import { storageKeys, storageService } from './services/storageService';

type Tab = 'home' | 'marathons' | 'challenges' | 'submissions' | 'leaderboard' | 'profile';
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

  async function loadAppState() {
    try {
      setErrorMessage('');

      const [sessionUser, loadedMarathons, loadedSubmissions, loadedUsers] =
        await Promise.all([
          authService.restoreSession(),
          marathonService.getMarathons(),
          submissionService.getSubmissions(),
          playerService.getAllPlayers(),
        ]);

      const records = storageService.loadData<any[]>(
        storageKeys.monthlyPlayerRecords,
        []
      );

      setCurrentUser(sessionUser);
      setMarathons(loadedMarathons as Marathon[]);
      setSubmissions(loadedSubmissions);
      setUsers(loadedUsers);
      setMonthlyPlayerRecords(records);
    } catch (error: any) {
      console.warn('App state online load failed. Using local cache:', error);

      setCurrentUser(
        storageService.loadData<User | null>(storageKeys.currentUser, null)
      );
      setMarathons(
        storageService.loadData<Marathon[]>(storageKeys.marathons, [])
      );
      setSubmissions(
        storageService.loadData<Submission[]>(storageKeys.submissions, [])
      );
      setUsers(storageService.loadData<User[]>(storageKeys.users, []));
      setMonthlyPlayerRecords(
        storageService.loadData<any[]>(storageKeys.monthlyPlayerRecords, [])
      );
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
      setMonthlyPlayerRecords(
        storageService.loadData<any[]>(storageKeys.monthlyPlayerRecords, [])
      );
      setSubmissions(
        storageService.loadData<Submission[]>(storageKeys.submissions, [])
      );
      setUsers(storageService.loadData<User[]>(storageKeys.users, []));
      setCurrentUser(
        storageService.loadData<User | null>(storageKeys.currentUser, null)
      );
    });

    return unsubscribe;
  }, []);

  async function handleStateUpdate() {
    await loadAppState();
  }

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();

    try {
      setAuthLoading(true);
      setErrorMessage('');
      setMessage('');

      const user = await authService.loginPlayer(form.identifier, form.password);

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

  async function handleRegister(event: React.FormEvent) {
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

    setCurrentUser(updated);
    await loadAppState();

    return updated;
  }

  async function handleLeaveGame() {
    await handleLogout();
    return true;
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
          submission => submission.visibility === 'public'
        );

        const votesReceived = userSubmissions.reduce(
          (sum, submission) =>
            sum + (submission.votes || submission.likes || 0),
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

  const activeMarathon = useMemo(() => {
    const normalized = normalizeMarathonId(selectedMarathonId);

    return (
      marathons.find(marathon => marathon.id === selectedMarathonId) ||
      marathons.find(marathon => marathon.id === normalized) ||
      marathons[0]
    );
  }, [marathons, selectedMarathonId]);

  const nav: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'home', label: 'მთავარი', icon: <Home size={18} /> },
    { id: 'marathons', label: 'მარათონები', icon: <Trophy size={18} /> },
    { id: 'challenges', label: 'გამოწვევები', icon: <PlayCircle size={18} /> },
    { id: 'submissions', label: 'კედელი', icon: <Video size={18} /> },
    { id: 'leaderboard', label: 'ლიდერები', icon: <Users size={18} /> },
    { id: 'profile', label: currentUser ? 'პროფილი' : 'შესვლა', icon: <Wallet size={18} /> },
  ];

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAF8FF] p-6 text-center">
        <div className="rounded-3xl border border-violet-100 bg-white p-8 shadow-xl">
          <p className="text-sm font-black uppercase tracking-widest text-[#7C4DFF]">
            Bifurcation
          </p>
          <h1 className="mt-2 text-2xl font-black text-[#1E1B35]">
            იტვირთება თამაში...
          </h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8FF]">
      <header className="sticky top-0 z-40 border-b border-white/60 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between">
          <button type="button" onClick={() => setTab('home')} className="text-left">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-violet-500">
              Bifurcation
            </p>
            <h1 className="text-2xl font-black text-slate-900">
              ბიფურკაცია — ონლაინ თამაში
            </h1>
          </button>

          <div className="flex items-center gap-3 rounded-2xl bg-slate-100 px-4 py-2">
            <img
              src={displayUser.avatar}
              className="h-10 w-10 rounded-full object-cover"
              alt="avatar"
            />

            <div>
              <p className="font-semibold">@{displayUser.nickname}</p>
              <p className="text-sm text-slate-500">
                {currentUser ? `${displayUser.points || 0} ქულა` : 'სტუმარი'}
              </p>
            </div>

            {currentUser && (
              <button
                type="button"
                onClick={handleLogout}
                className="ml-2 rounded-full bg-white p-2 text-slate-500 hover:text-rose-600"
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
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-200'
                  : 'bg-white text-slate-700 hover:bg-violet-50'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        {message && (
          <div className="mb-5 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
            {message}
          </div>
        )}

        {errorMessage && (
          <div className="mb-5 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-bold text-rose-700">
            {errorMessage}
          </div>
        )}

        {tab === 'home' && (
          <section className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
            <div className="rounded-[2rem] bg-white/90 p-8 shadow-xl shadow-violet-100">
              <h2 className="text-4xl font-black text-slate-950">
                ონლაინ თამაში სოციალური გამბედაობისთვის
              </h2>

              <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">
                აირჩიე მარათონი, მიიღე გამოწვევა, ატვირთე ფოტო/ვიდეო/აუდიო
                მტკიცებულება ან რეფლექსია და დააგროვე ქულები.
              </p>

              <div className="mt-8 grid gap-4 md:grid-cols-3">
                <Stat label="მარათონები" value={marathons.length} />
                <Stat
                  label="გამოწვევები"
                  value={marathons.reduce(
                    (sum, marathon) => sum + (marathon.challenges?.length || 0),
                    0
                  )}
                />
                <Stat label="აქტივობები" value={submissions.length} />
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => {
                    setTab('challenges');
                    setActiveCabinetTab('challenges');
                  }}
                  className="rounded-2xl bg-violet-600 px-6 py-4 font-black text-white shadow-lg shadow-violet-200"
                >
                  გამოწვევების ნახვა
                </button>

                {!currentUser && (
                  <button
                    type="button"
                    onClick={() => {
                      setTab('profile');
                      setAuthMode('register');
                    }}
                    className="rounded-2xl bg-white px-6 py-4 font-black text-violet-600 ring-1 ring-violet-100"
                  >
                    რეგისტრაცია
                  </button>
                )}
              </div>
            </div>

            <div className="rounded-[2rem] bg-slate-950 p-6 text-white shadow-xl">
              <h3 className="text-xl font-bold">სწრაფი დაწყება</h3>

              <p className="mt-3 text-slate-300">
                პირველი ნაბიჯი მარტივია: შედი ან დარეგისტრირდი, შემდეგ გახსენი
                აქტიური მარათონი და აირჩიე გამოწვევა.
              </p>

              <button
                type="button"
                onClick={() => setTab(currentUser ? 'challenges' : 'profile')}
                className="mt-6 w-full rounded-2xl bg-white px-4 py-3 font-bold text-slate-950"
              >
                {currentUser ? 'თამაშის გაგრძელება' : 'შესვლა / რეგისტრაცია'}
              </button>
            </div>
          </section>
        )}

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
              subtitle="აქ გამოჩნდება მოთამაშეების საჯარო აქტივობები."
            />

            {currentUser ? (
              <VideoFeed
                currentUser={currentUser}
                onStateUpdate={handleStateUpdate}
                lang="ka"
              />
            ) : (
              <div className="rounded-3xl border border-violet-100 bg-white p-8 text-center">
                <p className="text-sm font-bold text-slate-500">
                  საჯარო კედლის სანახავად გაიარეთ ავტორიზაცია.
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setTab('profile');
                    setAuthMode('login');
                  }}
                  className="mt-4 rounded-2xl bg-violet-600 px-6 py-3 font-black text-white"
                >
                  შესვლა
                </button>
              </div>
            )}
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

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl bg-slate-50 p-5">
      <p className="text-3xl font-black text-violet-600">{value}</p>
      <p className="text-sm font-semibold text-slate-500">{label}</p>
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
