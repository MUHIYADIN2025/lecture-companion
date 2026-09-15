from datetime import datetime
from typing import Dict, List, Optional

from pydantic import BaseModel, Field


class AskRequest(BaseModel):
    session_id: str
    question: str = Field(..., min_length=3, max_length=500)


class AskResponse(BaseModel):
    answer: str
    excerpts: List[str]


class LectureSummary(BaseModel):
    id: int
    title: str
    started_at: datetime
    ended_at: Optional[datetime]

    class Config:
        from_attributes = True


class LectureDetail(BaseModel):
    id: int
    title: str
    transcript: str
    notes: List[List[str]]
    started_at: str
    ended_at: Optional[str]
