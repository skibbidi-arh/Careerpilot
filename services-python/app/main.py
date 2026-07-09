"""
main.py
───────
FastAPI application entry point for Careerpilot AI Services.

Routers:
  /          → health check
  /resume/*  → Pillar 2: Resume Intelligence (RAG pipeline)
"""

import os
import shutil
import sys
import tempfile
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.services.rag_engine import (
    chunk_by_section,
    embed_and_store,
    get_profile_status,
    parse_resume,
    query_resume,
)

# ── App setup ──────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Careerpilot AI Services",
    description="Python AI microservice layer powering Resume Intelligence, Job Matching, and Chat.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Health check ───────────────────────────────────────────────────────────────
@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "message": "Careerpilot AI Services running."}


# ══════════════════════════════════════════════════════════════════════════════
# PILLAR 2: Resume Intelligence
# ══════════════════════════════════════════════════════════════════════════════

@app.post("/resume/upload", tags=["Resume"])
async def upload_resume(
    file: UploadFile = File(...),
    user_id: str = Form(default="local_user"),
):
    """
    Accept a PDF or DOCX resume, run the full RAG pipeline:
      1. Save to temp file
      2. Parse text
      3. Classify into sections via Gemini Flash
      4. Embed + store in ChromaDB

    Returns the list of identified sections and chunk count.
    """
    # Validate file type
    filename = file.filename or ""
    suffix = Path(filename).suffix.lower()
    if suffix not in (".pdf", ".docx", ".doc"):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{suffix}'. Please upload a PDF or DOCX file.",
        )

    file_type = "pdf" if suffix == ".pdf" else "docx"

    # Save uploaded file to a temp location
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name

    try:
        print(f"\n📄 Processing resume upload for user '{user_id}' ({filename})...", file=sys.stderr)

        # Step 1: Parse
        raw_text = parse_resume(tmp_path, file_type)
        if not raw_text.strip():
            raise HTTPException(status_code=422, detail="Could not extract text from the uploaded file.")

        # Step 2: Chunk by section
        sections = chunk_by_section(raw_text)
        if not sections:
            raise HTTPException(status_code=422, detail="Could not identify any resume sections.")

        # Step 3: Embed + store
        chunk_count = embed_and_store(user_id, sections)

        section_summary = {}
        for s in sections:
            section_summary[s.section] = section_summary.get(s.section, 0) + 1

        return {
            "success": True,
            "user_id": user_id,
            "filename": filename,
            "chunk_count": chunk_count,
            "sections": section_summary,
            "message": f"Resume indexed successfully with {chunk_count} chunks across {len(section_summary)} section types.",
        }

    finally:
        # Always clean up the temp file
        os.unlink(tmp_path)


@app.get("/resume/status/{user_id}", tags=["Resume"])
def resume_status(user_id: str):
    """
    Check whether a user has an indexed resume profile and how many chunks are stored.
    """
    status = get_profile_status(user_id)
    return {
        "user_id": user_id,
        **status,
    }


class ResumeQueryRequest(BaseModel):
    user_id: str = "local_user"
    query: str
    n_results: int = 5


@app.post("/resume/query", tags=["Resume"])
def query_resume_endpoint(req: ResumeQueryRequest):
    """
    Semantic similarity search over a user's stored resume profile.
    Used by downstream features: job matching, cover letters, gap analysis.
    """
    status = get_profile_status(req.user_id)
    if not status["indexed"]:
        raise HTTPException(
            status_code=404,
            detail=f"No indexed resume found for user '{req.user_id}'. Please upload a CV first.",
        )

    chunks = query_resume(req.user_id, req.query, n_results=req.n_results)
    return {
        "user_id": req.user_id,
        "query": req.query,
        "results": chunks,
    }
