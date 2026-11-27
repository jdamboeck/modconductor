# Reference prototype (JavaScript, v6)

These files are from the design canvas. They draw into a character grid
(`Grid` in engine.js: `set(x, y, ch, fg, bg)`, then run-length lines). Read
them to answer behaviour questions; port the ideas, not the code. The
`Engine` playback simulation is replaced by libopenmpt in the real app (see
../DATA.md). `Engine.analyse` (density, groups, key) and the log merging in
`Engine.rowStart` are the parts to port.

Load order: engine.js → layoutcore.js → harmony.js → playlist4.js →
panels.js. Settings at the top of panels.js: `LOG_MERGE` turns log merging
on; `CHANNEL_PICK` (only in the 4-channel build) keeps a subset of the
channels.
