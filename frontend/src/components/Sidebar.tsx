import React, { useRef, useEffect } from 'react';
import {
  BookOpen,
  Library,
  Clock,
  Star,
  FolderOpen,
  Sigma,
  Cpu,
  Sparkles,
  Server,
  FileText,
  BookOpenCheck,
  Layers3,
  Highlighter,
  Play,
  Pause,
  RotateCcw,
  FilePlus2,
  X,
} from 'lucide-react';
import { useLibraryStore } from '../store/useLibraryStore';

const SHELF_COLLECTIONS = [
  { id: 'All Categories', label: 'All Categories', icon: FolderOpen },
  { id: 'Mathematics & Linear Algebra', label: 'Mathematics & Linear Algebra', icon: Sigma },
  { id: 'Computer Science & DSA', label: 'Computer Science & DSA', icon: Cpu },
  { id: 'AI & Machine Learning', label: 'AI & Machine Learning', icon: Sparkles },
  { id: 'Systems & Architecture', label: 'Systems & Architecture', icon: Server },
  { id: 'Uploaded PDFs', label: 'Uploaded PDFs', icon: FileText },
];

export const Sidebar: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = React.useState<boolean>(false);
  const {
    books,
    activeView,
    libraryScope,
    selectedCategory,
    mainSidebarOpen,
    pomodoro,
    toggleMainSidebar,
    setLibraryScope,
    setSelectedCategory,
    switchView,
    openUnifiedModal,
    setPomodoroMode,
    togglePomodoro,
    resetPomodoro,
    tickPomodoro,
    uploadPdf,
  } = useLibraryStore();

  // Pomodoro interval timer
  useEffect(() => {
    let timer: any = null;
    if (pomodoro.isRunning) {
      timer = setInterval(() => {
        tickPomodoro();
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [pomodoro.isRunning, tickPomodoro]);

  const allCount = books.length;
  const continueCount = books.filter((b) => b.current_page > 1 && b.current_page <= b.page_count).length;
  const starredCount = books.filter((b) => b.is_starred).length;
  const totalCards = books.reduce((acc, b) => acc + (b.flashcards_count || 0), 0);
  const totalMarks = books.reduce((acc, b) => acc + (b.highlights_count || 0), 0);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      await uploadPdf(file);
    } catch (err: any) {
      console.error(err);
      alert(`Could not upload PDF: ${err.message || 'Please check backend server status.'}`);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  return (
    <>
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Mobile Backdrop */}
      {mainSidebarOpen && (
        <div
          onClick={() => toggleMainSidebar(false)}
          className="fixed inset-0 bg-[#190F0A]/65 backdrop-blur-[1px] z-30 md:hidden"
        />
      )}

      <aside
        className={`espresso-sidebar w-[236px] shrink-0 h-full flex flex-col justify-between text-[#F7EFE6] z-40 fixed md:relative inset-y-0 left-0 transition-transform duration-200 select-none ${
          mainSidebarOpen ? 'translate-x-0' : '-translate-x-full md:hidden'
        }`}
      >
        {/* Brand Header */}
        <div className="px-3.5 h-[48px] border-b border-[#3B2519] flex items-center justify-between shrink-0">
          <button
            onClick={() => {
              setLibraryScope('all');
              setSelectedCategory('All Categories');
            }}
            className="flex items-center gap-2.5 text-left group focus:outline-none"
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#C87A3B] to-[#7C3222] flex items-center justify-center shadow-inner ring-1 ring-[#E09453]/35 group-hover:scale-105 transition-transform">
              <BookOpen className="w-4 h-4 text-[#FCF8F2]" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-display font-bold text-[19px] tracking-tight text-[#F7EFE6] leading-none">
                My Vault
              </span>
              <span className="text-[9px] font-mono font-semibold uppercase tracking-widest px-1.5 py-0.5 rounded bg-[#3B2519] text-[#E09453] border border-[#E09453]/25">
                STUDIO
              </span>
            </div>
          </button>
          <button
            onClick={() => toggleMainSidebar(false)}
            className="md:hidden p-1 text-[#A88E79] hover:text-[#F7EFE6] rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4">
          {/* SECTION 1: LIBRARY */}
          <div>
            <div className="px-2 mb-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[#9C816B]">
              LIBRARY
            </div>
            <nav className="space-y-0.5">
              <button
                onClick={() => {
                  setLibraryScope('all');
                  setSelectedCategory('All Categories');
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeView === 'library' && libraryScope === 'all' && selectedCategory === 'All Categories'
                    ? 'nav-item-active font-semibold'
                    : 'text-[#D8C7B8] hover:bg-[#2E1D14] hover:text-[#F7EFE6]'
                }`}
              >
                <span className="flex items-center gap-2 truncate">
                  <Library className="w-3.5 h-3.5 text-[#E09453] shrink-0" />
                  <span className="truncate">All Volumes</span>
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#3B2519] text-[#E09453]">
                  {allCount}
                </span>
              </button>

              <button
                onClick={() => setLibraryScope('continue')}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeView === 'library' && libraryScope === 'continue'
                    ? 'nav-item-active font-semibold'
                    : 'text-[#D8C7B8] hover:bg-[#2E1D14] hover:text-[#F7EFE6]'
                }`}
              >
                <span className="flex items-center gap-2 truncate">
                  <Clock className="w-3.5 h-3.5 text-[#C87A3B] shrink-0" />
                  <span className="truncate">Continue Reading</span>
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#2E1D14] text-[#A88E79]">
                  {continueCount}
                </span>
              </button>

              <button
                onClick={() => setLibraryScope('starred')}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeView === 'library' && libraryScope === 'starred'
                    ? 'nav-item-active font-semibold'
                    : 'text-[#D8C7B8] hover:bg-[#2E1D14] hover:text-[#F7EFE6]'
                }`}
              >
                <span className="flex items-center gap-2 truncate">
                  <Star className="w-3.5 h-3.5 text-[#E09453] shrink-0" />
                  <span className="truncate">Starred Books</span>
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#2E1D14] text-[#A88E79]">
                  {starredCount}
                </span>
              </button>
            </nav>
          </div>

          {/* SECTION 2: SHELF COLLECTIONS */}
          <div className="pt-2 border-t border-[#3B2519]/80">
            <div className="px-2 mb-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[#9C816B]">
              SHELF COLLECTIONS
            </div>
            <nav className="space-y-0.5">
              {SHELF_COLLECTIONS.map((col) => {
                const Icon = col.icon;
                const count =
                  col.id === 'All Categories'
                    ? books.length
                    : books.filter((b) => b.category === col.id).length;
                const isActive =
                  activeView === 'library' &&
                  libraryScope === 'all' &&
                  selectedCategory === col.id;

                return (
                  <button
                    key={col.id}
                    onClick={() => setSelectedCategory(col.id)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      isActive
                        ? 'nav-item-active font-semibold'
                        : 'text-[#D8C7B8] hover:bg-[#2E1D14] hover:text-[#F7EFE6]'
                    }`}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <Icon
                        className={`w-3.5 h-3.5 ${
                          isActive ? 'text-[#E09453]' : 'text-[#A88E79]'
                        } shrink-0`}
                      />
                      <span className="truncate">{col.label}</span>
                    </span>
                    <span
                      className={`text-[10px] font-mono ${
                        isActive ? 'text-[#E09453]' : 'text-[#8A6F5C]'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* SECTION 3: STUDY WORKSPACE */}
          <div className="pt-2 border-t border-[#3B2519]/80">
            <div className="px-2 mb-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[#9C816B]">
              STUDY WORKSPACE
            </div>
            <nav className="space-y-0.5">
              <button
                onClick={() => switchView('reader')}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeView === 'reader'
                    ? 'nav-item-active font-semibold'
                    : 'text-[#D8C7B8] hover:bg-[#2E1D14] hover:text-[#F7EFE6]'
                }`}
              >
                <span className="flex items-center gap-2 truncate">
                  <BookOpenCheck className="w-3.5 h-3.5 text-[#E09453] shrink-0" />
                  <span className="truncate">Active PDF Reader</span>
                </span>
                <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-[#7C3222]/60 text-[#F7EFE6] border border-[#C87A3B]/30">
                  Studio
                </span>
              </button>

              <button
                onClick={() => openUnifiedModal('flashcards')}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#D8C7B8] hover:bg-[#2E1D14] hover:text-[#F7EFE6] transition-colors"
              >
                <span className="flex items-center gap-2 truncate">
                  <Layers3 className="w-3.5 h-3.5 text-[#C87A3B] shrink-0" />
                  <span className="truncate">Flashcard Deck</span>
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#2E1D14] text-[#E09453]">
                  {totalCards}
                </span>
              </button>

              <button
                onClick={() => openUnifiedModal('annotations')}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#D8C7B8] hover:bg-[#2E1D14] hover:text-[#F7EFE6] transition-colors"
              >
                <span className="flex items-center gap-2 truncate">
                  <Highlighter className="w-3.5 h-3.5 text-[#C87A3B] shrink-0" />
                  <span className="truncate">Notes & Highlights</span>
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#2E1D14] text-[#A88E79]">
                  {totalMarks}
                </span>
              </button>
            </nav>
          </div>
        </div>

        {/* Sidebar Footer: Focus Pod & + Upload PDF Button */}
        <div className="p-2.5 border-t border-[#3B2519] bg-[#190F0A]/90 space-y-2 shrink-0">
          {/* Pomodoro Focus Pod */}
          <div className="rounded-xl bg-[#26170F] border border-[#3B2519] p-2.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#A88E79] flex items-center gap-1.5">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    pomodoro.isRunning ? 'bg-[#E09453] animate-ping' : 'bg-[#A88E79]'
                  }`}
                />
                <span>{pomodoro.mode === 'focus' ? 'Focus Pod' : 'Short Break'}</span>
              </span>
              <div className="flex items-center gap-1 bg-[#190F0A] rounded-md p-0.5 border border-[#3B2519]">
                <button
                  onClick={() => setPomodoroMode('focus')}
                  className={`px-1.5 py-0.5 rounded text-[9px] font-semibold transition-colors ${
                    pomodoro.mode === 'focus'
                      ? 'bg-[#A85D2A] text-[#FCF8F2] font-bold'
                      : 'text-[#A88E79] hover:text-[#F7EFE6]'
                  }`}
                >
                  25m
                </button>
                <button
                  onClick={() => setPomodoroMode('short')}
                  className={`px-1.5 py-0.5 rounded text-[9px] font-semibold transition-colors ${
                    pomodoro.mode === 'short'
                      ? 'bg-[#A85D2A] text-[#FCF8F2] font-bold'
                      : 'text-[#A88E79] hover:text-[#F7EFE6]'
                  }`}
                >
                  5m
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-lg font-bold text-[#F7EFE6] tracking-tight">
                {formatTime(pomodoro.remainingSeconds)}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={togglePomodoro}
                  title="Start / Pause Focus Timer"
                  className="px-2.5 py-1 rounded-lg bg-[#3B2519] hover:bg-[#4F3424] text-[#E09453] text-[11px] font-semibold flex items-center gap-1 transition-colors"
                >
                  {pomodoro.isRunning ? (
                    <>
                      <Pause className="w-3 h-3" />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3" />
                      <span>Start</span>
                    </>
                  )}
                </button>
                <button
                  onClick={resetPomodoro}
                  title="Reset Timer"
                  className="p-1.5 rounded-lg bg-[#190F0A] hover:bg-[#3B2519] text-[#A88E79] hover:text-[#F7EFE6] border border-[#3B2519] transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Full-Width Warm Cognac + Upload PDF Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className={`w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer ${
              isUploading
                ? 'bg-[#4F3424] text-[#A88E79] cursor-wait'
                : 'bg-[#A85D2A] hover:bg-[#BD6B33] active:bg-[#8E4B1E] text-[#FCF8F2]'
            }`}
          >
            <FilePlus2 className={`w-3.5 h-3.5 ${isUploading ? 'animate-spin' : ''}`} />
            <span>{isUploading ? 'Cataloging PDF...' : '+ Upload PDF'}</span>
          </button>
        </div>
      </aside>
    </>
  );
};
