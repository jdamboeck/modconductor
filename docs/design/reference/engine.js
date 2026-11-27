var SONG_URL = '/_blob/febd8b7d913067e33bacc7dfc58c271e';
var W = 180, H = 54, SW = 42, MX = 42, MY = 1, MW = 138, MH = 51;
var CW = 7.8, LH = 16, PADX = 18, PADY = 18;
var PAL = { bg: '#0B0C12', fg: '#D6D8E4', hi: '#F4F5FA', dim: '#8A8FA6', faint: '#3A3F58', line: '#2A2E42', acc: '#7FD6C2', sel: '#1B1F2E', head: '#12141D', key: '#C9CCDA', blk: '#232636' };
var ICOL = ['#8A8FA6', '#7FD6C2', '#EE8A72', '#B49CF0', '#67C6EE', '#E9C65C', '#9FD27A', '#F07A9A', '#F0A85C'];
var NN = ['C-', 'C#', 'D-', 'D#', 'E-', 'F-', 'F#', 'G-', 'G#', 'A-', 'A#', 'B-'];
var PCN = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
var SPARK = '▁▂▃▄▅▆▇█';
function noteName(n) { if (!n) return '···'; if (n === 97) return '==='; n -= 1; return NN[n % 12] + Math.floor(n / 12); }
function shortNote(n) { n -= 1; return PCN[n % 12] + Math.floor(n / 12); }
function isBlack(n) { var k = (n - 1) % 12; return k === 1 || k === 3 || k === 6 || k === 8 || k === 10; }
function hex2(v) { var s = (v | 0).toString(16).toUpperCase(); return s.length < 2 ? '0' + s : s; }
function pad2(v) { return (v < 10 ? '0' : '') + v; }
function hex1(v) { return (v | 0).toString(16).toUpperCase(); }
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function fmtTime(s) { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ':' + (s % 60 < 10 ? '0' : '') + (s % 60); }
var MIXC = {};
function mix(a, b, t) {
  t = Math.round(clamp(t, 0, 1) * 20) / 20;
  var k = a + b + t; if (MIXC[k]) return MIXC[k];
  var pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  var r = Math.round(((pa >> 16) & 255) * (1 - t) + ((pb >> 16) & 255) * t);
  var g = Math.round(((pa >> 8) & 255) * (1 - t) + ((pb >> 8) & 255) * t);
  var bl = Math.round((pa & 255) * (1 - t) + (pb & 255) * t);
  return (MIXC[k] = '#' + ((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1));
}
function fade(c, lev) { return mix(PAL.bg, c, 0.25 + 0.75 * clamp(lev, 0, 1)); }
function spark(v) { return SPARK[clamp(Math.round(v * 7), 0, 7)]; }
function chanList(cs) {
  var out = [], i = 0;
  while (i < cs.length) { var j = i; while (j + 1 < cs.length && cs[j + 1] === cs[j] + 1) j++; out.push(j > i ? cs[i] + '-' + cs[j] : '' + cs[i]); i = j + 1; }
  return out.join(',');
}

/* ---------- character grid ---------- */
function Grid() { this.n = W * H; this.ch = new Array(this.n); this.fg = new Array(this.n); this.bg = new Array(this.n); this.clear(); }
Grid.prototype.clear = function () { for (var i = 0; i < this.n; i++) { this.ch[i] = ' '; this.fg[i] = PAL.fg; this.bg[i] = PAL.bg; } };
Grid.prototype.set = function (x, y, c, f, b) { if (x < 0 || y < 0 || x >= W || y >= H) return; var K = this.clip; if (K && (x < K.x || y < K.y || x >= K.x + K.w || y >= K.y + K.h)) return; var i = y * W + x; this.ch[i] = c; if (f) this.fg[i] = f; if (b) this.bg[i] = b; };
Grid.prototype.get = function (x, y) { return this.ch[y * W + x]; };
Grid.prototype.text = function (x, y, s, f, b, maxw) {
  s = String(s); if (maxw != null && s.length > maxw) s = maxw <= 1 ? s.slice(0, maxw) : s.slice(0, maxw - 1) + '…';
  for (var k = 0; k < s.length; k++) this.set(x + k, y, s[k], f, b); return s.length;
};
Grid.prototype.rtext = function (xr, y, s, f, b) { s = String(s); return this.text(xr - s.length + 1, y, s, f, b); };
Grid.prototype.fill = function (x, y, w, h, c, f, b) { for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) this.set(x + i, y + j, c, f, b); };
Grid.prototype.bgfill = function (x, y, w, h, b) { for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) { var X = x + i, Y = y + j, K = this.clip; if (K && (X < K.x || Y < K.y || X >= K.x + K.w || Y >= K.y + K.h)) continue; if (X >= 0 && Y >= 0 && X < W && Y < H) this.bg[Y * W + X] = b; } };
Grid.prototype.box = function (x, y, w, h, title, col, tcol, right) {
  col = col || PAL.line;
  for (var i = 1; i < w - 1; i++) { this.set(x + i, y, '─', col); this.set(x + i, y + h - 1, '─', col); }
  for (var j = 1; j < h - 1; j++) { this.set(x, y + j, '│', col); this.set(x + w - 1, y + j, '│', col); }
  this.set(x, y, '┌', col); this.set(x + w - 1, y, '┐', col); this.set(x, y + h - 1, '└', col); this.set(x + w - 1, y + h - 1, '┘', col);
  if (title) this.text(x + 2, y, ' ' + title + ' ', tcol || PAL.acc, null, w - 4);
  if (right) this.rtext(x + w - 3, y, ' ' + right + ' ', PAL.dim);
};
Grid.prototype.lines = function () {
  var out = [];
  for (var y = 0; y < H; y++) {
    var runs = [], t = '', f = null, b = null;
    for (var x = 0; x < W; x++) {
      var i = y * W + x, cf = this.fg[i], cb = this.bg[i], c = this.ch[i];
      if (c === ' ') cf = f || cf;
      if (cf === f && cb === b) t += c; else { if (t) runs.push({ t: t, f: f, b: b }); t = c; f = cf; b = cb; }
    }
    if (t) runs.push({ t: t, f: f, b: b });
    out.push({ runs: runs });
  }
  return out;
};
/* half-block pixel plotting: rows are 2 px tall */
function HalfCanvas(w, h) { this.w = w; this.h = h * 2; this.px = new Array(w * h * 2).fill(0); }
HalfCanvas.prototype.dot = function (x, y, v) { if (x < 0 || y < 0 || x >= this.w || y >= this.h) return; this.px[y * this.w + x] = v || 1; };
HalfCanvas.prototype.blit = function (g, x0, y0, col, zero) {
  for (var r = 0; r < this.h / 2; r++) for (var x = 0; x < this.w; x++) {
    var a = this.px[(2 * r) * this.w + x], b = this.px[(2 * r + 1) * this.w + x];
    var c = a && b ? '█' : a ? '▀' : b ? '▄' : null;
    if (c) g.set(x0 + x, y0 + r, c, col); else if (zero === r) g.set(x0 + x, y0 + r, '·', PAL.faint);
  }
};

