---
name: local-setup
description: Developer setup for working on the plugin repo itself. Creates local .agent/ symlinks that override the installed plugin with working-tree paths. Safe to re-run.
version: 1.0.0
user_invocable: true
---

# Local Setup

Developer setup for working on the plugin repo itself. The installed plugin provides skills, agents, MCP, and hooks — but those point at the installed clone, not your working tree. This skill creates local `.agent/` symlinks so edits to `src/sdd/` are reflected immediately.

Safe to re-run — all steps are idempotent.

## Usage

```
/local-setup
```

---

## Resolving paths

**REPO_ROOT** is the repo root (where this skill lives):
```bash
REPO_ROOT=$(cd "$(dirname "$0")/../../.." && pwd)
```

Verify `REPO_ROOT/src/sdd/.agent/skills/` exists. If not, stop and tell the user:
```
Cannot find src/sdd/.agent/skills/ — are you in the plugin repo?
```

---

## Algorithm

```
1. Resolve REPO_ROOT
2. Symlink skills and agents into .agent/
3. Install docs-mcp dependencies (bun install)
4. Write project-local .mcp.json with --root src/sdd
5. Write spec-driven-config.json (if absent)
6. Scaffold CLAUDE.md
7. Bootstrap default permissions in .claude/settings.json
8. Verify
```

---

## Step 1 — Symlink skills and agents

`.agent/skills/` is the vendor-neutral path (Agent Skills standard). All skills live there. Claude Code discovers skills at `.claude/skills/`, so symlink it to `.agent/skills/`.

```bash
# .agent/skills → canonical source
ln -sfn "${REPO_ROOT}/src/sdd/.agent/skills" "${REPO_ROOT}/.agent/skills"

# .claude/skills → .agent/skills (Claude Code discovery path)
mkdir -p "${REPO_ROOT}/.claude"
ln -sfn "${REPO_ROOT}/.agent/skills" "${REPO_ROOT}/.claude/skills"

# Agents
ln -sfn "${REPO_ROOT}/src/sdd/.agent/agents" "${REPO_ROOT}/.agent/agents"
```

Print the count: `"Symlinked N skills and M agents into .agent/"`

---

## Step 2 — Install docs-mcp dependencies

```bash
cd "${REPO_ROOT}/src/sdd/docs-mcp" && bun install
```

Print: `"Installed docs-mcp dependencies"`

---

## Step 3 — Write project-local .mcp.json override

This repo's `docs/` lives at `src/sdd/docs/`, not the project root. Write a project-level `.mcp.json` that passes `--root src/sdd` so docs-mcp finds the right directory.

If `${REPO_ROOT}/.mcp.json` does not exist, create it:

```json
{
  "docs": {
    "command": "bun",
    "args": [
      "run",
      "src/sdd/docs-mcp/src/index.ts",
      "--root",
      "src/sdd"
    ]
  }
}
```

If the file already exists and already has a `docs` key, print: `".mcp.json already has docs config — skipping"`

---

## Step 4 — Write spec-driven-config.json

If `${REPO_ROOT}/spec-driven-config.json` does not exist, create it:

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

If the file already exists, print: `"spec-driven-config.json already exists — skipping"`

---

## Step 5 — Scaffold CLAUDE.md

Inject or update the SDD workflow rules in `${REPO_ROOT}/CLAUDE.md` using marker-delimited content. The SDD section is wrapped in `<!-- sdd:begin -->` / `<!-- sdd:end -->` HTML comments.

Read the canonical workflow rules from `${REPO_ROOT}/src/sdd/context.md` and wrap in markers.

**Upsert logic:**
- **No CLAUDE.md**: Create it with the SDD marker block.
- **CLAUDE.md exists, no markers**: Prepend the SDD marker block above existing content.
- **CLAUDE.md exists, has markers**: Replace everything between markers with the latest content.

---

## Step 6 — Bootstrap default permissions

Read or create `${REPO_ROOT}/.claude/settings.json`. Merge the following `allow` entries into the existing array (do not duplicate):

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

---

## Step 7 — Verify

| Check | Command | Pass |
|-------|---------|------|
| skills symlinked | `ls ${REPO_ROOT}/.agent/skills/*/SKILL.md \| wc -l` | Skills present |
| agents symlinked | `ls ${REPO_ROOT}/.agent/agents/*.md \| wc -l` | Agents present |
| config | `test -f ${REPO_ROOT}/spec-driven-config.json` | Config present |
| CLAUDE.md | `test -f ${REPO_ROOT}/CLAUDE.md` | Workflow rules present |
| permissions | `test -f ${REPO_ROOT}/.claude/settings.json` | Permissions configured |
