import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import {
  ListTree,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  Highlighter,
  Bookmark as BookmarkIcon,
  PanelRight,
  PanelLeftClose,
} from 'lucide-react';
import { useLibraryStore } from '../store/useLibraryStore';
import { getPdfStreamUrl } from '../api/client';
import { SelectionPopover } from './SelectionPopover';
import { StudyTools } from './StudyTools';
import { HighlightColor, ReaderTheme } from '../types';

// Setup PDF.js worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

export const PdfStudio: React.FC = () => {
  const {
    books,
    activeBook,
    activeDocId,
    readerLeftRailOpen,
    readerRightDockOpen,
    readerTheme,
    zoomLevel,
    highlightMode,
    activeHighlightColor,
    highlights,
    bookmarks,
    setActiveDoc,
    toggleReaderLeftRail,
    toggleReaderRightDock,
    setReaderTheme,
    setZoomLevel,
    stepZoom,
    toggleHighlightMode,
    setActiveHighlightColor,
    goToPage,
    prevPage,
    nextPage,
    toggleBookmarkPage,
    addHighlight,
  } = useLibraryStore();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [renderLoading, setRenderLoading] = useState<boolean>(false);
  const [selectedText, setSelectedText] = useState<string>('');
  const [popoverPos, setPopoverPos] = useState<{ x: number; y: number } | null>(null);

  const currentPage = activeBook ? activeBook.current_page : 1;
  const totalPages = activeBook ? activeBook.page_count : 1;
  const isBookmarked = bookmarks.some((b) => b.page_num === currentPage);

  // Load PDF Document Proxy when activeBook changes
  useEffect(() => {
    if (!activeBook) return;
    let isCancelled = false;
    const streamUrl = getPdfStreamUrl(activeBook.id);

    const loadDoc = async () => {
      try {
        setRenderLoading(true);
        const loadingTask = pdfjsLib.getDocument({
          url: streamUrl,
          cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
          cMapPacked: true,
        });
        const doc = await loadingTask.promise;
        if (!isCancelled) {
          setPdfDoc(doc);
        }
      } catch (err) {
        console.error('Error loading PDF document:', err);
      } finally {
        if (!isCancelled) setRenderLoading(false);
      }
    };

    loadDoc();
    return () => {
      isCancelled = true;
    };
  }, [activeBook?.id]);

  // Render Page with high-DPI Canvas & TextLayer
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current || !containerRef.current || !textLayerRef.current) return;
    let renderTask: any = null;
    let isCancelled = false;

    const renderPage = async () => {
      try {
        const page = await pdfDoc.getPage(currentPage);
        if (isCancelled) return;

        const unscaledViewport = page.getViewport({ scale: 1.0 });
        let scale = 1.25;

        if (zoomLevel === 'fit') {
          const availWidth = (viewportRef.current?.clientWidth || 800) - 64;
          scale = Math.min(2.5, Math.max(0.75, availWidth / unscaledViewport.width));
        } else {
          scale = (parseFloat(zoomLevel) || 1.0) * 1.25;
        }

        const viewport = page.getViewport({ scale });
        const dpr = window.devicePixelRatio || 1;

        const canvas = canvasRef.current;
        const textLayer = textLayerRef.current;
        const wrapper = containerRef.current;
        if (!canvas || !textLayer || !wrapper) return;

        const cssWidth = Math.floor(viewport.width);
        const cssHeight = Math.floor(viewport.height);

        wrapper.style.width = `${cssWidth}px`;
        wrapper.style.height = `${cssHeight}px`;

        canvas.width = Math.floor(cssWidth * dpr);
        canvas.height = Math.floor(cssHeight * dpr);
        canvas.style.width = `${cssWidth}px`;
        canvas.style.height = `${cssHeight}px`;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        renderTask = page.render({
          canvasContext: ctx,
          viewport: viewport,
          transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null,
        });

        await renderTask.promise;
        if (isCancelled) return;

        // Render native text selection layer
        textLayer.innerHTML = '';
        textLayer.style.width = `${cssWidth}px`;
        textLayer.style.height = `${cssHeight}px`;
        textLayer.style.setProperty('--scale-factor', `${viewport.scale}`);

        const textContent = await page.getTextContent();
        if (isCancelled) return;

        if (pdfjsLib.renderTextLayer) {
          pdfjsLib.renderTextLayer({
            textContentSource: textContent,
            container: textLayer,
            viewport: viewport,
            textDivs: [],
          });
        }
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error('Error rendering page:', err);
        }
      }
    };

    renderPage();
    return () => {
      isCancelled = true;
      if (renderTask) {
        try {
          renderTask.cancel();
        } catch (e) {}
      }
    };
  }, [pdfDoc, currentPage, zoomLevel]);

  // Handle Text Selection in Document Viewport
  const handleMouseUp = () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) {
      setPopoverPos(null);
      setSelectedText('');
      return;
    }
    const text = sel.toString().trim();
    if (text.length < 2) {
      setPopoverPos(null);
      return;
    }

    if (highlightMode) {
      addHighlight(text, activeHighlightColor);
      sel.removeAllRanges();
      return;
    }

    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    setSelectedText(text);
    const popW = 240;
    const left = Math.min(Math.max(10, rect.left + rect.width / 2 - popW / 2), window.innerWidth - popW - 10);
    const top = Math.max(54, rect.top - 44);
    setPopoverPos({ x: left, y: top });
  };

  const pageHighlights = highlights.filter((h) => h.page_num === currentPage);

  return (
    <section className="flex-1 flex overflow-hidden relative">
      {/* PANE 1: LEFT OUTLINE & THUMBNAILS RAIL (172px wide) */}
      <aside
        className={`w-[172px] bg-[#F8F2E9] border-r border-[#DFD0BE] flex flex-col shrink-0 z-20 absolute md:relative inset-y-0 left-0 shadow-lg md:shadow-none transition-transform duration-200 ${
          readerLeftRailOpen ? 'translate-x-0' : '-translate-x-full md:hidden'
        }`}
      >
        {/* Document Switcher */}
        <div className="p-2 border-b border-[#DFD0BE] bg-[#F3E9DC] space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold uppercase tracking-widest text-[#8A6F5C]">
              Outline & Pages
            </span>
            <button
              onClick={toggleReaderLeftRail}
              title="Hide Outline Rail"
              className="p-0.5 text-[#8A6F5C] hover:text-[#26170F] rounded"
            >
              <PanelLeftClose className="w-3.5 h-3.5" />
            </button>
          </div>
          <select
            value={activeDocId}
            onChange={(e) => setActiveDoc(e.target.value)}
            className="w-full text-[11px] font-semibold text-[#26170F] bg-[#FCF8F2] border border-[#DFD0BE] rounded-lg px-2 py-1 focus:outline-none focus:border-[#C87A3B] truncate"
          >
            {books.map((b) => (
              <option key={b.id} value={b.id}>
                {b.title}
              </option>
            ))}
          </select>
        </div>

        {/* Saved Bookmarks Strip */}
        <div className="p-2 border-b border-[#DFD0BE] bg-[#FCF8F2]/70">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] font-bold uppercase tracking-wider text-[#5E4637] flex items-center gap-1">
              <BookmarkIcon className="w-2.5 h-2.5 text-[#A85D2A]" /> Bookmarks
            </span>
            <span className="text-[10px] font-mono font-bold text-[#A85D2A]">
              {bookmarks.length}
            </span>
          </div>
          <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
            {bookmarks.length === 0 ? (
              <span className="text-[10px] text-[#8A6F5C] italic">None saved</span>
            ) : (
              bookmarks.map((bm) => (
                <button
                  key={bm.id}
                  onClick={() => goToPage(bm.page_num)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold transition-colors ${
                    currentPage === bm.page_num
                      ? 'bg-[#7C3222] text-[#FCF8F2]'
                      : 'bg-[#F5EDE3] text-[#7C3222] border border-[#DFD0BE] hover:bg-[#EDE1D2]'
                  }`}
                >
                  P.{bm.page_num}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Clickable Page Thumbnails */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pNum) => {
            const isActive = currentPage === pNum;
            return (
              <button
                key={pNum}
                onClick={() => goToPage(pNum)}
                className={`w-full text-left p-2 rounded-lg border transition-all flex items-start gap-2 ${
                  isActive
                    ? 'bg-[#FCF8F2] border-[#C87A3B] ring-1 ring-[#C87A3B]/40 shadow-xs'
                    : 'bg-[#FCF8F2]/65 border-[#DFD0BE] hover:bg-[#FCF8F2]'
                }`}
              >
                <div
                  className={`w-7 h-9 rounded border ${
                    isActive
                      ? 'border-[#C87A3B] bg-[#F5EDE3]'
                      : 'border-[#DFD0BE] bg-[#F8F2E9]'
                  } flex flex-col justify-between p-1 shrink-0`}
                >
                  <span
                    className={`text-[8px] font-mono font-bold ${
                      isActive ? 'text-[#7C3222]' : 'text-[#8A6F5C]'
                    }`}
                  >
                    {pNum}
                  </span>
                  <div className="space-y-0.5">
                    <div className="h-0.5 w-full bg-[#C8B5A2]" />
                    <div className="h-0.5 w-2/3 bg-[#DFD0BE]" />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <span
                    className={`text-[9px] font-mono uppercase ${
                      isActive ? 'text-[#A85D2A] font-bold' : 'text-[#8A6F5C]'
                    }`}
                  >
                    Page {pNum}
                  </span>
                  <p className="text-[11px] font-semibold text-[#26170F] line-clamp-1 leading-tight mt-0.5">
                    Folio {pNum}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* PANE 2: CENTER HIGH-DPI READER */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#EDE1D2] relative">
        {/* COMPACT READER TOOLBAR (42px) */}
        <div className="h-[42px] bg-[#FCF8F2] border-b border-[#DFD0BE] px-2.5 flex items-center justify-between gap-1.5 shrink-0 z-10 overflow-x-auto">
          {/* Left: Rail Toggle & Page Nav */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={toggleReaderLeftRail}
              title="Toggle Page Outline Rail"
              className="p-1.5 rounded-lg text-[#5E4637] hover:text-[#26170F] hover:bg-[#EDE1D2] border border-[#DFD0BE] transition-colors"
            >
              <ListTree className="w-3.5 h-3.5" />
            </button>

            <div className="flex items-center bg-[#F5EDE3] rounded-lg p-0.5 border border-[#DFD0BE]">
              <button
                onClick={prevPage}
                disabled={currentPage <= 1}
                title="Previous Page"
                className="p-1 rounded text-[#26170F] hover:bg-[#FCF8F2] disabled:opacity-35 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="px-2 text-[11px] font-mono font-semibold text-[#26170F] whitespace-nowrap">
                Page {currentPage} / {totalPages}
              </span>
              <button
                onClick={nextPage}
                disabled={currentPage >= totalPages}
                title="Next Page"
                className="p-1 rounded text-[#26170F] hover:bg-[#FCF8F2] disabled:opacity-35 transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Center: Zoom Controls & 3 Scholarly Themes */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="flex items-center bg-[#F5EDE3] rounded-lg p-0.5 border border-[#DFD0BE]">
              <button
                onClick={() => stepZoom(-1)}
                title="Zoom Out"
                className="p-1 rounded text-[#5E4637] hover:bg-[#FCF8F2]"
              >
                <Minus className="w-3 h-3" />
              </button>
              <select
                value={zoomLevel}
                onChange={(e) => setZoomLevel(e.target.value)}
                aria-label="Zoom Level"
                className="bg-transparent text-[11px] font-mono font-semibold text-[#26170F] px-1 focus:outline-none cursor-pointer"
              >
                <option value="0.75">75%</option>
                <option value="1">100%</option>
                <option value="1.25">125%</option>
                <option value="1.5">150%</option>
                <option value="fit">Fit</option>
              </select>
              <button
                onClick={() => stepZoom(1)}
                title="Zoom In"
                className="p-1 rounded text-[#5E4637] hover:bg-[#FCF8F2]"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>

            {/* 3 Scholarly Themes */}
            <div className="hidden sm:flex items-center bg-[#F5EDE3] rounded-lg p-0.5 border border-[#DFD0BE]">
              <button
                onClick={() => setReaderTheme('parchment')}
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] transition-all ${
                  readerTheme === 'parchment'
                    ? 'font-bold bg-[#26170F] text-[#FCF8F2]'
                    : 'font-medium text-[#5E4637] hover:text-[#26170F]'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-[#FCF8F2] border border-[#8A6F5C]" />
                <span className="hidden xl:inline">Parchment</span>
              </button>
              <button
                onClick={() => setReaderTheme('sepia')}
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] transition-all ${
                  readerTheme === 'sepia'
                    ? 'font-bold bg-[#26170F] text-[#FCF8F2]'
                    : 'font-medium text-[#5E4637] hover:text-[#26170F]'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-[#E8D5B5] border border-[#7C3222]/50" />
                <span className="hidden xl:inline">Sepia</span>
              </button>
              <button
                onClick={() => setReaderTheme('espresso')}
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] transition-all ${
                  readerTheme === 'espresso'
                    ? 'font-bold bg-[#26170F] text-[#FCF8F2]'
                    : 'font-medium text-[#5E4637] hover:text-[#26170F]'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-[#231710] border border-[#A88E79]" />
                <span className="hidden xl:inline">Espresso</span>
              </button>
            </div>
          </div>

          {/* Right: Brush + 4 Swatches, Bookmark, Dock Toggle */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="flex items-center bg-[#F5EDE3] rounded-lg p-0.5 border border-[#DFD0BE] gap-1">
              <button
                onClick={toggleHighlightMode}
                title="Toggle Instant Highlight Brush"
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] transition-all ${
                  highlightMode
                    ? 'font-bold bg-[#C87A3B] text-[#FCF8F2]'
                    : 'font-semibold text-[#5E4637] hover:text-[#26170F]'
                }`}
              >
                <Highlighter className="w-3 h-3" />
                <span className="hidden lg:inline">Brush</span>
              </button>
              <div className="flex items-center gap-1 px-1 border-l border-[#DFD0BE]">
                {(['amber', 'terracotta', 'sage', 'slate'] as HighlightColor[]).map((c) => {
                  const bgClass =
                    c === 'amber'
                      ? 'bg-[#E09453]'
                      : c === 'terracotta'
                      ? 'bg-[#C45B47]'
                      : c === 'sage'
                      ? 'bg-[#6B8654]'
                      : 'bg-[#5B7C94]';
                  return (
                    <button
                      key={c}
                      onClick={() => setActiveHighlightColor(c)}
                      title={c}
                      className={`w-3.5 h-3.5 rounded-full ${bgClass} transition-transform hover:scale-110 ${
                        activeHighlightColor === c ? 'ring-2 ring-[#26170F] scale-110' : ''
                      }`}
                    />
                  );
                })}
              </div>
            </div>

            <button
              onClick={() => toggleBookmarkPage(currentPage)}
              title={isBookmarked ? 'Remove Bookmark' : 'Bookmark Page'}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] border transition-all ${
                isBookmarked
                  ? 'font-bold bg-[#7C3222] text-[#FCF8F2] border-[#7C3222]'
                  : 'font-semibold bg-[#F5EDE3] text-[#5E4637] hover:text-[#26170F] border-[#DFD0BE]'
              }`}
            >
              <BookmarkIcon className="w-3 h-3" />
              <span className="hidden md:inline">{isBookmarked ? 'Marked' : 'Mark'}</span>
            </button>

            <button
              onClick={toggleReaderRightDock}
              title="Toggle Study Toolkit Dock"
              className="p-1.5 rounded-lg text-[#5E4637] hover:text-[#26170F] hover:bg-[#EDE1D2] border border-[#DFD0BE] transition-colors"
            >
              <PanelRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Reader Scrollable Viewport */}
        <div
          ref={viewportRef}
          onMouseUp={handleMouseUp}
          className={`flex-1 overflow-auto p-4 sm:p-6 flex justify-center items-start reader-stage-${readerTheme} transition-colors duration-200 relative`}
        >
          <div
            className={`reader-sheet-${readerTheme} rounded-xl transition-all duration-200 max-w-full p-2 sm:p-3 relative select-text`}
          >
            {renderLoading && (
              <div className="absolute inset-0 bg-[#FCF8F2]/60 backdrop-blur-[1px] flex items-center justify-center z-30">
                <span className="text-xs font-mono text-[#7C3222] animate-pulse">
                  Rendering High-DPI Page...
                </span>
              </div>
            )}
            <div
              ref={containerRef}
              className="pdf-page-wrapper rounded overflow-hidden relative shadow-sm"
            >
              <canvas ref={canvasRef} />
              <div ref={textLayerRef} className="textLayer" />

              {/* Render Saved Highlights Overlay */}
              {pageHighlights.map((hl) => (
                <div
                  key={hl.id}
                  title={`Highlight: "${hl.selected_text}"`}
                  className="pointer-events-none"
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* PANE 3: RIGHT STUDY TOOLKIT DOCK (295px wide) */}
      <StudyTools />

      {/* Floating Selection Popover */}
      {popoverPos && (
        <SelectionPopover
          position={popoverPos}
          selectedText={selectedText}
          onClose={() => setPopoverPos(null)}
        />
      )}
    </section>
  );
};
