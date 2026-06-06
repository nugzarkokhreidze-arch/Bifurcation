import type { Submission, User } from '../types';
import { POINTS_CONFIG } from './pointsService';
import { storageKeys, storageService } from './storageService';
import { supabase } from './supabaseClient';

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

let hasAttemptedInitialCloudSync = false;

type StoredComment = {
  id: string;
  submissionId: string;
  authorId: string;
  authorNickname: string;
  authorAvatar?: string;
  text: string;
  createdAt: string;
};

function isUuid(value?: string) {
  return Boolean(
    value &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value
      )
  );
}

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

function normalizeArray(value: any): any[] {
  if (Array.isArray(value)) return value;

  if (!value) return [];

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
}

function normalizeBoolean(value: any, fallback = true) {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return fallback;
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
        ...normalizeArray(previous.liked_by),
        ...normalizeArray(previous.votedUserIds),
        ...normalizeArray(previous.voted_user_ids),
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

    const comments = [
      ...normalizeArray(previous.comments),
      ...normalizeArray(item.comments),
    ];

    const uniqueComments = Array.from(
      new Map(
        comments.map((comment: any) => [
          comment.id || `${comment.authorId || comment.author_id}-${comment.createdAt || comment.created_at}`,
          comment,
        ])
      ).values()
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
      marathonId:
        item.marathonId || item.marathon_id || previous.marathonId || '',

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

      fileUrl: item.fileUrl || item.file_url || previous.fileUrl || '',
      videoUrl: item.videoUrl || item.video_url || previous.videoUrl || '',
      localPreviewUrl:
        item.localPreviewUrl || item.local_preview_url || previous.localPreviewUrl || '',

      visibility: item.visibility || previous.visibility || 'public',
      publishToWall: normalizeBoolean(
        item.publishToWall ?? item.publish_to_wall ?? previous.publishToWall,
        true
      ),
      publish_to_wall: normalizeBoolean(
        item.publish_to_wall ?? item.publishToWall ?? previous.publish_to_wall,
        true
      ),
      isPublic: normalizeBoolean(
        item.isPublic ?? item.is_public ?? previous.isPublic,
        true
      ),

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

      votes: item.votes ?? item.likes ?? likedBy.length ?? previous.votes ?? 0,
      likes: item.likes ?? item.votes ?? likedBy.length ?? previous.likes ?? 0,

      siteViews,
      siteLikes,
      siteComments,

      engagementPoints:
        item.engagementPoints ?? item.engagement_points ?? previous.engagementPoints ?? 0,

      comment:
        item.comment ?? item.reflectionText ?? item.reflection_text ?? previous.comment ?? '',
      reflectionText:
        item.reflectionText ?? item.reflection_text ?? item.comment ?? previous.reflectionText ?? '',
      textDescription:
        item.textDescription ??
        item.text_description ??
        item.reflectionText ??
        item.reflection_text ??
        item.comment ??
        previous.textDescription ??
        '',

      playerNickname:
        item.playerNickname || item.player_nickname || previous.playerNickname || 'მოთამაშე',
      playerAvatar:
        item.playerAvatar || item.player_avatar || previous.playerAvatar || '',
      challengeTitle:
        item.challengeTitle || item.challenge_title || previous.challengeTitle || 'გამოწვევა',

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

function mapRowToSubmission(row: any) {
  return mergeSubmissions([
    {
      id: row.id,
      playerId: row.player_id || '',
      userId: row.player_id || '',
      challengeId: row.challenge_id || '',
      marathonId: row.marathon_id || '',
      visibility: row.visibility || 'public',
      publishToWall: row.publish_to_wall ?? true,
      publish_to_wall: row.publish_to_wall ?? true,
      submissionType: row.submission_type || 'tiktok',
      socialPlatform: row.social_platform || 'tiktok',
      fileUrl: row.file_url || '',
      videoUrl: row.video_url || '',
      tiktokUrl: row.tiktok_url || row.social_url || row.external_url || row.video_url || '',
      socialUrl: row.social_url || row.tiktok_url || row.external_url || row.video_url || '',
      externalUrl: row.external_url || row.tiktok_url || row.social_url || row.video_url || '',
      comment: row.comment || '',
      reflectionText: row.reflection_text || row.comment || '',
      likedBy: normalizeArray(row.liked_by),
      viewedBy: normalizeArray(row.viewed_by),
      comments: normalizeArray(row.comments),
      siteViews: Number(row.site_views || 0),
      siteLikes: Number(row.site_likes || 0),
      siteComments: Number(row.site_comments || 0),
      createdAt: row.created_at || new Date().toISOString(),
      updatedAt: row.updated_at || row.created_at || new Date().toISOString(),
    },
  ])[0];
}

function mapSubmissionToRow(submission: any) {
  const url =
    submission.tiktokUrl ||
    submission.socialUrl ||
    submission.externalUrl ||
    submission.videoUrl ||
    submission.fileUrl ||
    '';

  return {
    id: submission.id,
    player_id: isUuid(submission.playerId || submission.userId)
      ? submission.playerId || submission.userId
      : null,
    challenge_id: submission.challengeId || '',
    marathon_id: submission.marathonId || '',
    visibility: submission.visibility || 'public',
    publish_to_wall:
      submission.publishToWall ?? submission.publish_to_wall ?? submission.visibility !== 'hidden',
    submission_type: submission.submissionType || (url.includes('tiktok') ? 'tiktok' : 'text'),
    file_url: submission.fileUrl || '',
    video_url: submission.videoUrl || (url.includes('tiktok') ? url : ''),
    tiktok_url: submission.tiktokUrl || (url.includes('tiktok') ? url : ''),
    social_url: submission.socialUrl || url,
    external_url: submission.externalUrl || url,
    social_platform: submission.socialPlatform || (url.includes('tiktok') ? 'tiktok' : ''),
    comment: submission.comment || submission.reflectionText || '',
    reflection_text: submission.reflectionText || submission.comment || '',
    liked_by: submission.likedBy || submission.votedUserIds || [],
    viewed_by: submission.viewedBy || [],
    comments: submission.comments || [],
    site_views: Number(submission.siteViews || submission.site_views || 0),
    site_likes: Number(
      submission.siteLikes || submission.site_likes || submission.likes || submission.votes || 0
    ),
    site_comments: Number(
      submission.siteComments || submission.site_comments || (submission.comments || []).length || 0
    ),
    created_at: submission.createdAt || submission.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

async function fetchCloudSubmissions() {
  try {
    const { data, error } = await supabase
      .from('submissions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(300);

    if (error) throw error;

    return (data || []).map(mapRowToSubmission);
  } catch (error) {
    console.warn('Supabase submissions load failed. Using local fallback:', error);
    return [];
  }
}

function formatSupabaseError(error: any) {
  if (!error) return 'Unknown Supabase error.';

  if (error instanceof TypeError && String(error.message || '').includes('Failed to fetch')) {
    return 'Supabase-თან კავშირი ვერ დამყარდა. გადაამოწმეთ ინტერნეტი, Vercel-ის ENV ცვლადები და Supabase API/RLS პარამეტრები.';
  }

  const parts = [
    error.message,
    error.details,
    error.hint,
    error.code ? `code: ${error.code}` : '',
  ].filter(Boolean);

  return parts.length ? parts.join(' | ') : String(error);
}

function wait(ms: number) {
  return new Promise(resolve => window.setTimeout(resolve, ms));
}

async function insertOrUpdateSubmissionRow(row: any) {
  // Insert-ს ვიყენებთ upsert-ის ნაცვლად, რადგან ზოგ Supabase/RLS გარემოში
  // upsert() ზოგადი "Failed to fetch" შეცდომით ბრუნდება და რეალური მიზეზი იფარება.
  const insertResult = await supabase
    .from('submissions')
    .insert(row)
    .select()
    .maybeSingle();

  if (!insertResult.error) return insertResult.data;

  const isDuplicate =
    insertResult.error.code === '23505' ||
    String(insertResult.error.message || '').toLowerCase().includes('duplicate');

  if (!isDuplicate) {
    throw insertResult.error;
  }

  const updateResult = await supabase
    .from('submissions')
    .update({ ...row, updated_at: new Date().toISOString() })
    .eq('id', row.id)
    .select()
    .maybeSingle();

  if (updateResult.error) throw updateResult.error;

  return updateResult.data;
}

async function upsertCloudSubmission(submission: any) {
  const row = mapSubmissionToRow(submission);

  if (!row.player_id) {
    throw new Error('Cloud sync requires a Supabase-authenticated player id. Please log in again with your email and password.');
  }

  try {
    const data = await insertOrUpdateSubmissionRow(row);
    return data ? mapRowToSubmission(data) : submission;
  } catch (firstError: any) {
    // მოკლე retry დროებითი ქსელური ჩავარდნისთვის.
    if (firstError instanceof TypeError && String(firstError.message || '').includes('Failed to fetch')) {
      await wait(900);

      try {
        const data = await insertOrUpdateSubmissionRow(row);
        return data ? mapRowToSubmission(data) : submission;
      } catch (secondError: any) {
        throw new Error(formatSupabaseError(secondError));
      }
    }

    throw new Error(formatSupabaseError(firstError));
  }
}

async function updateCloudSubmission(submission: any) {
  const row = mapSubmissionToRow(submission);

  const { data, error } = await supabase
    .from('submissions')
    .update(row)
    .eq('id', submission.id)
    .select()
    .maybeSingle();

  if (error) throw error;

  return data ? mapRowToSubmission(data) : submission;
}

async function updateCloudPlayerPoints(playerId: string, amount: number) {
  if (!isUuid(playerId) || !amount) return;

  try {
    const { data, error } = await supabase
      .from('players')
      .select('points')
      .eq('id', playerId)
      .maybeSingle();

    if (error) throw error;

    const currentPoints = Number(data?.points ?? 0);
    const nextPoints = Math.max(0, currentPoints + amount);

    const { error: updateError } = await supabase
      .from('players')
      .update({ points: nextPoints, updated_at: new Date().toISOString() })
      .eq('id', playerId);

    if (updateError) throw updateError;
  } catch (error) {
    console.warn('Supabase player points update failed. Local points remain:', error);
  }
}

function updateLocalUserPoints(playerId: string, amount: number, marathonId?: string) {
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

  const users = storageService.loadData<User[]>(storageKeys.users, []);

  if (users.length) {
    storageService.saveData(
      storageKeys.users,
      users.map(user =>
        user.id === playerId
          ? {
              ...user,
              points: Math.max(0, (user.points || 0) + amount),
              updatedAt: new Date().toISOString(),
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
        const samePlayer = record.playerId === playerId || record.player_id === playerId;
        const sameMarathon = !marathonId || record.marathonId === marathonId || record.marathon_id === marathonId;

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

async function updateUserPoints(playerId: string, amount: number, marathonId?: string) {
  updateLocalUserPoints(playerId, amount, marathonId);
  await updateCloudPlayerPoints(playerId, amount);
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

function getGuestIdFallback(prefix: string) {
  if (typeof window === 'undefined') return `${prefix}-server`;

  const key = `bifurcation_${prefix}_id`;
  const existing = window.localStorage.getItem(key);

  if (existing) return existing;

  const created = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  window.localStorage.setItem(key, created);
  return created;
}

export const submissionService = {
  async getSubmissions(): Promise<Submission[]> {
    const localSubmissions = loadAllLocalSubmissions();

    // პირველად ჩატვირთვისას ვცდილობთ ძველი localStorage ჩანაწერების cloud-ში ატვირთვას.
    // ასე კომპიუტერში შექმნილი ჩანაწერები გამოჩნდება მობილურშიც, თუ მოთამაშე უკვე cloud ანგარიშით მუშაობს.
    if (!hasAttemptedInitialCloudSync && localSubmissions.length > 0) {
      hasAttemptedInitialCloudSync = true;

      for (const submission of localSubmissions.slice(0, 100)) {
        if (!isUuid(submission.playerId || submission.userId)) continue;

        try {
          await upsertCloudSubmission(submission);
        } catch (error) {
          console.warn('Local submission could not be synced to cloud:', error);
        }
      }
    }

    const cloudSubmissions = await fetchCloudSubmissions();
    const merged = mergeSubmissions(cloudSubmissions, localSubmissions);

    saveAllLocalSubmissions(merged);

    return merged as Submission[];
  },

  async syncLocalToCloud(): Promise<Submission[]> {
    const localSubmissions = loadAllLocalSubmissions();
    const synced: any[] = [];

    for (const submission of localSubmissions) {
      if (!isUuid(submission.playerId || submission.userId)) continue;

      try {
        synced.push(await upsertCloudSubmission(submission));
      } catch (error) {
        console.warn('Submission sync skipped:', error);
      }
    }

    const cloudSubmissions = await fetchCloudSubmissions();
    const merged = mergeSubmissions(cloudSubmissions, synced, localSubmissions);
    saveAllLocalSubmissions(merged);

    return merged as Submission[];
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

      votes: 0,
      likes: 0,
      siteViews: 0,
      siteLikes: 0,
      siteComments: 0,
      engagementPoints: 0,

      createdAt: now,
      updatedAt: now,
    };

    const cloudSubmission = await upsertCloudSubmission(submission);
    const merged = mergeSubmissions([cloudSubmission], loadAllLocalSubmissions());
    saveAllLocalSubmissions(merged);

    return cloudSubmission as Submission;
  },

  async recordView(submissionId: string, viewerId?: string): Promise<Submission | null> {
    const safeViewerId = viewerId || getGuestIdFallback('viewer');

    if (!submissionId || !safeViewerId) return null;

    const submissions = await this.getSubmissions();
    let updatedSubmission: any = null;
    let pointsToAward = 0;

    const updated = (submissions as any[]).map(submission => {
      const matches =
        submission.id === submissionId ||
        submission.remoteId === submissionId ||
        submission.remote_id === submissionId;

      if (!matches) return submission;

      const viewedBy = Array.from(
        new Set([...(submission.viewedBy || []), safeViewerId])
      );

      const isNewViewer = !(submission.viewedBy || []).includes(safeViewerId);
      const isOwnView =
        submission.playerId === safeViewerId || submission.userId === safeViewerId;

      const canAward =
        isNewViewer &&
        !isOwnView &&
        canAwardWithinLimit(
          Math.max(0, viewedBy.length - 1),
          SITE_VIEW_BONUS,
          MAX_VIEW_BONUS_PER_SUBMISSION
        );

      pointsToAward = canAward ? SITE_VIEW_BONUS : 0;

      updatedSubmission = {
        ...submission,
        viewedBy,
        siteViews: viewedBy.length,
        engagementPoints: (submission.engagementPoints || 0) + pointsToAward,
        updatedAt: new Date().toISOString(),
      };

      return updatedSubmission;
    });

    if (!updatedSubmission) return null;

    saveAllLocalSubmissions(updated);
    const cloudSubmission = await updateCloudSubmission(updatedSubmission);
    saveAllLocalSubmissions(mergeSubmissions([cloudSubmission], updated));

    if (pointsToAward > 0) {
      await updateUserPoints(
        updatedSubmission.playerId || updatedSubmission.userId,
        pointsToAward,
        updatedSubmission.marathonId
      );
    }

    return cloudSubmission as Submission;
  },

  async voteSubmission(submissionId: string, voterId: string): Promise<Submission | null> {
    if (!submissionId || !voterId) {
      throw new Error('Missing submission or voter id.');
    }

    const submissions = await this.getSubmissions();

    let updatedSubmission: any = null;
    let authorPoints = 0;
    let voterPoints = 0;

    const updated = (submissions as any[]).map(submission => {
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

      const canAwardAuthor = canAwardWithinLimit(
        likedBy.length,
        POINTS_CONFIG.voteReceivedBonus,
        MAX_VOTE_BONUS_PER_SUBMISSION
      );

      const nextLikedBy = [...likedBy, voterId];

      authorPoints = canAwardAuthor ? POINTS_CONFIG.voteReceivedBonus : 0;
      voterPoints = POINTS_CONFIG.voterSupportBonus;

      updatedSubmission = {
        ...submission,
        likedBy: nextLikedBy,
        votedUserIds: nextLikedBy,
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
    const cloudSubmission = await updateCloudSubmission(updatedSubmission);
    saveAllLocalSubmissions(mergeSubmissions([cloudSubmission], updated));

    if (authorPoints > 0) {
      await updateUserPoints(
        updatedSubmission.playerId || updatedSubmission.userId,
        authorPoints,
        updatedSubmission.marathonId
      );
    }

    if (voterPoints > 0 && isUuid(voterId)) {
      await updateUserPoints(voterId, voterPoints);
    } else if (voterPoints > 0) {
      updateLocalUserPoints(voterId, voterPoints);
    }

    return cloudSubmission as Submission;
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

    const submissions = await this.getSubmissions();
    let updatedSubmission: any = null;
    let pointsToAward = 0;

    const updated = (submissions as any[]).map(submission => {
      const matches =
        submission.id === submissionId ||
        submission.remoteId === submissionId ||
        submission.remote_id === submissionId;

      if (!matches) return submission;

      const comments = normalizeArray(submission.comments);

      const newComment: StoredComment = {
        id: makeLocalCommentId(),
        submissionId: submission.id,
        authorId: params.authorId,
        authorNickname: params.authorNickname || 'სტუმარი',
        authorAvatar: params.authorAvatar || '',
        text,
        createdAt: new Date().toISOString(),
      };

      const isOwnComment =
        submission.playerId === params.authorId ||
        submission.userId === params.authorId;

      const alreadyAwardedAuthorIds = Array.from(
        new Set(
          comments
            .map((comment: any) => comment.authorId || comment.author_id)
            .filter(Boolean)
        )
      );

      const canAward =
        !isOwnComment &&
        !alreadyAwardedAuthorIds.includes(params.authorId) &&
        canAwardWithinLimit(
          alreadyAwardedAuthorIds.length,
          SITE_COMMENT_BONUS,
          MAX_COMMENT_BONUS_PER_SUBMISSION
        );

      pointsToAward = canAward ? SITE_COMMENT_BONUS : 0;

      const nextComments = [...comments, newComment];

      updatedSubmission = {
        ...submission,
        comments: nextComments,
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
    const cloudSubmission = await updateCloudSubmission(updatedSubmission);
    saveAllLocalSubmissions(mergeSubmissions([cloudSubmission], updated));

    if (pointsToAward > 0) {
      await updateUserPoints(
        updatedSubmission.playerId || updatedSubmission.userId,
        pointsToAward,
        updatedSubmission.marathonId
      );
    }

    return cloudSubmission as Submission;
  },
};
