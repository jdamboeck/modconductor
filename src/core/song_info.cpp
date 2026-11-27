#include "core/song_info.hpp"

#include <libopenmpt/libopenmpt.hpp>

#include "core/xmp_art.hpp"

namespace modconductor {

// Stub: returns an empty SongInfo. Issue 0.4 fills it from the module.
std::shared_ptr<const SongInfo> build_song_info(openmpt::module& /*mod*/, const InstrumentArt* /*art*/) {
  return std::make_shared<const SongInfo>();
}

}  // namespace modconductor
