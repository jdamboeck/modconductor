#pragma once

// Builds small in-memory ProTracker MODs (M.K. / 6CHN / 8CHN), so tests can
// run on CI without any third-party module.

#include <array>
#include <cstddef>
#include <cstdint>
#include <filesystem>
#include <span>
#include <string>
#include <vector>

namespace modconductor::test {

struct ModSample {
  std::string name;               // at most 22 characters are written
  std::vector<std::int8_t> data;  // 8-bit signed PCM, padded to an even length
  int loop_start = 0;             // in bytes (rounded down to even)
  int loop_length = 0;            // in bytes; 0 or 2 = no loop
  int volume = 64;                // 0..64
  int finetune = 0;               // -8..7
};

struct ModCell {
  int note = 0;      // 1..120 (C-0 = 1, OpenMPT numbering), 0 = none
  int sample = 0;    // 1..31, 0 = none
  char effect = 0;   // '0'..'9', 'A'..'F' (or 0 = none)
  int param = 0;     // 0..255
};

struct ModPattern {
  static constexpr int kRows = 64;
  std::array<std::vector<ModCell>, kRows> rows;  // rows[r][channel]; missing cells are empty

  ModCell& at(int row, int channel);  // grows the row as needed
};

struct ModuleSpec {
  std::string title;                // at most 20 characters are written
  int channels = 4;                 // 4, 6 or 8
  std::vector<ModSample> samples;   // at most 31; [0] = sample 1
  std::vector<int> orders;          // 1..128 pattern indices
  std::vector<ModPattern> patterns; // patterns referenced but not given are empty
};

// Amiga period for a note (1..120, C-0 = 1; C-4 = 49 is ProTracker C-1 = 856).
// Notes outside the ProTracker range are extrapolated and clamped to 12 bits.
int note_to_period(int note);

// Serialises the spec. Throws std::invalid_argument on a malformed spec.
std::vector<std::byte> make_module(const ModuleSpec& spec);

// Writes bytes to path; throws std::runtime_error on failure.
void write_file(const std::filesystem::path& path, std::span<const std::byte> bytes);

}  // namespace modconductor::test
