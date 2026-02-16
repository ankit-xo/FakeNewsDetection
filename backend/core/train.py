# train.py
import os
import sys

sys.dont_write_bytecode = True

import re
import pandas as pd
import joblib

from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from sklearn.utils import shuffle

print("🚀 Fake News Detection – Model Training Started")

# -------- PATHS --------
CODE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(CODE_DIR)
PROJECT_ROOT = os.path.dirname(BACKEND_DIR)
DATA_DIR = os.path.join(PROJECT_ROOT, "dataset")
MODEL_DIR = os.path.join(BACKEND_DIR, "models")

FAKE_PATH = os.path.join(DATA_DIR, "False.csv")
TRUE_PATH = os.path.join(DATA_DIR, "True.csv")
REAL_TEST_PATH = os.path.join(DATA_DIR, "real_test.csv")

MODEL_PATH = os.path.join(MODEL_DIR, "best_model.joblib")  # backend/core/main.py compatible

# -------- TEXT CLEANING --------
def clean_text(text):
    if not isinstance(text, str):
        return ""
    text = text.lower()
    text = re.sub(r"http\S+|www\S+", " ", text)
    text = re.sub(r"\S*@\S+", " ", text)
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text

# -------- LOAD DATA --------
print("📥 Loading datasets...")
fake = pd.read_csv(FAKE_PATH)
true = pd.read_csv(TRUE_PATH)

fake["label"] = 0   # Fake
true["label"] = 1   # Real

df = pd.concat([fake, true], ignore_index=True)

# -------- COMBINE TEXT --------
if "title" in df.columns and "text" in df.columns:
    df["content"] = df["title"].astype(str) + " " + df["text"].astype(str)
elif "text" in df.columns:
    df["content"] = df["text"].astype(str)
else:
    raise ValueError("❌ Dataset must contain 'text' column")

df["cleaned"] = df["content"].apply(clean_text)

# -------- DATA CLEANING --------
df = df[df["cleaned"].str.len() > 30]
df = df.drop_duplicates(subset="cleaned")
df = shuffle(df, random_state=42)

print("📊 Total Samples:", len(df))
print("📊 Label Distribution:\n", df["label"].value_counts())

# -------- TRAIN TEST SPLIT --------
X = df["cleaned"]
y = df["label"]

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.20,
    random_state=42,
    stratify=y
)

print(f"🎯 Train Size: {len(X_train)}, Test Size: {len(X_test)}")

# -------- MODEL PIPELINE --------
model = Pipeline([
    ("tfidf", TfidfVectorizer(
        max_features=50000,
        ngram_range=(1, 2),
        stop_words="english",
        sublinear_tf=True
    )),
    ("clf", LogisticRegression(
        max_iter=1000,
        class_weight="balanced",
        n_jobs=-1
    ))
])

# -------- TRAIN --------
print("\n🧠 Training Model...")
model.fit(X_train, y_train)

# -------- EVALUATION --------
y_train_pred = model.predict(X_train)
y_test_pred = model.predict(X_test)

train_acc = accuracy_score(y_train, y_train_pred)
test_acc = accuracy_score(y_test, y_test_pred)

print("\n📌 Model Performance")
print("Train Accuracy :", round(train_acc, 4))
print("Test Accuracy  :", round(test_acc, 4))
print("Overfitting Gap:", round(train_acc - test_acc, 4))

print("\n📄 Classification Report:\n")
print(classification_report(y_test, y_test_pred))

print("📊 Confusion Matrix:")
print(confusion_matrix(y_test, y_test_pred))

# -------- CROSS VALIDATION --------
cv_scores = cross_val_score(
    model,
    X_train,
    y_train,
    cv=5,
    scoring="accuracy",
    n_jobs=-1
)

print("\n📈 Cross Validation Accuracy:", round(cv_scores.mean(), 4))

# -------- SAVE MODEL (IMPORTANT FIX) --------
os.makedirs(MODEL_DIR, exist_ok=True)

joblib.dump(model, MODEL_PATH)
print("\n✅ Model Saved At:", MODEL_PATH)

# -------- REAL WORLD TEST --------
print("\n🌍 Real World Testing...")

if os.path.exists(REAL_TEST_PATH):
    real_test = pd.read_csv(REAL_TEST_PATH)

    if "text" not in real_test.columns:
        raise ValueError("❌ real_test.csv must contain 'text' column")

    real_test["cleaned"] = real_test["text"].apply(clean_text)

    if "label" in real_test.columns:
        y_real = real_test["label"]
        y_real_pred = model.predict(real_test["cleaned"])

        print("🌐 Real World Accuracy:",
              round(accuracy_score(y_real, y_real_pred), 4))
        print(classification_report(y_real, y_real_pred))
    else:
        real_test["prediction"] = model.predict(real_test["cleaned"])
        print("⚠ Labels missing, predictions generated only")
else:
    print("⚠ real_test.csv not found")

print("\n✅ Training Completed Successfully!")
