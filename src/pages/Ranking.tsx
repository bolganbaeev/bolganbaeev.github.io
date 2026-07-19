import React, { useEffect, useState } from 'react';
import { Trophy, Medal, Star, ChevronDown, User, Sparkles } from 'lucide-react';
import { UserProfile } from '../db/indexedDb';

interface RankUser {
  name: string;
  avatar: string;
  score: number;
  totalHistory: number[];
  type: string;
}

interface RankingProps {
  user: UserProfile;
}

const MONTHS = [
  { idx: -1, name: 'Жалпы Ұпай' },
  { idx: 0, name: 'Қыркүйек' },
  { idx: 1, name: 'Қазан' },
  { idx: 2, name: 'Қараша' },
  { idx: 3, name: 'Желтоқсан' },
  { idx: 4, name: 'Қаңтар' },
  { idx: 5, name: 'Ақпан' },
  { idx: 6, name: 'Наурыз' },
  { idx: 7, name: 'Сәуір' },
  { idx: 8, name: 'Мамыр' },
];

export default function Ranking({ user }: RankingProps) {
  const [rankingList, setRankingList] = useState<RankUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(-1); // Default to overall score

  // 1. Fetch rankings
  useEffect(() => {
    async function loadRankings() {
      try {
        setLoading(true);
        const res = await fetch('/users/ranking.json', { cache: 'no-store' });
        if (res.ok) {
          const list = await res.json();
          setRankingList(list);
        }
      } catch (err) {
        console.error('Failed to load ranking file', err);
      } finally {
        setLoading(false);
      }
    }
    loadRankings();
  }, []);

  // 2. Sort ranking list according to selected month
  const sortedRankings = [...rankingList].map(student => {
    // Determine active score
    let activeScore = student.score;
    if (selectedMonth >= 0 && Array.isArray(student.totalHistory)) {
      activeScore = student.totalHistory[selectedMonth] ?? 0;
    }
    return { ...student, activeScore };
  }).sort((a, b) => b.activeScore - a.activeScore);

  // Check current user position
  const currentUserRankIndex = sortedRankings.findIndex(r => r.name.toLowerCase() === user.name.toLowerCase());
  const currentUserRank = currentUserRankIndex !== -1 ? sortedRankings[currentUserRankIndex] : null;

  return (
    <div className="space-y-6 pb-24">
      {/* Title */}
      <div className="space-y-1">
        <h1 className="text-2xl font-extrabold text-[#0F766E] dark:text-[#2dd4bf] flex items-center gap-2">
          <Trophy className="w-6 h-6 text-yellow-500 animate-pulse" />
          Сынып Рейтингі
        </h1>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Сыныптастарыңыздың дайындық нәтижелері мен айлық көрсеткіштері
        </p>
      </div>

      {/* Month Dropdown Filter */}
      <div className="flex items-center gap-3">
        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 shrink-0 uppercase tracking-wider">Пысықтау мерзімі:</label>
        <div className="relative flex-1">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="w-full pl-4 pr-10 py-2.5 bg-white dark:bg-[#1e1d3a] border border-[#d8e0ec] dark:border-gray-800 rounded-xl text-xs font-bold text-black dark:text-white focus:outline-none focus:border-[#0F766E] dark:focus:border-[#2dd4bf] appearance-none cursor-pointer shadow-sm"
          >
            {MONTHS.map((m) => (
              <option key={m.idx} value={m.idx} className="bg-white dark:bg-[#151426] text-black dark:text-white">
                {m.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-gray-500 pointer-events-none" />
        </div>
      </div>

      {/* Hero Podium / Top 3 visual display */}
      {sortedRankings.length >= 3 && selectedMonth === -1 && (
        <div className="flex justify-center items-end gap-3 pt-6 pb-2 px-2 max-w-sm mx-auto">
          {/* #2 Place */}
          <div className="flex flex-col items-center flex-1">
            <div className="relative">
              <img 
                src={`/${sortedRankings[1].avatar}`} 
                alt={sortedRankings[1].name}
                className="w-12 h-12 rounded-full border-2 border-slate-400 bg-black/5 dark:bg-white/5 object-cover"
                onError={(e) => { (e.target as HTMLImageElement).src = 'https://api.dicebear.com/7.x/bottts/svg?seed=2'; }}
              />
              <span className="absolute -bottom-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-400 flex items-center justify-center text-[10px] font-black text-white dark:text-slate-950 shadow-md">2</span>
            </div>
            <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300 mt-2 text-center line-clamp-1">{sortedRankings[1].name.split(' ')[1] || sortedRankings[1].name}</span>
            <span className="text-[11px] font-black text-[#0F766E] dark:text-[#2dd4bf] mt-0.5">{sortedRankings[1].activeScore}</span>
            <div className="w-full h-12 bg-slate-500/20 dark:bg-slate-500/10 border border-slate-500/20 rounded-t-lg mt-2"></div>
          </div>

          {/* #1 Place */}
          <div className="flex flex-col items-center flex-1 -translate-y-2 scale-110">
            <div className="relative">
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-yellow-500 animate-bounce">
                <Star className="w-5 h-5 fill-yellow-500" />
              </div>
              <img 
                src={`/${sortedRankings[0].avatar}`} 
                alt={sortedRankings[0].name}
                className="w-14 h-14 rounded-full border-2 border-yellow-500 bg-black/5 dark:bg-white/5 object-cover"
                onError={(e) => { (e.target as HTMLImageElement).src = 'https://api.dicebear.com/7.x/bottts/svg?seed=1'; }}
              />
              <span className="absolute -bottom-1.5 -right-1.5 w-5 h-5 rounded-full bg-yellow-500 flex items-center justify-center text-[10px] font-black text-yellow-950 shadow-md">1</span>
            </div>
            <span className="text-[10px] font-black text-black dark:text-white mt-2 text-center line-clamp-1">{sortedRankings[0].name.split(' ')[1] || sortedRankings[0].name}</span>
            <span className="text-[11px] font-black text-yellow-600 dark:text-yellow-400 mt-0.5">{sortedRankings[0].activeScore}</span>
            <div className="w-full h-16 bg-yellow-500/20 dark:bg-yellow-500/10 border border-yellow-500/20 rounded-t-lg mt-2"></div>
          </div>

          {/* #3 Place */}
          <div className="flex flex-col items-center flex-1">
            <div className="relative">
              <img 
                src={`/${sortedRankings[2].avatar}`} 
                alt={sortedRankings[2].name}
                className="w-12 h-12 rounded-full border-2 border-amber-600 bg-black/5 dark:bg-white/5 object-cover"
                onError={(e) => { (e.target as HTMLImageElement).src = 'https://api.dicebear.com/7.x/bottts/svg?seed=3'; }}
              />
              <span className="absolute -bottom-1.5 -right-1.5 w-5 h-5 rounded-full bg-amber-600 flex items-center justify-center text-[10px] font-black text-white dark:text-amber-950 shadow-md">3</span>
            </div>
            <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300 mt-2 text-center line-clamp-1">{sortedRankings[2].name.split(' ')[1] || sortedRankings[2].name}</span>
            <span className="text-[11px] font-black text-[#0F766E] dark:text-[#2dd4bf] mt-0.5">{sortedRankings[2].activeScore}</span>
            <div className="w-full h-8 bg-amber-600/20 dark:bg-amber-600/10 border border-amber-600/20 rounded-t-lg mt-2"></div>
          </div>
        </div>
      )}

      {/* Leaderboard Ranks Feed List */}
      <div className="space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(n => (
              <div key={n} className="h-14 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] animate-pulse"></div>
            ))}
          </div>
        ) : sortedRankings.length > 0 ? (
          <div className="bg-white dark:bg-[#151426] border border-[#d8e0ec] dark:border-gray-800/60 rounded-2xl overflow-hidden divide-y divide-[#d8e0ec] dark:divide-gray-800 shadow-sm">
            {sortedRankings.map((student, idx) => {
              const isMe = student.name.toLowerCase() === user.name.toLowerCase();
              const isTop3 = idx < 3;
              
              let placeStyle = 'bg-black/5 dark:bg-white/5 text-gray-500 dark:text-gray-400';
              if (idx === 0) placeStyle = 'bg-yellow-100 dark:bg-yellow-400 text-yellow-800 dark:text-yellow-950 font-black';
              if (idx === 1) placeStyle = 'bg-slate-100 dark:bg-slate-400 text-slate-800 dark:text-slate-950 font-black';
              if (idx === 2) placeStyle = 'bg-amber-100 dark:bg-amber-600 text-amber-800 dark:text-amber-950 font-black';

              return (
                <div 
                  key={idx}
                  className={`p-4 flex items-center justify-between gap-4 transition-colors ${
                    isMe ? 'bg-[#e9f5f4] dark:bg-[#0f3a37]/30 border-l-4 border-[#0F766E]' : 'hover:bg-black/[0.01] dark:hover:bg-white/[0.01]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Position index badge */}
                    <span className={`w-6 h-6 rounded-lg text-xs flex items-center justify-center shrink-0 ${placeStyle}`}>
                      {idx + 1}
                    </span>

                    {/* Student Avatar */}
                    <img 
                      src={`/${student.avatar}`} 
                      alt={student.name}
                      className="w-9 h-9 rounded-full object-cover border border-[#d8e0ec] dark:border-gray-800 bg-black/5 dark:bg-white/5 shrink-0"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(student.name)}`;
                      }}
                    />

                    {/* Student name details */}
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm text-black dark:text-gray-200">{student.name}</span>
                        {isMe && (
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-[#0F766E] text-white uppercase">МЕН</span>
                        )}
                      </div>
                      <span className="block text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">{student.type || 'ҰБТ'} дайындалушысы</span>
                    </div>
                  </div>

                  {/* Active score highlight */}
                  <div className="text-right shrink-0">
                    <span className={`text-base font-black ${isMe ? 'text-[#0F766E] dark:text-[#2dd4bf]' : isTop3 ? 'text-yellow-600 dark:text-yellow-400' : 'text-black dark:text-white'}`}>
                      {student.activeScore}
                    </span>
                    <span className="block text-[10px] text-gray-500 dark:text-gray-400">ұпай</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400 text-xs">
            Рейтинг мәліметтері қолжетімсіз.
          </div>
        )}
      </div>
    </div>
  );
}
