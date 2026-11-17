import json
import os
import re
import time
from pathlib import Path
from typing import Optional, List

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Query, Request, BackgroundTasks, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response, StreamingResponse
from fastapi.staticfiles import StaticFiles

from database import (
    VAULT_ROOT,
    PDFS_DIR,
    THUMBNAILS_DIR,
    EXPORTS_DIR,
    init_db,
    db_session,
)
from models import (
    DocumentResponse,
    DocumentProgressUpdate,
    HighlightCreate,
    HighlightResponse,
    NoteUpsert,
    NoteResponse,
    FlashcardCreate,
    FlashcardReviewUpdate,
    FlashcardResponse,
    BookmarkCreate,
    BookmarkResponse,
    PomodoroLogCreate,
    SearchResultItem,
    LibraryStats,
)
from pdf_processor import (
    save_uploaded_stream_with_hash,
    generate_cover_thumbnail,
    index_pdf_fulltext,
    extract_pdf_info,
)

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(
    title="My Vault API",
    description="My Vault - Decoupled local-first PDF study studio engine with SQLite WAL & FTS5",
    version="2.0.0",
    lifespan=lifespan,
)

# Enable CORS for Vite frontend (typically localhost:5173 / localhost:3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Mount static thumbnails and exports
app.mount("/vault/thumbnails", StaticFiles(directory=str(THUMBNAILS_DIR)), name="thumbnails")
app.mount("/vault/exports", StaticFiles(directory=str(EXPORTS_DIR)), name="exports")


