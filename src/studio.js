(function () {
'use strict';
var KEY = 'zer.v1';
function $(id) { return document.getElementById(id); }
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function lsGet() { try { var s = localStorage.getItem(KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; } }
function lsSet(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); return true; } catch (e) { toast('Không lưu được (bộ nhớ trình duyệt đầy?)'); return false; } }
function uid() { return 'p' + new Date().getTime().toString(36) + Math.floor(Math.random() * 1e4).toString(36); }
var tT;
function toast(m) { var t = $('toast'); t.textContent = m; t.style.display = 'block'; clearTimeout(tT); tT = setTimeout(function () { t.style.display = 'none'; }, 3200); }

var db = lsGet() || { cur: '', projects: {} };
if (!db.projects) db.projects = {};
function newProject(code, name, assets) { var id = uid(); db.projects[id] = { id: id, name: name || 'Dự án mới', code: code, assets: assets || {}, updated: new Date().getTime() }; db.cur = id; return db.projects[id]; }
function save() { if (PR) { PR.updated = new Date().getTime(); } lsSet(db); }

var hash = location.hash.replace(/^#/, ''), PR = null;
var hm = /^(play|edit)=(.*)$/.exec(hash), mode = hm ? hm[1] : 'edit', hid = hm ? decodeURIComponent(hm[2]) : '';
if (hid.indexOf('sample:') === 0) { var sm = ZER.SAMPLES[hid.slice(7)] || ZER.SAMPLES.start; PR = { id: 'sample', name: sm.name, code: sm.code, assets: {} }; }
else if (hid && hid !== 'new' && db.projects[hid]) PR = db.projects[hid];
else if (hid === 'new' || !db.cur || !db.projects[db.cur]) PR = newProject(ZER.SAMPLES.start.code, 'Dự án đầu tiên');
else PR = db.projects[db.cur];
if (hid && hid !== 'new' && db.projects[hid]) db.cur = hid;

/* ---------- trình phát chung ---------- */
var parsed = null, assetImgs = {}, player = null;
function setAssets(done) { assetImgs = ZER.loadAssets(PR.assets, function () { done && done(); }); }

/* ---------- chế độ chỉ chiếu ---------- */
function startPresent(fromSlide, onExit) {
  var pres = $('pres'), cv = $('pcv'), pp;
  pres.style.display = 'block';
  var proj = ZER.parse(PR.code);
  var imgs = ZER.loadAssets(PR.assets);
  pp = new ZER.Player(cv, proj, imgs);
  try { if (localStorage.getItem('lite') === '1') pp.setQuality(0.75); } catch (e) { }
  pp.go(fromSlide || 0, false); pp.start();
  function rs() { pp.size(); }
  window.addEventListener('resize', rs, false);
  var detach = ZER.attachControls(pres, pp, { fullscreen: function () { ZER.toggleFullscreen(pres); }, exit: exit });
  function exit() {
    pp.stop(); detach(); window.removeEventListener('resize', rs, false); pres.style.display = 'none';
    var d = document; if (d.fullscreenElement || d.webkitFullscreenElement || d.msFullscreenElement) ZER.toggleFullscreen(pres);
    onExit && onExit();
  }
  ZER.toggleFullscreen(pres);
  return pp;
}
if (mode === 'play') {
  document.body.className = 'playonly';
  var hide = ['top', 'left', 'mid', 'right'], hi;
  for (hi = 0; hi < hide.length; hi++) $(hide[hi]).style.display = 'none';
  $('pres').style.display = 'block';
  var pp0 = startPresent(0, function () { location.href = 'index.html'; });
  document.title = PR.name + ' — 2zer011';
  var pl = document.createElement('div');
  pl.style.cssText = 'position:fixed;left:0;right:0;top:40%;text-align:center;z-index:101;color:#fff;font-size:20px;pointer-events:none';
  pl.textContent = ''; document.body.appendChild(pl);
  return;
}

/* ---------- Studio ---------- */
var code = $('code'), hl = $('hl'), gut = $('gut'), cv = $('cv'), SEL = 0, curSlide = 0, over = null;
var HL_KW = /^(project|slide|def|let|for|in|animate|at|camera|step|step)$/;
var TYPES = {}; (function () { var t = ZER.TYPES, i; for (i = 0; i < t.length; i++) TYPES[t[i]] = 1; TYPES.box = 1; })();
function hlLine(s) {
  var e = esc(s);
  return e.replace(/(\/\/.*$)|("[^"]*")|(#[0-9a-fA-F]{3,8}\b)|(\b\d+(?:\.\d+)?(?:s|ms|deg)?\b)|(\b[A-Za-zÀ-ỹ_][\w]*\b)(?=\s*\()|(\b[A-Za-z_][\w]*\b)(?=\s*(?:=|:))|(\b[A-Za-z_][\w]*\b)/g, function (m, c, st, col, num, fn, key, w) {
    if (c) return '<span class="k5">' + c + '</span>';
    if (st) return '<span class="k3">' + st + '</span>';
    if (col) return '<span class="k4">' + col + '</span>';
    if (num) return '<span class="k4">' + num + '</span>';
    if (fn) return '<span class="k6">' + fn + '</span>';
    if (key) { return (HL_KW.test(key) ? '<span class="k1">' : TYPES[key] ? '<span class="k2">' : '<span class="k1">') + key + '</span>'; }
    if (w) { if (HL_KW.test(w)) return '<span class="k1">' + w + '</span>'; if (TYPES[w]) return '<span class="k2">' + w + '</span>'; }
    return m;
  });
}
function paintCode() {
  var lines = code.value.split('\n'), out = [], nums = [], i;
  for (i = 0; i < lines.length; i++) { out.push(hlLine(lines[i])); nums.push(i + 1); }
  hl.innerHTML = out.join('\n') + '\n'; gut.textContent = nums.join('\n');
  syncScroll();
}
function syncScroll() { hl.scrollTop = code.scrollTop; hl.scrollLeft = code.scrollLeft; gut.scrollTop = code.scrollTop; }
code.addEventListener('scroll', syncScroll, false);
function lineStart(n) { var l = code.value.split('\n'), p = 0, i; for (i = 0; i < n - 1 && i < l.length; i++) p += l[i].length + 1; return p; }
function lineEnd(n) { var l = code.value.split('\n'), p = 0, i; for (i = 0; i < n && i < l.length; i++) p += l[i].length + 1; return Math.max(0, p - 1); }
function selectLines(a, b) {
  $('tabs').children[0].click();
  code.focus(); code.setSelectionRange(lineStart(a), lineEnd(b || a));
  code.scrollTop = Math.max(0, (a - 4) * 18); syncScroll();
}
function setCode(v, keepSel) { code.value = v; paintCode(); onEdit(); }
code.addEventListener('keydown', function (e) {
  var v = code.value, s = code.selectionStart, en = code.selectionEnd, ls, ind, pre;
  if (e.keyCode === 9) {
    e.preventDefault(); ls = v.lastIndexOf('\n', s - 1) + 1;
    if (e.shiftKey) { if (v.substr(ls, 4) === '    ') { code.value = v.slice(0, ls) + v.slice(ls + 4); code.setSelectionRange(Math.max(ls, s - 4), Math.max(ls, en - 4)); } }
    else if (s !== en && v.slice(s, en).indexOf('\n') > -1) {
      var blk = v.slice(ls, en).replace(/^/gm, '    '); code.value = v.slice(0, ls) + blk + v.slice(en); code.setSelectionRange(s + 4, ls + blk.length);
    } else { code.value = v.slice(0, s) + '    ' + v.slice(en); code.setSelectionRange(s + 4, s + 4); }
    paintCode(); onEdit();
  } else if (e.keyCode === 13) {
    e.preventDefault(); ls = v.lastIndexOf('\n', s - 1) + 1; pre = v.slice(ls, s); ind = /^\s*/.exec(pre)[0];
    if (/:\s*$/.test(pre)) ind += '    ';
    code.value = v.slice(0, s) + '\n' + ind + v.slice(en); code.setSelectionRange(s + 1 + ind.length, s + 1 + ind.length); paintCode(); onEdit();
  }
}, false);
function insertAtCursor(txt) {
  var s = code.selectionStart, v = code.value;
  code.value = v.slice(0, s) + txt + v.slice(code.selectionEnd); code.setSelectionRange(s + txt.length, s + txt.length); code.focus(); paintCode(); onEdit();
}
code.addEventListener('input', function () { paintCode(); onEdit(); }, false);

/* dán mã từ AI: bỏ hàng rào ``` và dòng ngôn ngữ */
code.addEventListener('paste', function (e) {
  var t = e.clipboardData && e.clipboardData.getData('text'); if (!t || t.indexOf('```') < 0) return;
  e.preventDefault(); t = t.replace(/^[\s\S]*?```[a-z0-9]*\n/i, '').replace(/\n?```[\s\S]*$/, '').replace(/\t/g, '    ');
  insertAtCursor(t);
}, false);
/* ---------- biên dịch + vẽ ---------- */
var eT = 0;
function onEdit() { PR.code = code.value; clearTimeout(eT); eT = setTimeout(function () { recompile(); save(); }, 220); }
function recompile() {
  var keepT = player ? player.t : 0, keepStep = player ? player.step : 0;
  parsed = ZER.parse(PR.code);
  var e = $('errs'), i, h = '';
  for (i = 0; i < parsed.errors.length; i++) h += '<div class="er' + (parsed.errors[i].warn ? ' w' : '') + '" data-l="' + parsed.errors[i].line + '">' + (parsed.errors[i].warn ? '&#9888; ' : '') + 'Dòng ' + parsed.errors[i].line + ': ' + esc(parsed.errors[i].msg) + '</div>';
  e.innerHTML = h || '<div class="ok">Không có lỗi &#10003; (' + parsed.slides.length + ' slide)</div>';
  if (!player) { player = new ZER.Player(cv, parsed, assetImgs); player.pickMode = true; player.onchange = uiUpdate; player.start(); player.onframe = frameUI; }
  player.project = parsed; player.assets = assetImgs;
  if (curSlide >= parsed.slides.length) curSlide = Math.max(0, parsed.slides.length - 1);
  player.cur = curSlide; player.step = Math.min(keepStep, parsed.slides[curSlide] ? parsed.slides[curSlide].maxStep : 0);
  uiUpdate(); thumbs();
  document.title = PR.name + ' — 2zer011 Studio';
}
$('errs').addEventListener('click', function (e) { var l = e.target.getAttribute && e.target.getAttribute('data-l'); if (l) selectLines(+l); }, false);

function uiUpdate() {
  var s = player && player.slide(); curSlide = player ? player.cur : 0;
  $('stepTxt').textContent = s ? ('bước ' + player.step + '/' + s.maxStep) : '';
  var k = $('slist').children, i; for (i = 0; i < k.length; i++) k[i].className = 'sl' + (i === curSlide ? ' on' : '');
}
var lastTxt = '';
function frameUI(p) {
  var t = p.t.toFixed(1) + 's'; if (t !== lastTxt) { lastTxt = t; $('tTxt').textContent = t; }
  var seek = $('tSeek'); if (p.playing && document.activeElement !== seek) seek.value = String(Math.round((p.t % 10) * 100));
}
function thumbs() {
  var L = $('slist'), i, w, c, d, s;
  L.innerHTML = '';
  for (i = 0; i < parsed.slides.length; i++) {
    d = document.createElement('div'); d.className = 'sl' + (i === curSlide ? ' on' : ''); d.setAttribute('data-i', i);
    c = document.createElement('canvas'); c.width = 150; c.height = 84; d.appendChild(c);
    var sp = document.createElement('span'); sp.textContent = (i + 1) + ' ' + parsed.slides[i].name; d.appendChild(sp); L.appendChild(d);
    try { ZER.renderSlide(c.getContext('2d'), 150, 84, parsed.slides[i], parsed, assetImgs, 1, parsed.slides[i].maxStep, [], {}); } catch (e) { }
  }
}
$('slist').addEventListener('click', function (e) {
  var n = e.target; while (n && n !== this && !n.getAttribute('data-i')) n = n.parentNode;
  if (n && n.getAttribute && n.getAttribute('data-i') !== null) { player.go(+n.getAttribute('data-i'), false); over = player.over = null; var s = parsed.slides[curSlide]; if (s) selectLines(s.line, s.line); }
}, false);

/* ---------- thao tác slide bằng cách cắt dòng mã ---------- */
function lines() { return code.value.split('\n'); }
function slideRange(i) { var s = parsed.slides[i]; if (!s) return null; var nx = parsed.slides[i + 1], end = nx ? nx.line - 1 : lines().length; return [s.line, end]; }
function applyLines(arr) { setCode(arr.join('\n')); }
$('sAdd').onclick = function () {
  var l = lines(), n = parsed.slides.length + 1; while (l.length && /^\s*$/.test(l[l.length - 1])) l.pop();
  l.push('', 'slide "Slide ' + n + '":', '    background = #0b1020, #1d2b5a', '    camera:', '        orbit = 0, 10, 10', '    text tieude "Tiêu đề":', '        position = 0, 0, 0', '        size = 1', '        align = center', '        color = #ffffff', '');
  applyLines(l); setTimeout(function () { player.go(parsed.slides.length - 1, false); }, 300);
};
$('sDup').onclick = function () { var r = slideRange(curSlide); if (!r) return; var l = lines(); var blk = l.slice(r[0] - 1, r[1]); while (blk.length && /^\s*$/.test(blk[blk.length - 1])) blk.pop(); l.splice.apply(l, [r[1], 0, ''].concat(blk)); applyLines(l); };
$('sDel').onclick = function () { if (parsed.slides.length < 2) { toast('Phải còn ít nhất 1 slide'); return; } var r = slideRange(curSlide), l = lines(); l.splice(r[0] - 1, r[1] - r[0] + 1); applyLines(l); };
function moveSlide(d) {
  var a = curSlide, b = a + d; if (b < 0 || b >= parsed.slides.length) return;
  var l = lines(), ra = slideRange(a), rb = slideRange(b), lo = a < b ? ra : rb, hi = a < b ? rb : ra;
  var A = l.slice(lo[0] - 1, lo[1]), B = l.slice(hi[0] - 1, hi[1]);
  l.splice.apply(l, [lo[0] - 1, B.length + A.length].concat(B, A)); curSlide = b; applyLines(l); setTimeout(function () { player.go(b, false); }, 300);
}
$('sUp').onclick = function () { moveSlide(-1); }; $('sDn').onclick = function () { moveSlide(1); };

/* ---------- thanh thời gian ---------- */
$('tPlay').onclick = function () { player.setPlaying(!player.playing); this.innerHTML = player.playing ? '&#10073;&#10073;' : '&#9654;'; };
$('tRst').onclick = function () { player.seek(0); player.stepTimes = []; player.step = 0; uiUpdate(); };
$('tSeek').oninput = function () { player.setPlaying(false); $('tPlay').innerHTML = '&#9654;'; player.seek(this.value / 100); };
$('tNext').onclick = function () { var s = player.slide(); if (s && player.step < s.maxStep) { player.step++; player.stepTimes[player.step] = player.t; uiUpdate(); } };
$('tPrev').onclick = function () { if (player.step > 0) { player.step--; uiUpdate(); } };
$('tHome').onclick = function () { over = player.over = null; };

/* ---------- chuột trên khung vẽ: chọn / kéo / xoay ---------- */
function cpos(e) { var r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * cv.width / r.width, (e.clientY - r.top) * cv.height / r.height]; }
function itemAt(e) { var p = cpos(e); return ZER.pick(player.pickItems, p[0], p[1], 8 * cv.width / 960); }
var drag = null;
cv.addEventListener('mousedown', function (e) {
  hideCtx(); if (e.button !== 0) return;
  var it = itemAt(e), p = cpos(e);
  if (it && it.o) { player.selId = it.o.id; drag = { kind: 'obj', o: it.o, sx: p[0], sy: p[1], z: it.z, moved: false }; var o0 = it.o; o0.drag = [0, 0, 0]; }
  else { player.selId = 0; drag = { kind: e.shiftKey ? 'pan' : 'orbit', sx: p[0], sy: p[1] }; if (!player.over) player.over = { az: 0, el: 0, zoom: 1, px: 0, py: 0 }; over = player.over; drag.az = over.az; drag.el = over.el; drag.px = over.px; drag.py = over.py; }
  e.preventDefault();
}, false);
window.addEventListener('mousemove', function (e) {
  if (!drag) return; var p = cpos(e), dx = p[0] - drag.sx, dy = p[1] - drag.sy;
  if (drag.kind === 'obj') {
    var c = player.last && player.last.cam; if (!c) return; if (Math.abs(dx) + Math.abs(dy) > 2) drag.moved = true;
    var k = c.persp ? (-drag.z) / c.focal : 1 / c.oscale;
    drag.o.drag = [(c.r[0] * dx - c.u[0] * dy) * k, (c.r[1] * dx - c.u[1] * dy) * k, (c.r[2] * dx - c.u[2] * dy) * k];
  } else if (drag.kind === 'orbit') { over.az = drag.az - dx * 0.006; over.el = drag.el + dy * 0.006; }
  else { over.px = drag.px + dx; over.py = drag.py + dy; }
}, false);
window.addEventListener('mouseup', function () {
  if (!drag) return; var d = drag; drag = null;
  if (d.kind === 'obj') { if (d.moved) writeMove(d.o, d.o.drag); d.o.drag = null; }
}, false);
cv.addEventListener('wheel', function (e) { e.preventDefault(); if (!player.over) player.over = { az: 0, el: 0, zoom: 1, px: 0, py: 0 }; over = player.over; over.zoom = Math.max(0.1, Math.min(8, over.zoom * (e.deltaY > 0 ? 1.1 : 0.9))); }, false);
cv.addEventListener('dblclick', function () { over = player.over = null; }, false);
function fmt(n) { return String(Math.round(n * 1000) / 1000); }
function writeMove(o, d) {
  var l = lines(), i, start = o.line - 1, end = o.endLine - 1, ind = /^\s*/.exec(l[start])[0] + '    ', m, np, found = false, re;
  function num(s) { return parseFloat(s); }
  for (i = start + 1; i <= end && i < l.length; i++) {
    if ((/^\s*/.exec(l[i])[0]).length !== ind.length) continue;
    re = /^(\s*)(position|pos|coordinates)\s*=\s*(-?[\d.eE+-]+)\s*,\s*(-?[\d.eE+-]+)\s*,\s*(-?[\d.eE+-]+)\s*$/i;
    if ((m = re.exec(l[i]))) { l[i] = m[1] + m[2] + ' = ' + fmt(num(m[3]) + d[0]) + ', ' + fmt(num(m[4]) + d[1]) + ', ' + fmt(num(m[5]) + d[2]); found = true; break; }
    if (/^\s*(position|pos|coordinates)\s*:\s*$/i.test(l[i])) {
      var xyz = { x: -1, y: -1, z: -1 }, j, mm, ok = true;
      for (j = i + 1; j <= end && j < l.length && (/^\s*/.exec(l[j])[0]).length > ind.length; j++) { mm = /^(\s*)([XYZxyz])\s*=\s*(-?[\d.eE+-]+)\s*$/.exec(l[j]); if (mm) xyz[mm[2].toLowerCase()] = j; }
      if (xyz.x < 0 || xyz.y < 0 || xyz.z < 0) { ok = false; }
      if (ok) {
        var ks = ['x', 'y', 'z'], q;
        for (q = 0; q < 3; q++) { mm = /^(\s*)([XYZxyz])\s*=\s*(-?[\d.eE+-]+)\s*$/.exec(l[xyz[ks[q]]]); l[xyz[ks[q]]] = mm[1] + mm[2] + ' = ' + fmt(num(mm[3]) + d[q]); }
        found = true; break;
      }
    }
    if (/^\s*(position|pos|coordinates)\s*=/i.test(l[i])) { toast('Vị trí dùng công thức - hãy sửa bằng tay trong mã'); return; }
  }
  if (!found) {
    if (o.loc && Object.keys && Object.keys(o.loc).length) { toast('Vật sinh từ vòng for - sửa bằng tay trong mã'); return; }
    l.splice(start + 1, 0, ind + 'position = ' + fmt(d[0]) + ', ' + fmt(d[1]) + ', ' + fmt(d[2]));
  }
  setCode(l.join('\n'));
}

