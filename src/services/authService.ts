import { User } from '../types';
import { storageKeys, storageService } from './storageService';
import { supabase } from './supabaseClient';

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

function normalizeArray(value: any): any[] {
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

function mapPlayerRowToUser(row: any): StoredUser {
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
    completedChallenges: normalizeArray(row.completed_challenges),
    hiddenChallenges: normalizeArray(row.hidden_challenges),
    publicChallenges: normalizeArray(row.public_challenges),
    skippedChallenges: normalizeArray(row.skipped_challenges),
    votesReceived: row.votes_received ?? 0,
    braveryBonuses: row.bravery_bonuses ?? 0,
    coachQuestionsRemaining: row.coach_questions_remaining ?? 0,
    videoCallAvailable: row.video_call_available ?? false,
    banned: row.banned ?? false,
    banReason: row.ban_reason || undefined,
    isAdmin: row.is_admin ?? false,
    badges: normalizeArray(row.badges),
    achievements: normalizeArray(row.achievements),
    streakCount: row.streak_count ?? 1,
    lastActiveDate: row.last_active_date || undefined,
    preferredLanguage: row.preferred_language || 'ka',
    notifications: normalizeArray(row.notifications),
    createdAt: row.created_at || undefined,
    updatedAt: row.updated_at || undefined,
  };
}

function userToPlayerRow(user: User) {
  return {
    id: user.id,
    first_name: user.firstName,
    last_name: user.lastName,
    email: user.email,
    phone: user.phone,
    nickname: user.nickname,
    points: user.points,
    avatar: user.avatar,
    fictional_name_enabled: user.fictionalNameEnabled,
    status: user.status || 'active',
    consent_accepted: user.consentAccepted,
    consent_date: user.consentDate || new Date().toISOString(),
    completed_challenges: user.completedChallenges || [],
    hidden_challenges: user.hiddenChallenges || [],
    public_challenges: user.publicChallenges || [],
    skipped_challenges: user.skippedChallenges || [],
    votes_received: user.votesReceived || 0,
    bravery_bonuses: user.braveryBonuses || 0,
    coach_questions_remaining: user.coachQuestionsRemaining ?? 0,
    video_call_available: user.videoCallAvailable ?? false,
    banned: user.banned ?? false,
    ban_reason: user.banReason || '',
    is_admin: user.isAdmin ?? false,
    badges: user.badges || [],
    achievements: user.achievements || [],
    streak_count: user.streakCount || 1,
    last_active_date: user.lastActiveDate || new Date().toISOString().split('T')[0],
    preferred_language: user.preferredLanguage || 'ka',
    notifications: user.notifications || [],
    updated_at: new Date().toISOString(),
  };
}

function loadUsers() {
  return storageService.loadData<StoredUser[]>(storageKeys.users, []);
}

function saveUsers(users: StoredUser[]) {
  storageService.saveData(storageKeys.users, users);
}

