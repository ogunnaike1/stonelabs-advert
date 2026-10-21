#!/bin/sh
# usage: tools/stills.sh name t1 t2 ...   → analysis/stills/<name>.jpg contact row
cd "$(dirname "$0")/.." || exit 1
name=$1; shift
npx remotion bundle src/index.ts --out-dir=build --log=error >/dev/null 2>&1
inputs=""; n=0
for s in "$@"; do
  f=$(python3 -c "print(round($s*60))")
  npx remotion still build StoneLabs "analysis/stills/f_$s.png" --frame="$f" --gl=angle --log=error 2>&1 | grep -v "^$" | tail -2
  inputs="$inputs -i analysis/stills/f_$s.png"; n=$((n+1))
done
bin/ffmpeg -v error -y $inputs -filter_complex "hstack=$n,scale=$((n*400)):-1" "analysis/stills/$name.jpg"
