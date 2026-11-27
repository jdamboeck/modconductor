#include "core/xmp_art.hpp"

namespace modconductor {

// Stub: returns no art. Issue 0.5 implements the libxmp extraction.
std::shared_ptr<const InstrumentArt> extract_instrument_art(std::span<const std::byte> /*file*/) {
  return std::make_shared<const InstrumentArt>();
}

}  // namespace modconductor
