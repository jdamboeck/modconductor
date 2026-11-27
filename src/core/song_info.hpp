#pragma once

// Immutable per-song data read by the render path.
// Interface contract from #1; the body is filled by issue 0.4.

#include <memory>
#include <string>

namespace openmpt {
class module;
}

namespace modconductor {

struct InstrumentArt;

struct SongInfo {
  std::string title, artist, tracker, type;
  int nch = 0, nins = 0, npat = 0, norders = 0;
  double duration_s = 0;
};

std::shared_ptr<const SongInfo> build_song_info(openmpt::module& mod, const InstrumentArt* art);

}  // namespace modconductor
