# Test support library: check.hpp, song.hpp (song-skip convention), make_module.
add_library(modconductor_test_support STATIC support/make_module.cpp)
target_include_directories(modconductor_test_support PUBLIC ${CMAKE_CURRENT_SOURCE_DIR})
target_link_libraries(modconductor_test_support PRIVATE modconductor_warnings)

# modconductor_add_test(<name> SOURCES <src>... [LIBS <lib>...] [NEEDS_SONG])
#
# Builds an executable, links modconductor_test_support plus LIBS, and
# registers it with ctest. Exit code 77 means "skipped" (SKIP_RETURN_CODE).
# NEEDS_SONG marks tests that call require_test_song() (support/song.hpp):
# they read MODCONDUCTOR_TEST_SONG and exit 77 when it is unset, so CI skips
# them. They also get the ctest label "song".
function(modconductor_add_test name)
    cmake_parse_arguments(T "NEEDS_SONG" "" "SOURCES;LIBS" ${ARGN})
    if(NOT T_SOURCES)
        message(FATAL_ERROR "modconductor_add_test(${name}): SOURCES is required")
    endif()
    add_executable(${name} ${T_SOURCES})
    target_link_libraries(${name} PRIVATE modconductor_test_support ${T_LIBS} modconductor_warnings)
    add_test(NAME ${name} COMMAND ${name})
    set_tests_properties(${name} PROPERTIES SKIP_RETURN_CODE 77)
    if(T_NEEDS_SONG)
        set_tests_properties(${name} PROPERTIES LABELS song)
    endif()
endfunction()

# --- Infrastructure --------------------------------------------------------
modconductor_add_test(support_tests SOURCES support_tests.cpp LIBS modconductor_core)

add_test(NAME cli_smoke COMMAND modconductor --version)
set_tests_properties(cli_smoke PROPERTIES
    PASS_REGULAR_EXPRESSION "^modconductor ${PROJECT_VERSION}")

get_target_property(_core_links modconductor_core LINK_LIBRARIES)
string(REPLACE ";" "|" _core_links "${_core_links}")
add_test(NAME architecture_check
    COMMAND ${CMAKE_COMMAND}
        -DSOURCE_DIR=${PROJECT_SOURCE_DIR}
        "-DCORE_LINKS=${_core_links}"
        -P ${PROJECT_SOURCE_DIR}/cmake/check_architecture.cmake)

# --- Stage A2 targets (pre-registered; the owning issues fill the sources) -
modconductor_add_test(player_tests      SOURCES player_tests.cpp      LIBS modconductor_core)
modconductor_add_test(library_tests     SOURCES library_tests.cpp     LIBS modconductor_core)
modconductor_add_test(session_tests     SOURCES session_tests.cpp     LIBS modconductor_core)
modconductor_add_test(settings_tests    SOURCES settings_tests.cpp    LIBS modconductor_core)
modconductor_add_test(song_info_tests   SOURCES song_info_tests.cpp   LIBS modconductor_core)
modconductor_add_test(effect_text_tests SOURCES effect_text_tests.cpp LIBS modconductor_core)
modconductor_add_test(xmp_art_tests     SOURCES xmp_art_tests.cpp     LIBS modconductor_core)
modconductor_add_test(analysis_tests     SOURCES analysis_tests.cpp     LIBS modconductor_core NEEDS_SONG)
modconductor_add_test(xmp_art_song_tests SOURCES xmp_art_song_tests.cpp LIBS modconductor_core NEEDS_SONG)
