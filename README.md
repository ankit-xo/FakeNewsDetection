# Fake News Detection

![Author](https://img.shields.io/badge/Author-Ankit-blue?style=for-the-badge)
![GitHub](https://img.shields.io/badge/GitHub-ankit--xo-black?style=for-the-badge&logo=github)
![Project](https://img.shields.io/badge/Project-FakeNewsDetection-success?style=for-the-badge)

A full-stack final year project to detect whether news content is likely **REAL** or **FAKE** using text classification and image OCR.

## Live Demo

- Frontend (GitHub Pages): `https://ankit-xo.github.io/FakeNewsDetection/home`
- Backend API (Render): `https://fake-news-detection-api-8zp1.onrender.com`
- API Docs: `https://fake-news-detection-api-8zp1.onrender.com/docs`

## Project Highlights

- Text news prediction with confidence score
- Image-based prediction using OCR + model inference
- Why-this-result explanation + fact-check tips
- API health indicator and retry UX
- Context-aware retry flow for both prediction and feedback failures
- Recent checks history (last 5 via localStorage)
- Feedback collection and contact email
- Mobile-optimized header/footer and responsive layout

## Model Performance Snapshot

| Metric | Value |
|---|---|
| Accuracy | 94.2% |
| Precision | 93.6% |
| Recall | 92.9% |
| F1 Score | 93.2% |
| Dataset Size | 44K+ records |
| Last Trained | 14 Feb 2026 |

Confusion matrix (validation split, positive class = FAKE):

| Actual \\ Predicted | FAKE | REAL |
|---|---:|---:|
| FAKE | 1316 | 101 |
| REAL | 90 | 1786 |

## Architecture

Frontend sends text/image input to FastAPI. Backend preprocesses text/OCR output, runs the model, and returns result + confidence + insights.

![Architecture Diagram](frontend/public/assets/architecture-diagram.svg)

## Tech Stack

- Frontend: React + Vite
- Backend: FastAPI
- ML: scikit-learn
- OCR: pytesseract + Pillow

## Project Structure

```text
FakeNewsDetection/
├── backend/
│   ├── core/
│   │   ├── main.py              # FastAPI app + API routes
│   │   └── train.py             # ML training pipeline
│   ├── models/                  # trained model files
│   └── feedback/                # user feedback logs
├── dataset/                     # datasets (Git LFS)
├── frontend/
│   ├── public/assets/           # logo, favicon, architecture diagram
│   ├── src/
│   ├── package.json
│   └── vite.config.js
├── Dockerfile                   # Render backend container
├── render.yaml                  # Render Blueprint config
├── Testing.md                   # QA checklist and test cases
├── requirements.txt
└── README.md
```

## Prerequisites

- Python 3.9+
- Node.js 18+
- npm
- Tesseract OCR installed

## Clone Repository

```bash
git clone https://github.com/ankit-xo/FakeNewsDetection.git
cd FakeNewsDetection
```

## Run Locally

### 1) Backend

macOS / Linux:

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn backend.core.main:app --host 0.0.0.0 --port 8000 --reload
```

Windows PowerShell:

```powershell
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn backend.core.main:app --host 0.0.0.0 --port 8000 --reload
```

### 2) Frontend (new terminal)

```bash
cd frontend
npm install
npm run dev
```

### 3) Open App

- Frontend: `http://localhost:3000/home`
- Backend docs: `http://localhost:8000/docs`

### 4) Quick Health Check

- API health: `http://localhost:8000/api/health`
- Frontend health pill should show: `API Online • Model Ready`

## Quick Demo Flow (For Evaluator)

1. Open `Text Check` and click `Load Sample News`.
2. Click `Predict` and review:
   - result badge,
   - confidence bar,
   - `Why this result?`,
   - `Fact-check tips`.
3. Open `Image Check`, upload sample image, run prediction.
4. Test `Feedback` buttons (`Real` / `Fake`).
5. Disconnect backend briefly to verify error + retry UX.

## Environment Variable (Frontend)

Set backend base URL before deploy:

macOS / Linux:

```bash
cd frontend
VITE_API_BASE_URL=https://your-backend-url.com npm run deploy
```

Windows PowerShell:

```powershell
cd frontend
$env:VITE_API_BASE_URL="https://your-backend-url.com"
npm run deploy
```

## Deploy Frontend on GitHub Pages

```bash
cd frontend
npm install
npm run deploy
```

## Deploy Backend on Render (Docker)

This repository already includes `Dockerfile` and `render.yaml`.

1. Push latest code to GitHub.
2. In Render, create a new `Blueprint` or `Web Service`.
3. Use:
   - Runtime: Docker
   - Branch: `main`
   - Health Check Path: `/api/health`
4. Set env var:

```text
CORS_ALLOW_ORIGINS=https://ankit-xo.github.io,http://localhost:3000,http://127.0.0.1:3000
```

5. Deploy and verify:
   - `https://<your-render-service>.onrender.com/api/health`

## API Endpoints

- `GET /api/health`
- `POST /api/predict`
- `POST /api/predict-image`
- `POST /api/feedback`

## Testing

Use the full QA checklist in `Testing.md`.

Executed test evidence (Expected vs Actual + PASS/FAIL) is also included in `Testing.md` under:
- `Executed Test Evidence (Final Demo Run)`

Recommended quick checks before final submission:

```bash
cd frontend
npm run lint
npm run build
```

## Notes

- Threshold for REAL classification: `0.50` (`PROB_THRESHOLD`)
- Dataset CSV files are tracked with Git LFS
- Render free plan may sleep after inactivity

## Author

**Ankit Anand**
- GitHub: [@ankit-xo](https://github.com/ankit-xo)
- Feedback email: [ankitsbuild@gmail.com](mailto:ankitsbuild@gmail.com)
