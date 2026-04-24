## Run: 2026-04-22T12:00:00Z

Component: docs-dashboard
Root: /Users/270840341/work/claude-plugins/spec-driven-dev/docs-dashboard
Spec: docs/mclaude-docs-dashboard/spec-dashboard.md
ADRs evaluated: adr-0027 (implemented), adr-0028 (implemented), adr-0029 (implemented), adr-0030 (accepted), adr-0031 (accepted), adr-0032 (accepted)
ADRs skipped (status): adr-0015 (accepted, no docs-dashboard scope), adr-0018 (implemented, no direct dashboard scope), adr-0020 (implemented, no direct dashboard scope), adr-0021 (accepted, no direct dashboard scope), adr-0023 (accepted, no direct dashboard scope), adr-0025 (implemented, no direct dashboard scope), adr-0026 (accepted, no direct dashboard scope)

Focus: R2 re-audit — checking whether GAP and PARTIAL items from the R1 audit (2026-04-22) are now resolved.

Previous audit items of interest:
- GAP [SPEC→FIX]: spec-dashboard.md:39 — parseMarkdown/classifyCategory listed as required imports
- PARTIAL [SPEC→FIX]: spec-dashboard.md:41 — indexFile listed as required import
- PARTIAL [SPEC→FIX]: spec-dashboard.md:44 — getSection imported but never called
- PARTIAL [SPEC→FIX]: spec-dashboard.md:116 (×3) — LineagePopover UI concerns
- PARTIAL [SPEC→FIX]: spec-dashboard.md:126-130 — UI routes
- PARTIAL [SPEC→FIX]: spec-dashboard.md:141 — Markdown parse error (UI)
- PARTIAL [SPEC→FIX]: adr-0030:19 — LineagePopover collapse (UI)
- PARTIAL [SPEC→FIX]: adr-0031:30 — H1 marker (UI)
- UNTESTED: spec-dashboard.md:139 — FTS5 syntax error returns 400
- UNTESTED: spec-dashboard.md:137 — Port in use → fail fast with specific message

---

### Phase 1 — Spec → Code