/* chuột phải -> mở khung code đúng chỗ */
function hideCtx() { $('ctx').style.display = 'none'; }
cv.addEventListener('contextmenu', function (e) {
  e.preventDefault(); var it = itemAt(e), s = parsed.slides[curSlide], c = $('ctx'), h = '';
  if (it && it.o) {
    player.selId = it.o.id; var o = it.o;
    selectLines(o.line, o.endLine);
    c.innerHTML = '<div data-a="code">Mở mã: ' + esc(o.type + ' ' + (o.named ? o.name : '')) + ' (dòng ' + o.line + ')</div><div data-a="dup">Nhân đôi vật</div><div data-a="del">Xoá vật</div><div data-a="anim">Thêm animation xoay 360°</div>';
    c.__o = o;
  } else {
    if (s) selectLines(s.line, s.line);
    c.innerHTML = '<div data-a="slide">Mở mã slide (dòng ' + (s ? s.line : 1) + ')</div><div data-a="cube">+ Hình khối</div><div data-a="sphere">+ Hình cầu</div><div data-a="text">+ Chữ</div><div data-a="img">+ Nhập ảnh</div>'; c.__o = null;
  }
  c.style.left = Math.min(e.clientX, window.innerWidth - 200) + 'px'; c.style.top = Math.min(e.clientY, window.innerHeight - 160) + 'px'; c.style.display = 'block';
}, false);
$('ctx').addEventListener('click', function (e) {
  var a = e.target.getAttribute && e.target.getAttribute('data-a'), o = this.__o, l = lines(), s = parsed.slides[curSlide], r, ind;
  hideCtx(); if (!a) return;
  if (a === 'del' && o) { l.splice(o.line - 1, o.endLine - o.line + 1); applyLines(l); }
  else if (a === 'dup' && o) { var blk = l.slice(o.line - 1, o.endLine); l.splice.apply(l, [o.endLine, 0].concat(blk)); applyLines(l); }
  else if (a === 'anim' && o) {
    ind = /^\s*/.exec(l[o.line - 1])[0] + '    ';
    l.splice(o.endLine, 0, ind + 'animate this:', ind + '    at 0s:', ind + '        rotate = 0, 0, 0', ind + '    at 6s:', ind + '        rotate = 360, 360, 0', ind + '    loop = 1'); applyLines(l);
  } else if (a === 'cube' || a === 'sphere' || a === 'text') { addObj(a); }
  else if (a === 'img') $('fImg').click();
}, false);
document.addEventListener('mousedown', function (e) { if (!$('ctx').contains(e.target)) hideCtx(); }, false);
function slideEndLine() { var r = slideRange(curSlide), l = lines(), e = r[1]; while (e > r[0] && /^\s*$/.test(l[e - 1])) e--; return e; }
function addObj(t) {
  var l = lines(), e = slideEndLine(), n = Math.floor(Math.random() * 900 + 100), txt;
  if (t === 'cube') txt = ['    cube v' + n + ':', '        position = 0, 0, 0', '        size = 1.5', '        color = #4aa3ff'];
  else if (t === 'sphere') txt = ['    sphere v' + n + ':', '        position = 0, 0, 0', '        radius = 1', '        color = #ffb547'];
  else txt = ['    text c' + n + ' "Chữ mới":', '        position = 0, 0, 0', '        size = 0.7', '        align = center', '        color = #ffffff'];
  l.splice.apply(l, [e, 0].concat(txt)); applyLines(l); setTimeout(function () { selectLines(e + 1, e + txt.length); }, 300);
}

