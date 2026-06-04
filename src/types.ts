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
  status: string; // 'active' | 'suspended' | 'banned'
  consentAccepted: boolean;
  consentDate?: string;
  completedChallenges: string[]; // List of challenge IDs
  hiddenChallenges: string[]; // Hidden completed challenge IDs
  publicChallenges: string[]; // Public completed challenge IDs
  skippedChallenges: string[]; // Skipped challenge IDs
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
  preferredLanguage?: 'ka' | 'en';
  notifications?: { id: string; message: string; read: boolean; createdAt: string }[];
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
  difficulty: 'easy' | 'medium' | 'hard';
  emotionalCourageLevel: number; // 1 to 5 stars or scale
  challengeCost: number; // point cost
  completionReward: number; // point reward
  publicBraveryBonus: number; // public submission courage bonus
  submissionType: 'video' | 'text' | 'photo' | 'reflection';
  status: 'active' | 'archived' | 'pending';
  aiGenerated: boolean;
  approvedByAdmin: boolean;
  reflectionQuestion?: string;
  reflectionQuestion_en?: string;
  personalDevelopmentReason?: string;
  personalDevelopmentReason_en?: string;
  proposedByPlayerId?: string;
  proposedByPlayerNickname?: string;
  
  // Marathon specific fields
  marathonId?: string;
  challengeNumber?: number;
  preview_ka?: string;
  preview_en?: string;
  fullInstructionsVisibleAfterAccept?: boolean;
  points?: number;
  acceptanceCost?: number;
  skipCost?: number;
  publicVideoBonus?: number;
}

export interface Submission {
  id: string;
  playerId: string;
  challengeId: string;
  videoUrl: string; // can be mock or custom text/reflection for demo
  visibility: 'public' | 'hidden';
  comment?: string;
  approved: boolean;
  votes: number;
  aiReaction?: string;
  aiReaction_en?: string;
  createdAt: string;
  safetyFlag: boolean;
  votedUserIds?: string[];
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
  status: 'pending' | 'reviewed';
  adminDecision?: string;
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
  status: 'requested' | 'scheduled' | 'rejected' | 'completed';
  requestedAt: string;
  scheduledAt?: string;
  duration: number; // in minutes e.g., 15
  cost: number; // points
  meetingLink?: string;
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
  acceptedDates?: { [key: string]: string };
  publicVideos: string[];
  hiddenVideos: string[];
  uniqueViewers: number;
  likes: number;
  rankingPosition: number;
  pointHistory: PointTransaction[];
  coachQuestionsUsed: number;
  videoConsultationUsed: number;
}

export interface Marathon {
  id: string;
  month: 'june' | 'july' | 'august' | 'september' | string;
  title_ka: string;
  title_en: string;
  startDate: string;
  endDate: string;
  timezone: string;
  status: 'active' | 'upcoming' | 'closed';
  challenges: Challenge[];
  aiGenerated: boolean;
  approvedByAdmin: boolean;
  createdAt: string;

  // Preserve any old single marathon fields (to prevent server crash on startup)
  title?: string;
  rules?: string;
  rules_en?: string;
}