# -----------------------------------------------------------------------------
# 1. BOOKS & PDF MANAGEMENT
# -----------------------------------------------------------------------------
@app.post("/api/books/upload", response_model=DocumentResponse)
def upload_book(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    shelf: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    spine_color: Optional[str] = Form(None),
):
    """
    Streams file to `pdfs/<sha256>.pdf`, verifies duplicates,
    generates WebP cover thumbnail, and indexes text into `library_fts`.
    """
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files (.pdf) are supported.")

    cat_val = category if isinstance(category, str) and category.strip() else "Uploaded PDFs"
    shelf_val = shelf if isinstance(shelf, str) and shelf.strip() else "Uploaded PDFs"

    # Palette of handsome scholarly spine colors
    SPINE_PALETTE = ["#7C3222", "#A85D2A", "#3B5249", "#4A3B52", "#5E4637", "#2D4B63", "#6D4C41"]
    if isinstance(spine_color, str) and spine_color.strip() and spine_color.startswith("#"):
        spine_val = spine_color.strip()
    else:
        import random
        spine_val = random.choice(SPINE_PALETTE)

    # 1. Stream file and compute SHA-256
    try:
        pdf_path, sha256, file_size = save_uploaded_stream_with_hash(file)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to stream and store PDF in vault: {e}")

    if file_size == 0:
        if pdf_path.exists():
            try:
                pdf_path.unlink()
            except Exception:
                pass
        raise HTTPException(status_code=400, detail="Uploaded PDF file is empty (0 bytes).")

    # 2. Check if already cataloged
    with db_session() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM documents WHERE sha256 = ?;", (sha256,))
        existing = cursor.fetchone()
        if existing:
            # Return existing document details
            return get_book_by_id(existing["id"])

    # 3. Extract metadata, page count & TOC via PyMuPDF
    try:
        info = extract_pdf_info(pdf_path, file.filename)
    except Exception as e:
        if pdf_path.exists():
            try:
                pdf_path.unlink()
            except Exception:
                pass
        raise HTTPException(status_code=400, detail=f"Could not parse PDF file: {e}")

    page_count = max(1, info.get("page_count", 1))

    # 4. Generate WebP thumbnail from page 0
    try:
        thumb_filename = generate_cover_thumbnail(pdf_path, sha256)
    except Exception as e:
        print(f"Warning: Cover thumbnail generation error: {e}")
        thumb_filename = None

    # 5. Insert into SQLite `documents` table
    doc_id = f"doc_{sha256[:12]}"
    now = int(time.time() * 1000)
    tags_json = json.dumps(["PDF", f"{page_count}p"])

    try:
        with db_session() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO documents (
                    id, title, author, category, shelf, sha256,
                    rel_path, thumb_path, spine_color, page_count,
                    current_page, is_starred, last_opened_at, file_size, tags_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                """,
                (
                    doc_id,
                    info.get("title") or Path(file.filename).stem,
                    info.get("author") or "Academic Scholar",
                    cat_val,
                    shelf_val,
                    sha256,
                    f"pdfs/{sha256}.pdf",
                    thumb_filename,
                    spine_val,
                    page_count,
                    1,
                    0,
                    now,
                    file_size,
                    tags_json,
                ),
            )
            conn.commit()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database insert failed: {e}")

    # 6. Index text into FTS5 (use background tasks if available, otherwise synchronous)
    if background_tasks:
        background_tasks.add_task(index_pdf_fulltext, doc_id, pdf_path)
    else:
        index_pdf_fulltext(doc_id, pdf_path)

    return get_book_by_id(doc_id)


@app.get("/api/books", response_model=List[DocumentResponse])
def list_books(
    shelf: Optional[str] = None,
    category: Optional[str] = None,
    q: Optional[str] = None,
    sort: Optional[str] = "recent",  # "recent" | "title" | "progress"
):
    """
    Lists cataloged books with live highlight counts, flashcard counts, and filtering.
    """
    with db_session() as conn:
        cursor = conn.cursor()
        query = """
            SELECT d.*,
                   (SELECT COUNT(*) FROM highlights WHERE doc_id = d.id) as hl_count,
                   (SELECT COUNT(*) FROM flashcards WHERE doc_id = d.id) as fc_count,
                   (SELECT markdown_body FROM notes WHERE doc_id = d.id LIMIT 1) as note_body
            FROM documents d
            WHERE 1=1
        """
        params = []

        if shelf and shelf not in ("all", "All Volumes"):
            if shelf == "continue":
                query += " AND d.current_page > 1 AND d.current_page <= d.page_count"
            elif shelf == "starred":
                query += " AND d.is_starred = 1"
            else:
                query += " AND d.shelf = ?"
                params.append(shelf)

        if category and category != "All Categories":
            query += " AND d.category = ?"
            params.append(category)

        if q and isinstance(q, str) and q.strip():
            query += " AND (d.title LIKE ? OR d.author LIKE ? OR d.category LIKE ?)"
            term = f"%{q.strip()}%"
            params.extend([term, term, term])

        if sort == "title":
            query += " ORDER BY d.title ASC"
        elif sort == "progress":
            query += " ORDER BY (CAST(d.current_page AS FLOAT) / d.page_count) DESC"
        else:
            query += " ORDER BY d.last_opened_at DESC"

        cursor.execute(query, params)
        rows = cursor.fetchall()

        results = []
        for r in rows:
            tags = json.loads(r["tags_json"]) if r["tags_json"] else []
            results.append(
                DocumentResponse(
                    id=r["id"],
                    title=r["title"],
                    author=r["author"] or "Unknown Scholar",
                    category=r["category"] or "Uncategorized",
                    shelf=r["shelf"] or "All Volumes",
                    spine_color=r["spine_color"] or "#7C3222",
                    tags=tags,
                    sha256=r["sha256"],
                    rel_path=r["rel_path"],
                    thumb_path=r["thumb_path"],
                    page_count=r["page_count"],
                    current_page=r["current_page"],
                    is_starred=bool(r["is_starred"]),
                    last_opened_at=r["last_opened_at"],
                    file_size=r["file_size"],
                    highlights_count=r["hl_count"],
                    flashcards_count=r["fc_count"],
                    notes_preview=r["note_body"][:120] if r["note_body"] else None,
                )
            )
        return results


@app.get("/api/books/{doc_id}", response_model=DocumentResponse)
def get_book_by_id(doc_id: str):
    with db_session() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT d.*,
                   (SELECT COUNT(*) FROM highlights WHERE doc_id = d.id) as hl_count,
                   (SELECT COUNT(*) FROM flashcards WHERE doc_id = d.id) as fc_count,
                   (SELECT markdown_body FROM notes WHERE doc_id = d.id LIMIT 1) as note_body
            FROM documents d
            WHERE d.id = ?;
            """,
            (doc_id,),
        )
        r = cursor.fetchone()
        if not r:
            raise HTTPException(status_code=404, detail="Document not found.")

        tags = json.loads(r["tags_json"]) if r["tags_json"] else []
        return DocumentResponse(
            id=r["id"],
            title=r["title"],
            author=r["author"] or "Unknown Scholar",
            category=r["category"] or "Uncategorized",
            shelf=r["shelf"] or "All Volumes",
            spine_color=r["spine_color"] or "#7C3222",
            tags=tags,
            sha256=r["sha256"],
            rel_path=r["rel_path"],
            thumb_path=r["thumb_path"],
            page_count=r["page_count"],
            current_page=r["current_page"],
            is_starred=bool(r["is_starred"]),
            last_opened_at=r["last_opened_at"],
            file_size=r["file_size"],
            highlights_count=r["hl_count"],
            flashcards_count=r["fc_count"],
            notes_preview=r["note_body"][:120] if r["note_body"] else None,
        )


