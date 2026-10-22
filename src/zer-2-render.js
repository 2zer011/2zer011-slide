/* ============================================================================
   zer - phần 2: bộ vẽ 3D bằng Canvas 2D (không cần WebGL, chạy trên máy cũ)
   ========================================================================== */
var U = ZER._, N = U.N, V3 = U.V3, truthy = U.truthy, isArr = U.isArr, hasOwn = U.hasOwn, clamp = U.clamp, hash = U.hash,
  parseColor = U.parseColor, css = U.css, mixRGBA = U.mixRGBA, easeFn = U.easeFn, lerpAny = U.lerpAny;

/* ---------- ma trận 4x4 (hàng trước) ---------- */
function mIdent() { return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]; }
function mMul(a, b) {
  var r = new Array(16), i, j;
  for (i = 0; i < 4; i++) for (j = 0; j < 4; j++) r[i * 4 + j] = a[i * 4] * b[j] + a[i * 4 + 1] * b[4 + j] + a[i * 4 + 2] * b[8 + j] + a[i * 4 + 3] * b[12 + j];
  return r;
}
function mTRS(p, r, s) {
  var rx = r[0] * PI / 180, ry = r[1] * PI / 180, rz = r[2] * PI / 180, cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry), cz = Math.cos(rz), sz = Math.sin(rz);
  return [cz * cy * s[0], (cz * sy * sx - sz * cx) * s[1], (cz * sy * cx + sz * sx) * s[2], p[0],
    sz * cy * s[0], (sz * sy * sx + cz * cx) * s[1], (sz * sy * cx - cz * sx) * s[2], p[1],
    -sy * s[0], cy * sx * s[1], cy * cx * s[2], p[2], 0, 0, 0, 1];
}
function mApply(m, x, y, z) { return [m[0] * x + m[1] * y + m[2] * z + m[3], m[4] * x + m[5] * y + m[6] * z + m[7], m[8] * x + m[9] * y + m[10] * z + m[11]]; }
function mLin(m, x, y, z) { return [m[0] * x + m[1] * y + m[2] * z, m[4] * x + m[5] * y + m[6] * z, m[8] * x + m[9] * y + m[10] * z]; }
function dot3(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function cross3(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function norm3(a) { var l = Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }

/* ---------- hình học dựng sẵn ---------- */
var GEO = {}, geoCount = 0;
function cached(key, build) { var g = GEO[key]; if (!g) { if (geoCount > 300) { GEO = {}; geoCount = 0; } g = build(); GEO[key] = g; geoCount++; } return g; }
function finish(geo, closed) {
  var c = [0, 0, 0], i, k, f, nx, ny, nz, a, b, fc, n, L;
  for (i = 0; i < geo.v.length; i++) { c[0] += geo.v[i][0]; c[1] += geo.v[i][1]; c[2] += geo.v[i][2]; }
  c[0] /= geo.v.length || 1; c[1] /= geo.v.length || 1; c[2] /= geo.v.length || 1;
  geo.n = []; geo.closed = closed;
  for (i = 0; i < geo.f.length; i++) {
    f = geo.f[i]; nx = ny = nz = 0; fc = [0, 0, 0];
    for (k = 0; k < f.length; k++) {
      a = geo.v[f[k]]; b = geo.v[f[(k + 1) % f.length]];
      nx += (a[1] - b[1]) * (a[2] + b[2]); ny += (a[2] - b[2]) * (a[0] + b[0]); nz += (a[0] - b[0]) * (a[1] + b[1]);
      fc[0] += a[0]; fc[1] += a[1]; fc[2] += a[2];
    }
    L = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1; n = [nx / L, ny / L, nz / L];
    if (closed) { fc = [fc[0] / f.length - c[0], fc[1] / f.length - c[1], fc[2] / f.length - c[2]]; if (dot3(n, fc) < 0) n = [-n[0], -n[1], -n[2]]; }
    geo.n.push(n);
  }
  return geo;
}
function geoCube(w, h, d) {
  return cached('c' + w + ',' + h + ',' + d, function () {
    var x = w / 2, y = h / 2, z = d / 2;
    return finish({ v: [[-x, -y, -z], [x, -y, -z], [x, y, -z], [-x, y, -z], [-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z]], f: [[0, 1, 2, 3], [4, 5, 6, 7], [0, 3, 7, 4], [1, 2, 6, 5], [0, 1, 5, 4], [3, 2, 6, 7]] }, true);
  });
}
function geoSphere(r, seg, rings) {
  return cached('s' + r + ',' + seg + ',' + rings, function () {
    var v = [], f = [], i, j, th, ph;
    for (i = 0; i <= rings; i++) for (j = 0; j < seg; j++) { th = PI * i / rings; ph = TAU * j / seg; v.push([r * Math.sin(th) * Math.cos(ph), r * Math.cos(th), r * Math.sin(th) * Math.sin(ph)]); }
    for (i = 0; i < rings; i++) for (j = 0; j < seg; j++) f.push([i * seg + j, i * seg + (j + 1) % seg, (i + 1) * seg + (j + 1) % seg, (i + 1) * seg + j]);
    return finish({ v: v, f: f }, true);
  });
}
function geoCylinder(r, h, seg) {
  return cached('y' + r + ',' + h + ',' + seg, function () {
    var v = [], f = [], j, top = [], bot = [];
    for (j = 0; j < seg; j++) v.push([r * Math.cos(TAU * j / seg), h / 2, r * Math.sin(TAU * j / seg)]);
    for (j = 0; j < seg; j++) v.push([r * Math.cos(TAU * j / seg), -h / 2, r * Math.sin(TAU * j / seg)]);
    for (j = 0; j < seg; j++) { f.push([j, (j + 1) % seg, seg + (j + 1) % seg, seg + j]); top.push(j); bot.push(seg + j); }
    f.push(top); f.push(bot);
    return finish({ v: v, f: f }, true);
  });
}
function geoCone(r, h, seg) {
  return cached('n' + r + ',' + h + ',' + seg, function () {
    var v = [], f = [], j, bot = [];
    for (j = 0; j < seg; j++) { v.push([r * Math.cos(TAU * j / seg), -h / 2, r * Math.sin(TAU * j / seg)]); bot.push(j); }
    v.push([0, h / 2, 0]);
    for (j = 0; j < seg; j++) f.push([j, (j + 1) % seg, seg]);
    f.push(bot);
    return finish({ v: v, f: f }, true);
  });
}
function geoTorus(R, r, seg, tseg) {
  return cached('t' + R + ',' + r + ',' + seg + ',' + tseg, function () {
    var v = [], f = [], i, j, u, w;
    for (i = 0; i < seg; i++) for (j = 0; j < tseg; j++) { u = TAU * i / seg; w = TAU * j / tseg; v.push([(R + r * Math.cos(w)) * Math.cos(u), r * Math.sin(w), (R + r * Math.cos(w)) * Math.sin(u)]); }
    for (i = 0; i < seg; i++) for (j = 0; j < tseg; j++) f.push([i * tseg + j, ((i + 1) % seg) * tseg + j, ((i + 1) % seg) * tseg + (j + 1) % tseg, i * tseg + (j + 1) % tseg]);
    return finish({ v: v, f: f }, true);
  });
}
function geoPyramid(w, h) {
  return cached('p' + w + ',' + h, function () {
    var x = w / 2;
    return finish({ v: [[-x, -h / 2, -x], [x, -h / 2, -x], [x, -h / 2, x], [-x, -h / 2, x], [0, h / 2, 0]], f: [[0, 1, 2, 3], [0, 1, 4], [1, 2, 4], [2, 3, 4], [3, 0, 4]] }, true);
  });
}
function geoPlane(w, h) { return cached('l' + w + ',' + h, function () { return finish({ v: [[-w / 2, -h / 2, 0], [w / 2, -h / 2, 0], [w / 2, h / 2, 0], [-w / 2, h / 2, 0]], f: [[0, 1, 2, 3]] }, false); }); }
function geoDisc(r, seg) { return cached('d' + r + ',' + seg, function () { var v = [], f = [], j; for (j = 0; j < seg; j++) { v.push([r * Math.cos(TAU * j / seg), r * Math.sin(TAU * j / seg), 0]); f.push(j); } return finish({ v: v, f: [f] }, false); }); }

function earClip(poly) {     // poly: [[x,y],..] -> danh sách tam giác (chỉ số)
  var n = poly.length, idx = [], i, area = 0, tris = [], guard, a, b, c, ok, j, k;
  if (n < 3) return tris;
  for (i = 0; i < n; i++) { j = (i + 1) % n; area += poly[i][0] * poly[j][1] - poly[j][0] * poly[i][1]; idx.push(i); }
  if (area < 0) idx.reverse();
  function inTri(p, a, b, c) {
    var d1 = (p[0] - b[0]) * (a[1] - b[1]) - (a[0] - b[0]) * (p[1] - b[1]), d2 = (p[0] - c[0]) * (b[1] - c[1]) - (b[0] - c[0]) * (p[1] - c[1]), d3 = (p[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (p[1] - a[1]);
    return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
  }
  guard = 0;
  while (idx.length > 3 && guard++ < 2000) {
    ok = false;
    for (i = 0; i < idx.length; i++) {
      a = poly[idx[(i + idx.length - 1) % idx.length]]; b = poly[idx[i]]; c = poly[idx[(i + 1) % idx.length]];
      if ((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]) <= 0) continue;
      var empty = true;
      for (k = 0; k < idx.length; k++) { j = idx[k]; if (poly[j] === a || poly[j] === b || poly[j] === c) continue; if (inTri(poly[j], a, b, c)) { empty = false; break; } }
      if (!empty) continue;
      tris.push([idx[(i + idx.length - 1) % idx.length], idx[i], idx[(i + 1) % idx.length]]); idx.splice(i, 1); ok = true; break;
    }
    if (!ok) break;
  }
  if (idx.length === 3) tris.push([idx[0], idx[1], idx[2]]);
  else if (idx.length > 3) for (i = 1; i < idx.length - 1; i++) tris.push([idx[0], idx[i], idx[i + 1]]);
  return tris;
}
function pts2(a) { var r = [], i, p; a = isArr(a) ? a : []; for (i = 0; i < a.length; i++) { p = V3(a[i]); r.push(p); } return r; }
function geoPolygon(points) {
  var key = 'g' + JSON.stringify(points);
  return cached(key, function () { var v = points, tr = earClip(v.map(function (p) { return [p[0], p[1]]; })); return finish({ v: v, f: tr.length ? tr : [v.map(function (_, i) { return i; })] }, false); });
}
function geoExtrude(points, depth) {
  return cached('e' + depth + JSON.stringify(points), function () {
    var n = points.length, v = [], f = [], i, tr, m = points.map(function (p) { return [p[0], p[1]]; });
    for (i = 0; i < n; i++) v.push([points[i][0], points[i][1], depth / 2]);
    for (i = 0; i < n; i++) v.push([points[i][0], points[i][1], -depth / 2]);
    tr = earClip(m);
    for (i = 0; i < tr.length; i++) { f.push([tr[i][0], tr[i][1], tr[i][2]]); f.push([n + tr[i][2], n + tr[i][1], n + tr[i][0]]); }
    for (i = 0; i < n; i++) f.push([i, (i + 1) % n, n + (i + 1) % n, n + i]);
    return finish({ v: v, f: f }, true);
  });
}
function geoLathe(profile, seg) {
  return cached('h' + seg + JSON.stringify(profile), function () {
    var v = [], f = [], i, j, p = profile.length, ph, c1 = [], c2 = [];
    for (i = 0; i < p; i++) for (j = 0; j < seg; j++) { ph = TAU * j / seg; v.push([profile[i][0] * Math.cos(ph), profile[i][1], profile[i][0] * Math.sin(ph)]); }
    for (i = 0; i < p - 1; i++) for (j = 0; j < seg; j++) f.push([i * seg + j, i * seg + (j + 1) % seg, (i + 1) * seg + (j + 1) % seg, (i + 1) * seg + j]);
    for (j = 0; j < seg; j++) { c1.push(j); c2.push((p - 1) * seg + j); }
    if (Math.abs(profile[0][0]) > 1e-6) f.push(c1);
    if (Math.abs(profile[p - 1][0]) > 1e-6) f.push(c2);
    return finish({ v: v, f: f }, true);
  });
}
function geoMesh(verts, faces, closed) {
  var f = [], i, j, q, ok;
  for (i = 0; i < faces.length; i++) { q = isArr(faces[i]) ? faces[i] : []; ok = q.length >= 3; for (j = 0; j < q.length; j++) { q[j] = Math.floor(N(q[j])); if (q[j] < 0 || q[j] >= verts.length) ok = false; } if (ok) f.push(q); }
  return finish({ v: verts, f: f }, closed);
}

/* ---------- camera ---------- */
function buildCamera(slide, env, av, W, H, over) {
  var ac = av && av.camera, P = slide.cam.props;
  function G(k, d) { if (ac && hasOwn(ac, k)) return ac[k]; if (P[k]) { env.loc = null; return P[k](env); } return d; }
  var persp = String(G('mode', 'persp')).toLowerCase().indexOf('ortho') < 0, fov = clamp(N(G('fov', 50)) || 50, 5, 150), look = V3(G('look', null), [0, 0, 0]), eye, ob = G('orbit', null), roll = N(G('roll', 0));
  if (ob !== null && ob !== undefined) {
    ob = V3(ob, [0, 15, 10]); var az = ob[0] * PI / 180, el = ob[1] * PI / 180;
    eye = [look[0] + ob[2] * Math.cos(el) * Math.sin(az), look[1] + ob[2] * Math.sin(el), look[2] + ob[2] * Math.cos(el) * Math.cos(az)];
  } else eye = V3(G('position', null), [0, 0, 10]);
  if (over) {
    var rel = [eye[0] - look[0], eye[1] - look[1], eye[2] - look[2]], dist = Math.sqrt(dot3(rel, rel)) || 1, az0 = Math.atan2(rel[0], rel[2]), el0 = Math.asin(clamp(rel[1] / dist, -1, 1));
    dist *= over.zoom || 1; az0 += (over.az || 0); el0 = clamp(el0 + (over.el || 0), -1.5, 1.5);
    eye = [look[0] + dist * Math.cos(el0) * Math.sin(az0), look[1] + dist * Math.sin(el0), look[2] + dist * Math.cos(el0) * Math.cos(az0)];
  }
  var f = norm3([look[0] - eye[0], look[1] - eye[1], look[2] - eye[2]]), up = [0, 1, 0];
  if (Math.abs(dot3(f, up)) > 0.999) up = [0, 0, -1];
  var r = norm3(cross3(f, up)), u = cross3(r, f);
  if (roll) { var cr = Math.cos(roll * PI / 180), sr = Math.sin(roll * PI / 180), r2 = [r[0] * cr + u[0] * sr, r[1] * cr + u[1] * sr, r[2] * cr + u[2] * sr]; u = [u[0] * cr - r[0] * sr, u[1] * cr - r[1] * sr, u[2] * cr - r[2] * sr]; r = r2; }
  if (over && (over.px || over.py)) { var d = Math.sqrt(dot3([eye[0] - look[0], eye[1] - look[1], eye[2] - look[2]], [eye[0] - look[0], eye[1] - look[1], eye[2] - look[2]])) * 0.0016; eye = [eye[0] - r[0] * over.px * d + u[0] * over.py * d, eye[1] - r[1] * over.px * d + u[1] * over.py * d, eye[2] - r[2] * over.px * d + u[2] * over.py * d]; }
  var cam = { eye: eye, r: r, u: u, f: f, persp: persp, W: W, H: H, hw: W / 2, hh: H / 2, near: 0.05, focal: (H / 2) / Math.tan(fov * PI / 360), oscale: H / (N(G('height', 10)) || 10) };
  cam.view = function (p) { var dx = p[0] - eye[0], dy = p[1] - eye[1], dz = p[2] - eye[2]; return [dx * r[0] + dy * r[1] + dz * r[2], dx * u[0] + dy * u[1] + dz * u[2], -(dx * f[0] + dy * f[1] + dz * f[2])]; };
  cam.dir = function (v) { return [v[0] * r[0] + v[1] * r[1] + v[2] * r[2], v[0] * u[0] + v[1] * u[1] + v[2] * u[2], -(v[0] * f[0] + v[1] * f[1] + v[2] * f[2])]; };
  cam.proj = function (q) { if (persp) { var s = cam.focal / (-q[2]); return [cam.hw + q[0] * s, cam.hh - q[1] * s, s]; } return [cam.hw + q[0] * cam.oscale, cam.hh - q[1] * cam.oscale, cam.oscale]; };
  return cam;
}
function clipPoly(vs, near) {
  var out = [], n = vs.length, i, a, b, ia, ib, t;
  for (i = 0; i < n; i++) {
    a = vs[i]; b = vs[(i + 1) % n]; ia = a[2] <= -near; ib = b[2] <= -near;
    if (ia) out.push(a);
    if (ia !== ib) { t = (-near - a[2]) / (b[2] - a[2]); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, -near]); }
  }
  return out;
}

/* ---------- đối tượng -> danh sách vật vẽ ---------- */
function fogMix(RC, rgb, z) {
  if (!RC.fog) return rgb;
  var k = clamp((-z - RC.fog.s) / ((RC.fog.e - RC.fog.s) || 1), 0, 1);
  return k <= 0 ? rgb : mixRGBA(rgb, RC.fog.c, k);
}
function meshItems(o, geo, M, G, alpha, RC, defColor) {
  var cam = RC.cam, col = parseColor(G('color', defColor)), wire = String(G('wire', 'no')).toLowerCase(), lit = truthy(G('lit', 1)), cl = G('cull', null),
    cull = (cl === null || cl === undefined) ? geo.closed : truthy(cl), wc = G('wirecolor', null), wcol = wc ? parseColor(wc) : null, wireOnly = wire === 'only', wireOn = wire !== 'no' && wire !== 'false' && wire !== '0' && wire !== 'off',
    vv = [], pj = [], i, k, v, p, q, L = RC.light, amb = RC.ambient, lw = (wireOn ? 1.6 : 1) * RC.px, nl, nw, nv, cx, cy, cz, f, lam, sh, pp, fi, fc, rgb, s, vs, cnt, z;
  for (i = 0; i < geo.v.length; i++) { v = geo.v[i]; p = mApply(M, v[0], v[1], v[2]); q = cam.view(p); vv.push(q); pj.push(q[2] < -cam.near ? cam.proj(q) : null); }
  for (fi = 0; fi < geo.f.length; fi++) {
    f = geo.f[fi]; nl = geo.n[fi]; nw = norm3(mLin(M, nl[0], nl[1], nl[2])); nv = cam.dir(nw);
    cx = cy = cz = 0; for (k = 0; k < f.length; k++) { q = vv[f[k]]; cx += q[0]; cy += q[1]; cz += q[2]; }
    cx /= f.length; cy /= f.length; cz /= f.length;
    if (cam.persp) { if (cull && nv[0] * cx + nv[1] * cy + nv[2] * cz >= 0) continue; } else if (cull && nv[2] <= 0) continue;
    pp = []; var allIn = true;
    for (k = 0; k < f.length; k++) { if (!pj[f[k]]) { allIn = false; break; } }
    if (allIn) { for (k = 0; k < f.length; k++) { pp.push(pj[f[k]][0], pj[f[k]][1]); } }
    else { vs = []; for (k = 0; k < f.length; k++) vs.push(vv[f[k]]); vs = clipPoly(vs, cam.near); if (vs.length < 3) continue; for (k = 0; k < vs.length; k++) { s = cam.proj(vs[k]); pp.push(s[0], s[1]); } }
    lam = dot3(nw, L); lam = cull ? Math.max(0, lam) : Math.abs(lam);
    sh = lit ? amb + (1 - amb) * lam : 1;
    rgb = [col[0] * sh, col[1] * sh, col[2] * sh, col[3]];
    rgb = fogMix(RC, rgb, cz);
    var item = { k: 'poly', z: cz, p: pp, a: alpha, o: o, sel: RC.insel > 0 };
    if (wireOnly) { item.stroke = css(wcol || rgb); item.lw = lw; }
    else { item.fill = css(rgb); item.stroke = wireOn ? css(wcol || [255, 255, 255, 0.85]) : css(rgb); item.lw = wireOn ? lw : RC.px; }
    RC.items.push(item);
  }
}
function walkerFor(RC) { return RC; }

function baseVec(G, key, d) { return V3(G(key, null), d); }
function lineItems(RC, o, ptsw, width, col, alpha, glow, arrow) {   // ptsw: các điểm đã ở không gian world
  var cam = RC.cam, cur = [], zs = 0, zc = 0, i, a, b, q1, q2, ia, ib, t, s, flush = function () {
    if (cur.length >= 4) RC.items.push({ k: 'line', z: zs / (zc || 1), p: cur, w: width * RC.px, col: col, a: alpha, glow: glow, arrow: arrow, o: o, sel: RC.insel > 0 });
    cur = []; zs = 0; zc = 0;
  };
  for (i = 0; i < ptsw.length - 1; i++) {
    q1 = cam.view(ptsw[i]); q2 = cam.view(ptsw[i + 1]); ia = q1[2] <= -cam.near; ib = q2[2] <= -cam.near;
    if (!ia && !ib) { flush(); continue; }
    if (!ia) { t = (-cam.near - q1[2]) / (q2[2] - q1[2]); q1 = [q1[0] + (q2[0] - q1[0]) * t, q1[1] + (q2[1] - q1[1]) * t, -cam.near]; flush(); }
    if (!ib) { t = (-cam.near - q1[2]) / (q2[2] - q1[2]); q2 = [q1[0] + (q2[0] - q1[0]) * t, q1[1] + (q2[1] - q1[1]) * t, -cam.near]; }
    if (!cur.length) { s = cam.proj(q1); cur.push(s[0], s[1]); }
    s = cam.proj(q2); cur.push(s[0], s[1]); zs += q1[2] + q2[2]; zc += 2;
    if (!ib) flush();
  }
  flush();
}

var E = {};
E.cube = function (o, M, G, a, RC) { var s = G('size', 1), v = V3(s, [1, 1, 1]); meshItems(o, geoCube(v[0], v[1], v[2]), M, G, a, RC, '#4aa3ff'); };
E.sphere = function (o, M, G, a, RC) { var r = G('radius', null); r = r === null ? N(G('size', 2)) / 2 : N(r); var d = clamp(Math.floor(N(G('detail', 10))), 3, 40); meshItems(o, geoSphere(r, d * 2, d), M, G, a, RC, '#ffb547'); };
E.cylinder = function (o, M, G, a, RC) { meshItems(o, geoCylinder(N(G('radius', 1)), N(G('height', 2)), clamp(Math.floor(N(G('detail', 24))), 3, 80)), M, G, a, RC, '#7ee0c3'); };
E.cone = function (o, M, G, a, RC) { meshItems(o, geoCone(N(G('radius', 1)), N(G('height', 2)), clamp(Math.floor(N(G('detail', 24))), 3, 80)), M, G, a, RC, '#ff7a90'); };
E.torus = function (o, M, G, a, RC) { var d = clamp(Math.floor(N(G('detail', 20))), 4, 60); meshItems(o, geoTorus(N(G('radius', 1.5)), N(G('tube', 0.4)), d, Math.max(6, Math.floor(d / 2))), M, G, a, RC, '#af52de'); };
E.pyramid = function (o, M, G, a, RC) { var w = N(G('size', 2)); meshItems(o, geoPyramid(w, G('height', null) === null ? w : N(G('height'))), M, G, a, RC, '#e3b866'); };
E.plane = E.rect = function (o, M, G, a, RC) {
  var s = G('size', null), w = N(G('w', G('width', s === null ? 4 : V3(s, [4, 3, 0])[0]))), h = N(G('h', G('height', s === null ? 3 : V3(s, [4, 3, 0])[1])));
  if (G('texture', null)) { E.image(o, M, G, a, RC, w, h); return; }
  meshItems(o, geoPlane(w, h), M, G, a, RC, '#6cb6ff');
};
E.circle = function (o, M, G, a, RC) { meshItems(o, geoDisc(N(G('radius', 1)), clamp(Math.floor(N(G('detail', 40))), 6, 120)), M, G, a, RC, '#6cb6ff'); };
E.polygon = function (o, M, G, a, RC) { var p = pts2(G('points', [])); if (p.length < 3) return; meshItems(o, geoPolygon(p), M, G, a, RC, '#6cb6ff'); };
E.extrude = function (o, M, G, a, RC) { var p = pts2(G('points', [])); if (p.length < 3) return; meshItems(o, geoExtrude(p, N(G('depth', 1))), M, G, a, RC, '#e3b866'); };
E.lathe = function (o, M, G, a, RC) { var p = pts2(G('profile', [])); if (p.length < 2) return; meshItems(o, geoLathe(p, clamp(Math.floor(N(G('detail', 24))), 3, 80)), M, G, a, RC, '#c0c0c0'); };
E.mesh = function (o, M, G, a, RC) {
  var v = pts2(G('vertices', [])), f = G('faces', []); if (v.length < 3 || !isArr(f)) return;
  meshItems(o, geoMesh(v, f.map(function (q) { return isArr(q) ? q.slice() : []; }), truthy(G('closed', 0))), M, G, a, RC, '#af52de');
};
E.group = function () { };
E.line = function (o, M, G, a, RC) {
  var p = G('points', null), q = [], i;
  if (p === null) p = [G('from', [0, 0, 0]), G('to', [1, 0, 0])];
  p = pts2(p); for (i = 0; i < p.length; i++) q.push(mApply(M, p[i][0], p[i][1], p[i][2]));
  lineItems(RC, o, q, N(G('width', 3)), css(parseColor(G('color', '#ffffff'))), a, truthy(G('glow', 0)), truthy(G('arrow', 0)));
};
E.grid = function (o, M, G, a, RC) {
  var n = clamp(Math.floor(N(G('n', 10))), 1, 60), st = N(G('step', 1)), h = n * st / 2, i, c = css(parseColor(G('color', 'rgba(255,255,255,0.22)'))), w = N(G('width', 1));
  for (i = 0; i <= n; i++) {
    var x = -h + i * st;
    lineItems(RC, o, [mApply(M, x, 0, -h), mApply(M, x, 0, h)], w, c, a, false, false);
    lineItems(RC, o, [mApply(M, -h, 0, x), mApply(M, h, 0, x)], w, c, a, false, false);
  }
};
E.axes = function (o, M, G, a, RC) {
  var L = N(G('length', 3)), w = N(G('width', 3)), O = mApply(M, 0, 0, 0);
  lineItems(RC, o, [O, mApply(M, L, 0, 0)], w, '#ff5a6e', a, false, true);
  lineItems(RC, o, [O, mApply(M, 0, L, 0)], w, '#7ee0c3', a, false, true);
  lineItems(RC, o, [O, mApply(M, 0, 0, L)], w, '#6cb6ff', a, false, true);
};
function dotItems(RC, o, wp, sizeW, col, alpha, glow) {
  var cam = RC.cam, q = cam.view(wp), s, r;
  if (q[2] > -cam.near) return;
  s = cam.proj(q); r = Math.max(0.7 * RC.px, sizeW * s[2]);
  RC.items.push({ k: 'dot', z: q[2], x: s[0], y: s[1], r: r, col: col, a: alpha, o: o, sel: RC.insel > 0, glow: glow });
}
E.points = function (o, M, G, a, RC) {
  var p = pts2(G('points', [])), sz = N(G('size', 0.06)), c1 = parseColor(G('color', '#ffffff')), c2s = G('color2', null), c2 = c2s ? parseColor(c2s) : null, i, gm = 0, k, rgb, wp, q;
  if (c2) { for (i = 0; i < p.length; i++) { k = Math.sqrt(p[i][0] * p[i][0] + p[i][1] * p[i][1] + p[i][2] * p[i][2]); if (k > gm) gm = k; } gm = gm || 1; }
  var fade = truthy(G('fade', 0));
  for (i = 0; i < p.length; i++) {
    wp = mApply(M, p[i][0], p[i][1], p[i][2]);
    if (c2) { k = Math.sqrt(p[i][0] * p[i][0] + p[i][1] * p[i][1] + p[i][2] * p[i][2]) / gm; rgb = mixRGBA(c1, c2, k); } else rgb = c1;
    q = RC.cam.view(wp); rgb = fogMix(RC, rgb, q[2]);
    dotItems(RC, o, wp, sz, css(rgb), fade ? a * clamp(1.4 - (-q[2]) / 40, 0.15, 1) : a, false);
  }
};
E.particles = function (o, M, G, a, RC) {
  var n = clamp(Math.floor(N(G('count', 80))), 1, 2000), life = N(G('life', 3)) || 3, spd = N(G('speed', 2)), spr = N(G('spread', 1)), grav = N(G('gravity', 0)), sz = N(G('size', 0.07)), c1 = parseColor(G('color', '#ffb547')),
    c2s = G('color2', null), c2 = c2s ? parseColor(c2s) : c1, sd = N(G('seed', 1)), t = RC.env.t, i, age, ph, d, th, ph2, x, y, z, wp, rgb, r;
  for (i = 0; i < n; i++) {
    ph = ((t / life) + i / n + hash(i * 1.7 + sd)) % 1; age = ph * life; th = hash(i * 2.3 + sd) * TAU; ph2 = Math.acos(2 * hash(i * 5.9 + sd) - 1); r = spd * (0.4 + 0.6 * hash(i * 3.1 + sd));
    x = Math.sin(ph2) * Math.cos(th) * r * age * spr; y = Math.cos(ph2) * r * age * spr - 0.5 * grav * age * age; z = Math.sin(ph2) * Math.sin(th) * r * age * spr;
    wp = mApply(M, x, y, z); rgb = mixRGBA(c1, c2, ph);
    dotItems(RC, o, wp, sz * (1 - 0.6 * ph), css(rgb), a * (1 - ph), false);
  }
};
function planeAxes(M, G, RC, pivotW) {          // trục ngang/dọc của mặt phẳng (có thể billboard)
  var O = mApply(M, 0, 0, 0), ex = mLin(M, 1, 0, 0), ey = mLin(M, 0, 1, 0);
  if (truthy(G('billboard', 0))) {
    var sx = Math.sqrt(dot3(ex, ex)), sy = Math.sqrt(dot3(ey, ey)), cam = RC.cam;
    ex = [cam.r[0] * sx, cam.r[1] * sx, cam.r[2] * sx]; ey = [cam.u[0] * sy, cam.u[1] * sy, cam.u[2] * sy];
  }
  return { O: O, ex: ex, ey: ey };
}
E.text = E.label = function (o, M, G, a, RC) {
  var v = G('text', ''), str = isArr(v) ? v.join(', ') : (typeof v === 'number' ? String(Math.round(v * 1e6) / 1e6) : String(v)), cam = RC.cam,
    ax = planeAxes(M, G, RC), q0 = cam.view(ax.O);
  if (o.type === 'label' && G('billboard', null) === null) ax = planeAxes(M, { }, RC), ax = (function () { var sx = Math.sqrt(dot3(ax.ex, ax.ex)), sy = Math.sqrt(dot3(ax.ey, ax.ey)); return { O: ax.O, ex: [cam.r[0] * sx, cam.r[1] * sx, cam.r[2] * sx], ey: [cam.u[0] * sy, cam.u[1] * sy, cam.u[2] * sy] }; })();
  if (q0[2] > -cam.near || !str) return;
  var px = cam.proj(q0), qx = cam.proj(cam.view([ax.O[0] + ax.ex[0], ax.O[1] + ax.ex[1], ax.O[2] + ax.ex[2]])), qy = cam.proj(cam.view([ax.O[0] + ax.ey[0], ax.O[1] + ax.ey[1], ax.O[2] + ax.ey[2]])),
    size = N(G('size', 0.6)), sc = size / 64, col = parseColor(G('color', '#ffffff')), rgb = fogMix(RC, col, q0[2]), oc = G('outline', null);
  RC.items.push({
    k: 'text', z: q0[2], str: str, a: a, o: o, sel: RC.insel > 0, fill: css(rgb), outline: oc ? css(parseColor(oc)) : null, align: String(G('align', 'left')).toLowerCase(),
    font: (truthy(G('italic', 0)) ? 'italic ' : '') + (truthy(G('bold', 0)) ? 'bold ' : '') + '64px ' + String(G('font', '"Segoe UI",Tahoma,Arial,sans-serif')), wrap: N(G('wrap', 0)), lh: N(G('lineheight', 1.25)),
    m: [(qx[0] - px[0]) * sc, (qx[1] - px[1]) * sc, -(qy[0] - px[0]) * sc, -(qy[1] - px[1]) * sc, px[0], px[1]], sc: sc
  });
};
E.image = function (o, M, G, a, RC, fw, fh) {
  var name = String(G('src', G('texture', ''))), img = RC.assets && RC.assets[name], cam = RC.cam, w = fw !== undefined ? fw : N(G('w', G('width', 0))), h = fh !== undefined ? fh : N(G('h', G('height', 0))), ok = img && img.complete && img.naturalWidth > 0,
    asp = ok ? img.naturalWidth / img.naturalHeight : 1.5;
  if (!w && !h) { h = 4; w = h * asp; } else if (!h) h = w / asp; else if (!w) w = h * asp;
  var ax = planeAxes(M, G, RC), N_ = clamp(Math.floor(N(G('detail', 6))), 1, 16), i, j, g = [], q, s, flip = truthy(G('flip', 0)), minz = 0, zs = 0, cnt = 0;
  for (j = 0; j <= N_; j++) for (i = 0; i <= N_; i++) {
    var lx = (i / N_ - 0.5) * w, ly = (0.5 - j / N_) * h;
    q = cam.view([ax.O[0] + ax.ex[0] * lx + ax.ey[0] * ly, ax.O[1] + ax.ex[1] * lx + ax.ey[1] * ly, ax.O[2] + ax.ex[2] * lx + ax.ey[2] * ly]);
    if (q[2] > -cam.near) return;
    s = cam.proj(q); g.push(s[0], s[1]); zs += q[2]; cnt++;
  }
  RC.items.push({ k: 'tex', z: zs / cnt, g: g, n: N_, img: ok ? img : null, name: name, a: a * N(G('opacity2', 1)), o: o, sel: RC.insel > 0, flip: flip, miss: !ok });
};

function evalEnvFor(RC, o) { RC.env.loc = o.loc; return RC.env; }
function walkObj(o, parentM, parentA, RC) {
  var env = evalEnvFor(RC, o), A = RC.av[o.name], f, v;
  function G(key, d) {
    var fn = o.props[key], r;
    if (A && hasOwn(A, key)) r = A[key];
    else if (fn) { RC.env.loc = o.loc; r = fn(RC.env); }
    else return d;
    return r === undefined ? d : r;
  }
  var rev = N(G('reveal', 0)), until = N(G('until', 0)), ralpha = 1;
  if (rev > RC.step) return;
  if (until > 0 && RC.step >= until) return;
  if (rev > 0) { var ts = RC.stepTimes[rev]; ralpha = ts === undefined ? 1 : clamp((RC.env.t - ts) / 0.5, 0, 1); }
  if (!truthy(G('visible', 1))) return;
  var alpha = parentA * clamp(N(G('opacity', 1)), 0, 1) * ralpha;
  var pos = V3(G('position', null), [0, 0, 0]), rot = V3(G('rotate', null), [0, 0, 0]), sc = V3(G('scale', null), [1, 1, 1]);
  if (o.drag) pos = [pos[0] + o.drag[0], pos[1] + o.drag[1], pos[2] + o.drag[2]];
  var M = mMul(parentM, mTRS(pos, rot, sc)), i;
  if (RC.selId && o.id === RC.selId) RC.insel++;
  var em = E[o.type];
  if (em && alpha > 0.002) { try { RC.env.loc = o.loc; em(o, M, G, alpha, RC); } catch (e) { RC.errors[o.line] = e.message; } }
  for (i = 0; i < o.kids.length; i++) walkObj(o.kids[i], M, alpha, RC);
  if (RC.selId && o.id === RC.selId) RC.insel--;
}

function animValues(a, env) {
  var kfs = a.kf, i, j, D, t, res = {}, keys = {}, key, list, k0, k1, p, ef, v0, v1, delay, loop, pp;
  if (!kfs.length) return null;
  env.loc = a.loc;
  delay = a.opts.delay ? N(a.opts.delay(env)) : 0; loop = a.opts.loop ? truthy(a.opts.loop(env)) : false; pp = a.opts.pingpong ? truthy(a.opts.pingpong(env)) : false;
  D = kfs[kfs.length - 1].time; t = env.t - delay;
  if (loop && D > 0) { if (pp) { t = ((t % (2 * D)) + 2 * D) % (2 * D); if (t > D) t = 2 * D - t; } else t = ((t % D) + D) % D; }
  for (i = 0; i < kfs.length; i++) for (key in kfs[i].props) keys[key] = true;
  for (key in keys) {
    list = []; for (i = 0; i < kfs.length; i++) if (kfs[i].props[key]) list.push(kfs[i]);
    if (t <= list[0].time) { res[key] = list[0].props[key](env); continue; }
    if (t >= list[list.length - 1].time) { res[key] = list[list.length - 1].props[key](env); continue; }
    for (j = 0; j < list.length - 1; j++) if (t >= list[j].time && t < list[j + 1].time) break;
    k0 = list[j]; k1 = list[j + 1]; p = (t - k0.time) / ((k1.time - k0.time) || 1);
    ef = k1.ease ? easeFn(k1.ease(env)) : easeFn('linear');
    res[key] = lerpAny(k0.props[key](env), k1.props[key](env), ef(clamp(p, 0, 1)));
  }
  return res;
}

function drawText(ctx, it, RC) {
  var lines = it.str.split('\n'), w, i, out = [], words, line, test, m = it.m, lh = 64 * it.lh, y0, maxw = 0, ww;
  ctx.font = it.font;
  if (it.wrap > 0) {
    w = it.wrap / it.sc;
    for (i = 0; i < lines.length; i++) {
      words = lines[i].split(' '); line = '';
      for (var k = 0; k < words.length; k++) { test = line ? line + ' ' + words[k] : words[k]; if (ctx.measureText(test).width > w && line) { out.push(line); line = words[k]; } else line = test; }
      out.push(line);
    }
    lines = out;
  }
  y0 = -(lines.length - 1) / 2 * lh;
  ctx.save(); ctx.globalAlpha = it.a; ctx.transform(m[0], m[1], m[2], m[3], m[4], m[5]);
  ctx.textBaseline = 'middle'; ctx.textAlign = it.align === 'center' ? 'center' : it.align === 'right' ? 'right' : 'left';
  for (i = 0; i < lines.length; i++) {
    if (it.outline) { ctx.lineWidth = 8; ctx.lineJoin = 'round'; ctx.strokeStyle = it.outline; ctx.strokeText(lines[i], 0, y0 + i * lh); }
    ctx.fillStyle = it.fill; ctx.fillText(lines[i], 0, y0 + i * lh);
    ww = ctx.measureText(lines[i]).width; if (ww > maxw) maxw = ww;
  }
  ctx.restore();
  var x0 = it.align === 'center' ? -maxw / 2 : it.align === 'right' ? -maxw : 0, hh = lines.length * lh / 2;
  function T(x, y) { return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]; }
  var a = T(x0, -hh - lh * 0.1 + y0 + (lines.length - 1) / 2 * lh), b = T(x0 + maxw, -hh + y0 + (lines.length - 1) / 2 * lh - lh * 0.1), c = T(x0 + maxw, hh + lh * 0.1 + y0 + (lines.length - 1) / 2 * lh), d = T(x0, hh + lh * 0.1 + y0 + (lines.length - 1) / 2 * lh);
  it.quad = [a[0], a[1], b[0], b[1], c[0], c[1], d[0], d[1]];
}
function drawTri(ctx, img, x0, y0, x1, y1, x2, y2, u0, v0, u1, v1, u2, v2) {
  var cx = (x0 + x1 + x2) / 3, cy = (y0 + y1 + y2) / 3, e = 0.7, k, dx, dy, l;
  function out(x, y) { dx = x - cx; dy = y - cy; l = Math.sqrt(dx * dx + dy * dy) || 1; return [x + dx / l * e, y + dy / l * e]; }
  var A = out(x0, y0), B = out(x1, y1), C = out(x2, y2), det = u0 * (v1 - v2) + u1 * (v2 - v0) + u2 * (v0 - v1);
  if (Math.abs(det) < 1e-9) return;
  var a = (x0 * (v1 - v2) + x1 * (v2 - v0) + x2 * (v0 - v1)) / det, c = (u0 * (x1 - x2) + u1 * (x2 - x0) + u2 * (x0 - x1)) / det, ee = x0 - a * u0 - c * v0,
    b = (y0 * (v1 - v2) + y1 * (v2 - v0) + y2 * (v0 - v1)) / det, d = (u0 * (y1 - y2) + u1 * (y2 - y0) + u2 * (y0 - y1)) / det, f = y0 - b * u0 - d * v0;
  ctx.save(); ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.lineTo(C[0], C[1]); ctx.closePath(); ctx.clip();
  ctx.transform(a, b, c, d, ee, f); ctx.drawImage(img, 0, 0); ctx.restore();
}
function drawTex(ctx, it, RC) {
  var n = it.n, g = it.g, i, j, iw, ih, p, q, r, s, row = n + 1;
  ctx.save(); ctx.globalAlpha = it.a;
  if (!it.img) {
    ctx.beginPath(); ctx.moveTo(g[0], g[1]); ctx.lineTo(g[n * 2], g[n * 2 + 1]); ctx.lineTo(g[(row * row - 1) * 2], g[(row * row - 1) * 2 + 1]); ctx.lineTo(g[(row * n) * 2], g[(row * n) * 2 + 1]); ctx.closePath();
    ctx.fillStyle = 'rgba(120,130,150,0.35)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.setLineDash && ctx.setLineDash([8, 6]); ctx.lineWidth = 2; ctx.stroke();
    ctx.restore(); return;
  }
  iw = it.img.naturalWidth; ih = it.img.naturalHeight;
  for (j = 0; j < n; j++) for (i = 0; i < n; i++) {
    var a = (j * row + i) * 2, b = (j * row + i + 1) * 2, c = ((j + 1) * row + i + 1) * 2, d = ((j + 1) * row + i) * 2;
    var u0 = i / n * iw, u1 = (i + 1) / n * iw, v0 = j / n * ih, v1 = (j + 1) / n * ih;
    if (it.flip) { var tt = u0; u0 = iw - u0; u1 = iw - u1; }
    drawTri(ctx, it.img, g[a], g[a + 1], g[b], g[b + 1], g[c], g[c + 1], u0, v0, u1, v0, u1, v1);
    drawTri(ctx, it.img, g[a], g[a + 1], g[c], g[c + 1], g[d], g[d + 1], u0, v0, u1, v1, u0, v1);
  }
  ctx.restore();
}
function itemBBox(it, bb) {
  function add(x, y) { if (x < bb[0]) bb[0] = x; if (y < bb[1]) bb[1] = y; if (x > bb[2]) bb[2] = x; if (y > bb[3]) bb[3] = y; }
  var i, p;
  if (it.k === 'poly' || it.k === 'line') { p = it.p; for (i = 0; i < p.length; i += 2) add(p[i], p[i + 1]); }
  else if (it.k === 'dot') { add(it.x - it.r, it.y - it.r); add(it.x + it.r, it.y + it.r); }
  else if (it.k === 'tex') { p = it.g; for (i = 0; i < p.length; i += 2) add(p[i], p[i + 1]); }
  else if (it.k === 'text' && it.quad) { p = it.quad; for (i = 0; i < p.length; i += 2) add(p[i], p[i + 1]); }
}

