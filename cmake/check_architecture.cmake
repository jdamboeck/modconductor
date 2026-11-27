# Architecture check, run by ctest as `architecture_check`:
#   cmake -DSOURCE_DIR=<repo> [-DCORE_LINKS=a|b|c] -P cmake/check_architecture.cmake
#
# Fails when
#   - a file under src/core/ includes anything FTXUI,
#   - modconductor_core links an FTXUI target (CORE_LINKS),
#   - a file under src/ includes a header of the deleted legacy UI.

if(NOT SOURCE_DIR)
    message(FATAL_ERROR "check_architecture: SOURCE_DIR is not set")
endif()

set(_errors "")

# 1. No FTXUI includes in src/core.
file(GLOB_RECURSE _core_files LIST_DIRECTORIES false
    "${SOURCE_DIR}/src/core/*.hpp" "${SOURCE_DIR}/src/core/*.h"
    "${SOURCE_DIR}/src/core/*.cpp" "${SOURCE_DIR}/src/core/*.cc")
foreach(_f IN LISTS _core_files)
    file(STRINGS "${_f}" _incs REGEX "^[ \t]*#[ \t]*include")
    foreach(_line IN LISTS _incs)
        string(TOLOWER "${_line}" _lower)
        if(_lower MATCHES "ftxui")
            file(RELATIVE_PATH _rel "${SOURCE_DIR}" "${_f}")
            list(APPEND _errors "${_rel}: src/core must not include FTXUI: ${_line}")
        endif()
    endforeach()
endforeach()

# 2. modconductor_core must not link FTXUI.
if(DEFINED CORE_LINKS)
    string(TOLOWER "${CORE_LINKS}" _links)
    if(_links MATCHES "ftxui")
        list(APPEND _errors "modconductor_core links FTXUI: ${CORE_LINKS}")
    endif()
endif()

# 3. No includes of deleted legacy headers anywhere under src/.
set(_deleted_re "#[ \t]*include[ \t]*[<\"](ui|simple_ui|file_browser[A-Za-z0-9_]*|note_formatter)\\.hpp[>\"]")
file(GLOB_RECURSE _src_files LIST_DIRECTORIES false
    "${SOURCE_DIR}/src/*.hpp" "${SOURCE_DIR}/src/*.h"
    "${SOURCE_DIR}/src/*.cpp" "${SOURCE_DIR}/src/*.cc")
foreach(_f IN LISTS _src_files)
    file(STRINGS "${_f}" _incs REGEX "${_deleted_re}")
    foreach(_line IN LISTS _incs)
        file(RELATIVE_PATH _rel "${SOURCE_DIR}" "${_f}")
        list(APPEND _errors "${_rel}: includes a deleted legacy header: ${_line}")
    endforeach()
endforeach()

list(LENGTH _core_files _n_core)
list(LENGTH _src_files _n_src)
if(_errors)
    foreach(_e IN LISTS _errors)
        message(SEND_ERROR "${_e}")
    endforeach()
    message(FATAL_ERROR "architecture_check failed")
endif()
message(STATUS "architecture_check passed (${_n_core} core files, ${_n_src} source files)")
