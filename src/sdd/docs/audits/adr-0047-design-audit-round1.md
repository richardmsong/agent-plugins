## Run: 2026-04-23T00:00:00Z

**Gaps found: 9**

---

1. **Marketplace descriptor name mismatch** — The ADR shows `.claude-plugin/marketplace.json` at repo root with `"name": "agent-plugins"`, but the existing file at `/Users/270840341/work/claude-plugins/.claude-plugin/marketplace.json` currently has `"name": "richardmsong-plugins"` and lists the plugin source as `"./spec-driven-dev"` (not `"./claude/sdd"`). The ADR's "Moved from" list does not mention updating this existing root marketplace descriptor — only "Update marketplace descriptors at root" is listed in Scope. An implementer must know: does the repo rename happen first, or does the root `.claude-plugin/marketplace.json` get rewritten in-place as part of this ADR before the rename? The sequencing is unspecified.
   - **Doc**: "Update marketplace descriptors at root" (Scope § In v1)
   - **Code**: `/Users/270840341/work/claude-plugins/.claude-plugin/marketplace.json` — `"name": "richardmsong-plugins"`, `"source": "./spec-driven-dev"` (line 3, line 11)
   - **Severity**: HIGH

2. **`.mcp.json` path variable inconsistency** — The ADR's `.mcp.json` example for `claude/sdd/` uses `${CLAUDE_PLUGIN_ROOT}/../../src/sdd/bin/docs-mcp` as the command path. But the existing `.mcp.json` at `spec-driven-dev/.mcp.json` uses `${CLAUDE_PLUGIN_ROOT}/bin/docs-mcp` and passes `${CLAUDE_PLUGIN_ROOT}` as the `--root` argument. The ADR changes both the command path (two more levels up) and the `--root` arg (now `${CLAUDE_PLUGIN_ROOT}` itself, not a project dir). An implementer cannot tell whether `${CLAUDE_PLUGIN_ROOT}` in the new layout resolves to `claude/sdd/` or to the repo root — this affects whether the relative `../../src/sdd/bin/docs-mcp` path is correct. The variable resolution behavior under the new layout is not stated.
   - **Doc**: "`.mcp.json` — Claude MCP config… `${CLAUDE_PLUGIN_ROOT}/../../src/sdd/bin/docs-mcp`" (Component Changes § claude/sdd/)
   - **Code**: `spec-driven-dev/.mcp.json` line 3 — `"${CLAUDE_PLUGIN_ROOT}/bin/docs-mcp"`
   - **Severity**: HIGH

3. **`hooks.json` path discrepancy between sections** — The ADR shows two different `hooks.json` structures. In the "Component Changes § claude/sdd/" section it shows `hooks/hooks.json` with the command `bash "${CLAUDE_PLUGIN_ROOT}/hooks/blocked-commands-hook.sh"`. But the existing `hooks/hooks.json` already has this exact form for both `blocked-commands-hook.sh` and `source-guard-hook.sh`. The ADR doesn't state whether the new `claude/sdd/hooks/hooks.json` should differ from the existing one, or whether `${CLAUDE_PLUGIN_ROOT}` will still resolve correctly once the file moves from `spec-driven-dev/hooks/hooks.json` to `claude/sdd/hooks/hooks.json`. If `${CLAUDE_PLUGIN_ROOT}` resolves to `claude/sdd/`, the paths are correct; if it resolves to the repo root, they break. This depends on gap #2 and is likewise unresolved.
   - **Doc**: "`hooks/hooks.json` — Claude hook registration" (Component Changes § claude/sdd/)
   - **Code**: `spec-driven-dev/hooks/hooks.json` lines 9–24 — already contains both hook entries
   - **Severity**: HIGH

