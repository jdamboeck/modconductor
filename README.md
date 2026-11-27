# modconductor

A terminal tracker-module player (`.mod`, `.xm`, `.s3m`, `.it` and everything else libopenmpt
plays) built around one interface, the **Conductor** dashboard: a full-height playlist next to
live panels (song map, instruments, stereo stage, harmony, pulse and an event log), drawn on an
exact character grid. Playback runs on libopenmpt and PortAudio; libxmp supplies the sample and
envelope art; FTXUI handles terminal input and output.

## Status

The project is in the **M0 rebuild**: the repository has been restructured into the
`modconductor_core`, `modconductor_audio` and `modconductor_ui` libraries, the legacy UIs are
gone, and the core is being rewritten. The current binary is a placeholder that only answers
`--version` and `--help`. See the milestones and the pinned "Roadmap" issue for progress.

## Usage (target)

```sh
modconductor [--no-recursive] [FILE|DIR]...
```

Files and directories from the arguments (or the current directory) are scanned recursively
into the playlist; `--no-recursive` turns that off. Settings and favourites live in
`~/.config/modconductor/`.

## Dependencies

Required: libopenmpt, PortAudio, libxmp, a C++20 compiler and CMake 3.18+.
Optional (audio export): libFLAC, LAME. FTXUI is fetched by CMake at a pinned tag.

Debian / Ubuntu:

```sh
sudo apt install cmake g++ pkg-config libopenmpt-dev portaudio19-dev libxmp-dev libflac-dev libmp3lame-dev
```

## Build and test

```sh
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build -j
ctest --test-dir build --output-on-failure
./build/modconductor --version
```

Some tests need a specific module and read its path from `MODCONDUCTOR_TEST_SONG`; without it
they are reported as skipped.

## Credits

- Forked from [Master290/cli-modplayer](https://github.com/Master290/cli-modplayer) (MIT).
- Uses [libopenmpt](https://lib.openmpt.org/), [libxmp](https://github.com/libxmp/libxmp),
  [PortAudio](https://www.portaudio.com/) and [FTXUI](https://github.com/ArthurSonzogni/FTXUI).

## License

MIT, see [LICENSE](LICENSE).
