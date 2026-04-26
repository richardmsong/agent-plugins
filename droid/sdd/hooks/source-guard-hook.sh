#!/usr/bin/env bash
# Droid I/O wrapper for source-guard.
# Bridges FACTORY_PROJECT_DIR → CLAUDE_PROJECT_DIR so the shared guard works.
export CLAUDE_PROJECT_DIR="${FACTORY_PROJECT_DIR:-.}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
GUARD="${SCRIPT_DIR}/guards/source-guard.sh"
INPUT=$(cat)

# Subagents have a subagent_type field — let them through unconditionally.
HAS_SUBAGENT=$(python3 -c "
import sys, json
try:
    data = json.loads(sys.stdin.read())
    print('yes' if data.get('subagent_type') or data.get('agent_type') else '')
except:
    print('')
" <<< "$INPUT")
if [ -n "$HAS_SUBAGENT" ]; then
  exit 0
fi

FILE_PATH=$(python3 -c "import json,sys; d=json.loads(sys.stdin.read()); print(d.get('tool_input',{}).get('file_path',''))" <<< "$INPUT")
[ -z "$FILE_PATH" ] && exit 0
REASON=$(bash "$GUARD" "$FILE_PATH" 2>&1)
if [ $? -ne 0 ]; then
  python3 -c "
import json, sys
reason = sys.stdin.read().strip()
print(json.dumps({'hookSpecificOutput': {
  'hookEventName': 'PreToolUse',
  'permissionDecision': 'deny',
  'permissionDecisionReason': reason
}}))
" <<< "$REASON"
fi
