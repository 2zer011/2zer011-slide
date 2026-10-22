/* ============================================================================
   zer - phần 3: trình phát (slide, bước, chuyển cảnh, tự chạy, điều khiển)
   ========================================================================== */
var raf = (function () {
  var w = typeof window !== 'undefined' ? window : null;
  var f = w && (w.requestAnimationFrame || w.webkitRequestAnimationFrame || w.mozRequestAnimationFrame || w.msRequestAnimationFrame);
  return function (cb) { return f ? f.call(w, cb) : setTimeout(function () { cb(new Date().getTime()); }, 16); };
})();
function now() { return (typeof performance !== 'undefined' && performance.now) ? performance.now() : new Date().getTime(); }

ZER.loadAssets = function (assets, done) {
  var out = {}, k, left = 0, fin = false;
  function chk() { if (!fin && left <= 0) { fin = true; done && done(out); } }
  for (k in assets) if (hasOwn(assets, k)) {
    left++;
    (function (name) {
      var im = new Image();
      im.onload = im.onerror = function () { left--; chk(); };
      im.src = assets[name]; out[name] = im;
    })(k);
  }
  chk(); return out;
};

function Player(canvas, project, assets) {
  this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.project = project; this.assets = assets || {};
  this.cur = 0; this.step = 0; this.t = 0; this.t0 = now(); this.playing = true; this.frame = 0; this.q = 1; this.stepTimes = [];
  this.trans = null; this.over = null; this.selId = 0; this.pickItems = null; this.last = null; this.onchange = null; this.onframe = null; this.drawOnly = false;
  this.autoplay = !!(project.props && project.props.autoplay && truthy(project.props.autoplay({ t: 0, vars: {}, uf: project.uf, depth: 0 })));
  this.off1 = document.createElement('canvas'); this.off2 = document.createElement('canvas'); this.running = false; this.lastT = now(); this.autoAt = 0; this.pickMode = false;
  this.size();
}
ZER.Player = Player;
Player.prototype.slide = function () { return this.project.slides[this.cur]; };
Player.prototype.size = function () {
  var c = this.canvas, w = c.clientWidth || c.width, h = c.clientHeight || c.height, q = this.q, dpr = Math.min(window.devicePixelRatio || 1, 2) * q;
  var W = Math.max(2, Math.round(w * dpr)), H = Math.max(2, Math.round(h * dpr));
  if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
  this.W = c.width; this.H = c.height;
};
Player.prototype.setQuality = function (q) { this.q = q; this.size(); };
Player.prototype.reset = function () { this.t = 0; this.t0 = now(); this.step = 0; this.stepTimes = []; this.autoAt = 0; };
Player.prototype.go = function (i, withTrans) {
  var P = this.project, n = P.slides.length;
  if (!n) return; i = Math.max(0, Math.min(n - 1, i));
  if (i === this.cur) return;
  if (withTrans !== false) this.startTrans(i);
  this.cur = i; this.reset(); if (this.onchange) this.onchange(this);
};
Player.prototype.startTrans = function (to) {
  var s = this.project.slides[to], kind = 'fade', env = { t: 0, vars: {}, uf: this.project.uf, depth: 0 }, d = 0.6;
  if (s.props.transition) { try { var v = s.props.transition(env); if (isArr(v)) { kind = String(v[0]); d = N(v[1]) || d; } else kind = String(v); } catch (e) { } }
  kind = kind.toLowerCase(); if (kind === 'none' || !this.drawOnly === false && false) return;
  if (kind === 'none') return;
  var o = this.off1; o.width = this.W; o.height = this.H; o.getContext('2d').drawImage(this.canvas, 0, 0);
  this.trans = { kind: kind, d: d, t0: now(), dir: to >= this.cur ? 1 : -1 };
};
Player.prototype.next = function () {
  var s = this.slide(); if (!s) return;
  if (this.step < s.maxStep) { this.step++; this.stepTimes[this.step] = this.t; this.autoAt = this.t; if (this.onchange) this.onchange(this); }
  else if (this.cur < this.project.slides.length - 1) this.go(this.cur + 1);
};
Player.prototype.prev = function () {
  if (this.step > 0) { this.step--; if (this.onchange) this.onchange(this); }
  else if (this.cur > 0) { this.go(this.cur - 1); var s = this.slide(); this.step = s.maxStep; }
};
Player.prototype.seek = function (t) { this.t = Math.max(0, t); this.t0 = now() - this.t * 1000; };
Player.prototype.setPlaying = function (p) { this.playing = p; this.t0 = now() - this.t * 1000; };
Player.prototype.render = function (ctx, canvasW, canvasH, forceT) {
  var s = this.slide(); if (!s) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, canvasW, canvasH); return null; }
  var r = ZER.renderSlide(ctx, canvasW, canvasH, s, this.project, this.assets, forceT === undefined ? this.t : forceT, this.step, this.stepTimes,
    { dt: 0.016, frame: this.frame, over: this.over, selId: this.selId, pick: this.pickMode });
  return r;
};
Player.prototype.tick = function () {
  var n = now();
  if (this.playing) this.t = (n - this.t0) / 1000; else this.t0 = n - this.t * 1000;
  this.frame++;
  var s = this.slide();
  if (s && this.autoplay && this.playing) {
    var dur = 0, e = { t: 0, vars: {}, uf: this.project.uf, depth: 0 };
    if (s.props.duration) { try { dur = N(s.props.duration(e)); } catch (x) { } }
    if (dur > 0 && this.t >= dur && this.cur < this.project.slides.length - 1) this.go(this.cur + 1);
  }
  var r = this.render(this.ctx, this.W, this.H);
  if (r) { this.last = r; this.pickItems = r.items; }
  if (this.trans) {
    var k = (n - this.trans.t0) / (this.trans.d * 1000), ctx = this.ctx, W = this.W, H = this.H, kd = this.trans.kind;
    if (k >= 1) this.trans = null;
    else {
      var e2 = k * k * (3 - 2 * k), o = this.off1, dir = this.trans.dir;
      if (!this.off2.width || this.off2.width !== W) { this.off2.width = W; this.off2.height = H; }
      ctx.save();
      if (kd === 'slide') { ctx.drawImage(o, -W * e2 * dir, 0); ctx.globalAlpha = 1; var tmp = this.off2, tc = tmp.getContext('2d'); tc.clearRect(0, 0, W, H); tc.drawImage(this.canvas, 0, 0); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.drawImage(o, -W * e2 * dir, 0); ctx.drawImage(tmp, W * (1 - e2) * dir, 0); }
      else if (kd === 'zoom') { var tmp2 = this.off2, tc2 = tmp2.getContext('2d'); tc2.clearRect(0, 0, W, H); tc2.drawImage(this.canvas, 0, 0); ctx.globalAlpha = 1; ctx.drawImage(o, 0, 0); var sc = 0.6 + 0.4 * e2; ctx.globalAlpha = e2; ctx.drawImage(tmp2, W * (1 - sc) / 2, H * (1 - sc) / 2, W * sc, H * sc); }
      else { ctx.globalAlpha = 1 - e2; ctx.drawImage(o, 0, 0); }
      ctx.restore(); ctx.globalAlpha = 1;
    }
  }
  if (this.onframe) this.onframe(this);
};
Player.prototype.start = function () {
  if (this.running) return; this.running = true; var self = this;
  (function loop() { if (!self.running) return; try { self.tick(); } catch (e) { if (self.onerror) self.onerror(e); } raf(loop); })();
};
Player.prototype.stop = function () { this.running = false; };

