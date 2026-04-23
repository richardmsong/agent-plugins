#!/bin/bash
# PreToolUse hook: blocks master sessions from editing source files.
# Reads source_dirs patterns from $CLAUDE_PROJECT_DIR/.agent/master-config.json.
#
# Sessions with an agent_type field are subagents — let them through unconditionally.
# All other sessions (master) are checked against source_dirs patterns.
#
# Hook I/O contract:
#   stdin:  JSON with agent_type (optional), tool_input.file_path
#   stdout: deny JSON (if blocked) or nothing (implicit allow)
#   exit:   always 0

CONFIG_FILE="${CLAUDE_PROJECT_DIR:-.}/.agent/master-config.json"

# No config = no restrictions.
if [ ! -f "$CONFIG_FILE" ]; then
  exit 0
fi

INPUT=$(cat)

# Subagents have an agent_type field — let them through.
HAS_AGENT_TYPE=$(echo "$INPUT" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print('yes' if data.get('agent_type') else '')
except:
    print('')
")
if [ -n "$HAS_AGENT_TYPE" ]; then
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