4. **Setup skill not rewritten for new paths — implementation scope is unclear** — The current `setup/SKILL.md` resolves `SDD_ROOT` and uses `${SDD_ROOT}/docs-mcp`, `${SDD_ROOT}/bin/docs-mcp`, `${SDD_ROOT}/.agent/skills/`, etc. Under the new layout these paths become `src/sdd/docs-mcp`, `src/sdd/bin/docs-mcp`, `src/sdd/.agent/skills/` (resolved via `${CLAUDE_PLUGIN_ROOT}/../../src/sdd/`). The ADR says the new Claude-specific `skills/setup/SKILL.md` is "Claude-specific setup skill (self-contained, does everything)" and lists 8 sub-steps that largely match the current skill, but it never states what the new SDD_ROOT resolution logic is — specifically whether the new setup skill walks to `src/sdd/` via `${CLAUDE_PLUGIN_ROOT}/../../src/sdd/` or some other mechanism. The current skill's resolution order (§ "Resolving SDD_ROOT") becomes invalid because the canonical source is no longer the plugin root but two directories deeper.
   - **Doc**: "`skills/setup/SKILL.md` — Claude-specific setup skill…" (Component Changes § claude/sdd/)
   - **Code**: `spec-driven-dev/.agent/skills/setup/SKILL.md` lines 33–38 — current SDD_ROOT resolution refers to `<SDD_ROOT>/.agent/skills/setup/SKILL.md` (4 levels up)
   - **Severity**: BLOCKING

5. **`context.md` extraction — what content exactly?** — The ADR says `context.md` is "Extracted from the current setup SKILL.md CLAUDE.md template" and shows a shortened 4-rule version. The actual setup SKILL.md (Step 6) injects a much longer CLAUDE.md block with full heuristics and elaboration (e.g. the `/feature-change` heuristic paragraph, the "Planning context is lost" paragraph, the "If tests fail…" and "If agents are failing…" clauses). The `context.md` shown in the ADR omits all of this elaboration. An implementer cannot tell: is `context.md` the abbreviated version in the ADR, or the full version from the setup skill's Step 6 block? The two differ materially in about 60% of their content.
   - **Doc**: "context.md — Canonical workflow rules (new)" section with 4-rule abbreviated content
   - **Code**: `spec-driven-dev/.agent/skills/setup/SKILL.md` lines 199–233 — the full CLAUDE.md template with elaboration not present in the ADR's `context.md` example
   - **Severity**: HIGH

6. **Guard logic extraction — interface contract between guard scripts and I/O wrappers is unspecified** — The ADR says guard logic is "extracted from current `blocked-commands-hook.sh`" into `src/sdd/hooks/guards/blocked-commands.sh` and that the Claude I/O wrapper reads Claude's JSON stdin, extracts the command, delegates to this script, and formats the JSON response. But neither the CLI interface (arguments? stdin? exit codes?) of the extracted guard script nor the I/O contract between the wrapper and the guard script is defined. An implementer must know: does the guard script receive the command string as $1, via stdin, or some other mechanism? What does it emit on stdout? What exit codes mean allow vs deny? Without this contract, both the guard script and the I/O wrapper cannot be written without inventing the interface.
   - **Doc**: "`hooks/guards/blocked-commands.sh` — guard logic extracted from current `blocked-commands-hook.sh`, agent-neutral (takes command string, returns allow/deny)" (Component Changes § src/sdd/)
   - **Code**: `spec-driven-dev/hooks/blocked-commands-hook.sh` — the existing script is a single unit; it reads stdin JSON and emits deny JSON directly with no internal subroutine boundary
   - **Severity**: BLOCKING

