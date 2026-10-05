#!/usr/bin/env python3
"""Local API for renaming and redating gig recordings.

Listens on localhost only. Nginx basic auth sits in front of /api/.
"""

from __future__ import annotations

import importlib.util
import json
import sys
import traceback
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

HOST = "127.0.0.1"
PORT = 8790
MAX_BODY = 64 * 1024
ROUTE = "/api/recording"

MODULE_PATH = Path(__file__).with_name("rebuild-catalog.py")
SPEC = importlib.util.spec_from_file_location("rebuild_catalog", MODULE_PATH)
if SPEC is None or SPEC.loader is None:
    raise RuntimeError(f"Cannot load {MODULE_PATH}")
rebuild_catalog = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(rebuild_catalog)

VIDEOS = Path("/var/media/gigs/videos")
CATALOG = Path("/var/media/gigs/catalog.json")


class Handler(BaseHTTPRequestHandler):
    server_version = "gigs-edit"
    protocol_version = "HTTP/1.1"

    def do_POST(self) -> None:  # noqa: N802
        if self.path.split("?", 1)[0] != ROUTE:
            self.respond(404, {"error": "Not found."})
            return
        if "application/json" not in self.headers.get("Content-Type", ""):
            self.respond(415, {"error": "Send JSON."})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            self.respond(400, {"error": "Expected a recording."})
            return
        if length < 0 or length > MAX_BODY:
            self.respond(413, {"error": "That edit is too large."})
            return
        try:
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            self.respond(400, {"error": "Expected a recording."})
            return
        try:
            saved = rebuild_catalog.edit_recording(VIDEOS, CATALOG, payload)
        except rebuild_catalog.EditError as exc:
            self.respond(exc.status, {"error": str(exc)})
            return
        except SystemExit as exc:
            print(f"catalog rebuild failed: {exc}", file=sys.stderr)
            self.respond(500, {"error": "Could not save that recording."})
            return
        except Exception:
            traceback.print_exc()
            self.respond(500, {"error": "Could not save that recording."})
            return
        self.respond(200, saved)

    def respond(self, status: int, payload: dict) -> None:
        body = (json.dumps(payload) + "\n").encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt: str, *args: object) -> None:
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))


def main() -> int:
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"gig edits listening on http://{HOST}:{PORT}{ROUTE}", file=sys.stderr)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        return 0
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
