FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy all source files
COPY . .

# Run training to pre-generate the model
RUN python main.py

# Expose port
EXPOSE 7860

# Run FastAPI app
CMD ["uvicorn", "server.main:app", "--host", "0.0.0.0", "--port", "7860"]
