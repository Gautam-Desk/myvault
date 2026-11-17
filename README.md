# My Vault 🏛️

**My Vault** is a decoupled local-first study environment and high-DPI PDF reader crafted for deep academic and technical research.

The architecture is **strictly decoupled**:
* **Application Source Code:** `my-vault/` (~150 MB, Git-tracked, safely upgradeable anytime without touching your books or notes).
* **Dedicated Study Vault:** `E:\Athenaeum_Vault\` (dedicated high-capacity partition with 31+ GB free space), storing your content-addressed PDFs (`pdfs/`), WebP cover thumbnails (`thumbnails/`), SQLite WAL database (`athenaeum.db`), and mirrored Markdown note backups (`exports/`).

---

## 🌓 Dark Mode & Scholarly Themes

My Vault comes equipped with a system-wide Dark Mode:
- **Toggle Button:** One-click Sun/Moon toggle in the Top Utility Bar (`TopBar.tsx`).
- **Dark Obsidian Palette:** Deep espresso blacks (`#120B07`, `#160E09`), glowing cognac borders (`#382417`), and amber accents (`#E09453`).
- **Warm Parchment Mode:** Traditional linen & parchment paper aesthetic (`#FCF8F2`, `#F5EDE3`).
- **PDF Canvas Themes:** 3 reading stages (*Warm Parchment*, *Toasted Sepia*, *Dark Espresso*).

---

## 💻 Running Directly in VS Code on your Laptop

Open this folder in VS Code and choose your preferred way to run:

### Method 1: Build Task Shortcut (Recommended)
1. Open this workspace in **VS Code**.
2. Press **`Ctrl + Shift + B`** (or go to menu *Terminal* → *Run Build Task...*).
3. VS Code will simultaneously start:
   - **Backend API:** FastAPI Uvicorn server on `http://127.0.0.1:8000`
   - **Frontend UI:** Vite React development server on `http://localhost:5173`
4. Open **`http://localhost:5173`** in your browser.

---

### Method 2: Run & Debug (F5)
1. Open the **Run and Debug** view in VS Code (**`Ctrl + Shift + D`**).
2. Choose **`Full Stack (Backend + Browser)`** or **`FastAPI: Backend (Port 8000)`** from the dropdown.
3. Press **`F5`** to launch with live reloading and breakpoint debugging.

---

### Method 3: VS Code Integrated Split Terminals
1. Open the VS Code integrated terminal (**`` Ctrl + ` ``**).
2. Split the terminal pane (click the split icon or press `Ctrl + \`).
3. Run:
   - **Pane 1 (Backend):**
     ```cmd
     npm run backend
     ```
   - **Pane 2 (Frontend):**
     ```cmd
     npm run frontend
     ```

---

### Method 4: 1-Click Desktop Batch Script
Double-click `start_athenaeum.bat` in the project root to launch both backend and frontend servers in separate CMD windows and open your browser automatically.

---

## 🚀 Publishing to Vercel

My Vault is pre-configured with `vercel.json` for 1-click deployment.

### Deploying via GitHub (Easiest & Automatic CI/CD):
1. Push your repository to your GitHub account (see instructions below).
2. Go to [vercel.com](https://vercel.com) and click **"Add New" → "Project"**.
3. Select your `my-vault` repository from GitHub.
4. Framework Preset: **Vite**
5. Root Directory: `./` (or `./frontend`)
6. Click **Deploy**. Vercel will automatically build and publish your live web app!

### Deploying via Vercel CLI:
If you have Vercel CLI installed:
```cmd
vercel
```
Follow the interactive prompts to deploy directly from your terminal.

---

## 🔒 GitHub & Sensitive Data Security

The included [`.gitignore`](.gitignore) ensures that no sensitive or heavy data is ever leaked:
- **Ignored:** Databases (`*.db`, `*.sqlite`), uploaded textbooks (`*.pdf`), thumbnails (`*.webp`), environment variables (`.env*`), private keys & credentials (`*.pem`, `*.key`, `secrets.*`), and virtual environments (`venv/`, `node_modules/`).
- **Committed:** Pure, lightweight frontend and backend source code (~5 MB total).

---

## 🏛️ Directory Structure

```text
my-vault/                           # Source code repository (Git-tracked)
├── .vscode/
│   ├── tasks.json                  # Ctrl+Shift+B task runner for FastAPI + Vite
│   ├── launch.json                 # F5 full-stack debugger configuration
│   └── settings.json               # Python interpreter & workspace preferences
├── .gitignore                      # Security hygiene (excludes PDFs, DBs, secrets, venv)
├── vercel.json                     # Vercel deployment configuration
├── backend/
│   ├── main.py                     # FastAPI app, CORS, static mounts, byte-range streaming
│   ├── database.py                 # SQLite WAL connection, pragmas, FTS5 schema
│   ├── pdf_processor.py            # SHA-256 deduplication, 240px WebP covers, text indexing
│   ├── models.py                   # Pydantic models for books, highlights, notes, flashcards
│   ├── seed_data.py                # Academic study volume generator & vault seeder
│   ├── test_direct.py              # Automated 9-suite verification test script
│   ├── test_upload.py              # Automated PDF binary upload test
│   └── requirements.txt            # fastapi, uvicorn, pymupdf, python-multipart, pillow
├── frontend/
│   ├── vercel.json                 # Frontend-specific Vercel fallback config
│   ├── src/
│   │   ├── components/
│   │   │   ├── Sidebar.tsx         # Espresso sidebar, shelf counts, Pomodoro pod
│   │   │   ├── TopBar.tsx          # Utility bar, Dark Mode toggle, FTS5 search (Ctrl+K)
│   │   │   ├── LibraryGrid.tsx     # Continue-reading strip + hardcover book cards
│   │   │   ├── PdfStudio.tsx       # 3-pane reader (Thumbnails | Canvas | Study Dock)
│   │   │   ├── StudyTools.tsx      # Page-linked Markdown notes, 3D flashcards, highlights
│   │   │   ├── UnifiedModal.tsx    # Library-wide flashcard deck & notes browser
│   │   │   └── SelectionPopover.tsx# Floating ink highlight swatches & quote capture
│   │   ├── store/useLibraryStore.ts# Zustand reactive study store (Dark/Light theme)
│   │   ├── api/client.ts           # Typed API client + Cloud/Vercel preview fallbacks
│   │   └── types/index.ts          # TypeScript domain definitions
│   └── vite.config.ts              # Vite proxy forwarding /api and /vault to port 8000
├── package.json                    # Root scripts (npm run backend, npm run frontend)
└── start_athenaeum.bat             # 1-click launcher for Windows

E:\Athenaeum_Vault\                 # Dedicated Heavy Data Vault (Drive E: Partition)
├── athenaeum.db                    # SQLite WAL database (metadata, highlights, cards, FTS5 index)
├── pdfs/                           # Content-addressed PDFs (<sha256>.pdf)
├── thumbnails/                     # 240px WebP cover images (~18 KB per volume)
└── exports/                        # Auto-synced Markdown (.md) backups of your study notes
```
