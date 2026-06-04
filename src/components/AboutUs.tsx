import React from "react";
import { 
  Sparkles, 
  User as UserIcon, 
  MapPin, 
  Globe, 
  Compass, 
  ArrowRight,
  Heart,
  Users,
  Award,
  BookOpen
} from "lucide-react";

interface AboutUsProps {
  lang: "ka" | "en";
}

export default function AboutUs({ lang }: AboutUsProps) {
  const isKa = lang === "ka";

  return (
    <div className="space-y-12 py-4 text-left font-sans animate-fade-in">
      
      {/* 1. ARTISTIC BILINGUAL HERO BANNER */}
      <div className="relative overflow-hidden rounded-3xl border border-violet-100/70 bg-gradient-to-br from-indigo-900 via-[#161233] to-slate-950 p-8 md:p-12 shadow-xl text-left">
        {/* Glowing background shapes */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-violet-500/10 rounded-full filter blur-3xl -z-10 translate-x-12 -translate-y-12"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-fuchsia-500/10 rounded-full filter blur-3xl -z-10 -translate-x-12 translate-y-12"></div>
        
        <div className="flex flex-col lg:grid lg:grid-cols-12 gap-8 items-center relative z-10">
          
          {/* Hero text */}
          <div className="lg:col-span-7 space-y-4 text-left">
            <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs font-black tracking-widest bg-violet-500/20 text-violet-300 border border-violet-500/30 px-3.5 py-1 rounded-full uppercase">
              <Compass className="w-3.5 h-3.5 text-violet-300 animate-spin-slow" />
              {isKa ? "პლატფორმის შესახებ" : "About Platform"}
            </span>

            <h2 className="text-3xl sm:text-4.5xl font-black text-white tracking-tight leading-tight">
              {isKa ? "ბიფურკაციის შესახებ" : "About Bifurcation"}
            </h2>

            <p className="text-sm sm:text-base text-slate-300 font-light leading-relaxed max-w-xl">
              {isKa 
                ? "თამაში პიროვნული განვითარების, სიმამაცისა და შემოქმედებითი თვითგამოხატვისთვის."
                : "A game for personal development, courage, and creative self-expression."}
            </p>
          </div>

          {/* Large custom SVG illustration depicting generations dialogue around branching path */}
          <div className="lg:col-span-5 w-full flex justify-center items-center">
            <svg viewBox="0 0 300 220" className="w-full max-w-xs filter drop-shadow-lg select-none">
              <defs>
                <linearGradient id="glowGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#8b5cf6" />
                  <stop offset="50%" stopColor="#ec4899" />
                  <stop offset="100%" stopColor="#f59e0b" />
                </linearGradient>
                <filter id="subtleGlow">
                  <feGaussianBlur stdDeviation="5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              
              {/* Branching pathway */}
              <path d="M 150,220 L 150,150" stroke="#475569" strokeWidth="12" strokeLinecap="round" opacity="0.6"/>
              {/* Routine branch */}
              <path d="M 150,150 C 120,140 80,140 30,130" stroke="#334155" strokeWidth="8" strokeLinecap="round" fill="none" opacity="0.5"/>
              {/* Courage branch */}
              <path d="M 150,150 C 180,140 230,120 250,50" stroke="url(#glowGrad)" strokeWidth="12" strokeLinecap="round" fill="none" filter="url(#subtleGlow)"/>
              
              {/* Interactive nodes */}
              <circle cx="150" cy="150" r="10" fill="#a78bfa" />
              <circle cx="250" cy="50" r="12" fill="#fbbf24" filter="url(#subtleGlow)" />
              <circle cx="30) " cy="130" r="6" fill="#475569" />

              {/* Generational Avatars around the point */}
              <g transform="translate(110, 110)">
                {/* Younger Generation */}
                <circle cx="0" cy="0" r="12" fill="#60a5fa" />
                <path d="M -6,12 L 6,12 L 4,5 L -4,5 Z" fill="#60a5fa" />
                <text x="0" y="3" fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle">✨</text>
              </g>

              <g transform="translate(200, 140)">
                {/* Older Generation */}
                <circle cx="0" cy="0" r="13" fill="#fb7185" />
                <text x="0" y="4" fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle">🌿</text>
              </g>

              <g transform="translate(150, 45)">
                {/* Middle Generation / Coach */}
                <circle cx="0" cy="0" r="10" fill="#34d399" />
                <text x="0" y="3" fill="#ffffff" fontSize="7" fontWeight="bold" textAnchor="middle">💎</text>
              </g>

              {/* Magical sparkling particles */}
              <circle cx="230" cy="90" r="3" fill="#fbbf24" filter="url(#subtleGlow)" />
              <circle cx="180" cy="60" r="2.5" fill="#f472b6" />
              <circle cx="260" cy="120" r="2" fill="#818cf8" />
              
              <text x="30" y="155" fill="#64748b" fontSize="8" fontWeight="bold">COMFORT</text>
              <text x="220" y="25" fill="#f59e0b" fontSize="10" fontWeight="extrabold" filter="url(#subtleGlow)">⚡ BIFURCATION</text>
            </svg>
          </div>

        </div>
      </div>

      {/* 2. CARD-BASED GRID LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left column: Author & Website links */}
        <div className="lg:col-span-5 space-y-6 flex flex-col">
          
          {/* Author Card */}
          <div className="bg-white border border-slate-150 rounded-2xl p-6.5 shadow-sm space-y-4 flex-1">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-xl bg-violet-100 border border-violet-200 flex items-center justify-center text-violet-600 shrink-0">
                <UserIcon className="w-5 h-5" />
              </div>
              <h3 className="text-md sm:text-lg font-black text-slate-900 uppercase tracking-tight">
                {isKa ? "თამაშის ავტორი" : "Game Author"}
              </h3>
            </div>
            <p className="text-sm text-slate-700 font-medium bg-violet-50/40 border border-violet-100/50 p-4.5 rounded-xl leading-relaxed">
              {isKa 
                ? "თამაშის ავტორია ნუგზარ კოხრეიძე." 
                : "The author of the game is Nugzar Kokhreidze."}
            </p>
          </div>

          {/* Clickable Website link card */}
          <div className="bg-white border border-slate-150 rounded-2xl p-6.5 shadow-sm space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-600 shrink-0">
                <Globe className="w-5 h-5" />
              </div>
              <h3 className="text-md sm:text-lg font-black text-slate-900 uppercase tracking-tight">
                {isKa ? "ვებგვერდი" : "Website"}
              </h3>
            </div>
            
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">
                {isKa ? "გარე რესურსი" : "EXTERNAL RESOURCE"}
              </span>
              <a 
                href="https://www.ricdog.org" 
                target="_blank" 
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-violet-600 hover:text-violet-750 font-black text-base transition-all group"
              >
                <span>www.ricdog.org</span>
                <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
              </a>
            </div>
          </div>

        </div>

        {/* Right column: Organization description */}
        <div className="lg:col-span-7 bg-white border border-slate-150 rounded-2xl p-6 md:p-8 shadow-sm space-y-6">
          
          <div className="flex items-center gap-3.5 border-b border-slate-100 pb-4">
            <div className="w-11 h-11 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
              <Users className="w-5.5 h-5.5" />
            </div>
            <div className="text-left">
              <h3 className="text-md sm:text-lg font-extrabold text-[#111827] uppercase tracking-tight">
                {isKa ? "პროგრამის განმახორციელებელი ორგანიზაცია" : "Implementing Organization"}
              </h3>
              <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                {isKa ? "სგკ „თაობათა დიალოგი“" : "RICDOG Community"}
              </p>
            </div>
          </div>

          <div className="space-y-4 text-xs sm:text-sm text-slate-650 leading-relaxed font-light text-justify">
            <p className="font-medium text-slate-800">
              {isKa 
                ? "პროგრამა ხორციელდება სამეცნიერო-ინტელექტუალური კლუბი „თაობათა დიალოგის“ მიერ, პიროვნული განვითარების პროგრამის ფარგლებში."
                : "The program is implemented by the Research-Intellectual Club 'Dialogue of Generations' within the framework of its personal development program."}
            </p>
            
            <div className="w-full h-[1px] bg-slate-100 my-2"></div>

            {isKa ? (
              <>
                <p>
                  სამეცნიერო-ინტელექტუალური კლუბი „თაობათა დიალოგი“ (RICDOG) – სათემო ტიპის ორგანიზაციაა, რომელიც საკუთარ თავს საზოგადოების მოდელად ხედავს.
                </p>
                <p>
                  ორგანიზაციის გამოცდილებამ აჩვენა, რომ საქართველოში შესაძლებელია მრავალფეროვან გარემოში ურთიერთთანამშრომლობა, ცხოვრება, ურთიერთობა და ერთობლივი საქმის კეთება.
                </p>
                <p>
                  RICDOG-ის განვლილმა წლებმა აჩვენა, რომ საუკეთესო შედეგი მიიღწევა, როდესაც განსხვავებული თაობის ადამიანები თანამშრომლობენ და ერთიანი ძალებით ქმნიან სიახლეებს, აგვარებენ გამოწვევებს და აზიარებენ ცოდნას.
                </p>
              </>
            ) : (
              <>
                <p>
                  Research-Intellectual Club 'Dialogue of Generations' (RICDOG) is a community-based organization that sees itself as a model of society.
                </p>
                <p>
                  The organization's experience has shown that in Georgia it is possible to cooperate, live, communicate, and work together in a diverse environment.
                </p>
                <p>
                  RICDOG's years of experience have shown that the best results are achieved when people from different generations cooperate, create new initiatives together, solve challenges, and share knowledge.
                </p>
              </>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
