# Spec Audit: docs-dashboard (r2)

**Component**: docs-dashboard  
**Component root**: src/sdd/docs-dashboard/  
**Spec**: src/sdd/docs/mclaude-docs-dashboard/spec-dashboard.md  
**ADRs evaluated**: ADR-0027, ADR-0028, ADR-0029, ADR-0030, ADR-0031, ADR-0032, ADR-0034, ADR-0035, ADR-0037, ADR-0038, ADR-0039, ADR-0040, ADR-0041, ADR-0042, ADR-0049, ADR-0050  
**Focus**: ADR-0049 (auto-build UI) and ADR-0050 (unified docsRoot) — verifying both are now implemented  
**Previous audit**: src/sdd/docs/audits/spec-docs-dashboard-2026-04-24.md

## Run: 2026-04-24T12:00:00Z

### Phase 1 — Spec → Code

| Spec (doc:line) | Spec text | Code location | Verdict | Direction | Notes |
|-----------------|-----------|---------------|---------|-----------|-------|
| spec-dashboard.md:11 | Bun (loads `.ts` files natively; no build step). Entrypoint: `docs-dashboard/src/server.ts`. | server.ts:1-307 | IMPLEMENTED | | Bun runtime; server.ts is the entrypoint |
| spec-dashboard.md:13 | Boot step 1: Resolve **docsRoot** via the same priority chain as docs-mcp (ADR-0050): `resolveDocsRoot(--root, CLAUDE_PROJECT_DIR, cwd)`. Import `resolveDocsRoot` from `docs-mcp/src/resolve-docs-root.ts`. The docs directory is `<docsRoot>/docs/`. | server.ts:5, 184; boot.ts:70 | IMPLEMENTED | | `resolveDocsRoot` imported from `docs-mcp/resolve-docs-root`; `docsDir = join(docsRoot, "docs")` |
| spec-dashboard.md:14 | Boot step 2: Discover **gitRoot** by calling `findGitRoot(docsRoot)` — walks up from docsRoot to find `.git`. If not found, lineage scanning is skipped. | boot.ts:14-32, 58-63 | PARTIAL | SPEC→FIX | `findGitRoot` is implemented and called with `docsRoot`. However, it executes *inside* `boot()` which is called *after* the auto-build check (step 3 per spec). Spec steps 2 and 3 are ordered 2→3 in the spec but 3→2 in the code. The functional impact is zero (auto-build doesn't need gitRoot), so the code's ordering is pragmatically sound and the spec should reorder to match. |
| spec-dashboard.md:15 | Boot step 3: Auto-build UI: if `ui/dist/index.html` does not exist, run `bun run build` in the `ui/` directory (ADR-0049). Log the build. On failure, log the error and continue — the API still works, and the SPA catch-all returns a build-failure fallback page. | server.ts:187-205 | IMPLEMENTED | | Auto-build runs before `boot()` (before openDb/indexing). `Bun.spawn(["bun", "run", "build"])`, exit code checked, error logged and continued. Fallback page at server.ts:171-174. |
| spec-dashboard.md:16 | Boot step 4: `openDb(resolvedDbPath)` — opens the shared SQLite index in WAL mode; path defaults to `<docsRoot>/.agent/.docs-index.db`, overridden by `--db-path`. | boot.ts:65-68 | IMPLEMENTED | | `dbPath ?? join(docsRoot, ".agent", ".docs-index.db")` matches ADR-0050 default |
| spec-dashboard.md:17 | Boot step 5: `indexAllDocs(db, docsDir, gitRoot)` — populates the doc index. | boot.ts:73-78 | IMPLEMENTED | | Called with try/catch (non-fatal per spec) |
| spec-dashboard.md:18 | Boot step 6: `runLineageScan(db, gitRoot)` — populates lineage from `git log` (ADR-0029). | boot.ts:82-87 | PARTIAL | SPEC→FIX | Code calls `runLineageScan(db, gitRoot, docsDir)` with three arguments. The real function signature in docs-mcp is `(db, repoRoot, docsDir)`. The spec omits the third argument `docsDir`. Code is correct; spec text needs updating to `runLineageScan(db, gitRoot, docsDir)`. |
| spec-dashboard.md:19 | Boot step 7: `runBlameScan(db, gitRoot, docsDir)` — populates `blame_lines` from `git blame` (ADR-0040). Non-fatal on error. | boot.ts:90-95 | IMPLEMENTED | | Called with try/catch |
| spec-dashboard.md:20 | Boot step 8: `startWatcher(db, docsDir, gitRoot, onReindex)` — watches docsDir for changes; `onReindex` broadcasts SSE events. | boot.ts:97 | IMPLEMENTED | | |
| spec-dashboard.md:21 | Default port `4567`; overridden by `--port <n>`. | server.ts:21, 26-32 | IMPLEMENTED | | |
| spec-dashboard.md:22 | Binds to `0.0.0.0` (all interfaces, ADR-0028) — reachable from Tailnet peers. | server.ts:233 | IMPLEMENTED | | `hostname: "0.0.0.0"` |
| spec-dashboard.md:23-28 | Startup banner: "Dashboard ready:\n  http://127.0.0.1:<port>/\n  http://<non-loopback-ipv4>:<port>/ (one per interface)" | server.ts:61-76, 299 | IMPLEMENTED | | `buildStartupBanner` function, called in `main()` |
| spec-dashboard.md:34 | `--port <n>` flag, default `4567`, fails fast if in use. | server.ts:21, 26-32, 287-295 | IMPLEMENTED | | EADDRINUSE prints error and exits |
| spec-dashboard.md:35 | `--root <dir>` flag — Docs root — parent of `docs/`. Resolved via `resolveDocsRoot(--root, CLAUDE_PROJECT_DIR, cwd)` (ADR-0050). | server.ts:37-39, 184 | IMPLEMENTED | | `--root` flag parsed; passed to `resolveDocsRoot` |
| spec-dashboard.md:36 | `--db-path <path>` flag, default `<docsRoot>/.agent/.docs-index.db`. | server.ts:34-36; boot.ts:65-66 | IMPLEMENTED | | Matches ADR-0050 |
| spec-dashboard.md:40-47 | Logic-Duplication Rule: imports from `docs-mcp/` subpaths (`openDb`, `indexAllDocs`, `runLineageScan`, `runBlameScan`, `startWatcher`, `listDocs`, `readRawDoc`, `getLineage`, `searchDocs`, `NotFoundError`). | boot.ts:4-8; routes.ts:2 | IMPLEMENTED | | All imports present |
| spec-dashboard.md:48 | HTTP handlers are thin wrappers: unmarshal parameters, call the function, JSON-encode the response. | routes.ts throughout | IMPLEMENTED | | |
| spec-dashboard.md:53 | `GET /api/adrs?status=<s>` — `listDocs({category:"adr", status:s})` | routes.ts:30-41 | IMPLEMENTED | | |
| spec-dashboard.md:54 | `GET /api/specs` — `listDocs({category:"spec"})` | routes.ts:47-49 | IMPLEMENTED | | |
| spec-dashboard.md:55 | `GET /api/doc?path=<p>` — Full doc: metadata + raw_markdown + sections. | routes.ts:55-91 | IMPLEMENTED | | |
| spec-dashboard.md:56 | `GET /api/lineage?doc=<p>[&heading=<h>]` — heading absent/empty → doc-level; present → section-level. | routes.ts:103-124 | IMPLEMENTED | | |
| spec-dashboard.md:57 | `GET /api/search?q=<q>&limit=<n>&category=<c>&status=<s>` | routes.ts:130-166 | IMPLEMENTED | | |
| spec-dashboard.md:58 | `GET /api/graph?focus=<p>` — global or 1-hop local. | routes.ts:172-183; graph-queries.ts | IMPLEMENTED | | |
| spec-dashboard.md:59 | `GET /api/blame?doc=<p>[&since=<date>&ref=<branch>]` | routes.ts:210-288 | IMPLEMENTED | | |
| spec-dashboard.md:60 | `GET /api/diff?doc=<p>&commit=<hash>&line_start=<n>&line_end=<n>` | routes.ts:467-503 | IMPLEMENTED | | |
| spec-dashboard.md:61 | `GET /events` — SSE stream; `{type:"hello"}` on connect; `{type:"reindex",changed:[...]}` on watcher fires. | server.ts:95-148 | IMPLEMENTED | | |
| spec-dashboard.md:62 | `GET /` and `/assets/*` — Static SPA bundle from `ui/dist/`. | server.ts:154-175 | IMPLEMENTED | | |
| spec-dashboard.md:65-76 | `/api/doc` response shape: `{doc_path, title, category, status, commit_count, raw_markdown, sections}` | routes.ts:80-89 | IMPLEMENTED | | |
| spec-dashboard.md:79-86 | `/api/graph` response shape: `{nodes, edges}` | graph-queries.ts:1-111 | IMPLEMENTED | | |
| spec-dashboard.md:89-109 | `/api/blame` response shape: `BlameBlock[]` + `uncommitted_lines` | routes.ts:186-199, 256-287 | IMPLEMENTED | | |
| spec-dashboard.md:110-112 | When `since` or `ref` provided, blame computed on demand via `git blame --since=<date>` or `git blame <ref> -- <file>`. | routes.ts:231-351 | IMPLEMENTED | | |
| spec-dashboard.md:115-119 | `/api/diff` response shape `{diff: string}`. Hunks overlapping line range; empty string if no match. | routes.ts:467-580 | IMPLEMENTED | | |
| spec-dashboard.md:125 | `/api/lineage` returns `LineageResult[]`. Doc mode (no heading): `heading = ""` per ADR-0031. | routes.ts:103-124 | IMPLEMENTED | | |
| spec-dashboard.md:129-136 | SSE Broker: `Set<Writer>`, `start`/`cancel`, writer+heartbeatInterval in enclosing scope, 15s heartbeat, broadcast, dirty disconnect removal. | server.ts:79-148 | IMPLEMENTED | | |
| spec-dashboard.md:139 | Graph Queries deliberate exception to logic-duplication rule; dashboard writes queries directly. | graph-queries.ts:1-111 | IMPLEMENTED | | |
| spec-dashboard.md:141-149 | Global graph query: nodes = all docs; edges = MIN/MAX aggregation, section_a_doc != section_b_doc. | graph-queries.ts:31-58 | IMPLEMENTED | | |
| spec-dashboard.md:152 | Local query (`?focus=<p>`): 1-hop neighborhood, two SQL statements. | graph-queries.ts:70-111 | IMPLEMENTED | | |
| spec-dashboard.md:155-156 | LineagePopover: collapses by `doc_path`, count = SUM, last_commit = MAX proxy, sorted desc, row click navigates to doc top. | LineagePopover.tsx:39-91, 255-259 | IMPLEMENTED | | |
| spec-dashboard.md:156 | Final row: "Open graph centered here" → `#/graph?focus=...` | LineagePopover.tsx:217-219, 265-270 | IMPLEMENTED | | |
| spec-dashboard.md:158-160 | H1 lineage marker (≡ icon) on spec and ADR detail pages, doc-level call. | AdrDetail.tsx:210; SpecDetail.tsx:202 | IMPLEMENTED | | |
| spec-dashboard.md:163-168 | BlameGutter: 7-char hash, consecutive grouping, hover triggers LineBlamePopover, range filter server-side. | BlameGutter.tsx:26-83 | IMPLEMENTED | | |
| spec-dashboard.md:171-178 | LineBlamePopover: 300ms debounce, highlight rgba(99,179,237,0.08), ADR list + author/date/summary, working-copy label, pin/dismiss, inline diff expand. | LineBlamePopover.tsx:78-230 | IMPLEMENTED | | |
| spec-dashboard.md:181-188 | BlameRangeFilter: since/branch/all-time dropdown; refetch on change; excluded lines show no annotation. | BlameRangeFilter.tsx:16-81; AdrDetail.tsx:95-98 | IMPLEMENTED | | |
| spec-dashboard.md:191-198 | MarkdownView: marked + custom renderer, .markdown-body scoped CSS, hljs, link rewriting, H2 LineagePopover injection, data-line-start/end attributes, hover → LineBlamePopover. | MarkdownView.tsx:1-278; markdown-body.css | IMPLEMENTED | | |
| spec-dashboard.md:202 | Landing: ADR buckets by status, all expanded by default, specs grouped by directory. | Landing.tsx:19-36, 76, 101-126, 183-224 | IMPLEMENTED | | |
| spec-dashboard.md:203 | `#/adr/<slug>` — AdrDetail with status badge, history dates, H2 popovers, H1 lineage marker. | AdrDetail.tsx | IMPLEMENTED | | |
| spec-dashboard.md:204 | `#/spec/<path>` — SpecDetail with H2 popovers, H1 lineage marker. | SpecDetail.tsx | IMPLEMENTED | | |
| spec-dashboard.md:205 | `#/search?q=<q>` — SearchResults FTS5 with snippets. | SearchResults.tsx | IMPLEMENTED | | |
| spec-dashboard.md:206 | `#/graph[?focus=<p>]` — force-directed graph, global or 1-hop local. | Graph.tsx | IMPLEMENTED | | |
| spec-dashboard.md:215 | `.git` not found walking up from cwd → Print error and exit non-zero. | boot.ts:59-63 | PARTIAL | SPEC→FIX | Code does `console.warn` and continues (lineage disabled gracefully). Spec line 14 says "lineage scanning is skipped" — consistent with the code. Error table at line 215 contradicts by saying "exit non-zero." ADR-0038 and ADR-0050 both specify graceful degradation. Error table row should be updated to match line 14 and ADR-0038. |
| spec-dashboard.md:216 | `.docs-index.db` missing or corrupt → `openDb` rebuilds. | boot.ts:68 (via docs-mcp/db) | IMPLEMENTED | | |
| spec-dashboard.md:217 | Schema version mismatch → `openDb` deletes and rebuilds. | boot.ts:68 (via docs-mcp/db) | IMPLEMENTED | | |
| spec-dashboard.md:218 | `fs.watch` throws → Fall back to polling every 5 s. | boot.ts:97 (delegated to docs-mcp) | IMPLEMENTED | | |
| spec-dashboard.md:219 | Port in use → Fail fast: `Error: port <n> is in use…` | server.ts:287-295 | IMPLEMENTED | | |
| spec-dashboard.md:220 | `/api/doc` or `/api/lineage` unknown path → HTTP 404, JSON `{error:"not found",path}`. | routes.ts:18-20 | IMPLEMENTED | | |
| spec-dashboard.md:221 | FTS5 query syntax error → HTTP 400 with error message. | routes.ts:162-165 | IMPLEMENTED | | |
| spec-dashboard.md:222 | SSE disconnect → Browser auto-reconnects; `hello` triggers full refetch. | App.tsx:88-92 | IMPLEMENTED | | |
| spec-dashboard.md:223 | Markdown parse error → Show raw source in `<pre>` with one-line warning. | MarkdownView.tsx:200-202 | IMPLEMENTED | | |
| spec-dashboard.md:224 | `indexAllDocs` throws during boot → Catch-and-log, non-fatal. | boot.ts:73-78 | IMPLEMENTED | | |
| spec-dashboard.md:225 | `runLineageScan` throws during boot → Catch-and-log, non-fatal. | boot.ts:82-87 | IMPLEMENTED | | |
| spec-dashboard.md:229 | Binds to `0.0.0.0`; no auth; no write endpoints. | server.ts:233; routes (GET only) | IMPLEMENTED | | |
| spec-dashboard.md:230 | CORS: `Access-Control-Allow-Origin: *` | server.ts:146; routes.ts:7 | IMPLEMENTED | | |
| spec-dashboard.md:236-239 | Dependencies: `docs-mcp` workspace, `bun:sqlite`, Bun stdlib (`fs`, `path`, `os`), UI (`react 18`, `react-force-graph-2d`, `marked`, `highlight.js`, `vite`). | boot.ts:4-8; routes.ts:2; server.ts:1-4; ui/package.json | IMPLEMENTED | | |
| ADR-0049 Decisions | Auto-build check: `Bun.spawn(["bun", "run", "build"], { cwd: uiDir })`. On failure log and continue. | server.ts:191-204 | IMPLEMENTED | | Command and failure semantics exactly match ADR-0049 decisions table |
| ADR-0050 Decisions | `resolveDocsRoot` imported from docs-mcp; `--root` replaces `--docs-dir`; DB default `<docsRoot>/.agent/.docs-index.db`; `findGitRoot(docsRoot)`. | server.ts:5, 37-39, 184; boot.ts:14-32, 58, 65-66 | IMPLEMENTED | | All four ADR-0050 decisions implemented |

### Phase 2 — Code → Spec

| File:lines | Classification | Explanation |
|------------|---------------|-------------|
| server.ts:1-16 | INFRA | Imports — `path`, `fs`, `os`, `bun:sqlite`, `resolveDocsRoot`, `boot`, and route handlers |
| server.ts:19-44 | INFRA | `parseArgs` function — parses `--port`, `--db-path`, `--root` flags; necessary plumbing for spec'd CLI flags |
| server.ts:47-76 | INFRA | `buildStartupBanner` helper — implements spec'd startup banner format |
| server.ts:79-93 | INFRA | SSE broker types (`Writer`) and `broadcast` function — implements spec'd SSE behavior |
| server.ts:95-148 | INFRA | `handleSSE()` — implements SSE endpoint with heartbeat and cancel |
| server.ts:153-175 | INFRA | `handleStatic` helper — implements spec'd static file serving and SPA fallback (including build-failure fallback page) |
| server.ts:179-307 | INFRA | `main()` — wires boot steps 1→3→4+; `import.meta.main` guard is standard Bun pattern |
| server.ts:220-230 | INFRA | Graceful shutdown (`SIGINT`, `SIGTERM`) handlers — not spec'd explicitly but standard server infrastructure |
| server.ts:238-244 | INFRA | CORS preflight (`OPTIONS`) handler — defensive HTTP infrastructure implied by CORS spec |
| boot.ts:1-8 | INFRA | Imports for boot functions |
| boot.ts:10-32 | INFRA | `findGitRoot` helper — spec'd in Runtime boot step 2; walks up from docsRoot |
| boot.ts:34-38 | INFRA | `BootResult` interface — TypeScript typing for `boot()` return value |
| boot.ts:39-100 | INFRA | `boot()` function — implements spec'd boot steps 2, 4–8 |
| routes.ts:1-24 | INFRA | Imports and shared helpers (`CORS_HEADERS`, `json`, `notFound`, `badRequest`) |
| routes.ts:185-199 | INFRA | `BlameBlock` interface — local TypeScript type for `/api/blame` response shaping |
| routes.ts:292-430 | INFRA | `handleBlameOnDemand` + `parsePorcelainSimple` — on-demand blame parsing for `since`/`ref` params |
| routes.ts:434-458 | INFRA | `findUncommittedLines` — computes uncommitted line numbers for `blame_response.uncommitted_lines` |
| routes.ts:506-580 | INFRA | `extractHunks` — extracts diff hunks overlapping requested line range for `/api/diff` |
| graph-queries.ts:1-21 | INFRA | TypeScript interfaces (`GraphNode`, `GraphEdge`, `GraphResponse`) |
| ui/src/api.ts:64-74 | INFRA | `get<T>()` typed fetch wrapper with error propagation |
| ui/src/App.tsx:22-62 | INFRA | `useEventSource` hook — implements spec'd SSE auto-reconnect and hello-triggered refetch |
| ui/src/App.tsx:66-73 | INFRA | `parseHash` function — hash router for spec'd hash routes |
| ui/src/routes/Landing.tsx:38-47 | INFRA | `adrSlug`, `adrNumber`, `adrLabel` — ADR display label helpers (ADR-0034) |
| ui/src/routes/Landing.tsx:56-69 | INFRA | `groupByDirectory` — specs grouped by directory in Landing |
| ui/src/components/LineagePopover.tsx:26-29 | INFRA | `docPathToHash` — converts doc path to hash route for row-click navigation |
| ui/src/components/LineagePopover.tsx:107-132 | INFRA | `adrNumber`, `rowLabel`, `statusStyle` — display helpers for lineage rows |
| ui/src/components/BlameGutter.tsx:4-10 | INFRA | `GutterEntry` interface — TypeScript type |
| ui/src/components/MarkdownView.tsx:19-75 | INFRA | `computeBlockLineRanges`, `findBlameBlock`, `isRangeUncommitted` — helpers for `data-line-start`/`data-line-end` spec |
| ui/src/routes/Graph.tsx:29-53 | INFRA | `CATEGORY_COLORS`, `getNodeColor`, `getNodeRadius` — visual encoding for graph nodes |

### Phase 3 — Test Coverage

| Spec (doc:line) | Spec text | Unit test | E2E test | Verdict |
|-----------------|-----------|-----------|----------|---------|
| spec:13 | Boot step 1: `resolveDocsRoot` priority chain (ADR-0050) | boot-docs-dir.test.ts (resolveDocsRoot contract, 5 tests) | none | UNIT_ONLY |
| spec:14 | Boot step 2: `findGitRoot` walks up from docsRoot; skips lineage if null | boot.test.ts (findGitRoot suite, 3 tests) | none | UNIT_ONLY |
| spec:15 | Boot step 3: Auto-build UI if `ui/dist/index.html` missing | none | none | UNTESTED |
| spec:16-20 | Boot steps 4–8: openDb, indexAllDocs, runLineageScan, runBlameScan, startWatcher | boot-lineage.test.ts (runLineageScan suite); boot-docs-dir.test.ts (docsDir derivation) | none | UNIT_ONLY |
| spec:21 | Default port 4567 | boot-docs-dir.test.ts (parseArgs contract) | none | UNIT_ONLY |
| spec:23-28 | Startup banner format | server-banner.test.ts (7 tests) | none | UNIT_ONLY |
| spec:34 | `--port <n>` flag, fails fast if in use | server-banner.test.ts (port parameter) | none | UNIT_ONLY |
| spec:35 | `--root <dir>` flag (ADR-0050) | boot-docs-dir.test.ts (parseArgs --root, 5 tests including --docs-dir removed) | none | UNIT_ONLY |
| spec:36 | `--db-path <path>` flag | boot-docs-dir.test.ts (parseArgs contract) | none | UNIT_ONLY |
| spec:53 | GET /api/adrs?status=<s> | routes.test.ts (handleAdrs suite) | none | UNIT_ONLY |
| spec:54 | GET /api/specs | routes.test.ts (handleSpecs suite) | none | UNIT_ONLY |
| spec:55 | GET /api/doc?path=<p> | routes.test.ts (handleDoc suite) | none | UNIT_ONLY |
| spec:56 | GET /api/lineage (incl. doc mode ADR-0031) | routes.test.ts (handleLineage suite, 5 tests) | none | UNIT_ONLY |
| spec:57 | GET /api/search | routes.test.ts (handleSearch suite) | none | UNIT_ONLY |
| spec:58 | GET /api/graph (global + local) | routes.test.ts + graph-queries.test.ts | none | UNIT_ONLY |
| spec:59 | GET /api/blame (cached + on-demand + ADR self-join) | routes-blame.test.ts (handleBlame suite, 6 tests) | none | UNIT_ONLY |
| spec:60 | GET /api/diff | routes-blame.test.ts (handleDiff suite, 8 tests) | none | UNIT_ONLY |
| spec:61 | SSE /events — hello, reindex, heartbeat, dirty disconnect | sse.test.ts (full suite) | none | UNIT_ONLY |
| spec:62 | Static file serving + SPA fallback | none (handleStatic not directly tested) | none | UNTESTED |
| spec:129-136 | SSE Broker: Set<Writer>, broadcast, 15s heartbeat | sse.test.ts | none | UNIT_ONLY |
| spec:141-149 | Graph global query SQL | graph-queries.test.ts (globalGraphQuery suite) | none | UNIT_ONLY |
| spec:152 | Graph local query (1-hop, 2-query) | graph-queries.test.ts (localGraphQuery suite) | none | UNIT_ONLY |
| spec:155-156 | LineagePopover collapse, sort, navigation | ui/__tests__/LineagePopover.test.tsx | none | UNIT_ONLY |
| spec:158-160 | H1 lineage marker (doc mode) | ui/__tests__/AdrDetail.test.tsx, SpecDetail.test.tsx | none | UNIT_ONLY |
| spec:163-168 | BlameGutter: 7-char hash, consecutive grouping, hover | ui/__tests__/BlameGutter.test.tsx | none | UNIT_ONLY |
| spec:171-178 | LineBlamePopover: hover, debounce, pin, esc, diff expand | ui/__tests__/LineBlamePopover.test.tsx | none | UNIT_ONLY |
| spec:181-188 | BlameRangeFilter: since/branch/all-time, refetch on change | ui/__tests__/BlameRangeFilter.test.tsx | none | UNIT_ONLY |
| spec:191-198 | MarkdownView: marked, hljs, link rewriting, line attrs | ui/__tests__/MarkdownView.test.tsx | none | UNIT_ONLY |
| spec:202 | Landing: ADR buckets, all-expanded default, spec column | ui/__tests__/Landing.test.tsx | none | UNIT_ONLY |
| spec:203 | AdrDetail: status badge, H1 lineage, blame gutter | ui/__tests__/AdrDetail.test.tsx | none | UNIT_ONLY |
| spec:204 | SpecDetail: H1 lineage, blame gutter | ui/__tests__/SpecDetail.test.tsx | none | UNIT_ONLY |
| spec:205 | SearchResults: FTS snippets | ui/__tests__/SearchBar.test.tsx | none | UNIT_ONLY |
| spec:206 | Graph: force-directed, local/global | ui/__tests__/Graph.test.tsx | none | UNIT_ONLY |

### Phase 4 — Bug Triage

No `.agent/bugs/` directory found in the repository.

| Bug | Title | Verdict | Notes |
|-----|-------|---------|-------|
| — | No bugs on file | — | `.agent/bugs/` directory absent |

### Summary

- Implemented: 58
- Gap: 0
- Partial: 3
- Infra: 30
- Unspec'd: 0
- Dead: 0
- Tested: 0
- Unit only: 30
- E2E only: 0
- Untested: 2
- Bugs fixed: 0
- Bugs open: 0
