import { User } from '../types';
import { clampPoints } from './pointsService';
import { storageKeys, storageService } from './storageService';
import { supabase } from './supabaseClient';

type StoredUser = User & {
  passwordHash?: string;
  archivedAt?: string;
};

function isUuid(value?: string) {
  return Boolean(
    value &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value
      )
  );
}

function createFallbackAvatar(nickname: string) {
  return `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(
    nickname || 'player'
  )}`;
}

function normalizeJsonArray(value: any): any[] {
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

function mergeUnique(list: string[] = [], item: string) {
  return Array.from(new Set([...list, item].filter(Boolean)));
}

function loadUsers() {
  return storageService.loadData<StoredUser[]>(storageKeys.users, []);
}

function saveUsers(users: StoredUser[]) {
  storageService.saveData(storageKeys.users, users);
}

function getCurrentUser() {
  return storageService.loadData<StoredUser | null>(storageKeys.currentUser, null);
}

function mapPlayerRowToUser(row: any): StoredUser {
  const nickname = row.nickname || row.email || 'მოთამაშე';

  return {
    id: row.id,
    firstName: row.first_name || '',
    lastName: row.last_name || '',
    email: row.email || '',
    phone: row.phone || '',
    nickname,
    points: clampPoints(row.points ?? 100),
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
    coachQuestionsRemaining: row.coach_questions_remaining ?? 0,
    videoCallAvailable: row.video_call_available ?? false,
    banned: row.banned ?? false,
    banReason: row.ban_reason || undefined,
    isAdmin: row.is_admin ?? false,
    badges: normalizeJsonArray(row.badges),
    achievements: normalizeJsonArray(row.achievements),
    streakCount: row.streak_count ?? 1,
    lastActiveDate: row.last_active_date || undefined,
    preferredLanguage: row.preferred_language || 'ka',
    notifications: normalizeJsonArray(row.notifications),
    createdAt: row.created_at || undefined,
    updatedAt: row.updated_at || undefined,
  };
}

function userToPlayerRow(user: Partial<User>) {
  const row: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (user.id !== undefined) row.id = user.id;
  if (user.firstName !== undefined) row.first_name = user.firstName;
  if (user.lastName !== undefined) row.last_name = user.lastName;
  if (user.email !== undefined) row.email = user.email;
  if (user.phone !== undefined) row.phone = user.phone;
  if (user.nickname !== undefined) row.nickname = user.nickname;
  if (user.points !== undefined) row.points = clampPoints(user.points);
  if (user.avatar !== undefined) row.avatar = user.avatar;
  if (user.fictionalNameEnabled !== undefined) {
    row.fictional_name_enabled = user.fictionalNameEnabled;
  }
  if (user.status !== undefined) row.status = user.status;
  if (user.consentAccepted !== undefined) row.consent_accepted = user.consentAccepted;
  if (user.consentDate !== undefined) row.consent_date = user.consentDate;
  if (user.completedChallenges !== undefined) row.completed_challenges = user.completedChallenges;
  if (user.hiddenChallenges !== undefined) row.hidden_challenges = user.hiddenChallenges;
  if (user.publicChallenges !== undefined) row.public_challenges = user.publicChallenges;
  if (user.skippedChallenges !== undefined) row.skipped_challenges = user.skippedChallenges;
  if (user.votesReceived !== undefined) row.votes_received = user.votesReceived;
  if (user.braveryBonuses !== undefined) row.bravery_bonuses = user.braveryBonuses;
  if (user.coachQuestionsRemaining !== undefined) {
    row.coach_questions_remaining = user.coachQuestionsRemaining;
  }
  if (user.videoCallAvailable !== undefined) row.video_call_available = user.videoCallAvailable;
  if (user.banned !== undefined) row.banned = user.banned;
  if (user.banReason !== undefined) row.ban_reason = user.banReason;
  if (user.isAdmin !== undefined) row.is_admin = user.isAdmin;
  if (user.badges !== undefined) row.badges = user.badges;
  if (user.achievements !== undefined) row.achievements = user.achievements;
  if (user.streakCount !== undefined) row.streak_count = user.streakCount;
  if (user.lastActiveDate !== undefined) row.last_active_date = user.lastActiveDate;
  if (user.preferredLanguage !== undefined) row.preferred_language = user.preferredLanguage;
  if (user.notifications !== undefined) row.notifications = user.notifications;

  return row;
}

function createLocalFallbackUser(playerId: string, updateData: Partial<User>): StoredUser {
  const nickname =
    updateData.nickname ||
    updateData.firstName ||
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
    coachQuestionsRemaining: updateData.coachQuestionsRemaining ?? 0,
    videoCallAvailable: updateData.videoCallAvailable ?? false,
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

function savePointHistory(params: {
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
    ...params,
    createdAt: new Date().toISOString(),
  });

  storageService.saveData(storageKeys.pointTransactions, transactions.slice(0, 500));
}

function updateMonthlyRecordsPoints(playerId: string, amount: number) {
  if (!amount) return;

  const records = storageService.loadData<any[]>(
    storageKeys.monthlyPlayerRecords,
    []
  );

  if (!records.length) return;

  storageService.saveData(
    storageKeys.monthlyPlayerRecords,
    records.map(record =>
      record.playerId === playerId || record.player_id === playerId
        ? {
            ...record,
            points: clampPoints((record.points || 0) + amount),
            updatedAt: new Date().toISOString(),
          }
        : record
    )
  );
}

function upsertLocalUser(user: StoredUser) {
  const users = loadUsers();
  const existing = users.find(item => item.id === user.id);

  const nextUser: StoredUser = {
    ...(existing || {}),
    ...user,
    passwordHash: existing?.passwordHash || user.passwordHash,
    points: clampPoints(user.points ?? existing?.points ?? 100),
    avatar:
      user.avatar ||
      existing?.avatar ||
      createFallbackAvatar(user.nickname || user.email || user.id),
    updatedAt: new Date().toISOString(),
  };

  const nextUsers = existing
    ? users.map(item => (item.id === user.id ? nextUser : item))
    : [nextUser, ...users];

  saveUsers(nextUsers);

  const currentUser = getCurrentUser();

  if (currentUser?.id === nextUser.id) {
    storageService.saveData(storageKeys.currentUser, {
      ...currentUser,
      ...nextUser,
    });
  }

  return nextUser;
}

function getLocalUser(playerId: string) {
  const users = loadUsers();
  const currentUser = getCurrentUser();

  return (
    users.find(user => user.id === playerId) ||
    (currentUser?.id === playerId ? currentUser : null)
  );
}

function mergePlayers(...lists: StoredUser[][]) {
  const map = new Map<string, StoredUser>();

  lists.flat().forEach(user => {
    if (!user?.id) return;

    const previous = map.get(user.id);

    map.set(user.id, {
      ...(previous || {}),
      ...user,
      passwordHash: previous?.passwordHash || user.passwordHash,
      points: clampPoints(user.points ?? previous?.points ?? 100),
      nickname:
        user.nickname ||
        previous?.nickname ||
        user.firstName ||
        user.email ||
        'მოთამაშე',
      avatar:
        user.avatar ||
        previous?.avatar ||
        createFallbackAvatar(user.nickname || user.email || user.id),
    });
  });

  return Array.from(map.values());
}

async function fetchCloudPlayers() {
  try {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .order('points', { ascending: false });

    if (error) throw error;

    return (data || []).map(mapPlayerRowToUser);
  } catch (error) {
    console.warn('Supabase players list load failed. Using local fallback:', error);
    return [];
  }
}

async function updateCloudPlayer(playerId: string, updateData: Partial<User>) {
  if (!isUuid(playerId)) return null;

  try {
    const { data, error } = await supabase
      .from('players')
      .update(userToPlayerRow(updateData))
      .eq('id', playerId)
      .select()
      .maybeSingle();

    if (error) throw error;

    return data ? mapPlayerRowToUser(data) : null;
  } catch (error) {
    console.warn('Supabase player update failed. Local copy is kept:', error);
    return null;
  }
}

export const playerService = {
  async getPlayerById(playerId: string): Promise<User> {
    const localMatch = getLocalUser(playerId);

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

      if (error) throw error;

      if (data) {
        const user = mapPlayerRowToUser(data);
        upsertLocalUser(user);
        return user;
      }
    } catch (error) {
      console.warn('Supabase player load failed. Loading local cached copy fallback:', error);
    }

    if (localMatch) return localMatch;

    return upsertLocalUser(createLocalFallbackUser(playerId, {}));
  },

  async getAllPlayers(): Promise<User[]> {
    const localUsers = loadUsers();
    const currentUser = getCurrentUser();
    const cloudUsers = await fetchCloudPlayers();

    const merged = mergePlayers(
      cloudUsers,
      localUsers,
      currentUser ? [currentUser] : []
    );

    saveUsers(merged);

    return merged
      .filter(user => {
        const status = user.status || 'active';
        return (
          !user.isAdmin &&
          !user.banned &&
          status !== 'cancelled' &&
          status !== 'deleted' &&
          status !== 'inactive'
        );
      })
      .sort((a, b) => (b.points || 0) - (a.points || 0));
  },

  async updatePlayer(playerId: string, updateData: Partial<User>): Promise<User> {
    const existing = getLocalUser(playerId);
    const base = existing || createLocalFallbackUser(playerId, updateData);

    const optimisticUser: StoredUser = {
      ...base,
      ...updateData,
      points:
        updateData.points !== undefined
          ? clampPoints(updateData.points)
          : clampPoints(base.points || 0),
      completedChallenges:
        updateData.completedChallenges || base.completedChallenges || [],
      hiddenChallenges:
        updateData.hiddenChallenges || base.hiddenChallenges || [],
      publicChallenges:
        updateData.publicChallenges || base.publicChallenges || [],
      skippedChallenges:
        updateData.skippedChallenges || base.skippedChallenges || [],
      badges: updateData.badges || base.badges || [],
      achievements: updateData.achievements || base.achievements || [],
      notifications: updateData.notifications || base.notifications || [],
      updatedAt: new Date().toISOString(),
    };

    upsertLocalUser(optimisticUser);

    const cloudUser = await updateCloudPlayer(playerId, optimisticUser);

    if (cloudUser) {
      return upsertLocalUser({ ...optimisticUser, ...cloudUser });
    }

    return optimisticUser;
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

    updateMonthlyRecordsPoints(playerId, amount);

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
    const alreadyCompleted = (user.completedChallenges || []).includes(
      params.challengeId
    );

    const gainedPoints = alreadyCompleted ? 0 : params.gainedPoints;

    const updated = await this.updatePlayer(params.playerId, {
      points: clampPoints((user.points || 0) + gainedPoints),
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
        params.visibility === 'public' && !alreadyCompleted
          ? (user.braveryBonuses || 0) + 15
          : user.braveryBonuses || 0,
    });

    if (gainedPoints) {
      updateMonthlyRecordsPoints(params.playerId, gainedPoints);

      this.addLocalPointHistory({
        playerId: params.playerId,
        amount: gainedPoints,
        reason: 'challenge-completed',
        challengeId: params.challengeId,
      });
    }

    return updated;
  },

  async markChallengeSkipped(params: {
    playerId: string;
    challengeId: string;
    penalty: number;
  }): Promise<User> {
    const user = await this.getPlayerById(params.playerId);
    const alreadySkipped = (user.skippedChallenges || []).includes(params.challengeId);
    const penalty = alreadySkipped ? 0 : params.penalty;

    const updated = await this.updatePlayer(params.playerId, {
      points: clampPoints((user.points || 0) + penalty),
      skippedChallenges: mergeUnique(user.skippedChallenges || [], params.challengeId),
    });

    if (penalty) {
      updateMonthlyRecordsPoints(params.playerId, penalty);

      this.addLocalPointHistory({
        playerId: params.playerId,
        amount: penalty,
        reason: 'challenge-skipped',
        challengeId: params.challengeId,
      });
    }

    return updated;
  },

  async deactivatePlayer(playerId: string): Promise<User> {
    return this.updatePlayer(playerId, {
      status: 'cancelled',
      updatedAt: new Date().toISOString(),
    } as Partial<User>);
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
    savePointHistory(params);
  },

  _updateLocalCache(user: User): void {
    upsertLocalUser(user as StoredUser);
  },
};
