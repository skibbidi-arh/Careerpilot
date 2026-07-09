"""
rag_engine.py
─────────────
Core RAG pipeline for Careerpilot's Resume Intelligence (Pillar 2).

Pipeline:
  1. parse_resume()      → Extract raw text from PDF or DOCX
  2. chunk_by_section()  → Use Gemini Flash to classify text into semantic sections
  3. embed_and_store()   → Embed each section chunk with Gemini text-embedding-004
                           and upsert into ChromaDB (keyed by user_id)
  4. query_resume()      → Semantic similarity search over a user's stored profile

The ChromaDB collection is persistent on disk. Each user's data is namespaced
by user_id so profiles never bleed into each other.
"""

import json
import os
import sys
from pathlib import Path
from typing import Literal

import chromadb
from dotenv import load_dotenv
from pydantic import BaseModel, Field
from google import genai
from google.genai import types

# ── Ensure .env is loaded (works when run directly or imported) ────────────────
_env_path = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(dotenv_path=_env_path)

# ── Import parsers ─────────────────────────────────────────────────────────────
from app.utils.pdf_parser import parse_pdf
from app.utils.docx_parser import parse_docx

# ── Config ─────────────────────────────────────────────────────────────────────
from app.config import settings

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or settings.gemini_api_key

if not GEMINI_API_KEY:
    print("Warning: GEMINI_API_KEY is not set.", file=sys.stderr)

# Single google.genai Client for both generation and embeddings
_gemini_client = genai.Client(api_key=GEMINI_API_KEY)

# ── ChromaDB client (persistent, stored on disk) ───────────────────────────────
_chroma_client = chromadb.PersistentClient(path=settings.chroma_db_path)
_collection = _chroma_client.get_or_create_collection(
    name=settings.chroma_collection_name,
    metadata={"hnsw:space": "cosine"},
)


# ── Pydantic schema for section classification output ──────────────────────────
SectionType = Literal[
    "summary",
    "experience",
    "education",
    "skills",
    "projects",
    "certifications",
    "awards",
    "publications",
    "other",
]


class ResumeSection(BaseModel):
    section: SectionType = Field(description="The semantic section type this text belongs to.")
    text: str = Field(description="The full verbatim text content of this section.")


class ResumeSections(BaseModel):
    sections: list[ResumeSection] = Field(
        description="All identified sections extracted from the resume text."
    )


# ──────────────────────────────────────────────────────────────────────────────
# STEP 1: Parse
# ──────────────────────────────────────────────────────────────────────────────
def parse_resume(file_path: str, file_type: str) -> str:
    """
    Extract raw text from a resume file.

    Args:
        file_path: Path to the uploaded file.
        file_type: Either 'pdf' or 'docx'.

    Returns:
        Raw extracted text as a string.
    """
    ft = file_type.lower().strip(".")
    if ft == "pdf":
        return parse_pdf(file_path)
    elif ft in ("docx", "doc"):
        return parse_docx(file_path)
    else:
        raise ValueError(f"Unsupported file type: {file_type}. Supported: pdf, docx.")


# ──────────────────────────────────────────────────────────────────────────────
# STEP 2: Chunk by Section (LLM-based classification)
# ──────────────────────────────────────────────────────────────────────────────
def chunk_by_section(raw_text: str) -> list[ResumeSection]:
    """
    Use Gemini Flash to intelligently split resume text into semantic sections.

    Rather than fragile regex on headers, Gemini reads the full resume and
    returns each identified section with its type and verbatim text content.

    Args:
        raw_text: The full extracted resume text.

    Returns:
        A list of ResumeSection objects, each with a section type and its text.
    """
    system_prompt = (
        "You are an expert resume parser. You will receive the raw extracted text of a resume. "
        "Your task is to identify and separate it into its semantic sections. "
        "For each section, identify its type (summary, experience, education, skills, projects, "
        "certifications, awards, publications, or other) and extract the FULL verbatim text "
        "for that section. Do not summarize or rephrase — preserve the exact text. "
        "If a section is very long (e.g. multiple jobs in experience), split each distinct "
        "job/entry as a separate 'experience' section for better retrieval granularity. "
        "Output JSON conforming to the provided schema."
    )

    user_prompt = f"Resume Text:\n\n{raw_text}"

    print("🧠 Classifying resume sections via Gemini Flash...", file=sys.stderr)

    response = _gemini_client.models.generate_content(
        model="gemini-2.0-flash",
        contents=user_prompt,
        config=types.GenerateContentConfig(
            system_instruction=system_prompt,
            response_mime_type="application/json",
            response_schema=ResumeSections,
            temperature=0.0,
        ),
    )

    parsed = ResumeSections.model_validate_json(response.text)
    print(f"✅ Identified {len(parsed.sections)} sections.", file=sys.stderr)
    return parsed.sections


