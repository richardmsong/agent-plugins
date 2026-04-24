# Spec Audit: docs-dashboard

**Component**: docs-dashboard  
**Component root**: src/sdd/docs-dashboard/  
**Spec**: src/sdd/docs/mclaude-docs-dashboard/spec-dashboard.md  
**ADRs evaluated**: ADR-0027, ADR-0028, ADR-0029, ADR-0030, ADR-0031, ADR-0032, ADR-0034, ADR-0035, ADR-0037, ADR-0039, ADR-0040, ADR-0041, ADR-0049 (accepted/implemented)  
**ADR-0049 status at time of audit**: accepted (not yet implemented)

## Run: 2026-04-24T00:00:00Z

### Phase 1 — Spec → Code

| Spec (doc:line) | Spec text | Code location | Verdict | Direction | Notes |
|-----------------|-----------|---------------|---------|-----------|-------|
| spec-dashboard.md:11 | Bun (loads `.ts` files natively; no build step). Entrypoint: `docs-dashboard/src/server.ts`. | server.ts:1-303, boot.ts:1-100 | IMPLEMENTED | | Bun runtime; server.ts is the entrypoint |
| spec-dashboard.md:13 | Boot step 1: `findRepoRoot(cwd)` — walks up from `process.cwd()` until a `.git` directory is found; exits non-zero if not found. | boot.ts:14-27, 55-61 | IMPLEMENTED | | `findRepoRoot` walks up; exits non-zero if null |
| spec-dashboard.md:14 | Boot step 2: Auto-build UI: if `ui/dist/index.html` does not exist, run `bun run build` in the `ui/` directory (ADR-0049). Log the build. On failure, log the error and continue — the API still works, and the SPA catch-all returns a build-failure fallback page. | server.ts:207-226 | GAP | CODE→FIX | Auto-build is implemented, but it happens **after** `boot()` (which calls `openDb`, `indexAllDocs`, `runLineageScan`, `runBlameScan`, `startWatcher` at lines 187-192). The spec places auto-build as step 2, before `openDb` (step 3). The ordering is wrong. |
| spec-dashboard.md:15 | Boot step 3: `openDb(resolvedDbPath)` — opens the shared SQLite index in WAL mode; path defaults to `<repoRoot>/.agent/.docs-index.db`, overridden by `--db-path`. | boot.ts:63-66 | IMPLEMENTED | | Correct path defaulting and `openDb` call |
| spec-dashboard.md:16 | Boot step 4: `indexAllDocs(db, resolvedDocsDir, repoRoot)` — populates the doc index. | boot.ts:73-78 | IMPLEMENTED | | Called with try/catch (non-fatal per spec) |
| spec-dashboard.md:17 | Boot step 5: `runLineageScan(db, repoRoot)` — populates lineage from `git log` (ADR-0029). | boot.ts:81-87 | IMPLEMENTED | | Called with try/catch (non-fatal per spec) |
| spec-dashboard.md:18 | Boot step 6: `runBlameScan(db, repoRoot, resolvedDocsDir)` — populates `blame_lines` from `git blame` (ADR-0040). Non-fatal on error. | boot.ts:89-95 | IMPLEMENTED | | Called with try/catch |
| spec-dashboard.md:19 | Boot step 7: `startWatcher(db, resolvedDocsDir, repoRoot, onReindex)` — watches `resolvedDocsDir` for changes; `onReindex` broadcasts SSE events. | boot.ts:97 | IMPLEMENTED | | |
| spec-dashboard.md:20 | Default port `4567`; overridden by `--port <n>`. | server.ts:22, 25-31 | IMPLEMENTED | | |
| spec-dashboard.md:21 | Binds to `0.0.0.0` (all interfaces, ADR-0028). | server.ts:229 | IMPLEMENTED | | `hostname: "0.0.0.0"` |
| spec-dashboard.md:22-27 | Startup banner: "Dashboard ready:\n  http://127.0.0.1:<port>/\n  http://<non-loopback-ipv4>:<port>/ (one per interface)" | server.ts:60-75, 295 | IMPLEMENTED | | `buildStartupBanner` function, called in main() |
| spec-dashboard.md:34 | `--port <n>` flag, default `4567`, fails fast if in use. | server.ts:19-31, 283-291 | IMPLEMENTED | | EADDRINUSE prints error and exits |
| spec-dashboard.md:35 | `--db-path <path>` flag, default `<repoRoot>/.agent/.docs-index.db`. | server.ts:33-35; boot.ts:63-64 | IMPLEMENTED | | |
| spec-dashboard.md:36 | `--docs-dir <path>` flag, default `<repoRoot>/docs`. Resolved relative to `cwd`; absolute paths accepted. (ADR-0032) | server.ts:36-39; boot.ts:69-70 | IMPLEMENTED | | |
| spec-dashboard.md:39-47 | Logic-Duplication Rule: imports from `docs-mcp/` subpaths (`openDb`, `indexAllDocs`, `runLineageScan`, `runBlameScan`, `startWatcher`, `listDocs`, `readRawDoc`, `getLineage`, `searchDocs`, `NotFoundError`). | boot.ts:4-8; routes.ts:2 | IMPLEMENTED | | All imports present |
| spec-dashboard.md:48 | HTTP handlers are thin wrappers: unmarshal parameters, call the function, JSON-encode the response. | routes.ts throughout | IMPLEMENTED | | |
| spec-dashboard.md:53 | `GET /api/adrs?status=<s>` — List ADRs, optional status filter. `listDocs({category:"adr", status:s})` | routes.ts:30-41 | IMPLEMENTED | | |
| spec-dashboard.md:54 | `GET /api/specs` — List specs. `listDocs({category:"spec"})` | routes.ts:47-49 | IMPLEMENTED | | |
| spec-dashboard.md:55 | `GET /api/doc?path=<p>` — Full doc: metadata + raw_markdown + sections. | routes.ts:55-91 | IMPLEMENTED | | |
| spec-dashboard.md:56 | `GET /api/lineage?doc=<p>[&heading=<h>]` — Co-committed sections. `heading` optional (ADR-0031): absent/empty → doc-level aggregation; present → section-level. | routes.ts:103-124 | IMPLEMENTED | | |
| spec-dashboard.md:57 | `GET /api/search?q=<q>&limit=<n>&category=<c>&status=<s>` — FTS search with snippets. | routes.ts:130-166 | IMPLEMENTED | | |
| spec-dashboard.md:58 | `GET /api/graph?focus=<p>` — Graph nodes + edges. Omit `focus` for global; provide for 1-hop local. | routes.ts:172-183; graph-queries.ts | IMPLEMENTED | | |
| spec-dashboard.md:59 | `GET /api/blame?doc=<p>[&since=<date>&ref=<branch>]` — Per-block blame+lineage data. Self-joins `blame_lines`. Optional `since`/`ref` for range-filtered blame. | routes.ts:210-288 | IMPLEMENTED | | |
| spec-dashboard.md:60 | `GET /api/diff?doc=<p>&commit=<hash>&line_start=<n>&line_end=<n>` — Unified diff hunk. `git show` + hunk extraction. | routes.ts:467-503 | IMPLEMENTED | | |
| spec-dashboard.md:61 | `GET /events` — SSE stream; `{type:"hello"}` on connect; `{type:"reindex",changed:[...]}` on watcher fires. | server.ts:94-148 | IMPLEMENTED | | |
| spec-dashboard.md:62 | `GET /` and `/assets/*` — Static SPA bundle from `ui/dist/`. | server.ts:154-174 | IMPLEMENTED | | |
| spec-dashboard.md:65-76 | `/api/doc` response shape: `{doc_path, title, category, status, commit_count, raw_markdown, sections}` | routes.ts:80-89 | IMPLEMENTED | | |
| spec-dashboard.md:79-86 | `/api/graph` response shape: `{nodes: [{path, title, category, status, commit_count}], edges: [{from, to, count, last_commit}]}` | graph-queries.ts:1-111 | IMPLEMENTED | | |
| spec-dashboard.md:89-109 | `/api/blame` response shape: `BlameBlock` with `{line_start, line_end, commit, author, date, summary, adrs:[{doc_path, title, status}]}` + `uncommitted_lines`. | routes.ts:186-199, 256-287 | IMPLEMENTED | | |
| spec-dashboard.md:110-112 | When `since` or `ref` provided, blame computed on demand via `git blame --since=<date>` or `git blame <ref> -- <file>`. | routes.ts:231-351 | IMPLEMENTED | | |
| spec-dashboard.md:115-119 | `/api/diff` response shape: `{diff: string}`. Runs `git show <commit> -- <file>` and extracts hunks overlapping line range. Returns empty string if commit doesn't touch those lines. | routes.ts:467-580 | IMPLEMENTED | | |
| spec-dashboard.md:125 | `/api/lineage` returns `LineageResult[]` (same shape as docs-mcp `get_lineage`). Doc mode (no heading): `heading = ""` per ADR-0031. | routes.ts:103-124 | IMPLEMENTED | | `getLineage` from docs-mcp/tools |
| spec-dashboard.md:129 | SSE Broker lives in `src/server.ts`. Manages a `Set<Writer>` of active client connections. | server.ts:79-80 | IMPLEMENTED | | |
| spec-dashboard.md:131 | Connect: `ReadableStream` with `start` (registers writer, sends `hello`) and `cancel` (removes writer). `writer` and `heartbeatInterval` declared in enclosing function scope so both can reference same values. | server.ts:101-138 | IMPLEMENTED | | |
| spec-dashboard.md:132 | Heartbeat: `start()` creates a `setInterval` that enqueues `:heartbeat\n\n` every 15 seconds. Interval is per-connection and cleared in `cancel()` and on controller-closed errors (ADR-0037). | server.ts:121-128, 132-135 | IMPLEMENTED | | |
| spec-dashboard.md:133 | Broadcast: iterates `clients`, writes `data: {...}\n\n`; removes writers that throw (dirty disconnect). | server.ts:82-92 | IMPLEMENTED | | |
| spec-dashboard.md:134 | Events: `{type:"hello"}` on connect; `{type:"reindex",changed:string[]}` on watcher callback. | server.ts:116, 188 | IMPLEMENTED | | |
| spec-dashboard.md:135 | Browser `EventSource` auto-reconnects; on reconnect receives `hello` and triggers full refetch. | App.tsx:88-92 | IMPLEMENTED | | `hello` event triggers `setLocation(parseHash())` |
| spec-dashboard.md:139 | Graph Queries: deliberate exception to logic-duplication rule; dashboard writes these queries directly. | graph-queries.ts:1-111 | IMPLEMENTED | | |
| spec-dashboard.md:141-149 | Global query: SELECT all docs as nodes; edges via MIN/MAX aggregation on doc pairs WHERE section_a_doc != section_b_doc. | graph-queries.ts:31-58 | IMPLEMENTED | | SQL matches spec exactly |
| spec-dashboard.md:152 | Local (`?focus=<p>`): 1-hop neighborhood. Two SQL statements, not N+1. | graph-queries.ts:70-111 | IMPLEMENTED | | |
| spec-dashboard.md:155 | LineagePopover collapses `LineageResult[]` by `doc_path` before rendering (ADR-0030). One row per co-committed document. `count = SUM(commit_count)`, `last_commit = MAX`. Sorted by collapsed `count` descending. | LineagePopover.tsx:39-91 | IMPLEMENTED | | |
| spec-dashboard.md:156 | Row click navigates to doc top (`#/adr/<slug>` or `#/spec/<path>`) without `§heading` anchor. | LineagePopover.tsx:255-259 | IMPLEMENTED | | |
| spec-dashboard.md:156 | Final row: "Open graph centered here" → `#/graph?focus=<doc_path>&section=<heading>` (section-level) or `#/graph?focus=<doc_path>` (doc-level, ADR-0031). | LineagePopover.tsx:217-219, 265-270 | IMPLEMENTED | | |
| spec-dashboard.md:158-160 | H1 lineage marker (ADR-0031): `≡` icon next to H1 on spec and ADR detail pages. Clicking/hovering calls `/api/lineage?doc=<p>` with no heading. Row format identical to H2. | AdrDetail.tsx:210; SpecDetail.tsx:202; LineagePopover.tsx:134-279 | IMPLEMENTED | | `heading={null}` = doc mode |
| spec-dashboard.md:163 | BlameGutter renders VS Code-style blame gutter on spec and ADR detail pages. Each annotation shows abbreviated commit hash (7 chars) and author name. | BlameGutter.tsx:47-49, 81-83 | IMPLEMENTED | | 7-char abbrev via `abbrev()` |
| spec-dashboard.md:164 | Consecutive rendered blocks attributed to same commit grouped into single annotation spanning those blocks. | BlameGutter.tsx:26-45 | IMPLEMENTED | | `groupConsecutiveBlocks()` |
| spec-dashboard.md:165 | Gutter is always visible when blame data is loaded. | AdrDetail.tsx:224-231; SpecDetail.tsx:216-223 | IMPLEMENTED | | Rendered when `blocks.length > 0` |
| spec-dashboard.md:166 | Hovering a gutter annotation highlights the corresponding block(s) and opens the `LineBlamePopover`. | AdrDetail.tsx:148-167; BlameGutter.tsx:78-79 | IMPLEMENTED | | |
| spec-dashboard.md:167-168 | When `BlameRangeFilter` active, only blocks within filtered range have gutter annotations; server-side: `/api/blame` returns only matching blocks. | routes.ts:231-351; BlameGutter.tsx render | IMPLEMENTED | | |
| spec-dashboard.md:171 | LineBlamePopover shows ADR lineage info for a rendered block on hover. Trigger: hover with ~300ms debounce. Hovered block gets subtle background highlight (`rgba(99,179,237,0.08)`). | AdrDetail.tsx:115-130; MarkdownView.tsx:243-250 | IMPLEMENTED | | 300ms debounce; HOVER_BG = rgba(99,179,237,0.08) |
| spec-dashboard.md:174 | Content: lists ADR(s) co-committed with the blame commit(s) for the block's source lines, each with title and status badge. Below: author name, date, commit summary. | LineBlamePopover.tsx:174-230 | IMPLEMENTED | | |
| spec-dashboard.md:175 | Uncommitted lines: if the block's source lines have no blame data (working copy), the popover shows a "(working copy)" label. Does not fetch section-level lineage rows. | LineBlamePopover.tsx:153-157, 166-169 | IMPLEMENTED | | |
| spec-dashboard.md:176 | Pin/dismiss: click pins the popover. Esc or outside-click unpins and dismisses. Same behavior as `LineagePopover`. | LineBlamePopover.tsx:78-96, 161-163 | IMPLEMENTED | | |
| spec-dashboard.md:177-178 | Inline diff: in pinned popover, each ADR/commit entry has expand toggle. Clicking fetches `GET /api/diff?...` and renders unified diff inline as plain text in `<pre>` block. | LineBlamePopover.tsx:98-135, 205-213 | IMPLEMENTED | | |
| spec-dashboard.md:181-183 | BlameRangeFilter dropdown at top of spec/ADR detail pages. Since date (passes `since=<ISO date>`), Branch comparison (passes `ref=<branch>`), Default "All time". | BlameRangeFilter.tsx:16-81 | IMPLEMENTED | | |
| spec-dashboard.md:185-188 | When filter changes, component refetches `/api/blame` with new params; gutter + popovers update. Lines not touched show no annotation and no popover. | AdrDetail.tsx:95-98; SpecDetail.tsx:88-91 | IMPLEMENTED | | `handleRangeChange` calls `loadBlame(range)` |
| spec-dashboard.md:191 | MarkdownView renders raw markdown to styled HTML using `marked` with custom renderer. Scoped by `.markdown-body` CSS class with dark-theme typography stylesheet. | MarkdownView.tsx:1-278; markdown-body.css:1-... | IMPLEMENTED | | |
| spec-dashboard.md:192-193 | Stylesheet uses descendant selectors scoped to `.markdown-body`. Theme colors: `#0d1117` bg, `#e2e8f0` text, `#63b3ed` links, `#2d3748` borders. (ADR-0039) | markdown-body.css | IMPLEMENTED | | |
| spec-dashboard.md:195 | Custom renderer: applies `highlight.js` to fenced code blocks. | MarkdownView.tsx:145-152 | IMPLEMENTED | | |
| spec-dashboard.md:196 | Rewrites relative `adr-*.md` and `spec-*.md` links to internal `#/adr/` and `#/spec/` hash routes. | MarkdownView.tsx:10-17, 155-161 | IMPLEMENTED | | |
| spec-dashboard.md:197 | Injects `LineagePopover` placeholders into H2 headings (hydrated after render via `createRoot`). | MarkdownView.tsx:163-173, 213-229 | IMPLEMENTED | | |
| spec-dashboard.md:198 | Emits `data-line-start` and `data-line-end` attributes on each rendered block element mapping to source line range. After render, attaches hover listeners that trigger `LineBlamePopover`. | MarkdownView.tsx:99-103, 130-141, 162-193, 234-254 | IMPLEMENTED | | |
| spec-dashboard.md:202 | Landing `#/` — ADRs bucketed by status (Drafts, Accepted, Implemented, Superseded, Withdrawn, Unspecified). Each bucket collapsible; all expanded by default (ADR-0035). Right column: specs grouped by directory. | Landing.tsx:19-36, 76, 101-126, 183-224 | IMPLEMENTED | | |
| spec-dashboard.md:203 | `#/adr/<slug>` — AdrDetail.tsx — Rendered ADR with status badge + history dates. H2 popovers. H1 lineage marker (ADR-0031). | AdrDetail.tsx | IMPLEMENTED | | |
| spec-dashboard.md:204 | `#/spec/<path>` — SpecDetail.tsx — Rendered spec. H2 popovers. H1 lineage marker (ADR-0031). | SpecDetail.tsx | IMPLEMENTED | | |
| spec-dashboard.md:205 | `#/search?q=<q>` — SearchResults.tsx — FTS5 results with snippets. | SearchResults.tsx | IMPLEMENTED | | |
| spec-dashboard.md:206 | `#/graph[?focus=<p>]` — Graph.tsx — Force-directed graph, global or 1-hop local mode. | Graph.tsx | IMPLEMENTED | | |
| spec-dashboard.md:210 | `.git` not found walking up from cwd → Print error and exit non-zero. | boot.ts:57-61 | IMPLEMENTED | | |
| spec-dashboard.md:211 | `.docs-index.db` missing or corrupt → `openDb` rebuilds; UI shows "Loading…" until index returns. | boot.ts:66; Landing.tsx:129 | IMPLEMENTED | | |
| spec-dashboard.md:212 | Schema version mismatch → `openDb` deletes and rebuilds; same flow. | boot.ts:66 (via docs-mcp/db) | IMPLEMENTED | | |
| spec-dashboard.md:213 | `fs.watch` throws → Fall back to polling every 5 s (handled in `docs-mcp/watcher.ts`). | boot.ts:97 (delegated to docs-mcp) | IMPLEMENTED | | |
| spec-dashboard.md:214 | Port in use → Fail fast: `Error: port <n> is in use. Use --port <n> or stop the other process.` | server.ts:283-291 | IMPLEMENTED | | |
| spec-dashboard.md:215 | `/api/doc` or `/api/lineage` unknown path → HTTP 404, JSON `{error:"not found",path}`. | routes.ts:18-20 | IMPLEMENTED | | |
| spec-dashboard.md:216 | FTS5 query syntax error → HTTP 400 with error message. | routes.ts:162-165 | IMPLEMENTED | | |
| spec-dashboard.md:217 | SSE disconnect → Browser auto-reconnects; `hello` triggers full refetch. | App.tsx:48, 88-92 | IMPLEMENTED | | |
| spec-dashboard.md:218 | Markdown parse error → Show raw source in `<pre>` with one-line warning. | MarkdownView.tsx:200-202 | IMPLEMENTED | | |
| spec-dashboard.md:219 | `indexAllDocs` throws during boot → Catch-and-log, non-fatal. | boot.ts:73-78 | IMPLEMENTED | | |
| spec-dashboard.md:220 | `runLineageScan` throws during boot → Catch-and-log, non-fatal. | boot.ts:81-87 | IMPLEMENTED | | |
| spec-dashboard.md:225 | Binds to `0.0.0.0` (ADR-0028); no authentication layer; no write endpoints in v1. | server.ts:229, no auth, GET only | IMPLEMENTED | | |
| spec-dashboard.md:226 | CORS: `Access-Control-Allow-Origin: *` | server.ts:145, routes.ts:7 | IMPLEMENTED | | |
| spec-dashboard.md:231 | `docs-mcp` (workspace) — all indexing, parsing, lineage, watching, and tool logic. | boot.ts:4-8, routes.ts:2 | IMPLEMENTED | | |
| spec-dashboard.md:232 | `bun:sqlite` — via `docs-mcp/db`. | boot.ts:1 | IMPLEMENTED | | |
| spec-dashboard.md:233 | Bun standard library — `fs`, `path`, `os`. | server.ts:1-4 | IMPLEMENTED | | |
| spec-dashboard.md:234 | UI: `react 18`, `react-force-graph-2d`, `marked`, `highlight.js`, `vite`. | ui/package.json (confirmed from imports) | IMPLEMENTED | | |
| ADR-0049:18-22 | Auto-build: `Bun.spawn(["bun", "run", "build"], { cwd: uiDir })`. On failure, log error and continue — serve placeholder as today. | server.ts:212-225 | GAP | CODE→FIX | Build command and failure handling are correct, but positioning in boot sequence is wrong: auto-build runs AFTER `boot()` (DB open + indexing + lineage scan + watcher). Per ADR-0049 and spec, step 2 should execute before step 3 (`openDb`). |