/* điều khiển bàn phím / chuột / cảm ứng cho chế độ trình chiếu */
ZER.attachControls = function (el, player, opts) {
  opts = opts || {};
  var idle = 0, hideT, sx = 0, sy = 0, st = 0, off = [];
  function on(t, ev, f) { t.addEventListener(ev, f, false); off.push(function () { t.removeEventListener(ev, f, false); }); }
  function wake() { el.style.cursor = 'default'; clearTimeout(hideT); hideT = setTimeout(function () { el.style.cursor = 'none'; }, 2200); }
  on(document, 'keydown', function (e) {
    var k = e.keyCode, used = true;
    if (k === 39 || k === 32 || k === 40 || k === 13 || k === 34 || k === 78) player.next();
    else if (k === 37 || k === 38 || k === 33 || k === 8 || k === 80) player.prev();
    else if (k === 36) player.go(0);
    else if (k === 35) player.go(player.project.slides.length - 1);
    else if (k === 70) { opts.fullscreen && opts.fullscreen(); }
    else if (k === 27) { opts.exit && opts.exit(); }
    else used = false;
    if (used) { e.preventDefault(); }
  });
  on(el, 'click', function () { if (!opts.noClick) player.next(); });
  on(el, 'contextmenu', function (e) { e.preventDefault(); player.prev(); });
  on(el, 'mousemove', wake);
  on(el, 'wheel', function (e) { e.preventDefault(); if (e.deltaY > 0) player.next(); else if (e.deltaY < 0) player.prev(); });
  on(el, 'touchstart', function (e) { var t = e.touches[0]; sx = t.clientX; sy = t.clientY; st = now(); });
  on(el, 'touchend', function (e) {
    var t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) { if (dx < 0) player.next(); else player.prev(); e.preventDefault(); }
  });
  wake();
  return function () { for (var i = 0; i < off.length; i++) off[i](); clearTimeout(hideT); };
};
ZER.toggleFullscreen = function (el) {
  var d = document, fs = d.fullscreenElement || d.webkitFullscreenElement || d.mozFullScreenElement || d.msFullscreenElement;
  try {
    var r;
    if (fs) { r = (d.exitFullscreen || d.webkitExitFullscreen || d.mozCancelFullScreen || d.msExitFullscreen).call(d); }
    else { var f = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen; if (f) r = f.call(el); }
    if (r && r.catch) r.catch(function () { });
  } catch (e) { }
};
ZER.compile = function (src) { return ZER.parse(src); };
