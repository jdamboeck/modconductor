cmake_minimum_required(VERSION 3.18)
project(modconductor VERSION 0.1.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

list(APPEND CMAKE_MODULE_PATH "${CMAKE_CURRENT_SOURCE_DIR}/cmake")

option(MODCONDUCTOR_BUILD_TESTS "Build the modconductor tests" ON)

# Warnings shared by every target.
add_library(modconductor_warnings INTERFACE)
target_compile_options(modconductor_warnings INTERFACE -Wall -Wextra -Wpedantic)

# --- Required dependencies -------------------------------------------------
find_package(Threads REQUIRED)
find_package(PkgConfig REQUIRED)

pkg_check_modules(OPENMPT IMPORTED_TARGET libopenmpt)
if(NOT OPENMPT_FOUND)
    message(FATAL_ERROR "libopenmpt not found (pkg-config module 'libopenmpt'). "
                        "Install it, e.g. 'sudo apt install libopenmpt-dev'.")
endif()

pkg_check_modules(PORTAUDIO IMPORTED_TARGET portaudio-2.0)
if(NOT PORTAUDIO_FOUND)
    message(FATAL_ERROR "PortAudio not found (pkg-config module 'portaudio-2.0'). "
                        "Install it, e.g. 'sudo apt install portaudio19-dev'.")
endif()

pkg_check_modules(XMP IMPORTED_TARGET libxmp)
if(NOT XMP_FOUND)
    message(FATAL_ERROR "libxmp not found (pkg-config module 'libxmp'). "
                        "modconductor needs libxmp for sample and envelope art. "
                        "Install it, e.g. 'sudo apt install libxmp-dev'.")
endif()

message(STATUS "libopenmpt ${OPENMPT_VERSION}, libxmp ${XMP_VERSION}, PortAudio ${PORTAUDIO_VERSION}")

# --- Optional dependencies (export) ----------------------------------------
pkg_check_modules(FLAC IMPORTED_TARGET flac)

pkg_check_modules(LAME IMPORTED_TARGET lame)
if(NOT LAME_FOUND)
    find_library(LAME_LIBRARY NAMES mp3lame)
    find_path(LAME_INCLUDE_DIR NAMES lame/lame.h)
    if(LAME_LIBRARY AND LAME_INCLUDE_DIR)
        set(LAME_FOUND TRUE)
        add_library(modconductor_lame UNKNOWN IMPORTED)
        set_target_properties(modconductor_lame PROPERTIES
            IMPORTED_LOCATION "${LAME_LIBRARY}"
            INTERFACE_INCLUDE_DIRECTORIES "${LAME_INCLUDE_DIR}")
        message(STATUS "Found LAME manually: ${LAME_LIBRARY}")
    endif()
endif()

if(FLAC_FOUND)
    message(STATUS "FLAC export: enabled")
else()
    message(STATUS "FLAC export: disabled (libFLAC not found)")
endif()
if(LAME_FOUND)
    message(STATUS "MP3 export: enabled")
else()
    message(STATUS "MP3 export: disabled (LAME not found)")
endif()

# --- FTXUI (terminal I/O only; linked by modconductor_ui and the app) -------
include(FetchContent)
set(FTXUI_BUILD_EXAMPLES OFF CACHE BOOL "" FORCE)
set(FTXUI_BUILD_DOCS OFF CACHE BOOL "" FORCE)
set(FTXUI_BUILD_TESTS OFF CACHE BOOL "" FORCE)
set(FTXUI_ENABLE_INSTALL OFF CACHE BOOL "" FORCE)
FetchContent_Declare(
    ftxui
    GIT_REPOSITORY https://github.com/ArthurSonzogni/ftxui.git
    GIT_TAG v6.1.9
    GIT_SHALLOW TRUE
)
FetchContent_MakeAvailable(ftxui)

# --- Libraries and executable ----------------------------------------------
add_subdirectory(src/core)
add_subdirectory(src/audio)
add_subdirectory(src/ui)

add_executable(modconductor src/main.cpp)
target_compile_definitions(modconductor PRIVATE
    MODCONDUCTOR_VERSION="${PROJECT_VERSION}")
target_link_libraries(modconductor PRIVATE
    modconductor_ui
    modconductor_audio
    modconductor_core
    modconductor_warnings)

# --- Tests -----------------------------------------------------------------
if(MODCONDUCTOR_BUILD_TESTS)
    enable_testing()
    add_subdirectory(tests)
endif()
