# Train Report (18 Feb 2026)

## Objective
Improve the model so it reduces wrong label flips:
- fake predicted as real
- real predicted as fake

## Dataset Used
- `dataset/False.csv` + `dataset/True.csv`
- Combined raw rows: 44,898
- After cleaning and deduplication: 38,824
- Labels after cleaning:
  - REAL (`1`): 20,925
  - FAKE (`0`): 17,899

## Training Split
- Train: 31,059
- Test: 7,765
- Split: 80/20 stratified (`random_state=42`)

## Final Model
- Pipeline: `TfidfVectorizer` + `LogisticRegression`
- Vectorizer:
  - `ngram_range=(1,1)`
  - `max_features=70000`
  - `min_df=2`
  - `stop_words='english'`
  - `sublinear_tf=True`
- Classifier:
  - `C=0.8`
  - `max_iter=1200`
  - `class_weight=None`
- Prediction threshold for REAL class: `0.40`

## Why 0.40 Threshold
Threshold was tuned to reduce flip errors while keeping high validation accuracy.
This setting gave better real-world recall with controlled fake→real mistakes.

## Final Metrics

### Hold-out Validation (Test Split)
- Train Accuracy: `0.9905`
- Test Accuracy: `0.9875`
- Overfitting Gap: `0.0030`
- 5-Fold CV Accuracy: `0.9869`

Confusion Matrix (Actual x Predicted):

| Class | FAKE | REAL |
|---|---:|---:|
| FAKE | 3497 | 83 |
| REAL | 14 | 4171 |

### Real-world Benchmark (`dataset/real_test.csv`)
- Accuracy: `0.8260`

Confusion Matrix (Actual x Predicted):

| Class | FAKE | REAL |
|---|---:|---:|
| FAKE | 5000 | 0 |
| REAL | 1740 | 3260 |

## Overfitting Verdict
Not significantly overfit.
Reason: train-test gap is only `0.30%`.

## Files Generated
- Model: `backend/models/best_model.joblib`
- Metadata: `backend/models/model_meta.json`

## Inference Improvements Applied
- Backend now uses same text cleaning during prediction as training.
- Backend auto-loads threshold from `model_meta.json`.
- Health endpoint returns active threshold.

## Re-run Training
```bash
venv/bin/python backend/core/train.py
```

## Next Steps (for stronger model)
1. Add more short-format real news samples (headline + brief updates).
2. Add multilingual samples (Hindi + Hinglish + regional mixes).
3. Create hard-negative dataset (sensational but true news).
4. Track per-class precision/recall on a separate blind test set.
5. Add periodic retraining with fresh data.