function upsertLocalUser(user: StoredUser) {
  const users = loadUsers();
  const existing = users.find(item => item.id === user.id);

  const nextUser: StoredUser = {
    ...(existing || {}),
    ...user,
    passwordHash: existing?.passwordHash || user.passwordHash,
    updatedAt: new Date().toISOString(),
  };

  const nextUsers = existing
    ? users.map(item => (item.id === user.id ? nextUser : item))
    : [nextUser, ...users];

  saveUsers(nextUsers);

  return nextUser;
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
    coachQuestionsRemaining: 0,
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

function createCloudUser(authUserId: string, userData: RegisterPlayerInput): User {
  const nickname =
    normalizeValue(userData.nickname) ||
    `მოთამაშე_${Math.random().toString(36).slice(2, 7)}`;

  const now = new Date().toISOString();

  return {
    id: authUserId,
    firstName: normalizeValue(userData.firstName) || 'მოთამაშე',
    lastName: normalizeValue(userData.lastName),
    email: normalizeEmail(userData.email),
    phone: normalizeValue(userData.phone),
    nickname,
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
    coachQuestionsRemaining: 0,
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
  const saved = upsertLocalUser(user);
  storageService.saveData(storageKeys.currentUser, saved);
  storageService.saveData(storageKeys.currentUserId, saved.id);
  return saved;
}

async function loadCloudProfile(userId: string) {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;

  return data ? mapPlayerRowToUser(data) : null;
}

async function upsertCloudProfile(user: User) {
  const { data, error } = await supabase
    .from('players')
    .upsert(userToPlayerRow(user), { onConflict: 'id' })
    .select()
    .maybeSingle();

  if (error) throw error;

  return data ? mapPlayerRowToUser(data) : (user as StoredUser);
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

    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: normalizeValue(userData.firstName),
            last_name: normalizeValue(userData.lastName),
            nickname: normalizeValue(userData.nickname),
            phone: normalizeValue(userData.phone),
          },
        },
      });

      if (signUpError) throw signUpError;

      const authUser = signUpData.user;

      if (!authUser?.id) {
        throw new Error('Supabase მომხმარებელი ვერ შეიქმნა.');
      }

      const cloudUser = createCloudUser(authUser.id, {
        ...userData,
        email,
      });

      const savedProfile = await upsertCloudProfile(cloudUser);

      return persistSession(savedProfile);
    } catch (error: any) {
      console.warn('Supabase registration failed. Using local fallback:', error?.message || error);

      const localUsers = loadUsers();
      const nickname = normalizeValue(userData.nickname).toLowerCase();
      const phone = normalizeValue(userData.phone);

      const duplicate = localUsers.find(user => {
        const sameEmail = normalizeEmail(user.email) === email;
        const sameNickname =
          nickname && normalizeValue(user.nickname).toLowerCase() === nickname;
        const samePhone = phone && normalizeValue(user.phone) === phone;
        return sameEmail || Boolean(sameNickname) || Boolean(samePhone);
      });

      if (duplicate) {
        throw new Error('მოცემული ელფოსტა, ტელეფონი ან ნიკნეიმი უკვე გამოყენებულია.');
      }

      const localUser = createLocalUser({
        ...userData,
        email,
      });

      return persistSession(localUser);
    }
  },

  async loginPlayer(identifier: string, passwordHash: string): Promise<User> {
    const normalizedIdentifier = normalizeIdentifier(identifier);

    if (!normalizedIdentifier) {
      throw new Error('გთხოვთ ჩაწეროთ ელფოსტა ან ნიკნეიმი.');
    }

    if (!passwordHash) {
      throw new Error('გთხოვთ ჩაწეროთ პაროლი.');
    }

    try {
      if (!normalizedIdentifier.includes('@')) {
        throw new Error('Cloud login requires email. Trying local nickname fallback.');
      }

      const { data: signInData, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: normalizedIdentifier,
          password: passwordHash,
        });

      if (signInError) throw signInError;

      const authUser = signInData.user;

      if (!authUser?.id) {
        throw new Error('Supabase მომხმარებელი ვერ მოიძებნა.');
      }

      let profile = await loadCloudProfile(authUser.id);

      if (!profile) {
        profile = await upsertCloudProfile(
          createCloudUser(authUser.id, {
            firstName: authUser.user_metadata?.first_name || '',
            lastName: authUser.user_metadata?.last_name || '',
            email: authUser.email || normalizedIdentifier,
            phone: authUser.user_metadata?.phone || '',
            nickname: authUser.user_metadata?.nickname || normalizedIdentifier.split('@')[0],
            passwordHash,
            avatar: '',
            fictionalNameEnabled: true,
            consentAccepted: true,
            preferredLanguage: 'ka',
          })
        );
      }

      ensureActiveUser(profile);

      const updatedProfile: StoredUser = {
        ...profile,
        lastActiveDate: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString(),
      };

      return persistSession(updatedProfile);
    } catch (error: any) {
      console.warn('Supabase login failed. Trying local fallback:', error?.message || error);

      const localUsers = loadUsers();

      const matched = localUsers.find(user => {
        const emailMatches = normalizeEmail(user.email) === normalizedIdentifier;
        const nicknameMatches =
          normalizeValue(user.nickname).toLowerCase() === normalizedIdentifier;
        const phoneMatches = normalizeValue(user.phone) === normalizeValue(identifier);

        return (emailMatches || nicknameMatches || phoneMatches) && user.passwordHash === passwordHash;
      });

      if (!matched) {
        throw new Error('არასწორი მონაცემები ან კავშირის შეცდომა.');
      }

      ensureActiveUser(matched);

      const updatedUser: StoredUser = {
        ...matched,
        lastActiveDate: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString(),
      };

      return persistSession(updatedUser);
    }
  },

  async logoutPlayer(): Promise<void> {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.warn('Supabase sign out failed, clearing local session only:', error);
    }

    storageService.removeData(storageKeys.currentUser);
    storageService.removeData(storageKeys.currentUserId);
  },

  async restoreSession(): Promise<User | null> {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const authUser = sessionData.session?.user;

      if (authUser?.id) {
        const profile = await loadCloudProfile(authUser.id);

        if (profile) {
          ensureActiveUser(profile);
          return persistSession(profile);
        }
      }
    } catch (error) {
      console.warn('Supabase session restore failed:', error);
    }

    const sessionUser = storageService.loadData<StoredUser | null>(
      storageKeys.currentUser,
      null
    );

    if (!sessionUser?.id) return null;

    try {
      ensureActiveUser(sessionUser);
      return persistSession(sessionUser);
    } catch {
      storageService.removeData(storageKeys.currentUser);
      storageService.removeData(storageKeys.currentUserId);
      return null;
    }
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

    const archivedUser: StoredUser = {
      ...currentUser,
      status: 'cancelled',
      archivedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    upsertLocalUser(archivedUser);

    try {
      await supabase
        .from('players')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', currentUser.id);
    } catch (error) {
      console.warn('Supabase profile cancellation failed. Local profile archived:', error);
    }

    storageService.removeData(storageKeys.currentUser);
    storageService.removeData(storageKeys.currentUserId);
  },

  _updateLocalBackupList(user: User): void {
    upsertLocalUser(user as StoredUser);
  },
};
