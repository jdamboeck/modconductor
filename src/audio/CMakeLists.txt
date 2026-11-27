# modconductor_audio: effects DSP and WAV/FLAC/MP3 writers.
add_library(modconductor_audio STATIC
    audio_effects.cpp
    audio_exporter.cpp
)
target_include_directories(modconductor_audio PUBLIC ${PROJECT_SOURCE_DIR}/src)
target_link_libraries(modconductor_audio
    PUBLIC modconductor_core
    PRIVATE modconductor_warnings
)

if(FLAC_FOUND)
    target_link_libraries(modconductor_audio PUBLIC PkgConfig::FLAC)
    target_compile_definitions(modconductor_audio PUBLIC HAVE_FLAC)
endif()

if(LAME_FOUND)
    if(TARGET PkgConfig::LAME)
        target_link_libraries(modconductor_audio PUBLIC PkgConfig::LAME)
    else()
        target_link_libraries(modconductor_audio PUBLIC modconductor_lame)
    endif()
    target_compile_definitions(modconductor_audio PUBLIC HAVE_LAME)
endif()
