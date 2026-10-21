#!/bin/sh
# 4K deliverables (16:9 first, then 9:16), 60 fps. Segmented, watchdog-protected, resumable renders.
cd "$(dirname "$0")/.." || exit 1
npx remotion bundle src/index.ts --out-dir=build --log=error >/dev/null 2>&1
for FMT in 16x9 9x16; do
  .venv/bin/python -I tools/render_segments.py "out/stonelabs-4k-$FMT-master.mp4" "$FMT" 2 || exit 1
  bin/ffmpeg -v error -y -i "out/stonelabs-4k-$FMT-master.mp4" -c:v libx264 -preset slow -crf 17 -maxrate 45M -bufsize 90M \
    -profile:v high -level 5.2 -pix_fmt yuv420p -c:a aac -b:a 256k -movflags +faststart "out/stonelabs-4k-$FMT.mp4"
  echo "done $FMT"
  [ "$FMT" = "16x9" ] && open -a "QuickTime Player" "out/stonelabs-4k-16x9.mp4"
done