7. **Symlink paths in the layout tree are wrong** — The layout tree under `claude/sdd/skills/` shows symlinks like:
   ```
   plan-feature -> ../../../src/sdd/.agent/skills/plan-feature
   ```
   But `claude/sdd/skills/` is at depth 3 from repo root (`claude/sdd/skills/plan-feature`). Three levels up (`../../../`) from there reaches the repo root. The target `src/sdd/.agent/skills/plan-feature` is then relative to the repo root, making the full resolved path correct. However the `agents` symlink shown as:
   ```
   agents -> ../../src/sdd/.agent/agents
   ```
   is at `claude/sdd/agents` — two levels up from `claude/sdd/` reaches the repo root, so `../../src/sdd/.agent/agents` resolves correctly. These are consistent, but the directory tree also shows `droid/sdd/` with identical relative symlink paths. At `droid/sdd/skills/plan-feature`, three levels up is the repo root, which is also correct. This appears fine — but the `agents` symlink in the droid section shows `agents -> ../../src/sdd/.agent/agents` which would be at `droid/sdd/agents` — two levels up is also the repo root, which is correct. No blocking error here, but the ADR never states whether these symlinks are relative or absolute, and the setup skill for the current layout creates absolute symlinks (`ln -sfn "${skill_dir}"`). The new layout's `claude/sdd/` symlinks must be relative (they are committed to the repo) but the ADR never says this explicitly.
   - **Doc**: Layout tree showing symlink relative paths (Component Changes § Repo layout)
   - **Code**: `spec-driven-dev/.agent/skills/setup/SKILL.md` line 85 — `ln -sfn "${skill_dir}"` creates absolute symlinks
   - **Severity**: HIGH

8. **`package.json` workspace config migration — not addressed** — The existing `spec-driven-dev/package.json` defines a Bun workspace with three members: `docs-mcp`, `docs-dashboard`, `docs-dashboard/ui`. Under the new layout these move to `src/sdd/`. The ADR's scope lists "move from current `spec-driven-dev/`" for `package.json`, but never says whether the workspace paths in `package.json` need to change (they are currently relative: `"docs-mcp"`, `"docs-dashboard"`, `"docs-dashboard/ui"` — these remain valid if `package.json` moves to `src/sdd/` alongside those directories). However, `bun.lock` is not mentioned at all. Bun lockfile is at `spec-driven-dev/bun.lock` and must move with the workspace root. An implementer must determine: does the move involve only `package.json` or also `bun.lock`, and whether `bun install` must be re-run after the move.
   - **Doc**: "Moved from current `spec-driven-dev/`" listing includes `package.json — Workspace config` (Component Changes § src/sdd/)
   - **Code**: `spec-driven-dev/package.json` (workspace root), `spec-driven-dev/bun.lock` (present at root, not mentioned)
   - **Severity**: HIGH

9. **`docs/` location ambiguity — ADRs are both source and packaging** — The canonical source tree lists `docs/` as belonging to `src/sdd/` (containing ADRs and specs). But ADRs describe the evolution of the plugin itself, including ADR-0047 which is in `spec-driven-dev/docs/`. After the restructure, ADR-0047 and all prior ADRs would live at `src/sdd/docs/`. However, the setup skill's CLAUDE.md template instructs agents to look for `docs/adr-*.md` and `docs/**/spec-*.md` relative to the target project. When agents are working inside the `agent-plugins` repo itself (e.g. for self-development), will they find docs at `src/sdd/docs/` or at the repo root `docs/`? The ADR says "docs-mcp is configured per-project… resolves `src/sdd/bin/docs-mcp` to an absolute path" for target projects, but for self-development inside the plugin repo (the `.mcp.json` in `claude/sdd/`) the `--root` argument is `${CLAUDE_PLUGIN_ROOT}` which resolves to `claude/sdd/` — not `src/sdd/` where the docs actually are. This means the docs MCP server would look for `claude/sdd/docs/` which does not exist.
   - **Doc**: "`--root` `${CLAUDE_PLUGIN_ROOT}`" in the `.mcp.json` block for `claude/sdd/` (Component Changes § claude/sdd/)
   - **Doc**: "src/sdd/ — Canonical source… docs/ — ADRs and specs" (Component Changes § src/sdd/)
   - **Severity**: BLOCKING
