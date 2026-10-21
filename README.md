# Stone Labs — Studio Reel (40 s · 9:16 and 16:9 · 4K)

Remotion + Three.js project, 60 fps, H.264. One source renders both formats:
- **9:16:** default props → 1080×1920; with `--scale=2` → **2160×3840**
- **16:9:** `--props='{"format":"16x9"}'` → 1920×1080; with `--scale=2` → **3840×2160**. It uses its own landscape bento layouts (`src/layout.ts`, `src/format.ts`).

```
tools/render_4k.sh   # both 4K deliverables → out/stonelabs-4k-9x16.mp4, out/stonelabs-4k-16x9.mp4 (+ -master)
```

```
npx remotion studio src/index.ts --port=3123   # preview (port 3000 is taken on this machine)
tools/build_audio.sh                           # SFX → mix (music + VO + SFX) → −14 LUFS master
npx remotion render build StoneLabs out/x.mp4 --gl=angle   # after: npx remotion bundle src/index.ts --out-dir=build
tools/stills.sh name 3.2 9                     # stills contact sheet → analysis/stills/name.jpg
```

## How the reference is used (style, not product)

From `reference.mov` we take the **motion language**:
- frosted bento cards on a soft bokeh backdrop
- camera glides and pull-backs across one continuous board
- objects that flip in through their edge
- a scattered pile the camera dives into, a rotating trio, and an ending close-up
- bold titles that snap in

We do **not** take its product. The reference sells phones, so v4 has none. The hero object is the **Stone Labs slab**: a thick honed-stone tablet with soft pebble edges.
- The face carries an inlaid display showing your real websites (site content only, no device UI).
- The back carries the mark as a polished graphite inlay.

The hook uses the **two stones of the official mark as real 3D objects** (`src/three/LogoStones.tsx`, outlines traced from the supplied artwork):
1. They slam together on the music's first downbeat at 0.6 s.
2. **IDEAS, / MADE REAL.** split-snaps in around them.
3. They grind apart and fly past the lens as the camera pushes through the gap into **STONE LABS**.

## Blender interiors

Each 360° render is presented as a **glass orb**: the equirectangular image wrapped on a sphere.
- The orb starts as a Blender-style **clay + Freestyle-line viewport pass** (`tools/pano_assets.py`).
- It then "renders" top-to-bottom like Cycles, with a sample counter and progress bar.
- The camera then **dives inside the orb** into a true perspective view of the room, framed by a Blender viewport HUD with a camera label, axis gizmo and Cycles stats. A whip-pan moves to the kitchen.

## Fonts (only these three families)

| Your specimen | Used | Why |
|---|---|---|
| Aesthetic Monoline | **Aesthetic Monoline** (the actual font) | script accents |
| "Anymore" modern display | **MuseoModerno** | closest available: the same rounded monoline geometry and U-shaped N/Y. Used for titles and labels. |
| "Æsthetics" serif | **Bodoni Moda** | closest available: light, high-contrast, hairline serifs. Used for captions. |

Licensing: Aesthetic Monoline's free download is **non-commercial**. Buy the commercial licence (Aveni Letter Type) before running this as a paid ad. MuseoModerno and Bodoni Moda are OFL.

## Audio

- **Music:** an original synthwave / outrun "night drive" bed generated with **Google Lyria RealTime** (`tools/lyria_live.py`). It's steered section by section at 100 BPM and edited bar-by-bar in `tools/mix.py`: it crashes in on the stone slam (0.6 s), and its peak section repeats so the groove drives through to the logo. A beat-locked punch layer (sub kick + gated clap) adds weight. Lyria output carries a SynthID watermark.
- **Voiceover:** **Gemini TTS** (`gemini-3.1-flash-tts-preview`, voice *Orus*, take `vo_Orus_t5_a`) with per-line emotion tags. Several voices and models were auditioned with an AI "casting" pass (`tools/listen.py`). Lines are placed per `VO_CUES` in `src/timeline.ts`.
- **SFX:** layered, synthesised sound design (`tools/sfx.py`): phone-flip swishes with rotation flutter, glass taps as the pile lands, dives, a render shimmer and crackle, whip-pans, word pops and the stone knock on the logo.
- **Mix:** `tools/mix.py`. The music ducks −6 dB under the voice; the voice gets EQ, a de-esser, a compressor and a look-ahead limiter. The master is −14 LUFS / −1.4 dBTP.

## Palette

Studio greys with the brand's warm stone undertone, plus one walnut accent.

| Colour | HEX |
|---|---|
| Light | `#F1EFEC` |
| Dark | `#CFCCC7` |
| Card | `rgba(250,249,247,.66)` |
| Ink (logo graphite) | `#1B1B1A` |
| Caption | `#6F6A64` |
| Walnut | `#5A4535` |
