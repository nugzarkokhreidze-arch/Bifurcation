import { Submission } from '../types';
import { supabase } from './supabaseClient';
import { playerService } from './playerService';
import { storageKeys, storageService } from './storageService';

type CreateSubmissionInput = {
  playerId: string;
  challengeId: string;
  marathonId: string;
  submissionType: 'video' | 'photo' | 'audio' | 'reflection' | 'text';
  visibility: 'public' | 'hidden';
  comment?: string;
  reflectionText?: string;
  file?: File | null;
};

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function safeFileName(fileName: string) {
  return fileName
    .replace(/\s+/g, '-')
    .replace(/[^\w.\-ა-ჰ]/g, '')
    .toLowerCase();
}

function normalizeArray(value: any): string[] {
  if (Array.isArray(value)) return value;

  if (!value) return [];

  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function mapSubmissionRow(row: any): Submission {
  return {
    id: row.id,
    playerId: row.player_id,
    challengeId: row.challenge_id,
    marathonId: row.marathon_id || undefined,
    videoUrl: row.video_url || row.file_url || '',
    fileUrl: row.file_url || row.video_url || '',
    filePath: row.file_path || undefined,
    fileName: row.file_name || undefined,
    fileMime: row.file_mime || undefined,
    fileSize: row.file_size || undefined,
    submissionType: row.submission_type || 'text',
    visibility: row.visibility || 'public',
    comment: row.comment || undefined,
    reflectionText: row.reflection_text || row.comment || undefined,
    approved: row.approved ?? true,
    votes: row.votes ?? row.likes ?? 0,
    likes: row.likes ?? row.votes ?? 0,
    aiReaction: row.ai_reaction || undefined,
    aiReaction_en: row.ai_reaction_en || undefined,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || undefined,
    safetyFlag: row.safety_flag ?? false,
    votedUserIds: normalizeArray(row.voted_user_ids),
    likedBy: normalizeArray(row.liked_by),
    playerNickname: row.player_nickname || undefined,
    playerAvatar: row.player_avatar || undefined,
    challengeTitle: row.challenge_title || undefined,
  };
}

function submissionToRow(submission: Submission) {
  return {
    id: submission.id,
    player_id: submission.playerId,
    challenge_id: submission.challengeId,
    marathon_id: submission.marathonId || null,
    video_url: submission.videoUrl || submission.fileUrl || '',
    file_url: submission.fileUrl || submission.videoUrl || '',
    file_path: submission.filePath || null,
    file_name: submission.fileName || null,
    file_mime: submission.fileMime || null,
    file_size: submission.fileSize || null,
    submission_type: submission.submissionType || 'text',
    visibility: submission.visibility || 'public',
    comment: submission.comment || null,
    reflection_text: submission.reflectionText || submission.comment || null,
    approved: submission.approved ?? true,
    votes: submission.votes || 0,
    likes: submission.likes || submission.votes || 0,
    ai_reaction: submission.aiReaction || null,
    ai_reaction_en: submission.aiReaction_en || null,
    safety_flag: submission.safetyFlag || false,
    voted_user_ids: submission.votedUserIds || [],
    liked_by: submission.likedBy || [],
    created_at: submission.createdAt || new Date().toISOString(),
    updated_at: submission.updatedAt || new Date().toISOString(),
  };
}

function getSubmissionDate(submission: Submission) {
  return new Date(submission.createdAt || submission.updatedAt || 0).getTime();
}

function mergeSubmissions(localItems: Submission[], remoteItems: Submission[]) {
  const map = new Map<string, Submission>();

  localItems.forEach(item => {
    if (item?.id) {
      map.set(item.id, item);
    }
  });

  remoteItems.forEach(item => {
    if (!item?.id) return;

    const previous = map.get(item.id);

    map.set(item.id, {
      ...(previous || {}),
      ...item,
      fileUrl: item.fileUrl || previous?.fileUrl || '',
      videoUrl: item.videoUrl || previous?.videoUrl || '',
      comment: item.comment || previous?.comment || '',
      reflectionText: item.reflectionText || previous?.reflectionText || '',
      likedBy: item.likedBy?.length ? item.likedBy : previous?.likedBy || [],
      votedUserIds: item.votedUserIds?.length
        ? item.votedUserIds
        : previous?.votedUserIds || [],
      votes: item.votes ?? previous?.votes ?? 0,
      likes: item.likes ?? previous?.likes ?? 0,
    });
  });

  return Array.from(map.values()).sort(
    (a, b) => getSubmissionDate(b) - getSubmissionDate(a)
  );
}

function saveSubmissionToLocal(submission: Submission) {
  const localSubmissions = storageService.loadData<Submission[]>(
    storageKeys.submissions,
    []
  );

  const merged = mergeSubmissions(localSubmissions, [submission]);

  storageService.saveData(storageKeys.submissions, merged);

  return submission;
}

async function uploadFileToSupabase(params: {
  playerId: string;
  challengeId: string;
  file: File;
}) {
  const fileExt = params.file.name.split('.').pop() || 'file';
  const fileName = safeFileName(params.file.name || `submission.${fileExt}`);
  const filePath = `${params.playerId}/${params.challengeId}/${Date.now()}-${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('submissions')
    .upload(filePath, params.file, {
      cacheControl: '3600',
      upsert: false,
      contentType: params.file.type || undefined,
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage.from('submissions').getPublicUrl(filePath);

  return {
    filePath,
    fileUrl: data.publicUrl,
  };
}

async function awardVotePoints(params: {
  authorId: string;
  voterId: string;
  submissionId: string;
}) {
  if (!params.authorId || !params.voterId) return;
  if (params.authorId === params.voterId) return;

  try {
    await playerService.addPoints(
      params.authorId,
      5,
      `support-received:${params.submissionId}`
    );
  } catch (error) {
    console.warn('Could not award author support points:', error);
  }

  if (!params.voterId.startsWith('guest-voter-')) {
    try {
      await playerService.addPoints(
        params.voterId,
        2,
        `support-given:${params.submissionId}`
      );
    } catch (error) {
      console.warn('Could not award voter support points:', error);
    }
  }
}

export const submissionService = {
  async getSubmissions(): Promise<Submission[]> {
    const localSubmissions = storageService.loadData<Submission[]>(
      storageKeys.submissions,
      []
    );

    try {
      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      const remoteSubmissions = (data || []).map(mapSubmissionRow);

      const merged = mergeSubmissions(localSubmissions, remoteSubmissions);

      storageService.saveData(storageKeys.submissions, merged);

      return merged;
    } catch (error) {
      console.warn(
        'Supabase submissions load failed. Loading local fallback:',
        error
      );

      return localSubmissions;
    }
  },

  async getPublicSubmissions(): Promise<Submission[]> {
    const all = await this.getSubmissions();

    return all.filter(item => item.visibility === 'public');
  },

  async getSubmissionsByPlayer(playerId: string): Promise<Submission[]> {
    const submissions = await this.getSubmissions();

    return submissions.filter(submission => submission.playerId === playerId);
  },

  async getSubmissionsByChallenge(challengeId: string): Promise<Submission[]> {
    const submissions = await this.getSubmissions();

    return submissions.filter(
      submission => submission.challengeId === challengeId
    );
  },

  async createSubmission(input: CreateSubmissionInput): Promise<Submission> {
    let fileUrl = '';
    let filePath = '';

    try {
      if (
        input.file &&
        input.submissionType !== 'reflection' &&
        input.submissionType !== 'text'
      ) {
        const uploaded = await uploadFileToSupabase({
          playerId: input.playerId,
          challengeId: input.challengeId,
          file: input.file,
        });

        fileUrl = uploaded.fileUrl;
        filePath = uploaded.filePath;
      }
    } catch (error) {
      console.warn('File upload failed. Saving text/local proof fallback:', error);
    }

    const submission: Submission = {
      id: makeId('sub'),
      playerId: input.playerId,
      challengeId: input.challengeId,
      marathonId: input.marathonId,
      videoUrl: fileUrl,
      fileUrl,
      filePath,
      fileName: input.file?.name,
      fileMime: input.file?.type,
      fileSize: input.file?.size,
      submissionType: input.submissionType,
      visibility: input.visibility,
      comment: input.comment || input.reflectionText || '',
      reflectionText: input.reflectionText || input.comment || '',
      approved: true,
      votes: 0,
      likes: 0,
      aiReaction:
        'შესანიშნავია! გამოწვევა წარმატებით აიტვირთა და დაემატა საერთო ონლაინ სივრცეში.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      safetyFlag: false,
      votedUserIds: [],
      likedBy: [],
    };

    saveSubmissionToLocal(submission);

    try {
      const { data, error } = await supabase
        .from('submissions')
        .insert(submissionToRow(submission))
        .select()
        .single();

      if (error) {
        throw error;
      }

      const savedSubmission = mapSubmissionRow(data);

      saveSubmissionToLocal(savedSubmission);

      return savedSubmission;
    } catch (error) {
      console.warn(
        'Supabase submission create failed. Local submission kept:',
        error
      );

      return submission;
    }
  },

  async voteSubmission(
    submissionId: string,
    voterId: string
  ): Promise<Submission> {
    const localSubmissions = storageService.loadData<Submission[]>(
      storageKeys.submissions,
      []
    );

    const existing = localSubmissions.find(item => item.id === submissionId);

    if (existing?.playerId === voterId) {
      throw new Error('საკუთარ აქტივობაზე ხმის მიცემა არ შეიძლება.');
    }

    if (
      existing?.likedBy?.includes(voterId) ||
      existing?.votedUserIds?.includes(voterId)
    ) {
      throw new Error('ამ აქტივობაზე ხმა უკვე მიცემული გაქვთ.');
    }

    try {
      const { data: current, error: loadError } = await supabase
        .from('submissions')
        .select('*')
        .eq('id', submissionId)
        .single();

      if (loadError) {
        throw loadError;
      }

      const currentSubmission = mapSubmissionRow(current);

      if (currentSubmission.playerId === voterId) {
        throw new Error('საკუთარ აქტივობაზე ხმის მიცემა არ შეიძლება.');
      }

      if (
        currentSubmission.likedBy?.includes(voterId) ||
        currentSubmission.votedUserIds?.includes(voterId)
      ) {
        throw new Error('ამ აქტივობაზე ხმა უკვე მიცემული გაქვთ.');
      }

      const likedBy = Array.from(
        new Set([...(currentSubmission.likedBy || []), voterId])
      );

      const votedUserIds = Array.from(
        new Set([...(currentSubmission.votedUserIds || []), voterId])
      );

      const nextVotes = votedUserIds.length;

      const { data, error } = await supabase
        .from('submissions')
        .update({
          votes: nextVotes,
          likes: nextVotes,
          liked_by: likedBy,
          voted_user_ids: votedUserIds,
          updated_at: new Date().toISOString(),
        })
        .eq('id', submissionId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      const updatedSubmission = mapSubmissionRow(data);

      saveSubmissionToLocal(updatedSubmission);

      await awardVotePoints({
        authorId: updatedSubmission.playerId,
        voterId,
        submissionId,
      });

      return updatedSubmission;
    } catch (error) {
      console.warn(
        'Supabase vote failed. Updating local fallback only:',
        error
      );

      if (!existing) {
        throw new Error('აქტივობა ვერ მოიძებნა.');
      }

      const likedBy = Array.from(
        new Set([...(existing.likedBy || []), voterId])
      );

      const votedUserIds = Array.from(
        new Set([...(existing.votedUserIds || []), voterId])
      );

      const updatedSubmission: Submission = {
        ...existing,
        likedBy,
        votedUserIds,
        votes: votedUserIds.length,
        likes: votedUserIds.length,
        updatedAt: new Date().toISOString(),
      };

      saveSubmissionToLocal(updatedSubmission);

      await awardVotePoints({
        authorId: updatedSubmission.playerId,
        voterId,
        submissionId,
      });

      return updatedSubmission;
    }
  },
};