@app.delete("/api/books/{doc_id}")
def delete_book(doc_id: str):
    """Removes document and cascades deletion of notes, highlights, and flashcards."""
    with db_session() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT rel_path, thumb_path, sha256 FROM documents WHERE id = ?;", (doc_id,))
        doc = cursor.fetchone()
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found.")

        cursor.execute("DELETE FROM documents WHERE id = ?;", (doc_id,))
        cursor.execute("DELETE FROM library_fts WHERE doc_id = ?;", (doc_id,))
        conn.commit()

    return {"status": "deleted", "id": doc_id}


@app.patch("/api/books/{doc_id}/progress", response_model=DocumentResponse)
def update_book_progress(doc_id: str, update: DocumentProgressUpdate):
    """Saves current_page, is_starred, shelf, or category."""
    with db_session() as conn:
        cursor = conn.cursor()
        fields = []
        params = []

        if update.current_page is not None:
            fields.append("current_page = ?")
            params.append(update.current_page)
            fields.append("last_opened_at = ?")
            params.append(int(time.time() * 1000))

        if update.is_starred is not None:
            fields.append("is_starred = ?")
            params.append(1 if update.is_starred else 0)

        if update.shelf is not None:
            fields.append("shelf = ?")
            params.append(update.shelf)

        if update.category is not None:
            fields.append("category = ?")
            params.append(update.category)

        if not fields:
            return get_book_by_id(doc_id)

        params.append(doc_id)
        cursor.execute(f"UPDATE documents SET {', '.join(fields)} WHERE id = ?;", params)
        conn.commit()

    return get_book_by_id(doc_id)


