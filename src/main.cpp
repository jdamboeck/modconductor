// Placeholder entry point for the M0 rebuild. Issue 0.8 replaces it with the
// real app. It never opens audio or the terminal.

#include <cstdio>
#include <string_view>

#ifndef MODCONDUCTOR_VERSION
#define MODCONDUCTOR_VERSION "0.0.0"
#endif

int main(int argc, char** argv) {
  for (int i = 1; i < argc; ++i) {
    const std::string_view arg = argv[i];
    if (arg == "--version") {
      std::printf("modconductor %s\n", MODCONDUCTOR_VERSION);
      return 0;
    }
    if (arg == "--help" || arg == "-h") {
      std::printf(
          "usage: modconductor [--no-recursive] [FILE|DIR]...\n"
          "\n"
          "Terminal tracker-module player (MOD/XM/S3M/IT...).\n"
          "\n"
          "  --no-recursive  do not descend into subdirectories\n"
          "  --version       print the version and exit\n"
          "  --help          print this help and exit\n"
          "\n"
          "The M0 rebuild is in progress; playback is not wired up yet.\n");
      return 0;
    }
  }
  std::printf("modconductor: M0 rebuild in progress\n");
  return 0;
}
