import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle,
  Clock,
  ExternalLink,
  Eye,
  Link2,
  ShieldCheck,
  Sparkles,
  Star,
} from 'lucide-react';

import { Challenge, User } from '../types';
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

const EXTRA_SUBMISSIONS_KEY = 'bifurcation_submissions';
const PLAIN_SUBMISSIONS_KEY = 'submissions';
const LAST_SUBMISSION_DEBUG_KEY = 'bifurcation_last_submission_debug';

function normalizeMarathonId(id: string) {
  return id.startsWith('marathon-') ? id : `marathon-${id}`;
}

function getSubmissionStorageKeys() {
  return Array.from(
    new Set(
      [
        storageKeys.submissions,
        EXTRA_SUBMISSIONS_KEY,
        PLAIN_SUBMISSIONS_KEY,
      ].filter((key): key is string => Boolean(key))
    )
  );
}

function loadArrayFromStorageKey<T = any>(key: string): T[] {
  try {
    const fromService = storageService.loadData<T[]>(key, []);

    if (Array.isArray(fromService)) {
      return fromService;
    }
  } catch (error) {
    console.warn(`storageService.loadData failed for ${key}:`, error);
  }

  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];

    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn(`localStorage read failed for ${key}:`, error);
    return [];
  }
}

function saveArrayToStorageKey<T = any>(key: string, items: T[]) {
  try {
    storageService.saveData(key, items);
  } catch (error) {
    console.warn(`storageService.saveData failed for ${key}:`, error);
  }

  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(key, JSON.stringify(items));
  } catch (error) {
    console.warn(`localStorage write failed for ${key}:`, error);
  }
}

function notifyLocalStorageChanged() {
  if (typeof window === 'undefined') return;

  try {
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new CustomEvent('bifurcation-storage-updated'));
  } catch (error) {
    console.warn('Could not dispatch storage update event:', error);
  }
}