# ──────────────────────────────────────────────────────────────────────────────
# STEP 3: Embed & Store in ChromaDB
# ──────────────────────────────────────────────────────────────────────────────
def embed_and_store(user_id: str, sections: list[ResumeSection]) -> int:
    """
    Embed each section chunk using Gemini text-embedding-004 and upsert
    into ChromaDB, keyed by user_id.

    Existing chunks for this user are replaced (upsert by deterministic ID).

    Args:
        user_id: Unique identifier for the user (e.g. 'local_user').
        sections: List of classified ResumeSection objects.

    Returns:
        The number of chunks stored.
    """
    # Remove all existing chunks for this user before re-indexing
    existing = _collection.get(where={"user_id": user_id})
    if existing["ids"]:
        _collection.delete(ids=existing["ids"])
        print(f"🗑️  Cleared {len(existing['ids'])} existing chunks for user '{user_id}'.", file=sys.stderr)

    documents: list[str] = []
    metadatas: list[dict] = []
    ids: list[str] = []
    embeddings: list[list[float]] = []

    print(f"🔢 Embedding {len(sections)} sections...", file=sys.stderr)

    for i, section in enumerate(sections):
        text = section.text.strip()
        if not text:
            continue

        # Generate embedding via Gemini text-embedding-004
        embed_response = _gemini_client.models.embed_content(
            model="text-embedding-004",
            contents=text,
            config=types.EmbedContentConfig(
                task_type="RETRIEVAL_DOCUMENT",
                title=f"{section.section.capitalize()} (Resume)",
            ),
        )
        embedding = embed_response.embeddings[0].values

        chunk_id = f"{user_id}_{section.section}_{i}"
        documents.append(text)
        metadatas.append({
            "user_id": user_id,
            "section": section.section,
            "chunk_index": i,
        })
        ids.append(chunk_id)
        embeddings.append(embedding)

    if documents:
        _collection.upsert(
            documents=documents,
            metadatas=metadatas,
            ids=ids,
            embeddings=embeddings,
        )
        print(f"✅ Stored {len(documents)} chunks in ChromaDB for user '{user_id}'.", file=sys.stderr)

    return len(documents)


# ──────────────────────────────────────────────────────────────────────────────
# STEP 4: Query Resume (RAG retrieval)
# ──────────────────────────────────────────────────────────────────────────────
def query_resume(user_id: str, query: str, n_results: int = 5) -> list[dict]:
    """
    Perform a semantic similarity search against a user's stored resume profile.

    Used by downstream features: job matching, cover letter gen, gap analysis.

    Args:
        user_id:   The user whose profile to search.
        query:     The natural language query (e.g. "Python experience", "education background").
        n_results: Max number of matching chunks to return.

    Returns:
        A list of dicts with 'section', 'text', and 'score' (distance) for each match.
    """
    # Embed the query
    embed_response = _gemini_client.models.embed_content(
        model="text-embedding-004",
        contents=query,
        config=types.EmbedContentConfig(
            task_type="RETRIEVAL_QUERY",
        ),
    )
    query_embedding = embed_response.embeddings[0].values

    results = _collection.query(
        query_embeddings=[query_embedding],
        n_results=n_results,
        where={"user_id": user_id},
        include=["documents", "metadatas", "distances"],
    )

    chunks = []
    docs = results.get("documents", [[]])[0]
    metas = results.get("metadatas", [[]])[0]
    distances = results.get("distances", [[]])[0]

    for doc, meta, dist in zip(docs, metas, distances):
        chunks.append({
            "section": meta.get("section", "unknown"),
            "text": doc,
            "score": round(1 - dist, 4),  # Convert cosine distance → similarity score
        })

    return chunks


# ──────────────────────────────────────────────────────────────────────────────
# STATUS HELPER
# ──────────────────────────────────────────────────────────────────────────────
def get_profile_status(user_id: str) -> dict:
    """
    Check whether a user has an indexed resume profile.

    Returns:
        Dict with 'indexed' (bool), 'chunk_count' (int), and 'sections' (list of unique section types).
    """
    existing = _collection.get(where={"user_id": user_id}, include=["metadatas"])
    chunk_count = len(existing["ids"])
    sections = list({m["section"] for m in existing["metadatas"]}) if existing["metadatas"] else []
    return {
        "indexed": chunk_count > 0,
        "chunk_count": chunk_count,
        "sections": sorted(sections),
    }
