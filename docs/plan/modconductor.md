# modconductor — implementation plan

## Context
`docs/design/` holds the v6 handoff for "Conductor": a full-height playlist plus a live
dashboard (song map, instruments, stereo stage, harmony, pulse, event log) on an exact
character grid with 7 responsive tiers and golden snapshots (4ch/18ch × 7 sizes).
The current app (`cli-modplayer`: FTXUI DOM UI, one song per run, file browser, --simple)
can't meet that spec and has no mouse support.

Outcome: a single new binary **`modconductor`**. Conductor is its only interface. All
legacy UIs (pattern view, --simple, file browser) are deleted. It adds a recursive playlist,
full mouse support, per-song + per-channel-group effect chains with replaceable effect
implementations, and background export. The project is renamed throughout.

## Decisions (agreed interactively)
| topic | decision |
|---|---|
| Binary / identity | Only `modconductor`. CMake project, header brand ` modconductor `, config dir `~/.config/modconductor/`, README, CI artifact all renamed. No migration from the old config. |
| Legacy | Delete `ui.*`, `simple_ui.*`, `file_browser*`, `note_formatter*` (+ its test). No code reuse from the old UI. Audio code (effects DSP, WAV/FLAC/MP3 writers) is reused after refactoring. |
| Backend | FTXUI **v6.1.x** (exact tag pinned) as I/O only: ScreenInteractive for raw mode, resize, keys, mouse, truecolor→256 fallback. We draw into our own `CellGrid`; one custom `ftxui::Node` copies it to the screen. |
| Playlist | Files/dirs from args, else cwd. Recursive by default; `--no-recursive` turns that off. Metadata is loaded **before** the UI starts: parallel on all cores, a progress line on stderr, Ctrl+C cancels, unreadable files are skipped and counted. In-memory only. |
| Song end | Next song, wrap around. The `r` key toggles loop-song (key only, not saved). |
| Navigation | Panel focus: Tab/Shift+Tab/click cycle Playlist ↔ Song map; the focused border is drawn in `acc`. Playlist: ↑↓ entry, ←→ format group, Enter play. Map: ↑↓ channel/group, ←→ order, Enter jump. Global: Shift+↑↓ volume, Shift+←→ seek ±5 s, Space, `/`, `r`, `q`. |
| Mute | Selected map row (a channel, or a whole group in group mode): `m` mute, `s` solo. |
| Search | Live, case-insensitive substring match on title/artist/filename; a space means AND. Enter keeps the filter, Esc clears it, the match count shows in the tab. I design the input. |
| Key hints | Global keys plus the focused panel's keys, dropped from the right. The tier label stays. Golden tests mask this row. |
| Pan | `interactive2::get_channel_panning` (range −1…1 → x = (p+1)/2). |
| Sparklines | **libxmp** (required, MIT), read once per song at load: sample data, loop flags, `aei` envelopes for all formats. Playback stays libopenmpt. |
| Effects | Per song **and** per channel group. An `Effect` interface plus a compile-time registry; a replacement registers under the same id and config picks the implementation. The interface is designed so a C-ABI `.so` wrapper can be added later. |
| Export | Dialog, rendered in the background on separate libopenmpt instances; playback continues. Scope: current / selected / favourites. |
| Designer briefs | The **effects editor** and **export dialog** go to the designer through `docs/design/requests/`. Both are built last, from the designer's reply. |
| Order | UI first (handoff M1–M6), then audio: effects (master → stems), export, then the editor. |
| Repo | New public repo `jdamboeck/modconductor` as `origin`; Master290's repo becomes `upstream`. MIT licence kept, with attribution. |
| Tracking | GitHub milestones M0–M10 and detailed issues; one PR per issue (`Closes #n`); you merge. |
| Execution | One workflow per stage (dependency layer), parallel agents in worktrees, adversarial review before each PR; checkpoint with you between stages. |

