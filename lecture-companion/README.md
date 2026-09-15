# 🎙️ Real-Time Lecture Companion
Built a multimodal lecture companion that synchronized audio transcripts with slide content to generate grounded explanations, timestamped notes, and quizzes





A live lecture assistant that transcribes speech as a professor talks, generates bullet-point
notes automatically, and lets students ask questions about anything covered so far — all
grounded in what was actually said, not guessed.

---

## 🎯 The Problem I'm Solving

1. **Note-taking competes with listening.** Students who write detailed notes miss what's
   said next; students who don't write notes have nothing to review later. There's no way
   to fully do both in real time.
2. **Zoning out is costly and unrecoverable.** If a student loses focus for two minutes,
   whatever was said in that window is gone — unless someone recorded and can search it,
   which almost never happens in practice.
3. **"I have a question but don't want to interrupt."** Students frequently have a
   clarifying question about something said 10 minutes ago, but by the time there's a
   pause to ask, they've forgotten the exact context — or the moment to ask has passed.

This project treats a lecture as **live, queryable data** rather than something that
disappears the moment it's spoken: every sentence is transcribed, periodically summarized
into notes, and immediately searchable via Q&A — during the lecture, not after.

---

## 🏗️ Architecture

```
Browser mic → AudioContext (resample to 16kHz PCM16) → WebSocket (binary frames)
    → FastAPI WebSocket handler → faster-whisper (local STT, runs per ~4s chunk)
    → transcript text
        ├─→ embedded into a per-session Chroma collection (for Q&A retrieval)
        ├─→ appended to running transcript, persisted to SQLite
        └─→ accumulated until N words reached → LLM generates bullet notes
    → all updates pushed back to the browser over the same WebSocket
    → student types a question → REST /api/ask → RAG retrieval over transcript
        → LLM answers using ONLY what's been said so far
```

**Why chunk-based transcription instead of true streaming ASR?** Fully streaming
(token-by-token) speech recognition requires a streaming-native model architecture and
adds significant complexity. Buffering ~4 seconds of audio and transcribing each chunk with
`faster-whisper` (a fast, local Whisper reimplementation) is the standard, pragmatic pattern
for browser-based "live" transcription — it updates every few seconds, which reads as
real-time to the user, without needing a specialized streaming model or a paid streaming API.

**Why per-session in-memory vector collections?** Each lecture is an isolated context — a
question in Lecture A should never pull an answer from Lecture B. Ephemeral, per-session
Chroma collections keep that isolation clean and avoid unbounded disk growth.

## 📁 Project Structure

```
lecture-companion/
├── backend/
│   ├── app/
│   │   ├── services/
│   │   │   ├── stt_stream.py      # faster-whisper transcription
│   │   │   ├── rag_engine.py      # per-session transcript embedding + Q&A
│   │   │   ├── summarizer.py      # live bullet-point note generation
│   │   │   └── llm_client.py      # shared Ollama/OpenAI dispatch
│   │   ├── websocket_handler.py   # real-time orchestration (audio in, updates out)
│   │   ├── database.py            # SQLite lecture session persistence
│   │   └── main.py                # FastAPI entry point (WS + REST)
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── components/            # AudioRecorder, LiveTranscript, NotesPanel, QAWidget
    │   ├── hooks/useAudioWebSocket.js  # mic capture, resampling, WS streaming
    │   ├── pages/                 # LectureDashboard, HistoryPage
    │   └── App.jsx
    └── package.json
```

---

## ✅ Features Built

- **Live browser-based audio capture** — `AudioContext` + `ScriptProcessorNode` captures mic
  audio, downsamples it to 16kHz PCM16 in-browser, and streams it over a WebSocket in ~4s
  chunks.
- **Local, free speech-to-text** — `faster-whisper` runs entirely offline; no per-minute
  transcription API cost, no audio ever leaves your infrastructure.
- **Live bullet-point notes** — every ~120 words of new transcript triggers an LLM call that
  distills just that segment into 2-5 bullet points, streamed to the notes panel in real time.
- **RAG-based Q&A during the lecture** — students can ask about anything already covered;
  answers are retrieved from an embedded transcript index and generated only from what was
  actually said (explicit "not covered yet" fallback, no hallucinated answers).
- **Full session persistence** — transcript and notes are saved incrementally to SQLite as
  the lecture happens, so a crash or disconnect doesn't lose the session.
- **History dashboard** — browse and review past recorded lectures, full transcript + notes.
- **Pluggable LLM backend** — Ollama (local, free) by default, OpenAI as a drop-in swap.
- **Windows-safe launcher** (`run.py`) — sets the correct asyncio event loop policy before
  Uvicorn starts, avoiding the common `NotImplementedError` Windows subprocess issue.

