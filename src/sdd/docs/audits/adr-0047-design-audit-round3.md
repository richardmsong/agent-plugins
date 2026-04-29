## Run: 2026-04-23T00:00:00Z

**Gaps found: 3**

1. **Implementation Plan `git mv` command misses hidden files** — `git mv spec-driven-dev/* src/sdd/` uses a shell glob that does not expand to hidden entries. The current `spec-driven-dev/` contains `.agent/` (all skills and agents), `.claude-plugin/` (plugin manifest), `.mcp.json`, and `bun.lock` — none of which move with this command. `.agent/` is the most critical: all shared skills and agents live there and must move to `src/sdd/.agent/`. An implementer following the plan literally would silently miss this and produce a broken `src/sdd/` directory.
   - **Section**: Implementation Plan → Sequencing → Step 1
   - **Doc**: "Create `src/sdd/` — `git mv spec-driven-dev/* src/sdd/`"
   - **Code**: `spec-driven-dev/` contains `.agent/`, `.claude-plugin/`, `.mcp.json`, `bun.lock` as hidden/dotfiles — all missed by `*` glob (`ls -la spec-driven-dev/`)

2. **Claude I/O wrapper introduces `jq` as an undeclared dependency** — The normative wrapper snippet for `claude/sdd/hooks/blocked-commands-hook.sh` uses `jq` (`COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')`). The current production script uses `python3` throughout for all JSON parsing. `jq` is not pre-installed on all macOS or Linux systems (e.g., not present by default on macOS without Homebrew), is not listed as a prerequisite anywhere in the ADR, and its absence causes the hook to exit non-zero on every Bash invocation, blocking all Bash tool use in the session.
   - **Section**: Component Changes → claude/sdd/ → `hooks/blocked-commands-hook.sh`
   - **Doc**: `COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')`
   - **Code**: Current `spec-driven-dev/hooks/blocked-commands-hook.sh` uses `python3` for all JSON parsing (lines 23–30, 38–46, 73–87) — no `jq` dependency

3. **Deny reason injected into JSON without escaping** — The normative wrapper snippet builds the deny JSON via shell string interpolation: `echo "{\"hookSpecificOutput\":{...\"permissionDecisionReason\":\"$REASON\"}}"`. `$REASON` is captured from the guard's stderr via `REASON=$(bash "$GUARD" "$COMMAND" 2>&1)`. If the guard's denial message contains double-quote characters, backslashes, or newlines, the emitted JSON is malformed and Claude cannot parse the hook response. The current production script handles this correctly via `python3`'s `json.dumps()` (lines 38–48 of the existing hook). The ADR's specified implementation does not.
   - **Section**: Component Changes → claude/sdd/ → `hooks/blocked-commands-hook.sh`
   - **Doc**: `echo "{\"hookSpecificOutput\":{\"hookEventName\":\"PreToolUse\",\"permissionDecision\":\"deny\",\"permissionDecisionReason\":\"$REASON\"}}"`
   - **Code**: Current `spec-driven-dev/hooks/blocked-commands-hook.sh` uses `python3 -c "import json, sys; print(json.dumps({...}))"` (lines 38–48) to safely produce the deny JSON — avoids the escaping problem entirely