# -----------------------------------------------------------------------------
# 2. HIGH-PERFORMANCE BYTE-RANGE PDF STREAMING (RFC 7233)
# -----------------------------------------------------------------------------
@app.get("/api/books/{doc_id}/stream")
def stream_pdf(doc_id: str, request: Request):
    """
    Streams PDF file supporting HTTP 206 Partial Content and `Accept-Ranges: bytes`.
    Allows PDF.js Web Worker to fetch multi-gigabyte textbooks page-by-page.
    """
    with db_session() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT rel_path FROM documents WHERE id = ?;", (doc_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Document not found.")

    pdf_full_path = VAULT_ROOT / row["rel_path"]
    if not pdf_full_path.exists():
        raise HTTPException(status_code=404, detail="Underlying PDF file missing from vault.")

    file_size = pdf_full_path.stat().st_size
    range_header = request.headers.get("Range") or request.headers.get("range")

    headers = {
        "Accept-Ranges": "bytes",
        "Content-Type": "application/pdf",
        "Cache-Control": "public, max-age=3600",
    }

    if not range_header:
        # Full content response
        headers["Content-Length"] = str(file_size)
        return FileResponse(str(pdf_full_path), headers=headers, media_type="application/pdf")

    # Parse byte range header, e.g. "bytes=0-1023"
    match = re.search(r"bytes=(\d+)-(\d*)", range_header)
    if not match:
        return Response(status_code=416, headers={"Content-Range": f"bytes */{file_size}"})

    start = int(match.group(1))
    end = int(match.group(2)) if match.group(2) else file_size - 1

    if start >= file_size or end >= file_size or start > end:
        return Response(status_code=416, headers={"Content-Range": f"bytes */{file_size}"})

    chunk_size = (end - start) + 1

    def iter_file_chunk(path: Path, offset: int, length: int):
        with open(path, "rb") as f:
            f.seek(offset)
            remaining = length
            while remaining > 0:
                read_bytes = min(remaining, 65536)
                data = f.read(read_bytes)
                if not data:
                    break
                remaining -= len(data)
                yield data

    headers.update({
        "Content-Range": f"bytes {start}-{end}/{file_size}",
        "Content-Length": str(chunk_size),
    })

    return StreamingResponse(
        iter_file_chunk(pdf_full_path, start, chunk_size),
        status_code=206,
        headers=headers,
        media_type="application/pdf",
    )


# -----------------------------------------------------------------------------
# 3. HIGHLIGHTS (Normalized 0.0-1.0 Coordinates for Resolution Invariance)
# -----------------------------------------------------------------------------
@app.get("/api/books/{doc_id}/highlights", response_model=List[HighlightResponse])
def get_highlights(doc_id: str):
    with db_session() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT * FROM highlights
            WHERE doc_id = ?
            ORDER BY page_num ASC, created_at DESC;
            """,
            (doc_id,),
        )
        rows = cursor.fetchall()
        return [
            HighlightResponse(
                id=r["id"],
                doc_id=r["doc_id"],
                page_num=r["page_num"],
                color_hex=r["color_hex"],
                selected_text=r["selected_text"],
                rects_json=r["rects_json"] or "[]",
                created_at=r["created_at"],
            )
            for r in rows
        ]


@app.post("/api/books/{doc_id}/highlights", response_model=HighlightResponse)
def create_highlight(doc_id: str, hl: HighlightCreate):
    hl_id = f"hl_{int(time.time()*1000)}_{os.urandom(4).hex()}"
    now = int(time.time() * 1000)

    with db_session() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO highlights (id, doc_id, page_num, color_hex, selected_text, rects_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?);
            """,
            (hl_id, doc_id, hl.page_num, hl.color_hex, hl.selected_text, hl.rects_json or "[]", now),
        )
        conn.commit()

    return HighlightResponse(
        id=hl_id,
        doc_id=doc_id,
        page_num=hl.page_num,
        color_hex=hl.color_hex,
        selected_text=hl.selected_text,
        rects_json=hl.rects_json or "[]",
        created_at=now,
    )


@app.delete("/api/highlights/{hl_id}")
def delete_highlight(hl_id: str):
    with db_session() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM highlights WHERE id = ?;", (hl_id,))
        conn.commit()
    return {"status": "deleted", "id": hl_id}


# -----------------------------------------------------------------------------
# 4. SMART NOTES (SQLite + Mirrored Markdown Export to D:\Athenaeum_Vault\exports)
# -----------------------------------------------------------------------------
@app.get("/api/books/{doc_id}/notes", response_model=NoteResponse)
def get_notes(doc_id: str):
    with db_session() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM notes WHERE doc_id = ? ORDER BY updated_at DESC LIMIT 1;", (doc_id,))
        r = cursor.fetchone()
        if not r:
            return NoteResponse(
                id=f"note_{doc_id}",
                doc_id=doc_id,
                page_num=1,
                markdown_body="",
                updated_at=int(time.time() * 1000),
            )
        return NoteResponse(
            id=r["id"],
            doc_id=r["doc_id"],
            page_num=r["page_num"],
            markdown_body=r["markdown_body"],
            updated_at=r["updated_at"],
        )


