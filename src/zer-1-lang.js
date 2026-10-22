/* ============================================================================
   zer - ngôn ngữ của 2zer011 (phần 1: tiện ích, thư viện hàm, parser)
   ES5 thuần để chạy trên trình duyệt cũ. Không phụ thuộc DOM (trừ tra màu CSS lạ).
   ========================================================================== */
(function (root) {
'use strict';
var ZER = root.ZER = { version: 1 };
var PI = Math.PI, TAU = PI * 2;

function hasOwn(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
function isArr(v) { return Object.prototype.toString.call(v) === '[object Array]'; }
function ZError(msg, line) { var e = new Error(msg); e.zline = line; return e; }
function N(v) {
  if (typeof v === 'number') return isNaN(v) ? 0 : v;
  if (typeof v === 'string') { var f = parseFloat(v); return isNaN(f) ? 0 : f; }
  if (isArr(v)) return N(v[0]);
  return v ? 1 : 0;
}
function truthy(v) {
  if (typeof v === 'number') return v !== 0;
  if (typeof v === 'string') { var s = v.toLowerCase(); return !(s === '' || s === 'no' || s === 'false' || s === 'off' || s === '0' || s === 'không'); }
  if (isArr(v)) return true;
  return !!v;
}
function clamp(x, a, b) { return x < a ? a : (x > b ? b : x); }
function V3(v, d) {            // đưa mọi thứ về vector 3 số; thiếu thì lấy từ d
  d = d || [0, 0, 0];
  if (isArr(v)) {
    var r = [], i;
    for (i = 0; i < 3; i++) r.push((v[i] === null || v[i] === undefined) ? d[i] : N(v[i]));
    return r;
  }
  if (v === null || v === undefined) return [d[0], d[1], d[2]];
  var n = N(v); return [n, n, n];
}
ZER._u = { N: N, V3: V3, truthy: truthy, isArr: isArr, hasOwn: hasOwn, clamp: clamp };

/* ---------- màu ---------- */
var NAMED = { red: '#ff3b30', green: '#34c759', blue: '#0a84ff', white: '#ffffff', black: '#000000', yellow: '#ffd60a', orange: '#ff9f0a',
  purple: '#af52de', pink: '#ff6fa5', cyan: '#32d4ff', gray: '#8e8e93', grey: '#8e8e93', gold: '#e3b866', silver: '#c0c0c0', brown: '#8b5a2b',
  teal: '#30b0c7', navy: '#1b2a5c', lime: '#a4e000', magenta: '#ff2bd6', transparent: 'rgba(0,0,0,0)', sky: '#6cb6ff', mint: '#7ee0c3',
  coral: '#ff7a90', cream: '#f5eddc', ink: '#2a1c1c', maroon: '#800000', indigo: '#4b0082', violet: '#8a2be2', crimson: '#dc143c', olive: '#808000', skyblue: '#87ceeb', tomato: '#ff6347', salmon: '#fa8072', orchid: '#da70d6', plum: '#dda0dd', khaki: '#f0e68c', beige: '#f5f5dc', ivory: '#fffff0', lavender: '#e6e6fa', turquoise: '#40e0d0', aqua: '#00ffff', chocolate: '#d2691e', firebrick: '#b22222', darkred: '#8b0000', darkblue: '#00008b', darkgreen: '#006400', lightblue: '#add8e6', lightgreen: '#90ee90', lightgray: '#d3d3d3', lightgrey: '#d3d3d3', darkgray: '#a9a9a9', darkgrey: '#a9a9a9', steelblue: '#4682b4', royalblue: '#4169e1', slateblue: '#6a5acd', hotpink: '#ff69b4', deeppink: '#ff1493', orangered: '#ff4500', goldenrod: '#daa520', forestgreen: '#228b22', seagreen: '#2e8b57', springgreen: '#00ff7f', chartreuse: '#7fff00', tan: '#d2b48c', sienna: '#a0522d', peru: '#cd853f', wheat: '#f5deb3', snow: '#fffafa', azure: '#f0ffff', midnightblue: '#191970', dodgerblue: '#1e90ff', cornflowerblue: '#6495ed', darkorange: '#ff8c00', crimson2: '#dc143c', rose: '#ff3d7f', amber: '#ffbf00', emerald: '#50c878', ruby: '#e0115f', sapphire: '#0f52ba' };
var colorCache = {};
function hex2(n) { n = Math.round(clamp(n, 0, 255)); return (n < 16 ? '0' : '') + n.toString(16); }
function parseColor(s) {
  if (isArr(s)) return [N(s[0]), N(s[1]), N(s[2]), s.length > 3 ? N(s[3]) : 1];
  s = String(s);
  var c = colorCache[s]; if (c) return c;
  var m, r = null, low = s.toLowerCase();
  if (hasOwn(NAMED, low)) { r = parseColor(NAMED[low]); }
  else if ((m = /^#([0-9a-f]{3,8})$/.exec(low))) {
    var h = m[1];
    if (h.length === 3 || h.length === 4) { var t = ''; for (var i = 0; i < h.length; i++) t += h.charAt(i) + h.charAt(i); h = t; }
    if (h.length === 6 || h.length === 8) r = [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16), h.length === 8 ? parseInt(h.substr(6, 2), 16) / 255 : 1];
  } else if ((m = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/.exec(low))) {
    r = [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]];
  } else if (root.document) {
    try { var cv = root.document.createElement('canvas').getContext('2d'); cv.fillStyle = '#010203'; cv.fillStyle = s; var f = cv.fillStyle; if (f !== '#010203') return (colorCache[s] = parseColor(f)); } catch (e) {}
  }
  if (!r) r = [128, 128, 128, 1];
  colorCache[s] = r; return r;
}
function css(c, k) {             // [r,g,b,a] -> chuỗi css, k = hệ số sáng
  k = k === undefined ? 1 : k;
  var a = c[3] === undefined ? 1 : c[3];
  return 'rgba(' + Math.round(clamp(c[0] * k, 0, 255)) + ',' + Math.round(clamp(c[1] * k, 0, 255)) + ',' + Math.round(clamp(c[2] * k, 0, 255)) + ',' + (Math.round(a * 1000) / 1000) + ')';
}
function mixRGBA(a, b, k) { return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k, (a[3] === undefined ? 1 : a[3]) + ((b[3] === undefined ? 1 : b[3]) - (a[3] === undefined ? 1 : a[3])) * k]; }
function isColorStr(s) { return typeof s === 'string' && (/^#[0-9a-fA-F]{3,8}$/.test(s) || /^(rgb|hsl)a?\(/i.test(s) || hasOwn(NAMED, s.toLowerCase())); }
function hsl2rgb(h, s, l) {
  h = ((h % 360) + 360) % 360 / 360; s = clamp(s / 100, 0, 1); l = clamp(l / 100, 0, 1);
  function f(p, q, t) { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1 / 6) return p + (q - p) * 6 * t; if (t < 1 / 2) return q; if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6; return p; }
  if (s === 0) return [l * 255, l * 255, l * 255];
  var q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  return [f(p, q, h + 1 / 3) * 255, f(p, q, h) * 255, f(p, q, h - 1 / 3) * 255];
}
ZER._color = { parse: parseColor, css: css, mix: mixRGBA, isColorStr: isColorStr };

/* ---------- easing ---------- */
function bounceOut(x) { var n1 = 7.5625, d1 = 2.75; if (x < 1 / d1) return n1 * x * x; if (x < 2 / d1) return n1 * (x -= 1.5 / d1) * x + 0.75; if (x < 2.5 / d1) return n1 * (x -= 2.25 / d1) * x + 0.9375; return n1 * (x -= 2.625 / d1) * x + 0.984375; }
var C1 = 1.70158, C3 = C1 + 1;
var EASE = {
  linear: function (x) { return x; },
  smooth: function (x) { return x * x * (3 - 2 * x); },
  'in': function (x) { return x * x; }, out: function (x) { return 1 - (1 - x) * (1 - x); },
  inout: function (x) { return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; },
  cubicin: function (x) { return x * x * x; }, cubicout: function (x) { return 1 - Math.pow(1 - x, 3); },
  cubicinout: function (x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; },
  expoin: function (x) { return x === 0 ? 0 : Math.pow(2, 10 * x - 10); }, expoout: function (x) { return x === 1 ? 1 : 1 - Math.pow(2, -10 * x); },
  expoinout: function (x) { return x === 0 ? 0 : x === 1 ? 1 : x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2; },
  sinein: function (x) { return 1 - Math.cos(x * PI / 2); }, sineout: function (x) { return Math.sin(x * PI / 2); }, sineinout: function (x) { return -(Math.cos(PI * x) - 1) / 2; },
  backin: function (x) { return C3 * x * x * x - C1 * x * x; }, backout: function (x) { return 1 + C3 * Math.pow(x - 1, 3) + C1 * Math.pow(x - 1, 2); },
  backinout: function (x) { var c2 = C1 * 1.525; return x < 0.5 ? (Math.pow(2 * x, 2) * ((c2 + 1) * 2 * x - c2)) / 2 : (Math.pow(2 * x - 2, 2) * ((c2 + 1) * (x * 2 - 2) + c2) + 2) / 2; },
  elasticout: function (x) { return x === 0 ? 0 : x === 1 ? 1 : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * (TAU / 3)) + 1; },
  elasticin: function (x) { return x === 0 ? 0 : x === 1 ? 1 : -Math.pow(2, 10 * x - 10) * Math.sin((x * 10 - 10.75) * (TAU / 3)); },
  bounceout: bounceOut, bouncein: function (x) { return 1 - bounceOut(1 - x); }
};
function easeFn(name) {
  var k = String(name === undefined || name === null ? 'linear' : name).toLowerCase().replace(/[^a-z]/g, '').replace(/^ease/, '');
  return EASE[k] || EASE.linear;
}
ZER._easeNames = (function () { var a = [], k; for (k in EASE) a.push(k); return a; })();

function lerpAny(a, b, k) {
  if (isArr(a) || isArr(b)) {
    var aa = isArr(a), ba = isArr(b), n = Math.max(aa ? a.length : 1, ba ? b.length : 1), r = [], i;
    for (i = 0; i < n; i++) r.push(lerpAny(aa ? a[i] : a, ba ? b[i] : b, k));
    return r;
  }
  if (typeof a === 'string' && typeof b === 'string') {
    if (isColorStr(a) && isColorStr(b)) return css(mixRGBA(parseColor(a), parseColor(b), k));
    return k < 1 ? a : b;
  }
  if (a === null || a === undefined) return b;
  if (b === null || b === undefined) return a;
  a = N(a); b = N(b); return a + (b - a) * k;
}

/* ---------- ngẫu nhiên / noise ---------- */
function hash(n) { n = Math.sin(n * 127.1 + 311.7) * 43758.5453123; return n - Math.floor(n); }
function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
function vnoise(x, y, z) {
  var xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = x - xi, yf = y - yi, zf = z - zi,
    u = fade(xf), v = fade(yf), w = fade(zf);
  function h(i, j, k) { return hash(xi + i + (yi + j) * 57.0 + (zi + k) * 113.0 + 0.5); }
  function l(a, b, t) { return a + (b - a) * t; }
  return l(l(l(h(0, 0, 0), h(1, 0, 0), u), l(h(0, 1, 0), h(1, 1, 0), u), v), l(l(h(0, 0, 1), h(1, 0, 1), u), l(h(0, 1, 1), h(1, 1, 1), u), v), w);
}

/* ---------- thư viện hàm ---------- */
var F = {}, DOCS = [];
function def(cat, name, sig, desc, fn, snip) { F[name] = fn; DOCS.push({ cat: cat, name: name, sig: sig, desc: desc, snip: snip || sig }); }
function un(fn) { return function (x) { if (isArr(x)) { var r = [], i; for (i = 0; i < x.length; i++) r.push(un(fn)(x[i])); return r; } return fn(N(x)); }; }
function mod(a, b) { return ((a % b) + b) % b; }
function saw(x) { return x - Math.floor(x); }
function pts(a) { return isArr(a) ? a : []; }
function vec(a) { return V3(a); }

/* Toán */
var MATH1 = [['abs', Math.abs, 'giá trị tuyệt đối'], ['floor', Math.floor, 'làm tròn xuống'], ['ceil', Math.ceil, 'làm tròn lên'], ['round', Math.round, 'làm tròn gần nhất'],
  ['trunc', function (x) { return x < 0 ? Math.ceil(x) : Math.floor(x); }, 'bỏ phần thập phân'], ['fract', function (x) { return x - Math.floor(x); }, 'phần thập phân'],
  ['sign', function (x) { return x > 0 ? 1 : x < 0 ? -1 : 0; }, 'dấu: -1, 0, 1'], ['sqrt', function (x) { return Math.sqrt(Math.max(0, x)); }, 'căn bậc hai'], ['cbrt', function (x) { return x < 0 ? -Math.pow(-x, 1 / 3) : Math.pow(x, 1 / 3); }, 'căn bậc ba'],
  ['exp', Math.exp, 'e mũ x'], ['log', function (x) { return Math.log(Math.max(1e-12, x)); }, 'logarit tự nhiên'], ['log2', function (x) { return Math.log(Math.max(1e-12, x)) / Math.LN2; }, 'logarit cơ số 2'], ['log10', function (x) { return Math.log(Math.max(1e-12, x)) / Math.LN10; }, 'logarit cơ số 10'],
  ['sin', Math.sin, 'sin (radian)'], ['cos', Math.cos, 'cos (radian)'], ['tan', Math.tan, 'tan (radian)'], ['asin', function (x) { return Math.asin(clamp(x, -1, 1)); }, 'arcsin'], ['acos', function (x) { return Math.acos(clamp(x, -1, 1)); }, 'arccos'], ['atan', Math.atan, 'arctan'],
  ['sinh', function (x) { return (Math.exp(x) - Math.exp(-x)) / 2; }, 'sinh'], ['cosh', function (x) { return (Math.exp(x) + Math.exp(-x)) / 2; }, 'cosh'], ['tanh', function (x) { var a = Math.exp(x), b = Math.exp(-x); return (a - b) / (a + b); }, 'tanh'],
  ['sind', function (x) { return Math.sin(x * PI / 180); }, 'sin theo ĐỘ'], ['cosd', function (x) { return Math.cos(x * PI / 180); }, 'cos theo ĐỘ'], ['tand', function (x) { return Math.tan(x * PI / 180); }, 'tan theo ĐỘ'],
  ['deg', function (x) { return x * 180 / PI; }, 'radian sang độ'], ['rad', function (x) { return x * PI / 180; }, 'độ sang radian'], ['sq', function (x) { return x * x; }, 'bình phương'], ['neg', function (x) { return -x; }, 'đổi dấu']];
(function () { var i; for (i = 0; i < MATH1.length; i++) def('Toán', MATH1[i][0], MATH1[i][0] + '(x)', MATH1[i][2], un(MATH1[i][1])); })();
def('Toán', 'pow', 'pow(a, b)', 'a mũ b', function (a, b) { return Math.pow(N(a), N(b)); });
def('Toán', 'atan2', 'atan2(y, x)', 'góc của vector (radian)', function (y, x) { return Math.atan2(N(y), N(x)); });
def('Toán', 'mod', 'mod(a, b)', 'chia lấy dư luôn không âm', function (a, b) { b = N(b) || 1; return mod(N(a), b); });
def('Toán', 'min', 'min(a, b, ...)', 'số nhỏ nhất', function () { var m = Infinity, i; for (i = 0; i < arguments.length; i++) m = Math.min(m, N(arguments[i])); return m; });
def('Toán', 'max', 'max(a, b, ...)', 'số lớn nhất', function () { var m = -Infinity, i; for (i = 0; i < arguments.length; i++) m = Math.max(m, N(arguments[i])); return m; });
def('Toán', 'clamp', 'clamp(x, lo, hi)', 'giữ x trong [lo, hi]', function (x, a, b) { return clamp(N(x), N(a), N(b)); });
def('Toán', 'hypot', 'hypot(a, b, ...)', 'căn của tổng bình phương', function () { var s = 0, i; for (i = 0; i < arguments.length; i++) s += N(arguments[i]) * N(arguments[i]); return Math.sqrt(s); });
def('Toán', 'sum', 'sum(a, b, ...)', 'tổng', function () { var s = 0, i, j, a; for (i = 0; i < arguments.length; i++) { a = arguments[i]; if (isArr(a)) for (j = 0; j < a.length; j++) s += N(a[j]); else s += N(a); } return s; });
def('Toán', 'avg', 'avg(a, b, ...)', 'trung bình', function () { var s = 0, c = 0, i, j, a; for (i = 0; i < arguments.length; i++) { a = arguments[i]; if (isArr(a)) for (j = 0; j < a.length; j++) { s += N(a[j]); c++; } else { s += N(a); c++; } } return c ? s / c : 0; });
def('Toán', 'lerp', 'lerp(a, b, k)', 'nội suy a→b theo k (0..1); dùng được cho vector và màu', function (a, b, k) { return lerpAny(a, b, N(k)); });
def('Toán', 'invlerp', 'invlerp(a, b, x)', 'x nằm ở đâu giữa a và b (0..1)', function (a, b, x) { a = N(a); b = N(b); return b === a ? 0 : (N(x) - a) / (b - a); });
def('Toán', 'map', 'map(x, a, b, c, d)', 'đổi x từ khoảng [a,b] sang [c,d]', function (x, a, b, c, d) { a = N(a); b = N(b); var k = b === a ? 0 : (N(x) - a) / (b - a); return N(c) + (N(d) - N(c)) * k; });
def('Toán', 'step', 'step(edge, x)', '0 nếu x < edge, ngược lại 1', function (e, x) { return N(x) < N(e) ? 0 : 1; });
def('Toán', 'smoothstep', 'smoothstep(a, b, x)', 'chuyển mượt từ 0 lên 1 giữa a và b', function (a, b, x) { a = N(a); b = N(b); var k = clamp((N(x) - a) / ((b - a) || 1), 0, 1); return k * k * (3 - 2 * k); });
def('Toán', 'if', 'if(cond, a, b)', 'nếu cond đúng trả a, sai trả b', function (c, a, b) { return truthy(c) ? a : b; });
def('Toán', 'choose', 'choose(i, a, b, c, ...)', 'chọn phần tử thứ i (vòng lại khi vượt)', function (i) { var n = arguments.length - 1; if (n < 1) return 0; return arguments[1 + mod(Math.floor(N(i)), n)]; });

/* Sóng & thời gian */
def('Sóng & thời gian', 'saw', 'saw(x)', 'răng cưa 0..1 lặp theo x', function (x) { return saw(N(x)); });
def('Sóng & thời gian', 'tri', 'tri(x)', 'sóng tam giác 0..1', function (x) { return 1 - Math.abs(2 * saw(N(x)) - 1); });
def('Sóng & thời gian', 'square', 'square(x)', 'sóng vuông 0/1', function (x) { return saw(N(x)) < 0.5 ? 1 : 0; });
def('Sóng & thời gian', 'pulse', 'pulse(x, width)', 'xung: 1 trong phần width đầu của mỗi chu kỳ', function (x, w) { return saw(N(x)) < N(w) ? 1 : 0; });
def('Sóng & thời gian', 'wave', 'wave(x)', 'sin chuẩn hoá về 0..1 (1 chu kỳ mỗi đơn vị x)', function (x) { return 0.5 + 0.5 * Math.sin(TAU * N(x)); });
def('Sóng & thời gian', 'pingpong', 'pingpong(x, len)', 'đi tới len rồi quay lại, lặp mãi', function (x, l) { l = N(l) || 1; var m = mod(N(x), 2 * l); return m > l ? 2 * l - m : m; });
def('Sóng & thời gian', 'loop', 'loop(x, len)', 'lặp x trong [0, len)', function (x, l) { return mod(N(x), N(l) || 1); });
def('Sóng & thời gian', 'bob', 'bob(t, amp, freq)', 'dao động lên xuống: amp * sin(2π·freq·t)', function (t, a, f) { return N(a) * Math.sin(TAU * N(f) * N(t)); }, 'bob(t, 0.5, 0.5)');
def('Sóng & thời gian', 'spin', 'spin(t, dps)', 'góc quay đều dps độ mỗi giây (0..360)', function (t, d) { return mod(N(t) * N(d), 360); }, 'spin(t, 30)');
def('Sóng & thời gian', 'blink', 'blink(t, rate)', 'nhấp nháy 0/1, rate lần mỗi giây', function (t, r) { return saw(N(t) * N(r)) < 0.5 ? 1 : 0; });
def('Sóng & thời gian', 'after', 'after(t, t0)', '1 khi đã qua thời điểm t0, ngược lại 0', function (t, t0) { return N(t) >= N(t0) ? 1 : 0; });
def('Sóng & thời gian', 'between', 'between(t, a, b)', '1 khi t nằm trong [a, b)', function (t, a, b) { t = N(t); return t >= N(a) && t < N(b) ? 1 : 0; });
def('Sóng & thời gian', 'fade_in', 'fade_in(t, t0, dur)', 'độ mờ 0→1 bắt đầu tại t0 kéo dài dur', function (t, t0, d) { return clamp((N(t) - N(t0)) / (N(d) || 1), 0, 1); }, 'fade_in(t, 0, 1)');
def('Sóng & thời gian', 'fade_out', 'fade_out(t, t1, dur)', 'độ mờ 1→0 bắt đầu tại t1 kéo dài dur', function (t, t1, d) { return 1 - clamp((N(t) - N(t1)) / (N(d) || 1), 0, 1); }, 'fade_out(t, 5, 1)');
def('Sóng & thời gian', 'tween', 'tween(t, t0, t1, a, b, ease)', 'chuyển a→b từ thời điểm t0 đến t1; ease là tên easing (mặc định inout)', function (t, t0, t1, a, b, e) {
  t0 = N(t0); t1 = N(t1); var p = clamp((N(t) - t0) / ((t1 - t0) || 1), 0, 1); return lerpAny(a, b, easeFn(e === undefined ? 'inout' : e)(p));
}, 'tween(t, 0, 2, 0, 5, "out")');
def('Sóng & thời gian', 'shake', 'shake(t, amp, freq, seed)', 'rung ngẫu nhiên mượt, trả về vector (cộng vào position camera)', function (t, a, f, s) {
  t = N(t) * N(f); s = N(s); a = N(a);
  return [(vnoise(t, s, 0) - 0.5) * 2 * a, (vnoise(t, s + 10, 5) - 0.5) * 2 * a, (vnoise(t, s + 20, 9) - 0.5) * 2 * a];
}, 'shake(t, 0.1, 8, 1)');

/* Ngẫu nhiên */
def('Ngẫu nhiên', 'rand', 'rand(seed)', 'số ngẫu nhiên 0..1, cùng seed luôn ra cùng kết quả', function (s) { return hash(N(s)); }, 'rand(i)');
def('Ngẫu nhiên', 'rrange', 'rrange(seed, a, b)', 'số ngẫu nhiên trong [a, b]', function (s, a, b) { return N(a) + (N(b) - N(a)) * hash(N(s)); }, 'rrange(i, -5, 5)');
def('Ngẫu nhiên', 'randint', 'randint(seed, a, b)', 'số nguyên ngẫu nhiên trong [a, b]', function (s, a, b) { return Math.floor(N(a) + (N(b) - N(a) + 1) * hash(N(s))); });
def('Ngẫu nhiên', 'pick', 'pick(seed, a, b, c, ...)', 'chọn ngẫu nhiên một giá trị', function (s) { var n = arguments.length - 1; return n < 1 ? 0 : arguments[1 + Math.floor(hash(N(s)) * n) % n]; });
def('Ngẫu nhiên', 'noise', 'noise(x, y, z)', 'nhiễu mượt 0..1 (y, z tuỳ chọn)', function (x, y, z) { return vnoise(N(x), N(y), N(z)); }, 'noise(t, i)');
def('Ngẫu nhiên', 'snoise', 'snoise(x, y, z)', 'nhiễu mượt -1..1', function (x, y, z) { return vnoise(N(x), N(y), N(z)) * 2 - 1; });
def('Ngẫu nhiên', 'fbm', 'fbm(x, y, z, octaves)', 'nhiễu nhiều tầng 0..1 (địa hình, mây)', function (x, y, z, o) {
  var s = 0, a = 0.5, f = 1, i, n = clamp(Math.floor(N(o) || 4), 1, 8), tot = 0;
  for (i = 0; i < n; i++) { s += a * vnoise(N(x) * f, N(y) * f, N(z) * f); tot += a; a *= 0.5; f *= 2; }
  return s / tot;
});
def('Ngẫu nhiên', 'jitter', 'jitter(seed, amount)', 'rung ngẫu nhiên trong [-amount, amount]', function (s, a) { return (hash(N(s)) - 0.5) * 2 * N(a); });

/* Easing */
def('Easing', 'ease', 'ease(x, name)', 'áp easing lên x (0..1). Tên: ' + 'in out inout cubicin cubicout cubicinout expoin expoout expoinout sinein sineout sineinout backin backout backinout elasticin elasticout bouncein bounceout smooth', function (x, n) { return easeFn(n === undefined ? 'inout' : n)(clamp(N(x), 0, 1)); }, 'ease(x, "out")');
(function () {
  var ns = ['in', 'out', 'inout', 'cubicout', 'expoout', 'backout', 'elasticout', 'bounceout', 'sineinout'], i;
  for (i = 0; i < ns.length; i++) (function (n) { def('Easing', 'ease_' + n, 'ease_' + n + '(x)', 'easing ' + n + ' cho x trong 0..1', function (x) { return EASE[n](clamp(N(x), 0, 1)); }); })(ns[i]);
})();

/* Vector */
def('Vector', 'vec', 'vec(x, y, z)', 'tạo vector 3 chiều', function (x, y, z) { return [N(x), N(y), N(z)]; });
def('Vector', 'vx', 'vx(v)', 'thành phần x', function (v) { return V3(v)[0]; });
def('Vector', 'vy', 'vy(v)', 'thành phần y', function (v) { return V3(v)[1]; });
def('Vector', 'vz', 'vz(v)', 'thành phần z', function (v) { return V3(v)[2]; });
def('Vector', 'add', 'add(a, b)', 'cộng vector', function (a, b) { a = V3(a); b = V3(b); return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; });
def('Vector', 'sub', 'sub(a, b)', 'trừ vector', function (a, b) { a = V3(a); b = V3(b); return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; });
def('Vector', 'mul', 'mul(v, k)', 'nhân vector với số', function (v, k) { v = V3(v); k = N(k); return [v[0] * k, v[1] * k, v[2] * k]; });
def('Vector', 'div', 'div(v, k)', 'chia vector cho số', function (v, k) { v = V3(v); k = N(k) || 1; return [v[0] / k, v[1] / k, v[2] / k]; });
def('Vector', 'dot', 'dot(a, b)', 'tích vô hướng', function (a, b) { a = V3(a); b = V3(b); return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; });
def('Vector', 'cross', 'cross(a, b)', 'tích có hướng', function (a, b) { a = V3(a); b = V3(b); return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; });
def('Vector', 'vlen', 'vlen(v)', 'độ dài vector', function (v) { v = V3(v); return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]); });
def('Vector', 'norm', 'norm(v)', 'vector đơn vị', function (v) { v = V3(v); var l = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; });
def('Vector', 'dist', 'dist(a, b)', 'khoảng cách giữa hai điểm', function (a, b) { a = V3(a); b = V3(b); var x = a[0] - b[0], y = a[1] - b[1], z = a[2] - b[2]; return Math.sqrt(x * x + y * y + z * z); });
def('Vector', 'polar', 'polar(r, deg)', 'điểm trên mặt phẳng XY theo bán kính và góc (độ)', function (r, d) { d = N(d) * PI / 180; return [N(r) * Math.cos(d), N(r) * Math.sin(d), 0]; }, 'polar(3, t*40)');
def('Vector', 'orbit_y', 'orbit_y(r, deg, y)', 'điểm quay quanh trục Y (đi vòng ngang) bán kính r', function (r, d, y) { d = N(d) * PI / 180; return [N(r) * Math.cos(d), N(y), N(r) * Math.sin(d)]; }, 'orbit_y(4, t*30, 0)');
def('Vector', 'sph', 'sph(r, az, el)', 'toạ độ cầu → vector (góc theo độ)', function (r, az, el) { az = N(az) * PI / 180; el = N(el) * PI / 180; r = N(r); return [r * Math.cos(el) * Math.sin(az), r * Math.sin(el), r * Math.cos(el) * Math.cos(az)]; });

