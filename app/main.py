import os
import io
import logging
import json
from typing import Optional, Any, List
from datetime import datetime

import joblib
import numpy as np
from fastapi import FastAPI, Request, Form, UploadFile, File
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from PIL import Image
import pytesseract


# ================= CONFIG =================
PROB_THRESHOLD = 0.50  # News with 50%+ confidence shown as REAL

TRUSTED_SOURCES = [
    "the hindu",
    "times of india",
    "indian express",
    "breaking",
    "hour",
    "hours",
    "live",
    "hindustan times"
]

# 🔥 Only strong sensational indicators
FAKE_INDICATORS = [
    "shocking",
    "guaranteed",
    "click here",
    "viral",
    "died",
]

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BASE_DIR)

MODEL_CANDIDATES = [
    os.path.join(PROJECT_ROOT, "models", "best_model.joblib"),
    os.path.join(BASE_DIR, "models", "best_model.joblib"),
]


# ================= LOGGING =================
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("fake-news-app")


# ================= APP INIT =================
app = FastAPI(title="Fake News Detection")
templates = Jinja2Templates(directory=os.path.join(BASE_DIR, "templates"))

static_dir = os.path.join(BASE_DIR, "static")
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")


# ================= LOAD MODEL =================
model: Optional[Any] = None

for path in MODEL_CANDIDATES:
    if os.path.exists(path):
        try:
            model = joblib.load(path)
            logger.info("✅ Model loaded from %s", path)
            break
        except Exception:
            logger.exception("❌ Failed to load model")

if model is None:
    logger.warning("⚠️ Model not loaded")


# ================= HELPERS =================
def contains_trusted_source(text: str) -> bool:
    text = text.lower()
    return any(src in text for src in TRUSTED_SOURCES)


def normalize_prob(p) -> Optional[float]:
    try:
        p = float(p)
        return max(0.0, min(1.0, p))
    except Exception:
        return None


def extract_text_from_image(file_bytes: bytes) -> str:
    image = Image.open(io.BytesIO(file_bytes))
    text = pytesseract.image_to_string(image)
    return text.strip()


# 🔥 FIXED: Return a single, simple, user-friendly reason
def find_fake_reasons(text: str) -> str:
    """Returns a single, simple explanation for why news is likely fake."""
    text_l = text.lower()

    # Check for sensational keywords
    for word in FAKE_INDICATORS:
        if word in text_l:
            return f"This news uses sensational language like '{word}' to grab attention."

    # Check for ALL CAPS (sensationalism indicator)
    caps_words = [word for word in text.split() if word.isupper() and len(word) > 1]
    if len(caps_words) > 3:
        return "Too much writing in ALL CAPS, which is often used to manipulate readers."

    # Check for excessive punctuation marks (!!!, ???, etc.)
    exclamation_count = text.count("!")
    question_count = text.count("?")
    if exclamation_count > 5 or question_count > 3:
        return "Excessive exclamation marks or question marks are used to create excitement."

    # Check for vague claims (words like "many", "some", "allegedly", etc.)
    vague_claims = ["many say", "some believe", "allegedly", "reportedly", "supposedly", "insiders say", "sources claim"]
    vague_count = sum(1 for claim in vague_claims if claim in text_l)
    if vague_count > 0:
        return "Makes claims without clear sources or proof."

    # Check for emotional language
    emotional_words = ["shocking", "devastating", "heartbreaking", "unbelievable", "amazing", "disgusting", "outrageous"]
    emotional_count = sum(1 for word in emotional_words if word in text_l)
    if emotional_count > 2:
        return "Uses emotional words designed to make you angry or upset."

    # Check for URLs/suspicious links
    if "http://" in text or "https://" in text or "bit.ly" in text_l or "tinyurl" in text_l:
        return "Contains suspicious links that are common in fake news."

    # Check for grammatical errors (multiple spaces, inconsistent capitalization)
    if "  " in text:
        return "Has unusual formatting and spacing patterns."

    # Check for very long sentences (obfuscation technique)
    sentences = text.split(".")
    very_long_sentences = [s for s in sentences if len(s.split()) > 40]
    if len(very_long_sentences) > 2:
        return "Has overly complex sentences that make it hard to understand the truth."

    # Fallback reason
    return "The pattern of this news matches common fake news characteristics."


# ================= ROUTES =================
@app.get("/", response_class=HTMLResponse)
def home(request: Request):
    return templates.TemplateResponse(
        "index.html",
        {
            "request": request,
            "result": None,
            "prob": None,
            "input_text": "",
            "fake_reasons": None,
            "note": None
        }
    )


