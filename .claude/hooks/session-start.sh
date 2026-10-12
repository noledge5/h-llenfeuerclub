#!/bin/bash
# Installs dependencies in a fresh checkout (cloud sessions start without them),
# so checks, tests and the other hooks work from the first turn.
cd "$CLAUDE_PROJECT_DIR" || exit 0
export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
if [ -f package-lock.json ] && { [ ! -d node_modules ] || [ package-lock.json -nt node_modules ]; }; then
  npm ci --no-audit --no-fund --loglevel=error --ignore-scripts >/dev/null 2>&1 || npm install --no-audit --no-fund --loglevel=error --ignore-scripts >/dev/null 2>&1
fi
exit 0
