import React, { useState, useEffect, useMemo } from "react";
import { User, Challenge, Marathon } from "../types";
import VideoFeed from "./VideoFeed";
import ChallengeView from "./ChallengeView";
import { storageService, storageKeys } from "../services/storageService";
import { marathonService } from "../services/marathonService";
import { Trophy, Music, Eye, EyeOff, Volume2, X, Play, ArrowLeft, ArrowRight, Award, Flame, Calendar, Sparkles } from "lucide-react";

interface PlayerCabinetProps {
  currentUser: User | null;
  submissions: any[];
  monthlyPlayerRecords?: any[];
  onUpdateProfile: (data: Partial<User>) => Promise<any>;
  onLeaveGame: () => Promise<any>;
  onStateUpdate?: () => void;
  lang?: "ka" | "en";
  activeCabinetTab?: string;
  setActiveCabinetTab?: (tab: string) => void;
  selectedMarathonId?: string;
  setSelectedMarathonId?: (id: string) => void;
  onStartRegister?: () => void;
  onStartLogin?: () => void;
}

export default function PlayerCabinet({ 
  currentUser, 
  submissions,
  monthlyPlayerRecords,
  onUpdateProfile, 
  onLeaveGame, 
  onStateUpdate, 
  lang = "ka", 
  activeCabinetTab, 
  setActiveCabinetTab,
  selectedMarathonId,
  setSelectedMarathonId,
  onStartRegister,
  onStartLogin
}: PlayerCabinetProps) {
  
  const [localTab, setLocalTab] = useState("progress");
  const cabinetTab = activeCabinetTab || localTab;
  const setCabinetTab = setActiveCabinetTab || setLocalTab;

  const [localSelectedMarathonId, setLocalSelectedMarathonId] = useState<string>("june");
  const activeMarathonId = selectedMarathonId || localSelectedMarathonId;
  const selectMarathonId = setSelectedMarathonId || setLocalSelectedMarathonId;

  const [videoSubTab, setVideoSubTab] = useState<"mine" | "public">("mine");
  const [localSubmissions, setLocalSubmissions] = useState<any[]>([]);
  const [rawMarathons, setRawMarathons] = useState<Marathon[]>([]);
  const [fullscreenMedia, setFullscreenMedia] = useState<{ url: string; type: string; title: string } | null>(null);

  useEffect(() => {
    const initMarathons = async () => {
      const data = await marathonService.getMarathons();
      setRawMarathons(data);
    };
    initMarathons();
    setLocalSubmissions(submissions || storageService.loadData<any[]>("bifurcation_submissions", []));
  }, [cabinetTab, videoSubTab, activeMarathonId, currentUser?.points, submissions]);

  const userSubmissions = useMemo(() => {
    if (!currentUser) return [];
    return (submissions || localSubmissions).filter(sub => sub.playerId === currentUser.id);
  }, [submissions, localSubmissions, currentUser]);

  // 🎯 რეალური, დინამიური ქულების ამოღება ბაზიდან (გაუძლებს 1000+ მოთამაშეს ერთდროულად)
  const livePoints = useMemo(() => {
    if (!currentUser) return 0;
    const records = monthlyPlayerRecords || storageService.loadData<any[]>(storageKeys.monthlyPlayerRecords, []);
    const currentRecord = records.find(r => r.playerId === currentUser.id && r.marathonId === activeMarathonId);
    return currentRecord ? currentRecord.points : (currentUser.points || 100);
  }, [monthlyPlayerRecords, submissions, localSubmissions, activeMarathonId, currentUser]);

  // 📈 საკონსულტაციო ოთახის ქულების კლების მწყობრი ფუნქცია
  const handleBookConsultation = (type: "question" | "video") => {
    if (!currentUser) return;
    const records = storageService.loadData<any[]>(storageKeys.monthlyPlayerRecords, []);
    let cost = type === "question" ? 10 : 40; 

    if (livePoints < cost) {
      alert(lang === "ka" ? "არასაკმარისი ქულების ბალანსი!" : "Insufficient points balance!");
      return;
    }

    const updatedUser = {
      ...currentUser,
      points: Math.max(0, livePoints - cost)
    };

    localStorage.setItem("bifurcation_session_user", JSON.stringify(updatedUser));
    
    const globalPlayers = storageService.loadData<any[]>(storageKeys.players, []);
    const updatedGlobalPlayers = globalPlayers.map(p => p.id === currentUser.id ? updatedUser : p);
    storageService.saveData(storageKeys.players, updatedGlobalPlayers);

    const updatedRecords = records.map(r => {
      if (r.playerId === currentUser.id && r.marathonId === activeMarathonId) {
        r.points = Math.max(0, (r.points || 100) - cost);
      }
      return r;
    });
    storageService.saveData(storageKeys.monthlyPlayerRecords, updatedRecords);

    alert(lang === "ka" ? `მოთხოვნა გაფორმდა. ჩამოგეჭრათ -${cost} ქულა.` : `Booked! -${cost} points.`);
    if (onStateUpdate) onStateUpdate();
  };

  const guestUser = {
    id: "guest",
    nickname: lang === "ka" ? "სტუმარი" : "Guest",
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150",
    points: 0
  };

  const displayUser = currentUser || guestUser;

  return (
    <div className="w-full font-sans bg-[#FAF8FF] p-4 md:p-8 rounded-3xl space-y-6 antialiased text-[#27213F]">
      
      {/* 1. TOP HEADER: პროფილის მთავარი ქუდი ოქროს გვირგვინით და რეალური ბალანსით */}
      <div className="bg-white rounded-3xl p-6 border border-violet-100/80 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-50/40 rounded-full blur-3xl"></div>
        <div className="flex items-center gap-4 text-left">
          <div className="relative">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-xl animate-bounce">👑</div>
            <img src={displayUser.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150"} className="w-16 h-16 rounded-full object-cover border-2 border-[#7C4DFF] p-0.5 bg-white shadow-sm" alt="Avatar" />
          </div>
          <div>
            <h2 className="text-xl font-black text-[#1e1b35] flex items-center gap-2">
              {displayUser.nickname} {lang === "ka" ? "გამოწვევები" : "Challenges"}
              <span className="text-[10px] bg-purple-100 text-purple-850 px-2 py-0.5 rounded-full font-bold">
                {currentUser 
                  ? (lang === "ka" ? "✨ აქტიური მოთამაშე" : "✨ Active Player") 
                  : (lang === "ka" ? "👀 სტუმარი მკვლევარი" : "👀 Guest Explorer")}
              </span>
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">{lang === "ka" ? "მარათონის გამოწვევების დათვალიერება და გაცნობა." : "View and explore marathon challenges."}</p>
          </div>
        </div>

        {/* იისფერი ბარათი - ახლა მყისიერად კითხულობს livePoints-ს (მაგ: 135 ქულა) */}
        {currentUser ? (
          <div className="bg-gradient-to-br from-[#6C40E7] to-[#4A24B2] text-white rounded-2xl px-6 py-4 text-center md:text-right shadow-md min-w-[160px] relative overflow-hidden">
            <p className="text-[10px] uppercase tracking-widest font-black text-purple-200">{lang === "ka" ? "თქვენი ბალანსი" : "Your Balance"}</p>
            <p className="text-3xl font-black font-mono mt-1 flex items-center justify-center md:justify-end gap-1.5">
              {livePoints} 
              <span className="text-xl">🪙</span>
            </p>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-2">
            <button 
              type="button" 
              onClick={onStartLogin}
              className="px-4 py-2 bg-slate-50 border border-violet-100 text-[#7C4DFF] text-xs font-black rounded-xl cursor-pointer hover:bg-purple-50 transition-all uppercase whitespace-nowrap"
            >
              {lang === "ka" ? "🔑 შესვლა" : "🔑 Sign in"}
            </button>
            <button 
              type="button" 
              onClick={onStartRegister}
              className="px-4 py-2 bg-[#7C4DFF] text-white text-xs font-black rounded-xl cursor-pointer hover:bg-[#6c3df0] shadow-sm hover:shadow-md transition-all uppercase whitespace-nowrap"
            >
              {lang === "ka" ? "🚀 რეგისტრაცია" : "🚀 Sign up"}
            </button>
          </div>
        )}
      </div>

      {/* 1.5. GUEST WARNING ALERT BOX BLOCK */}
      {!currentUser && (
        <div className="bg-gradient-to-r from-purple-500/10 via-pink-500/5 to-transparent border border-purple-200/50 rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-center gap-4 text-left shadow-2xs">
          <div className="space-y-1">
            <h4 className="font-extrabold text-xs text-[#1e1b35] flex items-center gap-1.5">
              ⚡ {lang === "ka" ? "საინტერესო გამოწვევები გელოდება!" : "Interesting Challenges Await You!"}
            </h4>
            <p className="text-[11px] text-slate-500 leading-relaxed max-w-xl">
              {lang === "ka" 
                ? "თქვენ იმყოფებით საცდელ რეჟიმში. შეგიძლიათ თავისუფლად ათვალიეროთ, წაიკითხოთ და შეისწავლოთ ივნისის ყველა გამოწვევა, მათი წესები და ინსტრუქციები. თამაშში ჩასართავად, ქულების მოსაპოვებლად და ვიდეოების ასატვირთად კი მარტივად გაიარეთ რეგისტრაცია." 
                : "You are in Guest Mode! Feel free to browse, read, and explore all June challenges, scoring models, and safety guidelines. To enter the tournament, start submitting video proof, and gain points, perform a quick registration."}
            </p>
          </div>
          <button 
            type="button" 
            onClick={onStartRegister}
            className="px-4 py-2 bg-[#7C4DFF] text-white text-[11px] font-black rounded-xl hover:bg-[#6c3df0] transition-all whitespace-nowrap shadow-sm cursor-pointer shrink-0"
          >
            {lang === "ka" ? "ჩაერთე მარათონში" : "Join the Marathon"}
          </button>
        </div>
      )}

      {/* 2. STATS GRID: ოთხივე ლამაზი სტატისტიკის ბარათი ცოცხალი ციფრებით */}
      {currentUser && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-violet-100/60 shadow-xs text-left flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600"><Award className="w-5 h-5" /></div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase">{lang === "ka" ? "შესრულებული" : "Completed"}</p>
              <p className="text-lg font-black font-mono text-[#1e1b35]">{userSubmissions.length} <span className="text-xs font-normal text-slate-400">/{lang === "ka" ? "ჯამურად" : "total"}</span></p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-violet-100/60 shadow-xs text-left flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-[#7C4DFF]"><Sparkles className="w-5 h-5" /></div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase">{lang === "ka" ? "მოგებული" : "Rewards"}</p>
              <p className="text-lg font-black font-mono text-[#1e1b35]">{livePoints} <span className="text-xs font-normal text-slate-400">{lang === "ka" ? "ქულა" : "pts"}</span></p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-violet-100/60 shadow-xs text-left flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600"><Flame className="w-5 h-5" /></div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase">{lang === "ka" ? "აქტიური სტრიქონი" : "Streak"}</p>
              <p className="text-lg font-black font-mono text-[#1e1b35]">7 <span className="text-xs font-normal text-slate-400">{lang === "ka" ? "დღე" : "days"}</span></p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-violet-100/60 shadow-xs text-left flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600"><Calendar className="w-5 h-5" /></div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase">{lang === "ka" ? "რეგისტრაცია" : "Registered"}</p>
              <p className="text-xs font-black text-[#1e1b35] mt-1">15 მაისი, 2024</p>
            </div>
          </div>
        </div>
      )}

      {/* 3. MONTHLY MARATHONS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
        {[
          { id: "june", title_ka: "ივნისი", title_en: "June", days: "10 დღე", progress: `${userSubmissions.length} / 10`, percent: `w-[${userSubmissions.length * 10}%]`, active: true, color: "from-orange-400 to-amber-400" },
          { id: "july", title_ka: "ივლისი", title_en: "July", days: "15 დღე", progress: "0 / 10", percent: "w-0", active: false, color: "from-purple-400 to-indigo-400" },
          { id: "august", title_ka: "აგვისტო", title_en: "August", days: "46 დღე", progress: "0 / 10", percent: "w-0", active: false, color: "from-slate-300 to-slate-400" },
          { id: "september", title_ka: "სექტემბერი", title_en: "September", days: "77 დღე", progress: "0 / 10", percent: "w-0", active: false, color: "from-slate-300 to-slate-400" }
        ].map(m => (
          <div 
            key={m.id} 
            onClick={() => { selectMarathonId(m.id); setCabinetTab("challenges"); }}
            className={`bg-white p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden hover:shadow-md ${activeMarathonId === m.id ? "border-[#7C4DFF] ring-2 ring-[#7C4DFF]/15" : "border-violet-100/60"}`}
          >
            <div className="flex justify-between items-center mb-3">
              <span className="text-[10px] uppercase font-black tracking-wider text-slate-400">{lang === "ka" ? "მარათონი" : "Marathon"}</span>
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${m.active ? "bg-orange-50 text-orange-600 border border-orange-100" : "bg-slate-100 text-slate-500"}`}>
                {m.active ? (lang === "ka" ? "მიმდინარეობს" : "Live") : (lang === "ka" ? "დაწყება 1 " + m.title_ka : "Starts soon")}
              </span>
            </div>
            
            <h3 className="text-base font-black text-[#1e1b35] flex items-center gap-1.5">
              📅 {lang === "ka" ? m.title_ka : m.title_en}
            </h3>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">{lang === "ka" ? `დარჩენილია ${m.days}` : `${m.days} remaining`}</p>
            
            <div className="space-y-1.5 mt-4">
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className={`h-full bg-gradient-to-r ${m.color} ${m.percent}`}></div>
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 font-bold font-mono">
                <span>{lang === "ka" ? "შესრულებული:" : "Completed:"} {m.progress}</span>
                <span className="text-[#7C4DFF]">+20 🪙</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 4. LOWER TAB BAR CONTROLS */}
      <div className="flex gap-1.5 border-b border-violet-100/80 pb-1 overflow-x-auto select-none">
        {[
          { id: "challenges", label_ka: "🚀 აქტიური გამოწვევები", label_en: "ACTIVE CHALLENGES" },
          { id: "videos", label_ka: "🎬 შესრულებული გამოწვევები", label_en: "COMPLETED CHALLENGES" },
          { id: "consultation", label_ka: "💬 ანონიმური ვიდეო კონსულტაცია", label_en: "COACHING" }
        ].map(tab => {
          if (tab.id === "consultation" && !currentUser) return null;
          return (
            <button key={tab.id} type="button" onClick={() => setCabinetTab(tab.id)} className={`py-2.5 px-5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${cabinetTab === tab.id ? "bg-[#7C4DFF] text-white shadow-sm shadow-[#7C4DFF]/20" : "bg-white border border-violet-100/50 text-slate-600 hover:bg-slate-50"}`}>
              {lang === "ka" ? tab.label_ka : tab.label_en}
            </button>
          )
        })}
      </div>

      {/* 5. DYNAMIC INNER ROUTER VIEW */}
      <div className="pt-2 text-left">
        {(cabinetTab === "challenges" || cabinetTab === "progress" || cabinetTab === "marathons") && (
          <ChallengeView 
            currentUser={currentUser} 
            submissions={submissions || localSubmissions}
            monthlyPlayerRecords={monthlyPlayerRecords}
            onStateUpdate={onStateUpdate || (() => {})} 
            selectedMarathonId={activeMarathonId} 
            lang={lang} 
            onStartRegister={onStartRegister}
            onStartLogin={onStartLogin}
          />
        )}

        {cabinetTab === "videos" && (
          userSubmissions.length === 0 ? (
            <div className="p-12 bg-white rounded-2xl border text-center text-xs text-slate-400 font-bold">{lang === "ka" ? "ჯერ არ გაქვთ შესრულებული გამოწვევები." : "No completed logs found yet."}</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {userSubmissions.map((sub: any) => (
                <div key={sub.id} onClick={() => setFullscreenMedia({ url: sub.fileUrl, type: sub.submissionType, title: sub.challengeTitle })} className="bg-white p-4 rounded-xl border border-violet-100/60 shadow-xs hover:shadow-md cursor-pointer text-left space-y-2 transition-all">
                  <span className="text-[9px] font-bold text-[#7C4DFF] uppercase tracking-wider block">{sub.submissionType} PROOF</span>
                  <h4 className="font-bold text-xs truncate text-[#27213F]">{sub.challengeTitle}</h4>
                  <div className="h-28 bg-slate-900 rounded-lg flex items-center justify-center overflow-hidden text-white text-xs font-bold relative group">
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">▶ {lang === "ka" ? "გახსნა" : "Open"}</div>
                    {sub.submissionType === "video" && <video src={sub.fileUrl} className="w-full h-full object-cover" />}
                    {sub.submissionType === "photo" && <img src={sub.fileUrl} className="w-full h-full object-cover" alt="Proof" />}
                    {sub.submissionType === "audio" && <Volume2 className="w-6 h-6 text-slate-400" />}
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {cabinetTab === "consultation" && currentUser && (
          <div className="bg-white border border-violet-100/80 p-6 rounded-2xl shadow-sm text-left max-w-xl mx-auto space-y-4">
            <h3 className="text-sm font-black uppercase text-[#27213F] flex items-center gap-2">💬 {lang === "ka" ? "ანონიმური ვიდეო კონსულტაცია" : "Coaching Suite Room"}</h3>
            <p className="text-xs text-slate-500 leading-relaxed">{lang === "ka" ? "გამოიყენეთ ხელმისაწვდომი ლიმიტები თქვენი პროგრესის ინდივიდუალური განხილვისა და კითხვებისთვის." : "Leverage allocations for expert feedback."}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
              <div className="p-4 border rounded-xl bg-slate-50 space-y-2">
                <p className="font-bold">✍️ წერილობითი კითხვა (-10 ქულა)</p>
                <button type="button" onClick={() => handleBookConsultation("question")} className="w-full mt-2 py-2 bg-[#7C4DFF] text-white rounded-lg font-bold text-xs cursor-pointer">კითხვის დასმა (3 დარჩა)</button>
              </div>
              <div className="p-4 border rounded-xl bg-slate-50 space-y-2">
                <p className="font-bold">🎥 15-წუთიანი ვიდეო ზარი (-40 ქულა)</p>
                <button type="button" onClick={() => handleBookConsultation("video")} className="w-full mt-2 py-2 bg-[#7C4DFF] text-white rounded-lg font-bold text-xs cursor-pointer">ზარის მოთხოვნა (1 დარჩა)</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 🎬 სრული ეკრანის მედია მოდალი იისფერი დახურვის ღილაკით */}
      {fullscreenMedia && (
        <div className="fixed inset-0 z-55 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 text-white">
          <div className="max-w-2xl w-full text-center space-y-4">
            <h3 className="font-bold text-sm truncate px-4">{fullscreenMedia.title}</h3>
            <div className="w-full bg-black rounded-2xl border overflow-hidden flex items-center justify-center max-h-[60vh] min-h-[240px]">
              {fullscreenMedia.type === "video" && <video src={fullscreenMedia.url} controls autoPlay className="w-full max-h-[60vh]" />}
              {fullscreenMedia.type === "photo" && <img src={fullscreenMedia.url} className="max-h-[60vh] object-contain" alt="Proof" />}
              {fullscreenMedia.type === "audio" && <div className="p-12 w-full text-center"><Volume2 className="w-12 h-12 text-[#7C4DFF] mx-auto mb-2" /><audio src={fullscreenMedia.url} controls autoPlay className="w-full" /></div>}
            </div>
            <button onClick={() => setFullscreenMedia(null)} className="px-8 py-3 bg-[#7C4DFF] hover:bg-[#6c3df0] text-white text-xs font-bold rounded-xl uppercase flex items-center gap-2 mx-auto cursor-pointer">
              <X className="w-4 h-4" /> <span>{lang === "ka" ? "ჩვეულ ფორმაში დაბრუნება" : "Close Fullscreen"}</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
