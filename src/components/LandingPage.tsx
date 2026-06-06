import React, { useEffect, useMemo, useState } from 'react';
import { User, Submission } from '../types';
import { getPlayerAvatar } from '../utils/avatarUtils';
import { storageService, storageKeys } from '../services/storageService';
import { submissionService } from '../services/submissionService';
import LiveLeaderboardSidebar from './LiveLeaderboardSidebar';
import {
  Shield,
  Sparkles,
  Heart,
  Eye,
  ExternalLink,
  Music2,
  Compass,
  Flame,
  Paintbrush,
  UserPlus,
  FileText,
  Trophy,
  Play,
  ArrowRight,
  X,
} from 'lucide-react';

interface LandingPageProps {
  currentUser: User | null;
  submissions: (Submission & {
    playerNickname?: string;
    playerAvatar?: string;
    challengeTitle?: string;
  })[];
  users?: User[];
  onStartRegister: () => void;
  onStartLogin: () => void;
  setCurrentTab: (tab: string) => void;
  currentTab: string;
  onVote: (submissionId: string) => Promise<void>;
  lang?: string;
  marathons?: any[];
  monthlyPlayerRecords?: any[];
  onStateUpdate?: () => void;
  onChangeLang?: (l: 'ka' | 'en') => void;
  setActiveCabinetTab?: (tab: string) => void;
  setSelectedMarathonId?: (id: string | null) => void;
  selectedMarathonId?: string;
}

function normalizeId(id?: string) {
  if (!id) return '';
  return id.startsWith('marathon-') ? id : `marathon-${id}`;
}

function shortId(id?: string) {
  return (id || '').replace('marathon-', '');
}

function getOrCreateGuestVoterId() {
  if (typeof window === 'undefined') return '';

  const existing = localStorage.getItem(GUEST_VOTER_KEY);

  if (existing) return existing;

  const created = `guest-voter-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;

  localStorage.setItem(GUEST_VOTER_KEY, created);

  return created;
}

const EXTRA_SUBMISSIONS_KEY = 'bifurcation_submissions';
const LEGACY_SUBMISSIONS_KEY = 'submissions';
const GUEST_VIEWER_KEY = 'bifurcation_guest_viewer_id';
const GUEST_VOTER_KEY = 'bifurcation_guest_voter_id';

function getSubmissionStorageKeys() {
  return Array.from(
    new Set(
      [storageKeys.submissions, EXTRA_SUBMISSIONS_KEY, LEGACY_SUBMISSIONS_KEY].filter(
        (key): key is string => Boolean(key)
      )
    )
  );
}

function safeLoadArray(key: string) {
  try {
    return storageService.loadData<any[]>(key, []);
  } catch {
    try {
      return JSON.parse(localStorage.getItem(key) || '[]');
    } catch {
      return [];
    }
  }
}

function loadLocalSubmissions() {
  return mergeSubmissions(...getSubmissionStorageKeys().map(key => safeLoadArray(key)));
}

function getOrCreateGuestViewerId() {
  if (typeof window === 'undefined') return '';

  const existing = localStorage.getItem(GUEST_VIEWER_KEY);

  if (existing) return existing;

  const created = `guest-viewer-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;

  localStorage.setItem(GUEST_VIEWER_KEY, created);

  return created;
}

function getViewerId(currentUser: User | null) {
  return currentUser?.id || getOrCreateGuestViewerId();
}

function getSubmissionUrl(submission: any) {
  return (
    submission.tiktokUrl ||
    submission.tiktok_url ||
    submission.socialUrl ||
    submission.social_url ||
    submission.externalUrl ||
    submission.external_url ||
    submission.fileUrl ||
    submission.videoUrl ||
    submission.file_url ||
    submission.video_url ||
    ''
  );
}

function isTikTokSubmission(submission: any) {
  const url = getSubmissionUrl(submission).toLowerCase();
  const type = String(submission.submissionType || submission.submission_type || '').toLowerCase();
  const platform = String(submission.socialPlatform || submission.social_platform || '').toLowerCase();

  return type === 'tiktok' || platform === 'tiktok' || url.includes('tiktok.com');
}

function extractTikTokVideoId(url: string) {
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/\/video\/(\d+)/);

    return match?.[1] || '';
  } catch {
    const match = url.match(/\/video\/(\d+)/);
    return match?.[1] || '';
  }
}

function normalizeTikTokUrl(url: string) {
  return url.split('?')[0];
}

function getSubmissionText(submission: any) {
  return (
    submission.textDescription ||
    submission.reflectionText ||
    submission.comment ||
    submission.description ||
    ''
  );
}

function getSubmissionCreatedAt(submission: any) {
  return new Date(
    submission.createdAt ||
      submission.created_at ||
      submission.updatedAt ||
      submission.updated_at ||
      0
  ).getTime();
}

function detectMediaType(submission: any) {
  const type = submission.submissionType || submission.submission_type || '';
  const url = getSubmissionUrl(submission);

  if (isTikTokSubmission(submission)) {
    return 'tiktok';
  }

  if (type === 'photo' || url.match(/\.(jpeg|jpg|gif|png|webp|svg)($|\?)/i) || url.startsWith('data:image/')) {
    return 'photo';
  }

  if (type === 'audio' || url.match(/\.(mp3|wav|ogg|aac|m4a)($|\?)/i) || url.startsWith('data:audio/')) {
    return 'audio';
  }

  if (type === 'video' || url.match(/\.(mp4|webm|mov|m4v)($|\?)/i) || url.startsWith('data:video/')) {
    return 'video';
  }

  if (!url) return 'text';

  return 'video';
}

function mergeSubmissions(...lists: any[][]) {
  const map = new Map<string, any>();

  lists.flat().forEach(item => {
    if (!item?.id) return;

    const previous = map.get(item.id) || {};

    const likedBy = Array.from(
      new Set([
        ...(previous.likedBy || []),
        ...(previous.votedUserIds || []),
        ...(item.likedBy || []),
        ...(item.liked_by || []),
        ...(item.votedUserIds || []),
        ...(item.voted_user_ids || []),
      ])
    );

    const viewedBy = Array.from(
      new Set([
        ...(previous.viewedBy || []),
        ...(previous.viewed_by || []),
        ...(item.viewedBy || []),
        ...(item.viewed_by || []),
      ])
    );

    const comments = item.comments || previous.comments || [];

    map.set(item.id, {
      ...previous,
      ...item,
      likedBy,
      votedUserIds: likedBy,
      viewedBy,
      comments,
      votes: item.votes ?? item.likes ?? likedBy.length ?? previous.votes ?? 0,
      likes: item.likes ?? item.votes ?? likedBy.length ?? previous.likes ?? 0,
      siteViews: item.siteViews ?? item.site_views ?? viewedBy.length ?? previous.siteViews ?? 0,
      siteLikes: item.siteLikes ?? item.site_likes ?? likedBy.length ?? previous.siteLikes ?? 0,
      siteComments: item.siteComments ?? item.site_comments ?? comments.length ?? previous.siteComments ?? 0,
    });
  });

  return Array.from(map.values()).sort(
    (a, b) => getSubmissionCreatedAt(b) - getSubmissionCreatedAt(a)
  );
}

function buildChallengeLookup(marathons: any[]) {
  const map = new Map<string, any>();

  marathons.forEach(marathon => {
    (marathon.challenges || []).forEach((challenge: any) => {
      if (!challenge?.id) return;

      map.set(challenge.id, {
        ...challenge,
        marathonId: marathon.id,
      });
    });
  });

  return map;
}

