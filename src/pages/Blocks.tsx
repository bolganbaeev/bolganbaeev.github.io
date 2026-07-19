import React, { useEffect, useState } from 'react';
import { LayoutGrid, BookOpen, FileText, ChevronRight, ArrowLeft, Loader2, Info, Search } from 'lucide-react';
import { parseDocxToParagraphs } from '../utils/docxParser';

interface BlockTopic {
  id: string;
  code: string;
  title: string;
  summary: string;
  file: string;
}

interface BlockSubject {
  id: string;
  title: string;
  topics: BlockTopic[];
}

export default function Blocks() {
  const [subjects, setSubjects] = useState<BlockSubject[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  
  // Active reading state
  const [selectedTopic, setSelectedTopic] = useState<BlockTopic | null>(null);
  const [paragraphs, setParagraphs] = useState<string[]>([]);
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);
  const [docSearchQuery, setDocSearchQuery] = useState('');

  // 1. Fetch dynamic block catalog
  useEffect(() => {
    async function loadCatalog() {
      try {
        setLoadingCatalog(true);
        const response = await fetch('/blocks-data/catalog.json');
        if (response.ok) {
          const data = await response.json();
          if (data && Array.isArray(data.subjects)) {
            setSubjects(data.subjects);
          }
        }
      } catch (err) {
        console.error('Failed to load blocks catalog.json', err);
      } finally {
        setLoadingCatalog(false);
      }
    }
    loadCatalog();
  }, []);

  // 2. Fetch and parse docx paragraphs
  useEffect(() => {
    if (!selectedTopic) {
      setParagraphs([]);
      return;
    }
    const currentTopic = selectedTopic;

    async function fetchDoc() {
      try {
        setLoadingDoc(true);
        setDocError(null);
        setDocSearchQuery('');
        
        // Load, unzip, and parse docx content
        const parsed = await parseDocxToParagraphs(`/${currentTopic.file}`);
        setParagraphs(parsed);
      } catch (err: any) {
        console.error(err);
        setDocError('Құжатты жүктеу немесе декомпиляциялау сәтсіз аяқталды. Тексеріп қайта көріңіз.');
      } finally {
        setLoadingDoc(false);
      }
    }
    fetchDoc();
  }, [selectedTopic]);

  const filteredParagraphs = paragraphs.filter(p => 
    p.toLowerCase().includes(docSearchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-24">
      {/* Title */}
      <div className="space-y-1">
        <h1 className="text-2xl font-extrabold text-[#0F766E] dark:text-[#2dd4bf] flex items-center gap-2">
          <LayoutGrid className="w-6 h-6" />
          Тақырыптық Блоктар
        </h1>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          ҰБТ-да жиі кездесетін теориялық мәліметтер, даталар мен конспектілерді оқу
        </p>
      </div>

      {!selectedTopic ? (
        /* Block Selection Sheet */
        loadingCatalog ? (
          <div className="space-y-3">
            {[1, 2, 3].map(n => (
              <div key={n} className="h-24 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] animate-pulse"></div>
            ))}
          </div>
        ) : subjects.length > 0 ? (
          <div className="space-y-8">
            {subjects.map((subj) => (
              <div key={subj.id} className="space-y-4">
                <h2 className="text-base font-bold text-black dark:text-gray-300 flex items-center gap-2 border-l-2 border-purple-500 pl-2.5">
                  <BookOpen className="w-4 h-4 text-purple-400" />
                  {subj.title}
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {subj.topics.map((topic) => (
                    <button
                      key={topic.id}
                      onClick={() => setSelectedTopic(topic)}
                      className="glass-card glass-card-hover rounded-2xl p-5 text-left flex flex-col justify-between gap-4 cursor-pointer"
                    >
                      <div className="space-y-1.5 w-full">
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 uppercase">
                            {topic.code}
                          </span>
                        </div>
                        <h3 className="font-bold text-sm text-black dark:text-gray-100 leading-relaxed line-clamp-2">
                          {topic.title}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed pt-1">
                          {topic.summary}
                        </p>
                      </div>

                      <div className="flex items-center justify-between text-xs text-purple-600 dark:text-purple-400 pt-3 border-t border-[#d8e0ec] dark:border-gray-800/40 w-full font-semibold">
                        <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400 font-normal">
                          <FileText className="w-3.5 h-3.5" />
                          DOCX құжат
                        </span>
                        <span className="inline-flex items-center gap-1">
                          Оқуды бастау
                          <ChevronRight className="w-4 h-4" />
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center text-gray-500 text-xs">
            Блок материалдары табылмады.
          </div>
        )
      ) : (
        /* Active Docx Reader Sheet */
        <div className="space-y-6 animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between gap-4 p-3 bg-white dark:bg-[#151426] border border-[#d8e0ec] dark:border-gray-800/60 rounded-xl text-xs shadow-sm">
            <button
              onClick={() => setSelectedTopic(null)}
              className="text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white font-semibold flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Блоктар
            </button>
            <span className="font-bold text-black dark:text-gray-300 line-clamp-1 max-w-[60%]">{selectedTopic.title}</span>
            <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-purple-500/15 text-purple-600 dark:text-purple-400 uppercase">
              {selectedTopic.code}
            </span>
          </div>

          {loadingDoc ? (
            /* Document parser spinner */
            <div className="min-h-[40vh] flex flex-col items-center justify-center p-4 gap-3">
              <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
              <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold animate-pulse">Блок файлдары декомпиляциялануда...</p>
            </div>
          ) : docError ? (
            /* Error */
            <div className="p-8 rounded-2xl bg-red-500/5 border border-red-500/15 text-center space-y-4 max-w-sm mx-auto">
              <Info className="w-10 h-10 text-red-400 mx-auto" />
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{docError}</p>
              <button
                onClick={() => setSelectedTopic(null)}
                className="px-4 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-gray-200 dark:border-gray-800 text-xs font-bold text-black dark:text-white hover:bg-black/10 dark:hover:bg-white/10"
              >
                Блоктарға оралу
              </button>
            </div>
          ) : (
            /* Reader body */
            <div className="space-y-5">
              {/* Document search inner bar */}
              <div className="relative">
                <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Құжат мәтінінен іздеу..."
                  value={docSearchQuery}
                  onChange={(e) => setDocSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#1e1d3a] border border-[#d8e0ec] dark:border-gray-800 rounded-xl text-xs text-black dark:text-white placeholder:text-gray-500 focus:outline-none focus:border-[#0F766E] dark:focus:border-purple-500/60 focus:ring-1 focus:ring-[#0F766E]/20 transition-all"
                />
              </div>

              {/* Renders paragraphs nicely */}
              {filteredParagraphs.length > 0 ? (
                <div className="glass-card rounded-2xl p-6 md:p-8 space-y-5 max-h-[65vh] overflow-y-auto divide-y divide-[#d8e0ec] dark:divide-gray-800/40 select-text">
                  {filteredParagraphs.map((paragraph, idx) => {
                    const isQuestionHeader = paragraph.toLowerCase().startsWith('сұрақ') || paragraph.toLowerCase().startsWith('жауап');
                    return (
                      <p 
                        key={idx} 
                        className={`text-sm md:text-base leading-relaxed text-black dark:text-gray-200 select-text ${
                          idx > 0 ? 'pt-4' : ''
                        } ${
                          isQuestionHeader ? 'font-bold text-purple-700 dark:text-purple-300 bg-purple-500/5 p-3 rounded-lg border-l-2 border-purple-500' : ''
                        }`}
                      >
                        {paragraph}
                      </p>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500 text-xs">
                  Іздеу сұранысына сәйкес мәтін табылмады.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
