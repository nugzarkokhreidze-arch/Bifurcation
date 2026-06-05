// Add this custom event definition
export const STORAGE_UPDATE_EVENT = "bifurcation_storage_updated";

export const storageService = {
  saveData<T>(key: string, data: T): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(key, JSON.stringify(data));
      
      // Notify the app that storage changed
      window.dispatchEvent(new CustomEvent(STORAGE_UPDATE_EVENT, { detail: { key } }));

      // Keep your legacy logic
      if (key === storageKeys.monthlyPlayerRecords) {
        window.localStorage.setItem("bifurcation_monthly_records", JSON.stringify(data));
      }
      if (key === storageKeys.currentUser) {
        window.localStorage.setItem("bifurcation_session_user", JSON.stringify(data));
      }
    } catch (e) {
      console.error(`Error saving key ${key}:`, e);
    }
  },

  // ... loadData, removeData remain the same ...

  // Call this in your App.tsx useEffect to trigger a re-render globally
  subscribe(callback: () => void) {
    if (typeof window === "undefined") return () => {};
    window.addEventListener(STORAGE_UPDATE_EVENT, callback);
    return () => window.removeEventListener(STORAGE_UPDATE_EVENT, callback);
  }
};
