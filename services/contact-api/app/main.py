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

import html
import os
import smtplib
import time
from collections import defaultdict
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, constr

from .tools import router as tools_router

app = FastAPI(title="matthodges.uk contact handler")

app.include_router(tools_router)

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

    plain_body = f"From: {form.name} <{form.email}>\nIP: {ip}\n\n{form.message}"

    # Escape user input before it goes anywhere near HTML - this is only
    # ever displayed in Matt's own inbox, but a submitter pasting "<b>" or
    # similar shouldn't be able to mangle the formatting.
    safe_name = html.escape(form.name)
    safe_email = html.escape(form.email)
    safe_message = html.escape(form.message).replace("\n", "<br>")

    html_body = f"""\
<div style="font-family: -apple-system, sans-serif; max-width: 500px; margin: 0 auto;">
  <div style="background: #0d1117; color: #e6edf3; padding: 20px 24px; border-radius: 8px 8px 0 0;">
    <p style="margin: 0; font-size: 13px; color: #8a95a8;">Portfolio contact form</p>
    <p style="margin: 4px 0 0; font-size: 18px; font-weight: 600;">{safe_name}</p>
    <p style="margin: 2px 0 0; font-size: 14px; color: #8a95a8;">{safe_email}</p>
  </div>
  <div style="border: 1px solid #e1e4e8; border-top: none; padding: 20px 24px; border-radius: 0 0 8px 8px;">
    <p style="margin: 0; line-height: 1.6; color: #24292f;">{safe_message}</p>
  </div>
  <p style="font-size: 12px; color: #8a95a8; margin: 12px 4px 0;">From IP {html.escape(ip)}</p>
</div>
"""

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"Portfolio contact form: {form.name}"
    msg["From"] = SMTP_USER
    msg["To"] = TO_ADDRESS
    msg["Reply-To"] = form.email
    # Plain text attached first - clients that support HTML use the last
    # part (the HTML one), so this order is what makes plain text the
    # fallback rather than the preferred version.
    msg.attach(MIMEText(plain_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))

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