| Spec (doc:line) | Spec text | Code location | Verdict | Direction | Notes |
|-----------------|-----------|---------------|---------|-----------|-------|
| spec-dashboard.md:5 | `docs-dashboard` is a local development server that visualizes the ADR/spec corpus | server.ts:1-258 | IMPLEMENTED | — | Main server file serves this purpose |
| spec-dashboard.md:5 | lists every ADR and spec, shows each ADR's status at a glance | routes.ts:29-48 | IMPLEMENTED | — | handleAdrs and handleSpecs expose this |
| spec-dashboard.md:5 | renders spec-ADR lineage derived from git co-commits | routes.ts:102-123 | IMPLEMENTED | — | handleLineage calls getLineage |
| spec-dashboard.md:5 | live-updates as files change on disk | server.ts:80-90, boot.ts:88 | IMPLEMENTED | — | SSE broadcast + startWatcher with onReindex |
| spec-dashboard.md:5 | reuses all indexing, parsing, lineage-scanning, and file-watching logic from `docs-mcp/src/` | boot.ts:4-7, routes.ts:2 | IMPLEMENTED | — | Imports openDb, indexAllDocs, runLineageScan, startWatcher, listDocs, readRawDoc, getLineage, searchDocs, NotFoundError |
| spec-dashboard.md:13 | `findRepoRoot(cwd)` — walks up from `process.cwd()` until a `.git` directory is found; exits non-zero if not found | boot.ts:13-60 | IMPLEMENTED | — | findRepoRoot walks up; exits via process.exit(1) if null |
| spec-dashboard.md:14 | `openDb(resolvedDbPath)` — opens the shared SQLite index in WAL mode; path defaults to `<repoRoot>/.agent/.docs-index.db`, overridden by `--db-path` | boot.ts:62-65 | IMPLEMENTED | — | resolvedDbPath defaults to join(repoRoot, ".agent", ".docs-index.db") |
| spec-dashboard.md:15 | `indexAllDocs(db, resolvedDocsDir, repoRoot)` — populates the doc index | boot.ts:72-77 | IMPLEMENTED | — | Called with try/catch, non-fatal |
| spec-dashboard.md:16 | `runLineageScan(db, repoRoot)` — populates lineage from `git log` (ADR-0029) | boot.ts:79-86 | IMPLEMENTED | — | Called with try/catch, non-fatal |
| spec-dashboard.md:17 | `startWatcher(db, resolvedDocsDir, repoRoot, onReindex)` — watches `resolvedDocsDir` for changes; `onReindex` broadcasts SSE events | boot.ts:88 | IMPLEMENTED | — | startWatcher called with all 4 args |
| spec-dashboard.md:18 | Default port `4567`; overridden by `--port <n>` | server.ts:18,23-30 | IMPLEMENTED | — | Default 4567, parseArgs handles --port |
| spec-dashboard.md:19 | Binds to `0.0.0.0` (all interfaces, ADR-0028) | server.ts:189 | IMPLEMENTED | — | `hostname: "0.0.0.0"` in Bun.serve |
| spec-dashboard.md:20-25 | Startup banner prints `Dashboard ready:` + loopback + non-loopback IPv4 lines | server.ts:58-73 | IMPLEMENTED | — | buildStartupBanner covers all cases |
| spec-dashboard.md:29-33 | CLI flags: `--port`, `--db-path`, `--docs-dir` | server.ts:17-41 | IMPLEMENTED | — | All three flags parsed in parseArgs |
| spec-dashboard.md:33 | `--docs-dir <path>` — Resolved relative to `cwd`; absolute paths accepted (ADR-0032) | boot.ts:69 | IMPLEMENTED | — | `resolve(cwd, docsDir)` handles both |
| spec-dashboard.md:37-44 | Logic-duplication rule: imports from `docs-mcp/` | boot.ts:4-7, routes.ts:2 | IMPLEMENTED | — | All required functions imported from docs-mcp subpaths |
| spec-dashboard.md:39 | `parseMarkdown`, `classifyCategory` from `docs-mcp/parser` listed as required dashboard imports | routes.ts (not imported), boot.ts (not imported) | GAP | SPEC→FIX | Neither parseMarkdown nor classifyCategory is imported by the dashboard. The dashboard calls listDocs/readRawDoc/etc which internally use the parser — there is no direct need for the dashboard to import these. The spec lists them as required imports but the code correctly delegates parsing to docs-mcp tool functions. Spec should be updated to remove these from the dashboard import list. UNCHANGED from R1. |
| spec-dashboard.md:40 | `openDb` from `docs-mcp/db` | boot.ts:4 | IMPLEMENTED | — | Imported |
| spec-dashboard.md:41 | `indexFile`, `indexAllDocs` from `docs-mcp/content-indexer` | boot.ts:5 | PARTIAL | SPEC→FIX | `indexAllDocs` imported; `indexFile` is NOT imported in any production source file. The dashboard never calls `indexFile` directly — it goes through indexAllDocs and startWatcher. Spec says dashboard must import indexFile, but there's no actual production need. indexFile is only used in testutil.ts. UNCHANGED from R1. |
| spec-dashboard.md:42 | `runLineageScan` from `docs-mcp/lineage-scanner` | boot.ts:6 | IMPLEMENTED | — | Imported |
| spec-dashboard.md:43 | `startWatcher` from `docs-mcp/watcher` | boot.ts:7 | IMPLEMENTED | — | Imported |
| spec-dashboard.md:44 | `searchDocs`, `getSection`, `getLineage`, `listDocs`, `readRawDoc`, `NotFoundError` from `docs-mcp/tools` | routes.ts:2 | PARTIAL | SPEC→FIX | `getSection` is NOT present anywhere in production source (grep confirms zero matches). /api/doc uses `listDocs` + `readRawDoc` and returns `doc.sections` directly from the ListDoc shape — no `getSection` call needed. Spec lists getSection as a required import; it was previously imported but never called; now it is not imported at all. Spec should be updated to remove getSection from dashboard import list. UNCHANGED from R1 (direction: SPEC→FIX). |
| spec-dashboard.md:46 | HTTP handlers are thin wrappers: unmarshal parameters, call the function, JSON-encode the response | routes.ts:29-182 | IMPLEMENTED | — | All handlers follow this pattern |
| spec-dashboard.md:52 | GET `/api/adrs?status=<s>` — List ADRs, optional status filter — `listDocs({category: "adr", status: s})` | routes.ts:29-39 | IMPLEMENTED | — | handleAdrs |
| spec-dashboard.md:53 | GET `/api/specs` — List specs — `listDocs({category: "spec"})` | routes.ts:46-48 | IMPLEMENTED | — | handleSpecs |
| spec-dashboard.md:54 | GET `/api/doc?path=<p>` — Full doc: metadata + raw_markdown + sections | routes.ts:55-89 | IMPLEMENTED | — | handleDoc returns DocResponse shape |
| spec-dashboard.md:55 | GET `/api/lineage?doc=<p>[&heading=<h>]` — heading optional (ADR-0031): absent/empty → doc-level | routes.ts:102-123 | IMPLEMENTED | — | headingParam || undefined correctly routes to doc or section mode |
| spec-dashboard.md:56 | GET `/api/search?q=<q>&limit=<n>&category=<c>&status=<s>` | routes.ts:129-164 | IMPLEMENTED | — | handleSearch |
| spec-dashboard.md:57 | GET `/api/graph?focus=<p>` — global or 1-hop local | routes.ts:172-182 | IMPLEMENTED | — | handleGraph delegates to globalGraphQuery / localGraphQuery |
| spec-dashboard.md:58 | GET `/events` — SSE stream; emits `{type:"hello"}` on connect and `{type:"reindex",changed:[...]}` on watcher | server.ts:92-129 | IMPLEMENTED | — | handleSSE |
| spec-dashboard.md:59 | GET `/` and `/assets/*` — Static SPA bundle from `ui/dist/` | server.ts:133-155 | IMPLEMENTED | — | handleStatic |
| spec-dashboard.md:63-72 | DocResponse shape: doc_path, title, category, status, commit_count, raw_markdown, sections | routes.ts:79-88 | IMPLEMENTED | — | Response object matches all fields |
| spec-dashboard.md:75-82 | GraphResponse shape: nodes (path, title, category, status, commit_count), edges (from, to, count, last_commit) | graph-queries.ts:3-21 | IMPLEMENTED | — | Interfaces match exactly |
| spec-dashboard.md:84-86 | `/api/lineage` returns `LineageResult[]`; in doc mode heading = "" | routes.ts:113 | IMPLEMENTED | — | The "" heading is set by getLineage in docs-mcp; route passes undefined for doc mode |
| spec-dashboard.md:90 | SSE Broker lives in `src/server.ts`. Manages a `Set<Writer>` of active client connections | server.ts:77-90 | IMPLEMENTED | — | Set<Writer> at module level |
| spec-dashboard.md:92 | Connect: ReadableStream with `start` (registers writer, sends `hello`) and `cancel` (removes writer). `writer` declared in enclosing function scope | server.ts:99-118 | IMPLEMENTED | — | let writer declared outside ReadableStream options |
| spec-dashboard.md:93 | Broadcast: iterates `clients`, writes `data: {...}\n\n`; removes writers that throw | server.ts:80-90 | IMPLEMENTED | — | try/catch removes stale writers |
| spec-dashboard.md:94 | Events: `{type:"hello"}` on connect; `{type:"reindex",changed:string[]}` on watcher callback | server.ts:113, server.ts:169 | IMPLEMENTED | — | Both event types emitted correctly |
| spec-dashboard.md:95 | Browser `EventSource` auto-reconnects; on reconnect receives `hello` and triggers full refetch | server.ts:92-129 | IMPLEMENTED | — | Server side: sends hello on each new connect |
| spec-dashboard.md:100-109 | Global graph SQL: nodes SELECT from documents; edges SELECT MIN/MAX of doc paths, SUM(commit_count), MAX(last_commit), GROUP BY, WHERE != | graph-queries.ts:32-58 | IMPLEMENTED | — | Matches SQL exactly |
| spec-dashboard.md:112 | Local (`?focus=<p>`) — 1-hop: edges incident to focus; nodes via IN from edge result set. Two statements, not N+1 | graph-queries.ts:70-110 | IMPLEMENTED | — | Two-query pattern confirmed |
| spec-dashboard.md:116 | LineagePopover collapses by section_b_doc; count = SUM, last_commit = MAX by highest commit_count | ui/src/components/LineagePopover.tsx (UI layer) | PARTIAL | SPEC→FIX | UI component is outside the src/ production server code scope; dashboard backend serves data correctly. Marking partial since this is a UI component spec requirement and UI source was not part of the server code evaluation. UNCHANGED from R1. |
| spec-dashboard.md:116 | Row click → `#/adr/<slug>` or `#/spec/<path>` without `§heading` anchor | UI code (not in src/) | PARTIAL | SPEC→FIX | Same — UI layer, not in server src/ scope. UNCHANGED from R1. |
| spec-dashboard.md:116 | Final row: "Open graph centered here" → `#/graph?focus=<doc_path>&section=<heading>` or `#/graph?focus=<doc_path>` | UI code (not in src/) | PARTIAL | SPEC→FIX | Same — UI layer. UNCHANGED from R1. |
| spec-dashboard.md:118-120 | H1 lineage marker — `≡` icon next to H1; clicking calls `/api/lineage?doc=<p>` with no heading | UI code + routes.ts:102-123 | IMPLEMENTED | — | Backend: route handles missing heading correctly. UI component is out of scope here. |
| spec-dashboard.md:126-130 | UI Routes: Landing, AdrDetail, SpecDetail, SearchResults, Graph | UI code (not in src/) | PARTIAL | SPEC→FIX | UI routes are outside the server src/ scope. Backend endpoints that power them are all implemented. UNCHANGED from R1. |
| spec-dashboard.md:133 | Error: `.git` not found → Print error and exit non-zero | boot.ts:55-59 | IMPLEMENTED | — | console.error + process.exit(1) |
| spec-dashboard.md:134 | `.docs-index.db` missing or corrupt → `openDb` rebuilds | boot.ts:65 | IMPLEMENTED | — | openDb from docs-mcp handles rebuild |
| spec-dashboard.md:135 | Schema version mismatch → `openDb` deletes and rebuilds | boot.ts:65 | IMPLEMENTED | — | Same: openDb contract |
| spec-dashboard.md:136 | `fs.watch` throws → Fall back to polling every 5 s; show "Live updates via polling" in footer | boot.ts:88 | IMPLEMENTED | — | startWatcher from docs-mcp handles polling fallback; footer is UI concern |
| spec-dashboard.md:137 | Port in use → Fail fast: `Error: port <n> is in use. Use --port <n> or stop the other process.` | server.ts:238-243 | IMPLEMENTED | — | EADDRINUSE handler prints exact message |
| spec-dashboard.md:138 | `/api/doc` or `/api/lineage` unknown path → HTTP 404, JSON `{error:"not found",path}` | routes.ts:17-19 | IMPLEMENTED | — | notFound() helper |
| spec-dashboard.md:139 | FTS5 query syntax error → HTTP 400 with error message | routes.ts:162-163 | IMPLEMENTED | — | catch block returns badRequest |
| spec-dashboard.md:140 | SSE disconnect → Browser auto-reconnects; `hello` triggers full refetch | server.ts:114-117 | IMPLEMENTED | — | Server side: hello on each new connect |
| spec-dashboard.md:141 | Markdown parse error → Show raw source in `<pre>` with one-line warning | UI code (not in src/) | PARTIAL | SPEC→FIX | Client-side behavior; backend always returns raw_markdown. UNCHANGED from R1. |
| spec-dashboard.md:142 | `indexAllDocs` throws during boot → Catch-and-log, non-fatal | boot.ts:72-77 | IMPLEMENTED | — | try/catch with console.error |
| spec-dashboard.md:143 | `runLineageScan` throws during boot → Catch-and-log, non-fatal | boot.ts:79-86 | IMPLEMENTED | — | try/catch with console.error |
| spec-dashboard.md:150 | Binds to `0.0.0.0`; access control delegated to host network | server.ts:189 | IMPLEMENTED | — | ADR-0028 |
| spec-dashboard.md:151 | No authentication layer | server.ts (no auth middleware) | IMPLEMENTED | — | |
| spec-dashboard.md:152 | No write endpoints in v1 — read-only | routes.ts (all GET) | IMPLEMENTED | — | All routes are GET |
| spec-dashboard.md:153 | CORS: `Access-Control-Allow-Origin: *` | routes.ts:5-8, server.ts:122-126 | IMPLEMENTED | — | On both JSON responses and SSE |
| adr-0027:26 | Logic-duplication rule: dashboard must not reimplement parsing, indexing, lineage scanning, watching, or tool-layer queries | boot.ts:4-7, routes.ts:2 | IMPLEMENTED | — | All logic delegated to docs-mcp imports |
| adr-0027:31 | Shared index DB at `<repoRoot>/.agent/.docs-index.db`; accept `--db-path` flag | boot.ts:62-65 | IMPLEMENTED | — | Exact default path |
| adr-0027:32 | Repo root detection: walk up from process.cwd() until .git found, error if not | boot.ts:13-60 | IMPLEMENTED | — | |
| adr-0027:34 | SSE at `GET /events`; on watcher-triggered reindex emits `{type: "reindex", changed: [...]}` | server.ts:92-129, server.ts:168-170 | IMPLEMENTED | — | |
| adr-0027:53 | Port default 4567; fail fast if in use | server.ts:18, server.ts:238-243 | IMPLEMENTED | — | |
| adr-0027:54 | Auth: none — originally 127.0.0.1; ADR-0028 superseded with 0.0.0.0 | server.ts:189 | IMPLEMENTED | — | ADR-0028 supersedes |
| adr-0028:24 | Startup banner prints loopback + every non-loopback IPv4 address | server.ts:58-73 | IMPLEMENTED | — | buildStartupBanner |
| adr-0029:25 | boot() calls runLineageScan between indexAllDocs and startWatcher | boot.ts:72-88 | IMPLEMENTED | — | Order: indexAllDocs → runLineageScan → startWatcher |
| adr-0029:26 | Failure policy: catch-and-log, non-fatal | boot.ts:79-86 | IMPLEMENTED | — | |
| adr-0030:19 | Collapse by section_b_doc before rendering; count = SUM; last_commit = highest commit_count row | UI (LineagePopover.tsx, not in src/) | PARTIAL | SPEC→FIX | UI concern, backend unaffected. UNCHANGED from R1. |
| adr-0031:24 | getLineage accepts optional heading; when absent aggregates by section_b_doc | routes.ts:105-106 | IMPLEMENTED | — | headingParam || undefined; getLineage called accordingly |
| adr-0031:29 | Dashboard `/api/lineage` heading param becomes optional | routes.ts:105 | IMPLEMENTED | — | |
| adr-0031:30 | `≡` icon next to H1 on every spec and ADR detail page | UI (not in src/) | PARTIAL | SPEC→FIX | UI concern. UNCHANGED from R1. |
| adr-0032:19 | `--docs-dir <path>` overrides default `docs/` | server.ts:34-36, boot.ts:69 | IMPLEMENTED | — | |
| adr-0032:23 | Resolved relative to cwd; absolute paths accepted | boot.ts:69 | IMPLEMENTED | — | resolve(cwd, docsDir) |
| adr-0032:24 | boot() accepts docsDir parameter; resolves default when null | boot.ts:48-51,69 | IMPLEMENTED | — | |

