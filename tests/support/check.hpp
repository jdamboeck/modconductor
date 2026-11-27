#pragma once

// Tiny assertion helpers, so the tests need no external framework.
//
//   CHECK(cond)        record a failure and continue
//   CHECK_EQ(a, b)     record a failure (printing both values) and continue
//   REQUIRE(cond)      print the failure and exit(1) immediately
//   return check::report();   at the end of main()

#include <cstdio>
#include <cstdlib>
#include <iostream>
#include <sstream>
#include <string>
#include <type_traits>

namespace check {

struct State {
  int checks = 0;
  int failures = 0;
};

inline State& state() {
  static State s;
  return s;
}

template <typename T>
std::string show(const T& v) {
  if constexpr (requires(std::ostream& os, const T& x) { os << x; }) {
    std::ostringstream os;
    if constexpr (std::is_same_v<T, bool>) {
      os << (v ? "true" : "false");
    } else {
      os << v;
    }
    return os.str();
  } else {
    return "<unprintable>";
  }
}

inline bool record(bool ok, const char* expr, const char* file, int line,
                   const std::string& detail = {}) {
  ++state().checks;
  if (!ok) {
    ++state().failures;
    std::cerr << file << ":" << line << ": FAILED: " << expr;
    if (!detail.empty()) std::cerr << "  (" << detail << ")";
    std::cerr << "\n";
  }
  return ok;
}

template <typename A, typename B>
bool record_eq(const A& a, const B& b, const char* ea, const char* eb, const char* file, int line) {
  const bool ok = (a == b);
  std::string detail;
  if (!ok) detail = show(a) + " != " + show(b);
  const std::string expr = std::string(ea) + " == " + eb;
  return record(ok, expr.c_str(), file, line, detail);
}

// Prints a summary and returns the process exit code (0 = all passed).
inline int report() {
  const State& s = state();
  if (s.failures == 0) {
    std::cout << "OK: " << s.checks << " checks passed\n";
    return 0;
  }
  std::cout << "FAILED: " << s.failures << " of " << s.checks << " checks\n";
  return 1;
}

}  // namespace check

#define CHECK(cond) ::check::record(static_cast<bool>(cond), #cond, __FILE__, __LINE__)

#define CHECK_EQ(a, b) ::check::record_eq((a), (b), #a, #b, __FILE__, __LINE__)

#define REQUIRE(cond)                                                       \
  do {                                                                      \
    if (!::check::record(static_cast<bool>(cond), #cond, __FILE__, __LINE__)) { \
      std::cerr << "REQUIRE failed, aborting test\n";                       \
      std::exit(1);                                                         \
    }                                                                       \
  } while (0)
