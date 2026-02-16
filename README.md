# Fake News Detection

![Author](https://img.shields.io/badge/Author-Ankit-blue?style=for-the-badge)
![GitHub](https://img.shields.io/badge/GitHub-ankit--xo-black?style=for-the-badge&logo=github)
![Project](https://img.shields.io/badge/Project-FakeNewsDetection-success?style=for-the-badge)

### Created by Ankit
GitHub: [@ankit-xo](https://github.com/ankit-xo)

Fake News Detection app uses a React frontend and a FastAPI backend API service.

## Stack

- Backend: FastAPI + scikit-learn model
- Frontend: React + Vite
- OCR: pytesseract + Pillow

## Features

- Text news prediction
- Image news prediction (OCR)
- Confidence score + fake reason
- Feedback capture

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

## Run Locally

1. Backend

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn backend.core.main:app --reload
```

2. Frontend (new terminal)

```bash
cd frontend
npm install
npm run dev
```

3. Open app

Development mode (recommended while coding):
- Frontend UI: `http://127.0.0.1:3000`
- Backend API docs: `http://127.0.0.1:8000/docs`

Production-like mode (single backend URL):
```bash
cd frontend
npm run build
cd ..
uvicorn backend.core.main:app --reload
```
- Open: `http://127.0.0.1:8000`
- App routes: `/`, `/text-check`, `/image-check`, `/feedback`, `/about`

## Training

```bash
source venv/bin/activate
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
