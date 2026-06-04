import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "150mb" }));
app.use(express.urlencoded({ limit: "150mb", extended: true }));

// Path to file-based persistent database
const DB_PATH = path.resolve(process.cwd(), "db.json");

// Define basic default data
const defaultMarathon = {
  id: "m-1",
  title: "თვითშემეცნებისა და გამბედაობის პირველი მარათონი",
  title_en: "First Marathon of Self-Discovery & Courage",
  startDate: "2026-06-01",
  endDate: "2026-06-30",
  status: "active",
  rules: "თამაშში ჩართვა შეგიძლია ნებისმიერ დროს. გამოწვევების რიგითობა სავალდებულო არ არის. მთავარია, მარათონის დასრულებამდე შეძლო საკუთარი თავის გამოწვევა.",
  rules_en: "You can join the game at any time. The order of challenges is optional. The main thing is to challenge yourself before the marathon ends.",
  principles: "1. ნებაყოფლობითობა\n2. უსაფრთხოება\n3. პატივისცემა\n4. სიმამაცე\n5. შემოქმედებითობა\n6. პირადი სივრცე\n7. განვითარება\n8. პასუხისმგებლობა\n9. თანასწორობა\n10. პოზიტიური ენერგია",
  principles_en: "1. Voluntary Participation\n2. Safety\n3. Respect\n4. Courage\n5. Creativity\n6. Personal Space\n7. Personal Growth\n8. Responsibility\n9. Equality\n10. Positive Energy"
};

// Default challenges are imported from seedData to support the full 40-challenge multi-month marathon structure.

import { initialMarathons, initialAvailableSlots, initialChallenges } from "./seedData";

// Formulas state
const defaultFormulas = {
  standardChallengeCost: 20,
  startingBonus: 50,
  publicBraveryBonus: 15,
  likeBonusMultiplier: 5,
  viewerBonusMultiplier: 2,
};

// In-Memory Database State
let db = {
  users: [] as any[],
  challenges: [...initialChallenges] as any[],
  submissions: [] as any[],
  votes: [] as any[],
  reports: [] as any[],
  coachQuestions: [] as any[],
  videoConsultations: [] as any[],
  marathons: [...initialMarathons] as any[],
  monthlyPlayerRecords: [] as any[],
  pointTransactions: [] as any[],
  availableSlots: [...initialAvailableSlots] as any[],
  formulas: { ...defaultFormulas },
  marathon: { ...defaultMarathon }
};

// Load database helper
function loadDb() {
  try {
    if (fs.existsSync(DB_PATH)) {
      const content = fs.readFileSync(DB_PATH, "utf-8");
      const loaded = JSON.parse(content);
      db = {
        users: loaded.users || [],
        challenges: (loaded.challenges && loaded.challenges.length > 10) ? loaded.challenges : [...initialChallenges],
        submissions: loaded.submissions || [],
        votes: loaded.votes || [],
        reports: loaded.reports || [],
        coachQuestions: loaded.coachQuestions || [],
        videoConsultations: loaded.videoConsultations || [],
        marathons: loaded.marathons || [...initialMarathons],
        monthlyPlayerRecords: loaded.monthlyPlayerRecords || [],
        pointTransactions: loaded.pointTransactions || [],
        availableSlots: loaded.availableSlots || [...initialAvailableSlots],
        formulas: loaded.formulas || { ...defaultFormulas },
        marathon: loaded.marathon || { ...defaultMarathon }
      };
      
      // Assure at least one admin exists
      if (db.users.length === 0 || !db.users.find(u => u.isAdmin)) {
        const defaultAdmin = {
          id: "admin-1",
          firstName: "ადმინისტრატორი",
          lastName: "ბიფურკაცია",
          email: "admin@bifurcation.ge",
          phone: "555111222",
          nickname: "მეგზური_ადმინი",
          passwordHash: "admin123",
          points: 1000,
          avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop",
          fictionalNameEnabled: true,
          status: "active",
          consentAccepted: true,
          consentDate: "2026-06-01T12:00:00Z",
          completedChallenges: [],
          hiddenChallenges: [],
          publicChallenges: [],
          skippedChallenges: [],
          votesReceived: 0,
          braveryBonuses: 0,
          coachQuestionsRemaining: 3,
          videoCallAvailable: true,
          banned: false,
          isAdmin: true
        };
        db.users.push(defaultAdmin);
      }
    } else {
      // Seed initial data
      db.users = [{
        id: "admin-1",
        firstName: "ადმინისტრატორი",
        lastName: "ბიფურკაცია",
        email: "admin@bifurcation.ge",
        phone: "555111222",
        nickname: "მეგზური_ადმინი",
        passwordHash: "admin123",
        points: 1000,
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop",
        fictionalNameEnabled: true,
        status: "active",
        consentAccepted: true,
        consentDate: "2026-06-01T12:00:00Z",
        completedChallenges: [],
        hiddenChallenges: [],
        publicChallenges: [],
        skippedChallenges: [],
        votesReceived: 0,
        braveryBonuses: 0,
        coachQuestionsRemaining: 3,
        videoCallAvailable: true,
        banned: false,
        isAdmin: true
      }];
      saveDb();
    }
  } catch (error) {
    console.error("Error loading DB file, using default state:", error);
  }
}

function saveDb() {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
  } catch (error) {
    console.error("Error saving DB file:", error);
  }
}

// Initial DB load
loadDb();

// Lazy Gemini client helper
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    try {
      aiClient = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    } catch (e) {
      console.error("Failed to initialize GoogleGenAI client:", e);
    }
  }
  return aiClient;
}

// GAMIFICATION ENGINE & STREAKS HELPERS
function updateStreak(user: any) {
  if (user.streakCount === undefined) user.streakCount = 0;
  if (!user.notifications) user.notifications = [];
  if (!user.lastActiveDate) {
    user.lastActiveDate = new Date().toISOString().split("T")[0];
    user.streakCount = 1;
    return;
  }

  const todayStr = new Date().toISOString().split("T")[0];
  const lastActiveStr = user.lastActiveDate;

  if (todayStr === lastActiveStr) {
    return; // Already active today
  }

  const lastActiveDateObj = new Date(lastActiveStr);
  const todayDateObj = new Date(todayStr);
  const diffTime = Math.abs(todayDateObj.getTime() - lastActiveDateObj.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 1) {
    user.streakCount += 1;
    user.notifications.unshift({
      id: "streak-" + Math.random().toString(36).substr(2, 9),
      message: `🔥 შესანიშნავია! თქვენი აქტივობის სერია გაიზარდა ${user.streakCount} დღემდე! ყოველი დღე წინგადადგმული ნაბიჯია!`,
      read: false,
      createdAt: new Date().toISOString()
    });
  } else if (diffDays > 1) {
    user.streakCount = 1; // Streak broken, restart
  }
  user.lastActiveDate = todayStr;
}

function evaluateGamification(user: any, submissions: any[], challenges: any[]) {
  if (!user.badges) user.badges = [];
  if (!user.achievements) user.achievements = [];
  if (!user.notifications) user.notifications = [];
  if (user.streakCount === undefined) user.streakCount = 0;

  const userSubs = submissions.filter(s => s.playerId === user.id);
  const completedCount = userSubs.length;

  const newBadges = [...user.badges];
  const newAchievements = [...user.achievements];
  const addedNotifications: any[] = [];

  const addBadge = (id: string, label: string, desc: string) => {
    if (!newBadges.includes(id)) {
      newBadges.push(id);
      addedNotifications.push({
        id: "badge-" + Math.random().toString(36).substr(2, 9),
        message: `🏅 გილოცავთ! თქვენ დაიმსახურეთ ახალი ბეიჯი: "${label}" (${desc})!`,
        read: false,
        createdAt: new Date().toISOString()
      });
    }
  };

  const addAchievement = (id: string, label: string, desc: string) => {
    if (!newAchievements.includes(id)) {
      newAchievements.push(id);
      addedNotifications.push({
        id: "ach-" + Math.random().toString(36).substr(2, 9),
        message: `🏆 გილოცავთ! შენ განბლოკე მიღწევა: "${label}" (${desc})!`,
        read: false,
        createdAt: new Date().toISOString()
      });
    }
  };

  // 1. Badge: Courageous Communicator (ხავერდოვანი კომუნიკატორი) - completing video submissions (communicating/storytelling)
  const videoSubsCount = userSubs.filter(s => {
    const ch = challenges.find(c => c.id === s.challengeId);
    return ch && ch.submissionType === "video";
  }).length;
  if (videoSubsCount >= 1) {
    addBadge("courageous_communicator", "ხავერდოვანი კომუნიკატორი", "ვიდეო და კომუნიკაციური გამოწვევის წარმატებით ჩაბარება");
  }

  // 2. Badge: Creative Explorer (კრეატიული მაძიებელი) - complex or medium/hard tasks
  const creativeSubsCount = userSubs.filter(s => {
    const ch = challenges.find(c => c.id === s.challengeId);
    return ch && (ch.difficulty === "medium" || ch.difficulty === "hard");
  }).length;
  if (creativeSubsCount >= 1) {
    addBadge("creative_explorer", "კრეატიული მაძიებელი", "საშუალო ან რთული სირთულის გამოწვევის დაძლევა");
  }

  // 3. Badge: Reflection Master (ფიქრის ოსტატი) - reflection submission type
  const reflectionSubsCount = userSubs.filter(s => {
    const ch = challenges.find(c => c.id === s.challengeId);
    return ch && ch.submissionType === "reflection";
  }).length;
  if (reflectionSubsCount >= 1) {
    addBadge("reflection_master", "ფიქრის ოსტატი", "რეფლექსიური გამოწვევის ჩაბარება და საკუთარ თავზე დაკვირვება");
  }

  // Achievements (Milestones)
  if (completedCount >= 1) {
    addAchievement("first_step", "პირველი ნაბიჯი (First Step)", "პირველი გამოწვევის წარმატებით დასრულება");
  }
  if (completedCount >= 3) {
    addAchievement("rising_star", "ამომავალი ვარსკვლავი (Rising Star)", "3 სხვადასხვა გამოწვევის დაძლევა");
  }
  if (completedCount >= 5) {
    addAchievement("fearless_champion", "შიშის დამმარცხებელი ჩემპიონი (Fearless Trailblazer)", "5-ზე მეტი გამოწვევის ხაზზე შესრულება");
  }

  // Votes Achievements
  const totalVotes = user.votesReceived || 0;
  if (totalVotes >= 1) {
    addAchievement("popular_vibe", "ხალხის რეზონანსი (Popular Vibe)", "თქვენმა აქტივობამ მიიღო პირველი დადებითი შეფასება სხვა მოთამაშისგან");
  }
  if (totalVotes >= 5) {
    addAchievement("social_magnet", "სოციალური მაგნიტი (Social Magnet)", "თქვენმა აქტივობებმა ჯამში 5-ზე მეტი დადებითი შეფასება დაიმსახურა");
  }

  // Streak Achievements
  if (user.streakCount >= 3) {
    addAchievement("streak_beginner", "თანმიმდევრული მოთამაშე", "3-დღიანი უწყვეტი აქტივობის სერიის შენარჩუნება");
  }
  if (user.streakCount >= 7) {
    addAchievement("streak_master", "მარათონის დომინატორი", "7-დღიანი უწყვეტი აქტივობის სერიის შენარჩუნება");
  }

  user.badges = newBadges;
  user.achievements = newAchievements;
  user.notifications = [...addedNotifications, ...user.notifications];
}

