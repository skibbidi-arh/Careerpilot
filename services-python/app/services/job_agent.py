import os
import sys
import asyncio
import json
from datetime import datetime
from pathlib import Path
from typing import List
from pydantic import BaseModel, Field

# NEW: Import dotenv loaders
from dotenv import load_dotenv

# Google and Tavily Tooling
from google import genai
from google.genai import types
from tavily import AsyncTavilyClient
from tabulate import tabulate

# -------------------------------------------------------------------------
# DYNAMIC .ENV LOADING
# -------------------------------------------------------------------------
# Finds the absolute path to this file, then climbs up 2 levels 
# (from app/services/job_agent.py up to services-python/) to locate the root .env
current_file = Path(__file__).resolve()
project_root = current_file.parents[2] 
env_path = project_root / '.env'

# Explicitly load the environmental variables from the root folder
load_dotenv(dotenv_path=env_path)

# Verify keys are fetched before firing up clients
if not os.getenv("TAVILY_API_KEY") or not os.getenv("GEMINI_API_KEY"):
    print(f"⚠️ Warning: Missing API keys in environment! Checked file path: {env_path}", file=sys.stderr)

# Initialize Clients with explicitly retrieved variables
tavily_client = AsyncTavilyClient(api_key=os.getenv("TAVILY_API_KEY"))
gemini_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# -------------------------------------------------------------------------
# SCHEMA DEFINITIONS
# -------------------------------------------------------------------------
class JobOpportunity(BaseModel):
    title: str = Field(description="The specific job or internship title.")
    company: str = Field(description="Name of the hiring company or organization.")
    location: str = Field(description="Location (e.g., Remote, San Francisco, CA, Hybrid).")
    link: str = Field(description="The direct application link or source URL.")
    key_requirements: List[str] = Field(description="Top 2-3 required skills or qualifications mentioned.")
    summary: str = Field(description="A brief 1-sentence summary of the role.")

class JobListingExtraction(BaseModel):
    listings: List[JobOpportunity]

# -------------------------------------------------------------------------
# CORE AGENT LOGIC
# -------------------------------------------------------------------------
async def job_hunter_agent(prompt: str, max_search_results: int = 5):
    print(f"\n🚀 Running Free Job Hunter Agent for: '{prompt}'...", file=sys.stderr)
    
    # --- STEP 1: Smart Web Search via Tavily ---
    print("🔍 Searching the web using Tavily...", file=sys.stderr)
    search_response = await tavily_client.search(
        query=f"{prompt} job openings postings 2026",
        search_depth="advanced",
        max_results=max_search_results,
        include_raw_content=True,
        time_range="month" 
    )
    
    results = search_response.get("results", [])
    if not results:
        print("❌ No search results found.", file=sys.stderr)
        return []

    print(f"✅ Found {len(results)} source pages. Filtering content layouts...", file=sys.stderr)

    # --- STEP 2: Aggregate Context for Gemini ---
    aggregated_context = ""
    for i, res in enumerate(results, start=1):
        page_content = res.get("raw_content") or res.get("content", "")
        aggregated_context += f"\n--- SOURCE {i} ({res['url']}) ---\n{page_content}\n"

    # --- STEP 3: Structural Extraction via Free Gemini 3.5 Flash ---
    print("🧠 Extracting structured job records via Gemini 3.5 Flash...", file=sys.stderr)
    
    system_prompt = (
        "You are an expert Job Scraper Agent. Your task is to extract open job or internship listings "
        "from the provided web contexts. Deduplicate listings if they appear multiple times. "
        "Only extract active, valid jobs matching the user's intent. If a source link is specific to a job, "
        "use it; otherwise use the main Source URL provided in the context."
    )
    
    user_prompt = f"User Request: {prompt}\n\nWeb Search Context:\n{aggregated_context}"

    try:
        response = gemini_client.models.generate_content(
            model='gemini-3.5-flash',
            contents=user_prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                response_mime_type="application/json",
                response_schema=JobListingExtraction,
                temperature=0.1
            ),
        )
        
        parsed_data = JobListingExtraction.model_validate_json(response.text)
        return parsed_data.listings

    except Exception as e:
        print(f"❌ Error during Gemini extraction processing: {e}", file=sys.stderr)
        return []

# -------------------------------------------------------------------------
# UTILITY EXPORT FILE FUNCTION
# -------------------------------------------------------------------------
def save_to_txt_file(query: str, jobs: List[JobOpportunity]):
    safe_filename = "".join([c if c.isalnum() else "_" for c in query]).strip("_")
    
    # Save the output file inside a /data folder if it exists, otherwise root
    data_dir = project_root / 'data'
    if data_dir.exists():
        filename = data_dir / f"job_search_{safe_filename}.txt"
    else:
        filename = project_root / f"job_search_{safe_filename}.txt"
        
    current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    with open(filename, "w", encoding="utf-8") as f:
        f.write("=" * 80 + "\n")
        f.write(f"JOB HUNTING REPORT (Powered by Gemini 3.5 Flash)\n")
        f.write(f"Search Criteria: '{query}'\n")
        f.write(f"Generated On   : {current_time}\n")
        f.write("=" * 80 + "\n\n")
        
        f.write("### SUMMARY TABLE ###\n\n")
        table_data = [[j.title, j.company, j.location] for j in jobs]
        summary_table = tabulate(table_data, headers=["Title", "Company", "Location"], tablefmt="grid")
        f.write(summary_table)
        f.write("\n\n" + "=" * 80 + "\n\n")
        
        f.write("### DETAILED JOB DESCRIPTIONS ###\n\n")
        for i, job in enumerate(jobs, start=1):
            f.write(f"{i}. {job.title.upper()} at {job.company.upper()}\n")
            f.write(f"   📍 Location: {job.location}\n")
            f.write(f"   🔗 URL     : {job.link}\n")
            f.write(f"   📝 Summary : {job.summary}\n")
            f.write(f"   ⚡ Key Requirements:\n")
            for req in job.key_requirements:
                f.write(f"      - {req}\n")
            f.write("-" * 50 + "\n")
            
    print(f"💾 Report successfully compiled and saved to: {filename}", file=sys.stderr)

# -------------------------------------------------------------------------
# STANDALONE LOCAL EXECUTION / NODE.JS BRIDGE
# -------------------------------------------------------------------------
async def main():
    # Use command-line arguments instead of blocking input() for Node.js compatibility
    if len(sys.argv) > 1:
        user_query = sys.argv[1]
    else:
        user_query = input("What kind of jobs or internships are you looking for today?\n> ")
    
    if not user_query.strip():
        print("❌ Search query cannot be empty.", file=sys.stderr)
        sys.exit(1)

    jobs = await job_hunter_agent(user_query, max_search_results=5)
    
    if not jobs:
        print("No structured jobs found for this criteria layout.", file=sys.stderr)
        sys.exit(1)

    # Print the raw JSON output to standard out so Node.js can easily parse it
    print("---JSON_START---")
    print(json.dumps([j.model_dump() for j in jobs]))
    print("---JSON_END---")
    
    # Save text file backup
    save_to_txt_file(user_query, jobs)

if __name__ == "__main__":
    asyncio.run(main())