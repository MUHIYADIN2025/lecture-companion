"""
Real-Time Lecture Companion — FastAPI entry point.

Run (see run.py for the Windows-safe launcher, same pattern as the
accessibility-auditor project — needed here too since faster-whisper/
chromadb can spawn worker processes):
    py run.py              (Windows)
    uvicorn app.main:app --reload --port 8000   (Mac/Linux)

Endpoints:
    WS   /ws/lecture?title=...   -> real-time audio in, transcript/notes out
    POST /api/ask                -> Q&A over the live/past transcript (RAG)
    GET  /api/lectures           -> list past lecture sessions
    GET  /api/lectures/{id}      -> full transcript + notes for one session
    DELETE /api/lectures/{id}    -> delete a lecture record
"""
import logging

from fastapi import FastAPI, HTTPException, Depends, WebSocket, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import init_db, get_db, LectureSession
from app.schemas import AskRequest, AskResponse, LectureSummary, LectureDetail
from app.services import rag_engine
from app.websocket_handler import websocket_endpoint

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger(__name__)

settings = get_settings()

app = FastAPI(
    title="Real-Time Lecture Companion API",
    description="Live speech-to-text, AI note generation, and RAG-based Q&A over lectures.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    init_db()
    logger.info("Database initialized. Environment: %s", settings.app_env)
    logger.info(
        "Whisper model '%s' will load on first audio chunk (lazy init).",
        settings.whisper_model_size,
    )


@app.get("/")
def root():
    return {"status": "ok", "service": "Real-Time Lecture Companion API"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}


@app.websocket("/ws/lecture")
async def lecture_websocket(websocket: WebSocket, title: str = Query(default="Untitled Lecture")):
    await websocket_endpoint(websocket, title=title)


@app.post("/api/ask", response_model=AskResponse)
def ask_question(payload: AskRequest):
    try:
        result = rag_engine.answer_question(payload.session_id, payload.question)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Q&A failed")
        raise HTTPException(status_code=500, detail="Failed to answer question.") from exc
    return result


@app.get("/api/lectures", response_model=list[LectureSummary])
def list_lectures(limit: int = 50, db: Session = Depends(get_db)):
    return (
        db.query(LectureSession)
        .order_by(LectureSession.started_at.desc())
        .limit(min(limit, 200))
        .all()
    )


@app.get("/api/lectures/{lecture_id}", response_model=LectureDetail)
def get_lecture(lecture_id: int, db: Session = Depends(get_db)):
    record = db.query(LectureSession).filter(LectureSession.id == lecture_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Lecture not found.")
    return record.to_dict()


@app.delete("/api/lectures/{lecture_id}")
def delete_lecture(lecture_id: int, db: Session = Depends(get_db)):
    record = db.query(LectureSession).filter(LectureSession.id == lecture_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Lecture not found.")
    db.delete(record)
    db.commit()
    return {"status": "deleted", "id": lecture_id}
