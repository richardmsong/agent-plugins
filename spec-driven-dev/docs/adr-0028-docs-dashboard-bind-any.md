# ADR: Docs Dashboard Binds to `0.0.0.0`

**Status**: accepted
**Status history**:
- 2026-04-21: accepted

## Overview

The `mclaude-docs-dashboard` server now binds to `0.0.0.0` instead of `127.0.0.1`. The server listens on all local interfaces so the dashboard is reachable from other machines on the operator's private network (e.g. the user's Tailnet). Access control is delegated to the host network — the process itself still has no auth.

## Motivation

The user runs a headless MacBook Pro as a dev server and accesses tools from a mobile device over Tailscale. A `127.0.0.1` bind is unreachable from anything except the host itself, so the dashboard was invisible on mobile. Binding to `0.0.0.0` lets the Tailscale-assigned address serve the dashboard to any authenticated Tailnet peer.

ADR-0027 framed "loopback-only" as the sandbox boundary. That framing was correct for the default single-machine dev loop but wrong for the headless+Tailnet workflow this repo actually runs on. This ADR supersedes ADR-0027's Security § insofar as it describes the bind address — the rest of ADR-0027 (read-only, no auth, CORS `*`) is unchanged.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Bind address | `0.0.0.0` (all interfaces) | Must be reachable from Tailnet peers, not only the host. |
| Auth | Still none. | Operator-owned trust boundary (Tailnet ACL / host firewall) replaces the loopback boundary. No change to the application's security model — the process still has no notion of identity. |
| CORS | Unchanged (`Access-Control-Allow-Origin: *`). | The dashboard is still a read-only dev tool; no cookies, no credentials. |
| Flag for bind | Not added. | No current use case for selecting a different bind address. Adding a `--bind` flag would be scope creep. Revisit if a user wants to re-lock to loopback. |
| Startup banner | Prints `http://0.0.0.0:<port>/` plus every non-loopback IPv4 address of the host so the operator can copy a reachable URL. | `0.0.0.0` is not a browsable URL; users need to know what to type. |

## Impact

- `docs/mclaude-docs-dashboard/spec-dashboard.md` — bind address, CLI flag table, startup-banner format, and Security § are updated in this commit.
- `mclaude-docs-dashboard/src/server.ts` — `Bun.serve({ hostname: "0.0.0.0", ... })` and startup-banner rewrite.
- No change to `mclaude-docs-mcp`, no change to state schema, no change to DNS (the dashboard is reached by Tailscale IP, not by `*.mclaude.internal`).

## Scope

**In:** bind to `0.0.0.0`; banner prints all reachable addresses.

**Deferred:** `--bind <addr>` flag, optional auth token query param, Tailscale-only address detection. Not asked for; adding them now is scope creep.