/* ---------- song engine ---------- */
function Engine(song) {
  if (typeof CHANNEL_PICK !== 'undefined' && !song.picked) {
    song.pats = song.pats.map(function (rows) { return rows.map(function (r) { return CHANNEL_PICK.map(function (c) { return r.substr(c * 10, 10); }).join(''); }); });
    song.nch = CHANNEL_PICK.length; song.picked = true;
  }
  this.s = song; this.nch = song.nch; this.inst = song.inst;
  var P = song.pats.map(function (rows) {
    return rows.map(function (str) { var cs = []; for (var c = 0; c < song.nch; c++) { var o = c * 10; cs.push([parseInt(str.substr(o, 2), 16), parseInt(str.substr(o + 2, 2), 16), parseInt(str.substr(o + 4, 2), 16), parseInt(str.substr(o + 6, 2), 16), parseInt(str.substr(o + 8, 2), 16)]); } return cs; });
  });
  this.cells = P;
  this.inst.forEach(function (I) { var m = 0.05; (I.loop ? I.wave : I.wave).forEach(function (v) { m = Math.max(m, Math.abs(v)); }); I.norm = 1 / m; });
  this.buildTimeline(); this.buildNotes(); this.analyse();
  this.mute = new Array(this.nch).fill(false);
  this.reset(this.startAt(5));
}
Engine.prototype.isDrum = function (i) { var I = this.inst[i - 1]; return !!I && !I.loop; };
Engine.prototype.buildTimeline = function () {
  var s = this.s, seq = [], speed = s.speed, bpm = s.bpm, t = 0, start = 0, stop = false;
  for (var oi = 0; oi < s.order.length && !stop; oi++) {
    var p = s.order[oi], rows = this.cells[p], brk = -1;
    for (var r = start; r < rows.length; r++) {
      for (var c = 0; c < this.nch; c++) {
        var fx = rows[r][c][3], fp = rows[r][c][4];
        if (fx === 15) { if (fp === 0) stop = true; else if (fp < 32) speed = fp; else bpm = fp; }
        if (fx === 13) brk = (fp >> 4) * 10 + (fp & 15);
      }
      var td = 2.5 / bpm; seq.push({ o: oi, p: p, r: r, t: t, spd: speed, td: td, bpm: bpm }); t += td * speed;
      if (brk >= 0 || stop) break;
    }
    start = brk >= 0 ? brk : 0;
  }
  this.seq = seq; this.total = t;
  this.restartIdx = 0; for (var i = 0; i < seq.length; i++) if (seq[i].o === s.restart) { this.restartIdx = i; break; }
  this.orderStart = []; for (i = 0; i < seq.length; i++) if (this.orderStart[seq[i].o] == null) this.orderStart[seq[i].o] = i;
};
Engine.prototype.startAt = function (o) { return this.orderStart[o] || 0; };
Engine.prototype.oneShotRows = function (ins, n, i) {
  var I = this.inst[ins - 1]; if (!I || I.loop) return 999;
  var f = 8363 * Math.pow(2, (n - 1 + (I.rel || 0) + (I.fine || 0) / 128 - 48) / 12);
  return Math.max(1, Math.ceil((I.frames / f) / (this.seq[i].td * this.seq[i].spd)));
};
Engine.prototype.buildNotes = function () {
  var notes = [], open = [], last = [], seq = this.seq, self = this;
  for (var c = 0; c < this.nch; c++) { open.push(null); last.push(0); }
  this.byStart = []; for (var i = 0; i < seq.length; i++) this.byStart.push([]);
  function close(c, i) { var o = open[c]; if (!o) return; o.e = Math.min(i, o.s + o.max); open[c] = null; }
  for (i = 0; i < seq.length; i++) {
    var cs = this.cells[seq[i].p][seq[i].r];
    for (c = 0; c < this.nch; c++) {
      var n = cs[c][0], ins = cs[c][1];
      if (ins) last[c] = ins;
      if (n > 0 && n < 97 && last[c]) {
        close(c, i);
        var o = { c: c, n: n, ins: last[c], s: i, e: i + 1, drum: this.isDrum(last[c]) };
        o.max = o.drum ? this.oneShotRows(last[c], n, i) : 32;
        open[c] = o; notes.push(o); this.byStart[i].push(o);
      } else if (n === 97) close(c, i);
    }
  }
  for (c = 0; c < this.nch; c++) close(c, seq.length);
  this.notes = notes;
  var pitched = notes.filter(function (n) { return !n.drum; }).map(function (n) { return n.n; }).sort(function (a, b) { return a - b; });
  this.minN = pitched[0]; this.maxN = pitched[pitched.length - 1];
  this.lo = pitched[Math.floor(pitched.length * 0.01)]; this.hi = pitched[Math.floor(pitched.length * 0.995)];
  var di = {}; notes.forEach(function (n) { if (n.drum) di[n.ins] = 1; });
  this.drums = Object.keys(di).map(Number).sort(function (a, b) { return a - b; });
};
Engine.prototype.notesIn = function (a, b, fn) {
  for (var i = Math.max(0, a - 33); i < Math.min(this.seq.length, b + 1); i++) {
    var l = this.byStart[i]; for (var k = 0; k < l.length; k++) { var n = l[k]; if (n.e > a && n.s <= b) fn(n); }
  }
};
Engine.prototype.analyse = function () {
  var nch = this.nch, no = this.s.order.length, seq = this.seq, self = this;
  this.density = []; this.domIns = [];
  for (var o = 0; o < no; o++) { var row = [], dom = []; for (var c = 0; c < nch; c++) { row.push(0); dom.push({}); } this.density.push(row); this.domIns.push(dom); }
  var pc = new Array(12).fill(0), maxD = 1;
  this.notes.forEach(function (n) {
    var o = seq[n.s].o; self.density[o][n.c]++; self.domIns[o][n.c][n.ins] = (self.domIns[o][n.c][n.ins] || 0) + 1;
    maxD = Math.max(maxD, self.density[o][n.c]);
    if (!n.drum) pc[(n.n - 1) % 12] += (n.e - n.s);
  });
  this.maxD = maxD;
  this.inst.forEach(function (I) { var cs = {}; I.hits = 0; self.notes.forEach(function (n) { if (n.ins === I.n) { I.hits++; cs[n.c + 1] = 1; } }); I.chans = Object.keys(cs).map(Number).sort(function (a, b) { return a - b; }); });
  /* fine density: per order, per channel, 16 slices of the pattern */
  this.fine = [];
  for (var o2 = 0; o2 < no; o2++) { var fr = []; for (var c2 = 0; c2 < nch; c2++) fr.push(new Array(16).fill(0)); this.fine.push(fr); }
  this.notes.forEach(function (n) { var sq = seq[n.s]; self.fine[sq.o][n.c][Math.floor(sq.r / 4)]++; });
  this.domIns = this.domIns.map(function (r) { return r.map(function (m) { var best = 0, bv = 0; for (var k in m) if (m[k] > bv) { bv = m[k]; best = +k; } return best; }); });
  var chIns = []; for (var c = 0; c < nch; c++) chIns.push({});
  this.notes.forEach(function (n) { chIns[n.c][n.ins] = (chIns[n.c][n.ins] || 0) + 1; });
  this.chIns = chIns.map(function (m) { var best = 0, bv = 0; for (var k in m) if (m[k] > bv) { bv = m[k]; best = +k; } return best; });
  /* groups: runs of neighbouring channels whose main instrument is the same */
  this.groups = [];
  for (var c3 = 0; c3 < nch; c3++) { var gl = this.groups[this.groups.length - 1]; if (gl && gl.ins === this.chIns[c3] && gl.to === c3 - 1) gl.to = c3; else this.groups.push({ from: c3, to: c3, ins: this.chIns[c3] }); }
  this.groups.forEach(function (G) { G.label = G.from === G.to ? pad2(G.from + 1) : (G.from + 1) + '-' + (G.to + 1); G.chs = []; for (var k = G.from; k <= G.to; k++) G.chs.push(k); });
  var maj = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88], min = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
  function corr(prof, rot) { var mx = 0, my = 0, i; for (i = 0; i < 12; i++) { mx += pc[(i + rot) % 12]; my += prof[i]; } mx /= 12; my /= 12; var a = 0, b = 0, d = 0; for (i = 0; i < 12; i++) { var x = pc[(i + rot) % 12] - mx, y = prof[i] - my; a += x * y; b += x * x; d += y * y; } return a / Math.sqrt(b * d); }
  var best = -2, key = '';
  for (var r = 0; r < 12; r++) { var a = corr(maj, r), b = corr(min, r); if (a > best) { best = a; key = PCN[r] + ' major'; } if (b > best) { best = b; key = PCN[r] + ' minor'; } }
  this.key = key; this.pcHist = pc;
};
Engine.prototype.reset = function (pos) {
  this.pos = pos || 0; this.tick = 0; this.acc = 0; this.time = this.seq[this.pos].t; this.phase = 0;
  this.ch = []; for (var c = 0; c < this.nch; c++) this.ch.push({ n: 0, ins: 0, vol: 0, pan: 128, envT: 0, on: false, fade: 1, age: 99, pitch: 0, lev: 0, flash: 0, aMem: 0, pMem: 0, slide: 0, vslide: 0, porta: 0, fx: '', fxAge: 99, logged: '', hist: [] });
  this.log = []; this.instFlash = new Array(10).fill(0);
};
Engine.prototype.seek = function (o) { this.reset(this.startAt(clamp(o, 0, this.s.order.length - 1))); };
Engine.prototype.channelsAsRows = function () { if (!this._car) { var self = this; this._car = this.ch.map(function (ch, c) { return { from: c, to: c, ins: self.chIns[c], label: pad2(c + 1), chs: [c] }; }); } return this._car; };
Engine.prototype.cur = function () { return this.seq[this.pos]; };
Engine.prototype.step = function (dt) {
  this.acc += dt;
  var guard = 0;
  while (this.acc >= this.cur().td && guard++ < 50) { this.acc -= this.cur().td; this.doTick(); }
};
Engine.prototype.doTick = function () {
  var row = this.cur();
  if (this.tick === 0) this.rowStart(row); else this.rowTicks();
  for (var c = 0; c < this.nch; c++) {
    var ch = this.ch[c], I = this.inst[ch.ins - 1];
    ch.envT++; ch.age += row.td; ch.fxAge++;
    if (!ch.on && I) ch.fade = I.env.length ? Math.max(0, ch.fade - (I.fade || 0) / 32768) : 0;
  }
  this.tick++; this.time += row.td;
  if (this.tick >= row.spd) { this.tick = 0; this.pos++; if (this.pos >= this.seq.length) { this.pos = this.restartIdx; this.time = this.seq[this.pos].t; } }
};
var FXNAME = { 1: 'porta up', 2: 'porta down', 8: 'pan', 10: 'vol slide', 12: 'set vol', 13: 'pattern break', 15: 'speed/tempo', 17: 'global vol slide' };
Engine.prototype.rowStart = function (row) {
  var cs = this.cells[row.p][row.r];
  for (var c = 0; c < this.nch; c++) {
    var n = cs[c][0], ins = cs[c][1], v = cs[c][2], fx = cs[c][3], fp = cs[c][4], ch = this.ch[c];
    if (ins && this.inst[ins - 1]) { var I = this.inst[ins - 1]; ch.ins = ins; ch.vol = I.vol; ch.pan = I.pan; }
    if (n > 0 && n < 97 && ch.ins) { ch.n = n; ch.pitch = n; ch.envT = 0; ch.on = true; ch.fade = 1; ch.age = 0; ch.flash = 1; ch.trig = (ch.trig || 0) + 1; ch.prevN = ch.lastN || n; ch.lastN = n; this.instFlash[ch.ins] = 1; ch.hist.push(n); if (ch.hist.length > 6) ch.hist.shift(); }
    else if (n === 97) ch.on = false;
    ch.slide = 0; ch.vslide = 0; ch.porta = 0;
    if (v >= 0x10 && v <= 0x50) ch.vol = v - 0x10;
    else if (v >= 0x60 && v < 0x70) ch.vslide = -(v & 15);
    else if (v >= 0x70 && v < 0x80) ch.vslide = v & 15;
    else if (v >= 0x80 && v < 0x90) ch.vol = Math.max(0, ch.vol - (v & 15));
    else if (v >= 0x90 && v < 0xA0) ch.vol = Math.min(64, ch.vol + (v & 15));
    else if (v >= 0xC0 && v < 0xD0) ch.pan = (v & 15) * 17;
    if (fx === 8) ch.pan = fp;
    else if (fx === 12) ch.vol = Math.min(64, fp);
    else if (fx === 10) { if (fp) ch.aMem = fp; ch.slide = (ch.aMem >> 4) ? (ch.aMem >> 4) : -(ch.aMem & 15); }
    else if (fx === 1 || fx === 2) { if (fp) ch.pMem = fp; ch.porta = (fx === 1 ? 1 : -1) * ch.pMem / 16; }
    if (fx || fp) {
      ch.fx = hex1(fx) + hex2(fp); ch.fxAge = 0;
      var desc = FXNAME[fx] || ('fx ' + hex1(fx));
      if (fx === 8) desc = 'pan ' + (fp < 120 ? 'L ' : fp > 136 ? 'R ' : 'C ') + Math.round(Math.abs(fp - 128) / 1.28) + '%';
      if (fx === 10) desc = 'vol slide ' + ((ch.aMem >> 4) ? 'up ' + (ch.aMem >> 4) : 'down ' + (ch.aMem & 15));
      if (fx === 1 || fx === 2) desc += ' ' + ch.pMem;
      if (fx === 12) desc = 'set vol ' + fp;
      if (ch.fx !== ch.logged || n) {
        ch.logged = ch.fx; var merged = false;
        if (typeof LOG_MERGE !== 'undefined') for (var q = 0; q < Math.min(8, this.log.length); q++) { var L0 = this.log[q]; if (L0.code === ch.fx && L0.desc === desc && Math.abs(L0.t - this.time) < 0.01) { if (L0.cs.indexOf(c) < 0) L0.cs.push(c); merged = true; break; } }
        if (!merged) { this.log.unshift({ t: this.time, c: c, cs: [c], code: ch.fx, desc: desc, ins: ch.ins }); if (this.log.length > 24) this.log.pop(); }
      }
    }
  }
};
Engine.prototype.rowTicks = function () {
  for (var c = 0; c < this.nch; c++) { var ch = this.ch[c]; ch.vol = clamp(ch.vol + ch.slide + ch.vslide, 0, 64); ch.pitch += ch.porta; }
};
Engine.prototype.envVal = function (I, t, on) {
  var e = I.env; if (!e.length) return 64;
  if (on && I.sus >= 0 && t >= e[I.sus][0]) return e[I.sus][1];
  for (var k = 0; k < e.length - 1; k++) if (t < e[k + 1][0]) { var a = e[k], b = e[k + 1]; return a[1] + (b[1] - a[1]) * (t - a[0]) / Math.max(1, b[0] - a[0]); }
  return e[e.length - 1][1];
};
Engine.prototype.durOf = function (ch) {
  var I = this.inst[ch.ins - 1]; if (!I || I.loop) return 1e9;
  return I.frames / (8363 * Math.pow(2, (ch.pitch - 1 + (I.rel || 0) - 48) / 12));
};
Engine.prototype.frame = function (dt) {
  this.phase += dt;
  for (var c = 0; c < this.nch; c++) {
    var ch = this.ch[c], I = this.inst[ch.ins - 1];
    if (!ch.n || !I) { ch.lev = 0; continue; }
    var alive = ch.age < this.durOf(ch);
    ch.lev = this.mute[c] ? 0 : (ch.vol / 64) * (this.envVal(I, ch.envT, ch.on) / 64) * ch.fade * (alive ? 1 : 0);
    ch.flash *= 0.78;
  }
  for (var i = 0; i < this.instFlash.length; i++) this.instFlash[i] *= 0.8;
};
Engine.prototype.instLevel = function (n) { var m = 0; for (var c = 0; c < this.nch; c++) if (this.ch[c].ins === n) m = Math.max(m, this.ch[c].lev); return m; };
Engine.prototype.sampleAt = function (ch, x) {
  var I = this.inst[ch.ins - 1]; if (!I) return 0; var w = I.wave;
  if (I.loop) { w = w.map(function (v) { return v * I.norm; }); var cyc = clamp(Math.pow(2, (ch.pitch - 49) / 12) * 2.5, 0.6, 7); var ph = x * cyc + this.phase * cyc * 0.6; ph -= Math.floor(ph); return w[Math.floor(ph * w.length)]; }
  var p = ch.age / this.durOf(ch); var idx = Math.floor(clamp(p * 0.75 + x * 0.25, 0, 0.999) * w.length);
  return w[idx] * (I.peaks.length ? 1 : 1);
};
Engine.prototype.instWaveGlyphs = function (I, n) {
  var src = I.loop ? I.wave : I.peaks, out = '';
  for (var k = 0; k < n; k++) { var v = src[Math.floor(k * src.length / n)]; out += spark(I.loop ? (v + 1) / 2 : v); }
  return out;
};
Engine.prototype.instEnvGlyphs = function (I, n) {
  if (!I.env.length) return '─'.repeat(n);
  var end = I.env[I.env.length - 1][0] || 1, out = '';
  for (var k = 0; k < n; k++) out += spark(this.envVal(I, k * end / (n - 1), false) / 64);
  return out;
};