function makeLocalSubmissionId() {
  return `sub-tiktok-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function getFallbackAvatar(nickname: string) {
  return `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(
    nickname || 'player'
  )}`;
}

function uniqueList(list: string[] = [], item: string) {
  return Array.from(new Set([...list, item]));
}

function removeFromList(list: string[] = [], item: string) {
  return list.filter(id => id !== item);
}

function normalizeSocialUrl(value: string) {
  return value.trim();
}

function isValidTikTokUrl(value: string) {
  try {
    const url = new URL(normalizeSocialUrl(value));
    const host = url.hostname.replace(/^www\./, '').toLowerCase();

    return (
      host === 'tiktok.com' ||
      host === 'm.tiktok.com' ||
      host === 'vm.tiktok.com' ||
      host === 'vt.tiktok.com'
    );
  } catch {
    return false;
  }
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

function mergeSubmissions(...lists: any[][]) {
  const map = new Map<string, any>();

  lists.flat().forEach(item => {
    if (!item) return;

    const key = item.id || item.remoteId || item.remote_id;
    if (!key) return;

    const previous = map.get(key) || {};
    map.set(key, { ...previous, ...item, id: item.id || previous.id || key });
  });

  return Array.from(map.values()).sort((a, b) => {
    const aTime = new Date(a.createdAt || a.created_at || 0).getTime();
    const bTime = new Date(b.createdAt || b.created_at || 0).getTime();
    return bTime - aTime;
  });
}

function loadAllSubmissions() {
  const lists = getSubmissionStorageKeys().map(key =>
    loadArrayFromStorageKey<any>(key)
  );

  return mergeSubmissions(...lists);
}

function saveAllSubmissions(items: any[]) {
  for (const key of getSubmissionStorageKeys()) {
    saveArrayToStorageKey(key, items);
  }

  notifyLocalStorageChanged();
}

function safeSaveSubmission(submission: any) {
  const cached = loadAllSubmissions();

  const next = mergeSubmissions(
    [submission],
    cached.filter(
      item =>
        item.id !== submission.id &&
        item.remoteId !== submission.id &&
        item.id !== submission.remoteId &&
        !(
          item.playerId === submission.playerId &&
          item.challengeId === submission.challengeId &&
          item.marathonId === submission.marathonId
        )
    )
  );

  saveAllSubmissions(next);

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(
        LAST_SUBMISSION_DEBUG_KEY,
        JSON.stringify(submission)
      );
    } catch (error) {
      console.warn('Could not save last submission debug copy:', error);
    }
  }
}

function findExistingSubmissionForChallenge(
  playerId: string,
  challengeId: string,
  marathonId?: string
) {
  return loadAllSubmissions().find(item => {
    const samePlayer = item.playerId === playerId || item.userId === playerId;
    const sameChallenge = item.challengeId === challengeId;

    if (!samePlayer || !sameChallenge) return false;

    if (!marathonId) return true;

    return (
      item.marathonId === marathonId ||
      normalizeMarathonId(String(item.marathonId || '')) === marathonId
    );
  });
}

function saveUserProgressLocally(
  user: User,
  challengeId: string,
  submissionId: string,
  gainedPoints: number
) {
  const currentSavedUser = storageService.loadData<User | null>(
    storageKeys.currentUser,
    user
  );

  const updatedCurrentUser = {
    ...(currentSavedUser || user),
    points: ((currentSavedUser || user).points || 0) + gainedPoints,
    completedChallenges: uniqueList(
      (currentSavedUser || user).completedChallenges || [],
      challengeId
    ),
    publicChallenges: uniqueList(
      (currentSavedUser || user).publicChallenges || [],
      submissionId
    ),
  } as User;

  storageService.saveData(storageKeys.currentUser, updatedCurrentUser);

  const userKeys = Array.from(
    new Set(
      [storageKeys.users, (storageKeys as any).players].filter(
        (key): key is string => Boolean(key)
      )
    )
  );

  for (const key of userKeys) {
    const users = storageService.loadData<User[]>(key, []);
    const exists = users.some(item => item.id === user.id);
    const updatedUsers = exists
      ? users.map(item =>
          item.id === user.id
            ? {
                ...item,
                points: (item.points || 0) + gainedPoints,
                completedChallenges: uniqueList(
                  item.completedChallenges || [],
                  challengeId
                ),
                publicChallenges: uniqueList(item.publicChallenges || [], submissionId),
              }
            : item
        )
      : [updatedCurrentUser, ...users];

    storageService.saveData(key, updatedUsers);
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

  const [tiktokUrl, setTiktokUrl] = useState('');
  const [comment, setComment] = useState('');
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0);
  const [countdownTick, setCountdownTick] = useState(0);

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
      visibility: 'public',
      expireAt: selectedTiming?.expireAt,
    });
  }, [selectedChallenge, selectedTiming, countdownTick]);

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
      'შეასრულეთ გამოწვევა უსაფრთხოდ, პატივისცემით და კანონის დაცვით. ვიდეო ატვირთეთ TikTok-ზე მხოლოდ მაშინ, თუ ის არ შეიცავს საფრთხეს, დამცირებას, შეურაცხყოფას ან სხვა ადამიანის პირად სივრცეში ჩარევას.';
    const fallbackEn =
      'Complete the challenge safely, respectfully and legally. Publish on TikTok only if the content is not unsafe, humiliating, offensive or invasive of another person’s privacy.';

    return lang === 'ka'
      ? challenge.safetyRules || fallbackKa
      : challenge.safetyRules_en || challenge.safetyRules || fallbackEn;
  }

  function resetSubmitForm() {
    setTiktokUrl('');
    setComment('');
    setMessage('');
    setErrorMessage('');
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
          ? 'გამოწვევა მიღებულია. თქვენ გაქვთ სრული 72 საათი TikTok-ზე შესრულებისთვის და ბმულის ჩასასმელად.'
          : 'Challenge accepted. You have 72 hours to publish on TikTok and submit the link.'
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
      window.setTimeout(() => setMessage(''), 1800);
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

      try {
        await playerService.markChallengeSkipped({
          playerId: currentUser.id,
          challengeId,
          penalty,
        });
      } catch (error) {
        console.warn('Skip saved locally only:', error);
      }

      setSelectedChallenge(null);
      resetSubmitForm();
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

    const existingSubmission = findExistingSubmissionForChallenge(
      currentUser.id,
      selectedChallenge.id,
      marathonId
    );

    const completedWithoutSavedSubmission =
      record.completedChallenges.includes(selectedChallenge.id) && !existingSubmission;

    if (record.completedChallenges.includes(selectedChallenge.id) && existingSubmission) {
      setErrorMessage(
        lang === 'ka'
          ? 'ეს გამოწვევა უკვე შესრულებულია.'
          : 'This challenge has already been completed.'
      );
      return;
    }

    const expired = completedWithoutSavedSubmission
      ? false
      : await applyExpiredPenaltyIfNeeded(selectedChallenge.id);

    if (expired) {
      setErrorMessage(
        lang === 'ka'
          ? 'დედლაინი ამოიწურა. ამ გამოწვევის ბმულის ჩასმა აღარ შეიძლება.'
          : 'The deadline has expired. You can no longer submit this challenge.'
      );
      return;
    }

    if (!completedWithoutSavedSubmission && record.skippedChallenges.includes(selectedChallenge.id)) {
      setErrorMessage(
        lang === 'ka'
          ? 'ეს გამოწვევა აცილებულია. დადასტურებამდე თავიდან მიიღეთ გამოწვევა.'
          : 'This challenge was skipped. Please accept it again before submitting.'
      );
      return;
    }

    if (
      !completedWithoutSavedSubmission &&
      !record.acceptedChallenges.includes(selectedChallenge.id)
    ) {
      setErrorMessage(
        lang === 'ka'
          ? 'დადასტურებამდე ჯერ უნდა მიიღოთ გამოწვევა.'
          : 'Please accept the challenge before submitting.'
      );
      return;
    }

    const cleanUrl = normalizeSocialUrl(tiktokUrl);

    if (!cleanUrl) {
      setErrorMessage(
        lang === 'ka'
          ? 'გთხოვთ ჩასვათ TikTok ვიდეოს ბმული.'
          : 'Please paste the TikTok video link.'
      );
      return;
    }

    if (!isValidTikTokUrl(cleanUrl)) {
      setErrorMessage(
        lang === 'ka'
          ? 'ბმული უნდა იყოს TikTok-ის ვიდეოს ბმული, მაგალითად: https://www.tiktok.com/@user/video/123...'
          : 'The link must be a TikTok video link, for example: https://www.tiktok.com/@user/video/123...'
      );
      return;
    }

    const timing = record.acceptedDates?.[selectedChallenge.id];
    const expireAt = typeof timing === 'string' ? timing : timing?.expireAt;

    setIsUploading(true);
    setMessage(lang === 'ka' ? 'მიმდინარეობს შენახვა...' : 'Saving...');

    try {
      const points = calculateCompletionPoints({
        challenge: selectedChallenge,
        visibility: 'public',
        expireAt,
      });

      const gainedPoints = completedWithoutSavedSubmission ? 0 : points.totalPoints;

      const now = new Date().toISOString();
      const submissionId = makeLocalSubmissionId();

      const submission = {
        id: submissionId,
        playerId: currentUser.id,
        userId: currentUser.id,
        challengeId: selectedChallenge.id,
        marathonId,

        submissionType: 'tiktok',
        socialPlatform: 'tiktok',
        socialUrl: cleanUrl,
        tiktokUrl: cleanUrl,
        externalUrl: cleanUrl,

        visibility: 'public',
        publishToWall: true,
        publish_to_wall: true,
        approved: true,
        status: 'completed',
        isPublic: true,

        playerNickname: currentUser.nickname || currentUser.firstName || 'მოთამაშე',
        playerAvatar:
          currentUser.avatar ||
          getFallbackAvatar(currentUser.nickname || currentUser.email || currentUser.id),

        challengeTitle: getChallengeTitle(selectedChallenge),

        comment,
        reflectionText: comment,
        textDescription: comment,

        fileUrl: '',
        videoUrl: '',
        localPreviewUrl: '',

        viewedBy: [],
        likedBy: [],
        votedUserIds: [],
        comments: [],
        commentPointsGivenBy: [],
        votes: 0,
        likes: 0,
        siteViews: 0,
        siteLikes: 0,
        siteComments: 0,
        engagementPoints: 0,

        basePoints: points.totalPoints,
        createdAt: now,
        updatedAt: now,
      };

      safeSaveSubmission(submission);

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

      record.publicVideos = uniqueList(record.publicVideos, submission.id);

      record.points = Math.max(
        0,
        (record.points || currentUser.points || 0) + gainedPoints
      );

      addPointHistory(record, {
        challengeId: selectedChallenge.id,
        submissionId: submission.id,
        amount: gainedPoints,
        reason: 'challenge-completed-tiktok-link',
        breakdown: points,
      });

      storageService.saveData(storageKeys.monthlyPlayerRecords, records);
      saveUserProgressLocally(
        currentUser,
        selectedChallenge.id,
        submission.id,
        gainedPoints
      );

      try {
        await playerService.markChallengeCompleted({
          playerId: currentUser.id,
          challengeId: selectedChallenge.id,
          visibility: 'public',
          gainedPoints,
        });
      } catch (playerUpdateError) {
        console.warn('Challenge completion saved locally only:', playerUpdateError);
      }

      setMessage(
        lang === 'ka'
          ? gainedPoints > 0
            ? `დავალება დადასტურდა TikTok ბმულით! დაემატა +${gainedPoints} ქულა 🎉`
            : 'TikTok ბმული შეინახა. ამ გამოწვევის ქულა უკვე დარიცხული იყო.'
          : gainedPoints > 0
            ? `Challenge confirmed with TikTok link! +${gainedPoints} points added 🎉`
            : 'TikTok link saved. Points for this challenge were already awarded.'
      );

      window.setTimeout(() => {
        setSelectedChallenge(null);
        resetSubmitForm();
        setForceUpdate(prev => prev + 1);
        onStateUpdate();
      }, 900);
    } catch (error: any) {
      console.error('TikTok submission error:', error);

      setErrorMessage(
        error?.message ||
          (lang === 'ka'
            ? 'TikTok ბმულის შენახვა ვერ მოხერხდა.'
            : 'Could not save TikTok link.')
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

    const completedInRecord = playerRecord.completedChallenges?.includes(challenge.id);

    const hasSavedSubmission = currentUser
      ? Boolean(
          findExistingSubmissionForChallenge(
            currentUser.id,
            challenge.id,
            normalizeMarathonId(selectedMarathonId)
          )
        )
      : false;

    const completed = Boolean(completedInRecord && hasSavedSubmission);
    const completedButMissingProof = Boolean(completedInRecord && !hasSavedSubmission);
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

    if (completedButMissingProof) {
      return {
        key: 'active',
        label: lang === 'ka' ? 'ბმული აკლია' : 'Link missing',
        className: 'text-amber-600',
        icon: '🔗',
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

  return (
    <div className="space-y-5 text-[#27213F] antialiased">
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
                      TikTok
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
          const basePoints = getBaseChallengePoints(selectedChallenge);

          return (
            <div className="fixed inset-0 z-[55] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
              <div className="relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] border border-violet-100 bg-white text-left shadow-2xl">
                <div className="sticky top-0 z-10 border-b border-violet-100 bg-white/95 px-6 py-4 backdrop-blur-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedChallenge(null);
                      resetSubmitForm();
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
                        {lang === 'ka' ? 'TikTok ბმული' : 'TikTok link'}
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

                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-xs font-bold leading-relaxed text-emerald-800">
                    <div className="mb-2 flex items-center gap-2">
                      <Link2 className="h-4 w-4" />
                      <strong>
                        {lang === 'ka'
                          ? 'ახალი წესი: დავალება სრულდება TikTok-ზე'
                          : 'New rule: the task is completed on TikTok'}
                      </strong>
                    </div>
                    {lang === 'ka'
                      ? 'ვიდეო ატვირთეთ თქვენს TikTok ანგარიშზე, შემდეგ დაბრუნდით აქ და ჩასვით ვიდეოს ბმული. ქულები, საიტზე ნახვები, გულები და კომენტარები დაითვლება მხოლოდ ამ საიტზე.'
                      : 'Publish the video on your TikTok account, then return here and paste the video link. Points, site views, likes and comments are counted only inside this website.'}
                  </div>

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
                            visibility: 'public',
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

                        <div className="rounded-2xl border border-violet-100 bg-[#FAF8FF] p-4">
                          <label className="mb-2 flex items-center gap-2 text-xs font-black text-[#1E1B35]">
                            <Link2 className="h-4 w-4 text-[#7C4DFF]" />
                            {lang === 'ka'
                              ? 'ჩასვით TikTok ვიდეოს ბმული'
                              : 'Paste the TikTok video link'}
                          </label>

                          <input
                            type="url"
                            required
                            placeholder="https://www.tiktok.com/@username/video/123456789"
                            value={tiktokUrl}
                            onChange={event => setTiktokUrl(event.target.value)}
                            className="w-full rounded-xl border border-violet-100 bg-white p-3 text-xs text-slate-800 focus:border-[#7C4DFF] focus:outline-none"
                          />

                          <p className="mt-2 text-[10px] font-medium text-slate-500">
                            {lang === 'ka'
                              ? 'სასურველია სრული TikTok ბმული /@username/video/... ფორმატით. მოკლე vm.tiktok.com ბმულიც შეინახება, მაგრამ საიტზე შესაძლოა მხოლოდ ღილაკით გაიხსნას.'
                              : 'A full /@username/video/... TikTok link is preferred. Short vm.tiktok.com links are saved too, but may open as an external button only.'}
                          </p>
                        </div>

                        <textarea
                          placeholder={
                            lang === 'ka'
                              ? 'კომენტარი სურვილისამებრ...'
                              : 'Optional comment...'
                          }
                          value={comment}
                          onChange={event => setComment(event.target.value)}
                          className="h-20 w-full rounded-xl border border-violet-100 bg-[#FAF8FF] p-3 text-xs text-slate-800 focus:border-[#7C4DFF] focus:outline-none"
                        />

                        {selectedPointsPreview && (
                          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-center text-xs font-black text-emerald-700">
                            {lang === 'ka'
                              ? `დადასტურების შემდეგ დაგერიცხებათ +${selectedPointsPreview.totalPoints} ქულა`
                              : `After confirmation you will receive +${selectedPointsPreview.totalPoints} points`}
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
                                ? 'ინახება...'
                                : 'Saving...'
                              : lang === 'ka'
                                ? 'დაადასტურე TikTok ბმულით'
                                : 'Confirm with TikTok link'}
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
                            ? 'გამოწვევის მიღების შემდეგ სისტემა დაგითვლით ზუსტ 72-საათიან დედლაინს. ვიდეო ატვირთეთ TikTok-ზე და შემდეგ აქ ჩასვით ბმული.'
                            : 'After accepting, the system will calculate your exact 72-hour deadline. Publish on TikTok and paste the link here.'}
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
                          ? 'გამოწვევის მიღება და TikTok ბმულით შესრულების დადასტურება შესაძლებელია ავტორიზაციის შემდეგ.'
                          : 'You can accept and confirm the challenge with TikTok link after signing in.'}
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

                  {tiktokUrl && isValidTikTokUrl(tiktokUrl) && (
                    <a
                      href={tiktokUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center gap-2 rounded-xl border border-violet-100 bg-white p-3 text-xs font-bold text-[#7C4DFF]"
                    >
                      <Eye className="h-4 w-4" />
                      {lang === 'ka' ? 'TikTok ბმულის შემოწმება' : 'Preview TikTok link'}
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
    </div>
  );
}
