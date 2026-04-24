# ADR: Remove `sdd-master` CLI wrapper

**Status**: implemented
**Status history**:
- 2026-04-24: accepted
- 2026-04-24: implemented — all scope CLEAN

## Overview

Remove the `sdd-master` shell script (and all setup machinery around it) from the plugin. After ADR-0044 moved the master/subagent source-file boundary into the `source-guard-hook.sh` PreToolUse hook, the `sdd-master` wrapper stopped carrying load: the hook enforces the boundary regardless of how Claude is launched. The remaining script only probed and cached a model choice and ran `mkdir -p .agent` — neither is load-bearing for SDD.

## Motivation

`sdd-master` was introduced by ADR-0026 as the master-session entrypoint. Its original purpose was to read `master-config.json` and generate `--disallowedTools Edit(<glob>) Write(<glob>)` flags so the master could not edit source files directly.

ADR-0044 replaced the `--disallowedTools` mechanism with a PreToolUse hook that keys off the `agent_type` field in the hook input JSON (present for subagents, absent for the top-level master session). The hook fires for **any** Claude Code session, launched by any means — so the source-file guard does not depend on `sdd-master` being the entrypoint.

What `sdd-master` still did, per `src/sdd/bin/sdd-master`:
1. Probed `claude-opus-4-7[1m]` availability, falling back to plain `opus`, cached the choice at `~/.cache/sdd/master-model`.
2. `mkdir -p .agent` in the project directory.
3. `exec claude --model "$MODEL" "$@"`.

None of this is SDD-specific. Model selection is a user preference (settable via `/model`, `CLAUDE_MODEL`, or a user-defined shell alias). The `.agent/` directory is created on demand by `/setup` and by any skill that writes into it. The remaining value of the wrapper — a single opinionated Opus-1M default — does not justify the setup surface it carries (PATH management, a symlink into `~/.local/bin/`, a first-time tutorial block, a verify-table entry, a build-step copy, and per-project user education).

Removing it shrinks the setup surface and the plugin footprint without changing the master/agent separation.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Wrapper script | Deleted from `src/sdd/bin/sdd-master` and `claude/sdd/bin/sdd-master` (and the `bin/` directories removed if empty) | Script no longer carries load after ADR-0044 |
| Build step | `src/sdd/build.sh` step 11 (copy `bin/sdd-master`, chmod +x) removed; `bin/` is not created in `$OUT` | Nothing to copy once the source file is gone |
| Setup skill — Step 5 (Symlink sdd-master) | Removed entirely | No wrapper to symlink |
| Setup skill — Step 6 (first-time explanation) | Removed entirely | Nothing to explain |
| Setup skill — Step 9 verify table | Drop the `sdd-master symlink` and `sdd-master on PATH` rows | Neither check is meaningful |
| Setup skill — Algorithm listing | Renumbered to reflect removed steps (was 0–9 with sdd-master as 5/6; becomes 0–7) | Keep the SKILL readable and internally consistent |
| Launch instruction | Users run plain `claude` (no project-specific command). Those who want Opus with 1M context set it via `/model`, `CLAUDE_MODEL`, or their own alias. | Model preference is a user concern, not a plugin concern |
| Historical ADRs referencing `sdd-master` (0026, 0043, 0044, 0047, 0051, 0052) | Left unedited | Implemented ADRs are historical records; this ADR supersedes the wrapper-related portions going forward |
| `master-config.json` format | Unchanged | The file is consumed by the PreToolUse hook (via `source-guard.sh`); it has nothing to do with `sdd-master` anymore |

## Impact

Supersedes the `sdd-master` wrapper described in:
- ADR-0026 §Decisions row "Master entrypoint", §User Flow step "Run `/spec-driven-dev:setup`", §Component Changes "`sdd-master` entrypoint" (lines 227–255), §Error Handling "No `.agent/master-config.json`", §Impact "`scripts/master.sh` — simplified to call `sdd-master`", §Implementation Plan table row "`sdd-master` entrypoint".
- ADR-0043 §Repo layout — `bin/sdd-master` entry.
- ADR-0044 §Decisions rows "Session tracking" and "Marker file lifecycle", §Impact "Files changed: bin/sdd-master". (The marker-file / `.master-sessions` mechanism was never implemented — the shipped hook uses `agent_type` presence directly. This ADR records the pruning of those dormant references.)
- ADR-0047 §Component Changes — `bin/sdd-master` entries in repo layout.
- ADR-0051 §Decisions row "bin/sdd-master", §Component Changes "Copy context.md and sdd-master", §Scope bullet "Copy skills, agents, guards, context.md, sdd-master".
- ADR-0052 §Motivation, §Decisions "Teaching scope", §User Flow step "Symlink sdd-master" and "sdd-master explanation", §Component Changes algorithm entries, §Scope "sdd-master usage explanation".

Files changed in this ADR:
- `src/sdd/bin/sdd-master` — deleted.
- `claude/sdd/bin/sdd-master` — deleted (git-tracked build artifact).
- `src/sdd/bin/` — removed if empty; `claude/sdd/bin/` — removed if empty.
- `src/sdd/build.sh` — step 11 (`cp bin/sdd-master`, `chmod +x`) and its `mkdir -p "$OUT/bin"` removed; the corresponding comment block updated.
- `claude/sdd/skills/setup/SKILL.md` — Step 5 and Step 6 deleted, Step 9 verify-table rows removed, Algorithm list renumbered, subsequent steps renumbered in-place (7→5, 8→6, 9→7), first-time vs returning users no longer see the symlink or the explanation.

Out of scope:
- Retroactive edits to implemented ADRs 0026/0043/0044/0047/0051/0052. Those stand as historical records of the decisions in force at the time.
- Changes to `source-guard-hook.sh`, `master-config.json`, or any part of the master/subagent boundary — the hook already operates independently of the wrapper.
- Provisioning an Opus-1M shell alias on the user's behalf. Model selection is documented via `/model`.

## Scope

**In v1:**
- Delete `bin/sdd-master` from src and from the built plugin.
- Strip the copy step from `src/sdd/build.sh`.
- Strip sdd-master steps from the setup SKILL (algorithm, Step 5, Step 6, Step 9 verify table).

**Deferred / out of scope:**
- Rewriting prior ADRs. Historical content preserved.
- Any replacement launcher. Users run `claude` directly.

## References

- ADR-0026 — Portable Dev Workflow Plugin (introduced `sdd-master`).
- ADR-0044 — Hook-based source guard (made `sdd-master` unnecessary for the source-file boundary).
- ADR-0052 — Setup as interactive tutorial (added the first-time sdd-master explanation now being removed).
