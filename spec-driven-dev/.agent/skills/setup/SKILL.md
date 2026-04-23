---
name: setup
description: One-time setup for the spec-driven-dev workflow. Compiles the docs-mcp binary, symlinks skills and agents into the target project, and initializes per-project config files. Safe to re-run.
version: 2.0.0
user_invocable: true
---

# Setup

One-time setup for the `spec-driven-dev` workflow. Compiles the docs-mcp binary, symlinks skills and agents into the target project's `.agent/` directory, symlinks `sdd-master` for CLI convenience, and initializes per-project config files.

Safe to re-run — all steps are idempotent.

## Usage

```
/setup
```

Or via the standalone installer (no Claude Code required):
```bash
/path/to/spec-driven-dev/install.sh [target-project-dir]
```

---

## Prerequisites

```bash
which bun    # install: curl -fsSL https://bun.sh/install | bash
```

---

## Resolving SDD_ROOT

The skill must resolve the absolute path to the `spec-driven-dev` directory (where this SKILL.md lives). This is the source of truth for all paths.

**Resolution order:**
1. If `${CLAUDE_PLUGIN_ROOT}` is set (running as a Claude plugin): use it.
2. Otherwise: this SKILL.md lives at `<SDD_ROOT>/.agent/skills/setup/SKILL.md`. Walk up 4 levels from this file to get `SDD_ROOT`. In practice, the agent knows which repo it's working in — use the absolute path to the `spec-driven-dev/` directory.

Store the resolved path as `SDD_ROOT` for use in all subsequent steps.

---

## Algorithm

```
1. Resolve SDD_ROOT
2. Compile docs-mcp binary
3. Symlink skills and agents into target project
4. Symlink sdd-master to ~/.local/bin/
5. Configure MCP server
6. Initialize per-project config files (if absent)
7. Scaffold CLAUDE.md (if absent)
8. Bootstrap default permissions in .claude/settings.json
9. Verify
```

---

## Step 1 — Compile docs-mcp binary

```bash
cd "${SDD_ROOT}/docs-mcp" && bun install && bun run build
```

This produces `${SDD_ROOT}/bin/docs-mcp` — the compiled binary that the MCP config references. Always recompile (picks up source updates).

If `bun` is not installed, stop and tell the user:
```
bun is required to compile the docs-mcp binary.
Install: curl -fsSL https://bun.sh/install | bash
```

---

## Step 2 — Symlink skills and agents

Create symlinks from the canonical source into the target project's `.agent/` directory. Target project is `$CLAUDE_PROJECT_DIR` if set, otherwise the current working directory.

```bash
TARGET="${CLAUDE_PROJECT_DIR:-.}"

# Skills
mkdir -p "${TARGET}/.agent/skills"
for skill_dir in "${SDD_ROOT}/.agent/skills"/*/; do
  name=$(basename "$skill_dir")
  ln -sfn "${skill_dir}" "${TARGET}/.agent/skills/${name}"
done

# Agents
mkdir -p "${TARGET}/.agent/agents"
for agent_file in "${SDD_ROOT}/.agent/agents"/*.md; do
  name=$(basename "$agent_file")
  ln -sfn "${agent_file}" "${TARGET}/.agent/agents/${name}"
done
```

If the target IS the SDD_ROOT itself (i.e. running setup within the spec-driven-dev repo), skip symlinking — skills and agents are already in place.

Print the count: `"Symlinked N skills and M agents into .agent/"`

---

## Step 3 — Symlink sdd-master

```bash
mkdir -p ~/.local/bin
ln -sf "${SDD_ROOT}/bin/sdd-master" ~/.local/bin/sdd-master
```

Check if `~/.local/bin` is on PATH:
```bash
echo "$PATH" | tr ':' '\n' | grep -q "$HOME/.local/bin"
```

If not on PATH, warn the user:
```
~/.local/bin is not on your PATH. Add this to your shell profile:

  export PATH="$HOME/.local/bin:$PATH"

The sdd-master CLI shortcut won't work until PATH is updated.
```

---

## Step 4 — Configure MCP server

If the target project does not already have a docs MCP entry in `.mcp.json`, add one:

```json
{
  "mcpServers": {
    "docs": {
      "command": "<SDD_ROOT>/bin/docs-mcp",
      "args": ["--root", "<TARGET>"]
    }
  }
}
```

Replace `<SDD_ROOT>` and `<TARGET>` with the resolved absolute paths. If `.mcp.json` already exists, merge the `docs` key into the existing `mcpServers` object. Do not overwrite other MCP server entries.

If running as a Claude plugin and `.mcp.json` is already provided by the plugin, skip this step.

---

## Step 5 — Initialize per-project config files

These files are created in the target project directory. Each is **skipped if already present** to preserve user customizations.

### .agent/blocked-commands.json

If `${TARGET}/.agent/blocked-commands.json` does not exist, create it with default ban rules:

```json
{
  "rules": [
    {
      "pattern": "gh\\s+run\\s+watch",
      "message": "Blocks until timeout. Use 'gh run view {id}' to poll.",
      "category": "ban"
    },
    {
      "pattern": "git\\s+apply",
      "message": "Bypasses the spec→dev-harness→evaluator loop. Use /feature-change.",
      "category": "ban"
    }
  ]
}
```

If the file already exists, print: `".agent/blocked-commands.json already exists — skipping (preserving customizations)"`

### .agent/master-config.json

If `${TARGET}/.agent/master-config.json` does not exist, create it with `**/src/**` as the default source dir:

```json
{
  "source_dirs": ["**/src/**"]
}
```

