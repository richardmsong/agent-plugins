# ADR: Neutral version source of truth and full CI git add scope

**Status**: implemented
**Status history**:
- 2026-04-29: accepted
- 2026-04-29: implemented — all scope CLEAN

## Overview

Move the plugin version source of truth from `factory/sdd/.factory-plugin/plugin.json` to a neutral `src/sdd/version.json` file, and expand the CI `git add` in `.github/workflows/build-plugin.yml` to cover all platform build outputs, not just `claude/sdd/` and a handful of factory paths.

## Motivation

**Version source (supersedes ADR-0065):** ADR-0065 chose `factory/sdd/.factory-plugin/plugin.json` as the canonical version source because "the Droid/Factory plugin is authored directly (not built)." After ADRs-0066/0067/0068 refactored the build into a unified platform loop, this reasoning no longer holds: all platform output directories are equally derived from `src/sdd/`. Giving `factory/` special authority over the version is arbitrary and confusing — it means the version lives in an output directory, not in the source. It also causes a merge conflict whenever two CI runs touch the same file for different reasons (observed on push after the unified loop refactor).

**CI git add scope:** The CI workflow stages only:
```
claude/sdd/   factory/sdd/droids/   factory/sdd/.factory-plugin/
```
Everything the build now produces for factory — `skills/`, `hooks/guards/`, `context.md`, `dist/`, `docs-dashboard/`, `mcp.json` — is silently dropped after every CI run. A developer installing the factory plugin from the repo gets whatever was last manually committed, not the current build output.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| New version source | `src/sdd/version.json` with `{ "version": "x.y.z", "description": "...", "_buildHash": "..." }` | Sits in the source tree alongside `build.sh`; unambiguously not an output |
| Migration | Copy current `version`, `description`, `_buildHash` values from `factory/sdd/.factory-plugin/plugin.json` into `src/sdd/version.json`; remove those fields from `factory/sdd/.factory-plugin/plugin.json` (keep `name` and `author`) | Clean cut; `factory/plugin.json` reverts to a static platform manifest |
| build.sh SOURCE_PLUGIN | Change to read from `src/sdd/version.json` | Single change to the variable at top of script |
| CI git add | Replace the explicit path list with `git add --all` after the build | The build already validates its own outputs in step 12; `--all` captures everything the build wrote without requiring the workflow to track the output manifest. This is also required for correctness: `src/sdd/` is not in the current staged list, so the `_buildHash` written back to `src/sdd/version.json` after each build would never be committed — causing every subsequent CI run to see a stale hash and re-bump the version indefinitely. |
| Workflow trigger paths | Unchanged — `src/sdd/**` and `factory/sdd/.agent-templates/**` | Adding `src/sdd/version.json` is covered by the existing `src/sdd/**` glob |

## Impact

- `src/sdd/version.json` — new file, version source of truth
- `src/sdd/build.sh` — change `SOURCE_PLUGIN` variable
- `factory/sdd/.factory-plugin/plugin.json` — remove `version`, `description`, `_buildHash` fields
- `.github/workflows/build-plugin.yml` — change `git add` line

## Scope

Version source and CI staging only. No changes to version sync logic, bump behavior, or platform output structure.

## Integration Test Cases

| Test case | What it verifies | Components exercised |
|-----------|------------------|----------------------|
| After `build.sh`, `factory/sdd/.factory-plugin/plugin.json` has same `version` as `src/sdd/version.json` | Version sync still fans out from new source | build.sh |
| After `build.sh --no-bump`, `src/sdd/version.json` `_buildHash` is updated but version unchanged | Hash tracking moved to correct file | build.sh |
| After CI run, `factory/sdd/skills/design-audit/` is committed in the repo | CI stages all platform outputs | build-plugin.yml |
| After CI run, `factory/sdd/mcp.json` is committed in the repo | CI stages factory MCP config | build-plugin.yml |
