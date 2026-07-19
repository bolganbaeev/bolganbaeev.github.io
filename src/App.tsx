import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { 
  GraduationCap, 
  Home as HomeIcon, 
  LayoutGrid, 
  User as UserIcon, 
  Zap,
  WifiOff,
  ChevronRight,
  Maximize
} from 'lucide-react';

import { getCurrentProfile, logoutUser, UserProfile, getSetting, saveSetting, QuizMistake } from './db/indexedDb';
import { TopicMeta } from './data/topics';

// Pages import
import Login from './pages/Login';
import Home from './pages/Home';
import TestSelection from './pages/TestSelection';
import TestRunner from './pages/TestRunner';
import Anki from './pages/Anki';
import Blocks from './pages/Blocks';
import Ranking from './pages/Ranking';
import MathFormulas from './pages/MathFormulas';
import Profile from './pages/Profile';

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [initLoading, setInitLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('home'); // home, test, anki, blocks, profile, math

  // Active quiz playing states
  const [activeQuizTopic, setActiveQuizTopic] = useState<TopicMeta | null>(null);
  const [activeQuizMode, setActiveQuizMode] = useState('instant');
  const [activeQuizCount, setActiveQuizCount] = useState(10);
  const [mistakeQuizQuestions, setMistakeQuizQuestions] = useState<any[] | undefined>(undefined);

  // Settings states
  const [defaultQuestionsCount, setDefaultQuestionsCount] = useState(10);
  const [defaultTestMode, setDefaultTestMode] = useState('instant');

  // Dark Mode & Offline States
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('isDarkMode');
    return saved === null ? true : saved === 'true';
  });
  const [isOfflineSimulated, setIsOfflineSimulated] = useState(() => {
    return localStorage.getItem('isOfflineSimulated') === 'true';
  });

  // Apply Dark Mode effect
  useEffect(() => {
    localStorage.setItem('isDarkMode', String(isDarkMode));
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    localStorage.setItem('isOfflineSimulated', String(isOfflineSimulated));
  }, [isOfflineSimulated]);

  // Load user session and settings from IndexedDB
  useEffect(() => {
    async function initSession() {
      try {
        const activeUser = await getCurrentProfile();
        if (activeUser) {
          setUser(activeUser);
        }

        const savedCount = await getSetting<number>('defaultQuestionsCount', 10);
        const savedMode = await getSetting<string>('defaultTestMode', 'instant');
        setDefaultQuestionsCount(savedCount);
        setDefaultTestMode(savedMode);
      } catch (err) {
        console.error('Failed to load user session:', err);
      } finally {
        setInitLoading(false);
      }
    }
    initSession();
  }, []);

  const handleLoginSuccess = (profile: UserProfile) => {
    setUser(profile);
    setActiveTab('home');
  };

  const handleLogout = async () => {
    await logoutUser();
    setUser(null);
  };

  const handleStartTest = (topic: TopicMeta, mode: string, count: number) => {
    setActiveQuizTopic(topic);
    setActiveQuizMode(mode);
    setActiveQuizCount(count);
    setMistakeQuizQuestions(undefined);
  };

  // Start a re-quiz with mistakes questions list
  const handleStartMistakeQuiz = (mistakes: QuizMistake[]) => {
    if (mistakes.length === 0) return;
    
    // Map mistakes array to QuizQuestion model format
    const mockQuestions = mistakes.map(m => ({
      question: m.questionText,
      options: m.options,
      correct: m.correctAnswer,
      answer: m.correctAnswer
    }));

    const dummyTopic: TopicMeta = {
      id: 999,
      title: 'Қателермен Жұмыс Тесті',
      subject: 'Қателерді түзету',
      file: ''
    };

    setActiveQuizTopic(dummyTopic);
    setActiveQuizMode('instant');
    setActiveQuizCount(mockQuestions.length);
    setMistakeQuizQuestions(mockQuestions);
  };

  const handleUpdateQuestionsCount = async (count: number) => {
    setDefaultQuestionsCount(count);
    await saveSetting('defaultQuestionsCount', count);
  };

  const handleUpdateTestMode = async (mode: string) => {
    setDefaultTestMode(mode);
    await saveSetting('defaultTestMode', mode);
  };

  if (initLoading) {
    return (
      <div className="min-h-screen bg-[#f4f7fb] dark:bg-[#080710] flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-[#0F766E]/10 border-t-[#0F766E] rounded-full animate-spin"></div>
        <p className="text-sm text-gray-400 mt-4 font-semibold">Жүктелуде...</p>
      </div>
    );
  }

  // Render Login overlay if user is not authenticated
  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Render Active Quiz Player screen overlay (takes full viewport)
  if (activeQuizTopic) {
    return (
      <div className="min-h-screen bg-[#f4f7fb] dark:bg-[#080710] p-4 md:p-8">
        <div className="max-w-3xl mx-auto">
          <TestRunner
            user={user}
            topic={activeQuizTopic}
            mode={activeQuizMode}
            questionsCount={activeQuizCount}
            overrideQuestions={mistakeQuizQuestions}
            onClose={() => {
              setActiveQuizTopic(null);
              setMistakeQuizQuestions(undefined);
              // Force refreshing profile score statistics if we finished
              getCurrentProfile().then(p => { if (p) setUser(p); });
            }}
          />
        </div>
      </div>
    );
  }

  // Navigation Items lists
  const primaryTabs = [
    { id: 'home', name: 'Басты бет', icon: HomeIcon },
    { id: 'test', name: 'Тесттер', icon: GraduationCap },
    { id: 'anki', name: 'Anki', icon: Zap },
    { id: 'blocks', name: 'Блоктар', icon: LayoutGrid },
    { id: 'profile', name: 'Профиль', icon: UserIcon },
  ];

  return (
    <div className="min-h-screen bg-[#f4f7fb] dark:bg-[#080710] text-black dark:text-white flex flex-col md:flex-row relative">
      
      {/* 1. DESKTOP SIDE NAVIGATION RAIL (Material 3 style) */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 bg-white dark:bg-[#151426] border-r border-[#d8e0ec] dark:border-[#2e2d4a] p-6 space-y-8 min-h-screen sticky top-0 transition-colors">
        <div className="space-y-1">
          <h1 className="text-xl font-black text-[#0F766E] dark:text-[#2dd4bf] flex items-center gap-2">
            ҰБТ ДАЙЫНДЫҚ
          </h1>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Оқушы платформасы</p>
        </div>

        <nav className="flex-1 space-y-6">
          <div className="space-y-1.5">
            <span className="block text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 tracking-wider pl-3 mb-2">Мәзір</span>
            {primaryTabs.map((tab) => {
              const IconComp = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full px-4 py-3 rounded-xl flex items-center gap-3.5 text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#e9f5f4] dark:bg-[#0f3a37] text-[#0F766E] dark:text-[#2dd4bf]'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] hover:text-[#0F766E] dark:hover:text-white'
                  }`}
                >
                  <IconComp className="w-4.5 h-4.5" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </div>
        </nav>

        <div className="pt-4 border-t border-[#d8e0ec] dark:border-[#2e2d4a] flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#e9f5f4] dark:bg-[#0f3a37] border border-[#0F766E]/20 flex items-center justify-center text-[#0F766E] dark:text-[#2dd4bf] font-bold text-sm">
            {user.name.charAt(0)}
          </div>
          <div className="space-y-0.5 max-w-[65%]">
            <h4 className="font-bold text-xs text-black dark:text-white truncate">{user.name}</h4>
            <span className="block text-[9px] text-[#0F766E] dark:text-[#2dd4bf] font-bold">{user.totalScore} Ұпай</span>
          </div>
        </div>
      </aside>

      {/* 2. MAIN WORKSPACE WITH TOP OFFLINE SIMULATION BANNER */}
      <div className="flex-1 flex flex-col min-h-screen pt-[env(safe-area-inset-top,0px)]">

        {isOfflineSimulated && (
          <div className="bg-[#ff512f] text-white py-1.5 px-4 text-xs font-bold flex items-center justify-center gap-2 select-none">
            <WifiOff className="w-3.5 h-3.5" />
            <span>Оффлайн режим белсенді — Кэштелген деректер пайдаланылуда</span>
          </div>
        )}

        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-4xl mx-auto w-full relative pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
            >
              {activeTab === 'home' && (
                <Home 
                  user={user} 
                  onNavigate={setActiveTab} 
                />
              )}
              {activeTab === 'test' && (
                <TestSelection
                  onStartTest={handleStartTest}
                  defaultQuestionsCount={defaultQuestionsCount}
                  defaultTestMode={defaultTestMode}
                  onOpenFormulas={() => setActiveTab('math')}
                />
              )}
              {activeTab === 'anki' && <Anki />}
              {activeTab === 'blocks' && <Blocks />}
              {activeTab === 'math' && <MathFormulas onBack={() => setActiveTab('test')} />}
              {activeTab === 'profile' && (
                <Profile
                  user={user}
                  onStartMistakeQuiz={handleStartMistakeQuiz}
                  onLogout={handleLogout}
                  questionsCount={defaultQuestionsCount}
                  onUpdateQuestionsCount={handleUpdateQuestionsCount}
                  testMode={defaultTestMode}
                  onUpdateTestMode={handleUpdateTestMode}
                  isDarkMode={isDarkMode}
                  onToggleDarkMode={setIsDarkMode}
                  isOfflineSimulated={isOfflineSimulated}
                  onToggleOfflineSimulated={setIsOfflineSimulated}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* 3. MOBILE BOTTOM NAVIGATION (Material 3 style) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-[#151426]/95 backdrop-blur-xl border-t border-[#d8e0ec] dark:border-[#2e2d4a] px-2 pt-2 pb-[calc(8px+env(safe-area-inset-bottom,0px))] flex items-center justify-around transition-colors">
        {primaryTabs.map((tab) => {
          const IconComp = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex flex-col items-center gap-1 p-1 text-center cursor-pointer relative"
            >
              <div 
                className={`p-2 rounded-full transition-all ${
                  isActive 
                    ? 'bg-[#e9f5f4] dark:bg-[#0f3a37] text-[#0F766E] dark:text-[#2dd4bf] scale-110' 
                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-white'
                }`}
              >
                <IconComp className="w-5 h-5" />
              </div>
              <span className={`text-[9px] font-bold ${isActive ? 'text-[#0F766E] dark:text-[#2dd4bf]' : 'text-gray-400'}`}>
                {tab.name}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
