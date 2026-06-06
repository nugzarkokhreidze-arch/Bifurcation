import type { Challenge } from '../types';

export type ChallengeDifficulty = 'easy' | 'medium' | 'hard';

export type VisibilityMode = 'public' | 'hidden';

export type PointsBreakdown = {
  basePoints: number;
  deadlineBonus: number;
  braveryBonus: number;
  totalPoints: number;
};

export type ChallengeTiming = {
  takenAt: string;
  expireAt: string;
};

export const POINTS_CONFIG = {
  monthlyStartingBonus: 100,

  easyChallenge: 10,
  mediumChallenge: 30,
  hardChallenge: 70,

  deadlineCompletionBonus: 10,
  publicBraveryBonus: 15,

  skippedChallengePenalty: -3,
  expiredChallengePenalty: -10,

  voteReceivedBonus: 5,
  voterSupportBonus: 2,

  writtenConsultationCost: -10,
  videoConsultationCost: -25,

  writtenConsultationLimitPerMarathon: 3,
  videoConsultationLimitPerMarathon: 1,

  challengeDeadlineHours: 72,
} as const;

export function normalizeDifficulty(difficulty?: string): ChallengeDifficulty {
  if (difficulty === 'medium') return 'medium';
  if (difficulty === 'hard') return 'hard';
  return 'easy';
}

export function getDifficultyLabel(
  difficulty?: string,
  lang: 'ka' | 'en' = 'ka'
): string {
  const normalized = normalizeDifficulty(difficulty);

  if (lang === 'en') {
    if (normalized === 'easy') return 'Easy';
    if (normalized === 'medium') return 'Medium';
    return 'Hard';
  }

  if (normalized === 'easy') return 'ადვილი';
  if (normalized === 'medium') return 'საშუალო';
  return 'რთული';
}

export function getBaseChallengePoints(challenge: Partial<Challenge>): number {
  const difficulty = normalizeDifficulty(challenge.difficulty);

  if (difficulty === 'easy') return POINTS_CONFIG.easyChallenge;
  if (difficulty === 'medium') return POINTS_CONFIG.mediumChallenge;
  return POINTS_CONFIG.hardChallenge;
}

export function createChallengeTiming(fromDate: Date = new Date()): ChallengeTiming {
  const expireAt = new Date(
    fromDate.getTime() + POINTS_CONFIG.challengeDeadlineHours * 60 * 60 * 1000
  );

  return {
    takenAt: fromDate.toISOString(),
    expireAt: expireAt.toISOString(),
  };
}

export function isChallengeExpired(expireAt?: string): boolean {
  if (!expireAt) return false;

  const deadline = new Date(expireAt);

  if (Number.isNaN(deadline.getTime())) return false;

  return Date.now() > deadline.getTime();
}

export function wasCompletedBeforeDeadline(expireAt?: string): boolean {
  if (!expireAt) return true;

  const deadline = new Date(expireAt);

  if (Number.isNaN(deadline.getTime())) return true;

  return Date.now() <= deadline.getTime();
}

export function calculateCompletionPoints(params: {
  challenge: Partial<Challenge>;
  visibility: VisibilityMode;
  expireAt?: string;
}): PointsBreakdown {
  const basePoints = getBaseChallengePoints(params.challenge);

  const deadlineBonus = wasCompletedBeforeDeadline(params.expireAt)
    ? POINTS_CONFIG.deadlineCompletionBonus
    : 0;

  const braveryBonus =
    params.visibility === 'public' ? POINTS_CONFIG.publicBraveryBonus : 0;

  return {
    basePoints,
    deadlineBonus,
    braveryBonus,
    totalPoints: basePoints + deadlineBonus + braveryBonus,
  };
}

export function calculateSkipPenalty(): number {
  return POINTS_CONFIG.skippedChallengePenalty;
}

export function calculateExpiredPenalty(): number {
  return POINTS_CONFIG.expiredChallengePenalty;
}

