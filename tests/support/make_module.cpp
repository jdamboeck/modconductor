#include "support/make_module.hpp"

#include <algorithm>
#include <fstream>
#include <stdexcept>

namespace modconductor::test {
namespace {

// ProTracker periods, finetune 0, octaves 1..3 (OpenMPT notes 49..84).
constexpr std::array<int, 36> kPeriods = {
    856, 808, 762, 720, 678, 640, 604, 570, 538, 508, 480, 453,
    428, 404, 381, 360, 339, 320, 302, 285, 269, 254, 240, 226,
    214, 202, 190, 180, 170, 160, 151, 143, 135, 127, 120, 113,
};
constexpr int kFirstTableNote = 49;

void put_be16(std::vector<std::byte>& out, std::size_t at, int v) {
  out[at] = static_cast<std::byte>((v >> 8) & 0xFF);
  out[at + 1] = static_cast<std::byte>(v & 0xFF);
}

void put_text(std::vector<std::byte>& out, std::size_t at, const std::string& s, std::size_t n) {
  for (std::size_t i = 0; i < n && i < s.size(); ++i) out[at + i] = static_cast<std::byte>(s[i]);
}

int effect_number(char e) {
  if (e == 0) return 0;
  if (e >= '0' && e <= '9') return e - '0';
  if (e >= 'A' && e <= 'F') return e - 'A' + 10;
  if (e >= 'a' && e <= 'f') return e - 'a' + 10;
  throw std::invalid_argument("make_module: effect must be a hex digit");
}

}  // namespace

ModCell& ModPattern::at(int row, int channel) {
  if (row < 0 || row >= kRows || channel < 0) throw std::out_of_range("ModPattern::at");
  auto& r = rows[static_cast<std::size_t>(row)];
  if (r.size() <= static_cast<std::size_t>(channel)) r.resize(static_cast<std::size_t>(channel) + 1);
  return r[static_cast<std::size_t>(channel)];
}

int note_to_period(int note) {
  if (note < 1 || note > 120) throw std::invalid_argument("note_to_period: note must be 1..120");
  int period = 0;
  const int last = kFirstTableNote + static_cast<int>(kPeriods.size()) - 1;
  if (note < kFirstTableNote) {
    const int octaves = (kFirstTableNote - note + 11) / 12;
    period = kPeriods[static_cast<std::size_t>(note + 12 * octaves - kFirstTableNote)] << octaves;
  } else if (note > last) {
    const int octaves = (note - last + 11) / 12;
    const int base = kPeriods[static_cast<std::size_t>(note - 12 * octaves - kFirstTableNote)];
    const int div = 1 << octaves;
    period = (base + div / 2) / div;
  } else {
    period = kPeriods[static_cast<std::size_t>(note - kFirstTableNote)];
  }
  return std::clamp(period, 1, 0x0FFF);
}

std::vector<std::byte> make_module(const ModuleSpec& spec) {
  const char* signature = nullptr;
  switch (spec.channels) {
    case 4: signature = "M.K."; break;
    case 6: signature = "6CHN"; break;
    case 8: signature = "8CHN"; break;
    default: throw std::invalid_argument("make_module: channels must be 4, 6 or 8");
  }
  if (spec.samples.size() > 31) throw std::invalid_argument("make_module: at most 31 samples");
  if (spec.orders.empty() || spec.orders.size() > 128)
    throw std::invalid_argument("make_module: 1..128 orders required");

  int num_patterns = static_cast<int>(spec.patterns.size());
  for (int o : spec.orders) {
    if (o < 0 || o > 127) throw std::invalid_argument("make_module: order out of range");
    num_patterns = std::max(num_patterns, o + 1);
  }
  num_patterns = std::max(num_patterns, 1);

  constexpr std::size_t kHeader = 20 + 31 * 30 + 1 + 1 + 128 + 4;  // 1084
  const std::size_t pattern_bytes = 64u * static_cast<std::size_t>(spec.channels) * 4u;
  std::size_t sample_bytes = 0;
  for (const auto& s : spec.samples) sample_bytes += (s.data.size() + 1) & ~std::size_t{1};

  std::vector<std::byte> out(kHeader + pattern_bytes * static_cast<std::size_t>(num_patterns) + sample_bytes);

  put_text(out, 0, spec.title, 20);

  for (std::size_t i = 0; i < spec.samples.size(); ++i) {
    const ModSample& s = spec.samples[i];
    const std::size_t at = 20 + i * 30;
    const std::size_t len_bytes = (s.data.size() + 1) & ~std::size_t{1};
    if (len_bytes / 2 > 0xFFFF) throw std::invalid_argument("make_module: sample too long");
    put_text(out, at, s.name, 22);
    put_be16(out, at + 22, static_cast<int>(len_bytes / 2));
    out[at + 24] = static_cast<std::byte>(s.finetune & 0x0F);
    out[at + 25] = static_cast<std::byte>(std::clamp(s.volume, 0, 64));
    int loop_start = std::max(0, s.loop_start) / 2;
    int loop_len = std::max(0, s.loop_length) / 2;
    if (loop_len <= 1) {
      loop_start = 0;
      loop_len = 1;  // ProTracker convention for "no loop"
    } else if (static_cast<std::size_t>(loop_start + loop_len) * 2 > len_bytes) {
      throw std::invalid_argument("make_module: loop exceeds sample length");
    }
    put_be16(out, at + 26, loop_start);
    put_be16(out, at + 28, loop_len);
  }

  std::size_t at = 20 + 31 * 30;
  out[at++] = static_cast<std::byte>(spec.orders.size());
  out[at++] = static_cast<std::byte>(127);
  for (std::size_t i = 0; i < spec.orders.size(); ++i) out[at + i] = static_cast<std::byte>(spec.orders[i]);
  at += 128;
  put_text(out, at, signature, 4);
  at += 4;

  for (int p = 0; p < num_patterns; ++p) {
    for (int r = 0; r < ModPattern::kRows; ++r) {
      for (int c = 0; c < spec.channels; ++c) {
        ModCell cell;
        if (p < static_cast<int>(spec.patterns.size())) {
          const auto& row = spec.patterns[static_cast<std::size_t>(p)].rows[static_cast<std::size_t>(r)];
          if (static_cast<std::size_t>(c) < row.size()) cell = row[static_cast<std::size_t>(c)];
        }
        if (cell.sample < 0 || cell.sample > 31) throw std::invalid_argument("make_module: sample out of range");
        if (cell.param < 0 || cell.param > 255) throw std::invalid_argument("make_module: param out of range");
        const int period = cell.note == 0 ? 0 : note_to_period(cell.note);
        const int fx = effect_number(cell.effect);
        out[at++] = static_cast<std::byte>((cell.sample & 0xF0) | ((period >> 8) & 0x0F));
        out[at++] = static_cast<std::byte>(period & 0xFF);
        out[at++] = static_cast<std::byte>(((cell.sample & 0x0F) << 4) | fx);
        out[at++] = static_cast<std::byte>(cell.param);
      }
    }
  }

  for (const auto& s : spec.samples) {
    for (std::int8_t v : s.data) out[at++] = static_cast<std::byte>(static_cast<std::uint8_t>(v));
    if (s.data.size() % 2 != 0) out[at++] = std::byte{0};
  }
  return out;
}

void write_file(const std::filesystem::path& path, std::span<const std::byte> bytes) {
  std::ofstream f(path, std::ios::binary | std::ios::trunc);
  if (!f) throw std::runtime_error("write_file: cannot open " + path.string());
  f.write(reinterpret_cast<const char*>(bytes.data()), static_cast<std::streamsize>(bytes.size()));
  if (!f) throw std::runtime_error("write_file: write failed for " + path.string());
}

}  // namespace modconductor::test