/* Màu */
function colorFn(r, g, b, a) { return css([N(r), N(g), N(b), a === undefined ? 1 : N(a)]); }
def('Màu', 'rgb', 'rgb(r, g, b)', 'màu từ 3 số 0..255', colorFn);
def('Màu', 'rgba', 'rgba(r, g, b, a)', 'màu có độ trong suốt a (0..1)', colorFn);
def('Màu', 'hsl', 'hsl(h, s, l)', 'màu theo sắc độ (0..360), bão hoà %, sáng %', function (h, s, l, a) { var c = hsl2rgb(N(h), N(s), N(l)); return css([c[0], c[1], c[2], a === undefined ? 1 : N(a)]); }, 'hsl(210, 80, 60)');
def('Màu', 'hsla', 'hsla(h, s, l, a)', 'như hsl, thêm độ trong suốt', function (h, s, l, a) { var c = hsl2rgb(N(h), N(s), N(l)); return css([c[0], c[1], c[2], N(a)]); });
def('Màu', 'gray', 'gray(v)', 'xám, v từ 0..1', function (v) { var n = clamp(N(v), 0, 1) * 255; return css([n, n, n, 1]); });
def('Màu', 'mixc', 'mixc(a, b, k)', 'trộn hai màu theo k (0..1)', function (a, b, k) { return css(mixRGBA(parseColor(a), parseColor(b), N(k))); });
def('Màu', 'lighten', 'lighten(c, k)', 'làm sáng màu (k 0..1)', function (c, k) { return css(mixRGBA(parseColor(c), [255, 255, 255, parseColor(c)[3]], clamp(N(k), 0, 1))); });
def('Màu', 'darken', 'darken(c, k)', 'làm tối màu (k 0..1)', function (c, k) { return css(mixRGBA(parseColor(c), [0, 0, 0, parseColor(c)[3]], clamp(N(k), 0, 1))); });
def('Màu', 'alpha', 'alpha(c, a)', 'đặt độ trong suốt cho màu', function (c, a) { var p = parseColor(c); return css([p[0], p[1], p[2], clamp(N(a), 0, 1)]); });
def('Màu', 'rainbow', 'rainbow(k)', 'màu cầu vồng theo k (0..1, lặp)', function (k) { var c = hsl2rgb(mod(N(k), 1) * 360, 85, 58); return css([c[0], c[1], c[2], 1]); }, 'rainbow(t*0.1)');
def('Màu', 'palette', 'palette(k, c1, c2, c3, ...)', 'màu chạy qua dải nhiều màu theo k (0..1)', function (k) {
  var n = arguments.length - 1; if (n < 1) return '#fff'; if (n === 1) return arguments[1];
  k = clamp(N(k), 0, 1) * (n - 1); var i = Math.min(Math.floor(k), n - 2);
  return css(mixRGBA(parseColor(arguments[1 + i]), parseColor(arguments[2 + i]), k - i));
});

