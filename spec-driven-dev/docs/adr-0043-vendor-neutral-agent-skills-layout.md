# ADR: Vendor-neutral Agent Skills layout

**Status**: implemented
**Status history**:
- 2026-04-22: accepted
- 2026-04-23: implemented — file moves, symlinks, install.sh, setup skill rewrite committed

## Overview

Restructure the `spec-driven-dev` plugin to use `.agent/skills/*/SKILL.md` and `.agent/agents/*.md` as the canonical layout — the vendor-neutral Agent Skills standard adopted by Claude Code, Factory Droid, Codex, Copilot, Gemini CLI, Cursor, and Devin CLI. Keep a thin `.claude-plugin/` compatibility layer so Claude Code users can still use `/plugin install`, but the primary installation path becomes symlinks from the canonical source into target projects' `.agent/` directories.

## Motivation

ADR-0026 packaged the workflow as a Claude Code plugin (`skills/`, `agents/`, `.claude-plugin/plugin.json`). This works for Claude Code but locks the workflow into a single vendor:

1. **Permissions break.** After abstracting into a plugin, `${CLAUDE_PLUGIN_ROOT}` variables and plugin-scoped permissions (`mcp__plugin_spec-driven-dev_docs__*`) don't carry over when skills are invoked outside the plugin context.
2. **Vendor lock-in.** The plugin format (`skills/`, `agents/`, `.claude-plugin/`) is Claude-specific. Factory Droid, Codex, Copilot, Gemini CLI, Cursor, and Devin CLI all discover skills from `.agent/skills/*/SKILL.md` (the Agent Skills standard at agentskills.io). Packaging as a Claude plugin means these tools can't use the workflow without manual adaptation.
3. **Portability principle.** The mclaude project (ADR-0005-pluggable-cli) standardized on `.agent/skills/` as the canonical path that all tools scan natively. This repo should follow the same principle.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Canonical layout | `.agent/skills/*/SKILL.md` and `.agent/agents/*.md` | Vendor-neutral Agent Skills standard. All 7+ tools scan this path. |
| Plugin compat | Keep `.claude-plugin/plugin.json` + symlinks `skills/` → `.agent/skills/`, `agents/` → `.agent/agents/` | Claude Code users can still `/plugin install`. Plugin discovers skills via symlinks to the canonical location. |
| Installation for non-plugin users | Standalone `install.sh` script that symlinks skill/agent dirs into target project | No vendor dependency. Works for any tool that scans `.agent/skills/`. |
| Setup skill | Rewritten to use absolute paths instead of `${CLAUDE_PLUGIN_ROOT}` | Plugin root variables are Claude-specific. Setup reads its own location to resolve paths. |
| MCP server | Configured per-project via `.mcp.json`, path resolved at install time | MCP is Claude-specific but has no vendor-neutral alternative. Per-project config is the cleanest approach. |
| Hook | Stays in `hooks/` at plugin root | Hooks are Claude-specific (no cross-tool standard yet per ADR-0005). Plugin compat layer owns this. |

## Impact

### File moves

| From | To |
|------|-----|
| `skills/setup/SKILL.md` | `.agent/skills/setup/SKILL.md` |
| `skills/plan-feature/SKILL.md` | `.agent/skills/plan-feature/SKILL.md` |
| `skills/feature-change/SKILL.md` | `.agent/skills/feature-change/SKILL.md` |
| `skills/design-audit/SKILL.md` | `.agent/skills/design-audit/SKILL.md` |
| `skills/spec-evaluator/SKILL.md` | `.agent/skills/spec-evaluator/SKILL.md` |
| `skills/file-bug/SKILL.md` | `.agent/skills/file-bug/SKILL.md` |
| `skills/dashboard/SKILL.md` | `.agent/skills/dashboard/SKILL.md` |
| `agents/design-evaluator.md` | `.agent/agents/design-evaluator.md` |
| `agents/dev-harness.md` | `.agent/agents/dev-harness.md` |
| `agents/spec-evaluator.md` | `.agent/agents/spec-evaluator.md` |

