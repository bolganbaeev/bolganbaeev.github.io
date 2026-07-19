import React, { useEffect, useState, useCallback } from 'react';
import { ArrowLeft, ArrowRight, HelpCircle, AlertCircle, Play, CheckCircle2, XCircle, Timer, Award, Eye, KeyRound, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { TopicMeta } from '../data/topics';
import { saveTestResult, saveQuizMistake, QuizMistake, UserProfile } from '../db/indexedDb';

interface TestRunnerProps {
  user: UserProfile;
  topic: TopicMeta;
  mode: string; // 'instant' | 'exam' | 'self-check'
  questionsCount: number;
  onClose: () => void;
  overrideQuestions?: any[]; // For re-quizzing mistakes
}

interface LoadedQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
  originalIndex: number;
  imageUrl?: string;
}

export default function TestRunner({ user, topic, mode, questionsCount, onClose, overrideQuestions }: TestRunnerProps) {
  const [questions, setQuestions] = useState<LoadedQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Runner state
  const [activeIndex, setActiveIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<(string | null)[]>([]); // To support Exam mode
  const [showFeedback, setShowFeedback] = useState(false); // For instant feedback in instant mode
  const [isSelfCheckRevealed, setIsSelfCheckRevealed] = useState(false); // For self-check mode
  
  // Timer state
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [score, setScore] = useState(0);

  // Helper: Shuffle array
  const shuffleArray = <T,>(array: T[]): T[] => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  // Helper: Get correct answer text matching original Kotlin logic
  const getCorrectAnswerText = (q: any): string => {
    if (q.correct !== undefined && q.correct !== null && String(q.correct).trim()) {
      return String(q.correct).trim();
    }
    if (q.answer !== undefined && q.answer !== null && String(q.answer).trim()) {
      return String(q.answer).trim();
    }
    if (Array.isArray(q.options) && q.options.length > 0) {
      return String(q.options[0]).trim();
    }
    return '';
  };

  // Helper: Format image URL safely
  const formatImageUrl = (img?: string): string | undefined => {
    if (!img) return undefined;
    const clean = img.replace('test/assets/', '').replace('123/', '');
    // Usually located in /test/assets/formulas/ or similar
    return `/test/assets/${clean}`;
  };

  // 1. Load questions
  useEffect(() => {
    async function loadTestQuestions() {
      try {
        setLoading(true);
        setError(null);

        let rawQuestions: any[] = [];
        
        if (overrideQuestions && overrideQuestions.length > 0) {
          rawQuestions = overrideQuestions;
        } else {
          // Adjust file URL for loading
          const fileUrl = topic.file.startsWith('/') ? topic.file : `/${topic.file}`;
          const response = await fetch(fileUrl);
          if (!response.ok) {
            throw new Error(`Failed to load file: ${response.statusText}`);
          }
          rawQuestions = await response.json();
        }

        if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) {
          throw new Error('Test file contains no questions or is corrupted.');
        }

        // Shuffle questions
        const shuffledRaw = overrideQuestions ? rawQuestions : shuffleArray(rawQuestions);
        const cappedRaw = shuffledRaw.slice(0, questionsCount);

        const loaded: LoadedQuestion[] = cappedRaw.map((q, idx) => {
          const correctAnswer = getCorrectAnswerText(q);
          
          // Shuffling options while making sure correct answer is included!
          let opts: string[] = [];
          if (Array.isArray(q.options)) {
            // Strip any null or empty options
            const cleanOpts = q.options.map((o: any) => String(o || '').trim()).filter((o: any) => o.length > 0);
            
            // Make sure correct answer exists in options list
            if (correctAnswer && !cleanOpts.includes(correctAnswer)) {
              cleanOpts.push(correctAnswer);
            }
            opts = overrideQuestions ? cleanOpts : shuffleArray([...new Set(cleanOpts)]);
          }

          return {
            question: String(q.question || '').trim(),
            options: opts,
            correctAnswer,
            originalIndex: idx,
            imageUrl: formatImageUrl(q.imageUrl || q.img)
          };
        });

        setQuestions(loaded);
        setUserAnswers(Array(loaded.length).fill(null));
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Тестілеу файлдарын жүктеу сәтсіз аяқталды.');
      } finally {
        setLoading(false);
      }
    }

    loadTestQuestions();
  }, [topic, questionsCount, overrideQuestions]);

  // 2. Timer effect
  useEffect(() => {
    if (loading || completed || error) return;
    const interval = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [loading, completed, error]);

  const currentQuestion = questions[activeIndex];

  // Helper: Handle option submission and mistake logging
  const handleSelectOption = useCallback(async (optionValue: string) => {
    if (completed || !currentQuestion) return;

    const isCorrect = optionValue.trim().toLowerCase() === currentQuestion.correctAnswer.trim().toLowerCase();

    // 1. Save option to current answers array
    const newAnswers = [...userAnswers];
    newAnswers[activeIndex] = optionValue;
    setUserAnswers(newAnswers);

    // 2. Instant mode feedback triggering
    if (mode === 'instant') {
      setShowFeedback(true);
      
      // Save mistake to IndexedDB if wrong
      if (!isCorrect) {
        const mistake: QuizMistake = {
          id: `${topic.id}-${activeIndex}-${Date.now()}`,
          userId: user.id,
          subject: topic.subject,
          topicId: String(topic.id),
          questionText: currentQuestion.question,
          options: currentQuestion.options,
          correctAnswer: currentQuestion.correctAnswer,
          userAnswer: optionValue,
          date: new Date().toISOString()
        };
        await saveQuizMistake(mistake);
      }
    }
  }, [activeIndex, completed, currentQuestion, mode, topic, user.id, userAnswers]);

  // Self check triggers
  const handleSelfCheckResult = async (wasCorrect: boolean) => {
    if (!currentQuestion) return;

    const newAnswers = [...userAnswers];
    newAnswers[activeIndex] = wasCorrect ? currentQuestion.correctAnswer : 'қате';
    setUserAnswers(newAnswers);

    // Logging mistakes if user self-checked as wrong
    if (!wasCorrect) {
      const mistake: QuizMistake = {
        id: `${topic.id}-${activeIndex}-${Date.now()}`,
        userId: user.id,
        subject: topic.subject,
        topicId: String(topic.id),
        questionText: currentQuestion.question,
        options: currentQuestion.options,
        correctAnswer: currentQuestion.correctAnswer,
        userAnswer: 'Сыныпта қате деп бағалады',
        date: new Date().toISOString()
      };
      await saveQuizMistake(mistake);
    }

    handleNextQuestion();
  };

  // Keyboard Navigation / Hotkeys
  useEffect(() => {
    if (loading || completed || !currentQuestion) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();
      
      // Selection keys
      if (mode !== 'self-check') {
        const optionIndicesMap: Record<string, number> = { 'A': 0, 'S': 1, 'D': 2, 'F': 3, '1': 0, '2': 1, '3': 2, '4': 3 };
        const targetIdx = optionIndicesMap[key];
        if (targetIdx !== undefined && currentQuestion.options[targetIdx]) {
          // If instant mode, only allow selection once before moving on
          if (mode === 'instant' && showFeedback) return;
          handleSelectOption(currentQuestion.options[targetIdx]);
        }
      }

      // Hotkey to trigger reveal in selfcheck
      if (mode === 'self-check' && key === ' ') {
        e.preventDefault();
        setIsSelfCheckRevealed(true);
      }

      // Navigation hotkeys
      if (key === 'Z' || e.key === 'ArrowLeft') {
        handlePrevQuestion();
      }
      if (key === 'X' || e.key === 'ArrowRight' || e.key === 'Enter') {
        handleNextQuestion();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [loading, completed, currentQuestion, handleSelectOption, mode, showFeedback]);

  const handlePrevQuestion = () => {
    if (activeIndex > 0) {
      setActiveIndex(activeIndex - 1);
      setShowFeedback(mode === 'instant' && userAnswers[activeIndex - 1] !== null);
      setIsSelfCheckRevealed(false);
    }
  };

  const handleNextQuestion = () => {
    if (activeIndex < questions.length - 1) {
      setActiveIndex(activeIndex + 1);
      setShowFeedback(mode === 'instant' && userAnswers[activeIndex + 1] !== null);
      setIsSelfCheckRevealed(false);
    } else {
      // If we are at the last question, automatically trigger complete
      handleFinishTest();
    }
  };

  // 3. Complete and evaluate test
  const handleFinishTest = async () => {
    let correctCount = 0;
    questions.forEach((q, idx) => {
      const ans = userAnswers[idx];
      if (ans && ans.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase()) {
        correctCount++;
      }
    });

    setScore(correctCount);
    setCompleted(true);

    // Trigger celebration effects for high scores!
    const percent = (correctCount / questions.length) * 100;
    if (percent >= 80) {
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 }
      });
    }

    // Save score result to IndexedDB local database
    if (!overrideQuestions) {
      await saveTestResult({
        id: `${topic.id}-${Date.now()}`,
        userId: user.id,
        subject: topic.subject,
        topicTitle: topic.title,
        score: correctCount,
        totalQuestions: questions.length,
        date: new Date().toISOString()
      });
    }
  };

  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-[#0F766E]/10 border-t-[#0F766E] rounded-full animate-spin"></div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-4 font-semibold">Тест жүктелуде...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto space-y-4">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <h2 className="text-xl font-bold text-black dark:text-white">Қате орын алды</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{error}</p>
        <button
          onClick={onClose}
          className="px-5 py-2.5 bg-black/5 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl text-xs font-semibold text-black dark:text-white hover:bg-black/10 dark:hover:bg-white/10"
        >
          Артқа қайту
        </button>
      </div>
    );
  }

  // Active runner panel
  if (!completed && currentQuestion) {
    const currentAnsSelected = userAnswers[activeIndex];
    const progressPercent = ((activeIndex + 1) / questions.length) * 100;

    return (
      <div className="space-y-6 pb-24">
        {/* Runner Header Stats Bar */}
        <div className="flex items-center justify-between gap-4 p-3 bg-white dark:bg-[#151426] border border-[#d8e0ec] dark:border-gray-800/60 rounded-xl text-xs shadow-sm">
          <button 
            onClick={onClose}
            className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white font-medium cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Шығу</span>
          </button>
          
          <span className="font-bold text-black dark:text-gray-300 line-clamp-1 max-w-[50%]">
            {topic.title}
          </span>

          <div className="flex items-center gap-1.5 font-bold text-[#0F766E] dark:text-[#2dd4bf] shrink-0">
            <Timer className="w-4 h-4 animate-pulse" />
            <span>{formatTime(elapsedSeconds)}</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-[11px] font-bold text-gray-500 dark:text-gray-400 font-mono">
            <span>СҰРАҚ {activeIndex + 1} / {questions.length}</span>
            <span>{Math.round(progressPercent)}% КӨРСЕТКІШ</span>
          </div>
          <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-900 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-[#0F766E] to-[#14B8A6] rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>

        {/* If exam mode: Question bubbles navigator */}
        {mode === 'exam' && (
          <div className="flex flex-wrap gap-1.5 pb-2">
            {questions.map((_, idx) => {
              const isAnswered = userAnswers[idx] !== null;
              const isActive = idx === activeIndex;
              return (
                <button
                  key={idx}
                  onClick={() => {
                    setActiveIndex(idx);
                    setIsSelfCheckRevealed(false);
                  }}
                  className={`w-7 h-7 rounded-lg text-[10px] font-mono font-bold flex items-center justify-center transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#0F766E] text-white scale-110 shadow-md shadow-[#0F766E]/20'
                      : isAnswered
                      ? 'bg-[#0F766E]/20 text-[#0F766E] dark:text-[#2dd4bf] border border-[#0F766E]/20'
                      : 'bg-white dark:bg-white/[0.02] border border-[#d8e0ec] dark:border-gray-800 text-gray-500 hover:bg-black/[0.05] dark:hover:bg-white/[0.05]'
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        )}

        {/* Question Panel */}
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-semibold leading-relaxed text-black dark:text-white select-text">
            {currentQuestion.question}
          </h2>

          {/* Question Image if present */}
          {currentQuestion.imageUrl && (
            <div className="flex justify-center p-2 rounded-xl bg-white dark:bg-white/[0.02] border border-[#d8e0ec] dark:border-gray-800 max-h-60 overflow-hidden">
              <img 
                src={currentQuestion.imageUrl} 
                alt="Сұрақ суреті" 
                className="object-contain max-h-56 rounded-lg"
                onError={(e) => {
                  // Fallback or hide if fails to load
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}
        </div>

        {/* Options / Playing Field */}
        {mode === 'self-check' ? (
          /* Self-check Mode View */
          <div className="space-y-4">
            {!isSelfCheckRevealed ? (
              <button
                onClick={() => setIsSelfCheckRevealed(true)}
                className="w-full p-12 glass-card glass-card-hover rounded-2xl flex flex-col items-center justify-center text-center gap-3 cursor-pointer"
              >
                <Eye className="w-8 h-8 text-[#0F766E] dark:text-[#2dd4bf]" />
                <span className="font-bold text-sm text-black dark:text-white">Жауапты көрсету</span>
                <span className="text-xs text-gray-500 font-mono">[Бос орын / Space] пернесін басыңыз</span>
              </button>
            ) : (
              <div className="space-y-4 animate-fade-in">
                <div className="p-6 rounded-2xl border-2 border-[#0F766E]/25 bg-[#e9f5f4] dark:bg-[#0f3a37]/20 text-center space-y-3">
                  <span className="text-[10px] uppercase font-bold text-[#0F766E] dark:text-[#2dd4bf] tracking-wider">Дұрыс жауап</span>
                  <p className="text-lg font-bold text-black dark:text-white select-text">{currentQuestion.correctAnswer}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleSelfCheckResult(false)}
                    className="py-4 rounded-xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-500 dark:text-red-400 font-bold text-sm transition-all cursor-pointer"
                  >
                    × Қателестім
                  </button>
                  <button
                    onClick={() => handleSelfCheckResult(true)}
                    className="py-4 rounded-xl border border-green-500/20 bg-green-500/5 hover:bg-green-500/10 text-green-600 dark:text-green-400 font-bold text-sm transition-all cursor-pointer"
                  >
                    ✓ Дұрыс білдім
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Instant & Exam Option selection */
          <div className="grid grid-cols-1 gap-3">
            {currentQuestion.options.map((option, idx) => {
              const optionLetter = String.fromCharCode(65 + idx); // A, B, C, D...
              const isSelected = currentAnsSelected === option;
              
              let optionStyle = 'border-[#d8e0ec] dark:border-gray-800 bg-white dark:bg-[#151426] text-black dark:text-gray-300 hover:bg-black/[0.02] dark:hover:bg-white/[0.04] shadow-sm';
              let badgeStyle = 'bg-black/5 dark:bg-white/5 border border-[#d8e0ec] dark:border-gray-800 text-gray-500 dark:text-gray-400';

              if (mode === 'instant' && showFeedback) {
                const optionIsCorrect = option.trim().toLowerCase() === currentQuestion.correctAnswer.trim().toLowerCase();
                const optionIsSelected = currentAnsSelected === option;

                if (optionIsCorrect) {
                  optionStyle = 'border-green-500 bg-green-500/10 text-green-700 dark:text-green-400';
                  badgeStyle = 'bg-green-500 text-white';
                } else if (optionIsSelected) {
                  optionStyle = 'border-red-500 bg-red-500/10 text-red-700 dark:text-red-400';
                  badgeStyle = 'bg-red-500 text-white';
                } else {
                  optionStyle = 'border-[#d8e0ec] dark:border-gray-900 bg-transparent text-gray-400 dark:text-gray-500 opacity-60 pointer-events-none';
                }
              } else if (isSelected) {
                optionStyle = 'border-[#0F766E] bg-[#e9f5f4] dark:bg-[#0f3a37]/30 text-[#0F766E] dark:text-[#2dd4bf] shadow-md';
                badgeStyle = 'bg-[#0F766E] text-white';
              }

              return (
                <button
                  key={idx}
                  onClick={() => {
                    // Prevent clicking again in instant feedback
                    if (mode === 'instant' && showFeedback) return;
                    handleSelectOption(option);
                  }}
                  disabled={mode === 'instant' && showFeedback}
                  className={`p-4 rounded-xl border text-left flex items-start gap-3.5 transition-all text-xs leading-relaxed font-medium cursor-pointer ${optionStyle}`}
                >
                  <span className={`w-6 h-6 rounded-lg text-[10px] font-mono font-bold shrink-0 flex items-center justify-center ${badgeStyle}`}>
                    {optionLetter}
                  </span>
                  <span className="pt-0.5 select-text">{option}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Hotkey Hint on Desktop */}
        <div className="hidden md:block text-center text-[10px] text-gray-500 font-mono">
          Таңдау үшін <span className="bg-white/5 px-1 rounded">A</span>, <span className="bg-white/5 px-1 rounded">S</span>, <span className="bg-white/5 px-1 rounded">D</span>, <span className="bg-white/5 px-1 rounded">F</span> немесе <span className="bg-white/5 px-1 rounded">1, 2, 3, 4</span> басыңыз. Келесіге <span className="bg-white/5 px-1 rounded">Enter / Space</span>.
        </div>

        {/* Back / Next Bottom Nav Controller */}
        <div className="flex items-center justify-between gap-4 pt-4 border-t border-[#d8e0ec] dark:border-gray-800">
          <button
            onClick={handlePrevQuestion}
            disabled={activeIndex === 0}
            className="px-4 py-3 border border-[#d8e0ec] dark:border-gray-800 bg-white dark:bg-[#151426] text-xs font-bold rounded-xl flex items-center gap-1.5 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white disabled:opacity-30 disabled:pointer-events-none cursor-pointer shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Артқа [Z]</span>
          </button>

          {mode === 'exam' && (
            <button
              onClick={handleFinishTest}
              className="px-5 py-3 bg-gradient-to-r from-[#0F766E] to-[#14B8A6] hover:from-[#14B8A6] hover:to-[#0F766E] text-xs font-bold text-white rounded-xl shadow-md shadow-[#0F766E]/10 cursor-pointer"
            >
              Аяқтау ({userAnswers.filter(a => a !== null).length} / {questions.length})
            </button>
          )}

          <button
            onClick={handleNextQuestion}
            disabled={mode === 'instant' && !showFeedback}
            className="px-4 py-3 bg-black/5 dark:bg-white/5 border border-[#d8e0ec] dark:border-gray-800 text-xs font-bold rounded-xl flex items-center gap-1.5 text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
          >
            <span>{activeIndex === questions.length - 1 ? 'Аяқтау' : 'Келесі'} [X]</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Quiz Results Sheet (Success)
  if (completed) {
    const totalQuestions = questions.length;
    const correctCount = score;
    const percent = Math.round((correctCount / totalQuestions) * 100);
    const scoreText = `${correctCount} / ${totalQuestions}`;

    let medalColor = 'text-gray-500';
    let rankTitle = 'Орташа нәтиже';
    let motivateText = 'Жақсы талпыныс! Есептер мен қателер тақырыбын қайта пысықтаңыз.';

    if (percent >= 90) {
      medalColor = 'text-yellow-500';
      rankTitle = 'Алтын кубок - Керемет!';
      motivateText = 'Ғаламат көрсеткіш! Тамаша дайындық, осы қарқынды сақтаңыз!';
    } else if (percent >= 70) {
      medalColor = 'text-[#0F766E] dark:text-[#2dd4bf]';
      rankTitle = 'Күміс жүлде - Жақсы!';
      motivateText = 'Өте жақсы нәтиже! Кішігірім қателермен жұмыс жасап, ұпайды көтеріңіз.';
    }

    return (
      <div className="space-y-6 pb-24 max-w-2xl mx-auto">
        {/* Results Card Summary */}
        <div className="glass-card rounded-2xl p-6 text-center space-y-4 relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#0F766E] to-purple-500"></div>
          
          <div className="inline-flex p-4 rounded-full bg-[#0F766E]/10 border border-[#0F766E]/20 mb-2">
            <Award className={`w-12 h-12 ${medalColor}`} />
          </div>

          <div className="space-y-1">
            <h1 className="text-xl font-extrabold text-black dark:text-white uppercase tracking-wider">{rankTitle}</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">{topic.title}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto pt-2">
            <div className="p-3 bg-black/[0.01] dark:bg-white/[0.02] border border-[#d8e0ec] dark:border-gray-800 rounded-xl shadow-sm">
              <span className="block text-[10px] text-gray-500 uppercase font-mono">Ұпайыңыз</span>
              <span className="text-2xl font-black text-[#0F766E] dark:text-[#2dd4bf]">{scoreText}</span>
            </div>
            <div className="p-3 bg-black/[0.01] dark:bg-white/[0.02] border border-[#d8e0ec] dark:border-gray-800 rounded-xl shadow-sm">
              <span className="block text-[10px] text-gray-500 uppercase font-mono">Пайыздық үлес</span>
              <span className="text-2xl font-black text-black dark:text-white">{percent}%</span>
            </div>
          </div>

          <p className="text-xs text-gray-600 dark:text-gray-300 max-w-md mx-auto leading-relaxed pt-2 border-t border-[#d8e0ec] dark:border-gray-800/40">
            {motivateText}
          </p>
        </div>

        {/* Detailed Solutions Checklist */}
        <div className="space-y-3.5">
          <h2 className="text-base font-bold text-black dark:text-white flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-[#0F766E] dark:text-[#2dd4bf]" />
            Сұрақтар мен шешімдер
          </h2>

          <div className="space-y-3">
            {questions.map((q, idx) => {
              const ans = userAnswers[idx];
              const isCorrect = ans && ans.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();
              return (
                <div 
                  key={idx} 
                  className={`p-4 rounded-xl border text-xs leading-relaxed space-y-2 ${
                    isCorrect 
                      ? 'bg-green-500/5 border-green-500/10' 
                      : 'bg-red-500/5 border-red-500/10'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-bold text-black dark:text-gray-200">
                      Сұрақ {idx + 1}. {q.question}
                    </span>
                    {isCorrect ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-gray-500 dark:text-gray-400">
                    <div>
                      <span className="block text-[10px] text-gray-400">Сіздің жауабыңыз:</span>
                      <span className={isCorrect ? 'text-green-600 dark:text-green-400 font-medium' : 'text-red-600 dark:text-red-400 font-medium'}>
                        {ans || 'Жауап берілмеді'}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-gray-400">Дұрыс жауап:</span>
                      <span className="text-green-600 dark:text-green-400 font-semibold">{q.correctAnswer}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom actions triggers */}
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3.5 border border-[#d8e0ec] dark:border-gray-800 bg-white dark:bg-[#151426] hover:bg-black/[0.02] dark:hover:bg-white/[0.05] text-xs font-bold text-black dark:text-white rounded-xl text-center cursor-pointer shadow-sm"
          >
            Мәзірге оралу
          </button>
        </div>
      </div>
    );
  }

  return null;
}
