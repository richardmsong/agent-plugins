## Run: 2026-04-22T00:00:00Z — ADR-0037 SSE Heartbeat Scope

Component: docs-dashboard
Spec files: spec-driven-dev/docs/adr-0037-sse-heartbeat.md, spec-driven-dev/docs/mclaude-docs-dashboard/spec-dashboard.md (SSE Broker section)
Code: spec-driven-dev/docs-dashboard/src/server.ts
Tests: spec-driven-dev/docs-dashboard/tests/sse.test.ts

---

### Phase 1 — Spec → Code

| Spec (doc:line) | Spec text | Code location | Verdict | Direction | Notes |
|-----------------|-----------|---------------|---------|-----------|-------|
| adr-0037:9 | "Adding a periodic heartbeat comment (`:heartbeat\n\n` every 15 seconds) keeps the connection alive" | server.ts:119-126 | IMPLEMENTED | — | `setInterval` fires every `15_000` ms and enqueues `:heartbeat\n\n` |
| adr-0037:19 | "Heartbeat format: SSE comment `:heartbeat\n\n` every 15s" | server.ts:121 | IMPLEMENTED | — | Exact string `:heartbeat\n\n` encoded and enqueued |
| adr-0037:20 | "Implementation: `setInterval` in the `start()` callback, cleared in `cancel()` and on client removal" | server.ts:119-126, 128-135 | IMPLEMENTED | — | `setInterval` in `start()`; cleared in `cancel()` (line 130-133) and on controller-closed error (lines 123-125) |
| adr-0037:20 | "The interval must be per-connection" | server.ts:99-100 | IMPLEMENTED | — | `heartbeatInterval` declared in `handleSSE()` function scope — new variable per `handleSSE()` call |
| spec-dashboard:91 | "`writer` and `heartbeatInterval` are declared in the enclosing function scope so both `start` and `cancel` can reference the same values" | server.ts:99-100 | IMPLEMENTED | — | Both `let writer` and `let heartbeatInterval` declared at `handleSSE` scope, before `ReadableStream` constructor |
| spec-dashboard:92 | "`start()` creates a `setInterval` that enqueues `:heartbeat\n\n` (an SSE comment, ignored by `EventSource`) every 15 seconds" | server.ts:119-126 | IMPLEMENTED | — | Exact match; 15_000 ms interval |
| spec-dashboard:92 | "The interval is per-connection and cleared in `cancel()` and on controller-closed errors (ADR-0037)" | server.ts:119-135 | IMPLEMENTED | — | cancel() clears at lines 130-133; catch block in interval clears at lines 123-125 |
| spec-dashboard:93 | "Broadcast: iterates `clients`, writes `data: {...}\n\n`; removes writers that throw (dirty disconnect)" | server.ts:80-90 | IMPLEMENTED | — | `broadcast()` iterates `clients`, catches write errors, removes failing writers |
| spec-dashboard:94 | "Events: `{type:\"hello\"}` on connect; `{type:\"reindex\",changed:string[]}` on watcher callback" | server.ts:114, 186 | IMPLEMENTED | — | `hello` at line 114; `reindex` broadcast at line 186 |

---

### Phase 2 — Code → Spec

| File:lines | Classification | Explanation |
|------------|---------------|-------------|
| server.ts:1-14 | INFRA | Imports — necessary plumbing |
| server.ts:17-41 | INFRA | `parseArgs()` — CLI flag parsing, covered by spec CLI Flags section |
| server.ts:58-73 | INFRA | `buildStartupBanner()` — startup banner, covered by spec Runtime section |
| server.ts:77 | INFRA | `type Writer` + `clients` Set — SSE broker type and state, referenced by spec SSE Broker section |
| server.ts:80-90 | INFRA | `broadcast()` — covered by spec SSE Broker section |
| server.ts:92-146 | INFRA | `handleSSE()` — fully covered by spec SSE Broker section and ADR-0037 |
| server.ts:150-172 | INFRA | `handleStatic()` — covered by spec HTTP Endpoints static serving |
| server.ts:176-274 | INFRA | `main()` + entry guard — boot, server setup, graceful shutdown; covered by spec Runtime section |

All production code in server.ts is either spec-covered (SSE broker) or infrastructure for other spec'd behaviors. No dead or unspec'd code.

---

### Phase 3 — Test Coverage

| Spec (doc:line) | Spec text | Unit test | E2E test | Verdict |
|-----------------|-----------|-----------|----------|---------|
| adr-0037:19 | Heartbeat format `:heartbeat\n\n` every 15s | sse.test.ts:190-201 ("heartbeat comment uses SSE comment format") | none | UNIT_ONLY |
| adr-0037:20 | `cancel()` clears the interval | sse.test.ts:203-219 ("cancel() clears the interval so no more heartbeats are sent") | none | UNIT_ONLY |
| adr-0037:20 | Cleared on controller-closed errors (dirty disconnect) | sse.test.ts:221-234 ("heartbeat stops gracefully when controller is already closed") | none | UNIT_ONLY |
| adr-0037:20 | Interval is per-connection | sse.test.ts:236-254 ("heartbeat interval is independent per connection") | none | UNIT_ONLY |
| spec-dashboard:91 | `writer` and `heartbeatInterval` in enclosing scope | sse.test.ts:151-187 (createHeartbeatSession mirrors same scoping pattern) | none | UNIT_ONLY |
| spec-dashboard:93 | Dirty disconnect removal in broadcast | sse.test.ts:86-105 ("removes dirty client on write error") | none | UNIT_ONLY |
| spec-dashboard:94 | `hello` event on connect | sse.test.ts:39-51 ("sends hello event on connect") | none | UNIT_ONLY |
| spec-dashboard:94 | `reindex` event on watcher callback | sse.test.ts:53-73 ("broadcasts reindex event to all connected clients") | none | UNIT_ONLY |

No E2E tests exist for the SSE heartbeat behavior. All coverage is unit-only (in-process simulation without a real Bun HTTP server or real EventSource client).

---

### Phase 4 — Bug Triage

| Bug | Title | Verdict | Notes |
|-----|-------|---------|-------|
| — | No bugs in .agent/bugs/ for docs-dashboard | — | Directory scan found no matching bug files |

---

### Summary

- Implemented: 9
- Gap: 0
- Partial: 0
- Infra: 8
- Unspec'd: 0
- Dead: 0
- Tested: 0
- Unit only: 8
- E2E only: 0
- Untested: 0
- Bugs fixed: 0
- Bugs open: 0