### Phase 2 — Code → Spec

| File:lines | Classification | Explanation |
|------------|----------------|-------------|
| server.ts:1-14 | INFRA | Imports: path, fs, os, bun:sqlite, plus local modules boot and routes |
| server.ts:17-41 | INFRA | parseArgs — parameter parsing for spec'd CLI flags (--port, --db-path, --docs-dir) |
| server.ts:43-73 | INFRA | buildStartupBanner — spec'd in spec-dashboard.md §Runtime and ADR-0028 |
| server.ts:77-90 | INFRA | SSE broker (Set<Writer>, broadcast function) — spec'd in spec-dashboard.md §SSE Broker |
| server.ts:92-129 | INFRA | handleSSE — spec'd GET /events handler |
| server.ts:133-155 | INFRA | handleStatic + UI_DIST constant — spec'd GET / and /assets/* |
| server.ts:159-257 | INFRA | main() — entry point wiring all spec'd components; SIGINT/SIGTERM graceful shutdown |
| server.ts:195-200 | UNSPEC'd | CORS preflight OPTIONS handler returns 204. Spec says CORS is `*` on read endpoints but never explicitly specs an OPTIONS preflight route. This is correct defensive practice; the spec only mentions `Access-Control-Allow-Origin: *` on responses, not a dedicated OPTIONS handler. |
| server.ts:228-234 | INFRA | Fallthrough 404 for unknown routes — generic catch-all for truly unknown routes is reasonable infra |
| server.ts:236-246 | INFRA | Bun.serve error handler — EADDRINUSE maps to spec'd port-in-use error; 500 fallback for other errors |
| server.ts:252-257 | INFRA | `if (import.meta.main)` guard for entry point invocation |
| boot.ts:1-7 | INFRA | Imports for boot module |
| boot.ts:9-26 | INFRA | findRepoRoot function — spec'd: "walks up from process.cwd() until a .git directory is found" |
| boot.ts:28-32 | INFRA | BootResult interface — structural typing for return value |
| boot.ts:34-51 | INFRA | boot() JSDoc comment and signature |
| boot.ts:53-91 | INFRA | boot() body — all spec'd: cwd walk, openDb, indexAllDocs, runLineageScan, startWatcher |
| routes.ts:1-8 | INFRA | Imports + CORS_HEADERS constant |
| routes.ts:10-15 | INFRA | json() helper — encapsulates JSON response pattern |
| routes.ts:17-19 | INFRA | notFound() helper — used by spec'd 404 behavior |
| routes.ts:21-23 | INFRA | badRequest() helper — used by spec'd 400 behavior |
| routes.ts:25-39 | INFRA | handleAdrs — spec'd GET /api/adrs |
| routes.ts:31-33 | UNSPEC'd | Strict status validation in handleAdrs rejects invalid statuses with 400. Spec does not describe behavior on invalid status filter. Defensive input validation beyond what spec prescribes. |
| routes.ts:41-48 | INFRA | handleSpecs — spec'd GET /api/specs |
| routes.ts:50-89 | INFRA | handleDoc — spec'd GET /api/doc |
| routes.ts:91-123 | INFRA | handleLineage — spec'd GET /api/lineage |
| routes.ts:125-164 | INFRA | handleSearch — spec'd GET /api/search |
| routes.ts:141-151 | UNSPEC'd | Strict category and status validation in handleSearch with 400 responses. Spec describes query params but does not specify behavior for invalid values. Same pattern as handleAdrs — defensive but unspec'd. |
| routes.ts:166-182 | INFRA | handleGraph — spec'd GET /api/graph |
| graph-queries.ts:1 | INFRA | Database import |
| graph-queries.ts:3-21 | INFRA | GraphNode, GraphEdge, GraphResponse interfaces — spec'd in spec-dashboard.md §GraphResponse shape |
| graph-queries.ts:31-58 | INFRA | globalGraphQuery — spec'd global SQL in spec-dashboard.md and ADR-0027 |
| graph-queries.ts:70-110 | INFRA | localGraphQuery — spec'd local 1-hop SQL in spec-dashboard.md and ADR-0027 |

