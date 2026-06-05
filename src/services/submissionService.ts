import { Submission } from '../types';
import { supabase } from './supabaseClient';
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

function mapSubmissionRow(row: any): Submission {
  return {
    id: row.id,
    playerId: row.player_id,
    challengeId: row.challenge_id,
    marathonId: row.marathon_id || undefined,
    videoUrl: row.video_url || row.file_url || '',
    fileUrl: row.file_url || undefined,
    filePath: row.file_path || undefined,
    fileName: row.file_name || undefined,
    fileMime: row.file_mime || undefined,
    fileSize: row.file_size || undefined,
    submissionType: row.submission_type || undefined,
    visibility: row.visibility || 'public',
    comment: row.comment || undefined,
    reflectionText: row.reflection_text || undefined,
    approved: row.approved ?? true,
    votes: row.votes ?? 0,
    likes: row.likes ?? row.votes ?? 0,
    aiReaction: row.ai_reaction || undefined,
    aiReaction_en: row.ai_reaction_en || undefined,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || undefined,
    safetyFlag: row.safety_flag ?? false,
    votedUserIds: row.voted_user_ids || [],
    likedBy: row.liked_by || [],
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
    file_url: submission.fileUrl || null,
    file_path: submission.filePath || null,
    file_name: submission.fileName || null,
    file_mime: submission.fileMime || null,
    file_size: submission.fileSize || null,
    submission_type: submission.submissionType || 'reflection',
    visibility: submission.visibility,
    comment: submission.comment || null,
    reflection_text: submission.reflectionText || null,
    approved: submission.approved,
    votes: submission.votes || 0,
    likes: submission.likes || submission.votes || 0,
    ai_reaction: submission.aiReaction || null,
    ai_reaction_en: submission.aiReaction_en || null,
    safety_flag: submission.safetyFlag || false,
    voted_user_ids: submission.votedUserIds || [],
    liked_by: submission.likedBy || [],
    created_at: submission.createdAt,
    updated_at: submission.updatedAt || new Date().toISOString(),
  };
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

export const submissionService = {
  async getSubmissions(): Promise<Submission[]> {
    try {
      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      const submissions = (data || []).map(mapSubmissionRow);

      storageService.saveData(storageKeys.submissions, submissions);

      return submissions;
    } catch (error) {
      console.warn(
        'Supabase submissions load failed. Loading local fallback:',
        error
      );

      return storageService.loadData<Submission[]>(storageKeys.submissions, []);
    }
  },

  async getSubmissionsByPlayer(playerId: string): Promise<Submission[]> {
    const submissions = await this.getSubmissions();

    return submissions.filter(submission => submission.playerId === playerId);
  },

  async getSubmissionsByChallenge(challengeId: string): Promise<Submission[]> {
    const submissions = await this.getSubmissions();

    return submissions.filter(submission => submission.challengeId === challengeId);
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
        safetyFlag: false,
        votedUserIds: [],
        likedBy: [],
      };

      const { data, error } = await supabase
        .from('submissions')
        .insert(submissionToRow(submission))
        .select()
        .single();

      if (error) {
        throw error;
      }

      const savedSubmission = mapSubmissionRow(data);

      const localSubmissions = storageService.loadData<Submission[]>(
        storageKeys.submissions,
        []
      );

      storageService.saveData(storageKeys.submissions, [
        savedSubmission,
        ...localSubmissions.filter(item => item.id !== savedSubmission.id),
      ]);

      return savedSubmission;
    } catch (error) {
      console.warn(
        'Supabase submission create failed. Saving local fallback:',
        error
      );

      const localSubmission: Submission = {
        id: makeId('sub-local'),
        playerId: input.playerId,
        challengeId: input.challengeId,
        marathonId: input.marathonId,
        videoUrl: '',
        fileUrl: '',
        filePath: '',
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
          'აქტივობა დროებით შეინახა ლოკალურად. Supabase-ის ჩართვის შემდეგ გადავიტანთ საერთო ბაზაში.',
        createdAt: new Date().toISOString(),
        safetyFlag: false,
        votedUserIds: [],
        likedBy: [],
      };

      const localSubmissions = storageService.loadData<Submission[]>(
        storageKeys.submissions,
        []
      );

      storageService.saveData(storageKeys.submissions, [
        localSubmission,
        ...localSubmissions,
      ]);

      return localSubmission;
    }
  },

  async voteSubmission(submissionId: string, voterId: string): Promise<Submission> {
    const localSubmissions = storageService.loadData<Submission[]>(
      storageKeys.submissions,
      []
    );

    const existing = localSubmissions.find(item => item.id === submissionId);

    if (existing?.playerId === voterId) {
      throw new Error('საკუთარ აქტივობაზე ხმის მიცემა არ შეიძლება.');
    }

    if (existing?.likedBy?.includes(voterId) || existing?.votedUserIds?.includes(voterId)) {
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

      storageService.saveData(
        storageKeys.submissions,
        localSubmissions.map(item =>
          item.id === submissionId ? updatedSubmission : item
        )
      );

      return updatedSubmission;
    } catch (error) {
      console.warn(
        'Supabase vote failed. Updating local fallback only:',
        error
      );

      if (!existing) {
        throw new Error('აქტივობა ვერ მოიძებნა.');
      }

      const likedBy = Array.from(new Set([...(existing.likedBy || []), voterId]));
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

      storageService.saveData(
        storageKeys.submissions,
        localSubmissions.map(item =>
          item.id === submissionId ? updatedSubmission : item
        )
      );

      return updatedSubmission;
    }
  },
};
