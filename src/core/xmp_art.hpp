#pragma once

// Per-instrument sample and envelope art, extracted with libxmp.
// Interface contract from #1; the body is filled by issue 0.5.

#include <cstddef>
#include <memory>
#include <span>
#include <string>
#include <utility>
#include <vector>

namespace modconductor {

struct InstrumentArt {
  struct Entry {
    bool has_art = false;            // false: the UI uses compact rows
    std::string sample_name;
    bool loop = false;
    int frames = 0, bits = 8;
    std::size_t bytes = 0;
    std::vector<float> wave;         // signed -1..1, at most 64 points
    std::vector<float> peaks;        // 0..1, 32 points (one-shots longer than 64 frames)
    std::vector<std::pair<int,int>> env;  // (tick, 0..64); empty = no envelope
  };
  std::vector<Entry> inst;           // [0] = instrument 1
};

std::shared_ptr<const InstrumentArt> extract_instrument_art(std::span<const std::byte> file);

}  // namespace modconductor
