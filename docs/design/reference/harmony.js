/* chord detection + block font, used by the Harmony panel */

var FONT = {
  A: [' ██ ', '█  █', '████', '█  █', '█  █'], B: ['███ ', '█  █', '███ ', '█  █', '███ '], C: [' ███', '█   ', '█   ', '█   ', ' ███'],
  D: ['███ ', '█  █', '█  █', '█  █', '███ '], E: ['████', '█   ', '███ ', '█   ', '████'], F: ['████', '█   ', '███ ', '█   ', '█   '],
  G: [' ███', '█   ', '█ ██', '█  █', ' ███'], '#': ['    ', ' █ █', '████', ' █ █', '████'], m: ['     ', '     ', '████ ', '█ █ █', '█ █ █'],
  '7': ['████', '   █', '  █ ', ' █  ', ' █  '], M: ['█   █', '██ ██', '█ █ █', '█   █', '█   █'], s: ['    ', ' ███', '██  ', '  ██', '███ '],
  u: ['    ', '    ', '█  █', '█  █', ' ██ '], '2': ['███ ', '   █', ' ██ ', '█   ', '████'], '4': ['█  █', '█  █', '████', '   █', '   █'],
  d: ['   █', '   █', ' ███', '█  █', ' ███'], i: ['█', ' ', '█', '█', '█'], '5': ['████', '█   ', '███ ', '   █', '███ '], '-': ['   ', '   ', '███', '   ', '   ']
};
var CHORDS = [['', [0, 4, 7], 'major triad'], ['m', [0, 3, 7], 'minor triad'], ['7', [0, 4, 7, 10], 'dominant 7th'], ['m7', [0, 3, 7, 10], 'minor 7th'], ['M7', [0, 4, 7, 11], 'major 7th'], ['sus4', [0, 5, 7], 'suspended 4th'], ['sus2', [0, 2, 7], 'suspended 2nd'], ['dim', [0, 3, 6], 'diminished'], ['5', [0, 7], 'power chord']];
function bigText(g, x, y, s, col) { for (var i = 0; i < s.length; i++) { var gl = FONT[s[i]]; if (!gl) continue; for (var r = 0; r < 5; r++) g.text(x, y + r, gl[r].replace(/ /g, '\u0000'), col); x += gl[0].length + 1; } return x; }
function detectChord(E) {
  var w = new Array(12).fill(0), bass = null;
  for (var c = 0; c < E.nch; c++) { var ch = E.ch[c]; if (ch.lev < 0.05 || E.isDrum(ch.ins)) continue; var p = Math.round(ch.pitch); w[(p - 1) % 12] += ch.lev; if (bass == null || p < bass) bass = p; }
  var tot = w.reduce(function (a, b) { return a + b; }, 0); if (tot < 0.05) return null;
  var best = null;
  for (var root = 0; root < 12; root++) CHORDS.forEach(function (ch) {
    var sc = 0, has = {}; ch[1].forEach(function (iv) { var v = w[(root + iv) % 12]; has[(root + iv) % 12] = 1; sc += v > 0.02 ? 1 + v : -0.9; });
    for (var k = 0; k < 12; k++) if (!has[k]) sc -= w[k] * 1.2;
    if (bass != null && (bass - 1) % 12 === root) sc += 0.6;
    sc -= ch[1].length * 0.05;
    if (!best || sc > best.sc) best = { sc: sc, root: root, q: ch };
  });
  best.w = w; best.tot = tot; return best;
}
