import React, { useState, useEffect } from "react";
import { User, Submission } from "../types";
import { getPlayerAvatar } from "../utils/avatarUtils";
import { storageService, storageKeys } from "../services/storageService";
import LiveLeaderboardSidebar from "./LiveLeaderboardSidebar";
import { 
  Shield, 
  Sparkles, 
  Heart, 
  Eye, 
  Compass, 
  Flame, 
  Paintbrush, 
  Lock, 
  TrendingUp, 
  ClipboardCheck, 
  Scale, 
  Sun,
  UserPlus,
  FileText,
  Trophy,
  Bot,
  MessageSquare,
  ShieldAlert,
  UserX,
  Play,
  AlertTriangle,
  Info,
  Calendar,
  ArrowRight,
  Menu,
  X
} from "lucide-react";

interface LandingPageProps {
  currentUser: User | null;
  submissions: (Submission & { playerNickname?: string; playerAvatar?: string; challengeTitle?: string })[];
  onStartRegister: () => void;
  onStartLogin: () => void;
  setCurrentTab: (tab: string) => void;
  currentTab: string;
  onVote: (submissionId: string) => Promise<void>;
  lang?: string;
  marathons?: any[];
  monthlyPlayerRecords?: any[];
  onStateUpdate?: () => void;
  onChangeLang?: (l: "ka" | "en") => void;
  setActiveCabinetTab?: (tab: string) => void;
  setSelectedMarathonId?: (id: string | null) => void;
  selectedMarathonId?: string;
}

