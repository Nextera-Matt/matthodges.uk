"""
Contact form handler for matthodges.uk.

Receives POST /api/contact from the site's contact form, validates it,
rate-limits by IP, and relays the message via Gmail SMTP.

Required environment variables (set via .env on the host, loaded by
docker-compose's env_file, never baked into the image):
  SMTP_USER    - Gmail address used to send (e.g. matthodges20@gmail.com)
  SMTP_PASS    - Gmail App Password (NOT your normal Gmail password)
  TO_ADDRESS   - where messages get delivered (defaults to SMTP_USER)
"""

import os
import smtplib
import time
from collections import defaultdict
from email.mime.text import MIMEText

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, constr

app = FastAPI(title="matthodges.uk contact handler")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://matthodges.uk", "https://www.matthodges.uk"],
    allow_methods=["POST"],
    allow_headers=["*"],
)

SMTP_HOST = os.environ.get("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USER = os.environ["SMTP_USER"]
SMTP_PASS = os.environ["SMTP_PASS"]
TO_ADDRESS = os.environ.get("TO_ADDRESS", SMTP_USER)

# Simple in-memory rate limit. Fine at this traffic scale (personal site);
# resets on container restart, and doesn't share state across replicas -
# neither matters here since this always runs as a single instance.
RATE_LIMIT = 5
RATE_WINDOW_SECONDS = 3600
_hits: dict[str, list[float]] = defaultdict(list)


class ContactForm(BaseModel):
    name: constr(strip_whitespace=True, min_length=1, max_length=100)
    email: EmailStr
    message: constr(strip_whitespace=True, min_length=1, max_length=5000)
    # Honeypot field. Real users never see or fill this (hidden via CSS on
    # the form) - matches the "Leave empty" field already on the site.
    # If it's non-empty, the submitter is almost certainly a bot.
    website: constr(strip_whitespace=True, max_length=0) = ""


def client_ip(request: Request) -> str:
    # nginx sits in front and should set this; fall back to direct peer
    # if the handler is ever hit without the proxy (e.g. local testing).
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def is_rate_limited(ip: str) -> bool:
    now = time.time()
    recent = [t for t in _hits[ip] if now - t < RATE_WINDOW_SECONDS]
    _hits[ip] = recent
    if len(recent) >= RATE_LIMIT:
        return True
    _hits[ip].append(now)
    return False


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/api/contact")
def submit_contact(form: ContactForm, request: Request):
    # Honeypot tripped: pretend success so bots don't learn anything,
    # but silently drop it - don't send an email, don't log the content.
    if form.website:
        return {"status": "ok"}

    ip = client_ip(request)
    if is_rate_limited(ip):
        raise HTTPException(status_code=429, detail="Too many submissions - try again later.")

    body = f"From: {form.name} <{form.email}>\nIP: {ip}\n\n{form.message}"
    msg = MIMEText(body)
    msg["Subject"] = f"Portfolio contact form: {form.name}"
    msg["From"] = SMTP_USER
    msg["To"] = TO_ADDRESS
    msg["Reply-To"] = form.email

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(SMTP_USER, [TO_ADDRESS], msg.as_string())
    except Exception:
        raise HTTPException(
            status_code=502,
            detail="Couldn't send your message right now - please try again shortly.",
        )

    return {"status": "ok"}
