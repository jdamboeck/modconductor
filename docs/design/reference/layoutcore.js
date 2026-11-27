/* ---------- responsive layout: one function decides every container ---------- */
var CONFIGS = [
  { id: 'T0', name: 'full', set: ['map', 'inst', 'stage', 'harm', 'pulse', 'log'] },
  { id: 'T1', name: 'no event log', set: ['map', 'inst', 'stage', 'harm', 'pulse'] },
  { id: 'T2', name: 'no harmony', set: ['map', 'inst', 'stage', 'pulse'] },
  { id: 'T3', name: 'no pulse', set: ['map', 'inst', 'stage'] },
  { id: 'T4', name: 'no stereo stage', set: ['map', 'inst'] },
  { id: 'T5', name: 'no instruments', set: ['map'] },
  { id: 'T6', name: 'playlist + now playing', set: [] }
];
var MIN = { map: 30, inst: 40, stage: 30, harm: 44, pulse: 30, log: 40, pulseW: 40, instH: 11, stageH: 10, pulseH: 11 };
function computeLayout(cols, rows, mapRows) {
  var nch = mapRows;
  var hh = rows - 3, PLW = cols >= 110 ? 42 : cols >= 84 ? 34 : 30, mw = cols - PLW;
  var mapMinH = 3 + nch, mapFullH = Math.min(21, 3 + nch * (nch <= 4 ? 4 : nch <= 8 ? 2 : 1));
  for (var i = 0; i < CONFIGS.length; i++) {
    var C = CONFIGS[i], S = {}; C.set.forEach(function (k) { S[k] = 1; });
    if (!C.set.length) return { tier: C, cols: cols, rows: rows, playlist: { x: 0, y: 1, w: cols, h: hh }, boxes: {} };
    var mapNeed = C.set.length === 1 ? 4 : mapMinH;
    if (mw < MIN.map || hh < mapNeed) continue;
    var instW = S.inst ? MIN.inst : 0, R = mw - instW;
    var rightW = Math.max(S.stage ? MIN.stage + (S.harm ? MIN.harm : 0) : 0, S.pulse ? (S.log ? MIN.pulseW + MIN.log : MIN.pulse) : 0);
    if (S.inst && mw < MIN.inst) continue;
    if (rightW && R < rightW) continue;
    var rightH = (S.stage ? MIN.stageH : 0) + (S.pulse ? MIN.pulseH : 0), bottomNeed = Math.max(S.inst ? MIN.instH : 0, rightH);
    if (hh - bottomNeed < mapNeed) continue;
    /* fits: hand out the space */
    var B = {}, mx = PLW, mapH = bottomNeed ? clamp(hh - bottomNeed, Math.min(mapNeed, hh - bottomNeed), mapFullH) : hh;
    B.map = { x: mx, y: 1, w: mw, h: mapH };
    var by = 1 + mapH, BH = hh - mapH;
    if (S.inst) B.inst = { x: mx, y: by, w: rightW ? instW : mw, h: BH };
    if (rightW) {
      var rx = mx + instW, pH = S.pulse ? (S.stage ? clamp(Math.round(BH * 0.45), MIN.pulseH, 15) : BH) : 0, tH = BH - pH;
      if (S.stage) { var hw = S.harm ? Math.max(MIN.harm, Math.round(R * 0.42)) : 0; B.stage = { x: rx, y: by, w: R - hw, h: tH }; if (S.harm) B.harm = { x: rx + R - hw, y: by, w: hw, h: tH }; }
      if (S.pulse) { var lw = S.log ? R - MIN.pulseW : 0; B.pulse = { x: rx, y: by + tH, w: R - lw, h: pH }; if (S.log) B.log = { x: rx + R - lw, y: by + tH, w: lw, h: pH }; }
    }
    return { tier: C, cols: cols, rows: rows, playlist: { x: 0, y: 1, w: PLW, h: hh }, boxes: B };
  }
}
