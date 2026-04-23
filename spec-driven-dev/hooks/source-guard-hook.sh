#!/bin/bash
# PreToolUse hook: blocks master sessions from editing source files.
# Reads source_dirs patterns from $CLAUDE_PROJECT_DIR/.agent/master-config.json.
# Supports multiple concurrent sdd-master sessions via .master-sessions registry.
#
# Registration flow (driven by sdd-master):
#   - sdd-master creates an empty marker file and exports SDD_MARKER_FILE
#   - First Edit/Write call: hook writes session_id to marker + .master-sessions
#   - Subsequent calls: hook checks .master-sessions to decide allow/deny
#   - On exit: sdd-master reads marker, removes session_id from .master-sessions
#
# Hook I/O contract:
#   stdin:  JSON with session_id, tool_input.file_path
#   stdout: deny JSON (if blocked) or nothing (implicit allow)
#   exit:   always 0

MASTER_SESSIONS="${CLAUDE_PROJECT_DIR:-.}/.agent/.master-sessions"
CONFIG_FILE="${CLAUDE_PROJECT_DIR:-.}/.agent/master-config.json"

# No config = no restrictions.
if [ ! -f "$CONFIG_FILE" ]; then
  exit 0
fi

INPUT=$(cat)

SESSION_ID=$(echo "$INPUT" | python3 -c "
import sys, json
try:
    print(json.load(sys.stdin).get('session_id', ''))
except:
    print('')
")

if [ -z "$SESSION_ID" ]; then
  exit 0
fi

# --- Registration: first call from an sdd-master session ---
# SDD_MARKER_FILE is set by sdd-master. Empty marker = not yet registered.
if [ -n "${SDD_MARKER_FILE:-}" ] && [ -f "$SDD_MARKER_FILE" ] && [ ! -s "$SDD_MARKER_FILE" ]; then
  echo "$SESSION_ID" >> "$MASTER_SESSIONS"
  printf '%s' "$SESSION_ID" > "$SDD_MARKER_FILE"
fi

# --- Guard: is this a registered master session? ---
if ! grep -qF "$SESSION_ID" "$MASTER_SESSIONS" 2>/dev/null; then
  exit 0
fi

# Master session — check file_path against source_dirs patterns.
RESULT=$(echo "$INPUT" | python3 -c "
import sys, json, fnmatch, os

data = json.load(sys.stdin)
file_path = data.get('tool_input', {}).get('file_path', '')
if not file_path:
    sys.exit(0)

config_path = os.environ.get('CLAUDE_PROJECT_DIR', '.') + '/.agent/master-config.json'
try:
    with open(config_path) as f:
        config = json.load(f)
except:
    sys.exit(0)

project_dir = os.environ.get('CLAUDE_PROJECT_DIR', os.getcwd())
rel_path = os.path.relpath(file_path, project_dir) if os.path.isabs(file_path) else file_path

for pattern in config.get('source_dirs', []):
    if fnmatch.fnmatch(rel_path, pattern):
        print(json.dumps({
            'hookSpecificOutput': {
                'hookEventName': 'PreToolUse',
                'permissionDecision': 'deny',
                'permissionDecisionReason': f'Source guard: master session cannot edit {rel_path} (matches {pattern}). Use dev-harness agents instead.'
            }
        }))
        sys.exit(0)
")

if [ -n "$RESULT" ]; then
  echo "$RESULT"
fi

exit 0
