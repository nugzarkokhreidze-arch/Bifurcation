import React, { useState, useRef, useEffect } from "react";
import { User } from "../types";
import { Send, Bot, AlertCircle, RefreshCw } from "lucide-react";

interface AiGuideChatProps {
  currentUser: User;
  lang?: "ka" | "en";
}

interface ChatMessage {
  role: "user" | "model";
  text: string;
}

export default function AiGuideChat({ currentUser, lang = "ka" }: AiGuideChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Initialize or update initial greeting on mount or language switch
  useEffect(() => {
    if (messages.length === 0 || (messages.length === 1 && messages[0].role === "model")) {
      setMessages([
        {
          role: "model",
          text: lang === "ka"
            ? `გამარჯობა, ${currentUser.nickname}! მე ვარ ბიფურკაციის მეგზური. 🌟\n\nდაგეხმარები აირჩიო უსაფრთხო გამოწვევა, დაინახო შენი პროგრესი, დაძლიო გაუბედავობა და გახდე უფრო თავდაჯერებული. რისი გაზიარება გსურს დღეს?`
            : `Hello, ${currentUser.nickname}! I am your Bifurcation Guide. 🌟\n\nI am here to help you select safe challenges, analyze your progress, overcome hesitation, and cultivate robust self-confidence. What would you like to share today?`
        }
      ]);
    }
  }, [lang, currentUser.nickname]);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userMsg = inputText.trim();
    setMessages(prev => [...prev, { role: "user", text: userMsg }]);
    setInputText("");
    setLoading(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          history: messages.slice(-6),
          lang // Send the language indicator to prompt the Gemini model accordingly!
        })
      });

      const data = await response.json();
      if (response.ok) {
        setMessages(prev => [...prev, { role: "model", text: data.reply }]);
      } else {
        setMessages(prev => [
          ...prev,
          { 
            role: "model", 
            text: lang === "ka" 
              ? "ბოდიში, კავშირის შეფერხებაა. გთხოვთ სცადოთ კითხვის დასმა თავიდან." 
              : "Sorry, a connection timeout occurred. Please try asking your question again." 
          }
        ]);
      }
    } catch (err) {
      setMessages(prev => [
        ...prev,
        { 
          role: "model", 
          text: lang === "ka" 
            ? "სერვერი დროებით მიუწვდომელია. გთხოვთ გადაამოწმოთ ინტერნეტ კავშირი." 
            : "The server is temporarily unreachable. Please check your network connection." 
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="ai-guide-chat" className="max-w-3xl mx-auto space-y-6 text-left">
      {/* Intro Header */}
      <div className="bg-gradient-to-r from-violet-955/20 via-slate-900 to-indigo-955/20 border border-slate-850 p-6 md:p-8 rounded-2xl flex items-center gap-4 text-left">
        <div className="p-3 bg-violet-500/10 text-violet-400 rounded-xl shrink-0">
          <Bot className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            {lang === "ka" ? "ბიფურკაციის მეგზური" : "Bifurcation Guide"}
            <span className="text-[10px] bg-violet-600 px-2.5 py-0.5 rounded text-white font-extrabold tracking-wider animate-pulse font-mono">AI</span>
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed font-light">
            {lang === "ka" 
              ? "პერსონალური ხელოვნური ინტელექტის ქოუჩი, რომელიც მზად არის ნებისმიერ დროს მხარი დაგიჭიროთ შიშების დაძლევაში."
              : "A personalized AI companion designed to help you deconstruct fears, step out of comfort zones, and embrace self-worth."}
          </p>
        </div>
      </div>

      {/* Safety info */}
      <div className="bg-amber-500/5 border border-amber-500/10 p-4 rounded-xl flex items-start gap-2.5 text-amber-300 text-[11px] text-left leading-normal font-light">
        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <span>
          {lang === "ka"
            ? "მეგზური არ სვამს ფსიქოლოგიურ ან სამედიცინო დიაგნოზებს. ის წარმოადგენს განვითარების დამხმარე, მოტივაციურ ასისტენტს."
            : "The AI supervisor does not formulate psychiatric assessments or medical therapy. It remains a personal growth and motivation assistant."}
        </span>
      </div>

      {/* Chat Area */}
      <div className="bg-slate-900/60 border border-slate-850 rounded-2xl flex flex-col h-[500px]">
        {/* Messages list */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          {messages.map((m, idx) => {
            const isAi = m.role === "model";
            return (
              <div
                key={idx}
                className={`flex gap-3 max-w-[85%] text-left ${isAi ? "mr-auto" : "ml-auto flex-row-reverse"}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-slate-300 font-bold border border-slate-800 ${
                  isAi ? "bg-[#7c3aed] text-white" : "bg-slate-950/80"
                }`}>
                  {isAi ? <Bot className="w-4 h-4" /> : "👤"}
                </div>

                <div className={`p-4 rounded-2xl text-xs leading-relaxed space-y-2 whitespace-pre-line ${
                  isAi
                    ? "bg-slate-950 border border-slate-850 text-slate-300 rounded-tl-none font-light"
                    : "bg-violet-605 bg-violet-600 text-white rounded-tr-none font-bold"
                }`}>
                  <p>{m.text}</p>
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex gap-3 max-w-[85%] mr-auto text-left">
              <div className="w-8 h-8 rounded-full bg-violet-600 text-white flex items-center justify-center shrink-0 border border-slate-800">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-slate-950 border border-slate-850 text-slate-450 p-4 rounded-2xl rounded-tl-none text-xs flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-violet-400" />
                {lang === "ka" ? "მეგზური ფიქრობს..." : "Guide is thinking..."}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Form Input */}
        <form onSubmit={handleSendMessage} className="p-4 bg-slate-950 border-t border-slate-850 flex gap-2.5">
          <input
            required
            disabled={loading}
            type="text"
            placeholder={
              lang === "ka" 
                ? "დასვით კითხვა: მაგ. როგორ დავძლიო ხალხის წინაშე ლაპარაკის შიში?" 
                : "Ask anything, e.g., How do I cultivate stage courage or manage public speaking?"
            }
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="flex-1 bg-slate-900 border border-slate-800 focus:border-violet-500 text-slate-200 rounded-xl px-4 py-3 text-xs placeholder-slate-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading || !inputText.trim()}
            className="p-3 bg-violet-600 hover:bg-violet-550 text-white rounded-xl transition-all disabled:opacity-50 flex items-center justify-center cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