@app.put("/api/books/{doc_id}/notes", response_model=NoteResponse)
def save_notes(doc_id: str, note_input: NoteUpsert):
    now = int(time.time() * 1000)
    note_id = f"note_{doc_id}"

    with db_session() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, title FROM documents WHERE id = ?;", (doc_id,))
        doc = cursor.fetchone()
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found.")

        # Upsert into notes table
        cursor.execute(
            """
            INSERT INTO notes (id, doc_id, page_num, markdown_body, updated_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                markdown_body = excluded.markdown_body,
                page_num = excluded.page_num,
                updated_at = excluded.updated_at;
            """,
            (note_id, doc_id, note_input.page_num, note_input.markdown_body, now),
        )
        conn.commit()

        # Mirror auto-synced Markdown backup to `D:\Athenaeum_Vault\exports\<title>.md`
        safe_title = re.sub(r'[^a-zA-Z0-9_\- ]', '', doc["title"]).strip().replace(" ", "_")
        export_path = EXPORTS_DIR / f"{safe_title}.md"
        try:
            with open(export_path, "w", encoding="utf-8") as f:
                f.write(f"# {doc['title']} — Study Notes\n\n")
                f.write(f"*Last updated: {time.strftime('%Y-%m-%d %H:%M:%S')}*\n\n---\n\n")
                f.write(note_input.markdown_body)
        except Exception as e:
            print(f"Warning: Failed to mirror export file {export_path}: {e}")

    return NoteResponse(
        id=note_id,
        doc_id=doc_id,
        page_num=note_input.page_num,
        markdown_body=note_input.markdown_body,
        updated_at=now,
    )


# -----------------------------------------------------------------------------
# 5. FLASHCARDS (Active Recall Decks with Spaced Repetition)
# -----------------------------------------------------------------------------
@app.get("/api/books/{doc_id}/flashcards", response_model=List[FlashcardResponse])
def get_flashcards(doc_id: str):
    with db_session() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT * FROM flashcards
            WHERE doc_id = ?
            ORDER BY is_mastered ASC, due_at ASC;
            """,
            (doc_id,),
        )
        rows = cursor.fetchall()
        return [
            FlashcardResponse(
                id=r["id"],
                doc_id=r["doc_id"],
                source_page=r["source_page"],
                front_md=r["front_md"],
                back_md=r["back_md"],
                ease_factor=r["ease_factor"],
                interval_days=r["interval_days"],
                due_at=r["due_at"],
                is_mastered=bool(r["is_mastered"]),
            )
            for r in rows
        ]


@app.post("/api/books/{doc_id}/flashcards", response_model=FlashcardResponse)
def create_flashcard(doc_id: str, card: FlashcardCreate):
    card_id = f"fc_{int(time.time()*1000)}_{os.urandom(4).hex()}"
    now = int(time.time() * 1000)

    with db_session() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO flashcards (
                id, doc_id, source_page, front_md, back_md,
                ease_factor, interval_days, due_at, is_mastered
            ) VALUES (?, ?, ?, ?, ?, 2.5, 1, ?, 0);
            """,
            (card_id, doc_id, card.source_page or 1, card.front_md, card.back_md, now),
        )
        conn.commit()

    return FlashcardResponse(
        id=card_id,
        doc_id=doc_id,
        source_page=card.source_page or 1,
        front_md=card.front_md,
        back_md=card.back_md,
        ease_factor=2.5,
        interval_days=1,
        due_at=now,
        is_mastered=False,
    )


