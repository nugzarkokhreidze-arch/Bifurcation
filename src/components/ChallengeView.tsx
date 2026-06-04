import React, { useState, useEffect, useRef, useMemo } from "react";
import { User, Challenge } from "../types";
import { storageService, storageKeys } from "../services/storageService";
import { Star, Eye, EyeOff, FileText, CheckCircle, Flame, Clock, RefreshCw, X, ArrowLeft, ArrowRight, Video, Camera, Mic, Volume2, UploadCloud, Info } from "lucide-react";

interface ChallengeViewProps {
  currentUser: User | null;
  onStateUpdate: () => void;
  lang?: "ka" | "en";
  selectedMarathonId: string;
  submissions?: any[];
  monthlyPlayerRecords?: any[];
  onStartRegister?: () => void;
  onStartLogin?: () => void;
}

export default function ChallengeView({ 
  currentUser, 
  onStateUpdate, 
  lang = "ka", 
  selectedMarathonId, 
  submissions = [], 
  monthlyPlayerRecords = [],
  onStartRegister,
  onStartLogin
}: ChallengeViewProps) {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [forceUpdate, setForceUpdate] = useState(0);
  
  // File upload state
  const [mediaType, setMediaType] = useState<"video" | "photo" | "audio">("video");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string>("");
  const [visibility, setVisibility] = useState<'public' | 'hidden'>("public");
  const [comment, setComment] = useState("");
  const [msg, setMsg] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 🌌 Futuristic 3D Cyberpunk style illustrations for the cards
  const cyberpunkImages = [
    "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=500&q=80",
    "https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?auto=format&fit=crop&w=500&q=80",
    "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&w=500&q=80",
    "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=500&q=80",
    "https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?auto=format&fit=crop&w=500&q=80",
    "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=500&q=80",
    "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=500&q=80",
    "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=500&q=80",
    "https://images.unsplash.com/photo-1538370965046-79c0d6907d47?auto=format&fit=crop&w=500&q=80",
    "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=500&q=80"
  ];

  // Tick for countdown clocks
  const [countdownTick, setCountdownTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setCountdownTick(prev => prev + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const loadChallenges = async () => {
      let marathons = storageService.loadData<any[]>(storageKeys.marathons, []);
      const mId = selectedMarathonId.startsWith("marathon-") ? selectedMarathonId : `marathon-${selectedMarathonId}`;
      let currentM = marathons.find(m => m.id === selectedMarathonId || m.id === mId);
      
      if (!currentM || !currentM.challenges || currentM.challenges.length === 0) {
        try {
          const { marathonService } = await import("../services/marathonService");
          const freshMarathons = await marathonService.getMarathons();
          currentM = freshMarathons.find(m => m.id === selectedMarathonId || m.id === mId);
        } catch (err) {
          console.warn("Could not import or use marathonService as fallback:", err);
        }
      }
      
      setChallenges(currentM?.challenges || []);
    };

    loadChallenges();
  }, [selectedMarathonId, selectedChallenge]);

const playerRecord = useMemo(() => {
    if (!currentUser) return null;
    const records = storageService.loadData<any[]>(storageKeys.monthlyPlayerRecords, []);
    const mId = selectedMarathonId.startsWith("marathon-") ? selectedMarathonId : `marathon-${selectedMarathonId}`;
    return records.find(r => r.playerId === currentUser.id && r.marathonId === mId) || null;
  }, [currentUser, selectedMarathonId, countdownTick, selectedChallenge, forceUpdate]); // აქ დაემატა forceUpdate

  const getFileAcceptAttribute = () => {
    return "video/*,image/*,audio/*,video/mp4,video/quicktime,video/webm,video/mov,image/jpeg,image/png,image/webp,image/heic,image/heif,audio/mp3,audio/wav,audio/m4a,audio/mpeg,audio/mp4,audio/ogg";
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setFilePreviewUrl(URL.createObjectURL(file));
      
      const type = file.type.toLowerCase();
      if (type.startsWith("video/")) {
        setMediaType("video");
      } else if (type.startsWith("image/")) {
        setMediaType("photo");
      } else if (type.startsWith("audio/") || type.includes("mpeg") || type.includes("mp3") || type.includes("wav") || type.includes("m4a") || type.includes("ogg")) {
        setMediaType("audio");
      }
    }
  };

  const triggerFileInput = (type: "video" | "photo" | "audio") => {
    setMediaType(type);
    setSelectedFile(null);
    setFilePreviewUrl("");
    setTimeout(() => {
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    }, 50);
  };