function drawInstruments(g, E, bx, by, bw, bh) {
  g.box(bx, by, bw, bh, 'Instruments', PAL.line, PAL.acc, E ? E.inst.length + ' · 8-bit' : '');
  if (!E) return;
  var y = by + 1, R = bx + bw - 3, mw = Math.max(4, Math.min(8, bw - 34));
  E.inst.forEach(function (I) {
    var col = ICOL[I.n], lev = E.instLevel(I.n), fl = E.instFlash[I.n];
    if (fl > 0.05) g.bgfill(bx + 1, y, bw - 2, 1, mix(PAL.bg, col, fl * 0.22));
    g.text(bx + 2, y, hex2(I.n), lev > 0.02 ? PAL.bg : col, lev > 0.02 ? fade(col, lev) : null);
    var nm = (I.name || I.sname || '').trim() || '(unnamed)';
    g.text(bx + 5, y, nm, nm !== '(unnamed)' ? PAL.fg : PAL.dim, null, bw - mw - 9);
    var m = Math.round(lev * mw);
    for (var k = 0; k < mw; k++) g.set(R - mw + 1 + k, y, k < m ? '█' : '░', k < m ? col : PAL.line);
    g.text(bx + 5, y + 1, E.instWaveGlyphs(I, 14), mix(PAL.bg, col, 0.8));
    g.text(bx + 20, y + 1, I.loop ? 'loop' : '1-shot', PAL.dim); g.rtext(R, y + 1, I.frames + ' smp', PAL.dim);
    g.text(bx + 5, y + 2, E.instEnvGlyphs(I, 8), mix(PAL.bg, col, 0.55));
    g.text(bx + 14, y + 2, I.chans.length ? 'ch ' + chanList(I.chans) : 'not used', I.chans.length ? PAL.dim : PAL.faint, null, bw - 24);
    g.rtext(R, y + 2, I.hits + '×', PAL.dim);
    y += 3;
  });
  var bytes = E.inst.reduce(function (a, I) { return a + I.frames; }, 0);
  if (by + bh - 2 >= y) { g.text(bx + 2, by + bh - 2, 'wave · env · channels · hits', PAL.dim); g.rtext(R, by + bh - 2, (bytes / 1024).toFixed(1) + ' KB', PAL.dim); }
}
/* ---------- shared chrome: header, playlist, instruments, transport ---------- */
function hit(hits, x, y, w, label, go) { hits.push({ l: (PADX + x * CW).toFixed(1), t: PADY + y * LH, w: (w * CW).toFixed(1), label: label, go: go }); }
function drawChrome(g, cmp, hits, viewName, viewIdx) {
  var E = cmp.E, st = cmp.state;
  g.fill(0, 0, W, 1, ' ', PAL.fg, PAL.head);
  g.text(0, 0, ' cli-mod ', PAL.bg, PAL.acc);
  if (E) {
    var s = E.s, x = 10;
    x += g.text(x, 0, s.title, PAL.hi, PAL.head) + 1;
    g.text(x, 0, '· ' + s.author + ' · ' + s.tracker + ' · xm · ' + s.nch + ' ch · ' + s.inst.length + ' ins · ' + s.pats.length + ' pat', PAL.dim, PAL.head, Math.max(0, W - x - (W >= 150 ? 76 : 12)));
    var r = E.cur();
    var right = 'ord ' + pad2(r.o + 1) + '/' + pad2(s.order.length) + '  pat ' + hex2(r.p) + '  row ' + hex2(r.r) + '  spd ' + r.spd + '  bpm ' + r.bpm + '  ';
    var bx = W - 10;
    g.text(bx, 0, st.playing ? '[ || ]' : '[ >  ]', PAL.hi, PAL.head);
    hit(hits, bx, 0, 6, st.playing ? 'Pause' : 'Play', function () { cmp.togglePlay(); });
    if (W >= 150) g.rtext(bx - 2, 0, right, PAL.dim, PAL.head);
  }
  /* playlist */
  if (typeof drawPlaylistX === 'function') drawPlaylistX(g, cmp, hits); else {
  var list = st.list, py = 1, ph = (typeof PLAYLIST_FULL !== 'undefined' && PLAYLIST_FULL) ? MH : 13;
  g.box(0, py, SW, ph, 'Playlist', PAL.line, PAL.acc, list.length + ' tracks');
  var y = py + 1;
  list.forEach(function (t, i) {
    var cur = i === st.cur, playing = t.id === 1;
    if (cur) g.bgfill(1, y, SW - 2, 2, PAL.sel);
    g.text(2, y, playing ? (st.playing ? '>' : '=') : ' ', PAL.acc);
    g.text(4, y, (i < 9 ? '0' : '') + (i + 1), PAL.dim);
    g.text(7, y, t.title, playing ? PAL.hi : PAL.fg, null, 27);
    g.text(36, y, '*', t.fav ? '#E9C65C' : PAL.faint);
    g.text(38, y, 'x', PAL.dim);
    g.text(7, y + 1, t.meta, PAL.dim, null, 24); g.rtext(SW - 6, y + 1, t.id === 1 && E ? fmtTime(E.total) : t.len, PAL.dim);
    hit(hits, 2, y, 33, 'Select ' + t.title, function () { cmp.setState({ cur: i }); });
    hit(hits, 36, y, 1, (t.fav ? 'Remove ' : 'Add ') + t.title + (t.fav ? ' from favourites' : ' to favourites'), function () { cmp.toggleFav(t.id); });
    hit(hits, 38, y, 1, 'Delete ' + t.title + ' from playlist', function () { cmp.del(t.id); });
    y += 2;
  });
  if (!list.length) { g.text(3, y, 'playlist empty', PAL.dim); y += 1; }
  y += 1;
  g.text(3, y, '+ drop .mod .xm .s3m .it to add', PAL.dim);
  var fy = py + ph - 2;
  var nf = list.filter(function (t) { return t.fav; }).length;
  g.text(3, fy, nf + ' fav', '#E9C65C'); g.text(3 + String(nf).length + 5, fy, '· f fav · d delete', PAL.dim);
  if (st.undo.length) { g.text(SW - 10, fy, '[u]ndo', PAL.acc); hit(hits, SW - 10, fy, 6, 'Undo delete', function () { cmp.undo(); }); }
  }
  if (typeof PLAYLIST_FULL === 'undefined' || !PLAYLIST_FULL) drawInstruments(g, E, 0, py + ph, SW, MH + MY - py - ph);
  /* transport */
  var ty = H - 2;
  if (E) {
    var x0 = 7, x1 = W - 8, bw = x1 - x0, p = (E.time) / E.total;
    g.text(1, ty, fmtTime(E.time), PAL.hi); g.text(x1 + 2, ty, fmtTime(E.total), PAL.dim);
    var head = Math.floor(p * bw);
    for (var i = 0; i < bw; i++) g.set(x0 + i, ty, i < head ? '━' : '─', i < head ? PAL.acc : PAL.faint);
    for (var o = 0; o < E.s.order.length; o++) { var ox = x0 + Math.floor(E.seq[E.orderStart[o]].t / E.total * bw); g.set(ox, ty, o === E.cur().o ? '┃' : '╵', o <= E.cur().o ? PAL.acc : PAL.dim); }
    g.set(x0 + head, ty, '█', PAL.hi);
    for (o = 0; o < E.s.order.length; o++) (function (o) { var a = x0 + Math.floor(E.seq[E.orderStart[o]].t / E.total * bw), b = o + 1 < E.s.order.length ? x0 + Math.floor(E.seq[E.orderStart[o + 1]].t / E.total * bw) : x1; hit(hits, a, ty, Math.max(1, b - a), 'Jump to order ' + (o + 1), function () { E.seek(o); }); })(o);
  }
  var keys = [['space', 'play'], ['←/→', 'order'], ['↑/↓', 'track'], ['f', 'fav'], ['d', 'delete'], ['u', 'undo'], ['m', 'mute ch'], ['tab', 'view'], ['q', 'quit']];
  var kx = 1, rt = (viewIdx ? 'view ' + viewIdx + '/4 · ' : '') + viewName, lim = W - rt.length - 3;
  keys.forEach(function (k) { if (kx + k[0].length + k[1].length + 1 > lim) return; kx += g.text(kx, H - 1, k[0], PAL.acc) + 1; kx += g.text(kx, H - 1, k[1], PAL.dim) + 3; });
  if (rt.length < W - 2) g.rtext(W - 2, H - 1, rt, PAL.dim);
}

