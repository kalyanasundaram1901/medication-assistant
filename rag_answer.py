# backend/rag_answer.py

from pathlib import Path

DRUG_FOLDER = Path("backend/drug_database/drugs")
QUESTION = input("Ask your question: ").lower()

answer_context = []

for drug_file in DRUG_FOLDER.glob("*.txt"):
    text = drug_file.read_text(encoding="utf-8")
    if any(word in text.lower() for word in QUESTION.split()):
        answer_context.append(text)

print("\n--- ANSWER ---\n")

if answer_context:
    for ans in answer_context:
        print(ans)
else:
    print("❌ No relevant drug information found")