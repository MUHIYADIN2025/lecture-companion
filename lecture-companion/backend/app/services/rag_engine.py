"""
Lecture transcript Q&A via RAG.

As the transcript grows, we chunk and embed new text into an in-memory
Chroma collection (one per active lecture session). When a student asks a
question, we retrieve the most relevant transcript excerpts and ask the LLM
to answer using ONLY what's been said so far — this is what lets a student
who joined late (or zoned out) ask "what did the professor just say about
X?" and get a grounded answer instead of a hallucinated one.

Why per-session in-memory collections instead of one shared persistent
store? Each lecture is an isolated context — a question in Lecture A should
never retrieve content from Lecture B. Ephemeral in-memory collections keep
sessions cleanly separated and avoid unbounded disk growth from every past
lecture ever recorded.
"""
import logging
from typing import Dict, List

import chromadb
from chromadb.utils import embedding_functions

from app.config import get_settings
from app.services.llm_client import call_llm

logger = logging.getLogger(__name__)
settings = get_settings()

_chroma_client = None
_embedding_fn = None
_session_collections: Dict[str, "chromadb.Collection"] = {}


def _get_chroma_client():
    global _chroma_client
    if _chroma_client is None:
        _chroma_client = chromadb.Client()  # in-memory, not persisted to disk
    return _chroma_client


def _get_embedding_fn():
    global _embedding_fn
    if _embedding_fn is None:
        _embedding_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name=settings.embedding_model
        )
    return _embedding_fn


def get_session_collection(session_id: str):
    """Lazily creates (or returns) the vector collection for one lecture session."""
    if session_id not in _session_collections:
        client = _get_chroma_client()
        _session_collections[session_id] = client.get_or_create_collection(
            name=f"lecture_{session_id}",
            embedding_function=_get_embedding_fn(),
        )
    return _session_collections[session_id]


def index_transcript_chunk(session_id: str, text: str, chunk_index: int) -> None:
    """Embeds and stores one new transcript chunk as it arrives."""
    if not text.strip():
        return
    collection = get_session_collection(session_id)
    collection.add(
        ids=[f"{session_id}-{chunk_index}"],
        documents=[text],
        metadatas=[{"chunk_index": chunk_index}],
    )


def retrieve_relevant_excerpts(session_id: str, question: str, top_k: int = 4) -> List[str]:
    collection = get_session_collection(session_id)
    if collection.count() == 0:
        return []

    results = collection.query(query_texts=[question], n_results=min(top_k, collection.count()))
    return results.get("documents", [[]])[0]


QA_SYSTEM_PROMPT = """You are a helpful lecture assistant. Answer the student's question using \
ONLY the provided lecture transcript excerpts. If the answer isn't in the excerpts, say so \
clearly rather than guessing — the lecture may not have covered it yet. Keep answers concise \
and student-friendly.
"""


def answer_question(session_id: str, question: str) -> Dict:
    excerpts = retrieve_relevant_excerpts(session_id, question)

    if not excerpts:
        return {
            "answer": "Nothing relevant has been said in the lecture yet — try asking again "
            "once more of the lecture has been covered.",
            "excerpts": [],
        }

    context_block = "\n\n".join(f"- {e}" for e in excerpts)
    user_prompt = f"Lecture excerpts so far:\n{context_block}\n\nQuestion: {question}\n\nAnswer:"

    answer = call_llm(QA_SYSTEM_PROMPT, user_prompt)
    return {"answer": answer, "excerpts": excerpts}


def clear_session(session_id: str) -> None:
    """Cleans up the in-memory collection when a lecture ends."""
    client = _get_chroma_client()
    try:
        client.delete_collection(f"lecture_{session_id}")
    except Exception:
        pass
    _session_collections.pop(session_id, None)
