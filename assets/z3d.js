/* 2Z - vật thể 3D + bộ vẽ bằng Canvas 2D (không cần WebGL, chạy được máy cũ). ES5. */
(function (root) {
  'use strict';
  var Z = root.Z2011, Z3D = root.Z3D = { quality: 1 };
  var ZError = Z.Error, isArr = Z.isArr, toRGBA = Z.toRGBA, vec3 = Z.vec3, num = Z.num;
  var D2R = Math.PI / 180, sin = Math.sin, cos = Math.cos, sqrt = Math.sqrt, abs = Math.abs;

  /* ---------- ma trận affine 3x4 (hàng) ---------- */
  function mIdent() { return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0]; }
  function mMul(a, b) {
    var o = new Array(12), r, c;
    for (r = 0; r < 3; r++) {
      for (c = 0; c < 3; c++) o[r * 4 + c] = a[r * 4] * b[c] + a[r * 4 + 1] * b[4 + c] + a[r * 4 + 2] * b[8 + c];
      o[r * 4 + 3] = a[r * 4] * b[3] + a[r * 4 + 1] * b[7] + a[r * 4 + 2] * b[11] + a[r * 4 + 3];
    }
    return o;
  }
  function mTRS(p, r, s) {
    var cx = cos(r[0] * D2R), sx = sin(r[0] * D2R), cy = cos(r[1] * D2R), sy = sin(r[1] * D2R), cz = cos(r[2] * D2R), sz = sin(r[2] * D2R);
    // R = Ry * Rx * Rz
    var Rz = [cz, -sz, 0, sz, cz, 0, 0, 0, 1], Rx = [1, 0, 0, 0, cx, -sx, 0, sx, cx], Ry = [cy, 0, sy, 0, 1, 0, -sy, 0, cy];
    function m3(a, b) { var o = [], i, j; for (i = 0; i < 3; i++) for (j = 0; j < 3; j++) o.push(a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j]); return o; }
    var R = m3(m3(Ry, Rx), Rz);
    return [R[0] * s[0], R[1] * s[1], R[2] * s[2], p[0], R[3] * s[0], R[4] * s[1], R[5] * s[2], p[1], R[6] * s[0], R[7] * s[1], R[8] * s[2], p[2]];
  }
  function mPt(m, p) { return [m[0] * p[0] + m[1] * p[1] + m[2] * p[2] + m[3], m[4] * p[0] + m[5] * p[1] + m[6] * p[2] + m[7], m[8] * p[0] + m[9] * p[1] + m[10] * p[2] + m[11]]; }
  Z3D.mat = { ident: mIdent, mul: mMul, trs: mTRS, pt: mPt };
  function vsub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function vdot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function vcross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function vnorm(a) { var l = sqrt(vdot(a, a)) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }

  /* ---------- các loại vật + thuộc tính ---------- */
  var COMMON = { color: '#cfd8e8', opacity: 1, visible: true, wire: false, lit: true, glow: 0, trail: 0, texture: '', cull: true, fog: true };
  var KINDS = Z3D.KINDS = {
    sphere: { params: ['radius'], props: { radius: 1, detail: 1 }, doc: 'Hình cầu' },
    box: { params: ['width', 'height', 'depth'], props: { width: 1, height: 1, depth: 1 }, doc: 'Hình hộp / khối lập phương' },
    cylinder: { params: ['radius', 'height'], props: { radius: .5, height: 1, sides: 24 }, doc: 'Hình trụ' },
    cone: { params: ['radius', 'height'], props: { radius: .5, height: 1, sides: 24 }, doc: 'Hình nón' },
    torus: { params: ['radius', 'tube'], props: { radius: 1, tube: .3, sides: 12, rings: 32 }, doc: 'Hình xuyến (bánh donut)' },
    plane: { params: ['width', 'height'], props: { width: 2, height: 2 }, doc: 'Mặt phẳng (nằm trong mặt XY, hai mặt)' },
    image: { params: ['src', 'width'], props: { src: '', width: 4, height: 0, lit: false }, doc: 'Hình ảnh nhập vào, đặt trong không gian 3D (height = 0 thì tự theo tỉ lệ)' },
    line: { params: ['from', 'to'], props: { from: [0, 0, 0], to: [1, 0, 0], width: 2 }, doc: 'Đoạn thẳng' },
    polyline: { params: ['points'], props: { points: [], closed: false, width: 2 }, doc: 'Đường gấp khúc qua danh sách điểm' },
    circle: { params: ['radius'], props: { radius: 1, segments: 64, width: 2 }, doc: 'Đường tròn (trong mặt phẳng XZ)' },
    grid: { params: ['size', 'step'], props: { size: 10, step: 1, width: 1 }, doc: 'Lưới sàn' },
    axes: { params: ['size'], props: { size: 2, width: 3 }, doc: 'Ba trục X (đỏ) Y (xanh lá) Z (xanh dương)' },
    points: { params: ['points'], props: { points: [], size: 3 }, doc: 'Đám điểm' },
    particles: { params: ['rate'], props: { rate: 30, life: 2, speed: 1, spread: 1, gravity: 0, size: 3, color2: '', max: 500, dir: [0, 1, 0] }, doc: 'Phun hạt liên tục (lửa, khói, tia lửa...)' },
    text: { params: ['text', 'size'], props: { text: '', size: .5, align: 'center', font: '', bold: false, space: 'world', bg: '' }, doc: 'Chữ: space="world" là nhãn 3D, space="screen" là chữ cố định trên màn hình (X,Y tính theo khung 1920x1080)' },
    mesh: { params: ['verts', 'faces'], props: { verts: [], faces: [], uv: [] }, doc: 'Lưới tự định nghĩa: verts=[(x,y,z)...], faces=[[0,1,2],...]' },
    light: { params: ['type', 'intensity'], props: { type: 'point', intensity: 1, range: 0 }, doc: 'Nguồn sáng: type = "point", "sun" hoặc "ambient"' },
    group: { params: [], props: {}, doc: 'Nhóm rỗng, dùng làm cha để xoay/di chuyển nhiều vật cùng lúc (parent = ten_nhom)' }
  };
  var k;
  for (k in KINDS) if (Object.prototype.hasOwnProperty.call(KINDS, k)) Z.kinds[k] = true;
  var NUMPROPS = { opacity: 1, glow: 1, trail: 1, radius: 1, detail: 1, width: 1, height: 1, depth: 1, sides: 1, rings: 1, tube: 1, size: 1, step: 1, segments: 1, rate: 1, life: 1, speed: 1, spread: 1, gravity: 1, max: 1, intensity: 1, range: 1 };
  var COLPROPS = { color: 1, color2: 1, bg: 1 };
  var BOOLPROPS = { visible: 1, wire: 1, lit: 1, cull: 1, closed: 1, bold: 1, fog: 1 };
  var uid = 0;

  function copyVal(v) { return isArr(v) ? JSON.parse(JSON.stringify(v)) : v; }
  function suggest(name, list) {
    var best = null, bd = 3, i, d;
    for (i = 0; i < list.length; i++) { d = lev(name.toLowerCase(), list[i].toLowerCase()); if (d < bd) { bd = d; best = list[i]; } }
    return best ? ' (ý bạn là "' + best + '"?)' : '';
  }
  function lev(a, b) {
    if (abs(a.length - b.length) > 2) return 99;
    var m = [], i, j;
    for (i = 0; i <= a.length; i++) m[i] = [i]; for (j = 1; j <= b.length; j++) m[0][j] = j;
    for (i = 1; i <= a.length; i++) for (j = 1; j <= b.length; j++) m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + (a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1));
    return m[a.length][b.length];
  }
  Z3D.suggest = suggest;

  /* ---------- Obj ---------- */
  function Obj(slide, kind, name) {
    var K = KINDS[kind], p;
    this.$name = true; this.$api = true; this.id = ++uid;
    this.kind = kind; this.name = name; this.slide = slide;
    this.coordinates = { X: 0, Y: 0, Z: 0 }; this.rotation = { X: 0, Y: 0, Z: 0 }; this.scale = { X: 1, Y: 1, Z: 1 };
    this.parent = null; this.$props = {};
    for (p in COMMON) if (Object.prototype.hasOwnProperty.call(COMMON, p)) { this[p] = COMMON[p]; this.$props[p] = 1; }
    for (p in K.props) if (Object.prototype.hasOwnProperty.call(K.props, p)) { this[p] = copyVal(K.props[p]); this.$props[p] = 1; }
    if (kind === 'light') this.color = '#ffffff';
    if (kind === 'text') this.color = '#ffffff';
    if (kind === 'particles') this.color = '#ffb547';
    this._line = 0; this._end = 0; this._file = 'slide'; this._trail = []; this._parts = []; this._acc = 0; this._W = null; this._rev = 0;
  }
  var ALLPROPS = ['coordinates', 'position', 'pos', 'rotation', 'rot', 'scale', 'parent', 'X', 'Y', 'Z', 'name'];
  Obj.prototype = {
    $set: function (n, v) {
      var i, a;
      switch (n) {
        case 'X': case 'Y': case 'Z': this.coordinates[n] = num(v, n); return;
        case 'coordinates': case 'position': case 'pos':
          if (isArr(v)) { a = vec3(v, n); this.coordinates.X = a[0]; this.coordinates.Y = a[1]; this.coordinates.Z = a[2]; return; }
          throw new ZError(n + ' cần một vec (x, y, z); để gán từng trục hãy viết khối "coordinates:" rồi X = ...');
        case 'rotation': case 'rot': a = vec3(v, n); this.rotation.X = a[0]; this.rotation.Y = a[1]; this.rotation.Z = a[2]; return;
        case 'scale': a = vec3(v, n); this.scale.X = a[0]; this.scale.Y = a[1]; this.scale.Z = a[2]; return;
        case 'parent':
          if (v === null || v === '' || v === false) { this.parent = null; return; }
          if (typeof v === 'string') { a = this.slide.find(v); if (!a) throw new ZError('không tìm thấy vật "' + v + '" để làm cha'); v = a; }
          if (!v || !v.$name) throw new ZError('parent cần tên một vật');
          for (a = v; a; a = a.parent) if (a === this) throw new ZError('parent tạo vòng lặp');
          this.parent = v; return;
        case 'name': this.name = String(v); return;
        case 'size':
          if (this.kind === 'box') { a = vec3(v, 'size'); this.width = a[0]; this.height = a[1]; this.depth = a[2]; return; }
          break;
      }
      if (!this.$props[n]) throw new ZError('vật "' + this.name + '" (' + this.kind + ') không có thuộc tính "' + n + '"' + suggest(n, ALLPROPS.concat(Object.keys(this.$props))));
      if (COLPROPS[n]) { if (v !== '' && v !== null) toRGBA(v); this[n] = v; this._rev++; return; }
      if (NUMPROPS[n]) { this[n] = num(v, n); this._rev++; return; }
      if (BOOLPROPS[n]) { this[n] = !!v; return; }
      if (n === 'size' || n === 'width' || n === 'height') { this[n] = num(v, n); this._rev++; return; }
      this[n] = copyVal(v); this._rev++;
    },
    $get: function (n) {
      switch (n) {
        case 'X': case 'Y': case 'Z': return this.coordinates[n];
        case 'coordinates': case 'rotation': case 'scale': case 'parent': case 'name': case 'kind': return this[n];
        case 'position': case 'pos': return [this.coordinates.X, this.coordinates.Y, this.coordinates.Z];
        case 'rot': return [this.rotation.X, this.rotation.Y, this.rotation.Z];
        case 'world': return this.$world();
      }
      if (this.$props[n]) return this[n];
      throw new ZError('vật "' + this.name + '" không có thuộc tính "' + n + '"' + suggest(n, ALLPROPS.concat(Object.keys(this.$props))));
    },
    $local: function () { var c = this.coordinates, r = this.rotation, s = this.scale; return mTRS([c.X, c.Y, c.Z], [r.X, r.Y, r.Z], [s.X, s.Y, s.Z]); },
    $matrix: function () { var m = this.$local(); return this.parent ? mMul(this.parent.$matrix(), m) : m; },
    $world: function () { var m = this.$matrix(); return [m[3], m[7], m[11]]; }
  };
  /* phương thức dạng obj.move(...) = move(obj, ...): được nối ở zrun.js */
  Z3D.Obj = Obj;

  /* ---------- mesh ---------- */
  var meshCache = {};
  function orient(mesh, refFn) {
    var i, f, c, n, r, v = mesh.v, j;
    for (i = 0; i < mesh.f.length; i++) {
      f = mesh.f[i];
      c = [0, 0, 0]; for (j = 0; j < f.length; j++) { c[0] += v[f[j]][0]; c[1] += v[f[j]][1]; c[2] += v[f[j]][2]; }
      c[0] /= f.length; c[1] /= f.length; c[2] /= f.length;
      n = vcross(vsub(v[f[1]], v[f[0]]), vsub(v[f[2]], v[f[0]]));
      r = refFn(c);
      if (vdot(n, r) < 0) mesh.f[i] = f.slice().reverse();
    }
    return mesh;
  }
  function centroidRef(c) { return c; }
  function mSphere(r, lat, lon) {
    var v = [], uv = [], f = [], i, j, phi, th, y, rr;
    for (i = 0; i <= lat; i++) { phi = Math.PI * i / lat; y = cos(phi) * r; rr = sin(phi) * r; for (j = 0; j <= lon; j++) { th = 2 * Math.PI * j / lon; v.push([rr * cos(th), y, rr * sin(th)]); uv.push([j / lon, i / lat]); } }
    for (i = 0; i < lat; i++) for (j = 0; j < lon; j++) {
      var a = i * (lon + 1) + j, b = a + 1, c = a + lon + 1, d = c + 1;
      if (i === 0) f.push([a, c, d]); else if (i === lat - 1) f.push([a, c, b]); else f.push([a, c, d, b]);
    }
    return orient({ v: v, f: f, uv: uv, radial: true, closed: true }, centroidRef);
  }
  function mBox(w, h, d) {
    var x = w / 2, y = h / 2, z = d / 2, v = [], uv = [], f = [];
    var faces = [[[-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z]], [[x, -y, -z], [-x, -y, -z], [-x, y, -z], [x, y, -z]], [[-x, -y, -z], [-x, -y, z], [-x, y, z], [-x, y, -z]], [[x, -y, z], [x, -y, -z], [x, y, -z], [x, y, z]], [[-x, y, z], [x, y, z], [x, y, -z], [-x, y, -z]], [[-x, -y, -z], [x, -y, -z], [x, -y, z], [-x, -y, z]]];
    var q = [[0, 1], [1, 1], [1, 0], [0, 0]], i, j;
    for (i = 0; i < 6; i++) { for (j = 0; j < 4; j++) { v.push(faces[i][j]); uv.push(q[j]); } f.push([i * 4, i * 4 + 1, i * 4 + 2, i * 4 + 3]); }
    return orient({ v: v, f: f, uv: uv, closed: true }, centroidRef);
  }
  function mCyl(r1, r2, h, n) {
    var v = [], uv = [], f = [], i, th, y = h / 2;
    for (i = 0; i <= n; i++) { th = 2 * Math.PI * i / n; v.push([r1 * cos(th), -y, r1 * sin(th)]); uv.push([i / n, 1]); v.push([r2 * cos(th), y, r2 * sin(th)]); uv.push([i / n, 0]); }
    for (i = 0; i < n; i++) { var a = i * 2, b = a + 1, c = a + 2, d = a + 3; if (r2 === 0) f.push([a, c, b]); else f.push([a, c, d, b]); }
    var bot = [], top = [], base = v.length;
    for (i = 0; i < n; i++) { th = 2 * Math.PI * i / n; v.push([r1 * cos(th), -y, r1 * sin(th)]); uv.push([.5 + .5 * cos(th), .5 + .5 * sin(th)]); bot.push(base + i); }
    f.push(bot);
    if (r2 > 0) { base = v.length; for (i = 0; i < n; i++) { th = 2 * Math.PI * i / n; v.push([r2 * cos(th), y, r2 * sin(th)]); uv.push([.5 + .5 * cos(th), .5 + .5 * sin(th)]); top.push(base + i); } f.push(top); }
    return orient({ v: v, f: f, uv: uv, closed: true }, function (c) { return [c[0], c[1] - 0 * y, c[2]].concat(); });
  }
  function mTorus(R, r, sides, rings) {
    var v = [], uv = [], f = [], i, j, a, b, ca, sa, cb, sb;
    for (i = 0; i <= rings; i++) { a = 2 * Math.PI * i / rings; ca = cos(a); sa = sin(a); for (j = 0; j <= sides; j++) { b = 2 * Math.PI * j / sides; cb = cos(b); sb = sin(b); v.push([(R + r * cb) * ca, r * sb, (R + r * cb) * sa]); uv.push([i / rings, j / sides]); } }
    for (i = 0; i < rings; i++) for (j = 0; j < sides; j++) { var p = i * (sides + 1) + j; f.push([p, p + sides + 1, p + sides + 2, p + 1]); }
    var m = { v: v, f: f, uv: uv, closed: true }, n, c, ct, q;
    for (q = 0; q < f.length; q++) {
      var fc = f[q]; c = [0, 0, 0]; for (j = 0; j < 4; j++) { c[0] += v[fc[j]][0] / 4; c[1] += v[fc[j]][1] / 4; c[2] += v[fc[j]][2] / 4; }
      ct = vnorm([c[0], 0, c[2]]); ct = [ct[0] * R, 0, ct[2] * R];
      n = vcross(vsub(v[fc[1]], v[fc[0]]), vsub(v[fc[2]], v[fc[0]]));
      if (vdot(n, vsub(c, ct)) < 0) f[q] = fc.slice().reverse();
    }
    return m;
  }
  function mPlane(w, h, nx, ny) {
    var v = [], uv = [], f = [], i, j;
    for (j = 0; j <= ny; j++) for (i = 0; i <= nx; i++) { v.push([(i / nx - .5) * w, (.5 - j / ny) * h, 0]); uv.push([i / nx, j / ny]); }
    for (j = 0; j < ny; j++) for (i = 0; i < nx; i++) { var a = j * (nx + 1) + i; f.push([a, a + 1, a + nx + 2, a + nx + 1]); }
    return { v: v, f: f, uv: uv, double: true };
  }
  function getMesh(o) {
    var q = Z3D.quality, key, m, lat, lon, sg;
    switch (o.kind) {
      case 'sphere':
        lat = Math.max(6, Math.round(11 * q * (o.detail || 1))); lon = lat * 2; key = 's' + o.radius + '_' + lat;
        return meshCache[key] || (meshCache[key] = mSphere(o.radius, lat, lon));
      case 'box': key = 'b' + o.width + '_' + o.height + '_' + o.depth + (o.texture ? 't' : ''); return meshCache[key] || (meshCache[key] = mBox(o.width, o.height, o.depth));
      case 'cylinder': sg = Math.max(8, Math.round(o.sides * Math.max(.5, q))); key = 'c' + o.radius + '_' + o.height + '_' + sg; return meshCache[key] || (meshCache[key] = mCyl(o.radius, o.radius, o.height, sg));
      case 'cone': sg = Math.max(8, Math.round(o.sides * Math.max(.5, q))); key = 'n' + o.radius + '_' + o.height + '_' + sg; return meshCache[key] || (meshCache[key] = mCyl(o.radius, 0, o.height, sg));
      case 'torus': var sd = Math.max(6, Math.round(o.sides * Math.max(.5, q))), rg = Math.max(10, Math.round(o.rings * Math.max(.5, q))); key = 't' + o.radius + '_' + o.tube + '_' + sd + '_' + rg; return meshCache[key] || (meshCache[key] = mTorus(o.radius, o.tube, sd, rg));
      case 'plane': case 'image':
        var w = o.width, h = o.height;
        if (o.kind === 'image') { var im = o._img; h = h || (im && im.width ? w * im.naturalHeight / im.naturalWidth : w * .6); }
        var nxy = o.kind === 'image' ? Math.max(1, Math.round(4 * q)) : 1;
        key = 'p' + w + '_' + h + '_' + nxy; return meshCache[key] || (meshCache[key] = mPlane(w, h, nxy, nxy));
      case 'mesh':
        if (o._meshRev === o._rev && o._mesh) return o._mesh;
        var vs = [], fs = [], i, j;
        for (i = 0; i < o.verts.length; i++) vs.push(vec3(o.verts[i], 'verts[' + i + ']'));
        for (i = 0; i < o.faces.length; i++) { var fa = o.faces[i]; if (!isArr(fa) || fa.length < 3) throw new ZError('mỗi face cần ít nhất 3 chỉ số'); for (j = 0; j < fa.length; j++) if (!(fa[j] >= 0 && fa[j] < vs.length)) throw new ZError('face tham chiếu điểm không tồn tại: ' + fa[j]); fs.push(fa.slice()); }
        o._mesh = { v: vs, f: fs, uv: o.uv && o.uv.length ? o.uv : null, double: true }; o._meshRev = o._rev; return o._mesh;
    }
    return null;
  }

  /* ---------- Renderer ---------- */
  function Renderer(canvas) {
    this.cv = canvas; this.ctx = canvas.getContext('2d');
    this.rot = [1, 0, 0, 0, 1, 0, 0, 0, 1]; this.zoom = 1;
    this.items = []; this.stats = { polys: 0 };
    this.w = 0; this.h = 0; this.dpr = 1; this.scale = 1;
    this.starsData = null;
  }
  Renderer.prototype = {
    resize: function () {
      var cv = this.cv, w = cv.clientWidth || 640, h = cv.clientHeight || 360, dpr = Math.min(root.devicePixelRatio || 1, Z3D.quality < .7 ? 1 : 1.5);
      if (this.w !== w || this.h !== h || this.dpr !== dpr) { this.w = w; this.h = h; this.dpr = dpr; cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    },
    resetView: function () { this.rot = [1, 0, 0, 0, 1, 0, 0, 0, 1]; this.zoom = 1; },
    /* xoay trackball: vòng quanh mọi hướng, không bị kẹt trục */
    orbitBy: function (dx, dy) {
      var u = this.basis.u, r = this.basis.r;
      this.rot = rotMul(rodrigues(u, -dx * .35 * D2R), this.rot);
      this.rot = rotMul(rodrigues(r, -dy * .35 * D2R), this.rot);
    },
    setupCamera: function (cam) {
      var c = cam.coordinates, lk = cam.look, e = [c.X, c.Y, c.Z], T = [lk.X, lk.Y, lk.Z];
      var off = vsub(e, T), R = this.rot;
      off = [R[0] * off[0] + R[1] * off[1] + R[2] * off[2], R[3] * off[0] + R[4] * off[1] + R[5] * off[2], R[6] * off[0] + R[7] * off[1] + R[8] * off[2]];
      off = [off[0] * this.zoom, off[1] * this.zoom, off[2] * this.zoom];
      var eye = [T[0] + off[0], T[1] + off[1], T[2] + off[2]];
      var up = [R[3], R[4], R[5]];                                   // vec lên của người dùng xoay
      var f = vnorm(vsub(T, eye)), rr = vcross(f, up);
      if (vdot(rr, rr) < 1e-8) { up = [R[0], R[1], R[2]]; rr = vcross(f, up); }
      rr = vnorm(rr); var uu = vcross(rr, f);
      if (cam.roll) { var cr = cos(cam.roll * D2R), sr = sin(cam.roll * D2R); var r2 = [rr[0] * cr + uu[0] * sr, rr[1] * cr + uu[1] * sr, rr[2] * cr + uu[2] * sr]; uu = [uu[0] * cr - rr[0] * sr, uu[1] * cr - rr[1] * sr, uu[2] * cr - rr[2] * sr]; rr = r2; }
      this.basis = { e: eye, r: rr, u: uu, f: f };
      this.near = cam.near || .05;
      this.fpx = (this.h / 2) / Math.tan(Math.max(5, Math.min(170, cam.fov)) * D2R / 2);
    },
    toCam: function (p) {
      var b = this.basis, dx = p[0] - b.e[0], dy = p[1] - b.e[1], dz = p[2] - b.e[2];
      return [dx * b.r[0] + dy * b.r[1] + dz * b.r[2], dx * b.u[0] + dy * b.u[1] + dz * b.u[2], dx * b.f[0] + dy * b.f[1] + dz * b.f[2]];
    },
    proj: function (c) { return [this.w / 2 + c[0] / c[2] * this.fpx, this.h / 2 - c[1] / c[2] * this.fpx]; },

    render: function (slide, opt) {
      opt = opt || {};
      this.resize();
      var ctx = this.ctx, w = this.w, h = this.h, dpr = this.dpr, S = slide.scn, i, o;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.setupCamera(slide.cam);
      this.vs = Math.min(w / 1920, h / 1080);                        // tỉ lệ khung ảo 1920x1080 cho chữ HUD
      // nền
      if (S.background2) { var g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, S.background); g.addColorStop(1, S.background2); ctx.fillStyle = g; } else ctx.fillStyle = S.background;
      ctx.fillRect(0, 0, w, h);
      this.bgc = toRGBA(S.background);
      if (S.stars > 0) this.drawStars(S);
      // ánh sáng
      this.lights = []; this.ambient = S.ambient; var any = false;
      for (i = 0; i < slide.objects.length; i++) {
        o = slide.objects[i];
        if (o.kind === 'light' && o.visible) {
          any = true; var col = toRGBA(o.color);
          if (o.type === 'ambient') this.ambient += o.intensity * .5;
          else this.lights.push({ t: o.type === 'sun' ? 1 : 0, p: o.$world(), i: o.intensity, r: o.range, c: [col[0] / 255, col[1] / 255, col[2] / 255] });
        }
      }
      if (!any) { this.lights.push({ t: 1, p: [-.4, .8, .6], i: .8, r: 0, c: [1, 1, 1] }); this.ambient = Math.max(this.ambient, .35); }
      // gom vật
      var items = this.items = [], n = 0, hud = [];
      var polyBudget = 60000;
      for (i = 0; i < slide.objects.length; i++) {
        o = slide.objects[i];
        if (!o.visible && o.kind !== 'particles') continue;
        o._W = o.$matrix();
        try { this.collect(o, items, hud, S); } catch (e) { if (!o._err) { o._err = true; slide.error(e, o._line, o._file); } }
      }
      this.stats.polys = items.length;
      items.sort(function (a, b) { return b.z - a.z; });
      for (i = 0; i < items.length; i++) this.drawItem(ctx, items[i], S);
      // chọn: viền sáng
      if (opt.selected) this.drawSelection(ctx, opt.selected);
      for (i = 0; i < hud.length; i++) this.drawText(ctx, hud[i], true);
      if (opt.grid) { /* dành cho studio */ }
    },
    drawStars: function (S) {
      var ctx = this.ctx, n = S.stars | 0, st = this.starsData, i, b = this.basis;
      if (!st || st.length !== n) { st = this.starsData = []; var sd = 99; for (i = 0; i < n; i++) { sd = (sd * 16807) % 2147483647; var a = sd / 2147483647; sd = (sd * 16807) % 2147483647; var bb = sd / 2147483647; sd = (sd * 16807) % 2147483647; var cc = sd / 2147483647; var z = a * 2 - 1, th = bb * 6.2832, r = sqrt(1 - z * z); st.push([r * cos(th), z, r * sin(th), .3 + cc * .7]); } }
      ctx.fillStyle = '#fff';
      for (i = 0; i < st.length; i++) {
        var p = st[i], x = p[0] * b.r[0] + p[1] * b.r[1] + p[2] * b.r[2], y = p[0] * b.u[0] + p[1] * b.u[1] + p[2] * b.u[2], z2 = p[0] * b.f[0] + p[1] * b.f[1] + p[2] * b.f[2];
        if (z2 <= .05) continue;
        ctx.globalAlpha = p[3]; ctx.fillRect(this.w / 2 + x / z2 * this.fpx, this.h / 2 - y / z2 * this.fpx, p[3] > .8 ? 2 : 1, p[3] > .8 ? 2 : 1);
      }
      ctx.globalAlpha = 1;
    },
    shade: function (n, c) {
      var s = this.ambient, L = this.lights, i, l, d, dd, ld, att;
      for (i = 0; i < L.length; i++) {
        l = L[i];
        if (l.t === 1) ld = vnorm(l.p); else { ld = vsub(l.p, c); dd = sqrt(vdot(ld, ld)) || 1; ld = [ld[0] / dd, ld[1] / dd, ld[2] / dd]; }
        d = vdot(n, ld); if (d <= 0) continue;
        att = 1; if (l.t === 0) { dd = sqrt(vdot(vsub(l.p, c), vsub(l.p, c))); att = l.r > 0 ? Math.max(0, 1 - dd / l.r) : 1 / (1 + dd * dd * .004); }
        s += d * l.i * att;
      }
      return Math.min(1.15, s);
    },
    fogMix: function (rgb, z, S) {
      if (!S.fog || S.fog <= 0) return rgb;
      var k = Math.min(1, Math.max(0, (z - S.fog * .3) / (S.fog * .9))), b = this.bgc;
      return [rgb[0] + (b[0] - rgb[0]) * k, rgb[1] + (b[1] - rgb[1]) * k, rgb[2] + (b[2] - rgb[2]) * k];
    },
    collect: function (o, items, hud, S) {
      var W = o._W, kind = o.kind, i, j, col, rgb;
      if (kind === 'light' || kind === 'group') return;
      if (kind === 'text') {
        if (o.space === 'screen') { hud.push({ o: o, x: o.coordinates.X, y: o.coordinates.Y, z: 0 }); return; }
        var cp = this.toCam(mPt(W, [0, 0, 0])); if (cp[2] > this.near) items.push({ t: 3, z: cp[2], o: o, c: cp });
        return;
      }
      if (kind === 'line' || kind === 'polyline' || kind === 'circle' || kind === 'grid' || kind === 'axes') { this.collectLines(o, items); return; }
      if (kind === 'points') { this.collectPoints(o, items, o.points, o.size, 1); return; }
      if (kind === 'particles') { this.collectPoints(o, items, null, o.size, 2); return; }
      if (o._trail && o.trail > 0 && o._trail.length > 1) {
        var tp = [], tz = 1e9; for (i = 0; i < o._trail.length; i++) { var c0 = this.toCam(o._trail[i]); tp.push(c0); if (c0[2] < tz) tz = c0[2]; }
        items.push({ t: 5, z: tz + .001, o: o, pts: tp });
      }
      var mesh = getMesh(o); if (!mesh) return;
      var tex = null;
      if (o.texture || kind === 'image') { var nm = kind === 'image' ? o.src : o.texture; tex = o._img = this.slide_getImage(o, nm); }
      var wc = mPt(W, [0, 0, 0]);
      var nv = mesh.v.length, wv = new Array(nv), cv = new Array(nv);
      for (i = 0; i < nv; i++) { wv[i] = mPt(W, mesh.v[i]); cv[i] = this.toCam(wv[i]); }
      col = toRGBA(o.color); var base = [col[0], col[1], col[2]], op = o.opacity * col[3];
      var near = this.near, E = this.basis.e, fpx = this.fpx, hw = this.w / 2, hh = this.h / 2;
      var minz = 1e9, glowDone = false;
      for (i = 0; i < mesh.f.length; i++) {
        var f = mesh.f[i], fl = f.length, ok = true, cc = [0, 0, 0], zs = 0, anyNear = false;
        for (j = 0; j < fl; j++) { var p = cv[f[j]]; if (p[2] <= near) { ok = false; anyNear = true; } }
        var a = wv[f[0]], b = wv[f[1]], c = wv[f[2]];
        var nrm = vcross(vsub(b, a), vsub(c, a));
        for (j = 0; j < fl; j++) { var q = wv[f[j]]; cc[0] += q[0]; cc[1] += q[1]; cc[2] += q[2]; }
        cc = [cc[0] / fl, cc[1] / fl, cc[2] / fl];
        if (mesh.radial) nrm = vsub(cc, wc);
        nrm = vnorm(nrm);
        var toEye = vsub(E, cc), facing = vdot(nrm, toEye);
        if (mesh.double) { if (facing < 0) { nrm = [-nrm[0], -nrm[1], -nrm[2]]; } }
        else if (o.cull && facing <= 0) continue;
        var sh = o.lit ? this.shade(nrm, cc) : 1;
        rgb = [base[0] * sh, base[1] * sh, base[2] * sh];
        var pts, z;
        if (ok) {
          pts = []; for (j = 0; j < fl; j++) { var cp2 = cv[f[j]]; pts.push(hw + cp2[0] / cp2[2] * fpx, hh - cp2[1] / cp2[2] * fpx); zs += cp2[2]; }
          z = zs / fl;
        } else {
          if (tex) continue;                                         // mặt có hình mà chạm mặt phẳng gần: bỏ
          var poly = [], prev = cv[f[fl - 1]], pin = prev[2] > near;
          for (j = 0; j < fl; j++) {
            var cur = cv[f[j]], cin = cur[2] > near;
            if (cin !== pin) { var tt = (near - prev[2]) / (cur[2] - prev[2]); poly.push([prev[0] + (cur[0] - prev[0]) * tt, prev[1] + (cur[1] - prev[1]) * tt, near]); }
            if (cin) poly.push(cur);
            prev = cur; pin = cin;
          }
          if (poly.length < 3) continue;
          pts = []; for (j = 0; j < poly.length; j++) { pts.push(hw + poly[j][0] / poly[j][2] * fpx, hh - poly[j][1] / poly[j][2] * fpx); zs += poly[j][2]; }
          z = zs / poly.length;
        }
        if (z < minz) minz = z;
        rgb = o.fog ? this.fogMix(rgb, z, S) : rgb;
        var it = { t: 0, z: z, o: o, p: pts, c: 'rgb(' + (rgb[0] | 0) + ',' + (rgb[1] | 0) + ',' + (rgb[2] | 0) + ')', a: op, wire: o.wire };
        if (tex && mesh.uv && tex.complete && tex.naturalWidth) {
          var tr = [], iw = tex.naturalWidth, ih = tex.naturalHeight, uv = mesh.uv, q0 = f[0];
          for (j = 1; j < fl - 1; j++) {
            var sa = [pts[0], pts[1]], sb = [pts[j * 2], pts[j * 2 + 1]], sc = [pts[j * 2 + 2], pts[j * 2 + 3]];
            tr.push([sa[0], sa[1], sb[0], sb[1], sc[0], sc[1], uv[f[0]][0] * iw, uv[f[0]][1] * ih, uv[f[j]][0] * iw, uv[f[j]][1] * ih, uv[f[j + 1]][0] * iw, uv[f[j + 1]][1] * ih]);
          }
          it.tex = tex; it.tr = tr; it.dark = o.lit ? 1 - Math.min(1, sh) : 0;
        } else if (tex) { it.c = '#808890'; }
        items.push(it);
      }
      if (o.glow > 0) {
        var gc = this.toCam(wc);
        if (gc[2] > near) {
          var rad = (kind === 'sphere' ? o.radius * (o.scale.X) : 1) * fpx / gc[2] * (1 + o.glow * 2.2);
          items.push({ t: 4, z: gc[2] + (kind === 'sphere' ? o.radius * o.scale.X : 0) + .01, o: o, x: hw + gc[0] / gc[2] * fpx, y: hh - gc[1] / gc[2] * fpx, r: rad, col: col, a: Math.min(1, .35 + o.glow * .3) * op });
        }
      }
    },
    slide_getImage: function (o, name) { return this.imgLoader ? this.imgLoader(name) : null; },
    collectLines: function (o, items) {
      var W = o._W, segs = [], i, r, s, pts, near = this.near;
      function add(a, b, col) { segs.push([a, b, col]); }
      if (o.kind === 'line') add(vec3(o.from, 'from'), vec3(o.to, 'to'));
      else if (o.kind === 'polyline') { pts = o.points; for (i = 0; i + 1 < pts.length; i++) add(vec3(pts[i], 'points'), vec3(pts[i + 1], 'points')); if (o.closed && pts.length > 2) add(vec3(pts[pts.length - 1]), vec3(pts[0])); }
      else if (o.kind === 'circle') { r = o.radius; s = Math.max(12, Math.round(o.segments * Math.max(.5, Z3D.quality))); for (i = 0; i < s; i++) add([r * cos(6.2832 * i / s), 0, r * sin(6.2832 * i / s)], [r * cos(6.2832 * (i + 1) / s), 0, r * sin(6.2832 * (i + 1) / s)]); }
      else if (o.kind === 'grid') { r = o.size; s = o.step; if (s <= 0) s = 1; if (r / s > 200) s = r / 200; for (i = -r; i <= r + 1e-9; i += s) { add([i, 0, -r], [i, 0, r]); add([-r, 0, i], [r, 0, i]); } }
      else if (o.kind === 'axes') { r = o.size; add([0, 0, 0], [r, 0, 0], '#ff5a5a'); add([0, 0, 0], [0, r, 0], '#5aff7a'); add([0, 0, 0], [0, 0, r], '#5a9bff'); }
      var col = toRGBA(o.color), base = 'rgb(' + (col[0] | 0) + ',' + (col[1] | 0) + ',' + (col[2] | 0) + ')';
      for (i = 0; i < segs.length; i++) {
        var a = this.toCam(mPt(W, segs[i][0])), b = this.toCam(mPt(W, segs[i][1]));
        if (a[2] <= near && b[2] <= near) continue;
        if (a[2] <= near) { var t1 = (near - a[2]) / (b[2] - a[2]); a = [a[0] + (b[0] - a[0]) * t1, a[1] + (b[1] - a[1]) * t1, near]; }
        else if (b[2] <= near) { var t2 = (near - b[2]) / (a[2] - b[2]); b = [b[0] + (a[0] - b[0]) * t2, b[1] + (a[1] - b[1]) * t2, near]; }
        var pa = this.proj(a), pb = this.proj(b);
        items.push({ t: 1, z: (a[2] + b[2]) / 2, o: o, p: [pa[0], pa[1], pb[0], pb[1]], c: segs[i][2] || base, a: o.opacity * col[3], lw: o.width });
      }
    },
    collectPoints: function (o, items, list, size, mode) {
      var W = o._W, i, near = this.near, col = toRGBA(o.color), cs = 'rgb(' + (col[0] | 0) + ',' + (col[1] | 0) + ',' + (col[2] | 0) + ')';
      if (mode === 2) {
        var P = o._parts, c2 = o.color2 ? toRGBA(o.color2) : null;
        for (i = 0; i < P.length; i++) {
          var pt = P[i], cp = this.toCam(pt.p); if (cp[2] <= near) continue;
          var sp = this.proj(cp), k = pt.age / pt.life, cc = cs;
          if (c2) cc = 'rgb(' + ((col[0] + (c2[0] - col[0]) * k) | 0) + ',' + ((col[1] + (c2[1] - col[1]) * k) | 0) + ',' + ((col[2] + (c2[2] - col[2]) * k) | 0) + ')';
          items.push({ t: 2, z: cp[2], o: o, x: sp[0], y: sp[1], r: size * (1 - k * .7) * this.vs * 1.2, c: cc, a: (1 - k) * o.opacity });
        }
        return;
      }
      for (i = 0; i < list.length; i++) {
        var q = this.toCam(mPt(W, vec3(list[i], 'points')));
        if (q[2] <= near) continue;
        var s2 = this.proj(q);
        items.push({ t: 2, z: q[2], o: o, x: s2[0], y: s2[1], r: size * this.vs * 1.2, c: cs, a: o.opacity * col[3] });
      }
    },
    drawText: function (ctx, it, hud) {
      var o = it.o, col = o.color, size, x, y, lines = String(o.text).split('\n'), i;
      if (hud) { size = o.size * (o.size <= 4 ? 100 : 1) * this.vs; x = it.x * this.vs + (this.w - 1920 * this.vs) / 2; y = it.y * this.vs + (this.h - 1080 * this.vs) / 2; }
      else { var c = it.c; size = o.size * this.fpx / c[2]; x = this.w / 2 + c[0] / c[2] * this.fpx; y = this.h / 2 - c[1] / c[2] * this.fpx; }
      if (size < 3) return;
      ctx.save();
      ctx.globalAlpha = o.opacity;
      ctx.font = (o.bold ? 'bold ' : '') + Math.round(size) + 'px ' + (o.font ? '"' + o.font + '",' : '') + '"Segoe UI",Tahoma,Arial,sans-serif';
      ctx.textAlign = o.align === 'left' ? 'left' : o.align === 'right' ? 'right' : 'center'; ctx.textBaseline = 'middle';
      var lh = size * 1.3, y0 = y - (lines.length - 1) * lh / 2;
      if (o.bg) {
        var mw = 0; for (i = 0; i < lines.length; i++) mw = Math.max(mw, ctx.measureText(lines[i]).width);
        var bx = o.align === 'left' ? x : o.align === 'right' ? x - mw : x - mw / 2, pd = size * .35;
        ctx.fillStyle = o.bg; ctx.fillRect(bx - pd, y0 - lh / 2 - pd * .3, mw + pd * 2, lines.length * lh + pd * .6);
      }
      ctx.fillStyle = col;
      for (i = 0; i < lines.length; i++) ctx.fillText(lines[i], x, y0 + i * lh);
      ctx.restore();
      it.bx = x; it.by = y; it.bw = Math.max.apply(null, lines.map(function (s) { return s.length; })) * size * .55; it.bh = lines.length * lh;
      o._hud = it;
    },
    drawItem: function (ctx, it, S) {
      var p, i, o = it.o;
      switch (it.t) {
        case 0:
          p = it.p; ctx.globalAlpha = it.a;
          ctx.beginPath(); ctx.moveTo(p[0], p[1]); for (i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]); ctx.closePath();
          if (it.tex) {
            var tr = it.tr, k;
            for (k = 0; k < tr.length; k++) drawTri(ctx, it.tex, tr[k], it.dark);
          } else if (it.wire) { ctx.strokeStyle = it.c; ctx.lineWidth = 1.2; ctx.stroke(); }
          else { ctx.fillStyle = it.c; ctx.fill(); if (it.a >= 1) { ctx.strokeStyle = it.c; ctx.lineWidth = .8; ctx.stroke(); } }
          ctx.globalAlpha = 1; break;
        case 1:
          ctx.globalAlpha = it.a; ctx.strokeStyle = it.c; ctx.lineWidth = it.lw * Math.max(.6, this.vs * 1.2);
          ctx.beginPath(); ctx.moveTo(it.p[0], it.p[1]); ctx.lineTo(it.p[2], it.p[3]); ctx.stroke(); ctx.globalAlpha = 1; break;
        case 2:
          ctx.globalAlpha = it.a; ctx.fillStyle = it.c; ctx.beginPath(); ctx.arc(it.x, it.y, Math.max(.6, it.r), 0, 6.2832); ctx.fill(); ctx.globalAlpha = 1; break;
        case 3: this.drawText(ctx, it, false); break;
        case 4:
          if (Z3D.quality < .5) break;
          var gr = ctx.createRadialGradient(it.x, it.y, 0, it.x, it.y, it.r), c = it.col, rgb = (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0);
          gr.addColorStop(0, 'rgba(' + rgb + ',' + it.a + ')'); gr.addColorStop(.35, 'rgba(' + rgb + ',' + (it.a * .35) + ')'); gr.addColorStop(1, 'rgba(' + rgb + ',0)');
          ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(it.x, it.y, it.r, 0, 6.2832); ctx.fill(); break;
        case 5:
          var pts = it.pts, n = pts.length, col = toRGBA(o.color), k2, a0, b0;
          for (k2 = 1; k2 < n; k2++) {
            a0 = pts[k2 - 1]; b0 = pts[k2]; if (a0[2] <= this.near || b0[2] <= this.near) continue;
            var pa = this.proj(a0), pb = this.proj(b0);
            ctx.globalAlpha = (k2 / n) * .8 * o.opacity; ctx.strokeStyle = 'rgb(' + (col[0] | 0) + ',' + (col[1] | 0) + ',' + (col[2] | 0) + ')'; ctx.lineWidth = Math.max(1, 2.2 * this.vs * 1.2);
            ctx.beginPath(); ctx.moveTo(pa[0], pa[1]); ctx.lineTo(pb[0], pb[1]); ctx.stroke();
          }
          ctx.globalAlpha = 1; break;
      }
    },
    drawSelection: function (ctx, sel) {
      var items = this.items, i, it, p, k;
      ctx.save(); ctx.strokeStyle = '#00e5ff'; ctx.lineWidth = 2; ctx.fillStyle = 'rgba(0,229,255,.12)';
      for (i = 0; i < items.length; i++) {
        it = items[i]; if (it.o !== sel) continue;
        if (it.t === 0) { p = it.p; ctx.beginPath(); ctx.moveTo(p[0], p[1]); for (k = 2; k < p.length; k += 2) ctx.lineTo(p[k], p[k + 1]); ctx.closePath(); ctx.fill(); ctx.stroke(); }
        else if (it.t === 1) { ctx.beginPath(); ctx.moveTo(it.p[0], it.p[1]); ctx.lineTo(it.p[2], it.p[3]); ctx.stroke(); }
        else if (it.t === 2) { ctx.beginPath(); ctx.arc(it.x, it.y, it.r + 3, 0, 6.2832); ctx.stroke(); }
        else if (it.t === 3 && sel._hud) { }
      }
      if (sel._hud && sel.space === 'screen') { var h = sel._hud; ctx.strokeRect(h.bx - h.bw / 2 - 6, h.by - h.bh / 2 - 6, h.bw + 12, h.bh + 12); }
      ctx.restore();
    },
    /* tìm vật dưới con trỏ (toạ độ trong canvas, px CSS) */
    pick: function (x, y) {
      var items = this.items, i, it, p, k, dx, dy;
      for (i = this.hudItems_ ? 0 : 0; i < 0; i++) { }
      // HUD trước (nằm trên cùng)
      for (i = 0; i < (this.slideObjs ? this.slideObjs.length : 0); i++) { }
      for (i = items.length - 1; i >= 0; i--) {
        it = items[i];
        if (it.t === 0) { if (inPoly(it.p, x, y)) return it.o; }
        else if (it.t === 1) { if (distSeg(x, y, it.p) < 6) return it.o; }
        else if (it.t === 2) { dx = x - it.x; dy = y - it.y; if (dx * dx + dy * dy < (it.r + 5) * (it.r + 5)) return it.o; }
        else if (it.t === 3 || it.t === 4) {
          if (it.t === 3) { var sz = it.o.size * this.fpx / it.c[2], cx = this.w / 2 + it.c[0] / it.c[2] * this.fpx, cy = this.h / 2 - it.c[1] / it.c[2] * this.fpx, ww = String(it.o.text).length * sz * .55; if (abs(x - cx) < ww / 2 + 4 && abs(y - cy) < sz) return it.o; }
        }
      }
      return null;
    },
    pickHud: function (objs, x, y) {
      var i, o, h;
      for (i = objs.length - 1; i >= 0; i--) { o = objs[i]; h = o._hud; if (o.kind === 'text' && o.space === 'screen' && o.visible && h && abs(x - h.bx) < h.bw / 2 + 8 && abs(y - h.by) < h.bh / 2 + 8) return o; }
      return null;
    }
  };
  function rotMul(a, b) { var o = [], i, j; for (i = 0; i < 3; i++) for (j = 0; j < 3; j++) o.push(a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j]); return o; }
  function rodrigues(k, a) {
    var c = cos(a), s = sin(a), t = 1 - c, x = k[0], y = k[1], z = k[2];
    return [t * x * x + c, t * x * y - s * z, t * x * z + s * y, t * x * y + s * z, t * y * y + c, t * y * z - s * x, t * x * z - s * y, t * y * z + s * x, t * z * z + c];
  }
  function inPoly(p, x, y) {
    var n = p.length / 2, i, j = n - 1, c = false;
    for (i = 0; i < n; j = i++) { var xi = p[i * 2], yi = p[i * 2 + 1], xj = p[j * 2], yj = p[j * 2 + 1]; if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) c = !c; }
    return c;
  }
  function distSeg(x, y, p) {
    var dx = p[2] - p[0], dy = p[3] - p[1], l = dx * dx + dy * dy, t = l ? ((x - p[0]) * dx + (y - p[1]) * dy) / l : 0; t = Math.max(0, Math.min(1, t));
    var qx = p[0] + t * dx - x, qy = p[1] + t * dy - y; return sqrt(qx * qx + qy * qy);
  }
  /* vẽ một tam giác có hình: biến đổi affine từ toạ độ ảnh sang màn hình */
  function drawTri(ctx, img, t, dark) {
    var x0 = t[0], y0 = t[1], x1 = t[2], y1 = t[3], x2 = t[4], y2 = t[5], u0 = t[6], v0 = t[7], u1 = t[8], v1 = t[9], u2 = t[10], v2 = t[11];
    var dn = u0 * (v1 - v2) + u1 * (v2 - v0) + u2 * (v0 - v1);
    if (!dn) return;
    var a = (x0 * (v1 - v2) + x1 * (v2 - v0) + x2 * (v0 - v1)) / dn, b = (y0 * (v1 - v2) + y1 * (v2 - v0) + y2 * (v0 - v1)) / dn;
    var c = (x0 * (u2 - u1) + x1 * (u0 - u2) + x2 * (u1 - u0)) / dn, d = (y0 * (u2 - u1) + y1 * (u0 - u2) + y2 * (u1 - u0)) / dn;
    var e = (x0 * (u1 * v2 - u2 * v1) + x1 * (u2 * v0 - u0 * v2) + x2 * (u0 * v1 - u1 * v0)) / dn, f = (y0 * (u1 * v2 - u2 * v1) + y1 * (u2 * v0 - u0 * v2) + y2 * (u0 * v1 - u1 * v0)) / dn;
    var cx = (x0 + x1 + x2) / 3, cy = (y0 + y1 + y2) / 3, g = .6;
    function ex(x, cc) { return x + (x > cc ? g : -g); }
    ctx.save();
    ctx.beginPath(); ctx.moveTo(ex(x0, cx), ex(y0, cy)); ctx.lineTo(ex(x1, cx), ex(y1, cy)); ctx.lineTo(ex(x2, cx), ex(y2, cy)); ctx.closePath(); ctx.clip();
    ctx.transform(a, b, c, d, e, f); ctx.drawImage(img, 0, 0);
    ctx.restore();
    if (dark > .02) { ctx.fillStyle = 'rgba(0,0,0,' + dark + ')'; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.lineTo(x2, y2); ctx.closePath(); ctx.fill(); }
  }
  Z3D.Renderer = Renderer;
})(typeof window !== 'undefined' ? window : this);
