# Spec: Agent Definitions

Living reference for the subagent/droid definitions in `src/sdd/.agent/agents/`. These agents are invoked by the master session during the `/feature-change` workflow.

## Agent Inventory

| Agent | Purpose | Model | Tools (Claude Code) |
|-------|---------|-------|---------------------|
| `dev-harness` | Implements and tests a component against its spec. Invoked repeatedly until all gaps are closed. | `claude-sonnet-4-6` | `*` (all) |
| `implementation-evaluator` | Fresh-context compliance audit. Reads specs + code, reports every gap where spec says X but code doesn't implement X. | `claude-sonnet-4-6` | `Read, Glob, Grep, Write, Bash, Agent` |
| `spec-evaluator` | Fresh-context spec alignment audit. Reads an ADR and all referenced specs, reports gaps where the ADR decides X but the spec doesn't reflect X. | `claude-sonnet-4-6` | `Read, Glob, Grep, Write, Bash` |
| `design-evaluator` | Fresh-context design document evaluator. Reports ambiguities and blocking gaps in a design doc. | `claude-sonnet-4-6` | `Read, Glob, Grep, Write, Bash, Agent` |

## Model Configuration

All agents are pinned to `claude-sonnet-4-6`. This is a deliberate cost decision: the master session runs Opus for orchestration, while subagents run Sonnet for implementation and evaluation work.

### Cross-platform model configuration

Each platform's frontmatter template specifies the model independently:

- **Claude Code (canonical)**: `model: claude-sonnet-4-6` — full model identifier. Pinned to Sonnet for cost control.
- **Droid**: `model: inherit` — uses the parent session's model. Droid sessions run the model configured by the user.

When updating the Claude Code model version (e.g. to `claude-sonnet-4-7`), update all four canonical definitions in `src/sdd/.agent/agents/`. Droid templates use `inherit` and don't need updating.

## File Location

Canonical agent definitions live at `src/sdd/.agent/agents/<name>.md` with Claude Code frontmatter. Each platform package produces its own agent definitions via a build-time templating step (ADR-0063):

| Path | Type | Platform |
|------|------|----------|
| `src/sdd/.agent/agents/` | Canonical source (Claude Code frontmatter + skill body) | Source of truth |
| `.agent/agents/` | Symlink to canonical | Claude Code local dev |
| `claude/sdd/agents/` | Build output (copy of canonical) | Claude Code plugin |
| `droid/sdd/droids/` | Build output (Droid frontmatter + skill body) | Droid plugin |
| `.factory/droids/` | Symlink to `droid/sdd/droids/` | Droid local dev |

The skill body (everything after the YAML frontmatter) is shared across all platforms. Only the frontmatter differs. Edits to the skill body in canonical source propagate to all platforms on the next build.

## Frontmatter Templates

Each platform package contains a `.agent-templates/` directory with per-agent YAML files defining that platform's frontmatter. The build step (`src/sdd/build.sh`) strips the canonical frontmatter, applies the platform template, and writes the output.

Template files: `<platform>/sdd/.agent-templates/<agent-name>.yaml`

Every canonical agent must have a template in every platform that has a `.agent-templates/` directory. Missing template = build failure.

## Frontmatter Contract (Claude Code — canonical)

The canonical agent definitions use Claude Code YAML frontmatter:

| Field | Required | Description |
|-------|----------|-------------|
| `name` | yes | Identifier used in `Agent(subagent_type="<name>")` invocations |
| `description` | yes | When the master session should delegate to this agent |
| `model` | yes | Full model identifier (see Cross-platform requirement above) |
| `tools` | yes | Tool access: `"*"` for all, or comma-separated list |
| `maxTurns` | no | Maximum agentic turns. Set on dev-harness (500) to allow long implementation runs |

## Frontmatter Contract (Droid)

Droid agent definitions use Factory/Droid YAML frontmatter (per `docs.factory.ai/cli/configuration/custom-droids`):

| Field | Required | Description |
|-------|----------|-------------|
| `name` | yes | Lowercase letters, digits, `-`, `_`. Drives the `subagent_type` value. |
| `description` | yes | Shown in UI list. Keep ≤500 chars. |
| `model` | yes | `inherit` (use parent session model) or a model identifier. |
| `tools` | no | Omit for all tools, or array of tool IDs like `["Read", "Edit", "Execute"]`. |

Droid tool names differ from Claude Code: `Execute` (not `Bash`), `Create`/`Edit` (not `Write`), `Task` (not `Agent`).

## Invocation

Agents are invoked by the master session's `/feature-change` skill:

1. **dev-harness** -- Step 6: implementation loop. Re-invoked until all gaps closed.
2. **implementation-evaluator** -- Step 6: verification after each dev-harness pass.
3. **spec-evaluator** -- Step 4b: spec-edit verification loop before committing.
4. **design-evaluator** -- `/design-audit` skill: multi-round ambiguity audit.

All agents run in fresh context (no conversation history inherited). They read specs and ADRs from disk.
