# Fake News Detection

![Author](https://img.shields.io/badge/Author-Ankit-blue?style=for-the-badge)
![GitHub](https://img.shields.io/badge/GitHub-ankit--xo-black?style=for-the-badge&logo=github)
![Project](https://img.shields.io/badge/Project-FakeNewsDetection-success?style=for-the-badge)

### Created by Ankit
GitHub: [@ankit-xo](https://github.com/ankit-xo)

A FastAPI-based web app that predicts whether a news item is **REAL** or **FAKE** using an ML model.  
It supports both:
- Text input classification
- Image-based classification (OCR + model prediction)

The project also includes feedback logging and a training script to rebuild the model from CSV datasets.

## Features

- Text news prediction (`/predict`)
- Image news prediction with OCR (`/predict-image`)
- Confidence score for prediction
- Fake-news reason explanation (for FAKE outputs)
- Trusted-source shortcut rule
- User feedback capture (`/feedback`)
- Dark mode + modern frontend UI

## Tech Stack

- Python
- FastAPI
- Uvicorn
- Jinja2 templates
- scikit-learn (TF-IDF + Logistic Regression)
- pandas / numpy
- joblib
- Pillow + pytesseract

## Project Structure

```text
FakeNewsDetection/
├── app/
│   ├── main.py
│   ├── static/
│   │   ├── script.js
│   │   └── styles.css
│   └── templates/
│       └── index.html
├── data/                       # datasets tracked via Git LFS
├── feedback/
│   └── feedback_log.json
├── models/
│   ├── best_model.joblib
│   └── fake_news_lr_final.joblib
├── requirements.txt
└── train.py
```

## Prerequisites

- Python 3.9+
- pip
- Tesseract OCR installed and available in PATH

### Install Tesseract

- macOS (Homebrew):
  ```bash
  brew install tesseract
  ```
- Ubuntu/Debian:
  ```bash
  sudo apt update && sudo apt install -y tesseract-ocr
  ```
- Windows:
  Install Tesseract and ensure `tesseract.exe` is added to system PATH.

## Setup and Run

1. Clone the repository:
   ```bash
   git clone https://github.com/ankit-xo/FakeNewsDetection.git
   cd FakeNewsDetection
   ```

2. Create and activate virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Start the app:
   ```bash
   uvicorn app.main:app --reload
   ```

5. Open in browser:
   - `http://127.0.0.1:8000`

## Model Training

`train.py` expects the following dataset files inside `data/`:
- `data/false.csv`
- `data/true.csv`
- `data/real_test.csv` (optional, for extra evaluation)

Expected columns:
- `text` (required)
- `title` (optional, if present it is combined with `text`)
- `label` (optional in `real_test.csv`, required only for accuracy evaluation)

Run training:

```bash
python train.py
```

Output model path:
- `models/best_model.joblib`

## API Endpoints

- `GET /`  
  Renders the main UI.

- `POST /predict`  
  Form field: `text`  
  Returns HTML page with prediction result.

- `POST /predict-image`  
  Multipart field: `image`  
  Extracts text using OCR, then predicts.

- `POST /feedback`  
  JSON body:
  ```json
  {
    "feedback": "real",
    "text": "sample news text"
  }
  ```
  Valid values for `feedback`: `real`, `fake`

## Notes

- Current probability threshold for REAL is `0.50` (`PROB_THRESHOLD` in `app/main.py`).
- If no model file is found, app still starts but prediction route will show `Model not loaded`.
- `venv/` is intentionally ignored by git.
- Dataset CSV files in `data/` are tracked using Git LFS.

## Future Roadmap

- Add support for URL-based news checking (fetch article + predict automatically).
- Improve model with transformer-based architectures for better context understanding.
- Add multilingual support (Hindi + English mixed text detection).
- Build an admin dashboard for feedback analytics and model performance tracking.
- Integrate automated retraining pipeline using collected user feedback.
- Add Docker setup and CI/CD workflow for one-command deployment.
- Provide REST API documentation with Swagger usage examples.
- Introduce user authentication and role-based moderation tools.

## Troubleshooting

- **Model not loaded**
  - Ensure `models/best_model.joblib` exists.
  - Run `python train.py` to generate it.

- **OCR not working / image prediction fails**
  - Verify Tesseract is installed.
  - Check terminal command:
    ```bash
    tesseract --version
    ```

- **Dependency issues**
  - Recreate venv and reinstall:
    ```bash
    rm -rf venv
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    ```
