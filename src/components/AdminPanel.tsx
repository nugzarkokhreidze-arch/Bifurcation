import React, { useState, useEffect } from "react";
import { User, Challenge } from "../types";
import { Settings, PlusCircle, Trash, Check, ShieldAlert, Sparkles, MessageSquare, Video, UserX, RefreshCw, History } from "lucide-react";
import { backupService } from "../services/backupService";

interface AdminPanelProps {
  currentUser: User;
  onStateUpdate: () => void;
  lang?: "ka" | "en";
}

export default function AdminPanel({ currentUser, onStateUpdate, lang = "ka" }: AdminPanelProps) {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [consultations, setConsultations] = useState<any[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // Form states
  const [marathonTitle, setMarathonTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [rules, setRules] = useState("");
  
  // AI Generator state
  const [styleRef, setStyleRef] = useState("რწმენის ამაღლება და თვითგამოხატვა / Confidence and self-expression");
  const [difficulty, setDifficulty] = useState("medium");
  const [generatingAi, setGeneratingAi] = useState(false);
  const [generatedChallenge, setGeneratedChallenge] = useState<Challenge | null>(null);

  // Answers states
  const [answerMap, setAnswerMap] = useState<Record<string, string>>({});
  const [scheduleTimeMap, setScheduleTimeMap] = useState<Record<string, string>>({});
  const [scheduleLinkMap, setScheduleLinkMap] = useState<Record<string, string>>({});
  const [banReasonMap, setBanReasonMap] = useState<Record<string, string>>({});

  const [activeTab, setActiveTab] = useState<'marathon' | 'challenges' | 'reports' | 'coach' | 'users' | 'backup'>('marathon');
  const [resetConfirmed, setResetConfirmed] = useState(false);

  const fetchAdminData = async () => {
    try {
      const resState = await fetch("/api/state");
      const stData = await resState.json();
      if (resState.ok) {
        setMarathonTitle(stData.marathon.title);
        setStartDate(stData.marathon.startDate);
        setEndDate(stData.marathon.endDate);
        setRules(stData.marathon.rules);
        setChallenges(stData.challenges);
      }

      const resRep = await fetch("/api/admin/reports");
      const repData = await resRep.json();
      if (resRep.ok) setReports(repData);

      const resQ = await fetch("/api/coach/questions");
      const qData = await resQ.json();
      if (resQ.ok) setQuestions(qData);

      const resC = await fetch("/api/coach/consultations");
      const cData = await resC.json();
      if (resC.ok) setConsultations(cData);

      const resU = await fetch("/api/admin/users");
      const uData = await resU.json();
      if (resU.ok) setUsers(uData);

    } catch (e) {
      console.error("Error loading admin lists:", e);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleUpdateMarathon = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/marathon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: marathonTitle, startDate, endDate, rules })
      });
      if (res.ok) {
        alert(
          lang === "ka" 
            ? "მარათონის პაკეტი და წესები წარმატებით განახლდა!" 
            : "Marathon settings and policies successfully updated!"
        );
        onStateUpdate();
        fetchAdminData();
      }
    } catch (err) {
      alert(lang === "ka" ? "შეცდომა განახლებისას." : "Update failed.");
    }
  };

  // AI Challenge Generator
  const handleGenerateAiChallenge = async () => {
    setGeneratingAi(true);
    setGeneratedChallenge(null);
    try {
      const res = await fetch("/api/admin/challenges/generate-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ styleReference: styleRef, difficulty })
      });
      const data = await res.json();
      if (res.ok) {
        setGeneratedChallenge(data.challenge);
      } else {
        alert(data.error || (lang === "ka" ? "გენერირება ჩაიშალა." : "Generation failed."));
      }
    } catch (err) {
      alert(lang === "ka" ? "შეცდომა სერვერთან კავშირისას." : "Connection error.");
    } finally {
      setGeneratingAi(false);
    }
  };

  const handleApproveChallenge = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/challenges/${id}/approve`, { method: "POST" });
      if (res.ok) {
        alert(
          lang === "ka" 
            ? "გამოწვევა დამტკიცებულია და გამოქვეყნებულია კატალოგში!" 
            : "Challenge authorized and published to public catalog!"
        );
        setGeneratedChallenge(null);
        onStateUpdate();
        fetchAdminData();
      }
    } catch (e) {
      alert(lang === "ka" ? "დამტკიცება ვერ მოხერხდა." : "Approval failed.");
    }
  };

  const handleRejectChallenge = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/challenges/${id}/reject`, { method: "POST" });
      if (res.ok) {
        alert(lang === "ka" ? "გამოწვევა გადატანილიაარქივში." : "Challenge moved to internal archives.");
        setGeneratedChallenge(null);
        onStateUpdate();
        fetchAdminData();
      }
    } catch (e) {
      alert(lang === "ka" ? "უარყოფა ვერ მოხერხდა." : "Rejection failed.");
    }
  };

  // Moderate Reports
  const handleModerateReport = async (reportId: string, decision: 'hide' | 'ban' | 'dismiss') => {
    try {
      const res = await fetch(`/api/admin/reports/${reportId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision })
      });
      if (res.ok) {
        alert(
          lang === "ka" 
            ? `მოქმედება ("${decision}") წარმატებით აისახა.` 
            : `Moderation action ("${decision}") processed successfully.`
        );
        fetchAdminData();
        onStateUpdate();
      }
    } catch (e) {
      alert(lang === "ka" ? "შეცდომა მოდერაციისას." : "Moderation execution error.");
    }
  };

  // Answer Coach Question
  const handleAnswerSubmit = async (qId: string) => {
    const text = answerMap[qId];
    if (!text) return;

    try {
      const res = await fetch(`/api/admin/coach/questions/${qId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer: text })
      });
      if (res.ok) {
        alert(
          lang === "ka" 
            ? "პასუხი შენახულია და კლიენტი მიიღებს შეტყობინებას." 
            : "Response submitted. The player will receive an immediate notification."
        );
        setAnswerMap(prev => ({ ...prev, [qId]: "" }));
        fetchAdminData();
        onStateUpdate();
      }
    } catch (e) {
      alert(lang === "ka" ? "შეცდომა პასუხისას." : "Response delivery error.");
    }
  };

  // Schedule Video Link Booking
  const handleScheduleConsult = async (conId: string) => {
    const time = scheduleTimeMap[conId];
    const link = scheduleLinkMap[conId] || "https://meet.google.com/abc-defg-hij";
    if (!time) {
      alert(lang === "ka" ? "გთხოვთ მიუთითოთ შეხვედრის თარიღი და დრო." : "Please specify scheduled call date and time.");
      return;
    }

    try {
      const res = await fetch(`/api/admin/coach/consultations/${conId}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledAt: time, meetingLink: link, status: "scheduled" })
      });
      if (res.ok) {
        alert(
          lang === "ka" 
            ? "კონსულტაცია დაინიშნა და ბმული გაეგზავნა მოთამაშეს!" 
            : "Consultation booked! The player will find the meeting credentials in their hub."
        );
        fetchAdminData();
        onStateUpdate();
      }
    } catch (e) {
      alert(lang === "ka" ? "შეცდომა დანიშვნისას." : "Scheduling error.");
    }
  };

  // Ban or Unban
  const handleBanUser = async (userId: string) => {
    const reason = banReasonMap[userId] || (lang === "ka" ? "წესების დარღვევა" : "Policy guidelines violation");
    try {
      const res = await fetch(`/api/admin/users/${userId}/ban`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason })
      });
      if (res.ok) {
        alert(lang === "ka" ? "წვდომა შეჩერებულია. მომხმარებელი დაიბლოკა!" : "Player access permanently banned!");
        fetchAdminData();
        onStateUpdate();
      }
    } catch (e) {
      alert(lang === "ka" ? "დაბლოკვა ჩაიშალა." : "Ban operation failed.");
    }
  };

  const handleUnbanUser = async (userId: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/unban`, { method: "POST" });
      if (res.ok) {
        alert(
          lang === "ka" 
            ? "პროფილი აღდგენილია წესების განმეორებითი გაცნობის პირობით." 
            : "Profile access unbanned successfully."
        );
        fetchAdminData();
        onStateUpdate();
      }
    } catch (e) {
      alert(lang === "ka" ? "დეაქტივაცია ჩაიშალა." : "Unban operation failed.");
    }
  };

  return (
    <div id="admin-panel" className="space-y-8 text-left max-w-5xl mx-auto pb-12">
      {/* Banner */}
      <div className="bg-gradient-to-r from-red-955/20 via-slate-900 to-red-955/20 border border-slate-850 p-6 rounded-2xl flex items-center gap-4 text-left">
        <div className="p-3 bg-red-500/10 text-red-500 rounded-xl shrink-0">
          <Settings className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-slate-100 uppercase tracking-tight">
            {lang === "ka" ? "ადმინისტრატორის მართვის პანელი" : "Admin Portal Hub"}
          </h2>
          <p className="text-xs text-slate-405">
            {lang === "ka" 
              ? "პერსონალური, უსაფრთხო სივრცე მარათონის პარამეტრების, გამოწვევების, საჩივრებისა და კლიენტების ზარების სამართავად."
              : "Secure configuration console to manage marathon campaigns, pending challenges, incident claims, and coaching queries."}
          </p>
        </div>
      </div>

      {/* Navigation Inside Panel Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-1 text-xs text-left">
        <button
          onClick={() => setActiveTab('marathon')}
          className={`px-4 py-2 border-b-2 font-bold transition-all cursor-pointer ${
            activeTab === 'marathon' ? "border-[#7c3aed] text-violet-300" : "border-transparent text-slate-400 hover:text-slate-205"
          }`}
        >
          {lang === "ka" ? "მარათონის დრო & წესები" : "Timeline & Guidelines"}
        </button>
        <button
          onClick={() => setActiveTab('challenges')}
          className={`px-4 py-2 border-b-2 font-bold transition-all cursor-pointer ${
            activeTab === 'challenges' ? "border-[#7c3aed] text-violet-300" : "border-transparent text-slate-400 hover:text-slate-205"
          }`}
        >
          {lang === "ka" ? "გამოწვევები & AI გენერატორი" : "Challenges & AI Portal"}
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`px-4 py-2 border-b-2 font-bold transition-all cursor-pointer ${
            activeTab === 'reports' ? "border-[#7c3aed] text-violet-300" : "border-transparent text-slate-400 hover:text-slate-205"
          }`}
        >
          {lang === "ka" ? `საჩივრები მოდერაციაზე` : `Incident Pipeline`}
          {reports.filter(r => r.status === "pending").length > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 bg-red-656 bg-red-600 text-white rounded-full text-[9px] font-extrabold font-mono">
              {reports.filter(r => r.status === "pending").length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('coach')}
          className={`px-4 py-2 border-b-2 font-bold transition-all cursor-pointer ${
            activeTab === 'coach' ? "border-[#7c3aed] text-violet-300" : "border-transparent text-slate-400 hover:text-slate-205"
          }`}
        >
          {lang === "ka" ? "კოუჩინგის ინბოქსი" : "Coaching Consultations"}
          {(questions.filter(q => q.status === "pending").length + consultations.filter(c => c.status === "requested").length) > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 bg-sky-600 text-white rounded-full text-[9px] font-mono">
              {questions.filter(q => q.status === "pending").length + consultations.filter(c => c.status === "requested").length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 border-b-2 font-bold transition-all cursor-pointer ${
            activeTab === 'users' ? "border-[#7c3aed] text-violet-300" : "border-transparent text-slate-400 hover:text-slate-205"
          }`}
        >
          {lang === "ka" ? "წვდომის კონტროლი (ბანი)" : "Account Bans"}
        </button>
        <button
          onClick={() => setActiveTab('backup')}
          className={`px-4 py-2 border-b-2 font-bold transition-all cursor-pointer ${
            activeTab === 'backup' ? "border-[#7c3aed] text-violet-300" : "border-transparent text-slate-400 hover:text-slate-205"
          }`}
        >
          {lang === "ka" ? "მონაცემთა ბექაპი / Backup" : "Backup & Restore"}
        </button>
      </div>

      {/* Content Rendering on selected TAB */}
      <div className="bg-slate-900/10 rounded-2xl text-left">

        {/* 1. MARATHON SETTINGS */}
        {activeTab === 'marathon' && (
          <form onSubmit={handleUpdateMarathon} className="bg-[#0b0e22] border border-slate-850 p-6 rounded-2xl space-y-4 text-xs">
            <h3 className="text-sm font-bold text-slate-200 border-b border-slate-800 pb-2 uppercase tracking-wide">
              {lang === "ka" ? "📅 მარათონის პარამეტრები" : "📅 Marathon Global Parameters"}
            </h3>
            
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-350">{lang === "ka" ? "მარათონის სათაური/სახელი" : "Marathon Title/Name"}</label>
              <input
                type="text"
                required
                value={marathonTitle}
                onChange={(e) => setMarathonTitle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-violet-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 text-left">
                <label className="font-semibold text-slate-350">{lang === "ka" ? "დაწყების თარიღი" : "Inaugural Start Date"}</label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 focus:outline-none"
                />
              </div>
              <div className="space-y-1.5 text-left">
                <label className="font-semibold text-slate-355">{lang === "ka" ? "დასრულების თარიღი" : "Campaign End Date"}</label>
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-350">
                {lang === "ka" ? "წესები & პრინციპები (მარათონის წესდება)" : "Marathon Safety & Ethics Regulation Text"}
              </label>
              <textarea
                required
                rows={4}
                value={rules}
                onChange={(e) => setRules(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-250 focus:outline-none font-sans leading-relaxed text-xs"
              />
            </div>

            <button
              type="submit"
              className="px-6 py-2.5 bg-gradient-to-r from-violet-650 to-indigo-650 bg-violet-600 hover:bg-violet-555 rounded-xl font-bold text-white transition-all shadow cursor-pointer text-xs"
            >
              {lang === "ka" ? "მარათონის მონაცემების შენახვა" : "Save Marathon Setup"}
            </button>
          </form>
        )}

        {/* 2. CHALLENGE DATABASE MANAGER & AI GENERATOR */}
        {activeTab === 'challenges' && (
          <div className="space-y-8 text-xs text-left">
            {/* AI Generator section */}
            <div className="bg-slate-900/60 border border-slate-850 p-6 rounded-2xl space-y-4">
              <div className="space-y-1 text-left">
                <div className="inline-flex items-center gap-1.5 text-[10px] font-extrabold bg-[#7c3aed]/10 border border-[#7c3aed]/20 text-violet-400 px-3 py-1 rounded-full uppercase tracking-wider font-mono">
                  <Sparkles className="w-3.5 h-3.5 fill-current" />
                  {lang === "ka" ? "AI პორტალი (Gemini)" : "AI CORE SYNTESIS (Gemini 2.5 M)"}
                </div>
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wide">
                  {lang === "ka" ? "ხელოვნური ინტელექტის გამოწვევის გენერატორი" : "Cognitive Challenge Synthesizer"}
                </h3>
                <p className="text-[11px] text-slate-400 leading-normal max-w-xl font-light">
                  {lang === "ka" 
                    ? "AI გენერატორი ქმნის მხოლოდ სრულიად უსაფრთხო, შემოქმედებით, მხიარულ და კეთილ მოქმედებებს. თამაშის დაუწერელი წესი კრძალავს ნებისმიერ ფიზიკურად ან მორალურად სახიფათო იდეას."
                    : "The synthesizer models safe, creative, playful tasks targeting public comfort. System instructions forbid physical hazards or psychological extreme pressures."}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5 text-left">
                  <label className="font-semibold text-slate-350">{lang === "ka" ? "სტილი / ფოკუსი / თემატიკა" : "Thematic Prompt focus"}</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. communication anxiety, compliments..."
                    value={styleRef}
                    onChange={(e) => setStyleRef(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-violet-500 text-xs"
                  />
                </div>
                <div className="space-y-1.5 text-left">
                  <label className="font-semibold text-slate-355">{lang === "ka" ? "სირთულის დონე" : "Difficulty Matrix"}</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-205 focus:outline-none text-xs"
                  >
                    <option value="easy">{lang === "ka" ? "მარტივი (Easy)" : "Easy"}</option>
                    <option value="medium">{lang === "ka" ? "საშუალო (Medium)" : "Medium"}</option>
                    <option value="hard">{lang === "ka" ? "რთული (Hard)" : "Hard"}</option>
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGenerateAiChallenge}
                disabled={generatingAi}
                className="px-6 py-3 bg-gradient-to-r from-violet-600 to-indigo-650 hover:from-violet-555 rounded-xl text-white font-bold flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer text-xs"
              >
                {generatingAi ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    {lang === "ka" ? "AI ახდენს გამოწვევის ფორმირებას..." : "AI Synthesizing Draft..."}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-violet-300 animate-pulse" />
                    {lang === "ka" ? "AI გამოწვევის გენერირება" : "Synthesize AI Challenge"}
                  </>
                )}
              </button>

              {/* Temp Sandboxed preview */}
              {generatedChallenge && (
                <div className="p-5 bg-slate-950 border border-slate-800 rounded-xl space-y-4 text-left animate-fade-in">
                  <div className="border-b border-slate-850 pb-3">
                    <span className="text-[10px] uppercase font-bold text-violet-400 tracking-wider">
                      {lang === "ka" ? "გენერირებული გამოწვევის შავი ვარიანტი" : "AI Sandbox Raw Draft Output"}
                    </span>
                    <h4 className="text-lg font-bold text-slate-200 mt-1">{generatedChallenge.title}</h4>
                    <span className="text-xs text-slate-400 mt-0.5 block leading-normal">{generatedChallenge.description}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[11px] text-left">
                    <div className="space-y-1">
                      <span className="font-bold text-slate-400 block">📝 {lang === "ka" ? "ინსტრუქცია ქართულად:" : "Task Instructions:"}</span>
                      <p className="text-slate-300 bg-slate-900 p-2.5 rounded border border-slate-850/60 leading-relaxed font-light">{generatedChallenge.fullInstructions}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="font-bold text-red-400 block">⚠️ {lang === "ka" ? "უსაფრთხოების წესი ქართულად/ინგლისურად:" : "Governing Safety Rule:"}</span>
                      <p className="text-red-300 bg-slate-900 p-2.5 rounded border border-red-950/20 leading-relaxed">{generatedChallenge.safetyRules}</p>
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end pt-3 border-t border-slate-850 text-xs">
                    <button
                      onClick={() => handleRejectChallenge(generatedChallenge.id)}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-705 text-slate-300 rounded-xl font-medium cursor-pointer"
                    >
                      {lang === "ka" ? "უარყოფა (არქივში ჩაგდება)" : "Archive & Reject Draft"}
                    </button>
                    <button
                      onClick={() => handleApproveChallenge(generatedChallenge.id)}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-550 text-white font-bold rounded-xl flex items-center gap-1 cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      {lang === "ka" ? "დამტკიცება და გამოქვეყნება" : "Approve & Deploy Live"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Pending Proposals & AI Draft Pool */}
            <div className="space-y-4 bg-slate-900/60 border border-violet-950/20 p-6 rounded-2xl text-left">
              <h3 className="text-sm font-bold text-slate-205 uppercase tracking-wide pb-1 flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-violet-400" />
                {lang === "ka" 
                  ? `📥 დასამტკიცებელი გამოწვევები (${challenges.filter(c => c.status === 'pending').length})` 
                  : `📥 Pending Challenge Approvals (${challenges.filter(c => c.status === 'pending').length})`}
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {lang === "ka"
                  ? "აქ გამოჩნდება მოთამაშეების მიერ შემოთავაზებული იდეები და AI-ს მიერ დაგენერირებული შავი ვარიანტები, რომლებიც საჭიროებენ ადმინისტრატორის თანხმობას."
                  : "Player-submitted ideas or raw AI synthesized sandboxes requiring admin sign-off before rendering in player catalogues."}
              </p>

              {challenges.filter(c => c.status === 'pending').length === 0 ? (
                <div className="p-6 bg-slate-950/30 border border-slate-850 text-center text-slate-500 rounded-xl text-xs font-light">
                  {lang === "ka" ? "განსახილველი ახალი გამოწვევები არ არის." : "All queues cleared. No proposals await authorization."}
                </div>
              ) : (
                <div className="space-y-3.5 pt-2 text-left">
                  {challenges.filter(c => c.status === 'pending').map(c => (
                    <div key={c.id} className="p-4 bg-slate-950 border border-[#1e2030] rounded-xl space-y-3 text-left">
                      <div className="flex justify-between items-start gap-3 flex-wrap">
                        <div>
                          <span className="text-[9px] uppercase font-bold tracking-wider bg-violet-600/10 text-[#7c3aed] border border-violet-500/15 px-2 py-0.5 rounded mr-2 font-mono">
                            {c.proposedByPlayerId 
                              ? (lang === "ka" ? `მოთამაშის იდეა (${c.proposedByPlayerNickname})` : `Player Suggestion (${c.proposedByPlayerNickname})`) 
                              : (lang === "ka" ? "AI დრაფტი" : "AI Sandbox Draft")}
                          </span>
                          <h4 className="font-bold text-slate-200 text-sm mt-1">{c.title}</h4>
                        </div>
                        <div className="flex gap-1.5 font-mono text-[9px]">
                          <span className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-slate-400 uppercase">
                            {lang === "ka" ? "სირთულე:" : "Difficulty:"} {c.difficulty}
                          </span>
                          <span className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-slate-400">
                            SM: {c.emotionalCourageLevel || 3}/5
                          </span>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-350 leading-relaxed font-light">{c.description}</p>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[10px] pt-1 text-left">
                        <div className="bg-[#030712] p-2.5 rounded border border-slate-850">
                          <strong className="text-slate-400 block font-semibold mb-0.5">📝 {lang === "ka" ? "დავალების ინსტრუქცია:" : "Instructions:"}</strong>
                          <span className="text-slate-300 font-light">{c.fullInstructions}</span>
                        </div>
                        <div className="bg-red-950/10 p-2.5 rounded border border-red-950/25">
                          <strong className="text-red-400 block font-semibold mb-0.5">⚠️ {lang === "ka" ? "უსაფრთხოების წესი:" : "Safety Metric:"}</strong>
                          <span className="text-red-300 font-light">{c.safetyRules}</span>
                        </div>
                      </div>

                      {/* Displaying Reflection and Personal development details if populated */}
                      {(c.reflectionQuestion || c.personalDevelopmentReason) && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[10.5px] border-t border-slate-850/50 pt-3 text-left">
                          {c.reflectionQuestion && (
                            <div>
                              <strong className="text-violet-400 block font-semibold mb-0.5">🧠 {lang === "ka" ? "თვითრეფლექსიის კითხვა:" : "Self-Reflection Question:"}</strong>
                              <span className="text-slate-350 italic">"{c.reflectionQuestion}"</span>
                            </div>
                          )}
                          {c.personalDevelopmentReason && (
                            <div>
                              <strong className="text-indigo-400 block font-semibold mb-0.5">💡 {lang === "ka" ? "პერსონალური განვითარება:" : "Growth Explanation:"}</strong>
                              <span className="text-slate-300 leading-normal font-light">{c.personalDevelopmentReason}</span>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex gap-2 justify-end pt-2 border-t border-slate-850/60 text-xs">
                        <button
                          onClick={() => handleRejectChallenge(c.id)}
                          className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-850 text-slate-400 rounded-lg hover:text-red-400 transition-all cursor-pointer"
                        >
                          {lang === "ka" ? "უარყოფა" : "Reject"}
                        </button>
                        <button
                          onClick={() => handleApproveChallenge(c.id)}
                          className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-555 text-white font-extrabold rounded-lg flex items-center gap-1 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          {lang === "ka" ? "დამტკიცება" : "Approve"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Existing Catalogue list */}
            <div className="space-y-4 bg-slate-900/40 border border-slate-850 p-6 rounded-2xl text-left">
              <h3 className="text-sm font-bold text-slate-205 uppercase tracking-wide pb-1 border-b border-slate-850 pb-2">
                {lang === "ka" 
                  ? `📚 მარათონის მოქმედი გამოწვევები კატალოგში (${challenges.filter(c => c.status === 'active').length})` 
                  : `📚 Active Challenges Catalogue (${challenges.filter(c => c.status === 'active').length})`}
              </h3>

              <div className="divide-y divide-slate-850 space-y-3.5 text-left">
                {challenges.filter(c => c.status === 'active').map(c => (
                  <div key={c.id} className="pt-3 flex justify-between items-start gap-4 text-left">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-200 text-sm">
                          {lang === "en" && c.title_en ? c.title_en : c.title}
                        </span>
                        <span className="text-[9px] bg-slate-800 px-2 py-0.5 rounded text-slate-400 uppercase font-mono">{c.difficulty}</span>
                        {c.aiGenerated && (
                          <span className="text-[9px] bg-violet-600/15 text-violet-400 border border-violet-500/10 px-2 py-0.5 rounded font-black font-mono">
                            AI
                          </span>
                        )}
                        {c.proposedByPlayerId && (
                          <span className="text-[9px] bg-indigo-950/40 text-indigo-450 border border-indigo-900/20 px-2 py-0.5 rounded font-bold font-mono">
                            {lang === "ka" ? "წარადგინა:" : "Author:"} {c.proposedByPlayerNickname}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed font-light">
                        {lang === "en" && c.description_en ? c.description_en : c.description}
                      </p>
                      <div className="text-[10px] text-red-400 font-light">
                        {lang === "ka" ? `უსაფრთხოების წესი: ${c.safetyRules}` : `Safety: ${lang === "en" && c.safetyRules_en ? c.safetyRules_en : c.safetyRules}`}
                      </div>
                    </div>

                    <button
                      onClick={async () => {
                        const confirmPrompt = lang === "ka" ? "ნამდვილად გსურთ გამოწვევის წაშლა?" : "Are you sure you want to delete this challenge model?";
                        if (confirm(confirmPrompt)) {
                          await fetch(`/api/admin/challenges/${c.id}`, { method: "DELETE" });
                          fetchAdminData();
                          onStateUpdate();
                        }
                      }}
                      className="p-1 px-1.5 hover:bg-red-500/10 rounded text-slate-500 hover:text-red-400 transition-all shrink-0 cursor-pointer"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 3. MODERATE ACCORDING TO REPORTS */}
        {activeTab === 'reports' && (
          <div className="space-y-4 bg-slate-900/50 border border-slate-850 p-6 rounded-2xl text-xs text-left">
            <h3 className="text-sm font-bold text-slate-200 border-b border-slate-850 pb-2 uppercase tracking-wide flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-500 shrink-0" />
              {lang === "ka" ? `საჩივრები მოდერაციაზე (${reports.length})` : `Incident Reports Inbox (${reports.length})`}
            </h3>

            {reports.length === 0 ? (
              <p className="text-center py-6 text-slate-550 font-light text-xs">
                {lang === "ka" 
                  ? "საჩივრები არ ფიქსირდება — პლატფორმაზე უსაფრთხო და მეგობრული ატმოსფეროა!" 
                  : "All incident pipelines clear. No pending player flags processed."}
              </p>
            ) : (
              <div className="space-y-4 divide-y divide-[#1e2030] text-left">
                {reports.map((r) => (
                  <div key={r.id} className="pt-4 space-y-2.5 text-left">
                    <div className="flex justify-between items-center flex-wrap gap-2">
                      <div>
                        <span className="font-bold text-slate-300">{lang === "ka" ? "საჩივრის ობიექტი:" : "Claim Target:"} </span>
                        <span className="text-red-400 font-extrabold">{r.reportedName}</span>
                        <span className="text-slate-500 text-[10px] ml-1.5 font-mono">ID: {r.id}</span>
                      </div>
                      <span className={`px-2 py-0.5 text-[9px] font-bold rounded font-mono ${r.status === 'pending' ? 'bg-amber-500/15 text-amber-400' : 'bg-slate-800 text-slate-500'}`}>
                        {r.status === 'pending' ? (lang === "ka" ? 'განხილვის მოლოდინში' : 'PENDING REVIEW') : (lang === "ka" ? 'განხილული' : 'RESOLVED')}
                      </span>
                    </div>

                    <div className="bg-[#030611] p-3.5 rounded-xl border border-slate-850 leading-relaxed font-light text-slate-300 text-left space-y-1">
                      <div>
                        <strong className="text-slate-400 font-semibold text-[10px] uppercase">{lang === "ka" ? "მიზეზი:" : "Accusation Type:"}</strong> {r.reason}
                      </div>
                      <div className="mt-1">
                        <strong className="text-slate-400 font-semibold text-[10px] uppercase">{lang === "ka" ? "აღწერა:" : "Incident details:"}</strong> {r.description}
                      </div>
                      <div className="mt-1 flex items-center gap-1.5">
                        <strong className="text-slate-400 font-semibold text-[10px] uppercase">{lang === "ka" ? "აქტივობის კომენტარი:" : "Clip comment:"}</strong>
                        <span className="italic">"{r.submissionComment}"</span>
                      </div>
                    </div>

                    {r.status === "pending" && (
                      <div className="flex gap-2 justify-end text-xs pt-1">
                        <button
                          onClick={() => handleModerateReport(r.id, "dismiss")}
                          className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-lg cursor-pointer text-xs"
                        >
                          {lang === "ka" ? "უარყოფა" : "Dismiss Claim"}
                        </button>
                        <button
                          onClick={() => handleModerateReport(r.id, "hide")}
                          className="px-3.5 py-1.5 bg-amber-500/15 hover:bg-amber-500 text-amber-300 rounded-lg font-bold cursor-pointer text-xs"
                        >
                          {lang === "ka" ? "ვიდეოს დამალვა" : "Hide Clip"}
                        </button>
                        <button
                          onClick={() => handleModerateReport(r.id, "ban")}
                          className="px-3.5 py-1.5 bg-red-600/15 hover:bg-red-600 text-red-300 rounded-lg font-extrabold cursor-pointer text-xs"
                        >
                          {lang === "ka" ? "სამუდამოდ დაბლოკვა" : "Ban Player"}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 4. COACH QUESTION & APPOINTMENTS INBOX */}
        {activeTab === 'coach' && (
          <div className="space-y-8 text-xs text-left">
            {/* Written coach inbox questions */}
            <div className="bg-slate-900/50 border border-slate-855 p-6 rounded-2xl space-y-4">
              <h3 className="text-sm font-bold text-slate-205 border-b border-slate-850 pb-2 uppercase tracking-wide flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-violet-400" />
                {lang === "ka" 
                  ? `კოუჩინგის კითხვები (${questions.filter(q => q.status === "pending").length} მოლოდინში)` 
                  : `Confidential Inquiries (${questions.filter(q => q.status === "pending").length} Awaiting Response)`}
              </h3>

              {questions.length === 0 ? (
                <p className="text-center text-slate-505 py-4 font-light">
                  {lang === "ka" ? "კითხვები არ ფიქსირდება." : "Zero written questions filed."}
                </p>
              ) : (
                <div className="divide-y divide-[#1b1c2b] space-y-4 text-left">
                  {questions.map((q) => (
                    <div key={q.id} className="pt-4 text-left space-y-3">
                      <div className="flex justify-between items-center flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <img
                            src={q.playerAvatar}
                            alt={q.playerNickname}
                            referrerPolicy="no-referrer"
                            className="w-5 h-5 rounded-full object-cover"
                          />
                          <span className="font-bold text-slate-300 font-mono">{q.playerNickname}</span>
                        </div>
                        <span className={`px-2 py-0.5 text-[8px] font-bold rounded font-mono ${q.status === 'pending' ? 'bg-amber-500/10 text-amber-300' : 'bg-slate-800 text-slate-500'}`}>
                          {q.status === 'pending' ? (lang === "ka" ? 'მოლოდინი' : 'PENDING') : (lang === "ka" ? 'უპასუხა' : 'ANSWERED')}
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 bg-slate-950 p-2.5 rounded border border-slate-850 italic font-mono leading-relaxed">
                        "{q.question}"
                      </p>

                      {q.status === "pending" ? (
                        <div className="space-y-1.5 text-left">
                          <textarea
                            placeholder={lang === "ka" ? "დაწერეთ თქვენი პროფესიონალური პასუხი..." : "Draft safe professional motivation coaching answer..."}
                            value={answerMap[q.id] || ""}
                            onChange={(e) => setAnswerMap(prev => ({ ...prev, [q.id]: e.target.value }))}
                            className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 p-2.5 rounded-xl text-xs placeholder-slate-550 text-slate-200 focus:outline-none focus:ring-1 focus:ring-violet-605"
                          />
                          <button
                            onClick={() => handleAnswerSubmit(q.id)}
                            className="px-4 py-1.5 bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-bold rounded-lg text-xs cursor-pointer"
                          >
                            {lang === "ka" ? "პასუხის გაგზავნა" : "Submit response"}
                          </button>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 pl-2 leading-relaxed">
                          <strong className="text-sky-400">{lang === "ka" ? "პასუხი:" : "Advice response:"}</strong> {q.answer}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Video Consultations calendar scheduling */}
            <div className="bg-slate-900/50 border border-slate-850 p-6 rounded-2xl space-y-4 text-left">
              <h3 className="text-sm font-bold text-slate-200 border-b border-slate-850 pb-2 uppercase tracking-wide flex items-center gap-2">
                <Video className="w-5 h-5 text-sky-455 text-sky-400" />
                {lang === "ka" ? "15 წუთიანი ვიდეო კონსულტაციები" : "15-Min Live Bookings Requests"}
              </h3>

              {consultations.length === 0 ? (
                <p className="text-center text-slate-500 py-4 font-light">
                  {lang === "ka" ? "ვიდეო ჯავშნები არ ფიქსირდება." : "Zero consultation bookings request logs established."}
                </p>
              ) : (
                <div className="divide-y divide-[#1e1f32] space-y-4 text-left">
                  {consultations.map((c) => (
                    <div key={c.id} className="pt-4 text-left space-y-3">
                      <div className="flex justify-between items-center flex-wrap gap-2">
                        <span className="font-bold text-slate-200 font-mono">{lang === "ka" ? "მოთამაშე:" : "Player:"} {c.playerNickname}</span>
                        <span className={`px-2 py-0.5 text-[9px] font-bold rounded font-mono ${c.status === 'requested' ? 'bg-amber-500/10 text-amber-300' : 'bg-emerald-500/10 text-emerald-400'}`}>
                          {c.status.toUpperCase()}
                        </span>
                      </div>

                      {c.status === "requested" ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800 text-left">
                          <div className="space-y-1">
                            <label className="text-slate-400 block text-[10px]">{lang === "ka" ? "შეხვედრის დრო" : "Scheduled Time Slot:"}</label>
                            <input
                              type="datetime-local"
                              value={scheduleTimeMap[c.id] || ""}
                              onChange={(e) => setScheduleTimeMap(prev => ({ ...prev, [c.id]: e.target.value }))}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 text-xs focus:outline-none focus:border-violet-500"
                            />
                          </div>
                          <div className="space-y-1 font-mono">
                            <label className="text-slate-400 block text-[10px]">{lang === "ka" ? "შეხვედრის ლინკი (Google Meet)" : "Video Call Link (Google Meet):"}</label>
                            <input
                              type="url"
                              placeholder="https://meet.google.com/..."
                              value={scheduleLinkMap[c.id] || ""}
                              onChange={(e) => setScheduleLinkMap(prev => ({ ...prev, [c.id]: e.target.value }))}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 text-xs focus:outline-none focus:border-violet-500"
                            />
                          </div>
                          <div className="sm:col-span-2 pt-2 flex justify-end">
                            <button
                              onClick={() => handleScheduleConsult(c.id)}
                              className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg text-xs cursor-pointer"
                            >
                              {lang === "ka" ? "კონსულტაციის დანიშვნა" : "Commit Call Schedule"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-slate-950 p-3 rounded-lg border border-slate-850 text-slate-350 text-xs text-left">
                          <div>{lang === "ka" ? "დრო:" : "Scheduled Time:"} <strong>{new Date(c.scheduledAt).toLocaleString()}</strong></div>
                          <div className="mt-0.5">
                            {lang === "ka" ? "ბმული:" : "Launch Link:"}{' '}
                            <a href={c.meetingLink} target="_blank" rel="noreferrer" className="text-sky-400 underline font-mono">
                              {c.meetingLink}
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 5. PLAYER MANAGEMENT / BANNING SYSTEM */}
        {activeTab === 'users' && (
          <div className="bg-[#0b0e22] border border-slate-850 p-6 rounded-2xl text-xs space-y-4 text-left">
            <h3 className="text-sm font-bold text-slate-205 border-b border-slate-800 pb-2 uppercase tracking-wide flex items-center gap-2">
              <UserX className="w-5 h-5 text-red-500" />
              {lang === "ka" ? "საერთო მომხმარებლები & წვდომის მართვა" : "Marathon Participants & Bans Database"}
            </h3>

            <div className="divide-y divide-slate-850 space-y-4">
              {users.map((u) => (
                <div key={u.id} className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
                  <div className="flex items-center gap-3">
                    <img
                      src={u.avatar}
                      alt={u.nickname}
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-full border border-slate-800 object-cover bg-slate-950 shrink-0"
                    />
                    <div>
                      <h4 className="font-extrabold text-slate-200 text-sm">
                        {u.firstName} {u.lastName} ({u.nickname})
                        {u.isAdmin && (
                          <span className="ml-2 font-mono text-[9px] bg-red-650 bg-red-700 text-white rounded px-1.5 py-0.5 uppercase tracking-wide font-extrabold">
                            {lang === "ka" ? "ადმინი" : "ADMIN"}
                          </span>
                        )}
                        {u.preferredLanguage && (
                          <span className="ml-2 font-mono text-[9px] bg-slate-800 text-slate-300 rounded px-1 min-w-[30px] text-center font-bold">
                            {u.preferredLanguage.toUpperCase()}
                          </span>
                        )}
                      </h4>
                      <p className="text-[10px] text-slate-500 leading-normal font-mono">
                        {lang === "ka" ? "ელფოსტა:" : "Email:"} <strong className="text-slate-400">{u.email}</strong> •{' '}
                        {lang === "ka" ? "ტელ:" : "Phone:"} <strong className="text-slate-400">{u.phone || 'N/A'}</strong> •{' '}
                        {lang === "ka" ? "ქულა:" : "Points:"} <strong className="text-amber-450 font-bold">{u.points} 🪙</strong>
                      </p>
                      {u.banned && (
                        <span className="text-[10px] text-red-400 font-semibold block mt-0.5 font-light">
                          {lang === "ka" ? `დაბლოკილია: "${u.banReason || 'წესების დარღვევა.'}"` : `Banned Reason: "${u.banReason || 'Policy guidelines violation.'}"`}
                        </span>
                      )}
                    </div>
                  </div>

                  {!u.isAdmin && (
                    <div className="flex gap-2 items-center">
                      {!u.banned ? (
                        <div className="flex gap-2 text-[11px] items-center">
                          <input
                            type="text"
                            placeholder={lang === "ka" ? "დაბლოკვის მიზეზი..." : "Ban reason description..."}
                            value={banReasonMap[u.id] || ""}
                            onChange={(e) => setBanReasonMap(prev => ({ ...prev, [u.id]: e.target.value }))}
                            className="bg-slate-950 border border-slate-800 rounded-lg p-1.5 px-2.5 max-w-[150px] text-slate-200 focus:outline-none focus:border-red-500 text-xs font-light"
                          />
                          <button
                            onClick={() => handleBanUser(u.id)}
                            className="px-4 py-1.5 bg-red-650 bg-red-650 bg-red-600 hover:bg-red-550 text-white font-bold rounded-lg shrink-0 cursor-pointer text-xs"
                          >
                            {lang === "ka" ? "დაბლოკვა (Ban)" : "Ban Member"}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleUnbanUser(u.id)}
                          className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-lg text-xs cursor-pointer"
                        >
                          {lang === "ka" ? "ბლოკის მოხსნა" : "Revoke Ban"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 6. DATA BACKUP AND RECOVERY CONTROL CENTER */}
        {activeTab === 'backup' && (
          <div className="bg-[#0b0e22] border border-slate-850 p-6 rounded-2xl space-y-6 text-xs text-slate-300">
            <h3 className="text-sm font-black text-slate-205 border-b border-slate-800 pb-2 uppercase tracking-wide flex items-center gap-2">
              <Settings className="w-5 h-5 text-violet-400" />
              {lang === "ka" ? "⚙️ მონაცემთა ბექაპი და აღდგენის პანელი" : "⚙️ Data Backup & System Recovery Suite"}
            </h3>

            {/* ADVISORY SAFETY WARNING BULLETINS (Section 7, 8) */}
            <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl space-y-2">
              <h4 className="font-extrabold text-amber-400 flex items-center gap-1.5 uppercase text-[10px] tracking-wider">
                <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                {lang === "ka" ? "ყურადღება / SECURITY NOTICE" : "SECURITY NOTICE & UPDATE SAFETY ADVISORY"}
              </h4>
              <p className="text-[11px] text-slate-300 leading-relaxed font-light">
                ⚠ {lang === "ka" 
                  ? "ბექაპი შეიცავს მოთამაშეების მონაცემებს. შეინახეთ უსაფრთხოდ." 
                  : "This backup contains player data. Store it securely."}
              </p>
              <p className="text-[11px] text-slate-300 leading-relaxed font-light">
                ℹ {lang === "ka" 
                  ? "პროგრამული განახლების წინ რეკომენდებულია სრული ბექაპის გაკეთება." 
                  : "Before a software update, a full backup is recommended."}
              </p>
            </div>

            {/* EXPORT SECTION */}
            <div className="space-y-3.5">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wide">
                {lang === "ka" ? "1. მონაცემების ბექაპი (JSON და CSV ექსპორტი)" : "1. System Export (JSON & CSV Formats)"}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={async () => {
                    const backupObj = await backupService.exportFullBackup();
                    backupService.downloadJSONBackup(backupObj);
                  }}
                  className="p-4 bg-violet-950/20 border border-violet-500/20 hover:border-violet-500/50 rounded-xl text-left hover:bg-violet-950/40 transition-all cursor-pointer space-y-1 block w-full"
                >
                  <p className="font-bold text-violet-300 text-xs">📲 {lang === "ka" ? "JSON ექსპორტი / ჩამოტვირთვა" : "Download JSON Backup"}</p>
                  <p className="text-[10px] text-slate-400 font-light">{lang === "ka" ? "სრული თამაშის მონაცემების, ტრანზაქციებისა და პროფილების ბექაპი ერთ ფაილად." : "Complete system database state backup as YYYY-MM-DD timestamped JSON file."}</p>
                </button>

                <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-xl space-y-2">
                  <p className="font-bold text-slate-200 text-xs">📊 {lang === "ka" ? "CSV ექსპორტი (ანალიტიკა)" : "Export CSV Assets"}</p>
                  <p className="text-[10px] text-slate-400 leading-tight mb-2">
                    {lang === "ka" ? "ჩამოტვირთეთ მონაცემები ექსელში (UTF-8 BOM ქართული შრიფტის მხარდაჭერით):" : "Download structured data grids for spreadsheets with full UTF-8 BOM encoding:"}
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={async () => {
                        const backup = await backupService.exportFullBackup();
                        backupService.downloadCSV(backup.users, "players-profiles");
                      }}
                      className="px-2.5 py-1 bg-[#101423] border border-slate-800 hover:border-slate-700 hover:bg-[#151c33] font-mono rounded text-[9px] font-bold text-slate-300 uppercase cursor-pointer"
                    >
                      {lang === "ka" ? "მოთამაშეები" : "Players"}
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const backup = await backupService.exportFullBackup();
                        backupService.downloadCSV(backup.submissions, "submissions-metadata");
                      }}
                      className="px-2.5 py-1 bg-[#101423] border border-slate-800 hover:border-slate-700 hover:bg-[#151c33] font-mono rounded text-[9px] font-bold text-slate-300 uppercase cursor-pointer"
                    >
                      {lang === "ka" ? "ვიდეოები" : "Submissions"}
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const backup = await backupService.exportFullBackup();
                        backupService.downloadCSV(backup.pointTransactions, "point-ledger-history");
                      }}
                      className="px-2.5 py-1 bg-[#101423] border border-slate-800 hover:border-slate-700 hover:bg-[#151c33] font-mono rounded text-[9px] font-bold text-slate-300 uppercase cursor-pointer"
                    >
                      {lang === "ka" ? "მონეტები" : "Transactions"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* RESTORE SECTION (Section 7, 9) */}
            <div className="space-y-3.5 border-t border-slate-850 pt-5">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wide">
                {lang === "ka" ? "2. ბექაპის აღდგენა (JSON Import)" : "2. System Recovery (JSON Restore Upload)"}
              </h4>
              <p className="text-[10px] text-slate-400 font-light leading-relaxed">
                {lang === "ka" 
                  ? "ატვირთეთ ადრე შენახული bifurcation-backup-*.json სურათი, რათა აღადგინოთ მოთამაშეთა პროფილები, დაგროვილი ქულები და მიღწევები როგორც ბრაუზერში, ისე სერვერზე." 
                  : "Upload a previously persisted bifurcation-backup-*.json snapshot to restore system collections in memory on the container server."}
              </p>

              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <input
                  type="file"
                  accept=".json"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;

                    const reader = new FileReader();
                    reader.onload = async (event) => {
                      try {
                        const text = event.target?.result as string;
                        const parsed = JSON.parse(text);
                        
                        const confirmMsg = lang === "ka"
                          ? "ნამდვილად გსურთ ბექაპის აღდგენა? მიმდინარე მონაცემები ჩანაცვლდება ბექაპიდან!"
                          : "Are you sure you want to restore the backup? All current dataset values will be overwritten!";
                        
                        if (window.confirm(confirmMsg)) {
                          const result = await backupService.restoreFromBackup(parsed);
                          if (result.success) {
                            alert(lang === "ka" ? "ბექაპი წარმატებით აღდგა საწყობში!" : "System recovery successfully executed!");
                            onStateUpdate();
                            fetchAdminData();
                          } else {
                            alert(result.error);
                          }
                        }
                      } catch (err) {
                        alert(lang === "ka" ? "ფაილის წაკითხვის შეცდომა." : "JSON parsing failed.");
                      }
                    };
                    reader.readAsText(file);
                  }}
                  className="bg-[#03050b] hover:bg-[#070b14] border border-slate-850 hover:border-slate-800 p-2 py-1.5 rounded-lg text-slate-350 cursor-pointer text-xs shrink-0 max-w-full font-mono"
                />
              </div>
            </div>

            {/* CRITICAL GAME RESET SAFETY SYSTEM (Section 16) */}
            <div className="space-y-4 border-t border-[#7f1d1d]/30 pt-5 bg-red-950/5 p-4 rounded-xl mt-2 border border-[#7f1d1d]/15">
              <h4 className="text-xs font-bold text-red-400 uppercase tracking-wide flex items-center gap-1">
                🚨 {lang === "ka" ? "უსაფრთხოების გადატვირთვა" : "Emergency Database Wipe Protection"}
              </h4>
              <p className="text-[11px] text-slate-350 leading-normal">
                {lang === "ka" 
                  ? "მონაცემების სრული გადატვირთვა აჩერებს ყველა აქტიურ მუშაობას და შლის სისტემის სტატუსს." 
                  : "Destructive wipe removes all participant records, custom configs and game history."}
              </p>

              <div className="space-y-3.5 block max-w-full">
                <label className="flex items-start gap-2.5 text-[11px] text-slate-350 leading-relaxed max-w-xl select-none cursor-pointer">
                  <input
                    type="checkbox"
                    checked={resetConfirmed}
                    onChange={(e) => setResetConfirmed(e.target.checked)}
                    className="mt-0.5 rounded border-slate-800 bg-[#020408] text-red-650 accent-red-650 focus:ring-red-650"
                  />
                  <span>
                    {lang === "ka" 
                      ? "ვადასტურებ, რომ წაკითხული მაქვს გაფრთხილება და მსურს თამაშის პარამეტრების გადატვირთვა." 
                      : "I explicitly confirm I acknowledge the destructive risks and wish to wipe the game database."}
                  </span>
                </label>

                <button
                  type="button"
                  disabled={!resetConfirmed}
                  onClick={async () => {
                    const warningPrompt = lang === "ka"
                      ? "დარწმუნებული ხართ? ეს მოქმედება შეიძლება გავლენას ახდენდეს მოთამაშეების მონაცემებზე. რეკომენდებულია ბექაპის გაკეთება."
                      : "Are you sure? This action may affect player data. A backup is recommended.";
                    
                    if (window.confirm(warningPrompt)) {
                      try {
                        const res = await fetch("/api/admin/reset", {
                          method: "POST"
                        });
                        if (res.ok) {
                          alert(lang === "ka" ? "თამაში წარმატებით გადაიტვირთა!" : "Database successfully wiped!");
                          setResetConfirmed(false);
                          onStateUpdate();
                          fetchAdminData();
                        }
                      } catch (err) {
                        alert(lang === "ka" ? "კავშირის შეცდომა გადატვირთვისას." : "Wipe server request failed.");
                      }
                    }
                  }}
                  className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer transition-all ${
                    resetConfirmed
                      ? "bg-red-600 hover:bg-red-500 text-white shadow-xl shadow-red-950/40"
                      : "bg-[#180a0a] text-slate-600 border border-slate-850 cursor-not-allowed"
                  }`}
                >
                  🔥 {lang === "ka" ? "ადმინისტრაციული პარამეტრების სრული გადატვირთვა" : "Hard Reset Entire Game System"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
