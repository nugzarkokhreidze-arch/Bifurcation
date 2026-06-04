import React, { useState, useEffect } from "react";
import { User } from "../types";
import { storageService, storageKeys } from "../services/storageService";
import { Heart, Volume2, Film, MessageSquare, ShieldAlert, X, Play } from "lucide-react";

interface VideoFeedProps {
  currentUser: User;
  onStateUpdate: () => void;
  lang?: "ka" | "en";
}

export default function VideoFeed({ currentUser, onStateUpdate, lang = "ka" }: VideoFeedProps) {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [fullscreenVideo, setFullscreenVideo] = useState<string | null>(null);

  useEffect(() => {
    const allSubs = storageService.loadData<any[]>("bifurcation_submissions", []);
    // ფილტრავს მხოლოდ საჯაროდ განთავსებულ ვიდეოებს
    setSubmissions(allSubs.filter(s => s.visibility === "public"));
  }, [currentUser.points]);

  const handleLike = (subId: string) => {
    const allSubs = storageService.loadData<any[]>("bifurcation_submissions", []);
    const match = allSubs.find(s => s.id === subId);
    
    if (match) {
      if (!match.likedBy) match.likedBy = [];
      if (match.likedBy.includes(currentUser.id)) return;
      
      match.likedBy.push(currentUser.id);
      match.likes = (match.likes || 0) + 1;
      
      // ლაიქის მიმცემს ემატება +2 ქულა
      const records = storageService.loadData<any[]>(storageKeys.monthlyPlayerRecords, []);
      const updated = records.map(r => {
        if (r.playerId === currentUser.id && r.marathonId === "june") {
          r.points = (r.points || 100) + 2;
        }
        return r;
      });
      
      storageService.saveData(storageKeys.monthlyPlayerRecords, updated);
      storageService.saveData("bifurcation_submissions", allSubs);
      setSubmissions(allSubs.filter(s => s.visibility === "public"));
      onStateUpdate();
    }
  };

  return (
    <div className="space-y-4 text-left font-sans">
      <div className="bg-white p-4 rounded-2xl border text-left">
        <h3 className="font-extrabold text-sm uppercase text-[#27213F]">{lang === "ka" ? "🌐 სიმამაცის საჯარო კედელი" : "🌐 Live Public Matrix Stream"}</h3>
        <p className="text-xs text-slate-500 mt-0.5">{lang === "ka" ? "შეაფასეთ მოთამაშეთა კრეატიულობა, უყურეთ რეალურ ვიდეოებს და დაუჭირეთ მხარი მოწონებით!" : "Review and like live proofs."}</p>
      </div>

      {submissions.length === 0 ? (
        <div className="p-12 text-center bg-white border rounded-2xl text-xs text-slate-400 font-bold">{lang === "ka" ? "საჯარო გამოწვევები ამ დროისთვის ცარიელია." : "No public feeds loaded yet."}</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {submissions.map((sub: any) => (
            <div key={sub.id} className="bg-white border rounded-2xl p-4 space-y-3 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                <img src={sub.playerAvatar} className="w-5 h-5 rounded-full object-cover" alt="Ava" />
                <span>@{sub.playerNickname}</span>
              </div>

              {/* რეალური ინტერაქტიული მედია ბლოკი */}
              <div 
                onClick={() => setFullscreenVideo(sub.fileUrl)}
                className="h-36 bg-black rounded-xl overflow-hidden flex items-center justify-center relative cursor-pointer group"
              >
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 flex items-center justify-center text-white text-xs font-bold z-10 transition-colors">▶ {lang === "ka" ? "ჩართვა" : "Play Proof"}</div>
                {sub.submissionType === "video" && <video src={sub.fileUrl} className="w-full h-full object-cover" />}
                {sub.submissionType === "photo" && <img src={sub.fileUrl} className="w-full h-full object-cover" alt="Proof" />}
                {sub.submissionType === "audio" && <Volume2 className="w-6 h-6 text-slate-400 animate-pulse" />}
              </div>

              <h4 className="font-black text-xs text-[#27213F] truncate">{sub.challengeTitle}</h4>
              <p className="text-[11px] text-slate-500 line-clamp-2">"{sub.textDescription}"</p>

              <div className="flex justify-between items-center pt-2 border-t">
                <button 
                  onClick={() => handleLike(sub.id)}
                  className="px-3 py-1 bg-purple-50 hover:bg-purple-100 text-[#7C4DFF] text-[10px] font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-all"
                >
                  ❤️ {sub.likes || 0} {lang === "ka" ? "მოწონება" : "Likes"}
                </button>
                <span className="text-[9px] font-mono text-slate-400">+2 ქულა მიმცემს</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* LIGHTBOX FOR VIDEOFEED */}
      {fullscreenVideo && (
        <div className="fixed inset-0 z-55 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-white">
          <div className="max-w-xl w-full text-center space-y-4">
            {(() => {
              const url = fullscreenVideo;
              const isImage = url.match(/\.(jpeg|jpg|gif|png|webp|svg)($|\?)/i) || url.startsWith("data:image/");
              const isAudio = url.match(/\.(mp3|wav|ogg|aac|m4a)($|\?)/i) || url.startsWith("data:audio/");

              if (isImage) {
                return <img src={url} className="w-full rounded-2xl bg-black max-h-[60vh] object-contain border border-white/10 mx-auto" alt="Proof" />;
              }
              if (isAudio) {
                return (
                  <div className="p-12 w-full text-center bg-zinc-900 rounded-2xl border border-white/10">
                    <Volume2 className="w-12 h-12 text-[#7C4DFF] mx-auto mb-2 animate-pulse" />
                    <audio src={url} controls autoPlay className="w-full mt-4" />
                  </div>
                );
              }
              return <video src={url} controls autoPlay className="w-full rounded-2xl bg-black max-h-[60vh] border border-white/10" />;
            })()}
            <button 
              onClick={() => setFullscreenVideo(null)}
              className="px-8 py-3 bg-[#7C4DFF] text-white text-xs font-black rounded-xl uppercase tracking-widest cursor-pointer shadow-md mx-auto block"
            >
              ✕ {lang === "ka" ? "ჩვეულ ფორმაში დაბრუნება" : "Close Player"}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}