// Stub registered by #1 (NEEDS_SONG). The owning stage-A2 issue replaces this with
// real tests. It skips (exit 77) when MODCONDUCTOR_TEST_SONG is unset.

#include <filesystem>

#include "support/check.hpp"
#include "support/song.hpp"

int main() {
  const std::filesystem::path song = require_test_song();
  CHECK(std::filesystem::is_regular_file(song));
  return check::report();
}
