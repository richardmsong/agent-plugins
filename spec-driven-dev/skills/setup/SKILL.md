---
name: setup
description: One-time setup for the spec-driven-dev plugin. Compiles the docs-mcp binary, symlinks sdd-master, and initializes per-project config files. Safe to re-run.
version: 1.0.0
user_invocable: true
---

# Setup

One-time setup for the `spec-driven-dev` plugin. Compiles the docs-mcp binary, symlinks `sdd-master` for CLI convenience, and initializes per-project config files.

Safe to re-run — all steps are idempotent.

## Usage

```
/spec-driven-dev:setup
```

---

## Prerequisites

```bash
which bun    # install: curl -fsSL https://bun.sh/install | bash
which claude # install: npm install -g @anthropic-ai/claude-code
```

---

## Algorithm

```
1. Compile docs-mcp binary
2. Symlink sdd-master to ~/.local/bin/
3. Initialize per-project config files (if absent)
4. Scaffold CLAUDE.md (if absent)
5. Bootstrap default permissions in .claude/settings.json
6. Verify
```

---

## Step 1 — Compile docs-mcp binary

```bash
cd "${CLAUDE_PLUGIN_ROOT}/docs-mcp" && bun install && bun run build
```

This produces `${CLAUDE_PLUGIN_ROOT}/bin/docs-mcp` — the compiled binary that the plugin's `.mcp.json` references. Always recompile (picks up source updates from plugin).

If `bun` is not installed, stop and tell the user:
```
bun is required to compile the docs-mcp binary.
Install: curl -fsSL https://bun.sh/install | bash
```

---

## Step 2 — Symlink sdd-master

```bash
mkdir -p ~/.local/bin
ln -sf "${CLAUDE_PLUGIN_ROOT}/bin/sdd-master" ~/.local/bin/sdd-master
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
The hook and MCP server are unaffected (they use ${CLAUDE_PLUGIN_ROOT} paths).
```

---

## Step 3 — Initialize per-project config files

These files are created in the current project directory. Each is **skipped if already present** to preserve user customizations.

### .agent/blocked-commands.json

If `$CLAUDE_PROJECT_DIR/.agent/blocked-commands.json` does not exist, create it with default ban rules:

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

If `$CLAUDE_PROJECT_DIR/.agent/master-config.json` does not exist, create it with empty source dirs:

```json
{
  "source_dirs": []
}
```

Tell the user: `"Edit .agent/master-config.json to list source directories that only agents can modify (e.g. 'src/**/*.ts')."`

If the file already exists, print: `".agent/master-config.json already exists — skipping"`

---

## Step 4 — Scaffold CLAUDE.md

If `$CLAUDE_PROJECT_DIR/CLAUDE.md` does not exist, create it with the core SDD workflow rules:

```markdown
# Project Rules

## All changes — /feature-change first

**Never write implementation code directly for any app change.**
Every change — feature, bug fix, refactor, config, UI tweak, backend change — goes through `/feature-change` first.

The loop: `/feature-change` checks the spec → updates spec if needed → commits spec → calls dev-harness → implements and tests.

For bug fixes where the spec is already correct, `/feature-change` skips the spec update and goes straight to dev-harness.

## New feature detected → invoke /plan-feature immediately

When the user describes anything that looks like a potential new feature, jump straight into `/plan-feature` — don't wait for the full picture, don't rely on keeping it in memory.

Planning context is lost when you get compacted or switched out. The ADR on disk is the durable form. Start `/plan-feature` on the first mention, even mid-conversation, even if there are still open questions — drafts are first-class and can be paused, committed, and resumed.

Heuristic: if the user says something like "maybe we should…", "what if…", "could we add…", "I want to…", or describes a capability the app doesn't have yet → that's `/plan-feature`. Don't ask permission; just start the skill and let the Q&A surface the rest.

## Never edit source files directly

The master session authors ADRs, updates specs, and orchestrates agents. It does **not** write production code, tests, config, or templates. All source file changes go through dev-harness subagents invoked by `/feature-change`.

If tests fail, code is missing, or implementation is wrong — invoke dev-harness, don't fix it yourself. If agents are failing (permissions, context limits), fix the agent infrastructure, not the source code.

## Parallelism — use subagents for independent work

When requests can be parallelized, use subagents extensively rather than handling them sequentially.

Launch multiple agents in a single message when their work is independent. Don't serialize tasks that can overlap.
```

If the file already exists, print: `"CLAUDE.md already exists — skipping (preserving customizations)"`

Tell the user: `"Review CLAUDE.md and add project-specific rules (component lists, deploy commands, etc.)"`

---

## Step 5 — Bootstrap default permissions

Read or create `$CLAUDE_PROJECT_DIR/.claude/settings.json`. Merge the following `allow` entries into the existing array (do not duplicate entries that already exist):

```json
{
  "permissions": {
    "allow": [
      "Bash",
      "Edit",
      "Write",
      "Update",
      "mcp__plugin_spec-driven-dev_docs__*"
    ]
  }
}
```

These permissions are required for:
- **Bash/Edit/Write/Update**: dev-harness and spec-evaluator subagents run without supervision and cannot prompt for permission
- **docs MCP tools**: all doc operations should be auto-approved

If `.claude/settings.json` already exists with an `allow` array, merge only entries that are not already present. Do not remove existing entries.

Print: `"Default permissions configured in .claude/settings.json"`

---

## Step 6 — Verify

Run these checks and report results:

| Check | Command | Pass |
|-------|---------|------|
| docs-mcp binary exists | `test -x "${CLAUDE_PLUGIN_ROOT}/bin/docs-mcp"` | Binary compiled |
| sdd-master symlink | `test -L ~/.local/bin/sdd-master` | Symlink in place |
| sdd-master on PATH | `which sdd-master` | Callable from CLI |
| blocked-commands config | `test -f .agent/blocked-commands.json` | Config present |
| master config | `test -f .agent/master-config.json` | Config present |
| CLAUDE.md | `test -f CLAUDE.md` | Workflow rules present |
| permissions | `test -f .claude/settings.json` | Default permissions configured |

Report pass/fail for each. Any failure is non-fatal — the plugin still works for skills and hooks; only the failed capability is degraded.
