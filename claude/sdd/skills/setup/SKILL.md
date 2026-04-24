---
name: setup
description: One-time setup for the spec-driven-dev workflow in a target project. Scaffolds CLAUDE.md, writes spec-driven-config.json, and bootstraps permissions. Safe to re-run.
version: 4.0.0
user_invocable: true
---

# Setup

One-time setup for the `spec-driven-dev` workflow in a target project. The plugin already provides skills, agents, MCP, and hooks — this skill handles the project-specific configuration that the plugin can't provide generically.

Safe to re-run — all steps are idempotent.

## Usage

```
/setup
```

---

## Resolving paths

**PLATFORM_ROOT** is the absolute path to the `claude/sdd/` directory (the Claude platform package):

1. If `${CLAUDE_PLUGIN_ROOT}` is set (running as an installed Claude plugin): use it directly.
   `PLATFORM_ROOT="${CLAUDE_PLUGIN_ROOT}"`

2. Fallback (development — running within the cloned repo directly): resolve by walking up from this SKILL.md.
   This SKILL.md lives at `<PLATFORM_ROOT>/skills/setup/SKILL.md`. The target project's `.agent/skills/setup/` may be a symlink to the plugin — use `realpath` to follow symlinks to the actual file, then walk up 3 levels.
   ```bash
   REAL=$(realpath "${BASH_SOURCE[0]}")
   PLATFORM_ROOT=$(cd "$(dirname "$REAL")/../../.." && pwd)
   ```

**TARGET** is the project being set up:
```bash
TARGET="${CLAUDE_PROJECT_DIR:-.}"
TARGET=$(cd "$TARGET" && pwd)   # resolve to absolute path
```

---

## Algorithm

```
1. Resolve PLATFORM_ROOT and TARGET
2. Write spec-driven-config.json (if absent)
3. Scaffold CLAUDE.md
4. Bootstrap default permissions in .claude/settings.json
5. Symlink sdd-master to ~/.local/bin/
6. Verify
```

---

## Step 1 — Write spec-driven-config.json

If `${TARGET}/spec-driven-config.json` does not exist, create it:

```json
{
  "source_dirs": ["**/src/**"],
  "blocked_commands": [
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

- `source_dirs`: prevents the master session from editing source files directly — all code changes go through dev-harness agents. The user can add more patterns (e.g. `**/lib/**`).
- `blocked_commands`: rules checked by the blocked-commands guard hook. Categories: `ban` (always denied), `guard` (denied unless `SDD_DEBUG=1`).

If the file already exists, print: `"spec-driven-config.json already exists — skipping (preserving customizations)"`

---

## Step 2 — Scaffold CLAUDE.md

Inject or update the SDD workflow rules in `${TARGET}/CLAUDE.md` using marker-delimited content. The SDD section is wrapped in `<!-- sdd:begin -->` / `<!-- sdd:end -->` HTML comments.

Read the canonical workflow rules from `${PLATFORM_ROOT}/context.md` and wrap in markers.

**Upsert logic:**
- **No CLAUDE.md**: Create it with the SDD marker block.
- **CLAUDE.md exists, no markers**: Prepend the SDD marker block above existing content (preserving everything the user wrote).
- **CLAUDE.md exists, has markers**: Replace everything between `<!-- sdd:begin -->` and `<!-- sdd:end -->` (inclusive) with the latest SDD content. Content outside the markers is preserved.

The SDD content between markers:

```
<!-- sdd:begin -->
<full contents of ${PLATFORM_ROOT}/context.md>
<!-- sdd:end -->
```

After updating, print:
- If created: `"CLAUDE.md created with SDD workflow rules — add project-specific content after the sdd:end marker"`
- If updated: `"CLAUDE.md updated — SDD workflow rules refreshed, project-specific content preserved"`
- If prepended: `"CLAUDE.md updated — SDD workflow rules prepended, existing content preserved after sdd:end marker"`

---

## Step 3 — Bootstrap default permissions

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

If `.claude/settings.json` already exists with an `allow` array, merge only entries that are not already present. Do not remove existing entries.

Print: `"Default permissions configured in .claude/settings.json"`

---

## Step 4 — Symlink sdd-master

```bash
mkdir -p ~/.local/bin
ln -sf "${PLATFORM_ROOT}/bin/sdd-master" ~/.local/bin/sdd-master
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

## Step 5 — Verify

Run these checks and report results:

| Check | Command | Pass |
|-------|---------|------|
| config | `test -f ${TARGET}/spec-driven-config.json` | Config present |
| CLAUDE.md | `test -f ${TARGET}/CLAUDE.md` | Workflow rules present (with markers) |
| permissions | `test -f ${TARGET}/.claude/settings.json` | Default permissions configured |
| sdd-master symlink | `test -L ~/.local/bin/sdd-master` | Symlink in place |
| sdd-master on PATH | `which sdd-master` | Callable from CLI |

Report pass/fail for each. Any failure is non-fatal — the workflow still works for skills; only the failed capability is degraded.
