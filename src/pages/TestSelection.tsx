import React, { useEffect, useState } from 'react';
import { Search, GraduationCap, ArrowRight, BookOpen, Layers, CheckCircle, Calculator } from 'lucide-react';
import { fetchAllTopics, TopicMeta } from '../data/topics';

interface TestSelectionProps {
  onStartTest: (topic: TopicMeta, mode: string, count: number) => void;
  defaultQuestionsCount: number;
  defaultTestMode: string;
  onOpenFormulas: () => void;
}

export default function TestSelection({ onStartTest, defaultQuestionsCount, defaultTestMode, onOpenFormulas }: TestSelectionProps) {
  const [topics, setTopics] = useState<TopicMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('Барлығы');
  const [selectedTopic, setSelectedTopic] = useState<TopicMeta | null>(null);

  // Settings for the selected test
  const [testMode, setTestMode] = useState(defaultTestMode);
  const [questionsCount, setQuestionsCount] = useState<number | 'all'>(defaultQuestionsCount);

  useEffect(() => {
    async function loadTopics() {
      try {
        const list = await fetchAllTopics();
        setTopics(list);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadTopics();
  }, []);

  const subjectsList = ['Барлығы', 'Қазақстан тарихы', 'Информатика'];

  const filteredTopics = topics.filter(topic => {
    const matchesSubject = selectedSubject === 'Барлығы' || topic.subject === selectedSubject;
    const matchesSearch = topic.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSubject && matchesSearch;
  });

  const handleStart = () => {
    if (!selectedTopic) return;
    const finalCount = questionsCount === 'all' ? 1000 : questionsCount;
    onStartTest(selectedTopic, testMode, finalCount);
    setSelectedTopic(null);
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Title */}
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-extrabold text-[#0F766E] dark:text-[#2dd4bf] flex items-center gap-2">
            <GraduationCap className="w-6 h-6" />
            ҰБТ Тесттері
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Пән мен дайындық деңгейіңізге сай тест тақырыбын таңдаңыз
          </p>
        </div>
        
        <button
          onClick={onOpenFormulas}
          className="p-2.5 bg-[#e9f5f4] dark:bg-[#0f3a37] hover:bg-[#d5ebe8] dark:hover:bg-[#124d4a] text-[#0F766E] dark:text-[#2dd4bf] rounded-xl transition-all cursor-pointer flex items-center gap-2 text-xs font-bold shadow-sm"
          title="Математикалық формулалар"
        >
          <Calculator className="w-4 h-4" />
          <span className="hidden sm:inline">Формулалар</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-500" />
          <input
            type="text"
            placeholder="Тақырып атауы бойынша іздеу..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-[#1e1d3a] border border-[#d8e0ec] dark:border-gray-800 rounded-xl text-sm text-black dark:text-white placeholder:text-gray-500 focus:outline-none focus:border-[#0F766E] dark:focus:border-[#2dd4bf]/60 focus:ring-1 focus:ring-[#0F766E]/20 transition-all"
          />
        </div>

        {/* Subjects list slider */}
        <div className="flex gap-2 overflow-x-auto pb-1 pr-4">
          {subjectsList.map((subj) => (
            <button
              key={subj}
              onClick={() => setSelectedSubject(subj)}
              className={`px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                selectedSubject === subj
                  ? 'bg-[#0F766E] text-white shadow-sm'
                  : 'bg-white dark:bg-white/[0.04] border border-[#d8e0ec] dark:border-gray-800 text-gray-500 dark:text-gray-400 hover:bg-black/[0.02] dark:hover:bg-white/[0.08]'
              }`}
            >
              {subj}
            </button>
          ))}
        </div>
      </div>

      {/* Topic Card Lists */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="h-28 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-[#d8e0ec] dark:border-gray-800/40 animate-pulse"></div>
          ))}
        </div>
      ) : filteredTopics.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTopics.map((topic) => (
            <button
              key={topic.id}
              onClick={() => {
                setSelectedTopic(topic);
                // Pre-fill total questions count safely if possible
                if (topic.questionCount && topic.questionCount < 10) {
                  setQuestionsCount(topic.questionCount);
                } else {
                  setQuestionsCount(defaultQuestionsCount);
                }
              }}
              className="glass-card glass-card-hover rounded-2xl p-5 text-left flex flex-col justify-between gap-4 cursor-pointer"
            >
              <div className="space-y-1.5 w-full">
                <div className="flex items-center justify-between gap-2">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                    topic.subject === 'Информатика' 
                      ? 'bg-blue-500/10 text-blue-500 border border-blue-500/25' 
                      : 'bg-teal-500/10 text-teal-600 dark:text-[#2dd4bf] border border-[#0F766E]/25'
                  }`}>
                    {topic.subject}
                  </span>
                  <span className="text-[10px] text-gray-500 font-mono">ID: {topic.id}</span>
                </div>
                <h3 className="font-bold text-sm text-black dark:text-gray-100 leading-relaxed line-clamp-2">
                  {topic.title}
                </h3>
              </div>
              <div className="flex items-center justify-between w-full pt-1 text-xs border-t border-[#d8e0ec] dark:border-gray-800/40 text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#0F766E] dark:text-[#2dd4bf]" />
                  {topic.questionCount ? `${topic.questionCount} сұрақ` : 'Тақырыптық тест'}
                </span>
                <span className="inline-flex items-center gap-1 text-[#0F766E] dark:text-[#2dd4bf] font-semibold group">
                  Тапсыру
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                </span>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="p-12 text-center text-gray-500 text-sm">
          Сұранысқа сәйкес тест тақырыптары табылмады.
        </div>
      )}

      {/* Settings Dialog Overlay (Modal) */}
      {selectedTopic && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-[#151426] border border-[#d8e0ec] dark:border-gray-800 rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl animate-slide-up">
            <div className="p-5 border-b border-[#d8e0ec] dark:border-gray-800 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-[#0F766E] dark:text-[#2dd4bf] tracking-widest">{selectedTopic.subject}</span>
                <h3 className="font-bold text-base text-black dark:text-white">{selectedTopic.title}</h3>
              </div>
              <button 
                onClick={() => setSelectedTopic(null)}
                className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Mode Selection */}
              <div className="space-y-2.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Тестілеу режимі
                </label>
                <div className="grid grid-cols-1 gap-2.5">
                  <button
                    onClick={() => setTestMode('instant')}
                    className={`p-3.5 rounded-xl text-left border flex items-start gap-3 cursor-pointer transition-all ${
                      testMode === 'instant'
                        ? 'border-[#0F766E] bg-[#e9f5f4] dark:bg-[#0f3a37] text-[#0F766E] dark:text-[#2dd4bf]'
                        : 'border-[#d8e0ec] dark:border-gray-800 bg-black/[0.01] dark:bg-white/[0.02] text-gray-700 dark:text-gray-300 hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'
                    }`}
                  >
                    <BookOpen className="w-5 h-5 shrink-0 text-[#0F766E] dark:text-[#2dd4bf]" />
                    <div>
                      <h4 className="font-bold text-xs">Жылдам тексеру (Практика)</h4>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">Сұрақ жауабы бірден көрсетіледі. Қатемен жұмыс жасауға өте ыңғайлы.</p>
                    </div>
                  </button>

                  <button
                    onClick={() => setTestMode('exam')}
                    className={`p-3.5 rounded-xl text-left border flex items-start gap-3 cursor-pointer transition-all ${
                      testMode === 'exam'
                        ? 'border-[#0F766E] bg-[#e9f5f4] dark:bg-[#0f3a37] text-[#0F766E] dark:text-[#2dd4bf]'
                        : 'border-[#d8e0ec] dark:border-gray-800 bg-black/[0.01] dark:bg-white/[0.02] text-gray-700 dark:text-gray-300 hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'
                    }`}
                  >
                    <GraduationCap className="w-5 h-5 shrink-0 text-[#0F766E] dark:text-[#2dd4bf]" />
                    <div>
                      <h4 className="font-bold text-xs">Сынақ емтихан режимі</h4>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">Дұрыс жауаптар көрсетілмейді, тек ең соңында толық есеп беріледі.</p>
                    </div>
                  </button>

                  <button
                    onClick={() => setTestMode('self-check')}
                    className={`p-3.5 rounded-xl text-left border flex items-start gap-3 cursor-pointer transition-all ${
                      testMode === 'self-check'
                        ? 'border-[#0F766E] bg-[#e9f5f4] dark:bg-[#0f3a37] text-[#0F766E] dark:text-[#2dd4bf]'
                        : 'border-[#d8e0ec] dark:border-gray-800 bg-black/[0.01] dark:bg-white/[0.02] text-gray-700 dark:text-gray-300 hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'
                    }`}
                  >
                    <CheckCircle className="w-5 h-5 shrink-0 text-[#0F766E] dark:text-[#2dd4bf]" />
                    <div>
                      <h4 className="font-bold text-xs">Өз-өзін тексеру (Түртіп ашу)</h4>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">Сұрақ пен дұрыс жауап жасырылған, шерту арқылы біртіндеп ашылады.</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Questions Count Selection */}
              <div className="space-y-2.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Сұрақтар саны
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {[5, 10, 15, 20, 'all'].map((countOption) => {
                    const isSelected = questionsCount === countOption;
                    const label = countOption === 'all' ? 'Бәрі' : countOption;
                    return (
                      <button
                        key={countOption}
                        onClick={() => setQuestionsCount(countOption as any)}
                        className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          isSelected
                            ? 'border-[#0F766E] bg-[#e9f5f4] dark:bg-[#0f3a37] text-[#0F766E] dark:text-[#2dd4bf]'
                            : 'border-[#d8e0ec] dark:border-gray-800 bg-black/[0.01] dark:bg-white/[0.02] text-gray-500 dark:text-gray-400 hover:bg-black/[0.03]'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Start Test Trigger */}
              <button
                onClick={handleStart}
                className="w-full py-4 bg-gradient-to-r from-[#0F766E] to-[#14B8A6] hover:from-[#14B8A6] hover:to-[#0F766E] active:scale-[0.99] text-white font-extrabold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-[#0F766E]/20 transition-all cursor-pointer"
              >
                <span>Тапсыруды бастау</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
