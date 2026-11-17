import {
  Book,
  Highlight,
  Note,
  Flashcard,
  Bookmark,
  SearchResult,
  LibraryStats,
} from '../types';

const API_BASE = (import.meta as any).env?.VITE_API_BASE || '';

const FALLBACK_BOOKS: Book[] = [
  {
    id: 'book-linalg',
    title: 'Linear Algebra & Matrix Calculus',
    author: 'Prof. J. Strang & Scholars',
    category: 'Mathematics & Linear Algebra',
    shelf: 'All Volumes',
    spine_color: '#7C3222',
    tags: ['PDF', '6p'],
    sha256: '305d736c410793a7a9243f0059e7733101e54eda977d604b0e90d8cfa28b7090',
    rel_path: 'pdfs/305d736c410793a7a9243f0059e7733101e54eda977d604b0e90d8cfa28b7090.pdf',
    thumb_path: '305d736c410793a7a9243f0059e7733101e54eda977d604b0e90d8cfa28b7090.webp',
    page_count: 6,
    current_page: 3,
    is_starred: true,
    last_opened_at: Date.now(),
    file_size: 22649,
    highlights_count: 5,
    flashcards_count: 3,
    notes_preview: 'Spectral Theorem states that any real symmetric matrix has an orthonormal basis of eigenvectors.',
  },
  {
    id: 'book-dsa',
    title: 'Data Structures & Algorithms Handbook',
    author: 'T. Cormen, C. Leiserson',
    category: 'Computer Science & DSA',
    shelf: 'All Volumes',
    spine_color: '#A85D2A',
    tags: ['PDF', '6p'],
    sha256: '504398cc8fab776adbd77dc4f55beef913a51cb8927a2a834cb20cf1117e5be5',
    rel_path: 'pdfs/504398cc8fab776adbd77dc4f55beef913a51cb8927a2a834cb20cf1117e5be5.pdf',
    thumb_path: '504398cc8fab776adbd77dc4f55beef913a51cb8927a2a834cb20cf1117e5be5.webp',
    page_count: 6,
    current_page: 2,
    is_starred: true,
    last_opened_at: Date.now() - 3600000,
    file_size: 23102,
    highlights_count: 4,
    flashcards_count: 2,
    notes_preview: 'Self-balancing trees guarantee O(log n) worst-case search, insertion, and deletion.',
  },
  {
    id: 'book-ml',
    title: 'Foundations of Machine Learning',
    author: 'C. Bishop & M. Mohri',
    category: 'AI & Machine Learning',
    shelf: 'All Volumes',
    spine_color: '#3B5249',
    tags: ['PDF', '6p'],
    sha256: '89fbb3e14ad98e6ac56743f713c9b8db0698db46e2ba4e0cd74f232e4a6e8d20',
    rel_path: 'pdfs/89fbb3e14ad98e6ac56743f713c9b8db0698db46e2ba4e0cd74f232e4a6e8d20.pdf',
    thumb_path: '89fbb3e14ad98e6ac56743f713c9b8db0698db46e2ba4e0cd74f232e4a6e8d20.webp',
    page_count: 6,
    current_page: 1,
    is_starred: false,
    last_opened_at: Date.now() - 7200000,
    file_size: 21977,
    highlights_count: 3,
    flashcards_count: 1,
    notes_preview: 'Empirical risk minimization with L2 regularization is equivalent to Gaussian prior MAP estimation.',
  },
  {
    id: 'book-os',
    title: 'Operating Systems & Concurrency',
    author: 'A. Tanenbaum & R. Arpaci-Dusseau',
    category: 'Systems & Architecture',
    shelf: 'All Volumes',
    spine_color: '#4A3B52',
    tags: ['PDF', '6p'],
    sha256: '98921987410c4f90ac0ed5a2c849ecaf4042d441bbc79da59dbc70b99672e222',
    rel_path: 'pdfs/98921987410c4f90ac0ed5a2c849ecaf4042d441bbc79da59dbc70b99672e222.pdf',
    thumb_path: '98921987410c4f90ac0ed5a2c849ecaf4042d441bbc79da59dbc70b99672e222.webp',
    page_count: 6,
    current_page: 1,
    is_starred: false,
    last_opened_at: Date.now() - 86400000,
    file_size: 22970,
    highlights_count: 2,
    flashcards_count: 2,
    notes_preview: 'Dijkstra semaphores and mutex condition variables prevent priority inversion.',
  },
];

