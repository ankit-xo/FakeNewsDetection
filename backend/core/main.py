import os
import sys

sys.dont_write_bytecode = True

import io
import json
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

import joblib
import pytesseract
from fastapi import FastAPI, File, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from PIL import Image
from pydantic import BaseModel


# ================= CONFIG =================
PROB_THRESHOLD = 0.50  # News with 50%+ confidence shown as REAL

TRUSTED_SOURCES = [
    "the hindu",
    "times of india",
    "indian express",
    "hindustan times",
    "reuters",
    "associated press",
    "bbc",
    "the guardian",
]

FAKE_INDICATORS = [
    "shocking",
    "guaranteed",
    "click here",
    "viral",
    "died",
]

VAGUE_CLAIMS = [
    "many say",
    "some believe",
    "allegedly",
    "reportedly",
    "supposedly",
    "insiders say",
    "sources claim",
]

EMOTIONAL_WORDS = [
    "shocking",
    "devastating",
    "heartbreaking",
    "unbelievable",
    "amazing",
    "disgusting",
    "outrageous",
]

VERIFICATION_TIPS = [
    "Cross-check this claim with at least two trusted news sources.",
    "Check the publication date, author, and original source link.",
    "If the source is unclear, verify before sharing.",
]

CODE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(CODE_DIR)
PROJECT_ROOT = os.path.dirname(BACKEND_DIR)

FRONTEND_DIST_DIR = os.path.join(PROJECT_ROOT, "frontend", "dist")
FRONTEND_INDEX_PATH = os.path.join(FRONTEND_DIST_DIR, "index.html")
FRONTEND_ASSETS_DIR = os.path.join(FRONTEND_DIST_DIR, "assets")
FRONTEND_PUBLIC_BASE = os.getenv(
    "FRONTEND_PUBLIC_BASE",
    "https://ankit-xo.github.io/FakeNewsDetection",
).rstrip("/")

MODEL_CANDIDATES = [
    os.path.join(BACKEND_DIR, "models", "best_model.joblib"),
]


# ================= LOGGING =================
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("fake-news-app")


# ================= APP INIT =================
app = FastAPI(title="Fake News Detection")

cors_origins = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ALLOW_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000",
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if os.path.exists(FRONTEND_ASSETS_DIR):
    app.mount("/assets", StaticFiles(directory=FRONTEND_ASSETS_DIR), name="frontend-assets")


# ================= LOAD MODEL =================
model: Optional[Any] = None

for path in MODEL_CANDIDATES:
    if os.path.exists(path):
        try:
            model = joblib.load(path)
            logger.info("Model loaded from %s", path)
            break
        except Exception:
            logger.exception("Failed to load model")

if model is None:
    logger.warning("Model not loaded")


# ================= REQUEST MODELS =================
class PredictRequest(BaseModel):
    text: str


# ================= HELPERS =================
def contains_trusted_source(text: str) -> bool:
    text = text.lower()
    return any(src in text for src in TRUSTED_SOURCES)


def normalize_prob(prob: Any) -> Optional[float]:
    try:
        value = float(prob)
        return max(0.0, min(1.0, value))
    except Exception:
        return None


def extract_text_from_image(file_bytes: bytes) -> str:
    image = Image.open(io.BytesIO(file_bytes))
    text = pytesseract.image_to_string(image)
    return text.strip()


def find_fake_reasons(text: str) -> List[str]:
    text_l = text.lower()
    reasons: List[str] = []

    matched_indicators = [word for word in FAKE_INDICATORS if word in text_l]
    if matched_indicators:
        preview = ", ".join(matched_indicators[:3])
        reasons.append(f"Sensational keywords found: {preview}.")

    caps_words = [word for word in text.split() if word.isupper() and len(word) > 1]
    if len(caps_words) > 3:
        reasons.append("The text uses too many ALL CAPS words, which can be manipulative.")

    exclamation_count = text.count("!")
    question_count = text.count("?")
    if exclamation_count > 5 or question_count > 3:
        reasons.append("Too many exclamation or question marks were used.")

    vague_hits = [claim for claim in VAGUE_CLAIMS if claim in text_l]
    if vague_hits:
        reasons.append("The claim appears vague and does not show clear source evidence.")

    emotional_count = sum(1 for word in EMOTIONAL_WORDS if word in text_l)
    if emotional_count > 2:
        reasons.append("The language is highly emotional and less factual.")

    if "http://" in text_l or "https://" in text_l or "bit.ly" in text_l or "tinyurl" in text_l:
        reasons.append("Suspicious or shortened links were found.")

    if "  " in text:
        reasons.append("Unusual spacing or formatting was detected.")

    sentences = text.split(".")
    very_long_sentences = [sentence for sentence in sentences if len(sentence.split()) > 40]
    if len(very_long_sentences) > 2:
        reasons.append("The sentences are unusually long and hard to verify quickly.")

    if not reasons:
        reasons.append("The model found fake-news style patterns. Please verify the claim independently.")

    unique_reasons = []
    for reason in reasons:
        if reason not in unique_reasons:
            unique_reasons.append(reason)

    return unique_reasons[:3]


def build_fake_reason_text(reasons: List[str]) -> str:
    return " ".join(reasons)


