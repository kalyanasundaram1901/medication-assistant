FROM python:3.11-slim

# Switch to root user to ensure we have permission to install software
USER root

# Fix for Exit Code 100: Use a more reliable update command
RUN apt-get update --fix-missing && apt-get install -y \
    tesseract-ocr \
    libtesseract-dev \
    libgl1-mesa-glx \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Final command using the correct Port
CMD gunicorn --bind 0.0.0.0:$PORT main:app
