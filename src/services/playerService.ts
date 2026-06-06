import { User } from '../types';
import { clampPoints } from './pointsService';
import { storageKeys, storageService } from './storageService';

type StoredUser = User & {
  passwordHash?: string;
  archivedAt?: string;
};

function createFallbackAvatar(nickname: string) {
  return `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(
    nickname || 'player'
  )}`;
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
      record.playerId === playerId
        ? {
            ...record,
            points: clampPoints((record.points || 0) + amount),
            updatedAt: new Date().toISOString(),
          }
        : record
    )
  );
}

function upsertUser(user: StoredUser) {
  const users = loadUsers();
  const existing = users.find(item => item.id === user.id);

  const nextUser: StoredUser = {
    ...(existing || {}),
    ...user,
    passwordHash: existing?.passwordHash || user.passwordHash,
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

export const playerService = {
  async getPlayerById(playerId: string): Promise<User> {
    const found = getLocalUser(playerId);

    if (found) return found;

    const fallback = createLocalFallbackUser(playerId, {});
    return upsertUser(fallback);
  },

  async getAllPlayers(): Promise<User[]> {
    const users = loadUsers();
    const currentUser = getCurrentUser();

    const map = new Map<string, StoredUser>();

    [...users, ...(currentUser ? [currentUser] : [])].forEach(user => {
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

    return Array.from(map.values())
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

    const updated: StoredUser = {
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

    return upsertUser(updated);
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
    upsertUser(user as StoredUser);
  },
};
