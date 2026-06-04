import React, { useState, useEffect } from "react";
import { User } from "./types";
import LandingPage from "./components/LandingPage";
import ChallengeView from "./components/ChallengeView";
import PlayerCabinet from "./components/PlayerCabinet";
import AboutUs from "./components/AboutUs";
import { storageService, storageKeys } from "./services/storageService";
import { marathonService } from "./services/marathonService";
import LiveLeaderboardSidebar from "./components/LiveLeaderboardSidebar";
import { authService } from "./services/authService";
import { ArrowLeft, ArrowRight, Lock, Globe, Sparkles } from "lucide-react";

// Translation Glossary dictionaries for dynamic KA/EN UI transitions
const t = {
  ka: {
    brandName: "ბიფურკაცია",
    home: "მთავარი",
    about: "ჩვენს შესახებ",
    cabinet: "კაბინეტი",
    register: "რეგისტრაცია",
    login: "შესვლა",
    logout: "გასვლა",
    simulateLogin: "სისტემაში შესვლა",
    testUser: "ტესტ მომხმარებლით შესვლა (@ნიკა)",
    customLogin: "ავტორიზაცია",
    nicknameInput: "მომხმარებლის სახელი / ნიკნეიმი",
    passwordInput: "პაროლი (ნებისმიერი)",
    submitLogin: "შესვლა",
    noAccount: "არ გაქვთ ანგარიში?",
    orRegister: "გაიარეთ რეგისტრაცია",
    createAccount: "რეგისტრაცია",
    alreadyHaveAccount: "უკვე გაქვთ ანგარიში?",
    orLogin: "შესვლა სისტემაში",
    firstName: "სახელი",
    lastName: "გვარი",
    phone: "ტელეფონი",
    email: "ელფოსტა",
    voluntaryConsent: "ვადასტურებ, რომ ვმონაწილეობ ნებაყოფლობით და პასუხისმგებლობა მეკისრება მხოლოდ მე.",
    avatarSelect: "აირჩიეთ ავატარი",
    fictionalName: "გამოიყენე ფიქტიური/ანონიმური სახელი რეიტინგში",
    regSuccess: "რეგისტრაცია წარმატებით დასრულდა! 🎉",
    loginSuccess: "ავტორიზაცია წარმატებულია! 🔑",
    errorFillAll: "გთხოვთ შეავსოთ ყველა ველი და აირჩიოთ ავატარი!",
    errorConsent: "მონაწილეობისთვის აუცილებელია დაადასტუროთ თანხმობა!"
  },
  en: {
    brandName: "Bifurcation",
    home: "Home",
    about: "About Us",
    cabinet: "Cabinet",
    register: "Register",
    login: "Sign In",
    logout: "Sign Out",
    simulateLogin: "Sign In Mode",
    testUser: "Login with Test User (@Nika)",
    customLogin: "Sign In",
    nicknameInput: "Username / Nickname",
    passwordInput: "Password (any)",
    submitLogin: "Sign In",
    noAccount: "Don't have an account?",
    orRegister: "Sign up now",
    createAccount: "Register Now",
    alreadyHaveAccount: "Already have an account?",
    orLogin: "Sign In instead",
    firstName: "First Name",
    lastName: "Last Name",
    phone: "Phone Number",
    email: "Email Address",
    voluntaryConsent: "I confirm voluntary participation and assume sole personal liability.",
    avatarSelect: "Select Avatar",
    fictionalName: "Use anonymous nickname on standings",
    regSuccess: "Registration successful! 🎉",
    loginSuccess: "Sign in successful! 🔑",
    errorFillAll: "Please fill all fields and select an avatar!",
    errorConsent: "You must accept voluntary consent to play!"
  }
};

