import { supabase } from './supabaseClient';
import { storageKeys, storageService } from './storageService';

export interface BackupData {
  app: string;
  timestamp: string;
  schemaVersion: number;
  users: any[];
  marathons: any[];
  challenges: any[];
  submissions: any[];
  votes: any[];
  pointTransactions: any[];
  coachQuestions: any[];
  videoConsultations: any[];
  reports: any[];
  monthlyPlayerRecords: any[];
  availableSlots: any[];
  formulas?: any;
}

async function tryLoadFromSupabase(tableName: string): Promise<any[] | null> {
  try {
    const { data, error } = await supabase.from(tableName).select('*');

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    console.warn(`Could not load ${tableName} from Supabase:`, error);
    return null;
  }
}

export const backupService = {
  async exportFullBackup(): Promise<BackupData> {
    let users = storageService.loadData<any[]>(storageKeys.users, []);
    let marathons = storageService.loadData<any[]>(storageKeys.marathons, []);
    let challenges = storageService.loadData<any[]>(storageKeys.challenges, []);
    let submissions = storageService.loadData<any[]>(storageKeys.submissions, []);
    let votes = storageService.loadData<any[]>(storageKeys.votes, []);
    let pointTransactions = storageService.loadData<any[]>(
      storageKeys.pointTransactions,
      []
    );
    let coachQuestions = storageService.loadData<any[]>(
      storageKeys.coachQuestions,
      []
    );
    let videoConsultations = storageService.loadData<any[]>(
      storageKeys.videoConsultations,
      []
    );
    let reports = storageService.loadData<any[]>(storageKeys.reports, []);
    let monthlyPlayerRecords = storageService.loadData<any[]>(
      storageKeys.monthlyPlayerRecords,
      []
    );
    let availableSlots = storageService.loadData<any[]>(
      storageKeys.availableSlots,
      []
    );

    /**
     * თუ Supabase უკვე მზად არის, ვცდილობთ ბოლო ონლაინ მონაცემების წამოღებას.
     * თუ რომელიმე ცხრილი ჯერ არ არსებობს, backup მაინც შეიქმნება local cache-იდან.
     */
    const supabaseUsers = await tryLoadFromSupabase('players');
    const supabaseMarathons = await tryLoadFromSupabase('marathons');
    const supabaseChallenges = await tryLoadFromSupabase('challenges');
    const supabaseSubmissions = await tryLoadFromSupabase('submissions');
    const supabaseVotes = await tryLoadFromSupabase('votes');
    const supabasePointTransactions = await tryLoadFromSupabase(
      'point_transactions'
    );
    const supabaseCoachQuestions = await tryLoadFromSupabase('coach_questions');
    const supabaseVideoConsultations = await tryLoadFromSupabase(
      'video_consultations'
    );
    const supabaseReports = await tryLoadFromSupabase('reports');
    const supabaseMonthlyRecords = await tryLoadFromSupabase(
      'monthly_player_records'
    );
    const supabaseAvailableSlots = await tryLoadFromSupabase('available_slots');

    if (supabaseUsers) users = supabaseUsers;
    if (supabaseMarathons) marathons = supabaseMarathons;
    if (supabaseChallenges) challenges = supabaseChallenges;
    if (supabaseSubmissions) submissions = supabaseSubmissions;
    if (supabaseVotes) votes = supabaseVotes;
    if (supabasePointTransactions) pointTransactions = supabasePointTransactions;
    if (supabaseCoachQuestions) coachQuestions = supabaseCoachQuestions;
    if (supabaseVideoConsultations) {
      videoConsultations = supabaseVideoConsultations;
    }
    if (supabaseReports) reports = supabaseReports;
    if (supabaseMonthlyRecords) monthlyPlayerRecords = supabaseMonthlyRecords;
    if (supabaseAvailableSlots) availableSlots = supabaseAvailableSlots;

    return {
      app: 'Bifurcation Game',
      timestamp: new Date().toISOString(),
      schemaVersion: 2,
      users,
      marathons,
      challenges,
      submissions,
      votes,
      pointTransactions,
      coachQuestions,
      videoConsultations,
      reports,
      monthlyPlayerRecords,
      availableSlots,
    };
  },

  downloadJSONBackup(backupObj: BackupData): void {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(backupObj, null, 2)
    )}`;

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const timestampStr = `${now.getFullYear()}-${pad(
      now.getMonth() + 1
    )}-${pad(now.getDate())}-${pad(now.getHours())}-${pad(now.getMinutes())}`;

    const fileName = `bifurcation-backup-${timestampStr}.json`;

    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', fileName);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  },

  async restoreFromBackup(
    backupObj: any
  ): Promise<{ success: boolean; error?: string }> {
    if (!backupObj || backupObj.app !== 'Bifurcation Game') {
      return {
        success: false,
        error:
          'არასწორი ფაილის ფორმატი. გთხოვთ ატვირთოთ ვალიდური ბიფურკაციის backup ფაილი.',
      };
    }

    try {
      if (backupObj.users) {
        storageService.saveData(storageKeys.users, backupObj.users);
      }

      if (backupObj.marathons) {
        storageService.saveData(storageKeys.marathons, backupObj.marathons);
      }

      if (backupObj.challenges) {
        storageService.saveData(storageKeys.challenges, backupObj.challenges);
      }

      if (backupObj.submissions) {
        storageService.saveData(storageKeys.submissions, backupObj.submissions);
      }

      if (backupObj.votes) {
        storageService.saveData(storageKeys.votes, backupObj.votes);
      }

      if (backupObj.pointTransactions) {
        storageService.saveData(
          storageKeys.pointTransactions,
          backupObj.pointTransactions
        );
      }

      if (backupObj.coachQuestions) {
        storageService.saveData(
          storageKeys.coachQuestions,
          backupObj.coachQuestions
        );
      }

      if (backupObj.videoConsultations) {
        storageService.saveData(
          storageKeys.videoConsultations,
          backupObj.videoConsultations
        );
      }

      if (backupObj.reports) {
        storageService.saveData(storageKeys.reports, backupObj.reports);
      }

      if (backupObj.monthlyPlayerRecords) {
        storageService.saveData(
          storageKeys.monthlyPlayerRecords,
          backupObj.monthlyPlayerRecords
        );
      }

      if (backupObj.availableSlots) {
        storageService.saveData(
          storageKeys.availableSlots,
          backupObj.availableSlots
        );
      }

      /**
       * ამ ეტაპზე restore შეგნებულად წერს local cache-ში.
       * Supabase-ში მასობრივი restore უკეთესია გაკეთდეს Admin Panel-იდან ან SQL/import პროცესით,
       * რომ შემთხვევით ონლაინ მონაცემები არ გადაიწეროს.
       */
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || 'აღდგენის პროცესი ჩაიშალა.',
      };
    }
  },

  convertToCSV(array: any[]): string {
    if (!array || array.length === 0) return '';

    const headers = Object.keys(array[0]).join(',');

    const rows = array.map(row => {
      return Object.values(row)
        .map(value => {
          let text =
            typeof value === 'object' && value !== null
              ? JSON.stringify(value)
              : String(value ?? '');

          text = text.replace(/"/g, '""');

          return `"${text}"`;
        })
        .join(',');
    });

    return [headers, ...rows].join('\n');
  },

  downloadCSV(data: any[], title: string): void {
    const csvContent = this.convertToCSV(data);

    const blob = new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), csvContent], {
      type: 'text/csv;charset=utf-8;',
    });

    const url = URL.createObjectURL(blob);

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const timestampStr = `${now.getFullYear()}-${pad(
      now.getMonth() + 1
    )}-${pad(now.getDate())}`;

    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', url);
    downloadAnchor.setAttribute(
      'download',
      `bifurcation-${title}-${timestampStr}.csv`
    );

    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    URL.revokeObjectURL(url);
  },
};
