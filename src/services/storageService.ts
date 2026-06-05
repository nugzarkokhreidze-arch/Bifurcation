export const STORAGE_UPDATE_EVENT = 'bifurcation_storage_updated';

export const storageKeys = {
  users: 'bifurcation_users',
  currentUser: 'bifurcation_current_user',
  currentUserId: 'bifurcation_current_user_id',

  marathons: 'bifurcation_marathons',
  challenges: 'bifurcation_challenges',
  submissions: 'bifurcation_submissions',
  votes: 'bifurcation_votes',

  monthlyPlayerRecords: 'bifurcation_monthly_player_records',
  pointTransactions: 'bifurcation_point_transactions',

  reports: 'bifurcation_reports',
  coachQuestions: 'bifurcation_coach_questions',
  videoConsultations: 'bifurcation_video_consultations',
  availableSlots: 'bifurcation_available_slots',

  appState: 'bifurcation_app_state',
} as const;

type StorageKey = (typeof storageKeys)[keyof typeof storageKeys] | string;

function notifyStorageUpdate(key: StorageKey) {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(
    new CustomEvent(STORAGE_UPDATE_EVENT, {
      detail: { key },
    })
  );
}

export const storageService = {
  saveData<T>(key: StorageKey, data: T): void {
    if (typeof window === 'undefined') return;

    try {
      window.localStorage.setItem(key, JSON.stringify(data));

      /**
       * ძველი localStorage სახელების მხარდაჭერა.
       * ეს საჭიროა, თუ აპლიკაციის რომელიმე ძველი ნაწილი ამ სახელებს ჯერ კიდევ იყენებს.
       */
      if (key === storageKeys.monthlyPlayerRecords) {
        window.localStorage.setItem('bifurcation_monthly_records', JSON.stringify(data));
      }

      if (key === storageKeys.currentUser) {
        window.localStorage.setItem('bifurcation_session_user', JSON.stringify(data));
      }

      notifyStorageUpdate(key);
    } catch (error) {
      console.error(`Error saving key "${key}":`, error);
    }
  },

  loadData<T>(key: StorageKey, fallbackValue: T): T {
    if (typeof window === 'undefined') return fallbackValue;

    try {
      const raw = window.localStorage.getItem(key);

      if (!raw) {
        /**
         * ძველი localStorage სახელების მხარდაჭერა.
         */
        if (key === storageKeys.monthlyPlayerRecords) {
          const legacyMonthlyRecords = window.localStorage.getItem('bifurcation_monthly_records');
          return legacyMonthlyRecords ? (JSON.parse(legacyMonthlyRecords) as T) : fallbackValue;
        }

        if (key === storageKeys.currentUser) {
          const legacySessionUser = window.localStorage.getItem('bifurcation_session_user');
          return legacySessionUser ? (JSON.parse(legacySessionUser) as T) : fallbackValue;
        }

        return fallbackValue;
      }

      return JSON.parse(raw) as T;
    } catch (error) {
      console.error(`Error loading key "${key}":`, error);
      return fallbackValue;
    }
  },

  removeData(key: StorageKey): void {
    if (typeof window === 'undefined') return;

    try {
      window.localStorage.removeItem(key);

      if (key === storageKeys.monthlyPlayerRecords) {
        window.localStorage.removeItem('bifurcation_monthly_records');
      }

      if (key === storageKeys.currentUser) {
        window.localStorage.removeItem('bifurcation_session_user');
      }

      notifyStorageUpdate(key);
    } catch (error) {
      console.error(`Error removing key "${key}":`, error);
    }
  },

  clearAll(): void {
    if (typeof window === 'undefined') return;

    try {
      Object.values(storageKeys).forEach(key => {
        window.localStorage.removeItem(key);
      });

      window.localStorage.removeItem('bifurcation_monthly_records');
      window.localStorage.removeItem('bifurcation_session_user');

      notifyStorageUpdate('all');
    } catch (error) {
      console.error('Error clearing local storage:', error);
    }
  },

  subscribe(callback: () => void): () => void {
    if (typeof window === 'undefined') return () => {};

    window.addEventListener(STORAGE_UPDATE_EVENT, callback);

    return () => {
      window.removeEventListener(STORAGE_UPDATE_EVENT, callback);
    };
  },
};
