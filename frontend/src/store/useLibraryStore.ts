import { create } from 'zustand';
import {
  Book,
  Highlight,
  Flashcard,
  Bookmark,
  SearchResult,
  LibraryStats,
  ReaderTheme,
  HighlightColor,
  ToolTab,
  LibraryScope,
  SortOrder,
  ChecklistItem,
} from '../types';
import * as api from '../api/client';

interface PomodoroState {
  mode: 'focus' | 'short';
  remainingSeconds: number;
  isRunning: boolean;
  completedSessions: number;
}

interface LibraryStore {
  books: Book[];
  activeDocId: string;
  activeBook: Book | null;
  activeView: 'library' | 'reader';
  libraryScope: LibraryScope;
  selectedCategory: string;
  sortOrder: SortOrder;
  searchQuery: string;
  searchResults: SearchResult[];
  isSearching: boolean;
  unifiedModalMode: 'flashcards' | 'annotations' | null;

  mainSidebarOpen: boolean;
  readerLeftRailOpen: boolean;
  readerRightDockOpen: boolean;
  readerTheme: ReaderTheme;
  appTheme: 'dark' | 'light';
  zoomLevel: string;
  highlightMode: boolean;
  activeHighlightColor: HighlightColor;
  activeToolTab: ToolTab;
  highlightFilter: string;

  highlights: Highlight[];
  currentNotes: string;
  notesSaveStatus: 'Saved' | 'Saving...' | 'Unsaved';
  flashcards: Flashcard[];
  bookmarks: Bookmark[];

  pomodoro: PomodoroState;
  checklist: ChecklistItem[];
  stats: LibraryStats | null;
  uploadProgress: { percent: number; speedMBps: number; filename: string } | null;

  // Actions
  loadBooks: () => Promise<void>;
  setActiveDoc: (id: string, initialTab?: ToolTab) => Promise<void>;
  switchView: (view: 'library' | 'reader') => void;
  setLibraryScope: (scope: LibraryScope) => void;
  setSelectedCategory: (cat: string) => void;
  setSortOrder: (order: SortOrder) => void;
  setSearchQuery: (q: string) => void;
  performSearch: (q: string) => Promise<void>;
  openUnifiedModal: (mode: 'flashcards' | 'annotations') => void;
  closeUnifiedModal: () => void;
  setUploadProgress: (progress: { percent: number; speedMBps: number; filename: string } | null) => void;

  toggleMainSidebar: (force?: boolean) => void;
  toggleReaderLeftRail: () => void;
  toggleReaderRightDock: () => void;
  setReaderTheme: (theme: ReaderTheme) => void;
  toggleAppTheme: () => void;
  setAppTheme: (theme: 'dark' | 'light') => void;
  setZoomLevel: (zoom: string) => void;
  stepZoom: (delta: number) => void;
  toggleHighlightMode: () => void;
  setActiveHighlightColor: (color: HighlightColor) => void;
  setActiveToolTab: (tab: ToolTab) => void;
  setHighlightFilter: (filter: string) => void;

  loadBookDetails: (docId: string) => Promise<void>;
  goToPage: (pageNum: number) => Promise<void>;
  prevPage: () => void;
  nextPage: () => void;
  toggleStar: (docId: string) => Promise<void>;
  deleteBook: (docId: string) => Promise<void>;
  uploadPdf: (file: File) => Promise<Book>;

  addHighlight: (text: string, color?: HighlightColor) => Promise<void>;
  deleteHighlight: (id: string) => Promise<void>;
  updateNotes: (markdown: string, pageNum?: number) => void;
  saveNotesDebounced: (markdown: string, pageNum?: number) => Promise<void>;
  clearNotes: () => Promise<void>;
  addFlashcard: (front: string, back: string, pageNum?: number) => Promise<void>;
  reviewCard: (cardId: string, rating: number) => Promise<void>;
  toggleCardMastered: (cardId: string) => Promise<void>;
  deleteCard: (cardId: string) => Promise<void>;
  toggleBookmarkPage: (pageNum: number) => Promise<void>;

  setPomodoroMode: (mode: 'focus' | 'short') => void;
  togglePomodoro: () => void;
  resetPomodoro: () => void;
  tickPomodoro: () => void;

  addChecklist: (text: string) => void;
  toggleChecklist: (id: string) => void;
  deleteChecklist: (id: string) => void;
  clearCompletedChecklist: () => void;

  loadStats: () => Promise<void>;
}

let notesDebounceTimer: any = null;

const savedTheme = (typeof window !== 'undefined' ? localStorage.getItem('my_vault_theme') : null) as 'dark' | 'light' | null;
const initialAppTheme: 'dark' | 'light' = savedTheme || 'dark';
if (typeof document !== 'undefined') {
  document.documentElement.classList.toggle('dark', initialAppTheme === 'dark');
}

