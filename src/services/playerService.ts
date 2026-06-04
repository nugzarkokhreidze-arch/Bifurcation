import { User } from "../types";
import { storageService, storageKeys } from "./storageService";

export const playerService = {
  async getPlayerById(playerId: string): Promise<User> {
    try {
      const res = await fetch(`/api/users/${playerId}`);
      if (res.ok) {
        const serverUser = await res.json();
        this._updateLocalCache(serverUser);
        return serverUser;
      }
    } catch (e) {
      console.warn("Could not retrieve player from server. Loading local cached copy fallback.");
    }

    const localPlayers = storageService.loadData<User[]>(storageKeys.players, []);
    const match = localPlayers.find(u => u.id === playerId);
    if (!match) throw new Error("Player profile not found anywhere");
    return match;
  },

  async updatePlayer(playerId: string, updateData: Partial<User>): Promise<User> {
    // 1. Update localStorage instantly for immediate reactive UI
    const localPlayers = storageService.loadData<User[]>(storageKeys.players, []);
    let updatedLocalUser: User | null = null;
    
    const updatedPlayers = localPlayers.map(p => {
      if (p.id === playerId) {
        const updated = { ...p, ...updateData };
        updatedLocalUser = updated;
        return updated;
      }
      return p;
    });

    if (updatedLocalUser) {
      storageService.saveData(storageKeys.players, updatedPlayers);
      
      const currentLocUser = storageService.loadData<User | null>(storageKeys.currentUser, null);
      if (currentLocUser && currentLocUser.id === playerId) {
        storageService.saveData(storageKeys.currentUser, updatedLocalUser);
      }
    }

    // 2. Push updates to full-stack container server
    try {
      const res = await fetch(`/api/users/${playerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData)
      });
      if (res.ok) {
        const serverUser = await res.json();
        if (serverUser && serverUser.user) {
          this._updateLocalCache(serverUser.user);
          return serverUser.user;
        }
      }
    } catch (e) {
      console.warn("Server update request failed, state saved locally offline:", e);
    }

    if (updatedLocalUser) return updatedLocalUser;
    throw new Error("Update failure");
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
      banned: !!user.banned,
      streakCount: user.streakCount || 0,
      badges: user.badges || [],
      achievements: user.achievements || [],
      notifications: user.notifications || []
    };
  },

  _updateLocalCache(user: User): void {
    const list = storageService.loadData<User[]>(storageKeys.players, []);
    const idx = list.findIndex(u => u.id === user.id);
    if (idx > -1) {
      list[idx] = user;
    } else {
      list.push(user);
    }
    storageService.saveData(storageKeys.players, list);

    const currentUser = storageService.loadData<User | null>(storageKeys.currentUser, null);
    if (currentUser && currentUser.id === user.id) {
      storageService.saveData(storageKeys.currentUser, user);
    }
  }
};
