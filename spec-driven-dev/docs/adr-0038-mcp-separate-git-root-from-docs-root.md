# ADR: MCP separates git root from docs root

**Status**: accepted
**Status history**:
- 2026-04-22: accepted

## Overview

The docs-mcp `--root` argument is used as both the git working directory and the parent of `docs/`. When the plugin lives in a subdirectory of the git repo (e.g. `spec-driven-dev/` under a multi-project repo), these two paths differ. The MCP must discover the git root by walking up from `--root` and use the two paths for their respective purposes: `--root` for locating `docs/` and the DB, git root for `git` commands and relative path computation.

## Motivation

The `.mcp.json` passes `--root ${CLAUDE_PLUGIN_ROOT}` which resolves to the plugin directory (e.g. `/path/to/spec-driven-dev`). The MCP used this as `repoRoot` for everything — git commands, `relative()` path computation, and `join(repoRoot, "docs")`. But the git root is the parent directory (`/path/to/`). This caused:

1. **Lineage scanner**: ran `git` with `cwd: spec-driven-dev/` — git still works (finds `.git` up the tree), but output paths are relative to the git root (`spec-driven-dev/docs/...`) while filters checked `startsWith("docs/")`. Zero lineage edges produced.
2. **Content indexer**: stored paths as `docs/adr-0015.md` (relative to `--root`) but the lineage scanner's `UPDATE documents SET commit_count` used git-relative paths (`spec-driven-dev/docs/adr-0015.md`). Mismatched paths meant `commit_count` was never incremented.
3. **DB location**: created at `<--root>/.agent/.docs-index.db` — correct behavior, but when `--root` was the unresolved literal `${CLAUDE_PROJECT_DIR}`, the DB went to a nonsensical path.

The dashboard already handles this correctly: `boot.ts` always finds the git root via `findRepoRoot(cwd)` and accepts `--docs-dir` separately. The MCP needs the same separation.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| `--root` semantics | `--root` specifies the docs root (parent of `docs/`), NOT the git root. Rename internal variable from `repoRoot` to `docsRoot` for clarity. | Matches how the plugin `.mcp.json` uses it — `${CLAUDE_PLUGIN_ROOT}` is where `docs/` lives. |
| Git root discovery | Always call `findGitRoot(docsRoot)` to locate the git root. Store in a separate `gitRoot` variable. | Git root is needed for git commands and relative path computation. It may differ from the docs root. |
| Fallback when no git | If `findGitRoot` returns null, set `gitRoot = null`. Lineage scanning is skipped (no git). Content indexing still works using `docsRoot` as the base for relative paths. | Graceful degradation — the MCP still indexes docs without git, just no lineage. |
| Path computation base | Pass `gitRoot` (not `docsRoot`) to `indexAllDocs` and `runLineageScan` as the `repoRoot` parameter. This ensures stored paths are git-root-relative (e.g. `spec-driven-dev/docs/adr-0015.md`), matching what the lineage scanner sees in git output. | Consistency: all paths in the DB use the same base. The dashboard already does this. |
| DB location | Stays at `<docsRoot>/.agent/.docs-index.db`. | The DB is per-plugin, not per-git-repo. Multiple plugins in the same repo should have separate indexes. |
| `.mcp.json` variable | `${CLAUDE_PLUGIN_ROOT}` replaces the non-existent `${CLAUDE_PROJECT_DIR}`. | `CLAUDE_PLUGIN_ROOT` is the only variable the plugin system resolves in `.mcp.json`. Already fixed. |

## Impact

- `docs/mclaude-docs-mcp/spec-docs-mcp.md` — update Runtime section to describe the git root / docs root separation.
- `docs-mcp/src/index.ts` — separate `docsRoot` from `gitRoot`, pass `gitRoot` to indexer and scanner.
- `.mcp.json` — already fixed (`${CLAUDE_PLUGIN_ROOT}`).

## Scope

**In:** Separate git root from docs root in the MCP entrypoint. Fix `.mcp.json` variable.
**Deferred:** Nothing — this is a targeted bug fix for the indexing failure.