// REST endpoints
// 1. STATE & CORE DETAILS
// HELPER: GET OR CREATE PLAYER
function getOrCreatePlayer(playerId: string) {
  let player = db.users.find(u => u.id === playerId);
  if (!player) {
    player = {
      id: playerId,
      firstName: "მოთამაშე",
      lastName: "Bifurcation",
      email: `${playerId}@bifurcation.ge`,
      phone: "555000000",
      nickname: `მოთამაშე_${playerId.split("-")[1] || Math.random().toString(36).substring(2, 7)}`,
      passwordHash: "pass123",
      points: 100,
      avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(playerId)}`,
      fictionalNameEnabled: true,
      status: "active",
      consentAccepted: true,
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
      badges: [],
      achievements: []
    };
    db.users.push(player);
    saveDb();
  }
  return player;
}

// HELPER: GET OR CREATE MONTHLY RECORD
function getOrCreateRecord(playerId: string, marathonId: string) {
  let record = db.monthlyPlayerRecords.find(r => r.playerId === playerId && r.marathonId === marathonId);
  if (!record) {
    record = {
      id: `record-${playerId}-${marathonId}`,
      playerId,
      marathonId,
      participationConfirmed: false,
      startingBonusGiven: false,
      startingBonusAmount: db.formulas?.startingBonus || 50,
      points: 0,
      acceptedChallenges: [],
      skippedChallenges: [],
      completedChallenges: [],
      acceptedDates: {},
      publicVideos: [],
      hiddenVideos: [],
      uniqueViewers: 0,
      likes: 0,
      rankingPosition: 0,
      pointHistory: [],
      coachQuestionsUsed: 0,
      videoConsultationUsed: 0
    };
    db.monthlyPlayerRecords.push(record);
  }
  return record;
}

// HELPER: WRITE POINTS TRANSACTION
function addTransaction(playerId: string, marathonId: string, type: string, amount: number, isDeduction: boolean, descKa: string, descEn: string) {
  const player = getOrCreatePlayer(playerId);

  const record = getOrCreateRecord(playerId, marathonId);
  const transactionId = "tx-" + Math.random().toString(36).substr(2, 9);

  if (isDeduction) {
    player.points = Math.max(0, player.points - amount);
    record.points = Math.max(0, record.points - amount);
  } else {
    player.points += amount;
    record.points += amount;
  }

  const newTx = {
    id: transactionId,
    playerId,
    marathonId,
    type,
    description_ka: descKa,
    description_en: descEn,
    pointsAdded: isDeduction ? 0 : amount,
    pointsDeducted: isDeduction ? amount : 0,
    balanceAfter: player.points,
    createdAt: new Date().toISOString()
  };

  db.pointTransactions.push(newTx);
  if (!record.pointHistory) record.pointHistory = [];
  record.pointHistory.push(newTx);
}

// REST endpoints
// 1. STATE & CORE DETAILS
app.get("/api/state", (req, res) => {
  const enrichedSubmissions = db.submissions.map(sub => {
    const player = db.users.find(u => u.id === sub.playerId);
    const challenge = db.challenges.find(c => c.id === sub.challengeId);
    
    const url = sub.videoUrl || "";
    let detectedType = sub.submissionType;
    if (!detectedType) {
      if (url.startsWith("data:image/") || url.endsWith(".png") || url.endsWith(".jpg") || url.endsWith(".jpeg") || url.includes("images.unsplash.com")) {
        detectedType = "photo";
      } else if (url.startsWith("data:audio/") || url.endsWith(".mp3") || url.endsWith(".wav") || url.includes("audio")) {
        detectedType = "audio";
      } else {
        detectedType = "video";
      }
    }

    return {
      ...sub,
      playerNickname: player ? player.nickname : "უცნობი",
      playerAvatar: player ? player.avatar : "",
      challengeTitle: challenge ? challenge.title : "წაშლილი გამოწვევა",
      fileUrl: sub.videoUrl,
      submissionType: detectedType
    };
  });

  const enrichedMarathons = db.marathons.map(m => {
    const marathonChalls = db.challenges.filter(c => c.marathonId === m.id && c.status !== "archived");
    return {
      ...m,
      challenges: marathonChalls,
      challengeCount: marathonChalls.length
    };
  });

  res.json({
    marathon: db.marathon,
    marathons: enrichedMarathons,
    players: db.users.map(u => ({ ...u, passwordHash: undefined })),
    monthlyPlayerRecords: db.monthlyPlayerRecords,
    pointTransactions: db.pointTransactions,
    availableSlots: db.availableSlots,
    formulas: db.formulas,
    challenges: db.challenges.filter(c => c.status !== "archived"),
    submissions: enrichedSubmissions,
    videoConsultationsCount: db.videoConsultations.length,
    coachQuestionsCount: db.coachQuestions.length
  });
});

app.post("/api/admin/marathon", (req, res) => {
  const { title, startDate, endDate, rules, principles } = req.body;
  db.marathon = {
    ...db.marathon,
    title: title || db.marathon.title,
    startDate: startDate || db.marathon.startDate,
    endDate: endDate || db.marathon.endDate,
    rules: rules || db.marathon.rules,
    principles: principles || db.marathon.principles
  };
  saveDb();
  res.json({ success: true, marathon: db.marathon });
});

// MARATHON LIST REST API
app.get("/api/marathons", (req, res) => {
  const result = db.marathons.map(m => {
    const marathonChalls = db.challenges.filter(c => c.marathonId === m.id && c.status !== "archived");
    return {
      ...m,
      challenges: marathonChalls,
      challengeCount: marathonChalls.length
    };
  });
  res.json(result);
});

// JOIN / PARTICIPATE IN MONTHLY MARATHON
app.post("/api/marathons/:id/join", (req, res) => {
  const { playerId } = req.body;
  const marathonId = req.params.id;

  const player = getOrCreatePlayer(playerId);
  const marathon = db.marathons.find(m => m.id === marathonId);

  if (!marathon) {
    return res.status(404).json({ error: "მარათონი ვერ მოიძებნა" });
  }

  // Check deadline
  if (new Date() > new Date(marathon.endDate)) {
    return res.status(400).json({ error: "ამ მარათონში მონაწილეობის მიღება შეუძლებელია, რადგან ვადა ამოიწურა." });
  }

  const record = getOrCreateRecord(playerId, marathonId);

  if (record.participationConfirmed) {
    return res.json({ success: true, message: "თქვენ უკვე მონაწილეობთ ამ მარათონში.", record, user: player });
  }

  record.participationConfirmed = true;

  // Award starting bonus
  const bonusAmount = db.formulas?.startingBonus || 50;
  if (!record.startingBonusGiven) {
    record.startingBonusGiven = true;
    addTransaction(
      playerId,
      marathonId,
      "starting_bonus",
      bonusAmount,
      false,
      `სასტარტო ბონუსი ${marathon.title_ka}-სთვის`,
      `Starting bonus for ${marathon.title_en}`
    );
  }

  saveDb();
  res.json({ success: true, record, user: player });
});

// ACCEPT CHALLENGE API
app.post("/api/challenges/:id/accept", (req, res) => {
  const { playerId, marathonId } = req.body;
  const challengeId = req.params.id;

  const player = getOrCreatePlayer(playerId);
  const challenge = db.challenges.find(c => c.id === challengeId);

  if (!challenge) {
    return res.status(404).json({ error: "გამოწვევა ვერ მოიძებნა" });
  }

  const mId = marathonId || challenge.marathonId || "marathon-june";
  const record = getOrCreateRecord(playerId, mId);

  if (record.acceptedChallenges.includes(challengeId) || record.completedChallenges.includes(challengeId)) {
    return res.status(400).json({ error: "თქვენ უკვე მიღებული ან შესრულებული გაქვთ ეს გამოწვევა." });
  }

  // Enforce single active challenge
  const activeChallenges = record.acceptedChallenges.filter(chId => 
    !record.completedChallenges.includes(chId) && !record.skippedChallenges.includes(chId)
  );

  if (activeChallenges.length > 0) {
    return res.status(400).json({ error: "ჯერ უნდა დაასრულოთ ან გამოტოვოთ თქვენი მიმდინარე აქტიური გამოწვევა." });
  }

  const cost = challenge.acceptanceCost !== undefined ? challenge.acceptanceCost : (challenge.challengeCost || 0);

  if (player.points < cost) {
    return res.status(400).json({ error: `არ გაქვთ საკმარისი ქულები ამ გამოწვევის მისაღებად (საჭიროა ${cost} ქულა).` });
  }

  addTransaction(
    playerId,
    mId,
    "accept_challenge",
    cost,
    true,
    `გამოწვევის მიღება: "${challenge.title}"`,
    `Accepting challenge: "${challenge.title_en || challenge.title}"`
  );

  record.acceptedChallenges.push(challengeId);
  if (!record.acceptedDates) {
    record.acceptedDates = {};
  }
  record.acceptedDates[challengeId] = new Date().toISOString();
  saveDb();

  res.json({ success: true, record, user: player });
});

// LEADERBOARD BY TIMEFRAME
app.get("/api/leaderboards/:timeframe", (req, res) => {
  const { timeframe } = req.params; // 'marathon-june' or 'overall'
  
  if (timeframe === "overall") {
    const playerSummaries: { [key: string]: any } = {};

    db.monthlyPlayerRecords.forEach(rec => {
      const p = db.users.find(u => u.id === rec.playerId);
      if (!p) return;

      if (!playerSummaries[rec.playerId]) {
        playerSummaries[rec.playerId] = {
          id: p.id,
          nickname: p.nickname,
          avatar: p.avatar,
          firstName: p.firstName,
          lastName: p.lastName,
          fictionalNameEnabled: p.fictionalNameEnabled,
          points: 0,
          completedChallengesCount: 0,
          uniqueViewers: 0,
          likes: 0,
          publicVideosCount: 0
        };
      }

      const summary = playerSummaries[rec.playerId];
      summary.points += rec.points;
      summary.completedChallengesCount += rec.completedChallenges.length;
      summary.uniqueViewers += rec.uniqueViewers || 0;
      summary.likes += rec.likes || 0;
      summary.publicVideosCount += rec.publicVideos.length;
    });

    db.users.forEach(p => {
      if (!playerSummaries[p.id] && !p.isAdmin) {
        playerSummaries[p.id] = {
          id: p.id,
          nickname: p.nickname,
          avatar: p.avatar,
          firstName: p.firstName,
          lastName: p.lastName,
          fictionalNameEnabled: p.fictionalNameEnabled,
          points: p.points || 0,
          completedChallengesCount: p.completedChallenges?.length || 0,
          uniqueViewers: 0,
          likes: p.votesReceived || 0,
          publicVideosCount: p.publicChallenges?.length || 0
        };
      }
    });

    const list = Object.values(playerSummaries);

    list.sort((a: any, b: any) => {
      if (b.completedChallengesCount !== a.completedChallengesCount) {
        return b.completedChallengesCount - a.completedChallengesCount;
      }
      if (b.uniqueViewers !== a.uniqueViewers) {
        return b.uniqueViewers - a.uniqueViewers;
      }
      if (b.likes !== a.likes) {
        return b.likes - a.likes;
      }
      if (b.publicVideosCount !== a.publicVideosCount) {
        return b.publicVideosCount - a.publicVideosCount;
      }
      return b.points - a.points;
    });

    list.forEach((entry: any, idx) => {
      entry.rankingPosition = idx + 1;
    });

    return res.json(list);
  } else {
    const marathon = db.marathons.find(m => m.id === timeframe);
    if (!marathon) {
      return res.status(404).json({ error: "მარათონი ვერ მოიძებნა" });
    }

    const records = db.monthlyPlayerRecords.filter(r => r.marathonId === timeframe && r.participationConfirmed);
    const resultList = records.map(rec => {
      const p = db.users.find(u => u.id === rec.playerId);
      return {
        id: rec.playerId,
        nickname: p ? p.nickname : "უცნობი",
        avatar: p ? p.avatar : "",
        firstName: p ? p.firstName : "",
        lastName: p ? p.lastName : "",
        fictionalNameEnabled: p ? p.fictionalNameEnabled : true,
        points: rec.points,
        completedChallengesCount: rec.completedChallenges.length,
        uniqueViewers: rec.uniqueViewers || 0,
        likes: rec.likes || 0,
        publicVideosCount: rec.publicVideos.length
      };
    });

    db.users.forEach(p => {
      if (!p.isAdmin && !resultList.find(r => r.id === p.id)) {
        resultList.push({
          id: p.id,
          nickname: p.nickname,
          avatar: p.avatar,
          firstName: p.firstName,
          lastName: p.lastName,
          fictionalNameEnabled: p.fictionalNameEnabled,
          points: 0,
          completedChallengesCount: 0,
          uniqueViewers: 0,
          likes: 0,
          publicVideosCount: 0
        });
      }
    });

    resultList.sort((a: any, b: any) => {
      if (b.completedChallengesCount !== a.completedChallengesCount) {
        return b.completedChallengesCount - a.completedChallengesCount;
      }
      if (b.uniqueViewers !== a.uniqueViewers) {
        return b.uniqueViewers - a.uniqueViewers;
      }
      if (b.likes !== a.likes) {
        return b.likes - a.likes;
      }
      if (b.publicVideosCount !== a.publicVideosCount) {
        return b.publicVideosCount - a.publicVideosCount;
      }
      return b.points - a.points;
    });

    resultList.forEach((entry: any, idx) => {
      entry.rankingPosition = idx + 1;
    });

    res.json(resultList);
  }
});

// CALENDAR APIS
app.get("/api/coach/slots", (req, res) => {
  res.json(db.availableSlots || []);
});

app.post("/api/coach/slots", (req, res) => {
  const { date, time } = req.body;
  if (!date || !time) return res.status(400).json({ error: "მიუთითეთ თარიღი და დრო" });

  const slotId = "slot-" + Math.random().toString(36).substr(2, 9);
  const newSlot = { id: slotId, date, time, status: "available" };
  if (!db.availableSlots) db.availableSlots = [];
  db.availableSlots.push(newSlot);
  saveDb();
  res.json({ success: true, slot: newSlot });
});

app.post("/api/coach/slots/:id/book", (req, res) => {
  const { playerId } = req.body;
  const slotId = req.params.id;

  if (!db.availableSlots) db.availableSlots = [];
  const slot = db.availableSlots.find(s => s.id === slotId);
  const player = db.users.find(u => u.id === playerId);

  if (!slot || !player) return res.status(404).json({ error: "დროის სლოტი ან მოთამაშე ვერ მოიძებნა" });
  if (slot.status !== "available") return res.status(400).json({ error: "ეს სლოტი უკვე დაჯავშნილია" });

  const cost = 15; // 3/4 of standard 20pt challenge cost
  if (player.points < cost) {
    return res.status(400).json({ error: `არ გაქვთ საკმარისი ქულები (საჭიროა ${cost} ქულა ყოველი ვიდეო ზარისთვის).` });
  }

  const activeMar = db.marathons.find(m => m.status === "active") || db.marathons[0];
  addTransaction(
    playerId,
    activeMar.id,
    "video_consultation",
    cost,
    true,
    `ვიდეო კონსულტაციის დაჯავშნა: ${slot.date} ${slot.time}`,
    `Video consultation booked: ${slot.date} ${slot.time}`
  );

  slot.status = "booked";
  slot.bookedByPlayerId = playerId;
  slot.bookedByNickname = player.nickname;

  const conId = "con-" + Math.random().toString(36).substr(2, 9);
  const consultation = {
    id: conId,
    playerId,
    slotId,
    status: "scheduled",
    requestedAt: new Date().toISOString(),
    scheduledAt: `${slot.date}T${slot.time}:00`,
    meetingLink: "https://meet.google.com/abc-defg-hij",
    duration: 15,
    cost
  };

  db.videoConsultations.push(consultation);
  saveDb();

  res.json({ success: true, slot, consultation, user: player });
});

// FORMULAS APIS
app.get("/api/admin/formulas", (req, res) => {
  res.json(db.formulas || defaultFormulas);
});

app.post("/api/admin/formulas", (req, res) => {
  const { standardChallengeCost, startingBonus, publicBraveryBonus } = req.body;
  
  db.formulas = {
    standardChallengeCost: Number(standardChallengeCost) || db.formulas.standardChallengeCost || 20,
    startingBonus: Number(startingBonus) || db.formulas.startingBonus || 50,
    publicBraveryBonus: Number(publicBraveryBonus) || db.formulas.publicBraveryBonus || 15,
    likeBonusMultiplier: 5,
    viewerBonusMultiplier: 2
  };
  saveDb();
  res.json({ success: true, formulas: db.formulas });
});

// ADMIN MARATHON LIFECYCLE
app.get("/api/admin/marathons", (req, res) => {
  const result = db.marathons.map(m => {
    const marathonChalls = db.challenges.filter(c => c.marathonId === m.id && c.status !== "archived");
    return {
      ...m,
      challenges: marathonChalls,
      challengeCount: marathonChalls.length
    };
  });
  res.json(result);
});

app.post("/api/admin/marathons/create", (req, res) => {
  const { month, title_ka, title_en, startDate, endDate } = req.body;
  if (!month || !title_ka || !startDate || !endDate) {
    return res.status(400).json({ error: "შეავსეთ სავალდებულო ველები" });
  }

  const newMarathon = {
    id: "marathon-" + Math.random().toString(36).substr(2, 9),
    month,
    title_ka,
    title_en: title_en || title_ka,
    startDate,
    endDate,
    timezone: "Asia/Tbilisi",
    status: "upcoming" as const,
    challenges: [],
    aiGenerated: false,
    approvedByAdmin: true,
    createdAt: new Date().toISOString()
  };

  db.marathons.push(newMarathon);
  saveDb();
  res.json({ success: true, marathon: newMarathon });
});

app.post("/api/admin/marathons/:id/close", (req, res) => {
  const marathon = db.marathons.find(m => m.id === req.params.id);
  if (!marathon) return res.status(404).json({ error: "მარათონი ვერ მოიძებნა" });

  marathon.status = "closed";

  const records = db.monthlyPlayerRecords.filter(r => r.marathonId === marathon.id && r.participationConfirmed);
  
  if (records.length > 0) {
    const sorted = [...records].sort((a, b) => {
      if (b.completedChallenges.length !== a.completedChallenges.length) {
        return b.completedChallenges.length - a.completedChallenges.length;
      }
      if (b.uniqueViewers !== a.uniqueViewers) {
        return b.uniqueViewers - a.uniqueViewers;
      }
      if (b.likes !== a.likes) {
        return b.likes - a.likes;
      }
      if (b.publicVideos.length !== a.publicVideos.length) {
        return b.publicVideos.length - a.publicVideos.length;
      }
      return b.points - a.points;
    });

    const winnerRecord = sorted[0];
    const winnerPlayer = db.users.find(u => u.id === winnerRecord.playerId);
    if (winnerPlayer) {
      marathon.winnerNickname = winnerPlayer.nickname;
      marathon.winnerId = winnerPlayer.id;
      marathon.winnerPoints = winnerRecord.points;
      marathon.winnerChallengesCount = winnerRecord.completedChallenges.length;
    }
  }

  saveDb();
  res.json({ success: true, marathon });
});

// AUTH SYSTEM
app.post("/api/auth/register", (req, res) => {
  const { firstName, lastName, email, phone, nickname, password, fictionalNameEnabled, avatar, consentAccepted } = req.body;

  if (!email || !nickname || !password) {
    return res.status(400).json({ error: "გთხოვთ შეავსოთ სავალდებულო ველები (ელფოსტა, სახელი და პაროლი)." });
  }

  const existing = db.users.find(u => u.email === email || u.nickname === nickname);
  if (existing) {
    return res.status(400).json({ error: "მოცემული ელფოსტა ან მომხმარებლის სახელი უკვე დაკავებულია." });
  }

  const newUser = {
    id: "usr-" + Math.random().toString(36).substr(2, 9),
    firstName,
    lastName,
    email,
    phone: phone || "",
    nickname,
    passwordHash: password, // Store plainly for demo
    avatar: avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(nickname)}`,
    fictionalNameEnabled: !!fictionalNameEnabled,
    points: 100, // starting gift points
    status: "active",
    consentAccepted: !!consentAccepted,
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

  db.users.push(newUser);
  saveDb();

  res.json({ success: true, user: newUser });
});

