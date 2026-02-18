import pytesseract
from PIL import Image
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")

def extract_text(image_path):
    img = Image.open(image_path)
    text = pytesseract.image_to_string(img)
    return text

if __name__ == "__main__":
    IMAGE_PATH = os.path.join(DATA_DIR, "input_image.jpg")
    OUTPUT_TEXT = os.path.join(DATA_DIR, "output_text.txt")
    
    if os.path.exists(IMAGE_PATH):
        text = extract_text(IMAGE_PATH)
        with open(OUTPUT_TEXT, "w", encoding="utf-8") as f:
            f.write(text)
        print("✅ OCR done")
        print("✅ Text saved to output_text.txt")
    else:
        print(f"❌ Input image not found at {IMAGE_PATH}")