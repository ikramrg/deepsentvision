# DeepSentVision — FastAPI Integration Guide

## Overview

- Backend: FastAPI app exposing health and analysis endpoints (`backend/src/api/main.py`).
- Inference: PyTorch + Transformers model (`backend/src/inference/predict.py`).
- Frontend: React app calling FastAPI for batch analysis (`frontend/src/pages/ModelsPage.jsx`).
- Auth/API server: Express + MySQL for chat persistence (`frontend/server/index.js`).

## Prerequisites

- Python 3.11+ recommended (project runs on Windows).
- Create and activate a virtual environment:
  - `python -m venv .venv`
  - `.\.venv\Scripts\activate`
- Install backend dependencies:
  - `pip install -r backend/requirements.txt`

## Model Setup

- Place the checkpoint file at `backend/src/model/deepsentvision_FINAL.pth`.
- Alternatively set an absolute path via `DEEPSENTVISION_MODEL_PATH`.
- The loader resolves the path at startup (`backend/src/api/main.py:26-46`) using `backend/src/inference/predict.py:10-21`.

## Run FastAPI

- From `backend` directory:
  - `.\.venv\Scripts\python -m uvicorn src.api.main:app --host 0.0.0.0 --port 8001 --reload`
- CORS is enabled for all origins (`backend/src/api/main.py:13-19`).

## Endpoints

- GET `/health` (`backend/src/api/main.py:52`)
  - Returns `{ status, model_loaded, error, model_path_env, model_path_predict }`.
  - Verify model load with `model_loaded:true`.

- POST `/analyze` (`backend/src/api/main.py:63`)
  - JSON batch mode (Content-Type `application/json`):
    - Payload shape:
      - `conversation_id`: numeric id (optional)
      - `entries`: array of objects:
        - `image_id`: string
        - `text`: string
        - `image_path`: data URL (`data:image/...;base64,...`) or filesystem path
        - `filename`: string (used for temp suffix)
      - `options`: `{ per_image_report: boolean, global_report: boolean }`
    - Response fields:
      - `per_image`: array of `{ image_id, sentiment, confidence, probabilities, keywords, summary, notes }`
      - `global`: `{ counts, percentages, average_confidence, keywords, per_image, chart_data }`
        - `chart_data`: `{ bar: {labels, data}, pie: {labels, data}, line?: {labels, data} }`
      - `errors`: array of error objects (if any)
  - Form-data single image mode:
    - Fields: `text` (string), `image` (file)
    - Returns a single inference result `{ sentiment, confidence, probabilities }`.

## Fallback Behavior

- If the model fails to load, the API produces heuristic results instead of HTTP 503:
  - Batch fallback path: `backend/src/api/main.py:80-151`
  - Form-data fallback path: `backend/src/api/main.py:164-185`
- Heuristic logic: keyword scoring (+/-) and image brightness bias; softmax normalization.

## Model Architecture

- `DeepSentVision` combines DistilBERT (text) and ConvNeXtV2 Tiny (vision).
- Classifier input matches checkpoint dimensions (`2048`) via a vision projection layer:
  - Classifier: `backend/src/inference/predict.py:46-51`
  - Fusion: `backend/src/inference/predict.py:59-69`
- Loader: `backend/src/inference/predict.py:71-79` loads the state dict and sets `eval()`.

## Frontend Integration

- Health pre-check and analysis request:
  - Pre-check: `frontend/src/pages/ModelsPage.jsx:61-64`
  - Request body construction: `frontend/src/pages/ModelsPage.jsx:73-77`
  - Request/response handling and message persistence: `frontend/src/pages/ModelsPage.jsx:79-93`
- Charts rendering from API response:
  - Global charts (bar/pie/line): `frontend/src/pages/ModelsPage.jsx:299-319`
  - Per-image chart: `frontend/src/pages/ModelsPage.jsx:263-265`
  - Aggregated all-images stacked chart: `frontend/src/pages/ModelsPage.jsx:320-325`

## Running the Frontend

- React app: from `frontend` run `npm start` (port `3002`).
- Auth server: from `frontend/server` run `npm start` (port `4001`).
- Login obtains a JWT stored in `localStorage` and is used by the chat API.

## Troubleshooting

- `model_loaded:false` on `/health`:
  - Ensure the `.pth` exists at `backend/src/model/deepsentvision_FINAL.pth` or set `DEEPSENTVISION_MODEL_PATH`.
  - Restart `uvicorn` and re-check `/health`.
- JSON encoding errors from manual PowerShell calls:
  - Use UTF‑8 and avoid non-ASCII without proper encoding; the frontend uses `fetch` with UTF‑8 automatically.
- Payload too large (HTTP 413):
  - Compress images client-side and limit batch sizes.

## Example Commands (Windows)

- Health:
  - `Invoke-WebRequest -Uri http://localhost:8001/health -UseBasicParsing | Select-Object -ExpandProperty Content`
- Batch analyze example (PowerShell):
  - `$body = @{ entries = @(@{ image_id = "img1"; text = "Produit excellent"; filename = "x.jpg" }) } | ConvertTo-Json -Compress`
  - `Invoke-WebRequest -Uri http://localhost:8001/analyze -Method Post -ContentType application/json -Body $body -UseBasicParsing | Select-Object -ExpandProperty Content`
