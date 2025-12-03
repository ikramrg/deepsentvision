# FastAPI Integration Guide

A practical, generic guide to integrate FastAPI into any project (frontend + backend), with Windows-friendly steps.

## Goal
- Add a FastAPI backend that exposes HTTP endpoints your frontend can call.
- Support JSON payloads, file uploads, and optional ML model inference.
- Make it easy to run locally and deploy.

## Prerequisites
- Python 3.9+
- pip or pipx
- Optional: virtualenv or venv
- Optional (ML projects): PyTorch/TensorFlow and a trained model file

## Suggested Project Structure
```
project-root/
  backend/
    src/
      api/           # FastAPI app code
      inference/     # model loading & prediction (optional)
    venv/            # Python virtual environment (optional)
    requirements.txt # backend dependencies
  frontend/          # React/Vue/Angular/etc.
  .env               # environment variables (optional)
```

## Install Dependencies
- Create and activate a virtual environment (recommended):
```
python -m venv backend/venv
backend/venv/Scripts/activate
```
- Install FastAPI and a server:
```
pip install fastapi uvicorn[standard]
```
- Optional packages (CORS, images, ML):
```
pip install python-multipart Pillow numpy pydantic-settings
# ML (example):
# pip install torch torchvision
```

## Create the FastAPI App
Create `backend/src/api/main.py` and scaffold endpoints.
```python
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional

app = FastAPI(title="My API", version="1.0.0")

# CORS: allow your frontend origin(s)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AnalyzeEntry(BaseModel):
    image_id: Optional[str] = None
    text: Optional[str] = None
    image_path: Optional[str] = None  # file path or data URL
    filename: Optional[str] = None

class AnalyzeOptions(BaseModel):
    per_image_report: bool = True
    global_report: bool = True

class AnalyzeRequest(BaseModel):
    conversation_id: Optional[int] = None
    entries: List[AnalyzeEntry]
    options: Optional[AnalyzeOptions] = AnalyzeOptions()

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.post("/analyze")
async def analyze(payload: AnalyzeRequest):
    # Example: simple heuristic analysis; replace with ML later
    results = []
    for e in payload.entries:
        label = "neutral"
        score = 0.33
        if e.text:
            t = e.text.lower()
            if any(k in t for k in ["great", "love", "excellent", "happy"]):
                label, score = "positive", 0.85
            elif any(k in t for k in ["bad", "hate", "terrible", "angry"]):
                label, score = "negative", 0.85
        results.append({
            "image_id": e.image_id,
            "prediction": {"label": label, "score": score},
        })

    global_summary = None
    if payload.options and payload.options.global_report:
        pos = sum(1 for r in results if r["prediction"]["label"] == "positive")
        neg = sum(1 for r in results if r["prediction"]["label"] == "negative")
        neu = sum(1 for r in results if r["prediction"]["label"] == "neutral")
        total = max(1, len(results))
        global_summary = {
            "counts": {"positive": pos, "negative": neg, "neutral": neu},
            "distribution": {
                "positive": pos / total,
                "negative": neg / total,
                "neutral": neu / total,
            },
            "chart_data": {
                "bar": {
                    "labels": ["positive", "negative", "neutral"],
                    "data": [pos, neg, neu]
                },
                "pie": {
                    "labels": ["positive", "negative", "neutral"],
                    "data": [pos, neg, neu]
                }
            }
        }

    return {
        "per_image": results if (payload.options and payload.options.per_image_report) else None,
        "global": global_summary,
    }
```

## Add Optional Model Loading
- Place a model loader in `backend/src/inference/predict.py`.
- Use an environment variable (e.g., `MODEL_PATH`) to locate the model file.
```python
import os
# Example (PyTorch):
# import torch

MODEL_PATH = os.getenv("MODEL_PATH")
MODEL = None

def load_model():
    global MODEL
    if MODEL_PATH and os.path.exists(MODEL_PATH):
        # MODEL = torch.load(MODEL_PATH, map_location="cpu")
        # MODEL.eval()
        MODEL = "loaded"
    else:
        MODEL = None

def predict(image_bytes: bytes, text: str | None):
    if MODEL is None:
        # Fallback: simple rule-based
        if text and any(k in text.lower() for k in ["great", "excellent"]):
            return {"label": "positive", "score": 0.8}
        return {"label": "neutral", "score": 0.34}
    # TODO: real inference using MODEL
    return {"label": "positive", "score": 0.9}
```
- Call `load_model()` at app startup (e.g., in `main.py`).
```python
@app.on_event("startup")
async def on_startup():
    from backend.src.inference.predict import load_model
    load_model()
```

## Frontend Integration (React Example)
Call the API from your frontend.
```javascript
// Example fetch for /analyze
async function analyzeBatch(entries) {
  const res = await fetch("http://localhost:8000/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ entries, options: { per_image_report: true, global_report: true } })
  });
  if (!res.ok) throw new Error("API error");
  return await res.json();
}
```

## Running Locally (Windows)
- Start the backend:
```
# From project-root/backend
backend/venv/Scripts/activate
uvicorn backend.src.api.main:app --host 0.0.0.0 --port 8000 --reload
```
- Start the frontend (React):
```
# From project-root/frontend
npm install
npm start
```
- Test health:
```
curl http://localhost:8000/health
```

## Request/Response Contract
- Request (`POST /analyze`):
```
{
  "conversation_id": 123,
  "entries": [
    { "image_id": "img-1", "text": "I love this", "image_path": null }
  ],
  "options": { "per_image_report": true, "global_report": true }
}
```
- Response:
```
{
  "per_image": [
    { "image_id": "img-1", "prediction": { "label": "positive", "score": 0.85 } }
  ],
  "global": {
    "counts": { "positive": 1, "negative": 0, "neutral": 0 },
    "distribution": { "positive": 1.0, "negative": 0.0, "neutral": 0.0 },
    "chart_data": {
      "bar": { "labels": ["positive","negative","neutral"], "data": [1,0,0] },
      "pie": { "labels": ["positive","negative","neutral"], "data": [1,0,0] }
    }
  }
}
```

## CORS Configuration
- Ensure `allow_origins` includes your frontend URL(s).
- For development, you can use `"*"` but prefer explicit origins for security.

## Troubleshooting
- 404/405 errors: verify endpoint path and HTTP method.
- CORS errors: confirm `allow_origins` matches your frontend origin and that `Content-Type: application/json` is sent.
- Model not loading: set `MODEL_PATH` and confirm the file exists; handle architecture/device (CPU/GPU) correctly.
- Large payloads: consider streaming uploads (`UploadFile`) instead of large JSON.
- Unicode issues: ensure frontend uses UTF-8; avoid shell tools that force different encodings.

## Security Notes
- Validate inputs and limit file sizes.
- Never hardcode secrets; use environment variables.
- Sanitize file paths and reject unsafe inputs.

## Next Steps
- Replace heuristic prediction with real model inference.
- Add logging, monitoring, and tests.
- Containerize (Docker) for deployment.

