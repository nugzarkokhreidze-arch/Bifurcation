import { useEffect, useMemo, useState } from 'react';
import {
  Award,
  Calendar,
  Flame,
  Sparkles,
  Volume2,
  X,
} from 'lucide-react';

import { Marathon, User } from '../types';
import ChallengeView from './ChallengeView';
import { marathonService } from '../services/marathonService';
import { playerService } from '../services/playerService';
import { submissionService } from '../services/submissionService';
import { storageKeys, storageService } from '../services/storageService';

interface PlayerCabinetProps {
  currentUser: User | null;
  submissions: any[];
  monthlyPlayerRecords?: any[];
  onUpdateProfile: (data: Partial<User>) => Promise<any>;
  onLeaveGame: () => Promise<any>;
  onStateUpdate?: () => void;
  lang?: 'ka' | 'en';
  activeCabinetTab?: string;
  setActiveCabinetTab?: (tab: string) => void;
  selectedMarathonId?: string;
  setSelectedMarathonId?: (id: string) => void;
  onStartRegister?: () => void;
  onStartLogin?: () => void;
}

type FullscreenMedia = {
  url: string;
  type: string;
  title: string;
};

function normalizeMarathonId(id: string) {
  return id.startsWith('marathon-') ? id : `marathon-${id}`;
}

function shortMarathonId(id: string) {
  return id.replace('marathon-', '');
}

function getMediaUrl(submission: any) {
  return submission.fileUrl || submission.videoUrl || '';
}