export default function LandingPage({ 
  currentUser, 
  submissions, 
  onStartRegister, 
  onStartLogin, 
  setCurrentTab,
  currentTab,
  onVote,
  lang = "ka",
  marathons = [],
  monthlyPlayerRecords = [],
  onStateUpdate,
  onChangeLang,
  setActiveCabinetTab,
  setSelectedMarathonId
}: LandingPageProps) {
  
  const [activeMediaSub, setActiveMediaSub] = useState<any | null>(null);
  const [promptRegisterToast, setPromptRegisterToast] = useState(false);
  const [localMobileMenuOpen, setLocalMobileMenuOpen] = useState(false);
  const [activeTabSubCategory, setActiveTabSubCategory] = useState<'all' | 'popular' | 'specials'>('all');
  const [selectedPreviewMarathon, setSelectedPreviewMarathon] = useState<any | null>(null);
  const [selectedPreviewChallenge, setSelectedPreviewChallenge] = useState<any | null>(null);

  // ტაიმერების ეფექტი
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  // უკათვლელი ტექსტის ლოგიკა საფრთხოების ფილტრით NaN-ის წინააღმდეგ
  const getCountdownText = (targetDateStr: string, activeLang: string) => {
    if (!targetDateStr) {
      return activeLang === "ka" ? "განისაზღვრება (TBD)" : "TBD";
    }
    const targetDate = new Date(targetDateStr);
    if (isNaN(targetDate.getTime())) {
      return activeLang === "ka" ? "განისაზღვრება (TBD)" : "TBD";
    }
    const diffTime = targetDate.getTime() - new Date().getTime();
    if (diffTime <= 0) {
      return activeLang === "ka" ? "დასრულებულია 🔒" : "Ended 🔒";
    }
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60));
    
    if (activeLang === "ka") {
      return `დარჩენილია: ${diffDays} დღე, ${diffHours} სთ, ${diffMinutes} წთ`;
    } else {
      return `Time left: ${diffDays}d, ${diffHours}h, ${diffMinutes}m`;
    }
  };

  const getMonthEmoji = (monthId: string) => {
    if (monthId.includes("june")) return "🎒";
    if (monthId.includes("july")) return "🏄";
    if (monthId.includes("august")) return "🏕️";
    return "🍂";
  };

  const isUserAuthenticated = currentUser !== null;

  // საჯარო კედლის პოსტების გაფილტვრა
  const currentFeedSubmissions = submissions?.filter(s => s.visibility === "public") || [];

  const handleVoteAction = async (sub: any) => {
    try {
      await onVote(sub.id);
      if (onStateUpdate) onStateUpdate();
    } catch (e) {
      console.error(e);
    }
  };

  const handleStartGameClick = () => {
    if (isUserAuthenticated) {
      setCurrentTab("cabinet");
      if (setActiveCabinetTab) setActiveCabinetTab("challenges");
    } else {
      onStartRegister();
    }
  };

  const handleViewMarathonsClick = () => {
    const element = document.getElementById("marathons-dashboard");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const navigateToCabinetTab = (tabName: string) => {
    setCurrentTab("cabinet");
    if (setActiveCabinetTab) setActiveCabinetTab(tabName);
  };

  // მთავარ გვერდზე მარათონის გახსნის ფუნქციონალი
  const handleMarathonClick = (marathonId: string) => {
    if (setSelectedMarathonId) {
      setSelectedMarathonId(marathonId);
    }
    setCurrentTab("cabinet");
    if (setActiveCabinetTab) {
      setActiveCabinetTab("challenges");
    }
  };

  const getPreviewChallenges = (m: any) => {
    if (m.challenges && m.challenges.length > 0) {
      return m.challenges;
    }
    const localSaved = storageService.loadData<any[]>("bifurcation_marathons", []);
    const found = localSaved.find((mItem: any) => mItem.id === m.id || mItem.id?.replace("marathon-", "") === m.id?.replace("marathon-", ""));
    return found?.challenges || [];
  };

  const values = [
    { title: lang === "ka" ? "ნებაყოფლობითობა" : "Voluntariness", desc: lang === "ka" ? "თამაშში მონაწილეობა და ნებისმიერი ტიპის გამოწვევის აღება აბსოლუტურად თქვენი თავისუფალი არჩევანია." : "Strictly your free choice.", icon: Compass },
    { title: lang === "ka" ? "უსაფრთხოება" : "Safety First", desc: lang === "ka" ? "არცერთი დავალება არ უნდა იყოს თქვენი ან სხვისი ჯანმრთელობისთვის, უსაფრთხოებისთვის ან ღირსებისთვის საზიანო." : "No challenge should ever endanger safety.", icon: Shield },
    { title: lang === "ka" ? "პატივისცემა" : "Mutual Respect", desc: lang === "ka" ? "მოთამაშეები ერთმანეთს არ ამცირებენ, პატივს სცემენ განსხვავებულ ფორმატებს და გვერდში უდგანან განვითარების გზაზე." : "Players respect each other.", icon: Heart },
    { title: lang === "ka" ? "სიმამაცე" : "Courage & Bravery", desc: lang === "ka" ? "თამაში გეხმარებათ საკუთარი შიშების, ხელოვნური ბარიერებისა და სოციალური შფოთვის უსაფრთხოდ გადალახვაში." : "Overcome personal limitations.", icon: Flame },
    { title: lang === "ka" ? "შემოქმედებითობა" : "Creativity", desc: lang === "ka" ? "ყველა დავალება შეიძლება შესრულდეს მაქსიმალურად ორიგინალურად, პიროვნულად, შემოქმედებითად და საინტერესოდ." : "Maximum creative personality.", icon: Paintbrush }
  ];

  const rules = [
    { title: lang === "ka" ? "რეგისტრაცია და ნიკნეიმი" : "Registration & Nickname", desc: lang === "ka" ? "თამაშში შემოსასვლელად ქმნით ანგარიშს. შეგიძლიათ გამოიყენოთ საიდუმლო ნიკნეიმი თქვენი ანონიმურობისთვის." : "Choose a pseudonym.", icon: UserPlus },
    { title: lang === "ka" ? "მონაწილეობის შეთანხმება" : "Participation Agreement", desc: lang === "ka" ? "რეგისტრაციისას ხელს აწერთ ელექტრონულ თანხმობას, რომ თამაშობთ ნებაყოფლობით და პასუხისმგებლობა გეკისრებათ მხოლოდ თქვენ." : "Confirm voluntary play.", icon: FileText },
    { title: lang === "ka" ? "ვიდეოების ხილვადობა" : "Video Visibility", desc: lang === "ka" ? "ყოველი დავალებისას თავად ირჩევთ სტატუსს: საჯარო თუ დამალული." : "Choose visibility for bonuses.", icon: Eye },
    { title: lang === "ka" ? "ხმის მიცემა & რეზონანსი" : "Voting & Resonance", desc: lang === "ka" ? "მხარდაჭერა! ხმის მიცემით თქვენ გერიცხებათ +2 ქულა, ხოლო მოთამაშე იღებს დამატებით +5 რეიტინგს." : "Upvoting awards currency.", icon: Heart },
    { title: lang === "ka" ? "საერთო რეიტინგი / ლიდერბორდი" : "Leaderboard Standards", desc: lang === "ka" ? "ვირტუალური ქულებით ყალიბდება ლიდერთა დაფა. რეიტინგში ჩანს მხოლოდ თქვენი არჩეული ნიკნეიმი." : "Scores form standings.", icon: Trophy }
  ];

  return (
    <div className="w-full min-h-screen bg-[#04020d] text-slate-100 font-sans overflow-x-hidden">
      
      {/* HERO SECTION - 100% სიგანე */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-16 lg:pb-28 px-4 sm:px-8 md:px-12 bg-radial-at-t from-[#151034] via-[#050311] to-[#03010a]">
        <div className="max-w-5xl mx-auto relative z-10 text-left space-y-6">
          <div className="inline-flex items-center gap-1.5 bg-[#120D2F]/75 border border-violet-500/30 px-3 sm:px-4 py-1.5 rounded-full text-xs font-bold text-violet-300 backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5 text-fuchsia-400 animate-pulse" />
            <span>{lang === "ka" ? "სივრცითი პროვოკაციული თამაში" : "Spatial Provocative Game"}</span>
          </div>

          <h1 className="text-4xl xs:text-5xl sm:text-7xl md:text-8xl font-black tracking-tight">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-500 via-fuchsia-500 to-amber-500 font-extrabold filter drop-shadow-[0_0_15px_rgba(167,139,250,0.25)]">
              {lang === "ka" ? "ბიფურკაცია" : "Bifurcation"}
            </span>
          </h1>

          <div className="flex gap-3 sm:gap-4 items-stretch pl-1">
            <div className="w-1 sm:w-1.5 rounded-full bg-gradient-to-b from-[#7c3aed] via-[#db2777] to-[#fbbf24] shrink-0"></div>
            <div className="space-y-2">
              <h2 className="text-base sm:text-xl md:text-2xl font-black text-white leading-snug">
                {lang === "ka" ? "ახალი გამოწვევები, სოციალური თამაშები და უფრო თავდაჯერებული შენ." : "New challenges, social games, and a more confident you."}
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 font-light max-w-xl">
                {lang === "ka" ? "ეს არ არის ჩვეულებრივი პორტალი. ეს არის შენი შემოქმედებითი გამბედაობის სივრცე, სადაც ყოველი მცირე გადაწყვეტილება გიბიძგებს პიროვნული ტრანსფორმაციისკენ." : "This is your safe zone of creative courage."}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2 w-full sm:w-auto">
            <button onClick={handleStartGameClick} className="px-6 py-3.5 bg-gradient-to-r from-violet-650 via-fuchsia-600 to-indigo-650 text-white font-extrabold text-sm rounded-full flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-fuchsia-550/20 hover:scale-[1.02] transition-all">
              <span>{lang === "ka" ? "დაიწყე თამაში" : "Start the Game"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button onClick={handleViewMarathonsClick} className="px-6 py-3.5 bg-white/5 text-white border border-white/10 rounded-full flex items-center justify-center gap-2 cursor-pointer hover:bg-white/10 transition-all">
              <Play className="w-4 h-4 text-fuchsia-400 fill-fuchsia-400" />
              <span>{lang === "ka" ? "ნახე როგორ მუშაობს" : "See How It Works"}</span>
            </button>
          </div>
        </div>
      </section>

      {/* 🔮 ორიგინალური გლობალური ორსვეტიანი ბადე გვერდითა სექციებისთვის */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-12 flex flex-col lg:flex-row gap-8">
        {/* 👉 მარცხენა სვეტი: საჯარო კედელი, მარათონები, ფასეულობები, წესები */}
        <div className="flex-1 space-y-12">

          {/* 🌟 სასაჩვენებელი საჯარო სიმამაცის კედელი */}
          <div id="submissions-showcase" className="bg-[#FFF0E8] border border-[#E3DDF4] rounded-[32px] p-6 sm:p-10 shadow-[0_12px_30px_rgba(94,88,120,0.04)] space-y-6 text-left">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 bg-[#FF9B6A]/10 border border-[#FF9B6A]/20 px-3.5 py-1 text-xs text-[#FF9B6A] font-extrabold uppercase rounded-full">
                საჯარო სიმამაცის კედელი
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-[#27213F] tracking-tight">
                კომპლექსები, შიში და <span className="text-[#FF9B6A]">სოციალური სიმამაცე</span>
              </h2>
              <p className="text-xs md:text-sm text-[#5E5878] font-light">
                {lang === "ka" 
                  ? "მოთამაშეები იღებენ ფსიქოლოგიურ და კრეატიულ გამოწვევებს, წერენ ვიდეოს და უზიარებენ ერთმანეთს." 
                  : "Players accept psychological and creative challenges, record videos, and share them with each other."}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
              {currentFeedSubmissions.map((sub: any) => (
                <div 
                  key={sub.id} 
                  onClick={() => setActiveMediaSub(sub)}
                  className="group flex flex-col bg-white rounded-[24px] border border-[#E8E2F1] overflow-hidden hover:shadow-xl transition-all duration-300 relative cursor-pointer"
                >
                  <div className="aspect-video relative overflow-hidden bg-slate-950 select-none">
                    {(() => {
                      const url = sub.fileUrl || sub.videoUrl || "";
                      const isImage = url.startsWith("data:image/") || url.endsWith(".png") || url.endsWith(".jpg") || url.endsWith(".jpeg") || url.includes("images.unsplash.com");
                      const isAudio = url.startsWith("data:audio/") || url.endsWith(".mp3") || url.endsWith(".wav") || url.includes("audio");

                      if (isImage) {
                        return (
                          <img 
                            className="w-full h-full object-cover opacity-90 transition-transform duration-500 group-hover:scale-105 bg-slate-950" 
                            src={url} 
                            alt={sub.challengeTitle || "Submission"} 
                            referrerPolicy="no-referrer"
                          />
                        );
                      }

                      if (isAudio) {
                        return (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-[#0f0b21] hover:bg-[#15102a] transition-colors p-4 text-center select-none">
                            <div className="w-12 h-12 rounded-full bg-[#7C4DFF]/15 text-[#7C4DFF] flex items-center justify-center mb-2">
                              <span className="text-xl">🎵</span>
                            </div>
                            <span className="text-[10px] text-purple-300 font-extrabold uppercase font-mono tracking-wider">Audio Evidence</span>
                          </div>
                        );
                      }

                      return (
                        <video 
                          className="w-full h-full object-cover opacity-90 transition-transform duration-500 group-hover:scale-105" 
                          src={url} 
                          loop 
                          muted 
                          playsInline 
                          autoPlay 
                        />
                      );
                    })()}
                    <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-white/95 px-3 py-1.5 rounded-xl border" onClick={(e) => e.stopPropagation()}>
                      <img src={getPlayerAvatar(sub.playerNickname, sub.playerAvatar)} className="w-5 h-5 rounded-full object-cover" alt="avatar" />
                      <span className="text-[11px] text-[#27213F] font-extrabold max-w-[100px] truncate">{sub.playerNickname}</span>
                    </div>
                  </div>
                  <div className="p-5 space-y-3.5 bg-white flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-extrabold text-base text-[#27213F] line-clamp-2 leading-snug group-hover:text-[#FF9B6A] transition-colors">{sub.challengeTitle}</h4>
                      <p className="text-xs text-[#5E5878] line-clamp-3 leading-relaxed font-light mt-1">{sub.textDescription || sub.comment}</p>
                    </div>
                    {/* გულის ხმის მიცემა და მხარდაჭერა - სრულად დეკუპლირებული stopPropagation-ით */}
                    <div className="flex justify-between items-center text-xs pt-4 border-t border-[#E8E2F1] mt-2" onClick={(e) => e.stopPropagation()}>
                      {(() => {
                        const guestVoterId = typeof window !== 'undefined' ? localStorage.getItem("bifurcation_guest_voter_id") : null;
                        const voterId = currentUser ? currentUser.id : guestVoterId;
                        const hasLiked = voterId && sub.likedBy?.includes(voterId);

                        return (
                          <span 
                            className={`font-extrabold flex items-center gap-1.5 cursor-pointer transition-colors ${hasLiked ? "text-rose-600 font-black" : "text-[#5E5878] hover:text-rose-600"}`}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleVoteAction(sub);
                            }}
                          >
                            <Heart className={`w-4 h-4 transition-transform hover:scale-115 ${hasLiked ? "text-rose-500 fill-rose-500 scale-105" : "text-rose-400 fill-none"}`} />
                            {sub.likedBy?.length || sub.votes || 0} {lang === "ka" ? "ხმა" : "votes"}
                          </span>
                        );
                      })()}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleVoteAction(sub);
                        }}
                        className="bg-[#FFF0E8] hover:bg-[#FF9B6A] hover:text-white text-[#FF9B6A] border border-[#FF9B6A]/20 font-extrabold px-3.5 py-1.5 rounded-lg transition-all cursor-pointer"
                      >
                        👍 {lang === "ka" ? "მხარდაჭერა" : "Vote"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 🌟 მარათონების პანელი (ივნისი, ივლისი, აგვისტო, სექტემბერი) */}
          <div id="marathons-dashboard" className="bg-[#EAF8F2] border border-[#E3DDF4] rounded-[32px] p-6 sm:p-10 text-left space-y-6">
            <div className="space-y-2">
              <span className="bg-[#32B88A]/10 text-[#32B88A] text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">მარათონები</span>
              <h2 className="text-2xl md:text-3xl font-black text-[#27213F]">{lang === "ka" ? "ბიფურკაციის ყოველთვიური მარათონები" : "Monthly Marathons"}</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {marathons.map((m: any) => {
                const playerRecord = currentUser ? monthlyPlayerRecords.find(r => r.playerId === currentUser.id && r.marathonId === m.id) : null;
                const isJoined = playerRecord && playerRecord.participationConfirmed;
                const completedCount = playerRecord ? playerRecord.completedChallenges?.length || 0 : 0;
                
                return (
                  <div key={m.id} className={`p-6 rounded-[24px] border bg-white flex flex-col justify-between text-left transition-all hover:shadow-md ${m.status === "active" ? "border-2 border-[#32B88A]" : "border-slate-200"}`}>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-3xl select-none">{getMonthEmoji(m.id)}</span>
                        <span className="text-[9px] font-black px-2.5 py-1 bg-slate-100 rounded-full uppercase tracking-wider">{m.status}</span>
                      </div>
                      <h3 className="font-extrabold text-base text-[#27213F] leading-snug">{lang === "ka" ? m.title_ka : m.title_en}</h3>
                      <p className="text-[11px] text-slate-400 font-mono">{getCountdownText(m.endDate, lang)}</p>
                      
                      {isJoined && (
                        <div className="p-3 bg-emerald-50/60 rounded-xl space-y-2 text-xs border border-emerald-100">
                          <div className="flex justify-between font-bold text-slate-700">
                            <span>პროგრესი:</span>
                            <span className="text-[#32B88A] font-black">{completedCount} / 10</span>
                          </div>
                          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-[#32B88A] h-full transition-all" style={{ width: `${(completedCount / 10) * 100}%` }}></div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="pt-4 mt-4 border-t border-slate-100">
                      {/* 🚀 სრულად ამუშავებული ფუნქციონალური ღილაკი ნებისმიერი ადამიანისთვის (სტუმარი თუ რეგისტრირებული) */}
                      <button 
                        type="button" 
                        onClick={() => setSelectedPreviewMarathon(m)} 
                        className="w-full py-2.5 bg-[#EAF8F2] hover:bg-[#32B88A] text-[#32B88A] hover:text-white rounded-xl text-xs font-black transition-all cursor-pointer text-center block"
                      >
                        {isJoined ? (lang === "ka" ? "გახსნა 🚀" : "Open 🚀") : (lang === "ka" ? "გამოწვევები 📋" : "Challenges 📋")}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* სექცია 4: ფასეულობები და ეთიკა */}
          <div id="values-section" className="bg-[#EAF3FF] border border-[#E3DDF4] rounded-[32px] p-6 sm:p-10 text-left space-y-6">
            <div className="text-center space-y-1 max-w-xl mx-auto">
              <span className="px-3 py-1 bg-[#4C8DFF]/10 text-[#4C8DFF] text-[10px] font-black uppercase rounded-full tracking-wider">ფასეულობები</span>
              <h3 className="text-2xl font-black text-[#27213F]">ფასეულობები & ეთიკა</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-5">
              {values.map((v, i) => {
                const Icon = v.icon;
                return (
                  <div key={i} className="bg-white border border-[#E8E2F1] p-5 rounded-2xl text-left space-y-2 hover:shadow-sm transition-all">
                    <div className="w-9 h-9 rounded-xl bg-[#EAF3FF] text-[#4C8DFF] flex items-center justify-center font-bold"><Icon className="w-4 h-4" /></div>
                    <h5 className="font-black text-xs text-[#27213F] uppercase tracking-tight">{v.title}</h5>
                    <p className="text-[11px] text-[#5E5878] font-light leading-relaxed">{v.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* სექცია 5: თამაშის ოფიციალური წესები */}
          <div id="conditions-section" className="bg-[#FFF0F6] border border-[#E3DDF4] rounded-[32px] p-6 sm:p-10 text-left space-y-6">
            <div className="text-center space-y-1 max-w-xl mx-auto">
              <span className="px-3 py-1 bg-[#E76FD6]/10 text-[#E76FD6] text-[10px] font-black uppercase rounded-full tracking-wider">ინსტრუქცია</span>
              <h3 className="text-2xl font-black text-[#27213F]">თამაშის ოფიციალური წესები</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {rules.map((r, idx) => {
                const Icon = r.icon;
                return (
                  <div key={idx} className="p-5 rounded-2xl border border-[#E8E2F1] bg-white text-left space-y-2 hover:scale-[1.01] transition-transform">
                    <div className="w-8 h-8 rounded-lg bg-[#FFF0F6] text-[#E76FD6] flex items-center justify-center"><Icon className="w-4 h-4" /></div>
                    <h5 className="font-black text-xs text-[#27213F] leading-snug">{r.title}</h5>
                    <p className="text-[11px] text-[#5E5878] font-light leading-relaxed">{r.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* 👉 მარჯვენა სვეტი: LIVE რეიტინგი */}
        <div className="w-full lg:w-76 shrink-0 lg:sticky lg:top-24">
          <LiveLeaderboardSidebar currentUser={currentUser} lang={lang === "ka" ? "ka" : "en"} monthlyPlayerRecords={monthlyPlayerRecords} />
        </div>

      </div>

      {/* 🎬 მედია მოდალი საჯარო ვიდეოების/ფოტოების/აუდიოების სრულეკრანიანი ჩვენებისთვის */}
      {activeMediaSub && (() => {
        const liveActiveSub = submissions?.find(s => s.id === activeMediaSub.id) || activeMediaSub;
        const url = liveActiveSub.fileUrl || liveActiveSub.videoUrl;
        const guestVoterId = typeof window !== 'undefined' ? localStorage.getItem("bifurcation_guest_voter_id") : null;
        const voterId = currentUser ? currentUser.id : guestVoterId;
        const hasLiked = voterId && liveActiveSub.likedBy?.includes(voterId);

        return (
          <div className="fixed inset-0 z-55 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-5 max-w-md w-full relative text-left space-y-3 shadow-2xl border">
              <button onClick={() => setActiveMediaSub(null)} className="absolute top-4 right-4 text-slate-400 font-bold hover:text-black w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center cursor-pointer">✕</button>
              <span className="text-[10px] uppercase font-black text-[#7C4DFF] tracking-widest bg-purple-50 px-2.5 py-0.5 rounded-full inline-block">მტკიცებულება</span>
              <h4 className="text-base font-extrabold text-[#27213F] pr-6">{liveActiveSub.challengeTitle}</h4>
              <div className="relative aspect-[16/10] bg-black rounded-2xl overflow-hidden flex items-center justify-center">
                {(() => {
                  if (!url) {
                    return (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-slate-400 p-6 text-center">
                        <p className="text-xs font-semibold">{lang === "ka" ? "მედია ფაილი არ არის" : "No media file"}</p>
                      </div>
                    );
                  }

                  const type = liveActiveSub.submissionType || "";
                  const isImage = type === "photo" || 
                                  url.match(/\.(jpeg|jpg|gif|png|webp|svg)($|\?)/i) || 
                                  url.startsWith("data:image/");

                  const isAudio = type === "audio" || 
                                  url.match(/\.(mp3|wav|ogg|aac|m4a)($|\?)/i) || 
                                  url.startsWith("data:audio/");

                  if (isImage) {
                    return (
                      <img 
                        src={url} 
                        className="w-full h-full object-contain bg-slate-950 mx-auto" 
                        alt={liveActiveSub.challengeTitle || "Submission"} 
                        referrerPolicy="no-referrer"
                      />
                    );
                  }

                  if (isAudio) {
                    return (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 p-6 text-white space-y-4">
                        <div className="w-16 h-16 rounded-full bg-[#7C4DFF]/20 text-[#7C4DFF] flex items-center justify-center animate-bounce">
                          <span className="text-3xl">🎵</span>
                        </div>
                        <audio src={url} className="w-4/5 mx-auto" controls autoPlay />
                        <p className="text-[10px] text-slate-400 font-mono select-none uppercase tracking-wider">AUDIO PLAYBACK</p>
                      </div>
                    );
                  }

                  return (
                    <video 
                      src={url} 
                      className="w-full h-full object-contain bg-slate-950" 
                      controls 
                      autoPlay 
                      playsInline 
                    />
                  );
                })()}
              </div>

              {/* მოთამაშის კომენტარი */}
              <div className="bg-slate-50 border p-3 rounded-xl text-xs text-slate-700 leading-relaxed font-sans">
                <strong className="text-[#27213F] block mb-1">მოთამაშის კომენტარი:</strong>
                {liveActiveSub.textDescription || liveActiveSub.comment}
              </div>

              {/* 💖 მხარდაჭერის ღილაკი და გულები მოდალში */}
              <div className="flex justify-between items-center text-xs pt-3 border-t border-[#E8E2F1]">
                <span 
                  className={`font-extrabold flex items-center gap-1.5 cursor-pointer transition-colors ${hasLiked ? "text-rose-600 font-black" : "text-[#5E5878] hover:text-rose-600"}`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleVoteAction(liveActiveSub);
                  }}
                >
                  <Heart className={`w-4 h-4 transition-transform hover:scale-115 ${hasLiked ? "text-rose-500 fill-rose-500 scale-105" : "text-rose-400 fill-none"}`} />
                  {liveActiveSub.likedBy?.length || liveActiveSub.votes || 0} {lang === "ka" ? "ხმა" : "votes"}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleVoteAction(liveActiveSub);
                  }}
                  className="bg-[#FFF0E8] hover:bg-[#FF9B6A] hover:text-white text-[#FF9B6A] border border-[#FF9B6A]/20 font-extrabold px-3.5 py-1.5 rounded-lg transition-all cursor-pointer text-xs"
                >
                  👍 {lang === "ka" ? "მხარდაჭერა" : "Vote"}
                </button>
              </div>

              {/* ჩვეულ ფორმაში დაბრუნება (დახურვის ღილაკი ქვევითაც) */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setActiveMediaSub(null)}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4 text-slate-500" />
                  <span>{lang === "ka" ? "ჩვეულ ფორმაში დაბრუნება" : "Return to Site Layout"}</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 🌟 ყოველთვიური მარათონის გამოწვევების დეტალური განხილვის მოდალი */}
      {selectedPreviewMarathon && (() => {
        const m = selectedPreviewMarathon;
        const challs = getPreviewChallenges(m);
        
        return (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 antialiased">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-4xl w-full border border-violet-100 shadow-2xl text-left space-y-6 max-h-[92vh] overflow-y-auto relative">
              
              <button 
                type="button" 
                onClick={() => setSelectedPreviewMarathon(null)} 
                className="absolute top-4 right-4 text-slate-400 font-bold hover:text-black cursor-pointer w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center transition-colors"
              >
                ✕
              </button>
              
              <div className="space-y-1 pr-8">
                <span className="bg-[#7C4DFF]/10 text-[#7C4DFF] text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                  ✨ {lang === "ka" ? "ხელოვნური ინტელექტის გამოწვევები" : "AI Generated Challenges"}
                </span>
                <h3 className="font-extrabold text-2xl text-[#1E1B35] leading-tight">
                  {lang === "ka" ? m.title_ka : m.title_en}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {lang === "ka" 
                    ? "მარტივი, საშუალო და რთული გამოწვევები ბალანსითა და დადგენილი ქულებით." 
                    : "10 balanced challenges categorised by difficulty levels and points rewards."}
                </p>
              </div>

              {/* Grid Layout of 10 challenges */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {challs.map((c: any, index: number) => {
                  const diffColors = c.difficulty === "easy" 
                    ? "bg-emerald-50 text-emerald-850 hover:bg-emerald-100 border-emerald-100" 
                    : c.difficulty === "medium" 
                      ? "bg-amber-50 text-amber-850 hover:bg-amber-100 border-amber-100" 
                      : "bg-purple-50 text-purple-850 hover:bg-purple-105 border-purple-100";

                  return (
                    <div 
                      key={c.id}
                      onClick={() => setSelectedPreviewChallenge(c)}
                      className="p-4 bg-[#FAF8FF] border border-violet-100/50 hover:border-[#7C4DFF]/40 rounded-2xl cursor-pointer transition-all hover:scale-[1.01] hover:shadow-xs space-y-3 relative group"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-[10px] font-bold text-slate-400 font-mono">#{index + 1}</span>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${diffColors}`}>
                            {lang === "ka" 
                              ? (c.difficulty === "easy" ? "ადვილი" : c.difficulty === "medium" ? "საშუალო" : "რთული") 
                              : c.difficulty}
                          </span>
                          <span className="text-[10px] font-black bg-amber-50 text-amber-900 border border-amber-100 px-2 py-0.5 rounded-md">
                            🪙 {c.completionReward || c.points || 20}
                          </span>
                        </div>
                      </div>

                      <h4 className="font-extrabold text-[#27213F] text-xs leading-snug group-hover:text-[#7C4DFF] transition-colors line-clamp-2">
                        {lang === "ka" ? (c.title_ka || c.title) : (c.title_en || c.title)}
                      </h4>

                      <p className="text-[11px] text-slate-500 font-medium line-clamp-2 leading-relaxed">
                        {lang === "ka" ? (c.description_ka || c.description) : (c.description_en || c.description)}
                      </p>

                      <div className="flex justify-end pt-1">
                        <span className="text-[9px] font-extrabold text-[#7C4DFF] group-hover:underline flex items-center gap-1">
                          {lang === "ka" ? "დეტალების ნახვა ➔" : "View Details ➔"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Action Footer */}
              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                <p className="text-[11px] text-slate-400 font-mono">
                  {lang === "ka" 
                    ? "📍 თამაშში ჩასართავად და ქულების მოსაგროვებლად გადადით შესაბამის მარათონზე" 
                    : "📍 To start playing and collecting points, navigate to this marathon's workspace"}
                </p>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setSelectedPreviewMarathon(null)}
                    className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black rounded-xl transition-all cursor-pointer whitespace-nowrap"
                  >
                    {lang === "ka" ? "დახურვა" : "Close"}
                  </button>
                  {currentUser ? (
                    <button
                      type="button"
                      onClick={() => {
                        const mId = m.id;
                        if (setSelectedMarathonId) setSelectedMarathonId(mId);
                        setSelectedPreviewMarathon(null);
                        setCurrentTab("cabinet");
                        if (setActiveCabinetTab) setActiveCabinetTab("challenges");
                      }}
                      className="flex-1 sm:flex-none px-5 py-2.5 bg-[#7C4DFF] hover:bg-[#6c3df0] text-white text-xs font-black rounded-xl shadow-md transition-all cursor-pointer whitespace-nowrap"
                    >
                      🚀 {lang === "ka" ? "გახსენი ხელსაწყოები" : "Open Workspace"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPreviewMarathon(null);
                        onStartRegister();
                      }}
                      className="flex-1 sm:flex-none px-5 py-2.5 bg-[#7C4DFF] hover:bg-[#6c3df0] text-white text-xs font-black rounded-xl shadow-md transition-all cursor-pointer whitespace-nowrap"
                    >
                      👑 {lang === "ka" ? "რეგისტრაცია და მონაწილეობა" : "Register to Start"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 🌟 ცალკეული გამოწვევის დეტალური გადახედვის მოდალი */}
      {selectedPreviewChallenge && (() => {
        const c = selectedPreviewChallenge;
        const diffColors = c.difficulty === "easy" 
          ? "bg-emerald-100 text-emerald-800 border-emerald-200" 
          : c.difficulty === "medium" 
            ? "bg-amber-100 text-amber-800 border-amber-200" 
            : "bg-purple-100 text-purple-800 border-purple-200";

        return (
          <div className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-lg flex items-center justify-center p-4 antialiased">
            <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-xl w-full border border-violet-100 shadow-2xl text-left space-y-5 max-h-[90vh] overflow-y-auto relative">
              
              <button 
                type="button" 
                onClick={() => setSelectedPreviewChallenge(null)} 
                className="absolute top-4 right-4 text-slate-400 font-bold hover:text-black cursor-pointer w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"
              >
                ✕
              </button>

              <div className="space-y-1.5 pr-8">
                <div className="flex gap-1.5 items-center">
                  <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${diffColors}`}>
                    {lang === "ka" 
                      ? (c.difficulty === "easy" ? "ადვილი" : c.difficulty === "medium" ? "საშუალო" : "რთული") 
                      : c.difficulty}
                  </span>
                  <span className="text-[10px] font-black bg-amber-55 text-amber-900 border border-amber-100 px-2 py-0.5 rounded-md">
                    🪙 {c.completionReward || c.points || 20}
                  </span>
                </div>
                <h3 className="font-extrabold text-[#1E1B35] leading-snug">
                  {lang === "ka" ? (c.title_ka || c.title) : (c.title_en || c.title)}
                </h3>
              </div>

              <div className="space-y-4">
                {/* Description */}
                <div className="p-4 bg-slate-50 rounded-xl text-xs space-y-2 leading-relaxed text-slate-700 border border-violet-50">
                  <strong className="text-[#7C4DFF] font-black block mb-1">
                    {lang === "ka" ? "📋 გამოწვევის შინაარსი" : "📋 Challenge Info"}
                  </strong>
                  <p className="whitespace-pre-wrap font-medium">
                    {lang === "ka" 
                      ? (c.description_ka || c.description || "") 
                      : (c.description_en || c.description || "")}
                  </p>
                  {c.fullInstructions && (
                    <p className="whitespace-pre-wrap mt-2 pl-3 border-l-2 border-violet-200 text-slate-500">
                      {lang === "ka" ? c.fullInstructions : (c.fullInstructions_en || c.fullInstructions)}
                    </p>
                  )}
                </div>

                {/* Rules & Scoring */}
                <div className="p-4 bg-slate-50 rounded-xl text-xs space-y-2 leading-relaxed text-slate-700 border border-violet-50">
                  <strong className="text-[#FF9B6A] font-black block mb-1">
                    {lang === "ka" ? "⚖️ ქულების დარიცხვა" : "⚖️ Scoring Framework"}
                  </strong>
                  <div className="whitespace-pre-wrap font-medium text-slate-600">
                    {lang === "ka" 
                      ? (c.fullDescription || c.fullDescription_ka || `სათამაშო ქულების დადგენილი წესები:\n\n1. გამოწვევის საბაზისო ქულა: +${c.points || 20} ქულა შესრულებისთვის.\n2. დედლაინამდე შესრულების ბონუსი: +10 ქულა (3 დღე).\n3. სიმამაცის ქულა: +15 ქულა (საჯაროობა).\n\n🏆 გამარჯვებული გამოვლინდება ყოველი თვის 30 რიცხვში.`) 
                      : (c.fullDescription_en || c.fullDescription || `Scoring details:\n1. Base Reward: +${c.points || 20} pts.\n2. Quick Sub: +10 pts bonus.\n3. Public visibility: +15 pts bravery bonus.`)}
                  </div>
                  <div className="whitespace-pre-wrap mt-2 pl-3 border-l-2 border-amber-300 italic text-amber-800 bg-amber-50/40 p-2.5 rounded-lg text-[11px]">
                    <strong>💡 {lang === "ka" ? "უსაფრთხოება:" : "Safety rules:"} </strong>
                    {lang === "ka" 
                      ? (c.safetyRules || c.safetyRules_ka || "გამოწვევა უნდა შესრულდეს სრულიად უსაფრთხო გარემოში.") 
                      : (c.safetyRules_en || c.safetyRules || "The challenge must be performed in an absolutely safe environment.")}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedPreviewChallenge(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black rounded-xl cursor-pointer text-center"
                >
                  {lang === "ka" ? "უკან დაბრუნება" : "Go Back"}
                </button>
                {currentUser ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (setSelectedMarathonId) {
                        setSelectedMarathonId(c.marathonId);
                      }
                      setSelectedPreviewChallenge(null);
                      setSelectedPreviewMarathon(null);
                      setCurrentTab("cabinet");
                      if (setActiveCabinetTab) setActiveCabinetTab("challenges");
                    }}
                    className="flex-1 py-2.5 bg-[#7C4DFF] hover:bg-[#6c3df0] text-white text-xs font-black rounded-xl cursor-pointer text-center shadow-md shadow-[#7C4DFF]/25"
                  >
                    🚀 {lang === "ka" ? "დაიწყე შესრულება" : "Start Challenge"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPreviewChallenge(null);
                      setSelectedPreviewMarathon(null);
                      onStartRegister();
                    }}
                    className="flex-1 py-2.5 bg-[#7C4DFF] hover:bg-[#6c3df0] text-white text-xs font-black rounded-xl cursor-pointer text-center shadow-md shadow-[#7C4DFF]/25"
                  >
                    👑 {lang === "ka" ? "შესრულება" : "Participate"}
                  </button>
                )}
              </div>

            </div>
          </div>
        );
      })()}

    </div>
  );
}
