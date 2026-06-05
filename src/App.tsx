import React, { useState, useEffect } from "react";
import { User } from "./types";
import LandingPage from "./components/LandingPage";
import PlayerCabinet from "./components/PlayerCabinet";
import AboutUs from "./components/AboutUs";
import LiveLeaderboardSidebar from "./components/LiveLeaderboardSidebar";
import { storageService, storageKeys } from "./services/storageService";
import { marathonService } from "./services/marathonService";

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("bifurcation_session_user");
    return saved ? JSON.parse(saved) : null;
  });

  const [submissions, setSubmissions] = useState<any[]>(() => storageService.loadData<any[]>("bifurcation_submissions", []));
  const [marathons, setMarathons] = useState<any[]>([]);
  const [monthlyPlayerRecords, setMonthlyPlayerRecords] = useState<any[]>(() => storageService.loadData<any[]>(storageKeys.monthlyPlayerRecords, []));
  
  const [currentTab, setCurrentTab] = useState<string>("home");
  const [activeCabinetTab, setActiveCabinetTab] = useState<string>("challenges");
  const [selectedMarathonId, setSelectedMarathonId] = useState<string | null>(null);
  const [lang, setLang] = useState<"ka" | "en">("ka");

  useEffect(() => {
    const loadAppData = async () => {
      const mData = await marathonService.getMarathons();
      setMarathons(mData);
    };
    loadAppData();
  }, []);

  const handleStateUpdate = () => {
    setSubmissions(storageService.loadData<any[]>("bifurcation_submissions", []));
    setMonthlyPlayerRecords(storageService.loadData<any[]>(storageKeys.monthlyPlayerRecords, []));
    const updatedUser = localStorage.getItem("bifurcation_session_user");
    if (updatedUser) setCurrentUser(JSON.parse(updatedUser));
  };

  const handleVote = async (subId: string) => {
    const subs = storageService.loadData<any[]>("bifurcation_submissions", []);
    const sub = subs.find(s => s.id === subId);
    if (!sub) return;

    let voterId = currentUser ? currentUser.id : (localStorage.getItem("bifurcation_guest_voter_id") || "guest_" + Math.random().toString(36).substring(2, 11));
    if (!localStorage.getItem("bifurcation_guest_voter_id")) localStorage.setItem("bifurcation_guest_voter_id", voterId);

    if (!sub.likedBy) sub.likedBy = [];
    if (sub.likedBy.includes(voterId)) return; // მხოლოდ ერთი ხმა

    sub.likedBy.push(voterId);
    sub.votes = sub.likedBy.length;
    sub.likes = sub.likedBy.length;

    storageService.saveData("bifurcation_submissions", subs);
    
    // ქულების დარიცხვა ავტორისთვის
    const records = storageService.loadData<any[]>(storageKeys.monthlyPlayerRecords, []);
    const mId = selectedMarathonId || "june";
    let record = records.find(r => r.playerId === sub.playerId && r.marathonId === mId);
    if (record) {
      record.points = (record.points || 0) + 5;
      storageService.saveData(storageKeys.monthlyPlayerRecords, records);
    }
    
    handleStateUpdate();
  };

  return (
    <div className="w-full min-h-screen bg-[#F8F7FC] text-[#27213F]">
      <header className="sticky top-0 z-50 bg-white border-b border-violet-100">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="cursor-pointer font-black" onClick={() => setCurrentTab("home")}>🔮 ბიფურკაცია</div>
          <div className="flex gap-4">
            <button onClick={() => setCurrentTab("home")} className="text-xs font-black uppercase">მთავარი</button>
            {currentUser ? <button onClick={() => setCurrentTab("cabinet")} className="text-xs font-bold text-[#7C4DFF]">@{currentUser.nickname}</button> : <button onClick={() => {}} className="text-xs font-black">შესვლა</button>}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4">
        {currentTab === "home" ? (
          <LandingPage 
            currentUser={currentUser} submissions={submissions} currentTab={currentTab} setCurrentTab={setCurrentTab}
            onStartRegister={() => {}} onStartLogin={() => {}} onVote={handleVote} marathons={marathons}
            monthlyPlayerRecords={monthlyPlayerRecords} setActiveCabinetTab={setActiveCabinetTab} setSelectedMarathonId={setSelectedMarathonId}
          />
        ) : (
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="flex-1">
              <PlayerCabinet currentUser={currentUser!} submissions={submissions} activeCabinetTab={activeCabinetTab} setActiveCabinetTab={setActiveCabinetTab} selectedMarathonId={selectedMarathonId} onStateUpdate={handleStateUpdate} />
            </div>
            <div className="w-full lg:w-76 shrink-0 lg:sticky lg:top-8">
              <LiveLeaderboardSidebar currentUser={currentUser} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