/* Tạo điểm (dùng cho points, line, polygon, extrude...) */
def('Tạo điểm', 'ring', 'ring(n, r)', 'n điểm xếp thành vòng tròn bán kính r (mặt phẳng XY)', function (n, r) { n = clamp(Math.floor(N(n)), 1, 5000); r = N(r); var a = [], i; for (i = 0; i < n; i++) a.push([r * Math.cos(TAU * i / n), r * Math.sin(TAU * i / n), 0]); return a; }, 'ring(32, 2)');
def('Tạo điểm', 'star', 'star(n, r1, r2)', 'ngôi sao n cánh (đỉnh r1, hõm r2), dùng cho polygon/extrude', function (n, r1, r2) { n = clamp(Math.floor(N(n)), 2, 100); var a = [], i, r; for (i = 0; i < n * 2; i++) { r = i % 2 ? N(r2) : N(r1); a.push([r * Math.cos(PI * i / n + PI / 2), r * Math.sin(PI * i / n + PI / 2), 0]); } return a; }, 'star(5, 2, 0.9)');
def('Tạo điểm', 'spiral', 'spiral(n, r0, r1, turns, h)', 'xoắn ốc phẳng từ bán kính r0 đến r1, có thể nâng dần độ cao h', function (n, r0, r1, tu, h) {
  n = clamp(Math.floor(N(n)), 2, 5000); var a = [], i, k, an, r; for (i = 0; i < n; i++) { k = i / (n - 1); an = N(tu) * TAU * k; r = N(r0) + (N(r1) - N(r0)) * k; a.push([r * Math.cos(an), r * Math.sin(an), N(h) * k]); } return a;
}, 'spiral(200, 0.2, 4, 4, 0)');
def('Tạo điểm', 'helix', 'helix(n, r, h, turns)', 'lò xo quanh trục Y cao h', function (n, r, h, tu) {
  n = clamp(Math.floor(N(n)), 2, 5000); var a = [], i, k, an; for (i = 0; i < n; i++) { k = i / (n - 1); an = N(tu) * TAU * k; a.push([N(r) * Math.cos(an), N(h) * (k - 0.5), N(r) * Math.sin(an)]); } return a;
}, 'helix(200, 1.5, 6, 5)');
def('Tạo điểm', 'grid', 'grid(nx, ny, dx, dy)', 'lưới điểm nx × ny trên mặt phẳng XY, canh giữa', function (nx, ny, dx, dy) {
  nx = clamp(Math.floor(N(nx)), 1, 200); ny = clamp(Math.floor(N(ny)), 1, 200); var a = [], i, j; for (j = 0; j < ny; j++) for (i = 0; i < nx; i++) a.push([(i - (nx - 1) / 2) * N(dx), (j - (ny - 1) / 2) * N(dy), 0]); return a;
}, 'grid(10, 6, 1, 1)');
def('Tạo điểm', 'grid3', 'grid3(nx, ny, nz, d)', 'lưới điểm 3D, canh giữa', function (nx, ny, nz, d) {
  nx = clamp(Math.floor(N(nx)), 1, 40); ny = clamp(Math.floor(N(ny)), 1, 40); nz = clamp(Math.floor(N(nz)), 1, 40); var a = [], i, j, k;
  for (k = 0; k < nz; k++) for (j = 0; j < ny; j++) for (i = 0; i < nx; i++) a.push([(i - (nx - 1) / 2) * N(d), (j - (ny - 1) / 2) * N(d), (k - (nz - 1) / 2) * N(d)]); return a;
}, 'grid3(6, 6, 6, 1)');
def('Tạo điểm', 'line_pts', 'line_pts(a, b, n)', 'n điểm đều nhau trên đoạn a→b', function (a, b, n) { a = V3(a); b = V3(b); n = clamp(Math.floor(N(n)), 2, 5000); var r = [], i; for (i = 0; i < n; i++) r.push(lerpAny(a, b, i / (n - 1))); return r; });
def('Tạo điểm', 'sphere_pts', 'sphere_pts(n, r)', 'n điểm phân bố đều trên mặt cầu', function (n, r) {
  n = clamp(Math.floor(N(n)), 1, 8000); r = N(r); var a = [], i, y, rd, ph; for (i = 0; i < n; i++) { y = 1 - 2 * (i + 0.5) / n; rd = Math.sqrt(1 - y * y); ph = i * 2.399963; a.push([r * rd * Math.cos(ph), r * y, r * rd * Math.sin(ph)]); } return a;
}, 'sphere_pts(400, 2)');
def('Tạo điểm', 'torus_pts', 'torus_pts(n, R, r)', 'n điểm trên mặt bánh vòng', function (n, R, r) {
  n = clamp(Math.floor(N(n)), 1, 8000); var m = Math.ceil(Math.sqrt(n)), a = [], i, u, v; for (i = 0; i < n; i++) { u = TAU * ((i % m) / m); v = TAU * (Math.floor(i / m) / m); a.push([(N(R) + N(r) * Math.cos(v)) * Math.cos(u), N(r) * Math.sin(v), (N(R) + N(r) * Math.cos(v)) * Math.sin(u)]); } return a;
});
def('Tạo điểm', 'galaxy', 'galaxy(n, r, arms, twist, seed)', 'thiên hà xoắn ốc n sao, nằm trên mặt phẳng XZ', function (n, r, arms, tw, sd) {
  n = clamp(Math.floor(N(n)), 1, 8000); r = N(r); arms = Math.max(1, Math.floor(N(arms) || 3)); sd = N(sd); var a = [], i, rr, arm, an, y;
  for (i = 0; i < n; i++) { rr = r * Math.sqrt(hash(i * 3.1 + sd)); arm = Math.floor(hash(i * 7.7 + sd) * arms); an = arm * TAU / arms + (rr / r) * N(tw) * TAU + (hash(i * 1.3 + sd) - 0.5) * 0.7 * (1 - 0.5 * rr / r); y = (hash(i * 5.1 + sd) - 0.5) * 0.35 * (1 - rr / r); a.push([rr * Math.cos(an), y, rr * Math.sin(an)]); } return a;
}, 'galaxy(1500, 5, 3, 1.2, 1)');
def('Tạo điểm', 'scatter', 'scatter(n, w, h, d, seed)', 'n điểm rải ngẫu nhiên trong hộp w×h×d', function (n, w, h, d, sd) {
  n = clamp(Math.floor(N(n)), 1, 8000); sd = N(sd); var a = [], i; for (i = 0; i < n; i++) a.push([(hash(i * 1.7 + sd) - 0.5) * N(w), (hash(i * 2.9 + sd) - 0.5) * N(h), (hash(i * 4.3 + sd) - 0.5) * N(d)]); return a;
}, 'scatter(300, 16, 9, 12, 2)');
def('Tạo điểm', 'lissajous', 'lissajous(n, a, b, c, size)', 'đường Lissajous 3D', function (n, a, b, c, A) {
  n = clamp(Math.floor(N(n)), 2, 5000); var r = [], i, k; for (i = 0; i < n; i++) { k = i / n * TAU; r.push([N(A) * Math.sin(N(a) * k), N(A) * Math.sin(N(b) * k + PI / 2), N(A) * Math.sin(N(c) * k)]); } return r;
}, 'lissajous(400, 3, 2, 5, 2)');
def('Tạo điểm', 'wave_pts', 'wave_pts(n, len, amp, freq, phase)', 'đường sóng sin nằm ngang dài len', function (n, len, amp, fr, ph) {
  n = clamp(Math.floor(N(n)), 2, 5000); var r = [], i, x; for (i = 0; i < n; i++) { x = (i / (n - 1) - 0.5) * N(len); r.push([x, N(amp) * Math.sin(N(fr) * x + N(ph)), 0]); } return r;
}, 'wave_pts(120, 10, 1, 1.5, t*2)');
def('Tạo điểm', 'curve', 'curve(n, p0, p1, p2, p3)', 'đường cong Bézier bậc 3 qua n điểm', function (n, p0, p1, p2, p3) {
  n = clamp(Math.floor(N(n)), 2, 2000); p0 = V3(p0); p1 = V3(p1); p2 = V3(p2); p3 = V3(p3); var r = [], i, k, u, a, b, c, d, j, p;
  for (i = 0; i < n; i++) { k = i / (n - 1); u = 1 - k; a = u * u * u; b = 3 * u * u * k; c = 3 * u * k * k; d = k * k * k; p = []; for (j = 0; j < 3; j++) p.push(a * p0[j] + b * p1[j] + c * p2[j] + d * p3[j]); r.push(p); } return r;
}, 'curve(60, vec(-4,0,0), vec(-2,4,0), vec(2,-4,0), vec(4,0,0))');
def('Tạo điểm', 'shift', 'shift(points, v)', 'tịnh tiến cả dãy điểm', function (p, v) { v = V3(v); return pts(p).map(function (q) { q = V3(q); return [q[0] + v[0], q[1] + v[1], q[2] + v[2]]; }); });
def('Tạo điểm', 'scale_pts', 'scale_pts(points, k)', 'phóng/thu cả dãy điểm quanh gốc', function (p, k) { k = V3(k, [1, 1, 1]); return pts(p).map(function (q) { q = V3(q); return [q[0] * k[0], q[1] * k[1], q[2] * k[2]]; }); });
def('Tạo điểm', 'range', 'range(a, b, step)', 'dãy số từ a đến b (không gồm b)', function (a, b, s) { a = N(a); b = N(b); s = N(s) || 1; var r = [], i = 0; for (; (s > 0 ? a < b : a > b) && i < 5000; a += s, i++) r.push(a); return r; });
def('Tạo điểm', 'count', 'count(list)', 'số phần tử của danh sách', function (a) { return isArr(a) ? a.length : 0; });
def('Tạo điểm', 'get', 'get(list, i)', 'lấy phần tử thứ i (vòng lại khi vượt)', function (a, i) { if (!isArr(a) || !a.length) return 0; return a[mod(Math.floor(N(i)), a.length)]; });