/* Vẽ một slide lên ctx. Trả về {picks, bbox, errors, cam}. */
ZER.renderSlide = function (ctx, W, H, slide, project, assets, t, step, stepTimes, opts) {
  opts = opts || {};
  var env = { t: t, time: t, dt: opts.dt || 0.016, frame: opts.frame || 0, step: step, loc: null, vars: {}, uf: project.uf, depth: 0 }, i, l, errors = {}, key, a, vals, av = {};
  for (i = 0; i < slide.lets.length; i++) { l = slide.lets[i]; try { env.vars[l.name] = l.fn(env); } catch (e) { errors[0] = e.message; } }
  for (i = 0; i < slide.anims.length; i++) { a = slide.anims[i]; try { vals = animValues(a, env); } catch (e2) { vals = null; errors[a.line] = e2.message; } if (vals) { if (!av[a.target]) av[a.target] = {}; for (key in vals) av[a.target][key] = vals[key]; } }
  function SG(k, d) { var f = slide.props[k]; if (!f) return d; try { env.loc = null; var v = f(env); return v === undefined ? d : v; } catch (e) { errors[0] = e.message; return d; } }
  var cam = buildCamera(slide, env, av, W, H, opts.over);
  var Lt = V3(SG('light', null), [0.4, 0.8, 0.6]), fogv = SG('fog', null), fog = null;
  if (isArr(fogv) && fogv.length >= 3) fog = { c: parseColor(fogv[0]), s: N(fogv[1]), e: N(fogv[2]) };
  var RC = { cam: cam, env: env, av: av, items: [], assets: assets || {}, light: norm3(Lt), ambient: clamp(N(SG('ambient', 0.38)), 0, 1), fog: fog, px: H / 1080, step: step, stepTimes: stepTimes || [], errors: errors, insel: 0, selId: opts.selId || 0 };
  /* nền */
  var bg = SG('background', '#000000'), grd;
  if (isArr(bg) && bg.length >= 2) { grd = ctx.createLinearGradient(0, 0, 0, H); grd.addColorStop(0, css(parseColor(bg[0]))); grd.addColorStop(1, css(parseColor(bg[1]))); ctx.fillStyle = grd; }
  else ctx.fillStyle = css(parseColor(isArr(bg) ? bg[0] : bg));
  ctx.globalAlpha = 1; ctx.fillRect(0, 0, W, H);
  var ns = clamp(Math.floor(N(SG('stars', 0))), 0, 1500), sr = H / 1080;
  if (ns) {
    for (i = 0; i < ns; i++) {
      var sx = hash(i * 2.1 + 1) * W, sy = hash(i * 3.7 + 2) * H, rr = (0.6 + hash(i * 5.3) * 1.6) * sr, tw = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * (0.5 + hash(i) * 2) + i));
      ctx.fillStyle = 'rgba(255,255,255,' + (tw * (0.35 + hash(i * 9.1) * 0.6)).toFixed(2) + ')'; ctx.fillRect(sx, sy, rr * 1.4, rr * 1.4);
    }
  }
  /* dựng vật vẽ */
  var I = mIdent();
  for (i = 0; i < slide.objs.length; i++) walkObj(slide.objs[i], I, 1, RC);
  var items = RC.items;
  items.sort(function (x, y) { return x.z - y.z; });
  var picks = [], bb = [1e9, 1e9, -1e9, -1e9], hasSel = false, it, n = items.length, k, p;
  for (i = 0; i < n; i++) {
    it = items[i];
    switch (it.k) {
      case 'poly':
        ctx.globalAlpha = it.a; p = it.p; ctx.beginPath(); ctx.moveTo(p[0], p[1]); for (k = 2; k < p.length; k += 2) ctx.lineTo(p[k], p[k + 1]); ctx.closePath();
        if (it.fill) { ctx.fillStyle = it.fill; ctx.fill(); }
        if (it.stroke) { ctx.strokeStyle = it.stroke; ctx.lineWidth = it.lw; ctx.lineJoin = 'round'; ctx.stroke(); }
        break;
      case 'line':
        ctx.globalAlpha = it.a; p = it.p; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(p[0], p[1]); for (k = 2; k < p.length; k += 2) ctx.lineTo(p[k], p[k + 1]);
        if (it.glow) { ctx.strokeStyle = it.col; ctx.globalAlpha = it.a * 0.22; ctx.lineWidth = it.w * 3.5; ctx.stroke(); ctx.globalAlpha = it.a; }
        ctx.strokeStyle = it.col; ctx.lineWidth = it.w; ctx.stroke();
        if (it.arrow && p.length >= 4) {
          var x1 = p[p.length - 4], y1 = p[p.length - 3], x2 = p[p.length - 2], y2 = p[p.length - 1], ang = Math.atan2(y2 - y1, x2 - x1), hl = it.w * 4 + 6 * RC.px;
          ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - hl * Math.cos(ang - 0.4), y2 - hl * Math.sin(ang - 0.4)); ctx.lineTo(x2 - hl * Math.cos(ang + 0.4), y2 - hl * Math.sin(ang + 0.4)); ctx.closePath(); ctx.fillStyle = it.col; ctx.fill();
        }
        break;
      case 'dot':
        ctx.globalAlpha = it.a; ctx.fillStyle = it.col;
        if (it.r < 1.3) ctx.fillRect(it.x - it.r, it.y - it.r, it.r * 2, it.r * 2); else { ctx.beginPath(); ctx.arc(it.x, it.y, it.r, 0, TAU); ctx.fill(); }
        break;
      case 'text': drawText(ctx, it, RC); break;
      case 'tex': drawTex(ctx, it, RC); break;
    }
    if (opts.pick) picks.push(it);
    if (it.sel) { hasSel = true; itemBBox(it, bb); }
  }
  ctx.globalAlpha = 1;
  /* hậu kỳ */
  var vg = N(SG('vignette', 0));
  if (vg > 0) { var rg = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.95); rg.addColorStop(0, 'rgba(0,0,0,0)'); rg.addColorStop(1, 'rgba(0,0,0,' + clamp(vg, 0, 1) + ')'); ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H); }
  var fi = N(SG('fade_in', 0)), fo = N(SG('fade_out', 0)), dur = N(SG('duration', 0)), fa = 0;
  if (fi > 0 && t < fi) fa = Math.max(fa, 1 - t / fi);
  if (fo > 0 && dur > 0 && t > dur - fo) fa = Math.max(fa, (t - (dur - fo)) / fo);
  if (fa > 0) { ctx.fillStyle = 'rgba(0,0,0,' + clamp(fa, 0, 1) + ')'; ctx.fillRect(0, 0, W, H); }
  /* khung chọn trong Studio */
  if (opts.selId && hasSel) {
    ctx.save(); ctx.strokeStyle = '#32d4ff'; ctx.lineWidth = 2; ctx.setLineDash && ctx.setLineDash([7, 5]);
    ctx.strokeRect(bb[0] - 6, bb[1] - 6, bb[2] - bb[0] + 12, bb[3] - bb[1] + 12); ctx.restore();
  }
  return { items: opts.pick ? picks : null, bbox: hasSel ? bb : null, errors: errors, cam: cam };
};

