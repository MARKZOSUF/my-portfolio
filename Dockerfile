# syntax=docker/dockerfile:1
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    FLASK_ENV=production

WORKDIR /app

# ClamAV provides local malware scanning (no external API key).
# clamav-freshclam supplies the signature database. Without it clamscan exits
# non-zero and every upload fails with MALWARE_SCAN_FAILED (503).
RUN apt-get update \
    && apt-get install -y --no-install-recommends clamav clamav-freshclam fonts-dejavu-core curl \
    && rm -rf /var/lib/apt/lists/* \
    && addgroup --system app && adduser --system --ingroup app app

# Pre-seed virus definitions at build time. Non-fatal so the image still builds
# on networks that block the ClamAV mirrors; the entrypoint retries at start.
RUN freshclam --quiet || echo "freshclam unavailable at build time; entrypoint will retry"

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh \
    && mkdir -p /app/instance/uploads /var/lib/clamav /var/log/clamav \
    && chown -R app:app /app /var/lib/clamav /var/log/clamav \
    && chmod 700 /app/instance/uploads

USER app
EXPOSE 5000

# Readiness endpoint: fails (non-zero exit) when the app or its required
# dependencies (database, Redis when configured) are not ready.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:5000/api/health/ready', timeout=4)"

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["gunicorn", "--config", "gunicorn.conf.py", "app:app"]
