// Checks the test infrastructure: make_module output must load in libopenmpt
// and in libxmp, and read back the cells that were put in.

#include <cmath>
#include <cstdint>
#include <filesystem>
#include <fstream>
#include <iterator>
#include <string>
#include <vector>

#include <libopenmpt/libopenmpt.hpp>
#include <xmp.h>

#include "support/check.hpp"
#include "support/make_module.hpp"

using namespace modconductor::test;

namespace {

ModuleSpec four_channel_spec() {
  ModuleSpec spec;
  spec.title = "support test";
  spec.channels = 4;

  ModSample square;
  square.name = "square";
  for (int i = 0; i < 64; ++i) square.data.push_back(static_cast<std::int8_t>(i < 32 ? 100 : -100));
  square.loop_start = 0;
  square.loop_length = 64;
  spec.samples.push_back(square);

  ModSample blip;
  blip.name = "blip";
  for (int i = 0; i < 101; ++i) blip.data.push_back(static_cast<std::int8_t>(std::lround(120 * std::sin(i * 0.3))));
  spec.samples.push_back(blip);

  spec.orders = {0, 0, 0};
  ModPattern pat;
  pat.at(0, 0) = {49, 1, 'C', 0x40};  // C-4 (ProTracker C-1), sample 1, set volume 40
  pat.at(4, 1) = {61, 2, 0, 0};
  pat.at(8, 3) = {37, 2, 'A', 0x0F};
  spec.patterns.push_back(pat);
  return spec;
}

void test_periods() {
  CHECK_EQ(note_to_period(49), 856);
  CHECK_EQ(note_to_period(61), 428);
  CHECK_EQ(note_to_period(84), 113);
  CHECK_EQ(note_to_period(37), 1712);
  CHECK_EQ(note_to_period(85), 107);
  CHECK(note_to_period(1) <= 0x0FFF);
  CHECK(note_to_period(120) >= 1);
}

void test_layout() {
  const auto bytes = make_module(four_channel_spec());
  // 1084-byte header + 1 pattern (64 * 4 * 4) + 64 + 102 sample bytes.
  CHECK_EQ(bytes.size(), std::size_t{1084 + 1024 + 64 + 102});
  CHECK_EQ(static_cast<char>(bytes[1080]), 'M');
  CHECK_EQ(static_cast<char>(bytes[1083]), '.');

  ModuleSpec six = four_channel_spec();
  six.channels = 6;
  CHECK_EQ(static_cast<char>(make_module(six)[1080]), '6');
  ModuleSpec eight = four_channel_spec();
  eight.channels = 8;
  CHECK_EQ(static_cast<char>(make_module(eight)[1081]), 'C');
}

void test_openmpt(const std::vector<std::byte>& bytes, int channels) {
  openmpt::module mod(reinterpret_cast<const std::uint8_t*>(bytes.data()), bytes.size());
  CHECK_EQ(mod.get_num_channels(), channels);
  CHECK_EQ(mod.get_metadata("title"), std::string("support test"));
  CHECK_EQ(mod.get_num_orders(), 3);
  CHECK_EQ(mod.get_num_patterns(), 1);
  CHECK_EQ(mod.get_pattern_num_rows(0), 64);
  CHECK_EQ(mod.get_num_samples(), 31);  // ProTracker MODs always have 31 slots
  REQUIRE(mod.get_sample_names().size() >= 2);
  CHECK_EQ(mod.get_sample_names()[0], std::string("square"));
  CHECK_EQ(mod.get_sample_names()[1], std::string("blip"));

  // Row 0, channel 0: C-4 (note 49), sample 1, effect C40.
  CHECK_EQ(static_cast<int>(mod.get_pattern_row_channel_command(0, 0, 0, openmpt::module::command_note)), 49);
  CHECK_EQ(static_cast<int>(mod.get_pattern_row_channel_command(0, 0, 0, openmpt::module::command_instrument)), 1);
  CHECK_EQ(mod.format_pattern_row_channel_command(0, 0, 0, openmpt::module::command_effect), std::string("C"));
  CHECK_EQ(static_cast<int>(mod.get_pattern_row_channel_command(0, 0, 0, openmpt::module::command_parameter)), 0x40);

  CHECK_EQ(static_cast<int>(mod.get_pattern_row_channel_command(0, 4, 1, openmpt::module::command_note)), 61);
  CHECK_EQ(static_cast<int>(mod.get_pattern_row_channel_command(0, 8, 3, openmpt::module::command_note)), 37);
  CHECK_EQ(mod.format_pattern_row_channel_command(0, 8, 3, openmpt::module::command_effect), std::string("A"));
}

void test_xmp(const std::vector<std::byte>& bytes) {
  xmp_context ctx = xmp_create_context();
  REQUIRE(ctx != nullptr);
  const int rc = xmp_load_module_from_memory(ctx, bytes.data(), static_cast<long>(bytes.size()));
  CHECK_EQ(rc, 0);
  if (rc == 0) {
    xmp_module_info info{};
    xmp_get_module_info(ctx, &info);
    CHECK_EQ(info.mod->chn, 4);
    CHECK_EQ(info.mod->len, 3);
    CHECK_EQ(info.mod->smp, 31);
    CHECK_EQ(std::string(info.mod->xxi[0].name), std::string("square"));
    CHECK_EQ(info.mod->xxs[0].len, 64);
    CHECK(info.mod->xxs[0].flg & XMP_SAMPLE_LOOP);
    CHECK_EQ(info.mod->xxs[1].len, 102);
    CHECK_EQ(std::string(info.mod->name), std::string("support test"));
    xmp_release_module(ctx);
  }
  xmp_free_context(ctx);
}

void test_write_file(const std::vector<std::byte>& bytes) {
  const auto path = std::filesystem::temp_directory_path() / "modconductor_support_test.mod";
  write_file(path, bytes);
  std::ifstream f(path, std::ios::binary);
  const std::vector<char> back((std::istreambuf_iterator<char>(f)), std::istreambuf_iterator<char>());
  CHECK_EQ(back.size(), bytes.size());
  std::error_code ec;
  std::filesystem::remove(path, ec);
}

}  // namespace

int main() {
  test_periods();
  test_layout();
  const auto bytes = make_module(four_channel_spec());
  test_openmpt(bytes, 4);
  test_xmp(bytes);
  test_write_file(bytes);
  return check::report();
}
