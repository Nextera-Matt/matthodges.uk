"""
Live tool demos for the portfolio site.

- /api/tools/ip-lookup    - real IP geolocation lookup (wraps ip-api.com)
- /api/tools/ooh-alerting - the same four-tier escalation logic as the
                             ooh-alerting repo, runnable interactively

Both are rate-limited per IP using the same simple in-memory approach as
the contact form - fine at this traffic scale, resets on container
restart, no external dependency needed.
"""

import time
import urllib.request
import json as jsonlib
from collections import defaultdict

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, constr

router = APIRouter(prefix="/api/tools", tags=["tools"])

# ---------------------------------------------------------------------
# Shared rate limiting (separate buckets per tool, so playing with one
# doesn't use up your allowance on the other)
# ---------------------------------------------------------------------

RATE_LIMIT = 20
RATE_WINDOW_SECONDS = 3600
_hits: dict[str, list[float]] = defaultdict(list)


def rate_limited(bucket: str, ip: str) -> bool:
    key = f"{bucket}:{ip}"
    now = time.time()
    recent = [t for t in _hits[key] if now - t < RATE_WINDOW_SECONDS]
    _hits[key] = recent
    if len(recent) >= RATE_LIMIT:
        return True
    _hits[key].append(now)
    return False


def client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


# ---------------------------------------------------------------------
# IP Lookup - real tool, wraps the free ip-api.com endpoint the same
# way the original iplookup.sh bash script does.
# ---------------------------------------------------------------------

_ip_cache: dict[str, tuple[float, dict]] = {}
IP_CACHE_TTL = 300


@router.get("/ip-lookup")
def ip_lookup(ip: constr(strip_whitespace=True, min_length=3, max_length=45), request: Request):
    caller_ip = client_ip(request)
    if rate_limited("ip-lookup", caller_ip):
        raise HTTPException(status_code=429, detail="Too many lookups - try again in a bit.")

    now = time.time()
    cached = _ip_cache.get(ip)
    if cached and now - cached[0] < IP_CACHE_TTL:
        return {**cached[1], "cached": True}

    url = f"http://ip-api.com/json/{ip}?fields=status,message,country,regionName,city,isp,as,query,lat,lon"
    try:
        with urllib.request.urlopen(url, timeout=5) as resp:
            data = jsonlib.loads(resp.read())
    except Exception:
        raise HTTPException(status_code=502, detail="Lookup service unavailable right now.")

    if data.get("status") != "success":
        raise HTTPException(status_code=400, detail=data.get("message", "Lookup failed - check the IP is valid."))

    result = {
        "ip": data.get("query"),
        "country": data.get("country"),
        "region": data.get("regionName"),
        "city": data.get("city"),
        "isp": data.get("isp"),
        "asn": data.get("as"),
        "maps_url": f"https://www.google.com/maps?q={data.get('lat')},{data.get('lon')}",
        "cached": False,
    }
    _ip_cache[ip] = (now, result)
    return result


# ---------------------------------------------------------------------
# OOH Alerting classifier - same four-tier logic as the ooh-alerting
# repo (VIP / Priority / Keyword / Watched), runnable interactively.
# "simulate_ooh" lets a visitor see meaningful output regardless of
# what time it actually is when they try it.
# ---------------------------------------------------------------------

DEMO_VIP_IDS = ["client-101", "client-204"]
DEMO_PRIORITY_IDS = ["client-330"]
DEMO_WATCHED_TICKET_IDS = ["tk-9001"]
DEMO_EMERGENCY_KEYWORDS = ["down", "unreachable", "data loss", "outage"]
DEMO_SKIP_PATTERNS = ["test ticket", "please ignore"]


class OohClassifyRequest(BaseModel):
    ticket_id: constr(strip_whitespace=True, min_length=1, max_length=50)
    client_id: constr(strip_whitespace=True, min_length=1, max_length=50)
    subject: constr(strip_whitespace=True, min_length=1, max_length=200)
    simulate_ooh: bool = True


def classify_tier(ticket_id: str, client_id: str, subject: str) -> tuple[str | None, str]:
    if client_id in DEMO_VIP_IDS:
        return "vip", f"client_id '{client_id}' is on the VIP list"
    if client_id in DEMO_PRIORITY_IDS:
        return "priority", f"client_id '{client_id}' is on the priority list"
    if ticket_id in DEMO_WATCHED_TICKET_IDS:
        return "watched", f"ticket_id '{ticket_id}' is on the explicit watchlist"

    normalised = subject.lower()
    matched_skip = next((p for p in DEMO_SKIP_PATTERNS if p in normalised), None)
    if matched_skip:
        return None, f"subject matched skip pattern '{matched_skip}' - suppressed even though a keyword may match"

    matched_keyword = next((k for k in DEMO_EMERGENCY_KEYWORDS if k in normalised), None)
    if matched_keyword:
        return "keyword", f"subject matched emergency keyword '{matched_keyword}'"

    return None, "no VIP/priority client, not watched, no emergency keyword match"


@router.post("/ooh-alerting")
def ooh_alerting_classify(payload: OohClassifyRequest, request: Request):
    caller_ip = client_ip(request)
    if rate_limited("ooh-alerting", caller_ip):
        raise HTTPException(status_code=429, detail="Too many classifications - try again in a bit.")

    if not payload.simulate_ooh:
        return {
            "escalated": False,
            "tier": None,
            "reason": "within simulated business hours - the on-call team isn't paged",
            "audit_log": [{"outcome": "not_escalated", "reason": "within business hours"}],
        }

    tier, reason = classify_tier(payload.ticket_id, payload.client_id, payload.subject)
    if tier is None:
        return {
            "escalated": False,
            "tier": None,
            "reason": reason,
            "audit_log": [{"outcome": "not_escalated", "reason": reason}],
        }

    return {
        "escalated": True,
        "tier": tier,
        "reason": reason,
        "audit_log": [{"outcome": "paged", "reason": f"matched {tier} tier - {reason}"}],
    }
