import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Camera,
  CheckCircle,
  Clock,
  Eye,
  EyeOff,
  Mic,
  ShieldCheck,
  Sparkles,
  Star,
  UploadCloud,
  Video,
  Volume2,
} from 'lucide-react';

import { Challenge, ChallengeSubmissionType, User } from '../types';
import { marathonService } from '../services/marathonService';
import { playerService } from '../services/playerService';
import {
  calculateCompletionPoints,
  calculateExpiredPenalty,
  calculateSkipPenalty,
  createChallengeTiming,
  formatDeadlineCountdown,
  getBaseChallengePoints,
  getDifficultyLabel,
  getScoringText,
  isChallengeExpired,
  POINTS_CONFIG,
} from '../services/pointsService';
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

const challengeImages = [
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=700&q=80',
  'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?auto=format&fit=crop&w=700&q=80',
  'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&w=700&q=80',
  'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=700&q=80',
  'https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?auto=format&fit=crop&w=700&q=80',
  'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=700&q=80',
  'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=700&q=80',
  'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=700&q=80',
  'https://images.unsplash.com/photo-1538370965046-79c0d6907d47?auto=format&fit=crop&w=700&q=80',
  'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=700&q=80',
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

function uniqueList(list: string[] = [], item: string) {
  return Array.from(new Set([...list, item]));
}

function removeFromList(list: string[] = [], item: string) {
  return list.filter(id => id !== item);
}

function formatDateTime(value?: string, lang: 'ka' | 'en' = 'ka') {
  if (!value) return lang === 'ka' ? 'ჯერ არ დაწყებულა' : 'Not started yet';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return lang === 'ka' ? 'არასწორი თარიღი' : 'Invalid date';
  }

  return date.toLocaleString(lang === 'ka' ? 'ka-GE' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getFallbackAvatar(nickname: string) {
  return `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(
    nickname || 'player'
  )}`;
}
function makeLocalSubmissionId() {
  return `sub-local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function fileToDataUrl(file: File | null): Promise<string> {
  return new Promise(resolve => {
    if (!file) {
      resolve('');
      return;
    }

    // ძალიან დიდი ვიდეოები localStorage-ში ვერ ჩაეტევა.
    // Supabase მაინც ცდის ატვირთვას, მაგრამ ლოკალურად ფოტო/აუდიო/პატარა ფაილი გამოჩნდება.
    const maxLocalSize = 4 * 1024 * 1024;

    if (file.size > maxLocalSize) {
      resolve('');
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      resolve(typeof reader.result === 'string' ? reader.result : '');
    };

    reader.onerror = () => {
      resolve('');
    };

    reader.readAsDataURL(file);
  });
}

function safeSaveSubmissionToWall(submission: any) {
  const cachedSubmissions = storageService.loadData<any[]>(
    storageKeys.submissions,
    []
  );

  const nextSubmissions = [
    submission,
    ...cachedSubmissions.filter(item => item.id !== submission.id),
  ];

  try {
    storageService.saveData(storageKeys.submissions, nextSubmissions);
  } catch (error) {
    console.warn('Could not save media submission. Retrying without media:', error);

    const lighterSubmission = {
      ...submission,
      fileUrl: '',
      videoUrl: '',
      localPreviewUrl: '',
    };

    storageService.saveData(
      storageKeys.submissions,
      [
        lighterSubmission,
        ...cachedSubmissions.filter(item => item.id !== submission.id),
      ]
    );
  }
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

  const selectedTiming = useMemo(() => {
    if (!selectedChallenge || !playerRecord?.acceptedDates) return null;

    const timing = playerRecord.acceptedDates[selectedChallenge.id];

    if (!timing) return null;

    if (typeof timing === 'string') {
      return {
        takenAt: new Date(
          new Date(timing).getTime() -
            POINTS_CONFIG.challengeDeadlineHours * 60 * 60 * 1000
        ).toISOString(),
        expireAt: timing,
      };
    }

    return {
      takenAt: timing.takenAt,
      expireAt: timing.expireAt,
    };
  }, [selectedChallenge, playerRecord, countdownTick]);

  const selectedPointsPreview = useMemo(() => {
    if (!selectedChallenge) return null;

    return calculateCompletionPoints({
      challenge: selectedChallenge,
      visibility,
      expireAt: selectedTiming?.expireAt,
    });
  }, [selectedChallenge, visibility, selectedTiming, countdownTick]);

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
    const fallbackKa =
      'შეასრულეთ გამოწვევა უსაფრთხოდ, პატივისცემით და კანონის დაცვით. არ ჩააყენოთ საკუთარი თავი ან სხვა ადამიანი უხერხულ, საშიშ ან დამამცირებელ მდგომარეობაში. თუ სიტუაცია არაკომფორტულია, შეწყვიტეთ მოქმედება.';
    const fallbackEn =
      'Complete the challenge safely, respectfully and legally. Do not put yourself or others in an unsafe, humiliating or uncomfortable situation. Stop if the situation feels wrong.';

    return lang === 'ka'
      ? challenge.safetyRules || fallbackKa
      : challenge.safetyRules_en || challenge.safetyRules || fallbackEn;
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
    setIsDragActive(false);
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
        startingBonusGiven: true,
        startingBonusAmount: POINTS_CONFIG.monthlyStartingBonus,
        points: currentUser?.points ?? POINTS_CONFIG.monthlyStartingBonus,
        acceptedChallenges: [],
        completedChallenges: [],
        skippedChallenges: [],
        expiredChallenges: [],
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

    if (!record.acceptedChallenges) record.acceptedChallenges = [];
    if (!record.completedChallenges) record.completedChallenges = [];
    if (!record.skippedChallenges) record.skippedChallenges = [];
    if (!record.expiredChallenges) record.expiredChallenges = [];
    if (!record.acceptedDates) record.acceptedDates = {};
    if (!record.publicVideos) record.publicVideos = [];
    if (!record.hiddenVideos) record.hiddenVideos = [];
    if (!record.pointHistory) record.pointHistory = [];

    return { records, record };
  }

  function saveRecord(records: any[], record: any) {
    record.updatedAt = new Date().toISOString();
    storageService.saveData(storageKeys.monthlyPlayerRecords, records);
    setForceUpdate(prev => prev + 1);
    onStateUpdate();
  }

  function addPointHistory(record: any, item: any) {
    if (!record.pointHistory) record.pointHistory = [];

    record.pointHistory.unshift({
      id: `ph-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ...item,
      createdAt: new Date().toISOString(),
    });
  }

