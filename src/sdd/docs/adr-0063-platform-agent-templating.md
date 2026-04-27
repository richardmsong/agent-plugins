# ADR: Platform-Specific Agent Frontmatter Templating

**Status**: implemented
**Status history**:
- 2026-04-27: draft
- 2026-04-27: accepted — paired with spec-agents.md
- 2026-04-27: implemented — all scope CLEAN (validation requires session restart)

## Overview

Replace the shared-symlink model for agent definitions with a build-time templating system. The canonical agent skill body lives in `src/sdd/.agent/agents/` (Claude Code frontmatter). Each platform package (`droid/sdd/`, `devin/sdd/`, `gemini/sdd/`) provides a frontmatter template directory (`.agent-templates/`) containing per-agent YAML frontmatter overrides. The build step strips Claude frontmatter from the canonical source, applies the platform's template, and writes real agent files to the platform's output directory.

## Motivation

**The root cause:** Droid's `Task` tool spawns subagents from `.factory/droids/` by reading Markdown files with Droid-native YAML frontmatter. The current `droid/sdd/agents/` is a symlink to `src/sdd/.agent/agents/`, which uses Claude Code frontmatter (`tools: "*"`, `maxTurns: 500`, `run_in_background: true`). Droid does not understand these fields — it falls back to a minimal toolset (only `TodoWrite` + `Skill`), making all 4 SDD agents non-functional on Droid.

**Empirically validated 2026-04-27:**
- `dev-harness` spawned via Task on Droid: Read=FAIL, Grep=FAIL, Execute=FAIL, LS=FAIL
- `worker` (Droid-native frontmatter in `~/.factory/droids/`): Read=PASS, Grep=PASS, Execute=PASS, LS=PASS

**Why not just edit the canonical files?** Each platform has a different frontmatter schema:
- **Claude Code**: `tools: "*"` (string), `maxTurns`, `run_in_background`, `model: claude-sonnet-4-6`
- **Droid**: omit `tools` for all tools (or array of tool IDs), no `maxTurns`/`run_in_background`, `model: inherit`
- **Devin**: `allowed-tools` array, no `maxTurns`, `model: sonnet` (short names)

A single file cannot satisfy all schemas. The build step already exists (`src/sdd/build.sh`) and already copies agents to `claude/sdd/agents/`. Extending it with a templating step for other platforms is the natural solution.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Template location | `<platform>/sdd/.agent-templates/<agent>.yaml` | Dotfile in the platform package dir. Keeps platform-specific config co-located with the platform package. |
| Template format | Complete YAML frontmatter for the target platform (all required fields: `name`, `description`, `model`, `tools` if applicable) | Each template is self-contained — the build step wraps it in `---` markers and appends the skill body. `name` and `description` are duplicated from canonical because Droid requires them in its own schema. |
| Canonical source | `src/sdd/.agent/agents/` retains Claude Code frontmatter | Claude Code is the primary platform. Canonical source = Claude source of truth. No change needed. |
| Build output for Droid | `droid/sdd/droids/<agent>.md` | Droid discovers agents from `droids/` directories. CI commits the output (same pattern as `claude/sdd/`). |
| Build output for Claude | `claude/sdd/agents/<agent>.md` (existing step 8) | No change — already copies from canonical source. |
| Skill body extraction | Strip everything between first `---` and second `---` from canonical, keep the rest | The body is everything after the closing `---` of the YAML frontmatter. Platform-agnostic. |
| Missing template handling | Error — build fails if any canonical agent lacks a template | Every agent must be available on every platform that has an `.agent-templates/` dir. Missing template = build failure, not silent degradation. |
| `.factory/droids/` symlink | Points to `droid/sdd/droids/` (build output) instead of `src/sdd/.agent/agents/` | Local dev Droid discovery reads Droid-native definitions. |
| CI workflow | Extend `build-plugin.yml` to also `git add droid/sdd/droids/` | Same auto-commit pattern as `claude/sdd/`. |
| Remove `run_in_background` | Delete from all 4 canonical agent defs in `src/sdd/.agent/agents/` | Undocumented Claude Code field, no known effect. Keeps canonical frontmatter clean. |

## Component Changes

### Build system (`src/sdd/build.sh`)

