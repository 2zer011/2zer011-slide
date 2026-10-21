#!/usr/bin/env python3
"""Chuyển một bài HTML "hiện đại" sang dạng chạy được trên trình duyệt cũ (IE11, Chrome 49+, Firefox 52+).

Dùng:  python3 tools/compat.py tools/originals/<bai>.html decks/<bai>.html

Làm gì:
  - CSS variables  -> giá trị thật
  - inset:0        -> left/top/right/bottom:0
  - flex gap       -> margin cho phần tử con
  - display:grid   -> flex-wrap + width calc()
  - chèn shim JS: classList.toggle(c, force), phím mũi tên trên IE, tắt hiệu ứng blend nếu không hỗ trợ
"""
import re, sys
from bs4 import BeautifulSoup

SHIM = r"""(function(){
try{var t=document.createElement('div');t.classList.toggle('x',false);
 if(t.classList.contains('x')){var o=DOMTokenList.prototype.toggle;
  DOMTokenList.prototype.toggle=function(c,f){if(arguments.length>1){if(f)this.add(c);else this.remove(c);return !!f;}return o.call(this,c);};}}catch(e){}
try{if(!('mixBlendMode' in document.documentElement.style)){var s=document.createElement('style');
 s.appendChild(document.createTextNode('#sun,#stage::after{display:none!important}'));document.head.appendChild(s);}}catch(e){}
var m={Right:'ArrowRight',Left:'ArrowLeft',Down:'ArrowDown',Up:'ArrowUp',Spacebar:' ',Esc:'Escape'};
window.addEventListener('keydown',function(e){
 if(e.key&&m[e.key]&&!e.__s){e.stopImmediatePropagation();e.preventDefault();
  var n=document.createEvent('Event');n.initEvent('keydown',true,true);
  try{Object.defineProperty(n,'key',{value:m[e.key]});}catch(x){}n.__s=1;(document.body||document).dispatchEvent(n);}},true);
})();"""

src, dst = sys.argv[1], sys.argv[2]
soup = BeautifulSoup(open(src, encoding='utf8').read(), 'html.parser')
st = soup.find('style')
css = st.string

# ---- 1. CSS variables
rootm = re.search(r':root\{([^}]*)\}', css)
V = dict(re.findall(r'--([\w-]+):([^;]+)', rootm.group(1))) if rootm else {}
css = css.replace('transition-delay:calc(var(--i,0)*.1s + .4s)', 'transition-delay:.4s')
def subvars(t):
    return re.sub(r'var\(--([\w-]+)(?:,([^)]*))?\)', lambda m: V.get(m.group(1), m.group(2) or ''), t)
css = subvars(css)

# ---- 2. inset
INS = 'left:0;top:0;right:0;bottom:0'
css = css.replace('inset:0', INS)

# ---- 3. gap trong luật CSS
cls_dir = {}
for sel, body in re.findall(r'([^{}]+)\{([^{}]*)\}', css):
    mm = re.fullmatch(r'\s*\.([\w-]+)\s*', sel)
    if mm and 'flex-direction' in body:
        cls_dir[mm.group(1)] = 'column' if 'flex-direction:column' in body else 'row'
extra = []
def fix_rule(m):
    sel, body = m.group(1), m.group(2)
    g = re.search(r'(?<![\w-])gap:(\d+)px', body)
    if not g or 'display:grid' in body:
        return m.group(0)
    n = g.group(1)
    col = 'flex-direction:column' in body
    prop = 'margin-top' if col else 'margin-left'
    for s in sel.split(','):
        extra.append('%s>*+*{%s:%spx}' % (s.strip(), prop, n))
    return '%s{%s}' % (sel, re.sub(r'(?<![\w-])gap:\d+px;?', '', body))
css = re.sub(r'([^{}]+)\{([^{}]*)\}', fix_rule, css)

# ---- 4. inline style của từng phần tử
used = set()
def fix_style(s):
    s = subvars(s).replace('inset:0', INS)
    return s
for el in soup.find_all(True):
    s = el.get('style')
    if not s:
        continue
    s = fix_style(s)
    mi = re.search(r'--i:(\d+)', s)
    if mi:  # stagger .s
        s += ';transition-delay:%.1fs' % (0.4 + 0.1 * int(mi.group(1)))
    if 'display:grid' in s:
        cols = re.search(r'repeat\((\d+),', s)
        ncol = int(cols.group(1)) if cols else len(re.findall(r'1fr', re.search(r'grid-template-columns:([^;]*)', s).group(1)))
        g = int(re.search(r'(?<![\w-])gap:(\d+)px', s).group(1))
        s = re.sub(r'display:grid;?|grid-template-columns:[^;]*;?|grid-auto-rows:[^;]*;?|(?<![\w-])gap:\d+px;?', '', s)
        s += ';display:flex;flex-wrap:wrap;margin-bottom:-%dpx' % g
        kids = el.find_all(True, recursive=False)
        rows = (len(kids) + ncol - 1) // ncol
        for i, k in enumerate(kids):
            ks = k.get('style', '').rstrip(';')
            ks += ';width:calc((100%% - %dpx)/%d);margin-right:%dpx;margin-bottom:%dpx' % (
                g * (ncol - 1), ncol, 0 if i % ncol == ncol - 1 else g, g)
            k['style'] = ks.lstrip(';')
    else:
        g = re.search(r'(?<![\w-])gap:(\d+)px', s)
        if g:
            n = g.group(1)
            fd = re.search(r'flex-direction:(row|column)', s)
            d = fd.group(1) if fd else None
            if not d:
                for c in el.get('class', []):
                    if c in cls_dir:
                        d = cls_dir[c]
            d = d or 'row'
            name = ('gy' if d == 'column' else 'gx') + n
            used.add((name, d, n))
            el['class'] = el.get('class', []) + [name]
            prop = 'margin-top' if d == 'column' else 'margin-left'
            for k in el.find_all(True, recursive=False)[1:]:  # margin inline của con cộng dồn với gap (như CSS gốc)
                ks = k.get('style', '')
                mm = re.search(r'(?<![\w-])%s:(\d+)px' % prop, ks)
                if mm:
                    k['style'] = ks.replace(mm.group(0), '%s:%dpx' % (prop, int(mm.group(1)) + int(n)))
            s = re.sub(r'(?<![\w-])gap:\d+px;?', '', s)
    el['style'] = s.strip(';')
for name, d, n in sorted(used):
    extra.append('.%s>*+*{%s:%spx}' % (name, 'margin-top' if d == 'column' else 'margin-left', n))
st.string = css + '\n/* compat: gap -> margin */\n' + '\n'.join(extra)

# ---- 5. shim
sh = soup.new_tag('script'); sh.string = SHIM
soup.head.insert(0, sh)
open(dst, 'w', encoding='utf8').write(str(soup))
print('ok', dst)
