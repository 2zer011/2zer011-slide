#!/usr/bin/env python3
"""Ghép src/zer-*.js + studio.js vào studio.html (một file duy nhất)."""
import os
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def rd(p): return open(os.path.join(root, p), encoding='utf-8').read()
runtime = "\n".join(rd('src/zer-%s.js' % n) for n in ('1-lang', '2-render', '3-player', '4-samples')) + "\n})(typeof window!=='undefined'?window:global);\n"
runtime = runtime.replace('</script', '<\\/script')
tpl = rd('src/studio.tpl.html')
import json
spec = 'var __SPEC = ' + json.dumps(rd('docs/ZER-AI.md'), ensure_ascii=False).replace('</', '<\\/') + ';\n'
out = tpl.replace('/*@@ZER@@*/', runtime).replace('/*@@STUDIO@@*/', spec + rd('src/studio.js'))
open(os.path.join(root, 'studio.html'), 'w', encoding='utf-8').write(out)
print('studio.html', len(out) // 1024, 'KB')