const defaultAvatars = [
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&h=150",
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&h=150",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150"
];

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("bifurcation_session_user");
    return saved ? JSON.parse(saved) : null;
  });

  const [submissions, setSubmissions] = useState<any[]>(() => {
    return storageService.loadData<any[]>("bifurcation_submissions", []);
  });
  const [marathons, setMarathons] = useState<any[]>([]);
  const [monthlyPlayerRecords, setMonthlyPlayerRecords] = useState<any[]>(() => {
    return storageService.loadData<any[]>(storageKeys.monthlyPlayerRecords, []);
  });

  const [selectedMarathonId, setSelectedMarathonId] = useState<string>(() => {
    return localStorage.getItem("bifurcation_selected_marathon_id") || "june";
  });

  const [currentTab, setCurrentTab] = useState<string>("home");
  const [activeCabinetTab, setActiveCabinetTab] = useState<string>("progress");

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [lang, setLang] = useState<"ka" | "en">("ka");
  const [stateTick, setStateTick] = useState(0);

  // 🔄 Navigation History Stack State for custom app back/forward view transitions
  const [historyStack, setHistoryStack] = useState<string[]>(["home"]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  // Custom navigation interceptor wrapper
  const navigateToTab = (tab: string, skipHistoryPush = false) => {
    if (!skipHistoryPush) {
      // Slice any future history forward of the cursor index to support correct branch overwriting
      const updatedHistory = historyStack.slice(0, historyIndex + 1);
      if (updatedHistory[updatedHistory.length - 1] !== tab) {
        updatedHistory.push(tab);
      }
      setHistoryStack(updatedHistory);
      setHistoryIndex(updatedHistory.length - 1);
    }
    setCurrentTab(tab);
  };

  const handleGoBack = () => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      setHistoryIndex(prevIndex);
      setCurrentTab(historyStack[prevIndex]);
    }
  };

  const handleGoForward = () => {
    if (historyIndex < historyStack.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      setCurrentTab(historyStack[nextIndex]);
    }
  };

  // 📝 Custom Sign up/Registration Form states
  const [regFirstName, setRegFirstName] = useState("");
  const [regLastName, setRegLastName] = useState("");
  const [regNickname, setRegNickname] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regAvatar, setRegAvatar] = useState(defaultAvatars[0]);
  const [regConsent, setRegConsent] = useState(false);
  const [regAnonymity, setRegAnonymity] = useState(true);
  const [regError, setRegError] = useState("");
  const [regSuccessMsg, setRegSuccessMsg] = useState("");

  // 🔑 Custom Sign in States
  const [loginNickname, setLoginNickname] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginSuccessMsg, setLoginSuccessMsg] = useState("");

  useEffect(() => {
    const loadAppData = async () => {
      // 🔮 Automatically fetch the current state from the backend /api/state endpoint
      // This ensures the public bravery wall, completed challenges, and leaderboards reflect real database state with 100% accuracy.
      try {
        const response = await fetch("/api/state");
        if (response.ok) {
          const apiState = await response.json();
          if (apiState) {
            if (apiState.marathons) {
              setMarathons(apiState.marathons);
              storageService.saveData(storageKeys.marathons, apiState.marathons);
            }
            if (apiState.submissions) {
              setSubmissions(apiState.submissions);
              storageService.saveData("bifurcation_submissions", apiState.submissions);
            }
            if (apiState.players) {
              storageService.saveData(storageKeys.players, apiState.players);
            }
            if (apiState.monthlyPlayerRecords) {
              setMonthlyPlayerRecords(apiState.monthlyPlayerRecords);
              storageService.saveData(storageKeys.monthlyPlayerRecords, apiState.monthlyPlayerRecords);
            }
            console.log("Application state correctly synchronized with full-stack container database.");
            return;
          }
        }
      } catch (err) {
        console.warn("Backend /api/state is currently offline or unreachable, reverting to graceful local fallback storage:", err);
      }

      // Offline fallback state hydration
      const mData = await marathonService.getMarathons();
      setMarathons(mData);
      setSubmissions(storageService.loadData<any[]>("bifurcation_submissions", []));
      setMonthlyPlayerRecords(storageService.loadData<any[]>(storageKeys.monthlyPlayerRecords, []));
    };
    loadAppData();
  }, [stateTick, currentTab]);

  const handleStateUpdate = () => {
    setStateTick(p => p + 1);
    const updatedUser = localStorage.getItem("bifurcation_session_user");
    if (updatedUser) setCurrentUser(JSON.parse(updatedUser));
    setSubmissions(storageService.loadData<any[]>("bifurcation_submissions", []));
    setMonthlyPlayerRecords(storageService.loadData<any[]>(storageKeys.monthlyPlayerRecords, []));
  };

  const handleSetSelectedMarathonId = (id: string) => {
    setSelectedMarathonId(id);
    localStorage.setItem("bifurcation_selected_marathon_id", id);
    handleStateUpdate();
  };

  const handleStartRegister = () => {
    setRegError("");
    setRegSuccessMsg("");
    setShowLoginModal(false);
    setShowRegisterModal(true);
  };
  
  const handleStartLogin = () => {
    setLoginError("");
    setLoginSuccessMsg("");
    setShowRegisterModal(false);
    setShowLoginModal(true);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError("");

    if (!regFirstName || !regLastName || !regNickname || !regEmail || !regPhone || !regAvatar) {
      setRegError(t[lang].errorFillAll);
      return;
    }
    if (!regConsent) {
      setRegError(t[lang].errorConsent);
      return;
    }

    try {
      const registeredUser = await authService.registerPlayer({
        firstName: regFirstName,
        lastName: regLastName,
        email: regEmail,
        phone: regPhone,
        nickname: regNickname,
        passwordHash: "secret123", // default hashed simulation password
        avatar: regAvatar,
        fictionalNameEnabled: regAnonymity,
        consentAccepted: regConsent,
        preferredLanguage: lang
      });

      // Initialize monthly record for this user to enable instant dashboard tracking
      const mId = selectedMarathonId.startsWith("marathon-") ? selectedMarathonId : `marathon-${selectedMarathonId}`;
      const records = storageService.loadData<any[]>(storageKeys.monthlyPlayerRecords, []);
      if (!records.some(r => r.playerId === registeredUser.id && r.marathonId === mId)) {
        records.push({
          id: `record-${registeredUser.id}-${mId}`,
          playerId: registeredUser.id,
          marathonId: mId,
          participationConfirmed: true,
          points: registeredUser.points || 100,
          acceptedChallenges: [],
          completedChallenges: [],
          skippedChallenges: [],
          acceptedDates: {}
        });
        storageService.saveData(storageKeys.monthlyPlayerRecords, records);
      }

      setRegSuccessMsg(t[lang].regSuccess);
      localStorage.setItem("bifurcation_session_user", JSON.stringify(registeredUser));
      setCurrentUser(registeredUser);

      setTimeout(() => {
        setShowRegisterModal(false);
        // Reset inputs
        setRegFirstName("");
        setRegLastName("");
        setRegNickname("");
        setRegEmail("");
        setRegPhone("");
        setRegConsent(false);
        handleStateUpdate();
        navigateToTab("cabinet");
      }, 1000);

    } catch (err: any) {
      setRegError(err.message || "Registration failed");
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    if (!loginNickname) {
      setLoginError(t[lang].errorFillAll);
      return;
    }

    try {
      const user = await authService.loginPlayer(loginNickname, "secret123");
      setLoginSuccessMsg(t[lang].loginSuccess);
      localStorage.setItem("bifurcation_session_user", JSON.stringify(user));
      setCurrentUser(user);

      setTimeout(() => {
        setShowLoginModal(false);
        setLoginNickname("");
        setLoginPassword("");
        handleStateUpdate();
        navigateToTab("cabinet");
      }, 1000);

    } catch (err: any) {
      setLoginError(err.message);
    }
  };
  
  const handleUpdateProfile = async (data: Partial<User>) => {
    if (!currentUser) return;
    const updated = { ...currentUser, ...data };
    setCurrentUser(updated);
    localStorage.setItem("bifurcation_session_user", JSON.stringify(updated));
    handleStateUpdate();
  };

  const handleLeaveGame = async () => {
    authService.logoutPlayer();
    localStorage.removeItem("bifurcation_session_user");
    setCurrentUser(null);
    navigateToTab("home");
    handleStateUpdate();
  };

  const handleVote = async (subId: string) => {
    const subs = storageService.loadData<any[]>("bifurcation_submissions", []);
    const sub = subs.find(s => s.id === subId);
    if (!sub) return;

    // Get unique voter identifier (currentUser.id or guestVoterId) To implement strict one-vote-per-user
    let voterId = currentUser ? currentUser.id : null;
    if (!voterId) {
      voterId = localStorage.getItem("bifurcation_guest_voter_id");
      if (!voterId) {
        voterId = "guest_" + Math.random().toString(36).substring(2, 11);
        localStorage.setItem("bifurcation_guest_voter_id", voterId);
      }
    }

    if (!sub.likedBy) sub.likedBy = [];
    
    // Check if voter already liked to prevent double voting
    if (voterId && sub.likedBy.includes(voterId)) {
      return; // prevent double voting
    }

    // Add voter
    if (voterId) {
      sub.likedBy.push(voterId);
    }
    sub.votes = sub.likedBy.length;
    sub.likes = sub.likedBy.length; // Keep both votes/likes fields fully in sync

    // Save updated submissions
    storageService.saveData("bifurcation_submissions", subs);

    // 🚀 POST Vote to backend server to keep the centralized database 100% in sync
    try {
      const voteRes = await fetch(`/api/submissions/${subId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voterId })
      });
      if (voteRes.ok) {
        const voteResult = await voteRes.json();
        console.log("Vote synchronised on server successfully:", voteResult);
      }
    } catch (err) {
      console.error("Failed to POST vote synchronization request:", err);
    }

    // 2. Integrate with monthly player records (leaderboard)
    const creatorPlayerId = sub.playerId;
    const mId = selectedMarathonId.startsWith("marathon-") ? selectedMarathonId : `marathon-${selectedMarathonId}`;

    const records = storageService.loadData<any[]>(storageKeys.monthlyPlayerRecords, []);
    let record = records.find(r => r.playerId === creatorPlayerId && r.marathonId === mId);
    
    if (!record) {
      const players = storageService.loadData<any[]>(storageKeys.players, []);
      const creatorInst = players.find(p => p.id === creatorPlayerId);
      record = {
        id: `record-${creatorPlayerId}-${mId}`,
        playerId: creatorPlayerId,
        marathonId: mId,
        participationConfirmed: true,
        points: creatorInst ? (creatorInst.points || 100) : 100,
        acceptedChallenges: [],
        completedChallenges: [],
        skippedChallenges: [],
        acceptedDates: {},
        likes: 0
      };
      records.push(record);
    }

    record.likes = (record.likes || 0) + 1;
    record.points = (record.points || 100) + 5; // increment creator score in the monthlyPlayerRecords

    storageService.saveData(storageKeys.monthlyPlayerRecords, records);

    // 3. Also update overall player's points in global players list
    const playersList = storageService.loadData<any[]>(storageKeys.players, []);
    const updatedPlayers = playersList.map(p => {
      if (p.id === creatorPlayerId) {
        p.points = (p.points || 0) + 5;
        p.votesReceived = (p.votesReceived || 0) + 1;
      }
      return p;
    });
    storageService.saveData(storageKeys.players, updatedPlayers);

    // 4. If the creator is the currentUser, update their session profile points as well
    if (currentUser && currentUser.id === creatorPlayerId) {
      const updatedUser = {
        ...currentUser,
        points: (currentUser.points || 0) + 5,
        votesReceived: (currentUser.votesReceived || 0) + 1
      };
      localStorage.setItem("bifurcation_session_user", JSON.stringify(updatedUser));
      setCurrentUser(updatedUser);
    }

    // Reflect state updates in React state immediately for responsive rendering
    setSubmissions(subs);
    setMonthlyPlayerRecords(records);

    handleStateUpdate();
  };

  return (
    <div className="w-full min-h-screen bg-[#FAF8FF] font-sans antialiased text-[#27213F]">
      
      {/* 1. გლობალური თეთრი ჰედერი */}
      <header className="w-full bg-white border-b border-violet-100 shadow-xs sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          
          <div className="flex items-center gap-6">
            {/* Logo */}
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigateToTab("home")}>
              <span className="text-xl">🔮</span>
              <span className="font-black text-base tracking-tight text-[#1e1b35]">
                {t[lang].brandName}
              </span>
            </div>

            {/* ⏪⏩ Global Navigation Control Elements */}
            <div className="flex items-center gap-1 border-l border-violet-100 pl-4 h-6">
              <button 
                type="button" 
                onClick={handleGoBack}
                disabled={historyIndex === 0}
                className={`p-1.5 rounded-lg text-slate-400 hover:text-[#7C4DFF] hover:bg-[#F1ECFF]/50 transition-colors cursor-pointer ${historyIndex === 0 ? "opacity-30 cursor-not-allowed" : ""}`}
                title={lang === "ka" ? "უკან" : "Back"}
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <button 
                type="button" 
                onClick={handleGoForward}
                disabled={historyIndex >= historyStack.length - 1}
                className={`p-1.5 rounded-lg text-slate-400 hover:text-[#7C4DFF] hover:bg-[#F1ECFF]/50 transition-colors cursor-pointer ${historyIndex >= historyStack.length - 1 ? "opacity-30 cursor-not-allowed" : ""}`}
                title={lang === "ka" ? "წინ" : "Forward"}
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              type="button" 
              onClick={() => navigateToTab("home")} 
              className={`text-xs font-black uppercase tracking-wider px-2.5 py-1.5 rounded-lg ${currentTab === "home" ? "text-[#7C4DFF] bg-[#F1ECFF]/40" : "text-slate-500 hover:text-[#7C4DFF]"} cursor-pointer`}
            >
              {t[lang].home}
            </button>
            <button 
              type="button" 
              onClick={() => { navigateToTab("cabinet"); setActiveCabinetTab("challenges"); }} 
              className={`text-xs font-black uppercase tracking-wider px-2.5 py-1.5 rounded-lg ${currentTab === "cabinet" && activeCabinetTab === "challenges" ? "text-[#7C4DFF] bg-[#F1ECFF]/40" : "text-slate-500 hover:text-[#7C4DFF]"} cursor-pointer`}
            >
              {lang === "ka" ? "🚀 გამოწვევები" : "🚀 Challenges"}
            </button>
            <button 
              type="button" 
              onClick={() => navigateToTab("about")} 
              className={`text-xs font-black uppercase tracking-wider px-2.5 py-1.5 rounded-lg ${currentTab === "about" ? "text-[#7C4DFF] bg-[#F1ECFF]/40" : "text-slate-500 hover:text-[#7C4DFF]"} cursor-pointer`}
            >
              {t[lang].about}
            </button>
            
            {/* Dynamic language switcher config */}
            <button 
              type="button" 
              onClick={() => setLang(lang === "ka" ? "en" : "ka")}
              className="px-2.5 py-1.5 border border-violet-100 bg-white hover:bg-slate-55 text-[10px] font-black tracking-widest rounded-xl text-neutral-600 transition-all cursor-pointer uppercase select-none flex items-center gap-1"
            >
              <Globe className="w-3.5 h-3.5" />
              {lang === "ka" ? "EN" : "KA"}
            </button>

            {currentUser ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-100">
                <button 
                  type="button" 
                  onClick={() => { navigateToTab("cabinet"); setActiveCabinetTab("progress"); }} 
                  className="px-3.5 py-1.5 bg-[#F1ECFF] text-[#7C4DFF] text-xs font-extrabold rounded-xl cursor-pointer hover:bg-[#E5DDFF] transition-all"
                >
                  @{currentUser.nickname}
                </button>
                <button 
                  type="button" 
                  onClick={handleLeaveGame} 
                  className="px-3 py-1.5 border border-slate-200 text-xs font-bold rounded-xl text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  {t[lang].logout}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 pl-2 border-l border-slate-100">
                <button 
                  type="button" 
                  onClick={handleStartLogin} 
                  className="px-3 py-1.5 border border-violet-100 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  {t[lang].login}
                </button>
                <button 
                  type="button" 
                  onClick={handleStartRegister} 
                  className="px-3.5 py-1.5 bg-[#7C4DFF] text-white text-xs font-black rounded-xl hover:bg-[#6c3df0] transition-colors shadow-xs cursor-pointer"
                >
                  {t[lang].register}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 2. დინამიური კონტენტი რეიტინგის ჭკვიანი განლაგებით */}
      <div>
        {currentTab === "home" ? (
          /* ა) თუ მთავარ გვერდზე ვართ: LandingPage თავად მართავს შიდა Flex-ბადეს ქვედა სექციაში */
          <LandingPage 
            currentUser={currentUser} 
            submissions={submissions} 
            onStartRegister={handleStartRegister} 
            onStartLogin={handleStartLogin} 
            setCurrentTab={(tab) => navigateToTab(tab)} 
            currentTab={currentTab}
            onVote={handleVote}
            lang={lang}
            marathons={marathons}
            monthlyPlayerRecords={monthlyPlayerRecords}
            onStateUpdate={handleStateUpdate}
            setActiveCabinetTab={setActiveCabinetTab}
            selectedMarathonId={selectedMarathonId}
            setSelectedMarathonId={handleSetSelectedMarathonId}
          />
        ) : (
          /* ბ) თუ კაბინეტში ან სხვა გვერდზე ვართ: ვინარჩუნებთ სტანდარტულ გვერდითა განლაგებას */
          <main className="max-w-7xl mx-auto p-4 md:p-8 flex flex-col lg:flex-row gap-6 items-start w-full">
            <div className="flex-1 w-full">
              {currentTab === "cabinet" && (
                <PlayerCabinet 
                  currentUser={currentUser} 
                  submissions={submissions} 
                  monthlyPlayerRecords={monthlyPlayerRecords}
                  onUpdateProfile={handleUpdateProfile} 
                  onLeaveGame={handleLeaveGame} 
                  onStateUpdate={handleStateUpdate} 
                  lang={lang}
                  activeCabinetTab={activeCabinetTab}
                  setActiveCabinetTab={setActiveCabinetTab}
                  selectedMarathonId={selectedMarathonId}
                  setSelectedMarathonId={handleSetSelectedMarathonId}
                  onStartRegister={handleStartRegister}
                  onStartLogin={handleStartLogin}
                />
              )}
              {currentTab === "about" && <AboutUs lang={lang} />}
            </div>
            <div className="w-full lg:w-auto shrink-0 select-none">
              <LiveLeaderboardSidebar currentUser={currentUser} lang={lang} monthlyPlayerRecords={monthlyPlayerRecords} />
            </div>
          </main>
        )}
      </div>

      {/* 🔑 REGISTRATION FORM MODAL */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-55 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full text-left space-y-4 relative max-h-[90vh] overflow-y-auto shadow-2xl border border-violet-100">
            <button 
              type="button" 
              onClick={() => setShowRegisterModal(false)} 
              className="absolute top-4 right-4 text-slate-400 font-bold hover:text-black cursor-pointer w-7 h-7 bg-slate-100 rounded-full flex items-center justify-center"
            >
              ✕
            </button>
            
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1 bg-[#F1ECFF] text-[#7C4DFF] px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">
                <Sparkles className="w-3 h-3 text-purple-600" />
                {lang === "ka" ? "შემოუერთდი" : "Join Us"}
              </span>
              <h3 className="font-extrabold text-xl text-slate-900">{t[lang].createAccount}</h3>
            </div>

            {regError && (
              <div className="p-2.5 bg-rose-50 border border-rose-100 text-rose-600 font-medium text-xs rounded-xl text-center">
                {regError}
              </div>
            )}
            {regSuccessMsg && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-100 text-emerald-600 font-bold text-xs rounded-xl text-center">
                {regSuccessMsg}
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-500 block">{t[lang].firstName} *</label>
                  <input 
                    required 
                    type="text" 
                    value={regFirstName} 
                    onChange={e => setRegFirstName(e.target.value)} 
                    className="w-full p-2.5 bg-[#FAF8FF] border border-violet-100 text-slate-800 rounded-xl focus:outline-none focus:border-[#7C4DFF]" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-500 block">{t[lang].lastName} *</label>
                  <input 
                    required 
                    type="text" 
                    value={regLastName} 
                    onChange={e => setRegLastName(e.target.value)} 
                    className="w-full p-2.5 bg-[#FAF8FF] border border-violet-100 text-slate-800 rounded-xl focus:outline-none focus:border-[#7C4DFF]" 
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-500 block">{t[lang].nicknameInput} *</label>
                <input 
                  required 
                  type="text" 
                  value={regNickname} 
                  onChange={e => setRegNickname(e.target.value)} 
                  className="w-full p-2.5 bg-[#FAF8FF] border border-violet-100 text-slate-800 rounded-xl focus:outline-none focus:border-[#7C4DFF]" 
                  placeholder="@pseudonym"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-500 block">{t[lang].email} *</label>
                <input 
                  required 
                  type="email" 
                  value={regEmail} 
                  onChange={e => setRegEmail(e.target.value)} 
                  className="w-full p-2.5 bg-[#FAF8FF] border border-violet-100 text-slate-800 rounded-xl focus:outline-none focus:border-[#7C4DFF]" 
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-500 block">{t[lang].phone} *</label>
                <input 
                  required 
                  type="text" 
                  value={regPhone} 
                  onChange={e => setRegPhone(e.target.value)} 
                  className="w-full p-2.5 bg-[#FAF8FF] border border-violet-100 text-slate-800 rounded-xl focus:outline-none focus:border-[#7C4DFF]" 
                />
              </div>

              {/* Avatar Selector Circles Grid */}
              <div className="space-y-2">
                <label className="font-bold text-slate-600 block">{t[lang].avatarSelect}</label>
                <div className="grid grid-cols-6 gap-2">
                  {defaultAvatars.map((avUrl, i) => (
                    <button 
                      key={i} 
                      type="button" 
                      onClick={() => setRegAvatar(avUrl)} 
                      className={`relative aspect-square rounded-full overflow-hidden border-2 cursor-pointer transition-all ${regAvatar === avUrl ? "border-[#7C4DFF] scale-110 shadow-md" : "border-transparent opacity-75 hover:opacity-100"}`}
                    >
                      <img src={avUrl} className="w-full h-full object-cover" alt="avatar option" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2.5 pt-1.5 font-medium text-slate-600 leading-relaxed block">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={regAnonymity} 
                    onChange={e => setRegAnonymity(e.target.checked)} 
                    className="mt-0.5" 
                  />
                  <span>{t[lang].fictionalName}</span>
                </label>
                
                <label className="flex items-start gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={regConsent} 
                    onChange={e => setRegConsent(e.target.checked)} 
                    className="mt-0.5" 
                  />
                  <span className="text-slate-500 font-bold">{t[lang].voluntaryConsent} *</span>
                </label>
              </div>

              <button 
                type="submit" 
                className="w-full py-3 bg-[#7C4DFF] hover:bg-[#6c3df0] text-white rounded-xl font-bold uppercase cursor-pointer shadow-md shadow-[#7C4DFF]/20"
              >
                {t[lang].createAccount}
              </button>

              <div className="text-center pt-2 text-slate-500">
                <span>{t[lang].alreadyHaveAccount} </span>
                <button 
                  type="button" 
                  onClick={handleStartLogin} 
                  className="text-[#7C4DFF] font-bold hover:underline cursor-pointer"
                >
                  {t[lang].orLogin}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🔑 SIGN IN FORM MODAL */}
      {showLoginModal && (
        <div className="fixed inset-0 z-55 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-left space-y-4 relative shadow-2xl border border-violet-100">
            <button 
              type="button" 
              onClick={() => setShowLoginModal(false)} 
              className="absolute top-4 right-4 text-slate-400 font-bold hover:text-black cursor-pointer w-7 h-7 bg-slate-100 rounded-full flex items-center justify-center"
            >
              ✕
            </button>
            
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1 bg-purple-50 text-[#7C4DFF] px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">
                <Lock className="w-3 h-3" />
                {lang === "ka" ? "ავტორიზაცია" : "SECURITY LOGIN"}
              </span>
              <h3 className="font-extrabold text-xl text-slate-900">{t[lang].simulateLogin}</h3>
            </div>

            {loginError && (
              <div className="p-2.5 bg-rose-50 border border-rose-100 text-rose-600 font-medium text-xs rounded-xl text-center">
                {loginError}
              </div>
            )}
            {loginSuccessMsg && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-100 text-emerald-600 font-bold text-xs rounded-xl text-center">
                {loginSuccessMsg}
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-500 block">{t[lang].nicknameInput} *</label>
                <input 
                  required 
                  type="text" 
                  value={loginNickname} 
                  onChange={e => setLoginNickname(e.target.value)} 
                  placeholder="@pseudonym or email"
                  className="w-full p-2.5 bg-[#FAF8FF] border border-violet-100 text-slate-800 rounded-xl focus:outline-none focus:border-[#7C4DFF]" 
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-500 block">{t[lang].passwordInput}</label>
                <input 
                  type="password" 
                  value={loginPassword} 
                  onChange={e => setLoginPassword(e.target.value)} 
                  placeholder="••••••••"
                  className="w-full p-2.5 bg-[#FAF8FF] border border-violet-100 text-slate-800 rounded-xl focus:outline-none" 
                />
              </div>

              <button 
                type="submit" 
                className="w-full py-3 bg-[#7C4DFF] hover:bg-[#6c3df0] text-white rounded-xl font-bold uppercase cursor-pointer transition-colors shadow-md shadow-[#7C4DFF]/20"
              >
                {t[lang].submitLogin}
              </button>

              <div className="border-t border-violet-100 pt-3 space-y-2">
                <button 
                  type="button" 
                  onClick={() => {
                    const mockUser: any = { id: "player-1", nickname: "ნიკა", avatar: defaultAvatars[0], points: 190, fictionalNameEnabled: true };
                    localStorage.setItem("bifurcation_session_user", JSON.stringify(mockUser));
                    setCurrentUser(mockUser);
                    setLoginSuccessMsg(t[lang].loginSuccess);
                    
                    setTimeout(() => {
                      setShowLoginModal(false);
                      setLoginSuccessMsg("");
                      handleStateUpdate();
                      navigateToTab("cabinet");
                    }, 800);
                  }} 
                  className="w-full py-2.5 bg-purple-50 hover:bg-[#F1ECFF] text-[#7C4DFF] rounded-xl font-bold text-[10px] uppercase tracking-wider transition-colors cursor-pointer"
                >
                  {t[lang].testUser}
                </button>
              </div>

              <div className="text-center pt-2 text-slate-500">
                <span>{t[lang].noAccount} </span>
                <button 
                  type="button" 
                  onClick={handleStartRegister} 
                  className="text-[#7C4DFF] font-bold hover:underline cursor-pointer"
                >
                  {t[lang].orRegister}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