## Repo layout after M0
```
CMakeLists.txt            project(modconductor); FTXUI v6 FetchContent; pkg-config: libopenmpt, portaudio-2.0, libxmp (REQUIRED); flac/lame optional
CLAUDE.md                 agent rules, build/test, architecture rules, PR flow (exists; 0.1 updates paths)
src/main.cpp              args → Library scan → Session → ConductorApp::run
src/core/                 lib modconductor_core (no FTXUI)
  player.{hpp,cpp}        audio thread, AudioGraph, snapshots
  loaded_song.{hpp,cpp}   off-thread load: module_ext + SongInfo + InstrumentArt
  song_info.{hpp,cpp}     pattern copy, timeline, analysis (port of Engine.analyse)
  xmp_art.{hpp,cpp}       libxmp extraction → waveforms/envelopes per instrument
  effect_text.{hpp,cpp}   effect code + description per format family
  library.{hpp,cpp}       scanner (thread pool), Track records, format groups
  session.{hpp,cpp}       playlist order, play mode, favourites, next/prev/wrap/loop
  settings.{hpp,cpp}      ~/.config/modconductor/{config,favorites,effects}
src/audio/                lib modconductor_audio (effects M7+, export M9)
src/ui/                   lib modconductor_ui (FTXUI)
  cell_grid, palette, grid_node, layout, text_input, frame_model, live_tracker,
  harmony, event_log, input (keys/mouse/focus), app (ConductorApp)
  panels/{chrome,playlist,song_map,instruments,stage,harmony,pulse,log}.cpp
tests/                    layout, analysis, live_tracker/log, harmony, search, golden
docs/design/requests/     01-effects-editor.md, 02-export-dialog.md
```

## Core

### Player (rewrite of `src/player.cpp`)
- `openmpt::module_ext`; get `interactive` (mute) and `interactive2` (pan).
- **Song loading off the UI thread:** `LoadedSong::open(path)` builds the module plus
  `SongInfo` plus `InstrumentArt` on a worker thread. `Player::swap(std::unique_ptr<LoadedSong>)`
  replaces it under the graph lock in microseconds. The PortAudio stream stays open (one
  `Pa_Initialize` per process).
- **Audio thread:** read → master volume → (later) the AudioGraph → `Pa_WriteStream`. After each
  buffer it pushes a `Frame` into a lock-protected ring (about 64 entries):
  `{order, pattern, row, speed, tempo (get_current_tempo2 if available), pos_s,
  row_start_pos_s, vu_mono[ch], vu_l/r[ch], pan[ch], heard_at}`, where
  `heard_at = steady_now + Pa_GetStreamInfo()->outputLatency`.
- **`snapshot(now)`** returns the newest Frame with `heard_at ≤ now` (visuals match what you
  hear), plus every distinct (order,row) passed since the last call, so no rows are lost
  even when a row is shorter than 50 ms. It also returns flags: paused, finished,
  song_generation, mute[ch], loop.
- The render path never calls libopenmpt. `SongInfo` is `shared_ptr<const>`, swapped on load.
- API: `toggle_pause, seek_order(o), seek_seconds(Δ), set_volume, set_loop(bool)`
  (`set_repeat_count(-1/0)`), `set_mute(ch,bool)`, `solo(chs)`, `song() → shared_ptr<const SongInfo>`.
- Removed: FFT/spectrum, waveform buffers, preview rows, string formatting per buffer.

### SongInfo (built once per song; mirrors `Engine` in reference/engine.js)
1. **Pattern copy:** for every pattern/row/channel, `{note, ins, volcmd, vol, fx, param}` from
   `get_pattern_row_channel_command`, plus a 3-character effect code from
   `format_pattern_row_channel_command(command_effect/command_parameter)`.
2. **Timeline** (port of `buildTimeline`): walk the orders, skipping `is_order_skip_entry` and
   stopping at `is_order_stop_entry`. Pattern break (MOD/XM `D`, S3M/IT `C`) ends the pattern and
   sets the next start row. Speed/tempo (MOD/XM `F`, S3M/IT `A`/`T`) is tracked to estimate row
   time. Order start seconds come from `get_time_at_position(o,0)` when
   `OPENMPT_API_VERSION_AT_LEAST(0,8,0)`, else the estimate (Ubuntu 24.04 CI ships 0.7.x).
