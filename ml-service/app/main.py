from typing import List

from fastapi import FastAPI
from pydantic import BaseModel, Field

from .analyzer import analyze_files, model
from .features import FEATURES
from .model import level

app = FastAPI(title="BugSight ML service", version="1.0.0")


class FileIn(BaseModel):
    path: str
    content: str = Field(max_length=1_000_000)


class AnalyzeIn(BaseModel):
    files: List[FileIn] = Field(min_length=1, max_length=50)


class PredictIn(BaseModel):
    metrics: List[dict]


@app.get("/health")
def health():
    return {"status": "ok", "model": model.name}


@app.post("/analyze")
def analyze(body: AnalyzeIn):
    return analyze_files([f.model_dump() for f in body.files])


@app.post("/predict")
def predict(body: PredictIn):
    probs = model.predict([[m.get(f, 0) for f in FEATURES] for m in body.metrics])
    return {"predictions": [{"risk": round(float(p), 3), "level": level(float(p))} for p in probs]}
