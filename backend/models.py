from typing import List, Optional
from pydantic import BaseModel, Field


# --- Document Models ---
class DocumentBase(BaseModel):
    title: str
    author: Optional[str] = "Unknown Scholar"
    category: Optional[str] = "Uncategorized"
    shelf: Optional[str] = "All Volumes"
    spine_color: Optional[str] = "#7C3222"
    tags: Optional[List[str]] = []


class DocumentCreate(DocumentBase):
    pass


class DocumentProgressUpdate(BaseModel):
    current_page: Optional[int] = None
    is_starred: Optional[bool] = None
    shelf: Optional[str] = None
    category: Optional[str] = None


class DocumentResponse(DocumentBase):
    id: str
    sha256: str
    rel_path: str
    thumb_path: Optional[str] = None
    page_count: int
    current_page: int
    is_starred: bool
    last_opened_at: int
    file_size: int
    tags: List[str] = []
    highlights_count: int = 0
    flashcards_count: int = 0
    notes_preview: Optional[str] = None


# --- Highlight Models ---
class HighlightCreate(BaseModel):
    page_num: int
    color_hex: str
    selected_text: str
    rects_json: Optional[str] = "[]"


class HighlightResponse(BaseModel):
    id: str
    doc_id: str
    page_num: int
    color_hex: str
    selected_text: str
    rects_json: str
    created_at: int


# --- Notes Models ---
class NoteUpsert(BaseModel):
    markdown_body: str
    page_num: Optional[int] = None


class NoteResponse(BaseModel):
    id: str
    doc_id: str
    page_num: Optional[int] = None
    markdown_body: str
    updated_at: int


# --- Flashcard Models ---
class FlashcardCreate(BaseModel):
    source_page: Optional[int] = 1
    front_md: str
    back_md: str


class FlashcardReviewUpdate(BaseModel):
    # Rating: 1 = Again, 2 = Good, 3 = Easy
    rating: Optional[int] = None
    is_mastered: Optional[bool] = None
    front_md: Optional[str] = None
    back_md: Optional[str] = None


class FlashcardResponse(BaseModel):
    id: str
    doc_id: str
    source_page: int
    front_md: str
    back_md: str
    ease_factor: float
    interval_days: int
    due_at: int
    is_mastered: bool


# --- Bookmark Models ---
class BookmarkCreate(BaseModel):
    page_num: int
    title: Optional[str] = None


class BookmarkResponse(BaseModel):
    id: str
    doc_id: str
    page_num: int
    title: Optional[str] = None
    created_at: int


# --- Pomodoro Session Log ---
class PomodoroLogCreate(BaseModel):
    doc_id: Optional[str] = None
    duration_seconds: int = 1500
    mode: str = "focus"


# --- Search Results ---
class SearchResultItem(BaseModel):
    doc_id: str
    doc_title: str
    doc_author: str
    doc_category: str
    spine_color: str
    page_num: int
    snippet: str
    rank: float


# --- Overall Stats ---
class LibraryStats(BaseModel):
    total_books: int
    total_highlights: int
    total_flashcards: int
    mastered_flashcards: int
    completed_pomodoros: int
    total_study_minutes: int
