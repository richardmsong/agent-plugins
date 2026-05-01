# ADR: Fix dashboard entrypoint path and Vite workspace dep resolution in plugin installs

**Status**: implemented
**Status history**:
- 2026-05-01: accepted
- 2026-05-01: implemented — all scope CLEAN

## Overview

Fix two bugs in the deployed plugin's `dashboard.sh` that prevent `/dashboard` from working in plugin installs: (1) the backend entrypoint check uses a wrong path (`$PLATFORM_ROOT/dist/docs-dashboard.js` instead of `$PLATFORM_ROOT/docs-dashboard.js`), and (2) the spec's description of the entrypoint path is ambiguous about the deployed layout where `PLATFORM_ROOT` is already the `dist/` directory.

## Motivation

After ADR-0071 restructured the build so that `dist/` is the installable artifact, `dashboard.sh` ships inside `dist/docs-dashboard/dashboard.sh`. It resolves `PLATFORM_ROOT` as one directory up — which is `dist/` itself. The entrypoint check on line 65:

```bash
if [ -f "$PLATFORM_ROOT/dist/docs-dashboard.js" ]; then
```

looks for `dist/dist/docs-dashboard.js` — a path that never exists. The fallback `$PLATFORM_ROOT/docs-dashboard/src/server.ts` exists (source is shipped) but fails because `workspace:*` imports in the source can't resolve without the monorepo workspace.

The bundled `docs-dashboard.js` is at `$PLATFORM_ROOT/docs-dashboard.js` (no `dist/` prefix), which is the correct check.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Backend entrypoint check | Check `$PLATFORM_ROOT/docs-dashboard.js` first (bundled), fall back to `$PLATFORM_ROOT/docs-dashboard/src/server.ts` (local-dev) | In plugin installs `PLATFORM_ROOT` = `dist/`; the bundle is at root. In local-dev (src/sdd) no bundle exists, so the fallback fires correctly. |

## Impact

Updates `spec-dashboard.md` Runtime section to clarify the entrypoint resolution in the deployed layout. Affects `docs-dashboard` component only — single line change in `dashboard.sh`.

## Scope

**In v1:** Fix the entrypoint path in `dashboard.sh`.

**Deferred:** None.

## Integration Test Cases

| Test case | What it verifies | Components exercised |
|-----------|------------------|----------------------|
| `/dashboard` in a plugin install finds the bundled `docs-dashboard.js` | The `if` check in `dashboard.sh` resolves to the bundle, not the source fallback | `docs-dashboard/dashboard.sh`, `dist/docs-dashboard.js` |
