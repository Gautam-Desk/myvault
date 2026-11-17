export interface Book {
  id: string;
  title: string;
  author: string;
  category: string;
  shelf: string;
  spine_color: string;
  tags: string[];
  sha256: string;
  rel_path: string;
  thumb_path?: string | null;
  page_count: number;
  current_page: number;
  is_starred: boolean;
  last_opened_at: number;
  file_size: number;
  highlights_count: number;
  flashcards_count: number;
  notes_preview?: string | null;
}

export interface Highlight {
  id: string;
  doc_id: string;
  page_num: number;
  color_hex: string;
  selected_text: string;
  rects_json: string;
  created_at: number;
}

export interface Note {
  id: string;
  doc_id: string;
  page_num?: number | null;
  markdown_body: string;
  updated_at: number;
}

export interface Flashcard {
  id: string;
  doc_id: string;
  source_page: number;
  front_md: string;
  back_md: string;
  ease_factor: number;
  interval_days: number;
  due_at: number;
  is_mastered: boolean;
  doc_title?: string;
}

export interface Bookmark {
  id: string;
  doc_id: string;
  page_num: number;
  title?: string | null;
  created_at: number;
}

export interface SearchResult {
  doc_id: string;
  doc_title: string;
  doc_author: string;
  doc_category: string;
  spine_color: string;
  page_num: number;
  snippet: string;
  rank: number;
}

export interface LibraryStats {
  total_books: number;
  total_highlights: number;
  total_flashcards: number;
  mastered_flashcards: number;
  completed_pomodoros: number;
  total_study_minutes: number;
}

export type ReaderTheme = 'parchment' | 'sepia' | 'espresso';
export type HighlightColor = 'amber' | 'terracotta' | 'sage' | 'slate';
export type ToolTab = 'notes' | 'flashcards' | 'annotations' | 'focus';
export type LibraryScope = 'all' | 'continue' | 'starred';
export type SortOrder = 'recent' | 'title' | 'progress';

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}
