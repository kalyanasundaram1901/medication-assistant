import re
import os

# -----------------------------
# ABSOLUTE PATH SETUP (FIXES ALL ERRORS)
# -----------------------------

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

INPUT_FILE = os.path.join(BASE_DIR, "data", "output_text.txt")
OUTPUT_FILE = os.path.join(BASE_DIR, "data", "cleaned_text.txt")

# -----------------------------
# CHECK FILE EXISTS
# -----------------------------

if not os.path.exists(INPUT_FILE):
    raise FileNotFoundError(f"❌ output_text.txt NOT FOUND at:\n{INPUT_FILE}")

# -----------------------------
# READ OCR TEXT
# -----------------------------

with open(INPUT_FILE, "r", encoding="utf-8") as f:
    raw_text = f.read()

print("\n--- RAW OCR TEXT ---\n")
print(raw_text)

# -----------------------------
# TEXT CLEANING
# -----------------------------

cleaned_text = raw_text.lower()
cleaned_text = re.sub(r"[^a-z0-9\s]", " ", cleaned_text)
cleaned_text = re.sub(r"\s+", " ", cleaned_text).strip()

print("\n--- CLEANED TEXT ---\n")
print(cleaned_text)

# -----------------------------
# SAVE CLEANED TEXT
# -----------------------------

with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    f.write(cleaned_text)

print(f"\n✅ Cleaned text saved to:\n{OUTPUT_FILE}")