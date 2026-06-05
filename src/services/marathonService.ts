import { Challenge, Marathon } from '../types';
import { initialChallenges, initialMarathons } from '../seedData';
import { supabase } from './supabaseClient';
import { storageKeys, storageService } from './storageService';

type MarathonWithMeta = Marathon & {
  challengeCount?: number;
};

function normalizeChallenge(challenge: Challenge): Challenge {
  const reward = challenge.completionReward || challenge.points || 20;

  return {
    ...challenge,
    completionReward: reward,
    points: challenge.points || reward,
    challengeCost: challenge.challengeCost ?? challenge.acceptanceCost ?? 0,
    acceptanceCost: challenge.acceptanceCost ?? challenge.challengeCost ?? 0,
    skipCost: challenge.skipCost ?? 0,
    publicBraveryBonus:
      challenge.publicBraveryBonus ?? challenge.publicVideoBonus ?? 0,
    publicVideoBonus:
      challenge.publicVideoBonus ?? challenge.publicBraveryBonus ?? 0,
    status: challenge.status || 'active',
    approvedByAdmin: challenge.approvedByAdmin ?? true,
    aiGenerated: challenge.aiGenerated ?? false,
  };
}

function buildSeedMarathons(): MarathonWithMeta[] {
  return (initialMarathons as Marathon[]).map(marathon => {
    const marathonChallenges = (initialChallenges as Challenge[])
      .filter(challenge => challenge.marathonId === marathon.id)
      .map(normalizeChallenge);

    return {
      ...marathon,
      challenges: marathonChallenges,
      challengeCount: marathonChallenges.length,
      status: marathon.status || 'active',
      aiGenerated: marathon.aiGenerated ?? false,
      approvedByAdmin: marathon.approvedByAdmin ?? true,
      createdAt: marathon.createdAt || new Date().toISOString(),
    };
  });
}

function mapMarathonRow(row: any, challenges: Challenge[]): MarathonWithMeta {
  const marathonChallenges = challenges
    .filter(challenge => challenge.marathonId === row.id)
    .map(normalizeChallenge);

  return {
    id: row.id,
    month: row.month || row.id,
    title_ka: row.title_ka || row.title || 'მარათონი',
    title_en: row.title_en || row.title || 'Marathon',
    title: row.title || row.title_ka || 'მარათონი',
    startDate: row.start_date || row.startDate || new Date().toISOString(),
    endDate: row.end_date || row.endDate || new Date().toISOString(),
    timezone: row.timezone || 'Asia/Tbilisi',
    status: row.status || 'active',
    challenges: marathonChallenges,
    challengeCount: marathonChallenges.length,
    aiGenerated: row.ai_generated ?? row.aiGenerated ?? false,
    approvedByAdmin: row.approved_by_admin ?? row.approvedByAdmin ?? true,
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || row.updatedAt || undefined,
    rules: row.rules || undefined,
    rules_en: row.rules_en || undefined,
    principles: row.principles || undefined,
    principles_en: row.principles_en || undefined,
  };
}

