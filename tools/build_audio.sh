#!/bin/sh
# Sound design → mix (music + VO + SFX) → two-pass EBU R128 normalise to -14 LUFS / -1.5 dBTP.
cd "$(dirname "$0")/.." || exit 1
.venv/bin/python -I tools/sfx.py || exit 1
.venv/bin/python -I tools/mix.py || exit 1
IN=assets/audio/mix_raw.wav
J=$(bin/ffmpeg -hide_banner -i $IN -af loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
g() { echo "$J" | grep "\"$1\"" | sed 's/.*: "\(.*\)".*/\1/'; }
bin/ffmpeg -v error -y -i $IN -af "loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=$(g input_i):measured_TP=$(g input_tp):measured_LRA=$(g input_lra):measured_thresh=$(g input_thresh):offset=$(g target_offset):linear=true" -ar 48000 -c:a pcm_s24le public/audio/final_mix.wav
bin/ffmpeg -hide_banner -i public/audio/final_mix.wav -af ebur128=peak=true -f null - 2>&1 | grep -E "I:|Peak:" | tail -2
