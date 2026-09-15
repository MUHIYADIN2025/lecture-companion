"""
Shared LLM dispatch used by both rag_engine.py (Q&A) and summarizer.py
(live notes) — one place to swap providers via LLM_PROVIDER in .env.
"""
import logging

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

_openai_client = None


def _call_ollama(system_prompt: str, user_prompt: str) -> str:
    try:
        response = httpx.post(
            f"{settings.ollama_base_url}/api/chat",
            json={
                "model": settings.ollama_model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                "stream": False,
                "options": {"temperature": 0.2},
            },
            timeout=60.0,
        )
        response.raise_for_status()
        return response.json()["message"]["content"].strip()
    except httpx.ConnectError as exc:
        raise RuntimeError(
            f"Could not reach Ollama at {settings.ollama_base_url}. "
            f"Start it with 'ollama serve' and ensure '{settings.ollama_model}' is pulled."
        ) from exc


def _call_openai(system_prompt: str, user_prompt: str) -> str:
    global _openai_client
    if _openai_client is None:
        from openai import OpenAI
        _openai_client = OpenAI(api_key=settings.openai_api_key)

    response = _openai_client.chat.completions.create(
        model=settings.llm_model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.2,
        max_tokens=400,
    )
    return response.choices[0].message.content.strip()


def call_llm(system_prompt: str, user_prompt: str) -> str:
    """Provider-agnostic dispatch, controlled by LLM_PROVIDER in .env."""
    if settings.llm_provider == "ollama":
        return _call_ollama(system_prompt, user_prompt)
    if settings.llm_provider == "openai":
        return _call_openai(system_prompt, user_prompt)
    raise ValueError(f"Unknown LLM_PROVIDER '{settings.llm_provider}'")
