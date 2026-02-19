FROM python:3.11-slim

# Switch to root to ensure full permissions for system installs
USER root

# Fix for Exit Code 100: Standardize the sources and use --fix-missing
RUN apt-get update --fix-missing && \
    apt-get install -y --no-install-recommends \
    tesseract-ocr \
    libtesseract-dev \
    libgl1 \
    libglib2.0-0 \
    && apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy and install Python requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the backend files
COPY . .

# This version forces the shell to translate $PORT into a real number
CMD ["sh", "-c", "gunicorn --bind 0.0.0.0:$PORT main:app"]
