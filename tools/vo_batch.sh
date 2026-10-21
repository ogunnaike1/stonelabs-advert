#!/bin/sh
cd "$(dirname "$0")/.." || exit 1
for spec in "Orus t3_a gemini-3.8-flash-tts" "Orus t3_p gemini-2.5-pro-preview-tts" "Orus t3_f gemini-3.1-flash-tts-preview" "Charon t3_a gemini-3.8-flash-tts" "Algieba t3_a gemini-3.8-flash-tts" "Orus t3_b gemini-3.8-flash-tts"; do
  set -- $spec
  .venv/bin/python -I tools/gen_audio.py vo "$1" "$2" "$3" 2>&1 | grep -E "wrote|HTTP|waiting"
done