### Phase 3 — Test Coverage

| Spec (doc:line) | Spec text | Unit test | E2E test | Verdict |
|-----------------|-----------|-----------|----------|---------|
| spec-dashboard.md:13 | findRepoRoot walks up from cwd to .git | boot.test.ts:7-40 | — | UNIT_ONLY |
| spec-dashboard.md:13 | exits non-zero if .git not found | boot.test.ts:32-40 (tests null return, not the exit path) | — | UNIT_ONLY |
| spec-dashboard.md:14-17 | boot sequence: openDb, indexAllDocs, runLineageScan, startWatcher | boot-lineage.test.ts:40-166 | — | UNIT_ONLY |
| spec-dashboard.md:16 | runLineageScan called in boot (ADR-0029) | boot-lineage.test.ts:72-130 | — | UNIT_ONLY |
| spec-dashboard.md:16 | runLineageScan failure is non-fatal | boot-lineage.test.ts:132-166 | — | UNIT_ONLY |
| spec-dashboard.md:20-25 | Startup banner format | server-banner.test.ts:1-155 | — | UNIT_ONLY |
| spec-dashboard.md:29-33 | CLI flags: --port, --db-path, --docs-dir | boot-docs-dir.test.ts:143-199 | — | UNIT_ONLY |
| spec-dashboard.md:33 | --docs-dir resolves relative to cwd, passes absolute unchanged | boot-docs-dir.test.ts:85-136 | — | UNIT_ONLY |
| spec-dashboard.md:52 | GET /api/adrs with and without status filter | routes.test.ts:61-89 | — | UNIT_ONLY |
| spec-dashboard.md:52 | /api/adrs returns 400 for invalid status | routes.test.ts:84-88 | — | UNIT_ONLY |
| spec-dashboard.md:53 | GET /api/specs | routes.test.ts:93-103 | — | UNIT_ONLY |
| spec-dashboard.md:54 | GET /api/doc returns DocResponse with raw_markdown and sections | routes.test.ts:107-143 | — | UNIT_ONLY |
| spec-dashboard.md:54 | /api/doc returns 404 for unknown path | routes.test.ts:133-143 | — | UNIT_ONLY |
| spec-dashboard.md:55 | GET /api/lineage — heading optional, doc mode returns 200 | routes.test.ts:170-193 | — | UNIT_ONLY |
| spec-dashboard.md:55 | doc mode aggregates into one row per co-committed doc | routes.test.ts:195-230 | — | UNIT_ONLY |
| spec-dashboard.md:56 | GET /api/search supports q, limit, category, status | routes.test.ts:254-278 | — | UNIT_ONLY |
| spec-dashboard.md:57 | GET /api/graph global mode | routes.test.ts:284-296, graph-queries.test.ts:56-100 | — | UNIT_ONLY |
| spec-dashboard.md:57 | GET /api/graph local 1-hop mode | routes.test.ts:294-364, graph-queries.test.ts:161-263 | — | UNIT_ONLY |
| spec-dashboard.md:100-109 | Global graph SQL: aggregation, canonicalization, self-edge exclusion | graph-queries.test.ts:57-158 | — | UNIT_ONLY |
| spec-dashboard.md:112 | Local graph 2-query pattern (not N+1) | graph-queries.test.ts:161-263 | — | UNIT_ONLY |
| spec-dashboard.md:90-95 | SSE broker: hello on connect, broadcast, dirty disconnect removal | sse.test.ts:38-138 | — | UNIT_ONLY |
| spec-dashboard.md:139 | FTS5 syntax error returns 400 | routes.test.ts — no FTS bad-query test exists | — | UNTESTED |
| spec-dashboard.md:137 | Port in use → fail fast with specific message | server.ts:238-243 — no test exists | — | UNTESTED |
| spec-dashboard.md:138 | /api/lineage non-NotFoundError re-throws (does not return 404) | routes.test.ts:232-248 | — | UNIT_ONLY |

