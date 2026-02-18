import os

print("🚀 Starting Medical Assistant Pipeline...\n")

os.system("python backend/ocr/ocr_engine.py")
os.system("python backend/ocr/cleaner.py")
os.system("python backend/ocr/keyword_check.py")
os.system("python backend/drug_lookup.py")
os.system("python backend/rag_answer.py")

print("\n✅ Pipeline completed successfully")
print("📄 Check backend/output/final_result.txt")