/* Chữ */
function fmtNum(x, d) { x = N(x); d = clamp(Math.floor(N(d)), 0, 10); var s = x.toFixed(d); return s; }
def('Chữ', 'str', 'str(x)', 'đổi sang chuỗi', function (x) { return isArr(x) ? x.join(', ') : String(x); });
def('Chữ', 'fmt', 'fmt(x, digits)', 'định dạng số với digits chữ số thập phân', function (x, d) { return fmtNum(x, d); }, 'fmt(x, 2)');
def('Chữ', 'concat', 'concat(a, b, ...)', 'nối chuỗi', function () { var s = '', i; for (i = 0; i < arguments.length; i++) s += isArr(arguments[i]) ? arguments[i].join(', ') : String(arguments[i]); return s; });
def('Chữ', 'upper', 'upper(s)', 'IN HOA', function (s) { return String(s).toUpperCase(); });
def('Chữ', 'lower', 'lower(s)', 'in thường', function (s) { return String(s).toLowerCase(); });
def('Chữ', 'typewriter', 'typewriter(text, t, cps)', 'hiện chữ dần như gõ máy, cps chữ mỗi giây', function (s, t, c) { s = String(s); return s.substr(0, Math.max(0, Math.floor(N(t) * (N(c) || 12)))); }, 'typewriter("Xin chào", t, 10)');
def('Chữ', 'count_up', 'count_up(t, from, to, dur, digits)', 'số chạy từ from đến to trong dur giây, trả về chuỗi', function (t, a, b, d, dg) {
  var p = clamp(N(t) / (N(d) || 1), 0, 1); p = 1 - Math.pow(1 - p, 3); return fmtNum(N(a) + (N(b) - N(a)) * p, dg || 0);
}, 'count_up(t, 0, 1000, 2, 0)');
def('Chữ', 'pad', 'pad(x, n)', 'thêm số 0 phía trước cho đủ n chữ số', function (x, n) { var s = String(Math.floor(N(x))); while (s.length < N(n)) s = '0' + s; return s; });