app.post("/api/auth/login", (req, res) => {
  const { identifier, password } = req.body; // identifier can be email, phone or nickname
  if (!identifier || !password) {
    return res.status(400).json({ error: "გთხოვთ შეიყვანოთ მომხმარებელი და პაროლი." });
  }

  const user = db.users.find(u => 
    (u.email === identifier || u.phone === identifier || u.nickname === identifier) && 
    u.passwordHash === password
  );

  if (!user) {
    return res.status(401).json({ error: "არასწორი მონაცემები. გთხოვთ სცადოთ თავიდან." });
  }

  if (user.banned) {
    return res.status(403).json({ error: `თქვენი პროფილი დაბლოკილია ადმინისტრატორის მიერ: ${user.banReason || 'წესების მძიმე დარღვევა.'}` });
  }

  // Update gameplay metrics on login
  updateStreak(user);
  evaluateGamification(user, db.submissions, db.challenges);
  
  if (!user.notifications) user.notifications = [];
  user.notifications.push({
    id: "welcome-back-" + Date.now(),
    message: `👋 მოგესალმებით, @${user.nickname}! სასიამოვნოა თქვენი დაბრუნება კაბინეტში. მზად ხართ ახალი გამოწვევებისთვის?`,
    read: false,
    createdAt: new Date().toISOString()
  });

  saveDb();

  res.json({ success: true, user });
});

