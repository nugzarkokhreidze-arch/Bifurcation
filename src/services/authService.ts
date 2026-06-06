import { User } from '../types';
import { storageKeys, storageService } from './storageService';

type RegisterPlayerInput = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  nickname: string;
  passwordHash: string;
  avatar: string;
  fictionalNameEnabled: boolean;
  consentAccepted: boolean;
  preferredLanguage?: 'ka' | 'en';
};

type StoredUser = User & {
  passwordHash?: string;
  archivedAt?: string;
};

function normalizeValue(value?: string) {
  return (value || '').trim();
}

function normalizeEmail(value?: string) {
  return normalizeValue(value).toLowerCase();
}

function normalizeIdentifier(value?: string) {
  return normalizeValue(value).toLowerCase();
}

function createFallbackAvatar(nickname: string) {
  return `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(
    nickname || 'player'
  )}`;
}

function loadUsers() {
  return storageService.loadData<StoredUser[]>(storageKeys.users, []);
}

function saveUsers(users: StoredUser[]) {
  storageService.saveData(storageKeys.users, users);
}

function stripSessionOnlyFields(user: StoredUser): StoredUser {
  return {
    ...user,
    updatedAt: new Date().toISOString(),
  };
}

function upsertUser(user: StoredUser) {
  const users = loadUsers();
  const index = users.findIndex(item => item.id === user.id);

  const nextUsers =
    index >= 0
      ? users.map(item => (item.id === user.id ? { ...item, ...user } : item))
      : [user, ...users];

  saveUsers(nextUsers);
}

