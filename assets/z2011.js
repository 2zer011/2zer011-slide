/* 2Z (2zer011 language) - lõi ngôn ngữ. ES5 thuần, không dùng eval: chạy được trên IE11 / Chrome 49+.
   Cú pháp thụt lề:
     object sun = sphere:          // hoặc:  sphere sun:
       coordinates:
         X = 1.9473839
         Y = 8.948267282
         Z = 9.9382727
       radius = 2
   Góc luôn tính bằng ĐỘ. Chú thích bằng //  (dấu # dành cho màu: #ffb547). */
(function (root) {
  'use strict';
  var Z = root.Z2011 = { version: '1.0', kinds: Object.create(null) };
  var FN = Z.fn = Object.create(null);

  /* ---------- đăng ký hàm (đồng thời là tài liệu) ---------- */
  Z.def = function (group, sig, doc, f) {
    var name = /^[^\s(]+/.exec(sig)[0];
    FN[name] = { name: name, group: group, sig: sig, doc: doc, f: f };
  };

  function ZError(msg, line) { this.message = msg; this.line = line || 0; this.name = 'ZError'; }
  ZError.prototype = Object.create(Error.prototype);
  Z.Error = ZError;

  var L = 'A-Za-z_\\u00C0-\\u1EF9';
  var NAME = '[' + L + '][' + L + '0-9]*';
  var reNum = /^(?:\d+(?:\.\d+)?|\.\d+)(?:[eE][+-]?\d+)?/;
  var reUnit = new RegExp('^(ms|s|deg|rad|px)(?![' + L + '0-9])');
  var reId = new RegExp('^' + NAME);
  var reColor = /^#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![0-9A-Za-z_])/;
  var OPS3 = ['**='], OPS2 = ['==', '!=', '<=', '>=', '..', '+=', '-=', '*=', '/=', '**'];
  var BAD = { constructor: 1, __proto__: 1, prototype: 1, __defineGetter__: 1, __defineSetter__: 1, __lookupGetter__: 1, hasOwnProperty: 1, toString: 1, valueOf: 1 };

  /* ---------- tách từ ---------- */
  function tokenize(src, line) {
    var toks = [], i = 0, n = src.length, c, rest, m, prev;
    while (i < n) {
      c = src.charAt(i);
      if (c === ' ' || c === '\t') { i++; continue; }
      rest = src.slice(i);
      prev = toks.length ? toks[toks.length - 1] : null;
      m = null;
      if ((c >= '0' && c <= '9') || (c === '.' && /^\.\d/.test(rest) && !(prev && (prev.t === 'id' || prev.v === ')' || prev.v === ']' || prev.t === 'num')))) {
        m = reNum.exec(rest);
        var v = parseFloat(m[0]); i += m[0].length;
        var u = reUnit.exec(src.slice(i));
        if (u) { i += u[0].length; if (u[1] === 'ms') v = v / 1000; else if (u[1] === 'rad') v = v * 180 / Math.PI; }
        toks.push({ t: 'num', v: v }); continue;
      }
      if (c === '#') {
        m = reColor.exec(rest);
        if (!m) throw new ZError('màu không hợp lệ gần "' + rest.slice(0, 8) + '"', line);
        toks.push({ t: 'str', v: m[0] }); i += m[0].length; continue;
      }
      if (c === '"' || c === "'") {
        var j = i + 1, s = '';
        while (j < n && src.charAt(j) !== c) {
          if (src.charAt(j) === '\\' && j + 1 < n) { j++; var e = src.charAt(j); s += (e === 'n' ? '\n' : e === 't' ? '\t' : e); }
          else s += src.charAt(j);
          j++;
        }
        if (j >= n) throw new ZError('chuỗi chưa đóng dấu nháy', line);
        toks.push({ t: 'str', v: s }); i = j + 1; continue;
      }
      m = reId.exec(rest);
      if (m) { toks.push({ t: 'id', v: m[0] }); i += m[0].length; continue; }
      var o3 = rest.substr(0, 3), o2 = rest.substr(0, 2);
      if (OPS3.indexOf(o3) > -1) { toks.push({ t: 'op', v: o3 }); i += 3; continue; }
      if (OPS2.indexOf(o2) > -1) { toks.push({ t: 'op', v: o2 }); i += 2; continue; }
      if ('+-*/%^()[],.=<>?:'.indexOf(c) > -1) { toks.push({ t: 'op', v: c }); i++; continue; }
      throw new ZError('ký tự lạ "' + c + '"', line);
    }
    return toks;
  }

  /* ---------- phân tích biểu thức (Pratt) ---------- */
  function Parser(toks, line) { this.k = toks; this.i = 0; this.line = line; }
  Parser.prototype = {
    peek: function () { return this.k[this.i]; },
    next: function () { return this.k[this.i++]; },
    isOp: function (v) { var t = this.k[this.i]; return t && t.t === 'op' && t.v === v; },
    isId: function (v) { var t = this.k[this.i]; return t && t.t === 'id' && t.v === v; },
    eat: function (v) { if (this.isOp(v)) { this.i++; return true; } return false; },
    expect: function (v) { if (!this.eat(v)) throw new ZError('thiếu "' + v + '"', this.line); },
    done: function () { return this.i >= this.k.length; },
    expr: function () { return this.ternary(); },
    ternary: function () {
      var c = this.or();
      if (this.eat('?')) { var a = this.ternary(); this.expect(':'); var b = this.ternary(); return { t: 'cond', c: c, a: a, b: b }; }
      return c;
    },
    or: function () { var a = this.and(); while (this.isId('or')) { this.i++; a = { t: 'or', a: a, b: this.and() }; } return a; },
    and: function () { var a = this.not(); while (this.isId('and')) { this.i++; a = { t: 'and', a: a, b: this.not() }; } return a; },
    not: function () { if (this.isId('not')) { this.i++; return { t: 'not', a: this.not() }; } return this.cmp(); },
    cmp: function () {
      var a = this.range(), t = this.peek();
      if (t && t.t === 'op' && ['==', '!=', '<', '>', '<=', '>='].indexOf(t.v) > -1) { this.i++; return { t: 'bin', op: t.v, a: a, b: this.range() }; }
      return a;
    },
    range: function () { var a = this.add(); if (this.eat('..')) return { t: 'range', a: a, b: this.add() }; return a; },
    add: function () {
      var a = this.mul(), t;
      while ((t = this.peek()) && t.t === 'op' && (t.v === '+' || t.v === '-')) { this.i++; a = { t: 'bin', op: t.v, a: a, b: this.mul() }; }
      return a;
    },
    mul: function () {
      var a = this.unary(), t;
      while ((t = this.peek()) && t.t === 'op' && (t.v === '*' || t.v === '/' || t.v === '%')) { this.i++; a = { t: 'bin', op: t.v, a: a, b: this.unary() }; }
      return a;
    },
    unary: function () {
      if (this.eat('-')) return { t: 'neg', a: this.unary() };
      if (this.eat('+')) return this.unary();
      return this.pow();
    },
    pow: function () {
      var a = this.postfix();
      if (this.eat('^') || this.eat('**')) return { t: 'bin', op: '^', a: a, b: this.unary() };
      return a;
    },
    postfix: function () {
      var a = this.primary();
      for (;;) {
        if (this.isOp('(')) { this.i++; a = { t: 'call', f: a, args: this.args() }; }
        else if (this.isOp('[')) { this.i++; var ix = this.expr(); this.expect(']'); a = { t: 'idx', o: a, i: ix }; }
        else if (this.isOp('.') ) { this.i++; var nm = this.next(); if (!nm || nm.t !== 'id') throw new ZError('thiếu tên sau dấu chấm', this.line); a = { t: 'mem', o: a, n: nm.v }; }
        else break;
      }
      return a;
    },
    args: function () {
      var out = [];
      if (this.eat(')')) return out;
      for (;;) {
        var t = this.peek(), t2 = this.k[this.i + 1];
        if (t && t.t === 'id' && t2 && t2.t === 'op' && t2.v === '=') { this.i += 2; out.push({ name: t.v, e: this.expr() }); }
        else out.push({ e: this.expr() });
        if (this.eat(',')) { if (this.isOp(')')) { this.i++; break; } continue; }
        this.expect(')'); break;
      }
      return out;
    },
    primary: function () {
      var t = this.next();
      if (!t) throw new ZError('biểu thức chưa hoàn chỉnh', this.line);
      if (t.t === 'num') return { t: 'num', v: t.v };
      if (t.t === 'str') return { t: 'str', v: t.v };
      if (t.t === 'id') {
        if (t.v === 'true') return { t: 'num', v: true };
        if (t.v === 'false') return { t: 'num', v: false };
        if (t.v === 'null') return { t: 'num', v: null };
        return { t: 'id', n: t.v };
      }
      if (t.v === '(') {
        var first = this.expr();
        if (this.eat(',')) {
          var items = [first];
          while (!this.isOp(')')) { items.push(this.expr()); if (!this.eat(',')) break; }
          this.expect(')'); return { t: 'list', items: items };
        }
        this.expect(')'); return first;
      }
      if (t.v === '[') {
        var its = [];
        while (!this.isOp(']')) { its.push(this.expr()); if (!this.eat(',')) break; }
        this.expect(']'); return { t: 'list', items: its };
      }
      throw new ZError('không hiểu "' + t.v + '"', this.line);
    }
  };
  function parseExpr(src, line) {
    var p = new Parser(tokenize(src, line), line);
    if (p.done()) throw new ZError('thiếu biểu thức', line);
    var e = p.expr();
    if (!p.done()) throw new ZError('thừa "' + p.peek().v + '" sau biểu thức', line);
    return e;
  }

  /* ---------- dựng cây theo thụt lề ---------- */
  function stripComment(s) {
    var q = null, i, c;
    for (i = 0; i < s.length; i++) {
      c = s.charAt(i);
      if (q) { if (c === '\\') i++; else if (c === q) q = null; }
      else if (c === '"' || c === "'") q = c;
      else if (c === '/' && s.charAt(i + 1) === '/') return s.slice(0, i);
    }
    return s;
  }
  function buildTree(src) {
    var lines = String(src).split(/\r?\n/), root = { ind: -1, children: [] }, stack = [root], i, raw, ind, k, node;
    for (i = 0; i < lines.length; i++) {
      raw = stripComment(lines[i]).replace(/\s+$/, '');
      if (!/\S/.test(raw)) continue;
      ind = 0;
      for (k = 0; k < raw.length; k++) { var ch = raw.charAt(k); if (ch === ' ') ind++; else if (ch === '\t') ind += 4; else break; }
      node = { ind: ind, text: raw.replace(/^\s+/, ''), line: i + 1, children: [] };
      while (stack.length > 1 && stack[stack.length - 1].ind >= ind) stack.pop();
      stack[stack.length - 1].children.push(node);
      stack.push(node);
    }
    return root;
  }
  function lastLine(node) { var l = node.line, i; for (i = 0; i < node.children.length; i++) l = Math.max(l, lastLine(node.children[i])); return l; }

  /* ---------- biên dịch cây thành lệnh ---------- */
  var reAssignOps = { '=': 1, '+=': 1, '-=': 1, '*=': 1, '/=': 1, '**=': 1 };
  function compileBlock(nodes) {
    var out = [], i = 0;
    while (i < nodes.length) {
      var nd = nodes[i], st = compileNode(nd, nodes, i);
      if (st.k === 'if') {
        // gom elif / else
        var j = i + 1;
        while (j < nodes.length) {
          var tx = nodes[j].text;
          if (/^elif\s+/.test(tx)) {
            var mm = /^elif\s+(.+):$/.exec(tx); if (!mm) throw new ZError('elif sai cú pháp', nodes[j].line);
            st.br.push({ c: parseExpr(mm[1], nodes[j].line), body: compileBlock(nodes[j].children) }); j++;
          } else if (/^else\s*:$/.test(tx)) { st.els = compileBlock(nodes[j].children); j++; break; }
          else break;
        }
        i = j;
      } else i++;
      out.push(st);
    }
    return out;
  }
  function needColon(nd) { if (!/:$/.test(nd.text)) throw new ZError('thiếu dấu ":" ở cuối dòng', nd.line); }
  function compileNode(nd, sibs, idx) {
    var t = nd.text, m, line = nd.line, ch = nd.children;
    function body() { return compileBlock(ch); }
    if ((m = new RegExp('^func\\s+(' + NAME + ')\\s*\\((.*)\\)\\s*:$').exec(t))) {
      var ps = [], defs = [];
      if (/\S/.test(m[2])) {
        var parts = splitTop(m[2]), q;
        for (q = 0; q < parts.length; q++) {
          var pm = new RegExp('^\\s*(' + NAME + ')\\s*(?:=\\s*(.+))?$').exec(parts[q]);
          if (!pm) throw new ZError('tham số hàm sai', line);
          ps.push(pm[1]); defs.push(pm[2] ? parseExpr(pm[2], line) : null);
        }
      }
      return { k: 'func', name: m[1], params: ps, defs: defs, body: body(), line: line };
    }
    if ((m = /^if\s+(.+):$/.exec(t))) return { k: 'if', br: [{ c: parseExpr(m[1], line), body: body() }], els: null, line: line };
    if (/^(elif|else)\b/.test(t)) throw new ZError('"' + t.split(/\W/)[0] + '" phải đứng ngay sau "if"', line);
    if ((m = new RegExp('^for\\s+(' + NAME + ')\\s+in\\s+(.+):$').exec(t))) return { k: 'for', v: m[1], it: parseExpr(m[2], line), body: body(), line: line };
    if ((m = /^repeat\s+(.+):$/.exec(t))) return { k: 'repeat', n: parseExpr(m[1], line), body: body(), line: line };
    if ((m = /^while\s+(.+):$/.exec(t))) return { k: 'while', c: parseExpr(m[1], line), body: body(), line: line };
    if (/^frame\s*:$/.test(t)) return { k: 'hook', kind: 'frame', arg: null, body: body(), line: line };
    if (/^step\s*:$/.test(t)) return { k: 'hook', kind: 'step', arg: null, body: body(), line: line };
    if (/^start\s*:$/.test(t)) return { k: 'hook', kind: 'start', arg: null, body: body(), line: line };
    if ((m = /^(at|every)\s+(.+):$/.exec(t))) return { k: 'hook', kind: m[1], arg: parseExpr(m[2], line), body: body(), line: line };
    if ((m = /^on\s+(click|key|hover)\s*(.*):$/.exec(t))) return { k: 'hook', kind: 'on_' + m[1], arg: /\S/.test(m[2]) ? parseExpr(m[2], line) : null, body: body(), line: line };
    if ((m = new RegExp('^object\\s+(' + NAME + ')\\s*=\\s*(' + NAME + ')\\s*:$').exec(t))) return { k: 'object', kind: m[2], name: m[1], body: body(), line: line, end: lastLine(nd) };
    if ((m = new RegExp('^(' + NAME + ')\\s+(' + NAME + ')\\s*:$').exec(t)) && Z.kinds[m[1]]) return { k: 'object', kind: m[1], name: m[2], body: body(), line: line, end: lastLine(nd) };
    if ((m = /^(camera|scene)\s*:$/.exec(t))) return { k: 'with', e: { t: 'id', n: m[1] }, body: body(), line: line };
    if ((m = /^with\s+(.+):$/.exec(t))) return { k: 'with', e: parseExpr(m[1], line), body: body(), line: line };
    if ((m = new RegExp('^(' + NAME + '(?:\\.' + NAME + ')*)\\s*:$').exec(t))) return { k: 'prop', path: m[1].split('.'), body: body(), line: line };
    if (ch.length) throw new ZError('dòng này có khối con nhưng thiếu dấu ":" (hoặc kiểu khối không hợp lệ)', line);
    if ((m = /^let\s+(.+)$/.exec(t))) { var s = compileSimple(m[1], line); if (s.k !== 'assign') throw new ZError('let cần dạng: let ten = giá_trị', line); s.let = true; return s; }
    if (t === 'break' || t === 'continue') return { k: t, line: line };
    if ((m = /^return(?:\s+(.+))?$/.exec(t))) return { k: 'return', e: m[1] ? parseExpr(m[1], line) : null, line: line };
    return compileSimple(t, line);
  }
  function splitTop(s) {
    var out = [], d = 0, q = null, cur = '', i, c;
    for (i = 0; i < s.length; i++) {
      c = s.charAt(i);
      if (q) { cur += c; if (c === q) q = null; continue; }
      if (c === '"' || c === "'") { q = c; cur += c; continue; }
      if (c === '(' || c === '[') d++; if (c === ')' || c === ']') d--;
      if (c === ',' && d === 0) { out.push(cur); cur = ''; } else cur += c;
    }
    out.push(cur); return out;
  }
  function compileSimple(text, line) {
    var toks = tokenize(text, line), d = 0, i, t;
    for (i = 0; i < toks.length; i++) {
      t = toks[i];
      if (t.t !== 'op') continue;
      if (t.v === '(' || t.v === '[') d++; else if (t.v === ')' || t.v === ']') d--;
      else if (d === 0 && reAssignOps[t.v]) {
        var lhs = new Parser(toks.slice(0, i), line), rhs = new Parser(toks.slice(i + 1), line);
        if (lhs.done() || rhs.done()) throw new ZError('phép gán thiếu vế', line);
        var target = lhs.postfix(); if (!lhs.done()) throw new ZError('vế trái phép gán không hợp lệ', line);
        if (target.t !== 'id' && target.t !== 'mem' && target.t !== 'idx') throw new ZError('không thể gán cho biểu thức này', line);
        var e = rhs.expr(); if (!rhs.done()) throw new ZError('thừa "' + rhs.peek().v + '"', line);
        return { k: 'assign', target: target, op: t.v, e: e, line: line };
      }
    }
    var p = new Parser(toks, line); var ex = p.expr();
    if (!p.done()) throw new ZError('không hiểu "' + p.peek().v + '" (thiếu dấu = hay dấu phẩy?)', line);
    return { k: 'expr', e: ex, line: line };
  }
  Z.compile = function (src) { return compileBlock(buildTree(src).children); };

  /* ---------- phạm vi biến ---------- */
  function Scope(parent) { this.vars = {}; this.parent = parent || null; }
  Scope.prototype = {
    has: function (n) { var s = this; while (s) { if (Object.prototype.hasOwnProperty.call(s.vars, n)) return s; s = s.parent; } return null; },
    get: function (n) { var s = this.has(n); return s ? s.vars[n] : undefined; },
    set: function (n, v) { var s = this.has(n); (s || this.root()).vars[n] = v; },
    local: function (n, v) { this.vars[n] = v; },
    root: function () { var s = this; while (s.parent && !s.isFn) s = s.parent; return s; }
  };
  Z.Scope = Scope;

  /* ---------- toán tử trên số / vec / chuỗi ---------- */
  function isArr(v) { return Object.prototype.toString.call(v) === '[object Array]'; }
  Z.isArr = isArr;
  function zip(a, b, f) {
    var A = isArr(a), B = isArr(b), n, out = [], i;
    if (A && B) { if (a.length !== b.length) throw new ZError('hai vec khác số phần tử (' + a.length + ' và ' + b.length + ')'); n = a.length; for (i = 0; i < n; i++) out.push(zip(a[i], b[i], f)); return out; }
    if (A) { for (i = 0; i < a.length; i++) out.push(zip(a[i], b, f)); return out; }
    if (B) { for (i = 0; i < b.length; i++) out.push(zip(a, b[i], f)); return out; }
    return f(a, b);
  }
  function binop(op, a, b) {
    switch (op) {
      case '+': if (typeof a === 'string' || typeof b === 'string') return str(a) + str(b); return zip(a, b, function (x, y) { return x + y; });
      case '-': return zip(a, b, function (x, y) { return x - y; });
      case '*': return zip(a, b, function (x, y) { return x * y; });
      case '/': return zip(a, b, function (x, y) { return x / y; });
      case '%': return zip(a, b, function (x, y) { return x % y; });
      case '^': return zip(a, b, function (x, y) { return Math.pow(x, y); });
      case '==': return eq(a, b);
      case '!=': return !eq(a, b);
      case '<': return a < b; case '>': return a > b; case '<=': return a <= b; case '>=': return a >= b;
    }
    throw new ZError('toán tử lạ ' + op);
  }
  function eq(a, b) {
    if (isArr(a) && isArr(b)) { if (a.length !== b.length) return false; for (var i = 0; i < a.length; i++) if (!eq(a[i], b[i])) return false; return true; }
    return a === b;
  }
  function fmtNum(n) { if (n !== n) return 'NaN'; if (Math.abs(n - Math.round(n)) < 1e-9) return String(Math.round(n)); return String(Math.round(n * 1e6) / 1e6); }
  function str(v) {
    if (v === null || v === undefined) return 'null';
    if (typeof v === 'number') return fmtNum(v);
    if (isArr(v)) { var o = [], i; for (i = 0; i < v.length; i++) o.push(str(v[i])); return '(' + o.join(', ') + ')'; }
    if (typeof v === 'object') return v.$name ? '<' + v.kind + ' ' + v.name + '>' : '[đối tượng]';
    if (typeof v === 'function') return '[hàm]';
    return String(v);
  }
  Z.str = str;

  /* ---------- thông dịch ---------- */
  function Interp(rt) { this.rt = rt || {}; this.steps = 0; this.limit = 400000; }
  Z.Interp = Interp;
  Interp.prototype = {
    resetBudget: function () { this.steps = 0; },
    run: function (prog, scope, tgt) {
      var r = this.block(prog, scope, tgt || null);
      return r && r.ret !== undefined ? r.ret : undefined;
    },
    block: function (list, scope, tgt) {
      var i, r;
      for (i = 0; i < list.length; i++) {
        r = this.stmt(list[i], scope, tgt);
        if (r) return r;
      }
      return null;
    },
    fail: function (e, line) { if (e instanceof ZError) { if (!e.line) e.line = line; return e; } var z = new ZError(String(e && e.message || e), line); return z; },
    stmt: function (s, scope, tgt) {
      if (++this.steps > this.limit) throw new ZError('chạy quá lâu: có vòng lặp vô hạn không?', s.line);
      try { return this.stmt2(s, scope, tgt); } catch (e) { throw this.fail(e, s.line); }
    },
    stmt2: function (s, scope, tgt) {
      var self = this, i, v, r;
      switch (s.k) {
        case 'expr': this.ev(s.e, scope, tgt); return null;
        case 'assign': this.assign(s, scope, tgt); return null;
        case 'if':
          for (i = 0; i < s.br.length; i++) if (this.ev(s.br[i].c, scope, tgt)) return this.block(s.br[i].body, scope, tgt);
          if (s.els) return this.block(s.els, scope, tgt);
          return null;
        case 'for':
          v = this.ev(s.it, scope, tgt);
          if (!isArr(v)) throw new ZError('"for" cần một danh sách hoặc khoảng a..b', s.line);
          for (i = 0; i < v.length; i++) {
            scope.local(s.v, v[i]);
            r = this.block(s.body, scope, tgt);
            if (r) { if (r.brk) break; if (r.cont) continue; return r; }
          }
          return null;
        case 'repeat':
          v = Math.floor(this.ev(s.n, scope, tgt));
          if (!(v >= 0)) v = 0; if (v > 100000) throw new ZError('repeat quá lớn (>100000)', s.line);
          for (i = 0; i < v; i++) {
            scope.local('i', i);
            r = this.block(s.body, scope, tgt);
            if (r) { if (r.brk) break; if (r.cont) continue; return r; }
          }
          return null;
        case 'while':
          while (this.ev(s.c, scope, tgt)) {
            if (++this.steps > this.limit) throw new ZError('vòng while chạy quá lâu', s.line);
            r = this.block(s.body, scope, tgt);
            if (r) { if (r.brk) break; if (r.cont) continue; return r; }
          }
          return null;
        case 'break': return { brk: true };
        case 'continue': return { cont: true };
        case 'return': return { ret: s.e ? this.ev(s.e, scope, tgt) : null };
        case 'func':
          scope.local(s.name, { $fn: true, name: s.name, params: s.params, defs: s.defs, body: s.body, scope: scope });
          return null;
        case 'object': {
          if (!this.rt.createObject) throw new ZError('môi trường này không có đối tượng 3D', s.line);
          var obj = this.rt.createObject(s.kind, s.name, s.line, s.end);
          scope.set(s.name, obj);
          r = this.block(s.body, scope, obj);
          if (this.rt.objectReady) this.rt.objectReady(obj);
          return r && r.ret !== undefined ? r : null;
        }
        case 'with': {
          var o = this.ev(s.e, scope, tgt);
          if (!o || typeof o !== 'object') throw new ZError('"with" cần một đối tượng', s.line);
          return this.block(s.body, scope, o);
        }
        case 'prop': {
          if (!tgt) throw new ZError('khối "' + s.path.join('.') + ':" phải nằm trong một vật (object ...) hoặc with', s.line);
          var o2 = tgt;
          for (i = 0; i < s.path.length; i++) {
            if (BAD[s.path[i]]) throw new ZError('tên không được phép', s.line);
            if (o2.$get) { var g = o2.$get(s.path[i]); if (g === undefined) { o2.$set(s.path[i], {}); g = o2.$get(s.path[i]); } o2 = g; }
            else { if (o2[s.path[i]] === undefined) o2[s.path[i]] = {}; o2 = o2[s.path[i]]; }
          }
          return this.block(s.body, scope, o2);
        }
        case 'hook': {
          var arg = s.arg ? this.ev(s.arg, scope, tgt) : null;
          var body = s.body, line = s.line;
          this.rt.hook(s.kind, arg, function () { var rr = self.block(body, scope, null); return rr; }, line);
          return null;
        }
      }
      throw new ZError('lệnh lạ: ' + s.k, s.line);
    },
    assign: function (s, scope, tgt) {
      var val = this.ev(s.e, scope, tgt), tn = s.target, cur, nv;
      if (s.op !== '=') {
        cur = this.ev(tn, scope, tgt);
        nv = binop(s.op.charAt(0) === '*' && s.op.length === 3 ? '^' : s.op.charAt(0), cur, val);
      } else nv = val;
      if (tn.t === 'id') {
        if (s.let) { scope.local(tn.n, nv); }
        else if (tgt && !scope.has(tn.n)) this.setMember(tgt, tn.n, nv);
        else if (tgt && tgt.$props && tgt.$props[tn.n]) this.setMember(tgt, tn.n, nv);
        else scope.set(tn.n, nv);
        if (nv && nv.$name && !nv.name) { nv.name = tn.n; }
      } else if (tn.t === 'mem') {
        var o = this.ev(tn.o, scope, tgt);
        this.setMember(o, tn.n, nv);
      } else if (tn.t === 'idx') {
        var arr = this.ev(tn.o, scope, tgt), ix = this.ev(tn.i, scope, tgt);
        if (!isArr(arr)) throw new ZError('chỉ gán được phần tử của danh sách');
        arr[Math.floor(ix)] = nv;
      }
    },
    setMember: function (o, n, v) {
      if (o === null || o === undefined || typeof o !== 'object') throw new ZError('không gán được "' + n + '" cho giá trị rỗng');
      if (BAD[n] || n.charAt(0) === '$' || n.charAt(0) === '_') throw new ZError('không được gán vào "' + n + '"');
      if (o.$set) o.$set(n, v); else o[n] = v;
    },
    getMember: function (o, n) {
      if (o === null || o === undefined) throw new ZError('không đọc được ".' + n + '" của giá trị rỗng');
      if (BAD[n] || n.charAt(0) === '$' || n.charAt(0) === '_') throw new ZError('không được đọc "' + n + '"');
      if (typeof o === 'string' || isArr(o)) { if (n === 'length') return o.length; throw new ZError('không có thuộc tính "' + n + '"'); }
      if (typeof o !== 'object') throw new ZError('không đọc được ".' + n + '"');
      var v = o.$get ? o.$get(n) : o[n];
      return v;
    },
    ev: function (n, scope, tgt) {
      var self = this, a, b, i;
      switch (n.t) {
        case 'num': case 'str': return n.v;
        case 'id':
          a = scope.has(n.n);
          if (a) return a.vars[n.n];
          if (this.rt.global && Object.prototype.hasOwnProperty.call(this.rt.global, n.n)) return this.rt.global[n.n];
          if (n.n === 'PI') return Math.PI; if (n.n === 'TAU') return Math.PI * 2; if (n.n === 'E') return Math.E;
          if (FN[n.n]) return { $builtin: n.n };
          throw new ZError('chưa có "' + n.n + '"' + hint(n.n, scope, this.rt));
        case 'list': a = []; for (i = 0; i < n.items.length; i++) a.push(this.ev(n.items[i], scope, tgt)); return a;
        case 'neg': a = this.ev(n.a, scope, tgt); return zip(a, 0, function (x) { return -x; });
        case 'not': return !this.ev(n.a, scope, tgt);
        case 'and': a = this.ev(n.a, scope, tgt); return a ? this.ev(n.b, scope, tgt) : a;
        case 'or': a = this.ev(n.a, scope, tgt); return a ? a : this.ev(n.b, scope, tgt);
        case 'cond': return this.ev(n.c, scope, tgt) ? this.ev(n.a, scope, tgt) : this.ev(n.b, scope, tgt);
        case 'bin': return binop(n.op, this.ev(n.a, scope, tgt), this.ev(n.b, scope, tgt));
        case 'range':
          a = Math.floor(this.ev(n.a, scope, tgt)); b = Math.floor(this.ev(n.b, scope, tgt));
          if (Math.abs(b - a) > 100000) throw new ZError('khoảng a..b quá lớn');
          var out = []; if (a <= b) for (i = a; i < b; i++) out.push(i); else for (i = a; i > b; i--) out.push(i);
          return out;
        case 'idx':
          a = this.ev(n.o, scope, tgt); b = this.ev(n.i, scope, tgt);
          if (typeof a === 'string') return a.charAt(Math.floor(b));
          if (!isArr(a)) throw new ZError('chỉ lấy [chỉ_số] được với danh sách/chuỗi');
          i = Math.floor(b); if (i < 0) i += a.length;
          return a[i];
        case 'mem': return this.getMember(this.ev(n.o, scope, tgt), n.n);
        case 'call': return this.call(n, scope, tgt);
      }
      throw new ZError('biểu thức lạ');
    },
    call: function (n, scope, tgt) {
      var args = [], opts = null, i, a, fnv, thisObj = null, f = n.f;
      for (i = 0; i < n.args.length; i++) {
        a = n.args[i];
        if (a.name) { if (!opts) opts = {}; opts[a.name] = this.ev(a.e, scope, tgt); }
        else args.push(this.ev(a.e, scope, tgt));
      }
      if (f.t === 'mem') {
        thisObj = this.ev(f.o, scope, tgt);
        if (thisObj && typeof thisObj === 'object' && thisObj.$api && typeof thisObj[f.n] === 'function' && f.n.charAt(0) !== '$') {
          return thisObj[f.n].apply({ opts: opts || {}, rt: this.rt, interp: this, scope: scope, self: thisObj }, args);
        }
        throw new ZError('"' + f.n + '" không phải là hàm của đối tượng này');
      }
      if (f.t === 'id') {
        a = scope.has(f.n);
        fnv = a ? a.vars[f.n] : undefined;
        if (fnv === undefined) {
          if (!FN[f.n]) throw new ZError('chưa có hàm "' + f.n + '"' + hint(f.n, scope, this.rt));
          if (Z.kinds[f.n] && !this.rt.createObject) throw new ZError('không tạo vật được ở đây');
          return FN[f.n].f.apply({ opts: opts || {}, rt: this.rt, interp: this, scope: scope, line: n.line }, args);
        }
      } else fnv = this.ev(f, scope, tgt);
      if (fnv && fnv.$fn) return this.callUser(fnv, args, opts);
      if (fnv && fnv.$builtin) return FN[fnv.$builtin].f.apply({ opts: opts || {}, rt: this.rt, interp: this, scope: scope }, args);
      throw new ZError('không gọi được giá trị này như một hàm');
    },
    callUser: function (fv, args, opts) {
      var sc = new Scope(fv.scope), i, p;
      sc.isFn = true;
      if (this.depth > 60) throw new ZError('gọi hàm lồng quá sâu (đệ quy vô hạn?)');
      for (i = 0; i < fv.params.length; i++) {
        p = fv.params[i];
        if (i < args.length) sc.local(p, args[i]);
        else if (opts && Object.prototype.hasOwnProperty.call(opts, p)) sc.local(p, opts[p]);
        else if (fv.defs[i]) sc.local(p, this.ev(fv.defs[i], sc, null));
        else throw new ZError('hàm ' + fv.name + ' thiếu tham số "' + p + '"');
      }
      this.depth = (this.depth || 0) + 1;
      try { var r = this.block(fv.body, sc, null); } finally { this.depth--; }
      return r && r.ret !== undefined ? r.ret : null;
    }
  };
  function hint(name, scope, rt) {
    var best = null, bd = 3, k, d;
    function chk(c) { d = lev(name.toLowerCase(), c.toLowerCase()); if (d < bd) { bd = d; best = c; } }
    for (k in FN) if (Object.prototype.hasOwnProperty.call(FN, k)) chk(k);
    var s = scope; while (s) { for (k in s.vars) if (Object.prototype.hasOwnProperty.call(s.vars, k)) chk(k); s = s.parent; }
    return best ? ' (ý bạn là "' + best + '"?)' : '';
  }
  function lev(a, b) {
    if (Math.abs(a.length - b.length) > 2) return 99;
    var m = [], i, j;
    for (i = 0; i <= a.length; i++) { m[i] = [i]; }
    for (j = 1; j <= b.length; j++) m[0][j] = j;
    for (i = 1; i <= a.length; i++) for (j = 1; j <= b.length; j++)
      m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + (a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1));
    return m[a.length][b.length];
  }
  Z.zip = zip; Z.binop = binop;

  /* =====================================================================
     THƯ VIỆN HÀM
     ===================================================================== */
  var D2R = Math.PI / 180, R2D = 180 / Math.PI, d = Z.def;
  function num(v, name) { if (typeof v !== 'number' || v !== v) throw new ZError((name || 'giá trị') + ' phải là số, nhận được ' + str(v)); return v; }
  function vec3(v, name) {
    if (typeof v === 'number') return [v, v, v];
    if (!isArr(v) || v.length < 3) throw new ZError((name || 'giá trị') + ' phải là vec 3 phần tử (x, y, z)');
    return [num(v[0]), num(v[1]), num(v[2])];
  }
  Z.vec3 = vec3; Z.num = num;

  /* --- Toán (góc theo độ) --- */
  function m1(group, name, f, doc, sig) { d(group, sig || name + '(x)', doc, function (x) { return zip(x, 0, function (a) { return f(num(a)); }); }); }
  m1('Toán', 'sin', function (a) { return Math.sin(a * D2R); }, 'sin của góc (độ)', 'sin(độ)');
  m1('Toán', 'cos', function (a) { return Math.cos(a * D2R); }, 'cos của góc (độ)', 'cos(độ)');
  m1('Toán', 'tan', function (a) { return Math.tan(a * D2R); }, 'tan của góc (độ)', 'tan(độ)');
  m1('Toán', 'asin', function (a) { return Math.asin(a) * R2D; }, 'arcsin, trả về độ');
  m1('Toán', 'acos', function (a) { return Math.acos(a) * R2D; }, 'arccos, trả về độ');
  m1('Toán', 'atan', function (a) { return Math.atan(a) * R2D; }, 'arctan, trả về độ');
  m1('Toán', 'sqrt', Math.sqrt, 'căn bậc hai'); m1('Toán', 'abs', Math.abs, 'giá trị tuyệt đối');
  m1('Toán', 'floor', Math.floor, 'làm tròn xuống'); m1('Toán', 'ceil', Math.ceil, 'làm tròn lên');
  m1('Toán', 'round', Math.round, 'làm tròn gần nhất'); m1('Toán', 'trunc', function (a) { return a < 0 ? Math.ceil(a) : Math.floor(a); }, 'bỏ phần thập phân');
  m1('Toán', 'exp', Math.exp, 'e mũ x'); m1('Toán', 'log', Math.log, 'logarit tự nhiên');
  m1('Toán', 'log2', function (a) { return Math.log(a) / Math.LN2; }, 'logarit cơ số 2');
  m1('Toán', 'log10', function (a) { return Math.log(a) / Math.LN10; }, 'logarit cơ số 10');
  m1('Toán', 'sign', function (a) { return a > 0 ? 1 : a < 0 ? -1 : 0; }, 'dấu: -1, 0 hoặc 1');
  m1('Toán', 'fract', function (a) { return a - Math.floor(a); }, 'phần thập phân');
  m1('Toán', 'deg', function (a) { return a * R2D; }, 'đổi radian sang độ'); m1('Toán', 'rad', function (a) { return a * D2R; }, 'đổi độ sang radian');
  d('Toán', 'atan2(y, x)', 'góc (độ) của vec (x, y)', function (y, x) { return Math.atan2(num(y), num(x)) * R2D; });
  d('Toán', 'pow(a, b)', 'a mũ b', function (a, b) { return zip(a, b, Math.pow); });
  d('Toán', 'mod(a, b)', 'dư luôn không âm', function (a, b) { return zip(a, b, function (x, y) { return ((x % y) + y) % y; }); });
  d('Toán', 'wrap(x, a, b)', 'cuộn x vào khoảng [a, b)', function (x, a, b) { return a + ((((x - a) % (b - a)) + (b - a)) % (b - a)); });
  d('Toán', 'hypot(a, b, ...)', 'độ dài cạnh huyền', function () { var s = 0, i; for (i = 0; i < arguments.length; i++) s += arguments[i] * arguments[i]; return Math.sqrt(s); });
  function flat(args) { return (args.length === 1 && isArr(args[0])) ? args[0] : args; }
  d('Toán', 'min(a, b, ...)', 'nhỏ nhất (nhận cả danh sách)', function () { return Math.min.apply(null, flat(arguments)); });
  d('Toán', 'max(a, b, ...)', 'lớn nhất (nhận cả danh sách)', function () { return Math.max.apply(null, flat(arguments)); });
  d('Toán', 'clamp(x, a, b)', 'kẹp x vào [a, b]', function (x, a, b) { return zip(x, 0, function (v) { return Math.min(Math.max(v, a), b); }); });
  d('Toán', 'lerp(a, b, k)', 'nội suy a→b theo k (0..1), dùng được cho vec', function (a, b, k) { return zip(a, b, function (x, y) { return x + (y - x) * k; }); });
  d('Toán', 'inv_lerp(a, b, x)', 'x nằm ở đâu giữa a và b (0..1)', function (a, b, x) { return (x - a) / (b - a); });
  d('Toán', 'remap(x, a, b, c, e)', 'đổi x từ khoảng [a,b] sang [c,e]', function (x, a, b, c, e) { return c + (x - a) / (b - a) * (e - c); });
  d('Toán', 'smoothstep(a, b, x)', 'chuyển mượt 0→1', function (a, b, x) { var k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); });
  d('Toán', 'step(edge, x)', '0 nếu x < edge, ngược lại 1', function (e, x) { return x < e ? 0 : 1; });
  d('Toán', 'pingpong(x, len)', 'đi tới rồi lùi lại trong [0, len]', function (x, l) { var m = ((x % (2 * l)) + 2 * l) % (2 * l); return m > l ? 2 * l - m : m; });
  d('Toán', 'approach(a, b, d)', 'tiến a về b tối đa d mỗi lần', function (a, b, dd) { return Math.abs(b - a) <= dd ? b : a + (b > a ? dd : -dd); });

  /* --- Ngẫu nhiên / noise --- */
  var seedv = 123456789;
  function rnd() { seedv = (seedv * 1664525 + 1013904223) % 4294967296; return seedv / 4294967296; }
  Z.rnd = rnd;
  d('Ngẫu nhiên', 'seed(n)', 'đặt hạt giống (kết quả lặp lại được)', function (n) { seedv = Math.floor(num(n)) % 4294967296; return null; });
  d('Ngẫu nhiên', 'rand(a, b)', 'số ngẫu nhiên trong [a, b); không tham số: [0,1)', function (a, b) { if (a === undefined) return rnd(); if (b === undefined) return rnd() * a; return a + rnd() * (b - a); });
  d('Ngẫu nhiên', 'randint(a, b)', 'số nguyên ngẫu nhiên trong [a, b]', function (a, b) { return Math.floor(a + rnd() * (b - a + 1)); });
  d('Ngẫu nhiên', 'gauss(mean, sd)', 'phân phối chuẩn', function (m, s) { var u = 1 - rnd(), v = rnd(); return (m || 0) + (s === undefined ? 1 : s) * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); });
  d('Ngẫu nhiên', 'pick(list)', 'chọn ngẫu nhiên một phần tử', function (l) { return l[Math.floor(rnd() * l.length)]; });
  d('Ngẫu nhiên', 'shuffle(list)', 'xáo trộn danh sách (bản mới)', function (l) { var a = l.slice(), i, j, t; for (i = a.length - 1; i > 0; i--) { j = Math.floor(rnd() * (i + 1)); t = a[i]; a[i] = a[j]; a[j] = t; } return a; });
  d('Ngẫu nhiên', 'rand_dir()', 'vec đơn vị hướng ngẫu nhiên', function () { var z = rnd() * 2 - 1, a = rnd() * Math.PI * 2, r = Math.sqrt(1 - z * z); return [r * Math.cos(a), z, r * Math.sin(a)]; });
  d('Ngẫu nhiên', 'rand_in_sphere(r)', 'điểm ngẫu nhiên trong hình cầu bán kính r', function (r) { var x, y, z; do { x = rnd() * 2 - 1; y = rnd() * 2 - 1; z = rnd() * 2 - 1; } while (x * x + y * y + z * z > 1); r = r === undefined ? 1 : r; return [x * r, y * r, z * r]; });
  var perm = (function () { var p = [], i, j, t, s = 7; for (i = 0; i < 256; i++) p[i] = i; for (i = 255; i > 0; i--) { s = (s * 16807) % 2147483647; j = s % (i + 1); t = p[i]; p[i] = p[j]; p[j] = t; } return p.concat(p); })();
  function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  function grad(h, x, y, z) { var u = (h & 15) < 8 ? x : y, v = (h & 15) < 4 ? y : ((h & 15) === 12 || (h & 15) === 14 ? x : z); return ((h & 1) ? -u : u) + ((h & 2) ? -v : v); }
  function noise3(x, y, z) {
    var X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z3 = Math.floor(z) & 255;
    x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
    var u = fade(x), v = fade(y), w = fade(z), A = perm[X] + Y, AA = perm[A] + Z3, AB = perm[A + 1] + Z3, B = perm[X + 1] + Y, BA = perm[B] + Z3, BB = perm[B + 1] + Z3;
    function lp(t, a, b) { return a + t * (b - a); }
    return lp(w, lp(v, lp(u, grad(perm[AA], x, y, z), grad(perm[BA], x - 1, y, z)), lp(u, grad(perm[AB], x, y - 1, z), grad(perm[BB], x - 1, y - 1, z))),
      lp(v, lp(u, grad(perm[AA + 1], x, y, z - 1), grad(perm[BA + 1], x - 1, y, z - 1)), lp(u, grad(perm[AB + 1], x, y - 1, z - 1), grad(perm[BB + 1], x - 1, y - 1, z - 1))));
  }
  d('Ngẫu nhiên', 'noise(x, y, z)', 'nhiễu Perlin mượt, giá trị khoảng -1..1', function (x, y, z) { return noise3(x || 0, y || 0, z || 0); });

  /* --- Vec --- */
  d('Vec', 'vec(x, y, z)', 'tạo vec 3 chiều', function (x, y, z) { return [x || 0, y || 0, z || 0]; });
  d('Vec', 'add(a, b)', 'cộng vec', function (a, b) { return zip(a, b, function (x, y) { return x + y; }); });
  d('Vec', 'sub(a, b)', 'trừ vec', function (a, b) { return zip(a, b, function (x, y) { return x - y; }); });
  d('Vec', 'mul(a, b)', 'nhân vec với vec hoặc số', function (a, b) { return zip(a, b, function (x, y) { return x * y; }); });
  d('Vec', 'div(a, b)', 'chia vec', function (a, b) { return zip(a, b, function (x, y) { return x / y; }); });
  d('Vec', 'dot(a, b)', 'tích vô hướng', function (a, b) { var s = 0, i; for (i = 0; i < a.length; i++) s += a[i] * b[i]; return s; });
  d('Vec', 'cross(a, b)', 'tích có hướng (3D)', function (a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; });
  d('Vec', 'mag(v)', 'độ dài vec', function (v) { var s = 0, i; for (i = 0; i < v.length; i++) s += v[i] * v[i]; return Math.sqrt(s); });
  d('Vec', 'norm(v)', 'vec đơn vị cùng hướng', function (v) { var s = 0, i, o = []; for (i = 0; i < v.length; i++) s += v[i] * v[i]; s = Math.sqrt(s) || 1; for (i = 0; i < v.length; i++) o.push(v[i] / s); return o; });
  d('Vec', 'dist(a, b)', 'khoảng cách hai điểm (hoặc hai vật)', function (a, b) { if (a && a.$name) a = a.$world(); if (b && b.$name) b = b.$world(); var s = 0, i; for (i = 0; i < a.length; i++) s += (a[i] - b[i]) * (a[i] - b[i]); return Math.sqrt(s); });
  d('Vec', 'midpoint(a, b)', 'trung điểm', function (a, b) { return zip(a, b, function (x, y) { return (x + y) / 2; }); });
  d('Vec', 'rotate_vec(v, axis, độ)', 'xoay vec quanh trục "X" "Y" hoặc "Z"', function (v, ax, a) {
    var c = Math.cos(a * D2R), s = Math.sin(a * D2R), x = v[0], y = v[1], z = v[2];
    ax = String(ax).toUpperCase();
    if (ax === 'X') return [x, y * c - z * s, y * s + z * c];
    if (ax === 'Y') return [x * c + z * s, y, -x * s + z * c];
    return [x * c - y * s, x * s + y * c, z];
  });
  d('Vec', 'polar(r, vĩ, kinh)', 'toạ độ cầu → (x,y,z): vĩ độ -90..90, kinh độ 0..360', function (r, la, lo) {
    var cl = Math.cos(la * D2R); return [r * cl * Math.cos(lo * D2R), r * Math.sin(la * D2R), r * cl * Math.sin(lo * D2R)];
  });
  d('Vec', 'circle_point(r, góc)', 'điểm trên vòng tròn mặt phẳng XZ: (r cos, 0, r sin)', function (r, a) { return [r * Math.cos(a * D2R), 0, r * Math.sin(a * D2R)]; });
  d('Vec', 'angle_between(a, b)', 'góc giữa hai vec (độ)', function (a, b) {
    var dt = 0, la = 0, lb = 0, i; for (i = 0; i < a.length; i++) { dt += a[i] * b[i]; la += a[i] * a[i]; lb += b[i] * b[i]; }
    return Math.acos(Math.max(-1, Math.min(1, dt / (Math.sqrt(la) * Math.sqrt(lb) || 1)))) * R2D;
  });
  d('Vec', 'reflect(v, n)', 'phản xạ vec v qua pháp tuyến n', function (v, n) { var dt = 0, i, o = [], nl = 0; for (i = 0; i < n.length; i++) nl += n[i] * n[i]; nl = Math.sqrt(nl) || 1; for (i = 0; i < v.length; i++) dt += v[i] * n[i] / nl; for (i = 0; i < v.length; i++) o.push(v[i] - 2 * dt * n[i] / nl); return o; });

  /* --- Danh sách --- */
  d('Danh sách', 'len(list)', 'số phần tử (hoặc độ dài chuỗi)', function (l) { return l.length; });
  d('Danh sách', 'range(a, b, bước)', 'danh sách số từ a đến b (không gồm b)', function (a, b, st) {
    var o = [], i; if (b === undefined) { b = a; a = 0; } st = st || (a <= b ? 1 : -1);
    if (Math.abs((b - a) / st) > 100000) throw new ZError('range quá lớn');
    if (st > 0) for (i = a; i < b; i += st) o.push(i); else for (i = a; i > b; i += st) o.push(i); return o;
  });
  d('Danh sách', 'push(list, v)', 'thêm v vào cuối danh sách', function (l, v) { l.push(v); return l; });
  d('Danh sách', 'pop(list)', 'bỏ và trả về phần tử cuối', function (l) { return l.pop(); });
  d('Danh sách', 'concat(a, b)', 'nối hai danh sách', function (a, b) { return a.concat(b); });
  d('Danh sách', 'slice(list, a, b)', 'cắt một đoạn', function (l, a, b) { return l.slice(a, b); });
  d('Danh sách', 'sum(list)', 'tổng', function (l) { var s = 0, i; for (i = 0; i < l.length; i++) s += l[i]; return s; });
  d('Danh sách', 'avg(list)', 'trung bình', function (l) { var s = 0, i; for (i = 0; i < l.length; i++) s += l[i]; return l.length ? s / l.length : 0; });
  d('Danh sách', 'reverse(list)', 'đảo ngược (bản mới)', function (l) { return l.slice().reverse(); });
  d('Danh sách', 'sort(list)', 'sắp xếp tăng dần (bản mới)', function (l) { return l.slice().sort(function (a, b) { return a < b ? -1 : a > b ? 1 : 0; }); });
  d('Danh sách', 'contains(list, v)', 'có chứa v không', function (l, v) { return l.indexOf(v) > -1; });
  d('Danh sách', 'index_of(list, v)', 'vị trí của v, -1 nếu không có', function (l, v) { return l.indexOf(v); });
  d('Danh sách', 'first(list)', 'phần tử đầu', function (l) { return l[0]; });
  d('Danh sách', 'last(list)', 'phần tử cuối', function (l) { return l[l.length - 1]; });
  d('Danh sách', 'grid_points(nx, nz, bước)', 'lưới điểm (x,0,z) căn giữa gốc', function (nx, nz, st) {
    var o = [], i, j; st = st || 1; for (i = 0; i < nx; i++) for (j = 0; j < nz; j++) o.push([(i - (nx - 1) / 2) * st, 0, (j - (nz - 1) / 2) * st]); return o;
  });

  /* --- Chuỗi --- */
  d('Chuỗi', 'str(v)', 'đổi thành chuỗi', function (v) { return str(v); });
  d('Chuỗi', 'num(s)', 'đổi chuỗi thành số', function (s) { var v = parseFloat(s); return v !== v ? 0 : v; });
  d('Chuỗi', 'upper(s)', 'IN HOA', function (s) { return String(s).toUpperCase(); });
  d('Chuỗi', 'lower(s)', 'in thường', function (s) { return String(s).toLowerCase(); });
  d('Chuỗi', 'fmt(n, số_lẻ)', 'định dạng số với số chữ số thập phân', function (n, k) { return Number(n).toFixed(k === undefined ? 2 : k).replace('.', ','); });
  d('Chuỗi', 'pad(n, độ_rộng)', 'thêm số 0 phía trước: pad(7,3) = "007"', function (n, w) { var s = String(Math.floor(n)); while (s.length < w) s = '0' + s; return s; });
  d('Chuỗi', 'join(list, sep)', 'nối danh sách thành chuỗi', function (l, s) { var o = [], i; for (i = 0; i < l.length; i++) o.push(str(l[i])); return o.join(s === undefined ? ', ' : s); });
  d('Chuỗi', 'split(s, sep)', 'tách chuỗi thành danh sách', function (s, sep) { return String(s).split(sep === undefined ? ' ' : sep); });
  d('Chuỗi', 'replace(s, a, b)', 'thay mọi a bằng b', function (s, a, b) { return String(s).split(a).join(b); });
  d('Chuỗi', 'trim(s)', 'bỏ khoảng trắng hai đầu', function (s) { return String(s).replace(/^\s+|\s+$/g, ''); });
  d('Chuỗi', 'substr(s, a, độ_dài)', 'cắt chuỗi', function (s, a, n) { return String(s).substr(a, n); });

  /* --- Màu --- */
  var NAMED = { black: '#000000', white: '#ffffff', red: '#ff0000', green: '#008000', lime: '#00ff00', blue: '#0000ff', yellow: '#ffff00', orange: '#ffa500', purple: '#800080', pink: '#ffc0cb', cyan: '#00ffff', magenta: '#ff00ff', gray: '#808080', grey: '#808080', brown: '#a52a2a', gold: '#ffd700', silver: '#c0c0c0', navy: '#000080', teal: '#008080', maroon: '#800000', olive: '#808000', tomato: '#ff6347', skyblue: '#87ceeb', coral: '#ff7f50', crimson: '#dc143c', indigo: '#4b0082', violet: '#ee82ee', beige: '#f5f5dc', ivory: '#fffff0', salmon: '#fa8072', khaki: '#f0e68c', transparent: '#00000000' };
  function toRGBA(c) {
    var m, s;
    if (isArr(c)) return [c[0] * 255, c[1] * 255, c[2] * 255, c.length > 3 ? c[3] : 1];
    s = String(c).toLowerCase();
    if (NAMED[s]) s = NAMED[s];
    if ((m = /^#([0-9a-f]{3,4})$/.exec(s))) { var h = m[1]; return [parseInt(h.charAt(0) + h.charAt(0), 16), parseInt(h.charAt(1) + h.charAt(1), 16), parseInt(h.charAt(2) + h.charAt(2), 16), h.length === 4 ? parseInt(h.charAt(3) + h.charAt(3), 16) / 255 : 1]; }
    if ((m = /^#([0-9a-f]{6})([0-9a-f]{2})?$/.exec(s))) return [parseInt(m[1].substr(0, 2), 16), parseInt(m[1].substr(2, 2), 16), parseInt(m[1].substr(4, 2), 16), m[2] ? parseInt(m[2], 16) / 255 : 1];
    if ((m = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/.exec(s))) return [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]];
    throw new ZError('không hiểu màu "' + c + '" (dùng #rrggbb, tên màu, hoặc rgb(...))');
  }
  Z.toRGBA = toRGBA;
  function hex2(n) { n = Math.max(0, Math.min(255, Math.round(n))); return (n < 16 ? '0' : '') + n.toString(16); }
  function fromRGBA(r, g, b, a) { return '#' + hex2(r) + hex2(g) + hex2(b) + (a !== undefined && a < 1 ? hex2(a * 255) : ''); }
  Z.fromRGBA = fromRGBA;
  function hsl2rgb(h, s, l) {
    h = ((h % 360) + 360) % 360 / 360; var r, g, b;
    if (s === 0) r = g = b = l; else {
      var q = l < .5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
      var f = function (t) { if (t < 0) t += 1; if (t > 1) t -= 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < .5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
      r = f(h + 1 / 3); g = f(h); b = f(h - 1 / 3);
    }
    return [r * 255, g * 255, b * 255];
  }
  d('Màu', 'rgb(r, g, b)', 'màu từ 3 số 0..255', function (r, g, b) { return fromRGBA(r, g, b); });
  d('Màu', 'rgba(r, g, b, a)', 'màu có độ trong suốt a (0..1)', function (r, g, b, a) { return fromRGBA(r, g, b, a); });
  d('Màu', 'hsl(h, s, l)', 'màu theo sắc độ 0..360, bão hoà 0..1, sáng 0..1', function (h, s, l) { var c = hsl2rgb(h, s, l); return fromRGBA(c[0], c[1], c[2]); });
  d('Màu', 'mix(c1, c2, k)', 'trộn hai màu theo k (0..1)', function (a, b, k) { var x = toRGBA(a), y = toRGBA(b); return fromRGBA(x[0] + (y[0] - x[0]) * k, x[1] + (y[1] - x[1]) * k, x[2] + (y[2] - x[2]) * k, x[3] + (y[3] - x[3]) * k); });
  d('Màu', 'lighten(c, k)', 'làm sáng màu (k 0..1)', function (c, k) { var x = toRGBA(c); return fromRGBA(x[0] + (255 - x[0]) * k, x[1] + (255 - x[1]) * k, x[2] + (255 - x[2]) * k, x[3]); });
  d('Màu', 'darken(c, k)', 'làm tối màu (k 0..1)', function (c, k) { var x = toRGBA(c); return fromRGBA(x[0] * (1 - k), x[1] * (1 - k), x[2] * (1 - k), x[3]); });
  d('Màu', 'alpha(c, a)', 'đặt độ trong suốt cho màu', function (c, a) { var x = toRGBA(c); return fromRGBA(x[0], x[1], x[2], a); });
  d('Màu', 'rainbow(k)', 'màu cầu vồng theo k (0..1)', function (k) { var c = hsl2rgb(k * 360, 1, .55); return fromRGBA(c[0], c[1], c[2]); });

  /* --- Easing --- */
  var EASE = {
    linear: function (k) { return k; },
    'in': function (k) { return k * k; }, out: function (k) { return 1 - (1 - k) * (1 - k); }, inout: function (k) { return k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; },
    incubic: function (k) { return k * k * k; }, outcubic: function (k) { return 1 - Math.pow(1 - k, 3); }, inoutcubic: function (k) { return k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; },
    insine: function (k) { return 1 - Math.cos(k * Math.PI / 2); }, outsine: function (k) { return Math.sin(k * Math.PI / 2); }, inoutsine: function (k) { return -(Math.cos(Math.PI * k) - 1) / 2; },
    inback: function (k) { var c = 1.70158; return (c + 1) * k * k * k - c * k * k; }, outback: function (k) { var c = 1.70158; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); },
    outelastic: function (k) { return k === 0 ? 0 : k === 1 ? 1 : Math.pow(2, -10 * k) * Math.sin((k * 10 - .75) * (2 * Math.PI / 3)) + 1; },
    outbounce: function (k) { var n = 7.5625, dd = 2.75; if (k < 1 / dd) return n * k * k; if (k < 2 / dd) return n * (k -= 1.5 / dd) * k + .75; if (k < 2.5 / dd) return n * (k -= 2.25 / dd) * k + .9375; return n * (k -= 2.625 / dd) * k + .984375; },
    spring: function (k) { return 1 - Math.cos(k * 4.5 * Math.PI) * Math.exp(-k * 6); }
  };
  Z.EASE = EASE;
  d('Animation', 'ease(tên, k)', 'đường cong chuyển động: linear in out inout incubic outcubic inoutcubic insine outsine inoutsine inback outback outelastic outbounce spring', function (n, k) { var f = EASE[String(n).toLowerCase()]; if (!f) throw new ZError('không có easing "' + n + '"'); return f(Math.max(0, Math.min(1, k))); });

  /* --- Hệ thống --- */
  d('Hệ thống', 'log(...)', 'in giá trị ra bảng thông báo', function () { var o = [], i; for (i = 0; i < arguments.length; i++) o.push(str(arguments[i])); if (this.rt.log) this.rt.log(o.join(' ')); return null; });
  d('Hệ thống', 'assert(điều_kiện, lời)', 'báo lỗi nếu điều kiện sai', function (c, m) { if (!c) throw new ZError(m || 'assert thất bại'); return null; });
  d('Hệ thống', 'type(v)', 'kiểu giá trị: number string list object null', function (v) { return v === null || v === undefined ? 'null' : isArr(v) ? 'list' : (v.$name ? 'object' : typeof v); });
})(typeof window !== 'undefined' ? window : this);
