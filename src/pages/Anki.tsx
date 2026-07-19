import React, { useEffect, useState } from 'react';
import { Layers, Eye, RefreshCw, Check, ArrowRight, ArrowLeft, Volume2, ShieldAlert } from 'lucide-react';

interface AnkiCard {
  id: string;
  front: string;
  back: string;
}

interface DeckMeta {
  id: string;
  title: string;
  file: string;
  subject: string;
}

const STATIC_DECKS: DeckMeta[] = [
  { id: '1916-1920', title: '1916-1920 жылдардағы Қазақстан', file: 'blocks-data/anki/history/1916-1920.json', subject: 'Қазақстан тарихы' },
  { id: '1920-1930', title: '1920-1930 жылдардағы Қазақстан', file: 'blocks-data/anki/history/1920-1930.json', subject: 'Қазақстан тарихы' },
  { id: '1930', title: '1930 жылдардағы қоғамдық-саяси өмір', file: 'blocks-data/anki/history/1930.json', subject: 'Қазақстан тарихы' },
  { id: '1941-1945', title: '1941-1945 жылдардағы Қазақстан', file: 'blocks-data/anki/history/1941-1945.json', subject: 'Қазақстан тарихы' },
  { id: '1945-85', title: '1945-1985 жылдардағы Қазақстан', file: 'blocks-data/anki/history/1945-85.json', subject: 'Қазақстан тарихы' },
  { id: '1991-2025', title: '1991-2025 жылдардағы Қазақстан', file: 'blocks-data/anki/history/1991-2025.json', subject: 'Қазақстан тарихы' },
];