---

## 🧠 Technical Skills This Project Demonstrates

| Area | Specific Skill |
|---|---|
| **Real-Time Systems** | WebSocket protocol design (binary + JSON message framing), bidirectional streaming, stateful per-connection session management |
| **Audio Engineering** | Web Audio API capture, manual sample-rate conversion (resampling), PCM encoding |
| **Speech Recognition** | Integrating a local ASR model (faster-whisper), chunked/pseudo-streaming transcription strategy, VAD filtering |
| **AI/LLM Integration** | Retrieval-Augmented Generation over a *growing* corpus, prompt engineering for extractive summarization, provider-agnostic LLM abstraction |
| **Backend Engineering** | FastAPI WebSocket + REST hybrid API, async orchestration with `asyncio.to_thread` for CPU-bound work, SQLAlchemy persistence |
| **Frontend Engineering** | Custom React hooks encapsulating complex browser APIs, real-time UI state synchronized with a WebSocket stream, component composition |
| **Systems Design** | Session isolation (per-lecture vector collections), incremental persistence for crash recovery, event-driven update model |
| **DevOps** | Docker Compose orchestration, cross-platform (Windows/Mac/Linux) dev environment handling |

---

## 📄 How to Turn This Into a Strong Resume Bullet

**Weak:**
> Built a lecture transcription app using React, FastAPI, and WebSockets.

**Strong (pick the framing that matches what you emphasize):**

> Built a real-time lecture companion (React, FastAPI, WebSockets, faster-whisper) that
> transcribes speech live, auto-generates notes via LLM, and answers student questions
> through RAG — processing continuous audio streams with sub-5-second latency end-to-end.

> Designed a full-duplex WebSocket architecture handling live audio ingestion, local speech
> recognition, and AI-generated summarization concurrently, with incremental database
> persistence to guarantee zero data loss on disconnect.

> Implemented a retrieval-augmented Q&A system over a continuously growing transcript,
> using per-session vector isolation to let users query lecture content in real time as
> it's being spoken — grounded entirely in the actual transcript, with no hallucinated answers.

**Formula:** `[Action verb] + [what you built] + [key technologies, 2-4 max] + [the concrete
problem it solves] + [a number or technical detail that proves depth]`. For a real-time
system specifically, naming the *latency*, *concurrency model*, or *data-loss guarantee* is
what separates this from "I called an API" — it shows you understood the systems problem,
not just the libraries.

---

## 🚀 Quick Start (Local Dev)

### 1. Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\Activate.ps1
pip install -r requirements.txt

cp .env.example .env
# Default LLM_PROVIDER=ollama — install Ollama (https://ollama.com) and run:
#   ollama pull llama3.1

# Windows: py run.py
# Mac/Linux: uvicorn app.main:app --reload --port 8000
```

> The Whisper model downloads automatically on first use (a few hundred MB, one-time).

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:5173`, allow microphone access, and click the mic button.

### 3. Docker (full stack)

```bash
cp backend/.env.example backend/.env
docker compose up --build
```

---

## 🔌 API Reference

| Type | Endpoint | Description |
|---|---|---|
| `WS` | `/ws/lecture?title=...` | Real-time audio in, transcript/notes updates out |
| `POST` | `/api/ask` | Ask a question about the live/past transcript (RAG) |
| `GET` | `/api/lectures` | List past lecture sessions |
| `GET` | `/api/lectures/{id}` | Full transcript + notes for one session |
| `DELETE` | `/api/lectures/{id}` | Delete a lecture record |

## 🔐 Production Hardening Notes

- Add auth before exposing publicly — anyone could currently start a recording session.
- `faster-whisper` on CPU is fine for demos; for production scale, run it on GPU or batch
  multiple sessions' chunks together.
- The `ScriptProcessorNode` API used for audio capture is deprecated (though still widely
  supported) — migrating to `AudioWorkletNode` is the modern replacement.
- Add reconnection/backoff logic to the WebSocket hook for flaky networks.

## 🧭 Roadmap

- Speaker diarization (distinguish professor vs. student questions in the transcript)
- Export notes/transcript as PDF or Markdown at session end
- Multi-language transcription (faster-whisper supports it — just needs a language selector)
- Highlight-and-ask: let students select a piece of the transcript and ask about just that part

## Author
Muhiadin Said Hassan Software AI Engineer | Machine Learning Engineer | LLM Engineer

GitHub: @MUHIYADIN2025
Email: [muhidiin090448@gmail.com]


⭐ Support If you find this project useful, consider giving the repository a star ⭐ on GitHub.
Contributions, suggestions, and improvements are welcome.

