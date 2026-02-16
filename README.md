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
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.js
├── requirements.txt             # Python dependencies
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