3. **Notes** (port of `buildNotes`): a note-on is a note in 1..120 while the channel has an
   instrument, carrying the last instrument per channel. Length runs until the next note,
   note-off or cut, capped at 32 rows for pitched notes. Drum = the instrument's first sample
   does not loop (from libxmp), or the name matches `/kick|bd|snare|sd|hat|hh|clap|perc/i`.
4. **Analysis** (port of `analyse`): `fine[o][ch][16]`, `domIns[o][ch]`, `chIns[ch]`, groups
   (runs of neighbouring channels with the same `chIns`, labels `5-12`/`04`), per-instrument
   `hits` and `chans`, the drum list, and the Krumhansl–Schmuckler key from the pitch-class
   histogram weighted by note length (profiles copied from engine.js).
5. Static header data: title, artist, tracker, type, nch, nins, npat, norders, duration, and
   instrument names with the sample-name fallback.

### InstrumentArt (libxmp, `xmp_art.cpp`)
- `xmp_create_context` → `xmp_load_module_from_memory` (bytes already read) →
  `xmp_get_module_info` → `xmp_release_module`.
- Per instrument: sample = `sub[0].sid` (XM/IT key-map instruments) or the instrument itself
  (MOD/S3M). Waveform: 64 points; looped samples use the signed loop region → (v+1)/2,
  one-shots use per-segment peaks (like the reference's `wave`/`peaks`). Also loop flag,
  frames, bits (8/16 → the "8 · 8-bit" label, "mixed" when both occur), and bytes for the
  footer KB.
- Envelope: `aei.data` pairs (tick, value 0..64) when `XMP_ENVELOPE_ON`, used to evaluate
  8 points across the envelope's length. Otherwise `────────`.
- If instrument counts differ between libxmp and libopenmpt, the art is matched by index;
  missing entries fall back to compact rows.

### Effect text (`effect_text.cpp`)
- Format family from `get_metadata("type")`: MOD/XM (hex digit commands) or S3M/IT/MPTM
  (letter commands).
- Description table per family, matching the reference `FXNAME` wording: porta up/down N,
  vol slide up/down N, pan L/C/R %, set vol N, pattern break, speed/tempo, global vol slide,
  `fx X` as the fallback.

### Library / Session / Settings
- Scanner: extensions from `openmpt::get_supported_extensions()`, recursion optional, files
  checked with `probe_file_header`. A thread pool of `hardware_concurrency()` loads each file
  with `openmpt::module` and records title (filename if empty), artist, type, nch, duration.
  stderr shows `scanning 812/1840 · <path>`. SIGINT stops the scan; then the UI starts with
  what was found, or exits if nothing was found.
- Format groups in order XM, MOD, S3M, IT, then other types alphabetically.
- Session: the visible list (all/favs tab plus the search filter), the playing index, play mode
  (next-wrap | loop-song), next/prev, deleted items with an undo stack (playlist only, never the
  disk), and `tick()`, which advances on `finished`.
- Favourites: `~/.config/modconductor/favorites`, one absolute path per line, XDG-aware.
  Config: volume, and later the selected effect implementations.

## Conductor UI

### Rendering
- `CellGrid {w,h, cells: {char32_t ch; Rgb fg, bg}}` with `set/text(maxw, …)/rtext/fill/bgfill/box(title,right)`,
  the same semantics as the reference `Grid`, including clipping and `…` truncation.
  `toString()` produces golden text.
- `palette.hpp`: the SPEC tokens plus `key #C9CCDA` and `blk #232636` from engine.js;
  `ICOL[0]=dim` and instrument n → `ICOL[(n-1)%8+1]`; `mix(a,b,t)` with t rounded to 1/20
  (as in the reference); `fade(c,lev)`.
- `GridNode : ftxui::Node`: in `Render(Screen&)` it reads `box_`, calls the frame callback
  `draw(w,h) → const CellGrid&`, and writes `PixelAt(x,y)` character/foreground/background.
  FTXUI's color handling does the 256-colour fallback.
- `layout.cpp`: a verbatim port of `computeLayout`, returning `{tier, playlist, boxes{map,inst,stage,harm,pulse,log}}`.

### Frame model and live tracking
- `LiveTracker` consumes the rows passed since the last frame, reading cells from `SongInfo`:
  - current note and instrument per channel, used for meters, chords and the stage colour;
  - note-on flashes per instrument;
  - the event log with the merge rule from `rowStart`: log when a channel's code changes or a
    note comes with it; merge entries with the same code and description at the same time;
    keep 24 entries.
- Levels: `vu_mono` with instant attack and about 150 ms release.
- Tick: `(pos − row_start_pos) / (2.5 / tempo)`, clamped below speed.
- `FrameModel` = snapshot + SongInfo + LiveTracker + Session view + UI state (focus,
  selections, map expand, search text, hover), handed read-only to the panels.

### Panels (each `draw(grid, rect, model)` + `hitTest(rect, x, y) → Action`)
| panel | key points (SPEC.md plus the reference) |
|---|---|
| chrome | Header: ` modconductor ` brand; title, then `· artist · tracker · fmt · N ch · N ins · N pat` truncated to `W − x − (W≥150 ? 76 : 12)`; right side `ord/pat/row/spd/bpm` when W≥150; `[ || ]`/`[ >  ]`; loop marker `↻1` next to it. Transport: order ticks `╵`/`┃`, `━`/`─`, `█`, click a segment to jump, drag to seek. Hints follow focus. |
| playlist | Tabs, `/ search` hint (w≥38), format-group headers, 2-line entries, `*`/`x` hit areas, scrollbar (arrows ±2, track pages, thumb drag), now-playing card, meters (≤6 ch) or a 2-line strip when h≥32, undo footer. While searching, the input replaces the tabs line. |
| song_map | channels / groups / summary fallback; `[g]` label; cell width, `‹ ›` window, row height, `·░▒▓█` or 8ths bars, colours past .7 / upcoming .88 / current 1.0 + sel, current slice `mix(bg,hi,.25)`, `▲` playhead; selected row label inverted; muted rows faint with `M`, soloed rows `S`. |
| instruments | full cards (box h ≥ 3+3n) → compact rows; flash background; footer `wave · env · channels · hits  N KB`. |
| stage | axis, 2-col / 1-col bars, group labels on 3 lines that avoid each other, axis raised for >8 ch. |
| harmony | `detectChord` on live channels (lev>0.05, not drums), 5-row font, quality line, PC bars when h≥15, key label. |
| pulse | bar/beat/row line, 4 beat blocks, tick bar, drum row when it fits. |
| log | newest first, `ch04` / `05–08` / `ch×3`, fade by age. |

### Input
- Focus: `Playlist | SongMap`. Tab/Shift+Tab, or a click inside a box, sets it.
- Keys: the table under Decisions, plus `f d u` (playlist), `g m s` (map), `Esc` (clear search /
  close overlay). Shift+arrows matched on FTXUI v6 events or the raw CSI `\x1b[1;2A..D`, checked in M1.
- Mouse: one hit list per frame from the panels. Left click = action; double-click (<350 ms,
  same cell) on a playlist entry = play; wheel over playlist/map = scroll/order; drag on the
  seek bar and the scrollbar thumb; hover only redraws when the hovered element changes.
- `TextInput` (search now, export filename later): UTF-8 line editing, ←→, Backspace, Ctrl+U.

## Audio (after UI milestones)

### Effects
```cpp
struct ParamSpec { std::string id, label, unit; float min, max, def; };
struct EffectInfo { std::string id, impl, name; std::vector<ParamSpec> params; };
class Effect {               // plain floats only → a C-ABI wrapper is possible later
 public: virtual ~Effect();
  virtual const EffectInfo& info() const = 0;
  virtual void prepare(int sample_rate, int max_frames) = 0;
  virtual void reset() = 0;
  virtual void set_param(int idx, float v) = 0;   // called from the UI thread via atomics
  virtual void process(float* interleaved_lr, std::size_t frames) = 0;
};
class EffectRegistry { add(id, impl, factory); create(id) → impl chosen by settings "effect.<id>=<impl>" };
```
- Built-ins ported from `src/audio_effects.cpp` into `src/audio/effects/{bass_boost,echo,reverb,flanger,phaser,chorus}.cpp`,
  registered as impl `builtin`.
- `EffectChain`: an ordered list with a bypass flag per effect. Swapped to the audio thread
  as `shared_ptr<const ChainSpec>` (RCU style); retired chains are freed on the UI thread.
  Parameters are `std::atomic<float>`.
- **AudioGraph:** `master_module` + a stem module per channel group that has a chain (the same
  file bytes, all channels muted except the group). The master mutes the channels a stem owns.
  `out = MasterChain(master + Σ GroupChain_g(stem_g))`. All instances read the same frame
  count every buffer. Seek, pause and mute go to every instance. A new stem starts at
  `set_position_seconds(master_pos)`. VU/pan for a channel come from whichever instance owns it.
  Stems are created and destroyed off the audio thread, then swapped in.
- Persistence: `~/.config/modconductor/effects`, keyed by file path; group targets stored as
  channel ranges.

### Export
- `ExportJob` thread: builds its own AudioGraph from the file bytes and the song's chain spec
  (or a dry graph if "apply effects" is off), renders to the end, and streams through a
  `Writer` interface (WAV / FLAC / MP3 — writers refactored from `audio_exporter.cpp` to
  stream instead of buffering everything).
- Progress and cancel go through atomics shown in the UI; jobs run one after another for
  selected/favourite scope.
- The UI comes from designer brief 02. Until then a CLI is enough for testing:
  `modconductor --export out.flac song.xm`.

## Designer briefs (written in M0, implemented last)
`docs/design/requests/01-effects-editor.md` and `02-export-dialog.md`. Each covers:
- Context: the v6 handoff, the agreed keys/focus model, palette, constraints (char grid,
  mouse, 7 tiers, 4ch/18ch).
- Requirements:
  - 01: targets are master (per song) and per group (focused map row); chain add/remove/
    reorder/bypass; parameter sliders from `ParamSpec`; badges on map rows and the now-playing card.
  - 02: format (depends on build), filename input, apply-effects, scope (current/selected/
    favourites), progress and cancel, error state.
- **Expected reply:** a SPEC.md section in the same style (layout, glyphs, colours,
  interactions, keys, hit areas); RESPONSIVE impact (overlay sizing per tier, minimums); `.txt`
  and `.ans` snapshots at the 7 sizes for 4ch and 18ch, in open and interaction states;
  reference JS (`panels.js` style, same `Grid` API); a list of new palette tokens if any.

## Milestones and issues
GitHub milestones M0–M10, one issue per row. The **Stage** column is the dependency layer
the workflows run in parallel. Issues in the same stage touch separate files by design:
1.3 creates stub files and CMake entries for every panel, so the stage C agents only edit
their own files.

| key | milestone | issue | stage | blocked by |
|---|---|---|---|---|
| 0.1 | M0 Restructure | Rename to modconductor; new CMake layout (core/ui/audio libs); FTXUI v6 pin; delete the legacy UIs/browser/note_formatter; CI + `libxmp-dev`; README; update root CLAUDE.md build/layout section; LICENSE attribution | A1 | — |
| 0.2 | M0 | Player rewrite: module_ext, LoadedSong off-thread load + swap, Frame ring, latency-aware snapshot, mute/solo/pan/loop/seek API | A2 | 0.1 |
| 0.3 | M0 | Library scanner (parallel, progress, SIGINT, `--no-recursive`), Session (modes, next/prev/wrap, undo), Settings + favourites | A2 | 0.1 |
| 0.4 | M0 | SongInfo: pattern copy, timeline, notes, analysis, key; effect_text; `analysis_tests` | A2 | 0.1 |
| 0.5 | M0 | InstrumentArt via libxmp (waveforms, envelopes, loop, bits, bytes) + tests | A2 | 0.1 |
| 0.6 | M0 | Designer brief 01: effects editor | A2 | 0.1 |
| 0.7 | M0 | Designer brief 02: export dialog | A2 | 0.1 |
| 0.8 | M0 | main.cpp wiring + temporary minimal app (plays, Space/n/q, auto-advance) | A3 | 0.2, 0.3 |
| 1.1 | M1 Skeleton | CellGrid, palette (+mix/fade), GridNode, `toString` | B1 | 0.8 |
| 1.2 | M1 | `computeLayout` port + `layout_tests` against both snapshot sets | B1 | 0.1 |
| 1.3 | M1 | ConductorApp frame loop, FrameModel, focus, keys, mouse dispatch, hit lists, chrome (header/transport/hints), panel interface + stubs for every panel, Shift-arrow check | B2 | 1.1, 1.2 |
| 1.4 | M1 | LiveTracker: rows since last frame, current note/instrument, flashes, level smoothing, tick estimate, event-log merge + `log_tests` | B2 | 0.2, 0.4 |
| 1.5 | M1 | Golden test harness: fixed-state render at 7 sizes × 4ch/18ch, masks, `MODCONDUCTOR_TEST_SONG`, 4ch channel-pick hook | B2 | 1.1, 1.2, 0.4 |
| 2.1 | M2 Playlist | Playlist panel: tabs, format groups, entries, scrollbar, fav/delete/undo, mouse, double-click play | C | 1.3 |
| 2.2 | M2 | Now-playing card: meters (≤6 ch) / 2-line channel strip | C | 1.3, 1.4 |
| 2.3 | M2 | TextInput + live search filter + `search_tests` | C | 1.3 |
| 3.1 | M3 Song map | Song map panel: three modes, `g`, playhead, order jump, row selection, mute/solo + markers | C | 1.3, 1.4 |
| 4.1 | M4 Instruments | Instruments panel: full cards, compact rows, flashes, footer | C | 1.3, 1.4, 0.5 |
| 5.1 | M5 Live panels | Stereo stage panel | C | 1.3, 1.4 |
| 5.2 | M5 | Pulse panel | C | 1.3, 1.4 |
| 5.3 | M5 | Event log panel | C | 1.3, 1.4 |
| 5.4 | M5 | Harmony: detectChord, block font, PC bars, key label + `harmony_tests` | C | 1.3, 1.4 |
| 6.1 | M6 Polish | Header/hint truncation, 256-colour check, DEVIATIONS.md | D | all C |
| 6.2 | M6 | Full golden pass at all sizes; fix mismatches | D | all C, 1.5 |
| 7.1 | M7 Effects | Effect API + registry + ported built-ins + tests | E1 | 0.8 |
| 9.1 | M9 Export | Streaming writers (WAV/FLAC/MP3), ExportJob, `--export` CLI | E1 | 0.8 |
| 7.2 | M7 | Master chain per song, persistence, temporary `e` presets | E2 | 7.1, 6.x |
| 8.1 | M8 Stems | AudioGraph with stem instances, VU/pan ownership, mute routing | E2 | 7.1 |
| 8.2 | M8 | Per-group chains + persistence + CPU check | E3 | 8.1, 7.2 |
| 9.2 | M9 | Export dialog (from the designer's reply to brief 02) | F | 9.1, reply 02 |
| 10.1 | M10 Editor | Effects editor (from the designer's reply to brief 01) | F | 8.2, reply 01 |

Each issue body has: Context (links to plan + SPEC/RESPONSIVE/DATA sections and reference
functions), Scope, Files, Implementation notes, Acceptance criteria (checklist, including
snapshot criteria), Tests, Blocked by (#refs), Out of scope. Labels: `area:{core,ui,audio,build,design}`,
`type:{feature,refactor,test,docs}`, `stage:{A1…F}`, `blocked`.

## Execution

**Status:** Step 0 is done: the repo `jdamboeck/modconductor` exists with labels and milestones M0–M10.
The overseeing agent continues with Step 1 (tracker-setup), then the stage workflows.

### Step 0 — set up the repo (inline, right after approval)
1. Commit `docs/design/` and this plan as `docs/plan/modconductor.md` on local `main`.
2. `git remote rename origin upstream`; `gh repo create jdamboeck/modconductor --public --source . --remote origin --push`
   (pushes `main` only); set the description and topics.
3. Create labels and milestones M0–M10 with `gh api`.

### Step 1 — workflow `tracker-setup` (parallel)
- 11 drafting agents in parallel, one per milestone. Each reads the plan and docs/design and
  returns its issues as structured output (key, title, labels, body, blocked_by keys).
- Barrier → one completeness-critic agent checks every row of the table, acceptance criteria
  against SPEC, and dependencies; it returns fixes.
- I then create the issues myself with `gh` in key order, replacing `blocked_by` keys with
  `#numbers` (deterministic and checkable), and print the issue map.

### Step 2+ — workflow `implement-stage` (saved as `.claude/workflows/implement-stage.js`, args `{stage, issues:[#…]}`)
One run per stage (A1, A2, A3, B1, B2, C, D, E1, E2, E3, F). You merge the PRs between
stages, or tell me to enable `gh pr merge --auto --squash` for a stage. Per issue, as a pipeline with no barrier:
1. **Implement** (`isolation: 'worktree'`): branch `m<N>/<issue#>-<slug>` from `origin/main`,
   implement, build, `ctest` (plus golden tests locally with the env var), commit, and
   return `{worktree, branch, summary, test_output}`.
2. **Review**, 2 agents in parallel, each told to refute: (a) spec/snapshot conformance and
   acceptance criteria, (b) correctness, threading and performance (locks, audio-thread
   safety, 20 fps). They return findings.
3. **Fix** (in the same worktree) if any finding is confirmed, then re-review once; at most 2 rounds.
4. **Publish:** push, `gh pr create --base main --title "<issue title>" --body "Closes #n …"`,
   comment on the issue with the PR link and test summary.
Returns a table per stage (issue → PR, test results, unresolved findings), which I relay to you.

Stage C runs 9 implementers at once (capped by the workflow's concurrency limit), so expect
about 30 agents per stage C run.

## Verification
- `ctest`:
  - `layout_tests`: 7 sizes × mapRows {4,7} → the tier id matches the snapshot name and
    every `┌`/`┘` position matches `docs/design/snapshots/{4ch,18ch}/*.txt`; the T6 playlist
    is full width.
  - `analysis_tests` (need `MODCONDUCTOR_TEST_SONG`): groups `1-3·04·5-12·13-14·15-16·17·18`,
    key `A minor`, 16 orders, instrument channels (`ch 1-3,13-14,17…`) and hits (`1237×`) as in
    the 18ch T0 snapshot.
  - `log_tests`: merge rule (`05–08 … ×4`, `ch×3`), 24 entries max.
  - `harmony_tests`: chord templates incl. `Am7` → "minor 7th · A C E G".
  - `search_tests`: AND terms, case folding, tab counts.
  - `golden_tests`: load CydonianSky (the 4ch variant keeps channels 1,4,5,17 through a test
    hook), freeze the position about 15 s in (order 07, row 0B), render each size, diff against
    `.txt` with masks for live values, the brand and the hint row.
- Local song: a local copy of "Cydonian Sky" by dubmood (XM) (not committed; tests are
  skipped when the env var is unset, so CI stays green).
- Manual:
  - `modconductor <your module collection>` (scan time, playback, all keys and mouse actions);
  - resize through all tiers;
  - `--no-recursive`;
  - `COLORTERM=` for 256 colours;
  - tmux;
  - `htop` CPU at 20 fps;
  - in M8: CPU with 3 stems on an 18-ch song;
  - in M9: export while playing, then compare the export to the file rendered dry.

## Known deviations from the handoff (intentional)
- Brand ` modconductor ` instead of ` cli-mod `; hints follow focus; `↻1` loop marker; focus
  border colour; `M`/`S` markers.
- No `Tab` view switching (Tab = focus). There is no pattern view and no `--simple`.
- All of these are masked in the golden tests and listed in `docs/design/DEVIATIONS.md`.

## Risks
- **FTXUI v6 API changes** (Node/Screen/Pixel names): low, since we use little of it. Checked in M0.
- **Shift-arrows not reported** by some terminals: `+`/`-` and `<`/`>` stay as hidden fallbacks.
- **Pre-UI scan time** on very large trees: parallel scanning, and Ctrl+C keeps what was found.
- **Stems drifting** from the master for IT songs with random volume/pan or NNA: all instances
  start from the same position and render the same frame counts. Tested in M8.
- **libxmp/libopenmpt instrument mismatch** on exotic formats: compact fallback per instrument.
- **CI libopenmpt 0.7** vs local 0.8.10: version guards around `get_time_at_position` and
  `get_current_tempo2`.
