# Responsive layout (v6)

The layout is computed from **cols × rows** and the number of **map rows**
on every resize. `reference/layoutcore.js` is the source of truth. Port it
as one pure function that returns rectangles, and unit-test it.

`mapRows` comes from `mapRows(E, state)` in `reference/panels.js`:
- `nch` when the song has ≤8 channels or the user expanded the map, otherwise
- the number of channel groups (7 for an 18-channel Cydonian Sky).

## Algorithm

```
hh  = rows - 3                                   // header, transport, key hints
PLW = cols >= 110 ? 42 : cols >= 84 ? 34 : 30    // playlist width
mw  = cols - PLW                                 // main-area width
mapMinH  = 3 + mapRows                           // box + header + 1 line per row
mapFullH = min(21, 3 + mapRows * (mapRows<=4 ? 4 : mapRows<=8 ? 2 : 1))

tiers, tried in order; the first that fits wins:
  T0 full                 map inst stage harm pulse log
  T1 no event log         map inst stage harm pulse
  T2 no harmony           map inst stage pulse
  T3 no pulse             map inst stage
  T4 no stereo stage      map inst
  T5 no instruments       map              (here the map may drop to a 4-row summary)
  T6 playlist only        —                (playlist becomes full width)

minimums: map w30 · inst w40 h11 · stage w30 h10 · harm w44 · pulse w30 h11
          (w40 when the log sits beside it) · log w40

a tier fits when:
  mapNeed = (tier is T5) ? 4 : mapMinH
  mw >= 30 and hh >= mapNeed
  inst  ⇒ mw >= 40
  rightW = max(stage ? 30 + (harm ? 44 : 0) : 0,  pulse ? (log ? 40+40 : 30) : 0)
  R = mw - (inst ? 40 : 0) >= rightW
  bottomNeed = max(inst ? 11 : 0, (stage ? 10 : 0) + (pulse ? 11 : 0))
  hh - bottomNeed >= mapNeed
```

Handing out the space:
- **Song map:** `mapH = clamp(hh - bottomNeed, mapNeed, mapFullH)`, across
  the full main width. The box is only as tall as its rows need; every
  leftover row goes to the panels below. With no bottom panels (T5) it takes
  every row.
- **Bottom area** (`BH = hh - mapH`): Instruments get 40 columns on the
  left (the whole main width in T4). On the right:
  - **Pulse row** height = `clamp(round(BH × .45), 11, 15)` when Stage is
    also present, otherwise all of BH.
  - **Stage row** gets the rest. Harmony takes `max(44, round(R × .42))` of
    its width on the right.
  - The Event log takes `R - 40` beside a 40-wide Pulse.

## Thresholds (computed from the function)

Width (enough rows) is the same for every song:

| cols | tier | removed |
|---|---|---|
| ≥ 162 | T0 | nothing |
| 156–161 | T1 | Event log |
| 104–155 | T2 | Harmony |
| 70–103 | T4 | Stereo stage (+ Pulse) |
| 60–69 | T5 | Instruments |
| < 60 | T6 | Song map |

Height (at 180 cols) depends on the map rows:

| rows | 4 map rows (4-ch song) | 7 map rows (18 ch, grouped) |
|---|---|---|
| T0 (everything) | ≥ 31 | ≥ 34 |
| T3 (Pulse removed) | 21–30 | 24–33 |
| T5 (map only) | 16–20 | 16–23 |

T3 is only reached by height. Below its height threshold, Stereo stage and
Instruments drop together. If the user expands an 18-channel map (`g`),
`mapRows` = 18 and the height thresholds rise by another 11 rows. That's
expected: expanding trades the bottom panels for detail.

## Shrink before removing

| part | how it shrinks |
|---|---|
| Song map | channels → groups → 1 summary row; row height 6→1; cells 9→4 wide, then a window of orders around the current one with `‹ ›` |
| Instruments | 3-line cards → 1-line compact rows when h < 3 + 3 × numInstruments |
| Playlist | 42 → 34 → 30 wide; the now-playing meters or channel strip only at ≥32 rows; the list shrinks, then hides under 3 lines; the now-playing card never goes |
| Stereo stage | 2-col → 1-col bars and group labels above 8 channels |
| Harmony | pitch-class bars hidden under 15 rows |
| Pulse | drum row hidden when it would touch the border |
| Header | bpm/order details hidden under 150 cols; song info truncated |
| Key hints | pairs dropped from the right so the tier label fits |

## Test

For the 7 sizes (180×54, 160×48, 140×44, 120×30, 96×32, 64×22, 44×18),
run `computeLayout` with `mapRows` = 4 and with 7. Check that the tier id
matches the snapshot file name in `snapshots/4ch/` and `snapshots/18ch/`,
and that every box corner sits where the `┌`/`┘` characters are in the
`.txt` file.
