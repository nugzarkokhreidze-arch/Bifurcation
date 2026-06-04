import { User, Challenge, Submission, PointTransaction, MonthlyPlayerRecord } from "../types";

const SCHEMA_VERSION_KEY = "bifurcation_schema_version";
const CURRENT_VERSION = 2; // Incremented for new structural logic

export const storageKeys = {
  players: "bifurcation_players",
  currentUser: "bifurcation_current_user",
  marathons: "bifurcation_marathons",
  challengeProgress: "bifurcation_challenge_progress",
  submissions: "bifurcation_submissions",
  pointTransactions: "bifurcation_point_transactions",
  consultations: "bifurcation_consultations",
  reports: "bifurcation_reports",
  monthlyPlayerRecords: "bifurcation_monthly_player_records",
  schemaVersion: "bifurcation_schema_version"
};

export const storageService = {
  saveData<T>(key: string, data: T): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(key, JSON.stringify(data));
      if (key === "bifurcation_monthly_player_records") {
        window.localStorage.setItem("bifurcation_monthly_records", JSON.stringify(data));
      }
      if (key === "bifurcation_current_user") {
        window.localStorage.setItem("bifurcation_session_user", JSON.stringify(data));
      }
    } catch (e) {
      console.error(`Error saving key ${key} to localStorage:`, e);
    }
  },

  loadData<T>(key: string, fallback: T): T {
    if (typeof window === "undefined") return fallback;
    try {
      let item = window.localStorage.getItem(key);
      if (!item) {
        if (key === "bifurcation_monthly_player_records") {
          item = window.localStorage.getItem("bifurcation_monthly_records");
        } else if (key === "bifurcation_current_user") {
          item = window.localStorage.getItem("bifurcation_session_user");
        }
      }
      return item ? JSON.parse(item) : fallback;
    } catch (e) {
      console.error(`Error loading key ${key} from localStorage:`, e);
      return fallback;
    }
  },

  removeData(key: string): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(key);
      if (key === "bifurcation_monthly_player_records") {
        window.localStorage.removeItem("bifurcation_monthly_records");
      }
      if (key === "bifurcation_current_user") {
        window.localStorage.removeItem("bifurcation_session_user");
      }
    } catch (e) {
      console.error(`Error removing key ${key} from localStorage:`, e);
    }
  },

  migrateDataIfNeeded(): void {
    if (typeof window === "undefined") return;
    try {
      const storedVersion = storageService.loadData<number>(SCHEMA_VERSION_KEY, 0);
      if (storedVersion < CURRENT_VERSION) {
        console.log(`Migrating data schemas from v${storedVersion} to v${CURRENT_VERSION}...`);
        
        // 1. Upgrade player profiles list
        const players = storageService.loadData<any[]>(storageKeys.players, []);
        const upgradedPlayers = players.map(p => ({
          ...p,
          playerId: p.playerId || p.id,
          firstName: p.firstName || "",
          lastName: p.lastName || "",
          phone: p.phone || "",
          preferredLanguage: p.preferredLanguage || "ka",
          consentDate: p.consentDate || new Date().toISOString(),
          accountCreatedAt: p.accountCreatedAt || p.consentDate || new Date().toISOString(),
          lastLoginAt: p.lastLoginAt || new Date().toISOString(),
          status: p.status || "active",
          banned: p.banned !== undefined ? p.banned : false,
          banReason: p.banReason || "",
          archived: p.archived !== undefined ? p.archived : false,
          deleted: p.deleted !== undefined ? p.deleted : false
        }));
        storageService.saveData(storageKeys.players, upgradedPlayers);

        // 2. Upgrade current user session if exists
        const currentUser = storageService.loadData<any | null>(storageKeys.currentUser, null);
        if (currentUser) {
          const upgradedUser = {
            ...currentUser,
            playerId: currentUser.playerId || currentUser.id,
            firstName: currentUser.firstName || "",
            lastName: currentUser.lastName || "",
            phone: currentUser.phone || "",
            preferredLanguage: currentUser.preferredLanguage || "ka",
            consentDate: currentUser.consentDate || new Date().toISOString(),
            accountCreatedAt: currentUser.accountCreatedAt || currentUser.consentDate || new Date().toISOString(),
            lastLoginAt: new Date().toISOString(),
            status: currentUser.status || "active",
            banned: currentUser.banned !== undefined ? currentUser.banned : false,
            banReason: currentUser.banReason || "",
            archived: currentUser.archived !== undefined ? currentUser.archived : false,
            deleted: currentUser.deleted !== undefined ? currentUser.deleted : false
          };
          storageService.saveData(storageKeys.currentUser, upgradedUser);
        }

        // 3. Upgrade monthly records schema
        const records = storageService.loadData<any[]>(storageKeys.monthlyPlayerRecords, []);
        const upgradedRecords = records.map(r => ({
          ...r,
          points: r.points !== undefined ? r.points : 100,
          acceptedChallenges: r.acceptedChallenges || [],
          skippedChallenges: r.skippedChallenges || [],
          completedChallenges: r.completedChallenges || [],
          expiredChallenges: r.expiredChallenges || [],
          publicVideos: r.publicVideos || [],
          hiddenVideos: r.hiddenVideos || [],
          uniqueViewers: r.uniqueViewers !== undefined ? r.uniqueViewers : 0,
          likes: r.likes !== undefined ? r.likes : 0,
          rankingPosition: r.rankingPosition !== undefined ? r.rankingPosition : 0,
          pointHistory: r.pointHistory || [],
          coachQuestionsUsed: r.coachQuestionsUsed !== undefined ? r.coachQuestionsUsed : 0,
          ideaRequestsUsed: r.ideaRequestsUsed !== undefined ? r.ideaRequestsUsed : 0,
          videoConsultationUsed: r.videoConsultationUsed !== undefined ? r.videoConsultationUsed : 0,
          createdAt: r.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }));
        storageService.saveData(storageKeys.monthlyPlayerRecords, upgradedRecords);

        // 4. Upgrade challenge progress
        const challProgress = storageService.loadData<any[]>(storageKeys.challengeProgress, []);
        const upgradedChallProgress = challProgress.map(cp => ({
          ...cp,
          status: cp.status || "available",
          acceptedAt: cp.acceptedAt || new Date().toISOString(),
          deadlineAt: cp.deadlineAt || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          completedAt: cp.completedAt || null,
          expiredAt: cp.expiredAt || null,
          pointsAwarded: cp.pointsAwarded || 0,
          pointsDeducted: cp.pointsDeducted || 0
        }));
        storageService.saveData(storageKeys.challengeProgress, upgradedChallProgress);

        // Save new version
        storageService.saveData(SCHEMA_VERSION_KEY, CURRENT_VERSION);
        console.log(`Schema successfully migrated to v${CURRENT_VERSION}.`);
      }
    } catch (e) {
      console.error("Local storage schema migration failed:", e);
    }
  },

  clearAll(): void {
    if (typeof window === "undefined") return;
    Object.values(storageKeys).forEach(key => {
      window.localStorage.removeItem(key);
    });
  }
};
