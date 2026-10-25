"""Web interface for the Assignment Reviewer.

Reuses the teacher's LangGraph (build_graph in app.py) and exposes it over HTTP.
Run with:  uvicorn web:app --reload
"""
import os
from functools import lru_cache
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from app import QUESTION, build_graph  # also loads .env

STATIC_DIR = Path(__file__).with_name("static")
MAX_SCORE = 10
RUBRIC = [
    {"key": "supervised", "label": "Supervised learning explained", "max": 3},
    {"key": "unsupervised", "label": "Unsupervised learning explained", "max": 3},
    {"key": "supervised_example", "label": "Supervised example", "max": 2},
    {"key": "unsupervised_example", "label": "Unsupervised example", "max": 2},
]

api = FastAPI(title="Assignment Reviewer", version="1.0.0")
app = api  # uvicorn web:app


class ReviewRequest(BaseModel):
    answer: str = Field(..., min_length=1, max_length=3000)


@lru_cache(maxsize=1)
def _graph():
    return build_graph()


@api.get("/api/question")
def question():
    return {"question": QUESTION, "max_score": MAX_SCORE, "rubric": RUBRIC}


@api.post("/api/review")
def review(req: ReviewRequest):
    answer = req.answer.strip()
    if not answer:
        raise HTTPException(status_code=422, detail="Please enter an answer.")
    if not os.getenv("GROQ_API_KEY"):
        raise HTTPException(status_code=500, detail="Add GROQ_API_KEY to your .env file first.")
    try:
        result = _graph().invoke({"answer": answer}, config={"run_name": "Assignment review"})
    except Exception as e:  # network / model errors
        raise HTTPException(status_code=502, detail=f"The AI review failed: {e}")
    return {
        "score": result["score"],
        "max_score": MAX_SCORE,
        "breakdown": result["breakdown"],
        "feedback": result["feedback"],
        "status": result["status"],
        "route": result["route"],
    }


@api.get("/")
def index():
    return FileResponse(STATIC_DIR / "index.html")


api.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
