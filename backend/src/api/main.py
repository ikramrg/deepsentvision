import os
import tempfile
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

app = FastAPI(title="DeepSentVision API", version="1.0.0")

# CORS (allow local frontends)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global model state
_model_loaded = False
_model_error = None


@app.on_event("startup")
def _startup():
    global _model_loaded
    try:
        from src.inference import predict as _predict
        mp = os.environ.get("DEEPSENTVISION_MODEL_PATH") or _predict.MODEL_PATH
    except Exception:
        _model_loaded = False
        _model_error = "Import failure for src.inference.predict"
        return
    if not mp:
        _model_loaded = False
        return
    try:
        # The predict module holds a global `model`; load into it
        from src.inference.predict import load_model
        _predict.model = load_model(mp)
        _model_loaded = True
    except Exception as e:
        _model_loaded = False
        _model_error = str(e)


@app.get("/health")
def health():
    mp_env = os.environ.get("DEEPSENTVISION_MODEL_PATH")
    try:
        from src.inference import predict as _predict
        mp_pred = _predict.MODEL_PATH
    except Exception:
        mp_pred = None
    return {"status": "ok", "model_loaded": _model_loaded, "error": _model_error, "model_path_env": mp_env, "model_path_predict": mp_pred}


@app.post("/analyze")
async def analyze(
    text: str = Form(...),
    image: UploadFile | None = File(None)
):
    if not _model_loaded:
        return {
            "sentiment": "neutre",
            "confidence": 0.0,
            "probabilities": {"négatif": 0.0, "neutre": 1.0, "positif": 0.0},
            "text": text,
            "image_used": image is not None,
            "warning": "Model not loaded; returning fallback"
        }

    image_path = None
    try:
        if image is not None:
            suffix = os.path.splitext(image.filename or "uploaded.jpg")[1] or ".jpg"
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                image_bytes = await image.read()
                tmp.write(image_bytes)
                image_path = tmp.name

        from src.inference.predict import predict_sentiment
        result = predict_sentiment(text=text, image_path=image_path)
        return result
    finally:
        if image_path and os.path.exists(image_path):
            try:
                os.remove(image_path)
            except Exception:
                pass


@app.get("/")
def root():
    return {"name": "DeepSentVision API", "endpoints": ["GET /health", "POST /analyze"]}
