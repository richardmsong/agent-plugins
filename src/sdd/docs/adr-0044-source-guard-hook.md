# ADR: Hook-based source guard replaces --disallowedTools

**Status**: implemented
**Status history**:
- 2026-04-23: accepted
- 2026-04-23: implemented — all scope CLEAN

## Overview

Replace the `--disallowedTools` approach in `sdd-master` with a PreToolUse hook (`source-guard-hook.sh`) that blocks source file edits only for the master session. Subagents pass through because the hook input JSON includes an `agent_type` field for subagents but not for the top-level session.

## Motivation

ADR-0026 specified that `sdd-master` reads `master-config.json` and generates `--disallowedTools Edit(<glob>) Write(<glob>)` flags. This **cascades to all subagents** spawned by the master session — including dev-harness agents that need to edit source files. The result: dev-harness agents get "File is in a directory that is denied by your permission settings" on Edit/Write calls, defeating the purpose of the master/agent separation.

A hook-based guard solves this because hooks receive structured JSON on stdin that includes an `agent_type` field for subagents (e.g. `"spec-driven-dev:dev-harness"`) but omits it for the top-level session. The hook skips the guard entirely when `agent_type` is present, allowing subagents to edit source files freely. For the master session (no `agent_type`), it checks the file path against `source_dirs` patterns and blocks matches.

Note: subagents share the same `session_id` as the master — session ID alone cannot distinguish them. The `agent_type` field is the reliable discriminator.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Guard mechanism | PreToolUse hook on Edit\|Write | Hooks fire per tool call with structured JSON input, enabling caller-specific blocking without cascading to subagents |
| Subagent passthrough | Skip guard when `agent_type` field is present in hook input | Subagents share the master's `session_id` — `agent_type` (present for subagents, absent for top-level) is the reliable discriminator |
| Session tracking | `.agent/.master-sessions` file with one session ID per line | Supports multiple concurrent sdd-master sessions; simple grep-based lookup |
| Registration trigger | First Edit/Write call from a session with an empty marker file | Lazy registration — session ID is only available inside the hook via stdin JSON, not at launch time |
| Marker file lifecycle | sdd-master creates empty marker, hook writes session ID into it, EXIT trap reads marker to deregister | Clean separation: sdd-master owns create/cleanup, hook owns registration |
| Pattern matching | Python `fnmatch` on relative paths against `source_dirs` globs | Consistent with the glob patterns already in `master-config.json` |

## Impact

Supersedes the `--disallowedTools` generation logic described in ADR-0026 (section "sdd-master entrypoint", lines 227-255). The `master-config.json` format and `source_dirs` field are unchanged — only the enforcement mechanism changes.

Files changed:
- `bin/sdd-master` — removes `--disallowedTools`, adds marker file lifecycle + EXIT trap
- `hooks/source-guard-hook.sh` — new PreToolUse hook
- `hooks/hooks.json` — adds `Edit|Write` matcher entry

Conventions updated:
- `docs/conventions.md` — documents `.master-sessions` in `.agent/` directory listing

## Scope

**In scope (v1):**
- Hook-based source guard for Edit and Write tools
- Multi-session support via `.master-sessions` registry
- Marker file + EXIT trap for clean deregistration

**Deferred:**
- Hook-based guard for Bash tool (file writes via shell commands) — blocked-commands-hook.sh already covers dangerous shell commands separately
- Automatic stale session cleanup (crash without trap firing) — low risk, manual cleanup is trivial