export async function fetchBooks(params?: {
  shelf?: string;
  category?: string;
  q?: string;
  sort?: string;
}): Promise<Book[]> {
  try {
    const query = new URLSearchParams();
    if (params?.shelf) query.set('shelf', params.shelf);
    if (params?.category) query.set('category', params.category);
    if (params?.q) query.set('q', params.q);
    if (params?.sort) query.set('sort', params.sort);

    const res = await fetch(`${API_BASE}/api/books?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch books');
    return await res.json();
  } catch (err) {
    // Cloud / Vercel preview fallback
    let list = [...FALLBACK_BOOKS];
    if (params?.category && params.category !== 'All Categories') {
      list = list.filter((b) => b.category === params.category);
    }
    if (params?.shelf === 'starred') {
      list = list.filter((b) => b.is_starred);
    } else if (params?.shelf === 'continue') {
      list = list.filter((b) => b.current_page > 1);
    }
    return list;
  }
}

export async function fetchBook(id: string): Promise<Book> {
  try {
    const res = await fetch(`${API_BASE}/api/books/${id}`);
    if (!res.ok) throw new Error('Failed to fetch book');
    return await res.json();
  } catch {
    const found = FALLBACK_BOOKS.find((b) => b.id === id);
    if (found) return found;
    return FALLBACK_BOOKS[0];
  }
}

export async function uploadBook(file: File, category?: string, shelf?: string, spineColor?: string): Promise<Book> {
  const formData = new FormData();
  formData.append('file', file);
  if (category) formData.append('category', category);
  if (shelf) formData.append('shelf', shelf);
  if (spineColor) formData.append('spine_color', spineColor);

  const res = await fetch(`${API_BASE}/api/books/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const err = await res.json();
      msg = err.detail || JSON.stringify(err);
    } catch {
      const txt = await res.text();
      if (txt) msg = txt;
    }
    throw new Error(`Upload failed: ${msg}`);
  }
  return res.json();
}

export async function deleteBook(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/books/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Delete failed');
}

export async function updateBookProgress(
  id: string,
  update: { current_page?: number; is_starred?: boolean; shelf?: string; category?: string }
): Promise<Book> {
  const res = await fetch(`${API_BASE}/api/books/${id}/progress`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(update),
  });
  if (!res.ok) throw new Error('Update progress failed');
  return res.json();
}

// Highlights
export async function fetchHighlights(docId: string): Promise<Highlight[]> {
  try {
    const res = await fetch(`${API_BASE}/api/books/${docId}/highlights`);
    if (!res.ok) throw new Error('Failed to fetch highlights');
    return await res.json();
  } catch {
    return [
      {
        id: 'hl-demo-1',
        doc_id: docId,
        page_num: 2,
        color_hex: '#C87A3B',
        selected_text: 'The column space col(A) is orthogonal to the left nullspace null(A^T).',
        rects_json: '[]',
        created_at: Date.now() - 3600000,
      },
      {
        id: 'hl-demo-2',
        doc_id: docId,
        page_num: 3,
        color_hex: '#4F683A',
        selected_text: 'Every real symmetric matrix A admits an orthonormal basis of eigenvectors.',
        rects_json: '[]',
        created_at: Date.now() - 1800000,
      },
    ];
  }
}

export async function createHighlight(
  docId: string,
  highlight: { page_num: number; color_hex: string; selected_text: string; rects_json?: string }
): Promise<Highlight> {
  try {
    const res = await fetch(`${API_BASE}/api/books/${docId}/highlights`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(highlight),
    });
    if (!res.ok) throw new Error('Failed to create highlight');
    return await res.json();
  } catch {
    return {
      id: `hl_${Date.now()}`,
      doc_id: docId,
      page_num: highlight.page_num,
      color_hex: highlight.color_hex,
      selected_text: highlight.selected_text,
      rects_json: highlight.rects_json || '[]',
      created_at: Date.now(),
    };
  }
}

export async function deleteHighlight(id: string): Promise<void> {
  try {
    const res = await fetch(`${API_BASE}/api/highlights/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete highlight');
  } catch {
    // Offline simulated delete
  }
}

// Notes
export async function fetchNotes(docId: string): Promise<Note> {
  try {
    const res = await fetch(`${API_BASE}/api/books/${docId}/notes`);
    if (!res.ok) throw new Error('Failed to fetch notes');
    return await res.json();
  } catch {
    return {
      id: `note_${docId}`,
      doc_id: docId,
      page_num: 3,
      markdown_body: `## Chapter Study Notes & Theorems\n\n- [Page 1](#): **Fundamental Subspaces**\n  - Rank-Nullity Theorem: $dim(col(A)) + dim(null(A)) = n$\n\n- [Page 3](#): **Spectral Decomposition**\n  - For symmetric $A$: $A = Q \\Lambda Q^T$\n  - All eigenvalues $\\lambda_i \\in \\mathbb{R}$\n\n> *Key Insight*: Positive definite matrices yield strictly positive eigenvalues and define valid Riemannian metrics.`,
      updated_at: Date.now(),
    };
  }
}

