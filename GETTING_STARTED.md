# Getting started — make your own version

This repo is the **source code** of the Stone Labs studio reel (Remotion + Three.js). The finished videos are not included: you render them yourself, with your own brand, text, images and sound.

## 1. Install

You need **Node.js 18+** (and Python 3.9+ only if you want to regenerate images or audio, see step 5).

```sh
git clone https://github.com/ogunnaike1/stonelabs-advert.git
cd stonelabs-advert
npm install
```

`bin/ffmpeg` points at the ffmpeg that `npm install` downloads, so nothing else is needed for rendering.

## 2. Preview live

```sh
npx remotion studio src/index.ts
```

Open the URL it prints. Every edit to `src/` hot-reloads. Use the `StoneLabs` composition. Add `--port=3123` if port 3000 is busy.

## 3. Render a video

```sh
npm run render                                                      # 9:16, 1080x1920 -> out/stonelabs-showreel.mp4
npx remotion render StoneLabs out/wide.mp4 --gl=angle --props='{"format":"16x9"}'   # 16:9, 1920x1080
npx remotion render StoneLabs out/4k.mp4 --gl=angle --scale=2       # 4K
```

`out/` is created automatically and is git-ignored, so your renders never get committed.
`tools/render_4k.sh` is the long-form, resumable 4K pipeline used for the originals (macOS).

## 4. Make it yours: where to change what

| I want to change | Edit |
|---|---|
| Words, section order, timing, camera moves, voiceover cues | `src/timeline.ts` |
| Colours, palette | `src/theme.ts` |
| Fonts | `src/components/Fonts.tsx` and `public/fonts/` |
| Card layout (9:16 and 16:9 bento grid) | `src/layout.ts`, `src/format.ts` |
| Scenes (hook, sections, outro/logo card) | `src/scenes/Sections.tsx`, `src/scenes/Inside.tsx` |
| 3D: logo stones, the phone/slab, glass orb | `src/three/` |
| Logo | replace the PNGs in `public/logo/` (`mark-*.png`, `stone-top-*.png`, `stone-bottom-*.png`) and rebuild `stones.json` with `tools/stone_assets.py` |
| 360° interior renders | replace `public/panos/360-*.jpg` (equirectangular 2:1 images, any 3D tool) |
| Website screens shown on the slab | frame sequences in `public/seqc/website1` and `website2` (`0000.jpg`, `0001.jpg`, ... at 30 fps). Build your own from a screen recording with ffmpeg, then update the frame counts in `src/three/Phone.tsx` (`SEQ_LEN`) |
| Soundtrack | replace `public/audio/final_mix.wav` with any track of the right length |

Tip: start by changing text and colours in `src/timeline.ts` and `src/theme.ts`, preview in the studio, and go from there.

## 5. Optional: regenerate stills and audio (Python)

Only needed if you swap the panoramas, logo or sound. The rendered video itself does not need Python.

```sh
python3 -m venv .venv && source .venv/bin/activate
pip install numpy scipy pillow pillow-avif-plugin scikit-image google-genai
cp .env.example .env      # then paste your own Gemini API key into .env
```

| Script | What it does |
|---|---|
| `tools/pano_assets.py` | crops stills and builds the clay/line passes for the glass-orb scenes from `public/panos` |
| `tools/stone_assets.py` | logo contours (`stones.json`), stone textures, and the room stills in `public/stillsc` |
| `tools/prep_assets.py` | prepares the website frame sequences |
| `tools/gen_audio.py`, `tools/lyria_live.py` | generate voiceover (Gemini TTS) and music (Lyria) via your API key |
| `tools/sfx.py`, `tools/mix.py`, `tools/build_audio.sh` | synthesise SFX and mix everything to a -14 LUFS master `public/audio/final_mix.wav` |

Some scripts expect intermediate files in `assets/audio/` (included: `vo_master.wav`, `music_live_a.wav`, `mix_raw.wav`, `sfx.wav`). Read the header comment of each script before running it; several assume they run from the repo root.

## Notes

- Never commit `.env` (it is git-ignored).
- **Fonts:** Aesthetic Monoline is free for non-commercial use only; MuseoModerno and Bodoni Moda are OFL. See the README.
- **Brand:** the Stone Labs logo, copy and imagery belong to Stone Labs. Replace them before publishing anything of your own.
- Generated music from Lyria carries a SynthID watermark.
