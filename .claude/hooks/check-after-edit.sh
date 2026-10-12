#!/bin/bash
# After an edit to a source file: build and syntax-check, hand errors back to Claude (exit 2).
CHECK="bash tests/check.sh"
input=$(cat)
file=$(echo "$input" | jq -r '.tool_input.file_path // empty')
case "$file" in */src/*.js|*/src/*.html|*/src/*.css|*/build.py) ;; *) exit 0 ;; esac
cd "$CLAUDE_PROJECT_DIR" || exit 0
out=$($CHECK 2>&1)
if [ $? -ne 0 ]; then
  echo "Check failed after editing $file:" >&2
  echo "$out" | head -30 >&2
  exit 2
fi
exit 0
