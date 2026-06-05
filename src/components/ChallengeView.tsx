import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Camera,
  CheckCircle,
  Clock,
  Eye,
  EyeOff,
  Mic,
  Star,
  UploadCloud,
  Video,
  Volume2,
} from 'lucide-react';

import { Challenge, ChallengeSubmissionType, User } from '../types';
import { marathonService } from '../services/marathonService';
import { playerService } from '../services/playerService';
import { storageKeys, storageService } from '../services/storageService';
import { submissionService } from '../services/submissionService';

interface ChallengeViewProps {
  currentUser: User | null;
  onStateUpdate: () => void;
  lang?: 'ka' | 'en';
  selectedMarathonId: string;
  submissions?: any[];
  monthlyPlayerRecords?: any[];
  onStartRegister?: () => void;
  onStartLogin?: () => void;
}

type MediaType = 'video' | 'photo' | 'audio';

const cyberpunkImages = [
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=500&q=80',
  'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?auto=format&fit=crop&w=500&q=80',
  'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&w=500&q=80',
  'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=500&q=80',
  'https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?auto=format&fit=crop&w=500&q=80',
  'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=500&q=80',
  'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=500&q=80',
  'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=500&q=80',
  'https://images.unsplash.com/photo-1538370965046-79c0d6907d47?auto=format&fit=crop&w=500&q=80',
  'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=500&q=80',
];

function normalizeMarathonId(id: string) {
  return id.startsWith('marathon-') ? id : `marathon-${id}`;
}

function getFileAcceptAttribute() {
  return [
    'video/*',
    'image/*',
    'audio/*',
    'video/mp4',
    'video/quicktime',
    'video/webm',
    'video/mov',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'audio/mp3',
    'audio/wav',
    'audio/m4a',
    'audio/mpeg',
    'audio/mp4',
    'audio/ogg',
  ].join(',');
}

function detectMediaType(file: File): MediaType {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();

  if (type.startsWith('image/')) return 'photo';
  if (type.startsWith('audio/') || /\.(mp3|wav|m4a|ogg|aac)$/i.test(name)) {
    return 'audio';
  }

  return 'video';
}

function isTextSubmission(type?: ChallengeSubmissionType) {
  return type === 'reflection' || type === 'text';
}

