import os
from pathlib import Path
from pydantic_settings import BaseSettings

# Resolve the .env file relative to this config file's location
# (services-python/app/config.py → services-python/.env)
_ENV_FILE = Path(__file__).resolve().parents[1] / ".env"


class Settings(BaseSettings):
    # API Keys
    gemini_api_key: str = ""
    tavily_api_key: str = ""

    # Vector DB — ChromaDB persistent storage path
    # Defaults to <services-python>/data/chroma_db
    chroma_db_path: str = str(Path(__file__).resolve().parents[1] / "data" / "chroma_db")

    # ChromaDB collection name for resume profiles
    chroma_collection_name: str = "resume_profiles"

    class Config:
        env_file = str(_ENV_FILE)
        env_file_encoding = "utf-8"
        # Allow extra env vars (e.g. TAVILY_API_KEY already in .env)
        extra = "ignore"


settings = Settings()