// USER CABINET / PROFILE UPDATES
app.get("/api/users/:id", (req, res) => {
  const user = getOrCreatePlayer(req.params.id);
  res.json(user);
});

app.post("/api/users/:id/notifications/read-all", (req, res) => {
  const user = getOrCreatePlayer(req.params.id);
  if (user.notifications) {
    user.notifications.forEach((n: any) => n.read = true);
  }
  saveDb();
  res.json({ success: true, user });
});

app.get("/api/leaderboard", (req, res) => {
  // Return clean list of non-banned users with public points
  const board = db.users
    .filter(u => !u.banned)
    .map(u => ({
      id: u.id,
      nickname: u.nickname,
      avatar: u.avatar,
      points: u.points,
      completedCount: u.completedChallenges.length,
      publicCount: u.publicChallenges.length,
      votesReceived: u.votesReceived,
      braveryBonuses: u.braveryBonuses,
      isAdmin: !!u.isAdmin
    }))
    .sort((a, b) => b.points - a.points);
  res.json(board);
});

app.put("/api/users/:id", (req, res) => {
  const user = db.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: "მომხმარებელი ვერ მოიძებნა" });

  const { firstName, lastName, nickname, avatar, phone, fictionalNameEnabled } = req.body;
  if (firstName) user.firstName = firstName;
  if (lastName) user.lastName = lastName;
  if (nickname) {
    const dupe = db.users.find(u => u.nickname === nickname && u.id !== user.id);
    if (!dupe) user.nickname = nickname;
  }
  if (avatar) user.avatar = avatar;
  if (phone !== undefined) user.phone = phone;
  if (fictionalNameEnabled !== undefined) user.fictionalNameEnabled = !!fictionalNameEnabled;

  saveDb();
  res.json({ success: true, user });
});

app.post("/api/users/:id/leave", (req, res) => {
  const user = db.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: "მომხმარებელი ვერ მოიძებნა" });
  
  // Set points to 0, mark as suspended
  user.status = "suspended";
  user.points = 0;
  saveDb();
  res.json({ success: true, message: "თქვენ წარმატებით დატოვეთ თამაში." });
});

// CHALLENGE SYSTEM
app.get("/api/challenges", (req, res) => {
  res.json(db.challenges);
});

app.post("/api/challenges/propose", (req, res) => {
  const { title, description, difficulty, emotionalCourageLevel, submissionType, safetyRules, playerId, playerNickname } = req.body;

  if (!title || !description || !playerId) {
    return res.status(400).json({ error: "გთხოვთ შეავსოთ სავალდებულო ველები (სათაური და აღწერა)." });
  }

  const challengeId = "ch-proposed-" + Math.random().toString(36).substr(2, 9);
  const newChallenge = {
    id: challengeId,
    title,
    description,
    fullInstructions: `ინსტრუქცია: ${description}`,
    safetyRules: safetyRules || "გამოწვევა უნდა შესრულდეს აბსოლუტურად უსაფრთხო გარემოში, სხვების შევიწროებისა და საკუთარი თავის საფრთხეში ჩაგდების გარეშე.",
    difficulty: difficulty || "easy",
    emotionalCourageLevel: Number(emotionalCourageLevel) || 1,
    challengeCost: difficulty === "hard" ? 25 : difficulty === "medium" ? 15 : 10,
    completionReward: difficulty === "hard" ? 50 : difficulty === "medium" ? 30 : 20,
    publicBraveryBonus: difficulty === "hard" ? 20 : difficulty === "medium" ? 15 : 10,
    submissionType: submissionType || "video",
    status: "pending",
    aiGenerated: false,
    approvedByAdmin: false,
    proposedByPlayerId: playerId,
    proposedByPlayerNickname: playerNickname || "მოთამაშე"
  };

  db.challenges.push(newChallenge);
  saveDb();

  res.json({ success: true, challenge: newChallenge });
});

