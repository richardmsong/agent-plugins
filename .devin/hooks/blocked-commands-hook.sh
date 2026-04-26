#!/usr/bin/env bash
# Devin I/O wrapper for blocked-commands guard
# Reads Devin's JSON stdin, extracts command, calls shared guard, outputs Devin JSON

export CLAUDE_PROJECT_DIR="${DEVIN_PROJECT_DIR:-.}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
GUARD="$SCRIPT_DIR/guards/blocked-commands.sh"

[ ! -f "$GUARD" ] && exit 0

INPUT=$(cat)
COMMAND=$(python3 -c "
import json, sys
d = json.loads(sys.stdin.read())
print(d.get('tool_input', {}).get('command', ''))
" <<< "$INPUT" 2>/dev/null)

[ -z "$COMMAND" ] && exit 0

REASON=$(bash "$GUARD" "$COMMAND" 2>&1)
RC=$?

if [ $RC -ne 0 ]; then
  # Guard denied — translate to Devin's exit 0 + JSON block
  python3 -c "
import json, sys
reason = sys.stdin.read().strip()
print(json.dumps({'decision': 'block', 'reason': reason}))
" <<< "$REASON"
  exit 0
fi
