import { storageService, storageKeys } from "./storageService";

export interface BackupData {
  app: string;
  timestamp: string;
  schemaVersion: number;
  users: any[];
  marathons: any[];
  challengeProgress: any[];
  submissions: any[];
  pointTransactions: any[];
  consultations: any[];
  reports: any[];
  monthlyPlayerRecords: any[];
  formulas?: any;
}

export const backupService = {
  async exportFullBackup(): Promise<BackupData> {
    let users = storageService.loadData<any[]>(storageKeys.players, []);
    let marathons = storageService.loadData<any[]>(storageKeys.marathons, []);
    let challengeProgress = storageService.loadData<any[]>(storageKeys.challengeProgress, []);
    let submissions = storageService.loadData<any[]>(storageKeys.submissions, []);
    let pointTransactions = storageService.loadData<any[]>(storageKeys.pointTransactions, []);
    let consultations = storageService.loadData<any[]>(storageKeys.consultations, []);
    let reports = storageService.loadData<any[]>(storageKeys.reports, []);
    let monthlyPlayerRecords = storageService.loadData<any[]>(storageKeys.monthlyPlayerRecords, []);

    // Try to get fresh copy from server
    try {
      const res = await fetch("/api/state");
      if (res.ok) {
        const serverData = await res.json();
        // If server data exists, merge or prioritize it
        if (serverData.challenges) marathons = serverData.marathons || marathons;
        if (serverData.submissions) submissions = serverData.submissions || submissions;
        if (serverData.pointTransactions) pointTransactions = serverData.pointTransactions || pointTransactions;
        if (serverData.monthlyPlayerRecords) monthlyPlayerRecords = serverData.monthlyPlayerRecords || monthlyPlayerRecords;
        
        // Fetch all users list if admin
        const resUsers = await fetch("/api/leaderboard");
        if (resUsers.ok) {
          const lUsers = await resUsers.json();
          // Leaderboard provides subset, get complete database if admin endpoint works
          // Else use local cache
        }
      }
    } catch (e) {
      console.warn("Could not retrieve latest live server state, exporting from local cached persistence", e);
    }

    return {
      app: "Bifurcation Game",
      timestamp: new Date().toISOString(),
      schemaVersion: storageService.loadData<number>(storageKeys.schemaVersion, 1),
      users,
      marathons,
      challengeProgress,
      submissions,
      pointTransactions,
      consultations,
      reports,
      monthlyPlayerRecords
    };
  },

  downloadJSONBackup(backupObj: BackupData): void {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(backupObj, null, 2)
    )}`;
    
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const timestampStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}-${pad(now.getMinutes())}`;
    const fileName = `bifurcation-backup-${timestampStr}.json`;

    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", jsonString);
    downloadAnchor.setAttribute("download", fileName);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  },

  async restoreFromBackup(backupObj: any): Promise<{ success: boolean; error?: string }> {
    if (!backupObj || backupObj.app !== "Bifurcation Game") {
      return { success: false, error: "არასწორი ფაილის ფორმატი. გთხოვთ ატვირთოთ ვალიდური ბიფურკაციის ბექაპ ფაილი." };
    }

    try {
      // 1. Write to localStorage
      if (backupObj.users) storageService.saveData(storageKeys.players, backupObj.users);
      if (backupObj.marathons) storageService.saveData(storageKeys.marathons, backupObj.marathons);
      if (backupObj.challengeProgress) storageService.saveData(storageKeys.challengeProgress, backupObj.challengeProgress);
      if (backupObj.submissions) storageService.saveData(storageKeys.submissions, backupObj.submissions);
      if (backupObj.pointTransactions) storageService.saveData(storageKeys.pointTransactions, backupObj.pointTransactions);
      if (backupObj.consultations) storageService.saveData(storageKeys.consultations, backupObj.consultations);
      if (backupObj.reports) storageService.saveData(storageKeys.reports, backupObj.reports);
      if (backupObj.monthlyPlayerRecords) storageService.saveData(storageKeys.monthlyPlayerRecords, backupObj.monthlyPlayerRecords);
      if (backupObj.schemaVersion) storageService.saveData(storageKeys.schemaVersion, backupObj.schemaVersion);

      // Attempt to sync restoration on full-stack container server
      try {
        await fetch("/api/admin/restore", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(backupObj)
        });
      } catch (e) {
        console.warn("Could not sync restored data structure to backend container, synced offline locally instead:", e);
      }

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || "აღდგენის პროცესი ჩაიშალა." };
    }
  },

  convertToCSV(array: any[]): string {
    if (array.length === 0) return "";
    const headers = Object.keys(array[0]).join(",");
    const rows = array.map(row => {
      return Object.values(row).map(val => {
        let text = typeof val === "object" ? JSON.stringify(val) : String(val);
        text = text.replace(/"/g, '""'); // Escape inner quotes
        return `"${text}"`;
      }).join(",");
    });
    return [headers, ...rows].join("\n");
  },

  downloadCSV(data: any[], title: string): void {
    const csvContent = this.convertToCSV(data);
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: "text/csv;charset=utf-8;" }); // Support UTF-8 BOM for Georgian encoding
    const url = URL.createObjectURL(blob);
    
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const timestampStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", url);
    downloadAnchor.setAttribute("download", `bifurcation-${title}-${timestampStr}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }
};
