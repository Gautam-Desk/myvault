import os
import sqlite3
import shutil
from pathlib import Path
from typing import Generator
from contextlib import contextmanager

# Primary Heavy Study Vault on Dedicated E: Partition (31+ GB free space)
DEFAULT_VAULT_PATH = Path(r"E:\Athenaeum_Vault")
FALLBACK_VAULT_PATH = Path(os.path.expanduser(r"~\.gemini\antigravity\scratch\Athenaeum_Vault"))


def is_dir_writable(path: Path) -> bool:
    """Verifies actual write and delete capability on the given path."""
    try:
        path.mkdir(parents=True, exist_ok=True)
        test_file = path / f".perm_test_{os.urandom(4).hex()}.tmp"
        with open(test_file, "w") as f:
            f.write("ok")
        test_file.unlink()
        return True
    except Exception:
        return False


def resolve_vault_path() -> Path:
    env_vault = os.environ.get("ATHENAEUM_VAULT_DIR")
    if env_vault:
        p = Path(env_vault)
        if is_dir_writable(p):
            return p

    # 1. Primary dedicated partition: E:\Athenaeum_Vault
    if is_dir_writable(DEFAULT_VAULT_PATH):
        return DEFAULT_VAULT_PATH

    # 2. Check if E: drive exists and can be used directly
    try:
        if os.path.exists("E:\\"):
            DEFAULT_VAULT_PATH.mkdir(parents=True, exist_ok=True)
            if is_dir_writable(DEFAULT_VAULT_PATH):
                return DEFAULT_VAULT_PATH
    except Exception:
        pass

    # 3. Fallback scratch vault in workspace
    if is_dir_writable(FALLBACK_VAULT_PATH):
        return FALLBACK_VAULT_PATH

    # 4. Emergency fallback to user profile
    user_vault = Path(os.path.expanduser(r"~\Athenaeum_Vault"))
    if is_dir_writable(user_vault):
        return user_vault

    import tempfile
    tmp_vault = Path(tempfile.gettempdir()) / "Athenaeum_Vault"
    tmp_vault.mkdir(parents=True, exist_ok=True)
    return tmp_vault


VAULT_ROOT = resolve_vault_path()
PDFS_DIR = VAULT_ROOT / "pdfs"
THUMBNAILS_DIR = VAULT_ROOT / "thumbnails"
EXPORTS_DIR = VAULT_ROOT / "exports"
DB_PATH = VAULT_ROOT / "athenaeum.db"


def init_vault_directories():
    """Ensure heavy study directories exist on the storage partition."""
    PDFS_DIR.mkdir(parents=True, exist_ok=True)
    THUMBNAILS_DIR.mkdir(parents=True, exist_ok=True)
    EXPORTS_DIR.mkdir(parents=True, exist_ok=True)


# Initialize vault directories immediately upon module load
init_vault_directories()


def get_db_connection() -> sqlite3.Connection:
    """Creates a connection configured with WAL mode and foreign key enforcement."""
    conn = sqlite3.connect(str(DB_PATH), timeout=15.0, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    # WAL mode allows concurrent readers and one writer without locking reader canvas
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA foreign_keys=ON;")
    conn.execute("PRAGMA busy_timeout=10000;")
    conn.execute("PRAGMA synchronous=NORMAL;")
    return conn


@contextmanager
def db_session() -> Generator[sqlite3.Connection, None, None]:
    conn = get_db_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db():
    """Initializes the database schema including FTS5 full-text search."""
    init_vault_directories()
    with db_session() as conn:
        cursor = conn.cursor()

        # 1. Documents Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS documents (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                author TEXT DEFAULT 'Unknown Scholar',
                category TEXT DEFAULT 'Uncategorized',
                shelf TEXT DEFAULT 'All Volumes',
                sha256 TEXT UNIQUE NOT NULL,
                rel_path TEXT NOT NULL,
                thumb_path TEXT,
                spine_color TEXT DEFAULT '#7C3222',
                page_count INTEGER NOT NULL DEFAULT 1,
                current_page INTEGER NOT NULL DEFAULT 1,
                is_starred INTEGER NOT NULL DEFAULT 0,
                last_opened_at INTEGER NOT NULL,
                file_size INTEGER DEFAULT 0,
                tags_json TEXT DEFAULT '[]'
            );
        """)

        # 2. Highlights Table (stores normalized float 0.0-1.0 coords in rects_json)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS highlights (
                id TEXT PRIMARY KEY,
                doc_id TEXT NOT NULL,
                page_num INTEGER NOT NULL,
                color_hex TEXT NOT NULL,
                selected_text TEXT NOT NULL,
                rects_json TEXT DEFAULT '[]',
                created_at INTEGER NOT NULL,
                FOREIGN KEY (doc_id) REFERENCES documents (id) ON DELETE CASCADE
            );
        """)

        # 3. Notes Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS notes (
                id TEXT PRIMARY KEY,
                doc_id TEXT NOT NULL,
                page_num INTEGER,
                markdown_body TEXT NOT NULL,
                updated_at INTEGER NOT NULL,
                FOREIGN KEY (doc_id) REFERENCES documents (id) ON DELETE CASCADE
            );
        """)

        # 4. Flashcards Table (spaced-repetition scheduling)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS flashcards (
                id TEXT PRIMARY KEY,
                doc_id TEXT NOT NULL,
                source_page INTEGER DEFAULT 1,
                front_md TEXT NOT NULL,
                back_md TEXT NOT NULL,
                ease_factor REAL DEFAULT 2.5,
                interval_days INTEGER DEFAULT 1,
                due_at INTEGER NOT NULL,
                is_mastered INTEGER DEFAULT 0,
                FOREIGN KEY (doc_id) REFERENCES documents (id) ON DELETE CASCADE
            );
        """)

        # 5. Pomodoro Focus Sessions
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS pomodoro_sessions (
                id TEXT PRIMARY KEY,
                doc_id TEXT,
                duration_seconds INTEGER NOT NULL,
                completed_at INTEGER NOT NULL,
                mode TEXT DEFAULT 'focus',
                FOREIGN KEY (doc_id) REFERENCES documents (id) ON DELETE SET NULL
            );
        """)

        # 6. Bookmarks Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS bookmarks (
                id TEXT PRIMARY KEY,
                doc_id TEXT NOT NULL,
                page_num INTEGER NOT NULL,
                title TEXT,
                created_at INTEGER NOT NULL,
                UNIQUE(doc_id, page_num),
                FOREIGN KEY (doc_id) REFERENCES documents (id) ON DELETE CASCADE
            );
        """)

        # 7. Library FTS5 Full-Text Search Virtual Table
        cursor.execute("""
            CREATE VIRTUAL TABLE IF NOT EXISTS library_fts USING fts5(
                doc_id UNINDEXED,
                page_num,
                content,
                tokenize='porter unicode61'
            );
        """)

        # Create indexes for sub-10ms query times
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_docs_last_opened ON documents(last_opened_at DESC);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_docs_starred ON documents(is_starred);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_docs_shelf ON documents(shelf);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_highlights_doc_page ON highlights(doc_id, page_num);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_notes_doc ON notes(doc_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_flashcards_doc ON flashcards(doc_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_bookmarks_doc ON bookmarks(doc_id);")

        conn.commit()


# Run init_db immediately so tables exist
init_db()


if __name__ == "__main__":
    print(f"Vault initialized at: {VAULT_ROOT}")
    print(f"Database at: {DB_PATH}")
