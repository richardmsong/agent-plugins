# ADR: Gemini CLI Platform Package

**Status**: accepted
**Status history**:
- 2026-04-26: draft
- 2026-04-26: accepted — paired with spec-agents.md

## Overview
Add Gemini CLI (Google's terminal-based agent) as a first-class platform in the `agent-plugins` monorepo. This creates `gemini/sdd/` — a platform package containing Gemini-specific metadata, a setup skill, hook wrappers (if supported), and symlinks to the shared canonical source in `src/sdd/`.

## Motivation
The `agent-plugins` repository is designed to be agent-neutral (ADR-0047). We already support Claude Code and Droid. Gemini CLI is a powerful agent that supports similar primitives: skills (`SKILL.md`), subagents (Markdown definitions), and workspace-level context. Adding Gemini support allows users of Gemini CLI to leverage the Spec-Driven Development (SDD) workflow.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Directory location | `gemini/sdd/` | Follows the `<platform>/sdd/` convention. |
| Extension Manifest | `gemini/sdd/gemini-extension.json` | Required by Gemini CLI to recognize the directory as an extension. |
| Shared Skills | Symlinks to `src/sdd/.agent/skills/` | Standard SDD pattern for sharing agent-neutral skills. |
| Shared Agents | Symlinks to `src/sdd/.agent/agents/` | Standard SDD pattern for sharing agent definitions. |
| Setup Skill | `gemini/sdd/skills/setup/SKILL.md` | Platform-specific setup to scaffold `GEMINI.md` and configure workspace policies. |
| Hooks | `BeforeTool` in `hooks/hooks.json` | Gemini CLI support for tool interception is confirmed via the `BeforeTool` hook. |
| Path Variables | `${extensionPath}` and `${workspacePath}` | Gemini CLI provides native variables for both the extension root and the active workspace. |

## User Flow
1. User installs the Gemini CLI extension (e.g., via `gemini extensions link ./gemini/sdd`).
2. User runs `/setup` in a target project.
3. Setup scaffolds `GEMINI.md` (injecting `src/sdd/context.md`) and configures workspace policies in `spec-driven-config.json`.
4. User invokes `/feature-change` to start the SDD loop.

## Component Changes

### `gemini/sdd/` (NEW)
The platform package directory.
- `gemini-extension.json`: Extension metadata.
- `skills/`: Directory containing symlinks to shared skills and a real `setup/SKILL.md`.
- `agents/`: Symlink to `src/sdd/.agent/agents/`.
- `hooks/hooks.json`: Registers `BeforeTool` hooks using `${extensionPath}`.
- `hooks/blocked-commands-hook.sh`: Gemini-specific wrapper. Parses `stdin` for `tool_name` and `tool_input.command`, delegates to `src/sdd/hooks/guards/blocked-commands.sh`, returns `{"decision": "deny", "reason": "..."}`.
- `hooks/source-guard-hook.sh`: Gemini-specific wrapper. Parses `stdin` for `tool_input.file_path`, delegates to `src/sdd/hooks/guards/source-guard.sh`.

### `src/sdd/`
- No changes required to canonical logic.

## Data Model
- No new data models. Uses existing `spec-driven-config.json`.

## Error Handling
- Hooks return JSON with `{"decision": "deny", "reason": "..."}` to stdout or exit with code 2. `GEMINI_PROJECT_DIR` (and its alias `CLAUDE_PROJECT_DIR`) are used for config lookup.

## Security
- `BeforeTool` hooks enforce command blocklists and source file write protection.
- `GEMINI.md` provides persistent instructions for the SDD workflow rules.

## Impact
- Adds `gemini` to the list of supported platforms.
- Updates documentation to include Gemini installation instructions.

## Scope
### In v1
- `gemini/sdd/` structure and symlinks.
- `gemini-extension.json` manifest.
- Gemini-specific `/setup` skill.
- `GEMINI.md` context injection.
- `BeforeTool` hook wrappers using `jq` (available on macOS/Linux where Gemini CLI runs).

### Deferred
- Custom slash commands (if needed).

## Open questions

(All resolved)

## Implementation Plan

| Component | New/changed lines (est.) | Dev-harness tokens (est.) | Notes |
|-----------|--------------------------|---------------------------|-------|
| `gemini/sdd/` structure | ~10 | ~30k | Symlinks and manifest. |
| Gemini setup skill | ~150 | ~60k | Scaffolding GEMINI.md and policies. |
| Hook wrappers | ~120 | ~50k | `BeforeTool` wrappers with JSON parsing. |
| Marketplace descriptor | ~20 | ~20k | `.gemini-plugin/marketplace.json` (if applicable). |

**Total estimated tokens:** 160k
**Estimated wall-clock:** 2.5h
