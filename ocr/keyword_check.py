# backend/ocr/keyword_check.py

MEDICINE_KEYWORDS = [
    "paracetamol",
    "metformin",
    "amoxicillin",
    "ibuprofen",
    "cetirizine",
    "azithromycin",
    "pantoprazole",
    "atorvastatin"
]

INPUT_FILE = "backend/ocr/data/cleaned_text.txt"
OUTPUT_FILE = "backend/ocr/data/detected_medicines.txt"

try:
    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        text = f.read()
except FileNotFoundError:
    print("❌ cleaned_text.txt not found")
    exit()

found_medicines = []

for med in MEDICINE_KEYWORDS:
    if med in text:
        found_medicines.append(med)

with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    for med in found_medicines:
        f.write(med + "\n")

print("\n--- DETECTED MEDICINES ---\n")

if found_medicines:
    for med in found_medicines:
        print("✅", med)
else:
    print("❌ No medicine found")

print("\n✅ Saved to detected_medicines.txt")