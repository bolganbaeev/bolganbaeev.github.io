import React from 'react';
import { Sparkles, Flame, Trophy, CheckCircle, GraduationCap, Calendar, Zap, LayoutGrid } from 'lucide-react';
import { UserProfile } from '../db/indexedDb';
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

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface HomeProps {
  user: UserProfile;
  onNavigate: (screen: string) => void;
}

export default function Home({ user, onNavigate }: HomeProps) {
  // UNT schedule matching Kotlin App
  const schedule = [
    { day: 'Дүйсенбі', subjects: 'Қазақстан тарихы + Информатика (Тест)', active: true },
    { day: 'Сейсенбі', subjects: 'Anki карточкаларымен қайталау', active: true },
    { day: 'Сәрсенбі', subjects: 'Блоктарды оқу және конспектілеу', active: true },
    { day: 'Бейсенбі', subjects: 'Математикалық формулаларды жаттау', active: true },
    { day: 'Жұма', subjects: 'Қазақстан тарихы + Математикалық сауаттылық', active: true },
    { day: 'Сенбі', subjects: 'ҰБТ Сынақ тестін тапсыру (Емтихан)', active: true },
    { day: 'Жексенбі', subjects: 'Қатемен жұмыс және демалыс', active: false },
  ];

  const quickActions = [
    { id: 'test', title: 'ҰБТ Тесттер', desc: 'Пәндер мен тақырыптар бойынша тест тапсыру', icon: GraduationCap, color: 'bg-[#e9f5f4] dark:bg-[#0f3a37] text-[#0F766E] dark:text-[#2dd4bf]' },
    { id: 'anki', title: 'Anki Карточкалары', desc: 'Интерактивті флэш-карталармен жылдам есте сақтау', icon: Zap, color: 'bg-orange-500/10 text-orange-500' },
    { id: 'blocks', title: 'Блок тақырыптар', desc: 'Теориялық мәліметтер мен тақырыптық блоктарды оқу', icon: LayoutGrid, color: 'bg-purple-500/10 text-purple-500' },
  ];

  // Helper to fallback to standard visual avatar if none is specified
  const avatarUrl = user.avatar 
    ? (user.avatar.startsWith('http') ? user.avatar : `/${user.avatar}`) 
    : `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.name)}`;

  // Default total history values matching Kotlin App
  const chartHistory = (user.totalHistory && user.totalHistory.length > 0)
    ? user.totalHistory
    : [75, 82, 80, 88, 91, 84, 95, 101, 98, 105, 112, 104];

  // Chart setup
  const chartData = {
    labels: chartHistory.map((_, idx) => `Тест #${idx + 1}`),
    datasets: [
      {
        label: 'Тест Ұпайы',
        data: chartHistory,
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
        max: 140,
        grid: { color: 'rgba(255, 255, 255, 0.03)' },
        ticks: { color: '#9ca3af', font: { size: 9 } },
      },
      x: {
        grid: { display: false },
        ticks: { color: '#9ca3af', font: { size: 9 } },
      },
    },
  };

  return (
    <div className="space-y-6 pb-20">
      {/* 1. Dynamic Greeting Hero Banner */}
      <div className="bg-[#0F766E] rounded-3xl p-6 md:p-8 text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm">
        <div className="space-y-2 text-center sm:text-left">
          <h1 className="text-2xl md:text-3xl font-bold">
            Сәлем, {user.name}!
          </h1>
          <p className="text-sm text-teal-100 max-w-md leading-relaxed">
            Кезекті тестілеуді бағындыруға дайынсың ба? ҰБТ-ға сәттілік!
          </p>
        </div>
        <div className="w-16 h-16 rounded-full bg-white/20 border border-white/30 flex items-center justify-center shrink-0">
          <GraduationCap className="w-8 h-8 text-white" />
        </div>
      </div>

      {/* 2. Student Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        {/* Overall Score */}
        <div className="bg-white dark:bg-[#151426] border border-[#d8e0ec] dark:border-[#2e2d4a] rounded-2xl p-4 flex flex-col items-start justify-between shadow-sm transition-colors">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 mb-2">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-2xl font-black text-black dark:text-white leading-none mb-1">{user.totalScore || 0}</span>
            <span className="text-[10px] sm:text-xs font-semibold text-gray-500 dark:text-gray-400">Жалпы ұпай</span>
          </div>
        </div>

        {/* Completed Tests */}
        <div className="bg-white dark:bg-[#151426] border border-[#d8e0ec] dark:border-[#2e2d4a] rounded-2xl p-4 flex flex-col items-start justify-between shadow-sm transition-colors">
          <div className="p-2 rounded-xl bg-[#0F766E]/10 text-[#0F766E] dark:text-[#2dd4bf] mb-2">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-2xl font-black text-black dark:text-white leading-none mb-1">{user.completedTestsCount || 0}</span>
            <span className="text-[10px] sm:text-xs font-semibold text-gray-500 dark:text-gray-400">Орындалған</span>
          </div>
        </div>

        {/* Streak */}
        <div className="bg-white dark:bg-[#151426] border border-[#d8e0ec] dark:border-[#2e2d4a] rounded-2xl p-4 flex flex-col items-start justify-between shadow-sm transition-colors">
          <div className="p-2 rounded-xl bg-red-500/10 text-[#ff512f] mb-2">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-2xl font-black text-black dark:text-white leading-none mb-1">{user.streak || 5} күн</span>
            <span className="text-[10px] sm:text-xs font-semibold text-gray-500 dark:text-gray-400">Күндік ағын</span>
          </div>
        </div>
      </div>

      {/* 3. Scores Dynamics Line Chart (matching Kotlin APK Home) */}
      <div className="bg-white dark:bg-[#151426] border border-[#d8e0ec] dark:border-[#2e2d4a] rounded-2xl p-5 space-y-4 shadow-sm transition-colors">
        <h3 className="text-base font-bold text-[#0F766E] dark:text-[#2dd4bf]">
          ҰБТ нәтижелерінің динамикасы
        </h3>
        <div className="h-44 relative w-full">
          <Line data={chartData} options={chartOptions} />
        </div>
        <p className="text-center text-[10px] sm:text-xs text-gray-400 dark:text-gray-500">
          Соңғы орындалған {chartHistory.length} тестіңіздің өсу бағыты.
        </p>
      </div>

      {/* 4. Activity Calendar Matrix (matching GitHub Contribution grid in Kotlin) */}
      <div className="bg-white dark:bg-[#151426] border border-[#d8e0ec] dark:border-[#2e2d4a] rounded-2xl p-5 space-y-4 shadow-sm transition-colors">
        <h3 className="text-base font-bold text-[#0F766E] dark:text-[#2dd4bf]">
          Белсенділік күнтізбесі
        </h3>
        <div className="flex justify-between items-center gap-1 overflow-x-auto py-1">
          {Array.from({ length: 14 }).map((_, i) => {
            const active = i % 3 !== 0;
            const opacityClass = active 
              ? (i % 3 === 1 ? 'bg-[#0f766e]/30' : 'bg-[#0f766e]') 
              : 'bg-gray-100 dark:bg-[#1e293b]';
            return (
              <div 
                key={i} 
                className={`w-4 h-4 sm:w-5 sm:h-5 rounded-md shrink-0 ${opacityClass}`}
              />
            );
          })}
        </div>
        <div className="flex items-center justify-between text-[10px] text-gray-400">
          <span>Төмен белсенділік</span>
          <span>Жоғары белсенділік</span>
        </div>
      </div>

      {/* 5. Quick actions row */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-[#0F766E] dark:text-[#2dd4bf]">
          Жылдам сілтемелер
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {quickActions.map((action) => {
            const IconComponent = action.icon;
            return (
              <button
                key={action.id}
                onClick={() => onNavigate(action.id)}
                className="bg-white dark:bg-[#151426] border border-[#d8e0ec] dark:border-[#2e2d4a] hover:border-[#0F766E] dark:hover:border-[#2dd4bf] rounded-2xl p-4 flex items-center gap-4 transition-all text-left shadow-sm cursor-pointer"
              >
                <div className={`p-2.5 rounded-xl ${action.color}`}>
                  <IconComponent className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-black dark:text-white leading-snug">{action.title}</h4>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 line-clamp-1">{action.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 6. Weekday Schedule Dashboard */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-[#0F766E] dark:text-[#2dd4bf]">
          Жұмыс жоспары мен кесте
        </h3>
        <div className="bg-white dark:bg-[#151426] border border-[#d8e0ec] dark:border-[#2e2d4a] rounded-2xl overflow-hidden divide-y divide-[#d8e0ec] dark:divide-[#2e2d4a] transition-colors shadow-sm">
          {schedule.map((item, index) => {
            const isToday = new Date().getDay() === (index === 6 ? 0 : index + 1);
            return (
              <div 
                key={index} 
                className={`p-4 flex items-center justify-between gap-4 transition-colors ${
                  isToday 
                    ? 'bg-[#e9f5f4] dark:bg-[#0f3a37] border-l-4 border-[#0F766E]' 
                    : item.active 
                    ? 'hover:bg-black/[0.01] dark:hover:bg-white/[0.01]' 
                    : 'opacity-55'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-black dark:text-white">{item.day}</span>
                    {isToday && (
                      <span className="px-1.5 py-0.5 rounded text-[8px] font-extrabold bg-[#0F766E] text-white uppercase tracking-wider animate-pulse">
                        Бүгін
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">{item.subjects}</p>
                </div>
                <div className="shrink-0">
                  <span className={`w-2 h-2 rounded-full block ${item.active ? 'bg-[#0F766E]' : 'bg-gray-400'}`}></span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
