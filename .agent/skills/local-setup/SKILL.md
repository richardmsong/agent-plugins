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
3. Write spec-driven-config.json (if absent)
4. Scaffold CLAUDE.md
5. Bootstrap default permissions in .claude/settings.json
6. Verify
```

---

## Step 1 — Symlink skills and agents

Create symlinks from the working tree into the repo root's `.agent/` directory. These override the plugin-provided skills/agents with the local working copy.

```bash
# Shared skills (from canonical source)
mkdir -p "${REPO_ROOT}/.agent/skills"
for skill_dir in "${REPO_ROOT}/src/sdd/.agent/skills"/*/; do
  name=$(basename "$skill_dir")
  ln -sfn "${skill_dir}" "${REPO_ROOT}/.agent/skills/${name}"
done

# Setup skill (Claude-specific — from platform package)
ln -sfn "${REPO_ROOT}/claude/sdd/skills/setup" "${REPO_ROOT}/.agent/skills/setup"

# Agents
mkdir -p "${REPO_ROOT}/.agent/agents"
for agent_file in "${REPO_ROOT}/src/sdd/.agent/agents"/*.md; do
  name=$(basename "$agent_file")
  ln -sfn "${agent_file}" "${REPO_ROOT}/.agent/agents/${name}"
done
```

Print the count: `"Symlinked N skills and M agents into .agent/"`

---

## Step 2 — Write spec-driven-config.json

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

## Step 3 — Scaffold CLAUDE.md

Inject or update the SDD workflow rules in `${REPO_ROOT}/CLAUDE.md` using marker-delimited content. The SDD section is wrapped in `<!-- sdd:begin -->` / `<!-- sdd:end -->` HTML comments.

Read the canonical workflow rules from `${REPO_ROOT}/src/sdd/context.md` and wrap in markers.

**Upsert logic:**
- **No CLAUDE.md**: Create it with the SDD marker block.
- **CLAUDE.md exists, no markers**: Prepend the SDD marker block above existing content.
- **CLAUDE.md exists, has markers**: Replace everything between markers with the latest content.

---

## Step 4 — Bootstrap default permissions

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

## Step 5 — Verify

| Check | Command | Pass |
|-------|---------|------|
| skills symlinked | `ls ${REPO_ROOT}/.agent/skills/*/SKILL.md \| wc -l` | Skills present |
| agents symlinked | `ls ${REPO_ROOT}/.agent/agents/*.md \| wc -l` | Agents present |
| config | `test -f ${REPO_ROOT}/spec-driven-config.json` | Config present |
| CLAUDE.md | `test -f ${REPO_ROOT}/CLAUDE.md` | Workflow rules present |
| permissions | `test -f ${REPO_ROOT}/.claude/settings.json` | Permissions configured |