ZER.F = F; ZER.DOCS = DOCS; ZER.easeFn = easeFn; ZER.lerpAny = lerpAny; ZER._hash = hash;

/* =========================================================================
   Token + biểu thức  ->  closure
   ======================================================================= */
var IDSTART = /[A-Za-z_À-ỹ]/, IDREST = /[A-Za-z0-9_À-ỹ]/;
function tokenize(src, line) {
  var toks = [], i = 0, n = src.length, c, m, j, s, d, v, um, rest;
  while (i < n) {
    c = src.charAt(i);
    if (c === ' ' || c === '\t') { i++; continue; }
    if (c === '"' || c === "'") {
      j = i + 1; s = '';
      while (j < n && src.charAt(j) !== c) {
        if (src.charAt(j) === '\\' && j + 1 < n) { d = src.charAt(j + 1); s += d === 'n' ? '\n' : d === 't' ? '\t' : d; j += 2; } else s += src.charAt(j++);
      }
      if (j >= n) throw ZError('Chuỗi thiếu dấu đóng ' + c, line);
      toks.push({ t: 'str', v: s }); i = j + 1; continue;
    }
    rest = src.substr(i);
    if (c === '#') {
      m = /^#([0-9a-fA-F]{3,8})(?![A-Za-z0-9_])/.exec(rest);
      if (!m) throw ZError('Mã màu không hợp lệ (ví dụ #4aa3ff)', line);
      toks.push({ t: 'str', v: m[0] }); i += m[0].length; continue;
    }
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src.charAt(i + 1)))) {
      m = /^(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/.exec(rest); v = parseFloat(m[0]); i += m[0].length;
      um = /^(ms|s|deg|°)(?![A-Za-z_0-9])/.exec(src.substr(i));
      if (um) { if (um[1] === 'ms') v /= 1000; i += um[0].length; }
      toks.push({ t: 'num', v: v }); continue;
    }
    if (IDSTART.test(c)) { j = i + 1; while (j < n && IDREST.test(src.charAt(j))) j++; toks.push({ t: 'id', v: src.substring(i, j) }); i = j; continue; }
    d = src.substr(i, 2);
    if (d === '==' || d === '!=' || d === '<=' || d === '>=' || d === '&&' || d === '||') { toks.push({ t: 'op', v: d }); i += 2; continue; }
    if ('+-*/%^(),?:<>!'.indexOf(c) >= 0) { toks.push({ t: 'op', v: c }); i++; continue; }
    throw ZError('Ký tự lạ "' + c + '"', line);
  }
  return toks;
}

function Parser(toks, line) { this.t = toks; this.p = 0; this.line = line; }
Parser.prototype.peek = function () { return this.t[this.p]; };
Parser.prototype.isOp = function (v) { var k = this.t[this.p]; return k && k.t === 'op' && k.v === v; };
Parser.prototype.eat = function (v) { if (this.isOp(v)) { this.p++; return true; } return false; };
Parser.prototype.need = function (v) { if (!this.eat(v)) throw ZError('Thiếu "' + v + '"', this.line); };
Parser.prototype.end = function () { return this.p >= this.t.length; };
Parser.prototype.tern = function () {
  var c = this.or();
  if (this.eat('?')) { var a = this.tern(); this.need(':'); var b = this.tern(); return { k: 'tern', c: c, a: a, b: b }; }
  return c;
};
Parser.prototype.or = function () { var a = this.and(); while (this.isOp('||')) { this.p++; a = { k: 'bin', op: '||', a: a, b: this.and() }; } return a; };
Parser.prototype.and = function () { var a = this.eq(); while (this.isOp('&&')) { this.p++; a = { k: 'bin', op: '&&', a: a, b: this.eq() }; } return a; };
Parser.prototype.eq = function () { var a = this.cmp(); while (this.isOp('==') || this.isOp('!=')) { var o = this.t[this.p++].v; a = { k: 'bin', op: o, a: a, b: this.cmp() }; } return a; };
Parser.prototype.cmp = function () { var a = this.add(); while (this.isOp('<') || this.isOp('>') || this.isOp('<=') || this.isOp('>=')) { var o = this.t[this.p++].v; a = { k: 'bin', op: o, a: a, b: this.add() }; } return a; };
Parser.prototype.add = function () { var a = this.mul(); while (this.isOp('+') || this.isOp('-')) { var o = this.t[this.p++].v; a = { k: 'bin', op: o, a: a, b: this.mul() }; } return a; };
Parser.prototype.mul = function () { var a = this.unary(); while (this.isOp('*') || this.isOp('/') || this.isOp('%')) { var o = this.t[this.p++].v; a = { k: 'bin', op: o, a: a, b: this.unary() }; } return a; };
Parser.prototype.unary = function () {
  if (this.isOp('-')) { this.p++; return { k: 'un', op: '-', a: this.unary() }; }
  if (this.isOp('+')) { this.p++; return this.unary(); }
  if (this.isOp('!')) { this.p++; return { k: 'un', op: '!', a: this.unary() }; }
  return this.pow();
};
Parser.prototype.pow = function () { var a = this.primary(); if (this.isOp('^')) { this.p++; return { k: 'bin', op: '^', a: a, b: this.unary() }; } return a; };
Parser.prototype.primary = function () {
  var k = this.t[this.p], items, args;
  if (!k) throw ZError('Biểu thức bị thiếu vế', this.line);
  this.p++;
  if (k.t === 'num') return { k: 'num', v: k.v };
  if (k.t === 'str') return { k: 'str', v: k.v };
  if (k.t === 'id') {
    if (this.isOp('(')) {
      this.p++; args = [];
      if (!this.isOp(')')) { do { args.push(this.tern()); } while (this.eat(',')); }
      this.need(')');
      return { k: 'call', n: k.v, args: args };
    }
    return { k: 'id', v: k.v };
  }
  if (k.t === 'op' && k.v === '(') {
    items = [this.tern()];
    while (this.eat(',')) items.push(this.tern());
    this.need(')');
    return items.length === 1 ? items[0] : { k: 'arr', items: items };
  }
  throw ZError('Không hiểu "' + k.v + '"', this.line);
};