function saveWallReadySubmission(params: {
  savedSubmission: any;
  challenge: Challenge;
  submissionType: ChallengeSubmissionType | MediaType;
  visibility: 'public' | 'hidden';
  comment: string;
  localFileUrl?: string;
}) {
  if (!currentUser) return params.savedSubmission;

  const publishToWall = params.visibility === 'public';

  const fileUrl =
    params.savedSubmission.fileUrl ||
    params.savedSubmission.videoUrl ||
    params.savedSubmission.file_url ||
    params.savedSubmission.video_url ||
    params.localFileUrl ||
    '';

  const wallReadySubmission = {
    ...params.savedSubmission,
    id: params.savedSubmission.id || makeLocalSubmissionId(),
    playerId: currentUser.id,
    challengeId: params.challenge.id,
    marathonId: normalizeMarathonId(selectedMarathonId),
    submissionType: params.submissionType,
    visibility: publishToWall ? 'public' : 'hidden',
    publishToWall,
    publish_to_wall: publishToWall,
    approved: true,
    playerNickname: currentUser.nickname || currentUser.firstName || 'მოთამაშე',
    playerAvatar:
      currentUser.avatar ||
      getFallbackAvatar(currentUser.nickname || currentUser.email || currentUser.id),
    challengeTitle: getChallengeTitle(params.challenge),
    comment: params.comment,
    reflectionText: params.comment,
    textDescription: params.comment,
    fileUrl,
    videoUrl: fileUrl,
    localPreviewUrl: params.localFileUrl || '',
    likedBy: params.savedSubmission.likedBy || [],
    votedUserIds: params.savedSubmission.votedUserIds || [],
    votes: params.savedSubmission.votes || 0,
    likes: params.savedSubmission.likes || 0,
    createdAt: params.savedSubmission.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  safeSaveSubmissionToWall(wallReadySubmission);

  return wallReadySubmission;
}

  async function handleAcceptChallenge(challengeId: string) {
    if (!currentUser) {
      if (onStartRegister) {
        onStartRegister();
      } else {
        alert(
          lang === 'ka'
            ? 'გამოწვევის მისაღებად გთხოვთ გაიაროთ ავტორიზაცია.'
            : 'Please sign in to accept the challenge.'
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

      if (record.completedChallenges.includes(challengeId)) {
        setMessage(
          lang === 'ka'
            ? 'ეს გამოწვევა უკვე შესრულებულია.'
            : 'This challenge is already completed.'
        );
        return;
      }

      record.acceptedChallenges = uniqueList(
        record.acceptedChallenges,
        challengeId
      );

      record.skippedChallenges = removeFromList(
        record.skippedChallenges,
        challengeId
      );

      record.expiredChallenges = removeFromList(
        record.expiredChallenges,
        challengeId
      );

      record.acceptedDates[challengeId] = createChallengeTiming(new Date());

      addPointHistory(record, {
        challengeId,
        amount: 0,
        reason: 'challenge-accepted',
      });

      saveRecord(records, record);

      setMessage(
        lang === 'ka'
          ? 'გამოწვევა მიღებულია. თქვენ გაქვთ სრული 72 საათი.'
          : 'Challenge accepted. You have 72 hours.'
      );
    } catch (error: any) {
      setErrorMessage(
        error?.message ||
          (lang === 'ka'
            ? 'გამოწვევის მიღება ვერ მოხერხდა.'
            : 'Could not accept challenge.')
      );
    } finally {
      setIsUploading(false);
      window.setTimeout(() => setMessage(''), 1200);
    }
  }

  async function handleSkipChallenge(challengeId: string) {
    if (!currentUser) return;

    const penalty = calculateSkipPenalty();

    const confirmed = window.confirm(
      lang === 'ka'
        ? `ნამდვილად გსურთ გამოწვევის აცილება? დაგაკლდებათ ${penalty} ქულა.`
        : `Skip this challenge? You will receive ${penalty} points.`
    );

    if (!confirmed) return;

    setIsUploading(true);
    setErrorMessage('');

    try {
      const marathonId = normalizeMarathonId(selectedMarathonId);
      const { records, record } = ensureLocalRecord(currentUser.id, marathonId);

      record.skippedChallenges = uniqueList(record.skippedChallenges, challengeId);
      record.acceptedChallenges = removeFromList(
        record.acceptedChallenges,
        challengeId
      );

      record.points = Math.max(
        0,
        (record.points || currentUser.points || 0) + penalty
      );

      addPointHistory(record, {
        challengeId,
        amount: penalty,
        reason: 'challenge-skipped',
      });

      saveRecord(records, record);

      await playerService.markChallengeSkipped({
        playerId: currentUser.id,
        challengeId,
        penalty,
      });

      setSelectedChallenge(null);
      resetUploadForm();
    } catch (error: any) {
      setErrorMessage(
        error?.message ||
          (lang === 'ka'
            ? 'გამოწვევის აცილება ვერ მოხერხდა.'
            : 'Could not skip challenge.')
      );
    } finally {
      setIsUploading(false);
      onStateUpdate();
    }
  }

  async function applyExpiredPenaltyIfNeeded(challengeId: string) {
    if (!currentUser) return false;

    const marathonId = normalizeMarathonId(selectedMarathonId);
    const { records, record } = ensureLocalRecord(currentUser.id, marathonId);
    const timing = record.acceptedDates?.[challengeId];
    const expireAt = typeof timing === 'string' ? timing : timing?.expireAt;

    if (!expireAt || !isChallengeExpired(expireAt)) {
      return false;
    }

    if (record.completedChallenges?.includes(challengeId)) {
      return false;
    }

    if (record.expiredChallenges?.includes(challengeId)) {
      return true;
    }

    const penalty = calculateExpiredPenalty();

    record.expiredChallenges = uniqueList(record.expiredChallenges, challengeId);
    record.acceptedChallenges = removeFromList(record.acceptedChallenges, challengeId);
    record.points = Math.max(
      0,
      (record.points || currentUser.points || 0) + penalty
    );

    addPointHistory(record, {
      challengeId,
      amount: penalty,
      reason: 'deadline-expired',
    });

    saveRecord(records, record);

    try {
      await playerService.addPoints(currentUser.id, penalty, 'deadline-expired');
    } catch (error) {
      console.warn('Expired penalty saved locally only:', error);
    }

    return true;
  }

async function handleFormSubmit(event: React.FormEvent) {
  event.preventDefault();

  if (!currentUser || !selectedChallenge) return;

  setErrorMessage('');

  const marathonId = normalizeMarathonId(selectedMarathonId);
  const { records, record } = ensureLocalRecord(currentUser.id, marathonId);

  if (record.completedChallenges.includes(selectedChallenge.id)) {
    setErrorMessage(
      lang === 'ka'
        ? 'ეს გამოწვევა უკვე შესრულებულია.'
        : 'This challenge has already been completed.'
    );
    return;
  }

  const expired = await applyExpiredPenaltyIfNeeded(selectedChallenge.id);

  if (expired) {
    setErrorMessage(
      lang === 'ka'
        ? 'დედლაინი ამოიწურა. ამ გამოწვევის ატვირთვა აღარ შეიძლება.'
        : 'The deadline has expired. You can no longer upload this challenge.'
    );
    return;
  }

  if (record.skippedChallenges.includes(selectedChallenge.id)) {
    setErrorMessage(
      lang === 'ka'
        ? 'ეს გამოწვევა აცილებულია. ატვირთვამდე თავიდან მიიღეთ გამოწვევა.'
        : 'This challenge was skipped. Please accept it again before uploading.'
    );
    return;
  }

  if (!record.acceptedChallenges.includes(selectedChallenge.id)) {
    setErrorMessage(
      lang === 'ka'
        ? 'ატვირთვამდე ჯერ უნდა მიიღოთ გამოწვევა.'
        : 'Please accept the challenge before uploading.'
    );
    return;
  }

  const timing = record.acceptedDates?.[selectedChallenge.id];
  const expireAt = typeof timing === 'string' ? timing : timing?.expireAt;

  const submissionType: ChallengeSubmissionType | MediaType = isTextSubmission(
    selectedChallenge.submissionType
  )
    ? (selectedChallenge.submissionType as ChallengeSubmissionType)
    : mediaType;

  if (!isTextSubmission(submissionType as ChallengeSubmissionType) && !selectedFile) {
    alert(
      lang === 'ka'
        ? 'გთხოვთ ატვირთოთ ფოტო, ვიდეო ან აუდიო მტკიცებულება.'
        : 'Please upload a photo, video or audio proof file.'
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

  try {
    const points = calculateCompletionPoints({
      challenge: selectedChallenge,
      visibility,
      expireAt,
    });

    const localFileUrl = await fileToDataUrl(selectedFile);

    const localDraftSubmission = {
      id: makeLocalSubmissionId(),
      playerId: currentUser.id,
      challengeId: selectedChallenge.id,
      marathonId,
      submissionType,
      visibility,
      publishToWall: visibility === 'public',
      publish_to_wall: visibility === 'public',
      approved: true,
      comment,
      reflectionText: comment,
      textDescription: comment,
      fileUrl: localFileUrl,
      videoUrl: localFileUrl,
      fileName: selectedFile?.name || '',
      fileMime: selectedFile?.type || '',
      fileSize: selectedFile?.size || 0,
      likedBy: [],
      votedUserIds: [],
      votes: 0,
      likes: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    let wallReadySubmission = saveWallReadySubmission({
      savedSubmission: localDraftSubmission,
      challenge: selectedChallenge,
      submissionType,
      visibility,
      comment,
      localFileUrl,
    });

    try {
      const savedSubmission = await submissionService.createSubmission({
        playerId: currentUser.id,
        challengeId: selectedChallenge.id,
        marathonId,
        submissionType: submissionType as ChallengeSubmissionType,
        visibility,
        comment,
        reflectionText: comment,
        file: selectedFile,
      });

      wallReadySubmission = saveWallReadySubmission({
        savedSubmission: {
          ...wallReadySubmission,
          ...savedSubmission,
          publishToWall: visibility === 'public',
          publish_to_wall: visibility === 'public',
        },
        challenge: selectedChallenge,
        submissionType,
        visibility,
        comment,
        localFileUrl,
      });
    } catch (submissionError) {
      console.error('Public submission online save failed:', submissionError);

      setMessage(
        lang === 'ka'
          ? 'დავალება შეინახა ლოკალურად. Supabase-ში public ჩანაწერის ჩაწერა ვერ მოხერხდა.'
          : 'Saved locally. Public Supabase submission could not be created.'
      );
    }

    record.completedChallenges = uniqueList(
      record.completedChallenges,
      selectedChallenge.id
    );

    record.acceptedChallenges = removeFromList(
      record.acceptedChallenges,
      selectedChallenge.id
    );

    record.skippedChallenges = removeFromList(
      record.skippedChallenges,
      selectedChallenge.id
    );

    record.expiredChallenges = removeFromList(
      record.expiredChallenges,
      selectedChallenge.id
    );

    if (visibility === 'public') {
      record.publicVideos = uniqueList(record.publicVideos, wallReadySubmission.id);
    } else {
      record.hiddenVideos = uniqueList(record.hiddenVideos, wallReadySubmission.id);
    }

    record.points = Math.max(
      0,
      (record.points || currentUser.points || 0) + points.totalPoints
    );

    addPointHistory(record, {
      challengeId: selectedChallenge.id,
      submissionId: wallReadySubmission.id,
      amount: points.totalPoints,
      reason: 'challenge-completed',
      breakdown: points,
    });

    saveRecord(records, record);

    await playerService.markChallengeCompleted({
      playerId: currentUser.id,
      challengeId: selectedChallenge.id,
      visibility,
      gainedPoints: points.totalPoints,
    });

    setMessage(
      lang === 'ka'
        ? `დავალება წარმატებით აიტვირთა! დაემატა +${points.totalPoints} ქულა 🎉${
            visibility === 'public'
              ? ' გამოქვეყნდა მთავარ გვერდზე — სიმამაცის საჯარო კედელზე.'
              : ' შენახულია პირად არქივში.'
          }`
        : `Proof submitted! +${points.totalPoints} points added 🎉${
            visibility === 'public'
              ? ' Published on the public courage wall.'
              : ' Saved privately.'
          }`
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

  function getChallengeStatus(challenge: Challenge) {
    if (!playerRecord) {
      return {
        key: 'locked',
        label: lang === 'ka' ? 'ჩაკეტილი' : 'Locked',
        className: 'text-slate-400',
        icon: '🔒',
      };
    }

    const completed = playerRecord.completedChallenges?.includes(challenge.id);
    const skipped = playerRecord.skippedChallenges?.includes(challenge.id);
    const expiredStored = playerRecord.expiredChallenges?.includes(challenge.id);
    const accepted = playerRecord.acceptedChallenges?.includes(challenge.id);

    const timing = playerRecord.acceptedDates?.[challenge.id];
    const expireAt = typeof timing === 'string' ? timing : timing?.expireAt;
    const expiredByTime = accepted && isChallengeExpired(expireAt);

    if (completed) {
      return {
        key: 'completed',
        label: lang === 'ka' ? 'შესრულებული' : 'Completed',
        className: 'text-emerald-600',
        icon: '✅',
      };
    }

    if (expiredStored || expiredByTime) {
      return {
        key: 'expired',
        label: lang === 'ka' ? 'ვადაგასული' : 'Expired',
        className: 'text-rose-600',
        icon: '⏳',
      };
    }

    if (skipped) {
      return {
        key: 'skipped',
        label: lang === 'ka' ? 'აცილებული' : 'Skipped',
        className: 'text-rose-500',
        icon: '❌',
      };
    }

    if (accepted) {
      return {
        key: 'active',
        label: lang === 'ka' ? 'მიმდინარე' : 'Active',
        className: 'text-[#7C4DFF]',
        icon: '⚡',
      };
    }

    return {
      key: 'locked',
      label: lang === 'ka' ? 'ჩაკეტილი' : 'Locked',
      className: 'text-slate-400',
      icon: '🔒',
    };
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
    <div className="space-y-5 text-[#27213F] antialiased">
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
            const status = getChallengeStatus(challenge);
            const cardImage = challengeImages[index % challengeImages.length];
            const basePoints = getBaseChallengePoints(challenge);

            return (
              <button
                type="button"
                key={challenge.id}
                onClick={() => {
                  setSelectedChallenge(challenge);
                  setMessage('');
                  setErrorMessage('');
                }}
                className={`relative cursor-pointer overflow-hidden rounded-3xl border bg-white text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${
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
                    +{basePoints} {lang === 'ka' ? 'ქულა' : 'pts'}
                  </span>

                  <span className="absolute right-3 top-3 rounded-md bg-[#7C4DFF] px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-white shadow-md">
                    {getDifficultyLabel(challenge.difficulty, lang)}
                  </span>

                  <span className="absolute bottom-2 left-4 font-mono text-[11px] font-extrabold text-[#7C4DFF]">
                    #{challenge.challengeNumber || index + 1}
                  </span>
                </div>

                <div className="space-y-4 p-5">
                  <h4 className="min-h-10 line-clamp-2 text-xs font-extrabold leading-snug tracking-normal text-[#1E1B35]">
                    {getChallengeTitle(challenge)}
                  </h4>

                  <div className="grid grid-cols-2 gap-2 text-[10px] font-black">
                    <div className="rounded-xl bg-[#F1ECFF] px-3 py-2 text-[#7C4DFF]">
                      {lang === 'ka' ? 'ჯილდო' : 'Reward'}: +{basePoints}
                    </div>

                    <div className={`rounded-xl bg-slate-50 px-3 py-2 ${status.className}`}>
                      {status.icon} {status.label}
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-violet-50 pt-3 text-[10px] font-black uppercase tracking-wider">
                    <span className={status.className}>
                      {lang === 'ka' ? 'სტატუსი' : 'Status'}: {status.label}
                    </span>

                    <span className="rounded-lg bg-[#FFF0E8] px-2.5 py-1 text-[9px] font-bold text-[#FF7A45]">
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
          const status = getChallengeStatus(selectedChallenge);
          const isCompleted = status.key === 'completed';
          const isAccepted = status.key === 'active' || isCompleted;
          const isSkipped = status.key === 'skipped';
          const isExpired = status.key === 'expired';
          const needsFile = !isTextSubmission(selectedChallenge.submissionType);
          const basePoints = getBaseChallengePoints(selectedChallenge);

          return (
            <div className="fixed inset-0 z-[55] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
              <div className="relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] border border-violet-100 bg-white text-left shadow-2xl">
                <div className="sticky top-0 z-10 border-b border-violet-100 bg-white/95 px-6 py-4 backdrop-blur-xl">
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

                  <div className="pr-10">
                    <p className="mb-1 text-[10px] font-black uppercase tracking-[0.22em] text-[#7C4DFF]">
                      {lang === 'ka' ? 'გამოწვევა' : 'Challenge'} #
                      {selectedChallenge.challengeNumber || ''}
                    </p>

                    <h3 className="text-base font-black leading-snug text-[#1E1B35]">
                      {getChallengeTitle(selectedChallenge)}
                    </h3>
                  </div>
                </div>

                <div className="space-y-5 p-6">
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    <div className="rounded-2xl border border-violet-100 bg-[#FAF8FF] p-3">
                      <p className="text-[10px] font-black uppercase text-slate-400">
                        {lang === 'ka' ? 'სირთულე' : 'Difficulty'}
                      </p>
                      <p className="mt-1 text-sm font-black text-[#7C4DFF]">
                        {getDifficultyLabel(selectedChallenge.difficulty, lang)}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-3">
                      <p className="text-[10px] font-black uppercase text-slate-400">
                        {lang === 'ka' ? 'საბაზისო ქულა' : 'Base points'}
                      </p>
                      <p className="mt-1 text-sm font-black text-amber-600">
                        +{basePoints}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3">
                      <p className="text-[10px] font-black uppercase text-slate-400">
                        {lang === 'ka' ? 'კედელზე გამოქვეყნება' : 'Wall publish'}
                      </p>
                      <p className="mt-1 text-sm font-black text-emerald-600">
                        +{POINTS_CONFIG.publicBraveryBonus}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-rose-100 bg-rose-50 p-3">
                      <p className="text-[10px] font-black uppercase text-slate-400">
                        {lang === 'ka' ? 'აცილება' : 'Skip'}
                      </p>
                      <p className="mt-1 text-sm font-black text-rose-600">
                        {POINTS_CONFIG.skippedChallengePenalty}
                      </p>
                    </div>
                  </div>

                  {isAccepted && selectedTiming && !isCompleted && (
                    <div className="rounded-2xl border border-purple-100 bg-purple-50 p-4 font-mono text-xs text-purple-950">
                      <p>
                        🕒 {lang === 'ka' ? 'აღების დრო:' : 'Accepted at:'}{' '}
                        {formatDateTime(selectedTiming.takenAt, lang)}
                      </p>

                      <p>
                        ⏰ {lang === 'ka' ? 'დედლაინი:' : 'Deadline:'}{' '}
                        {formatDateTime(selectedTiming.expireAt, lang)}
                      </p>

                      <p className="mt-2 flex items-center gap-1.5 font-bold text-[#7C4DFF]">
                        <Clock className="h-3.5 w-3.5 text-[#7C4DFF]" />
                        {formatDeadlineCountdown(selectedTiming.expireAt, lang)}
                      </p>
                    </div>
                  )}

                  <div className="grid gap-4 md:grid-cols-[1.15fr_0.85fr]">
                    <div className="space-y-3 rounded-2xl border border-violet-50 bg-slate-50 p-4 text-xs leading-relaxed text-slate-700">
                      <strong className="mb-1 block font-black text-[#7C4DFF]">
                        {lang === 'ka'
                          ? '📋 გამოწვევის აღწერა'
                          : '📋 Challenge description'}
                      </strong>

                      <p className="whitespace-pre-wrap font-medium">
                        {getChallengeDescription(selectedChallenge)}
                      </p>

                      {getChallengeInstructions(selectedChallenge) && (
                        <div className="mt-3 rounded-xl border-l-4 border-[#7C4DFF] bg-white p-3 text-slate-600">
                          <strong className="mb-1 block text-[11px] font-black text-[#1E1B35]">
                            {lang === 'ka' ? 'ინსტრუქცია' : 'Instructions'}
                          </strong>

                          <p className="whitespace-pre-wrap">
                            {getChallengeInstructions(selectedChallenge)}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div className="rounded-2xl border border-[#7C4DFF]/10 bg-[#FAF8FF] p-4">
                        <div className="mb-2 flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-[#7C4DFF]" />
                          <strong className="text-xs font-black text-[#1E1B35]">
                            {lang === 'ka'
                              ? 'ქულების გამჭვირვალობა'
                              : 'Scoring preview'}
                          </strong>
                        </div>

                        <pre className="whitespace-pre-wrap rounded-xl bg-white p-3 text-[11px] font-bold leading-relaxed text-slate-600">
                          {getScoringText({
                            challenge: selectedChallenge,
                            visibility,
                            expireAt: selectedTiming?.expireAt,
                            lang,
                          })}
                        </pre>
                      </div>

                      <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
                        <div className="mb-2 flex items-center gap-2">
                          <ShieldCheck className="h-4 w-4 text-amber-600" />
                          <strong className="text-xs font-black text-amber-800">
                            {lang === 'ka'
                              ? 'უსაფრთხოების წესები'
                              : 'Safety rules'}
                          </strong>
                        </div>

                        <p className="text-[11px] font-medium leading-relaxed text-amber-800">
                          {getSafetyRules(selectedChallenge)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {errorMessage && (
                    <div className="rounded-xl border border-rose-100 bg-rose-50 p-3 text-center text-[11px] font-bold text-rose-700">
                      {errorMessage}
                    </div>
                  )}

                  {currentUser ? (
                    isAccepted && !isCompleted && !isExpired ? (
                      <form
                        onSubmit={handleFormSubmit}
                        className="space-y-4 rounded-2xl border border-violet-100 bg-white p-4"
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
                              <div className="relative flex max-h-56 items-center justify-center overflow-hidden rounded-xl border border-slate-800 bg-slate-900 p-3 text-center">
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
                                    className="max-h-52 rounded-lg"
                                  />
                                )}

                                {mediaType === 'photo' && (
                                  <img
                                    src={filePreviewUrl}
                                    className="max-h-52 rounded-lg object-contain"
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
                          className="h-20 w-full rounded-xl border border-violet-100 bg-[#FAF8FF] p-3 text-xs text-slate-800 focus:border-[#7C4DFF] focus:outline-none"
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
                                    ? 'ვეთანხმები მთავარ გვერდზე გამოქვეყნებას'
                                    : 'I agree to publish this on the main page'}
                                </span>

                                <span className="mt-0.5 block text-[10px] font-medium text-slate-400">
                                  {lang === 'ka'
                                    ? 'გამოქვეყნდეს მთავარ გვერდზე — სიმამაცის საჯარო კედელზე'
                                    : 'Publish on the main page — public courage wall'}
                                </span>
                              </label>
                            </div>

                            <span className="shrink-0 rounded-full border border-[#FF9B6A]/10 bg-[#FFF0E8] px-2.5 py-1 text-[10px] font-black text-[#FF9B6A]">
                              +{POINTS_CONFIG.publicBraveryBonus}{' '}
                              {lang === 'ka' ? 'ქულა' : 'pts'}
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
                                ? 'გამოქვეყნება კედელზე'
                                : 'Publish to wall'}
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

                        {selectedPointsPreview && (
                          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-center text-xs font-black text-emerald-700">
                            {lang === 'ka'
                              ? `ატვირთვის შემდეგ დაგერიცხებათ +${selectedPointsPreview.totalPoints} ქულა`
                              : `After upload you will receive +${selectedPointsPreview.totalPoints} points`}
                          </div>
                        )}

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
                                : 'Confirm & upload'}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSkipChallenge(selectedChallenge.id)}
                            disabled={isUploading}
                            className="cursor-pointer rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-600 transition-all hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {lang === 'ka'
                              ? `აცილება (${POINTS_CONFIG.skippedChallengePenalty})`
                              : `Skip (${POINTS_CONFIG.skippedChallengePenalty})`}
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
                    ) : isExpired ? (
                      <div className="rounded-xl border border-rose-100 bg-rose-50 p-4 text-center text-xs font-bold text-rose-700">
                        {lang === 'ka'
                          ? 'ამ გამოწვევის ვადა ამოიწურა. შეგიძლიათ აირჩიოთ სხვა გამოწვევა ან თავიდან მიიღოთ ეს გამოწვევა.'
                          : 'The deadline for this challenge has expired. You can choose another challenge or accept this one again.'}

                        <button
                          type="button"
                          onClick={() => handleAcceptChallenge(selectedChallenge.id)}
                          disabled={isUploading}
                          className="mt-3 rounded-xl bg-[#7C4DFF] px-4 py-2 text-[11px] font-black text-white"
                        >
                          {lang === 'ka'
                            ? 'თავიდან მიღება'
                            : 'Accept again'}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4 rounded-2xl border border-violet-100 bg-white p-4 text-center">
                        {isSkipped && (
                          <p className="rounded-lg bg-amber-50 p-2 text-center text-[11px] font-bold text-amber-600">
                            ⚠️{' '}
                            {lang === 'ka'
                              ? 'თქვენ ერთხელ აიცილეთ ეს გამოწვევა, მაგრამ თავიდან მიღება კვლავ შეგიძლიათ.'
                              : 'You skipped this, but you can accept it again.'}
                          </p>
                        )}

                        <p className="text-xs font-medium text-slate-500">
                          {lang === 'ka'
                            ? 'გამოწვევის მიღების შემდეგ სისტემა დაგითვლით ზუსტ 72-საათიან დედლაინს.'
                            : 'After accepting, the system will calculate your exact 72-hour deadline.'}
                        </p>

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
                              ? 'მიიღე გამოწვევა'
                              : 'Accept challenge'}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSkipChallenge(selectedChallenge.id)}
                            disabled={isUploading}
                            className="cursor-pointer rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-600 transition-all hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {lang === 'ka'
                              ? `აცილება (${POINTS_CONFIG.skippedChallengePenalty})`
                              : `Skip (${POINTS_CONFIG.skippedChallengePenalty})`}
                          </button>
                        </div>
                      </div>
                    )
                  ) : (
                    <div className="space-y-3 rounded-xl border border-purple-100 bg-purple-50 p-4 text-center text-xs font-medium text-purple-900">
                      <p>
                        {lang === 'ka'
                          ? 'გამოწვევის მიღება და მტკიცებულების ატვირთვა შესაძლებელია ავტორიზაციის შემდეგ. გაცნობა შეგიძლიათ ახლავე.'
                          : 'You can read the challenge now, but accepting and uploading proof requires sign in.'}
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
            </div>
          );
        })()}
    </div>
  );
}