/* ---------- ảnh ---------- */
function safeName(n) { n = n.replace(/\.[^.]*$/, '').toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '') || 'anh'; if (/^\d/.test(n)) n = 'a' + n; var b = n, i = 1; while (PR.assets[n]) n = b + (++i); return n; }
function addImageFile(f) {
  if (!f || !/^image\//.test(f.type)) return;
  var rd = new FileReader(); rd.onload = function () {
    var im = new Image(); im.onload = function () {
      var m = 1280, sc = Math.min(1, m / Math.max(im.width, im.height)), c = document.createElement('canvas'), png = /png|gif|svg/.test(f.type);
      c.width = Math.round(im.width * sc); c.height = Math.round(im.height * sc); var x = c.getContext('2d'); x.drawImage(im, 0, 0, c.width, c.height);
      var url; try { url = png ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', 0.82); } catch (e) { url = rd.result; }
      var name = safeName(f.name || 'anh'); PR.assets[name] = url; save();
      setAssets(function () { renderAssets(); });
      var l = lines(), e = slideEndLine(), blk = ['    image ' + name + ':', '        src = ' + name, '        position = 0, 0, 0', '        w = 4'];
      l.splice.apply(l, [e, 0].concat(blk)); applyLines(l); setTimeout(function () { selectLines(e + 1, e + blk.length); }, 300);
      toast('Đã nhập ảnh "' + name + '"');
    }; im.src = rd.result;
  }; rd.readAsDataURL(f);
}
function addImages(files) { var i; for (i = 0; i < files.length; i++) addImageFile(files[i]); }
$('fImg').onchange = function () { addImages(this.files); this.value = ''; };
$('bAddImg').onclick = function () { $('fImg').click(); };
function renderAssets() {
  var h = '', k, n = 0;
  for (k in PR.assets) { n++; h += '<div class="asset"><img src="' + PR.assets[k] + '"><b>' + esc(k) + '</b><br><a href="#" data-k="' + esc(k) + '" style="color:#ff8e8e">xoá</a></div>'; }
  $('assets').innerHTML = h || '<small>Chưa có ảnh. Dùng trong mã: <code>image: src = ten_anh</code></small>';
}
$('assets').addEventListener('click', function (e) { var k = e.target.getAttribute && e.target.getAttribute('data-k'); if (k) { e.preventDefault(); delete PR.assets[k]; save(); setAssets(); renderAssets(); } }, false);
var dragC = 0;
document.addEventListener('dragenter', function (e) { dragC++; $('drop').style.display = 'block'; e.preventDefault(); }, false);
document.addEventListener('dragleave', function () { if (--dragC <= 0) { dragC = 0; $('drop').style.display = 'none'; } }, false);
document.addEventListener('dragover', function (e) { e.preventDefault(); }, false);
document.addEventListener('drop', function (e) { e.preventDefault(); dragC = 0; $('drop').style.display = 'none'; if (e.dataTransfer && e.dataTransfer.files) addImages(e.dataTransfer.files); }, false);
document.addEventListener('paste', function (e) { var it = e.clipboardData && e.clipboardData.items, i; if (!it) return; for (i = 0; i < it.length; i++) if (it[i].type.indexOf('image') === 0) { addImageFile(it[i].getAsFile()); e.preventDefault(); } }, false);

/* ---------- tab, hàm, mẫu, cú pháp ---------- */
$('tabs').addEventListener('click', function (e) {
  var p = e.target.getAttribute && e.target.getAttribute('data-p'); if (!p) return;
  var b = this.children, i, ps = ['pCode', 'pFn', 'pImg', 'pSmp', 'pSx', 'pAi'];
  for (i = 0; i < b.length; i++) b[i].className = b[i].getAttribute('data-p') === p ? 'on' : '';
  for (i = 0; i < ps.length; i++) $(ps[i]).className = 'pane' + (ps[i] === p ? ' on' : '');
}, false);
function renderFns(q) {
  var d = ZER.DOCS, i, cat = '', h = '', x; q = (q || '').toLowerCase();
  for (i = 0; i < d.length; i++) {
    x = d[i]; if (q && (x.name + ' ' + x.desc + ' ' + x.cat).toLowerCase().indexOf(q) < 0) continue;
    if (x.cat !== cat) { cat = x.cat; h += '<h4>' + esc(cat) + '</h4>'; }
    h += '<div class="fn" data-i="' + i + '"><code>' + esc(x.sig) + '</code><small>' + esc(x.desc) + '</small></div>';
  }
  $('fnl').innerHTML = h || '<small>Không có hàm khớp</small>';
}
$('flt').oninput = function () { renderFns(this.value); };
$('fnl').addEventListener('click', function (e) { var n = e.target; while (n && n !== this && !n.getAttribute('data-i')) n = n.parentNode; if (n && n.getAttribute && n.getAttribute('data-i')) { $('tabs').children[0].click(); insertAtCursor(ZER.DOCS[+n.getAttribute('data-i')].snip); } }, false);
(function () {
  var h = '', k; for (k in ZER.SAMPLES) h += '<div class="fn" data-k="' + k + '"><b>' + esc(ZER.SAMPLES[k].name) + '</b><small>Bấm để mở thành dự án mới</small></div>';
  $('smp').innerHTML = h;
  $('smp').addEventListener('click', function (e) { var n = e.target; while (n && n !== this && !n.getAttribute('data-k')) n = n.parentNode; if (n && n.getAttribute && n.getAttribute('data-k')) { var s = ZER.SAMPLES[n.getAttribute('data-k')]; location.hash = '#edit=' + newProject(s.code, s.name).id; location.reload(); } }, false);
})();
$('sxBody').innerHTML = '<h4>Cấu trúc</h4><pre class="sx">' + esc(
'project:\n    title = "Tên"\n    autoplay = 1        // tự chạy như phim\n\n' +
'def f(a, b) = a * b + 1   // tự định nghĩa hàm\nlet R = 3                // hằng số dùng chung\n\n' +
'slide "Tên slide":\n    background = #000, #123\n    stars = 300   fog = #000, 10, 40\n    duration = 8s   fade_in = 1s   transition = slide, 0.6s\n\n' +
'    camera:\n        orbit = t*10, 20, 12   // góc ngang, góc đứng, khoảng cách\n        fov = 50   roll = 0\n\n' +
'    cube hop:\n        coordinates:\n            X = 1.9473839\n            Y = 8.948267282\n            Z = 9.9382727\n        rotate = t*30, t*45, 0   // xoay 360° mọi hướng\n        scale = 1, 2, 1\n        color = hsl(t*40, 80, 60)\n        reveal = 1    // hiện ở bước bấm 1\n\n' +
'    for i in 0..50:\n        sphere s{i}:\n            position = cosd(i*7)*4, i*0.1, sind(i*7)*4\n\n' +
'    animate hop:\n        at 0s:\n            position = 0, 0, 0\n        at 3s:\n            position = 5, 2, 0\n            ease = inout\n        loop = 1   pingpong = 1') + '</pre>' +
'<h4>Vật thể</h4><pre class="sx">' + esc('cube sphere cylinder cone torus pyramid plane rect circle polygon\nextrude lathe mesh line points particles text label image grid axes group') + '</pre>' +
'<h4>Biến sẵn có</h4><pre class="sx">t / time (giây)  dt  frame  step  i (trong for)</pre>' +
'<h4>Phím</h4><pre class="sx">Chuột phải vào vật = mở mã vật đó\nKéo vật = di chuyển (ghi lại vào mã)\nTrình chiếu: → Space Enter = tiếp, ← = lùi, F toàn màn hình, Esc thoát</pre>';

/* ---------- đặc tả cho AI ---------- */
function fullSpec() {
  var d = ZER.DOCS, i, cat = '', h = '\n\n## Danh sách hàm đầy đủ\n';
  for (i = 0; i < d.length; i++) { if (d[i].cat !== cat) { cat = d[i].cat; h += '\n### ' + cat + '\n'; } h += '- `' + d[i].sig + '` — ' + d[i].desc + '\n'; }
  return __SPEC + h;
}
$('specTxt').textContent = fullSpec();
$('bCopy').onclick = function () {
  var t = $('specTxt'), r;
  try { var ta = document.createElement('textarea'); ta.value = fullSpec(); ta.style.cssText = 'position:fixed;left:-999px;top:0'; document.body.appendChild(ta); ta.select(); r = document.execCommand('copy'); document.body.removeChild(ta); } catch (e) { r = false; }
  if (!r && navigator.clipboard) { navigator.clipboard.writeText(fullSpec()); r = true; }
  toast(r ? 'Đã sao chép đặc tả - dán cho AI' : 'Không sao chép được, hãy bôi đen và Ctrl+C');
};
$('bDlSpec').onclick = function () { download('ZER-AI.md', fullSpec(), 'text/markdown'); };

/* ---------- dự án: mới, xuất, nhập ---------- */
$('pname').value = PR.name; $('pname').onchange = function () { PR.name = this.value || 'Dự án'; save(); document.title = PR.name + ' — 2zer011 Studio'; };
$('bNew').onclick = function () { location.hash = '#edit=new'; location.reload(); };
$('bLib').onclick = function () { save(); location.href = 'index.html'; };
$('bPlay').onclick = function () { save(); var pp = startPresent(curSlide, function () { pp = null; }); };
function download(name, text, type) {
  var b = new Blob([text], { type: type || 'text/plain' });
  if (navigator.msSaveBlob) { navigator.msSaveBlob(b, name); return; }
  var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { document.body.removeChild(a); }, 500);
}
function fname() { return (PR.name || 'du-an').replace(/[^\w\-]+/g, '_'); }
$('bExp').onclick = function () { download(fname() + '.zer.json', JSON.stringify({ zer: 1, name: PR.name, code: PR.code, assets: PR.assets }), 'application/json'); };
$('bImp').onclick = function () { $('fJson').click(); };
$('fJson').onchange = function () {
  var f = this.files[0]; if (!f) return; var rd = new FileReader();
  rd.onload = function () { try { var o = JSON.parse(rd.result); var p = newProject(o.code || '', o.name || 'Đã nhập', o.assets || {}); save(); location.hash = '#edit=' + p.id; location.reload(); } catch (e) { toast('File không hợp lệ'); } };
  rd.readAsText(f); this.value = '';
};
$('bExpHtml').onclick = function () {
  var rt = $('zer-runtime').textContent, data = JSON.stringify({ code: PR.code, assets: PR.assets }).replace(/</g, '\\u003c');
  var boot = '(function(){var D=' + data + ';var cv=document.getElementById("c");var pr=ZER.parse(D.code);var im=ZER.loadAssets(D.assets,function(){});var p=new ZER.Player(cv,pr,im);p.start();' +
    'window.addEventListener("resize",function(){p.size();},false);ZER.attachControls(document.body,p,{fullscreen:function(){ZER.toggleFullscreen(document.documentElement);}});})();';
  var html = '<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + esc(PR.name) + '</title><style>html,body{margin:0;height:100%;background:#000;overflow:hidden}#c{position:absolute;left:0;top:0;width:100%;height:100%}</style></head><body><canvas id="c"></canvas><script>' + rt.replace(/<\/script/g, '<\\/script') + '<\/script><script>' + boot + '<\/script></body></html>';
  download(fname() + '.html', html, 'text/html');
};
window.addEventListener('resize', function () { if (player) player.size(); }, false);
window.addEventListener('beforeunload', function () { save(); }, false);

/* ---------- khởi động ---------- */
code.value = PR.code; paintCode(); renderFns(''); renderAssets();
setAssets(function () { recompile(); });
recompile();
})();