// AI CHALLENGE GENERATOR
app.post("/api/admin/challenges/generate-ai", async (req, res) => {
  const { styleReference, difficulty, marathonId } = req.body;
  const ai = getGeminiClient();

  const selectedMarathonId = marathonId || "marathon-june";

  const safetyInstructions = `
    THE CHALLENGE MUST BE ABSOLUTELY SAFE, RESPECTFUL, LEGAL, RESPECTING HUMAN DIGNITY AND PERSONAL RIGHTS.
    - NO physical danger, NO self-harm, NO violation of privacy, NO illegal actions, NO humiliating public exposure, NO harassment, NO real risk of financial loss.
    - Focus strictly on confidence building, social playfulness, warmth, overcoming hesitation, soft public speaking, creative storytelling, or lighthearted performance.
  `;

  const systemInstruction = `
    You are the AI Challenge Generator for "Bifurcation" (ბიფურკაცია), a creative confidence-building social marathon.
    Generate a new safe challenge in exact JSON format. The response must be a single, valid JSON object containing exactly the schema outlined.
    All Georgian fields (title, description, fullInstructions, safetyRules, reflectionQuestion, personalDevelopmentReason) must be in beautiful Georgian language, and all English fields (title_en, description_en, fullInstructions_en, safetyRules_en, reflectionQuestion_en, personalDevelopmentReason_en) must be in natural, equivalent English.
  `;

  const prompt = `
    Generate a safe personal growth challenge bilingually (Georgian & English).
    Selected Difficulty: ${difficulty || "medium"}
    Style Reference / Theme hint: ${styleReference || "კომუნიკაცია და თავდაჯერება / Communication and confidence"}

    ${safetyInstructions}

    Expected JSON Schema output:
    {
      "title": "Georgian Challenge Title (მაგ. მხიარული ისტორია)",
      "title_en": "English Challenge Title (e.g., A Joyful Story)",
      "description": "Short description of what the challenge achieves in Georgian",
      "description_en": "Short description of what the challenge achieves in English",
      "fullInstructions": "Detailed step-by-step instructions in Georgian",
      "fullInstructions_en": "Detailed step-by-step instructions in English",
      "safetyRules": "Explicit safety parameters in Georgian",
      "safetyRules_en": "Explicit safety parameters in English",
      "difficulty": "easy" or "medium" or "hard" (match input ${difficulty}),
      "emotionalCourageLevel": integer from 1 to 5,
      "challengeCost": virtual point cost (typically between 10 and 30),
      "completionReward": virtual point reward (typically cost multiplied by 2),
      "publicBraveryBonus": courage bonus (typically 5 to 15),
      "submissionType": "video" or "reflection" or "photo",
      "reflectionQuestion": "Deep self-analysis or feedback question in Georgian for the player to think about",
      "reflectionQuestion_en": "Deep self-analysis or feedback question in English for the player to think about",
      "personalDevelopmentReason": "Brief logical reason in Georgian why this specific activity unlocks emotional freedom and courage",
      "personalDevelopmentReason_en": "Brief logical reason in English why this specific activity unlocks emotional freedom and courage"
    }
  `;

  try {
    const currentCount = db.challenges.filter(c => c.marathonId === selectedMarathonId).length;
    const challengeNumber = currentCount + 1;

    if (ai) {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              title_en: { type: Type.STRING },
              description: { type: Type.STRING },
              description_en: { type: Type.STRING },
              fullInstructions: { type: Type.STRING },
              fullInstructions_en: { type: Type.STRING },
              safetyRules: { type: Type.STRING },
              safetyRules_en: { type: Type.STRING },
              difficulty: { type: Type.STRING },
              emotionalCourageLevel: { type: Type.INTEGER },
              challengeCost: { type: Type.INTEGER },
              completionReward: { type: Type.INTEGER },
              publicBraveryBonus: { type: Type.INTEGER },
              submissionType: { type: Type.STRING },
              reflectionQuestion: { type: Type.STRING },
              reflectionQuestion_en: { type: Type.STRING },
              personalDevelopmentReason: { type: Type.STRING },
              personalDevelopmentReason_en: { type: Type.STRING }
            },
            required: [
              "title", "title_en",
              "description", "description_en",
              "fullInstructions", "fullInstructions_en",
              "safetyRules", "safetyRules_en",
              "difficulty", "emotionalCourageLevel",
              "challengeCost", "completionReward", "publicBraveryBonus",
              "submissionType",
              "reflectionQuestion", "reflectionQuestion_en",
              "personalDevelopmentReason", "personalDevelopmentReason_en"
            ]
          }
        }
      });

      const text = response.text || "{}";
      const generated = JSON.parse(text.trim());
      
      // Inject temporary ID and status
      const challengeId = "ch-ai-" + Math.random().toString(36).substr(2, 9);
      const challenge = {
        id: challengeId,
        ...generated,
        marathonId: selectedMarathonId,
        challengeNumber,
        status: "pending",
        aiGenerated: true,
        approvedByAdmin: false
      };

      // Put into temporary pool in db
      db.challenges.push(challenge);
      saveDb();

      return res.json({ success: true, challenge });
    } else {
      // Fallback generator when API key is missing
      const mockTitlesKa = [
        "მეგობრული ღიმილის ხელოვნება",
        "კრეატიული შთაგონება სახლში",
        "დილის მხნეობის ენერგეტიკა",
        "პოეტური გამბედაობის გამოწვევა",
        "ბავშვობის საყვარელი სიცილი"
      ];
      const mockTitlesEn = [
        "The Art of a Friendly Smile",
        "Creative Inspiration at Home",
        "Morning Vibrations Energy Boost",
        "Poetic Bravery Challenge",
        "Childhood's Favorite Laughter"
      ];
      const randomIndex = Math.floor(Math.random() * mockTitlesKa.length);
      const selectedTitleKa = mockTitlesKa[randomIndex];
      const selectedTitleEn = mockTitlesEn[randomIndex];
      
      const challengeId = "ch-ai-mock-" + Math.random().toString(36).substr(2, 9);
      const challenge = {
        id: challengeId,
        title: `${selectedTitleKa} (AI გენერირებული - კავშირის გარეშე)`,
        title_en: `${selectedTitleEn} (AI Generated - Offline Fallback)`,
        description: "მარტივი და უსაფრთხო გამოწვევა, რომელიც დაგეხმარებათ იგრძნოთ თავისუფლება და კომუნიკაციის სიმარტივე.",
        description_en: "A simple and safe challenge designed to help you experience freedom and ease of communication.",
        fullInstructions: "1. დადექით კომფორტულ პოზაში კამერის წინ.\n2. წარმოადგინეთ ერთი მხიარული, უსაფრთხო თამაში საოჯახო ნივთით.\n3. გააზიარეთ თქვენი პოზიტიური ემოცია.\n4. ჩაწერეთ 45 წამიანი დასკვნა.",
        fullInstructions_en: "1. Stand in a comfortable pose in front of the camera.\n2. Demonstrate a playful, safe interaction with a household object.\n3. Share your positive emotions.\n4. Record a 45-second conclusion.",
        safetyRules: "გამოწვევა აბსოლუტურად უსაფრთხოა. არ გამოიყენოთ არანაირი სახიფათო ნივთი ან მოქმედება.",
        safetyRules_en: "The challenge is absolutely safe. Do not use any dangerous objects or actions.",
        difficulty: difficulty || "medium",
        emotionalCourageLevel: 3,
        challengeCost: 15,
        completionReward: 30,
        publicBraveryBonus: 10,
        submissionType: "video",
        reflectionQuestion: "რა იგრძენით გამოწვევის შესრულების მომენტში და როგორ შეგიძლიათ გამოიყენოთ ეს ემოცია ყოველდღიურად?",
        reflectionQuestion_en: "What did you feel during the challenge, and how can you integrate this emotion into daily routine?",
        personalDevelopmentReason: "არაკომფორტული ან უჩვეულო დავალებები გვეხმარება გავაფართოვოთ ჩვენი კომფორტის ზონა და შევამციროთ სოციალური შფოთვა.",
        personalDevelopmentReason_en: "Unconventional or slightly uncomfortable tasks help expand our comfort zones and reduce social anxiety thresholds.",
        marathonId: selectedMarathonId,
        challengeNumber,
        status: "pending",
        aiGenerated: true,
        approvedByAdmin: false
      };

      db.challenges.push(challenge);
      saveDb();
      return res.json({ success: true, challenge, note: "გამოყენებულია ლოკალური სიმულატორი, რადგან GEMINI_API_KEY არ არის კონფიგურირებული." });
    }
  } catch (err: any) {
    console.error("Error generating challenge with AI:", err);
    res.status(500).json({ error: "ჩელენჯის გენერირება ვერ მოხერხდა: " + err.message });
  }
});