/* Tìm vật ở toạ độ (x, y); duyệt từ vật gần nhất */
function ptSeg(px, py, ax, ay, bx, by) {
  var dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy, t = l ? clamp(((px - ax) * dx + (py - ay) * dy) / l, 0, 1) : 0, x = ax + t * dx, y = ay + t * dy;
  return Math.sqrt((px - x) * (px - x) + (py - y) * (py - y));
}
function inPoly(p, x, y) {
  var c = false, i, j, n = p.length / 2;
  for (i = 0, j = n - 1; i < n; j = i++) if (((p[i * 2 + 1] > y) !== (p[j * 2 + 1] > y)) && (x < (p[j * 2] - p[i * 2]) * (y - p[i * 2 + 1]) / (p[j * 2 + 1] - p[i * 2 + 1]) + p[i * 2])) c = !c;
  return c;
}
ZER.pick = function (items, x, y, tol) {
  var i, it, p, k;
  tol = tol || 8;
  if (!items) return null;
  for (i = items.length - 1; i >= 0; i--) {
    it = items[i];
    if (it.k === 'poly') { if (inPoly(it.p, x, y)) return it; }
    else if (it.k === 'tex') { var row = it.n + 1, g = it.g, q = [g[0], g[1], g[it.n * 2], g[it.n * 2 + 1], g[(row * row - 1) * 2], g[(row * row - 1) * 2 + 1], g[row * it.n * 2], g[row * it.n * 2 + 1]]; if (inPoly(q, x, y)) return it; }
    else if (it.k === 'text') { if (it.quad && inPoly(it.quad, x, y)) return it; }
    else if (it.k === 'dot') { if ((x - it.x) * (x - it.x) + (y - it.y) * (y - it.y) <= Math.pow(Math.max(it.r, tol), 2)) return it; }
    else if (it.k === 'line') { p = it.p; for (k = 0; k + 3 < p.length; k += 2) if (ptSeg(x, y, p[k], p[k + 1], p[k + 2], p[k + 3]) <= Math.max(tol, it.w)) return it; }
  }
  return null;
};