@app.patch("/api/flashcards/{card_id}", response_model=FlashcardResponse)
def review_flashcard(card_id: str, update: FlashcardReviewUpdate):
    """
    Implements spaced repetition algorithm (SM-2 simplified):
    Rating: 1 = Again, 2 = Good, 3 = Easy.
    Updates ease_factor, interval_days, due_at, or is_mastered status.
    """
    now = int(time.time() * 1000)
    day_ms = 86400 * 1000

    with db_session() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM flashcards WHERE id = ?;", (card_id,))
        card = cursor.fetchone()
        if not card:
            raise HTTPException(status_code=404, detail="Flashcard not found.")

        ease = card["ease_factor"]
        interval = card["interval_days"]
        mastered = card["is_mastered"]
        front = update.front_md if update.front_md is not None else card["front_md"]
        back = update.back_md if update.back_md is not None else card["back_md"]

        if update.is_mastered is not None:
            mastered = 1 if update.is_mastered else 0

        if update.rating is not None:
            if update.rating == 1:  # Again
                interval = 1
                ease = max(1.3, ease - 0.2)
                mastered = 0
            elif update.rating == 2:  # Good
                interval = max(1, int(interval * ease))
            elif update.rating == 3:  # Easy
                interval = max(2, int(interval * ease * 1.3))
                ease = min(3.0, ease + 0.15)
                mastered = 1

        due_at = now + (interval * day_ms)

        cursor.execute(
            """
            UPDATE flashcards SET
                front_md = ?,
                back_md = ?,
                ease_factor = ?,
                interval_days = ?,
                due_at = ?,
                is_mastered = ?
            WHERE id = ?;
            """,
            (front, back, ease, interval, due_at, mastered, card_id),
        )
        conn.commit()

    return FlashcardResponse(
        id=card_id,
        doc_id=card["doc_id"],
        source_page=card["source_page"],
        front_md=front,
        back_md=back,
        ease_factor=ease,
        interval_days=interval,
        due_at=due_at,
        is_mastered=bool(mastered),
    )


@app.delete("/api/flashcards/{card_id}")
def delete_flashcard(card_id: str):
    with db_session() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM flashcards WHERE id = ?;", (card_id,))
        conn.commit()
    return {"status": "deleted", "id": card_id}


# -----------------------------------------------------------------------------
# 6. BOOKMARKS
# -----------------------------------------------------------------------------
@app.get("/api/books/{doc_id}/bookmarks", response_model=List[BookmarkResponse])
def get_bookmarks(doc_id: str):
    with db_session() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM bookmarks WHERE doc_id = ? ORDER BY page_num ASC;", (doc_id,))
        rows = cursor.fetchall()
        return [
            BookmarkResponse(
                id=r["id"],
                doc_id=r["doc_id"],
                page_num=r["page_num"],
                title=r["title"],
                created_at=r["created_at"],
            )
            for r in rows
        ]


@app.post("/api/books/{doc_id}/bookmarks", response_model=BookmarkResponse)
def toggle_bookmark(doc_id: str, bm: BookmarkCreate):
    now = int(time.time() * 1000)
    with db_session() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM bookmarks WHERE doc_id = ? AND page_num = ?;", (doc_id, bm.page_num))
        existing = cursor.fetchone()
        if existing:
            # Delete if already exists (toggle behavior)
            cursor.execute("DELETE FROM bookmarks WHERE id = ?;", (existing["id"],))
            conn.commit()
            return BookmarkResponse(
                id=existing["id"],
                doc_id=doc_id,
                page_num=bm.page_num,
                title="removed",
                created_at=now,
            )

        bm_id = f"bm_{int(time.time()*1000)}_{os.urandom(4).hex()}"
        cursor.execute(
            "INSERT INTO bookmarks (id, doc_id, page_num, title, created_at) VALUES (?, ?, ?, ?, ?);",
            (bm_id, doc_id, bm.page_num, bm.title or f"Page {bm.page_num}", now),
        )
        conn.commit()
        return BookmarkResponse(
            id=bm_id,
            doc_id=doc_id,
            page_num=bm.page_num,
            title=bm.title or f"Page {bm.page_num}",
            created_at=now,
        )


