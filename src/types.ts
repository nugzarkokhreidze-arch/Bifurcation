export type Language = 'ka' | 'en';

export type UserStatus = 'active' | 'suspended' | 'banned';

export type Difficulty = 'easy' | 'medium' | 'hard';

export type ChallengeSubmissionType =
  | 'video'
  | 'audio'
  | 'photo'
  | 'text'
  | 'reflection';

export type ChallengeStatus = 'active' | 'archived' | 'pending';

export type Visibility = 'public' | 'hidden';

export type MarathonStatus = 'active' | 'upcoming' | 'closed';

export type ReportStatus = 'pending' | 'reviewed';

export type VideoConsultationStatus =
  | 'requested'
  | 'scheduled'
  | 'rejected'
  | 'completed';

export interface NotificationItem {
  id: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface User {
  id: string;

  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  nickname: string;

  points: number;
  avatar: string;

  fictionalNameEnabled: boolean;
  status: UserStatus | string;

  consentAccepted: boolean;
  consentDate?: string;

  completedChallenges: string[];
  hiddenChallenges: string[];
  publicChallenges: string[];
  skippedChallenges: string[];

  votesReceived: number;
  braveryBonuses: number;

  coachQuestionsRemaining: number;
  videoCallAvailable: boolean;

  banned: boolean;
  banReason?: string;

  isAdmin?: boolean;

  badges?: string[];
  achievements?: string[];

  streakCount?: number;
  lastActiveDate?: string;

  preferredLanguage?: Language;

  notifications?: NotificationItem[];

  createdAt?: string;
  updatedAt?: string;
}

export interface Challenge {
  id: string;

  title: string;
  title_en?: string;

  description: string;
  description_en?: string;

  fullInstructions: string;
  fullInstructions_en?: string;

  safetyRules: string;
  safetyRules_en?: string;

  difficulty: Difficulty;
  emotionalCourageLevel: number;

  challengeCost: number;
  completionReward: number;
  publicBraveryBonus: number;

  submissionType: ChallengeSubmissionType;

  status: ChallengeStatus;

  aiGenerated: boolean;
  approvedByAdmin: boolean;

  reflectionQuestion?: string;
  reflectionQuestion_en?: string;

  personalDevelopmentReason?: string;
  personalDevelopmentReason_en?: string;

  proposedByPlayerId?: string;
  proposedByPlayerNickname?: string;

  marathonId?: string;
  challengeNumber?: number;

  preview_ka?: string;
  preview_en?: string;

  fullInstructionsVisibleAfterAccept?: boolean;

  points?: number;
  acceptanceCost?: number;
  skipCost?: number;
  publicVideoBonus?: number;

  createdAt?: string;
  updatedAt?: string;
}

export interface Submission {
  id: string;

  playerId: string;
  challengeId: string;
  marathonId?: string;

  /**
   * ძველი ველის მხარდაჭერა.
   * ადრე ყველა ატვირთვა videoUrl-ში ინახებოდა.
   * ახლა შეიძლება იყოს ფოტო, ვიდეო, აუდიო ან ტექსტი.
   */
  videoUrl: string;

  /**
   * Supabase Storage-ის საჯარო URL ან დროებითი signed URL.
   */
  fileUrl?: string;

  /**
   * Supabase Storage-ში ფაილის path.
   * მაგალითად: submissions/user-id/challenge-id/file.mp4
   */
  filePath?: string;

  fileName?: string;
  fileMime?: string;
  fileSize?: number;

  submissionType?: ChallengeSubmissionType;

  visibility: Visibility;

  comment?: string;
  reflectionText?: string;

  approved: boolean;

  votes: number;
  likes?: number;

  aiReaction?: string;
  aiReaction_en?: string;

  createdAt: string;
  updatedAt?: string;

  safetyFlag: boolean;

  votedUserIds?: string[];
  likedBy?: string[];

  playerNickname?: string;
  playerAvatar?: string;
  challengeTitle?: string;
}

export interface Vote {
  id: string;

  voterId: string;
  submissionId: string;
  challengeId: string;

  createdAt: string;
}

export interface Report {
  id: string;

  reporterId: string;
  reportedPlayerId: string;
  submissionId: string;

  reason: string;
  description: string;

  status: ReportStatus;
  adminDecision?: string;

  createdAt?: string;
  updatedAt?: string;
}

export interface CoachQuestion {
  id: string;

  playerId: string;

  question: string;
  answer?: string;

  status: 'pending' | 'answered';

  cost: number;

  createdAt: string;
  answeredAt?: string;
}

export interface VideoConsultation {
  id: string;

  playerId: string;

  status: VideoConsultationStatus;

  requestedAt: string;
  scheduledAt?: string;

  duration: number;
  cost: number;

  meetingLink?: string;

  slotId?: string;
}

export interface PointTransaction {
  id: string;

  playerId: string;
  marathonId: string;

  type: string;

  description_ka: string;
  description_en: string;

  pointsAdded: number;
  pointsDeducted: number;
  balanceAfter: number;

  createdAt: string;
}

export interface MonthlyPlayerRecord {
  id: string;

  playerId: string;
  marathonId: string;

  participationConfirmed: boolean;

  startingBonusGiven: boolean;
  startingBonusAmount: number;

  points: number;

  acceptedChallenges: string[];
  skippedChallenges: string[];
  completedChallenges: string[];

  acceptedDates?: {
    [challengeId: string]: string;
  };

  publicVideos: string[];
  hiddenVideos: string[];

  uniqueViewers: number;
  likes: number;

  rankingPosition: number;

  pointHistory: PointTransaction[];

  coachQuestionsUsed: number;
  videoConsultationUsed: number;

  createdAt?: string;
  updatedAt?: string;
}

export interface Marathon {
  id: string;

  month: 'june' | 'july' | 'august' | 'september' | string;

  title_ka: string;
  title_en: string;

  startDate: string;
  endDate: string;

  timezone: string;

  status: MarathonStatus;

  challenges: Challenge[];

  aiGenerated: boolean;
  approvedByAdmin: boolean;

  createdAt: string;
  updatedAt?: string;

  winnerId?: string;
  winnerNickname?: string;
  winnerPoints?: number;
  winnerChallengesCount?: number;

  /**
   * ძველი single-marathon ველების მხარდაჭერა,
   * რომ არსებული კოდის ნაწილები არ გატყდეს.
   */
  title?: string;
  rules?: string;
  rules_en?: string;
  principles?: string;
  principles_en?: string;
}

export interface AvailableSlot {
  id: string;

  date: string;
  time: string;

  status: 'available' | 'booked';

  bookedByPlayerId?: string;
  bookedByNickname?: string;
}

export interface GameFormulas {
  standardChallengeCost: number;
  startingBonus: number;
  publicBraveryBonus: number;
  likeBonusMultiplier: number;
  viewerBonusMultiplier: number;
}

/**
 * ეს ტიპი გამოგვადგება მაშინ, როცა Supabase-დან მთლიან მდგომარეობას
 * ერთიანად წამოვიღებთ აპლიკაციისთვის.
 */
export interface AppState {
  users: User[];
  marathons: Marathon[];
  challenges: Challenge[];
  submissions: Submission[];
  votes: Vote[];
  reports: Report[];
  coachQuestions: CoachQuestion[];
  videoConsultations: VideoConsultation[];
  monthlyPlayerRecords: MonthlyPlayerRecord[];
  pointTransactions: PointTransaction[];
  availableSlots: AvailableSlot[];
  formulas?: GameFormulas;
}
