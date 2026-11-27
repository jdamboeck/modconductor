# Data sources

Check every libopenmpt call below against the version the repo builds with.
The names are from the libopenmpt C++ API (`openmpt::module`,
`openmpt::module_ext`).

## Live state: read once per frame from libopenmpt

| needed by | value | libopenmpt |
|---|---|---|
| header, pulse, map playhead | order, pattern, row | `get_current_order()`, `get_current_pattern()`, `get_current_row()` |
| header, pulse | speed (ticks/row), tempo | `get_current_speed()`, `get_current_tempo()` |
| transport | elapsed / total | `get_position_seconds()`, `get_duration_seconds()` |
| channel level (stage, meters, glow) | 0..1 | `get_current_channel_vu_mono(ch)` |
| stereo stage x-position | pan | `vu_right / (vu_left + vu_right)` from `get_current_channel_vu_left/right(ch)` (only meaningful while the channel sounds; hold the last value) |
| seeking | jump to an order | `set_position_order_row(order, 0)` |
| mute (m key / click) | per channel | `module_ext` → `interactive` → `set_channel_mute_status` |
| pulse tick row | current tick | not exposed; estimate it from the time since the row last changed ÷ (2.5/tempo) |

**Note-on detection** (instrument flashes, the event log, chord input): when
the row changes, read the new row's cells with
`get_pattern_row_channel_command(pattern, row, ch, command_note /
command_instrument / command_effect / command_parameter / command_volumeeffect /
command_volume)`. A note in 1..120 is a note-on. Use
`format_pattern_row_channel_command(..., command_effect)` (plus the parameter)
for the event-log code, so it shows the module's own effect letters.

## Static, per module: compute once on load

| needed by | value | how |
|---|---|---|
| song map | note-ons per (order, channel, slice of 4 rows) | walk every order → pattern → row → channel with `get_pattern_row_channel_command` |
| song map colour, channel colour | instrument used most per (order, channel), and per channel (`chIns`) | same walk; carry the last instrument number per channel when a cell has a note but no instrument |
| song map rows, stage labels | **channel groups** | runs of neighbouring channels with the same `chIns` (`Engine.analyse` in reference/engine.js). Each group has from, to, instrument and a label (`5-12`, or `04` for a single channel). Its map density is the sum over its channels. |
| instruments: channels, hits | channels each instrument plays on, note count | same walk |
| harmony label | key of the song | Krumhansl–Schmuckler: a pitch-class histogram weighted by note length (rows until the next note on that channel, capped at 32), correlated against the major/minor profiles in `reference/engine.js` (`Engine.prototype.analyse`) |
| playlist | title, artist, format, channels, length | `get_metadata("title" / "artist" / "type")`, `get_num_channels()`, `get_duration_seconds()` |
| instruments | names | `get_instrument_names()`, falling back to `get_sample_names()` |

Event-log merging: when the row changes, build one log entry per distinct
(effect code, description) across channels and collect the channels it
fired on (see SPEC.md, Event log).

Pattern breaks (`Dxx`) and jumps (`Bxx`) change which rows actually play.
The reference walks the order list and stops a pattern at a break
(`Engine.prototype.buildTimeline`).

## Not available from libopenmpt

**Sample waveforms and volume envelopes** (the instrument sparklines) aren't
exposed. Options, in order of preference:

1. **Parse the file yourself for XM** (`tools/xm_export.py` shows the format:
   instrument header → envelope points at offset +129, the number of points at
   +225, flags at +233; then 8- or 16-bit delta-coded sample data).
   Downsample to 64 points. MOD/S3M/IT need their own small parsers, or skip
   to option 2.
2. **Fallback:** hide the waveform and envelope lines. Instruments then
   always use compact mode, with a meter based on VU levels.

Per-channel volume, envelope position and the exact pan aren't exposed
either. The design only needs *level* and *pan*, and the VU calls above give
both.

## Chord detection (harmony panel)

From the channels sounding this frame (VU > 0.05, excluding one-shot drum
instruments): add each channel's level to the pitch class of its current
note. For every root 0..11 × template (`''` maj, `m`, `7`, `m7`, `M7`,
`sus4`, `sus2`, `dim`, `5`), score each chord tone present as `1 + weight`
and each one missing as `−0.9`. Subtract `1.2 × weight` for every
non-chord tone and `0.05 ×` the size of the template. Add `+0.6` when the
root is the lowest sounding note. The highest score wins
(`reference/harmony.js` → `detectChord`).

## Drum instruments

The reference treats an instrument as a drum when its sample doesn't loop.
That works for XM. For other formats, use the sample loop flag, or treat
instruments whose name matches `/kick|bd|snare|sd|hat|hh|clap|perc/i` as
drums.
