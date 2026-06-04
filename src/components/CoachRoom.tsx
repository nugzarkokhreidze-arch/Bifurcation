import React, { useState, useEffect } from "react";
import { User } from "../types";
import { MessageSquare, Video, ShieldAlert, CheckCircle, Clock, Calendar, HelpCircle } from "lucide-react";

interface CoachRoomProps {
  currentUser: User;
  onStateUpdate: () => void;
  lang?: "ka" | "en";
}

export default function CoachRoom({ currentUser, onStateUpdate, lang = "ka" }: CoachRoomProps) {
  const [questions, setQuestions] = useState<any[]>([]);
  const [consultations, setConsultations] = useState<any[]>([]);
  const [questionText, setQuestionText] = useState("");
  const [loadingQuestion, setLoadingQuestion] = useState(false);
  const [loadingConsult, setLoadingConsult] = useState(false);

  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const fetchRoomData = async () => {
    try {
      const qRes = await fetch("/api/coach/questions");
      const qData = await qRes.json();
      if (qRes.ok) {
        setQuestions(qData.filter((q: any) => q.playerId === currentUser.id));
      }

      const cRes = await fetch("/api/coach/consultations");
      const cData = await cRes.json();
      if (cRes.ok) {
        setConsultations(cData.filter((col: any) => col.playerId === currentUser.id));
      }
    } catch (e) {
      console.error("Error loading Coach Room statistics:", e);
    }
  };

  useEffect(() => {
    fetchRoomData();
  }, [currentUser.id]);

  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");
    setErr("");
    
    if (currentUser.points < 10) {
      setErr(
        lang === "ka"
          ? "სამწუხაროდ თქვენ არ გაქვთ საკმარისი ვირტუალური ქულები. (საჭიროა 10 ქულა კითხვის დასასმელად)"
          : "Unfortunately, you do not have enough points. (10 virtual points required to ask a question)"
      );
      return;
    }

    setLoadingQuestion(true);
    try {
      const res = await fetch("/api/coach/question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: currentUser.id, question: questionText })
      });
      const data = await res.json();
      if (res.ok) {
        setMsg(
          lang === "ka"
            ? "კითხვა წარმატებით გაიგზავნა! ჩამოგეჭრათ 10 ვირტუალური ქულა. პასუხი მალე აისახება ქვედა სიაში."
            : "Question filed successfully! 10 virtual points deducted. The coach's response will log below soon."
        );
        setQuestionText("");
        onStateUpdate();
        fetchRoomData();
      } else {
        setErr(data.error || (lang === "ka" ? "კითხვის გაგზავნა ვერ მოხერხდა." : "Could not submit question."));
      }
    } catch (error) {
      setErr(lang === "ka" ? "შეცდომა სერვერთან კავშირისას." : "Internal connection error.");
    } finally {
      setLoadingQuestion(false);
    }
  };

  const handleBookConsultation = async () => {
    setMsg("");
    setErr("");

    if (currentUser.points < 25) {
      setErr(
        lang === "ka"
          ? "სამწუხაროდ თქვენ არ გაქვთ საკმარისი ვირტუალური ქულები. (საჭიროა 25 ქულა ვიდეო კონსულტაციისთვის)"
          : "Unfortunately, you do not have enough points. (25 virtual points required for a video consultation)"
      );
      return;
    }

    if (!currentUser.videoCallAvailable) {
      setErr(lang === "ka" ? "თქვენ უკვე მოითხოვეთ ვიდეო კონსულტაცია." : "You have already scheduled/requested an active video slot.");
      return;
    }

    const confirmMsg = lang === "ka"
      ? "დარწმუნებული ხართ, რომ გსურთ 15-წუთიანი ვიდეო კონსულტაციის ჯავშნის მოთხოვნა? ჩამოგეჭრებათ 25 ქულა."
      : "Are you sure you want to request a 15-minute video consultation? This will deduct 25 points.";

    if (!window.confirm(confirmMsg)) {
      return;
    }

    setLoadingConsult(true);
    try {
      const res = await fetch("/api/coach/consultation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: currentUser.id })
      });
      const data = await res.json();
      if (res.ok) {
        setMsg(
          lang === "ka"
            ? "ვიდეო კონსულტაციის მოთხოვნა გაგზავნილია! ჩამოგეჭრათ 25 ქულა. ადმინისტრატორმა მალე დაგიგეგმავთ დროს."
            : "Video consultation requested! 25 points deducted. The host will schedule a time slot shortly."
        );
        onStateUpdate();
        fetchRoomData();
      } else {
        setErr(data.error || (lang === "ka" ? "მოთხოვნა ვერ გაიგზავნა." : "Request failed."));
      }
    } catch (error) {
      setErr(lang === "ka" ? "შეცდომა კავშირისას." : "Connection error.");
    } finally {
      setLoadingConsult(false);
    }
  };

  const activeConsultation = consultations[0];

  return (
    <div id="coach-room" className="space-y-8 max-w-4xl mx-auto text-left">
      {/* Title Header */}
      <div className="bg-gradient-to-r from-violet-955/20 via-sky-955/15 to-slate-900 border border-slate-850 p-6 md:p-8 rounded-2xl flex items-center gap-4 text-left">
        <div className="p-3 bg-sky-500/10 text-sky-400 rounded-xl shrink-0">
          <MessageSquare className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-slate-100 uppercase tracking-tight">
            {lang === "ka" ? "კონსულტაციის ოთახი" : "Counseling & Coach Room"}
          </h2>
          <p className="text-xs text-slate-400">
            {lang === "ka" 
              ? "გამოიყენეთ თქვენი ვირტუალური ქულები კვალიფიციურ კოუჩთან პირადი, უსაფრთხო კომუნიკაციისთვის."
              : "Spend your virtual credits to unlock private, secure personal development counseling with qualified coaches."}
          </p>
        </div>
      </div>

      {/* Warnings Disclaimer */}
      <div className="bg-sky-500/5 border border-sky-500/10 p-4 rounded-xl flex items-start gap-3 text-sky-300 text-xs font-light text-left">
        <ShieldAlert className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
        <p>
          <strong>{lang === "ka" ? "ყურადღება:" : "Attention / Disclaimer:"}</strong>{' '}
          {lang === "ka" 
            ? "კონსულტაცია არის მოტივაციური და განვითარების მხარდამჭერი. ის არ წარმოადგენს სამედიცინო, ფსიქოლოგიურ ან იურიდიულ მომსახურებას."
            : "Motivational sessions are for personal growth and courage support. They do not constitute mental health treatment, medical psychiatry, or certified legal services."}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
        {/* Left Form Ask a Question */}
        <div className="bg-slate-900/50 border border-slate-850 p-6 rounded-2xl space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-slate-850 pb-3">
              <h3 className="font-bold text-sm text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-violet-400" />
                {lang === "ka" ? "დასვი წერილობითი კითხვა" : "Ask Written Question"}
              </h3>
              <span className="text-[10px] text-slate-400 font-medium bg-slate-800 px-2.5 py-1 rounded-full font-mono">
                {lang === "ka" ? "ღირებულება: 10 ქულა" : "Cost: 10 Points"}
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed font-light">
              {lang === "ka" 
                ? "დასვით ნებისმიერი კითხვა პიროვნულ ბარიერებზე, კომპლექსებზე ან იმაზე, თუ როგორ გადალახოთ საჯარო შიშები. კოუჩი წერილობით პასუხს უმოკლეს ვადაში გაგცემთ."
                : "Ask confidential questions regarding personal barriers, complexes, or methods to overcome spotlight anxiety. Coaches write back promptly."}
            </p>

            <form onSubmit={handleAskQuestion} className="space-y-3 pt-2 text-xs text-left">
              <textarea
                required
                disabled={currentUser.coachQuestionsRemaining <= 0}
                placeholder={
                  currentUser.coachQuestionsRemaining > 0 
                    ? (lang === "ka" ? "დაწერეთ თქვენი კონფიდენციალური შეკითხვა კოუჩისთვის..." : "Write your private confidential question for the coaches...") 
                    : (lang === "ka" ? "კითხვების ლიმიტი ამოწურულია." : "Free questions limit reached.")
                }
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                className="w-full bg-slate-950 border border-slate-850 rounded-xl p-3 min-h-[110px] text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-600 text-xs"
              />

              <div className="text-[10px] flex justify-between text-slate-400 font-medium">
                <span>{lang === "ka" ? "დარჩენილი უფასო კითხვები:" : "Remaining questions credit:"}</span>
                <strong className="text-sky-300 font-mono">{currentUser.coachQuestionsRemaining} {lang === "ka" ? "კითხვა" : "left"}</strong>
              </div>

              {currentUser.coachQuestionsRemaining > 0 && (
                <button
                  type="submit"
                  disabled={loadingQuestion}
                  className="w-full py-2.5 bg-violet-605 bg-violet-600 hover:bg-violet-550 text-white font-bold rounded-xl shadow transition-all cursor-pointer"
                >
                  {loadingQuestion 
                    ? (lang === "ka" ? "გადაეცემა..." : "Submitting...") 
                    : (lang === "ka" ? "დასვი კითხვა (-10 ქულა)" : "Submit Question (-10 Points)")}
                </button>
              )}
            </form>
          </div>
        </div>

        {/* Right - Live Video consultative call Section */}
        <div className="bg-slate-900/50 border border-slate-850 p-6 rounded-2xl space-y-6 text-xs text-left">
          <div className="flex justify-between items-center border-b border-slate-850 pb-3">
            <h3 className="font-bold text-sm text-slate-205 uppercase tracking-wider flex items-center gap-2">
              <Video className="w-4 h-4 text-sky-450" />
              {lang === "ka" ? "15 წუთიანი ვიდეო კონსულტაცია" : "15-Min Live Session"}
            </h3>
            <span className="text-[10px] text-slate-400 font-medium bg-slate-800 px-2.5 py-1 rounded-full font-mono">
              {lang === "ka" ? "ღირებულება: 25 ქულა" : "Cost: 25 Points"}
            </span>
          </div>

          <p className="text-slate-400 leading-relaxed font-light">
            {lang === "ka" 
              ? "ჩვენ გთავაზობთ ერთჯერად 15-წუთიან ინდივიდუალურ შეხვედრას დეველოპმენტისა და მოტივაციის კოუჩთან. შეხვედრა მიზნად ისახავს სიმამაცის გააქტიურებას და ბარიერებთან პოზიტიურ გამკლავებას."
              : "We offer an individual 15-minute video sync-up with a developmental and motivation coach, targeting public comfort and positive anxiety coping triggers."}
          </p>

          {!activeConsultation ? (
            <div className="space-y-4 pt-2">
              <div className="bg-slate-950/45 p-3 rounded-lg border border-slate-850 flex items-center justify-between font-mono">
                <span className="text-slate-400 text-[11px]">{lang === "ka" ? "ბალანსი:" : "Balance:"} {currentUser.points} 🪙</span>
                <span className="text-slate-400 text-[11px]">{lang === "ka" ? "სტატუსი:" : "Status:"} <strong>{lang === "ka" ? "ხელმისაწვდომია" : "Available"}</strong></span>
              </div>
              <button
                onClick={handleBookConsultation}
                disabled={loadingConsult || !currentUser.videoCallAvailable}
                className="w-full py-3 bg-gradient-to-r from-sky-600 to-indigo-650 hover:from-sky-500 text-white font-bold rounded-xl transition-all shadow-md cursor-pointer"
              >
                {loadingConsult 
                  ? (lang === "ka" ? "იგზავნება მოთხოვნა..." : "Booking Slot...") 
                  : (lang === "ka" ? "მოითხოვე ვიდეო კონსულტაცია (-25 ქულა)" : "Book Live Video Call (-25 Points)")}
              </button>
            </div>
          ) : (
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-850 pb-2">
                <span className="font-semibold text-slate-300">{lang === "ka" ? "ჩემი ჯავშანი" : "My Reservation"}</span>
                {activeConsultation.status === "requested" ? (
                  <span className="text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded text-[10px] flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3" />
                    {lang === "ka" ? "მოთხოვნილია" : "REQUESTED"}
                  </span>
                ) : activeConsultation.status === "scheduled" ? (
                  <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded text-[10px] flex items-center gap-1 font-mono">
                    <CheckCircle className="w-3 h-3" />
                    {lang === "ka" ? "დაგეგმილია" : "SCHEDULED"}
                  </span>
                ) : (
                  <span className="text-slate-405 bg-slate-850 px-2 py-0.5 rounded text-[10px]">
                    {activeConsultation.status}
                  </span>
                )}
              </div>

              {activeConsultation.scheduledAt ? (
                <div className="space-y-2 text-xs text-left">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Calendar className="w-4 h-4 text-violet-400" />
                    <span>{lang === "ka" ? "დრო:" : "Scheduled At:"} <strong>{new Date(activeConsultation.scheduledAt).toLocaleString()}</strong></span>
                  </div>
                  {activeConsultation.meetingLink && (
                    <div className="pt-2">
                      <a
                        href={activeConsultation.meetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 bg-violet-605 bg-violet-600 hover:bg-violet-550 text-white font-bold px-4 py-2 rounded-lg text-xs transition-all cursor-pointer"
                      >
                        {lang === "ka" ? "შესვლა ვიდეო შეხვედრაზე" : "Launch Meeting Link"}
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-[11px] text-slate-400 leading-normal font-light">
                  {lang === "ka" 
                    ? "მოთხოვნა მიღებულია. კოუჩი მალე შეგირჩევთ დროს და გამოგიგზავნით შეხვედრის ბმულს."
                    : "Your request was received. The coach will analyze scheduling slots and provide the connection credentials shortly."}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {msg && <div className="p-4 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs font-semibold animate-pulse">{msg}</div>}
      {err && <div className="p-4 bg-red-500/15 border border-red-500/30 text-red-00 text-red-400 rounded-xl text-xs">{err}</div>}

      {/* Questions list display */}
      <div className="space-y-4 text-left">
        <h3 className="font-bold text-slate-200">
          {lang === "ka" ? `ჩემი გამოგზავნილი შეკითხვები (${questions.length})` : `My Submitted Questions (${questions.length})`}
        </h3>
        {questions.length === 0 ? (
          <div className="p-8 bg-slate-900/20 border border-slate-850 text-center text-slate-500 rounded-xl text-xs font-light">
            {lang === "ka" ? "აქ კითხვები ჯერ არ ფიქსირდება." : "No submitted inquiry logs found."}
          </div>
        ) : (
          <div className="space-y-4">
            {questions.map((q) => (
              <div key={q.id} className="p-4 bg-[#0a0d1d] border border-slate-850 rounded-xl space-y-3">
                <div className="flex justify-between items-start">
                  <p className="text-xs font-semibold text-slate-250 font-sans leading-relaxed">
                    {lang === "ka" ? "კითხვა:" : "Question:"} <span className="text-slate-400 italic font-light">"{q.question}"</span>
                  </p>
                  <span className="text-[10px] text-slate-500 font-mono shrink-0">{new Date(q.createdAt).toLocaleDateString()}</span>
                </div>

                {q.answer ? (
                  <div className="p-3 bg-sky-955/20 border-l-2 border-sky-455 border-sky-400 rounded text-xs text-slate-300 space-y-1 text-left">
                    <span className="font-bold text-sky-400 block">
                      {lang === "ka" ? "💬 მრჩეველის/ქოუჩის პასუხი:" : "💬 Advisor's / Coach's Analysis:"}
                    </span>
                    <p className="font-light leading-relaxed">{q.answer}</p>
                    {q.answeredAt && <span className="text-[9px] text-slate-500 block text-right font-mono">{new Date(q.answeredAt).toLocaleDateString()}</span>}
                  </div>
                ) : (
                  <span className="text-[10px] text-amber-400 font-semibold bg-amber-500/10 px-2 py-0.5 rounded flex items-center gap-1 self-start w-max font-mono">
                    <Clock className="w-3 h-3 text-amber-405" />
                    {lang === "ka" ? "პასუხის მოლოდინში..." : "Awaiting response..."}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
