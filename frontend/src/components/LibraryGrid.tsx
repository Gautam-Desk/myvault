import React from 'react';
import {
  ArrowRight,
  Star,
  Trash2,
  BookX,
} from 'lucide-react';
import { useLibraryStore } from '../store/useLibraryStore';
import { Book, SortOrder } from '../types';
import { getThumbnailUrl } from '../api/client';

export const LibraryGrid: React.FC = () => {
  const [isDragOver, setIsDragOver] = React.useState<boolean>(false);
  const [isUploading, setIsUploading] = React.useState<boolean>(false);
  const dragInputRef = React.useRef<HTMLInputElement>(null);

  const {
    books,
    activeBook,
    libraryScope,
    selectedCategory,
    sortOrder,
    setActiveDoc,
    setLibraryScope,
    setSelectedCategory,
    setSortOrder,
    toggleStar,
    deleteBook,
    uploadPdf,
    uploadProgress,
  } = useLibraryStore();

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf') {
        setIsUploading(true);
        try {
          await uploadPdf(file);
        } catch (err: any) {
          alert(`Failed to upload ${file.name}: ${err.message || 'Please check backend server status.'}`);
        } finally {
          setIsUploading(false);
        }
      }
    }
  };

  const handleManualUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      await uploadPdf(file);
    } catch (err: any) {
      alert(`Failed to upload: ${err.message || 'Check server status.'}`);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const getHeadingTitle = () => {
    if (libraryScope === 'continue') return 'Continue Reading';
    if (libraryScope === 'starred') return 'Starred Volumes';
    if (selectedCategory !== 'All Categories') return selectedCategory;
    return 'All Study Volumes';
  };

  // Continue reading active candidate
  const continueCandidate =
    activeBook ||
    books.find((b) => b.current_page > 1 && b.current_page <= b.page_count) ||
    books[0];

  const continuePage = continueCandidate ? continueCandidate.current_page : 1;
  const continueTotal = continueCandidate ? continueCandidate.page_count : 1;
  const continuePct = Math.round((continuePage / continueTotal) * 100);

  const handleDeleteBook = async (e: React.MouseEvent, docId: string) => {
    e.stopPropagation();
    if (window.confirm('Delete this book from My Vault?')) {
      await deleteBook(docId);
    }
  };

  return (
    <main
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      className="flex-1 overflow-y-auto parchment-canvas p-3.5 sm:p-5 space-y-4 relative"
    >
      <input
        ref={dragInputRef}
        type="file"
        accept="application/pdf"
        onChange={handleManualUpload}
        className="hidden"
      />

      {/* Drag & Drop Visual Overlay */}
      {isDragOver && (
        <div className="absolute inset-4 z-40 bg-[#22150E]/85 border-2 border-dashed border-[#E09453] rounded-2xl flex flex-col items-center justify-center text-[#F7EFE6] backdrop-blur-[2px] pointer-events-none space-y-2">
          <div className="w-12 h-12 rounded-full bg-[#A85D2A] flex items-center justify-center text-[#FCF8F2] shadow-xl">
            <ArrowRight className="w-6 h-6 rotate-90" />
          </div>
          <p className="font-display font-bold text-xl text-[#F7EFE6]">
            Drop PDF here to catalog into My Vault
          </p>
          <p className="text-xs text-[#A88E79]">
            PyMuPDF will automatically extract cover thumbnails, chapters, and FTS text.
          </p>
        </div>
      )}

      {/* High-Speed Upload Progress Indicator */}
      {(isUploading || uploadProgress) && (
        <div className="bg-[#22150E] text-[#F7EFE6] border border-[#E09453] p-3 rounded-xl shadow-xl flex flex-col gap-2 animate-in fade-in duration-150">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-[#F7EFE6] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#E09453] animate-ping" />
              <span>Uploading {uploadProgress?.filename || 'Document'}</span>
            </span>
            <div className="flex items-center gap-2.5 font-mono text-[11px]">
              {uploadProgress?.speedMBps ? (
                <span className="text-[#A88E79]">{uploadProgress.speedMBps} MB/s</span>
              ) : null}
              <span className="font-bold text-[#E09453]">{uploadProgress?.percent || 0}%</span>
            </div>
          </div>
          <div className="w-full h-1.5 bg-[#190F0A] rounded-full overflow-hidden border border-[#3B2519]">
            <div
              className="h-full bg-gradient-to-r from-[#C87A3B] to-[#E09453] transition-all duration-150"
              style={{ width: `${Math.max(5, uploadProgress?.percent || 0)}%` }}
            />
          </div>
          <span className="text-[10px] text-[#A88E79]">
            {uploadProgress?.percent === 100
              ? 'Cataloging: Rendering 240px WebP cover & indexing FTS5 text...'
              : 'Streaming chunks to storage vault at maximum network speed...'}
          </span>
        </div>
      )}
      {/* 72px CONTINUE READING STRIP */}
      {continueCandidate && (
        <section className="h-auto sm:h-[72px] rounded-xl bg-gradient-to-r from-[#2A1911] via-[#3A2216] to-[#26170F] text-[#F7EFE6] border border-[#4F3424] px-3.5 py-2.5 sm:py-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-sm">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mini Hardcover Book Cover with Spine */}
            <div className="w-9 h-12 rounded-md bg-[#FCF8F2] text-[#26170F] flex overflow-hidden shadow-md shrink-0 border border-[#E09453]/30">
              <div
                className="w-1.5 h-full shrink-0"
                style={{ backgroundColor: continueCandidate.spine_color || '#7C3222' }}
              />
              <div className="flex-1 p-1 flex flex-col justify-between bg-gradient-to-br from-[#FCF8F2] to-[#EDE1D2]">
                <div className="w-full h-1 rounded-full bg-[#C87A3B]/60" />
                <span className="text-[7px] font-mono font-bold text-[#5E4637] uppercase">
                  VOL
                </span>
              </div>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono uppercase tracking-widest text-[#E09453] font-semibold">
                  Continue Reading
                </span>
                <span className="text-[10px] font-mono text-[#A88E79]">
                  • Page {continuePage} of {continueTotal}
                </span>
              </div>
              <h2 className="font-display font-bold text-base sm:text-lg text-[#F7EFE6] leading-tight truncate">
                {continueCandidate.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-24 sm:w-32 h-1.5 bg-[#190F0A] rounded-full overflow-hidden border border-[#4F3424]">
                <div
                  className="h-full bg-gradient-to-r from-[#C87A3B] to-[#E09453] rounded-full transition-all"
                  style={{ width: `${continuePct}%` }}
                />
              </div>
              <span className="text-[11px] font-mono font-semibold text-[#E09453]">
                {continuePct}%
              </span>
            </div>

            <button
              onClick={() => setActiveDoc(continueCandidate.id)}
              className="px-3.5 py-1.5 rounded-lg bg-[#A85D2A] hover:bg-[#BD6B33] text-[#FCF8F2] text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer whitespace-nowrap"
            >
              <span>Resume Reading</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </section>
      )}

      {/* Section Header & Active Filter Summary */}
      <div className="flex items-center justify-between gap-2 pt-0.5">
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="font-display font-bold text-xl sm:text-2xl text-[#26170F] dark:text-[#F7EFE6] tracking-tight truncate">
            {getHeadingTitle()}
          </h1>
          <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-[#FCF8F2] dark:bg-[#1C120B] border border-[#DFD0BE] dark:border-[#382417] text-[#5E4637] dark:text-[#D8C7B8] shrink-0">
            {books.length} {books.length === 1 ? 'Volume' : 'Volumes'}
          </span>
        </div>

        {/* Mobile Sort Select */}
        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value as SortOrder)}
          aria-label="Sort Volumes Mobile"
          className="sm:hidden h-[28px] bg-[#FCF8F2] dark:bg-[#20140D] text-[11px] font-semibold text-[#5E4637] dark:text-[#D8C7B8] border border-[#DFD0BE] dark:border-[#382417] rounded-lg px-2 focus:outline-none"
        >
          <option value="recent">Recent</option>
          <option value="title">Title</option>
          <option value="progress">Progress</option>
        </select>
      </div>

      {/* COMPACT HARDCOVER BOOK GRID (minmax(225px, 1fr), 14px gap) */}
      {books.length === 0 ? (
        <div className="col-span-full rounded-xl bg-[#FCF8F2] dark:bg-[#1A100A] border border-dashed border-[#DFD0BE] dark:border-[#382417] p-10 text-center space-y-2.5">
          <BookX className="w-8 h-8 text-[#8A6F5C] dark:text-[#A88E79] mx-auto" />
          <h3 className="font-display font-bold text-lg text-[#26170F] dark:text-[#F7EFE6]">
            No matching volumes on this shelf
          </h3>
          <p className="text-xs text-[#5E4637] dark:text-[#BAA493] max-w-md mx-auto">
            Adjust your filter or upload a new PDF document into My Vault.
          </p>
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              onClick={() => {
                setLibraryScope('all');
                setSelectedCategory('All Categories');
              }}
              className="px-3.5 py-1.5 rounded-lg bg-[#F5EDE3] dark:bg-[#281A12] hover:bg-[#EDE1D2] dark:hover:bg-[#362217] text-[#26170F] dark:text-[#F7EFE6] text-xs font-semibold border border-[#DFD0BE] dark:border-[#382417]"
            >
              Show All Volumes
            </button>
            <button
              onClick={() => dragInputRef.current?.click()}
              className="px-3.5 py-1.5 rounded-lg bg-[#A85D2A] hover:bg-[#BD6B33] text-[#FCF8F2] text-xs font-semibold"
            >
              + Upload PDF
            </button>
          </div>
        </div>
      ) : (
        <section
          className="grid gap-[14px] pb-8"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(225px, 1fr))' }}
        >
          {books.map((doc: Book) => {
            const curr = Math.min(Math.max(1, doc.current_page || 1), doc.page_count);
            const pct = Math.round((curr / doc.page_count) * 100);

            return (
              <article
                key={doc.id}
                onClick={() => setActiveDoc(doc.id)}
                className="book-card rounded-xl flex overflow-hidden cursor-pointer group"
              >
                {/* 6px Embossed Hardcover Book Spine */}
                <div
                  className="book-spine-strip"
                  style={{ backgroundColor: doc.spine_color || '#7C3222' }}
                />

                {/* Card Content (12px 14px padding) */}
                <div className="flex-1 px-[14px] py-[12px] flex flex-col justify-between min-w-0 space-y-2.5">
                  <div className="space-y-1.5">
                    {/* Category Micro-badge & Star Toggle */}
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#F5EDE3] dark:bg-[#281A12] text-[#7C3222] dark:text-[#E09453] border border-[#DFD0BE] dark:border-[#382417] truncate">
                        {doc.category}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleStar(doc.id);
                        }}
                        title={doc.is_starred ? 'Unstar Volume' : 'Star Volume'}
                        className="p-1 rounded-md hover:bg-[#EDE1D2] dark:hover:bg-[#281A12] transition-colors shrink-0"
                      >
                        <Star
                          className={`w-3.5 h-3.5 ${
                            doc.is_starred
                              ? 'text-[#C87A3B] fill-[#C87A3B]'
                              : 'text-[#A88E79]'
                          }`}
                        />
                      </button>
                    </div>

                    {/* 2-Line Serif Title & Author */}
                    <div>
                      <h3 className="font-display font-bold text-[17px] leading-snug text-[#26170F] dark:text-[#F7EFE6] group-hover:text-[#7C3222] dark:group-hover:text-[#E09453] transition-colors line-clamp-2">
                        {doc.title}
                      </h3>
                      <p className="text-[11px] text-[#8A6F5C] dark:text-[#BAA493] truncate mt-0.5">
                        {doc.author}
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar & Quick Actions */}
                  <div className="space-y-2 pt-1.5 border-t border-[#EDE1D2] dark:border-[#2D1A10]">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-mono text-[#5E4637] dark:text-[#BAA493]">
                        <span>
                          Page {curr} of {doc.page_count}
                        </span>
                        <span className="font-bold text-[#7C3222] dark:text-[#E09453]">{pct}%</span>
                      </div>
                      <div className="w-full h-1 bg-[#EDE1D2] dark:bg-[#281A12] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#C87A3B] dark:bg-[#E09453] rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-1 pt-0.5">
                      <div className="flex items-center gap-2 text-[10px] font-mono text-[#8A6F5C] dark:text-[#A88E79]">
                        <span title="Highlights">{doc.highlights_count || 0} hl</span>
                        <span>•</span>
                        <span title="Flashcards">{doc.flashcards_count || 0} fc</span>
                      </div>

                      <div
                        className="flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => setActiveDoc(doc.id, 'notes')}
                          title="Open Study Notes"
                          className="px-2 py-1 rounded-md bg-[#F5EDE3] dark:bg-[#281A12] hover:bg-[#EDE1D2] dark:hover:bg-[#362217] text-[#5E4637] dark:text-[#D8C7B8] border border-[#DFD0BE] dark:border-[#382417] text-[10px] font-semibold transition-colors"
                        >
                          Notes
                        </button>
                        <button
                          onClick={() => setActiveDoc(doc.id)}
                          className="px-2.5 py-1 rounded-md bg-[#26170F] dark:bg-[#A85D2A] hover:bg-[#A85D2A] text-[#FCF8F2] text-[10px] font-semibold transition-colors"
                        >
                          Open Reader
                        </button>
                        <button
                          onClick={(e) => handleDeleteBook(e, doc.id)}
                          title="Delete Volume"
                          className="p-1 rounded-md text-[#8A6F5C] dark:text-[#A88E79] hover:text-[#B54935] hover:bg-[#F5EDE3] dark:hover:bg-[#281A12]"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
};