export const useLibraryStore = create<LibraryStore>((set, get) => ({
  books: [],
  activeDocId: 'book-linalg',
  activeBook: null,
  activeView: 'library',
  libraryScope: 'all',
  selectedCategory: 'All Categories',
  sortOrder: 'recent',
  searchQuery: '',
  searchResults: [],
  isSearching: false,
  unifiedModalMode: null,

  mainSidebarOpen: window.innerWidth >= 768,
  readerLeftRailOpen: window.innerWidth >= 768,
  readerRightDockOpen: window.innerWidth >= 1024,
  readerTheme: 'parchment',
  appTheme: initialAppTheme,
  zoomLevel: '1',
  highlightMode: false,
  activeHighlightColor: 'amber',
  activeToolTab: 'notes',
  highlightFilter: 'all',

  highlights: [],
  currentNotes: '',
  notesSaveStatus: 'Saved',
  flashcards: [],
  bookmarks: [],

  pomodoro: {
    mode: 'focus',
    remainingSeconds: 25 * 60,
    isRunning: false,
    completedSessions: 0,
  },
  checklist: [
    { id: 'chk-1', text: 'Highlight key theorems in active chapter', done: false },
    { id: 'chk-2', text: 'Review flashcards before break', done: false },
  ],
  stats: null,
  uploadProgress: null,
  setUploadProgress: (progress) => set({ uploadProgress: progress }),

  loadBooks: async () => {
    try {
      const { libraryScope, selectedCategory, sortOrder } = get();
      const shelf = libraryScope === 'all' ? undefined : libraryScope;
      const cat = selectedCategory === 'All Categories' ? undefined : selectedCategory;
      const books = await api.fetchBooks({ shelf, category: cat, sort: sortOrder });
      set({ books });

      const activeId = get().activeDocId;
      const currentActive = books.find((b) => b.id === activeId) || books[0];
      if (currentActive && (!get().activeBook || get().activeBook?.id !== currentActive.id)) {
        set({ activeBook: currentActive, activeDocId: currentActive.id });
        get().loadBookDetails(currentActive.id);
      }
    } catch (e) {
      console.error('Failed to load books:', e);
    }
  },

  setActiveDoc: async (id: string, initialTab?: ToolTab) => {
    const book = get().books.find((b) => b.id === id);
    if (book) {
      set({
        activeDocId: id,
        activeBook: book,
        activeView: 'reader',
        activeToolTab: initialTab || get().activeToolTab,
      });
      await get().loadBookDetails(id);
    }
  },

  switchView: (view) => set({ activeView: view }),

  setLibraryScope: (scope) => {
    set({ libraryScope: scope, activeView: 'library' });
    get().loadBooks();
  },

  setSelectedCategory: (cat) => {
    set({ selectedCategory: cat, libraryScope: 'all', activeView: 'library' });
    get().loadBooks();
  },

  setSortOrder: (order) => {
    set({ sortOrder: order });
    get().loadBooks();
  },

  setSearchQuery: (q) => {
    set({ searchQuery: q });
    if (q.trim().length >= 2) {
      get().performSearch(q);
    } else {
      set({ searchResults: [], isSearching: false });
    }
  },

  performSearch: async (q) => {
    try {
      set({ isSearching: true });
      const results = await api.searchLibrary(q);
      set({ searchResults: results, isSearching: false });
    } catch (e) {
      set({ isSearching: false });
    }
  },

  openUnifiedModal: (mode) => set({ unifiedModalMode: mode }),
  closeUnifiedModal: () => set({ unifiedModalMode: null }),

  toggleMainSidebar: (force) =>
    set((s) => ({ mainSidebarOpen: typeof force === 'boolean' ? force : !s.mainSidebarOpen })),
  toggleReaderLeftRail: () => set((s) => ({ readerLeftRailOpen: !s.readerLeftRailOpen })),
  toggleReaderRightDock: () => set((s) => ({ readerRightDockOpen: !s.readerRightDockOpen })),
  setReaderTheme: (theme) => set({ readerTheme: theme }),
  toggleAppTheme: () => {
    const next = get().appTheme === 'dark' ? 'light' : 'dark';
    if (typeof window !== 'undefined') {
      localStorage.setItem('my_vault_theme', next);
      document.documentElement.classList.toggle('dark', next === 'dark');
    }
    set({ appTheme: next });
  },
  setAppTheme: (theme) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('my_vault_theme', theme);
      document.documentElement.classList.toggle('dark', theme === 'dark');
    }
    set({ appTheme: theme });
  },
  setZoomLevel: (zoom) => set({ zoomLevel: zoom }),
  stepZoom: (delta) => {
    const presets = ['0.75', '1', '1.25', '1.5'];
    const cur = get().zoomLevel;
    const idx = presets.indexOf(cur);
    if (idx === -1) set({ zoomLevel: '1' });
    else set({ zoomLevel: presets[Math.min(Math.max(0, idx + delta), presets.length - 1)] });
  },

  toggleHighlightMode: () => set((s) => ({ highlightMode: !s.highlightMode })),
  setActiveHighlightColor: (color) => set({ activeHighlightColor: color }),
  setActiveToolTab: (tab) => set({ activeToolTab: tab }),
  setHighlightFilter: (filter) => set({ highlightFilter: filter }),

  loadBookDetails: async (docId: string) => {
    try {
      const [hls, noteObj, fcs, bms] = await Promise.all([
        api.fetchHighlights(docId),
        api.fetchNotes(docId),
        api.fetchFlashcards(docId),
        api.fetchBookmarks(docId),
      ]);
      set({
        highlights: hls,
        currentNotes: noteObj.markdown_body || '',
        flashcards: fcs,
        bookmarks: bms,
        notesSaveStatus: 'Saved',
      });
    } catch (e) {
      console.error('Failed to load book details:', e);
    }
  },

  goToPage: async (pageNum) => {
    const { activeBook } = get();
    if (!activeBook) return;
    const targetPage = Math.min(Math.max(1, pageNum), activeBook.page_count);
    const updated = await api.updateBookProgress(activeBook.id, { current_page: targetPage });
    set({
      activeBook: updated,
      books: get().books.map((b) => (b.id === updated.id ? updated : b)),
    });
  },

  prevPage: () => {
    const { activeBook } = get();
    if (activeBook && activeBook.current_page > 1) {
      get().goToPage(activeBook.current_page - 1);
    }
  },

  nextPage: () => {
    const { activeBook } = get();
    if (activeBook && activeBook.current_page < activeBook.page_count) {
      get().goToPage(activeBook.current_page + 1);
    }
  },

  toggleStar: async (docId) => {
    const book = get().books.find((b) => b.id === docId);
    if (!book) return;
    const updated = await api.updateBookProgress(docId, { is_starred: !book.is_starred });
    set({
      books: get().books.map((b) => (b.id === docId ? updated : b)),
      activeBook: get().activeBook?.id === docId ? updated : get().activeBook,
    });
  },

  deleteBook: async (docId) => {
    try {
      await api.deleteBook(docId);
    } catch (e) {
      console.warn('Backend delete error, applying optimistic local delete:', e);
    }
    const remaining = get().books.filter((b) => b.id !== docId);
    set({ books: remaining });
    if (get().activeDocId === docId) {
      if (remaining.length > 0) {
        await get().setActiveDoc(remaining[0].id);
      } else {
        set({
          activeBook: null,
          activeDocId: '',
          highlights: [],
          currentNotes: '',
          flashcards: [],
          bookmarks: [],
        });
      }
    }
  },

  uploadPdf: async (file) => {
    get().setUploadProgress({ percent: 1, speedMBps: 0, filename: file.name });
    try {
      const newBook = await api.uploadBook(
        file,
        undefined,
        undefined,
        undefined,
        (progress) => {
          get().setUploadProgress({
            percent: progress.percent,
            speedMBps: progress.speedMBps,
            filename: file.name,
          });
        }
      );
      set({ libraryScope: 'all', selectedCategory: 'All Categories' });
      await get().loadBooks();
      set({
        activeDocId: newBook.id,
        activeBook: newBook,
        activeView: 'reader',
      });
      await get().loadBookDetails(newBook.id);
      return newBook;
    } finally {
      setTimeout(() => {
        get().setUploadProgress(null);
      }, 1000);
    }
  },

  addHighlight: async (text, color) => {
    const { activeBook, activeHighlightColor } = get();
    if (!activeBook) return;
    const hlColor = color || activeHighlightColor;
    const created = await api.createHighlight(activeBook.id, {
      page_num: activeBook.current_page,
      color_hex: hlColor,
      selected_text: text,
      rects_json: '[]',
    });
    set({ highlights: [created, ...get().highlights] });
  },

  deleteHighlight: async (id) => {
    try {
      await api.deleteHighlight(id);
    } catch (e) {
      console.warn('Backend highlight delete error:', e);
    }
    set({ highlights: get().highlights.filter((h) => h.id !== id) });
  },

  clearNotes: async () => {
    const { activeBook } = get();
    if (!activeBook) return;
    set({ currentNotes: '', notesSaveStatus: 'Saved' });
    try {
      await api.saveNotes(activeBook.id, '', activeBook.current_page);
    } catch (e) {
      console.warn('Backend clear notes error:', e);
    }
  },

  updateNotes: (markdown, pageNum) => {
    set({ currentNotes: markdown, notesSaveStatus: 'Saving...' });
    get().saveNotesDebounced(markdown, pageNum);
  },

  saveNotesDebounced: async (markdown, pageNum) => {
    clearTimeout(notesDebounceTimer);
    notesDebounceTimer = setTimeout(async () => {
      const { activeBook } = get();
      if (!activeBook) return;
      try {
        await api.saveNotes(activeBook.id, markdown, pageNum || activeBook.current_page);
        set({ notesSaveStatus: 'Saved' });
      } catch (e) {
        set({ notesSaveStatus: 'Unsaved' });
      }
    }, 600);
  },

  addFlashcard: async (front, back, pageNum) => {
    const { activeBook } = get();
    if (!activeBook) return;
    const created = await api.createFlashcard(activeBook.id, {
      front_md: front,
      back_md: back,
      source_page: pageNum || activeBook.current_page,
    });
    set({ flashcards: [...get().flashcards, created] });
  },

  reviewCard: async (cardId, rating) => {
    const updated = await api.reviewFlashcard(cardId, { rating });
    set({
      flashcards: get().flashcards.map((f) => (f.id === cardId ? updated : f)),
    });
  },

  toggleCardMastered: async (cardId) => {
    const card = get().flashcards.find((f) => f.id === cardId);
    if (!card) return;
    const updated = await api.reviewFlashcard(cardId, { is_mastered: !card.is_mastered });
    set({
      flashcards: get().flashcards.map((f) => (f.id === cardId ? updated : f)),
    });
  },

  deleteCard: async (cardId) => {
    try {
      await api.deleteFlashcard(cardId);
    } catch (e) {
      console.warn('Backend card delete error:', e);
    }
    set({ flashcards: get().flashcards.filter((f) => f.id !== cardId) });
  },

  toggleBookmarkPage: async (pageNum) => {
    const { activeBook } = get();
    if (!activeBook) return;
    await api.toggleBookmark(activeBook.id, pageNum);
    const bms = await api.fetchBookmarks(activeBook.id);
    set({ bookmarks: bms });
  },

  setPomodoroMode: (mode) => {
    set({
      pomodoro: {
        ...get().pomodoro,
        mode,
        remainingSeconds: mode === 'focus' ? 25 * 60 : 5 * 60,
        isRunning: false,
      },
    });
  },

  togglePomodoro: () => {
    set((s) => ({
      pomodoro: { ...s.pomodoro, isRunning: !s.pomodoro.isRunning },
    }));
  },

  resetPomodoro: () => {
    const { mode } = get().pomodoro;
    set({
      pomodoro: {
        ...get().pomodoro,
        remainingSeconds: mode === 'focus' ? 25 * 60 : 5 * 60,
        isRunning: false,
      },
    });
  },

  tickPomodoro: () => {
    const { pomodoro, activeDocId } = get();
    if (!pomodoro.isRunning) return;

    if (pomodoro.remainingSeconds > 0) {
      set({
        pomodoro: { ...pomodoro, remainingSeconds: pomodoro.remainingSeconds - 1 },
      });
    } else {
      // Completed session
      const isFocus = pomodoro.mode === 'focus';
      if (isFocus) {
        api.logPomodoro(activeDocId, 1500, 'focus');
      }
      playWarmChimeAudio();
      set({
        pomodoro: {
          ...pomodoro,
          isRunning: false,
          mode: isFocus ? 'short' : 'focus',
          remainingSeconds: isFocus ? 5 * 60 : 25 * 60,
          completedSessions: isFocus ? pomodoro.completedSessions + 1 : pomodoro.completedSessions,
        },
      });
    }
  },

  addChecklist: (text) => {
    set({
      checklist: [...get().checklist, { id: 'chk-' + Date.now(), text, done: false }],
    });
  },

  toggleChecklist: (id) => {
    set({
      checklist: get().checklist.map((c) => (c.id === id ? { ...c, done: !c.done } : c)),
    });
  },

  deleteChecklist: (id) => {
    set({
      checklist: get().checklist.filter((c) => c.id !== id),
    });
  },

  clearCompletedChecklist: () => {
    set({
      checklist: get().checklist.filter((c) => !c.done),
    });
  },

  loadStats: async () => {
    try {
      const stats = await api.fetchStats();
      set({ stats });
    } catch (e) {
      console.error('Failed to load stats:', e);
    }
  },
}));

function playWarmChimeAudio() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    [440, 554.37, 659.25].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.14);
      gain.gain.setValueAtTime(0.08, ctx.currentTime + i * 0.14);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.14 + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.14);
      osc.stop(ctx.currentTime + i * 0.14 + 0.55);
    });
  } catch (e) {}
}
