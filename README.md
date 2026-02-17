# Fake News Detection

![Author](https://img.shields.io/badge/Author-Ankit-blue?style=for-the-badge)
![GitHub](https://img.shields.io/badge/GitHub-ankit--xo-black?style=for-the-badge&logo=github)
![Project](https://img.shields.io/badge/Project-FakeNewsDetection-success?style=for-the-badge)

## Overview

Fake News Detection is a full‑stack web app that checks whether news content is likely real or fake using text analysis and image OCR. The UI is built with React + Vite, and the API is powered by FastAPI.

## Tech Stack

- Frontend: React + Vite
- Backend: FastAPI
- ML: scikit-learn
- OCR: pytesseract + Pillow

## Key Features

- Text news prediction
- Image news prediction (OCR)
- Confidence score with fake‑reason insights
- User feedback capture

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
├── Dockerfile                   # Render backend container
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.js
├── requirements.txt             # Python dependencies
├── render.yaml                  # Render Blueprint config
└── README.md
```

## Prerequisites

- Python 3.9+
- Node.js 18+
- npm
- Tesseract OCR installed

## Clone the Repo

```bash
git clone https://github.com/ankit-xo/FakeNewsDetection.git
cd FakeNewsDetection
```


## Deploy on GitHub Pages (Frontend)

```bash
cd frontend
npm install
npm run deploy
```

Live URL:
- `https://ankit-xo.github.io/FakeNewsDetection/home`

Important:
- GitHub Pages only hosts the frontend static app.
- For live predictions, set `VITE_API_BASE_URL` to your deployed backend URL before deploy.

macOS / Linux example:

```bash
cd frontend
VITE_API_BASE_URL=https://your-backend-url.com npm run deploy
```

Windows PowerShell example:

```powershell
cd frontend
$env:VITE_API_BASE_URL="https://your-backend-url.com"
npm run deploy
```

## Deploy Backend on Render (Docker)

This repo includes `Dockerfile` and `render.yaml` for backend deployment.

1. Push latest code to GitHub.
2. Open Render dashboard.
3. Click `New +` and choose one option:
   - `Blueprint` (recommended): select repo and Render will read `render.yaml`
   - `Web Service`: select repo and set Environment to `Docker`
4. Recommended values in Render dashboard (manual Web Service flow):
   - Name: `fake-news-detection-api`
   - Runtime: `Docker`
   - Region: `Oregon (US West)` (or nearest to your users)
   - Branch: `main`
   - Plan: `Free`
   - Auto-Deploy: `On Commit`
   - Health Check Path: `/api/health`
   - Dockerfile Path: `./Dockerfile`
   - Docker Context: `.`
5. Set/verify env var in Render:

```text
CORS_ALLOW_ORIGINS=https://ankit-xo.github.io,http://localhost:3000,http://127.0.0.1:3000
```

6. Deploy and wait for build to finish.
7. Test backend:
   - `https://<your-render-service>.onrender.com/api/health`
8. Re-deploy frontend with Render backend URL:

macOS / Linux:

```bash
cd frontend
VITE_API_BASE_URL=https://<your-render-service>.onrender.com npm run deploy
```

Windows PowerShell:

```powershell
cd frontend
$env:VITE_API_BASE_URL="https://<your-render-service>.onrender.com"
npm run deploy
```

Notes:
- Render free plan can sleep after inactivity; first request may take time.
- Docker image installs `tesseract-ocr`, so image prediction works on Render.

## Run Locally (macOS / Linux)

1. Backend

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn backend.core.main:app --host 0.0.0.0 --port 8000 --reload
```

2. Frontend (new terminal)

```bash
cd frontend
npm install
npm run dev
```

3. Open app

- Frontend UI: `http://localhost:3000/home`
- Backend API docs: `http://localhost:8000/docs`

## Run Locally (Windows PowerShell)

1. Backend

```powershell
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn backend.core.main:app --host 0.0.0.0 --port 8000 --reload
```

2. Frontend (new PowerShell)

```powershell
cd frontend
npm install
npm run dev
```

3. Open app

- Frontend UI: `http://localhost:3000/home`
- Backend API docs: `http://localhost:8000/docs`

## Single Command (Run Both)

macOS / Linux:

```bash
cd "/path/to/FakeNewsDetection" && (venv/bin/python -m uvicorn backend.core.main:app --host 0.0.0.0 --port 8000 --reload &) && cd frontend && npm run dev
```

Windows PowerShell:

```powershell
cd "C:\\path\\to\\FakeNewsDetection"
venv\Scripts\python -m uvicorn backend.core.main:app --host 0.0.0.0 --port 8000 --reload &
cd frontend
npm run dev
```

Stop backend (macOS / Linux):

```bash
pkill -f "backend.core.main:app"
```

## Tesseract OCR

- macOS (Homebrew):

```bash
brew install tesseract
```

- Windows (Chocolatey):

```powershell
choco install tesseract
```

If OCR fails, make sure `tesseract` is on your PATH.

## Training

macOS / Linux:

```bash
source venv/bin/activate
python backend/core/train.py
```

Windows:

```powershell
venv\Scripts\activate
python backend/core/train.py
```

## API Endpoints

- `GET /api/health`
- `POST /api/predict`
- `POST /api/predict-image`
- `POST /api/feedback`

## Notes

- Real threshold: `0.50` (`PROB_THRESHOLD`)
- Dataset CSVs in `dataset/` are tracked using Git LFS
- `venv/`, `frontend/node_modules/`, `frontend/dist/`, and cache files are ignored

## Author

**Ankit**
- GitHub: [@ankit-xo](https://github.com/ankit-xo)