This prevents the master session from editing source files directly — all code changes go through dev-harness agents. The user can add more patterns if needed (e.g. `**/lib/**`).

If the file already exists, print: `".agent/master-config.json already exists — skipping"`

---

## Step 6 — Update CLAUDE.md

Inject or update the SDD workflow rules in `${TARGET}/CLAUDE.md` using marker-delimited content. The SDD section is wrapped in `<!-- sdd:begin -->` / `<!-- sdd:end -->` HTML comments.

**Upsert logic:**
- **No CLAUDE.md**: Create it with the SDD marker block.
- **CLAUDE.md exists, no markers**: Prepend the SDD marker block above existing content (preserving everything the user wrote).
- **CLAUDE.md exists, has markers**: Replace everything between `<!-- sdd:begin -->` and `<!-- sdd:end -->` (inclusive) with the latest SDD content. Content outside the markers is preserved.

The SDD content between markers:

```markdown
<!-- sdd:begin -->
# Project Rules

## Change detected → invoke /feature-change immediately

When the user asks for **any change** — feature, bug fix, refactor, config, UI tweak, backend change — invoke `/feature-change` as your **first action**. Do not analyze the code first. Do not start implementing. Do not explore the codebase. Invoke the skill and let it handle discovery, classification, and implementation.

**Never write implementation code directly.** The master session authors ADRs, updates specs, and orchestrates agents. All code changes go through dev-harness subagents invoked by `/feature-change`.

Heuristic: if the user says "fix", "change", "update", "refactor", "remove", "add X to Y", "make X do Y", or describes any modification to how the system behaves → that's `/feature-change`. Don't ask permission; invoke the skill immediately.

The loop: `/feature-change` reads specs → classifies → authors ADR → updates spec if needed → commits spec → calls dev-harness → implements and tests.

## New feature detected → invoke /plan-feature immediately

When the user describes anything that looks like a potential **new feature**, jump straight into `/plan-feature` — don't wait for the full picture, don't rely on keeping it in memory.

Planning context is lost when you get compacted or switched out. The ADR on disk is the durable form. Start `/plan-feature` on the first mention, even mid-conversation, even if there are still open questions — drafts are first-class and can be paused, committed, and resumed.

Heuristic: if the user says something like "maybe we should…", "what if…", "could we add…", "I want to…", or describes a capability the app doesn't have yet → that's `/plan-feature`. Don't ask permission; just start the skill and let the Q&A surface the rest.

## Never edit source files directly

The master session authors ADRs, updates specs, and orchestrates agents. It does **not** write production code, tests, config, or templates. All source file changes go through dev-harness subagents invoked by `/feature-change`.

If tests fail, code is missing, or implementation is wrong — invoke dev-harness, don't fix it yourself. If agents are failing (permissions, context limits), fix the agent infrastructure, not the source code.

## Parallelism — use subagents for independent work

When requests can be parallelized, use subagents extensively rather than handling them sequentially.

Launch multiple agents in a single message when their work is independent. Don't serialize tasks that can overlap.
<!-- sdd:end -->
```

After updating, print:
- If created: `"CLAUDE.md created with SDD workflow rules — add project-specific content after the sdd:end marker"`
- If updated: `"CLAUDE.md updated — SDD workflow rules refreshed, project-specific content preserved"`
- If prepended: `"CLAUDE.md updated — SDD workflow rules prepended, existing content preserved after sdd:end marker"`

---

## Step 7 — Bootstrap default permissions

Read or create `${TARGET}/.claude/settings.json`. Merge the following `allow` entries into the existing array (do not duplicate entries that already exist):

```json
{
  "permissions": {
    "allow": [
      "Bash",
      "Edit",
      "Write",
      "Update",
      "mcp__docs__*"
    ]
  }
}
```

These permissions are required for:
- **Bash/Edit/Write/Update**: dev-harness and spec-evaluator subagents run without supervision and cannot prompt for permission
- **docs MCP tools**: all doc operations should be auto-approved

Note: the MCP permission is `mcp__docs__*` (not `mcp__plugin_spec-driven-dev_docs__*`) because the MCP server is configured per-project, not scoped to a plugin.

If `.claude/settings.json` already exists with an `allow` array, merge only entries that are not already present. Do not remove existing entries.

Print: `"Default permissions configured in .claude/settings.json"`

---

## Step 8 — Verify

Run these checks and report results:

| Check | Command | Pass |
|-------|---------|------|
| docs-mcp binary exists | `test -x "${SDD_ROOT}/bin/docs-mcp"` | Binary compiled |
| sdd-master symlink | `test -L ~/.local/bin/sdd-master` | Symlink in place |
| sdd-master on PATH | `which sdd-master` | Callable from CLI |
| skills symlinked | `ls ${TARGET}/.agent/skills/*/SKILL.md \| wc -l` | Skills present |
| agents symlinked | `ls ${TARGET}/.agent/agents/*.md \| wc -l` | Agents present |
| blocked-commands config | `test -f ${TARGET}/.agent/blocked-commands.json` | Config present |
| master config | `test -f ${TARGET}/.agent/master-config.json` | Config present |
| CLAUDE.md | `test -f ${TARGET}/CLAUDE.md` | Workflow rules present (with markers) |
| permissions | `test -f ${TARGET}/.claude/settings.json` | Default permissions configured |
| MCP config | `grep -q docs ${TARGET}/.mcp.json 2>/dev/null` | Docs MCP configured |

Report pass/fail for each. Any failure is non-fatal — the workflow still works for skills; only the failed capability is degraded.