# -----------------------------------------------------------------------------
# 7. GLOBAL SEARCH (SQLite FTS5 MATCH Query, Sub-15ms Global Search Ctrl+K)
# -----------------------------------------------------------------------------
@app.get("/api/search", response_model=List[SearchResultItem])
def search_library(q: str = ""):
    """
    Sub-15ms global search across all cataloged textbooks and documents using SQLite FTS5.
    Returns matched book title, page number, and snippet with highlighted matching terms.
    """
    if not q or not isinstance(q, str) or len(q.strip()) < 2:
        return []

    clean_q = re.sub(r'[^a-zA-Z0-9\s]', ' ', q).strip()
    if not clean_q:
        return []

    fts_terms = " ".join([f"{term}*" for term in clean_q.split() if term])

    with db_session() as conn:
        cursor = conn.cursor()
        try:
            cursor.execute(
                """
                SELECT f.doc_id, f.page_num,
                       snippet(library_fts, 2, '<mark>', '</mark>', '...', 24) as snippet,
                       rank,
                       d.title as doc_title,
                       d.author as doc_author,
                       d.category as doc_category,
                       d.spine_color
                FROM library_fts f
                JOIN documents d ON d.id = f.doc_id
                WHERE library_fts MATCH ?
                ORDER BY rank
                LIMIT 25;
                """,
                (fts_terms,),
            )
            rows = cursor.fetchall()
        except Exception:
            # Fallback simple LIKE if MATCH query encounters special syntax issues
            cursor.execute(
                """
                SELECT f.doc_id, f.page_num,
                       substr(f.content, 1, 140) as snippet,
                       1.0 as rank,
                       d.title as doc_title,
                       d.author as doc_author,
                       d.category as doc_category,
                       d.spine_color
                FROM library_fts f
                JOIN documents d ON d.id = f.doc_id
                WHERE f.content LIKE ?
                LIMIT 25;
                """,
                (f"%{clean_q}%",),
            )
            rows = cursor.fetchall()

        results = []
        for r in rows:
            results.append(
                SearchResultItem(
                    doc_id=r["doc_id"],
                    doc_title=r["doc_title"],
                    doc_author=r["doc_author"],
                    doc_category=r["doc_category"],
                    spine_color=r["spine_color"] or "#7C3222",
                    page_num=int(r["page_num"]),
                    snippet=r["snippet"] or "",
                    rank=float(r["rank"]),
                )
            )
        return results


# -----------------------------------------------------------------------------
# 8. POMODORO SESSIONS & OVERALL STATS
# -----------------------------------------------------------------------------
@app.post("/api/pomodoro/log")
def log_pomodoro_session(pomo: PomodoroLogCreate):
    sess_id = f"pomo_{int(time.time()*1000)}"
    now = int(time.time() * 1000)
    with db_session() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO pomodoro_sessions (id, doc_id, duration_seconds, completed_at, mode)
            VALUES (?, ?, ?, ?, ?);
            """,
            (sess_id, pomo.doc_id, pomo.duration_seconds, now, pomo.mode),
        )
        conn.commit()
    return {"status": "logged", "id": sess_id}


@app.get("/api/stats", response_model=LibraryStats)
def get_library_stats():
    with db_session() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM documents;")
        total_books = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM highlights;")
        total_highlights = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM flashcards;")
        total_flashcards = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM flashcards WHERE is_mastered = 1;")
        mastered_flashcards = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*), COALESCE(SUM(duration_seconds), 0) FROM pomodoro_sessions;")
        pomo_row = cursor.fetchone()
        completed_pomodoros = pomo_row[0]
        total_study_minutes = int(pomo_row[1] / 60)

        return LibraryStats(
            total_books=total_books,
            total_highlights=total_highlights,
            total_flashcards=total_flashcards,
            mastered_flashcards=mastered_flashcards,
            completed_pomodoros=completed_pomodoros,
            total_study_minutes=total_study_minutes,
        )