export function calculateVoteReceivedBonus(): number {
  return POINTS_CONFIG.voteReceivedBonus;
}

export function calculateVoterSupportBonus(): number {
  return POINTS_CONFIG.voterSupportBonus;
}

export function calculateWrittenConsultationCost(): number {
  return POINTS_CONFIG.writtenConsultationCost;
}

export function calculateVideoConsultationCost(): number {
  return POINTS_CONFIG.videoConsultationCost;
}

export function getCountdownParts(expireAt?: string) {
  if (!expireAt) {
    return {
      expired: false,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      totalMs: 0,
    };
  }

  const deadline = new Date(expireAt);
  const totalMs = deadline.getTime() - Date.now();

  if (Number.isNaN(deadline.getTime()) || totalMs <= 0) {
    return {
      expired: true,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      totalMs: 0,
    };
  }

  const days = Math.floor(totalMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor(
    (totalMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
  );
  const minutes = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((totalMs % (1000 * 60)) / 1000);

  return {
    expired: false,
    days,
    hours,
    minutes,
    seconds,
    totalMs,
  };
}

export function formatDeadlineCountdown(
  expireAt?: string,
  lang: 'ka' | 'en' = 'ka'
): string {
  const countdown = getCountdownParts(expireAt);

  if (countdown.expired) {
    return lang === 'ka' ? 'ვადა ამოიწურა' : 'Deadline expired';
  }

  if (!expireAt) {
    return lang === 'ka' ? 'ვადა ჯერ არ არის დაწყებული' : 'Deadline not started';
  }

  if (lang === 'en') {
    return `${countdown.days}d ${countdown.hours}h ${countdown.minutes}m ${countdown.seconds}s left`;
  }

  return `დარჩენილია: ${countdown.days}დ ${countdown.hours}სთ ${countdown.minutes}წთ ${countdown.seconds}წმ`;
}

export function getScoringText(params: {
  challenge: Partial<Challenge>;
  visibility?: VisibilityMode;
  expireAt?: string;
  lang?: 'ka' | 'en';
}): string {
  const lang = params.lang || 'ka';
  const visibility = params.visibility || 'public';

  const points = calculateCompletionPoints({
    challenge: params.challenge,
    visibility,
    expireAt: params.expireAt,
  });

  if (lang === 'en') {
    return [
      `Challenge difficulty: ${getDifficultyLabel(params.challenge.difficulty, 'en')}`,
      `Base points: +${points.basePoints}`,
      `Deadline bonus: +${points.deadlineBonus}`,
      `Public bravery bonus: +${points.braveryBonus}`,
      `Total possible points: +${points.totalPoints}`,
      `Skipping: ${POINTS_CONFIG.skippedChallengePenalty} points`,
      `Missing the deadline: ${POINTS_CONFIG.expiredChallengePenalty} points`,
      `Each unique support received: +${POINTS_CONFIG.voteReceivedBonus} points`,
      `Supporting another player: +${POINTS_CONFIG.voterSupportBonus} points`,
    ].join('\n');
  }

  return [
    `სირთულე: ${getDifficultyLabel(params.challenge.difficulty, 'ka')}`,
    `გამოწვევის ქულა: +${points.basePoints}`,
    `დედლაინამდე შესრულების ქულა: +${points.deadlineBonus}`,
    `სიმამაცის ქულა საჯაროობისთვის: +${points.braveryBonus}`,
    `ჯამური შესაძლო ქულა: +${points.totalPoints}`,
    `აცილება: ${POINTS_CONFIG.skippedChallengePenalty} ქულა`,
    `დედლაინის გადაცილება: ${POINTS_CONFIG.expiredChallengePenalty} ქულა`,
    `თითოეული უნიკალური მხარდაჭერა: +${POINTS_CONFIG.voteReceivedBonus} ქულა`,
    `სხვისი მხარდაჭერა: +${POINTS_CONFIG.voterSupportBonus} ქულა`,
  ].join('\n');
}

export function clampPoints(points: number): number {
  return Math.max(0, Math.round(points));
}