export default function LandingPage({
  currentUser,
  submissions,
  users = [],
  onStartRegister,
  setCurrentTab,
  onVote,
  lang = 'ka',
  marathons = [],
  monthlyPlayerRecords = [],
  onStateUpdate,
  setActiveCabinetTab,
  setSelectedMarathonId,
}: LandingPageProps) {
  const [activeMediaSub, setActiveMediaSub] = useState<any | null>(null);
  const [selectedPreviewMarathon, setSelectedPreviewMarathon] =
    useState<any | null>(null);
  const [selectedPreviewChallenge, setSelectedPreviewChallenge] =
    useState<any | null>(null);
  const [tick, setTick] = useState(0);
  const [voteMessage, setVoteMessage] = useState('');
  const [commentDraft, setCommentDraft] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setTick(value => value + 1), 60000);
    return () => window.clearInterval(timer);
  }, []);

  const isUserAuthenticated = currentUser !== null;

  const allUsers = useMemo(() => {
    const localUsers = storageService.loadData<User[]>(storageKeys.users, []);
    const localCurrentUser = storageService.loadData<User | null>(
      storageKeys.currentUser,
      null
    );

    const map = new Map<string, any>();

    [...localUsers, ...users, ...(localCurrentUser ? [localCurrentUser] : []), ...(currentUser ? [currentUser] : [])].forEach(
      user => {
        if (user?.id) map.set(user.id, user);
      }
    );

    return Array.from(map.values());
  }, [currentUser, users, tick]);

  const allMarathons = useMemo(() => {
    const localMarathons = storageService.loadData<any[]>(
      storageKeys.marathons,
      []
    );

    const map = new Map<string, any>();

    [...localMarathons, ...(marathons || [])].forEach(marathon => {
      if (marathon?.id) map.set(marathon.id, marathon);
    });

    return Array.from(map.values());
  }, [marathons, tick]);

  const challengeLookup = useMemo(
    () => buildChallengeLookup(allMarathons),
    [allMarathons]
  );

  const currentFeedSubmissions = useMemo(() => {
    const localSubmissions = loadLocalSubmissions();

    const merged = mergeSubmissions(localSubmissions, submissions || []);

    return merged
      .filter(submission => {
        return (
          submission.visibility === 'public' ||
          submission.publishToWall === true ||
          submission.publish_to_wall === true ||
          submission.isPublic === true ||
          submission.is_public === true ||
          submission.status === 'completed'
        );
      })
      .map(submission => {
        const player = allUsers.find(user => user.id === submission.playerId);
        const challenge = challengeLookup.get(submission.challengeId);

        const storedPlayerNickname =
          submission.playerNickname || submission.player_nickname || '';

        const isGenericPlayerName =
          !storedPlayerNickname ||
          ['მოთამაშე', 'Player', 'player', 'guest', 'სტუმარი'].includes(
            String(storedPlayerNickname).trim()
          );

        const playerNickname =
          isGenericPlayerName
            ? player?.nickname || player?.firstName || storedPlayerNickname || 'მოთამაშე'
            : storedPlayerNickname;

        const playerAvatar =
          submission.playerAvatar ||
          submission.player_avatar ||
          player?.avatar ||
          getPlayerAvatar(playerNickname, '');

        const challengeTitle =
          submission.challengeTitle ||
          submission.challenge_title ||
          (lang === 'ka'
            ? challenge?.title_ka || challenge?.title
            : challenge?.title_en || challenge?.title) ||
          (lang === 'ka' ? 'გამოწვევა' : 'Challenge');

        return {
          ...submission,
          playerNickname,
          playerAvatar,
          challengeTitle,
          likedBy:
            submission.likedBy ||
            submission.liked_by ||
            submission.votedUserIds ||
            [],
          viewedBy: submission.viewedBy || submission.viewed_by || [],
          comments: submission.comments || [],
          votedUserIds:
            submission.votedUserIds ||
            submission.voted_user_ids ||
            submission.likedBy ||
            [],
          votes:
            submission.votes ||
            submission.likes ||
            submission.likedBy?.length ||
            submission.liked_by?.length ||
            0,
          likes:
            submission.likes ||
            submission.votes ||
            submission.likedBy?.length ||
            submission.liked_by?.length ||
            0,
          siteViews:
            submission.siteViews ||
            submission.site_views ||
            submission.viewedBy?.length ||
            0,
          siteComments:
            submission.siteComments ||
            submission.site_comments ||
            submission.comments?.length ||
            0,
        };
      });
  }, [submissions, allUsers, challengeLookup, lang, tick]);

  const values = [
    {
      title: lang === 'ka' ? 'ნებაყოფლობითობა' : 'Voluntariness',
      desc:
        lang === 'ka'
          ? 'თამაშში მონაწილეობა და ნებისმიერი ტიპის გამოწვევის აღება არის თქვენი თავისუფალი არჩევანი.'
          : 'Participation and every challenge are your free choice.',
      icon: Compass,
    },
    {
      title: lang === 'ka' ? 'უსაფრთხოება' : 'Safety First',
      desc:
        lang === 'ka'
          ? 'არცერთი დავალება არ უნდა იყოს თქვენი ან სხვისი ჯანმრთელობისთვის, უსაფრთხოებისთვის ან ღირსებისთვის საზიანო.'
          : 'No challenge should endanger health, safety, or dignity.',
      icon: Shield,
    },
    {
      title: lang === 'ka' ? 'პატივისცემა' : 'Mutual Respect',
      desc:
        lang === 'ka'
          ? 'მოთამაშეები ერთმანეთს არ ამცირებენ და პატივს სცემენ განსხვავებულ ფორმატებს.'
          : 'Players respect each other and different formats.',
      icon: Heart,
    },
    {
      title: lang === 'ka' ? 'სიმამაცე' : 'Courage',
      desc:
        lang === 'ka'
          ? 'თამაში გეხმარებათ ბარიერების უსაფრთხოდ გადალახვაში.'
          : 'The game helps you overcome barriers safely.',
      icon: Flame,
    },
    {
      title: lang === 'ka' ? 'შემოქმედებითობა' : 'Creativity',
      desc:
        lang === 'ka'
          ? 'ყველა დავალება შეიძლება შესრულდეს ორიგინალურად და საინტერესოდ.'
          : 'Each task can be completed creatively.',
      icon: Paintbrush,
    },
  ];

  const rules = [
    {
      title: lang === 'ka' ? 'რეგისტრაცია და ნიკნეიმი' : 'Registration',
      desc:
        lang === 'ka'
          ? 'თამაშში შემოსასვლელად ქმნით ანგარიშს და შეგიძლიათ გამოიყენოთ ნიკნეიმი.'
          : 'Create an account and use a nickname.',
      icon: UserPlus,
    },
    {
      title: lang === 'ka' ? 'მონაწილეობის შეთანხმება' : 'Agreement',
      desc:
        lang === 'ka'
          ? 'რეგისტრაციისას ადასტურებთ, რომ თამაშობთ ნებაყოფლობით.'
          : 'Confirm that participation is voluntary.',
      icon: FileText,
    },
    {
      title: lang === 'ka' ? 'ხილვადობა' : 'Visibility',
      desc:
        lang === 'ka'
          ? 'ყოველი დავალებისას ირჩევთ: საჯარო თუ პირადი.'
          : 'Choose public or private for each submission.',
      icon: Eye,
    },
    {
      title: lang === 'ka' ? 'მხარდაჭერა' : 'Support',
      desc:
        lang === 'ka'
          ? 'საჯარო დავალებაზე მხარდაჭერა ზრდის ავტორის ქულებს.'
          : 'Supporting public tasks increases the author’s points.',
      icon: Heart,
    },
    {
      title: lang === 'ka' ? 'ლიდერბორდი' : 'Leaderboard',
      desc:
        lang === 'ka'
          ? 'რეიტინგში ჩანს არჩეული ნიკნეიმი, ავატარი და ქულები.'
          : 'The leaderboard shows nickname, avatar, and points.',
      icon: Trophy,
    },
  ];

  function getCountdownText(targetDateStr: string, activeLang: string) {
    if (!targetDateStr) {
      return activeLang === 'ka' ? 'განისაზღვრება' : 'TBD';
    }

    const targetDate = new Date(targetDateStr);

    if (Number.isNaN(targetDate.getTime())) {
      return activeLang === 'ka' ? 'განისაზღვრება' : 'TBD';
    }

    const diffTime = targetDate.getTime() - new Date().getTime();

    if (diffTime <= 0) {
      return activeLang === 'ka' ? 'დასრულებულია 🔒' : 'Ended 🔒';
    }

    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(
      (diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );
    const diffMinutes = Math.floor(
      (diffTime % (1000 * 60 * 60)) / (1000 * 60)
    );

    return activeLang === 'ka'
      ? `დარჩენილია: ${diffDays} დღე, ${diffHours} სთ, ${diffMinutes} წთ`
      : `Time left: ${diffDays}d, ${diffHours}h, ${diffMinutes}m`;
  }

  function getMonthEmoji(monthId: string) {
    if (monthId.includes('june')) return '🎒';
    if (monthId.includes('july')) return '🏄';
    if (monthId.includes('august')) return '🏕️';
    return '🍂';
  }

  function getPreviewChallenges(marathon: any) {
    if (marathon.challenges && marathon.challenges.length > 0) {
      return marathon.challenges;
    }

    const localSaved = storageService.loadData<any[]>(
      storageKeys.marathons,
      []
    );

    const found = localSaved.find(
      item =>
        item.id === marathon.id ||
        shortId(item.id) === shortId(marathon.id)
    );

    return found?.challenges || [];
  }

  async function handleOpenSubmission(submission: any) {
    try {
      const viewerId = getViewerId(currentUser);

      if (viewerId && submissionService.recordView) {
        const updated = await submissionService.recordView(submission.id, viewerId);

        if (updated) {
          setActiveMediaSub({ ...submission, ...(updated as any) });
        } else {
          setActiveMediaSub(submission);
        }
      } else {
        setActiveMediaSub(submission);
      }

      setTick(value => value + 1);
      await onStateUpdate?.();
    } catch (error) {
      console.warn('View record failed, opening submission anyway:', error);
      setActiveMediaSub(submission);
    }
  }

  async function handleVoteAction(submission: any) {
    try {
      const voterId = currentUser?.id || getOrCreateGuestVoterId();
      setVoteMessage('');

      if (submission.playerId === voterId || submission.userId === voterId) {
        throw new Error(
          lang === 'ka'
            ? 'საკუთარ შესრულებულ გამოწვევაზე მხარდაჭერა არ ითვლება. შესამოწმებლად გამოიყენეთ სხვა ანგარიში ან სტუმრის რეჟიმი.'
            : 'Your own submission cannot receive your vote. Use another account or guest mode for testing.'
        );
      }

      const updated = await submissionService.voteSubmission(submission.id, voterId);

      if (updated) {
        setActiveMediaSub((previous: any) =>
          previous && previous.id === (updated as any).id
            ? { ...previous, ...(updated as any) }
            : previous
        );
      }

      setTick(value => value + 1);
      await onStateUpdate?.();

      setVoteMessage(
        lang === 'ka'
          ? 'მხარდაჭერა დაფიქსირდა.'
          : 'Support has been recorded.'
      );
    } catch (error: any) {
      console.error(error);
      setVoteMessage(
        error?.message ||
          (lang === 'ka'
            ? 'მხარდაჭერა ვერ დაფიქსირდა.'
            : 'Support could not be recorded.')
      );
    }
  }

  async function handleCommentAction(submission: any) {
    try {
      const text = commentDraft.trim();
      const authorId = getViewerId(currentUser);

      setVoteMessage('');

      if (!text) {
        throw new Error(lang === 'ka' ? 'კომენტარი ცარიელია.' : 'Comment is empty.');
      }

      if (!authorId) {
        throw new Error(
          lang === 'ka'
            ? 'კომენტარისთვის ვერ შეიქმნა მომხმარებლის იდენტიფიკატორი.'
            : 'Could not create commenter id.'
        );
      }

      setCommentLoading(true);

      const updated = await submissionService.addComment(submission.id, {
        authorId,
        authorNickname: currentUser?.nickname || (lang === 'ka' ? 'სტუმარი' : 'Guest'),
        authorAvatar: currentUser?.avatar || '',
        text,
      });

      if (updated) {
        setActiveMediaSub((previous: any) =>
          previous && previous.id === (updated as any).id
            ? { ...previous, ...(updated as any) }
            : previous
        );
      }

      setCommentDraft('');
      setTick(value => value + 1);
      await onStateUpdate?.();

      setVoteMessage(lang === 'ka' ? 'კომენტარი დაემატა.' : 'Comment added.');
    } catch (error: any) {
      console.error(error);
      setVoteMessage(
        error?.message ||
          (lang === 'ka'
            ? 'კომენტარის დამატება ვერ მოხერხდა.'
            : 'Could not add comment.')
      );
    } finally {
      setCommentLoading(false);
    }
  }

  function handleStartGameClick() {
    if (isUserAuthenticated) {
      setCurrentTab('cabinet');
      setActiveCabinetTab?.('challenges');
    } else {
      onStartRegister();
    }
  }

  function handleViewMarathonsClick() {
    const element = document.getElementById('marathons-dashboard');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }

  function openChallengeWorkspace(marathonId: string) {
    setSelectedMarathonId?.(shortId(marathonId));
    setCurrentTab('cabinet');
    setActiveCabinetTab?.('challenges');
  }

  function renderTikTokEmbed(submission: any) {
    const url = getSubmissionUrl(submission);
    const cleanUrl = normalizeTikTokUrl(url);
    const videoId = extractTikTokVideoId(cleanUrl);

    if (videoId) {
      return (
        <div className="mx-auto h-[48vh] min-h-[300px] max-h-[460px] w-full max-w-[320px] overflow-hidden rounded-2xl border border-slate-200 bg-black">
          <iframe
            src={`https://www.tiktok.com/embed/v2/${videoId}`}
            title="TikTok video"
            allow="fullscreen"
            className="h-full w-full border-0 bg-black"
          />
        </div>
      );
    }

    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-[#111827] to-[#2d0b45] p-6 text-center text-white">
        <Music2 className="mb-4 h-10 w-10 text-violet-200" />
        <p className="text-xs font-black uppercase tracking-[0.22em] text-fuchsia-200">
          TikTok Proof
        </p>
        <p className="mt-2 max-w-xs text-xs font-semibold leading-5 text-slate-200">
          {lang === 'ka'
            ? 'ამ TikTok ბმულის საიტში ჩასმა ვერ მოხერხდა. გახსენით TikTok-ზე.'
            : 'This TikTok link could not be embedded. Open it on TikTok.'}
        </p>
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-xs font-black text-[#111827] transition hover:scale-[1.02]"
          >
            <ExternalLink className="h-4 w-4" />
            {lang === 'ka' ? 'TikTok-ზე ნახვა' : 'Open on TikTok'}
          </a>
        )}
      </div>
    );
  }

  function renderSubmissionMedia(submission: any, mode: 'card' | 'modal') {
    const url = getSubmissionUrl(submission);
    const mediaType = detectMediaType(submission);

    if (mediaType === 'tiktok') {
      if (mode === 'modal') {
        return renderTikTokEmbed(submission);
      }

      return (
        <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-[#111827] to-[#2d0b45] p-6 text-center text-white">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-2xl shadow-lg">
            🎵
          </div>

          <p className="text-xs font-black uppercase tracking-[0.22em] text-fuchsia-200">
            TikTok Proof
          </p>

          <p className="mt-2 max-w-xs text-xs font-semibold leading-5 text-slate-200">
            {lang === 'ka'
              ? 'ვიდეო ატვირთულია TikTok-ზე. გახსენით საიტშივე ან TikTok-ზე.'
              : 'The video is hosted on TikTok. Open it on this site or on TikTok.'}
          </p>

          <span className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white">
            <ExternalLink className="h-3.5 w-3.5" />
            {lang === 'ka' ? 'გახსნა' : 'Open'}
          </span>
        </div>
      );
    }

    if (!url || mediaType === 'text') {
      }
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#04020d] font-sans text-slate-100">
      <section className="relative overflow-hidden bg-[#04020d] px-3 pb-12 pt-10 sm:px-6 sm:pb-16 sm:pt-14 md:px-10 lg:pb-24 lg:pt-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#1c1544_0%,#050311_46%,#03010a_100%)]" />
        <div className="absolute left-[-8%] top-24 h-56 w-56 rounded-full bg-violet-700/20 blur-3xl" />
        <div className="absolute right-[-10%] top-36 h-64 w-64 rounded-full bg-fuchsia-600/15 blur-3xl" />
        <div className="absolute bottom-8 left-1/2 h-20 w-[72%] -translate-x-1/2 rounded-full bg-gradient-to-r from-violet-700/10 via-fuchsia-500/10 to-amber-500/10 blur-2xl" />

        <div className="relative z-10 mx-auto max-w-7xl space-y-6 text-center sm:space-y-7">
          <h1 className="relative mx-auto flex w-full max-w-full items-center justify-center overflow-visible py-3 sm:py-4">
            <span
              className="relative z-10 block whitespace-nowrap bg-gradient-to-r from-violet-500 via-fuchsia-500 to-amber-400 bg-clip-text text-center text-[clamp(2.45rem,9.5vw,7.6rem)] font-black leading-[0.92] tracking-[-0.035em] text-transparent drop-shadow-[0_0_22px_rgba(217,70,239,0.34)]"
              style={{
                fontFamily:
                  'Inter, "Noto Sans Georgian", "Helvetica Neue", Arial, system-ui, sans-serif',
                fontWeight: 950,
                WebkitTextStroke: '0.35px rgba(255,255,255,0.08)',
                textShadow:
                  '0 0 18px rgba(168,85,247,0.38), 0 0 42px rgba(217,70,239,0.18), 0 12px 34px rgba(0,0,0,0.45)',
              }}
            >
              {lang === 'ka' ? 'ბიფურკაცია' : 'Bifurcation'}
            </span>

            <span className="absolute bottom-1 left-1/2 h-2 w-[86%] max-w-5xl -translate-x-1/2 rounded-full bg-gradient-to-r from-violet-600/60 via-fuchsia-500/55 to-amber-400/60 blur-md" />
          </h1>

          <div className="mx-auto flex max-w-5xl items-stretch gap-3 text-left sm:gap-4">
            <div className="w-1 shrink-0 rounded-full bg-gradient-to-b from-[#7c3aed] via-[#db2777] to-[#fbbf24] sm:w-1.5" />

            <div className="space-y-2.5">
              <h2 className="text-base font-black leading-snug text-white sm:text-xl md:text-2xl lg:text-3xl">
                {lang === 'ka'
                  ? 'ახალი გამოწვევები, სოციალური თამაშები და უფრო თავდაჯერებული შენ.'
                  : 'New challenges, social games, and a more confident you.'}
              </h2>

              <p className="max-w-4xl text-xs font-light leading-6 text-slate-400 sm:text-sm sm:leading-7 md:text-base md:leading-8">
                {lang === 'ka'
                  ? '„ბიფურკაცია“ არის სივრცითი პროვოკაციული გამოწვევა — სოციალური თამაში, სადაც „არასტანდარტული ქმედებებით“ აგროვებ ქულებს, აზიარებ TikTok-ზე შესრულებულ დავალებებს, იღებ მხარდაჭერას და იბრძვი წოდებისთვის: „მე ვარ საუკეთესო“. ეს არის კოლექტიური თამაში, სადაც ბევრი ადამიანი გეხმარება შენ, და შენც ეხმარები სხვებს — უსაფრთხო, შემოქმედებითი და სახალისო გამოწვევებით დაძლიოთ ბარიერები, შიშები და კომპლექსები.'
                  : 'Bifurcation is a spatial provocative challenge — a social game where you earn points through creative non-standard actions, share TikTok proof, receive support, and compete for the title: I am the best.'}
              </p>
            </div>
          </div>

          <div className="flex w-full flex-col justify-center gap-3 pt-2 sm:w-auto sm:flex-row">
            <button
              type="button"
              onClick={handleStartGameClick}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-700 via-fuchsia-600 to-indigo-700 px-5 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-fuchsia-900/20 transition-all hover:scale-[1.02] sm:w-auto sm:px-8"
            >
              <span>{lang === 'ka' ? 'დაიწყე თამაში' : 'Start the Game'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={handleViewMarathonsClick}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3.5 text-sm text-white transition-all hover:bg-white/10 sm:w-auto sm:px-8"
            >
              <Play className="h-4 w-4 fill-fuchsia-400 text-fuchsia-400" />
              <span>
                {lang === 'ka' ? 'ნახე როგორ მუშაობს' : 'See How It Works'}
              </span>
            </button>
          </div>
        </div>
      </section>

      <section id="prize-support" className="relative z-10 -mt-6 px-3 sm:-mt-8 sm:px-6 md:px-10">
        <div className="mx-auto grid max-w-7xl gap-3 rounded-[24px] border border-white/10 bg-white/[0.06] p-4 text-left text-white shadow-2xl backdrop-blur-xl sm:p-5 md:grid-cols-3">
          <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4">
            <p className="text-xs font-black uppercase tracking-widest text-amber-200">🏆 ფულადი პრიზი</p>
            <p className="mt-2 text-sm leading-6 text-amber-50">
              გამარჯვებული ვლინდება მხოლოდ თამაშის ქულებით და იღებს ფულად პრიზს.
            </p>
          </div>

          <div className="rounded-2xl border border-fuchsia-400/20 bg-fuchsia-400/10 p-4">
            <p className="text-xs font-black uppercase tracking-widest text-fuchsia-200">💜 ნებაყოფლობითი მხარდაჭერა</p>
            <p className="mt-2 text-sm leading-6 text-fuchsia-50">
              დონაცია არ ზრდის ქულებს, არ ცვლის რეიტინგს და არ იძლევა უპირატესობას.
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
            <p className="text-xs font-black uppercase tracking-widest text-emerald-200">🌱 რატომ ვთხოვთ მხარდაჭერას?</p>
            <p className="mt-2 text-sm leading-6 text-emerald-50">
              მხარდაჭერა გვეხმარება თამაშის გაგრძელებაში, პრიზების შენარჩუნებასა და ახალი საგანმანათლებლო პროგრამების შექმნაში.
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-3 py-8 sm:px-6 sm:py-10 lg:flex-row lg:gap-8 lg:px-10 lg:py-12">
        <div className="flex-1 space-y-12">
          <div
            id="submissions-showcase"
            className="space-y-5 rounded-[24px] border border-[#E3DDF4] bg-[#FFF0E8] p-4 text-left shadow-[0_12px_30px_rgba(94,88,120,0.04)] sm:space-y-6 sm:rounded-[32px] sm:p-8 lg:p-10"
          >
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-[#FF9B6A]/20 bg-[#FF9B6A]/10 px-3.5 py-1 text-xs font-extrabold uppercase text-[#FF9B6A]">
                {lang === 'ka'
                  ? 'საჯარო სიმამაცის კედელი'
                  : 'Public Courage Wall'}
              </div>

              <h2 className="text-xl font-black tracking-tight text-[#27213F] sm:text-2xl md:text-3xl">
                {lang === 'ka' ? 'კომპლექსები, შიში და ' : 'Complexes, fear and '}
                <span className="text-[#FF9B6A]">
                  {lang === 'ka' ? 'სოციალური სიმამაცე' : 'social courage'}
                </span>
              </h2>

              <p className="text-[12px] font-light leading-6 text-[#5E5878] md:text-sm">
                {lang === 'ka'
                  ? 'აქ ჩანს TikTok-ზე შესრულებული გამოწვევები. საიტზე მიღებული ნახვები, გულები და კომენტარები ზრდის მოთამაშის ჩართულობის ქულებს.'
                  : 'Only submissions marked public by players appear here.'}
              </p>

              {voteMessage && (
                <div className="rounded-2xl border border-orange-100 bg-white/80 p-3 text-xs font-bold text-[#FF7A45]">
                  {voteMessage}
                </div>
              )}
            </div>

            {currentFeedSubmissions.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-[#FF9B6A]/30 bg-white/70 p-8 text-center">
                <p className="text-sm font-black text-[#27213F]">
                  {lang === 'ka'
                    ? 'საჯარო შესრულებული გამოწვევები ჯერ არ არის.'
                    : 'No public submissions yet.'}
                </p>

                <p className="mt-2 text-xs font-medium text-[#5E5878]">
                  {lang === 'ka'
                    ? 'როცა მოთამაშე დავალებას საჯაროდ ატვირთავს, ის აქ გამოჩნდება.'
                    : 'When a player uploads a public proof, it will appear here.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
                {currentFeedSubmissions.map((sub: any) => {
                  const guestVoterId =
                    typeof window !== 'undefined'
                      ? localStorage.getItem(GUEST_VOTER_KEY)
                      : null;
                  const voterId = currentUser ? currentUser.id : guestVoterId;
                  const likedBy = sub.likedBy || [];
                  const hasLiked = Boolean(voterId && likedBy.includes(voterId));
                  const voteCount = likedBy.length || sub.votes || 0;

                  return (
                    <div
                      key={sub.id}
                      onClick={() => handleOpenSubmission(sub)}
                      className="group relative flex cursor-pointer flex-col overflow-hidden rounded-[20px] border border-[#E8E2F1] bg-white transition-all duration-300 hover:shadow-xl sm:rounded-[24px]"
                    >
                      <div className="relative aspect-video select-none overflow-hidden bg-slate-950">
                        {renderSubmissionMedia(sub, 'card')}

                        <div
                          className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-xl border bg-white/95 px-3 py-1.5"
                          onClick={event => event.stopPropagation()}
                        >
                          <img
                            src={getPlayerAvatar(
                              sub.playerNickname,
                              sub.playerAvatar
                            )}
                            className="h-5 w-5 rounded-full object-cover"
                            alt="avatar"
                          />

                          <span className="max-w-[110px] truncate text-[11px] font-extrabold text-[#27213F]">
                            @{sub.playerNickname}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-1 flex-col justify-between space-y-3.5 bg-white p-5">
                        <div>
                          <h4 className="line-clamp-2 text-base font-extrabold leading-snug text-[#27213F] transition-colors group-hover:text-[#FF9B6A]">
                            {sub.challengeTitle}
                          </h4>

                          <p className="mt-1 line-clamp-3 text-xs font-light leading-relaxed text-[#5E5878]">
                            {getSubmissionText(sub) ||
                              (lang === 'ka'
                                ? 'მოთამაშემ გამოწვევა საჯაროდ შეასრულა.'
                                : 'The player completed this challenge publicly.')}
                          </p>
                        </div>

                        <div
                          className="mt-2 flex items-center justify-between border-t border-[#E8E2F1] pt-4 text-xs"
                          onClick={event => event.stopPropagation()}
                        >
                          <button
                            type="button"
                            className={`flex cursor-pointer items-center gap-1.5 font-extrabold transition-colors ${
                              hasLiked
                                ? 'text-rose-600'
                                : 'text-[#5E5878] hover:text-rose-600'
                            }`}
                            onClick={event => {
                              event.preventDefault();
                              event.stopPropagation();
                              handleVoteAction(sub);
                            }}
                          >
                            <Heart
                              className={`h-4 w-4 transition-transform hover:scale-110 ${
                                hasLiked
                                  ? 'fill-rose-500 text-rose-500'
                                  : 'fill-none text-rose-400'
                              }`}
                            />

                            <span>
                              {voteCount} {lang === 'ka' ? 'ხმა' : 'votes'}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={event => {
                              event.preventDefault();
                              event.stopPropagation();
                              handleVoteAction(sub);
                            }}
                            className="cursor-pointer rounded-lg border border-[#FF9B6A]/20 bg-[#FFF0E8] px-3.5 py-1.5 font-extrabold text-[#FF9B6A] transition-all hover:bg-[#FF9B6A] hover:text-white"
                          >
                            👍 {lang === 'ka' ? 'მხარდაჭერა' : 'Vote'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div
            id="marathons-dashboard"
            className="space-y-5 rounded-[24px] border border-[#E3DDF4] bg-[#EAF8F2] p-4 text-left sm:space-y-6 sm:rounded-[32px] sm:p-8 lg:p-10"
          >
            <div className="space-y-2">
              <span className="rounded-full bg-[#32B88A]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#32B88A]">
                {lang === 'ka' ? 'მარათონები' : 'Marathons'}
              </span>

              <h2 className="text-2xl font-black text-[#27213F] md:text-3xl">
                {lang === 'ka'
                  ? 'ბიფურკაციის ყოველთვიური მარათონები'
                  : 'Monthly Marathons'}
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {allMarathons.map((marathon: any) => {
                const playerRecord = currentUser
                  ? monthlyPlayerRecords.find(
                      record =>
                        record.playerId === currentUser.id &&
                        normalizeId(record.marathonId) === normalizeId(marathon.id)
                    )
                  : null;

                const isJoined =
                  playerRecord && playerRecord.participationConfirmed;
                const completedCount =
                  playerRecord?.completedChallenges?.length || 0;

                return (
                  <div
                    key={marathon.id}
                    className={`flex flex-col justify-between rounded-[24px] border bg-white p-6 text-left transition-all hover:shadow-md ${
                      marathon.status === 'active'
                        ? 'border-2 border-[#32B88A]'
                        : 'border-slate-200'
                    }`}
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="select-none text-3xl">
                          {getMonthEmoji(marathon.id)}
                        </span>

                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-slate-600">
                          {marathon.status || 'soon'}
                        </span>
                      </div>

                      <h3 className="text-base font-extrabold leading-snug text-[#27213F]">
                        {lang === 'ka'
                          ? marathon.title_ka || marathon.title
                          : marathon.title_en || marathon.title}
                      </h3>

                      <p className="font-mono text-[11px] text-slate-400">
                        {getCountdownText(marathon.endDate, lang)}
                      </p>

                      {isJoined && (
                        <div className="space-y-2 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 text-xs">
                          <div className="flex justify-between font-bold text-slate-700">
                            <span>{lang === 'ka' ? 'პროგრესი:' : 'Progress:'}</span>
                            <span className="font-black text-[#32B88A]">
                              {completedCount} / 10
                            </span>
                          </div>

                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                            <div
                              className="h-full bg-[#32B88A] transition-all"
                              style={{
                                width: `${Math.min(
                                  100,
                                  (completedCount / 10) * 100
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 border-t border-slate-100 pt-4">
                      <button
                        type="button"
                        onClick={() => setSelectedPreviewMarathon(marathon)}
                        className="block w-full cursor-pointer rounded-xl bg-[#EAF8F2] py-2.5 text-center text-xs font-black text-[#32B88A] transition-all hover:bg-[#32B88A] hover:text-white"
                      >
                        {isJoined
                          ? lang === 'ka'
                            ? 'გახსნა 🚀'
                            : 'Open 🚀'
                          : lang === 'ka'
                            ? 'გამოწვევები 📋'
                            : 'Challenges 📋'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div
            id="values-section"
            className="space-y-5 rounded-[24px] border border-[#E3DDF4] bg-[#EAF3FF] p-4 text-left sm:space-y-6 sm:rounded-[32px] sm:p-8 lg:p-10"
          >
            <div className="mx-auto max-w-xl space-y-1 text-center">
              <span className="rounded-full bg-[#4C8DFF]/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#4C8DFF]">
                {lang === 'ka' ? 'ფასეულობები' : 'Values'}
              </span>

              <h3 className="text-2xl font-black text-[#27213F]">
                {lang === 'ka' ? 'ფასეულობები & ეთიკა' : 'Values & Ethics'}
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {values.map((value, index) => {
                const Icon = value.icon;

                return (
                  <div
                    key={index}
                    className="space-y-2 rounded-2xl border border-[#E8E2F1] bg-white p-5 text-left transition-all hover:shadow-sm"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EAF3FF] font-bold text-[#4C8DFF]">
                      <Icon className="h-4 w-4" />
                    </div>

                    <h5 className="text-xs font-black uppercase tracking-tight text-[#27213F]">
                      {value.title}
                    </h5>

                    <p className="text-[11px] font-light leading-relaxed text-[#5E5878]">
                      {value.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div
            id="conditions-section"
            className="space-y-5 rounded-[24px] border border-[#E3DDF4] bg-[#FFF0F6] p-4 text-left sm:space-y-6 sm:rounded-[32px] sm:p-8 lg:p-10"
          >
            <div className="mx-auto max-w-xl space-y-1 text-center">
              <span className="rounded-full bg-[#E76FD6]/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#E76FD6]">
                {lang === 'ka' ? 'ინსტრუქცია' : 'Instructions'}
              </span>

              <h3 className="text-2xl font-black text-[#27213F]">
                {lang === 'ka'
                  ? 'თამაშის ოფიციალური წესები'
                  : 'Official Game Rules'}
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {rules.map((rule, index) => {
                const Icon = rule.icon;

                return (
                  <div
                    key={index}
                    className="space-y-2 rounded-2xl border border-[#E8E2F1] bg-white p-5 text-left transition-transform hover:scale-[1.01]"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FFF0F6] text-[#E76FD6]">
                      <Icon className="h-4 w-4" />
                    </div>

                    <h5 className="text-xs font-black leading-snug text-[#27213F]">
                      {rule.title}
                    </h5>

                    <p className="text-[11px] font-light leading-relaxed text-[#5E5878]">
                      {rule.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="w-full shrink-0 lg:sticky lg:top-24 lg:w-72 xl:w-80">
          <LiveLeaderboardSidebar
            currentUser={currentUser}
            lang={lang === 'ka' ? 'ka' : 'en'}
            monthlyPlayerRecords={monthlyPlayerRecords}
          />
        </div>
      </div>

      {activeMediaSub &&
        (() => {
          const liveActiveSub =
            currentFeedSubmissions.find(item => item.id === activeMediaSub.id) ||
            activeMediaSub;

          const guestVoterId =
            typeof window !== 'undefined'
              ? localStorage.getItem(GUEST_VOTER_KEY)
              : null;

          const voterId = currentUser ? currentUser.id : guestVoterId;
          const likedBy = liveActiveSub.likedBy || [];
          const hasLiked = Boolean(voterId && likedBy.includes(voterId));
          const voteCount = likedBy.length || liveActiveSub.votes || 0;

          return (
            <div className="fixed inset-0 z-[55] flex items-start justify-center overflow-y-auto bg-black/80 p-2 pt-3 backdrop-blur-md sm:p-5 sm:pt-8">
              <div className="relative max-h-[calc(100dvh-1rem)] w-full max-w-xl space-y-3 overflow-y-auto rounded-2xl border bg-white p-3 text-left shadow-2xl sm:max-h-[88vh] sm:rounded-3xl sm:p-5">
                <button
                  type="button"
                  onClick={() => setActiveMediaSub(null)}
                  className="absolute right-3 top-3 z-30 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-slate-100 font-bold text-slate-500 shadow-sm hover:text-black"
                >
                  ✕
                </button>

                <div className="flex items-center gap-3 pr-8">
                  <img
                    src={getPlayerAvatar(
                      liveActiveSub.playerNickname,
                      liveActiveSub.playerAvatar
                    )}
                    className="h-10 w-10 rounded-full object-cover"
                    alt="avatar"
                  />

                  <div>
                    <span className="inline-block rounded-full bg-purple-50 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-[#7C4DFF]">
                      {lang === 'ka' ? 'მტკიცებულება' : 'Proof'}
                    </span>

                    <h4 className="mt-1 text-base font-extrabold text-[#27213F]">
                      {liveActiveSub.challengeTitle}
                    </h4>

                    <p className="text-xs font-bold text-slate-500">
                      @{liveActiveSub.playerNickname}
                    </p>
                  </div>
                </div>

                <div className="relative flex min-h-[240px] max-h-[44dvh] items-center justify-center overflow-hidden rounded-2xl bg-black sm:min-h-[280px] sm:max-h-[50vh]">
                  {renderSubmissionMedia(liveActiveSub, 'modal')}
                </div>

                <div className="rounded-xl border bg-slate-50 p-3 text-xs leading-relaxed text-slate-700">
                  <strong className="mb-1 block text-[#27213F]">
                    {lang === 'ka' ? 'მოთამაშის კომენტარი:' : 'Player comment:'}
                  </strong>

                  {getSubmissionText(liveActiveSub) ||
                    (lang === 'ka'
                      ? 'კომენტარი არ არის დამატებული.'
                      : 'No comment added.')}
                </div>

                {voteMessage && (
                  <div className="rounded-xl border border-violet-100 bg-violet-50 p-3 text-xs font-bold text-[#7C4DFF]">
                    {voteMessage}
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2 text-center text-xs font-black">
                  <div className="rounded-xl bg-violet-50 p-3 text-violet-700">
                    👁 {liveActiveSub.viewedBy?.length || liveActiveSub.siteViews || 0}
                  </div>
                  <div className="rounded-xl bg-rose-50 p-3 text-rose-600">
                    ❤️ {liveActiveSub.likedBy?.length || liveActiveSub.likes || 0}
                  </div>
                  <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700">
                    💬 {liveActiveSub.comments?.length || liveActiveSub.siteComments || 0}
                  </div>
                </div>

                <div className="space-y-3 rounded-xl border border-[#E8E2F1] bg-slate-50 p-3">
                  <div className="flex items-center justify-between">
                    <strong className="text-xs font-black text-[#27213F]">
                      {lang === 'ka' ? 'კომენტარები' : 'Comments'}
                    </strong>
                    <span className="text-[10px] font-bold text-slate-400">
                      {liveActiveSub.comments?.length || 0}
                    </span>
                  </div>

                  {liveActiveSub.comments?.length ? (
                    <div className="max-h-32 space-y-2 overflow-y-auto pr-1">
                      {liveActiveSub.comments.slice(-5).reverse().map((comment: any) => (
                        <div key={comment.id} className="rounded-lg bg-white p-2 text-xs text-slate-700">
                          <div className="mb-1 flex items-center justify-between gap-2">
                            <span className="font-black text-[#7C4DFF]">
                              @{comment.authorNickname || comment.authorId || 'guest'}
                            </span>
                            <span className="text-[9px] text-slate-400">
                              {comment.createdAt
                                ? new Date(comment.createdAt).toLocaleDateString()
                                : ''}
                            </span>
                          </div>
                          <p className="leading-5">{comment.text}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs font-medium text-slate-400">
                      {lang === 'ka' ? 'კომენტარები ჯერ არ არის.' : 'No comments yet.'}
                    </p>
                  )}

                  <div className="flex gap-2">
                    <input
                      value={commentDraft}
                      onChange={event => setCommentDraft(event.target.value)}
                      placeholder={lang === 'ka' ? 'დაწერე კომენტარი...' : 'Write a comment...'}
                      className="min-w-0 flex-1 rounded-xl border border-violet-100 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-[#7C4DFF]"
                    />

                    <button
                      type="button"
                      onClick={() => handleCommentAction(liveActiveSub)}
                      disabled={commentLoading || !commentDraft.trim()}
                      className="rounded-xl bg-[#7C4DFF] px-4 py-2 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {commentLoading
                        ? lang === 'ka'
                          ? 'იგზავნება...'
                          : 'Sending...'
                        : lang === 'ka'
                          ? 'დამატება'
                          : 'Add'}
                    </button>
                  </div>
                </div>

                {getSubmissionUrl(liveActiveSub) && isTikTokSubmission(liveActiveSub) && (
                  <a
                    href={getSubmissionUrl(liveActiveSub)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 py-2.5 text-xs font-black text-white transition-all hover:bg-black"
                  >
                    <ExternalLink className="h-4 w-4" />
                    {lang === 'ka' ? 'TikTok-ზე გახსნა' : 'Open on TikTok'}
                  </a>
                )}

                <div className="flex items-center justify-between border-t border-[#E8E2F1] pt-3 text-xs">
                  <button
                    type="button"
                    className={`flex cursor-pointer items-center gap-1.5 font-extrabold transition-colors ${
                      hasLiked
                        ? 'text-rose-600'
                        : 'text-[#5E5878] hover:text-rose-600'
                    }`}
                    onClick={event => {
                      event.preventDefault();
                      event.stopPropagation();
                      handleVoteAction(liveActiveSub);
                    }}
                  >
                    <Heart
                      className={`h-4 w-4 transition-transform hover:scale-110 ${
                        hasLiked
                          ? 'fill-rose-500 text-rose-500'
                          : 'fill-none text-rose-400'
                      }`}
                    />

                    {voteCount} {lang === 'ka' ? 'ხმა' : 'votes'}
                  </button>

                  <button
                    type="button"
                    onClick={event => {
                      event.preventDefault();
                      event.stopPropagation();
                      handleVoteAction(liveActiveSub);
                    }}
                    className="cursor-pointer rounded-lg border border-[#FF9B6A]/20 bg-[#FFF0E8] px-3.5 py-1.5 text-xs font-extrabold text-[#FF9B6A] transition-all hover:bg-[#FF9B6A] hover:text-white"
                  >
                    👍 {lang === 'ka' ? 'მხარდაჭერა' : 'Vote'}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => { setActiveMediaSub(null); setVoteMessage(''); setCommentDraft(''); }}
                  className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-slate-100 py-2.5 text-xs font-black text-slate-700 transition-all hover:bg-slate-200"
                >
                  <X className="h-4 w-4 text-slate-500" />
                  <span>
                    {lang === 'ka'
                      ? 'ჩვეულ ფორმაში დაბრუნება'
                      : 'Return to Site Layout'}
                  </span>
                </button>
              </div>
            </div>
          );
        })()}

      {selectedPreviewMarathon &&
        (() => {
          const marathon = selectedPreviewMarathon;
          const challenges = getPreviewChallenges(marathon);

          return (
            <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 p-2 pt-4 backdrop-blur-md antialiased sm:items-center sm:p-4">
              <div className="relative max-h-[calc(100dvh-1rem)] w-full max-w-4xl space-y-4 overflow-y-auto rounded-2xl border border-violet-100 bg-white p-4 text-left shadow-2xl sm:max-h-[92vh] sm:space-y-6 sm:rounded-3xl sm:p-8">
                <button
                  type="button"
                  onClick={() => setSelectedPreviewMarathon(null)}
                  className="absolute right-4 top-4 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-slate-100 font-bold text-slate-400 transition-colors hover:text-black"
                >
                  ✕
                </button>

                <div className="space-y-1 pr-8">
                  <span className="rounded-full bg-[#7C4DFF]/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[#7C4DFF]">
                    ✨{' '}
                    {lang === 'ka'
                      ? 'ხელოვნური ინტელექტის გამოწვევები'
                      : 'AI Generated Challenges'}
                  </span>

                  <h3 className="text-2xl font-extrabold leading-tight text-[#1E1B35]">
                    {lang === 'ka'
                      ? marathon.title_ka || marathon.title
                      : marathon.title_en || marathon.title}
                  </h3>

                  <p className="text-xs font-medium text-slate-500">
                    {lang === 'ka'
                      ? 'მარტივი, საშუალო და რთული გამოწვევები ბალანსითა და დადგენილი ქულებით.'
                      : '10 balanced challenges categorised by difficulty levels and points rewards.'}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {challenges.map((challenge: any, index: number) => {
                    const difficultyLabel =
                      lang === 'ka'
                        ? challenge.difficulty === 'easy'
                          ? 'ადვილი'
                          : challenge.difficulty === 'medium'
                            ? 'საშუალო'
                            : 'რთული'
                        : challenge.difficulty || 'medium';

                    const difficultyClass =
                      challenge.difficulty === 'easy'
                        ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
                        : challenge.difficulty === 'medium'
                          ? 'border-amber-100 bg-amber-50 text-amber-700'
                          : 'border-purple-100 bg-purple-50 text-purple-700';

                    return (
                      <div
                        key={challenge.id}
                        onClick={() =>
                          setSelectedPreviewChallenge({
                            ...challenge,
                            marathonId: marathon.id,
                          })
                        }
                        className="group relative cursor-pointer space-y-3 rounded-2xl border border-violet-100/50 bg-[#FAF8FF] p-4 transition-all hover:scale-[1.01] hover:border-[#7C4DFF]/40"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-mono text-[10px] font-bold text-slate-400">
                            #{index + 1}
                          </span>

                          <div className="flex items-center gap-1.5">
                            <span
                              className={`rounded-md border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${difficultyClass}`}
                            >
                              {difficultyLabel}
                            </span>

                            <span className="rounded-md border border-amber-100 bg-amber-50 px-2 py-0.5 text-[10px] font-black text-amber-900">
                              🪙{' '}
                              {challenge.completionReward ||
                                challenge.points ||
                                20}
                            </span>
                          </div>
                        </div>

                        <h4 className="line-clamp-2 text-xs font-extrabold leading-snug text-[#27213F] transition-colors group-hover:text-[#7C4DFF]">
                          {lang === 'ka'
                            ? challenge.title_ka || challenge.title
                            : challenge.title_en || challenge.title}
                        </h4>

                        <p className="line-clamp-2 text-[11px] font-medium leading-relaxed text-slate-500">
                          {lang === 'ka'
                            ? challenge.description_ka ||
                              challenge.description
                            : challenge.description_en ||
                              challenge.description}
                        </p>

                        <div className="flex justify-end pt-1">
                          <span className="flex items-center gap-1 text-[9px] font-extrabold text-[#7C4DFF] group-hover:underline">
                            {lang === 'ka'
                              ? 'დეტალების ნახვა ➔'
                              : 'View Details ➔'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-100 pt-4 sm:flex-row">
                  <p className="font-mono text-[11px] text-slate-400">
                    {lang === 'ka'
                      ? '📍 თამაშში ჩასართავად გადადით შესაბამის მარათონზე.'
                      : '📍 To start playing, navigate to this marathon workspace.'}
                  </p>

                  <div className="flex w-full gap-2 sm:w-auto">
                    <button
                      type="button"
                      onClick={() => setSelectedPreviewMarathon(null)}
                      className="flex-1 cursor-pointer whitespace-nowrap rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-black text-slate-700 transition-all hover:bg-slate-200 sm:flex-none"
                    >
                      {lang === 'ka' ? 'დახურვა' : 'Close'}
                    </button>

                    {currentUser ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPreviewMarathon(null);
                          openChallengeWorkspace(marathon.id);
                        }}
                        className="flex-1 cursor-pointer whitespace-nowrap rounded-xl bg-[#7C4DFF] px-5 py-2.5 text-xs font-black text-white shadow-md transition-all hover:bg-[#6c3df0] sm:flex-none"
                      >
                        🚀{' '}
                        {lang === 'ka'
                          ? 'გახსენი ხელსაწყოები'
                          : 'Open Workspace'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPreviewMarathon(null);
                          onStartRegister();
                        }}
                        className="flex-1 cursor-pointer whitespace-nowrap rounded-xl bg-[#7C4DFF] px-5 py-2.5 text-xs font-black text-white shadow-md transition-all hover:bg-[#6c3df0] sm:flex-none"
                      >
                        👑{' '}
                        {lang === 'ka'
                          ? 'რეგისტრაცია და მონაწილეობა'
                          : 'Register to Start'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

      {selectedPreviewChallenge &&
        (() => {
          const challenge = selectedPreviewChallenge;

          const difficultyClass =
            challenge.difficulty === 'easy'
              ? 'border-emerald-200 bg-emerald-100 text-emerald-800'
              : challenge.difficulty === 'medium'
                ? 'border-amber-200 bg-amber-100 text-amber-800'
                : 'border-purple-200 bg-purple-100 text-purple-800';

          const difficultyLabel =
            lang === 'ka'
              ? challenge.difficulty === 'easy'
                ? 'ადვილი'
                : challenge.difficulty === 'medium'
                  ? 'საშუალო'
                  : 'რთული'
              : challenge.difficulty || 'medium';

          return (
            <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/85 p-2 pt-4 backdrop-blur-lg antialiased sm:items-center sm:p-4">
              <div className="relative max-h-[calc(100dvh-1rem)] w-full max-w-xl space-y-4 overflow-y-auto rounded-2xl border border-violet-100 bg-white p-4 text-left shadow-2xl sm:max-h-[90vh] sm:space-y-5 sm:rounded-3xl sm:p-7">
                <button
                  type="button"
                  onClick={() => setSelectedPreviewChallenge(null)}
                  className="absolute right-4 top-4 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-slate-100 font-bold text-slate-400 hover:text-black"
                >
                  ✕
                </button>

                <div className="space-y-1.5 pr-8">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`rounded-md border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${difficultyClass}`}
                    >
                      {difficultyLabel}
                    </span>

                    <span className="rounded-md border border-amber-100 bg-amber-50 px-2 py-0.5 text-[10px] font-black text-amber-900">
                      🪙{' '}
                      {challenge.completionReward || challenge.points || 20}
                    </span>
                  </div>

                  <h3 className="font-extrabold leading-snug text-[#1E1B35]">
                    {lang === 'ka'
                      ? challenge.title_ka || challenge.title
                      : challenge.title_en || challenge.title}
                  </h3>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2 rounded-xl border border-violet-50 bg-slate-50 p-4 text-xs leading-relaxed text-slate-700">
                    <strong className="mb-1 block font-black text-[#7C4DFF]">
                      {lang === 'ka'
                        ? '📋 გამოწვევის შინაარსი'
                        : '📋 Challenge Info'}
                    </strong>

                    <p className="whitespace-pre-wrap font-medium">
                      {lang === 'ka'
                        ? challenge.description_ka ||
                          challenge.description ||
                          ''
                        : challenge.description_en ||
                          challenge.description ||
                          ''}
                    </p>

                    {challenge.fullInstructions && (
                      <p className="mt-2 whitespace-pre-wrap border-l-2 border-violet-200 pl-3 text-slate-500">
                        {lang === 'ka'
                          ? challenge.fullInstructions
                          : challenge.fullInstructions_en ||
                            challenge.fullInstructions}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2 rounded-xl border border-violet-50 bg-slate-50 p-4 text-xs leading-relaxed text-slate-700">
                    <strong className="mb-1 block font-black text-[#FF9B6A]">
                      {lang === 'ka'
                        ? '⚖️ ქულების დარიცხვა'
                        : '⚖️ Scoring Framework'}
                    </strong>

                    <div className="whitespace-pre-wrap font-medium text-slate-600">
                      {lang === 'ka'
                        ? challenge.fullDescription ||
                          challenge.fullDescription_ka ||
                          `სათამაშო ქულების დადგენილი წესები:\n\n1. გამოწვევის საბაზისო ქულა: +${challenge.points || 20} ქულა შესრულებისთვის.\n2. დედლაინამდე შესრულების ბონუსი: +10 ქულა.\n3. სიმამაცის ქულა: +15 ქულა საჯაროობისთვის.`
                        : challenge.fullDescription_en ||
                          challenge.fullDescription ||
                          `Scoring details:\n1. Base reward: +${challenge.points || 20} pts.\n2. Deadline bonus: +10 pts.\n3. Public visibility: +15 pts.`}
                    </div>

                    <div className="mt-2 whitespace-pre-wrap rounded-lg border-l-2 border-amber-300 bg-amber-50/40 p-2.5 text-[11px] italic text-amber-800">
                      <strong>
                        💡 {lang === 'ka' ? 'უსაფრთხოება:' : 'Safety rules:'}{' '}
                      </strong>
                      {lang === 'ka'
                        ? challenge.safetyRules ||
                          challenge.safetyRules_ka ||
                          'გამოწვევა უნდა შესრულდეს სრულიად უსაფრთხო გარემოში.'
                        : challenge.safetyRules_en ||
                          challenge.safetyRules ||
                          'The challenge must be performed in a safe environment.'}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedPreviewChallenge(null)}
                    className="flex-1 cursor-pointer rounded-xl bg-slate-100 py-2.5 text-center text-xs font-black text-slate-700 hover:bg-slate-200"
                  >
                    {lang === 'ka' ? 'უკან დაბრუნება' : 'Go Back'}
                  </button>

                  {currentUser ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPreviewChallenge(null);
                        setSelectedPreviewMarathon(null);
                        openChallengeWorkspace(challenge.marathonId);
                      }}
                      className="flex-1 cursor-pointer rounded-xl bg-[#7C4DFF] py-2.5 text-center text-xs font-black text-white shadow-md shadow-[#7C4DFF]/25 hover:bg-[#6c3df0]"
                    >
                      🚀 {lang === 'ka' ? 'დაიწყე შესრულება' : 'Start Challenge'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPreviewChallenge(null);
                        setSelectedPreviewMarathon(null);
                        onStartRegister();
                      }}
                      className="flex-1 cursor-pointer rounded-xl bg-[#7C4DFF] py-2.5 text-center text-xs font-black text-white shadow-md shadow-[#7C4DFF]/25 hover:bg-[#6c3df0]"
                    >
                      👑 {lang === 'ka' ? 'შესრულება' : 'Participate'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
    </div>
  );
}