function bin(op, a, b) {
  var aa = isArr(a), ba = isArr(b), i, r, n;
  if (op === '+' && ((typeof a === 'string' && !isColorStr(a)) || (typeof b === 'string' && !isColorStr(b)))) return String(isArr(a) ? a.join(',') : a) + String(isArr(b) ? b.join(',') : b);
  if (op === '==' || op === '!=') {
    var eq = (typeof a === 'string' || typeof b === 'string') ? String(a) === String(b) : N(a) === N(b);
    return (op === '==') === eq ? 1 : 0;
  }
  if (aa || ba) { n = Math.max(aa ? a.length : 0, ba ? b.length : 0); r = []; for (i = 0; i < n; i++) r.push(bin(op, aa ? a[i] : a, ba ? b[i] : b)); return r; }
  a = N(a); b = N(b);
  switch (op) {
    case '+': return a + b; case '-': return a - b; case '*': return a * b;
    case '/': return b === 0 ? 0 : a / b; case '%': return b === 0 ? 0 : a - b * Math.floor(a / b);
    case '^': return Math.pow(a, b);
    case '<': return a < b ? 1 : 0; case '>': return a > b ? 1 : 0; case '<=': return a <= b ? 1 : 0; case '>=': return a >= b ? 1 : 0;
  }
  return 0;
}
function callUser(u, args, env) {
  var l2 = {}, i, e2;
  if (env.depth > 60) throw ZError('Hàm gọi lồng quá sâu', 0);
  for (i = 0; i < u.params.length; i++) l2[u.params[i]] = args[i] === undefined ? 0 : args[i];
  e2 = { t: env.t, dt: env.dt, frame: env.frame, step: env.step, vars: env.vars, uf: env.uf, loc: l2, depth: (env.depth || 0) + 1 };
  return u.fn(e2);
}
function konst(f, v) { f.konst = true; f.value = v; return f; }
function compile(n, cx) {
  var f, a, b, c, items, i, allk, args, name, v;
  switch (n.k) {
    case 'num': case 'str': v = n.v; return konst(function () { return v; }, v);
    case 'id':
      name = n.v;
      if (name === 'pi') return konst(function () { return PI; }, PI);
      if (name === 'tau') return konst(function () { return TAU; }, TAU);
      if (name === 'yes' || name === 'true' || name === 'on' || name === 'có') return konst(function () { return 1; }, 1);
      if (name === 'no' || name === 'false' || name === 'off') return konst(function () { return 0; }, 0);
      return function (env) {
        var l = env.loc, vs;
        if (l && hasOwn(l, name)) return l[name];
        vs = env.vars; if (vs && hasOwn(vs, name)) return vs[name];
        switch (name) { case 't': case 'time': return env.t; case 'dt': return env.dt; case 'frame': return env.frame; case 'step': return env.step; case 'e': return Math.E; }
        return name;     // từ trơn (red, center, only...) coi như chuỗi
      };
    case 'arr':
      items = []; allk = true;
      for (i = 0; i < n.items.length; i++) { items.push(compile(n.items[i], cx)); if (!items[i].konst) allk = false; }
      f = function (env) { var r = [], j; for (j = 0; j < items.length; j++) r.push(items[j](env)); return r; };
      if (allk) { v = f({}); return konst(function () { return v; }, v); }
      return f;
    case 'un':
      a = compile(n.a, cx);
      if (n.op === '-') f = function (env) { var x = a(env); return isArr(x) ? bin('*', x, -1) : -N(x); };
      else f = function (env) { return truthy(a(env)) ? 0 : 1; };
      if (a.konst) { v = f({}); return konst(function () { return v; }, v); }
      return f;
    case 'bin':
      a = compile(n.a, cx); b = compile(n.b, cx);
      if (n.op === '&&') f = function (env) { return truthy(a(env)) && truthy(b(env)) ? 1 : 0; };
      else if (n.op === '||') f = function (env) { return truthy(a(env)) || truthy(b(env)) ? 1 : 0; };
      else { var op = n.op; f = function (env) { return bin(op, a(env), b(env)); }; }
      if (a.konst && b.konst) { v = f({}); return konst(function () { return v; }, v); }
      return f;
    case 'tern':
      c = compile(n.c, cx); a = compile(n.a, cx); b = compile(n.b, cx);
      f = function (env) { return truthy(c(env)) ? a(env) : b(env); };
      if (c.konst && a.konst && b.konst) { v = f({}); return konst(function () { return v; }, v); }
      return f;
    case 'call':
      name = n.n; args = []; allk = true;
      for (i = 0; i < n.args.length; i++) { args.push(compile(n.args[i], cx)); if (!args[i].konst) allk = false; }
      if (cx) cx.calls.push({ n: name, line: cx.line });
      f = function (env) {
        var av = [], j, fn, u;
        for (j = 0; j < args.length; j++) av.push(args[j](env));
        fn = F[name];
        if (fn) return fn.apply(null, av);
        u = env.uf && env.uf[name];
        if (u) return callUser(u, av, env);
        throw ZError('Chưa có hàm "' + name + '"', cx ? cx.line : 0);
      };
      if (allk && F[name]) { try { v = f({}); return konst(function () { return v; }, v); } catch (e) { /* để lỗi lộ ra lúc chạy */ } }
      return f;
  }
  throw ZError('Nút lạ', 0);
}
function brk(src) {      // [a, b, c] -> (a, b, c), bỏ qua trong chuỗi
  var o = '', i, c, q = '';
  for (i = 0; i < src.length; i++) {
    c = src.charAt(i);
    if (q) { o += c; if (c === q) q = ''; continue; }
    if (c === '"' || c === "'") { q = c; o += c; continue; }
    o += c === '[' ? '(' : c === ']' ? ')' : c;
  }
  return o;
}
function compileValue(src, line, cx) {
  src = brk(src);
  var toks = tokenize(src, line), P, items = [], node;
  if (!toks.length) throw ZError('Thiếu giá trị', line);
  P = new Parser(toks, line);
  cx.line = line;
  items.push(P.tern());
  while (P.eat(',')) items.push(P.tern());
  if (!P.end()) throw ZError('Không hiểu đoạn "' + (P.peek().v) + '"', line);
  node = items.length === 1 ? items[0] : { k: 'arr', items: items };
  return compile(node, cx);
}
ZER.compileValue = function (src) { return compileValue(src, 0, { calls: [], line: 0 }); };

/* =========================================================================
   Cây thụt lề -> project
   ======================================================================= */
function stripComment(s) {
  var i, q = null, c;
  for (i = 0; i < s.length; i++) {
    c = s.charAt(i);
    if (q) { if (c === '\\') i++; else if (c === q) q = null; }
    else if (c === '"' || c === "'") q = c;
    else if (c === '/' && s.charAt(i + 1) === '/') return s.substring(0, i);
  }
  return s;
}
function buildTree(src) {
  var raw = String(src).split(/\r?\n/), root = { kids: [], ind: -1, ln: 0 }, stack = [root], i, line, tr, ind, j, ch, text, node;
  for (i = 0; i < raw.length; i++) {
    line = stripComment(raw[i]).replace(/\s+$/, '');
    if (!line.replace(/\s/g, '')) continue;
    ind = 0;
    for (j = 0; j < line.length; j++) { ch = line.charAt(j); if (ch === ' ') ind++; else if (ch === '\t') ind += 4; else break; }
    text = line.substring(j);
    node = { ind: ind, text: text, ln: i + 1, kids: [] };
    while (stack.length > 1 && stack[stack.length - 1].ind >= ind) stack.pop();
    stack[stack.length - 1].kids.push(node);
    stack.push(node);
  }
  return root;
}
function lastLn(n) { var m = n.ln, i, x; for (i = 0; i < n.kids.length; i++) { x = lastLn(n.kids[i]); if (x > m) m = x; } return m; }

