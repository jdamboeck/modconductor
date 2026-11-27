# Conductor view: panel spec

Every size is in terminal cells. Row 0 is the header, the bottom two rows are
the transport bar and the key hints, and the space between them belongs to the
layout (see RESPONSIVE.md). All panels are boxed with `┌─┐│└┘` in `line`
colour. The title is in `acc`, placed at x+2 as ` Title `. An optional
right-aligned label in `dim` sits on the top border.

## Palette

| token | hex | use |
|---|---|---|
| bg | `#0B0C12` | background |
| fg | `#D6D8E4` | normal text |
| hi | `#F4F5FA` | emphasis, playhead, current item |
| dim | `#8A8FA6` | secondary text (4.5:1 on bg) |
| faint | `#3A3F58` | decoration only, never text people must read |
| line | `#2A2E42` | box borders, empty bar cells |
| acc | `#7FD6C2` | titles, progress, selection, active beat |
| sel | `#1B1F2E` | selected-row and current-column background |
| head | `#12141D` | header strip background |
| fav | `#E9C65C` | a set favourite `*` |

**Instrument colours** (cycle by `(n-1) % 8`):
`#7FD6C2 #EE8A72 #B49CF0 #67C6EE #E9C65C #9FD27A #F07A9A #F0A85C`.
A channel takes the colour of the instrument it plays most (`chIns`). Live
brightness is drawn as `mix(bg, colour, 0.25 + 0.75 × level)`.

## Chrome

- **Header (row 0, `head` bg):** ` cli-mod ` (inverted, acc). Then the title
  in `hi`. Then `· artist · tracker · fmt · N ch · N ins · N pat` in dim,
  truncated. Right side: `ord 07/16  pat 00  row 24  spd 10  bpm 125`, shown
  only at ≥150 cols, then a play/pause button `[ || ]` / `[ >  ]` (click
  toggles).
- **Transport (row H-2):** elapsed time, a seek bar (`━` played in acc, `─`
  remaining in faint), order boundaries as `╵` (the current one is `┃`), the
  playhead `█` in hi, and the total time. Clicking an order's span jumps to
  it.
- **Key hints (row H-1):** pairs of key (acc) and action (dim). Pairs that
  don't fit are dropped from the right. The tier label sits right-aligned.

## Playlist (left, full height, never removed)

Width 42 / 34 / 30 (see RESPONSIVE.md). Layout, top to bottom:

1. **Tabs:** ` all 18 ` and ` * favs 3 `. The active tab is inverted (bg on
   acc). `/ search` hint on the right when the playlist is ≥38 wide.
2. A divider `─`.
3. **List:** entries grouped by format in the order XM, MOD, S3M, IT. Each
   group has a header line `XM ·2` in faint. Each entry is 2 lines:
   - line 1: `>` (playing; `=` when paused), the title (`hi` if playing,
     truncated with `…`), `*` at w-8 (fav colour if set, faint if not), `x`
     at w-6.
   - line 2: artist in dim; length right-aligned at w-5 (`··:··` when
     unknown).
   - The selected entry gets a `sel` background on both lines.
4. **Scrollbar** in column w-2: `▲` at the top, `▼` at the bottom, a `│`
   track, and an acc `█` thumb. Thumb size = visible ÷ total. Arrows scroll
   2 lines; clicking the track above or below the thumb pages. Keep the
   selection in view when moving with `↑/↓`.
5. **Now playing card:** divider, `NOW PLAYING` (faint), title (hi), then
   `artist · fmt · N ch · bpm` (dim), a progress line, and
   `elapsed / total` + `ord 07/16`. Then, only when the playlist is ≥32 rows
   tall:
   - ≤6 channels: one meter row each, `ch01 ████░░░ A-2`.
   - more channels: a **channel strip**. Each channel is one column 1–3
     cells wide (as many as fit), drawn as a 2-line bar with 16 levels using
     `▁…█`. Under it are channel numbers at 1, every 5th, and the last one.
6. Footer: when an undo is pending, `removed 1 · [u]ndo`; otherwise
   `f fav · d delete · ↑↓ move`.

Behaviour: `f` toggles the favourite on the selection. `d` removes it from the
playlist (not from disk) and pushes it on an undo stack; `u` restores it at
its old position. With the favs tab active, the list only shows favourites.

## Song map

A grid of **orders (columns) × map rows**. A map row is a single channel, a
**group** of channels, or a one-line summary. See "Map rows" below.

- Header row: `07·p00` (order · pattern in hex) when a cell is ≥7 wide,
  otherwise `07`. The current order is `hi` on `sel`.
- Cell width = `min(9, (w - 10) / numOrders)`. If that comes out under 4,
  use 4 and show only the orders around the current one, with `‹ ›` at the
  edges.
