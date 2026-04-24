## Run: 2026-04-23T14:00:00Z

**Gaps found: 5**

Round 1 found 9 gaps. This round re-evaluates each and identifies what was resolved, what remains, and any new issues.

---

### Resolved from Round 1

- **Gap 6 (guard contract)** — RESOLVED. The ADR now has a full "Guard script interface" table specifying `$1` as input, exit 0/allow, exit 1/stderr/deny, and the no-config-file behavior.
- **Gap 8 (bun.lock)** — RESOLVED. The Implementation Plan now explicitly says "move bun.lock" and "run `bun install` after move to verify".
- **Gap 9 (docs-mcp --root for self-development)** — RESOLVED. The `.mcp.json` block now shows `--root "${CLAUDE_PLUGIN_ROOT}/../../src/sdd"` and includes an explanatory note that `claude/sdd/` traverses two levels to reach `src/sdd/`.

---

### Remaining / New Gaps

---

1. **Factual error: current `.mcp.json` lacks `mcpServers` wrapper** — The setup SKILL.md (Step 4) writes `.mcp.json` with a top-level `"mcpServers"` key. The ADR's new `claude/sdd/.mcp.json` shows the top-level key as `"docs"` with no `"mcpServers"` wrapper — identical to the current `spec-driven-dev/.mcp.json` format. These are two different schema shapes. If Claude Code requires the `mcpServers` wrapper (as the setup skill implies), then the plugin-level `.mcp.json` in the ADR is in the wrong format. If the flat `"docs"` key is correct for plugin-level `.mcp.json` (as the existing code uses), then the setup skill's Step 4 is writing the wrong format for target projects. The ADR does not address this discrepancy.
   - **Section**: Component Changes § claude/sdd/ — `.mcp.json` block
   - **Code**: `spec-driven-dev/.mcp.json` line 1 — top-level key is `"docs"` (no wrapper). Setup SKILL.md lines 128–137 — uses `"mcpServers": { "docs": ... }` wrapper.
   - **Severity**: HIGH

2. **Ambiguity: `${CLAUDE_PLUGIN_ROOT}` resolution point is still unverified** — The ADR states "`${CLAUDE_PLUGIN_ROOT}` resolves to the plugin's install directory — in this layout, that's `claude/sdd/`". This is a design assertion about how Claude Code will set this variable. Gaps 2 and 3 from Round 1 were marked HIGH because this resolution behavior was unclear. The ADR now asserts it directly, but makes no reference to where this behavior is documented in Claude Code or what happens if Claude sets `CLAUDE_PLUGIN_ROOT` to the repo root instead of the subdirectory. The hooks.json command `bash "${CLAUDE_PLUGIN_ROOT}/hooks/blocked-commands-hook.sh"` and the `.mcp.json` path `${CLAUDE_PLUGIN_ROOT}/../../src/sdd/bin/docs-mcp` both depend on this resolving to `claude/sdd/`. If it resolves to the repo root (one level up), all paths break. An implementer cannot verify this without running Claude Code against the new layout, and there is no fallback or detection logic specified.
   - **Section**: Component Changes § claude/sdd/ — opening paragraph on `${CLAUDE_PLUGIN_ROOT}`
   - **Code**: Current `spec-driven-dev/hooks/hooks.json` line 9 uses `${CLAUDE_PLUGIN_ROOT}/hooks/blocked-commands-hook.sh` and this works today with `CLAUDE_PLUGIN_ROOT` pointing to `spec-driven-dev/`. After the move, `claude/sdd/` becomes the plugin root per ADR assertion — but the ADR provides no evidence or citation for how Claude sets this variable.
   - **Severity**: HIGH

