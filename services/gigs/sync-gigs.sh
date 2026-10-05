#!/usr/bin/env bash
# Copy local gig recordings to the VPS disk and rebuild the catalog.
# Does not delete files on the server that are missing locally.
#
# Usage:
#   GIGS_HOST=your.vps.example ./services/gigs/sync-gigs.sh /path/to/videos

set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: GIGS_HOST=your.vps.example $0 /path/to/videos" >&2
  exit 1
fi

SRC=$1
HOST=${GIGS_HOST:-}
REMOTE_USER=${GIGS_USER:-rocky}
PORT=${GIGS_PORT:-2233}
REMOTE_DIR=${GIGS_REMOTE_DIR:-/var/media/gigs/videos}
REMOTE_SCRIPT=${GIGS_REMOTE_SCRIPT:-/home/rocky/gigs/rebuild-catalog.py}

if [[ -z "$HOST" ]]; then
  echo "Set GIGS_HOST to the VPS hostname or IP." >&2
  exit 1
fi
if [[ ! -d "$SRC" ]]; then
  echo "Not a directory: $SRC" >&2
  exit 1
fi

ROOT=$(cd "$(dirname "$0")" && pwd)
REMOTE="${REMOTE_USER}@${HOST}"
SSH=(ssh -p "$PORT")

"${SSH[@]}" "$REMOTE" "mkdir -p -- $(printf '%q' "$REMOTE_DIR") $(printf '%q' "$(dirname "$REMOTE_SCRIPT")")"

rsync -a --partial --progress \
  -e "ssh -p ${PORT}" \
  --include '*/' \
  --include '*.mp4' --include '*.m4v' --include '*.webm' \
  --include '*.mov' --include '*.mkv' --include '*.ogg' --include '*.ogv' \
  --include '*.mp4.json' --include '*.m4v.json' --include '*.webm.json' \
  --include '*.mov.json' --include '*.mkv.json' --include '*.ogg.json' --include '*.ogv.json' \
  --exclude '*' \
  "${SRC}/" "${REMOTE}:${REMOTE_DIR}/"

rsync -a -e "ssh -p ${PORT}" \
  "${ROOT}/rebuild-catalog.py" "${REMOTE}:${REMOTE_SCRIPT}"

"${SSH[@]}" "$REMOTE" "python3 $(printf '%q' "$REMOTE_SCRIPT")"
