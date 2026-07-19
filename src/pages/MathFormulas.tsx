import React, { useState } from 'react';
import { BookOpen, Hash, Calculator, Compass, ChevronDown, ChevronUp, ArrowLeft } from 'lucide-react';

interface Formula {
  expression: string;
  desc: string;
}

interface FormulaSection {
  title: string;
  icon: any;
  color: string;
  formulas: Formula[];
}

interface MathFormulasProps {
  onBack?: () => void;
}

export default function MathFormulas({ onBack }: MathFormulasProps) {
  const [expandedSection, setExpandedSection] = useState<number | null>(0);

  const sections: FormulaSection[] = [
    {
      title: 'Алгебра және Қысқаша Көбейту Формулалары',
      icon: Hash,
      color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
      formulas: [
        { expression: '(a + b)² = a² + 2ab + b²', desc: 'Қосындының квадраты' },
        { expression: '(a - b)² = a² - 2ab + b²', desc: 'Айырымның квадраты' },
        { expression: 'a² - b² = (a - b)(a + b)', desc: 'Квадраттардың айырымы' },
        { expression: '(a + b)³ = a³ + 3a²b + 3ab² + b³', desc: 'Қосындының кубы' },
        { expression: '(a - b)³ = a³ - 3a²b + 3ab² - b³', desc: 'Айырымның кубы' },
        { expression: 'a³ + b³ = (a + b)(a² - ab + b²)', desc: 'Кубтардың қосындысы' },
        { expression: 'a³ - b³ = (a - b)(a² + ab + b²)', desc: 'Кубтардың айырымы' },
      ],
    },
    {
      title: 'Дәреже мен Түбірдің қасиеттері',
      icon: Calculator,
      color: 'text-brand-400 bg-brand-500/10 border-brand-500/20',
      formulas: [
        { expression: 'a^n · a^m = a^(n+m)', desc: 'Негіздері бірдей дәрежелерді көбейту' },
        { expression: 'a^n : a^m = a^(n-m)', desc: 'Негіздері бірдей дәрежелерді бөлу' },
        { expression: '(a^n)^m = a^(n·m)', desc: 'Дәрежені дәрежелеу' },
        { expression: '(ab)^n = a^n · b^n', desc: 'Көбейтіндіні дәрежелеу' },
        { expression: 'a^(-n) = 1 / a^n', desc: 'Теріс көрсеткішті дәреже' },
        { expression: 'a^(m/n) = ⁿ√aᵐ', desc: 'Бөлшек көрсеткішті дәреже' },
        { expression: 'ⁿ√a · ⁿ√b = ⁿ√(ab)', desc: 'Түбірлерді көбейту' },
      ],
    },
    {
      title: 'Тригонометрияның Негізгі Теңдіктері',
      icon: BookOpen,
      color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
      formulas: [
        { expression: 'sin²α + cos²α = 1', desc: 'Негізгі тригонометриялық теңдік' },
        { expression: 'tg α = sin α / cos α', desc: 'Тангенстің анықтамасы' },
        { expression: 'ctg α = cos α / sin α', desc: 'Котангенстің анықтамасы' },
        { expression: 'tg α · ctg α = 1', desc: 'Тангенс пен котангенс көбейтіндісі' },
        { expression: '1 + tg²α = 1 / cos²α', desc: 'Тангенс пен косинус байланысы' },
        { expression: '1 + ctg²α = 1 / sin²α', desc: 'Котангенс пен синус байланысы' },
        { expression: 'sin(2α) = 2sinα·cosα', desc: 'Қос бұрыштың синусы' },
        { expression: 'cos(2α) = cos²α - sin²α', desc: 'Қос бұрыштың косинусы' },
      ],
    },
    {
      title: 'Геометриялық Формулалар (Аудан мен Көлем)',
      icon: Compass,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      formulas: [
        { expression: 'S = a · b', desc: 'Тіктөртбұрыштың ауданы' },
        { expression: 'S = a²', desc: 'Квадраттың ауданы' },
        { expression: 'S = (1/2) · a · h', desc: 'Үшбұрыштың ауданы (Табаны мен биіктігі)' },
        { expression: 'S = π · r²', desc: 'Дөңгелектің ауданы' },
        { expression: 'C = 2 · π · r', desc: 'Шеңбердің ұзындығы' },
        { expression: 'V = a · b · c', desc: 'Тік бұрышты параллелепипед көлемі' },
        { expression: 'V = S_табаны · h', desc: 'Призма немесе Цилиндр көлемі' },
        { expression: 'V = (1/3) · S_табаны · h', desc: 'Пирамида немесе Конус көлемі' },
      ],
    },
  ];

  const toggleSection = (idx: number) => {
    setExpandedSection(expandedSection === idx ? null : idx);
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Title */}
      <div className="flex items-center gap-3">
        {onBack && (
          <button
            onClick={onBack}
            className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#151426] hover:bg-black/[0.03] dark:hover:bg-white/[0.03] text-gray-500 dark:text-gray-400 transition-colors cursor-pointer"
            title="Артқа қайту"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div className="space-y-1">
          <h1 className="text-2xl font-extrabold text-[#0F766E] dark:text-[#2dd4bf] flex items-center gap-2">
            {!onBack && <Calculator className="w-6 h-6" />}
            Математикалық Формулалар
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            ҰБТ және Математикалық Сауаттылыққа арналған негізгі формулалар жинағы
          </p>
        </div>
      </div>

      {/* Expandable Sections Accordion */}
      <div className="space-y-3.5">
        {sections.map((sec, idx) => {
          const IconComp = sec.icon;
          const isExpanded = expandedSection === idx;

          return (
            <div 
              key={idx}
              className="glass-card rounded-2xl overflow-hidden border border-gray-800"
            >
              <button
                onClick={() => toggleSection(idx)}
                className="w-full p-4 flex items-center justify-between gap-4 text-left transition-colors hover:bg-white/[0.01] cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl border ${sec.color}`}>
                    <IconComp className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-xs sm:text-sm text-white">{sec.title}</h3>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-gray-500" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-500" />
                )}
              </button>

              {isExpanded && (
                <div className="border-t border-gray-800/60 p-4 space-y-3 bg-white/[0.01] animate-fade-in divide-y divide-gray-800/30">
                  {sec.formulas.map((form, fIdx) => (
                    <div 
                      key={fIdx}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs ${
                        fIdx > 0 ? 'pt-3' : ''
                      }`}
                    >
                      <div className="space-y-0.5 max-w-[50%]">
                        <span className="block font-bold text-gray-300">{form.desc}</span>
                      </div>
                      <div className="px-4 py-2 bg-darkBg-input border border-gray-800 rounded-xl font-mono text-xs sm:text-sm text-brand-300 select-text text-left sm:text-right overflow-x-auto">
                        {form.expression}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
