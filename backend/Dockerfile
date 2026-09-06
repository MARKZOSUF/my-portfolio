FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1 PYTHONPATH=/app/backend
RUN apt-get update && apt-get install -y --no-install-recommends libpq5 tesseract-ocr poppler-utils && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt
COPY backend /app/backend
COPY database /app/database
COPY alembic.ini /app/alembic.ini
RUN useradd -r -u 10001 app && mkdir -p /data/storage && chown -R app:app /app /data/storage
USER app
WORKDIR /app/backend
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers"]
