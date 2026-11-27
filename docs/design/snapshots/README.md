# Snapshots (v6)

Golden screens from the reference build, about 15 s into "Cydonian Sky"
(dubmood). File names: `<cols>x<rows>_<tier>`.

- `4ch/`: a 4-channel cut of the song (channels 1, 4, 5, 17). The map shows
  one row per channel.
- `18ch/`: the full 18-channel song. The map shows 7 channel groups.

`.txt` is plain characters, for diffing layout and box edges. `.ans` is the
same screen in 24-bit ANSI colour; view it with `cat 180x54_T0.ans` in a
truecolor terminal.

Live values (notes, meters, times, event-log lines) will differ in the real
app. Box edges, titles, tiers and static text must match.
