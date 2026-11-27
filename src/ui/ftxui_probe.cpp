// Compile-time check of the FTXUI v6 API that the Conductor relies on.
// Issue 1.1 replaces this file with grid_node.cpp, which uses the same names:
// ftxui::Node::Render(Screen&), Screen::PixelAt(x, y) and the Pixel fields
// character / foreground_color / background_color, plus
// ScreenInteractive::Fullscreen().

#include <ftxui/component/screen_interactive.hpp>
#include <ftxui/dom/node.hpp>
#include <ftxui/screen/color.hpp>
#include <ftxui/screen/screen.hpp>

#include <memory>
#include <type_traits>

namespace modconductor {
namespace {

class ProbeNode : public ftxui::Node {
 public:
  void ComputeRequirement() override {
    requirement_.min_x = 1;
    requirement_.min_y = 1;
  }

  void Render(ftxui::Screen& screen) override {
    ftxui::Pixel& px = screen.PixelAt(0, 0);
    px.character = "+";
    px.foreground_color = ftxui::Color::RGB(255, 255, 255);
    px.background_color = ftxui::Color::Default;
  }
};

// ScreenInteractive::Fullscreen() must exist and return a ScreenInteractive.
static_assert(std::is_same_v<decltype(ftxui::ScreenInteractive::Fullscreen()),
                             ftxui::ScreenInteractive>);

}  // namespace

// Keeps ProbeNode referenced so the class is fully instantiated.
ftxui::Element ftxui_probe_element();
ftxui::Element ftxui_probe_element() { return std::make_shared<ProbeNode>(); }

}  // namespace modconductor