function mapChallengeRow(row: any): Challenge {
  return normalizeChallenge({
    id: row.id,
    title: row.title || '',
    title_en: row.title_en || undefined,
    description: row.description || '',
    description_en: row.description_en || undefined,
    fullInstructions: row.full_instructions || row.fullInstructions || '',
    fullInstructions_en: row.full_instructions_en || row.fullInstructions_en || undefined,
    safetyRules: row.safety_rules || row.safetyRules || '',
    safetyRules_en: row.safety_rules_en || row.safetyRules_en || undefined,
    difficulty: row.difficulty || 'easy',
    emotionalCourageLevel:
      row.emotional_courage_level ?? row.emotionalCourageLevel ?? 1,
    challengeCost: row.challenge_cost ?? row.challengeCost ?? 0,
    completionReward: row.completion_reward ?? row.completionReward ?? 20,
    publicBraveryBonus:
      row.public_bravery_bonus ?? row.publicBraveryBonus ?? 0,
    submissionType: row.submission_type || row.submissionType || 'reflection',
    status: row.status || 'active',
    aiGenerated: row.ai_generated ?? row.aiGenerated ?? false,
    approvedByAdmin: row.approved_by_admin ?? row.approvedByAdmin ?? true,
    reflectionQuestion:
      row.reflection_question || row.reflectionQuestion || undefined,
    reflectionQuestion_en:
      row.reflection_question_en || row.reflectionQuestion_en || undefined,
    personalDevelopmentReason:
      row.personal_development_reason ||
      row.personalDevelopmentReason ||
      undefined,
    personalDevelopmentReason_en:
      row.personal_development_reason_en ||
      row.personalDevelopmentReason_en ||
      undefined,
    proposedByPlayerId:
      row.proposed_by_player_id || row.proposedByPlayerId || undefined,
    proposedByPlayerNickname:
      row.proposed_by_player_nickname ||
      row.proposedByPlayerNickname ||
      undefined,
    marathonId: row.marathon_id || row.marathonId,
    challengeNumber: row.challenge_number ?? row.challengeNumber ?? undefined,
    preview_ka: row.preview_ka || undefined,
    preview_en: row.preview_en || undefined,
    fullInstructionsVisibleAfterAccept:
      row.full_instructions_visible_after_accept ??
      row.fullInstructionsVisibleAfterAccept ??
      true,
    points: row.points ?? row.completion_reward ?? row.completionReward ?? 20,
    acceptanceCost:
      row.acceptance_cost ?? row.acceptanceCost ?? row.challenge_cost ?? 0,
    skipCost: row.skip_cost ?? row.skipCost ?? 0,
    publicVideoBonus:
      row.public_video_bonus ??
      row.publicVideoBonus ??
      row.public_bravery_bonus ??
      0,
    createdAt: row.created_at || row.createdAt || undefined,
    updatedAt: row.updated_at || row.updatedAt || undefined,
  });
}

async function loadSupabaseChallenges(): Promise<Challenge[]> {
  const { data, error } = await supabase
    .from('challenges')
    .select('*')
    .order('challenge_number', { ascending: true });

  if (error) {
    throw error;
  }

  return (data || []).map(mapChallengeRow);
}

export const marathonService = {
  async getMarathons(): Promise<MarathonWithMeta[]> {
    try {
      const [marathonResult, challenges] = await Promise.all([
        supabase
          .from('marathons')
          .select('*')
          .order('start_date', { ascending: true }),
        loadSupabaseChallenges(),
      ]);

      if (marathonResult.error) {
        throw marathonResult.error;
      }

      const rows = marathonResult.data || [];

      if (rows.length > 0) {
        const marathons = rows.map(row => mapMarathonRow(row, challenges));

        storageService.saveData(storageKeys.marathons, marathons);
        storageService.saveData(storageKeys.challenges, challenges);

        return marathons;
      }

      throw new Error('Supabase-ში მარათონები ჯერ არ არის დამატებული.');
    } catch (error) {
      console.warn(
        'Supabase marathons load failed. Using seedData fallback:',
        error
      );

      const seedMarathons = buildSeedMarathons();

      storageService.saveData(storageKeys.marathons, seedMarathons);
      storageService.saveData(
        storageKeys.challenges,
        seedMarathons.flatMap(marathon => marathon.challenges)
      );

      return seedMarathons;
    }
  },

  async getChallenges(marathonId?: string): Promise<Challenge[]> {
    try {
      const challenges = await loadSupabaseChallenges();

      const filtered = marathonId
        ? challenges.filter(challenge => challenge.marathonId === marathonId)
        : challenges;

      if (filtered.length > 0) {
        storageService.saveData(storageKeys.challenges, challenges);
        return filtered;
      }

      throw new Error('Supabase-ში გამოწვევები ჯერ არ არის დამატებული.');
    } catch (error) {
      console.warn(
        'Supabase challenges load failed. Using seedData fallback:',
        error
      );

      const fallbackChallenges = (initialChallenges as Challenge[]).map(
        normalizeChallenge
      );

      storageService.saveData(storageKeys.challenges, fallbackChallenges);

      return marathonId
        ? fallbackChallenges.filter(challenge => challenge.marathonId === marathonId)
        : fallbackChallenges;
    }
  },

  async getMarathonById(marathonId: string): Promise<MarathonWithMeta | null> {
    const marathons = await this.getMarathons();

    return (
      marathons.find(marathon => marathon.id === marathonId) ||
      marathons.find(marathon => marathon.month === marathonId) ||
      null
    );
  },
};
