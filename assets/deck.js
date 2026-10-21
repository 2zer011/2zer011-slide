/* 2zer011 slide - engine ES5 (chạy trên IE11 / Chrome 49+ / Firefox 52+).
   Slide: <section class="slide [dark]" data-by="chữ chân trang" data-anim="tên">
   .s = hiện khi vào slide, .b = hiện từng bước theo mỗi lần bấm.
   Animation: Deck.anims.tên = {start:function(slideEl){}, stop:function(slideEl){}} */
(function () {
  var d = document, w = window;
  var Deck = w.Deck = { anims: {}, version: 1 };
  var _raf = w.requestAnimationFrame || w.webkitRequestAnimationFrame || w.mozRequestAnimationFrame || w.msRequestAnimationFrame;
  var _caf = w.cancelAnimationFrame || w.webkitCancelAnimationFrame || w.mozCancelAnimationFrame || w.msCancelAnimationFrame;
  // gọi qua window, không gọi như method của Deck (sẽ lỗi "Illegal invocation")
  Deck.raf = function (f) { return _raf ? _raf.call(w, f) : setTimeout(function () { f(new Date().getTime()); }, 33); };
  Deck.caf = function (id) { if (_raf && _caf) _caf.call(w, id); else clearTimeout(id); };

  function cn(e) { return e.getAttribute('class') || ''; }
  function has(e, c) { return (' ' + cn(e) + ' ').indexOf(' ' + c + ' ') > -1; }
  function add(e, c) { if (!has(e, c)) e.setAttribute('class', cn(e) ? cn(e) + ' ' + c : c); }
  function rem(e, c) { e.setAttribute('class', (' ' + cn(e) + ' ').replace(' ' + c + ' ', ' ').replace(/^\s+|\s+$/g, '')); }
  function arr(l) { var a = [], i; for (i = 0; i < l.length; i++) a.push(l[i]); return a; }
  Deck.has = has; Deck.add = add; Deck.rem = rem; Deck.arr = arr;

  function init() {
    var stage = d.getElementById('stage'), slides = arr(d.querySelectorAll('.slide')), N = slides.length, cur = -1, k;
    // chrome
    var foot = d.createElement('div'); foot.id = 'foot';
    foot.innerHTML = '<span id="fl"></span><span id="fr"></span>'; stage.appendChild(foot);
    var bar = d.createElement('div'); bar.id = 'bar'; stage.appendChild(bar);
    var fl = d.getElementById('fl'), fr = d.getElementById('fr');
    var title = d.title.replace(/\s*[·|–-]\s*2zer011 slide$/, '');

    function fit() {
      var W = w.innerWidth || d.documentElement.clientWidth, H = w.innerHeight || d.documentElement.clientHeight;
      var s = Math.min(W / 1920, H / 1080);
      var t = 'translate(' + ((W - 1920 * s) / 2) + 'px,' + ((H - 1080 * s) / 2) + 'px) scale(' + s + ')';
      stage.style.webkitTransform = t; stage.style.msTransform = t; stage.style.transform = t;
    }
    w.addEventListener('resize', fit, false); fit();

    function steps(s) { return s.querySelectorAll('.b'); }
    function runAnim(s, on) {
      var n = s.getAttribute('data-anim'), a = n && Deck.anims[n];
      if (a) { try { on ? a.start(s) : a.stop(s); } catch (e) {} }
    }
    function go(i, showAll) {
      i = Math.max(0, Math.min(N - 1, i));
      if (cur > -1 && cur !== i) runAnim(slides[cur], false);
      var j, s, b;
      for (j = 0; j < N; j++) { if (j === i) add(slides[j], 'active'); else rem(slides[j], 'active'); }
      s = slides[i]; b = steps(s); s._n = 0;
      for (j = 0; j < b.length; j++) { if (showAll) add(b[j], 'on'); else rem(b[j], 'on'); }
      if (showAll) s._n = b.length;
      if (cur !== i) runAnim(s, true);
      cur = i;
      if (has(s, 'dark')) add(stage, 'isdark'); else rem(stage, 'isdark');
      if (s.getAttribute('data-nofoot') !== null) add(stage, 'nofoot'); else rem(stage, 'nofoot');
      fl.innerHTML = s.getAttribute('data-by') || title;
      fr.innerHTML = (i + 1) + ' / ' + N;
      bar.style.width = ((i + 1) / N * 100) + '%';
      try { history.replaceState(null, '', '#' + (i + 1)); } catch (e) {}
    }
    var lk = 0;
    function ok() { var n = new Date().getTime(); if (n - lk < 200) return false; lk = n; return true; }
    function next() {
      if (!ok()) return; var s = slides[cur], b = steps(s);
      if (s._n < b.length) { add(b[s._n], 'on'); s._n++; } else if (cur < N - 1) go(cur + 1, false);
    }
    function prev() {
      if (!ok()) return; var s = slides[cur], b = steps(s);
      if (s._n > 0) { s._n--; rem(b[s._n], 'on'); } else if (cur > 0) go(cur - 1, true);
    }
    function fs() {
      var e = d.documentElement;
      if (!(d.fullscreenElement || d.webkitFullscreenElement || d.mozFullScreenElement || d.msFullscreenElement)) {
        var f = e.requestFullscreen || e.webkitRequestFullscreen || e.mozRequestFullScreen || e.msRequestFullscreen;
        if (f) { try { f.call(e); } catch (x) {} }
      } else {
        var g = d.exitFullscreen || d.webkitExitFullscreen || d.mozCancelFullScreen || d.msExitFullscreen;
        if (g) { try { g.call(d); } catch (x) {} }
      }
    }
    Deck.go = go; Deck.next = next; Deck.prev = prev;

    d.addEventListener('keydown', function (e) {
      var c = e.keyCode || e.which;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (c === 39 || c === 40 || c === 34 || c === 32 || c === 13 || c === 78) { e.preventDefault(); next(); }
      else if (c === 37 || c === 38 || c === 33 || c === 8 || c === 80) { e.preventDefault(); prev(); }
      else if (c === 36) { e.preventDefault(); go(0, false); }
      else if (c === 35) { e.preventDefault(); go(N - 1, true); }
      else if (c === 70) { e.preventDefault(); fs(); }
    }, false);

    var wl = 0;
    w.addEventListener('wheel', function (e) {
      e.preventDefault(); var t = new Date().getTime(), fresh = t - wl > 320; wl = t;
      if (fresh && Math.abs(e.deltaY) >= 4) { if (e.deltaY > 0) next(); else prev(); }
    }, false);
    var tt = 0;
    d.addEventListener('click', function () { if (new Date().getTime() - tt < 600) return; next(); }, false);
    d.addEventListener('contextmenu', function (e) { e.preventDefault(); prev(); }, false);
    var tx = null;
    d.addEventListener('touchstart', function (e) { tx = e.touches[0].clientX; }, false);
    d.addEventListener('touchend', function (e) {
      if (tx === null) return; var dx = e.changedTouches[0].clientX - tx; tx = null;
      if (Math.abs(dx) > 40) { tt = new Date().getTime(); if (dx < 0) next(); else prev(); }
    }, false);
    var it;
    function wake() { rem(d.body, 'idle'); clearTimeout(it); it = setTimeout(function () { add(d.body, 'idle'); }, 2200); }
    d.addEventListener('mousemove', wake, false); wake();
    var fe = ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'];
    for (k = 0; k < fe.length; k++) d.addEventListener(fe[k], fit, false);

    var h = parseInt((w.location.hash || '').slice(1), 10);
    go(isNaN(h) ? 0 : h - 1, false);
  }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', init, false); else init();
})();
