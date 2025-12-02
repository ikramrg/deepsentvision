import os
import tempfile
import base64
import re
import math
from collections import Counter
from fastapi import FastAPI, UploadFile, File, Form, Request
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
    global _model_loaded, _model_error
    try:
        from src.inference import predict as _predict
        mp = os.environ.get("DEEPSENTVISION_MODEL_PATH") or _predict.MODEL_PATH
    except Exception as e:
        _model_loaded = False
        _model_error = f"Import failure for src.inference.predict: {str(e)}"
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
        _model_error = f"Model load failed: {str(e)}"


def _fallback_predict(text: str, image_path: str | None = None):
    t = (text or "").lower()
    pos_kw = ["incroyable", "excellent", "bon", "génial", "parfait", "recommande", "satisfait", "love", "utile"]
    neg_kw = ["mauvais", "nul", "déteste", "problème", "retour", "casse", "horrible", "arnaque", "dangereux"]
    pos_score = sum(1 for w in pos_kw if w in t)
    neg_score = sum(1 for w in neg_kw if w in t)
    score = pos_score - neg_score
    img_bias = 0.0
    try:
        if image_path and os.path.exists(image_path):
            from PIL import Image, ImageStat
            img = Image.open(image_path).convert("L")
            mean = ImageStat.Stat(img).mean[0] / 255.0
            if mean > 0.65:
                img_bias += 0.5
            elif mean < 0.35:
                img_bias -= 0.5
    except Exception:
        pass
    raw = [0.0, 0.0, 0.0]
    raw[2] = score + img_bias
    raw[0] = -score - img_bias
    raw[1] = 0.25
    exps = [math.exp(x) for x in raw]
    s = sum(exps) or 1.0
    probs = [e / s for e in exps]
    pred_idx = int(max(range(3), key=lambda i: probs[i]))
    labels = ["negatif", "neutre", "positif"]
    return {
        "sentiment": labels[pred_idx],
        "confidence": float(probs[pred_idx]),
        "probabilities": {"negatif": float(probs[0]), "neutre": float(probs[1]), "positif": float(probs[2])}
    }


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
    request: Request,
    text: str = Form(None),
    image: UploadFile | None = File(None)
):
    # JSON batch mode
    ct = request.headers.get("content-type", "").lower()
    if ct.startswith("application/json"):
        payload = await request.json()
        entries = payload.get("entries") or []
        per_image_reports = []
        errors = []
        if not _model_loaded:
            for entry in entries:
                eid = entry.get("image_id")
                etext = (entry.get("text") or "").strip()
                if not etext:
                    errors.append({"image_id": eid, "error": "missing_text"})
                    continue
                ipath = entry.get("image_path") or None
                fname = entry.get("filename") or "image.jpg"
                tmp_path = None
                try:
                    if ipath and ipath.startswith("data:"):
                        try:
                            m = re.match(r"data:(.*?);base64,(.*)$", ipath)
                            b64 = m.group(2) if m else ipath.split(",", 1)[-1]
                            img_bytes = base64.b64decode(b64)
                            suffix = os.path.splitext(fname)[1] or ".jpg"
                            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                                tmp.write(img_bytes)
                                tmp_path = tmp.name
                        except Exception as e:
                            errors.append({"image_id": eid, "error": f"decode_failed: {str(e)}"})
                            tmp_path = None
                    elif ipath and os.path.exists(ipath):
                        tmp_path = ipath
                    result = _fallback_predict(text=etext, image_path=tmp_path)
                    label = result.get("sentiment") or "neutre"
                    conf = float(result.get("confidence") or 0.0)
                    probs = result.get("probabilities") or {}
                    p_neg = float(probs.get("negatif", 0.0) or 0.0)
                    p_neu = float(probs.get("neutre", 0.0) or 0.0)
                    p_pos = float(probs.get("positif", 0.0) or 0.0)
                    words = [w.lower() for w in re.findall(r"[a-zA-ZÀ-ÿ]{4,}", etext)]
                    kws = [w for w, _ in Counter(words).most_common(5)]
                    summary = f"Image {fname or eid}: {label} ({conf:.2f})"
                    per_image_reports.append({
                        "image_id": eid,
                        "sentiment": label,
                        "confidence": conf,
                        "probabilities": {"negatif": p_neg, "neutre": p_neu, "positif": p_pos},
                        "keywords": kws,
                        "summary": summary,
                        "notes": ""
                    })
                except Exception as e:
                    errors.append({"image_id": eid, "error": str(e)})
                finally:
                    if tmp_path and os.path.exists(tmp_path) and (not ipath or tmp_path != ipath):
                        try:
                            os.remove(tmp_path)
                        except Exception:
                            pass
            counts = {"positif": 0, "neutre": 0, "negatif": 0}
            for r in per_image_reports:
                counts[r["sentiment"]] = counts.get(r["sentiment"], 0) + 1
            total = sum(counts.values()) or 1
            percentages = {k: (v * 100.0 / total) for k, v in counts.items()}
            avg_conf = (sum(r["confidence"] for r in per_image_reports) / len(per_image_reports)) if per_image_reports else 0.0
            agg_kw = []
            for r in per_image_reports:
                agg_kw += (r.get("keywords") or [])
            keywords_global = [w for w, _ in Counter(agg_kw).most_common(8)]
            per_image_summary = [{"image_id": r["image_id"], "sentiment": r["sentiment"]} for r in per_image_reports]
            chart_data = {
                "bar": {"labels": ["positif", "neutre", "negatif"], "data": [counts["positif"], counts["neutre"], counts["negatif"]]},
                "pie": {"labels": ["positif", "neutre", "negatif"], "data": [percentages["positif"], percentages["neutre"], percentages["negatif"]]}
            }
            return JSONResponse(content={
                "per_image": per_image_reports,
                "global": {
                    "counts": counts,
                    "percentages": percentages,
                    "average_confidence": avg_conf,
                    "keywords": keywords_global,
                    "per_image": per_image_summary,
                    "chart_data": chart_data
                },
                "errors": errors + ([{"error": "Model not loaded; heuristic fallback used"}] if not _model_loaded else [])
            })
        per_image_reports = []
        errors = []

        for entry in entries:
            eid = entry.get("image_id")
            etext = (entry.get("text") or "").strip()
            if not etext:
                errors.append({"image_id": eid, "error": "missing_text"})
                continue
            ipath = entry.get("image_path") or None
            fname = entry.get("filename") or "image.jpg"
            tmp_path = None
            try:
                # handle data URL or existing filesystem path
                if ipath and ipath.startswith("data:"):
                    try:
                        m = re.match(r"data:(.*?);base64,(.*)$", ipath)
                        b64 = m.group(2) if m else ipath.split(",", 1)[-1]
                        img_bytes = base64.b64decode(b64)
                        suffix = os.path.splitext(fname)[1] or ".jpg"
                        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                            tmp.write(img_bytes)
                            tmp_path = tmp.name
                    except Exception as e:
                        errors.append({"image_id": eid, "error": f"decode_failed: {str(e)}"})
                        tmp_path = None
                elif ipath and os.path.exists(ipath):
                    tmp_path = ipath

                from src.inference.predict import predict_sentiment
                result = predict_sentiment(text=etext, image_path=tmp_path)
                label = (result.get("sentiment") or "neutre")
                label_norm = "negatif" if label == "négatif" else label
                conf = float(result.get("confidence") or 0.0)
                probs = result.get("probabilities") or {}
                p_neg = float(probs.get("négatif", probs.get("negatif", 0.0)) or 0.0)
                p_neu = float(probs.get("neutre", 0.0) or 0.0)
                p_pos = float(probs.get("positif", 0.0) or 0.0)
                words = [w.lower() for w in re.findall(r"[a-zA-ZÀ-ÿ]{4,}", etext)]
                kws = [w for w, _ in Counter(words).most_common(5)]
                summary = f"Image {fname or eid}: {label_norm} ({conf:.2f})"
                per_image_reports.append({
                    "image_id": eid,
                    "sentiment": label_norm,
                    "confidence": conf,
                    "probabilities": {"negatif": p_neg, "neutre": p_neu, "positif": p_pos},
                    "keywords": kws,
                    "summary": summary,
                    "notes": ""
                })
            except Exception as e:
                errors.append({"image_id": eid, "error": str(e)})
            finally:
                if tmp_path and os.path.exists(tmp_path) and (not ipath or tmp_path != ipath):
                    try:
                        os.remove(tmp_path)
                    except Exception:
                        pass

        counts = {"positif": 0, "neutre": 0, "negatif": 0}
        for r in per_image_reports:
            counts[r["sentiment"]] = counts.get(r["sentiment"], 0) + 1
        total = sum(counts.values()) or 1
        percentages = {k: (v * 100.0 / total) for k, v in counts.items()}
        avg_conf = (sum(r["confidence"] for r in per_image_reports) / len(per_image_reports)) if per_image_reports else 0.0
        agg_kw = []
        for r in per_image_reports:
            agg_kw += (r.get("keywords") or [])
        keywords_global = [w for w, _ in Counter(agg_kw).most_common(8)]
        per_image_summary = [{"image_id": r["image_id"], "sentiment": r["sentiment"]} for r in per_image_reports]
        chart_data = {
            "bar": {"labels": ["positif", "neutre", "negatif"], "data": [counts["positif"], counts["neutre"], counts["negatif"]]},
            "pie": {"labels": ["positif", "neutre", "negatif"], "data": [percentages["positif"], percentages["neutre"], percentages["negatif"]]}
        }
        return JSONResponse(content={
            "per_image": per_image_reports,
            "global": {
                "counts": counts,
                "percentages": percentages,
                "average_confidence": avg_conf,
                "keywords": keywords_global,
                "per_image": per_image_summary,
                "chart_data": chart_data
            },
            "errors": errors
        })

    if not _model_loaded:
        image_path = None
        try:
            if image is not None:
                suffix = os.path.splitext(image.filename or "uploaded.jpg")[1] or ".jpg"
                with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                    image_bytes = await image.read()
                    tmp.write(image_bytes)
                    image_path = tmp.name
            result = _fallback_predict(text=text or "", image_path=image_path)
            return result
        finally:
            if image_path and os.path.exists(image_path):
                try:
                    os.remove(image_path)
                except Exception:
                    pass

    image_path = None
    try:
        if image is not None:
            suffix = os.path.splitext(image.filename or "uploaded.jpg")[1] or ".jpg"
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                image_bytes = await image.read()
                tmp.write(image_bytes)
                image_path = tmp.name

        from src.inference.predict import predict_sentiment
        result = predict_sentiment(text=text or "", image_path=image_path)
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
