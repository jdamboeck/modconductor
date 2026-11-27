# modconductor_ui: the Conductor dashboard. FTXUI is used for terminal I/O only.
add_library(modconductor_ui STATIC
    ftxui_probe.cpp
)
target_include_directories(modconductor_ui PUBLIC ${PROJECT_SOURCE_DIR}/src)
target_link_libraries(modconductor_ui
    PUBLIC
        modconductor_core
        ftxui::screen
        ftxui::dom
        ftxui::component
    PRIVATE
        modconductor_warnings
)
