FROM python:3.11-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=off \
    PIP_DISABLE_PIP_VERSION_CHECK=on

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libmagic1 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy project files
COPY requirements.txt .
COPY pyproject.toml .
COPY pytest.ini .
COPY main.py .
COPY README.md .
COPY LICENSE .
COPY src/ ./src/
COPY static/ ./static/
COPY templates/ ./templates/
COPY config/ ./config/
COPY docs/ ./docs/

# Create necessary directories
RUN mkdir -p instance logs downloads output

# Install dependencies
RUN pip install --upgrade pip && \
    pip install -r requirements.txt

# Expose port
EXPOSE 3000

# Set environment to production
ENV FLASK_ENV=production \
    FLASK_APP=src.teledrive.app

# Run with a proper WSGI server
CMD ["waitress-serve", "--host=0.0.0.0", "--port=3000", "main:app"] 