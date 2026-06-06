import type { Submission, User } from '../types';
import { POINTS_CONFIG } from './pointsService';
import { storageKeys, storageService } from './storageService';

const EXTRA_SUBMISSIONS_KEY = 'bifurcation_submissions';
const LEGACY_SUBMISSIONS_KEY = 'submissions';

const SITE_VIEW_BONUS = (POINTS_CONFIG as any).siteViewBonus ?? 1;
const SITE_COMMENT_BONUS = (POINTS_CONFIG as any).siteCommentBonus ?? 3;
const MAX_VIEW_BONUS_PER_SUBMISSION =
  (POINTS_CONFIG as any).maxViewBonusPerSubmission ?? 30;
const MAX_VOTE_BONUS_PER_SUBMISSION =
  (POINTS_CONFIG as any).maxVoteBonusPerSubmission ?? 50;
const MAX_COMMENT_BONUS_PER_SUBMISSION =
  (POINTS_CONFIG as any).maxCommentBonusPerSubmission ?? 45;

type StoredComment = {
  id: string;
  submissionId: string;
  authorId: string;
  authorNickname: string;
  authorAvatar?: string;
  text: string;
  createdAt: string;
};

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

function makeLocalCommentId() {
  return `comment-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
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

function normalizeArray(value: any) {
  return Array.isArray(value) ? value : [];
}

function mergeSubmissions(...lists: any[][]) {
  const map = new Map<string, any>();

  lists.flat().forEach(item => {
    if (!item) return;

    const key = getSubmissionKey(item);
    const previous = map.get(key) || {};

    const likedBy = Array.from(
      new Set([
        ...normalizeArray(previous.likedBy),
        ...normalizeArray(previous.votedUserIds),
        ...normalizeArray(item.likedBy),
        ...normalizeArray(item.liked_by),
        ...normalizeArray(item.votedUserIds),
        ...normalizeArray(item.voted_user_ids),
      ])
    );

    const viewedBy = Array.from(
      new Set([
        ...normalizeArray(previous.viewedBy),
        ...normalizeArray(previous.viewed_by),
        ...normalizeArray(item.viewedBy),
        ...normalizeArray(item.viewed_by),
      ])
    );

    const votePointsGivenBy = Array.from(
      new Set([
        ...normalizeArray(previous.votePointsGivenBy),
        ...normalizeArray(previous.vote_points_given_by),
        ...normalizeArray(item.votePointsGivenBy),
        ...normalizeArray(item.vote_points_given_by),
      ])
    );

    const viewPointsGivenBy = Array.from(
      new Set([
        ...normalizeArray(previous.viewPointsGivenBy),
        ...normalizeArray(previous.view_points_given_by),
        ...normalizeArray(item.viewPointsGivenBy),
        ...normalizeArray(item.view_points_given_by),
      ])
    );

    const commentPointsGivenBy = Array.from(
      new Set([
        ...normalizeArray(previous.commentPointsGivenBy),
        ...normalizeArray(previous.comment_points_given_by),
        ...normalizeArray(item.commentPointsGivenBy),
        ...normalizeArray(item.comment_points_given_by),
      ])
    );

    const comments = [
      ...normalizeArray(previous.comments),
      ...normalizeArray(item.comments),
    ];

    const uniqueComments = Array.from(
      new Map(comments.map((comment: any) => [comment.id || comment.createdAt, comment])).values()
    );

    const siteViews =
      item.siteViews ??
      item.site_views ??
      previous.siteViews ??
      previous.site_views ??
      viewedBy.length ??
      0;

    const siteLikes =
      item.siteLikes ??
      item.site_likes ??
      item.likes ??
      previous.siteLikes ??
      previous.site_likes ??
      likedBy.length ??
      0;

    const siteComments =
      item.siteComments ??
      item.site_comments ??
      previous.siteComments ??
      previous.site_comments ??
      uniqueComments.length ??
      0;

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
      viewedBy,
      comments: uniqueComments,
      votePointsGivenBy,
      viewPointsGivenBy,
      commentPointsGivenBy,

      votes: item.votes ?? item.likes ?? likedBy.length ?? previous.votes ?? 0,
      likes: item.likes ?? item.votes ?? likedBy.length ?? previous.likes ?? 0,

      siteViews,
      siteLikes,
      siteComments,

      engagementPoints:
        item.engagementPoints ?? previous.engagementPoints ?? 0,

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
}

function updateUserPoints(playerId: string, amount: number, marathonId?: string) {
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

  const records = storageService.loadData<any[]>(
    storageKeys.monthlyPlayerRecords,
    []
  );

  if (records.length) {
    storageService.saveData(
      storageKeys.monthlyPlayerRecords,
      records.map(record => {
        const samePlayer = record.playerId === playerId;
        const sameMarathon = !marathonId || record.marathonId === marathonId;

        if (!samePlayer || !sameMarathon) return record;

        return {
          ...record,
          points: Math.max(0, (record.points || 0) + amount),
          updatedAt: new Date().toISOString(),
        };
      })
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

function canAwardWithinLimit(
  alreadyAwardedCount: number,
  bonusPerAction: number,
  maxBonus: number
) {
  return alreadyAwardedCount * bonusPerAction < maxBonus;
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

      submissionType:
        params.submissionType || (url.includes('tiktok') ? 'tiktok' : 'text'),

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
      votePointsGivenBy: [],
      viewPointsGivenBy: [],
      commentPointsGivenBy: [],

      votes: 0,
      likes: 0,
      siteViews: 0,
      siteLikes: 0,
      siteComments: 0,
      engagementPoints: 0,

      createdAt: now,
      updatedAt: now,
    };

    const existing = loadAllLocalSubmissions();
    const next = mergeSubmissions([submission], existing);

    saveAllLocalSubmissions(next);

    return submission as Submission;
  },

  async recordView(submissionId: string, viewerId: string): Promise<Submission | null> {
    if (!submissionId || !viewerId) return null;

    const submissions = loadAllLocalSubmissions();
    let updatedSubmission: any = null;
    let pointsToAward = 0;

    const updated = submissions.map(submission => {
      if (submission.id !== submissionId) return submission;

      const viewedBy = Array.from(
        new Set([...(submission.viewedBy || []), viewerId])
      );

      const viewPointsGivenBy = Array.from(
        new Set([...(submission.viewPointsGivenBy || [])])
      );

      const isOwnView =
        submission.playerId === viewerId || submission.userId === viewerId;

      const canAward =
        !isOwnView &&
        !viewPointsGivenBy.includes(viewerId) &&
        canAwardWithinLimit(
          viewPointsGivenBy.length,
          SITE_VIEW_BONUS,
          MAX_VIEW_BONUS_PER_SUBMISSION
        );

      const nextViewPointsGivenBy = canAward
        ? [...viewPointsGivenBy, viewerId]
        : viewPointsGivenBy;

      pointsToAward = canAward ? SITE_VIEW_BONUS : 0;

      updatedSubmission = {
        ...submission,
        viewedBy,
        viewPointsGivenBy: nextViewPointsGivenBy,
        siteViews: viewedBy.length,
        engagementPoints: (submission.engagementPoints || 0) + pointsToAward,
        updatedAt: new Date().toISOString(),
      };

      return updatedSubmission;
    });

    if (!updatedSubmission) return null;

    saveAllLocalSubmissions(updated);

    if (pointsToAward > 0) {
      updateUserPoints(
        updatedSubmission.playerId || updatedSubmission.userId,
        pointsToAward,
        updatedSubmission.marathonId
      );
    }

    return updatedSubmission as Submission;
  },

  async voteSubmission(submissionId: string, voterId: string): Promise<Submission | null> {
    if (!submissionId || !voterId) {
      throw new Error('Missing submission or voter id.');
    }

    const submissions = loadAllLocalSubmissions();

    let updatedSubmission: any = null;
    let authorPoints = 0;
    let voterPoints = 0;

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

      const votePointsGivenBy = Array.from(
        new Set([...(submission.votePointsGivenBy || [])])
      );

      const canAwardAuthor =
        !votePointsGivenBy.includes(voterId) &&
        canAwardWithinLimit(
          votePointsGivenBy.length,
          POINTS_CONFIG.voteReceivedBonus,
          MAX_VOTE_BONUS_PER_SUBMISSION
        );

      const nextLikedBy = [...likedBy, voterId];
      const nextVotePointsGivenBy = canAwardAuthor
        ? [...votePointsGivenBy, voterId]
        : votePointsGivenBy;

      authorPoints = canAwardAuthor ? POINTS_CONFIG.voteReceivedBonus : 0;
      voterPoints = POINTS_CONFIG.voterSupportBonus;

      updatedSubmission = {
        ...submission,
        likedBy: nextLikedBy,
        votedUserIds: nextLikedBy,
        votePointsGivenBy: nextVotePointsGivenBy,
        votes: nextLikedBy.length,
        likes: nextLikedBy.length,
        siteLikes: nextLikedBy.length,
        engagementPoints: (submission.engagementPoints || 0) + authorPoints,
        updatedAt: new Date().toISOString(),
      };

      return updatedSubmission;
    });

    if (!updatedSubmission) {
      throw new Error('Submission not found.');
    }

    saveAllLocalSubmissions(updated);

    if (authorPoints > 0) {
      updateUserPoints(
        updatedSubmission.playerId || updatedSubmission.userId,
        authorPoints,
        updatedSubmission.marathonId
      );
    }

    if (voterPoints > 0) {
      updateUserPoints(voterId, voterPoints);
    }

    return updatedSubmission as Submission;
  },

  async addComment(
    submissionId: string,
    params: {
      authorId: string;
      authorNickname?: string;
      authorAvatar?: string;
      text: string;
    }
  ): Promise<Submission | null> {
    const text = params.text.trim();

    if (!submissionId || !params.authorId) {
      throw new Error('Missing submission or author id.');
    }

    if (!text) {
      throw new Error('კომენტარი ცარიელია.');
    }

    if (text.length > 500) {
      throw new Error('კომენტარი ძალიან გრძელია. მაქსიმუმ 500 სიმბოლო.');
    }

    const submissions = loadAllLocalSubmissions();
    let updatedSubmission: any = null;
    let pointsToAward = 0;

    const updated = submissions.map(submission => {
      if (submission.id !== submissionId) return submission;

      const comments = normalizeArray(submission.comments);
      const commentPointsGivenBy = Array.from(
        new Set([...(submission.commentPointsGivenBy || [])])
      );

      const newComment: StoredComment = {
        id: makeLocalCommentId(),
        submissionId,
        authorId: params.authorId,
        authorNickname: params.authorNickname || 'სტუმარი',
        authorAvatar: params.authorAvatar || '',
        text,
        createdAt: new Date().toISOString(),
      };

      const isOwnComment =
        submission.playerId === params.authorId ||
        submission.userId === params.authorId;

      const canAward =
        !isOwnComment &&
        !commentPointsGivenBy.includes(params.authorId) &&
        canAwardWithinLimit(
          commentPointsGivenBy.length,
          SITE_COMMENT_BONUS,
          MAX_COMMENT_BONUS_PER_SUBMISSION
        );

      const nextCommentPointsGivenBy = canAward
        ? [...commentPointsGivenBy, params.authorId]
        : commentPointsGivenBy;

      pointsToAward = canAward ? SITE_COMMENT_BONUS : 0;

      const nextComments = [...comments, newComment];

      updatedSubmission = {
        ...submission,
        comments: nextComments,
        commentPointsGivenBy: nextCommentPointsGivenBy,
        siteComments: nextComments.length,
        engagementPoints: (submission.engagementPoints || 0) + pointsToAward,
        updatedAt: new Date().toISOString(),
      };

      return updatedSubmission;
    });

    if (!updatedSubmission) {
      throw new Error('Submission not found.');
    }

    saveAllLocalSubmissions(updated);

    if (pointsToAward > 0) {
      updateUserPoints(
        updatedSubmission.playerId || updatedSubmission.userId,
        pointsToAward,
        updatedSubmission.marathonId
      );
    }

    return updatedSubmission as Submission;
  },
};
