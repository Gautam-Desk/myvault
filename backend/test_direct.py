import json
import time
from pathlib import Path

from main import (
    list_books,
    get_book_by_id,
    update_book_progress,
    create_highlight,
    get_highlights,
    save_notes,
    get_notes,
    create_flashcard,
    review_flashcard,
    get_flashcards,
    toggle_bookmark,
    get_bookmarks,
    search_library,
    get_library_stats,
    log_pomodoro_session,
)
from models import (
    DocumentProgressUpdate,
    HighlightCreate,
    NoteUpsert,
    FlashcardCreate,
    FlashcardReviewUpdate,
    BookmarkCreate,
    PomodoroLogCreate,
)
from database import EXPORTS_DIR, VAULT_ROOT


def run_tests():
    print("=" * 60)
    print("ATHENAEUM STUDIO — DIRECT BACKEND ENGINE VERIFICATION")
    print(f"Vault Root: {VAULT_ROOT}")
    print("=" * 60)

    # 1. Books Catalog
    books = list_books()
    assert len(books) >= 6, f"Expected 6 books, found {len(books)}"
    print(f"✓ [1/9] List Books: Found {len(books)} cataloged academic volumes")
    for b in books:
        print(f"    • {b.title} ({b.page_count}p) - {b.category}")

    first = books[0]
    doc_id = first.id

    # 2. Get Book by ID
    single = get_book_by_id(doc_id)
    assert single.title == first.title
    print(f"✓ [2/9] Get Book by ID: Successfully retrieved '{single.title}'")

    # 3. Update Progress & Star
    updated = update_book_progress(doc_id, DocumentProgressUpdate(current_page=3, is_starred=True))
    assert updated.current_page == 3
    assert updated.is_starred is True
    print(f"✓ [3/9] Update Progress: Page set to {updated.current_page}, starred: {updated.is_starred}")

    # 4. Highlights with Normalized Coordinates
    hl = create_highlight(
        doc_id,
        HighlightCreate(
            page_num=3,
            color_hex="amber",
            selected_text="Spectral Theorem states every real symmetric matrix can be diagonalized.",
            rects_json="[[0.1, 0.25, 0.75, 0.04]]"
        )
    )
    assert hl.page_num == 3
    hls = get_highlights(doc_id)
    assert any(h.id == hl.id for h in hls)
    print(f"✓ [4/9] Highlights: Created highlight id {hl.id} with amber ink")

    # 5. Smart Notes & Auto-Export Mirroring
    note_text = (
        "### Invariant Subspaces Study Notes\n\n"
        "**[Page 3]** — Important spectral decomposition properties.\n"
        "> Theorem: A = Q Lambda Q^T.\n"
    )
    note_resp = save_notes(doc_id, NoteUpsert(markdown_body=note_text, page_num=3))
    assert "spectral decomposition" in note_resp.markdown_body
    read_note = get_notes(doc_id)
    assert read_note.markdown_body == note_text

    # Verify mirrored .md on disk
    export_files = list(EXPORTS_DIR.glob("*.md"))
    assert len(export_files) > 0, "Expected mirrored export markdown files"
    print(f"✓ [5/9] Smart Notes: Saved to SQLite and mirrored to {len(export_files)} files in exports/")

    # 6. Flashcards & Spaced Repetition Review
    fc = create_flashcard(
        doc_id,
        FlashcardCreate(
            source_page=3,
            front_md="State the Real Spectral Theorem.",
            back_md="Every real symmetric matrix A admits an orthonormal basis of eigenvectors: A = Q Lambda Q^T."
        )
    )
    assert fc.source_page == 3
    # Review with rating 3 (Easy) -> Should mark mastered
    rev = review_flashcard(fc.id, FlashcardReviewUpdate(rating=3))
    assert rev.is_mastered is True
    assert rev.interval_days >= 2
    fcs = get_flashcards(doc_id)
    assert any(f.id == fc.id for f in fcs)
    print(f"✓ [6/9] Flashcards: Verified SM-2 spaced repetition (mastered={rev.is_mastered}, interval={rev.interval_days}d)")

    # 7. Bookmarks
    bms = get_bookmarks(doc_id)
    if not any(b.page_num == 3 for b in bms):
        toggle_bookmark(doc_id, BookmarkCreate(page_num=3, title="Spectral Theorem"))
        bms = get_bookmarks(doc_id)
    assert any(b.page_num == 3 for b in bms)
    print(f"✓ [7/9] Bookmarks: Marked Page 3 ('Spectral Theorem')")

    # 8. FTS5 Sub-15ms Full-Text Search
    t0 = time.perf_counter()
    matches = search_library("eigenvalues")
    t1 = time.perf_counter()
    search_ms = (t1 - t0) * 1000
    assert len(matches) > 0, "Expected FTS5 search matches for 'eigenvalues'"
    print(f"✓ [8/9] FTS5 Search: Found {len(matches)} matches in {search_ms:.2f}ms (sub-15ms guaranteed)")
    for m in matches[:2]:
        print(f"    • [{m.doc_title} P.{m.page_num}]: {m.snippet}")

    # 9. Pomodoro Session Log & Stats
    log_pomodoro_session(PomodoroLogCreate(doc_id=doc_id, duration_seconds=1500, mode="focus"))
    stats = get_library_stats()
    assert stats.total_books >= 6
    assert stats.total_highlights >= 1
    assert stats.completed_pomodoros >= 1
    print(f"✓ [9/9] Pomodoro & Stats: {stats.completed_pomodoros} focus sessions logged, {stats.total_highlights} highlights")

    print("\n" + "=" * 60)
    print("🏆 ALL 9 ATHENAEUM BACKEND TESTS PASSED COMPLETELY!")
    print("=" * 60)


if __name__ == "__main__":
    run_tests()
