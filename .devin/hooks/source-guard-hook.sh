#!/usr/bin/env bash
# Devin I/O wrapper for source-guard
# Reads Devin's JSON stdin, extracts file_path, calls shared guard, outputs Devin JSON

export CLAUDE_PROJECT_DIR="${DEVIN_PROJECT_DIR:-.}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
GUARD="$SCRIPT_DIR/guards/source-guard.sh"

[ ! -f "$GUARD" ] && exit 0

INPUT=$(cat)
FILE_PATH=$(python3 -c "
import json, sys
d = json.loads(sys.stdin.read())
print(d.get('tool_input', {}).get('file_path', ''))
" <<< "$INPUT" 2>/dev/null)

[ -z "$FILE_PATH" ] && exit 0

REASON=$(bash "$GUARD" "$FILE_PATH" 2>&1)
RC=$?

if [ $RC -ne 0 ]; then
  python3 -c "
import json, sys
reason = sys.stdin.read().strip()
print(json.dumps({'decision': 'block', 'reason': reason}))
" <<< "$REASON"
  exit 0
fi
