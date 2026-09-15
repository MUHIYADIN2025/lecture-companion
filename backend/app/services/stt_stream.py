"""
Real-time-ish speech-to-text using faster-whisper — a fast, local
reimplementation of OpenAI's Whisper model (runs 100% offline, no API cost).

True token-by-token streaming ASR is a much harder problem (requires a
streaming-native model like Whisper-streaming or a cloud streaming API).
The pragmatic, widely-used pattern for browser-based "live" transcription is
what's implemented here: the frontend buffers ~3-5 seconds of mic audio,
sends each chunk over the WebSocket, and the backend transcribes each chunk
as it arrives — giving the user a transcript that updates every few seconds,
which reads as "real-time" without the complexity of a fully streaming model.
"""
import io
import logging
import wave
from typing import Optional

import numpy as np
from faster_whisper import WhisperModel

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

_model: Optional[WhisperModel] = None


def get_model() -> WhisperModel:
    """Lazily loads the Whisper model once per process (it's memory-heavy)."""
    global _model
    if _model is None:
        logger.info(
            "Loading faster-whisper model '%s' (device=%s, compute_type=%s)...",
            settings.whisper_model_size, settings.whisper_device, settings.whisper_compute_type,
        )
        _model = WhisperModel(
            settings.whisper_model_size,
            device=settings.whisper_device,
            compute_type=settings.whisper_compute_type,
        )
        logger.info("Whisper model loaded.")
    return _model


def pcm16_bytes_to_float32(audio_bytes: bytes) -> np.ndarray:
    """Converts raw 16-bit PCM mono audio bytes into the float32 array Whisper expects."""
    audio_int16 = np.frombuffer(audio_bytes, dtype=np.int16)
    return audio_int16.astype(np.float32) / 32768.0


def transcribe_chunk(audio_bytes: bytes, sample_rate: int = 16000) -> str:
    """
    Transcribes one audio chunk (raw 16-bit PCM mono, resampled to 16kHz by
    the frontend before sending) and returns the recognized text.
    """
    if not audio_bytes:
        return ""

    audio_array = pcm16_bytes_to_float32(audio_bytes)
    if audio_array.size == 0:
        return ""

    model = get_model()
    segments, _info = model.transcribe(
        audio_array,
        language="en",
        vad_filter=True,  # skips silence, reduces hallucinated text on quiet chunks
        beam_size=1,      # greedy decoding — faster, good enough for live captions
    )

    text = " ".join(segment.text.strip() for segment in segments).strip()
    return text


def wav_bytes_to_pcm16(wav_bytes: bytes) -> bytes:
    """
    Fallback helper: if the frontend sends a WAV container instead of raw
    PCM, extract the raw PCM frames from it.
    """
    with wave.open(io.BytesIO(wav_bytes), "rb") as wf:
        return wf.readframes(wf.getnframes())
