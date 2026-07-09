# Careerpilot Structure and Workflow

## Overview
Careerpilot is a career assistant platform comprising three main components: a React frontend, a Node.js orchestration backend, and a Python-based AI microservice layer. All three layers are necessary and work in concert.

## Architectural Pillars
1. **Pillar 1 (Job Searching):** AI-powered job search agent using Tavily + Gemini Flash structured extraction.
2. **Pillar 2 (CV Ingestion & RAG):** Resume uploading, parsing, section-based chunking, Gemini embedding, ChromaDB vector store. ✅ **Implemented**
3. **Pillar 3 (AI Chat Assistant):** Conversational interface for career guidance and roadmaps.
4. **Pillar 4 (Productivity Tracking):** Kanban board, calendar deadlines, goals, and analytics dashboard.

---

## Directory Structure

```
careerpilot/
├── .gitignore
├── README.md
├── structure.md               ← This file (living documentation)
│
├── frontend/                  # React SPA (Vite)
│   ├── package.json
│   ├── tailwind.config.js
│   └── src/
│       ├── App.jsx            # Root with sticky nav tabs (My Profile / Job Hunter)
│       ├── main.jsx
│       ├── index.css
│       ├── components/
│       │   ├── JobCard.jsx         # Structured job result display card
│       │   ├── KanbanBoard.jsx     # (Pillar 4 — placeholder)
│       │   ├── CalendarView.jsx    # (Pillar 4 — placeholder)
│       │   └── ChatWidget.jsx      # (Pillar 3 — placeholder)
│       ├── pages/
│       │   ├── ResumeUpload.jsx    # ✅ Pillar 2: Drag-and-drop CV upload, progress, section breakdown, RAG query tester
│       │   ├── JobHunter.jsx       # ✅ Pillar 1: AI job search interface
│       │   ├── Dashboard.jsx       # (Pillar 4 — placeholder)
│       │   └── ChatAssistant.jsx   # (Pillar 3 — placeholder)
│       ├── services/
│       │   └── api.js              # ✅ Axios/Fetch wrappers: searchJobs, uploadResume, getResumeStatus, queryResume
│       └── context/
│           └── AuthContext.jsx
│
├── backend-node/              # Express orchestration server (Port 4000)
│   ├── package.json           # ✅ Added: multer, node-fetch; type:module; npm run dev
│   └── src/
│       ├── index.js           # ✅ Registers all routers incl. /resume
│       ├── config/
│       │   └── db.js
│       ├── controllers/
│       │   ├── jobController.js        # (Pillar 1 — base placeholder, logic in route)
│       │   ├── resumeController.js     # ✅ Pillar 2: Proxies upload/status/query to Python
│       │   ├── trackerController.js    # (Pillar 4 — placeholder)
│       │   └── userController.js
│       ├── models/
│       │   ├── Application.js
│       │   ├── Task.js
│       │   └── Goal.js
│       └── routes/
│           ├── jobs.js        # ✅ POST /jobs/search → spawns Python job_agent.py subprocess
│           ├── resume.js      # ✅ POST /resume/upload, GET /resume/status/:id, POST /resume/query
│           ├── tracker.js
│           └── user.js
│
└── services-python/           # FastAPI AI microservice (Port 8000)
    ├── .env                   # GEMINI_API_KEY, TAVILY_API_KEY
    ├── requirements.txt       # ✅ Updated: chromadb, pdfplumber, python-docx, google-generativeai, etc.
    ├── data/
    │   └── chroma_db/         # ✅ ChromaDB persistent vector store (auto-created on first upload)
    └── app/
        ├── main.py            # ✅ FastAPI app: GET /, POST /resume/upload, GET /resume/status/{id}, POST /resume/query
        ├── config.py          # ✅ pydantic-settings: GEMINI_API_KEY, CHROMA_DB_PATH, collection name
        ├── services/
        │   ├── rag_engine.py  # ✅ Full RAG pipeline (parse → chunk → embed → store → query)
        │   ├── job_agent.py   # ✅ Pillar 1: Tavily search + Gemini structured extraction
        │   └── chat_assistant.py  # (Pillar 3 — placeholder)
        └── utils/
            ├── pdf_parser.py  # ✅ pdfplumber extraction with margin cropping
            ├── docx_parser.py # ✅ python-docx extraction with table support
            └── scoring.py     # ✅ 3-component weighted fit score (skills 40%, title 30%, experience 30%)
```

