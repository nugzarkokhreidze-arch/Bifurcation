import { User } from '../types';
import { clampPoints } from './pointsService';
import { supabase } from './supabaseClient';
import { storageKeys, storageService } from './storageService';

function createFallbackAvatar(nickname: string) {
  return `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(
    nickname || 'player'
  )}`;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function normalizeJsonArray(value: any): any[] {
  if (Array.isArray(value)) return value;
  if (!value) return [];

  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function createLocalFallbackUser(playerId: string, updateData: Partial<User>): User {
  const nickname =
    updateData.nickname ||
    updateData.email ||
    playerId.slice(0, 8) ||
    'მოთამაშე';

  return {
    id: playerId,
    firstName: updateData.firstName || '',
    lastName: updateData.lastName || '',
    email: updateData.email || '',
    phone: updateData.phone || '',
    nickname,
    points: updateData.points ?? 100,
    avatar: updateData.avatar || createFallbackAvatar(nickname),
    fictionalNameEnabled: updateData.fictionalNameEnabled ?? true,
    status: updateData.status || 'active',
    consentAccepted: updateData.consentAccepted ?? true,
    consentDate: updateData.consentDate || new Date().toISOString(),
    completedChallenges: updateData.completedChallenges || [],
    hiddenChallenges: updateData.hiddenChallenges || [],
    publicChallenges: updateData.publicChallenges || [],
    skippedChallenges: updateData.skippedChallenges || [],
    votesReceived: updateData.votesReceived || 0,
    braveryBonuses: updateData.braveryBonuses || 0,
    coachQuestionsRemaining: updateData.coachQuestionsRemaining ?? 3,
    videoCallAvailable: updateData.videoCallAvailable ?? true,
    banned: updateData.banned ?? false,
    banReason: updateData.banReason || '',
    isAdmin: updateData.isAdmin ?? false,
    badges: updateData.badges || [],
    achievements: updateData.achievements || [],
    streakCount: updateData.streakCount || 1,
    lastActiveDate:
      updateData.lastActiveDate || new Date().toISOString().split('T')[0],
    preferredLanguage: updateData.preferredLanguage || 'ka',
    notifications: updateData.notifications || [],
    createdAt: updateData.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function mapPlayerRowToUser(row: any): User {
  const nickname = row.nickname || row.email || 'მოთამაშე';

  return {
    id: row.id,
    firstName: row.first_name || '',
    lastName: row.last_name || '',
    email: row.email || '',
    phone: row.phone || '',
    nickname,
    points: row.points ?? 100,
    avatar: row.avatar || createFallbackAvatar(nickname),
    fictionalNameEnabled: row.fictional_name_enabled ?? true,
    status: row.status || 'active',
    consentAccepted: row.consent_accepted ?? false,
    consentDate: row.consent_date || undefined,
    completedChallenges: normalizeJsonArray(row.completed_challenges),
    hiddenChallenges: normalizeJsonArray(row.hidden_challenges),
    publicChallenges: normalizeJsonArray(row.public_challenges),
    skippedChallenges: normalizeJsonArray(row.skipped_challenges),
    votesReceived: row.votes_received ?? 0,
    braveryBonuses: row.bravery_bonuses ?? 0,
    coachQuestionsRemaining: row.coach_questions_remaining ?? 3,
    videoCallAvailable: row.video_call_available ?? true,
    banned: row.banned ?? false,
    banReason: row.ban_reason || undefined,
    isAdmin: row.is_admin ?? false,
    badges: normalizeJsonArray(row.badges),
    achievements: normalizeJsonArray(row.achievements),
    streakCount: row.streak_count ?? 0,
    lastActiveDate: row.last_active_date || undefined,
    preferredLanguage: row.preferred_language || 'ka',
    notifications: normalizeJsonArray(row.notifications),
    createdAt: row.created_at || undefined,
    updatedAt: row.updated_at || undefined,
  };
}

function userUpdateToPlayerRow(updateData: Partial<User>) {
  const row: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (updateData.firstName !== undefined) row.first_name = updateData.firstName;
  if (updateData.lastName !== undefined) row.last_name = updateData.lastName;
  if (updateData.email !== undefined) row.email = updateData.email;
  if (updateData.phone !== undefined) row.phone = updateData.phone;
  if (updateData.nickname !== undefined) row.nickname = updateData.nickname;
  if (updateData.points !== undefined) row.points = clampPoints(updateData.points);
  if (updateData.avatar !== undefined) row.avatar = updateData.avatar;

  if (updateData.fictionalNameEnabled !== undefined) {
    row.fictional_name_enabled = updateData.fictionalNameEnabled;
  }

  if (updateData.status !== undefined) row.status = updateData.status;

  if (updateData.consentAccepted !== undefined) {
    row.consent_accepted = updateData.consentAccepted;
  }

  if (updateData.consentDate !== undefined) {
    row.consent_date = updateData.consentDate;
  }

  if (updateData.completedChallenges !== undefined) {
    row.completed_challenges = updateData.completedChallenges;
  }

  if (updateData.hiddenChallenges !== undefined) {
    row.hidden_challenges = updateData.hiddenChallenges;
  }

  if (updateData.publicChallenges !== undefined) {
    row.public_challenges = updateData.publicChallenges;
  }

  if (updateData.skippedChallenges !== undefined) {
    row.skipped_challenges = updateData.skippedChallenges;
  }

  if (updateData.votesReceived !== undefined) {
    row.votes_received = updateData.votesReceived;
  }

  if (updateData.braveryBonuses !== undefined) {
    row.bravery_bonuses = updateData.braveryBonuses;
  }

  if (updateData.coachQuestionsRemaining !== undefined) {
    row.coach_questions_remaining = updateData.coachQuestionsRemaining;
  }

  if (updateData.videoCallAvailable !== undefined) {
    row.video_call_available = updateData.videoCallAvailable;
  }

  if (updateData.banned !== undefined) row.banned = updateData.banned;
  if (updateData.banReason !== undefined) row.ban_reason = updateData.banReason;
  if (updateData.isAdmin !== undefined) row.is_admin = updateData.isAdmin;
  if (updateData.badges !== undefined) row.badges = updateData.badges;
  if (updateData.achievements !== undefined) row.achievements = updateData.achievements;
  if (updateData.streakCount !== undefined) row.streak_count = updateData.streakCount;
  if (updateData.lastActiveDate !== undefined) row.last_active_date = updateData.lastActiveDate;

  if (updateData.preferredLanguage !== undefined) {
    row.preferred_language = updateData.preferredLanguage;
  }

  if (updateData.notifications !== undefined) {
    row.notifications = updateData.notifications;
  }

  return row;
}

function mergeUnique(list: string[] = [], item: string) {
  return Array.from(new Set([...list, item]));
}

export const playerService = {
  async getPlayerById(playerId: string): Promise<User> {
    const localPlayers = storageService.loadData<User[]>(storageKeys.users, []);
    const localCurrentUser = storageService.loadData<User | null>(
      storageKeys.currentUser,
      null
    );

    const localMatch =
      localPlayers.find(user => user.id === playerId) ||
      (localCurrentUser?.id === playerId ? localCurrentUser : null);

    try {
      if (!isUuid(playerId)) {
        if (localMatch) return localMatch;
        throw new Error('Local player id is not a Supabase UUID.');
      }

      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('id', playerId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        if (localMatch) return localMatch;
        throw new Error('მოთამაშე Supabase-ში ვერ მოიძებნა.');
      }

      const user = mapPlayerRowToUser(data);
      this._updateLocalCache(user);
      return user;
    } catch (error) {
      console.warn(
        'Supabase player load failed. Loading local cached copy fallback:',
        error
      );

      if (localMatch) return localMatch;

      throw new Error('მოთამაშის პროფილი ვერ მოიძებნა.');
    }
  },

  async getAllPlayers(): Promise<User[]> {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .order('points', { ascending: false });

      if (error) {
        throw error;
      }

      const users = (data || []).map(mapPlayerRowToUser);
      storageService.saveData(storageKeys.users, users);
      return users;
    } catch (error) {
      console.warn(
        'Supabase players list load failed. Loading local fallback:',
        error
      );

      return storageService.loadData<User[]>(storageKeys.users, []);
    }
  },

  async updatePlayer(playerId: string, updateData: Partial<User>): Promise<User> {
    const localPlayers = storageService.loadData<User[]>(storageKeys.users, []);
    const localCurrentUser = storageService.loadData<User | null>(
      storageKeys.currentUser,
      null
    );

    const existingLocalUser =
      localPlayers.find(user => user.id === playerId) ||
      (localCurrentUser?.id === playerId ? localCurrentUser : null);

    const baseUser =
      existingLocalUser || createLocalFallbackUser(playerId, updateData);

    const optimisticUser: User = {
      ...baseUser,
      ...updateData,
      points:
        updateData.points !== undefined
          ? clampPoints(updateData.points)
          : clampPoints(baseUser.points || 0),
      completedChallenges:
        updateData.completedChallenges || baseUser.completedChallenges || [],
      hiddenChallenges:
        updateData.hiddenChallenges || baseUser.hiddenChallenges || [],
      publicChallenges:
        updateData.publicChallenges || baseUser.publicChallenges || [],
      skippedChallenges:
        updateData.skippedChallenges || baseUser.skippedChallenges || [],
      badges: updateData.badges || baseUser.badges || [],
      achievements: updateData.achievements || baseUser.achievements || [],
      notifications: updateData.notifications || baseUser.notifications || [],
      updatedAt: new Date().toISOString(),
    };

    this._updateLocalCache(optimisticUser);

    try {
      if (!isUuid(playerId)) {
        console.warn(
          'Skipping Supabase player update because player id is not UUID:',
          playerId
        );
        return optimisticUser;
      }

      const supabaseUpdate = userUpdateToPlayerRow(updateData);

      const { data, error } = await supabase
        .from('players')
        .update(supabaseUpdate)
        .eq('id', playerId)
        .select()
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        return optimisticUser;
      }

      const updatedUser = mapPlayerRowToUser(data);
      this._updateLocalCache(updatedUser);

      return updatedUser;
    } catch (error) {
      console.warn(
        'Supabase player update failed. Local fallback saved and returned:',
        error
      );

      return optimisticUser;
    }
  },

  async addPoints(
    playerId: string,
    amount: number,
    reason = 'points-update'
  ): Promise<User> {
    const user = await this.getPlayerById(playerId);
    const nextPoints = clampPoints((user.points || 0) + amount);

    const updated = await this.updatePlayer(playerId, {
      points: nextPoints,
    });

    this.addLocalPointHistory({
      playerId,
      amount,
      reason,
    });

    return updated;
  },

  async markChallengeCompleted(params: {
    playerId: string;
    challengeId: string;
    visibility: 'public' | 'hidden';
    gainedPoints: number;
  }): Promise<User> {
    const user = await this.getPlayerById(params.playerId);

    return this.updatePlayer(params.playerId, {
      points: clampPoints((user.points || 0) + params.gainedPoints),
      completedChallenges: mergeUnique(
        user.completedChallenges || [],
        params.challengeId
      ),
      publicChallenges:
        params.visibility === 'public'
          ? mergeUnique(user.publicChallenges || [], params.challengeId)
          : user.publicChallenges || [],
      hiddenChallenges:
        params.visibility === 'hidden'
          ? mergeUnique(user.hiddenChallenges || [], params.challengeId)
          : user.hiddenChallenges || [],
      braveryBonuses:
        params.visibility === 'public'
          ? (user.braveryBonuses || 0) + 15
          : user.braveryBonuses || 0,
    });
  },

  async markChallengeSkipped(params: {
    playerId: string;
    challengeId: string;
    penalty: number;
  }): Promise<User> {
    const user = await this.getPlayerById(params.playerId);

    return this.updatePlayer(params.playerId, {
      points: clampPoints((user.points || 0) + params.penalty),
      skippedChallenges: mergeUnique(user.skippedChallenges || [], params.challengeId),
    });
  },

  async getPlayerCabinetData(playerId: string): Promise<{
    points: number;
    completedChallenges: string[];
    banned: boolean;
    streakCount: number;
    badges: string[];
    achievements: string[];
    notifications: any[];
  }> {
    const user = await this.getPlayerById(playerId);

    return {
      points: user.points || 0,
      completedChallenges: user.completedChallenges || [],
      banned: Boolean(user.banned),
      streakCount: user.streakCount || 0,
      badges: user.badges || [],
      achievements: user.achievements || [],
      notifications: user.notifications || [],
    };
  },

  addLocalPointHistory(params: {
    playerId: string;
    amount: number;
    reason: string;
    challengeId?: string;
    submissionId?: string;
    marathonId?: string;
  }) {
    const transactions = storageService.loadData<any[]>(
      storageKeys.pointTransactions,
      []
    );

    transactions.unshift({
      id: `pt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      playerId: params.playerId,
      amount: params.amount,
      reason: params.reason,
      challengeId: params.challengeId,
      submissionId: params.submissionId,
      marathonId: params.marathonId,
      createdAt: new Date().toISOString(),
    });

    storageService.saveData(storageKeys.pointTransactions, transactions);
  },

  _updateLocalCache(user: User): void {
    const list = storageService.loadData<User[]>(storageKeys.users, []);
    const index = list.findIndex(item => item.id === user.id);

    const nextList =
      index >= 0
        ? list.map(item => (item.id === user.id ? user : item))
        : [...list, user];

    storageService.saveData(storageKeys.users, nextList);

    const currentUser = storageService.loadData<User | null>(
      storageKeys.currentUser,
      null
    );

    if (currentUser && currentUser.id === user.id) {
      storageService.saveData(storageKeys.currentUser, user);
    }
  },
};
