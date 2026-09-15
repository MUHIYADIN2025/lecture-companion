"""
Live summarizer: converts running transcript text into bullet-point notes
as the lecture progresses, instead of making the student wait until the
end to get a summary.

Triggered every SUMMARY_INTERVAL_WORDS of new transcript text (configured
in .env) — frequent enough to feel "live", infrequent enough to avoid
spamming the LLM on every single transcribed word.
"""
import logging
from typing import List

from app.config import get_settings
from app.services.llm_client import call_llm

logger = logging.getLogger(__name__)
settings = get_settings()

SUMMARY_SYSTEM_PROMPT = """You are a note-taking assistant summarizing a live lecture. You will \
be given a new segment of the lecture transcript. Produce 2-5 concise bullet points capturing \
the key ideas, terms, or facts from THIS segment only — not the whole lecture.

Respond with ONLY the bullet points, one per line, each starting with "- ". No preamble, no \
headers, no extra commentary.
"""


def generate_notes_for_segment(transcript_segment: str) -> List[str]:
    """Generates a small batch of bullet-point notes for one new transcript segment."""
    if not transcript_segment.strip():
        return []

    try:
        raw = call_llm(SUMMARY_SYSTEM_PROMPT, f"Transcript segment:\n{transcript_segment}")
    except RuntimeError:
        raise
    except Exception:
        logger.exception("Note generation failed for segment")
        return []

    bullets = [
        line.strip().lstrip("-").strip()
        for line in raw.splitlines()
        if line.strip().startswith("-")
    ]
    return bullets


class SummaryTrigger:
    """
    Tracks accumulated word count since the last summary and tells the
    caller when it's time to generate a new batch of notes.
    """

    def __init__(self, threshold_words: int = None):
        self.threshold = threshold_words or settings.summary_interval_words
        self._pending_words = 0
        self._pending_text = ""

    def add_text(self, text: str) -> bool:
        """Returns True if enough new text has accumulated to trigger a summary."""
        if not text.strip():
            return False
        self._pending_text += " " + text
        self._pending_words += len(text.split())
        return self._pending_words >= self.threshold

    def consume(self) -> str:
        """Returns the accumulated segment and resets the counter."""
        segment = self._pending_text.strip()
        self._pending_text = ""
        self._pending_words = 0
        return segment
