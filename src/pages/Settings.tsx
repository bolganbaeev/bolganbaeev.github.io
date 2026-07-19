import React from 'react';
import { Settings as SettingsIcon, HelpCircle, Layers, CheckCircle, RefreshCw, LogOut, Info } from 'lucide-react';
import { clearAllLocalData } from '../db/indexedDb';

interface SettingsProps {
  questionsCount: number;
  testMode: string;
  onUpdateQuestionsCount: (count: number) => void;
  onUpdateTestMode: (mode: string) => void;
  onLogout: () => void;
}

export default function Settings({
  questionsCount,
  testMode,
  onUpdateQuestionsCount,
  onUpdateTestMode,
  onLogout,
}: SettingsProps) {

  const handleReset = async () => {
    if (confirm('Ескерту: Платформадағы барлық нәтижелеріңіз бен тарихыңыз толығымен өшіріледі. Жалғастырамыз ба?')) {
      await clearAllLocalData();
      alert('Мәліметтер өшірілді. Платформа қайта жүктеледі.');
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6 pb-24 max-w-lg mx-auto">
      {/* Title */}
      <div className="space-y-1">
        <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-brand-400" />
          Баптаулар мен Параметрлер
        </h1>
        <p className="text-xs text-gray-400">
          Сынақ тестілеудің әдепкі параметрлері мен платформа деректерін баптау
        </p>
      </div>

      {/* Default Questions Count Slider */}
      <div className="glass-card rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Layers className="w-4 h-4 text-brand-400" />
          Әдепкі сұрақтар саны
        </h3>
        <p className="text-xs text-gray-400 leading-relaxed">
          Тестілеуді бастаған кезде автоматты түрде таңдалатын сұрақтар жинағының көлемі.
        </p>

        <div className="grid grid-cols-5 gap-2 pt-1">
          {[5, 10, 15, 20, 25].map((val) => (
            <button
              key={val}
              onClick={() => onUpdateQuestionsCount(val)}
              className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                questionsCount === val
                  ? 'border-brand-500 bg-brand-500/10 text-brand-300'
                  : 'border-gray-800 bg-white/[0.02] text-gray-400 hover:bg-white/[0.04]'
              }`}
            >
              {val}
            </button>
          ))}
        </div>
      </div>

      {/* Default Test Mode Options */}
      <div className="glass-card rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-brand-400" />
          Әдепкі тестілеу режимі
        </h3>
        <p className="text-xs text-gray-400 leading-relaxed">
          Тестілеудің өзіңізге ең қолайлы және жиі қолданатын режимін әдепкі ретінде орнатыңыз.
        </p>

        <div className="space-y-2.5 pt-1">
          {[
            { id: 'instant', name: 'Жылдам тексеру (Практика)', desc: 'Сұрақ жауаптары бірден көрсетіледі.' },
            { id: 'exam', name: 'Сынақ емтихан режимі', desc: 'Дұрыс жауаптар тек соңында бір-ақ көрсетіледі.' },
            { id: 'self-check', name: 'Өз-өзін тексеру (Түртіп ашу)', desc: 'Карточканы шерту арқылы жауаптарды біртіндеп ашасыз.' },
          ].map((modeItem) => (
            <button
              key={modeItem.id}
              onClick={() => onUpdateTestMode(modeItem.id)}
              className={`w-full p-3.5 rounded-xl text-left border flex flex-col justify-center transition-all cursor-pointer ${
                testMode === modeItem.id
                  ? 'border-brand-500 bg-brand-500/10 text-brand-300'
                  : 'border-gray-800 bg-white/[0.02] text-gray-400 hover:bg-white/[0.04]'
              }`}
            >
              <h4 className="font-bold text-xs">{modeItem.name}</h4>
              <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">{modeItem.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Developer Information & System settings */}
      <div className="glass-card rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-brand-400" />
          Платформа туралы
        </h3>
        <div className="space-y-2.5 text-xs text-gray-400 leading-relaxed">
          <p>
            <strong>Нұсқасы:</strong> 1.0.0 (React PWA)
          </p>
          <p>
            <strong>Мүмкіндіктер:</strong> Офлайн режим, жылдам 3D флешкарталар, прогресс көрсеткіштерінің графигі, қателер жинағы, және сынып рейтингі.
          </p>
          <div className="p-3 bg-white/[0.02] border border-gray-800 rounded-xl text-[10px] flex items-start gap-2 text-gray-400">
            <Info className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
            <span>Платформа 100% офлайн жұмыс істейді. Енгізілген барлық нәтижелер тек браузердің қауіпсіз IndexedDB қоймасында сақталады.</span>
          </div>
        </div>
      </div>

      {/* Danger Zone Controls */}
      <div className="glass-card rounded-2xl p-5 space-y-3.5 border border-red-500/10 bg-red-500/[0.01]">
        <h3 className="text-sm font-bold text-red-400">Қауіпті аймақ</h3>
        <div className="grid grid-cols-1 gap-2.5">
          <button
            onClick={onLogout}
            className="w-full py-3.5 border border-gray-800 hover:bg-white/5 text-gray-300 font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <LogOut className="w-4 h-4" />
            Платформадан шығу (Логаут)
          </button>

          <button
            onClick={handleReset}
            className="w-full py-3.5 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            Барлық деректерді өшіру
          </button>
        </div>
      </div>
    </div>
  );
}
