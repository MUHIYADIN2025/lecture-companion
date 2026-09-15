"""
WebSocket router: the real-time backbone of the app.

Protocol (binary + JSON control messages over one WebSocket per lecture session):
  Client -> Server:
    - binary frames: raw 16-bit PCM mono audio, 16kHz, ~3-5s chunks
    - {"type": "end_session"}: client stops recording

  Server -> Client:
    - {"type": "transcript_update", "text": "...", "full_transcript": "..."}
    - {"type": "notes_update", "bullets": ["...", "..."]}
    - {"type": "error", "message": "..."}

Each connected session gets its own LectureSession row (persisted
incrementally) and its own transcript-RAG collection, so concurrent
lectures never mix data.
"""
import asyncio
import json
import logging
from typing import Dict

from fastapi import WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app.database import SessionLocal, LectureSession
from app.services import rag_engine
from app.services.stt_stream import transcribe_chunk
from app.services.summarizer import SummaryTrigger, generate_notes_for_segment

logger = logging.getLogger(__name__)


class LectureConnection:
    """Per-connection state for one active lecture recording session."""

    def __init__(self, websocket: WebSocket, session_id: str, db_id: int):
        self.websocket = websocket
        self.session_id = session_id
        self.db_id = db_id
        self.full_transcript = ""
        self.chunk_index = 0
        self.summary_trigger = SummaryTrigger()
        self.all_notes = []

    async def handle_audio_chunk(self, audio_bytes: bytes):
        # Run the (CPU-bound) transcription in a thread so it doesn't block
        # the event loop — important since faster-whisper is synchronous.
        text = await asyncio.to_thread(transcribe_chunk, audio_bytes)
        if not text:
            return

        self.full_transcript += (" " if self.full_transcript else "") + text
        self.chunk_index += 1

        # Index into the RAG store so Q&A can retrieve it immediately.
        await asyncio.to_thread(
            rag_engine.index_transcript_chunk, self.session_id, text, self.chunk_index
        )

        await self.websocket.send_json({
            "type": "transcript_update",
            "text": text,
            "full_transcript": self.full_transcript,
        })

        self._persist()

        # Check if enough new text has accumulated to generate a note batch.
        if self.summary_trigger.add_text(text):
            segment = self.summary_trigger.consume()
            try:
                bullets = await asyncio.to_thread(generate_notes_for_segment, segment)
            except RuntimeError as exc:
                await self.websocket.send_json({"type": "error", "message": str(exc)})
                return

            if bullets:
                self.all_notes.append(bullets)
                await self.websocket.send_json({"type": "notes_update", "bullets": bullets})
                self._persist()

    def _persist(self):
        """Writes current transcript + notes to the DB (called after each update)."""
        db: Session = SessionLocal()
        try:
            record = db.query(LectureSession).filter(LectureSession.id == self.db_id).first()
            if record:
                record.transcript = self.full_transcript
                record.notes_json = json.dumps(self.all_notes)
                db.commit()
        finally:
            db.close()

    def end_session(self):
        from datetime import datetime
        db: Session = SessionLocal()
        try:
            record = db.query(LectureSession).filter(LectureSession.id == self.db_id).first()
            if record:
                record.ended_at = datetime.utcnow()
                db.commit()
        finally:
            db.close()
        rag_engine.clear_session(self.session_id)


async def websocket_endpoint(websocket: WebSocket, title: str = "Untitled Lecture"):
    await websocket.accept()

    db: Session = SessionLocal()
    try:
        record = LectureSession(title=title)
        db.add(record)
        db.commit()
        db.refresh(record)
        db_id = record.id
    finally:
        db.close()

    session_id = str(db_id)
    connection = LectureConnection(websocket, session_id, db_id)

    await websocket.send_json({"type": "session_started", "session_id": session_id})

    try:
        while True:
            message = await websocket.receive()

            if "bytes" in message and message["bytes"] is not None:
                await connection.handle_audio_chunk(message["bytes"])

            elif "text" in message and message["text"] is not None:
                try:
                    payload = json.loads(message["text"])
                except json.JSONDecodeError:
                    continue

                if payload.get("type") == "end_session":
                    connection.end_session()
                    await websocket.send_json({"type": "session_ended"})
                    break

    except WebSocketDisconnect:
        logger.info("WebSocket disconnected for session %s", session_id)
        connection.end_session()
    except Exception:
        logger.exception("Unexpected error in websocket session %s", session_id)
        connection.end_session()
