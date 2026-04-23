#!/usr/bin/env bash
set -euo pipefail

# Standalone installer for spec-driven-dev workflow.
# Symlinks skills, agents, compiles docs-mcp, and configures per-project files.
# Safe to re-run — all steps are idempotent.
#
# Usage: /path/to/spec-driven-dev/install.sh [target-project-dir]

SDD_ROOT="$(cd "$(dirname "$0")" && pwd)"
TARGET="${1:-.}"
TARGET="$(cd "$TARGET" && pwd)"

echo "spec-driven-dev installer"
echo "  Source: ${SDD_ROOT}"
echo "  Target: ${TARGET}"
echo ""

# --- Step 1: Compile docs-mcp ---
if command -v bun &>/dev/null; then
  echo "Compiling docs-mcp binary..."
  (cd "${SDD_ROOT}/docs-mcp" && bun install --frozen-lockfile 2>/dev/null || bun install && bun run build)
  echo "  ✓ docs-mcp binary compiled"
else
  echo "  ✗ bun not found — docs-mcp binary not compiled"
  echo "    Install: curl -fsSL https://bun.sh/install | bash"
fi

# --- Step 2: Symlink skills ---
if [ "${SDD_ROOT}" = "${TARGET}" ]; then
  echo "Target is source repo — skipping skill/agent symlinks"
