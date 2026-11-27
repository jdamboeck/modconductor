PADX = 0; PADY = 0;
var LOG_MERGE = true;
/* ---------- panels, each drawn into any box ---------- */
/* map rows: single channels (small songs or when expanded), groups, or a 1-line summary */
function mapRows(E, cmp) { return (E.nch <= 8 || (cmp && cmp.state.expand)) ? E.nch : E.groups.length; }
function pSongMap(g, E, hits, b, cmp) {
  var cur = E.cur(), no = E.s.order.length, X = b.x, Y = b.y, avail = b.h - 3;
  var rowsAll = E.nch <= 8 || cmp.state.expand ? E.channelsAsRows() : E.groups, mode = rowsAll === E.groups ? 'groups' : 'channels';
  if (rowsAll.length > avail && mode === 'channels' && E.groups.length <= avail) { rowsAll = E.groups; mode = 'groups'; }
  if (rowsAll.length > avail) { rowsAll = [{ from: 0, to: E.nch - 1, ins: 0, label: 'all', chs: E.channelsAsRows().map(function (r) { return r.from; }) }]; mode = 'summary'; }
  var right = b.w > 70 ? (mode === 'groups' ? E.nch + ' ch in ' + E.groups.length + ' groups' : mode === 'summary' ? 'all ' + E.nch + ' ch combined' : E.nch + ' ch') + ' · ' + no + ' orders' : '';
  g.box(X, Y, b.w, b.h, 'Song map', PAL.line, PAL.acc, right);
  if (E.nch > 8) { var tg = mode === 'channels' ? '[g] group' : '[g] expand'; g.text(X + 13, Y, ' ' + tg + ' ', PAL.dim); hit(hits, X + 13, Y, tg.length + 2, mode === 'channels' ? 'Group channels' : 'Show every channel', function () { cmp.setState({ expand: !cmp.state.expand }); }); }
  var lx = X + 2, LW = 6, cx0 = X + 2 + LW, availW = b.w - LW - 4, cw = Math.min(9, Math.floor(availW / no)), o0 = 0, n = no;
  if (cw < 4) { cw = 4; n = Math.max(1, Math.floor(availW / cw)); o0 = clamp(cur.o - Math.floor(n / 2), 0, Math.max(0, no - n)); }
  var rowH = clamp(Math.floor(avail / rowsAll.length), 1, 6), GL4 = ' ▁▂▃▄▅▆▇█';
  /* aggregate fine density per row-group */
  var agg = rowsAll.map(function (G) { return E.fine.map(function (fo) { var s = new Array(16).fill(0); G.chs.forEach(function (c) { for (var k = 0; k < 16; k++) s[k] += fo[c][k]; }); return s; }); });
  var maxF = agg.map(function (A) { var m = 1; A.forEach(function (s) { s.forEach(function (v) { if (v > m) m = v; }); }); return m; });
  for (var o = o0; o < o0 + n; o++) { var Xo = cx0 + (o - o0) * cw, isCur = o === cur.o;
    g.text(Xo, Y + 1, cw >= 7 ? pad2(o + 1) + '·p' + hex2(E.s.order[o]) : pad2(o + 1), isCur ? PAL.hi : PAL.dim, isCur ? PAL.sel : null, cw - 1);
    hit(hits, Xo, Y + 1, cw - 1, 'Jump to order ' + (o + 1), (function (o) { return function () { E.seek(o); }; })(o)); }
  if (o0 > 0) g.text(cx0 - 2, Y + 1, '‹', PAL.dim); if (o0 + n < no) g.text(cx0 + n * cw - 1, Y + 1, '›', PAL.dim);
  rowsAll.forEach(function (G, gi) {
    var y0 = Y + 2 + gi * rowH, col = mode === 'summary' ? PAL.acc : ICOL[G.ins] || PAL.dim, lev = 0;
    G.chs.forEach(function (c) { lev = Math.max(lev, E.ch[c].lev); });
    var lbl = mode === 'channels' ? 'ch' + pad2(G.from + 1) : G.label;
    g.text(lx, y0 + Math.floor((rowH - 1) / 2), lbl, lev > 0.05 ? fade(col, 0.6 + lev * 0.4) : mix(PAL.bg, col, 0.75), null, LW - 1);
    if (mode === 'groups' && rowH >= 2 && G.chs.length > 1) g.text(lx, y0 + Math.floor((rowH - 1) / 2) + 1, G.chs.length + 'ch', PAL.faint);
    for (var o = o0; o < o0 + n; o++) {
      var X2 = cx0 + (o - o0) * cw, isC = o === cur.o, past = o < cur.o, oc = mode === 'channels' ? ICOL[E.domIns[o][G.from]] || col : col;
      for (var k = 0; k < cw - 1; k++) {
        var sl = Math.floor(k * 16 / (cw - 1)), v = agg[gi][o][sl] / maxF[gi], here = isC && sl === Math.floor(cur.r / 4);
        var cc = v === 0 ? PAL.line : mix(PAL.bg, oc, here || isC ? 1 : past ? 0.7 : 0.88), bgc = here ? mix(PAL.bg, PAL.hi, 0.25) : isC ? PAL.sel : null;
        if (rowH === 1) { g.set(X2 + k, y0, v === 0 ? '·' : v < 0.25 ? '░' : v < 0.5 ? '▒' : v < 0.75 ? '▓' : '█', cc, bgc); continue; }
        var hpx = Math.max(1, Math.round(v * (rowH - 0.5) * 8));
        for (var r = 0; r < rowH; r++) { var fill = clamp(hpx - (rowH - 1 - r) * 8, 0, 8); g.set(X2 + k, y0 + r, v === 0 && r === rowH - 1 ? '·' : GL4[fill], cc, bgc); }
      }
    }
  });
  if (cur.o >= o0 && cur.o < o0 + n) g.set(cx0 + (cur.o - o0) * cw + Math.floor(cur.r / 64 * (cw - 1)), Y + b.h - 1, '▲', PAL.acc);
}
function pInstruments(g, E, hits, b) {
  if (b.h >= 3 + E.inst.length * 3) return drawInstruments(g, E, b.x, b.y, b.w, b.h);
  g.box(b.x, b.y, b.w, b.h, 'Instruments', PAL.line, PAL.acc, 'compact');
  E.inst.slice(0, b.h - 2).forEach(function (I, i) {
    var y = b.y + 1 + i, col = ICOL[I.n], lev = E.instLevel(I.n), mw = 6, R = b.x + b.w - 3;
    g.text(b.x + 2, y, hex2(I.n), lev > 0.02 ? PAL.bg : col, lev > 0.02 ? fade(col, lev) : null);
    g.text(b.x + 5, y, E.instWaveGlyphs(I, 6), mix(PAL.bg, col, 0.8));
    var nm = (I.name || I.sname || '').trim() || '(unnamed)';
    g.text(b.x + 12, y, nm, nm !== '(unnamed)' ? PAL.fg : PAL.dim, null, b.w - 22);
    var m = Math.round(lev * mw); for (var k = 0; k < mw; k++) g.set(R - mw + 1 + k, y, k < m ? '█' : '░', k < m ? col : PAL.line);
  });
}
function pStage(g, E, hits, b) {
  var many = E.nch > 8;
  g.box(b.x, b.y, b.w, b.h, 'Stereo stage', PAL.line, PAL.acc, b.w > 44 ? (many ? 'pan × level · by group' : 'pan × level') : '');
  var sx0 = b.x + 3, sw = b.w - 6, base = b.y + b.h - (many ? 6 : 5), maxH = Math.max(2, base - b.y - 1), occ = {};
  g.text(b.x + 2, base + 1, 'L', PAL.dim); g.text(b.x + b.w - 3, base + 1, 'R', PAL.dim);
  for (var k = 0; k < sw - 2; k++) g.set(sx0 + 1 + k, base + 1, k === ((sw - 2) >> 1) ? '┼' : '─', PAL.line);
  function px(ch) { return sx0 + 1 + Math.round(ch.pan / 255 * (sw - 4)); }
  for (var c = 0; c < E.nch; c++) {
    var ch = E.ch[c], x = px(ch), cl = ICOL[ch.ins || E.chIns[c]], hgt = Math.round(ch.lev * maxH), bw = many ? 1 : 2;
    for (var j = 0; j < hgt; j++) { var gch = j === hgt - 1 ? '▄' : '█', cc = mix(PAL.bg, cl, 0.4 + 0.6 * ch.lev); for (var q = 0; q < bw; q++) { if (g.get(x + q, base - j) === '█' && j < hgt - 1) continue; g.set(x + q, base - j, gch, cc); } }
  }
  var labels = many ? E.groups.map(function (G) { var s = 0; G.chs.forEach(function (c) { s += px(E.ch[c]); }); var lev = 0; G.chs.forEach(function (c) { lev = Math.max(lev, E.ch[c].lev); }); return { x: Math.round(s / G.chs.length), t: G.label, col: ICOL[G.ins], lev: lev }; })
    : E.ch.map(function (ch, c) { return { x: px(ch), t: pad2(c + 1), col: ICOL[ch.ins || E.chIns[c]], lev: ch.lev }; });
  labels.forEach(function (L) {
    var x = clamp(L.x - (many ? Math.floor(L.t.length / 2) : 0), sx0, sx0 + sw - L.t.length), row = 0;
    while (row < 3) { var free = true; for (var q = x - 1; q <= x + L.t.length; q++) if (occ[row + ':' + q]) free = false; if (free) break; row++; }
    if (row > 2) return; for (q = x; q < x + L.t.length; q++) occ[row + ':' + q] = 1;
    g.text(x, base + 2 + row, L.t, L.lev > 0.05 ? L.col : PAL.dim);
  });
}
function pHarmony(g, E, hits, b) {
  g.box(b.x, b.y, b.w, b.h, 'Harmony', PAL.line, PAL.acc, E.key);
  var ch0 = detectChord(E), hx = b.x, by = b.y, hw = b.w;
  if (!ch0) { g.text(hx + 3, by + 2, '(no pitched notes)', PAL.dim); return; }
  bigText(g, hx + 3, by + 2, PCN[ch0.root] + ch0.q[0], PAL.hi);
  for (var r2 = 0; r2 < 5; r2++) for (var xx = hx + 1; xx < hx + hw - 1; xx++) { var i0 = (by + 2 + r2) * W + xx; if (g.ch[i0] === '\u0000') g.ch[i0] = ' '; }
  g.text(hx + 3, by + 8, ch0.q[2] + ' · ' + ch0.q[1].map(function (iv) { return PCN[(ch0.root + iv) % 12]; }).join(' '), PAL.dim, null, hw - 6);
  if (b.h < 15) return;
  var pcw = Math.max(2, Math.floor((hw - 4) / 12));
  for (var p = 0; p < 12; p++) { var v = ch0.w[p] / Math.max(0.3, ch0.tot), X3 = hx + 2 + p * pcw, inC = ch0.q[1].some(function (iv) { return (ch0.root + iv) % 12 === p; });
    for (var hh = 0; hh < 3; hh++) { var lvl = clamp(v * 3 - (2 - hh), 0, 1); g.text(X3, by + b.h - 5 + hh, lvl > 0.66 ? '██' : lvl > 0.33 ? '▄▄' : lvl > 0 ? '▁▁' : '  ', inC ? PAL.acc : PAL.dim); }
    g.text(X3, by + b.h - 2, PCN[p], inC ? PAL.hi : PAL.dim); }
}
function pPulse(g, E, hits, b) {
  var cur = E.cur(); g.box(b.x, b.y, b.w, b.h, 'Pulse', PAL.line, PAL.acc, b.w > 34 ? cur.bpm + ' bpm · spd ' + cur.spd : '');
  var beat = Math.floor(cur.r / 4) % 4, x = b.x + 2, y = b.y + 1, bw = Math.max(3, Math.floor((b.w - 4) / 4) - 1);
  g.text(x, y + 1, 'bar ' + (Math.floor(cur.r / 16) + 1) + '/4  beat ' + (beat + 1) + '/4  row ' + hex2(cur.r), PAL.fg, null, b.w - 4);
  for (var bb = 0; bb < 4; bb++) for (var r = 0; r < 3; r++) g.text(x + bb * (bw + 1), y + 3 + r, (bb === beat ? '█' : '░').repeat(bw), bb === beat ? PAL.acc : PAL.line);
  var tk = ''; for (var k = 0; k < cur.spd; k++) tk += k <= E.tick ? '█' : '░';
  g.text(x, y + 7, 'tick ', PAL.dim); g.text(x + 5, y + 7, tk, PAL.acc);
  if (y + 9 < b.y + b.h - 1) E.drums.forEach(function (ins, i) { var lev = E.instLevel(ins); g.text(x + i * 8, y + 9, hex2(ins) + ' ' + (lev > 0.05 ? '██' : '··'), lev > 0.05 ? ICOL[ins] : PAL.dim); });
}
function pLog(g, E, hits, b) {
  g.box(b.x, b.y, b.w, b.h, 'Event log', PAL.line, PAL.acc, b.w > 50 ? 'effects as they fire' : '');
  E.log.slice(0, b.h - 2).forEach(function (e, i) {
    var y = b.y + 1 + i, t = i === 0 ? PAL.hi : mix(PAL.bg, PAL.fg, 1 - i * 0.07), x = b.x + 2;
    g.text(x, y, fmtTime(e.t) + '.' + Math.floor((e.t % 1) * 10), PAL.dim);
    var cs = (e.cs || [e.c]).slice().sort(function (a, b) { return a - b; }), lab = cs.length === 1 ? 'ch' + pad2(cs[0] + 1) : cs.length === cs[cs.length - 1] - cs[0] + 1 ? pad2(cs[0] + 1) + '–' + pad2(cs[cs.length - 1] + 1) : 'ch×' + cs.length;
    g.text(x + 8, y, lab, mix(PAL.bg, ICOL[e.ins], 1 - i * 0.06));
    g.text(x + 15, y, e.code, t); g.text(x + 20, y, e.desc + (cs.length > 1 ? '  ×' + cs.length : ''), t, null, b.w - 23);
  });
}
var PANELS = { map: pSongMap, inst: pInstruments, stage: pStage, harm: pHarmony, pulse: pPulse, log: pLog };
function drawView(g, E, hits, cmp) {
  var L = cmp.layout;
  Object.keys(L.boxes).forEach(function (k) { PANELS[k](g, E, hits, L.boxes[k], cmp); });
}
