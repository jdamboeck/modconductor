# cli-modplayer · "Conductor" redesign — handoff for Claude Code (v6)

This is a design handoff for https://github.com/Master290/cli-modplayer (C++ ·
FTXUI · libopenmpt · PortAudio · CMake). Put this folder in the repo as
`docs/design/` and point the repo's own CLAUDE.md at it with one line: "UI
redesign spec lives in docs/design/CLAUDE.md".

This version replaces the earlier v4 handoff. What's new in v6: channel
**groups**, so songs with 18+ channels keep the same layout as 4-channel
songs. The stereo stage labels groups, now playing shows every channel as a
strip, and the event log merges repeated effects.

## What to build

A new default view, **Conductor**: a full-height playlist on the left and a
dashboard of live panels on the right, all driven by the song. It shrinks and
drops panels as the terminal gets smaller. The playlist and the now-playing
card never disappear. Keep the existing pattern view and `--simple` mode; add
Conductor as a view you switch to with `Tab`.

## Read in this order

1. `SPEC.md`: every panel: content, glyphs, colours, interactions.
2. `RESPONSIVE.md`: the layout algorithm and its exact thresholds, plus
   what shrinks before anything is removed. Port `computeLayout` exactly.
3. `DATA.md`: what comes from libopenmpt and what we compute ourselves
   (density, groups, key and chord detection).
4. `snapshots/4ch/` and `snapshots/18ch/`: the expected screens at 7
   terminal sizes, one per layout tier (T0…T6), for a 4-channel and an
   18-channel song. `.txt` is for diffing; `.ans` has 24-bit colour (`cat` it).
5. `reference/`: the JavaScript prototype that produced the snapshots. Use it
   as **a reference, not code to port line by line**.

## Reference code map

| file | contents |
|---|---|
| `reference/layoutcore.js` | `computeLayout(cols, rows, mapRows)`: tiers and box placement. Port verbatim. |
| `reference/panels.js` | `mapRows`, `pSongMap` (channel / group / summary modes), `pInstruments`, `pStage`, `pHarmony`, `pPulse`, `pLog` |
| `reference/playlist4.js` | the playlist: tabs, format groups, scrollbar, now-playing card with the channel strip |
| `reference/engine.js` | char-grid renderer, palette, chrome, `Engine.analyse` (density, channel groups, key) and a small XM playback model |
| `reference/harmony.js` | chord templates, `detectChord`, the 5-row block font |
| `tools/xm_export.py` | XM parser: patterns, instruments, sample waveforms, envelopes |

The prototype simulates playback because it runs in a browser. **In the real
app libopenmpt is the source of truth.** Don't port `Engine.step`,
`rowStart`, `envVal`; read the same facts from libopenmpt (DATA.md). Do port
the analysis in `Engine.analyse` (it runs once when a module loads) and the
log-merging rule in `rowStart`.

## Constraints

- Monospace character grid only: box drawing, block elements
  (`█▓▒░▀▄▁▂▃▄▅▆▇`) and ASCII. No emoji, no braille.
- Use the 24-bit colours from SPEC.md. Fall back to the nearest of the 256
  colours on terminals without truecolor.
- ~20 fps without stalling audio: take one snapshot of the playback state
  per frame (under the repo's existing lock), and never call libopenmpt from
  the render path while the audio thread is decoding.
- Layout depends only on cols × rows and the number of map rows.

## Milestones (each one checked against the 4ch **and** the 18ch snapshots)

1. **Layout skeleton**: port `computeLayout`; draw empty titled boxes. At the
   7 sizes, the tier ids and box corners must match both snapshot sets.
2. **Playlist + now playing**: tabs, format groups, fav/delete/undo,
   scrollbar, now-playing card. Show per-channel meters for ≤6 channels and
   the 2-line channel strip for more. Persist favourites, e.g. in
   `~/.config/cli-modplayer/favorites`.
3. **Song map**: groups from `Engine.analyse`, the three display modes,
   `g` to expand/collapse, playhead, jump to an order.
4. **Instruments**: full 3-line cards, then compact rows.
5. **Stereo stage** (group labels), **Pulse**, **Event log** (merged
   lines), **Harmony**.
6. **Polish**: header and key-hint truncation, mouse hit areas, channel mute
   via `openmpt::ext::interactive`.

A milestone is done when, at every snapshot size, its panels match the `.txt`
snapshots character for character. Live values (notes, meters, times, log
lines) are exempt.