### Phase 2 — Code → Spec

| File:lines | Classification | Explanation |
|------------|---------------|-------------|
| server.ts:19-43 | INFRA | `parseArgs` function — argument parsing for `--port`, `--db-path`, `--docs-dir` flags; necessary plumbing for spec'd CLI flags |
| server.ts:47-75 | INFRA | `buildStartupBanner` helper — implements the spec'd startup banner format |
| server.ts:79-92 | INFRA | SSE broker types and `broadcast` function — implements spec'd SSE behavior |
| server.ts:152-174 | INFRA | `handleStatic` helper — implements spec'd static file serving and SPA fallback |
| server.ts:178-303 | INFRA | `main()` function — wires all boot steps together; `import.meta.main` guard is standard Bun pattern |
| server.ts:232-241 | INFRA | CORS preflight handler (`OPTIONS` method) — defensive HTTP infrastructure; implied by the CORS spec (Access-Control-Allow-Origin: *) |
| boot.ts:14-27 | INFRA | `findRepoRoot` helper — spec'd in Runtime section; necessary for boot |
| boot.ts:29-33 | INFRA | `BootResult` interface — TypeScript typing for the `boot()` return value; pure infrastructure |
| boot.ts:35-100 | INFRA | `boot()` function body — implements spec'd boot steps 1, 3-7 |
| routes.ts:1-9 | INFRA | Imports and shared helpers (`CORS_HEADERS`, `json`, `notFound`, `badRequest`) |
| routes.ts:185-199 | INFRA | `BlameBlock` interface in routes.ts — local TypeScript type for response shaping; aligns with spec's `/api/blame` response shape |
| routes.ts:292-430 | INFRA | `handleBlameOnDemand` + `parsePorcelainSimple` — implements on-demand blame parsing for `since`/`ref` params; spec'd behavior |
| routes.ts:434-458 | INFRA | `findUncommittedLines` — computes uncommitted line numbers; spec'd in `/api/blame` response: `uncommitted_lines` |
| routes.ts:506-580 | INFRA | `extractHunks` — extracts diff hunks overlapping requested line range; spec'd in `/api/diff` |
| graph-queries.ts:1-21 | INFRA | TypeScript interfaces (`GraphNode`, `GraphEdge`, `GraphResponse`) for graph query results |
| ui/src/api.ts:64-74 | INFRA | `get<T>()` helper — typed fetch wrapper with error propagation |
| ui/src/App.tsx:22-62 | INFRA | `useEventSource` hook — implements spec'd SSE auto-reconnect and hello-triggered refetch |
| ui/src/App.tsx:66-73 | INFRA | `parseHash` function — hash router; necessary infrastructure for the spec'd hash routes |
| ui/src/routes/Landing.tsx:38-47 | INFRA | `adrSlug`, `adrNumber`, `adrLabel` — ADR display label helpers (ADR-0034); spec'd "ADR-NNNN: title" format |
| ui/src/routes/Landing.tsx:56-69 | INFRA | `groupByDirectory` — spec'd "specs grouped by directory" in Landing |
| ui/src/components/LineagePopover.tsx:26-29 | INFRA | `docPathToHash` — converts doc path to hash route; required by the row-click navigation spec |
| ui/src/components/LineagePopover.tsx:107-122 | INFRA | `adrNumber`, `rowLabel` — ADR-0034 display format for lineage rows |
| ui/src/components/LineagePopover.tsx:124-132 | INFRA | `statusStyle` — visual styling for deprecated statuses; implied by spec |
| ui/src/components/BlameGutter.tsx:4-10 | INFRA | `GutterEntry` interface — TypeScript type; not exported externally but declared |
| ui/src/components/MarkdownView.tsx:19-46 | INFRA | `computeBlockLineRanges` + `BlockLineRange` — computes per-block line ranges from marked lexer; implements the `data-line-start`/`data-line-end` spec |
| ui/src/components/MarkdownView.tsx:48-75 | INFRA | `findBlameBlock`, `isRangeUncommitted` — helpers for matching blame blocks to rendered elements |
| ui/src/routes/Graph.tsx:29-53 | INFRA | `CATEGORY_COLORS`, `getNodeColor`, `getNodeRadius` — visual encoding for graph nodes; implied by the force-directed graph spec |
| server.ts:195-205 | INFRA | Graceful shutdown (`SIGINT`, `SIGTERM`) handlers — not spec'd explicitly but is standard server infrastructure |