const handleAcceptChallenge = async (cId: string) => {
    if (!currentUser) {
      if (onStartRegister) {
        onStartRegister();
      } else {
        alert(lang === "ka" ? "გამოწვევის მისაღებად გთხოვთ გაიაროთ ავტორიზაცია!" : "Please login to accept challenge!");
      }
      return;
    }

    const mId = selectedMarathonId.startsWith("marathon-") ? selectedMarathonId : `marathon-${selectedMarathonId}`;
    
    // Set loading indicator or similar if needed; here we transition instantly
    setIsUploading(true);
    setMsg(lang === "ka" ? "მიმდინარეობს გამოწვევის აქტივაცია..." : "Activating challenge...");

    // 🚀 POST to backend Accept Challenge API for database synchronization
    try {
      const response = await fetch(`/api/challenges/${cId}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          playerId: currentUser.id, 
          marathonId: mId 
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log("Challenge successfully accepted on backend:", result);
        
        if (result.user) {
          localStorage.setItem("bifurcation_session_user", JSON.stringify(result.user));
        }

        // Sync local record immediately
        if (result.record) {
          const records = storageService.loadData<any[]>(storageKeys.monthlyPlayerRecords, []);
          const updated = records.map(r => r.id === result.record.id ? result.record : r);
          if (!records.some(r => r.id === result.record.id)) {
            updated.push(result.record);
          }
          storageService.saveData(storageKeys.monthlyPlayerRecords, updated);
        }
      } else {
        const errorData = await response.json();
        const errorMsg = errorData.error || (lang === "ka" ? "შეცდომა გამოწვევის მიღებისას." : "Error accepting challenge.");
        alert(errorMsg);
        setIsUploading(false);
        setMsg("");
        return;
      }
    } catch (err) {
      console.warn("Backend accept API offline or unreachable, deploying graceful local-first fallback:", err);
      
      // Local fallback representation
      const records = storageService.loadData<any[]>(storageKeys.monthlyPlayerRecords, []);
      let record = records.find(r => r.playerId === currentUser.id && r.marathonId === mId);
      
      if (!record) {
        record = {
          id: `record-${currentUser.id}-${mId}`,
          playerId: currentUser.id,
          marathonId: mId,
          participationConfirmed: true,
          points: currentUser.points || 100,
          acceptedChallenges: [],
          completedChallenges: [],
          skippedChallenges: [],
          acceptedDates: {}
        };
        records.push(record);
      }

      if (!record.acceptedChallenges) record.acceptedChallenges = [];
      if (!record.acceptedChallenges.includes(cId)) {
        record.acceptedChallenges.push(cId);
        if (!record.acceptedDates) record.acceptedDates = {};
        
        const now = new Date();
        record.acceptedDates[cId] = {
          takenAt: now.toISOString(),
          expireAt: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString()
        };
      }

      if (record.skippedChallenges) {
        record.skippedChallenges = record.skippedChallenges.filter((id: string) => id !== cId);
      }

      storageService.saveData(storageKeys.monthlyPlayerRecords, records);
    }

    // Instantly refresh states so that we seamlessly transition to the submission form!
    onStateUpdate();
    setForceUpdate(prev => prev + 1);
    setIsUploading(false);
    setMsg("");
  };

  const handleSkipChallenge = async (cId: string) => {
    if (!currentUser) return;
    const confirmMsg = lang === "ka" 
      ? "ნამდვილად გსურთ გამოწვევის გამოტოვება? ჩამოგეჭრებათ -3 ქულა." 
      : "Skip challenge? Your points will be reduced by -3.";
    if (!window.confirm(confirmMsg)) return;

    const mId = selectedMarathonId.startsWith("marathon-") ? selectedMarathonId : `marathon-${selectedMarathonId}`;
    
    // Handle offline-sync & write client-side storage first
    const records = storageService.loadData<any[]>(storageKeys.monthlyPlayerRecords, []);
    const updated = records.map(r => {
      if (r.playerId === currentUser.id && r.marathonId === mId) {
        if (!r.skippedChallenges) r.skippedChallenges = [];
        if (!r.skippedChallenges.includes(cId)) {
          r.skippedChallenges.push(cId);
        }
        if (r.acceptedChallenges) {
          r.acceptedChallenges = r.acceptedChallenges.filter((id: string) => id !== cId);
        }
        r.points = Math.max(0, (r.points || 100) - 3);
      }
      return r;
    });
    
    storageService.saveData(storageKeys.monthlyPlayerRecords, updated);

    // Also update overall player profile
    const playersList = storageService.loadData<any[]>(storageKeys.players, []);
    const updatedPlayers = playersList.map(p => {
      if (p.id === currentUser.id) {
        p.points = Math.max(0, (p.points || 0) - 3);
      }
      return p;
    });
    storageService.saveData(storageKeys.players, updatedPlayers);

    // Update session user
    const existingUserData = localStorage.getItem("bifurcation_session_user");
    if (existingUserData) {
      const parsedUser = JSON.parse(existingUserData);
      parsedUser.points = Math.max(0, (parsedUser.points || 0) - 3);
      localStorage.setItem("bifurcation_session_user", JSON.stringify(parsedUser));
    }

    // Notify backend if there was a join/participation active (optional soft-sync)
    try {
      await fetch(`/api/users/${currentUser.id}/notifications/read-all`, { method: "POST" }); // triggers API wake up
    } catch (e) {
      console.warn("Soft synchronization skipped:", e);
    }

    setSelectedChallenge(null);
    onStateUpdate();
    setForceUpdate(prev => prev + 1);
  };

  const getChallengeTitle = (c: Challenge) => {
    return lang === "ka" ? c.title : (c.title_en || c.title);
  };

  const getChallengeInstructions = (c: Challenge) => {
    return lang === "ka" 
      ? (c.fullInstructions || c.description || "") 
      : (c.fullInstructions_en || c.description_en || c.fullInstructions || c.description || "");
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !selectedChallenge) return;
    if (!filePreviewUrl) {
      alert(lang === "ka" ? "გთხოვთ ატვირთოთ ფაილი მტკიცებულებისთვის!" : "Please upload a media proof file!");
      return;
    }

    setIsUploading(true);
    setMsg(lang === "ka" ? "მიმდინარეობს ატვირთვა და AI შეფასება..." : "Uploading and evaluating with AI...");

    let finalFileUrl = filePreviewUrl;
    if (selectedFile) {
      try {
        finalFileUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(selectedFile);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = (err) => reject(err);
        });
      } catch (err) {
        console.error("Base64 reading failed:", err);
      }
    }

    const mId = selectedMarathonId.startsWith("marathon-") ? selectedMarathonId : `marathon-${selectedMarathonId}`;
    const submissionsList = storageService.loadData<any[]>("bifurcation_submissions", []);
    const isPublic = visibility === "public";
    
    let backendSubObj: any = null;

    // 🚀 POST Submission to Express server API to trigger real-time AI scoring and points distribution
    try {
      const response = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: currentUser.id,
          challengeId: selectedChallenge.id,
          videoUrl: finalFileUrl,
          visibility: visibility,
          comment: comment,
          submissionType: mediaType
        })
      });
      if (response.ok) {
        const resultData = await response.json();
        console.log("Submission synchronized & evaluated by AI successfully:", resultData);
        if (resultData.submission) {
          backendSubObj = resultData.submission;
        }
        if (resultData.user) {
          localStorage.setItem("bifurcation_session_user", JSON.stringify(resultData.user));
          
          // Sync with local Players list for rank calculations
          const localPlayers = storageService.loadData<any[]>(storageKeys.players, []);
          const updatedPlayers = localPlayers.map(p => p.id === resultData.user.id ? resultData.user : p);
          if (!localPlayers.some(p => p.id === resultData.user.id)) {
            updatedPlayers.push(resultData.user);
          }
          storageService.saveData(storageKeys.players, updatedPlayers);
        }
      } else {
        console.warn("Backend submissions API returned error code:", response.status);
        if (response.status === 413) {
          alert(lang === "ka" 
            ? "ატვირთული ფაილი ძალიან დიდია! გთხოვთ შეამციროთ ზომა (მაქს. 150MB) ან გამოიყენოთ უფრო მცირე ზომის მედია." 
            : "The uploaded file is too large! Please reduce its size (max 150MB) or try another file.");
        } else {
          try {
            const errJson = await response.json();
            alert(errJson.error || (lang === "ka" ? "სერვერის შეცდომა ატვირთვისას." : "Server error during upload."));
          } catch (e) {
            alert(lang === "ka" ? "დაფიქსირდა შეცდომა ატვირთვისას." : "An error occurred during proof upload.");
          }
        }
        setIsUploading(false);
        setMsg("");
        return; // STOP the submission flow so the user can fix the file size!
      }
    } catch (apiErr) {
      console.error("Backend state sync failed during challenge submission, utilizing graceful client-side local-first fallback:", apiErr);
    }

    const newSubItem = {
      id: backendSubObj?.id || `sub-${Date.now()}`,
      playerId: currentUser.id,
      playerNickname: currentUser.nickname || "მოთამაშე",
      playerAvatar: currentUser.avatar || "",
      marathonId: mId,
      challengeId: selectedChallenge.id,
      challengeTitle: getChallengeTitle(selectedChallenge),
      submissionType: mediaType,
      textDescription: comment,
      comment: comment,
      fileUrl: finalFileUrl,
      videoUrl: finalFileUrl,
      fileName: selectedFile ? selectedFile.name : "file",
      visibility: visibility,
      isPublic: isPublic,
      likes: backendSubObj?.votes || 0,
      votes: backendSubObj?.votes || 0,
      likedBy: backendSubObj?.votedUserIds || [],
      votedUserIds: backendSubObj?.votedUserIds || [],
      status: "completed",
      submittedAt: backendSubObj?.createdAt || new Date().toISOString(),
      aiReaction: backendSubObj?.aiReaction || ""
    };

    submissionsList.unshift(newSubItem);
    storageService.saveData("bifurcation_submissions", submissionsList);

    // Sync client-side player records
    const rewardBase = selectedChallenge.completionReward || selectedChallenge.points || 20;
    const bonusOption = isPublic ? 15 : 0;
    const totalGained = rewardBase + bonusOption;

    const records = storageService.loadData<any[]>(storageKeys.monthlyPlayerRecords, []);
    let record = records.find(r => r.playerId === currentUser.id && r.marathonId === mId);
    if (!record) {
      record = {
        id: `record-${currentUser.id}-${mId}`,
        playerId: currentUser.id,
        marathonId: mId,
        participationConfirmed: true,
        points: currentUser.points || 100,
        acceptedChallenges: [],
        completedChallenges: [],
        skippedChallenges: [],
        acceptedDates: {}
      };
      records.push(record);
    }

    if (!record.completedChallenges) record.completedChallenges = [];
    if (!record.completedChallenges.includes(selectedChallenge.id)) {
      record.completedChallenges.push(selectedChallenge.id);
    }
    if (record.acceptedChallenges) {
      record.acceptedChallenges = record.acceptedChallenges.filter((id: string) => id !== selectedChallenge.id);
    }
    
    // Automatically match server overall score if returned, otherwise apply incremental logic
    const serverPts = backendSubObj?.playerPoints;
    record.points = serverPts !== undefined ? serverPts : (record.points || 100) + totalGained;
    storageService.saveData(storageKeys.monthlyPlayerRecords, records);

    // Update local profile list score just in case sync was delayed
    if (!backendSubObj?.playerPoints) {
      const playersList = storageService.loadData<any[]>(storageKeys.players, []);
      const updatedPlayers = playersList.map(p => {
        if (p.id === currentUser.id) {
          p.points = (p.points || 0) + totalGained;
        }
        return p;
      });
      storageService.saveData(storageKeys.players, updatedPlayers);

      const existingUserData = localStorage.getItem("bifurcation_session_user");
      if (existingUserData) {
        const parsedUser = JSON.parse(existingUserData);
        parsedUser.points = (parsedUser.points || 0) + totalGained;
        localStorage.setItem("bifurcation_session_user", JSON.stringify(parsedUser));
      }
    }

    // Launch instant global app-wide synchronization in live mode
    onStateUpdate();

    setMsg(lang === "ka" ? "დავალება წარმატებით აიტვირთა! 🎉" : "Proof submitted! 🎉");
    setTimeout(() => {
      setMsg("");
      setIsUploading(false);
      setSelectedChallenge(null);
      setFilePreviewUrl("");
      setSelectedFile(null);
      setComment("");
      onStateUpdate();
      setForceUpdate(prev => prev + 1);
    }, 1250);
  };

  const getDeadlineCountdown = (expireAtStr?: string) => {
    if (!expireAtStr) return "";
    const exp = new Date(expireAtStr);
    const diff = exp.getTime() - Date.now();
    if (diff <= 0) {
      return lang === "ka" ? "ვადა ამოიწურა! ❌" : "Deadline Expired! ❌";
    }
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);
    return lang === "ka" 
      ? `დარჩენილია: ${days}დ ${hours}სთ ${mins}წთ ${secs}წმ` 
      : `Time Left: ${days}d ${hours}h ${mins}m ${secs}s`;
  };

  // State for drag & drop visual aid
  const [isDragActive, setIsDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      setFilePreviewUrl(URL.createObjectURL(file));
      
      const type = file.type.toLowerCase();
      if (type.startsWith("video/")) {
        setMediaType("video");
      } else if (type.startsWith("image/")) {
        setMediaType("photo");
      } else if (type.startsWith("audio/") || type.includes("mpeg") || type.includes("mp3") || type.includes("wav") || type.includes("m4a") || type.includes("ogg")) {
        setMediaType("audio");
      }
    }
  };

  return (
    <div className="space-y-4 antialiased text-[#27213F]">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept={getFileAcceptAttribute()} 
        className="hidden" 
      />

      {/* Cyber Grid Board */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {challenges.map((c, idx) => {
          const isCompleted = playerRecord?.completedChallenges?.includes(c.id);
          const isAccepted = playerRecord?.acceptedChallenges?.includes(c.id) || isCompleted;
          const isSkipped = playerRecord?.skippedChallenges?.includes(c.id);
          
          const cardImg = cyberpunkImages[idx % cyberpunkImages.length];

          return (
            <div 
              key={c.id} 
              onClick={() => setSelectedChallenge(c)} 
              className={`relative rounded-3xl overflow-hidden bg-white border transition-all duration-300 hover:scale-[1.02] text-left cursor-pointer hover:shadow-lg ${selectedChallenge?.id === c.id ? "border-[#7C4DFF] shadow-[0_0_20px_rgba(124,77,255,0.15)]" : "border-violet-150/60"}`}
            >
              {/* Media Block Illustration */}
              <div className="h-40 w-full overflow-hidden relative bg-[#070514]">
                <img src={cardImg} className="w-full h-full object-cover opacity-85 transition-transform duration-500 hover:scale-105" alt="Challenge Illustration" />
                <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-black/30"></div>
                
                {/* Score badge stars */}
                <span className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-black text-amber-300 flex items-center gap-1 border border-amber-500/20 font-mono">
                  <Star className="w-3.5 h-3.5 fill-amber-300 text-amber-300" /> {c.completionReward || c.points}
                </span>

                {/* Difficulty badges - stylized */}
                <span className="absolute top-3 right-3 bg-[#7C4DFF] text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md shadow-md">
                  {lang === "ka" 
                    ? (c.difficulty === "easy" ? "ადვილი" : c.difficulty === "medium" ? "საშუალო" : "რთული") 
                    : c.difficulty}
                </span>

                <span className="absolute bottom-2 left-4 text-[11px] font-extrabold text-[#7C4DFF] font-mono">
                  #{c.challengeNumber || idx + 1}
                </span>
              </div>

              {/* Text Info Block */}
              <div className="p-5 space-y-4">
                <h4 className="font-extrabold text-[#1E1B35] text-xs leading-snug tracking-normal line-clamp-2 h-9">
                  {getChallengeTitle(c)}
                </h4>
                
                {/* Bottom status control details */}
                <div className="flex justify-between items-center pt-3 border-t border-violet-50 text-[10px] font-black uppercase tracking-wider">
                  <span className={`flex items-center gap-1 ${isCompleted ? "text-emerald-600" : isSkipped ? "text-rose-500" : isAccepted ? "text-[#7C4DFF]" : "text-slate-400"}`}>
                    {isCompleted 
                      ? "✅ " + (lang === "ka" ? "შესრულებული" : "Completed") 
                      : isSkipped 
                        ? "❌ " + (lang === "ka" ? "აცილებული" : "Skipped") 
                        : isAccepted 
                          ? "⚡ " + (lang === "ka" ? "მიმდინარე" : "Active") 
                          : "🔒 " + (lang === "ka" ? "ჩაკეტილი" : "Locked")}
                  </span>
                  
                  <span className="text-[#7C4DFF] bg-[#F1ECFF] px-2.5 py-1 rounded-lg text-[9px] font-bold">
                    {lang === "ka" ? "დეტალები" : "Details"}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedChallenge && (() => {
        const isCompleted = playerRecord?.completedChallenges?.includes(selectedChallenge.id);
        const isAccepted = playerRecord?.acceptedChallenges?.includes(selectedChallenge.id) || isCompleted;
        const timing = playerRecord?.acceptedDates?.[selectedChallenge.id];
        const isSkipped = playerRecord?.skippedChallenges?.includes(selectedChallenge.id);

        return (
          <div className="fixed inset-0 z-55 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-xl w-full border border-violet-100 shadow-2xl text-left space-y-4 max-h-[90vh] overflow-y-auto relative">
              <button 
                type="button" 
                onClick={() => setSelectedChallenge(null)} 
                className="absolute top-4 right-4 text-slate-400 font-bold hover:text-black cursor-pointer w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"
              >
                ✕
              </button>
              
              <h3 className="font-black text-sm text-[#1E1B35] pr-6">{getChallengeTitle(selectedChallenge)}</h3>

              {/* Progress counter deadline countdown */}
              {isAccepted && timing && !isCompleted && (() => {
                const expireAt = typeof timing === 'string' ? timing : (timing as any).expireAt;
                const takenAt = typeof timing === 'string' 
                  ? new Date(new Date(timing).getTime() - 3 * 24 * 60 * 60 * 1000).toISOString() 
                  : (timing as any).takenAt || new Date().toISOString();

                return (
                  <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 flex flex-col text-xs font-mono text-purple-950">
                    <p>🕒 {lang === "ka" ? "აღების დრო:" : "Accepted at:"} {new Date(takenAt).toLocaleString()}</p>
                    <p className="font-bold text-[#7C4DFF] flex items-center gap-1.5 mt-1">
                      <Clock className="w-3.5 h-3.5 text-[#7C4DFF]" /> 
                      {getDeadlineCountdown(expireAt)}
                    </p>
                  </div>
                );
              })()}

              <div className="space-y-3">
                {/* Challenge Description */}
                <div className="p-4 bg-slate-50 rounded-xl text-xs space-y-2 leading-relaxed text-slate-700 border border-violet-50">
                  <strong className="text-[#7C4DFF] font-black block mb-1">
                    {lang === "ka" ? "📋 გამოწვევის აღწერა" : "📋 Challenge Description"}
                  </strong>
                  <p className="whitespace-pre-wrap font-medium">
                    {lang === "ka" 
                      ? (selectedChallenge.description || selectedChallenge.description_ka || "") 
                      : (selectedChallenge.description_en || selectedChallenge.description || "")}
                  </p>
                  {selectedChallenge.fullInstructions && (
                    <p className="whitespace-pre-wrap mt-2 pl-3 border-l-2 border-violet-200 text-slate-500">
                      {lang === "ka" ? selectedChallenge.fullInstructions : (selectedChallenge.fullInstructions_en || selectedChallenge.fullInstructions)}
                    </p>
                  )}
                </div>

                {/* Rules Section */}
                <div className="p-4 bg-slate-50 rounded-xl text-xs space-y-2 leading-relaxed text-slate-700 border border-violet-50">
                  <strong className="text-[#FF9B6A] font-black block mb-1">
                    {lang === "ka" ? "⚖️ წესები & ქულები" : "⚖️ Rules & Scoring"}
                  </strong>
                  <div className="whitespace-pre-wrap font-medium text-slate-600">
                    {lang === "ka" 
                      ? (selectedChallenge.fullDescription || selectedChallenge.fullDescription_ka || "") 
                      : (selectedChallenge.fullDescription_en || selectedChallenge.fullDescription || "")}
                  </div>
                  {selectedChallenge.safetyRules && (
                    <div className="whitespace-pre-wrap mt-2 pl-3 border-l-2 border-amber-300 italic text-amber-800 bg-amber-50/40 p-2.5 rounded-lg text-[11px]">
                      <strong>💡 {lang === "ka" ? "უსაფრთხოა:" : "Safe execution:"} </strong>
                      {lang === "ka" 
                        ? (selectedChallenge.safetyRules || selectedChallenge.safetyRules_ka || "") 
                        : (selectedChallenge.safetyRules_en || selectedChallenge.safetyRules || "")}
                    </div>
                  )}
                </div>
              </div>

              {currentUser ? (
                isAccepted && !isCompleted ? (
                  <form onSubmit={handleFormSubmit} className="space-y-4 border-t border-violet-100 pt-3">
                    {msg && (
                      <div className="p-2.5 bg-emerald-50 border border-emerald-100 text-emerald-600 text-[11px] font-bold rounded-xl text-center">
                        {msg}
                      </div>
                    )}
                    
                    <div className="space-y-4">
                      {/* Drag & Drop Upload Zone */}
                      <div 
                        onDragEnter={handleDrag}
                        onDragOver={handleDrag}
                        onDragLeave={handleDrag}
                        onDrop={handleDrop}
                        onClick={() => {
                          if (fileInputRef.current) {
                            fileInputRef.current.setAttribute("accept", getFileAcceptAttribute());
                            fileInputRef.current.click();
                          }
                        }}
                        className={`p-6 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all hover:scale-[1.01] space-y-2 group flex flex-col items-center justify-center ${isDragActive ? "border-[#FF9B6A] bg-[#FFF0E8]/50" : "border-violet-200 bg-violet-50/15 hover:border-[#7C4DFF]"}`}
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform ${isDragActive ? "bg-[#FF9B6A]/20 text-[#FF9B6A]" : "bg-violet-100/80 text-[#7C4DFF]"}`}>
                          <UploadCloud className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs font-black text-[#1E1B35]">
                            {lang === "ka" 
                              ? (isDragActive ? "გადმოუშვით ფაილი აქ!" : "ჩააგდეთ ან აირჩიეთ მედია ფაილი მოწყობილობიდან") 
                              : (isDragActive ? "Drop your file here!" : "Drag & drop or select media file from any device")}
                          </p>
                          <p className="text-[10px] text-slate-400 font-medium mt-1">
                            {lang === "ka" ? "ვიდეო (MP4, MOV), აუდიო (MP3, WAV), ფოტო (JPG, PNG)" : "Supports Video (MP4, MOV), Audio (MP3, WAV), Photo (JPG, PNG)"}
                          </p>
                        </div>
                      </div>

                      {/* Manual switches/indicators */}
                      <div className="space-y-1.5">
                        <div className="grid grid-cols-3 gap-2">
                          <button 
                            type="button" 
                            onClick={() => triggerFileInput("video")} 
                            className={`p-2 border rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${mediaType === "video" ? "border-[#7C4DFF] bg-[#F1ECFF] text-[#7C4DFF]" : "border-violet-100 bg-white text-slate-500"}`}
                          >
                            <Video className="w-3.5 h-3.5" />
                            {lang === "ka" ? "ვიდეო" : "Video"}
                          </button>
                          <button 
                            type="button" 
                            onClick={() => triggerFileInput("photo")} 
                            className={`p-2 border rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${mediaType === "photo" ? "border-[#7C4DFF] bg-[#F1ECFF] text-[#7C4DFF]" : "border-violet-100 bg-white text-slate-500"}`}
                          >
                            <Camera className="w-3.5 h-3.5" />
                            {lang === "ka" ? "ფოტო" : "Photo"}
                          </button>
                          <button 
                            type="button" 
                            onClick={() => triggerFileInput("audio")} 
                            className={`p-2 border rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${mediaType === "audio" ? "border-[#7C4DFF] bg-[#F1ECFF] text-[#7C4DFF]" : "border-violet-100 bg-white text-slate-500"}`}
                          >
                            <Mic className="w-3.5 h-3.5" />
                            {lang === "ka" ? "აუდიო" : "Audio"}
                          </button>
                        </div>
                      </div>
                    </div>

                    {filePreviewUrl && (
                      <div className="p-3 bg-slate-900 rounded-xl text-center max-h-48 overflow-hidden flex items-center justify-center border border-slate-800 relative">
                        <button 
                          type="button"
                          onClick={() => {
                            setFilePreviewUrl("");
                            setSelectedFile(null);
                          }}
                          className="absolute top-2 right-2 bg-black/60 hover:bg-black/90 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs cursor-pointer z-10"
                        >
                          ✕
                        </button>
                        {mediaType === "video" && <video src={filePreviewUrl} controls className="max-h-44 rounded-lg" />}
                        {mediaType === "photo" && <img src={filePreviewUrl} className="max-h-44 object-contain rounded-lg" alt="Upload" />}
                        {mediaType === "audio" && (
                          <div className="w-full py-2 px-3 text-white">
                            <Volume2 className="w-6 h-6 text-[#7C4DFF] mx-auto mb-2 animate-pulse" />
                            <audio src={filePreviewUrl} controls className="w-full" />
                          </div>
                        )}
                      </div>
                    )}

                    <textarea 
                      required 
                      placeholder={lang === "ka" ? "ჩაწერეთ კომენტარი, რეფლექსია ან ემოცია..." : "Write comment or reflection..."} 
                      value={comment} 
                      onChange={e => setComment(e.target.value)} 
                      className="w-full p-2.5 bg-[#FAF8FF] border border-violet-100 text-slate-800 rounded-xl text-xs h-16 focus:outline-none focus:border-[#7C4DFF]" 
                    />
                    
                    {/* Public Sharing Consent section with toggle */}
                    <div className="space-y-3 pb-1 border-t border-violet-50 pt-2.5">
                      <div className="flex items-center justify-between p-3 bg-[#FAF8FF] border border-[#7C4DFF]/10 rounded-2xl hover:border-[#7C4DFF]/25 transition-all">
                        <div className="flex items-start gap-2.5">
                          <input 
                            id="public-consent"
                            type="checkbox"
                            checked={visibility === "public"}
                            onChange={(e) => setVisibility(e.target.checked ? "public" : "hidden")}
                            className="mt-1 w-4.5 h-4.5 rounded text-[#7C4DFF] focus:ring-[#7C4DFF] border-violet-200 cursor-pointer"
                          />
                          <label htmlFor="public-consent" className="cursor-pointer text-left select-none">
                            <span className="text-xs font-black text-[#1E1B35] block">
                              {lang === "ka" ? "საჯაროობის ნებართვა და თანხმობა" : "Public Sharing Consent"}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                              {lang === "ka" 
                                ? "ჩემი მონაწილეობა გამოჩნდეს საჯარო სიმამაცის კედელზე ყველა მოთამაშისთვის" 
                                : "Display my submission on the public Wall of Bravery feed"}
                            </span>
                          </label>
                        </div>
                        <span className="shrink-0 text-[10px] font-black text-[#FF9B6A] bg-[#FFF0E8] px-2.5 py-1 rounded-full border border-[#FF9B6A]/10">
                          +15 B
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs font-bold font-sans">
                        <button 
                          type="button" 
                          onClick={() => setVisibility("public")} 
                          className={`p-2.5 border rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${visibility === "public" ? "border-emerald-500 bg-emerald-50 text-emerald-600 shadow-sm" : "border-violet-100 bg-white text-slate-400"}`}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          {lang === "ka" ? "საჯარო კედელი" : "Post to Bravery Wall"}
                        </button>
                        <button 
                          type="button" 
                          onClick={() => setVisibility("hidden")} 
                          className={`p-2.5 border rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${visibility === "hidden" ? "border-purple-300 bg-purple-50 text-[#7C4DFF] shadow-sm" : "border-violet-100 bg-white text-slate-400"}`}
                        >
                          <EyeOff className="w-3.5 h-3.5" />
                          {lang === "ka" ? "პირად არქივში" : "Private Archive"}
                        </button>
                      </div>

                      {/* Explicit confirmation notice of sharing consent */}
                      {visibility === "public" ? (
                        <div className="p-2.5 bg-emerald-50/50 border border-emerald-100/60 rounded-xl text-[10px] text-emerald-700 font-medium flex items-start gap-1.5">
                          <span className="text-xs">📢</span>
                          <p>
                            {lang === "ka" 
                              ? "დასტურდება საჯაროობის უფლება! შესრულება მყისიერად განთავსდება საიტის მთავარ გვერდზე კატეგორიაში 'საჯარო სიმამაცის კედელი'."
                              : "Sharing consent granted! Your challenge proof is instantly posted to the public Wall of Bravery homepage feed."}
                          </p>
                        </div>
                      ) : (
                        <div className="p-2.5 bg-purple-50/50 border border-purple-100/60 rounded-xl text-[10px] text-[#7C4DFF] font-medium flex items-start gap-1.5">
                          <span className="text-xs">🔒</span>
                          <p>
                            {lang === "ka" 
                              ? "მტკიცებულება შეინახება მხოლოდ თქვენს კაბინეტში 'შესრულებული გამოწვევები' და არ გასაჯაროვდება საიტის მთავარ გვერდზე."
                              : "This proof will only run inside your private cabinet and won't go onto the public Wall of Bravery."}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button 
                        type="submit" 
                        disabled={isUploading}
                        className="flex-1 py-3 bg-[#7C4DFF] hover:bg-[#6c3df0] text-white text-xs font-black rounded-xl uppercase shadow-md shadow-[#7C4DFF]/30 cursor-pointer transition-colors"
                      >
                        🚀 {lang === "ka" ? "დაადასტურე და ატვირთე" : "Confirm & Send"}
                      </button>
                      <button 
                        type="button" 
                        onClick={() => handleSkipChallenge(selectedChallenge.id)} 
                        className="px-4 py-3 border border-rose-200 bg-rose-50 text-rose-600 rounded-xl text-xs font-bold hover:bg-rose-100 cursor-pointer transition-all"
                      >
                        {lang === "ka" ? "აცილება (-3)" : "Skip (-3)"}
                      </button>
                    </div>
                  </form>
                ) : isCompleted ? (
                  <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-xs font-bold text-emerald-700 text-center flex items-center justify-center gap-1.5">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                    {lang === "ka" ? "გამოწვევა უკვე წარმატებით შესრულებულია! 🎉" : "Challenge is already completed! 🎉"}
                  </div>
                ) : (
                  <div className="space-y-4 text-center">
                    {isSkipped && (
                      <p className="text-[11px] text-amber-600 font-bold bg-amber-50 p-2 rounded-lg text-center">
                        ⚠️ {lang === "ka" ? "თქვენ ერთხელ აიცილეთ ეს გამოწვევა, მაგრამ ძალების მოსინჯვა კვლავ შეგიძლიათ!" : "You skipped this, but you can retry!"}
                      </p>
                    )}
                    <div className="flex gap-3">
                      <button 
                        type="button"
                        onClick={() => handleAcceptChallenge(selectedChallenge.id)}
                        className="flex-1 py-3 bg-[#7C4DFF] hover:bg-[#6c3df0] text-white text-xs font-black rounded-xl uppercase shadow-lg shadow-[#7C4DFF]/20 cursor-pointer transition-colors text-center"
                      >
                        📋 {lang === "ka" ? "მიიღე გამოწვევა და დაიცავი 3 დღიანი ვადა" : "Accept Challenge (Start 3-Day Deadline)"}
                      </button>
                      <button 
                        type="button" 
                        onClick={() => handleSkipChallenge(selectedChallenge.id)} 
                        className="px-4 py-3 border border-rose-200 bg-rose-50 text-rose-600 rounded-xl text-xs font-bold hover:bg-rose-100 cursor-pointer transition-all"
                      >
                        {lang === "ka" ? "აცილება (-3)" : "Skip (-3)"}
                      </button>
                    </div>
                  </div>
                )
              ) : (
                <div className="p-4 bg-purple-50 border border-purple-100 text-xs text-purple-900 font-medium rounded-xl text-center space-y-3">
                  <p>{lang === "ka" ? "მონაწილეობის მისაღებად და მტკიცებულების ასატვირთად გთხოვთ გაიაროთ ავტორიზაცია." : "Please sign in to accept this challenge and upload evidence."}</p>
                  <div className="flex gap-2 justify-center">
                    <button 
                      type="button" 
                      onClick={() => {
                        setSelectedChallenge(null);
                        if (onStartLogin) onStartLogin();
                      }} 
                      className="px-4 py-2 border border-[#7C4DFF] text-[#7C4DFF] rounded-lg text-[10px] font-bold cursor-pointer"
                    >
                      {lang === "ka" ? "შესვლა" : "Sign in"}
                    </button>
                    <button 
                      type="button" 
                      onClick={() => {
                        setSelectedChallenge(null);
                        if (onStartRegister) onStartRegister();
                      }} 
                      className="px-4 py-2 bg-[#7C4DFF] text-white rounded-lg text-[10px] font-bold cursor-pointer"
                    >
                      {lang === "ka" ? "რეგისტრაცია" : "Sign up"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}