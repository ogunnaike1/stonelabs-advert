#!/bin/sh
cd "$(dirname "$0")/.." || exit 1
for f in assets/audio/vo_*_t3_*.wav; do
  m=analysis/$(basename "${f%.wav}").mp3
  bin/ffmpeg -v error -y -i "$f" -ac 1 -b:a 64k "$m"
  echo "=== $f"
  .venv/bin/python -I tools/listen.py "$m" "You are a casting director for a premium brand-film voiceover. 1) Transcribe exactly with start-end timestamps per sentence (0.1s precision). 2) Did the speaker read any bracketed directions or instructions aloud (yes/no, which)? 3) Rate 1-10: emotional expressiveness (does the emotion change per line: wonder, pride, smile, awe, conviction), warmth, naturalness (not robotic), voice depth, audio cleanliness (artifacts, clicks, robotic glitches). 4) One-line verdict." 2>&1 | grep -v -i warn
  sleep 4
done
