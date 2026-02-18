import os

DETECTED_FILE = "backend/ocr/data/detected_medicines.txt"
DRUGS_FOLDER = "backend/drug_database/drugs"
OUTPUT_FILE = "backend/output/final_result.txt"

# Read detected medicines
if not os.path.exists(DETECTED_FILE):
    print("❌ detected_medicines.txt not found")
    exit()

with open(DETECTED_FILE, "r", encoding="utf-8") as f:
    medicines = [line.strip() for line in f if line.strip()]

results = []

for med in medicines:
    drug_file = os.path.join(DRUGS_FOLDER, f"{med}.txt")
    if os.path.exists(drug_file):
        with open(drug_file, "r", encoding="utf-8") as df:
            info = df.read()
        results.append(f"--- {med.upper()} ---\n{info}\n")
    else:
        results.append(f"--- {med.upper()} ---\nNo information found.\n")

# Save final result
os.makedirs("backend/output", exist_ok=True)
with open(OUTPUT_FILE, "w", encoding="utf-8") as out:
    out.write("\n".join(results))

print("✅ Drug lookup completed")
print(f"✅ Final result saved to {OUTPUT_FILE}")