function makeComponentBase(viewName, viewIdx, draw) {
  return {
    init: function (cmp) {
      cmp.g = new Grid(); cmp.E = null;
      cmp.state = { f: 0, playing: true, cur: 0, undo: [], err: null, list: [
        { id: 1, title: 'Cydonian Sky', meta: 'dubmood · xm 18ch', len: '3:00', fav: true },
        { id: 2, title: 'Songs from the synthetic style', meta: 'xm 4ch', len: '3:41', fav: false }
      ] };
    }
  };
}

/* ---------- minimal chrome for the generative views ---------- */
var VX = 28, VY = 1, VW = W - 28, VH = H - 3;
function drawChromeMin(g, cmp, hits, viewName, viewIdx) {
  var E = cmp.E, st = cmp.state;
  if (E) {
    var s = E.s, r = E.cur();
    g.text(2, 0, s.title.toLowerCase(), PAL.hi); g.text(3 + s.title.length, 0, '· ' + s.author, PAL.dim);
    var bx = W - 7;
    g.text(bx, 0, st.playing ? '[||]' : '[> ]', PAL.acc);
    hit(hits, bx, 0, 4, st.playing ? 'Pause' : 'Play', function () { cmp.togglePlay(); });
    g.rtext(bx - 2, 0, 'ord ' + pad2(r.o + 1) + '/' + pad2(s.order.length) + '  row ' + hex2(r.r) + '  ' + r.bpm + ' bpm   ' + fmtTime(E.time) + ' / ' + fmtTime(E.total), PAL.dim);
  }
  /* playlist */
  g.text(2, 2, 'playlist', PAL.faint);
  var y = 3;
  st.list.forEach(function (t, i) {
    var playing = t.id === 1, cur = i === st.cur;
    if (cur) g.bgfill(1, y, 25, 1, PAL.sel);
    g.text(2, y, playing ? (st.playing ? '>' : '=') : ' ', PAL.acc);
    g.text(4, y, t.title.toLowerCase(), playing ? PAL.hi : PAL.fg, null, 17);
    g.text(22, y, '*', t.fav ? '#E9C65C' : PAL.faint); g.text(24, y, 'x', PAL.dim);
    hit(hits, 2, y, 19, 'Select ' + t.title, function () { cmp.setState({ cur: i }); });
    hit(hits, 22, y, 1, (t.fav ? 'Remove ' : 'Add ') + t.title + (t.fav ? ' from favourites' : ' to favourites'), function () { cmp.toggleFav(t.id); });
    hit(hits, 24, y, 1, 'Delete ' + t.title + ' from playlist', function () { cmp.del(t.id); });
    y++;
  });
  if (!st.list.length) g.text(4, y++, 'empty', PAL.dim);
  g.text(4, y, '+ add module', PAL.faint);
  if (st.undo.length) { g.text(19, y, 'undo', PAL.acc); hit(hits, 19, y, 4, 'Undo delete', function () { cmp.undo(); }); }
  /* instruments */
  if (E) {
    g.text(2, 9, 'instruments', PAL.faint);
    E.inst.forEach(function (I, i) {
      var y = 10 + i * 2, col = ICOL[I.n], lev = E.instLevel(I.n), fl = E.instFlash[I.n];
      g.text(2, y, '██', lev > 0.02 ? mix(PAL.bg, col, 0.45 + 0.55 * Math.min(1, lev + fl * 0.5)) : mix(PAL.bg, col, 0.3));
      g.text(5, y, hex2(I.n), PAL.dim);
      var nm = (I.name || I.sname || '').trim() || '(unnamed)';
      g.text(8, y, nm.toLowerCase(), nm !== '(unnamed)' ? PAL.fg : PAL.dim, null, 18);
      g.text(8, y + 1, E.instWaveGlyphs(I, 8), mix(PAL.bg, col, 0.7));
      g.text(17, y + 1, 'ch ' + chanList(I.chans), PAL.faint, null, 9);
    });
  }
  for (var yy = 2; yy < H - 2; yy++) g.set(26, yy, '│', '#161925');
  /* progress */
  if (E) {
    var x0 = 2, bw = W - 4, p = E.time / E.total, head = Math.floor(p * bw);
    for (var i = 0; i < bw; i++) {
      var o = 0; var tt = i / bw * E.total; for (var k = 0; k < E.s.order.length; k++) if (E.seq[E.orderStart[k]].t <= tt) o = k;
      var dc = ICOL[E.chIns[3]], best = 0; for (var c = 0; c < E.nch; c++) if (E.density[o][c] > best) { best = E.density[o][c]; dc = ICOL[E.domIns[o][c]]; }
      g.set(x0 + i, H - 2, i < head ? '━' : '─', i < head ? mix(PAL.bg, ICOL[1 + (o % 8)], 0.85) : PAL.line);
    }
    g.set(x0 + head, H - 2, '█', PAL.hi);
    for (k = 0; k < E.s.order.length; k++) (function (k) { var a = x0 + Math.floor(E.seq[E.orderStart[k]].t / E.total * bw), b = k + 1 < E.s.order.length ? x0 + Math.floor(E.seq[E.orderStart[k + 1]].t / E.total * bw) : x0 + bw; hit(hits, a, H - 2, Math.max(1, b - a), 'Jump to order ' + (k + 1), function () { E.seek(k); }); })(k);
  }
  var kx = 2;
  [['space', 'play'], ['←→', 'order'], ['f', 'fav'], ['d', 'delete'], ['u', 'undo'], ['tab', 'view']].forEach(function (k) { kx += g.text(kx, H - 1, k[0], PAL.dim) + 1; kx += g.text(kx, H - 1, k[1], PAL.faint) + 3; });
  g.rtext(W - 2, H - 1, viewIdx + '/4 · ' + viewName, PAL.faint);
}
/* particles */
function Parts() { this.a = []; }
Parts.prototype.add = function (p) { p.max = p.life; if (this.a.length < 900) this.a.push(p); };
Parts.prototype.step = function (dt, grav, floor) {
  var out = [];
  for (var i = 0; i < this.a.length; i++) { var p = this.a[i]; p.life -= dt; if (p.life <= 0) continue;
    p.vy += (p.g != null ? p.g : grav || 0) * dt; p.vx *= (1 - (p.drag || 0) * dt); p.vy *= (1 - (p.drag || 0) * dt);
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (floor != null && p.y > floor && p.vy > 0) { if (p.onFloor) p.onFloor(p); else { p.y = floor; p.vy *= -0.35; p.vx *= 0.6; } }
    out.push(p); }
  this.a = out;
};
Parts.prototype.draw = function (g, x0, y0, w, h) {
  for (var i = 0; i < this.a.length; i++) { var p = this.a[i], X = Math.round(p.x), Y = Math.round(p.y);
    if (X < x0 || Y < y0 || X >= x0 + w || Y >= y0 + h) continue;
    var t = p.life / p.max, c = typeof p.ch === 'function' ? p.ch(t) : p.ch;
    g.set(X, Y, c, mix(PAL.bg, p.col, Math.min(1, 0.15 + t * 1.1))); }
};
function rnd(a, b) { return a + Math.random() * (b - a); }
function pick(s) { return s[Math.floor(Math.random() * s.length)]; }
function triggers(E, vis) {
  if (!vis.lt) vis.lt = new Array(E.nch).fill(0);
  var out = [];
  for (var c = 0; c < E.nch; c++) { var ch = E.ch[c]; if ((ch.trig || 0) !== vis.lt[c]) { vis.lt[c] = ch.trig || 0; if (!E.mute[c] && ch.ins) out.push({ c: c, ch: ch, drum: E.isDrum(ch.ins), col: ICOL[ch.ins] }); } }
  return out;
}
function lineChar(dx, dy) { var ax = Math.abs(dx), ay = Math.abs(dy) * 2; if (ay < ax * 0.45) return '-'; if (ax < ay * 0.45) return '|'; return (dx > 0) === (dy > 0) ? '\\' : '/'; }
function drawLine(g, x0, y0, x1, y1, col, glyph, x0c, y0c, wc, hc) {
  var ch = glyph || lineChar(x1 - x0, y1 - y0), n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (var i = 0; i <= n; i++) { var X = Math.round(x0 + (x1 - x0) * i / n), Y = Math.round(y0 + (y1 - y0) * i / n);
    if (X >= x0c && Y >= y0c && X < x0c + wc && Y < y0c + hc) g.set(X, Y, ch, col); }
}