def build_prediction_payload(text: str) -> Dict[str, Any]:
    cleaned_text = (text or "").strip()

    payload: Dict[str, Any] = {
        "result": None,
        "prob": None,
        "input_text": cleaned_text,
        "fake_reasons": None,
        "fake_reasons_list": [],
        "verification_tips": [],
        "note": None,
    }

    if not cleaned_text:
        payload["note"] = "Please enter news text."
        return payload

    if contains_trusted_source(cleaned_text):
        payload["result"] = "REAL"
        payload["prob"] = 0.75
        return payload

    if model is None:
        payload["note"] = "Model not loaded"
        return payload

    probability: Optional[float] = None
    if hasattr(model, "predict_proba"):
        try:
            probability = normalize_prob(model.predict_proba([cleaned_text])[0][1])
        except Exception:
            logger.exception("Failed while calculating probability")

    if probability is not None:
        label = "REAL" if probability >= PROB_THRESHOLD else "FAKE"
    else:
        try:
            prediction = int(model.predict([cleaned_text])[0])
            label = "REAL" if prediction == 1 else "FAKE"
        except Exception:
            logger.exception("Prediction failed")
            payload["note"] = "Prediction failed"
            return payload

    payload["result"] = label
    payload["prob"] = probability

    if label == "FAKE":
        reasons = find_fake_reasons(cleaned_text)
        payload["fake_reasons_list"] = reasons
        payload["fake_reasons"] = build_fake_reason_text(reasons)
        payload["verification_tips"] = VERIFICATION_TIPS

    return payload


def api_only_response_payload(requested_path: str) -> Dict[str, Any]:
    normalized_path = requested_path if requested_path.startswith("/") else f"/{requested_path}"
    return {
        "status": "ok",
        "message": "Backend API is running. Frontend is hosted on GitHub Pages.",
        "requested_path": normalized_path,
        "frontend_url": f"{FRONTEND_PUBLIC_BASE}/home",
        "health_url": "/api/health",
        "docs_url": "/docs",
    }


def persist_feedback(feedback_type: str, text: str) -> None:
    feedback_dir = os.path.join(BACKEND_DIR, "feedback")
    os.makedirs(feedback_dir, exist_ok=True)

    feedback_file = os.path.join(feedback_dir, "feedback_log.json")
    feedback_data = []

    if os.path.exists(feedback_file):
        try:
            with open(feedback_file, "r", encoding="utf-8") as file:
                feedback_data = json.load(file)
        except Exception:
            feedback_data = []

    feedback_entry = {
        "timestamp": datetime.now().isoformat(),
        "feedback": feedback_type,
        "text": (text or "")[:500],
    }
    feedback_data.append(feedback_entry)

    with open(feedback_file, "w", encoding="utf-8") as file:
        json.dump(feedback_data, file, indent=2)


# ================= API ROUTES =================
@app.get("/api/health")
def health() -> Dict[str, Any]:
    return {
        "status": "ok",
        "model_loaded": model is not None,
        "threshold": PROB_THRESHOLD,
    }


@app.post("/api/predict")
def predict_text_api(request_payload: PredictRequest) -> JSONResponse:
    return JSONResponse(build_prediction_payload(request_payload.text), status_code=200)


@app.post("/api/predict-image")
async def predict_image_api(image: UploadFile = File(...)) -> JSONResponse:
    if not image.content_type or not image.content_type.startswith("image/"):
        return JSONResponse(
            {
                "result": None,
                "prob": None,
                "input_text": "",
                "fake_reasons": None,
                "fake_reasons_list": [],
                "verification_tips": [],
                "note": "Invalid image file",
            },
            status_code=400,
        )

    image_bytes = await image.read()

    try:
        extracted_text = extract_text_from_image(image_bytes)
    except Exception:
        logger.exception("Failed to process image")
        return JSONResponse(
            {
                "result": None,
                "prob": None,
                "input_text": "",
                "fake_reasons": None,
                "fake_reasons_list": [],
                "verification_tips": [],
                "note": "Could not process image",
            },
            status_code=400,
        )

    if len(extracted_text) < 20:
        return JSONResponse(
            {
                "result": None,
                "prob": None,
                "input_text": extracted_text,
                "fake_reasons": None,
                "fake_reasons_list": [],
                "verification_tips": [],
                "note": "Could not extract readable text",
            },
            status_code=200,
        )

    return JSONResponse(build_prediction_payload(extracted_text), status_code=200)


@app.post("/api/feedback")
async def feedback_api(request: Request) -> JSONResponse:
    try:
        data = await request.json()
    except Exception:
        return JSONResponse(
            {"status": "error", "message": "Invalid JSON payload"},
            status_code=400,
        )

    feedback_type = data.get("feedback")
    text = data.get("text", "")

    if feedback_type not in {"real", "fake"}:
        return JSONResponse(
            {"status": "error", "message": "Invalid feedback type"},
            status_code=400,
        )

    try:
        persist_feedback(feedback_type, text)
        logger.info("Feedback received: %s", feedback_type)
        return JSONResponse(
            {"status": "success", "message": "Feedback saved successfully"},
            status_code=200,
        )
    except Exception:
        logger.exception("Error processing feedback")
        return JSONResponse(
            {"status": "error", "message": "Failed to process feedback"},
            status_code=500,
        )


# ================= UI ROUTE =================
@app.get("/")
def home():
    if os.path.exists(FRONTEND_INDEX_PATH):
        return FileResponse(FRONTEND_INDEX_PATH)

    return JSONResponse(api_only_response_payload("/"), status_code=200)


@app.get("/{full_path:path}")
def spa_fallback(full_path: str):
    if full_path.startswith("api/") or full_path == "api":
        return JSONResponse({"status": "error", "message": "Not found"}, status_code=404)

    if os.path.exists(FRONTEND_INDEX_PATH):
        return FileResponse(FRONTEND_INDEX_PATH)

    return JSONResponse(api_only_response_payload(full_path), status_code=200)


# ================= RUN =================
if __name__ == "__main__":
    import uvicorn

    uvicorn.run("backend.core.main:app", host="0.0.0.0", port=8000, reload=True)
