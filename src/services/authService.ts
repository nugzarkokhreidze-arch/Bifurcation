import { User } from "../types";
import { storageService, storageKeys } from "./storageService";

export const authService = {
  async registerPlayer(userData: {
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
  }): Promise<User> {
    const backupUserObj = {
      id: "usr-" + Math.random().toString(36).substring(2, 11),
      firstName: userData.firstName,
      lastName: userData.lastName,
      email: userData.email,
      phone: userData.phone,
      nickname: userData.nickname,
      passwordHash: userData.passwordHash,
      points: 100, // starting gift points
      avatar: userData.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(userData.nickname)}`,
      fictionalNameEnabled: userData.fictionalNameEnabled,
      status: "active",
      consentAccepted: userData.consentAccepted,
      consentDate: new Date().toISOString(),
      accountCreatedAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      preferredLanguage: userData.preferredLanguage || "ka",
      banned: false,
      banReason: "",
      completedChallenges: [],
      hiddenChallenges: [],
      publicChallenges: [],
      skippedChallenges: [],
      votesReceived: 0,
      braveryBonuses: 0,
      coachQuestionsRemaining: 3,
      videoCallAvailable: true,
      badges: [],
      achievements: [],
      streakCount: 1,
      lastActiveDate: new Date().toISOString().split("T")[0],
      notifications: [
        {
          id: "welcome-notif",
          message: "🌟 მოგესალმებათ 'ბიფურკაცია'! თქვენი გამბედაობის მარათონი იწყება აქ. შეასრულეთ პირველი გამოწვევა 100 სტარტერ ქულით!",
          read: false,
          createdAt: new Date().toISOString()
        }
      ]
    };

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
          phone: userData.phone,
          nickname: userData.nickname,
          password: userData.passwordHash,
          fictionalNameEnabled: userData.fictionalNameEnabled,
          avatar: userData.avatar,
          consentAccepted: userData.consentAccepted,
          preferredLanguage: userData.preferredLanguage || "ka"
        })
      });

      const data = await res.json();
      if (res.ok && data.user) {
        const serverUser = data.user;
        // Keep in local backup list
        this._updateLocalBackupList(serverUser);
        storageService.saveData(storageKeys.currentUser, serverUser);
        return serverUser;
      } else {
        throw new Error(data.error || "Server registration failed");
      }
    } catch (e: any) {
      console.warn("Backend unavailable or registration failed, fallback to offline local-first registry:", e.message);
      
      // Offline fallback: Check local dupes
      const localPlayers = storageService.loadData<any[]>(storageKeys.players, []);
      const dupe = localPlayers.find(p => p.email === userData.email || p.nickname === userData.nickname);
      if (dupe) {
        throw new Error("მოცემული ელფოსტა ან მომხმარებლის სახელი უკვე დაკავებულია.");
      }

      const localUser: User = {
        ...backupUserObj,
        id: backupUserObj.id
      };

      localPlayers.push(localUser);
      storageService.saveData(storageKeys.players, localPlayers);
      storageService.saveData(storageKeys.currentUser, localUser);
      return localUser;
    }
  },

  async loginPlayer(identifier: string, passwordHash: string): Promise<User> {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier,
          password: passwordHash
        })
      });

      const data = await res.json();
      if (res.ok && data.user) {
        const serverUser = data.user;
        this._updateLocalBackupList(serverUser);
        storageService.saveData(storageKeys.currentUser, serverUser);
        return serverUser;
      } else {
        throw new Error(data.error || "Invalid credentials on server");
      }
    } catch (e: any) {
      console.warn("Backend auth unavailable, trying local database auth fallback:", e.message);
      
      const localPlayers = storageService.loadData<any[]>(storageKeys.players, []);
      const matched = localPlayers.find(u => 
        (u.email === identifier || u.nickname === identifier || u.phone === identifier) && 
        u.passwordHash === passwordHash
      );

      if (!matched) {
        throw new Error("არასწორი მონაცემები ან კავშირის შეცდომა.");
      }

      if (matched.banned) {
        throw new Error(`თქვენი პროფილი დაბლოკილია ადმინისტრატორის მიერ: ${matched.banReason || 'წესების მძიმე დარღვევა.'}`);
      }

      matched.lastLoginAt = new Date().toISOString();
      storageService.saveData(storageKeys.players, localPlayers);
      storageService.saveData(storageKeys.currentUser, matched);
      return matched;
    }
  },

  logoutPlayer(): void {
    storageService.removeData(storageKeys.currentUser);
  },

  async restoreSession(): Promise<User | null> {
    const localSessionUser = storageService.loadData<User | null>(storageKeys.currentUser, null);
    if (!localSessionUser) return null;

    try {
      // Sync with server if available
      const res = await fetch(`/api/users/${localSessionUser.id}`);
      if (res.ok) {
        const serverUser = await res.json();
        if (serverUser && !serverUser.error) {
          this._updateLocalBackupList(serverUser);
          storageService.saveData(storageKeys.currentUser, serverUser);
          return serverUser;
        }
      }
    } catch (e) {
      console.warn("Network offline during session restore, loading fallback local session user profile");
    }

    return localSessionUser;
  },

  _updateLocalBackupList(user: User): void {
    const list = storageService.loadData<User[]>(storageKeys.players, []);
    const idx = list.findIndex(u => u.id === user.id);
    if (idx > -1) {
      list[idx] = user;
    } else {
      list.push(user);
    }
    storageService.saveData(storageKeys.players, list);
  }
};
