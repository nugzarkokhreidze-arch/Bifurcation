import { useEffect, useState } from 'react';
import { ExternalLink, Eye, Heart, MessageCircle, Music2, X } from 'lucide-react';

import { Submission, User } from '../types';
import { submissionService } from '../services/submissionService';
import { storageKeys, storageService } from '../services/storageService';
import { getPlayerAvatar } from '../utils/avatarUtils';

interface VideoFeedProps {
  currentUser: User | null;
  onStateUpdate: () => void;
  lang?: 'ka' | 'en';
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

function getOrCreateGuestId(key: string, prefix: string) {
  if (typeof window === 'undefined') return '';

  const existing = localStorage.getItem(key);

  if (existing) return existing;

  const created = `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;

  localStorage.setItem(key, created);

  return created;
}

function getOrCreateGuestVoterId() {
  return getOrCreateGuestId(GUEST_VOTER_KEY, 'guest-voter');
}

function getOrCreateGuestViewerId() {
  return getOrCreateGuestId(GUEST_VIEWER_KEY, 'guest-viewer');
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

function safeSaveArray(key: string, value: any[]) {
  try {
    storageService.saveData(key, value);
  } catch {
    // ignore storageService failure
  }

  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore localStorage failure
  }
}

function getSocialUrl(submission: any) {
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

function getSubmissionText(submission: any) {
  return (
    submission.reflectionText ||
    submission.textDescription ||
    submission.comment ||
    submission.description ||
    submission.reflection_text ||
    submission.text_description ||
    ''
  );
}

function getCreatedTime(submission: any) {
  return new Date(
    submission.createdAt ||
      submission.created_at ||
      submission.updatedAt ||
      submission.updated_at ||
      0
  ).getTime();
}

function getSubmissionKey(submission: any) {
  return (
    submission.id ||
    submission.remoteId ||
    submission.remote_id ||
    `${submission.playerId || submission.player_id || 'player'}-${
      submission.challengeId || submission.challenge_id || 'challenge'
    }-${submission.createdAt || submission.created_at || Date.now()}`
  );
}

function isPublicSubmission(submission: any) {
  return (
    submission.visibility === 'public' ||
    submission.publishToWall === true ||
    submission.publish_to_wall === true ||
    submission.isPublic === true ||
    submission.is_public === true ||
    submission.status === 'completed'
  );
}

function mergeSubmissions(...lists: any[][]) {
  const map = new Map<string, any>();

  lists.flat().forEach(item => {
    if (!item) return;

    const key = getSubmissionKey(item);
    const previous = map.get(key) || {};

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

    map.set(key, {
      ...previous,
      ...item,

      id: item.id || previous.id || key,

      playerId: item.playerId || item.player_id || previous.playerId || '',
      challengeId:
        item.challengeId || item.challenge_id || previous.challengeId || '',
      marathonId: item.marathonId || item.marathon_id || previous.marathonId || '',

      submissionType:
        item.submissionType ||
        item.submission_type ||
        previous.submissionType ||
        'tiktok',

      socialPlatform:
        item.socialPlatform ||
        item.social_platform ||
        previous.socialPlatform ||
        'tiktok',

      socialUrl:
        item.socialUrl ||
        item.social_url ||
        item.tiktokUrl ||
        item.tiktok_url ||
        item.externalUrl ||
        item.external_url ||
        previous.socialUrl ||
        '',

      tiktokUrl:
        item.tiktokUrl ||
        item.tiktok_url ||
        item.socialUrl ||
        item.social_url ||
        item.externalUrl ||
        item.external_url ||
        previous.tiktokUrl ||
        '',

      externalUrl:
        item.externalUrl ||
        item.external_url ||
        item.tiktokUrl ||
        item.tiktok_url ||
        item.socialUrl ||
        item.social_url ||
        previous.externalUrl ||
        '',

      visibility: item.visibility || previous.visibility || 'public',
      publishToWall:
        item.publishToWall ??
        item.publish_to_wall ??
        previous.publishToWall ??
        previous.publish_to_wall ??
        true,
      publish_to_wall:
        item.publish_to_wall ??
        item.publishToWall ??
        previous.publish_to_wall ??
        previous.publishToWall ??
        true,
      isPublic:
        item.isPublic ??
        item.is_public ??
        previous.isPublic ??
        previous.is_public ??
        true,

      approved:
        item.approved ??
        item.isApproved ??
        item.is_approved ??
        previous.approved ??
        true,

      status: item.status || previous.status || 'completed',

      likedBy,
      votedUserIds: likedBy,
      viewedBy,
      comments,

      votes: item.votes ?? item.likes ?? likedBy.length ?? previous.votes ?? 0,
      likes: item.likes ?? item.votes ?? likedBy.length ?? previous.likes ?? 0,

      siteViews:
        item.siteViews ??
        item.site_views ??
        viewedBy.length ??
        previous.siteViews ??
        0,
      siteLikes:
        item.siteLikes ??
        item.site_likes ??
        likedBy.length ??
        previous.siteLikes ??
        0,
      siteComments:
        item.siteComments ??
        item.site_comments ??
        comments.length ??
        previous.siteComments ??
        0,

      createdAt:
        item.createdAt ||
        item.created_at ||
        previous.createdAt ||
        previous.created_at ||
        new Date().toISOString(),

      updatedAt:
        item.updatedAt ||
        item.updated_at ||
        previous.updatedAt ||
        previous.updated_at ||
        new Date().toISOString(),
    });
  });

  return Array.from(map.values()).sort(
    (a, b) => getCreatedTime(b) - getCreatedTime(a)
  );
}

function loadLocalSubmissions() {
  const lists = getSubmissionStorageKeys().map(key => safeLoadArray(key));
  return mergeSubmissions(...lists);
}

function saveLocalSubmissions(items: any[]) {
  const merged = mergeSubmissions(items);

  for (const key of getSubmissionStorageKeys()) {
    safeSaveArray(key, merged);
  }
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

function recordViewLocally(submissionId: string, viewerId: string) {
  if (!submissionId || !viewerId) return;

  const submissions = loadLocalSubmissions();

  const updated = submissions.map(submission => {
    if (submission.id !== submissionId) return submission;

    const viewedBy = Array.from(
      new Set([...(submission.viewedBy || []), viewerId])
    );

    return {
      ...submission,
      viewedBy,
      siteViews: viewedBy.length,
      updatedAt: new Date().toISOString(),
    };
  });

  saveLocalSubmissions(updated);
}

export default function VideoFeed({
  currentUser,
  onStateUpdate,
  lang = 'ka',
}: VideoFeedProps) {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [fullscreenSubmission, setFullscreenSubmission] =
    useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [likeLoadingId, setLikeLoadingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  async function loadPublicSubmissions() {
    try {
      setLoading(true);
      setErrorMessage('');

      const localSubmissions = loadLocalSubmissions();

      const localUsers = [
        ...storageService.loadData<User[]>(storageKeys.users, []),
        ...storageService.loadData<User[]>((storageKeys as any).players || '', []),
      ].filter(Boolean);

      const localCurrentUser = storageService.loadData<User | null>(
        storageKeys.currentUser,
        null
      );

      const localMarathons = storageService.loadData<any[]>(
        storageKeys.marathons,
        []
      );

      const challengeLookup = buildChallengeLookup(localMarathons);

      const allUsers = [
        ...localUsers,
        ...(localCurrentUser ? [localCurrentUser] : []),
        ...(currentUser ? [currentUser] : []),
      ];

      const publicSubmissions = localSubmissions
        .filter(submission => isPublicSubmission(submission))
        .map(submission => {
          const playerId = submission.playerId || submission.player_id;
          const challengeId = submission.challengeId || submission.challenge_id;

          const player = allUsers.find(user => user.id === playerId);
          const challenge = challengeLookup.get(challengeId);

          const playerNickname =
            submission.playerNickname ||
            submission.player_nickname ||
            player?.nickname ||
            player?.firstName ||
            'მოთამაშე';

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
            playerId,
            challengeId,
            playerNickname,
            playerAvatar,
            challengeTitle,
          };
        });

      setSubmissions(publicSubmissions);
    } catch (error: any) {
      console.error('VideoFeed load error:', error);
      setErrorMessage(
        lang === 'ka'
          ? 'საჯარო აქტივობების ჩატვირთვა ვერ მოხერხდა.'
          : 'Could not load public submissions.'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPublicSubmissions();

    const onFocus = () => loadPublicSubmissions();
    window.addEventListener('focus', onFocus);

    return () => {
      window.removeEventListener('focus', onFocus);
    };
  }, [currentUser?.id]);

  function openSubmission(submission: any) {
    const viewerId = currentUser?.id || getOrCreateGuestViewerId();

    recordViewLocally(submission.id, viewerId);

    const updatedSubmissions = loadLocalSubmissions();
    const freshSubmission =
      updatedSubmissions.find(item => item.id === submission.id) || submission;

    setSubmissions(prev =>
      prev.map(item => (item.id === freshSubmission.id ? freshSubmission : item))
    );

    setFullscreenSubmission({
      ...submission,
      ...freshSubmission,
    });
  }

  async function handleLike(submission: any) {
    try {
      setLikeLoadingId(submission.id);
      setErrorMessage('');
      setInfoMessage('');

      const voterId = currentUser?.id || getOrCreateGuestVoterId();

      if (!voterId) {
        throw new Error(
          lang === 'ka'
            ? 'მხარდაჭერისთვის ვერ შეიქმნა სტუმრის იდენტიფიკატორი.'
            : 'Could not create guest voter id.'
        );
      }

      if (submission.playerId === voterId) {
        throw new Error(
          lang === 'ka'
            ? 'საკუთარ აქტივობაზე ხმის მიცემა არ შეიძლება.'
            : 'You cannot like your own submission.'
        );
      }

      const likedBy = submission.likedBy || submission.votedUserIds || [];

      if (likedBy.includes(voterId)) {
        throw new Error(
          lang === 'ka'
            ? 'ამ აქტივობაზე მხარდაჭერა უკვე დაფიქსირებულია.'
            : 'You have already liked this submission.'
        );
      }

      await submissionService.voteSubmission(submission.id, voterId);

      await loadPublicSubmissions();
      await onStateUpdate();

      setInfoMessage(lang === 'ka' ? 'მხარდაჭერა დაფიქსირდა.' : 'Support recorded.');
    } catch (error: any) {
      console.error('Like error:', error);
      setErrorMessage(
        error?.message ||
          (lang === 'ka'
            ? 'მოწონების დამატება ვერ მოხერხდა.'
            : 'Could not add like.')
      );
    } finally {
      setLikeLoadingId(null);
    }
  }

  function renderTikTokCard(submission: any) {
    return (
      <div className="flex h-44 w-full flex-col items-center justify-center rounded-xl bg-gradient-to-br from-slate-950 via-slate-900 to-violet-950 p-5 text-center text-white">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
          <Music2 className="h-6 w-6 text-violet-200" />
        </div>

        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-violet-200">
          TikTok Proof
        </p>

        <p className="mt-2 max-w-[220px] text-xs font-bold leading-5 text-white">
          {lang === 'ka'
            ? 'ვიდეო ატვირთულია TikTok-ზე. გასახსნელად დააჭირეთ.'
            : 'The video is hosted on TikTok. Tap to open.'}
        </p>
      </div>
    );
  }

  function renderFullscreenTikTok(submission: any) {
    const url = getSocialUrl(submission);
    const cleanUrl = normalizeTikTokUrl(url);
    const videoId = extractTikTokVideoId(cleanUrl);

    if (videoId) {
      return (
        <div className="mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-black">
          <iframe
            src={`https://www.tiktok.com/embed/v2/${videoId}`}
            title="TikTok video"
            allow="fullscreen"
            className="h-[620px] w-full border-0 bg-black"
          />
        </div>
      );
    }

    return (
      <div className="rounded-2xl border border-white/10 bg-zinc-900 p-8 text-center">
        <Music2 className="mx-auto mb-3 h-10 w-10 text-violet-300" />
        <p className="text-sm font-bold text-white">
          {lang === 'ka'
            ? 'ამ TikTok ბმულის საიტში ჩასმა ვერ მოხერხდა.'
            : 'Could not embed this TikTok link.'}
        </p>

        {url && (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-xs font-black text-slate-950"
          >
            <ExternalLink className="h-4 w-4" />
            {lang === 'ka' ? 'TikTok-ზე ნახვა' : 'Open on TikTok'}
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 text-left font-sans">
      <div className="rounded-2xl border bg-white p-4 text-left">
        <h3 className="text-sm font-extrabold uppercase text-[#27213F]">
          {lang === 'ka'
            ? '🌐 სიმამაცის საჯარო კედელი'
            : '🌐 Public Courage Wall'}
        </h3>

        <p className="mt-0.5 text-xs text-slate-500">
          {lang === 'ka'
            ? 'აქ გამოჩნდება TikTok-ზე შესრულებული და საიტზე დადასტურებული გამოწვევები.'
            : 'TikTok proofs submitted and confirmed on the website appear here.'}
        </p>
      </div>

      {infoMessage && (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-xs font-bold text-emerald-700">
          {infoMessage}
        </div>
      )}

      {errorMessage && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-xs font-bold text-rose-700">
          {errorMessage}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border bg-white p-12 text-center text-xs font-bold text-slate-400">
          {lang === 'ka' ? 'იტვირთება...' : 'Loading...'}
        </div>
      ) : submissions.length === 0 ? (
        <div className="rounded-2xl border bg-white p-12 text-center text-xs font-bold text-slate-400">
          {lang === 'ka'
            ? 'საჯარო აქტივობები ამ დროისთვის ცარიელია.'
            : 'No public submissions loaded yet.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {submissions.map(submission => {
            const voterId =
              currentUser?.id ||
              (typeof window !== 'undefined'
                ? localStorage.getItem(GUEST_VOTER_KEY)
                : '');

            const likedBy = submission.likedBy || submission.votedUserIds || [];
            const viewedBy = submission.viewedBy || [];
            const comments = submission.comments || [];

            const alreadyLiked = Boolean(voterId && likedBy.includes(voterId));
            const isOwnSubmission =
              Boolean(currentUser?.id) && submission.playerId === currentUser?.id;

            const likeCount = likedBy.length || submission.likes || submission.votes || 0;
            const viewCount = viewedBy.length || submission.siteViews || 0;
            const commentCount = comments.length || submission.siteComments || 0;

            return (
              <div
                key={submission.id}
                className="space-y-3 rounded-2xl border bg-white p-4 shadow-sm"
              >
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                  <img
                    src={getPlayerAvatar(
                      submission.playerNickname,
                      submission.playerAvatar
                    )}
                    className="h-6 w-6 rounded-full object-cover"
                    alt="avatar"
                  />

                  <span>@{submission.playerNickname || 'მოთამაშე'}</span>
                </div>

                <button
                  type="button"
                  onClick={() => openSubmission(submission)}
                  className="relative block w-full cursor-pointer overflow-hidden rounded-xl bg-black text-left"
                >
                  {renderTikTokCard(submission)}

                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/20 text-xs font-black text-white opacity-0 transition-opacity hover:opacity-100">
                    ▶ {lang === 'ka' ? 'ნახვა' : 'Open'}
                  </div>
                </button>

                <h4 className="line-clamp-2 text-xs font-black text-[#27213F]">
                  {submission.challengeTitle ||
                    (lang === 'ka' ? 'გამოწვევა' : 'Challenge')}
                </h4>

                {getSubmissionText(submission) && (
                  <p className="line-clamp-2 text-[11px] text-slate-500">
                    “{getSubmissionText(submission)}”
                  </p>
                )}

                <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-black">
                  <div className="rounded-xl bg-violet-50 px-2 py-2 text-violet-700">
                    <Eye className="mx-auto mb-1 h-3.5 w-3.5" />
                    {viewCount}
                  </div>

                  <div className="rounded-xl bg-rose-50 px-2 py-2 text-rose-600">
                    <Heart className="mx-auto mb-1 h-3.5 w-3.5" />
                    {likeCount}
                  </div>

                  <div className="rounded-xl bg-emerald-50 px-2 py-2 text-emerald-700">
                    <MessageCircle className="mx-auto mb-1 h-3.5 w-3.5" />
                    {commentCount}
                  </div>
                </div>

                <div className="flex items-center justify-between border-t pt-2">
                  <button
                    type="button"
                    onClick={() => handleLike(submission)}
                    disabled={
                      likeLoadingId === submission.id ||
                      alreadyLiked ||
                      isOwnSubmission
                    }
                    className={`flex cursor-pointer items-center gap-1 rounded-lg px-3 py-1 text-[10px] font-bold transition-all ${
                      alreadyLiked || isOwnSubmission
                        ? 'bg-slate-100 text-slate-400'
                        : 'bg-purple-50 text-[#7C4DFF] hover:bg-purple-100'
                    }`}
                  >
                    <Heart
                      className={`h-3 w-3 ${
                        alreadyLiked ? 'fill-rose-500 text-rose-500' : ''
                      }`}
                    />
                    {likeCount} {lang === 'ka' ? 'გული' : 'Likes'}
                  </button>

                  <a
                    href={getSocialUrl(submission)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 rounded-lg bg-slate-950 px-3 py-1 text-[10px] font-black text-white"
                  >
                    <ExternalLink className="h-3 w-3" />
                    TikTok
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {fullscreenSubmission && (
        <div className="fixed inset-0 z-[55] flex flex-col items-center justify-center overflow-y-auto bg-black/90 p-4 text-white backdrop-blur-sm">
          <div className="w-full max-w-2xl space-y-4 text-center">
            <div className="rounded-2xl border border-white/10 bg-zinc-950 p-4 text-left">
              <p className="text-xs font-bold text-violet-300">
                @{fullscreenSubmission.playerNickname || 'მოთამაშე'}
              </p>

              <h4 className="mt-1 text-sm font-black text-white">
                {fullscreenSubmission.challengeTitle ||
                  (lang === 'ka' ? 'გამოწვევა' : 'Challenge')}
              </h4>
            </div>

            {renderFullscreenTikTok(fullscreenSubmission)}

            {getSubmissionText(fullscreenSubmission) && (
              <div className="rounded-2xl border border-white/10 bg-zinc-900 p-4 text-left text-xs leading-6 text-slate-200">
                {getSubmissionText(fullscreenSubmission)}
              </div>
            )}

            <div className="grid grid-cols-3 gap-2 text-center text-xs font-black">
              <div className="rounded-xl bg-white/10 p-3">
                👁 {fullscreenSubmission.viewedBy?.length || fullscreenSubmission.siteViews || 0}
              </div>

              <div className="rounded-xl bg-white/10 p-3">
                ❤️ {fullscreenSubmission.likedBy?.length || fullscreenSubmission.likes || 0}
              </div>

              <div className="rounded-xl bg-white/10 p-3">
                💬 {fullscreenSubmission.comments?.length || fullscreenSubmission.siteComments || 0}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setFullscreenSubmission(null)}
              className="mx-auto flex items-center gap-2 rounded-xl bg-[#7C4DFF] px-8 py-3 text-xs font-black uppercase tracking-widest text-white shadow-md"
            >
              <X className="h-4 w-4" />
              {lang === 'ka' ? 'დახურვა' : 'Close Player'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