function createLocalUser(userData: RegisterPlayerInput): StoredUser {
  const nickname =
    normalizeValue(userData.nickname) ||
    `მოთამაშე_${Math.random().toString(36).slice(2, 7)}`;

  const email = normalizeEmail(userData.email);
  const now = new Date().toISOString();

  return {
    id: `usr-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    firstName: normalizeValue(userData.firstName) || 'მოთამაშე',
    lastName: normalizeValue(userData.lastName),
    email,
    phone: normalizeValue(userData.phone),
    nickname,
    passwordHash: userData.passwordHash,
    points: 100,
    avatar: userData.avatar || createFallbackAvatar(nickname),
    fictionalNameEnabled: userData.fictionalNameEnabled,
    status: 'active',
    consentAccepted: userData.consentAccepted,
    consentDate: now,
    completedChallenges: [],
    hiddenChallenges: [],
    publicChallenges: [],
    skippedChallenges: [],
    votesReceived: 0,
    braveryBonuses: 0,
    coachQuestionsRemaining: 3,
    videoCallAvailable: false,
    banned: false,
    banReason: '',
    isAdmin: false,
    badges: [],
    achievements: [],
    streakCount: 1,
    lastActiveDate: now.split('T')[0],
    preferredLanguage: userData.preferredLanguage || 'ka',
    notifications: [
      {
        id: `welcome-${Date.now()}`,
        message:
          "🌟 მოგესალმებათ 'ბიფურკაცია'! თქვენი გამბედაობის მარათონი იწყება აქ.",
        read: false,
        createdAt: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };
}

function ensureActiveUser(user: StoredUser) {
  if (user.status === 'cancelled' || user.status === 'deleted' || user.status === 'inactive') {
    throw new Error(
      'ეს კაბინეტი გაუქმებულია. თუ გსურთ დაბრუნება, შექმენით ახალი პროფილი სხვა მონაცემებით.'
    );
  }

  if (user.banned) {
    throw new Error(
      `თქვენი პროფილი დაბლოკილია: ${user.banReason || 'წესების მძიმე დარღვევა.'}`
    );
  }
}

function persistSession(user: StoredUser) {
  const sessionUser = stripSessionOnlyFields(user);

  upsertUser(sessionUser);
  storageService.saveData(storageKeys.currentUser, sessionUser);
  storageService.saveData(storageKeys.currentUserId, sessionUser.id);

  return sessionUser;
}

export const authService = {
  async registerPlayer(userData: RegisterPlayerInput): Promise<User> {
    const email = normalizeEmail(userData.email);
    const password = userData.passwordHash;

    if (!email) {
      throw new Error('რეგისტრაციისთვის საჭიროა ელფოსტა.');
    }

    if (!password || password.length < 6) {
      throw new Error('პაროლი უნდა იყოს მინიმუმ 6 სიმბოლო.');
    }

    const nickname = normalizeValue(userData.nickname);
    const phone = normalizeValue(userData.phone);
    const users = loadUsers();

    const duplicate = users.find(user => {
      const sameEmail = normalizeEmail(user.email) === email;
      const sameNickname =
        nickname && normalizeValue(user.nickname).toLowerCase() === nickname.toLowerCase();
      const samePhone = phone && normalizeValue(user.phone) === phone;

      return sameEmail || Boolean(sameNickname) || Boolean(samePhone);
    });

    if (duplicate) {
      if (duplicate.status === 'cancelled' || duplicate.status === 'deleted') {
        throw new Error(
          'ამ ელფოსტით ძველი კაბინეტი გაუქმებულია. გამოიყენეთ სხვა ელფოსტა ან ნიკნეიმი.'
        );
      }

      throw new Error('მოცემული ელფოსტა, ტელეფონი ან ნიკნეიმი უკვე გამოყენებულია.');
    }

    const localUser = createLocalUser({
      ...userData,
      email,
      phone,
      nickname,
    });

    return persistSession(localUser);
  },

  async loginPlayer(identifier: string, passwordHash: string): Promise<User> {
    const normalizedIdentifier = normalizeIdentifier(identifier);

    if (!normalizedIdentifier) {
      throw new Error('გთხოვთ ჩაწეროთ ელფოსტა ან ნიკნეიმი.');
    }

    if (!passwordHash) {
      throw new Error('გთხოვთ ჩაწეროთ პაროლი.');
    }

    const users = loadUsers();

    const matched = users.find(user => {
      const emailMatches = normalizeEmail(user.email) === normalizedIdentifier;
      const nicknameMatches =
        normalizeValue(user.nickname).toLowerCase() === normalizedIdentifier;
      const phoneMatches = normalizeValue(user.phone) === identifier.trim();

      return (emailMatches || nicknameMatches || phoneMatches) && user.passwordHash === passwordHash;
    });

    if (!matched) {
      throw new Error('არასწორი ელფოსტა/ნიკნეიმი ან პაროლი.');
    }

    ensureActiveUser(matched);

    const updatedUser: StoredUser = {
      ...matched,
      lastActiveDate: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString(),
    };

    return persistSession(updatedUser);
  },

  async logoutPlayer(): Promise<void> {
    storageService.removeData(storageKeys.currentUser);
    storageService.removeData(storageKeys.currentUserId);
  },

  async restoreSession(): Promise<User | null> {
    const sessionUser = storageService.loadData<StoredUser | null>(
      storageKeys.currentUser,
      null
    );

    if (!sessionUser?.id) return null;

    const users = loadUsers();
    const storedUser = users.find(user => user.id === sessionUser.id);
    const user = storedUser || sessionUser;

    try {
      ensureActiveUser(user);
    } catch {
      storageService.removeData(storageKeys.currentUser);
      storageService.removeData(storageKeys.currentUserId);
      return null;
    }

    return persistSession(user);
  },

  async getCurrentUser(): Promise<User | null> {
    return this.restoreSession();
  },

  async cancelCurrentUser(): Promise<void> {
    const currentUser = storageService.loadData<StoredUser | null>(
      storageKeys.currentUser,
      null
    );

    if (!currentUser?.id) return;

    const users = loadUsers();

    const archivedUser: StoredUser = {
      ...currentUser,
      status: 'cancelled',
      archivedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveUsers(
      users.map(user => (user.id === currentUser.id ? { ...user, ...archivedUser } : user))
    );

    storageService.removeData(storageKeys.currentUser);
    storageService.removeData(storageKeys.currentUserId);
  },

  _updateLocalBackupList(user: User): void {
    const existingUsers = loadUsers();
    const existing = existingUsers.find(item => item.id === user.id);

    const nextUser: StoredUser = {
      ...(existing || {}),
      ...user,
      passwordHash: existing?.passwordHash,
      updatedAt: new Date().toISOString(),
    };

    upsertUser(nextUser);
  },
};
