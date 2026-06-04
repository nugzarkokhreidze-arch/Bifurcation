import { Marathon, Challenge } from "../types";
import { storageService, storageKeys } from "./storageService";
import { initialMarathons, initialChallenges } from "@/seedData";

export const marathonService = {
  async getMarathons(): Promise<any[]> {
    let localMarathons = storageService.loadData<any[]>(storageKeys.marathons, []);
    
    const needsRegen = localMarathons.length === 0 || 
                       !localMarathons.some(m => m.id === "marathon-june" || m.id === "june") ||
                       localMarathons.some(m => !m.challenges || m.challenges.length === 0);

    if (needsRegen) {
      const rawFallbackList = initialMarathons.map(m => {
        const challs = initialChallenges.filter(c => c.marathonId === m.id).map(c => ({
          ...c,
          completionReward: c.completionReward || c.points || 20,
          points: c.completionReward || c.points || 20
        }));
        
        return {
          ...m,
          challenges: challs,
          challengeCount: challs.length
        };
      });

      // Also support raw month ids ("june", "july", "august", "september") to make legacy client code perfectly compatible
      const shortFallbackList = rawFallbackList.map(m => {
        const shortId = m.month || m.id.replace("marathon-", "");
        return {
          ...m,
          id: shortId,
          challenges: m.challenges.map(c => ({
            ...c,
            marathonId: shortId
          }))
        };
      });

      localMarathons = [...rawFallbackList, ...shortFallbackList];
      storageService.saveData(storageKeys.marathons, localMarathons);
    }
    return localMarathons;
  }
};
