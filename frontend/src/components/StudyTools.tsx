import React, { useState } from 'react';
import {
  Pin,
  Download,
  PanelRightClose,
  CheckCircle,
  Plus,
} from 'lucide-react';
import { useLibraryStore } from '../store/useLibraryStore';
import { ToolTab } from '../types';

const QUICK_SYMBOLS = [
  '∑', '∫', '∂', '∇', 'λ',
  'θ', '∈', '∀', '∃', '→',
  '≈', '≤', '≥', 'O(n log n)', '≠',
];

export const StudyTools: React.FC = () => {
  const {
    activeBook,
    readerRightDockOpen,
    activeToolTab,
    currentNotes,
    notesSaveStatus,
    flashcards,
    highlights,
    bookmarks,
    highlightFilter,
    checklist,
    pomodoro,
    toggleReaderRightDock,
    setActiveToolTab,
    setHighlightFilter,
    updateNotes,
    goToPage,
    addFlashcard,
    reviewCard,
    toggleCardMastered,
    deleteCard,
    deleteHighlight,
    toggleBookmarkPage,
    addChecklist,
    toggleChecklist,
    deleteChecklist,
    clearCompletedChecklist,
  } = useLibraryStore();

  const [fcSubTab, setFcSubTab] = useState<'review' | 'create'>('review');
  const [activeCardIdx, setActiveCardIdx] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [newFront, setNewFront] = useState<string>('');
  const [newBack, setNewBack] = useState<string>('');
  const [checklistText, setChecklistText] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const currentPage = activeBook ? activeBook.current_page : 1;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2000);
  };

  const copySymbol = (sym: string) => {
    navigator.clipboard.writeText(sym);
    showToast(`Copied symbol: ${sym}`);
  };

  const handleStampPage = () => {
    const stamp = `\n**[Page ${currentPage}]** — `;
    updateNotes(currentNotes + stamp, currentPage);
  };

  const handleExportMarkdown = () => {
    if (!activeBook) return;
    const blob = new Blob([currentNotes], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeBook.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-notes.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Exported Markdown notes');
  };

  const handleCreateFlashcard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFront.trim() || !newBack.trim()) return;
    await addFlashcard(newFront, newBack, currentPage);
    setNewFront('');
    setNewBack('');
    setFcSubTab('review');
    setActiveCardIdx(flashcards.length);
    setIsFlipped(false);
    showToast('Flashcard saved to deck');
  };

  // Extract unique [Page X] anchors for quick jump
  const pageMatches = [...currentNotes.matchAll(/\[Page\s+(\d+)\]/gi)];
  const pageAnchors = [...new Set(pageMatches.map((m) => parseInt(m[1], 10)))].sort((a, b) => a - b);

  // Filtered highlights
  const filteredHighlights = highlights.filter(
    (h) => highlightFilter === 'all' || h.color_hex === highlightFilter
  );

  const masteredCount = flashcards.filter((c) => c.is_mastered).length;
  const currentCard = flashcards[activeCardIdx] || null;

  return (
    <aside
      className={`w-[295px] bg-[#FCF8F2] border-l border-[#DFD0BE] flex flex-col shrink-0 z-20 absolute md:relative inset-y-0 right-0 shadow-xl md:shadow-none transition-transform duration-200 ${
        readerRightDockOpen ? 'translate-x-0' : 'translate-x-full md:hidden'
      }`}
    >
      {/* Toast Notification inside dock */}
      {toastMessage && (
        <div className="absolute top-2 left-2 right-2 bg-[#22150E] text-[#F7EFE6] text-xs font-semibold py-1.5 px-3 rounded-lg text-center shadow-lg border border-[#C87A3B]/40 z-30 animate-pulse">
          {toastMessage}
        </div>
      )}

      {/* 4-Tab Bar */}
      <div className="p-2 border-b border-[#DFD0BE] bg-[#F8F2E9] space-y-1.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-[9px] font-bold uppercase tracking-widest text-[#8A6F5C]">
            Study Toolkit
          </span>
          <button
            onClick={toggleReaderRightDock}
            title="Collapse Toolkit Dock"
            className="p-0.5 text-[#8A6F5C] hover:text-[#26170F] rounded"
          >
            <PanelRightClose className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="grid grid-cols-4 gap-1 bg-[#EDE1D2] p-0.5 rounded-lg border border-[#DFD0BE]">
          {(['notes', 'flashcards', 'annotations', 'focus'] as ToolTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveToolTab(tab)}
              className={`py-1 rounded-md text-[11px] capitalize transition-all ${
                activeToolTab === tab
                  ? 'font-bold bg-[#26170F] text-[#FCF8F2] shadow-xs'
                  : 'font-semibold text-[#5E4637] hover:text-[#26170F]'
              }`}
            >
              {tab === 'annotations' ? 'Marks' : tab === 'flashcards' ? 'Cards' : tab === 'focus' ? 'Tools' : 'Notes'}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: NOTES */}
      {activeToolTab === 'notes' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-2.5 py-2 border-b border-[#DFD0BE] bg-[#FCF8F2] flex items-center justify-between gap-1.5">
            <button
              onClick={handleStampPage}
              className="flex items-center gap-1 bg-[#F5EDE3] hover:bg-[#EDE1D2] text-[#7C3222] border border-[#DFD0BE] text-[11px] font-semibold px-2 py-1 rounded-lg transition-colors"
            >
              <Pin className="w-3 h-3" />
              <span>Stamp Page {currentPage}</span>
            </button>

            <div className="flex items-center gap-1.5">
              <span
                className={`text-[10px] font-medium ${
                  notesSaveStatus === 'Saved'
                    ? 'text-[#4F683A]'
                    : notesSaveStatus === 'Saving...'
                    ? 'text-[#C87A3B]'
                    : 'text-[#B54935]'
                }`}
              >
                {notesSaveStatus}
              </span>
              <button
                onClick={handleExportMarkdown}
                title="Export Markdown (.md)"
                className="flex items-center gap-1 bg-[#26170F] hover:bg-[#3B2519] text-[#FCF8F2] text-[11px] font-semibold px-2 py-1 rounded-lg transition-colors"
              >
                <Download className="w-3 h-3" />
                <span>Export .md</span>
              </button>
            </div>
          </div>

          {/* Page-Linked Jump Chips */}
          <div className="px-2.5 py-1.5 bg-[#F8F2E9] border-b border-[#DFD0BE] flex items-center gap-1 overflow-x-auto text-[10px]">
            <span className="text-[#8A6F5C] font-semibold shrink-0">Jump:</span>
            {pageAnchors.length === 0 ? (
              <span className="text-[#8A6F5C] italic">Click Stamp to link pages</span>
            ) : (
              pageAnchors.map((p) => (
                <button
                  key={p}
                  onClick={() => goToPage(p)}
                  className="px-1.5 py-0.5 rounded bg-[#FCF8F2] hover:bg-[#EDE1D2] border border-[#DFD0BE] font-mono font-semibold text-[#7C3222] shrink-0"
                >
                  P.{p}
                </button>
              ))
            )}
          </div>

          <textarea
            value={currentNotes}
            onChange={(e) => updateNotes(e.target.value, currentPage)}
            placeholder="Write page-linked study notes in Markdown... Click 'Stamp Page X' to anchor notes to the active page."
            className="flex-1 w-full p-3 text-xs leading-relaxed text-[#26170F] bg-[#FCF8F2] resize-none focus:outline-none font-sans"
          />
        </div>
      )}

      {/* TAB 2: FLASHCARDS */}
      {activeToolTab === 'flashcards' && (
        <div className="flex-1 flex flex-col overflow-y-auto p-3 space-y-3">
          <div className="flex items-center justify-between bg-[#EDE1D2] p-0.5 rounded-lg border border-[#DFD0BE]">
            <button
              onClick={() => setFcSubTab('review')}
              className={`flex-1 py-1 text-[11px] rounded-md transition-all ${
                fcSubTab === 'review'
                  ? 'font-bold bg-[#FCF8F2] text-[#26170F] shadow-xs'
                  : 'font-semibold text-[#5E4637]'
              }`}
            >
              Review Deck
            </button>
            <button
              onClick={() => setFcSubTab('create')}
              className={`flex-1 py-1 text-[11px] rounded-md transition-all ${
                fcSubTab === 'create'
                  ? 'font-bold bg-[#FCF8F2] text-[#26170F] shadow-xs'
                  : 'font-semibold text-[#5E4637]'
              }`}
            >
              + Add Card
            </button>
          </div>

          {fcSubTab === 'review' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-[#5E4637]">
                  {flashcards.length === 0
                    ? '0 Cards'
                    : `Card ${activeCardIdx + 1} of ${flashcards.length}`}
                </span>
                <span className="font-mono text-[#4F683A] bg-[#4F683A]/10 border border-[#4F683A]/25 px-1.5 py-0.5 rounded">
                  {masteredCount} Mastered
                </span>
              </div>

              {/* 3D Flip Card */}
              {currentCard ? (
                <div
                  className="perspective-1000 h-52 cursor-pointer select-none"
                  onClick={() => setIsFlipped(!isFlipped)}
                >
                  <div
                    className={`preserve-3d relative w-full h-full ${
                      isFlipped ? 'rotate-y-180' : ''
                    }`}
                  >
                    {/* Front */}
                    <div className="backface-hidden absolute inset-0 rounded-xl bg-gradient-to-br from-[#FCF8F2] to-[#F3E7D8] border-2 border-[#DFD0BE] p-4 flex flex-col justify-between shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-[#A85D2A] bg-[#A85D2A]/10 px-1.5 py-0.5 rounded">
                          Prompt
                        </span>
                        <span className="text-[10px] font-mono text-[#8A6F5C]">
                          Page {currentCard.source_page}
                        </span>
                      </div>
                      <p className="font-serif text-sm font-semibold text-[#26170F] text-center leading-snug my-auto">
                        {currentCard.front_md}
                      </p>
                      <div className="text-center text-[10px] text-[#8A6F5C]">
                        Tap to reveal answer
                      </div>
                    </div>

                    {/* Back */}
                    <div className="backface-hidden rotate-y-180 absolute inset-0 rounded-xl bg-gradient-to-br from-[#26170F] to-[#3B2519] text-[#F7EFE6] border-2 border-[#C87A3B]/40 p-4 flex flex-col justify-between shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-[#E09453] bg-[#E09453]/15 px-1.5 py-0.5 rounded">
                          Answer
                        </span>
                        <span className="text-[10px] font-mono text-[#A88E79]">
                          Active Recall
                        </span>
                      </div>
                      <p className="text-xs text-[#F7EFE6] text-center leading-relaxed my-auto">
                        {currentCard.back_md}
                      </p>
                      <div className="text-center text-[10px] text-[#A88E79]">
                        Tap to flip back
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-[#DFD0BE] p-8 text-center text-xs text-[#8A6F5C]">
                  No cards in this deck yet. Switch to "+ Add Card" or highlight text in the reader.
                </div>
              )}

              {/* Navigation & Flip */}
              {currentCard && (
                <>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      onClick={() => {
                        setIsFlipped(false);
                        setActiveCardIdx(
                          (activeCardIdx - 1 + flashcards.length) % flashcards.length
                        );
                      }}
                      className="py-1.5 px-2 rounded-lg bg-[#F5EDE3] hover:bg-[#EDE1D2] border border-[#DFD0BE] text-[11px] font-semibold text-[#26170F]"
                    >
                      ← Prev
                    </button>
                    <button
                      onClick={() => setIsFlipped(!isFlipped)}
                      className="py-1.5 px-2 rounded-lg bg-[#A85D2A] hover:bg-[#BD6B33] text-[11px] font-semibold text-[#FCF8F2]"
                    >
                      Flip
                    </button>
                    <button
                      onClick={() => {
                        setIsFlipped(false);
                        setActiveCardIdx((activeCardIdx + 1) % flashcards.length);
                      }}
                      className="py-1.5 px-2 rounded-lg bg-[#F5EDE3] hover:bg-[#EDE1D2] border border-[#DFD0BE] text-[11px] font-semibold text-[#26170F]"
                    >
                      Next →
                    </button>
                  </div>

                  {/* Spaced Repetition Ratings */}
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#8A6F5C] text-center">
                      Recall Grade:
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      <button
                        onClick={() => reviewCard(currentCard.id, 1)}
                        className="py-1 rounded bg-[#B54935]/15 hover:bg-[#B54935]/25 text-[#B54935] text-[10px] font-bold border border-[#B54935]/30"
                      >
                        Again (1d)
                      </button>
                      <button
                        onClick={() => reviewCard(currentCard.id, 2)}
                        className="py-1 rounded bg-[#C87A3B]/15 hover:bg-[#C87A3B]/25 text-[#C87A3B] text-[10px] font-bold border border-[#C87A3B]/30"
                      >
                        Good ({currentCard.interval_days * 2}d)
                      </button>
                      <button
                        onClick={() => reviewCard(currentCard.id, 3)}
                        className="py-1 rounded bg-[#4F683A]/15 hover:bg-[#4F683A]/25 text-[#4F683A] text-[10px] font-bold border border-[#4F683A]/30"
                      >
                        Easy ({currentCard.interval_days * 3}d)
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() => toggleCardMastered(currentCard.id)}
                    className={`w-full py-2 px-3 rounded-lg border text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      currentCard.is_mastered
                        ? 'border-[#4F683A]/40 bg-[#4F683A]/15 text-[#3D522C]'
                        : 'border-[#DFD0BE] bg-[#F5EDE3] hover:bg-[#EDE1D2] text-[#26170F]'
                    }`}
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>{currentCard.is_mastered ? 'Mastered ✓' : 'Mark as Mastered'}</span>
                  </button>
                </>
              )}
            </div>
          ) : (
            <form onSubmit={handleCreateFlashcard} className="space-y-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-[#5E4637] mb-1">
                  Question / Term (Front)
                </label>
                <textarea
                  value={newFront}
                  onChange={(e) => setNewFront(e.target.value)}
                  rows={3}
                  placeholder="Enter question or concept..."
                  className="w-full rounded-lg bg-[#F5EDE3] border border-[#DFD0BE] p-2 text-xs text-[#26170F] focus:outline-none focus:border-[#C87A3B]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#5E4637] mb-1">
                  Answer / Formula (Back)
                </label>
                <textarea
                  value={newBack}
                  onChange={(e) => setNewBack(e.target.value)}
                  rows={3}
                  placeholder="Enter explanation or proof..."
                  className="w-full rounded-lg bg-[#F5EDE3] border border-[#DFD0BE] p-2 text-xs text-[#26170F] focus:outline-none focus:border-[#C87A3B]"
                />
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] font-mono text-[#8A6F5C]">
                  Linked to Page {currentPage}
                </span>
                <button
                  type="submit"
                  className="bg-[#A85D2A] hover:bg-[#BD6B33] text-[#FCF8F2] text-[11px] font-semibold px-3 py-1.5 rounded-lg"
                >
                  + Save Card
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* TAB 3: MARKS */}
      {activeToolTab === 'annotations' && (
        <div className="flex-1 flex flex-col overflow-y-auto p-3 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#8A6F5C]">
                Bookmarked Pages
              </h4>
              <span className="text-[10px] font-mono font-bold text-[#A85D2A]">
                {bookmarks.length}
              </span>
            </div>
            {bookmarks.length === 0 ? (
              <p className="text-[11px] text-[#8A6F5C] italic">No bookmarked pages yet.</p>
            ) : (
              <div className="space-y-1">
                {bookmarks.map((bm) => (
                  <div
                    key={bm.id}
                    className="flex items-center justify-between bg-[#F5EDE3] border border-[#DFD0BE] rounded-lg px-2.5 py-1.5 text-[11px]"
                  >
                    <button
                      onClick={() => goToPage(bm.page_num)}
                      className="flex items-center gap-1.5 text-left truncate flex-1"
                    >
                      <span className="font-mono font-bold text-[#7C3222]">
                        P.{bm.page_num}
                      </span>
                      <span className="truncate text-[#26170F] font-medium">
                        {bm.title || `Page ${bm.page_num}`}
                      </span>
                    </button>
                    <button
                      onClick={() => toggleBookmarkPage(bm.page_num)}
                      className="text-[#8A6F5C] hover:text-[#B54935] pl-1"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-[#DFD0BE] pt-3 flex-1">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#8A6F5C]">
                Color Highlights
              </h4>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setHighlightFilter('all')}
                  className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                    highlightFilter === 'all'
                      ? 'bg-[#26170F] text-[#FCF8F2]'
                      : 'bg-[#EDE1D2] text-[#26170F]'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setHighlightFilter('amber')}
                  className="w-3 h-3 rounded-full bg-[#E09453]"
                  title="Amber"
                />
                <button
                  onClick={() => setHighlightFilter('terracotta')}
                  className="w-3 h-3 rounded-full bg-[#C45B47]"
                  title="Terracotta"
                />
                <button
                  onClick={() => setHighlightFilter('sage')}
                  className="w-3 h-3 rounded-full bg-[#6B8654]"
                  title="Sage"
                />
                <button
                  onClick={() => setHighlightFilter('slate')}
                  className="w-3 h-3 rounded-full bg-[#5B7C94]"
                  title="Slate"
                />
              </div>
            </div>

            {filteredHighlights.length === 0 ? (
              <p className="text-[11px] text-[#8A6F5C] italic">
                Select text inside the reader to highlight passages.
              </p>
            ) : (
              <div className="space-y-2">
                {filteredHighlights.map((hl) => {
                  const borderMap: Record<string, string> = {
                    amber: 'border-l-[#C87A3B] bg-[#C87A3B]/10',
                    terracotta: 'border-l-[#B54935] bg-[#B54935]/10',
                    sage: 'border-l-[#4F683A] bg-[#4F683A]/10',
                    slate: 'border-l-[#43647D] bg-[#43647D]/10',
                  };
                  return (
                    <div
                      key={hl.id}
                      className={`rounded-lg border border-[#DFD0BE] border-l-4 ${
                        borderMap[hl.color_hex] || borderMap.amber
                      } p-2.5 space-y-1.5`}
                    >
                      <p className="font-serif italic text-xs text-[#26170F] leading-snug">
                        "{hl.selected_text}"
                      </p>
                      <div className="flex items-center justify-between text-[10px] pt-1 border-t border-[#DFD0BE]/70">
                        <button
                          onClick={() => goToPage(hl.page_num)}
                          className="font-mono font-bold text-[#7C3222] hover:underline"
                        >
                          Jump P.{hl.page_num} →
                        </button>
                        <button
                          onClick={() => deleteHighlight(hl.id)}
                          className="text-[#8A6F5C] hover:text-[#B54935]"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: TOOLS */}
      {activeToolTab === 'focus' && (
        <div className="flex-1 flex flex-col overflow-y-auto p-3 space-y-3.5">
          {/* Mini-Grid Stats */}
          <div className="grid grid-cols-3 gap-1.5 text-center">
            <div className="rounded-lg bg-[#F5EDE3] border border-[#DFD0BE] p-2">
              <div className="font-mono text-sm font-bold text-[#7C3222]">
                {highlights.length}
              </div>
              <div className="text-[9px] uppercase tracking-wider text-[#8A6F5C]">
                Highlights
              </div>
            </div>
            <div className="rounded-lg bg-[#F5EDE3] border border-[#DFD0BE] p-2">
              <div className="font-mono text-sm font-bold text-[#4F683A]">
                {masteredCount}
              </div>
              <div className="text-[9px] uppercase tracking-wider text-[#8A6F5C]">
                Mastered
              </div>
            </div>
            <div className="rounded-lg bg-[#F5EDE3] border border-[#DFD0BE] p-2">
              <div className="font-mono text-sm font-bold text-[#A85D2A]">
                {pomodoro.completedSessions}
              </div>
              <div className="text-[9px] uppercase tracking-wider text-[#8A6F5C]">
                Sessions
              </div>
            </div>
          </div>

          {/* Session Checklist */}
          <div className="rounded-xl border border-[#DFD0BE] bg-[#F8F2E9] p-2.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#5E4637]">
                Session Checklist
              </span>
              <button
                onClick={clearCompletedChecklist}
                className="text-[10px] text-[#8A6F5C] hover:text-[#26170F]"
              >
                Clear done
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!checklistText.trim()) return;
                addChecklist(checklistText.trim());
                setChecklistText('');
              }}
              className="flex gap-1"
            >
              <input
                type="text"
                value={checklistText}
                onChange={(e) => setChecklistText(e.target.value)}
                placeholder="Add study goal..."
                className="flex-1 bg-[#FCF8F2] border border-[#DFD0BE] rounded-lg px-2 py-1 text-[11px] focus:outline-none focus:border-[#C87A3B]"
              />
              <button
                type="submit"
                className="bg-[#26170F] text-[#FCF8F2] px-2.5 py-1 rounded-lg text-xs font-bold"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </form>
            <ul className="space-y-1 max-h-36 overflow-y-auto">
              {checklist.length === 0 ? (
                <li className="text-[11px] text-[#8A6F5C] italic">No tasks yet.</li>
              ) : (
                checklist.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-1.5 bg-[#FCF8F2] border border-[#DFD0BE] rounded-lg px-2 py-1 text-[11px]"
                  >
                    <label className="flex items-center gap-1.5 cursor-pointer flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={item.done}
                        onChange={() => toggleChecklist(item.id)}
                        className="accent-[#A85D2A]"
                      />
                      <span
                        className={`truncate ${
                          item.done ? 'line-through text-[#8A6F5C]' : 'text-[#26170F]'
                        }`}
                      >
                        {item.text}
                      </span>
                    </label>
                    <button
                      onClick={() => deleteChecklist(item.id)}
                      className="text-[#8A6F5C] hover:text-[#B54935]"
                    >
                      ×
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>

          {/* Quick Math & CS Symbol Insert Pad */}
          <div className="rounded-xl border border-[#DFD0BE] bg-[#FCF8F2] p-2.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#5E4637]">
                Math & CS Symbol Pad
              </span>
              <span className="text-[9px] text-[#8A6F5C]">Click to copy</span>
            </div>
            <div className="grid grid-cols-5 gap-1">
              {QUICK_SYMBOLS.map((sym) => (
                <button
                  key={sym}
                  onClick={() => copySymbol(sym)}
                  className="py-1.5 px-1 rounded-lg bg-[#F5EDE3] hover:bg-[#EDE1D2] border border-[#DFD0BE] font-mono text-[11px] font-semibold text-[#26170F] text-center truncate transition-colors"
                >
                  {sym}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
