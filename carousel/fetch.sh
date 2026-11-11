#!/usr/bin/env bash
# Zieht Caption, Beschreibung und (falls möglich) Untertitel aus einem Instagram/TikTok/YouTube/X Link.
# Nutzung: carousel/fetch.sh <url> <zielordner>
set -euo pipefail
URL="$1"; OUT="${2:-./_source}"
mkdir -p "$OUT"
command -v yt-dlp >/dev/null || pip install -q yt-dlp
yt-dlp --skip-download --write-info-json --write-subs --write-auto-subs --sub-langs "de.*,en.*" \
  --sub-format vtt -o "$OUT/source.%(ext)s" "$URL" || echo "WARN: yt-dlp konnte nicht alles laden"
if [ -f "$OUT/source.info.json" ]; then
  python3 -I -c 'import json,sys;d=json.load(open(sys.argv[1]));[print(f"{k}: {d.get(k)}") for k in ("title","uploader","description","duration","view_count","like_count")]' "$OUT/source.info.json"
fi
ls -1 "$OUT"
