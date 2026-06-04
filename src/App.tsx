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

// Translation Glossary dictionaries (unchanged)
const t = {
  ka: { brandName: "ბიფურკაცია", home: "მთავარი", about: "ჩვენს შესახებ", cabinet: "კაბინეტი", register: "რეგისტრაცია", login: "შესვლა", logout: "გასვლა", simulateLogin: "სისტემაში შესვლა", testUser: "ტესტ მომხმარებლით შესვლა (@ნიკა)", customLogin: "ავტორიზაცია", nicknameInput: "მომხმარებლის სახელი / ნიკნეიმი", passwordInput: "პაროლი (ნებისმიერი)", submitLogin: "შესვლა", noAccount: "არ გაქვთ ანგარიში?", orRegister: "გაიარეთ რეგისტრაცია", createAccount: "რეგისტრაცია", alreadyHaveAccount: "უკვე გაქვთ ანგარიში?", orLogin: "შესვლა სისტემაში", firstName: "სახელი", lastName: "გვარი", phone: "ტელეფონი", email: "ელფოსტა", voluntaryConsent: "ვადასტურებ, რომ ვმონაწილეობ ნებაყოფლობით და პასუხისმგებლობა მეკისრება მხოლოდ მე.", avatarSelect: "აირჩიეთ ავატარი", fictionalName: "გამოიყენე ფიქტიური/ანონიმური სახელი რეიტინგში", regSuccess: "რეგისტრაცია წარმატებით დასრულდა! 🎉", loginSuccess: "ავტორიზაცია წარმატებულია! 🔑", errorFillAll: "გთხოვთ შეავსოთ ყველა ველი და აირჩიოთ ავატარი!", errorConsent: "მონაწილეობისთვის აუცილებელია დაადასტუროთ თანხმობა!" },
  en: { brandName: "Bifurcation", home: "Home", about: "About Us", cabinet: "Cabinet", register: "Register", login: "Sign In", logout: "Sign Out", simulateLogin: "Sign In Mode", testUser: "Login with Test User (@Nika)", customLogin: "Sign In", nicknameInput: "Username / Nickname", passwordInput: "Password (any)", submitLogin: "Sign In", noAccount: "Don't have an account?", orRegister: "Sign up now", createAccount: "Register Now", alreadyHaveAccount: "Already have an account?", orLogin: "Sign In instead", firstName: "First Name", lastName: "Last Name", phone: "Phone Number", email: "Email Address", voluntaryConsent: "I confirm voluntary participation and assume sole personal liability.", avatarSelect: "Select Avatar", fictionalName: "Use anonymous nickname on standings", regSuccess: "Registration successful! 🎉", loginSuccess: "Sign in successful! 🔑", errorFillAll: "Please fill all fields and select an avatar!", errorConsent: "You must accept voluntary consent to play!" }
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

  const [submissions, setSubmissions] = useState<any[]>(() => storageService.loadData<any[]>("bifurcation_submissions", []));
  const [marathons, setMarathons] = useState<any[]>([]);
  const [monthlyPlayerRecords, setMonthlyPlayerRecords] = useState<any[]>(() => storageService.loadData<any[]>(storageKeys.monthlyPlayerRecords, []));
  const [selectedMarathonId, setSelectedMarathonId] = useState<string>(() => localStorage.getItem("bifurcation_selected_marathon_id") || "june");
  const [currentTab, setCurrentTab] = useState<string>("home");
  const [activeCabinetTab, setActiveCabinetTab] = useState<string>("progress");
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [lang, setLang] = useState<"ka" | "en">("ka");
  const [stateTick, setStateTick] = useState(0);

  useEffect(() => {
    const loadAppData = async () => {
      const mData = await marathonService.getMarathons();
      setMarathons(mData);
      setSubmissions(storageService.loadData<any[]>("bifurcation_submissions", []));
      setMonthlyPlayerRecords(storageService.loadData<any[]>(storageKeys.monthlyPlayerRecords, []));
    };
    loadAppData();
  }, [stateTick]);

  const handleStateUpdate = () => {
    setStateTick(p => p + 1);
    const updatedUser = localStorage.getItem("bifurcation_session_user");
    if (updatedUser) setCurrentUser(JSON.parse(updatedUser));
    setSubmissions(storageService.loadData<any[]>("bifurcation_submissions", []));
    setMonthlyPlayerRecords(storageService.loadData<any[]>(storageKeys.monthlyPlayerRecords, []));
  };

  const handleVote = async (subId: string) => {
    const subs = storageService.loadData<any[]>("bifurcation_submissions", []);
    const sub = subs.find(s => s.id === subId);
    if (!sub) return;

    if (!sub.likedBy) sub.likedBy = [];
    sub.votes = sub.likedBy.length;
    sub.likes = sub.likedBy.length;

    storageService.saveData("bifurcation_submissions", subs);
    handleStateUpdate();
  };

  // ... (დანარჩენი ლოგიკა და JSX რენდერი უცვლელი რჩება, დარწმუნდით რომ ფაილის ბოლოში მხოლოდ ერთი } ეკუთვნის App ფუნქციას)
  // [იხილეთ წინა კოდი JSX ნაწილისთვის]
  return (<div className="w-full min-h-screen bg-[#FAF8FF] font-sans antialiased text-[#27213F]">...</div>);
}