- Row height = `clamp((h - 3) / numMapRows, 1, 6)`.
- Labels are 6 columns wide: `ch01` for a channel, the range (`5-12`) for a
  group, with `8ch` on the line below when the row is ≥2 lines tall, and
  `all` for the summary row.
- Each cell column is one **slice of 4 pattern rows** (16 slices per 64-row
  pattern). Value = note-ons in that slice, summed over the row's channels,
  ÷ the maximum of *that map row* across the song. Each row is scaled on its
  own, so a quiet group still shows its shape.
  - row height 1: shades `· ░ ▒ ▓ █`
  - row height >1: a bar of `▁▂▃▄▅▆▇█` growing from the bottom, height =
    value × (rowH − 0.5) × 8 eighths; empty slices show `·` on the bottom
    line.
- Colour: a channel row uses the instrument it plays most in that order. A
  group uses the group's instrument. The summary row uses `acc`. Brightness:
  0.7 past, 0.88 upcoming, 1.0 for the current order, which also gets a `sel`
  background. The slice playing right now gets `mix(bg, hi, .25)`.
- Playhead `▲` on the bottom border.
- With >8 channels, the title shows `[g] expand` / `[g] group`. Pressing `g`
  or clicking it toggles between groups and single channels.
- The box is only as tall as its rows need. Spare height goes to the panels
  below.

### Map rows

- **Groups:** runs of *neighbouring* channels whose most-used instrument is
  the same (`chIns`). Cydonian Sky's 18 channels become 7 rows: `1-3 · 04 ·
  5-12 · 13-14 · 15-16 · 17 · 18`.
- Mode choice: single channels when nch ≤ 8 or the user expanded. Otherwise
  groups. If the chosen rows don't fit (`h - 3 < rows`), fall back from
  channels to groups to one summary row (`all`).

## Instruments

- **Full mode** (box height ≥ 3 + 3 × numInstruments): three lines each:
  1. `01` (inverted in the instrument colour while it sounds), name (or
     sample name, or `(unnamed)` in dim), a live meter of `█░` at the right
     edge.
  2. Waveform sparkline: 14 chars, `▁…█` mapped from the sample (signed
     −1..1 → 0..1 for looped samples, peaks for one-shots), then `loop` or
     `1-shot`, then `N smp` right-aligned.
  3. Volume-envelope sparkline (8 chars, `─────` when there is none), then
     the channels it plays on (`ch 1-3,13`), or `not used`, then hits `1237×`
     right-aligned.
  - A short tinted background flash on each note-on.
- **Compact mode:** one line: number, 6-char waveform, name, 6-char meter.
- Footer when there is room: `wave · env · channels · hits` and the total
  sample size, e.g. `5.6 KB`.

## Stereo stage

A horizontal axis `L ───┼─── R`. Each channel is a bar at x = pan/255 along
the axis, height = level × available rows, with `▄` on top. Bars are 2
columns wide for ≤8 channels and 1 column for more.

Labels under the axis: single channel numbers for ≤8 channels. With more,
one label per **group** (`5-12`), centred on the group's average pan. Labels
take up to 3 lines and move down a line rather than touching (a gap of 1 or
more). For >8 channels the axis sits one line higher to make room.

## Harmony

- The current chord in a 5-row block font (`reference/harmony.js`, e.g.
  `Am`, `C#7`, `Gsus4`). Below it, `minor triad · A C E` in dim.
- If the box is ≥15 tall: 12 pitch-class bars (`C … B`), 3 rows tall. Chord
  tones in acc, others in dim.
- The top-right border label shows the key estimated over the whole song
  (`A minor`).

## Pulse

`bar 3/4  beat 2/4  row 24`, then four 3-row beat blocks (the active one
`█` in acc, the others `░` in line), then `tick █░░░░░░░░░` (one cell per
tick of the current speed), then one `05 ██` / `05 ··` per drum instrument.
Assumes 4 rows per beat and 16 per bar. Make that configurable if the repo
has a rows-per-beat setting.

## Event log

Newest first: `1:11.8  ch04   A00  vol slide down 6`. Log an effect when
its code changes for that channel, or when it comes with a new note. **Merge**
an effect with the same code and description that fires on another channel
in the *same row* into the existing line: `05–08  800  pan L 100%  ×4`. A
contiguous range shows as `05–08`; scattered channels as `ch×3`. The top line
is in `hi` and older lines fade toward bg. Keep the last 24.

## Interactions summary

| input | action |
|---|---|
| Space / click `[ || ]` | play / pause |
| ← / → or click a song-map column / seek segment | previous / next order, or jump |
| ↑ / ↓ | move the playlist selection |
| Enter | play the selection |
| f / d / u | fav / remove / undo |
| Tab | cycle views: Conductor → Pattern (existing) → … |
| m | mute the selected channel (libopenmpt ext interactive) |
| g | song map: group ↔ expand channels (>8 channels) |
| mouse wheel over the playlist | scroll |
| q | quit |
