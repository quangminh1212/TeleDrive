FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

# Set working directory
WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project
COPY . .

# Run as non-root user for security
RUN useradd -m teledrive
USER teledrive

# Expose port
EXPOSE 3000

# Command to run on container start
CMD ["python", "-m", "teledrive.web.app"]