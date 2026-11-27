#pragma once

// Song-dependent tests ("Cydonian Sky" by dubmood, XM) read the module path
// from MODCONDUCTOR_TEST_SONG. When it is unset or the file is missing, the
// test prints a SKIP line and exits with 77, which ctest reports as skipped
// (modconductor_add_test sets SKIP_RETURN_CODE 77). Never commit the song.

#include <cstdio>
#include <cstdlib>
#include <filesystem>
#include <system_error>

namespace check {

inline constexpr int kSkipExitCode = 77;

[[noreturn]] inline void skip(const char* why) {
  std::printf("SKIP: %s\n", why);
  std::fflush(stdout);
  std::exit(kSkipExitCode);
}

inline std::filesystem::path require_test_song() {
  const char* env = std::getenv("MODCONDUCTOR_TEST_SONG");
  if (env == nullptr || *env == '\0') skip("MODCONDUCTOR_TEST_SONG not set");
  std::filesystem::path p(env);
  std::error_code ec;
  if (!std::filesystem::is_regular_file(p, ec)) skip("MODCONDUCTOR_TEST_SONG not set");
  return p;
}

}  // namespace check

using check::require_test_song;
