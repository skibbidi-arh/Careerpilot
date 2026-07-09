"""
scoring.py
──────────
Programmatic fit score matrix for Careerpilot.

Computes a numeric match score between a candidate's resume profile
and a job listing. Used by the Job Hunter agent to rank results
by relevance to the user's actual background (Pillar 1 + Pillar 2 integration).

Score components:
  - skills_overlap   (40%): Keyword overlap between resume skills and job requirements
  - title_match      (30%): Semantic closeness of candidate's last title to job title
  - experience_proxy (30%): Rough years-of-experience estimate vs. job requirement
"""

import re
from typing import Optional


def _extract_keywords(text: str) -> set[str]:
    """Lowercase, strip punctuation, return word tokens."""
    return set(re.sub(r"[^\w\s]", " ", text.lower()).split())


def score_fit(candidate: dict, job: dict) -> float:
    """
    Compute a 0–100 fit score between a candidate profile and a job listing.

    Args:
        candidate: Dict with optional keys:
            - 'skills'      (str): Raw skills text from resume
            - 'experience'  (str): Raw experience text from resume
            - 'title'       (str): Most recent job title
        job: Dict with optional keys:
            - 'key_requirements' (list[str]): Required skills/qualifications
            - 'title'            (str): Job title
            - 'summary'          (str): Job description summary

    Returns:
        Float in range [0.0, 100.0] representing the match score.
    """
    score = 0.0

    # ── Skills overlap (40%) ──────────────────────────────────────────────────
    candidate_skills = _extract_keywords(candidate.get("skills", ""))
    candidate_skills |= _extract_keywords(candidate.get("experience", ""))

    job_reqs_text = " ".join(job.get("key_requirements", []))
    job_keywords = _extract_keywords(job_reqs_text + " " + job.get("summary", ""))

    if job_keywords:
        overlap = len(candidate_skills & job_keywords) / len(job_keywords)
        score += overlap * 40.0

    # ── Title match (30%) ─────────────────────────────────────────────────────
    candidate_title = _extract_keywords(candidate.get("title", ""))
    job_title = _extract_keywords(job.get("title", ""))

    if candidate_title and job_title:
        title_overlap = len(candidate_title & job_title) / max(len(job_title), 1)
        score += title_overlap * 30.0

    # ── Experience proxy (30%) ────────────────────────────────────────────────
    # Detect how many years of experience the job mentions, then reward
    # candidates whose experience text has mention of years >= that threshold.
    years_required = 0
    years_match = re.search(r"(\d+)\+?\s*year", job_reqs_text + " " + job.get("summary", ""), re.I)
    if years_match:
        years_required = int(years_match.group(1))

    candidate_exp_text = candidate.get("experience", "")
    candidate_years = 0
    for m in re.finditer(r"(\d{4})\s*[-–]\s*(\d{4}|present|current)", candidate_exp_text, re.I):
        start = int(m.group(1))
        end_str = m.group(2)
        end = 2026 if end_str.lower() in ("present", "current") else int(end_str)
        candidate_years += max(0, end - start)

    if years_required == 0:
        # Job didn't specify — award full experience points
        score += 30.0
    elif candidate_years >= years_required:
        score += 30.0
    elif candidate_years > 0:
        score += (candidate_years / years_required) * 30.0

    return round(min(score, 100.0), 1)
