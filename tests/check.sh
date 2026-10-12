#!/bin/bash
# Fast check: build the single file, then syntax-check every inline <script> with node.
set -e
cd "$(dirname "$0")/.."
python3 -I build.py >/dev/null
tmp=$(mktemp -d)
python3 -I - "$tmp" <<'PY'
import re, sys
html = open('Eulenbach_DM-Helfer_2.0.html', encoding='utf-8').read()
for i, js in enumerate(re.findall(r'<script>(.*?)</script>', html, re.S)):
    open(f'{sys.argv[1]}/s{i}.js', 'w', encoding='utf-8').write(js)
PY
for f in "$tmp"/s*.js; do node --check "$f"; done
rm -rf "$tmp"
