import type { Submission, User } from '../types';
import { POINTS_CONFIG } from './pointsService';
import { storageKeys, storageService } from './storageService';

const EXTRA_SUBMISSIONS_KEY = 'bifurcation_submissions';
const LEGACY_SUBMISSIONS_KEY = 'submissions';

function getSubmissionStorageKeys() {
  return Array.from(
    new Set(
      [
        storageKeys.submissions,
        EXTRA_SUBMISSIONS_KEY,
        LEGACY_SUBMISSIONS_KEY,
      ].filter((key): key is string => Boolean(key))
    )
  );
}

function makeLocalSubmissionId() {
  return `sub-local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function getCreatedTime(item: any) {
  return new Date(
    item.createdAt ||
      item.created_at ||
      item.updatedAt ||
      item.updated_at ||
      0
  ).getTime();
}

function getSubmissionKey(item: any) {
  return (
    item.id ||
    item.remoteId ||
    item.remote_id ||
    `${item.playerId || item.player_id || 'player'}-${
      item.challengeId || item.challenge_id || 'challenge'
    }-${item.createdAt || item.created_at || Date.now()}`
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

    map.set(key, {
      ...previous,
      ...item,

      id: item.id || previous.id || key,
      remoteId: item.remoteId || item.remote_id || previous.remoteId || '',

      playerId: item.playerId || item.player_id || previous.playerId || '',
      userId:
        item.userId ||
        item.user_id ||
        item.playerId ||
        item.player_id ||
        previous.userId ||
        previous.user_id ||
        '',

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
      votes: item.votes ?? item.likes ?? likedBy.length ?? previous.votes ?? 0,
      likes: item.likes ?? item.votes ?? likedBy.length ?? previous.likes ?? 0,

      comments: item.comments || previous.comments || [],

      siteViews:
        item.siteViews ??
        item.site_views ??
        previous.siteViews ??
        previous.site_views ??
        0,
      siteLikes:
        item.siteLikes ??
        item.site_likes ??
        item.likes ??
        previous.siteLikes ??
        previous.site_likes ??
        0,
      siteComments:
        item.siteComments ??
        item.site_comments ??
        (item.comments || previous.comments || []).length ??
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

function loadSubmissionsFromKey(key: string) {
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

function loadAllLocalSubmissions() {
  const lists = getSubmissionStorageKeys().map(key => loadSubmissionsFromKey(key));
  return mergeSubmissions(...lists);
}

function saveAllLocalSubmissions(items: any[]) {
  const merged = mergeSubmissions(items);

  for (const key of getSubmissionStorageKeys()) {
    try {
      storageService.saveData(key, merged);
    } catch (error) {
      console.warn(`storageService save failed for ${key}:`, error);
    }

    try {
      localStorage.setItem(key, JSON.stringify(merged));
    } catch (error) {
      console.warn(`localStorage save failed for ${key}:`, error);
    }
  }

  try {
    window.dispatchEvent(new Event('storage'));
  } catch {
    // ignore
  }
}

function updateUserPoints(playerId: string, amount: number) {
  if (!playerId || !amount) return;

  const currentUser = storageService.loadData<User | null>(
    storageKeys.currentUser,
    null
  );

  if (currentUser?.id === playerId) {
    storageService.saveData(storageKeys.currentUser, {
      ...currentUser,
      points: Math.max(0, (currentUser.points || 0) + amount),
    });
  }

  const userKeys = Array.from(
    new Set(
      [storageKeys.users, (storageKeys as any).players].filter(
        (key): key is string => Boolean(key)
      )
    )
  );

  for (const key of userKeys) {
    const users = storageService.loadData<User[]>(key, []);

    if (!users.length) continue;

    storageService.saveData(
      key,
      users.map(user =>
        user.id === playerId
          ? {
              ...user,
              points: Math.max(0, (user.points || 0) + amount),
            }
          : user
      )
    );
  }
}

async function fileToDataUrl(file?: File | null) {
  if (!file) return '';

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error);

    reader.readAsDataURL(file);
  });
}

export const submissionService = {
  async getSubmissions(): Promise<Submission[]> {
    return loadAllLocalSubmissions() as Submission[];
  },

  async createSubmission(params: {
    playerId: string;
    challengeId: string;
    marathonId: string;
    submissionType?: string;
    visibility?: 'public' | 'hidden';
    comment?: string;
    reflectionText?: string;
    file?: File | null;
    socialUrl?: string;
    tiktokUrl?: string;
    externalUrl?: string;
    challengeTitle?: string;
    playerNickname?: string;
    playerAvatar?: string;
  }): Promise<Submission> {
    const now = new Date().toISOString();
    const fileUrl = await fileToDataUrl(params.file || null);

    const url =
      params.tiktokUrl ||
      params.socialUrl ||
      params.externalUrl ||
      fileUrl ||
      '';

    const submission: any = {
      id: makeLocalSubmissionId(),

      playerId: params.playerId,
      userId: params.playerId,
      challengeId: params.challengeId,
      marathonId: params.marathonId,

      submissionType: params.submissionType || (url.includes('tiktok') ? 'tiktok' : 'text'),

      socialPlatform: url.includes('tiktok') ? 'tiktok' : '',
      socialUrl: url,
      tiktokUrl: url.includes('tiktok') ? url : '',
      externalUrl: url,

      visibility: params.visibility || 'public',
      publishToWall: (params.visibility || 'public') === 'public',
      publish_to_wall: (params.visibility || 'public') === 'public',
      isPublic: (params.visibility || 'public') === 'public',
      approved: true,
      status: 'completed',

      playerNickname: params.playerNickname || 'მოთამაშე',
      playerAvatar: params.playerAvatar || '',
      challengeTitle: params.challengeTitle || 'გამოწვევა',

      comment: params.comment || '',
      reflectionText: params.reflectionText || params.comment || '',
      textDescription: params.reflectionText || params.comment || '',

      fileUrl: fileUrl && !url.includes('tiktok') ? fileUrl : '',
      videoUrl: fileUrl && !url.includes('tiktok') ? fileUrl : '',
      localPreviewUrl: fileUrl && !url.includes('tiktok') ? fileUrl : '',

      viewedBy: [],
      likedBy: [],
      votedUserIds: [],
      comments: [],

      votes: 0,
      likes: 0,
      siteViews: 0,
      siteLikes: 0,
      siteComments: 0,

      createdAt: now,
      updatedAt: now,
    };

    const existing = loadAllLocalSubmissions();
    const next = mergeSubmissions([submission], existing);

    saveAllLocalSubmissions(next);

    return submission as Submission;
  },

  async voteSubmission(submissionId: string, voterId: string): Promise<Submission | null> {
    if (!submissionId || !voterId) {
      throw new Error('Missing submission or voter id.');
    }

    const submissions = loadAllLocalSubmissions();

    let updatedSubmission: any = null;

    const updated = submissions.map(submission => {
      const matches =
        submission.id === submissionId ||
        submission.remoteId === submissionId ||
        submission.remote_id === submissionId;

      if (!matches) return submission;

      if (submission.playerId === voterId || submission.userId === voterId) {
        throw new Error('საკუთარ აქტივობაზე მხარდაჭერა არ შეიძლება.');
      }

      const likedBy = Array.from(
        new Set([
          ...(submission.likedBy || []),
          ...(submission.votedUserIds || []),
        ])
      );

      if (likedBy.includes(voterId)) {
        throw new Error('ამ აქტივობაზე მხარდაჭერა უკვე დაფიქსირებულია.');
      }

      const nextLikedBy = [...likedBy, voterId];

      updatedSubmission = {
        ...submission,
        likedBy: nextLikedBy,
        votedUserIds: nextLikedBy,
        votes: nextLikedBy.length,
        likes: nextLikedBy.length,
        siteLikes: nextLikedBy.length,
        updatedAt: new Date().toISOString(),
      };

      return updatedSubmission;
    });

    if (!updatedSubmission) {
      throw new Error('Submission not found.');
    }

    saveAllLocalSubmissions(updated);

    updateUserPoints(
      updatedSubmission.playerId || updatedSubmission.userId,
      POINTS_CONFIG.voteReceivedBonus
    );

    updateUserPoints(voterId, POINTS_CONFIG.voterSupportBonus);

    return updatedSubmission as Submission;
  },
};