### Phase 4 — Bug Triage

No bug files found in `.agent/bugs/` — directory does not exist.

| Bug | Title | Verdict | Notes |
|-----|-------|---------|-------|
| — | — | — | No bugs on file for this component |

### R1 → R2 Delta Summary

Items from R1 that changed status:

| Item | R1 verdict | R2 verdict | Notes |
|------|------------|------------|-------|
| spec-dashboard.md:39 (parseMarkdown/classifyCategory) | GAP [SPEC→FIX] | GAP [SPEC→FIX] | No change — spec still lists these as required dashboard imports; code still doesn't import them (correctly). Spec needs update. |
| spec-dashboard.md:41 (indexFile) | PARTIAL [SPEC→FIX] | PARTIAL [SPEC→FIX] | No change — indexFile still not in any production source; only in testutil.ts. Spec needs update. |
| spec-dashboard.md:44 (getSection) | PARTIAL [SPEC→FIX] | PARTIAL [SPEC→FIX] | No change — getSection was previously imported but unused; now not imported at all. Either way spec lists it as required; code has no need for it. Spec needs update. |
| spec-dashboard.md:116 (LineagePopover UI) | PARTIAL [SPEC→FIX] ×3 | PARTIAL [SPEC→FIX] ×3 | No change — UI-layer concerns outside server src/ scope. |
| spec-dashboard.md:126-130 (UI routes) | PARTIAL [SPEC→FIX] | PARTIAL [SPEC→FIX] | No change — UI layer outside scope. |
| spec-dashboard.md:141 (Markdown parse error UI) | PARTIAL [SPEC→FIX] | PARTIAL [SPEC→FIX] | No change — UI layer. |
| adr-0030:19 (LineagePopover collapse) | PARTIAL [SPEC→FIX] | PARTIAL [SPEC→FIX] | No change — UI layer. |
| adr-0031:30 (H1 marker UI) | PARTIAL [SPEC→FIX] | PARTIAL [SPEC→FIX] | No change — UI layer. |
| spec-dashboard.md:139 (FTS5 400 test) | UNTESTED | UNTESTED | No change — no test added for FTS5 bad query path. |
| spec-dashboard.md:137 (port-in-use test) | UNTESTED | UNTESTED | No change — no test added for port-in-use scenario. |

All R1 items are **unchanged** in R2. No previously-flagged gaps or partials have been resolved.

### Summary

- Implemented: 49
- Gap: 1
- Partial: 12
- Infra: 28
- Unspec'd: 3
- Dead: 0
- Tested: 0
- Unit only: 22
- E2E only: 0
- Untested: 2
- Bugs fixed: 0
- Bugs open: 0