New step after existing step 8 (Copy agents):
1. For each platform with an `.agent-templates/` directory:
   a. Clear the output directory (`rm -rf <platform>/sdd/droids/ && mkdir -p <platform>/sdd/droids/`) to remove stale files from renamed/removed agents
   b. For each canonical agent in `src/sdd/.agent/agents/*.md`:
      - Read the canonical file
      - Strip the YAML frontmatter (everything between the opening and closing `---`)
      - Read the platform template from `<platform>/sdd/.agent-templates/<name>.yaml` (error if missing)
      - Write: `---\n<template content>\n---\n<skill body>` to `<platform>/sdd/droids/<name>.md`
2. Validate: each output file must have non-empty frontmatter and non-empty body

### Droid platform package (`droid/sdd/`)

- Remove `agents` symlink (currently points to `src/sdd/.agent/agents/`)
- Add `.agent-templates/` directory with 4 YAML files
- Add `droids/` directory (build output, committed by CI)

### Local dev (`.factory/droids/`)

- Symlink changes from `src/sdd/.agent/agents/` to `droid/sdd/droids/`

### Spec (`docs/spec-agents.md`)

- Update "File Location" section: `droid/sdd/droids/` is build output, not a symlink
- Update "Frontmatter Contract" section: document that this is the Claude Code contract; other platforms have their own
- Add "Per-Platform Frontmatter" section documenting the template system
- Remove `run_in_background` from the contract table (Claude Code docs don't document this field)

### Local setup (`src/sdd/.agent/skills/local-setup/SKILL.md`)

- Update `.factory/droids/` symlink target from `src/sdd/.agent/agents/` to `droid/sdd/droids/`

### CI (`.github/workflows/build-plugin.yml`)

- Add `droid/sdd/.agent-templates/**` to `on.push.paths` and `on.pull_request.paths` triggers
- Add `droid/sdd/droids/` to the `git add` step

## Data Model

No new data model. Template files are static YAML.

## Error Handling

| Failure | Behavior |
|---------|----------|
| Template file missing for an agent | Build fails with error: "Missing template for <agent> on <platform>". Every canonical agent must have a template. |
| Template file has invalid YAML | Build fails with error message identifying the file. |
| Canonical agent file missing | Build fails (existing behavior for step 8). |
| Body extraction produces empty body | Build fails: "Agent <name> has no body after frontmatter stripping." |

## Security

No security implications. Template files contain only metadata (model name, tool lists). No secrets.

## Impact

- Updates `spec-agents.md` — per-platform frontmatter, template system
- Updates `src/sdd/build.sh` — templating step
- Updates `droid/sdd/` — removes symlink, adds templates + build output
- Updates `.factory/droids/` symlink target
- Updates `.github/workflows/build-plugin.yml` — adds droid output to commit
- Resolves P0 Droid exec-mode bug from ADR-0057 blocking issue #1

## Scope

### In v1
- `.agent-templates/` directory in `droid/sdd/` with 4 template files
- Build step in `build.sh` for templating
- `droid/sdd/droids/` output directory
- Updated `.factory/droids/` symlink
- Updated CI workflow
- Updated `spec-agents.md`
- Remove `run_in_background: true` from all 4 canonical agent defs

### Deferred
- Devin agent templates (`devin/sdd/.agent-templates/`) — ADR-0060 covers Devin separately
- Gemini agent templates — ADR-0061 covers Gemini separately
- Automated validation that template tool names are valid for the target platform
- Template inheritance / shared base templates across platforms

## Open questions

(none — all resolved)

## Resolved questions

- **Missing template → error or skip?** Error. Every agent must be templated for every platform with a `.agent-templates/` dir.
- **Remove `run_in_background` from canonical?** Yes. Undocumented field in Claude Code, no known effect. Remove from all 4 canonical agent defs to keep frontmatter clean.

## Implementation Plan

| Component | New/changed lines (est.) | Dev-harness tokens (est.) | Notes |
|-----------|--------------------------|---------------------------|-------|
| `.agent-templates/` (4 YAML files) | ~40 | ~30k | Simple YAML, 10 lines each |
| `build.sh` templating step | ~40 | ~50k | Shell scripting, awk for frontmatter strip |
| `droid/ssd/droids/` (build output) | ~670 (generated) | 0 | CI-generated, not hand-authored |
| `spec-agents.md` update | ~40 | ~30k | Doc edits |
| CI workflow update | ~2 | ~10k | One line addition |
| `.factory/droids/` symlink | ~1 | ~10k | Symlink change |

**Total estimated tokens:** ~130k
**Estimated wall-clock:** 1h
