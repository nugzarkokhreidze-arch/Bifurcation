import { User } from '../types';
import { supabase } from './supabaseClient';
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
    streakCount: row.streak_count ?? 1,
    lastActiveDate: row.last_active_date || undefined,
    preferredLanguage: row.preferred_language || 'ka',
    notifications: row.notifications || [],
    createdAt: row.created_at || undefined,
    updatedAt: row.updated_at || undefined,
  };
}

function mapUserToPlayerRow(user: User) {
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
    coach_questions_remaining: user.coachQuestionsRemaining ?? 3,
    video_call_available: user.videoCallAvailable ?? true,
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

function createLocalUser(userData: RegisterPlayerInput): User & { passwordHash?: string } {
  const nickname =
    userData.nickname.trim() ||
    `მოთამაშე_${Math.random().toString(36).slice(2, 7)}`;

  return {
    id: `usr-${Math.random().toString(36).slice(2, 11)}`,
    firstName: userData.firstName || 'მოთამაშე',
    lastName: userData.lastName || '',
    email: userData.email,
    phone: userData.phone || '',
    nickname,
    passwordHash: userData.passwordHash,
    points: 100,
    avatar: userData.avatar || createFallbackAvatar(nickname),
    fictionalNameEnabled: userData.fictionalNameEnabled,
    status: 'active',
    consentAccepted: userData.consentAccepted,
    consentDate: new Date().toISOString(),
    completedChallenges: [],
    hiddenChallenges: [],
    publicChallenges: [],
    skippedChallenges: [],
    votesReceived: 0,
    braveryBonuses: 0,
    coachQuestionsRemaining: 3,
    videoCallAvailable: true,
    banned: false,
    banReason: '',
    isAdmin: false,
    badges: [],
    achievements: [],
    streakCount: 1,
    lastActiveDate: new Date().toISOString().split('T')[0],
    preferredLanguage: userData.preferredLanguage || 'ka',
    notifications: [
      {
        id: 'welcome-notif',
        message:
          "🌟 მოგესალმებათ 'ბიფურკაცია'! თქვენი გამბედაობის მარათონი იწყება აქ.",
        read: false,
        createdAt: new Date().toISOString(),
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export const authService = {
  async registerPlayer(userData: RegisterPlayerInput): Promise<User> {
    try {
      const password = userData.passwordHash;

      if (!userData.email) {
        throw new Error('რეგისტრაციისთვის საჭიროა ელფოსტა.');
      }

      if (!password || password.length < 6) {
        throw new Error('პაროლი უნდა იყოს მინიმუმ 6 სიმბოლო.');
      }

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: userData.email,
        password,
        options: {
          data: {
            first_name: userData.firstName,
            last_name: userData.lastName,
            nickname: userData.nickname,
            phone: userData.phone,
          },
        },
      });

      if (signUpError) {
        throw signUpError;
      }

      const authUser = signUpData.user;

      if (!authUser) {
        throw new Error('Supabase მომხმარებელი ვერ შეიქმნა.');
      }

      const nickname =
        userData.nickname.trim() ||
        `მოთამაშე_${Math.random().toString(36).slice(2, 7)}`;

      const newUser: User = {
        id: authUser.id,
        firstName: userData.firstName || 'მოთამაშე',
        lastName: userData.lastName || '',
        email: userData.email,
        phone: userData.phone || '',
        nickname,
        points: 100,
        avatar: userData.avatar || createFallbackAvatar(nickname),
        fictionalNameEnabled: userData.fictionalNameEnabled,
        status: 'active',
        consentAccepted: userData.consentAccepted,
        consentDate: new Date().toISOString(),
        completedChallenges: [],
        hiddenChallenges: [],
        publicChallenges: [],
        skippedChallenges: [],
        votesReceived: 0,
        braveryBonuses: 0,
        coachQuestionsRemaining: 3,
        videoCallAvailable: true,
        banned: false,
        banReason: '',
        isAdmin: false,
        badges: [],
        achievements: [],
        streakCount: 1,
        lastActiveDate: new Date().toISOString().split('T')[0],
        preferredLanguage: userData.preferredLanguage || 'ka',
        notifications: [
          {
            id: 'welcome-notif',
            message:
              "🌟 მოგესალმებათ 'ბიფურკაცია'! თქვენი გამბედაობის მარათონი იწყება აქ.",
            read: false,
            createdAt: new Date().toISOString(),
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const { data: insertedProfile, error: profileError } = await supabase
        .from('players')
        .insert(mapUserToPlayerRow(newUser))
        .select()
        .single();

      if (profileError) {
        throw profileError;
      }

      const finalUser = mapPlayerRowToUser(insertedProfile);

      storageService.saveData(storageKeys.currentUser, finalUser);
      this._updateLocalBackupList(finalUser);

      return finalUser;
    } catch (error: any) {
      console.warn(
        'Supabase registration failed. Using local fallback:',
        error?.message || error
      );

      const localUsers = storageService.loadData<Array<User & { passwordHash?: string }>>(
        storageKeys.users,
        []
      );

      const duplicate = localUsers.find(
        user =>
          user.email === userData.email ||
          user.nickname === userData.nickname ||
          Boolean(userData.phone && user.phone === userData.phone)
      );

      if (duplicate) {
        throw new Error('მოცემული ელფოსტა, ტელეფონი ან ნიკნეიმი უკვე გამოყენებულია.');
      }

      const localUser = createLocalUser(userData);

      storageService.saveData(storageKeys.users, [...localUsers, localUser]);
      storageService.saveData(storageKeys.currentUser, localUser);

      return localUser;
    }
  },

  async loginPlayer(identifier: string, passwordHash: string): Promise<User> {
    try {
      const isEmail = identifier.includes('@');

      if (!isEmail) {
        throw new Error(
          'Supabase შესვლისთვის საჭიროა ელფოსტა. ნიკნეიმით შესვლა იმუშავებს მხოლოდ local fallback რეჟიმში.'
        );
      }

      const { data: signInData, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: identifier,
          password: passwordHash,
        });

      if (signInError) {
        throw signInError;
      }

      const authUser = signInData.user;

      if (!authUser) {
        throw new Error('Supabase მომხმარებელი ვერ მოიძებნა.');
      }

      const { data: profile, error: profileError } = await supabase
        .from('players')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (profileError) {
        throw profileError;
      }

      const user = mapPlayerRowToUser(profile);

      if (user.banned) {
        throw new Error(
          `თქვენი პროფილი დაბლოკილია: ${user.banReason || 'წესების მძიმე დარღვევა.'}`
        );
      }

      storageService.saveData(storageKeys.currentUser, user);
      this._updateLocalBackupList(user);

      return user;
    } catch (error: any) {
      console.warn(
        'Supabase login failed. Trying local fallback:',
        error?.message || error
      );

      const localUsers = storageService.loadData<Array<User & { passwordHash?: string }>>(
        storageKeys.users,
        []
      );

      const matched = localUsers.find(
        user =>
          (user.email === identifier ||
            user.nickname === identifier ||
            user.phone === identifier) &&
          user.passwordHash === passwordHash
      );

      if (!matched) {
        throw new Error('არასწორი მონაცემები ან კავშირის შეცდომა.');
      }

      if (matched.banned) {
        throw new Error(
          `თქვენი პროფილი დაბლოკილია: ${
            matched.banReason || 'წესების მძიმე დარღვევა.'
          }`
        );
      }

      const updatedUser = {
        ...matched,
        lastActiveDate: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString(),
      };

      storageService.saveData(
        storageKeys.users,
        localUsers.map(user => (user.id === updatedUser.id ? updatedUser : user))
      );
      storageService.saveData(storageKeys.currentUser, updatedUser);

      return updatedUser;
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

      if (authUser) {
        const { data: profile, error: profileError } = await supabase
          .from('players')
          .select('*')
          .eq('id', authUser.id)
          .single();

        if (!profileError && profile) {
          const user = mapPlayerRowToUser(profile);
          storageService.saveData(storageKeys.currentUser, user);
          this._updateLocalBackupList(user);
          return user;
        }
      }
    } catch (error) {
      console.warn('Supabase session restore failed:', error);
    }

    return storageService.loadData<User | null>(storageKeys.currentUser, null);
  },

  async getCurrentUser(): Promise<User | null> {
    return this.restoreSession();
  },

  _updateLocalBackupList(user: User): void {
    const list = storageService.loadData<User[]>(storageKeys.users, []);
    const index = list.findIndex(item => item.id === user.id);

    const nextList =
      index >= 0
        ? list.map(item => (item.id === user.id ? user : item))
        : [...list, user];

    storageService.saveData(storageKeys.users, nextList);
  },
};