### New files

| File | Purpose |
|------|---------|
| `skills/` (symlink → `.agent/skills/`) | Plugin compat — Claude Code discovers skills here |
| `agents/` (symlink → `.agent/agents/`) | Plugin compat — Claude Code discovers agents here |
| `install.sh` | Standalone installer for non-plugin users. Symlinks skills, agents, and configures MCP. |

### Modified files

| File | Change |
|------|--------|
| `.agent/skills/setup/SKILL.md` | Replace `${CLAUDE_PLUGIN_ROOT}` with self-resolving path logic. Add install.sh invocation as alternative to plugin setup. |

## Repo layout (after)

```
spec-driven-dev/
├── .agent/
│   ├── skills/                        # CANONICAL — vendor-neutral
│   │   ├── setup/SKILL.md
│   │   ├── plan-feature/SKILL.md
│   │   ├── feature-change/SKILL.md
│   │   ├── design-audit/SKILL.md
│   │   ├── spec-evaluator/SKILL.md
│   │   ├── file-bug/SKILL.md
│   │   └── dashboard/SKILL.md
│   ├── agents/                        # CANONICAL — vendor-neutral
│   │   ├── design-evaluator.md
│   │   ├── dev-harness.md
│   │   └── spec-evaluator.md
│   └── master-config.json
├── .claude-plugin/                    # COMPAT — Claude Code only
│   └── plugin.json
├── skills -> .agent/skills            # symlink for plugin compat
├── agents -> .agent/agents            # symlink for plugin compat
├── .mcp.json
├── hooks/
│   ├── hooks.json
│   └── blocked-commands-hook.sh
├── bin/
│   ├── docs-mcp
│   └── sdd-master
├── install.sh                         # standalone installer
├── docs-mcp/
├── docs-dashboard/
└── docs/
```

## install.sh contract

```bash
#!/usr/bin/env bash
# Usage: /path/to/spec-driven-dev/install.sh [target-project-dir]
# Symlinks skills, agents, and sets up MCP config in the target project.
#
# What it does:
# 1. Resolves SDD_ROOT (directory containing this script)
# 2. For each skill in SDD_ROOT/.agent/skills/*, creates:
#    <target>/.agent/skills/<name> → SDD_ROOT/.agent/skills/<name>
# 3. For each agent in SDD_ROOT/.agent/agents/*, creates:
#    <target>/.agent/agents/<name> → SDD_ROOT/.agent/agents/<name>
# 4. Compiles docs-mcp binary if not present (requires bun)
# 5. Writes/merges .mcp.json with docs MCP server config
# 6. Creates .agent/blocked-commands.json and .agent/master-config.json (if absent)
# 7. Scaffolds CLAUDE.md (if absent)
```

## Known limitation: plugin MCP permissions

When installed via `/plugin install`, Claude Code scopes MCP permissions under `mcp__plugin_<plugin-name>_<server>__*` (e.g. `mcp__plugin_spec-driven-dev_docs__*`). When installed via `install.sh` / symlinks, the MCP server is configured per-project in `.mcp.json` and permissions are `mcp__docs__*`.

These are different permission namespaces. A project using the plugin route needs the plugin-scoped permission; a project using the symlink route needs the standalone permission. The setup skill / `install.sh` configures the correct one based on the installation method, but users switching between methods need to update their `.claude/settings.json`.

**Recommendation:** Prefer the symlink installation (`install.sh`). The plugin route works but the permission scoping creates friction — MCP tools may prompt for permission unexpectedly if the wrong namespace is configured.

## Scope

**In:** Move skills/agents to `.agent/`, create symlinks for plugin compat, write `install.sh`, update setup skill.
**Deferred:** Removing the plugin.json entirely (keep compat). Multi-tool hook standardization (no cross-tool standard yet).
