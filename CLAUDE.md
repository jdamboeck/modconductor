# modconductor

Terminal tracker-module player (MOD/XM/S3M/IT…) with one interface, the **Conductor**
dashboard: a full-height playlist plus live panels (song map, instruments, stereo stage,
harmony, pulse, event log) drawn on an exact character grid. C++20 · libopenmpt (playback) ·
libxmp (sample/envelope art only) · PortAudio · FTXUI v6 (terminal I/O only) · CMake.
Forked from Master290/cli-modplayer (MIT); the legacy UIs have been removed.

## Sources of truth
- `docs/plan/modconductor.md`: the approved plan (decisions, architecture, issue table,
  stages). **It wins where it differs from the design handoff.**
- `docs/design/CLAUDE.md`: the UI redesign handoff (SPEC, RESPONSIVE, DATA, snapshots, reference JS).
- `docs/design/DEVIATIONS.md` (once it exists): intentional differences from the handoff.
- GitHub issues and milestones on jdamboeck/modconductor; the pinned "Roadmap" issue maps them.
- Layout (since #1): `src/core` → `modconductor_core` (no FTXUI), `src/audio` →
  `modconductor_audio` (effects DSP, WAV/FLAC/MP3 writers), `src/ui` → `modconductor_ui` (FTXUI),
  `src/main.cpp` → `modconductor` (placeholder until 0.8), `tests/`, `cmake/`. Headers sit next to
  their sources; the include root is `src/` (`#include "core/player.hpp"`). The M0 core files exist
  as stubs that their issues fill in.

## Build and test
```sh
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build -j
ctest --test-dir build --output-on-failure
```
- Dependencies: libopenmpt, portaudio-2.0, libxmp (required; Debian/Ubuntu `libopenmpt-dev
  portaudio19-dev libxmp-dev`); libFLAC, LAME (optional, export). FTXUI is fetched by CMake at
  the exact tag `v6.1.9`.
- Register tests in `tests/CMakeLists.txt` with
  `modconductor_add_test(<name> SOURCES ... [LIBS ...] [NEEDS_SONG])`. Exit code 77 means
  skipped (`SKIP_RETURN_CODE`); song tests call `require_test_song()` from
  `tests/support/song.hpp`, which exits 77 when the variable is unset. Use `tests/support/check.hpp`
  for assertions and `tests/support/make_module.hpp` to generate MODs instead of committing modules.
- `ctest` also runs `architecture_check` (no FTXUI in `src/core`, no legacy headers) and `cli_smoke`.
- Stage A2 issues fill the pre-created stub sources and test targets; they do not edit CMake files.
- Golden and analysis tests need `MODCONDUCTOR_TEST_SONG` pointing to a local copy of
  "Cydonian Sky" by dubmood (XM). They must skip cleanly when it is unset, so CI stays green.
  Never commit the song.
- CI (ubuntu-latest, Ubuntu 26.04) ships libopenmpt 0.8.x, and local builds use 0.8+. Only 0.8+ is
  built and tested, so calls such as `get_time_at_position` and `get_current_tempo2` may be used
  directly. `OPENMPT_API_VERSION_AT_LEAST` fallbacks for 0.7 are optional and untested; don't add new ones.

## Architecture rules
- `src/core` has no FTXUI. `src/ui` draws only into `CellGrid`; FTXUI is used only for terminal
  I/O (`ScreenInteractive`, one `GridNode`).
- The render path never calls libopenmpt. Take one `Player::snapshot()` per frame and read
  pattern data from the immutable `SongInfo` (`shared_ptr<const>`).
- The audio thread never waits on the UI, never allocates in steady state, and holds locks only
  for short copies. Chains and stems are swapped in RCU style and freed off the audio thread.
- Layout depends only on cols × rows × map rows (`computeLayout`, a verbatim port of
  `docs/design/reference/layoutcore.js`).
- Each panel lives in its own file under `src/ui/panels/` with `draw(grid, rect, model)` and
  `hitTest`. Change other panels' files only when the issue says so.
- Port behaviour from `docs/design/reference/*.js`, not its playback simulation (`Engine.step`,
  `rowStart` state, `envVal`); libopenmpt is the source of truth for live state.
- Glyphs: box drawing, block elements and ASCII only. No emoji, no braille. Colours come from
  the palette tokens.

## Working on issues
- Branch `m<N>/<issue#>-<slug>` from `origin/main`. One PR per issue, with `Closes #<n>` in the body.
- A PR needs green build + ctest, and the issue's acceptance criteria ticked in the PR body.
- Agents never merge PRs, push to `main`, or force-push shared branches. The maintainer merges.
- Snapshot criteria: at every snapshot size, the panels match the `.txt` snapshots
  character for character, except live values and the masked areas listed in DEVIATIONS.md.
- Keep diffs scoped to the issue. Report a needed change outside it in the PR or issue instead
  of making it.
- End commit messages and PR bodies with the attribution lines your harness provides.

## Public repository
This repo is public. Never put local filesystem paths, personal names, email addresses or other
personal details in commits, files, issues, PR text or test fixtures.