function splitKV(t) {          // tách "đầu" và "giá trị" tại dấu = hoặc : đầu tiên ngoài chuỗi / ngoặc
  var i, q = null, c, depth = 0, nx, pv;
  for (i = 0; i < t.length; i++) {
    c = t.charAt(i);
    if (q) { if (c === '\\') i++; else if (c === q) q = null; continue; }
    if (c === '"' || c === "'") { q = c; continue; }
    if (c === '(') { depth++; continue; }
    if (c === ')') { depth--; continue; }
    if (depth > 0) continue;
    if (c === ':') return { head: t.substring(0, i).replace(/\s+$/, ''), sep: ':', rest: t.substring(i + 1).replace(/^\s+/, '') };
    if (c === '=') {
      nx = t.charAt(i + 1); pv = t.charAt(i - 1);
      if (nx === '=' || pv === '!' || pv === '<' || pv === '>') { if (nx === '=') i++; continue; }
      return { head: t.substring(0, i).replace(/\s+$/, ''), sep: '=', rest: t.substring(i + 1).replace(/^\s+/, '') };
    }
  }
  return { head: t.replace(/\s+$/, ''), sep: '', rest: '' };
}
function splitWords(s) {
  var w = [], i = 0, n = s.length, c, j, q;
  while (i < n) {
    c = s.charAt(i);
    if (c === ' ' || c === '\t') { i++; continue; }
    if (c === '"' || c === "'") { q = c; j = i + 1; while (j < n && s.charAt(j) !== q) { if (s.charAt(j) === '\\') j++; j++; } w.push(s.substring(i, j + 1)); i = j + 1; continue; }
    j = i; while (j < n && s.charAt(j) !== ' ' && s.charAt(j) !== '\t') j++;
    w.push(s.substring(i, j)); i = j;
  }
  return w;
}

var TYPES = {};
(function () { var a = ['cube', 'box', 'sphere', 'cylinder', 'cone', 'torus', 'pyramid', 'plane', 'rect', 'circle', 'polygon', 'mesh', 'lathe', 'extrude', 'line', 'points', 'particles', 'text', 'label', 'image', 'grid', 'axes', 'group'], i; for (i = 0; i < a.length; i++) TYPES[a[i]] = true; })();
ZER.TYPES = (function () { var a = [], k; for (k in TYPES) a.push(k); return a; })();
var ALIAS = { coordinates: 'position', coordinate: 'position', pos: 'position', position: 'position', rotation: 'rotate', rot: 'rotate', rotate: 'rotate', scl: 'scale', scale: 'scale',
  colour: 'color', color: 'color', 'vị trí': 'position', 'tọa độ': 'position', 'toạ độ': 'position', 'xoay': 'rotate', 'tỉ lệ': 'scale', 'màu': 'color', 'chữ': 'text', 'ảnh': 'src', 'độ mờ': 'opacity' };
(function () {
  var A = {
    position: 'pos location loc place at_pos xyz center origin eye cam_position camera_position',
    rotate: 'rotation rot angle angles euler rotate_xyz',
    scale: 'scl scaling zoom_scale',
    color: 'colour fill colour1 color1 tint paint col',
    color2: 'colour2 color_end gradient',
    radius: 'r rad',
    size: 'font_size fontsize font-size text_size textsize s dim dimensions',
    text: 'content label caption string str words',
    src: 'image source url file texture_src img picture photo',
    opacity: 'alpha transparency',
    background: 'bg bgcolor background_color backdrop sky',
    look: 'look_at lookat target focus',
    fov: 'fovy field_of_view',
    detail: 'segments seg resolution res quality subdivisions',
    wire: 'wireframe',
    wirecolor: 'wire_color outline_color edge_color',
    visible: 'show',
    reveal: 'appear show_at step_in click_in',
    until: 'hide_at step_out disappear',
    ease: 'easing',
    pingpong: 'ping_pong yoyo bounce',
    loop: 'repeat forever',
    duration: 'length_time slide_time',
    fade_in: 'fadein fade-in',
    fade_out: 'fadeout fade-out',
    vignette: 'vignetting',
    stars: 'starfield',
    ambient: 'ambient_light',
    light: 'light_dir sun',
    count: 'num number amount n_particles',
    life: 'lifetime',
    gravity: 'g_force',
    width: 'thickness line_width stroke_width',
    tube: 'tube_radius thickness_tube',
    points: 'pts vertices_list path',
    billboard: 'face_camera facing',
    autoplay: 'auto film auto_play',
    lineheight: 'line_height leading',
    outline: 'stroke text_outline',
    align: 'text_align halign',
    height: 'tall',
    depth: 'thick extrude_depth'
  }, k, ws, i;
  for (k in A) { ws = A[k].split(' '); for (i = 0; i < ws.length; i++) if (!ALIAS.hasOwnProperty(ws[i])) ALIAS[ws[i]] = k; }
})();
var KEYS = {};
(function () {
  var l = 'position rotate scale color color2 opacity visible reveal until wire wirecolor lit cull size radius height w h detail tube points from to width glow arrow fade count life speed spread gravity seed vertices faces closed depth profile text font bold italic align outline wrap lineheight billboard src texture flip opacity2 n step length ease loop pingpong delay background stars light ambient fog duration transition fade_in fade_out vignette autoplay title look fov mode orbit roll auto name'.split(' '), i;
  for (i = 0; i < l.length; i++) KEYS[l[i]] = 1;
})();
ZER.KEYS = KEYS;
function lev(a, b) {
  var m = a.length, n = b.length, d = [], i, j;
  for (i = 0; i <= m; i++) { d[i] = [i]; } for (j = 1; j <= n; j++) d[0][j] = j;
  for (i = 1; i <= m; i++) for (j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1));
  return d[m][n];
}
function nearest(w, set) {
  var best = '', bd = 99, k, dd;
  w = w.toLowerCase();
  for (k in set) { dd = lev(w, k); if (dd < bd) { bd = dd; best = k; } }
  return bd <= Math.max(1, Math.floor(w.length / 3)) ? best : '';
}
ZER.nearest = nearest;
var curP = null;
var COMP = { x: 0, y: 1, z: 2, w: 0, h: 1, d: 2, r: 0, g: 1, b: 2 };
var uidc = 0;

function interp(str, loc, cx) {   // thay {biểu thức} trong tên/chuỗi tại lúc dựng
  if (str.indexOf('{') < 0) return str;
  return str.replace(/\{([^}]+)\}/g, function (m, ex) { var f = compileValue(ex, cx.line, cx); var v = f({ loc: loc, vars: {}, t: 0, dt: 0, frame: 0, step: 0 }); return isArr(v) ? v.join(',') : (typeof v === 'number' ? String(Math.round(v * 1e6) / 1e6) : String(v)); });
}
function constEval(f, loc, uf) { return f({ loc: loc || null, vars: {}, t: 0, dt: 0, frame: 0, step: 0, uf: uf || {} }); }

function parseProp(n, loc, cx) {  // -> [key, fn]
  var kv = splitKV(n.text), key = kv.head.toLowerCase().replace(/\s+/g, ' '), f, i, comps, k, m, idx, cf;
  if (hasOwn(ALIAS, key)) key = ALIAS[key];
  else if (/\s/.test(key) && kv.sep !== '') {
    var w1 = key.split(' ')[0], sg0 = nearest(w1, TYPES);
    throw ZError('Không có kiểu "' + w1 + '"' + (sg0 ? ' - có phải "' + sg0 + '"?' : '. Kiểu hợp lệ: ' + ZER.TYPES.join(', ')), n.ln);
  }
  if (kv.sep === '') {
    var w0 = kv.head.split(/\s+/)[0].toLowerCase(), sg = nearest(w0, TYPES);
    if (sg) throw ZError('Không có kiểu "' + w0 + '" - có phải "' + sg + '"? (cú pháp: ' + sg + ' ten:)', n.ln);
    sg = nearest(w0, KEYS);
    throw ZError('Dòng này cần dạng "tên = giá trị"' + (sg ? ' - có phải "' + sg + ' = ..."?' : ''), n.ln);
  }
  if (curP && !hasOwn(KEYS, key) && !/^[a-z]$/i.test(key)) { var sg2 = nearest(key, KEYS); curP.errors.push({ line: n.ln, warn: true, msg: 'Thuộc tính lạ "' + kv.head + '"' + (sg2 ? ' - có phải "' + sg2 + '"?' : ' (sẽ bị bỏ qua nếu vật không dùng)') }); }
  if (kv.rest !== '') { f = compileValue(kv.rest, n.ln, cx); return [key, f]; }
  if (!n.kids.length) throw ZError('Thiếu giá trị cho "' + kv.head + '"', n.ln);
  comps = []; var allk = true;
  for (i = 0; i < n.kids.length; i++) {
    k = n.kids[i]; m = /^([A-Za-z])\s*[=:]\s*(.+)$/.exec(k.text);
    if (!m || !hasOwn(COMP, m[1].toLowerCase())) throw ZError('Trong khối "' + kv.head + '" chỉ dùng X = , Y = , Z = (hoặc W/H/D)', k.ln);
    cf = compileValue(m[2], k.ln, cx); if (!cf.konst) allk = false;
    comps.push([COMP[m[1].toLowerCase()], cf]);
  }
  f = function (env) { var r = [null, null, null], j; for (j = 0; j < comps.length; j++) r[comps[j][0]] = comps[j][1](env); return r; };
  if (allk) { var v = f({}); f = konst(function () { return v; }, v); }
  return [key, f];
}