// ADMIN CHALLENGE DECISIONS
app.post("/api/admin/challenges/:id/approve", (req, res) => {
  const challenge = db.challenges.find(c => c.id === req.params.id);
  if (!challenge) return res.status(404).json({ error: "გამოწვევა ვერ მოიძებნა" });
  challenge.approvedByAdmin = true;
  challenge.status = "active";

  if (challenge.proposedByPlayerId) {
    const player = db.users.find(u => u.id === challenge.proposedByPlayerId);
    if (player) {
      if (!player.notifications) player.notifications = [];
      player.notifications.unshift({
        id: "approve-" + Math.random().toString(36).substr(2, 9),
        message: `🎉 გილოცავთ! თქვენი შემოთავაზებული გამოწვევა "${challenge.title}" დამტკიცდა ადმინისტრატორის მიერ და უკვე ხელმისაწვდომია მარათონის მონაწილეებისთვის!`,
        read: false,
        createdAt: new Date().toISOString()
      });
    }
  }

  saveDb();
  res.json({ success: true, challenge });
});

app.post("/api/admin/challenges/:id/reject", (req, res) => {
  const challenge = db.challenges.find(c => c.id === req.params.id);
  if (!challenge) return res.status(404).json({ error: "გამოწვევა ვერ მოიძებნა" });
  challenge.status = "archived";

  if (challenge.proposedByPlayerId) {
    const player = db.users.find(u => u.id === challenge.proposedByPlayerId);
    if (player) {
      if (!player.notifications) player.notifications = [];
      player.notifications.unshift({
        id: "reject-" + Math.random().toString(36).substr(2, 9),
        message: `ℹ️ თქვენი შემოთავაზებული გამოწვევის იდეა "${challenge.title}" არ დამტკიცდა უსაფრთხოების წესების გათვალისწინებით ან შინაარსობრივი თავსებადობის გამო. გთხოვთ სცადოთ ახალი იდეა!`,
        read: false,
        createdAt: new Date().toISOString()
      });
    }
  }

  saveDb();
  res.json({ success: true, message: "გამოწვევა უარყოფილია და გადატანილია არქივში." });
});

app.delete("/api/admin/challenges/:id", (req, res) => {
  const challenge = db.challenges.find(c => c.id === req.params.id);
  if (challenge) {
    challenge.archived = true;
    challenge.archivedAt = new Date().toISOString();
    challenge.archivedBy = "admin";
    challenge.deleted = true;
    challenge.deletedAt = new Date().toISOString();
    challenge.deletedBy = "admin";
    challenge.status = "archived"; // Filter out from active lists
  }
  saveDb();
  res.json({ success: true, message: "მონაცემი გადატანილია არქივში (რბილი წაშლა)." });
});

// SUBMISSIONS SYSTEM
app.get("/api/submissions", (req, res) => {
  // Return submission with voter nicknames and challenge details
  const result = db.submissions.map(sub => {
    const player = db.users.find(u => u.id === sub.playerId);
    const challenge = db.challenges.find(c => c.id === sub.challengeId);
    
    const url = sub.videoUrl || "";
    let detectedType = sub.submissionType;
    if (!detectedType) {
      if (url.startsWith("data:image/") || url.endsWith(".png") || url.endsWith(".jpg") || url.endsWith(".jpeg") || url.includes("images.unsplash.com")) {
        detectedType = "photo";
      } else if (url.startsWith("data:audio/") || url.endsWith(".mp3") || url.endsWith(".wav") || url.includes("audio")) {
        detectedType = "audio";
      } else {
        detectedType = "video";
      }
    }

    return {
      ...sub,
      playerNickname: player ? player.nickname : "უცნობი",
      playerAvatar: player ? player.avatar : "",
      challengeTitle: challenge ? challenge.title : "წაშლილი გამოწვევა",
      fileUrl: sub.videoUrl,
      submissionType: detectedType
    };
  });
  res.json(result);
});

app.post("/api/submissions", async (req, res) => {
  const { playerId, challengeId, videoUrl, visibility, comment, submissionType } = req.body;
  
  const player = getOrCreatePlayer(playerId);
  const challenge = db.challenges.find(c => c.id === challengeId);

  if (!challenge) {
    return res.status(404).json({ error: "გამოწვევა ვერ მოიძებნა" });
  }

  const mId = challenge.marathonId || "marathon-june";
  const marathon = db.marathons.find(m => m.id === mId);

  // Enforce Marathon deadlines (using Asia/Tbilisi equivalent check)
  if (marathon && new Date() > new Date(marathon.endDate)) {
    return res.status(400).json({ error: `ამ მარათონის ვადა ამოწურულია. გამოწვევის ატვირთვა შეჩერებულია (${marathon.title_ka}).` });
  }

  const record = getOrCreateRecord(playerId, mId);

  // Auto-participate if not already confirmed
  if (!record.participationConfirmed) {
    record.participationConfirmed = true;
    const bonusAmount = db.formulas?.startingBonus || 50;
    if (!record.startingBonusGiven) {
      record.startingBonusGiven = true;
      addTransaction(
        playerId,
        mId,
        "starting_bonus",
        bonusAmount,
        false,
        `სასტარტო ბონუსი ${marathon?.title_ka || "მარათონი"}-სთვის`,
        `Starting bonus for ${marathon?.title_en || "Marathon"}`
      );
    }
  }

  // Pre-billing protection: if they hadn't formally accepted first, charge them now!
  if (!record.acceptedChallenges.includes(challengeId)) {
    const cost = challenge.acceptanceCost !== undefined ? challenge.acceptanceCost : (challenge.challengeCost || 0);
    if (player.points < cost) {
      return res.status(400).json({ error: `გამოწვევის მისაღებად საჭიროა ${cost} ქულა.` });
    }
    addTransaction(
      playerId,
      mId,
      "accept_challenge",
      cost,
      true,
      `გამოწვევის მიღება: "${challenge.title}"`,
      `Accepting challenge: "${challenge.title_en || challenge.title}"`
    );
    record.acceptedChallenges.push(challengeId);
  }

  // Award Completion Reward points
  const completionReward = challenge.completionReward !== undefined ? challenge.completionReward : 30;
  addTransaction(
    playerId,
    mId,
    "complete_challenge",
    completionReward,
    false,
    `გამოწვევის შესრულება: "${challenge.title}"`,
    `Completed challenge: "${challenge.title_en || challenge.title}"`
  );

  // Record Completion list state
  if (!record.completedChallenges.includes(challengeId)) {
    record.completedChallenges.push(challengeId);
  }
  if (!player.completedChallenges.includes(challengeId)) {
    player.completedChallenges.push(challengeId);
  }

  // Handle visibility & public bravery bonus
  if (visibility === "public") {
    if (!record.publicVideos.includes(challengeId)) record.publicVideos.push(challengeId);
    if (!player.publicChallenges.includes(challengeId)) player.publicChallenges.push(challengeId);

    const publicVideoBonus = challenge.publicVideoBonus !== undefined ? challenge.publicVideoBonus : (challenge.publicBraveryBonus || 15);
    addTransaction(
      playerId,
      mId,
      "public_bonus",
      publicVideoBonus,
      false,
      `საჯარო ვიდეოს ბონუსი: "${challenge.title}"`,
      `Public upload bonus for "${challenge.title_en || challenge.title}"`
    );
    player.braveryBonuses += publicVideoBonus;
  } else {
    if (!record.hiddenVideos.includes(challengeId)) record.hiddenVideos.push(challengeId);
    if (!player.hiddenChallenges.includes(challengeId)) player.hiddenChallenges.push(challengeId);
  }

  // Create submission
  const subId = "sub-" + Math.random().toString(36).substr(2, 9);
  
  // Quick AI motivation feedback
  const ai = getGeminiClient();
  let aiReaction = "";

  const reactionPrompt = `
    You are the "Bifurcation Guide" (ბიფურკაციის მეგზური), a warm, supportive personal growth coach.
    A player named "${player.nickname}" has completed the challenge: "${challenge.title}".
    Challenge Description: "${challenge.description}"
    Player's reflection / comment: "${comment || 'არ არის კომენტარი'}"
    The submission visibility is "${visibility}".

    Write a 2-to-3 sentence motivational reaction in beautiful, encouraging Georgian.
    Focus on their courage, celebrate of self-acceptance, and outline a simple, positive next step. Keep it warm, polite, and very supportive. Do NOT diagnose or write psychological jargon.
  `;

  try {
    if (ai) {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: reactionPrompt,
        config: {
          systemInstruction: "You are the warm, supportive Bifurcation Guide AI coach, writing entirely in encouraging Georgian."
        }
      });
      aiReaction = response.text || "შესანიშნავი ნაბიჯია! შენ აჩვენე განსაკუთრებული გამბედაობა ამ გამოწვევის შესრულებით.";
    } else {
      // Local motivational reactions selector
      const reactions = [
        "შენ დღეს საკუთარი თავისთვის მნიშვნელოვანი ნაბიჯი გადადგი. ეს შეიძლება პატარა მოქმედება ჩანდეს, მაგრამ სწორედ ასეთი ნაბიჯებით იზრდება თავდაჯერება.",
        "შენ არ დაგიმტკიცებია მხოლოდ დავალების შესრულება — შენ აჩვენე, რომ შეგიძლია სცადო რაღაც ახალი და გათავისუფლდე შიშებისგან.",
        "შენი მონაწილეობა უკვე გამარჯვებაა, რადგან შენ აირჩიე მოქმედება შიშის ნაცვლად. კარგად იმუშავე!",
        "შესანიშნავია შემოქმედებითი მიდგომა! ყოველი უჩვეულო მოქმედება გვხდის უფრო მედეგს და თავისუფალს."
      ];
      aiReaction = reactions[Math.floor(Math.random() * reactions.length)];
    }
  } catch (err) {
    console.error("Failed to generate AI reaction:", err);
    aiReaction = "შენ დღეს მნიშვნელოვანი ნაბიჯი გადადგი. ეს შეიძლება პატარა მოქმედება ჩანდეს, მაგრამ სწორედ ასეთი ნაბიჯებით იზრდება თავდაჯერება.";
  }

  const submission = {
    id: subId,
    playerId,
    challengeId,
    videoUrl: videoUrl || "https://assets.mixkit.co/videos/preview/mixkit-girl-running-with-her-dog-in-a-park-34749-large.mp4",
    visibility,
    comment,
    approved: true,
    votes: 0,
    aiReaction,
    createdAt: new Date().toISOString(),
    safetyFlag: false,
    votedUserIds: [],
    submissionType: submissionType || "video"
  };

  db.submissions.push(submission);
  
  // Calculate streaks & gamification state upon challenge completion
  updateStreak(player);
  evaluateGamification(player, db.submissions, db.challenges);
  saveDb();

  res.json({ success: true, submission, user: player });
});

