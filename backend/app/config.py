"""Typed settings loaded from .env — see .env.example for all options."""
from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Speech-to-text
    whisper_model_size: str = "base"
    whisper_device: str = "cpu"
    whisper_compute_type: str = "int8"

    # LLM
    llm_provider: str = "ollama"
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.1"
    openai_api_key: str = ""
    llm_model: str = "gpt-4o-mini"

    # Embeddings / RAG
    embedding_model: str = "all-MiniLM-L6-v2"

    # Summarization cadence
    summary_interval_words: int = 120

    # App
    app_env: str = "development"
    cors_origins: str = "http://localhost:5173,http://localhost:3000"
    database_url: str = "sqlite:///./lectures.db"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
