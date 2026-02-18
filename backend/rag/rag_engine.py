import os
import re

import pandas as pd

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXCEL_PATH = os.path.join(BASE_DIR, "drug_database", "medicine_database.xlsx")

def load_drug_documents():
    docs = {}
    if not os.path.exists(EXCEL_PATH):
        print(f"Warning: {EXCEL_PATH} does not exist.")
        return {}
        
    try:
        df = pd.read_excel(EXCEL_PATH)
        for _, row in df.iterrows():
            drug_name = str(row['Name']).lower().strip()
            # Construct a text representation similar to the old text files
            content = f"Name: {row['Name']}\n"
            content += f"Used for: {row['Used for']}\n"
            content += f"How it works: {row['How it works']}\n"
            content += f"Common side effects: {row['Common side effects']}\n"
            content += f"Notes: {row['Notes']}\n"
            docs[drug_name] = content
    except Exception as e:
        print(f"Error loading Excel: {e}")

    return docs


def answer_question(question: str):
    question_lower = question.lower().strip()
    
    # 1. Load drug documents
    docs = load_drug_documents()

    # 2. Check for medicines FIRST (with word boundaries)
    # Sort by length descending to match "Vitamin C" before "C"
    sorted_drugs = sorted(docs.keys(), key=len, reverse=True)
    
    for drug_name in sorted_drugs:
        pattern = rf"\b{re.escape(drug_name)}\b"
        if re.search(pattern, question_lower):
            content = docs[drug_name]
            # Format the content neatly
            lines = content.strip().split('\n')
            formatted_response = f"💊 **{drug_name.capitalize()} Information**\n"
            
            for line in lines:
                if ":" in line:
                    key, value = line.split(":", 1)
                    formatted_response += f"🔹 **{key.strip()}**: {value.strip()}\n"
                else:
                    formatted_response += f"• {line.strip()}\n"
            
            return formatted_response

    # 3. Check for greetings only if no medicine found
    greetings = {
        "hi": "Hello! 👋 How can I help you with your medication today?",
        "hii": "Hii! 👋 How can I assist you?",
        "hello": "Hello there! 😊 Need help with a prescription or medicine?",
        "hey": "Hey! 👋 I'm here to help with your meds.",
        "good morning": "Good morning! ☀️ I hope you're feeling well today. How can I help?",
        "good afternoon": "Good afternoon! 🌤️ How can I assist you?",
        "good evening": "Good evening! 🌙 Don't forget to take your night meds if you have any!",
        "good night": "Good night! 😴 Sleep well and take care!",
        "how are you": "I'm just a bot, but I'm ready to help you! 🤖 How are you feeling?",
        "thank you": "You're very welcome! Stay healthy! ❤️",
        "thanks": "You're welcome! Let me know if you need anything else. 🌟"
    }

    for key, response in greetings.items():
        pattern = rf"\b{re.escape(key)}\b"
        if re.search(pattern, question_lower):
             return response

    return "🤔 I couldn't find information on that medicine in my database. \n\nCould you double-check the spelling or try asking about another drug?"