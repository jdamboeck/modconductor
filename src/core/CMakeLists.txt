# modconductor_core: playback, song data, library, session, settings.
# Architecture rule: this library never links or includes FTXUI.
add_library(modconductor_core STATIC
    player.cpp
    loaded_song.cpp
    audio_output.cpp
    song_info.cpp
    effect_text.cpp
    xmp_art.cpp
    library.cpp
    session.cpp
    settings.cpp
)
target_include_directories(modconductor_core PUBLIC ${PROJECT_SOURCE_DIR}/src)
target_link_libraries(modconductor_core
    PUBLIC
        PkgConfig::OPENMPT
        PkgConfig::PORTAUDIO
        PkgConfig::XMP
        Threads::Threads
    PRIVATE
        modconductor_warnings
)