---

## Running the Application

### 1. Python AI Service
```bash
cd services-python
.\venv\Scripts\activate       # Windows
uvicorn app.main:app --reload --port 8000
```
API Docs auto-generated at: `http://localhost:8000/docs`

### 2. Node.js Backend
```bash
cd backend-node
npm run dev    # uses node --watch for auto-reload
# OR
npm start
```
Runs on: `http://localhost:4000`

### 3. React Frontend
```bash
cd frontend
npm run dev
```
Runs on: `http://localhost:5173`

---

## Pillar 2 — Resume Intelligence: RAG Pipeline

The user's CV is the semantic foundation of the entire platform.

### Pipeline (end-to-end)

```
[User] drops PDF/DOCX
       ↓
[Frontend] ResumeUpload.jsx
  → POST /resume/upload (multipart/form-data)
       ↓
[Node.js] routes/resume.js (multer, 10MB limit)
  → resumeController.js (proxies via node-fetch)
       ↓
[Python FastAPI] POST /resume/upload
       ↓
[rag_engine.py]
  Step 1: parse_resume()
    ├── pdf_parser.py   → pdfplumber, crops header/footer margins
    └── docx_parser.py  → python-docx, paragraph + table extraction
       ↓
  Step 2: chunk_by_section()
    → Gemini 2.0 Flash (JSON mode)
    → Classifies text into: summary, experience, education,
      skills, projects, certifications, awards, publications, other
    → Splits long sections (e.g. multiple jobs) into per-entry chunks
       ↓
  Step 3: embed_and_store()
    → Gemini text-embedding-004 (task_type: retrieval_document)
    → ChromaDB PersistentClient (cosine similarity space)
    → Upserts keyed by user_id (replaces old data on re-upload)
       ↓
  Returns: { chunk_count, sections: { experience: 3, skills: 1, ... } }
       ↓
[Frontend] Section breakdown chips + "Profile Indexed" banner displayed
```

### Query Flow (used by downstream features)

```
[Any Feature] (job matching, cover letters, gap analysis)
  → POST /resume/query { user_id, query, n_results }
       ↓
[rag_engine.py] query_resume()
  → Embed query with text-embedding-004 (task_type: retrieval_query)
  → ChromaDB cosine similarity search, filtered by user_id
  → Returns top-k chunks with section label + similarity score
```

### Key Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Vector DB | ChromaDB (persistent) | Zero infrastructure, file-based, works offline |
| Embeddings | Gemini `text-embedding-004` | Uses existing GEMINI_API_KEY, strong multilingual support |
| Section classification | Gemini Flash (LLM) | Robust to varied CV formats; no brittle regex |
| User ID | `local_user` (localStorage) | Correct for auth-less hackathon build; trivially swappable |
| Node as relay | Express → Python FastAPI | Maintains clean architecture; frontend never calls Python directly |

---

## Pillar 1 — Job Hunter: Architecture

```
[Frontend] JobHunter.jsx
  → POST /jobs/search { query }
       ↓
[Node.js] routes/jobs.js
  → execFile(python, [job_agent.py, query])  ← subprocess bridge
       ↓
[Python] job_agent.py
  → Tavily advanced search (5 results, raw_content, time_range: month)
  → Gemini 3.5 Flash structured extraction → JobListingExtraction schema
  → Prints ---JSON_START--- ... ---JSON_END--- to stdout
       ↓
[Node.js] Parses JSON between markers, returns { jobs: [...] }
       ↓
[Frontend] Renders JobCard grid
```

---

## Workflow Summary

```
User Action → React Frontend → Node.js (port 4000) → Python FastAPI (port 8000)
                                     ↕                        ↕
                              PostgreSQL/MongoDB          ChromaDB (vectors)
```

1. **Standard CRUD** (tracker, user settings) → Node handles directly with DB
2. **AI Operations** (resume indexing, job search, chat) → Node relays to Python
3. **Resume RAG** → Python stores in ChromaDB; every other AI feature queries it

*This document is updated as each pillar is implemented.*