export default function Anki() {
  const [selectedDeck, setSelectedDeck] = useState<DeckMeta | null>(null);
  const [cards, setCards] = useState<AnkiCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Player state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [reviewCount, setReviewCount] = useState(0);

  // 1. Load deck cards
  useEffect(() => {
    if (!selectedDeck) return;
    const currentDeck = selectedDeck;
    
    async function loadDeck() {
      try {
        setLoading(true);
        setError(null);
        const fileUrl = currentDeck.file.startsWith('./') 
          ? currentDeck.file 
          : (currentDeck.file.startsWith('/') ? `.${currentDeck.file}` : `./${currentDeck.file}`);
        const response = await fetch(fileUrl);
        if (!response.ok) {
          throw new Error('Deck file could not be loaded');
        }
        const data = await response.json();
        if (!Array.isArray(data) || data.length === 0) {
          throw new Error('Anki deck is empty');
        }
        setCards(data);
        setCurrentIndex(0);
        setFlipped(false);
        setReviewCount(0);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Карточкаларды жүктеу қатесі');
      } finally {
        setLoading(false);
      }
    }
    loadDeck();
  }, [selectedDeck]);

  const activeCard = cards[currentIndex];

  const handleNextCard = () => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setFlipped(false);
    } else {
      // Completed deck loop back
      setSelectedDeck(null);
    }
  };

  const handlePrevCard = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setFlipped(false);
    }
  };

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'kk-KK';
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Title */}
      <div className="space-y-1">
        <h1 className="text-2xl font-extrabold text-[#0F766E] dark:text-[#2dd4bf] flex items-center gap-2">
          <Layers className="w-6 h-6" />
          Anki Карточкалары
        </h1>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Қайталау әдісі арқылы тарихи даталар мен тақырыптарды жылдам жаттаңыз
        </p>
      </div>

      {!selectedDeck ? (
        /* Deck Selection Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {STATIC_DECKS.map((deck) => (
            <button
              key={deck.id}
              onClick={() => setSelectedDeck(deck)}
              className="glass-card glass-card-hover rounded-2xl p-5 text-left flex flex-col justify-between gap-4 cursor-pointer"
            >
              <div className="space-y-1 w-full">
                <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 uppercase tracking-wider">
                  {deck.subject}
                </span>
                <h3 className="font-bold text-sm text-black dark:text-gray-100 leading-relaxed line-clamp-2">
                  {deck.title}
                </h3>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-3 border-t border-[#d8e0ec] dark:border-gray-800/40 w-full">
                <span className="flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-[#0F766E] dark:text-[#2dd4bf]" />
                  Жинақтау карталары
                </span>
                <span className="text-[#0F766E] dark:text-[#2dd4bf] font-bold inline-flex items-center gap-1">
                  Бастау
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </button>
          ))}
        </div>
      ) : loading ? (
        /* Loading deck */
        <div className="min-h-[50vh] flex flex-col items-center justify-center p-4">
          <div className="w-10 h-10 border-4 border-[#0F766E]/10 border-t-[#0F766E] rounded-full animate-spin"></div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 font-semibold">Карточкалар жүктелуде...</p>
        </div>
      ) : error ? (
        /* Loading error */
        <div className="min-h-[50vh] flex flex-col items-center justify-center text-center p-6 space-y-4 max-w-sm mx-auto">
          <ShieldAlert className="w-12 h-12 text-red-500" />
          <h2 className="text-lg font-bold text-black dark:text-white">Жүктеу қатесі</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">{error}</p>
          <button
            onClick={() => setSelectedDeck(null)}
            className="px-5 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-gray-200 dark:border-gray-800 text-xs font-semibold text-black dark:text-white hover:bg-black/10 dark:hover:bg-white/10"
          >
            Мәзірге оралу
          </button>
        </div>
      ) : activeCard ? (
        /* Active Cards Player Panel */
        <div className="space-y-6 max-w-lg mx-auto">
          {/* Active stats */}
          <div className="flex items-center justify-between text-xs p-3 bg-white dark:bg-[#151426] border border-[#d8e0ec] dark:border-gray-800/60 rounded-xl shadow-sm">
            <button
              onClick={() => setSelectedDeck(null)}
              className="text-gray-500 dark:text-gray-400 hover:text-[#0F766E] dark:hover:text-white font-semibold flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Жинақтар
            </button>
            <span className="font-bold text-black dark:text-gray-300 max-w-[50%] line-clamp-1">{selectedDeck.title}</span>
            <span className="text-[#0F766E] dark:text-[#2dd4bf] font-bold">{currentIndex + 1} / {cards.length}</span>
          </div>

          {/* 3D Card Container */}
          <div 
            onClick={() => setFlipped(!flipped)}
            className="h-80 relative cursor-pointer select-none perspective"
          >
            <div 
              className={`w-full h-full duration-500 transform-style preserve-3d relative ${
                flipped ? 'rotate-y-180' : ''
              }`}
            >
              {/* CARD FRONT */}
              <div className="absolute inset-0 backface-hidden glass-card rounded-3xl p-6 md:p-8 flex flex-col justify-between shadow-xl">
                <div className="flex justify-between items-start gap-4">
                  <span className="text-[10px] uppercase font-bold text-amber-500 tracking-wider">СҰРАҚ (ФРОНТ)</span>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      speakText(activeCard.front);
                    }}
                    className="p-1.5 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 hover:text-[#0F766E] dark:hover:text-white transition-colors cursor-pointer"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="my-auto text-center">
                  <p className="text-lg md:text-xl font-extrabold text-black dark:text-white leading-relaxed select-text">
                    {activeCard.front}
                  </p>
                </div>

                <div className="text-center text-[11px] text-gray-500 font-medium">
                  Аударып көру үшін карточканы түртіңіз
                </div>
              </div>

              {/* CARD BACK */}
              <div className="absolute inset-0 backface-hidden rotate-y-180 glass-card bg-[#e9f5f4]/50 dark:bg-[#0f3a37]/20 rounded-3xl p-6 md:p-8 flex flex-col justify-between border-[#0F766E]/20 dark:border-[#2dd4bf]/25 shadow-xl">
                <div className="flex justify-between items-start gap-4">
                  <span className="text-[10px] uppercase font-bold text-[#0F766E] dark:text-[#2dd4bf] tracking-wider">ЖАУАП (БЭК)</span>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      speakText(activeCard.back);
                    }}
                    className="p-1.5 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 hover:text-[#0F766E] dark:hover:text-white transition-colors cursor-pointer"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="my-auto text-center">
                  <p className="text-lg md:text-xl font-black text-[#0F766E] dark:text-[#2dd4bf] leading-relaxed select-text">
                    {activeCard.back}
                  </p>
                </div>

                <div className="text-center text-[11px] text-gray-500 font-medium">
                  Фронтқа оралу үшін қайта түртіңіз
                </div>
              </div>
            </div>
          </div>

          {/* Controls toolbar */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              onClick={handlePrevCard}
              disabled={currentIndex === 0}
              className="px-4 py-3.5 border border-[#d8e0ec] dark:border-gray-800 bg-white dark:bg-[#151426] text-xs font-bold rounded-xl text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white disabled:opacity-20 cursor-pointer"
            >
              Артқа
            </button>

            {!flipped ? (
              <button
                onClick={() => setFlipped(true)}
                className="flex-1 py-3.5 bg-[#e9f5f4] dark:bg-[#0F766E]/10 border border-[#0F766E]/30 hover:bg-[#d5ebe8] dark:hover:bg-[#0F766E]/20 text-[#0F766E] dark:text-[#2dd4bf] font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Eye className="w-4 h-4" />
                Жауапты ашу
              </button>
            ) : (
              <button
                onClick={handleNextCard}
                className="flex-1 py-3.5 bg-gradient-to-r from-[#0F766E] to-[#14B8A6] hover:from-[#14B8A6] hover:to-[#0F766E] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                Жаттадым (Келесі)
              </button>
            )}
          </div>
        </div>
      ) : null}

      {/* Tailwind helper utilities for 3D preservation */}
      <style>{`
        .perspective {
          perspective: 1000px;
        }
        .preserve-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
      `}</style>
    </div>
  );
}