export default function ChallengeView({
  currentUser,
  onStateUpdate,
  lang = 'ka',
  selectedMarathonId,
  onStartRegister,
  onStartLogin,
}: ChallengeViewProps) {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(
    null
  );

  const [mediaType, setMediaType] = useState<MediaType>('video');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'hidden'>('public');
  const [comment, setComment] = useState('');
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0);
  const [countdownTick, setCountdownTick] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCountdownTick(prev => prev + 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadChallenges() {
      try {
        const items = await marathonService.getChallenges(
          normalizeMarathonId(selectedMarathonId)
        );

        if (mounted) {
          setChallenges(items);
        }
      } catch (error) {
        console.error('Challenge load error:', error);

        if (mounted) {
          setChallenges([]);
        }
      }
    }

    loadChallenges();

    return () => {
      mounted = false;
    };
  }, [selectedMarathonId, forceUpdate]);

  useEffect(() => {
    return () => {
      if (filePreviewUrl) {
        URL.revokeObjectURL(filePreviewUrl);
      }
    };
  }, [filePreviewUrl]);

  const playerRecord = useMemo(() => {
    if (!currentUser) return null;

    const records = storageService.loadData<any[]>(
      storageKeys.monthlyPlayerRecords,
      []
    );

    const marathonId = normalizeMarathonId(selectedMarathonId);

    return (
      records.find(
        record =>
          record.playerId === currentUser.id && record.marathonId === marathonId
      ) || null
    );
  }, [currentUser, selectedMarathonId, countdownTick, forceUpdate]);

  function getChallengeTitle(challenge: Challenge) {
    return lang === 'ka'
      ? challenge.title
      : challenge.title_en || challenge.title;
  }

  function getChallengeDescription(challenge: Challenge) {
    return lang === 'ka'
      ? challenge.description || ''
      : challenge.description_en || challenge.description || '';
  }

  function getChallengeInstructions(challenge: Challenge) {
    return lang === 'ka'
      ? challenge.fullInstructions || challenge.description || ''
      : challenge.fullInstructions_en ||
          challenge.description_en ||
          challenge.fullInstructions ||
          challenge.description ||
          '';
  }

  function getSafetyRules(challenge: Challenge) {
    return lang === 'ka'
      ? challenge.safetyRules || ''
      : challenge.safetyRules_en || challenge.safetyRules || '';
  }

  function resetUploadForm() {
    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
    }

    setSelectedFile(null);
    setFilePreviewUrl('');
    setComment('');
    setVisibility('public');
    setMessage('');
    setErrorMessage('');
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
    }

    setSelectedFile(file);
    setFilePreviewUrl(URL.createObjectURL(file));
    setMediaType(detectMediaType(file));
  }

  function triggerFileInput(type: MediaType) {
    setMediaType(type);
    setSelectedFile(null);

    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
      setFilePreviewUrl('');
    }

    window.setTimeout(() => {
      fileInputRef.current?.click();
    }, 50);
  }

  function ensureLocalRecord(playerId: string, marathonId: string) {
    const records = storageService.loadData<any[]>(
      storageKeys.monthlyPlayerRecords,
      []
    );

    let record = records.find(
      item => item.playerId === playerId && item.marathonId === marathonId
    );

    if (!record) {
      record = {
        id: `record-${playerId}-${marathonId}`,
        playerId,
        marathonId,
        participationConfirmed: true,
        startingBonusGiven: false,
        startingBonusAmount: 0,
        points: currentUser?.points || 100,
        acceptedChallenges: [],
        completedChallenges: [],
        skippedChallenges: [],
        acceptedDates: {},
        publicVideos: [],
        hiddenVideos: [],
        uniqueViewers: 0,
        likes: 0,
        rankingPosition: 0,
        pointHistory: [],
        coachQuestionsUsed: 0,
        videoConsultationUsed: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      records.push(record);
    }

    return { records, record };
  }

  async function handleAcceptChallenge(challengeId: string) {
    if (!currentUser) {
      if (onStartRegister) {
        onStartRegister();
      } else {
        alert(
          lang === 'ka'
            ? 'გამოწვევის მისაღებად გთხოვთ გაიაროთ ავტორიზაცია.'
            : 'Please login to accept the challenge.'
        );
      }

      return;
    }

    setIsUploading(true);
    setMessage(
      lang === 'ka'
        ? 'მიმდინარეობს გამოწვევის აქტივაცია...'
        : 'Activating challenge...'
    );
    setErrorMessage('');

    try {
      const marathonId = normalizeMarathonId(selectedMarathonId);
      const { records, record } = ensureLocalRecord(currentUser.id, marathonId);

      if (!record.acceptedChallenges) record.acceptedChallenges = [];
      if (!record.completedChallenges) record.completedChallenges = [];
      if (!record.skippedChallenges) record.skippedChallenges = [];
      if (!record.acceptedDates) record.acceptedDates = {};

      if (!record.acceptedChallenges.includes(challengeId)) {
        record.acceptedChallenges.push(challengeId);
      }

      record.skippedChallenges = record.skippedChallenges.filter(
        (id: string) => id !== challengeId
      );

      const now = new Date();

      record.acceptedDates[challengeId] = {
        takenAt: now.toISOString(),
        expireAt: new Date(
          now.getTime() + 3 * 24 * 60 * 60 * 1000
        ).toISOString(),
      };

      record.updatedAt = new Date().toISOString();

      storageService.saveData(storageKeys.monthlyPlayerRecords, records);

      setForceUpdate(prev => prev + 1);
      onStateUpdate();
    } catch (error: any) {
      setErrorMessage(
        error?.message ||
          (lang === 'ka'
            ? 'გამოწვევის მიღება ვერ მოხერხდა.'
            : 'Could not accept challenge.')
      );
    } finally {
      setMessage('');
      setIsUploading(false);
    }
  }

  async function handleSkipChallenge(challengeId: string) {
    if (!currentUser) return;

    const confirmed = window.confirm(
      lang === 'ka'
        ? 'ნამდვილად გსურთ გამოწვევის გამოტოვება? ჩამოგეჭრებათ -3 ქულა.'
        : 'Skip challenge? Your points will be reduced by -3.'
    );

    if (!confirmed) return;

    const marathonId = normalizeMarathonId(selectedMarathonId);
    const { records, record } = ensureLocalRecord(currentUser.id, marathonId);

    if (!record.skippedChallenges) record.skippedChallenges = [];
    if (!record.acceptedChallenges) record.acceptedChallenges = [];

    if (!record.skippedChallenges.includes(challengeId)) {
      record.skippedChallenges.push(challengeId);
    }

    record.acceptedChallenges = record.acceptedChallenges.filter(
      (id: string) => id !== challengeId
    );

    record.points = Math.max(0, (record.points || currentUser.points || 0) - 3);
    record.updatedAt = new Date().toISOString();

    storageService.saveData(storageKeys.monthlyPlayerRecords, records);

    try {
      await playerService.updatePlayer(currentUser.id, {
        points: Math.max(0, (currentUser.points || 0) - 3),
        skippedChallenges: Array.from(
          new Set([...(currentUser.skippedChallenges || []), challengeId])
        ),
      });
    } catch (error) {
      console.warn('Player skip update saved locally only:', error);
    }

    setSelectedChallenge(null);
    setForceUpdate(prev => prev + 1);
    onStateUpdate();
  }

  async function handleFormSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!currentUser || !selectedChallenge) return;

    const submissionType: ChallengeSubmissionType = isTextSubmission(
      selectedChallenge.submissionType
    )
      ? selectedChallenge.submissionType
      : mediaType;

    if (!isTextSubmission(submissionType) && !selectedFile) {
      alert(
        lang === 'ka'
          ? 'გთხოვთ ატვირთოთ ფაილი მტკიცებულებისთვის.'
          : 'Please upload a media proof file.'
      );
      return;
    }

    if (!comment.trim()) {
      alert(
        lang === 'ka'
          ? 'გთხოვთ ჩაწეროთ მოკლე კომენტარი ან რეფლექსია.'
          : 'Please add a short comment or reflection.'
      );
      return;
    }

    setIsUploading(true);
    setMessage(lang === 'ka' ? 'მიმდინარეობს ატვირთვა...' : 'Uploading...');
    setErrorMessage('');

    try {
      const marathonId = normalizeMarathonId(selectedMarathonId);

      await submissionService.createSubmission({
        playerId: currentUser.id,
        challengeId: selectedChallenge.id,
        marathonId,
        submissionType,
        visibility,
        comment,
        reflectionText: comment,
        file: selectedFile,
      });

      const rewardBase =
        selectedChallenge.completionReward || selectedChallenge.points || 20;

      const publicBonus =
        visibility === 'public'
          ? selectedChallenge.publicVideoBonus ||
            selectedChallenge.publicBraveryBonus ||
            15
          : 0;

      const totalGained = rewardBase + publicBonus;

      const { records, record } = ensureLocalRecord(currentUser.id, marathonId);

      if (!record.completedChallenges) record.completedChallenges = [];
      if (!record.acceptedChallenges) record.acceptedChallenges = [];

      if (!record.completedChallenges.includes(selectedChallenge.id)) {
        record.completedChallenges.push(selectedChallenge.id);
      }

      record.acceptedChallenges = record.acceptedChallenges.filter(
        (id: string) => id !== selectedChallenge.id
      );

      record.points = (record.points || currentUser.points || 0) + totalGained;
      record.updatedAt = new Date().toISOString();

      storageService.saveData(storageKeys.monthlyPlayerRecords, records);

      await playerService.updatePlayer(currentUser.id, {
        points: (currentUser.points || 0) + totalGained,
        completedChallenges: Array.from(
          new Set([
            ...(currentUser.completedChallenges || []),
            selectedChallenge.id,
          ])
        ),
        publicChallenges:
          visibility === 'public'
            ? Array.from(
                new Set([
                  ...(currentUser.publicChallenges || []),
                  selectedChallenge.id,
                ])
              )
            : currentUser.publicChallenges || [],
        hiddenChallenges:
          visibility === 'hidden'
            ? Array.from(
                new Set([
                  ...(currentUser.hiddenChallenges || []),
                  selectedChallenge.id,
                ])
              )
            : currentUser.hiddenChallenges || [],
        braveryBonuses: (currentUser.braveryBonuses || 0) + publicBonus,
      });

      setMessage(
        lang === 'ka'
          ? 'დავალება წარმატებით აიტვირთა! 🎉'
          : 'Proof submitted! 🎉'
      );

      window.setTimeout(() => {
        setSelectedChallenge(null);
        resetUploadForm();
        setForceUpdate(prev => prev + 1);
        onStateUpdate();
      }, 900);
    } catch (error: any) {
      console.error('Submission error:', error);

      setErrorMessage(
        error?.message ||
          (lang === 'ka'
            ? 'დავალების ატვირთვა ვერ მოხერხდა.'
            : 'Could not submit the challenge.')
      );
    } finally {
      setIsUploading(false);
    }
  }

  function getDeadlineCountdown(expireAtStr?: string) {
    if (!expireAtStr) return '';

    const expireAt = new Date(expireAtStr);
    const diff = expireAt.getTime() - Date.now();

    if (diff <= 0) {
      return lang === 'ka' ? 'ვადა ამოიწურა! ❌' : 'Deadline expired! ❌';
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return lang === 'ka'
      ? `დარჩენილია: ${days}დ ${hours}სთ ${minutes}წთ ${seconds}წმ`
      : `Time left: ${days}d ${hours}h ${minutes}m ${seconds}s`;
  }

  function handleDrag(event: React.DragEvent) {
    event.preventDefault();
    event.stopPropagation();

    if (event.type === 'dragenter' || event.type === 'dragover') {
      setIsDragActive(true);
    }

    if (event.type === 'dragleave') {
      setIsDragActive(false);
    }
  }

  function handleDrop(event: React.DragEvent) {
    event.preventDefault();
    event.stopPropagation();

    setIsDragActive(false);

    const file = event.dataTransfer.files?.[0];

    if (!file) return;

    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
    }

    setSelectedFile(file);
    setFilePreviewUrl(URL.createObjectURL(file));
    setMediaType(detectMediaType(file));
  }

  return (
    <div className="space-y-4 text-[#27213F] antialiased">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept={getFileAcceptAttribute()}
        className="hidden"
      />

      {challenges.length === 0 ? (
        <div className="rounded-3xl border border-violet-100 bg-white p-10 text-center text-sm font-bold text-slate-400">
          {lang === 'ka'
            ? 'ამ მარათონში გამოწვევები ჯერ არ არის ჩატვირთული.'
            : 'No challenges loaded for this marathon yet.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
          {challenges.map((challenge, index) => {
            const isCompleted = playerRecord?.completedChallenges?.includes(
              challenge.id
            );
            const isAccepted =
              playerRecord?.acceptedChallenges?.includes(challenge.id) ||
              isCompleted;
            const isSkipped = playerRecord?.skippedChallenges?.includes(
              challenge.id
            );

            const cardImage = cyberpunkImages[index % cyberpunkImages.length];

            return (
              <button
                type="button"
                key={challenge.id}
                onClick={() => {
                  setSelectedChallenge(challenge);
                  setMessage('');
                  setErrorMessage('');
                }}
                className={`relative cursor-pointer overflow-hidden rounded-3xl border bg-white text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${
                  selectedChallenge?.id === challenge.id
                    ? 'border-[#7C4DFF] shadow-[0_0_20px_rgba(124,77,255,0.15)]'
                    : 'border-violet-100'
                }`}
              >
                <div className="relative h-40 w-full overflow-hidden bg-[#070514]">
                  <img
                    src={cardImage}
                    className="h-full w-full object-cover opacity-85 transition-transform duration-500 hover:scale-105"
                    alt="Challenge illustration"
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-black/30" />

                  <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full border border-amber-500/20 bg-black/60 px-2.5 py-1 font-mono text-[11px] font-black text-amber-300 backdrop-blur-md">
                    <Star className="h-3.5 w-3.5 fill-amber-300 text-amber-300" />
                    {challenge.completionReward || challenge.points || 20}
                  </span>

                  <span className="absolute right-3 top-3 rounded-md bg-[#7C4DFF] px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-white shadow-md">
                    {lang === 'ka'
                      ? challenge.difficulty === 'easy'
                        ? 'ადვილი'
                        : challenge.difficulty === 'medium'
                          ? 'საშუალო'
                          : 'რთული'
                      : challenge.difficulty}
                  </span>

                  <span className="absolute bottom-2 left-4 font-mono text-[11px] font-extrabold text-[#7C4DFF]">
                    #{challenge.challengeNumber || index + 1}
                  </span>
                </div>

                <div className="space-y-4 p-5">
                  <h4 className="h-9 line-clamp-2 text-xs font-extrabold leading-snug tracking-normal text-[#1E1B35]">
                    {getChallengeTitle(challenge)}
                  </h4>

                  <div className="flex items-center justify-between border-t border-violet-50 pt-3 text-[10px] font-black uppercase tracking-wider">
                    <span
                      className={`flex items-center gap-1 ${
                        isCompleted
                          ? 'text-emerald-600'
                          : isSkipped
                            ? 'text-rose-500'
                            : isAccepted
                              ? 'text-[#7C4DFF]'
                              : 'text-slate-400'
                      }`}
                    >
                      {isCompleted
                        ? `✅ ${lang === 'ka' ? 'შესრულებული' : 'Completed'}`
                        : isSkipped
                          ? `❌ ${lang === 'ka' ? 'აცილებული' : 'Skipped'}`
                          : isAccepted
                            ? `⚡ ${lang === 'ka' ? 'მიმდინარე' : 'Active'}`
                            : `🔒 ${lang === 'ka' ? 'ჩაკეტილი' : 'Locked'}`}
                    </span>

                    <span className="rounded-lg bg-[#F1ECFF] px-2.5 py-1 text-[9px] font-bold text-[#7C4DFF]">
                      {lang === 'ka' ? 'დეტალები' : 'Details'}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selectedChallenge &&
        (() => {
          const isCompleted = playerRecord?.completedChallenges?.includes(
            selectedChallenge.id
          );
          const isAccepted =
            playerRecord?.acceptedChallenges?.includes(selectedChallenge.id) ||
            isCompleted;
          const isSkipped = playerRecord?.skippedChallenges?.includes(
            selectedChallenge.id
          );

          const timing = playerRecord?.acceptedDates?.[selectedChallenge.id];
          const expireAt =
            typeof timing === 'string' ? timing : timing?.expireAt;
          const takenAt =
            typeof timing === 'string'
              ? new Date(
                  new Date(timing).getTime() - 3 * 24 * 60 * 60 * 1000
                ).toISOString()
              : timing?.takenAt || new Date().toISOString();

          const needsFile = !isTextSubmission(selectedChallenge.submissionType);

          return (
            <div className="fixed inset-0 z-[55] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
              <div className="relative max-h-[90vh] w-full max-w-xl space-y-4 overflow-y-auto rounded-3xl border border-violet-100 bg-white p-6 text-left shadow-2xl">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedChallenge(null);
                    resetUploadForm();
                  }}
                  className="absolute right-4 top-4 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-slate-100 font-bold text-slate-400 hover:text-black"
                >
                  ✕
                </button>

                <h3 className="pr-6 text-sm font-black text-[#1E1B35]">
                  {getChallengeTitle(selectedChallenge)}
                </h3>

                {isAccepted && timing && !isCompleted && (
                  <div className="flex flex-col rounded-xl border border-purple-100 bg-purple-50 p-3 font-mono text-xs text-purple-950">
                    <p>
                      🕒 {lang === 'ka' ? 'აღების დრო:' : 'Accepted at:'}{' '}
                      {new Date(takenAt).toLocaleString()}
                    </p>

                    <p className="mt-1 flex items-center gap-1.5 font-bold text-[#7C4DFF]">
                      <Clock className="h-3.5 w-3.5 text-[#7C4DFF]" />
                      {getDeadlineCountdown(expireAt)}
                    </p>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="space-y-2 rounded-xl border border-violet-50 bg-slate-50 p-4 text-xs leading-relaxed text-slate-700">
                    <strong className="mb-1 block font-black text-[#7C4DFF]">
                      {lang === 'ka'
                        ? '📋 გამოწვევის აღწერა'
                        : '📋 Challenge description'}
                    </strong>

                    <p className="whitespace-pre-wrap font-medium">
                      {getChallengeDescription(selectedChallenge)}
                    </p>

                    {getChallengeInstructions(selectedChallenge) && (
                      <p className="mt-2 whitespace-pre-wrap border-l-2 border-violet-200 pl-3 text-slate-500">
                        {getChallengeInstructions(selectedChallenge)}
                      </p>
                    )}
                  </div>

                  {getSafetyRules(selectedChallenge) && (
                    <div className="space-y-2 rounded-xl border border-violet-50 bg-slate-50 p-4 text-xs leading-relaxed text-slate-700">
                      <strong className="mb-1 block font-black text-[#FF9B6A]">
                        {lang === 'ka'
                          ? '⚖️ უსაფრთხოების წესები'
                          : '⚖️ Safety rules'}
                      </strong>

                      <div className="rounded-lg border-l-2 border-amber-300 bg-amber-50/40 p-2.5 text-[11px] italic text-amber-800">
                        {getSafetyRules(selectedChallenge)}
                      </div>
                    </div>
                  )}
                </div>

                {errorMessage && (
                  <div className="rounded-xl border border-rose-100 bg-rose-50 p-3 text-center text-[11px] font-bold text-rose-700">
                    {errorMessage}
                  </div>
                )}

                {currentUser ? (
                  isAccepted && !isCompleted ? (
                    <form
                      onSubmit={handleFormSubmit}
                      className="space-y-4 border-t border-violet-100 pt-3"
                    >
                      {message && (
                        <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-2.5 text-center text-[11px] font-bold text-emerald-600">
                          {message}
                        </div>
                      )}

                      {needsFile && (
                        <div className="space-y-4">
                          <div
                            onDragEnter={handleDrag}
                            onDragOver={handleDrag}
                            onDragLeave={handleDrag}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`flex cursor-pointer flex-col items-center justify-center space-y-2 rounded-2xl border-2 border-dashed p-6 text-center transition-all hover:scale-[1.01] ${
                              isDragActive
                                ? 'border-[#FF9B6A] bg-[#FFF0E8]/50'
                                : 'border-violet-200 bg-violet-50/15 hover:border-[#7C4DFF]'
                            }`}
                          >
                            <div
                              className={`flex h-10 w-10 items-center justify-center rounded-full transition-transform ${
                                isDragActive
                                  ? 'bg-[#FF9B6A]/20 text-[#FF9B6A]'
                                  : 'bg-violet-100/80 text-[#7C4DFF]'
                              }`}
                            >
                              <UploadCloud className="h-5 w-5" />
                            </div>

                            <div>
                              <p className="text-xs font-black text-[#1E1B35]">
                                {lang === 'ka'
                                  ? isDragActive
                                    ? 'გადმოუშვით ფაილი აქ!'
                                    : 'ჩააგდეთ ან აირჩიეთ მედია ფაილი მოწყობილობიდან'
                                  : isDragActive
                                    ? 'Drop your file here!'
                                    : 'Drag & drop or select a media file'}
                              </p>

                              <p className="mt-1 text-[10px] font-medium text-slate-400">
                                {lang === 'ka'
                                  ? 'ვიდეო, აუდიო ან ფოტო'
                                  : 'Video, audio or photo'}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            <button
                              type="button"
                              onClick={() => triggerFileInput('video')}
                              className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border p-2 text-xs font-bold transition-all ${
                                mediaType === 'video'
                                  ? 'border-[#7C4DFF] bg-[#F1ECFF] text-[#7C4DFF]'
                                  : 'border-violet-100 bg-white text-slate-500'
                              }`}
                            >
                              <Video className="h-3.5 w-3.5" />
                              {lang === 'ka' ? 'ვიდეო' : 'Video'}
                            </button>

                            <button
                              type="button"
                              onClick={() => triggerFileInput('photo')}
                              className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border p-2 text-xs font-bold transition-all ${
                                mediaType === 'photo'
                                  ? 'border-[#7C4DFF] bg-[#F1ECFF] text-[#7C4DFF]'
                                  : 'border-violet-100 bg-white text-slate-500'
                              }`}
                            >
                              <Camera className="h-3.5 w-3.5" />
                              {lang === 'ka' ? 'ფოტო' : 'Photo'}
                            </button>

                            <button
                              type="button"
                              onClick={() => triggerFileInput('audio')}
                              className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border p-2 text-xs font-bold transition-all ${
                                mediaType === 'audio'
                                  ? 'border-[#7C4DFF] bg-[#F1ECFF] text-[#7C4DFF]'
                                  : 'border-violet-100 bg-white text-slate-500'
                              }`}
                            >
                              <Mic className="h-3.5 w-3.5" />
                              {lang === 'ka' ? 'აუდიო' : 'Audio'}
                            </button>
                          </div>

                          {filePreviewUrl && (
                            <div className="relative flex max-h-48 items-center justify-center overflow-hidden rounded-xl border border-slate-800 bg-slate-900 p-3 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  if (filePreviewUrl) {
                                    URL.revokeObjectURL(filePreviewUrl);
                                  }

                                  setFilePreviewUrl('');
                                  setSelectedFile(null);
                                }}
                                className="absolute right-2 top-2 z-10 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-black/60 text-xs font-bold text-white hover:bg-black/90"
                              >
                                ✕
                              </button>

                              {mediaType === 'video' && (
                                <video
                                  src={filePreviewUrl}
                                  controls
                                  className="max-h-44 rounded-lg"
                                />
                              )}

                              {mediaType === 'photo' && (
                                <img
                                  src={filePreviewUrl}
                                  className="max-h-44 rounded-lg object-contain"
                                  alt="Upload preview"
                                />
                              )}

                              {mediaType === 'audio' && (
                                <div className="w-full px-3 py-2 text-white">
                                  <Volume2 className="mx-auto mb-2 h-6 w-6 animate-pulse text-[#7C4DFF]" />
                                  <audio
                                    src={filePreviewUrl}
                                    controls
                                    className="w-full"
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      <textarea
                        required
                        placeholder={
                          lang === 'ka'
                            ? 'ჩაწერეთ კომენტარი, რეფლექსია ან ემოცია...'
                            : 'Write comment or reflection...'
                        }
                        value={comment}
                        onChange={event => setComment(event.target.value)}
                        className="h-16 w-full rounded-xl border border-violet-100 bg-[#FAF8FF] p-2.5 text-xs text-slate-800 focus:border-[#7C4DFF] focus:outline-none"
                      />

                      <div className="space-y-3 border-t border-violet-50 pt-2.5">
                        <div className="flex items-center justify-between rounded-2xl border border-[#7C4DFF]/10 bg-[#FAF8FF] p-3 transition-all hover:border-[#7C4DFF]/25">
                          <div className="flex items-start gap-2.5">
                            <input
                              id="public-consent"
                              type="checkbox"
                              checked={visibility === 'public'}
                              onChange={event =>
                                setVisibility(
                                  event.target.checked ? 'public' : 'hidden'
                                )
                              }
                              className="mt-1 h-4 w-4 cursor-pointer rounded border-violet-200 text-[#7C4DFF] focus:ring-[#7C4DFF]"
                            />

                            <label
                              htmlFor="public-consent"
                              className="cursor-pointer select-none text-left"
                            >
                              <span className="block text-xs font-black text-[#1E1B35]">
                                {lang === 'ka'
                                  ? 'საჯაროობის ნებართვა და თანხმობა'
                                  : 'Public sharing consent'}
                              </span>

                              <span className="mt-0.5 block text-[10px] font-medium text-slate-400">
                                {lang === 'ka'
                                  ? 'ჩემი მონაწილეობა გამოჩნდეს საჯარო სიმამაცის კედელზე'
                                  : 'Display my submission on the public wall'}
                              </span>
                            </label>
                          </div>

                          <span className="shrink-0 rounded-full border border-[#FF9B6A]/10 bg-[#FFF0E8] px-2.5 py-1 text-[10px] font-black text-[#FF9B6A]">
                            +15 B
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 font-sans text-xs font-bold">
                          <button
                            type="button"
                            onClick={() => setVisibility('public')}
                            className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border p-2.5 transition-all ${
                              visibility === 'public'
                                ? 'border-emerald-500 bg-emerald-50 text-emerald-600 shadow-sm'
                                : 'border-violet-100 bg-white text-slate-400'
                            }`}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            {lang === 'ka'
                              ? 'საჯარო კედელი'
                              : 'Post to wall'}
                          </button>

                          <button
                            type="button"
                            onClick={() => setVisibility('hidden')}
                            className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border p-2.5 transition-all ${
                              visibility === 'hidden'
                                ? 'border-purple-300 bg-purple-50 text-[#7C4DFF] shadow-sm'
                                : 'border-violet-100 bg-white text-slate-400'
                            }`}
                          >
                            <EyeOff className="h-3.5 w-3.5" />
                            {lang === 'ka'
                              ? 'პირად არქივში'
                              : 'Private archive'}
                          </button>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <button
                          type="submit"
                          disabled={isUploading}
                          className="flex-1 cursor-pointer rounded-xl bg-[#7C4DFF] py-3 text-xs font-black uppercase text-white shadow-md shadow-[#7C4DFF]/30 transition-colors hover:bg-[#6c3df0] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          🚀{' '}
                          {isUploading
                            ? lang === 'ka'
                              ? 'იტვირთება...'
                              : 'Uploading...'
                            : lang === 'ka'
                              ? 'დაადასტურე და ატვირთე'
                              : 'Confirm & send'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSkipChallenge(selectedChallenge.id)}
                          disabled={isUploading}
                          className="cursor-pointer rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-600 transition-all hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {lang === 'ka' ? 'აცილება (-3)' : 'Skip (-3)'}
                        </button>
                      </div>
                    </form>
                  ) : isCompleted ? (
                    <div className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-center text-xs font-bold text-emerald-700">
                      <CheckCircle className="h-5 w-5 text-emerald-600" />
                      {lang === 'ka'
                        ? 'გამოწვევა უკვე წარმატებით შესრულებულია! 🎉'
                        : 'Challenge is already completed! 🎉'}
                    </div>
                  ) : (
                    <div className="space-y-4 text-center">
                      {isSkipped && (
                        <p className="rounded-lg bg-amber-50 p-2 text-center text-[11px] font-bold text-amber-600">
                          ⚠️{' '}
                          {lang === 'ka'
                            ? 'თქვენ ერთხელ აიცილეთ ეს გამოწვევა, მაგრამ ძალების მოსინჯვა კვლავ შეგიძლიათ!'
                            : 'You skipped this, but you can retry!'}
                        </p>
                      )}

                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            handleAcceptChallenge(selectedChallenge.id)
                          }
                          disabled={isUploading}
                          className="flex-1 cursor-pointer rounded-xl bg-[#7C4DFF] py-3 text-center text-xs font-black uppercase text-white shadow-lg shadow-[#7C4DFF]/20 transition-colors hover:bg-[#6c3df0] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          📋{' '}
                          {lang === 'ka'
                            ? 'მიიღე გამოწვევა და დაიცავი 3 დღიანი ვადა'
                            : 'Accept challenge'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSkipChallenge(selectedChallenge.id)}
                          disabled={isUploading}
                          className="cursor-pointer rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-600 transition-all hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {lang === 'ka' ? 'აცილება (-3)' : 'Skip (-3)'}
                        </button>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="space-y-3 rounded-xl border border-purple-100 bg-purple-50 p-4 text-center text-xs font-medium text-purple-900">
                    <p>
                      {lang === 'ka'
                        ? 'მონაწილეობის მისაღებად და მტკიცებულების ასატვირთად გთხოვთ გაიაროთ ავტორიზაცია.'
                        : 'Please sign in to accept this challenge and upload evidence.'}
                    </p>

                    <div className="flex justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedChallenge(null);
                          onStartLogin?.();
                        }}
                        className="cursor-pointer rounded-lg border border-[#7C4DFF] px-4 py-2 text-[10px] font-bold text-[#7C4DFF]"
                      >
                        {lang === 'ka' ? 'შესვლა' : 'Sign in'}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedChallenge(null);
                          onStartRegister?.();
                        }}
                        className="cursor-pointer rounded-lg bg-[#7C4DFF] px-4 py-2 text-[10px] font-bold text-white"
                      >
                        {lang === 'ka' ? 'რეგისტრაცია' : 'Sign up'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })()}
    </div>
  );
}