// VOTE FOR SUBMISSIONS
app.post("/api/submissions/:id/vote", (req, res) => {
  const { voterId } = req.body;
  const submission = db.submissions.find(s => s.id === req.params.id);
  if (!submission) return res.status(404).json({ error: "აქტივობა ვერ მოიძებნა" });

  if (submission.playerId === voterId) {
    return res.status(400).json({ error: "საკუთარ ვიდეოს ხმას ვერ მისცემთ." });
  }

  if (!submission.votedUserIds) {
    submission.votedUserIds = [];
  }

  if (submission.votedUserIds.includes(voterId)) {
    return res.status(400).json({ error: "თქვენ უკვე მიეცით ხმა ამ აქტივობას." });
  }

  // Count vote
  submission.votedUserIds.push(voterId);
  submission.votes += 1;

  // Credit points to content creator and voter
  const creator = db.users.find(u => u.id === submission.playerId);
  if (creator) {
    creator.points += 5; // Creator gets 5 points per vote
    creator.votesReceived += 1;
    evaluateGamification(creator, db.submissions, db.challenges);
  }

  const voter = db.users.find(u => u.id === voterId);
  if (voter) {
    voter.points += 2; // Voter gets 2 reward points for participating
    evaluateGamification(voter, db.submissions, db.challenges);
  }

  saveDb();
  res.json({ success: true, votes: submission.votes, submission });
});

// REPORT SYSTEM (CONFLICT POLICY)
app.post("/api/submissions/:id/report", (req, res) => {
  const { reporterId, reason, description } = req.body;
  const submission = db.submissions.find(s => s.id === req.params.id);

  if (!submission) return res.status(404).json({ error: "აქტივობა ვერ მოიძებნა" });

  const reportId = "rep-" + Math.random().toString(36).substr(2, 9);
  const newReport = {
    id: reportId,
    reporterId,
    reportedPlayerId: submission.playerId,
    submissionId: submission.id,
    reason,
    description,
    status: "pending"
  };

  db.reports.push(newReport);
  submission.safetyFlag = true; // Mark as flagged
  saveDb();

  res.json({ success: true, report: newReport });
});

app.get("/api/admin/reports", (req, res) => {
  const result = db.reports.map(r => {
    const reporter = db.users.find(u => u.id === r.reporterId);
    const reported = db.users.find(u => u.id === r.reportedPlayerId);
    const sub = db.submissions.find(s => s.id === r.submissionId);
    return {
      ...r,
      reporterName: reporter ? reporter.nickname : "უცნობი",
      reportedName: reported ? reported.nickname : "უცნობი",
      submissionComment: sub ? sub.comment : "კომენტარის გარეშე"
    };
  });
  res.json(result);
});

app.post("/api/admin/reports/:id/action", (req, res) => {
  const { decision } = req.body; // 'hide' | 'ban' | 'dismiss'
  const report = db.reports.find(r => r.id === req.params.id);
  if (!report) return res.status(404).json({ error: "საჩივარი ვერ მოიძებნა" });

  report.status = "reviewed";
  report.adminDecision = decision;

  if (decision === "hide") {
    // Hide the reported submission
    const sub = db.submissions.find(s => s.id === report.submissionId);
    if (sub) {
      sub.visibility = "hidden";
    }
  } else if (decision === "ban") {
    // Ban the reported player
    const reportedUser = db.users.find(u => u.id === report.reportedPlayerId);
    if (reportedUser) {
      reportedUser.banned = true;
      reportedUser.status = "banned";
      reportedUser.banReason = "მძიმე დარღვევა საჩივრის საფუძველზე.";
    }
  }

  saveDb();
  res.json({ success: true, report });
});

// COACH CONSULTATION ROOM
app.post("/api/coach/question", (req, res) => {
  const { playerId, question } = req.body;
  const player = db.users.find(u => u.id === playerId);
  if (!player) return res.status(404).json({ error: "მოთამაშე ვერ მოიძებნა" });

  if (player.coachQuestionsRemaining <= 0) {
    return res.status(400).json({ error: "თქვენ ამოგეწურათ უფასო კითხვების ლიმიტი." });
  }

  const cost = 10; // Point cost for coaches
  if (player.points < cost) {
    return res.status(400).json({ error: "თქვენ არ გაქვთ საკმარისი ქულები (საჭიროა 10 ქულა) კითხვის დასასმელად." });
  }

  player.points -= cost;
  player.coachQuestionsRemaining -= 1;

  const qId = "q-" + Math.random().toString(36).substr(2, 9);
  const newQuestion = {
    id: qId,
    playerId,
    question,
    status: "pending",
    cost,
    createdAt: new Date().toISOString()
  };

  db.coachQuestions.push(newQuestion);
  saveDb();

  res.json({ success: true, question: newQuestion, user: player });
});

app.get("/api/coach/questions", (req, res) => {
  const result = db.coachQuestions.map(q => {
    const player = db.users.find(u => u.id === q.playerId);
    return {
      ...q,
      playerNickname: player ? player.nickname : "უცნობი",
      playerAvatar: player ? player.avatar : ""
    };
  });
  res.json(result);
});

app.post("/api/admin/coach/questions/:id/answer", (req, res) => {
  const { answer } = req.body;
  const question = db.coachQuestions.find(q => q.id === req.params.id);
  if (!question) return res.status(404).json({ error: "კითხვა ვერ მოიძებნა" });

  question.answer = answer;
  question.status = "answered";
  question.answeredAt = new Date().toISOString();

  saveDb();
  res.json({ success: true, question });
});

// VIDEO CONSULTATION REQUEST
app.post("/api/coach/consultation", (req, res) => {
  const { playerId } = req.body;
  const player = db.users.find(u => u.id === playerId);
  if (!player) return res.status(404).json({ error: "მოთამაშე ვერ მოიძებნა" });

  if (!player.videoCallAvailable) {
    return res.status(400).json({ error: "კონსულტაცია უკვე მოთხოვნილი ან დაჯავშნილია." });
  }

  const cost = 25; // Points cost for standard video call
  if (player.points < cost) {
    return res.status(400).json({ error: "თქვენ არ გაქვთ საკმარისი ქულები (საჭიროა 25 ქულა) კონსულტაციის დასაჯავშნად." });
  }

  player.points -= cost;
  player.videoCallAvailable = false; // Claimed

  const conId = "con-" + Math.random().toString(36).substr(2, 9);
  const newCall = {
    id: conId,
    playerId,
    status: "requested",
    requestedAt: new Date().toISOString(),
    duration: 15,
    cost
  };

  db.videoConsultations.push(newCall);
  saveDb();

  res.json({ success: true, consultation: newCall, user: player });
});

app.get("/api/coach/consultations", (req, res) => {
  const result = db.videoConsultations.map(c => {
    const player = db.users.find(u => u.id === c.playerId);
    return {
      ...c,
      playerNickname: player ? player.nickname : "უცნობი",
      playerAvatar: player ? player.avatar : ""
    };
  });
  res.json(result);
});

app.post("/api/admin/coach/consultations/:id/schedule", (req, res) => {
  const { scheduledAt, meetingLink, status } = req.body; // status can be 'scheduled' | 'rejected'
  const consultation = db.videoConsultations.find(c => c.id === req.params.id);
  if (!consultation) return res.status(404).json({ error: "კონსულტაცია ვერ მოიძებნა" });

  consultation.status = status || "scheduled";
  if (scheduledAt) consultation.scheduledAt = scheduledAt;
  if (meetingLink) {
    consultation.meetingLink = meetingLink;
  } else if (status === "scheduled") {
    consultation.meetingLink = "https://meet.google.com/abc-defg-hij"; // default mock meet link
  }

  saveDb();
  res.json({ success: true, consultation });
});