# ================= TEXT PREDICTION =================
@app.post("/predict", response_class=HTMLResponse)
def predict_text(request: Request, text: str = Form(...)):
    text = (text or "").strip()

    if not text:
        return templates.TemplateResponse(
            "index.html",
            {
                "request": request,
                "result": None,
                "prob": None,
                "input_text": "",
                "fake_reasons": None,
                "note": "Please enter news text."
            }
        )

    # Trusted source shortcut
    if contains_trusted_source(text):
        return templates.TemplateResponse(
            "index.html",
            {
                "request": request,
                "result": "REAL",
                "prob": 0.75,
                "input_text": text,
                "fake_reasons": None,
                "note": None
            }
        )

    if model is None:
        return templates.TemplateResponse(
            "index.html",
            {
                "request": request,
                "result": None,
                "prob": None,
                "input_text": text,
                "fake_reasons": None,
                "note": "Model not loaded"
            }
        )

    prob = None
    if hasattr(model, "predict_proba"):
        prob = normalize_prob(model.predict_proba([text])[0][1])

    label = "REAL" if prob and prob >= PROB_THRESHOLD else "FAKE"

    # 🔥 Reason only if FAKE
    fake_reasons = find_fake_reasons(text) if label == "FAKE" else None

    return templates.TemplateResponse(
        "index.html",
        {
            "request": request,
            "result": label,
            "prob": prob,
            "input_text": text,
            "fake_reasons": fake_reasons,
            "note": None
        }
    )


# ================= IMAGE PREDICTION =================
@app.post("/predict-image", response_class=HTMLResponse)
async def predict_image(request: Request, image: UploadFile = File(...)):

    if not image.content_type.startswith("image/"):
        return templates.TemplateResponse(
            "index.html",
            {
                "request": request,
                "result": None,
                "prob": None,
                "input_text": "",
                "fake_reasons": None,
                "note": "Invalid image file"
            }
        )

    image_bytes = await image.read()
    extracted_text = extract_text_from_image(image_bytes)

    if len(extracted_text) < 20:
        return templates.TemplateResponse(
            "index.html",
            {
                "request": request,
                "result": None,
                "prob": None,
                "input_text": "",
                "fake_reasons": None,
                "note": "Could not extract readable text"
            }
        )

    if contains_trusted_source(extracted_text):
        return templates.TemplateResponse(
            "index.html",
            {
                "request": request,
                "result": "REAL",
                "prob": 0.75,
                "input_text": extracted_text,
                "fake_reasons": None,
                "note": None
            }
        )

    prob = None
    if hasattr(model, "predict_proba"):
        prob = normalize_prob(model.predict_proba([extracted_text])[0][1])

    label = "REAL" if prob and prob >= PROB_THRESHOLD else "FAKE"

    fake_reasons = find_fake_reasons(extracted_text) if label == "FAKE" else None

    return templates.TemplateResponse(
        "index.html",
        {
            "request": request,
            "result": label,
            "prob": prob,
            "input_text": extracted_text,
            "fake_reasons": fake_reasons,
            "note": None
        }
    )


# ================= FEEDBACK =================
@app.post("/feedback")
async def submit_feedback(request: Request):
    """Receive user feedback on predictions"""
    try:
        data = await request.json()
        feedback_type = data.get("feedback")  # "real" or "fake"
        text = data.get("text", "")

        if not feedback_type or feedback_type not in ["real", "fake"]:
            return JSONResponse(
                {"status": "error", "message": "Invalid feedback type"},
                status_code=400
            )

        # Create feedback log file if it doesn't exist
        feedback_dir = os.path.join(PROJECT_ROOT, "feedback")
        os.makedirs(feedback_dir, exist_ok=True)

        feedback_file = os.path.join(feedback_dir, "feedback_log.json")

        # Read existing feedback or create new list
        feedback_data = []
        if os.path.exists(feedback_file):
            try:
                with open(feedback_file, "r") as f:
                    feedback_data = json.load(f)
            except Exception:
                feedback_data = []

        # Add new feedback entry
        feedback_entry = {
            "timestamp": datetime.now().isoformat(),
            "feedback": feedback_type,
            "text": text[:500]  # Limit to first 500 chars
        }
        feedback_data.append(feedback_entry)

        # Save feedback
        with open(feedback_file, "w") as f:
            json.dump(feedback_data, f, indent=2)

        logger.info(f"✅ Feedback received: {feedback_type}")

        return JSONResponse(
            {"status": "success", "message": "Feedback saved successfully"},
            status_code=200
        )

    except Exception as e:
        logger.error(f"❌ Error processing feedback: {str(e)}")
        return JSONResponse(
            {"status": "error", "message": "Failed to process feedback"},
            status_code=500
        )


# ================= RUN =================
if __name__ == "__main__":
    import uvicorn
    uvicorn.run( "app.main:app", host="0.0.0.0", port=8000, reload=True )