export default function PlayerCabinet({
  currentUser,
  submissions,
  monthlyPlayerRecords,
  onStateUpdate,
  lang = 'ka',
  activeCabinetTab,
  setActiveCabinetTab,
  selectedMarathonId,
  setSelectedMarathonId,
  onStartRegister,
  onStartLogin,
}: PlayerCabinetProps) {
  const [localTab, setLocalTab] = useState('progress');
  const cabinetTab = activeCabinetTab || localTab;
  const setCabinetTab = setActiveCabinetTab || setLocalTab;

  const [localSelectedMarathonId, setLocalSelectedMarathonId] =
    useState<string>('june');

  const activeMarathonId = selectedMarathonId || localSelectedMarathonId;
  const selectMarathonId = setSelectedMarathonId || setLocalSelectedMarathonId;

  const [localSubmissions, setLocalSubmissions] = useState<any[]>([]);
  const [marathons, setMarathons] = useState<Marathon[]>([]);
  const [fullscreenMedia, setFullscreenMedia] =
    useState<FullscreenMedia | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadCabinetData() {
      try {
        const [loadedMarathons, loadedSubmissions] = await Promise.all([
          marathonService.getMarathons(),
          submissionService.getSubmissions(),
        ]);

        if (!mounted) return;

        setMarathons(loadedMarathons as Marathon[]);
        setLocalSubmissions(loadedSubmissions);
      } catch (error) {
        console.warn('Cabinet online load failed, using local cache:', error);

        if (!mounted) return;

        setMarathons(
          storageService.loadData<Marathon[]>(storageKeys.marathons, [])
        );

        setLocalSubmissions(
          storageService.loadData<any[]>(storageKeys.submissions, [])
        );
      }
    }

    loadCabinetData();

    return () => {
      mounted = false;
    };
  }, [cabinetTab, activeMarathonId, currentUser?.id, currentUser?.points, submissions]);

  const allSubmissions = submissions?.length ? submissions : localSubmissions;

  const userSubmissions = useMemo(() => {
    if (!currentUser) return [];

    return allSubmissions.filter(submission => submission.playerId === currentUser.id);
  }, [allSubmissions, currentUser]);

  const activeNormalizedMarathonId = normalizeMarathonId(activeMarathonId);

  const livePoints = useMemo(() => {
    if (!currentUser) return 0;

    const records =
      monthlyPlayerRecords ||
      storageService.loadData<any[]>(storageKeys.monthlyPlayerRecords, []);

    const currentRecord = records.find(
      record =>
        record.playerId === currentUser.id &&
        record.marathonId === activeNormalizedMarathonId
    );

    return currentRecord ? currentRecord.points : currentUser.points || 100;
  }, [
    monthlyPlayerRecords,
    allSubmissions,
    activeNormalizedMarathonId,
    currentUser,
  ]);

  const completedCount = userSubmissions.length;

  const publicCount = userSubmissions.filter(
    submission => submission.visibility === 'public'
  ).length;

  async function handleBookConsultation(type: 'question' | 'video') {
    if (!currentUser) return;

    const cost = type === 'question' ? 10 : 40;

    if (livePoints < cost) {
      alert(
        lang === 'ka'
          ? 'არასაკმარისი ქულების ბალანსი!'
          : 'Insufficient points balance!'
      );

      return;
    }

    const nextPoints = Math.max(0, livePoints - cost);

    const records = storageService.loadData<any[]>(
      storageKeys.monthlyPlayerRecords,
      []
    );

    const updatedRecords = records.map(record => {
      if (
        record.playerId === currentUser.id &&
        record.marathonId === activeNormalizedMarathonId
      ) {
        return {
          ...record,
          points: nextPoints,
          updatedAt: new Date().toISOString(),
        };
      }

      return record;
    });

    storageService.saveData(storageKeys.monthlyPlayerRecords, updatedRecords);

    try {
      await playerService.updatePlayer(currentUser.id, {
        points: nextPoints,
      });
    } catch (error) {
      console.warn('Consultation points update saved locally only:', error);

      const users = storageService.loadData<User[]>(storageKeys.users, []);
      storageService.saveData(
        storageKeys.users,
        users.map(user =>
          user.id === currentUser.id ? { ...user, points: nextPoints } : user
        )
      );

      storageService.saveData(storageKeys.currentUser, {
        ...currentUser,
        points: nextPoints,
      });
    }

    alert(
      lang === 'ka'
        ? `მოთხოვნა გაფორმდა. ჩამოგეჭრათ -${cost} ქულა.`
        : `Booked! -${cost} points.`
    );

    onStateUpdate?.();
  }

  const guestUser = {
    id: 'guest',
    nickname: lang === 'ka' ? 'სტუმარი' : 'Guest',
    avatar:
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150',
    points: 0,
  };

  const displayUser = currentUser || guestUser;

  const visibleMarathons =
    marathons.length > 0
      ? marathons
      : [
          {
            id: 'marathon-june',
            month: 'june',
            title_ka: 'ივნისი',
            title_en: 'June',
            startDate: '',
            endDate: '',
            timezone: 'Asia/Tbilisi',
            status: 'active',
            challenges: [],
            aiGenerated: false,
            approvedByAdmin: true,
            createdAt: new Date().toISOString(),
          },
        ];

  return (
    <div className="w-full space-y-6 rounded-3xl bg-[#FAF8FF] p-4 font-sans text-[#27213F] antialiased md:p-8">
      <div className="relative flex flex-col items-center justify-between gap-4 overflow-hidden rounded-3xl border border-violet-100/80 bg-white p-6 shadow-sm md:flex-row">
        <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-purple-50/40 blur-3xl" />

        <div className="flex items-center gap-4 text-left">
          <div className="relative">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 animate-bounce text-xl">
              👑
            </div>

            <img
              src={displayUser.avatar}
              className="h-16 w-16 rounded-full border-2 border-[#7C4DFF] bg-white object-cover p-0.5 shadow-sm"
              alt="Avatar"
            />
          </div>

          <div>
            <h2 className="flex items-center gap-2 text-xl font-black text-[#1e1b35]">
              @{displayUser.nickname}

              <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-700">
                {currentUser
                  ? lang === 'ka'
                    ? '✨ აქტიური მოთამაშე'
                    : '✨ Active Player'
                  : lang === 'ka'
                    ? '👀 სტუმარი'
                    : '👀 Guest'}
              </span>
            </h2>

            <p className="mt-0.5 text-xs font-medium text-slate-500">
              {lang === 'ka'
                ? 'მარათონის გამოწვევების დათვალიერება და შესრულება.'
                : 'View, explore and complete marathon challenges.'}
            </p>
          </div>
        </div>

        {currentUser ? (
          <div className="min-w-[160px] rounded-2xl bg-gradient-to-br from-[#6C40E7] to-[#4A24B2] px-6 py-4 text-center text-white shadow-md md:text-right">
            <p className="text-[10px] font-black uppercase tracking-widest text-purple-200">
              {lang === 'ka' ? 'თქვენი ბალანსი' : 'Your balance'}
            </p>

            <p className="mt-1 flex items-center justify-center gap-1.5 font-mono text-3xl font-black md:justify-end">
              {livePoints}
              <span className="text-xl">🪙</span>
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={onStartLogin}
              className="cursor-pointer whitespace-nowrap rounded-xl border border-violet-100 bg-slate-50 px-4 py-2 text-xs font-black uppercase text-[#7C4DFF] transition-all hover:bg-purple-50"
            >
              {lang === 'ka' ? '🔑 შესვლა' : '🔑 Sign in'}
            </button>

            <button
              type="button"
              onClick={onStartRegister}
              className="cursor-pointer whitespace-nowrap rounded-xl bg-[#7C4DFF] px-4 py-2 text-xs font-black uppercase text-white shadow-sm transition-all hover:bg-[#6c3df0] hover:shadow-md"
            >
              {lang === 'ka' ? '🚀 რეგისტრაცია' : '🚀 Sign up'}
            </button>
          </div>
        )}
      </div>

      {!currentUser && (
        <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-purple-200/50 bg-gradient-to-r from-purple-500/10 via-pink-500/5 to-transparent p-5 text-left shadow-sm sm:flex-row">
          <div className="space-y-1">
            <h4 className="flex items-center gap-1.5 text-xs font-extrabold text-[#1e1b35]">
              ⚡{' '}
              {lang === 'ka'
                ? 'საინტერესო გამოწვევები გელოდება!'
                : 'Interesting challenges await you!'}
            </h4>

            <p className="max-w-xl text-[11px] leading-relaxed text-slate-500">
              {lang === 'ka'
                ? 'თქვენ იმყოფებით საცდელ რეჟიმში. შეგიძლიათ თავისუფლად ათვალიეროთ გამოწვევები. თამაშში ჩასართავად, ქულების მოსაპოვებლად და მედიის ასატვირთად გაიარეთ რეგისტრაცია.'
                : 'You are in guest mode. You can browse the challenges. To enter the tournament, submit proof and gain points, create an account.'}
            </p>
          </div>

          <button
            type="button"
            onClick={onStartRegister}
            className="shrink-0 cursor-pointer whitespace-nowrap rounded-xl bg-[#7C4DFF] px-4 py-2 text-[11px] font-black text-white shadow-sm transition-all hover:bg-[#6c3df0]"
          >
            {lang === 'ka' ? 'ჩაერთე მარათონში' : 'Join the marathon'}
          </button>
        </div>
      )}

      {currentUser && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="flex items-center gap-3 rounded-2xl border border-violet-100/60 bg-white p-4 text-left shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
              <Award className="h-5 w-5" />
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase text-slate-400">
                {lang === 'ka' ? 'შესრულებული' : 'Completed'}
              </p>

              <p className="font-mono text-lg font-black text-[#1e1b35]">
                {completedCount}{' '}
                <span className="text-xs font-normal text-slate-400">
                  / {lang === 'ka' ? 'ჯამურად' : 'total'}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-violet-100/60 bg-white p-4 text-left shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-[#7C4DFF]">
              <Sparkles className="h-5 w-5" />
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase text-slate-400">
                {lang === 'ka' ? 'ბალანსი' : 'Balance'}
              </p>

              <p className="font-mono text-lg font-black text-[#1e1b35]">
                {livePoints}{' '}
                <span className="text-xs font-normal text-slate-400">
                  {lang === 'ka' ? 'ქულა' : 'pts'}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-violet-100/60 bg-white p-4 text-left shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <Flame className="h-5 w-5" />
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase text-slate-400">
                {lang === 'ka' ? 'საჯარო' : 'Public'}
              </p>

              <p className="font-mono text-lg font-black text-[#1e1b35]">
                {publicCount}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-violet-100/60 bg-white p-4 text-left shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Calendar className="h-5 w-5" />
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase text-slate-400">
                {lang === 'ka' ? 'პროფილი' : 'Profile'}
              </p>

              <p className="mt-1 text-xs font-black text-[#1e1b35]">
                {currentUser.createdAt
                  ? new Date(currentUser.createdAt).toLocaleDateString()
                  : lang === 'ka'
                    ? 'აქტიური'
                    : 'Active'}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 text-left sm:grid-cols-2 lg:grid-cols-4">
        {visibleMarathons.map(marathon => {
          const id = marathon.id;
          const shortId = shortMarathonId(id);
          const isActive =
            activeMarathonId === id ||
            activeMarathonId === shortId ||
            activeNormalizedMarathonId === id;

          const marathonSubmissions = userSubmissions.filter(
            submission =>
              submission.marathonId === id || submission.marathonId === shortId
          );

          const totalChallenges = marathon.challenges?.length || 10;
          const completed = marathonSubmissions.length;
          const progress = Math.min(100, (completed / totalChallenges) * 100);

          return (
            <button
              type="button"
              key={id}
              onClick={() => {
                selectMarathonId(shortId);
                setCabinetTab('challenges');
              }}
              className={`relative cursor-pointer overflow-hidden rounded-2xl border bg-white p-5 text-left transition-all hover:shadow-md ${
                isActive
                  ? 'border-[#7C4DFF] ring-2 ring-[#7C4DFF]/15'
                  : 'border-violet-100/60'
              }`}
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  {lang === 'ka' ? 'მარათონი' : 'Marathon'}
                </span>

                <span
                  className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                    marathon.status === 'active'
                      ? 'border border-orange-100 bg-orange-50 text-orange-600'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {marathon.status === 'active'
                    ? lang === 'ka'
                      ? 'მიმდინარეობს'
                      : 'Live'
                    : lang === 'ka'
                      ? 'მალე'
                      : 'Soon'}
                </span>
              </div>

              <h3 className="flex items-center gap-1.5 text-base font-black text-[#1e1b35]">
                📅 {lang === 'ka' ? marathon.title_ka : marathon.title_en}
              </h3>

              <p className="mt-0.5 text-[11px] font-medium text-slate-400">
                {marathon.startDate && marathon.endDate
                  ? `${new Date(marathon.startDate).toLocaleDateString()} — ${new Date(
                      marathon.endDate
                    ).toLocaleDateString()}`
                  : lang === 'ka'
                    ? 'მარათონის პერიოდი'
                    : 'Marathon period'}
              </p>

              <div className="mt-4 space-y-1.5">
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-orange-400 to-amber-400"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                <div className="flex justify-between font-mono text-[10px] font-bold text-slate-400">
                  <span>
                    {lang === 'ka' ? 'შესრულებული:' : 'Completed:'}{' '}
                    {completed} / {totalChallenges}
                  </span>

                  <span className="text-[#7C4DFF]">+20 🪙</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex select-none gap-1.5 overflow-x-auto border-b border-violet-100/80 pb-1">
        {[
          {
            id: 'challenges',
            label_ka: '🚀 აქტიური გამოწვევები',
            label_en: 'ACTIVE CHALLENGES',
          },
          {
            id: 'videos',
            label_ka: '🎬 შესრულებული გამოწვევები',
            label_en: 'COMPLETED CHALLENGES',
          },
          {
            id: 'consultation',
            label_ka: '💬 ანონიმური ვიდეო კონსულტაცია',
            label_en: 'COACHING',
          },
        ].map(tab => {
          if (tab.id === 'consultation' && !currentUser) return null;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setCabinetTab(tab.id)}
              className={`cursor-pointer whitespace-nowrap rounded-xl px-5 py-2.5 text-xs font-black transition-all ${
                cabinetTab === tab.id
                  ? 'bg-[#7C4DFF] text-white shadow-sm shadow-[#7C4DFF]/20'
                  : 'border border-violet-100/50 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {lang === 'ka' ? tab.label_ka : tab.label_en}
            </button>
          );
        })}
      </div>

      <div className="pt-2 text-left">
        {(cabinetTab === 'challenges' ||
          cabinetTab === 'progress' ||
          cabinetTab === 'marathons') && (
          <ChallengeView
            currentUser={currentUser}
            submissions={allSubmissions}
            monthlyPlayerRecords={monthlyPlayerRecords}
            onStateUpdate={onStateUpdate || (() => {})}
            selectedMarathonId={activeMarathonId}
            lang={lang}
            onStartRegister={onStartRegister}
            onStartLogin={onStartLogin}
          />
        )}

        {cabinetTab === 'videos' &&
          (userSubmissions.length === 0 ? (
            <div className="rounded-2xl border bg-white p-12 text-center text-xs font-bold text-slate-400">
              {lang === 'ka'
                ? 'ჯერ არ გაქვთ შესრულებული გამოწვევები.'
                : 'No completed logs found yet.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
              {userSubmissions.map((submission: any) => {
                const url = getMediaUrl(submission);

                return (
                  <button
                    type="button"
                    key={submission.id}
                    onClick={() =>
                      setFullscreenMedia({
                        url,
                        type: submission.submissionType,
                        title:
                          submission.challengeTitle ||
                          submission.challenge_title ||
                          (lang === 'ka' ? 'გამოწვევა' : 'Challenge'),
                      })
                    }
                    className="cursor-pointer space-y-2 rounded-xl border border-violet-100/60 bg-white p-4 text-left shadow-sm transition-all hover:shadow-md"
                  >
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-[#7C4DFF]">
                      {submission.submissionType || 'proof'} PROOF
                    </span>

                    <h4 className="truncate text-xs font-bold text-[#27213F]">
                      {submission.challengeTitle ||
                        submission.challenge_title ||
                        (lang === 'ka' ? 'გამოწვევა' : 'Challenge')}
                    </h4>

                    <div className="group relative flex h-28 items-center justify-center overflow-hidden rounded-lg bg-slate-900 text-xs font-bold text-white">
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
                        ▶ {lang === 'ka' ? 'გახსნა' : 'Open'}
                      </div>

                      {submission.submissionType === 'video' && url && (
                        <video
                          src={url}
                          className="h-full w-full object-cover"
                        />
                      )}

                      {submission.submissionType === 'photo' && url && (
                        <img
                          src={url}
                          className="h-full w-full object-cover"
                          alt="Proof"
                        />
                      )}

                      {submission.submissionType === 'audio' && (
                        <Volume2 className="h-6 w-6 text-slate-400" />
                      )}

                      {!url && (
                        <span className="px-3 text-center text-[11px] text-slate-400">
                          {submission.reflectionText ||
                            submission.comment ||
                            (lang === 'ka' ? 'ტექსტური ჩანაწერი' : 'Text log')}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ))}

        {cabinetTab === 'consultation' && currentUser && (
          <div className="mx-auto max-w-xl space-y-4 rounded-2xl border border-violet-100/80 bg-white p-6 text-left shadow-sm">
            <h3 className="flex items-center gap-2 text-sm font-black uppercase text-[#27213F]">
              💬{' '}
              {lang === 'ka'
                ? 'ანონიმური ვიდეო კონსულტაცია'
                : 'Coaching suite room'}
            </h3>

            <p className="text-xs leading-relaxed text-slate-500">
              {lang === 'ka'
                ? 'გამოიყენეთ ხელმისაწვდომი ლიმიტები თქვენი პროგრესის ინდივიდუალური განხილვისა და კითხვებისთვის.'
                : 'Use available limits for expert feedback.'}
            </p>

            <div className="grid grid-cols-1 gap-4 pt-2 text-xs sm:grid-cols-2">
              <div className="space-y-2 rounded-xl border bg-slate-50 p-4">
                <p className="font-bold">✍️ წერილობითი კითხვა (-10 ქულა)</p>

                <button
                  type="button"
                  onClick={() => handleBookConsultation('question')}
                  className="mt-2 w-full cursor-pointer rounded-lg bg-[#7C4DFF] py-2 text-xs font-bold text-white"
                >
                  {lang === 'ka' ? 'კითხვის დასმა' : 'Ask question'}
                </button>
              </div>

              <div className="space-y-2 rounded-xl border bg-slate-50 p-4">
                <p className="font-bold">🎥 15-წუთიანი ვიდეო ზარი (-40 ქულა)</p>

                <button
                  type="button"
                  onClick={() => handleBookConsultation('video')}
                  className="mt-2 w-full cursor-pointer rounded-lg bg-[#7C4DFF] py-2 text-xs font-bold text-white"
                >
                  {lang === 'ka' ? 'ზარის მოთხოვნა' : 'Request call'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {fullscreenMedia && (
        <div className="fixed inset-0 z-[55] flex flex-col items-center justify-center bg-black/90 p-4 text-white backdrop-blur-md">
          <div className="w-full max-w-2xl space-y-4 text-center">
            <h3 className="truncate px-4 text-sm font-bold">
              {fullscreenMedia.title}
            </h3>

            <div className="flex max-h-[60vh] min-h-[240px] w-full items-center justify-center overflow-hidden rounded-2xl border bg-black">
              {fullscreenMedia.type === 'video' && (
                <video
                  src={fullscreenMedia.url}
                  controls
                  autoPlay
                  className="max-h-[60vh] w-full"
                />
              )}

              {fullscreenMedia.type === 'photo' && (
                <img
                  src={fullscreenMedia.url}
                  className="max-h-[60vh] object-contain"
                  alt="Proof"
                />
              )}

              {fullscreenMedia.type === 'audio' && (
                <div className="w-full p-12 text-center">
                  <Volume2 className="mx-auto mb-2 h-12 w-12 text-[#7C4DFF]" />
                  <audio
                    src={fullscreenMedia.url}
                    controls
                    autoPlay
                    className="w-full"
                  />
                </div>
              )}

              {!fullscreenMedia.url && (
                <div className="p-8 text-sm text-slate-300">
                  {lang === 'ka'
                    ? 'მედია ფაილი არ არის ხელმისაწვდომი.'
                    : 'Media file is not available.'}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setFullscreenMedia(null)}
              className="mx-auto flex cursor-pointer items-center gap-2 rounded-xl bg-[#7C4DFF] px-8 py-3 text-xs font-bold uppercase text-white hover:bg-[#6c3df0]"
            >
              <X className="h-4 w-4" />

              <span>
                {lang === 'ka'
                  ? 'ჩვეულ ფორმაში დაბრუნება'
                  : 'Close fullscreen'}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