export async function saveNotes(docId: string, markdown_body: string, page_num?: number): Promise<Note> {
  try {
    const res = await fetch(`${API_BASE}/api/books/${docId}/notes`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markdown_body, page_num }),
    });
    if (!res.ok) throw new Error('Failed to save notes');
    return await res.json();
  } catch {
    return {
      id: `note_${docId}`,
      doc_id: docId,
      page_num: page_num || 1,
      markdown_body,
      updated_at: Date.now(),
    };
  }
}

// Flashcards
export async function fetchFlashcards(docId: string): Promise<Flashcard[]> {
  try {
    const res = await fetch(`${API_BASE}/api/books/${docId}/flashcards`);
    if (!res.ok) throw new Error('Failed to fetch flashcards');
    return await res.json();
  } catch {
    return [
      {
        id: 'fc-1',
        doc_id: docId,
        source_page: 3,
        front_md: 'State the Spectral Theorem for Real Symmetric Matrices.',
        back_md: 'Every real symmetric matrix A can be factorized as A = Q Lambda Q^T where Q is orthonormal and Lambda contains real eigenvalues.',
        ease_factor: 2.5,
        interval_days: 3,
        due_at: Date.now() + 86400000,
        is_mastered: true,
      },
      {
        id: 'fc-2',
        doc_id: docId,
        source_page: 4,
        front_md: 'What are the singular values of matrix A?',
        back_md: 'The singular values sigma_i are the square roots of the non-negative eigenvalues of A^T A.',
        ease_factor: 2.5,
        interval_days: 1,
        due_at: Date.now(),
        is_mastered: false,
      },
    ];
  }
}

export async function createFlashcard(
  docId: string,
  card: { source_page?: number; front_md: string; back_md: string }
): Promise<Flashcard> {
  try {
    const res = await fetch(`${API_BASE}/api/books/${docId}/flashcards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(card),
    });
    if (!res.ok) throw new Error('Failed to create flashcard');
    return await res.json();
  } catch {
    return {
      id: `fc_${Date.now()}`,
      doc_id: docId,
      source_page: card.source_page || 1,
      front_md: card.front_md,
      back_md: card.back_md,
      ease_factor: 2.5,
      interval_days: 1,
      due_at: Date.now(),
      is_mastered: false,
    };
  }
}

export async function reviewFlashcard(
  cardId: string,
  update: { rating?: number; is_mastered?: boolean; front_md?: string; back_md?: string }
): Promise<Flashcard> {
  try {
    const res = await fetch(`${API_BASE}/api/flashcards/${cardId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update),
    });
    if (!res.ok) throw new Error('Failed to review flashcard');
    return await res.json();
  } catch {
    return {
      id: cardId,
      doc_id: 'book-linalg',
      source_page: 1,
      front_md: update.front_md || 'Front',
      back_md: update.back_md || 'Back',
      ease_factor: 2.5,
      interval_days: 3,
      due_at: Date.now() + 259200000,
      is_mastered: update.is_mastered !== undefined ? update.is_mastered : true,
    };
  }
}

export async function deleteFlashcard(cardId: string): Promise<void> {
  try {
    const res = await fetch(`${API_BASE}/api/flashcards/${cardId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete flashcard');
  } catch {
    // Offline simulated delete
  }
}

// Bookmarks
export async function fetchBookmarks(docId: string): Promise<Bookmark[]> {
  const res = await fetch(`${API_BASE}/api/books/${docId}/bookmarks`);
  if (!res.ok) throw new Error('Failed to fetch bookmarks');
  return res.json();
}

export async function toggleBookmark(docId: string, page_num: number, title?: string): Promise<Bookmark> {
  const res = await fetch(`${API_BASE}/api/books/${docId}/bookmarks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ page_num, title }),
  });
  if (!res.ok) throw new Error('Failed to toggle bookmark');
  return res.json();
}

// Search
export async function searchLibrary(q: string): Promise<SearchResult[]> {
  const res = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(q)}`);
  if (!res.ok) throw new Error('Search failed');
  return res.json();
}

// Stats & Pomodoro
export async function logPomodoro(docId?: string, durationSeconds: number = 1500, mode: string = 'focus'): Promise<void> {
  await fetch(`${API_BASE}/api/pomodoro/log`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ doc_id: docId, duration_seconds: durationSeconds, mode }),
  });
}

export async function fetchStats(): Promise<LibraryStats> {
  const res = await fetch(`${API_BASE}/api/stats`);
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
}

export function getPdfStreamUrl(docId: string): string {
  return `${API_BASE}/api/books/${docId}/stream`;
}

export function getThumbnailUrl(thumbPath?: string | null): string {
  if (!thumbPath) return '';
  return `${API_BASE}/vault/thumbnails/${thumbPath}`;
}