function parseObject(n, kv, host, loc, cx, P) {
  var words = splitWords(kv.head), type = words[0].toLowerCase(), name = null, arg, i, w, o, s, kids = n.kids;
  if (type === 'box') type = 'cube';
  for (i = 1; i < words.length; i++) {
    w = words[i];
    if (w.charAt(0) === '"' || w.charAt(0) === "'") { s = tokenize(w, n.ln)[0].v; arg = interp(s, loc, cx); }
    else if (name === null) name = interp(w, loc, cx);
    else throw ZError('Thừa "' + w + '" ở dòng khai báo', n.ln);
  }
  o = { type: type, name: name || ('#' + (++uidc)), named: !!name, line: n.ln, endLine: lastLn(n), props: {}, kids: [], loc: loc, id: ++uidc, parentId: host.id || 0 };
  o.objs = o.kids;
  if (arg !== undefined) { o.props[type === 'image' ? 'src' : 'text'] = konst(function () { return arg; }, arg); }
  parseBlock(kids, o, loc, cx, P);
  host.objs.push(o);
  return o;
}

function addDef(n, cx, P, m) {
  var params = m[2].replace(/\s/g, '') ? m[2].split(',').map(function (s) { return s.replace(/\s/g, ''); }) : [];
  cx.line = n.ln;
  P.uf[m[1]] = { params: params, fn: compileValue(m[3], n.ln, cx), line: n.ln };
}

function parseAnimate(n, host, loc, cx, P) {
  var head = n.text.replace(/^animate\s*/i, '').replace(/\s*:\s*$/, '').trim(), target, a, i, k, kv, m, tm, kf, pr, j, kk;
  if (head === '' || head.toLowerCase() === 'this') { if (!host.type) throw ZError('animate cần tên đối tượng, ví dụ: animate hop:', n.ln); target = host.name; }
  else target = interp(head, loc, cx);
  a = { target: target, kf: [], opts: {}, line: n.ln, loc: loc };
  for (i = 0; i < n.kids.length; i++) {
    k = n.kids[i]; kv = splitKV(k.text);
    if (/^at\s+/i.test(kv.head)) {
      tm = kv.head.replace(/^at\s+/i, '');
      kf = { time: N(constEval(compileValue(tm, k.ln, cx), loc, P.uf)), props: {}, ease: null, line: k.ln };
      if (kv.rest) { pr = parseProp({ text: kv.rest, kids: [], ln: k.ln }, loc, cx); kf.props[pr[0]] = pr[1]; }
      for (j = 0; j < k.kids.length; j++) {
        kk = k.kids[j]; pr = parseProp(kk, loc, cx);
        if (pr[0] === 'ease') kf.ease = pr[1]; else kf.props[pr[0]] = pr[1];
      }
      if (kf.props.ease) { kf.ease = kf.props.ease; delete kf.props.ease; }
      a.kf.push(kf);
    } else {
      pr = parseProp(k, loc, cx); a.opts[pr[0]] = pr[1];
    }
  }
  a.kf.sort(function (x, y) { return x.time - y.time; });
  P.cur.anims.push(a);
}

function parseNode(n, host, loc, cx, P) {
  var t = n.text, m, kv, words, type, i, v, a, b, st, nloc, cnt, key, pr;
  cx.line = n.ln;
  if ((m = /^let\s+([A-Za-z_À-ỹ][A-Za-z0-9_À-ỹ]*)\s*=\s*(.+)$/.exec(t))) {
    if (!P.cur) { P.globalLets.push({ name: m[1], fn: compileValue(m[2], n.ln, cx) }); return; }
    P.cur.lets.push({ name: m[1], fn: compileValue(m[2], n.ln, cx) }); return;
  }
  if ((m = /^def\s+([A-Za-z_]\w*)\s*\(([^)]*)\)\s*=\s*(.+)$/.exec(t))) { addDef(n, cx, P, m); return; }
  if ((m = /^for\s+([A-Za-z_À-ỹ][A-Za-z0-9_À-ỹ]*)\s+in\s+(.+?)\s*\.\.\s*(.+?)(?:\s+step\s+(.+?))?\s*:?\s*$/.exec(t))) {
    a = N(constEval(compileValue(m[2], n.ln, cx), loc, P.uf)); b = N(constEval(compileValue(m[3], n.ln, cx), loc, P.uf));
    st = m[4] ? N(constEval(compileValue(m[4], n.ln, cx), loc, P.uf)) : 1;
    if (!st) throw ZError('step không được bằng 0', n.ln);
    cnt = Math.ceil((b - a) / st);
    if (cnt > 3000) throw ZError('Vòng for chạy ' + cnt + ' lần, quá nhiều (tối đa 3000)', n.ln);
    for (i = 0; i < cnt; i++) {
      v = a + st * i; nloc = {}; for (key in (loc || {})) nloc[key] = loc[key]; nloc[m[1]] = v;
      parseBlock(n.kids, host, nloc, cx, P);
    }
    return;
  }
  if (/^animate(\s|:|$)/i.test(t)) { parseAnimate(n, host, loc, cx, P); return; }
  kv = splitKV(t); words = splitWords(kv.head); type = words.length ? words[0].toLowerCase() : '';
  if (TYPES[type] || type === 'box') {
    if (words.length > 1 || (kv.sep === ':' && kv.rest === '') || kv.sep === '') { parseObject(n, kv, host, loc, cx, P); return; }
  }
  if (!host.type && !host.isSlide && !host.isProject) throw ZError('Dòng không hợp lệ', n.ln);
  if (host.isSlide && words.length === 1 && words[0].toLowerCase() === 'camera' && kv.sep === ':' && kv.rest === '') {
    for (i = 0; i < n.kids.length; i++) { try { pr = parseProp(n.kids[i], loc, cx); P.cur.cam.props[pr[0]] = pr[1]; } catch (e) { P.errors.push({ line: e.zline || n.kids[i].ln, msg: e.message }); } }
    P.cur.cam.line = n.ln; P.cur.cam.endLine = lastLn(n); return;
  }
  pr = parseProp(n, loc, cx); host.props[pr[0]] = pr[1];
}
function parseBlock(nodes, host, loc, cx, P) {
  var i, n;
  for (i = 0; i < nodes.length; i++) {
    n = nodes[i];
    try { parseNode(n, host, loc, cx, P); } catch (e) { P.errors.push({ line: e.zline || n.ln, msg: e.message }); }
  }
}
function scanSteps(objs, P) {
  var i, o, mx = 0, r, u, c;
  for (i = 0; i < objs.length; i++) {
    o = objs[i];
    try { if (o.props.reveal) { r = N(constEval(o.props.reveal, o.loc, P.uf)); if (r > mx) mx = r; } if (o.props.until) { u = N(constEval(o.props.until, o.loc, P.uf)); if (u > mx) mx = u; } } catch (e) { /* biểu thức động: bỏ qua */ }
    c = scanSteps(o.kids, P); if (c > mx) mx = c;
  }
  return mx;
}

ZER.parse = function (src) {
  var tree = buildTree(src), P = { slides: [], uf: {}, errors: [], props: {}, globalLets: [], cur: null, title: '', isProject: true }, cx = { calls: [], line: 0 }, i, n, m, S, nm, pr, k;
  uidc = 0; curP = P;
  for (i = 0; i < tree.kids.length; i++) {
    n = tree.kids[i];
    try {
      if (/^project\s*:?\s*$/i.test(n.text)) {
        for (k = 0; k < n.kids.length; k++) { try { pr = parseProp(n.kids[k], {}, cx); P.props[pr[0]] = pr[1]; } catch (e) { P.errors.push({ line: e.zline || n.kids[k].ln, msg: e.message }); } }
      } else if ((m = /^slide(?:\s+(.*?))?\s*:?\s*$/i.exec(n.text))) {
        nm = m[1] ? m[1].replace(/^["']|["']$/g, '') : '';
        S = { name: nm || ('Slide ' + (P.slides.length + 1)), line: n.ln, endLine: lastLn(n), props: {}, objs: [], anims: [], lets: P.globalLets.slice(), cam: { props: {}, line: 0, endLine: 0 }, maxStep: 0, isSlide: true, id: 0 };
        P.cur = S; parseBlock(n.kids, S, {}, cx, P); S.maxStep = scanSteps(S.objs, P); P.slides.push(S); P.cur = null;
      } else if (/^def\s/.test(n.text) || /^let\s/.test(n.text)) { parseNode(n, P, {}, cx, P); }
      else throw ZError('Ngoài slide không có gì để vẽ. Hãy bắt đầu bằng: slide "Tên":', n.ln);
    } catch (e) { P.errors.push({ line: e.zline || n.ln, msg: e.message }); }
  }
  for (i = 0; i < cx.calls.length; i++) if (!F[cx.calls[i].n] && !P.uf[cx.calls[i].n]) P.errors.push({ line: cx.calls[i].line, msg: 'Chưa có hàm "' + cx.calls[i].n + '"' });
  P.errors.sort(function (a, b) { return a.line - b.line; });
  var seen = {}, out = []; for (i = 0; i < P.errors.length; i++) { k = P.errors[i].line + ':' + P.errors[i].msg; if (!seen[k]) { seen[k] = 1; out.push(P.errors[i]); } } P.errors = out;
  P.title = ''; try { if (P.props.title) P.title = String(constEval(P.props.title, {}, P.uf)); } catch (e2) {}
  return P;
};
ZER.constEval = constEval;
ZER.splitKV = splitKV;
ZER._ = { N: N, V3: V3, truthy: truthy, isArr: isArr, hasOwn: hasOwn, hash: hash, clamp: clamp, PI: PI, TAU: TAU, parseColor: parseColor, css: css, mixRGBA: mixRGBA, easeFn: easeFn, lerpAny: lerpAny, ZError: ZError, konst: konst, vnoise: vnoise };
