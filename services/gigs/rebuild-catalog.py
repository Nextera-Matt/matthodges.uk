#!/usr/bin/env python3
"""Rebuild the gig archive catalog from files on the media disk.

Titles, venues, dates, and notes already stored in the catalog are kept.
A sidecar next to a video (same name plus .json) overrides those fields.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

VIDEO_EXT = {".mp4", ".m4v", ".webm", ".mov", ".mkv", ".ogg", ".ogv"}
SAFE_PART = re.compile(r"^[\w][\w. ()',&+-]{0,180}$")
DATED_NAME = re.compile(r"^(\d{4}-\d{2}-\d{2})[ _](.+)$")
SIDECAR_FIELDS = ("title", "venue", "date", "notes")


def humanize(value: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[-_]+", " ", value).strip())


def valid_date(value: str) -> bool:
    try:
        dt.date.fromisoformat(value)
    except ValueError:
        return False
    return True


def parse_name(filename: str) -> dict[str, str]:
    stem = Path(filename).stem
    match = DATED_NAME.match(stem)
    if not match or not valid_date(match.group(1)):
        return {"title": humanize(stem), "venue": "", "date": "", "notes": ""}
    date, rest = match.group(1), match.group(2)
    if "_" in rest:
        venue, title = rest.split("_", 1)
    else:
        venue, title = "", rest
    return {
        "title": humanize(title) or humanize(stem),
        "venue": humanize(venue),
        "date": date,
        "notes": "",
    }


def relative_media_path(root: Path, path: Path) -> str | None:
    rel = path.relative_to(root).as_posix()
    parts = rel.split("/")
    if any(part in {"", ".", ".."} or SAFE_PART.fullmatch(part) is None for part in parts):
        return None
    return rel


def iter_videos(root: Path) -> list[tuple[str, Path]]:
    found: list[tuple[str, Path]] = []
    root_resolved = root.resolve()
    for path in root.rglob("*"):
        if not path.is_file() or path.is_symlink():
            continue
        if path.suffix.lower() not in VIDEO_EXT:
            continue
        try:
            path.resolve().relative_to(root_resolved)
        except ValueError:
            print(f"skip outside archive: {path}", file=sys.stderr)
            continue
        rel = relative_media_path(root, path)
        if rel is None:
            print(f"skip unsafe name: {path.relative_to(root)}", file=sys.stderr)
            continue
        found.append((rel, path))
    return found


def load_previous(catalog: Path) -> dict[str, dict]:
    if not catalog.exists():
        return {}
    try:
        data = json.loads(catalog.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        print(f"{catalog} is not valid JSON ({exc}); refusing to overwrite it", file=sys.stderr)
        raise SystemExit(1) from exc
    items = data.get("items") if isinstance(data, dict) else None
    if not isinstance(items, list):
        print(f"{catalog} has no items list; refusing to overwrite it", file=sys.stderr)
        raise SystemExit(1)
    previous: dict[str, dict] = {}
    for item in items:
        if isinstance(item, dict) and isinstance(item.get("file"), str):
            previous[item["file"]] = item
    return previous


def load_sidecar(video: Path) -> dict[str, str]:
    sidecar = Path(str(video) + ".json")
    if not sidecar.is_file():
        return {}
    try:
        data = json.loads(sidecar.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        print(f"skip sidecar {sidecar.name}: {exc}", file=sys.stderr)
        return {}
    if not isinstance(data, dict):
        print(f"skip sidecar {sidecar.name}: expected an object", file=sys.stderr)
        return {}
    kept: dict[str, str] = {}
    for key in SIDECAR_FIELDS:
        value = data.get(key)
        if isinstance(value, str):
            kept[key] = value.strip()
    if "date" in kept and kept["date"] and not valid_date(kept["date"]):
        print(f"sidecar {sidecar.name}: date must be YYYY-MM-DD", file=sys.stderr)
        del kept["date"]
    return kept


def pick(parsed: dict[str, str], previous: dict, sidecar: dict[str, str], key: str) -> str:
    if key in sidecar:
        return sidecar[key]
    previous_value = previous.get(key)
    if isinstance(previous_value, str) and previous_value.strip():
        return previous_value.strip()
    return parsed[key]


def probe_duration(path: Path) -> float | None:
    ffprobe = shutil.which("ffprobe")
    if ffprobe is None:
        return None
    try:
        result = subprocess.run(
            [
                ffprobe,
                "-v",
                "error",
                "-show_entries",
                "format=duration",
                "-of",
                "default=noprint_wrappers=1:nokey=1",
                str(path),
            ],
            check=False,
            capture_output=True,
            text=True,
            timeout=60,
        )
    except (OSError, subprocess.TimeoutExpired):
        return None
    if result.returncode != 0:
        return None
    try:
        duration = float(result.stdout.strip())
    except ValueError:
        return None
    if duration <= 0:
        return None
    return round(duration, 3)


def cached_duration(previous: dict, size: int, mtime: int) -> float | None:
    if previous.get("bytes") != size or previous.get("mtime") != mtime:
        return None
    duration = previous.get("duration")
    if isinstance(duration, (int, float)) and duration > 0:
        return float(duration)
    return None


def build_item(rel: str, path: Path, previous: dict) -> dict:
    parsed = parse_name(path.name)
    sidecar = load_sidecar(path)
    stat = path.stat()
    size = stat.st_size
    mtime = stat.st_mtime_ns
    duration = cached_duration(previous, size, mtime)
    if duration is None:
        duration = probe_duration(path)
    item = {
        "file": rel,
        "title": pick(parsed, previous, sidecar, "title"),
        "venue": pick(parsed, previous, sidecar, "venue"),
        "date": pick(parsed, previous, sidecar, "date"),
        "notes": pick(parsed, previous, sidecar, "notes"),
        "bytes": size,
        "mtime": mtime,
    }
    if duration is not None:
        item["duration"] = duration
    return item


def write_catalog(catalog: Path, videos: Path, items: list[dict]) -> None:
    usage = shutil.disk_usage(videos)
    payload = {
        "updated": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "disk": {
            "mount": str(videos),
            "total": usage.total,
            "used": usage.used,
            "free": usage.free,
        },
        "items": items,
    }
    catalog.parent.mkdir(parents=True, exist_ok=True)
    temporary = catalog.with_suffix(".json.tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    temporary.replace(catalog)


def rebuild(videos: Path, catalog: Path) -> int:
    if not videos.is_dir():
        print(f"Videos directory does not exist: {videos}", file=sys.stderr)
        return 1
    previous = load_previous(catalog)
    items = [build_item(rel, path, previous.get(rel, {})) for rel, path in iter_videos(videos)]
    items.sort(key=lambda item: item["title"].lower())
    items.sort(key=lambda item: item["date"] or "", reverse=True)
    write_catalog(catalog, videos, items)
    total = sum(item["bytes"] for item in items)
    print(f"catalog: {len(items)} recordings, {total / (1024 ** 3):.1f} GiB -> {catalog}")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Rebuild the gig archive catalog.")
    parser.add_argument("--videos", type=Path, default=Path("/var/media/gigs/videos"))
    parser.add_argument("--catalog", type=Path, default=Path("/var/media/gigs/catalog.json"))
    args = parser.parse_args()
    return rebuild(args.videos, args.catalog)


if __name__ == "__main__":
    sys.exit(main())
