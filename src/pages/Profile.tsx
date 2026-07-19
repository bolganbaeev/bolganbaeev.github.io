import React, { useEffect, useState } from 'react';
import { 
  User, 
  Trophy, 
  Calendar, 
  CheckCircle2, 
  History, 
  AlertCircle, 
  ChevronRight, 
  BarChart3, 
  TrendingUp, 
  RefreshCw, 
  Sliders, 
  LogOut, 
  Moon, 
  Sun, 
  Wifi, 
  WifiOff, 
  Award,
  Layers,
  CheckCircle,
  Maximize
} from 'lucide-react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { 
  UserProfile, 
  TestResult, 
  getTestResults, 
  getQuizMistakes, 
  QuizMistake, 
  deleteQuizMistake, 
  clearAllLocalData 
} from '../db/indexedDb';

import Ranking from './Ranking';

// Register ChartJS modules
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface ProfileProps {
  user: UserProfile;
  onStartMistakeQuiz: (mistakes: QuizMistake[]) => void;
  onLogout: () => void;
  questionsCount: number;
  onUpdateQuestionsCount: (count: number) => void;
  testMode: string;
  onUpdateTestMode: (mode: string) => void;
  isDarkMode: boolean;
  onToggleDarkMode: (dark: boolean) => void;
  isOfflineSimulated: boolean;
  onToggleOfflineSimulated: (offline: boolean) => void;
}