else
  mkdir -p "${TARGET}/.agent/skills"
  skill_count=0
  for skill_dir in "${SDD_ROOT}/.agent/skills"/*/; do
    [ -d "$skill_dir" ] || continue
    name=$(basename "$skill_dir")
    ln -sfn "${skill_dir}" "${TARGET}/.agent/skills/${name}"
    skill_count=$((skill_count + 1))
  done
  echo "  ✓ Symlinked ${skill_count} skills into .agent/skills/"

  mkdir -p "${TARGET}/.agent/agents"
  agent_count=0
  for agent_file in "${SDD_ROOT}/.agent/agents"/*.md; do
    [ -f "$agent_file" ] || continue
    name=$(basename "$agent_file")
    ln -sfn "${agent_file}" "${TARGET}/.agent/agents/${name}"
    agent_count=$((agent_count + 1))
  done
  echo "  ✓ Symlinked ${agent_count} agents into .agent/agents/"
fi

# --- Step 3: Symlink sdd-master ---
mkdir -p ~/.local/bin
ln -sf "${SDD_ROOT}/bin/sdd-master" ~/.local/bin/sdd-master
echo "  ✓ sdd-master symlinked to ~/.local/bin/"

if ! echo "$PATH" | tr ':' '\n' | grep -q "$HOME/.local/bin"; then
  echo ""
  echo "  ⚠ ~/.local/bin is not on your PATH. Add to your shell profile:"
  echo "    export PATH=\"\$HOME/.local/bin:\$PATH\""
  echo ""
fi

# --- Step 4: Configure MCP server ---
MCP_FILE="${TARGET}/.mcp.json"
if [ -f "$MCP_FILE" ] && grep -q '"docs"' "$MCP_FILE" 2>/dev/null; then
  echo "  ✓ .mcp.json already has docs entry — skipping"
else
  if [ -f "$MCP_FILE" ]; then
    echo "  → Merging docs MCP into existing .mcp.json (manual merge may be needed)"
  else
    cat > "$MCP_FILE" << MCPEOF
{
  "mcpServers": {
    "docs": {
      "command": "${SDD_ROOT}/bin/docs-mcp",
      "args": ["--root", "${TARGET}"]
    }
  }
}
MCPEOF
    echo "  ✓ .mcp.json created with docs MCP server"
  fi
fi

# --- Step 5: Initialize config files ---
mkdir -p "${TARGET}/.agent"

if [ ! -f "${TARGET}/.agent/blocked-commands.json" ]; then
  cat > "${TARGET}/.agent/blocked-commands.json" << 'BCEOF'
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
BCEOF
  echo "  ✓ .agent/blocked-commands.json created"
else
  echo "  ✓ .agent/blocked-commands.json already exists — skipping"
fi

if [ ! -f "${TARGET}/.agent/master-config.json" ]; then
  cat > "${TARGET}/.agent/master-config.json" << 'MCEOF'
{
  "source_dirs": ["**/src/**"]
}
MCEOF
  echo "  ✓ .agent/master-config.json created"
else
  echo "  ✓ .agent/master-config.json already exists — skipping"
fi

# --- Step 6: Upsert CLAUDE.md with marker-delimited SDD block ---
SDD_BLOCK='<!-- sdd:begin -->
# Project Rules

## Change detected → invoke /feature-change immediately

When the user asks for **any change** — feature, bug fix, refactor, config, UI tweak, backend change — invoke `/feature-change` as your **first action**. Do not analyze the code first. Do not start implementing. Do not explore the codebase. Invoke the skill and let it handle discovery, classification, and implementation.

**Never write implementation code directly.** The master session authors ADRs, updates specs, and orchestrates agents. All code changes go through dev-harness subagents invoked by `/feature-change`.

Heuristic: if the user says "fix", "change", "update", "refactor", "remove", "add X to Y", "make X do Y", or describes any modification to how the system behaves → that'"'"'s `/feature-change`. Don'"'"'t ask permission; invoke the skill immediately.

The loop: `/feature-change` reads specs → classifies → authors ADR → updates spec if needed → commits spec → calls dev-harness → implements and tests.

## New feature detected → invoke /plan-feature immediately

When the user describes anything that looks like a potential **new feature**, jump straight into `/plan-feature` — don'"'"'t wait for the full picture, don'"'"'t rely on keeping it in memory.

Planning context is lost when you get compacted or switched out. The ADR on disk is the durable form. Start `/plan-feature` on the first mention, even mid-conversation, even if there are still open questions — drafts are first-class and can be paused, committed, and resumed.

Heuristic: if the user says something like "maybe we should...", "what if...", "could we add...", "I want to...", or describes a capability the app doesn'"'"'t have yet → that'"'"'s `/plan-feature`. Don'"'"'t ask permission; just start the skill and let the Q&A surface the rest.

## Never edit source files directly

The master session authors ADRs, updates specs, and orchestrates agents. It does **not** write production code, tests, config, or templates. All source file changes go through dev-harness subagents invoked by `/feature-change`.

If tests fail, code is missing, or implementation is wrong — invoke dev-harness, don'"'"'t fix it yourself. If agents are failing (permissions, context limits), fix the agent infrastructure, not the source code.

## Parallelism — use subagents for independent work

When requests can be parallelized, use subagents extensively rather than handling them sequentially.

Launch multiple agents in a single message when their work is independent. Don'"'"'t serialize tasks that can overlap.
<!-- sdd:end -->'

CLAUDE_FILE="${TARGET}/CLAUDE.md"

if [ ! -f "$CLAUDE_FILE" ]; then
  printf '%s\n' "$SDD_BLOCK" > "$CLAUDE_FILE"
  echo "  ✓ CLAUDE.md created with SDD workflow rules — add project-specific content after the sdd:end marker"
elif ! grep -q '<!-- sdd:begin -->' "$CLAUDE_FILE"; then
  # No markers present — prepend block above existing content
  EXISTING=$(cat "$CLAUDE_FILE")
  printf '%s\n\n%s\n' "$SDD_BLOCK" "$EXISTING" > "$CLAUDE_FILE"
  echo "  ✓ CLAUDE.md updated — SDD workflow rules prepended, existing content preserved after sdd:end marker"
else
  # Markers present — replace block in-place using Python (sed -i has portability issues)
  python3 -c "
import sys

sdd_block = sys.argv[1]
path = sys.argv[2]

with open(path) as f:
    content = f.read()

begin = '<!-- sdd:begin -->'
end = '<!-- sdd:end -->'

start_idx = content.find(begin)
end_idx = content.find(end)

if start_idx == -1 or end_idx == -1:
    sys.exit(1)

end_idx += len(end)
new_content = content[:start_idx] + sdd_block + content[end_idx:]

with open(path, 'w') as f:
    f.write(new_content)
" "$SDD_BLOCK" "$CLAUDE_FILE"
  echo "  ✓ CLAUDE.md updated — SDD workflow rules refreshed, project-specific content preserved"
fi

# --- Step 7: Bootstrap permissions ---
SETTINGS_DIR="${TARGET}/.claude"
SETTINGS_FILE="${SETTINGS_DIR}/settings.json"
mkdir -p "$SETTINGS_DIR"

if [ ! -f "$SETTINGS_FILE" ]; then
  cat > "$SETTINGS_FILE" << 'SEOF'
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
SEOF
  echo "  ✓ .claude/settings.json created with default permissions"
else
  echo "  ✓ .claude/settings.json already exists — merge permissions manually if needed"
fi

# --- Summary ---
echo ""
echo "Setup complete. Verify:"
[ -x "${SDD_ROOT}/bin/docs-mcp" ] && echo "  ✓ docs-mcp binary" || echo "  ✗ docs-mcp binary (run 'bun install && bun run build' in ${SDD_ROOT}/docs-mcp)"
[ -L ~/.local/bin/sdd-master ] && echo "  ✓ sdd-master symlink" || echo "  ✗ sdd-master symlink"
echo "  Skills: $(ls "${TARGET}/.agent/skills"/*/SKILL.md 2>/dev/null | wc -l | tr -d ' ')"
echo "  Agents: $(ls "${TARGET}/.agent/agents"/*.md 2>/dev/null | wc -l | tr -d ' ')"
