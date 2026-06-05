import { User } from '../types';
import { supabase } from './supabaseClient';
import { storageKeys, storageService } from './storageService';

function createFallbackAvatar(nickname: string) {
  return `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(nickname)}`;
}

function mapPlayerRowToUser(row: any): User {
  return {
    id: row.id,
    firstName: row.first_name || '',
    lastName: row.last_name || '',
    email: row.email || '',
    phone: row.phone || '',
    nickname: row.nickname || 'მოთამაშე',
    points: row.points ?? 100,
    avatar: row.avatar || createFallbackAvatar(row.nickname || row.email || 'player'),
    fictionalNameEnabled: row.fictional_name_enabled ?? true,
    status: row.status || 'active',
    consentAccepted: row.consent_accepted ?? false,
    consentDate: row.consent_date || undefined,
    completedChallenges: row.completed_challenges || [],
    hiddenChallenges: row.hidden_challenges || [],
    publicChallenges: row.public_challenges || [],
    skippedChallenges: row.skipped_challenges || [],
    votesReceived: row.votes_received ?? 0,
    braveryBonuses: row.bravery_bonuses ?? 0,
    coachQuestionsRemaining: row.coach_questions_remaining ?? 3,
    videoCallAvailable: row.video_call_available ?? true,
    banned: row.banned ?? false,
    banReason: row.ban_reason || undefined,
    isAdmin: row.is_admin ?? false,
    badges: row.badges || [],
    achievements: row.achievements || [],
    streakCount: row.streak_count ?? 0,
    lastActiveDate: row.last_active_date || undefined,
    preferredLanguage: row.preferred_language || 'ka',
    notifications: row.notifications || [],
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
  if (updateData.points !== undefined) row.points = updateData.points;
  if (updateData.avatar !== undefined) row.avatar = updateData.avatar;
  if (updateData.fictionalNameEnabled !== undefined) {
    row.fictional_name_enabled = updateData.fictionalNameEnabled;
  }
  if (updateData.status !== undefined) row.status = updateData.status;
  if (updateData.consentAccepted !== undefined) {
    row.consent_accepted = updateData.consentAccepted;
  }
  if (updateData.consentDate !== undefined) row.consent_date = updateData.consentDate;
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
  if (updateData.votesReceived !== undefined) row.votes_received = updateData.votesReceived;
  if (updateData.braveryBonuses !== undefined) row.bravery_bonuses = updateData.braveryBonuses;
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
  if (updateData.notifications !== undefined) row.notifications = updateData.notifications;

  return row;
}

export const playerService = {
  async getPlayerById(playerId: string): Promise<User> {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('id', playerId)
        .single();

      if (error) {
        throw error;
      }

      if (!data) {
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

      const localPlayers = storageService.loadData<User[]>(storageKeys.users, []);
      const match = localPlayers.find(user => user.id === playerId);

      if (!match) {
        throw new Error('მოთამაშის პროფილი ვერ მოიძებნა.');
      }

      return match;
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
    const existingLocalUser = localPlayers.find(user => user.id === playerId);

    const optimisticUser = existingLocalUser
      ? {
          ...existingLocalUser,
          ...updateData,
          updatedAt: new Date().toISOString(),
        }
      : null;

    if (optimisticUser) {
      this._updateLocalCache(optimisticUser);
    }

    try {
      const supabaseUpdate = userUpdateToPlayerRow(updateData);

      const { data, error } = await supabase
        .from('players')
        .update(supabaseUpdate)
        .eq('id', playerId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error('მოთამაშის განახლებული პროფილი ვერ დაბრუნდა.');
      }

      const updatedUser = mapPlayerRowToUser(data);
      this._updateLocalCache(updatedUser);

      return updatedUser;
    } catch (error) {
      console.warn(
        'Supabase player update failed. Local fallback saved only:',
        error
      );

      if (optimisticUser) {
        return optimisticUser;
      }

      throw new Error('მოთამაშის განახლება ვერ მოხერხდა.');
    }
  },

  async addPoints(playerId: string, amount: number): Promise<User> {
    const user = await this.getPlayerById(playerId);

    return this.updatePlayer(playerId, {
      points: (user.points || 0) + amount,
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
