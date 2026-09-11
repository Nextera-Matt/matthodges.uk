FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

EXPOSE 8000

# No secrets here - SMTP_USER/SMTP_PASS/TO_ADDRESS are injected at
# runtime via docker-compose's env_file, not baked into the image.
# APP_HOST/APP_PORT are set by docker-compose to force 127.0.0.1 binding
# under host networking - critical, since host mode has no bridge
# isolation and 0.0.0.0 would expose this directly to the internet.
CMD ["sh", "-c", "uvicorn app.main:app --host ${APP_HOST:-0.0.0.0} --port ${APP_PORT:-8000}"]
