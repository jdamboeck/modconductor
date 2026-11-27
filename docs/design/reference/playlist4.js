var PLAYLIST_SEED = [
  { id: 1, title: 'Cydonian Sky', meta: 'dubmood · xm', fmt: 'xm', len: '3:00', fav: true },
  { id: 2, title: 'Songs from the synthetic style', meta: 'xm · 4ch', fmt: 'xm', len: '3:41', fav: false },
  { id: 3, title: 'space_debris', meta: 'Captain', fmt: 'mod', len: '', fav: false },
  { id: 4, title: 'Elysium', meta: 'Jester', fmt: 'mod', len: '', fav: true },
  { id: 5, title: 'Stardust Memories', meta: 'Jester', fmt: 'mod', len: '', fav: false },
  { id: 6, title: 'Hybrid Song', meta: 'Jester', fmt: 'mod', len: '', fav: false },
  { id: 7, title: 'Guitar Slinger', meta: 'Jogeir Liljedahl', fmt: 'mod', len: '', fav: false },
  { id: 8, title: 'Klisje paa klisje', meta: 'Jogeir Liljedahl', fmt: 'mod', len: '', fav: false },
  { id: 9, title: 'Aryx', meta: 'Karsten Obarski', fmt: 'mod', len: '', fav: false },
  { id: 10, title: 'Enigma', meta: 'Tip & Firefox', fmt: 'mod', len: '', fav: false },
  { id: 11, title: 'Cream of the Earth', meta: 'Romeo Knight', fmt: 'mod', len: '', fav: false },
  { id: 12, title: 'Second Reality', meta: 'Purple Motion', fmt: 's3m', len: '', fav: true },
  { id: 13, title: 'Unreal ][', meta: 'Purple Motion', fmt: 's3m', len: '', fav: false },
  { id: 14, title: 'Satellite One', meta: 'Purple Motion', fmt: 's3m', len: '', fav: false },
  { id: 15, title: 'Starshine', meta: 'Purple Motion', fmt: 's3m', len: '', fav: false },
  { id: 16, title: 'Catch That Goblin!!', meta: 'Skaven', fmt: 's3m', len: '', fav: false },
  { id: 17, title: 'Ice Frontier', meta: 'Skaven', fmt: 's3m', len: '', fav: false },
  { id: 18, title: 'Point of Departure', meta: 'Necros', fmt: 's3m', len: '', fav: false }
];
var FMT_ORDER = ['xm', 'mod', 's3m', 'it'];
function drawPlaylistX(g, cmp, hits) {
  var st = cmp.state, E = cmp.E, x0 = 0, y0 = 1, w = SW, h = MH;
  var all = st.list, favs = all.filter(function (t) { return t.fav; });
  var shown = st.tab === 'fav' ? favs : all;
  g.box(x0, y0, w, h, 'Playlist', PAL.line, PAL.acc, all.length + ' modules');
  /* tabs */
  var tx = 2;
  [['all', 'all ' + all.length], ['fav', '* favs ' + favs.length]].forEach(function (t) {
    var on = st.tab === t[0], lbl = ' ' + t[1] + ' ';
    g.text(tx, y0 + 1, lbl, on ? PAL.bg : PAL.dim, on ? PAL.acc : null);
    hit(hits, tx, y0 + 1, lbl.length, 'Show ' + (t[0] === 'fav' ? 'favourites' : 'all modules'), function () { cmp.setState({ tab: t[0], scroll: 0 }); });
    tx += lbl.length + 1;
  });
  if (w >= 38) g.rtext(w - 3, y0 + 1, '/ search', PAL.faint);
  g.fill(1, y0 + 2, w - 2, 1, '─', PAL.line);
  /* flatten into lines: format headers + 2-line entries */
  var lines = [];
  FMT_ORDER.forEach(function (f) {
    var grp = shown.filter(function (t) { return t.fmt === f; }); if (!grp.length) return;
    lines.push({ hdr: f, n: grp.length });
    grp.forEach(function (t) { lines.push({ t: t, part: 0 }); lines.push({ t: t, part: 1 }); });
  });
  var many = cmp.E && cmp.E.nch > 6, meters = h >= 32 && cmp.E ? (many ? 3 : cmp.E.nch) : 0, top = y0 + 3, cardH = 8 + meters, vis = h - 3 - cardH - 1, maxS = Math.max(0, lines.length - vis), sc = clamp(st.scroll || 0, 0, maxS);
  if (vis < 3) vis = 0;
  for (var i = 0; i < vis && sc + i < lines.length; i++) {
    var L = lines[sc + i], y = top + i;
    if (L.hdr) { g.text(2, y, L.hdr.toUpperCase(), PAL.faint); g.text(3 + L.hdr.length, y, '·' + L.n, PAL.faint); continue; }
    var t = L.t, idx = all.indexOf(t), playing = t.id === 1, cur = idx === st.cur;
    if (cur) g.bgfill(1, y, w - 3, 1, PAL.sel);
    if (L.part === 0) {
      g.text(2, y, playing ? (st.playing ? '>' : '=') : ' ', PAL.acc);
      g.text(4, y, t.title, playing ? PAL.hi : PAL.fg, null, w - 13);
      g.text(w - 8, y, '*', t.fav ? '#E9C65C' : PAL.faint); g.text(w - 6, y, 'x', PAL.dim);
      (function (t, idx) {
        hit(hits, 2, y, w - 11, 'Select ' + t.title, function () { cmp.setState({ cur: idx }); });
        hit(hits, w - 8, y, 1, (t.fav ? 'Remove ' : 'Add ') + t.title + (t.fav ? ' from favourites' : ' to favourites'), function () { cmp.toggleFav(t.id); });
        hit(hits, w - 6, y, 1, 'Delete ' + t.title + ' from playlist', function () { cmp.del(t.id); });
      })(t, idx);
    } else {
      g.text(4, y, t.meta, PAL.dim, null, w - 18);
      g.rtext(w - 5, y, playing && E ? fmtTime(E.total) : (t.len || '··:··'), PAL.dim);
    }
  }
  if (!lines.length) g.text(4, top + 1, st.tab === 'fav' ? 'no favourites yet · press f' : 'playlist empty', PAL.dim);
  /* scrollbar */
  if (vis >= 3) {
  var sx = w - 2, trackTop = top + 1, trackH = vis - 2;
  g.set(sx, top, '▲', maxS ? PAL.dim : PAL.faint); g.set(sx, top + vis - 1, '▼', maxS ? PAL.dim : PAL.faint);
  var th = maxS ? Math.max(2, Math.round(trackH * vis / lines.length)) : trackH, ty = maxS ? Math.round((trackH - th) * sc / maxS) : 0;
  for (i = 0; i < trackH; i++) g.set(sx, trackTop + i, i >= ty && i < ty + th ? '█' : '│', i >= ty && i < ty + th ? (maxS ? PAL.acc : PAL.line) : PAL.line);
  function scrollTo(v) { cmp.setState({ scroll: clamp(v, 0, maxS) }); }
  hit(hits, sx, top, 1, 'Scroll playlist up', function () { scrollTo(sc - 2); });
  hit(hits, sx, top + vis - 1, 1, 'Scroll playlist down', function () { scrollTo(sc + 2); });
  if (maxS) { if (ty > 0) hit(hits, sx, trackTop, 1, 'Page playlist up', function () { scrollTo(sc - vis); }); if (ty + th < trackH) hit(hits, sx, trackTop + trackH - 1, 1, 'Page playlist down', function () { scrollTo(sc + vis); }); }
  }
  /* now playing card */
  var cy = top + vis + 1; g.fill(1, cy - 1, w - 2, 1, '─', PAL.line);
  g.text(2, cy, 'NOW PLAYING', PAL.faint);
  if (E) {
    g.text(2, cy + 1, E.s.title, PAL.hi, null, w - 4);
    g.text(2, cy + 2, E.s.author + ' · xm · ' + E.nch + ' ch · ' + E.cur().bpm + ' bpm', PAL.dim, null, w - 4);
    var bw = w - 4, p = Math.floor(E.time / E.total * bw);
    for (i = 0; i < bw; i++) g.set(2 + i, cy + 3, i < p ? '━' : '─', i < p ? PAL.acc : PAL.faint);
    if (many && meters) {
      var nc = E.nch, cwid = Math.max(1, Math.min(3, Math.floor((w - 4) / nc))), SB = ' ▁▂▃▄▅▆▇█';
      for (var c2 = 0; c2 < nc; c2++) { var ch2 = E.ch[c2], col2 = ICOL[ch2.ins || E.chIns[c2]], hp = Math.round(ch2.lev * 16);
        for (var q = 0; q < cwid - (cwid > 1 ? 1 : 0); q++) { g.set(2 + c2 * cwid + q, cy + 5, SB[clamp(hp - 8, 0, 8)] === ' ' ? ' ' : SB[clamp(hp - 8, 0, 8)], fade(col2, 0.5 + ch2.lev / 2)); g.set(2 + c2 * cwid + q, cy + 6, hp > 0 ? SB[clamp(hp, 0, 8)] : '▁', hp > 0 ? fade(col2, 0.5 + ch2.lev / 2) : PAL.line); }
        if (c2 === 0 || (c2 + 1) % 5 === 0 || c2 === nc - 1) g.text(2 + c2 * cwid, cy + 7, String(c2 + 1), PAL.dim); }
    }
    else for (var c = 0; c < meters; c++) { var ch = E.ch[c], col = ICOL[ch.ins || E.chIns[c]], m = Math.round(ch.lev * 20);
      g.text(2, cy + 5 + c, 'ch' + pad2(c + 1), PAL.dim);
      for (var k = 0; k < Math.min(20, w - 16); k++) g.set(7 + k, cy + 5 + c, k < m ? '█' : '░', k < m ? fade(col, 0.5 + ch.lev / 2) : PAL.line);
      if (ch.n && ch.lev > 0.03) g.text(Math.min(29, w - 7), cy + 5 + c, E.isDrum(ch.ins) ? 'hit' : noteName(ch.n), col); }
    g.text(2, cy + 4, fmtTime(E.time) + ' / ' + fmtTime(E.total), PAL.fg); g.rtext(w - 3, cy + 4, 'ord ' + pad2(E.cur().o + 1) + '/' + pad2(E.s.order.length), PAL.dim);
  }
  var fy = y0 + h - 2;
  if (st.undo.length) { g.text(2, fy, 'removed 1 · ', PAL.dim); g.text(14, fy, '[u]ndo', PAL.acc); hit(hits, 14, fy, 6, 'Undo delete', function () { cmp.undo(); }); }
  else g.text(2, fy, 'f fav · d delete · ↑↓ move', PAL.faint);
}
