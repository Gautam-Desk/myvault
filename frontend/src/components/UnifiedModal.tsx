import React, { useEffect, useState } from 'react';
import { X, Layers3, Highlighter } from 'lucide-react';
import { useLibraryStore } from '../store/useLibraryStore';
import * as api from '../api/client';
import { Flashcard, Highlight, Note } from '../types';

export const UnifiedModal: React.FC = () => {
  const {
    books,
    unifiedModalMode,
    closeUnifiedModal,
    setActiveDoc,
    goToPage,
  } = useLibraryStore();

  const [allFlashcards, setAllFlashcards] = useState<(Flashcard & { docTitle: string })[]>([]);
  const [allHighlights, setAllHighlights] = useState<(Highlight & { docTitle: string })[]>([]);
  const [allNotes, setAllNotes] = useState<(Note & { docTitle: string })[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!unifiedModalMode) return;
    let isCancelled = false;

    const loadAll = async () => {
      setLoading(true);
      try {
        const fcList: (Flashcard & { docTitle: string })[] = [];
        const hlList: (Highlight & { docTitle: string })[] = [];
        const ntList: (Note & { docTitle: string })[] = [];

        await Promise.all(
          books.map(async (book) => {
            const [fcs, hls, note] = await Promise.all([
              api.fetchFlashcards(book.id).catch(() => []),
              api.fetchHighlights(book.id).catch(() => []),
              api.fetchNotes(book.id).catch(() => null),
            ]);
            fcs.forEach((f) => fcList.push({ ...f, docTitle: book.title }));
            hls.forEach((h) => hlList.push({ ...h, docTitle: book.title }));
            if (note && note.markdown_body?.trim()) {
              ntList.push({ ...note, docTitle: book.title });
            }
          })
        );

        if (!isCancelled) {
          setAllFlashcards(fcList);
          setAllHighlights(hlList);
          setAllNotes(ntList);
        }
      } catch (err) {
        console.error('Failed to load unified modal data:', err);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    loadAll();
    return () => {
      isCancelled = true;
    };
  }, [unifiedModalMode, books]);

  if (!unifiedModalMode) return null;

  const isFlashcards = unifiedModalMode === 'flashcards';

  return (
    <div className="fixed inset-0 z-50 bg-[#190F0A]/70 backdrop-blur-[2px] flex items-center justify-center p-3 sm:p-6">
      <div className="bg-[#FCF8F2] border border-[#DFD0BE] rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in duration-200">
        {/* Header */}
        <div className="px-4 py-3 bg-[#22150E] text-[#F7EFE6] border-b border-[#3B2519] flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isFlashcards ? (
              <Layers3 className="w-4 h-4 text-[#E09453]" />
            ) : (
              <Highlighter className="w-4 h-4 text-[#E09453]" />
            )}
            <h3 className="font-display font-bold text-lg">
              {isFlashcards ? 'Library Flashcard Deck' : 'Unified Notes & Highlights Browser'}
            </h3>
          </div>
          <button
            onClick={closeUnifiedModal}
            className="p-1 rounded-lg text-[#A88E79] hover:text-[#F7EFE6] hover:bg-[#3B2519]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F5EDE3]">
          {loading ? (
            <div className="py-12 text-center text-xs font-mono text-[#8A6F5C] animate-pulse">
              Aggregating scholarship from vault...
            </div>
          ) : isFlashcards ? (
            allFlashcards.length === 0 ? (
              <p className="text-xs text-[#5E4637] text-center py-8">
                No flashcards created in library yet.
              </p>
            ) : (
              allFlashcards.map((c) => (
                <div
                  key={c.id}
                  className="rounded-xl bg-[#FCF8F2] border border-[#DFD0BE] p-3.5 space-y-1.5 shadow-xs"
                >
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-semibold text-[#7C3222] truncate max-w-[320px]">
                      {c.docTitle} • Page {c.source_page || 1}
                    </span>
                    <span
                      className={`font-mono px-1.5 py-0.5 rounded ${
                        c.is_mastered
                          ? 'bg-[#4F683A]/15 text-[#3D522C] font-bold'
                          : 'bg-[#F5EDE3] text-[#8A6F5C]'
                      }`}
                    >
                      {c.is_mastered ? 'Mastered' : 'Review'}
                    </span>
                  </div>
                  <p className="font-serif font-semibold text-sm text-[#26170F]">{c.front_md}</p>
                  <p className="text-xs text-[#5E4637] pt-1 border-t border-[#EDE1D2]">
                    {c.back_md}
                  </p>
                  <div className="pt-1 flex justify-end">
                    <button
                      onClick={() => {
                        closeUnifiedModal();
                        setActiveDoc(c.doc_id, 'flashcards');
                        goToPage(c.source_page);
                      }}
                      className="text-[11px] font-semibold text-[#A85D2A] hover:underline"
                    >
                      Practice in Studio →
                    </button>
                  </div>
                </div>
              ))
            )
          ) : (
            <>
              {allHighlights.map((h) => (
                <div
                  key={h.id}
                  className="rounded-xl bg-[#FCF8F2] border border-[#DFD0BE] p-3.5 space-y-1.5 shadow-xs"
                >
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-bold uppercase tracking-wider text-[#A85D2A]">
                      Highlight • Page {h.page_num}
                    </span>
                    <span className="font-semibold text-[#5E4637] truncate max-w-[200px]">
                      {h.docTitle}
                    </span>
                  </div>
                  <p className="font-serif italic text-sm text-[#26170F]">"{h.selected_text}"</p>
                  <div className="pt-1 flex justify-end">
                    <button
                      onClick={() => {
                        closeUnifiedModal();
                        setActiveDoc(h.doc_id);
                        goToPage(h.page_num);
                      }}
                      className="text-[11px] font-semibold text-[#7C3222] hover:underline"
                    >
                      Jump to Page {h.page_num} →
                    </button>
                  </div>
                </div>
              ))}

              {allNotes.map((n) => (
                <div
                  key={n.id}
                  className="rounded-xl bg-[#FCF8F2] border border-[#DFD0BE] p-3.5 space-y-1.5 shadow-xs"
                >
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-bold uppercase tracking-wider text-[#4F5638]">
                      Study Notebook
                    </span>
                    <span className="font-semibold text-[#5E4637] truncate max-w-[200px]">
                      {n.docTitle}
                    </span>
                  </div>
                  <p className="text-xs text-[#5E4637] whitespace-pre-line line-clamp-4 font-sans">
                    {n.markdown_body}
                  </p>
                  <div className="pt-1 flex justify-end">
                    <button
                      onClick={() => {
                        closeUnifiedModal();
                        setActiveDoc(n.doc_id, 'notes');
                        if (n.page_num) goToPage(n.page_num);
                      }}
                      className="text-[11px] font-semibold text-[#7C3222] hover:underline"
                    >
                      Open Notebook →
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
