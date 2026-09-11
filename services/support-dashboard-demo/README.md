# Support Operations Dashboard

A reference recreation of a real-time support ops dashboard I built while working
as a Cloud & Infrastructure Engineer at THG Ingenuity - originally aggregating
tickets from three separate platforms (two Ubersmith instances + Zoho Desk) into
one unified view for the support team.

**This repo is a clean, from-scratch rebuild for portfolio purposes** - not the
original production code. It uses synthetic/generated data and reimplements the
same architecture (multi-source aggregation, two-tier caching, role-based access)
without any real client data, credentials, or internal endpoints.

## Architecture

```
                    ┌─────────────────┐
   Ubersmith #1  ─▶ │                 │
   Ubersmith #2  ─▶ │   Aggregator    │─▶  L1 cache (in-memory, ~30s)
   Zoho Desk     ─▶ │                 │        │
                    └─────────────────┘        ▼
                                          L2 cache (file, ~5min)
                                                │
                                                ▼
                                          Dashboard UI
```

**Two-tier caching** is the core performance idea: an in-memory (APCu-style) L1
cache absorbs rapid repeat requests within a short window, and a file-backed L2
cache absorbs the cost of the actual upstream API calls, refreshed on a longer
interval by a background warm job. Together, in the original system, this took
page load from roughly ticket-fetch-per-request down to serving nearly instantly
from cache - the "40x faster response times" figure on my site refers to this.

## What's in here

- `api/lib/TicketSource.php` - interface each platform adapter implements
- `api/lib/UbersmithAdapter.php`, `ZohoAdapter.php` - platform-specific fetchers (mocked)
- `api/lib/Cache.php` - the two-tier cache (memory + file)
- `api/lib/Rbac.php` - role-based access control (engineer / team-lead / admin)
- `api/aggregate.php` - pulls from all sources through the cache layer
- `public/index.php` - minimal dashboard view
- `data/generate-mock-tickets.php` - produces realistic-looking fake ticket data

## Running it

```bash
php -S localhost:8000 -t public
```

No external services needed - `data/generate-mock-tickets.php` seeds a local
SQLite file with fake tickets on first run, and the "Ubersmith"/"Zoho" adapters
just read from that instead of calling real APIs.