### Phase 3 — Test Coverage

| Spec (doc:line) | Spec text | Unit test | E2E test | Verdict |
|-----------------|-----------|-----------|----------|---------|
| spec:13 | Boot step 1: `findRepoRoot` walks up from cwd, exits non-zero if not found | boot.test.ts (findRepoRoot suite) | none | UNIT_ONLY |
| spec:14 | Boot step 2: Auto-build UI if `ui/dist/index.html` missing | none | none | UNTESTED |
| spec:15-19 | Boot steps 3-7: openDb, indexAllDocs, runLineageScan, runBlameScan, startWatcher | boot-lineage.test.ts (runLineageScan); boot-docs-dir.test.ts (watcher docsDir) | none | UNIT_ONLY |
| spec:20 | Default port 4567 | boot-docs-dir.test.ts (parseArgs contract) | none | UNIT_ONLY |
| spec:22-27 | Startup banner format | server-banner.test.ts (full suite, 7 tests) | none | UNIT_ONLY |
| spec:53 | GET /api/adrs?status=<s> | routes.test.ts (handleAdrs suite) | none | UNIT_ONLY |
| spec:54 | GET /api/specs | routes.test.ts (handleSpecs suite) | none | UNIT_ONLY |
| spec:55 | GET /api/doc?path=<p> | routes.test.ts (handleDoc suite) | none | UNIT_ONLY |
| spec:56 | GET /api/lineage?doc=<p>[&heading=<h>] (incl. doc mode ADR-0031) | routes.test.ts (handleLineage suite, 5 tests) | none | UNIT_ONLY |
| spec:57 | GET /api/search | routes.test.ts (handleSearch suite) | none | UNIT_ONLY |
| spec:58 | GET /api/graph (global + local) | routes.test.ts + graph-queries.test.ts | none | UNIT_ONLY |
| spec:59 | GET /api/blame (cached + on-demand + self-join ADRs) | routes-blame.test.ts (handleBlame suite, 6 tests) | none | UNIT_ONLY |
| spec:60 | GET /api/diff | routes-blame.test.ts (handleDiff suite, 8 tests) | none | UNIT_ONLY |
| spec:61 | SSE /events — hello, reindex, heartbeat, dirty disconnect | sse.test.ts (full suite) | none | UNIT_ONLY |
| spec:62 | Static file serving + SPA fallback | none (handleStatic not directly tested) | none | UNTESTED |
| spec:129-135 | SSE Broker: Set<Writer>, broadcast, heartbeat | sse.test.ts | none | UNIT_ONLY |
| spec:141-149 | Graph global query SQL | graph-queries.test.ts (globalGraphQuery suite) | none | UNIT_ONLY |
| spec:152 | Graph local query SQL (1-hop, 2-query) | graph-queries.test.ts (localGraphQuery suite) | none | UNIT_ONLY |
| spec:155-156 | LineagePopover row collapse, sort, navigation | ui/__tests__/LineagePopover.test.tsx | none | UNIT_ONLY |
| spec:158-160 | H1 lineage marker (doc mode) | ui/__tests__/AdrDetail.test.tsx, SpecDetail.test.tsx | none | UNIT_ONLY |
| spec:163-168 | BlameGutter: 7-char hash, consecutive grouping, hover | ui/__tests__/BlameGutter.test.tsx | none | UNIT_ONLY |
| spec:171-178 | LineBlamePopover: hover, 300ms debounce, pin, esc, diff expand | ui/__tests__/LineBlamePopover.test.tsx | none | UNIT_ONLY |
| spec:181-188 | BlameRangeFilter: since, branch, all-time; refetch on change | ui/__tests__/BlameRangeFilter.test.tsx | none | UNIT_ONLY |
| spec:191-198 | MarkdownView: marked render, hljs, link rewriting, line attrs | ui/__tests__/MarkdownView.test.tsx | none | UNIT_ONLY |
| spec:202 | Landing: ADR buckets, all-expanded default, spec column | ui/__tests__/Landing.test.tsx | none | UNIT_ONLY |
| spec:203 | AdrDetail: status badge, H1 lineage, blame gutter | ui/__tests__/AdrDetail.test.tsx | none | UNIT_ONLY |
| spec:204 | SpecDetail: H1 lineage, blame gutter | ui/__tests__/SpecDetail.test.tsx | none | UNIT_ONLY |
| spec:205 | SearchResults: FTS snippets rendered | ui/__tests__/SearchBar.test.tsx | none | UNIT_ONLY |
| spec:206 | Graph: force-directed, local/global modes | ui/__tests__/Graph.test.tsx | none | UNIT_ONLY |

### Phase 4 — Bug Triage

No `.agent/bugs/` directory found in the repository. No open bugs to triage.

| Bug | Title | Verdict | Notes |
|-----|-------|---------|-------|
| — | No bugs on file | — | `.agent/bugs/` directory absent |

### Summary

- Implemented: 61
- Gap: 2
- Partial: 0
- Infra: 26
- Unspec'd: 0
- Dead: 0
- Tested: 0
- Unit only: 28
- E2E only: 0
- Untested: 2
- Bugs fixed: 0
- Bugs open: 0