// AI CHAT COACH ASSISTANT ("ბიფურკაციის მეგზური")
app.post("/api/ai/chat", async (req, res) => {
  const { message, history } = req.body;
  const ai = getGeminiClient();

  const systemPrompt = `
    You are the "Bifurcation Guide" (ბიფურკაციის მეგზური), a warm, supportive personal growth and self-confidence coach.
    This platform helps players overcome social anxiety, complexes, and build strong confidence through lighthearted, harmless, positive, playful challenges in physical space and safe interactions.
    
    CRITICAL POLICY:
    - Never give medical advice, diagnostic services, or psychological treatments.
    - Keep everything in Georgian.
    - Do NOT suggest any dangerous, illegal, or humiliating challenges. Always keep suggestions safe and playful (like taking 5 deep breaths, telling a self-respect story, writing a positive note to self).
    - Give short, highly encouraging responses (1-3 short paragraphs).
  `;

  try {
    if (ai) {
      // Build proper Gemini developer api structure with contents
      const currentHistory = (history || []).map((h: any) => ({
        role: h.role === "user" ? "user" : "model",
        parts: [{ text: h.text }]
      }));
      
      const contents = [
        ...currentHistory,
        { role: "user", parts: [{ text: message }] }
      ];

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents,
        config: {
          systemInstruction: systemPrompt
        }
      });

      const reply = response.text || "გამარჯობა! მე ვარ ბიფურკაციის მეგზური. მოხარული ვარ შენთან ერთად მუშაობით!";
      return res.json({ reply });
    } else {
      // Simulating a friendly chat response
      const preprogrammed = [
        "გამარჯობა! მე აქ ვარ, რათა დაგეხმარო შენს გზაზე. ნებისმიერი გამოწვევა, რომელსაც აირჩევ, არის შესანიშნავი ნაბიჯი სირცხვილისა და ბარიერების დასაძლევად.",
        "ძალიან საინტერესო კითხვაა! თავდაჯერება არის კუნთი, რომელსაც ჩვენ ერთობლივად, უსაფრთხო და კრეატიული თამაშით ვავარჯიშებთ.",
        "ნუ ნერვიულობ, თუ რომელიმე დავალება რთული გეჩვენება. შენ ყოველთვის შეგიძლია აირჩიო შენთვის მარტივი, სახალისო გამოწვევა და შემდეგ ეტაპობრივად გაზარდო სირთულე.",
        "სიმამაცე სულაც არ ნიშნავს შიშის არქონას, სიმამაცე ნიშნავს მოქმედებას შიშის მიუხედავად, აბსოლუტურად უსაფრთხო და უვნებელ გარემოში!"
      ];
      const reply = preprogrammed[Math.floor(Math.random() * preprogrammed.length)];
      res.json({ reply, note: "სიმულაციური პასუხი (Gemini გასაღების გარეშე)." });
    }
  } catch (err: any) {
    console.error("AI Coach assistant chat error:", err);
    res.status(500).json({ error: "AI მეგზურთან კავშირი ვერ დამყარდა: " + err.message });
  }
});

// FINAL AI ANALYSIS
app.post("/api/ai/analysis", async (req, res) => {
  const { playerId } = req.body;
  const player = db.users.find(u => u.id === playerId);
  if (!player) return res.status(404).json({ error: "მოთამაშე ვერ მოიძებნა" });

  const completed = db.challenges.filter(c => player.completedChallenges.includes(c.id));
  const completedList = completed.map(c => `• ${c.title} (${c.difficulty})`).join("\n");

  const prompt = `
    Conduct a personalized emotional growth and self-courage analysis for "${player.nickname}".
    They have successfully completed the following challenges in the Bifurcation confidence game:
    ${completedList || "მოთამაშეს ჯერ არ შეუსრულებია არცერთი გამოწვევა, მაგრამ წარმატებით დარეგისტრირდა და გაეცნო თამაშის წესებს."}

    Provide a highly encouraging, coaching-style, motivational summary in elegant Georgian.
    Include these sections:
    1. SUMMARY OF COURAGE [გამბედაობის შეჯამება] - Highlight their strengths and how they decided to take action.
    2. KEY ACCOMPLISHED STRENGTHS [გამოვლენილი ძლიერი მხარეები] - 2 or 3 aspects like playfulness, self-acceptance, speaking without fear.
    3. PRACTICAL CONTINUOUS ADVICE [კოუჩინგის რჩევები] - Friendly life tips on keeping their routine active.
    4. SYMBOLIC GAME TITLE [თამაშის სიმბოლური ტიტული] - Output one of these exact designations: "სიმამაცის შემქმნელი", "თავდაჯერების გზაზე", "შემოქმედებითი მოთამაშე", "შიშის დამმარცხებელი", "საკუთარი თავის გამარჯვებული".

    Ensure the response is beautifully formatted with clean, professional paragraph structures. Absolutely NO clinical psychiatric jargon.
  `;

  const ai = getGeminiClient();
  try {
    if (ai) {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: "You are the head Bifurcation Marathon Coach, writing deep personal coaching reports strictly in encouraging Georgian language."
        }
      });
      return res.json({ analysis: response.text });
    } else {
      // Local Fallback analysis
      const symbolicTitles = ["სიმამაცის შემქმნელი", "თავდაჯერების გზაზე", "შემოქმედებითი მოთამაშე", "შიშის დამმარცხებელი", "საკუთარი თავის გამარჯვებული"];
      const selectTitle = symbolicTitles[Math.floor(Math.random() * symbolicTitles.length)];
      
      const fallbackText = `
### 🌟 ჩემი თამაშის ანალიზი

#### 1. გამბედაობის შეჯამება [გამბედაობის შეჯამება]
თქვენი მონაწილეობა "ბიფურკაციის" მარათონში მიუთითებს იმაზე, რომ თქვენ მზად ხართ დაძლიოთ კომფორტის ზონა და კრეატიულად დაუპირისპირდეთ სოციალურ შიშებსა და კომპლექსებს. ლოკალური მონაცემებით, თქვენ წარმატებით შეხვდით გამოწვევებს, რაც შთამაგონებელი მაგალითია.

#### 2. გამოვლენილი ძლიერი მხარეები [გამოვლენილი ძლიერი მხარეები]
- **თვითწარდგენა და სისავსე**: შენ აჩვენე განსაკუთრებული ღიაობა ნიკნეიმის მიღებითა და პოზიტიური თვითგამოხატვით.
- **შემოქმედებითი თამამი აქცია**: სამზარეულოსა და სახლის ობიექტების გამოყენება მიუთითებს კრეატიულობაზე და იუმორის გრძნობაზე.

#### 3. კოუჩინგის რჩევები [კოუჩინგის რჩევები]
გააგრძელეთ თქვენი ყოველდღიური გამბედაობის პრაქტიკა. არ შეგეშინდეთ შეცდომების ან სხვების აზრის, არ დაგავიწყდეთ რომ თითოეული პატარა უცნაური ნაბიჯი თქვენს თავდაჯერებულობას აძლიერებს.

#### 4. თამაშის სიმბოლური ტიტული
**👉 ${selectTitle} 👈**
      `.trim();
      
      return res.json({ analysis: fallbackText, note: "დაგენერირდა ლოკალური სიმულაციური ანალიზი, რადგან GEMINI_API_KEY არ არის დაყენებული." });
    }
  } catch (err: any) {
    console.error("Failed to generate AI analysis:", err);
    res.status(500).json({ error: "ანალიზის მომზადება ვერ მოხერხდა: " + err.message });
  }
});

// ADMIN PANEL: GET USERS & BAN ACTIONS
app.get("/api/admin/users", (req, res) => {
  res.json(db.users);
});

app.post("/api/admin/users/:id/ban", (req, res) => {
  const { reason } = req.body;
  const user = db.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: "მოთამაშე ვერ მოიძებნა" });

  user.banned = true;
  user.status = "banned";
  user.banReason = reason || "წესების დარღვევა";
  saveDb();

  res.json({ success: true, user });
});

app.post("/api/admin/users/:id/unban", (req, res) => {
  const user = db.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: "მოთამაშე ვერ მოიძებნა" });

  user.banned = false;
  user.status = "active";
  user.banReason = "";
  saveDb();

  res.json({ success: true, user });
});

// ADMIN PANEL: BACKUP RESTORATION SNAPSHOT
app.post("/api/admin/restore", (req, res) => {
  const backup = req.body;
  if (!backup || backup.app !== "Bifurcation Game") {
    return res.status(400).json({ error: "Invalid backup bundle format" });
  }

  if (backup.users) db.users = backup.users;
  if (backup.marathons) db.marathons = backup.marathons;
  if (backup.submissions) db.submissions = backup.submissions;
  if (backup.pointTransactions) db.pointTransactions = backup.pointTransactions;
  if (backup.consultations) db.videoConsultations = backup.consultations;
  if (backup.reports) db.reports = backup.reports;
  if (backup.monthlyPlayerRecords) db.monthlyPlayerRecords = backup.monthlyPlayerRecords;

  saveDb();
  res.json({ success: true, message: "Backup successfully loaded on backend storage." });
});

// Configure Vite integration as middleware for dev context or static hosting for production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Bifurcation server successfully booted on port ${PORT}`);
  });
}

startServer();