export default function Profile({
  user,
  onStartMistakeQuiz,
  onLogout,
  questionsCount,
  onUpdateQuestionsCount,
  testMode,
  onUpdateTestMode,
  isDarkMode,
  onToggleDarkMode,
  isOfflineSimulated,
  onToggleOfflineSimulated
}: ProfileProps) {
  const [activeSubTab, setActiveSubTab] = useState<'profile' | 'ranking'>('profile');
  const [results, setResults] = useState<TestResult[]>([]);
  const [mistakes, setMistakes] = useState<QuizMistake[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubjectChart, setSelectedSubjectChart] = useState('total');
  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error('Error enabling fullscreen:', err);
      });
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    async function loadData() {
      try {
        const testHistory = await getTestResults(user.id);
        const userMistakes = await getQuizMistakes(user.id);
        setResults(testHistory);
        setMistakes(userMistakes);
      } catch (err) {
        console.error('Failed to load profile history:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user.id]);

  // Remove a mistake from catalog
  const handleRemoveMistake = async (id: string) => {
    try {
      await deleteQuizMistake(id);
      setMistakes(prev => prev.filter(m => m.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleResetData = async () => {
    if (confirm('Ескерту: Платформадағы барлық нәтижелеріңіз бен тарихыңыз толығымен өшіріледі. Жалғастырамыз ба?')) {
      await clearAllLocalData();
      alert('Мәліметтер өшірілді. Платформа қайта жүктеледі.');
      window.location.reload();
    }
  };

  // Setup subject-specific chart data matching Kotlin App
  const getSubjectHistory = () => {
    switch (selectedSubjectChart) {
      case 'total':
        return (user.totalHistory && user.totalHistory.length > 0) ? user.totalHistory : [75, 82, 80, 88, 91, 84, 95, 101, 98, 105, 112, 104];
      case 'hist':
        return (user.histHistory && user.histHistory.length > 0) ? user.histHistory : [8, 11, 12, 10, 13, 14, 12, 15, 14, 16, 15, 17];
      case 'math':
        return (user.mathHistory && user.mathHistory.length > 0) ? user.mathHistory : [6, 7, 8, 7, 9, 8, 9, 10, 9, 10, 10, 10];
      case 'read':
        return (user.readHistory && user.readHistory.length > 0) ? user.readHistory : [7, 8, 7, 9, 8, 9, 9, 10, 9, 10, 10, 10];
      case 'sub1':
        return (user.sub1History && user.sub1History.length > 0) ? user.sub1History : [28, 31, 32, 35, 36, 34, 38, 41, 39, 42, 45, 43];
      case 'sub2':
      default:
        return (user.sub2History && user.sub2History.length > 0) ? user.sub2History : [32, 35, 34, 38, 40, 38, 41, 44, 43, 46, 48, 47];
    }
  };

  const getSubjectMaxScore = () => {
    switch (selectedSubjectChart) {
      case 'total': return 140;
      case 'hist': return 20;
      case 'math': return 10;
      case 'read': return 10;
      case 'sub1': return 50;
      case 'sub2': default: return 50;
    }
  };

  const currentChartPoints = getSubjectHistory();
  const maxScore = getSubjectMaxScore();

  const chartData = {
    labels: currentChartPoints.map((_, idx) => `Тест #${idx + 1}`),
    datasets: [
      {
        label: 'Ұпай',
        data: currentChartPoints,
        borderColor: '#0F766E',
        backgroundColor: 'rgba(15, 118, 110, 0.1)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#0F766E',
        pointBorderColor: '#ffffff',
        pointHoverRadius: 6,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#151426',
        titleColor: '#2dd4bf',
        bodyColor: '#ffffff',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        padding: 10,
        displayColors: false,
      },
    },
    scales: {
      y: {
        min: 0,
        max: maxScore,
        grid: { color: 'rgba(255, 255, 255, 0.03)' },
        ticks: { color: '#9ca3af', font: { size: 9 } },
      },
      x: {
        grid: { display: false },
        ticks: { color: '#9ca3af', font: { size: 9 } },
      },
    },
  };

  const subjectTabs = [
    { id: 'total', name: 'Жалпы' },
    { id: 'hist', name: 'Тарих' },
    { id: 'math', name: 'Мат.сауат' },
    { id: 'read', name: 'Оқу.сауат' },
    { id: 'sub1', name: 'Бейін 1' },
    { id: 'sub2', name: 'Бейін 2' },
  ];

  // Static achievements lists matching Kotlin App
  const achievements = [
    { id: '1', title: 'Білім нәрі', desc: '5 немесе одан көп тест аяқтау', achieved: results.length >= 5 || (user.completedTestsCount >= 5) },
    { id: '2', title: 'Жеңімпаз', desc: 'Тестте 110-дан жоғары ұпай алу', achieved: user.totalScore >= 110 },
    { id: '3', title: 'Белсенді', desc: '5 күн қатарынан дайындалу', achieved: (user.streak || 5) >= 5 },
  ];

  return (
    <div className="space-y-6 pb-24">
      {/* Tab Selector (Kotlin style Android TabRow) */}
      <div className="bg-white dark:bg-[#151426] border border-[#d8e0ec] dark:border-[#2e2d4a] rounded-2xl p-1.5 flex transition-colors">
        <button
          onClick={() => setActiveSubTab('profile')}
          className={`flex-1 py-3 text-center text-xs font-black rounded-xl transition-all cursor-pointer ${
            activeSubTab === 'profile'
              ? 'bg-[#0F766E] text-white shadow-md'
              : 'text-gray-500 dark:text-gray-400 hover:text-[#0F766E] dark:hover:text-white'
          }`}
        >
          Жеке кабинет
        </button>
        <button
          onClick={() => setActiveSubTab('ranking')}
          className={`flex-1 py-3 text-center text-xs font-black rounded-xl transition-all cursor-pointer ${
            activeSubTab === 'ranking'
              ? 'bg-[#0F766E] text-white shadow-md'
              : 'text-gray-500 dark:text-gray-400 hover:text-[#0F766E] dark:hover:text-white'
          }`}
        >
          Рейтинг
        </button>
      </div>

      {activeSubTab === 'ranking' ? (
        <Ranking user={user} />
      ) : (
        <div className="space-y-6 animate-fade-in">
          {/* 1. User Header Details Card */}
          <div className="bg-white dark:bg-[#151426] border border-[#d8e0ec] dark:border-[#2e2d4a] rounded-2xl p-5 flex items-center justify-between gap-4 transition-colors shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-[#e9f5f4] dark:bg-[#0f3a37] border border-[#0F766E]/20 flex items-center justify-center text-[#0F766E] dark:text-[#2dd4bf] font-black text-xl shadow-sm">
                {user.name.charAt(0)}
              </div>
              <div className="space-y-1">
                <h2 className="text-base font-extrabold text-black dark:text-white leading-tight">{user.name}</h2>
                <div className="flex items-center gap-2 text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">
                  <span className="flex items-center gap-1">
                    <Trophy className="w-3.5 h-3.5 text-amber-500" />
                    {user.totalScore || 0} ұпай
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#0F766E]" />
                    Сынып: 11
                  </span>
                </div>
              </div>
            </div>
            
            <button
              onClick={onLogout}
              className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-800 hover:bg-red-500/10 hover:text-red-500 dark:hover:text-red-400 text-xs font-bold text-gray-500 transition-all cursor-pointer"
            >
              Шығу
            </button>
          </div>

          {/* 2. Dynamic Subject-specific Progress Chart */}
          <div className="bg-white dark:bg-[#151426] border border-[#d8e0ec] dark:border-[#2e2d4a] rounded-2xl p-5 space-y-4 shadow-sm transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-sm font-black text-[#0F766E] dark:text-[#2dd4bf] flex items-center gap-2">
                <BarChart3 className="w-4.5 h-4.5" />
                Нәтижелер статистикасы
              </h3>
              
              {/* Subject Slider Tabs */}
              <div className="flex gap-1 overflow-x-auto pb-1 max-w-full">
                {subjectTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setSelectedSubjectChart(tab.id)}
                    className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold shrink-0 transition-all cursor-pointer ${
                      selectedSubjectChart === tab.id
                        ? 'bg-[#0F766E] text-white'
                        : 'bg-black/[0.03] dark:bg-white/[0.03] text-gray-400 hover:text-white'
                    }`}
                  >
                    {tab.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-56 relative w-full pt-2">
              <Line data={chartData} options={chartOptions} />
            </div>
          </div>

          {/* 3. Mistakes quiz section */}
          <div className="bg-white dark:bg-[#151426] border border-[#d8e0ec] dark:border-[#2e2d4a] rounded-2xl p-5 space-y-4 shadow-sm transition-colors">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-sm font-black text-[#0F766E] dark:text-[#2dd4bf] flex items-center gap-2">
                <AlertCircle className="w-4.5 h-4.5 text-orange-500" />
                Қателермен жұмыс (Каталог)
              </h3>
              <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-orange-500/10 text-orange-500 border border-orange-500/10">
                {mistakes.length} сұрақ
              </span>
            </div>

            <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
              Тестілеу кезінде қате жіберілген барлық сұрақтар осы жерге жиналады. Оларды қайта өтіп, біліміңізді толықтырыңыз!
            </p>

            {mistakes.length > 0 ? (
              <div className="space-y-3 pt-1">
                <button
                  onClick={() => onStartMistakeQuiz(mistakes)}
                  className="w-full py-3 px-4 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-600 text-white font-extrabold rounded-xl flex items-center justify-center gap-2 text-xs shadow-lg shadow-orange-500/20 transition-all cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Қателермен қайта тест тапсыру</span>
                </button>

                <div className="max-h-60 overflow-y-auto space-y-2.5 divide-y divide-[#d8e0ec] dark:divide-[#2e2d4a] pr-1">
                  {mistakes.map((mistake, idx) => (
                    <div key={mistake.id} className="pt-2.5 flex items-start justify-between gap-3 text-xs">
                      <div className="space-y-1 max-w-[85%]">
                        <span className="text-[9px] text-[#0F766E] font-bold uppercase tracking-widest">{mistake.subject}</span>
                        <p className="text-black dark:text-gray-200 font-semibold leading-relaxed">{idx + 1}. {mistake.questionText}</p>
                        <p className="text-green-600 dark:text-teal-400 font-bold">Дұрыс жауап: {mistake.correctAnswer}</p>
                        <p className="text-red-500 font-bold">Сіздің жауабыңыз: {mistake.userAnswer}</p>
                      </div>
                      <button
                        onClick={() => handleRemoveMistake(mistake.id)}
                        className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 text-gray-400 hover:text-red-500 transition-colors"
                        title="Өшіру"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-8 rounded-xl border border-dashed border-gray-200 dark:border-gray-800 text-center text-gray-500 text-xs">
                Қазіргі уақытта қателер каталогы бос. Керемет нәтиже!
              </div>
            )}
          </div>

          {/* 4. Achievements Block (Kotlin style layout) */}
          <div className="bg-white dark:bg-[#151426] border border-[#d8e0ec] dark:border-[#2e2d4a] rounded-2xl p-5 space-y-4 shadow-sm transition-colors">
            <h3 className="text-sm font-black text-[#0F766E] dark:text-[#2dd4bf] flex items-center gap-2">
              <Award className="w-4.5 h-4.5 text-[#0F766E]" />
              Қол жеткізілген жетістіктер
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {achievements.map((ach) => (
                <div 
                  key={ach.id}
                  className={`p-4 rounded-xl border flex items-center gap-3.5 transition-all ${
                    ach.achieved 
                      ? 'bg-[#e9f5f4] dark:bg-[#0f3a37]/30 border-[#0F766E]/20 text-[#0F766E] dark:text-[#2dd4bf]' 
                      : 'bg-black/[0.01] dark:bg-white/[0.01] border-gray-100 dark:border-gray-800 opacity-60'
                  }`}
                >
                  <Award className={`w-8 h-8 shrink-0 ${ach.achieved ? 'text-amber-500' : 'text-gray-400'}`} />
                  <div>
                    <h4 className="font-extrabold text-xs text-black dark:text-white">{ach.title}</h4>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{ach.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 5. Custom default configuration & parameters block */}
          <div className="bg-white dark:bg-[#151426] border border-[#d8e0ec] dark:border-[#2e2d4a] rounded-2xl p-5 space-y-4 shadow-sm transition-colors">
            <h3 className="text-sm font-black text-[#0F766E] dark:text-[#2dd4bf] flex items-center gap-2">
              <Sliders className="w-4.5 h-4.5" />
              Баптаулар мен Параметрлер
            </h3>

            {/* Default Questions Count */}
            <div className="space-y-2.5">
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#0F766E]" />
                Әдепкі сұрақтар саны
              </label>
              <div className="grid grid-cols-5 gap-2">
                {[5, 10, 15, 20, 25].map((val) => (
                  <button
                    key={val}
                    onClick={() => onUpdateQuestionsCount(val)}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      questionsCount === val
                        ? 'border-[#0F766E] bg-[#e9f5f4] dark:bg-[#0f3a37] text-[#0F766E] dark:text-[#2dd4bf]'
                        : 'border-gray-200 dark:border-gray-800 bg-black/[0.01] dark:bg-white/[0.01] text-gray-400 hover:bg-black/[0.03]'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            {/* Default Test Mode */}
            <div className="space-y-2.5 pt-2">
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-[#0F766E]" />
                Әдепкі тестілеу режимі
              </label>
              <div className="grid grid-cols-1 gap-2">
                {[
                  { id: 'instant', name: 'Жылдам тексеру (Практика)', desc: 'Сұрақ жауаптары бірден көрсетіледі.' },
                  { id: 'exam', name: 'Сынақ емтихан режимі', desc: 'Дұрыс жауаптар тек соңында бір-ақ көрсетіледі.' },
                  { id: 'self-check', name: 'Өз-өзін тексеру (Түртіп ашу)', desc: 'Карточканы шерту арқылы жауаптарды біртіндеп ашасыз.' },
                ].map((modeItem) => (
                  <button
                    key={modeItem.id}
                    onClick={() => onUpdateTestMode(modeItem.id)}
                    className={`p-3 rounded-xl text-left border flex flex-col justify-center transition-all cursor-pointer ${
                      testMode === modeItem.id
                        ? 'border-[#0F766E] bg-[#e9f5f4] dark:bg-[#0f3a37] text-[#0F766E] dark:text-[#2dd4bf]'
                        : 'border-gray-200 dark:border-gray-800 bg-black/[0.01] dark:bg-white/[0.01] text-gray-500 hover:bg-black/[0.03]'
                    }`}
                  >
                    <h4 className="font-bold text-xs">{modeItem.name}</h4>
                    <p className="text-[10px] text-gray-400 mt-1">{modeItem.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Theme & Offline Toggles */}
            <div className="space-y-3 pt-3 border-t border-gray-100 dark:border-gray-800">
              {/* Dark Mode Switch */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-black/[0.01] dark:bg-white/[0.01] border border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-3">
                  {isDarkMode ? <Moon className="w-4.5 h-4.5 text-yellow-400" /> : <Sun className="w-4.5 h-4.5 text-amber-500" />}
                  <div>
                    <h4 className="font-bold text-xs text-black dark:text-white">Қараңғы тақырып</h4>
                    <p className="text-[9px] text-gray-400">Интерфейсті қараңғы режимге ауыстыру</p>
                  </div>
                </div>
                <button
                  onClick={() => onToggleDarkMode(!isDarkMode)}
                  className={`w-11 h-6 rounded-full p-1 transition-colors cursor-pointer ${isDarkMode ? 'bg-[#0F766E]' : 'bg-gray-200'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform ${isDarkMode ? 'translate-x-5' : 'translate-x-0'}`}></div>
                </button>
              </div>

              {/* Simulated Offline Cache Switch */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-black/[0.01] dark:bg-white/[0.01] border border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-3">
                  {isOfflineSimulated ? <WifiOff className="w-4.5 h-4.5 text-red-500" /> : <Wifi className="w-4.5 h-4.5 text-green-500" />}
                  <div>
                    <h4 className="font-bold text-xs text-black dark:text-white">Офлайн режим (Кэштеу)</h4>
                    <p className="text-[9px] text-gray-400">Желіні толық симуляциялау (Офлайн сынақ)</p>
                  </div>
                </div>
                <button
                  onClick={() => onToggleOfflineSimulated(!isOfflineSimulated)}
                  className={`w-11 h-6 rounded-full p-1 transition-colors cursor-pointer ${isOfflineSimulated ? 'bg-[#ff512f]' : 'bg-gray-200'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform ${isOfflineSimulated ? 'translate-x-5' : 'translate-x-0'}`}></div>
                </button>
              </div>

              {/* Fullscreen Mode Switch */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-black/[0.01] dark:bg-white/[0.01] border border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-3">
                  <Maximize className="w-4.5 h-4.5 text-[#0F766E] dark:text-[#2dd4bf]" />
                  <div>
                    <h4 className="font-bold text-xs text-black dark:text-white">Толық экран режимі</h4>
                    <p className="text-[9px] text-gray-400">Қосымшаны толық экранда ашу (Native PWA сезімі)</p>
                  </div>
                </div>
                <button
                  onClick={handleToggleFullscreen}
                  className={`w-11 h-6 rounded-full p-1 transition-colors cursor-pointer ${isFullscreen ? 'bg-[#0F766E]' : 'bg-gray-200'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform ${isFullscreen ? 'translate-x-5' : 'translate-x-0'}`}></div>
                </button>
              </div>
            </div>
          </div>

          {/* 6. Danger Zone */}
          <div className="bg-red-500/[0.01] border border-red-500/10 rounded-2xl p-5 space-y-3 shadow-sm">
            <h3 className="text-sm font-black text-red-500">Қауіпті аймақ</h3>
            <button
              onClick={handleResetData}
              className="w-full py-3 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-500 font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Барлық деректерді өшіру</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
