import { useEffect, useState } from 'react';
import { Heart, Lock, Volume2, X } from 'lucide-react';

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

function getSubmissionStorageKeys() {
  return Array.from(
    new Set(
      [storageKeys.submissions, EXTRA_SUBMISSIONS_KEY].filter(
        (key): key is string => Boolean(key)
      )
    )
  );
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

function getMediaUrl(submission: any) {
  return (
    submission.fileUrl ||
    submission.videoUrl ||
    submission.localPreviewUrl ||
    submission.file_url ||
    submission.video_url ||
    submission.local_preview_url ||
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

function getSubmissionUniqueKey(submission: any) {
  return (
    submission.id ||
    submission.remoteId ||
    submission.remote_id ||
    `${submission.playerId || submission.player_id || 'player'}-${
      submission.challengeId || submission.challenge_id || 'challenge'
    }-${submission.createdAt || submission.created_at || Date.now()}`
  );
}

function detectMediaType(submission: any) {
  const type = submission.submissionType || submission.submission_type || '';
  const url = getMediaUrl(submission);

  if (
    type === 'photo' ||
    url.startsWith('data:image/') ||
    url.match(/\.(jpeg|jpg|gif|png|webp|svg|heic|heif)($|\?)/i)
  ) {
    return 'photo';
  }

  if (
    type === 'audio' ||
    url.startsWith('data:audio/') ||
    url.match(/\.(mp3|wav|ogg|aac|m4a|mpeg)($|\?)/i)
  ) {
    return 'audio';
  }

  if (
    type === 'video' ||
    url.startsWith('data:video/') ||
    url.match(/\.(mp4|webm|mov|m4v|quicktime)($|\?)/i)
  ) {
    return 'video';
  }

  if (!url) return 'text';

  return 'video';
}

function mergeSubmissions(...lists: any[][]) {
  const map = new Map<string, any>();

  lists.flat().forEach(item => {
    if (!item) return;

    const key = getSubmissionUniqueKey(item);
    const previous = map.get(key) || {};

    const likedBy =
      item.likedBy ||
      item.liked_by ||
      item.votedUserIds ||
      item.voted_user_ids ||
      previous.likedBy ||
      previous.liked_by ||
      previous.votedUserIds ||
      previous.voted_user_ids ||
      [];

    const votedUserIds =
      item.votedUserIds ||
      item.voted_user_ids ||
      item.likedBy ||
      item.liked_by ||
      previous.votedUserIds ||
      previous.voted_user_ids ||
      previous.likedBy ||
      previous.liked_by ||
      [];

    map.set(key, {
      ...previous,
      ...item,

      id: item.id || previous.id || key,
      remoteId: item.remoteId || item.remote_id || previous.remoteId || '',

      playerId: item.playerId || item.player_id || previous.playerId || '',
      challengeId:
        item.challengeId || item.challenge_id || previous.challengeId || '',
      marathonId: item.marathonId || item.marathon_id || previous.marathonId || '',

      submissionType:
        item.submissionType ||
        item.submission_type ||
        previous.submissionType ||
        'text',

      visibility: item.visibility || previous.visibility || 'public',
      publishToWall:
        item.publishToWall ??
        item.publish_to_wall ??
        previous.publishToWall ??
        previous.publish_to_wall ??
        false,
      publish_to_wall:
        item.publish_to_wall ??
        item.publishToWall ??
        previous.publish_to_wall ??
        previous.publishToWall ??
        false,
      isPublic:
        item.isPublic ??
        item.is_public ??
        previous.isPublic ??
        previous.is_public ??
        false,

      approved:
        item.approved ??
        item.isApproved ??
        item.is_approved ??
        previous.approved ??
        true,

      status: item.status || previous.status || 'completed',

      likedBy,
      votedUserIds,

      votes: item.votes ?? item.likes ?? likedBy.length ?? previous.votes ?? 0,
      likes: item.likes ?? item.votes ?? likedBy.length ?? previous.likes ?? 0,

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
  const lists = getSubmissionStorageKeys().map(key =>
    storageService.loadData<any[]>(key, [])
  );

  return mergeSubmissions(...lists);
}

function saveLocalSubmissions(submissions: any[]) {
  for (const key of getSubmissionStorageKeys()) {
    try {
      storageService.saveData(key, submissions);
    } catch (error) {
      console.warn(`Could not save submissions to ${key}:`, error);
    }
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

function isPublicSubmission(submission: any) {
  return (
    submission.visibility === 'public' ||
    submission.publishToWall === true ||
    submission.publish_to_wall === true ||
    submission.isPublic === true ||
    submission.is_public === true
  );
}

function updateLocalLike(submissionId: string, voterId: string) {
  const localSubmissions = loadLocalSubmissions();

  const updated = localSubmissions.map(submission => {
    if (submission.id !== submissionId && submission.remoteId !== submissionId) {
      return submission;
    }

    const likedBy = Array.from(
      new Set([
        ...(submission.likedBy || []),
        ...(submission.votedUserIds || []),
        voterId,
      ])
    );

    return {
      ...submission,
      likedBy,
      votedUserIds: likedBy,
      votes: likedBy.length,
      likes: likedBy.length,
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
        ...storageService.loadData<User[]>((storageKeys as any).players, []),
      ];

      const localCurrentUser = storageService.loadData<User | null>(
        storageKeys.currentUser,
        null
      );

      const localMarathons = storageService.loadData<any[]>(
        storageKeys.marathons,
        []
      );

      let onlineSubmissions: Submission[] = [];

      try {
        onlineSubmissions = await submissionService.getSubmissions();
      } catch (error) {
        console.warn('Online submissions failed, using local only:', error);
      }

      const merged = mergeSubmissions(localSubmissions, onlineSubmissions);
      saveLocalSubmissions(merged);

      const challengeLookup = buildChallengeLookup(localMarathons);

      const allUsers = [
        ...localUsers,
        ...(localCurrentUser ? [localCurrentUser] : []),
        ...(currentUser ? [currentUser] : []),
      ];

      const publicSubmissions = merged
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

          const likedBy =
            submission.likedBy ||
            submission.liked_by ||
            submission.votedUserIds ||
            submission.voted_user_ids ||
            [];

          return {
            ...submission,
            playerId,
            challengeId,
            playerNickname,
            playerAvatar,
            challengeTitle,
            likedBy,
            votedUserIds:
              submission.votedUserIds ||
              submission.voted_user_ids ||
              likedBy ||
              [],
            votes:
              submission.votes ||
              submission.likes ||
              likedBy.length ||
              0,
            likes:
              submission.likes ||
              submission.votes ||
              likedBy.length ||
              0,
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

    const unsubscribe = storageService.subscribe(() => {
      loadPublicSubmissions();
    });

    return unsubscribe;
  }, [currentUser?.id]);

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

      updateLocalLike(submission.id, voterId);

      try {
        await submissionService.voteSubmission(
          submission.remoteId || submission.id,
          voterId
        );
      } catch (error) {
        console.warn('Online vote failed, local vote kept:', error);
      }

      await loadPublicSubmissions();
      await onStateUpdate();

      setInfoMessage(
        lang === 'ka'
          ? 'მხარდაჭერა დაფიქსირდა.'
          : 'Support recorded.'
      );
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

  function renderMediaPreview(submission: any) {
    const url = getMediaUrl(submission);
    const type = detectMediaType(submission);

    if (!url && !getSubmissionText(submission)) {
      return (
        <div className="flex h-40 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
          <Lock className="mr-2 h-5 w-5" />
          <span className="text-xs font-bold">
            {lang === 'ka' ? 'მედია არ არის' : 'No media'}
          </span>
        </div>
      );
    }

    if (type === 'photo' && url) {
      return (
        <img
          src={url}
          className="h-40 w-full rounded-xl object-cover"
          alt={lang === 'ka' ? 'აქტივობის ფოტო' : 'Submission photo'}
          referrerPolicy="no-referrer"
        />
      );
    }

    if (type === 'video' && url) {
      return (
        <video
          src={url}
          className="h-40 w-full rounded-xl bg-black object-cover"
          muted
          playsInline
          loop
        />
      );
    }

    if (type === 'audio' && url) {
      return (
        <div className="flex h-40 flex-col items-center justify-center rounded-xl bg-slate-950 text-white">
          <Volume2 className="mb-2 h-8 w-8 animate-pulse text-violet-300" />
          <span className="text-xs font-bold">
            {lang === 'ka' ? 'აუდიო აქტივობა' : 'Audio submission'}
          </span>
        </div>
      );
    }

    return (
      <div className="flex h-40 items-center justify-center rounded-xl bg-violet-50 p-4 text-center text-xs font-bold leading-6 text-violet-700">
        {getSubmissionText(submission) ||
          (lang === 'ka' ? 'ტექსტური აქტივობა' : 'Text submission')}
      </div>
    );
  }

  function renderFullscreenMedia(submission: any) {
    const url = getMediaUrl(submission);
    const type = detectMediaType(submission);

    if (type === 'photo' && url) {
      return (
        <img
          src={url}
          className="mx-auto max-h-[70vh] w-full rounded-2xl border border-white/10 bg-black object-contain"
          alt={lang === 'ka' ? 'აქტივობის ფოტო' : 'Submission photo'}
          referrerPolicy="no-referrer"
        />
      );
    }

    if (type === 'audio' && url) {
      return (
        <div className="w-full rounded-2xl border border-white/10 bg-zinc-900 p-8 text-center">
          <Volume2 className="mx-auto mb-4 h-12 w-12 animate-pulse text-violet-300" />
          <audio src={url} controls autoPlay className="mt-4 w-full" />
        </div>
      );
    }

    if (type === 'video' && url) {
      return (
        <video
          src={url}
          controls
          autoPlay
          playsInline
          className="max-h-[70vh] w-full rounded-2xl border border-white/10 bg-black"
        />
      );
    }

    return (
      <div className="rounded-2xl border border-white/10 bg-zinc-900 p-8 text-left text-sm leading-7 text-white">
        {getSubmissionText(submission) ||
          (lang === 'ka' ? 'ტექსტი არ არის დამატებული.' : 'No text added.')}
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
            ? 'აქ გამოჩნდება მონაწილეების მიერ მთავარ გვერდზე გამოსაქვეყნებლად დადასტურებული ფოტო, ვიდეო, აუდიო და ტექსტური აქტივობები.'
            : 'Public photos, videos, audio and text proofs approved for the wall appear here.'}
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
                ? localStorage.getItem('bifurcation_guest_voter_id')
                : '');

            const likedBy = submission.likedBy || submission.votedUserIds || [];
            const alreadyLiked = Boolean(voterId && likedBy.includes(voterId));
            const isOwnSubmission =
              Boolean(currentUser?.id) && submission.playerId === currentUser?.id;
            const likeCount =
              likedBy.length || submission.likes || submission.votes || 0;

            return (
              <div
                key={submission.id}
                className="space-y-3 rounded-2xl border bg-white p-4 shadow-xs"
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
                  onClick={() => setFullscreenSubmission(submission)}
                  className="relative block w-full cursor-pointer overflow-hidden rounded-xl bg-black text-left"
                >
                  {renderMediaPreview(submission)}

                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/20 text-xs font-black text-white opacity-0 transition-opacity hover:opacity-100">
                    ▶ {lang === 'ka' ? 'ნახვა' : 'Open'}
                  </div>
                </button>

                <h4 className="truncate text-xs font-black text-[#27213F]">
                  {submission.challengeTitle ||
                    (lang === 'ka' ? 'გამოწვევა' : 'Challenge')}
                </h4>

                {getSubmissionText(submission) && (
                  <p className="line-clamp-2 text-[11px] text-slate-500">
                    “{getSubmissionText(submission)}”
                  </p>
                )}

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

                  <span className="font-mono text-[9px] text-slate-400">
                    {isOwnSubmission
                      ? lang === 'ka'
                        ? 'საკუთარზე არა'
                        : 'Own post'
                      : alreadyLiked
                        ? lang === 'ka'
                          ? 'უკვე დაგულებულია'
                          : 'Liked'
                        : currentUser
                          ? '+2 / ავტორს +5'
                          : 'ავტორს +5'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {fullscreenSubmission && (
        <div className="fixed inset-0 z-[55] flex flex-col items-center justify-center bg-black/90 p-4 text-white backdrop-blur-sm">
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

            {renderFullscreenMedia(fullscreenSubmission)}

            {getSubmissionText(fullscreenSubmission) && (
              <div className="rounded-2xl border border-white/10 bg-zinc-900 p-4 text-left text-xs leading-6 text-slate-200">
                {getSubmissionText(fullscreenSubmission)}
              </div>
            )}

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