3. **Missing detail: setup skill path resolution for `SRC_ROOT` uses walk-up heuristic that breaks if invoked from a non-standard location** — The ADR specifies that `PLATFORM_ROOT` is resolved by walking up "3 levels up" from `claude/sdd/skills/setup/SKILL.md` → `claude/sdd/`. But the walk-up logic (`walk up from this SKILL.md's location`) only works if the skill file is read from its physical location. If the target project installs skills by symlinking `claude/sdd/skills/setup/` into `TARGET/.agent/skills/setup/`, then an agent reading the SKILL.md via the symlink in the target project would walk up 3 levels from `TARGET/.agent/skills/setup/` to `TARGET/` — not `claude/sdd/`. The ADR never states whether the setup skill file is read from its canonical location in the platform package or from the symlinked location in the target project. This is especially important because the current setup SKILL.md (which this replaces) already handles this by using `${CLAUDE_PLUGIN_ROOT}` as the primary path and only falling back to walk-up. The new ADR repeats this pattern but does not clarify what "walk up 3 levels" means when the skill is accessed via symlink.
   - **Section**: Component Changes § claude/sdd/ — `skills/setup/SKILL.md` — Path resolution block
   - **Code**: `spec-driven-dev/.agent/skills/setup/SKILL.md` lines 34–38 — current skill says "Walk up 4 levels from this file to get SDD_ROOT" (4 levels, not 3), acknowledging this can be ambiguous; new ADR says 3 levels for `claude/sdd/skills/setup/SKILL.md → claude/sdd/` which is correct only if not accessed via symlink.
   - **Severity**: HIGH

4. **Factual error: current `skills/` location is at repo root, not `.agent/skills/`** — The ADR's canonical source tree puts shared skills at `src/sdd/.agent/skills/<name>` and says these are "moved from current `spec-driven-dev/`". But the current layout has skills at `spec-driven-dev/skills/` AND `spec-driven-dev/.agent/skills/` — both directories exist and contain the same skill names (confirmed by filesystem inspection). The `.agent/skills/` directory is a real directory (not a symlink), and `skills/` at the root also exists. The `git mv` operation in Implementation Plan Step 1 (`git mv spec-driven-dev/* src/sdd/`) will move both `skills/` and `.agent/skills/` (and the `.agent/` directory contents). The ADR never addresses that there are two copies of skills in the current layout, nor which one is authoritative. If an implementer does `git mv spec-driven-dev/* src/sdd/`, they will get both `src/sdd/skills/` and `src/sdd/.agent/skills/` — only the latter is referenced by the new layout. The redundant `skills/` directory is never mentioned.
   - **Section**: Component Changes § src/sdd/ — "Moved from current `spec-driven-dev/`" list; Implementation Plan Step 1
   - **Code**: `spec-driven-dev/skills/` and `spec-driven-dev/.agent/skills/` both exist as real directories with identical contents (confirmed: both contain dashboard, design-audit, feature-change, file-bug, plan-feature, setup, spec-evaluator).
   - **Severity**: HIGH

5. **Missing detail: how the Claude marketplace finds `claude/sdd/.claude-plugin/plugin.json`** — The ADR shows a `plugin.json` at `claude/sdd/.claude-plugin/plugin.json` and a root `marketplace.json` with `"source": "./claude/sdd"`. But the current root `marketplace.json` has `"source": "./spec-driven-dev"` and Claude Code resolves the plugin root from that `source` field. The ADR states "Claude reads `.claude-plugin/marketplace.json` → finds plugin at `claude/sdd/` → installs" in the User Flow, but never specifies whether Claude Code looks for `plugin.json` inside `<source>/.claude-plugin/plugin.json` or inside `<source>/plugin.json`. The current plugin has `.claude-plugin/plugin.json` inside `spec-driven-dev/`, making the resolved path `spec-driven-dev/.claude-plugin/plugin.json`. Under the new layout it would be `claude/sdd/.claude-plugin/plugin.json`. This is consistent — but the ADR never cites the Claude plugin format spec confirming that `source` → `.claude-plugin/plugin.json` lookup is how Claude Code works. If Claude Code expects the `plugin.json` directly at `claude/sdd/plugin.json` (not in a `.claude-plugin/` subdirectory), the layout is wrong. An implementer cannot verify this without reading Claude Code source or docs not cited in the ADR.
   - **Section**: Component Changes § claude/sdd/ — `.claude-plugin/plugin.json` block; User Flow § Claude Code user step 3
   - **Code**: Current layout has `.claude-plugin/marketplace.json` at repo root and `spec-driven-dev/.claude-plugin/` is not present — actually, `spec-driven-dev/` does not contain a `.claude-plugin/` directory at all (only the repo root does). The ADR adds one at `claude/sdd/.claude-plugin/`. Whether this nested `.claude-plugin/` structure is correct per Claude's plugin resolution protocol is unverified.
   - **Severity**: HIGH
