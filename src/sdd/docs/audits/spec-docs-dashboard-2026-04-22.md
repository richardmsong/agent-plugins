# Spec Audit: docs-dashboard

Component root: `spec-driven-dev/docs-dashboard/`
Spec files: `spec-driven-dev/docs/mclaude-docs-dashboard/spec-dashboard.md`, ADRs 0027–0035
Auditor: claude-sonnet-4-6

## Run: 2026-04-22T00:00:00Z

### Phase 1 — Spec → Code

| Spec (doc:line) | Spec text | Code location | Verdict | Direction | Notes |
|-----------------|-----------|---------------|---------|-----------|-------|
| spec-dashboard.md:11 | Bun (loads .ts natively; no build step). Entrypoint: docs-dashboard/src/server.ts | src/server.ts:1-257 | IMPLEMENTED | — | |
| spec-dashboard.md:13 | findRepoRoot(cwd) — walks up from process.cwd() until a .git directory is found; exits non-zero if not found | src/boot.ts:13-26, 54-60 | IMPLEMENTED | — | |
| spec-dashboard.md:14 | openDb(resolvedDbPath) — opens shared SQLite index in WAL mode; path defaults to <repoRoot>/.agent/.docs-index.db, overridden by --db-path | src/boot.ts:62-65 | IMPLEMENTED | — | |
| spec-dashboard.md:15 | indexAllDocs(db, resolvedDocsDir, repoRoot) | src/boot.ts:72-77 | IMPLEMENTED | — | |
| spec-dashboard.md:16 | runLineageScan(db, repoRoot) (ADR-0029) | src/boot.ts:80-86 | IMPLEMENTED | — | |
| spec-dashboard.md:17 | startWatcher(db, resolvedDocsDir, repoRoot, onReindex) | src/boot.ts:88 | IMPLEMENTED | — | |
| spec-dashboard.md:18 | Default port 4567; overridden by --port <n> | src/server.ts:17-30 | IMPLEMENTED | — | |
| spec-dashboard.md:19 | Binds to 0.0.0.0 (all interfaces, ADR-0028) | src/server.ts:189 | IMPLEMENTED | — | |
| spec-dashboard.md:20-25 | Startup banner: "Dashboard ready:\n  http://127.0.0.1:<port>/\n  http://<non-loopback-ipv4>:<port>/" | src/server.ts:58-73 | IMPLEMENTED | — | |
| spec-dashboard.md:29-33 | CLI flags: --port, --db-path, --docs-dir | src/server.ts:17-41 | IMPLEMENTED | — | ADR-0032 adds --docs-dir |
| spec-dashboard.md:37-44 | Logic-duplication rule: imports openDb, indexAllDocs, runLineageScan, startWatcher, listDocs, readRawDoc, getLineage, searchDocs, NotFoundError from docs-mcp/* | src/boot.ts:4-7, src/routes.ts:2 | IMPLEMENTED | — | |
| spec-dashboard.md:51 | GET /api/adrs?status=<s> → listDocs({category:"adr",status:s}) | src/routes.ts:29-40 | IMPLEMENTED | — | |
| spec-dashboard.md:52 | GET /api/specs → listDocs({category:"spec"}) | src/routes.ts:46-49 | IMPLEMENTED | — | |
| spec-dashboard.md:53 | GET /api/doc?path=<p> → listDocs + readRawDoc | src/routes.ts:55-90 | IMPLEMENTED | — | |
| spec-dashboard.md:54 | GET /api/lineage?doc=<p>[&heading=<h>] heading optional (ADR-0031) | src/routes.ts:102-123 | IMPLEMENTED | — | |
| spec-dashboard.md:55 | GET /api/search?q=<q>&limit=<n>&category=<c>&status=<s> → searchDocs | src/routes.ts:129-165 | IMPLEMENTED | — | |
| spec-dashboard.md:56 | GET /api/graph?focus=<p> omit for global, provide for 1-hop local | src/routes.ts:172-182 | IMPLEMENTED | — | |
| spec-dashboard.md:57 | GET /events SSE stream; emits {type:"hello"} on connect and {type:"reindex",changed:[...]} on watcher | src/server.ts:92-129 | IMPLEMENTED | — | |
| spec-dashboard.md:58 | GET / and /assets/* static SPA bundle from ui/dist/ | src/server.ts:135-155 | IMPLEMENTED | — | |
| spec-dashboard.md:61-71 | DocResponse shape: doc_path, title, category, status, commit_count, raw_markdown, sections | src/routes.ts:79-88; ui/src/api.ts:13-21 | IMPLEMENTED | — | |
| spec-dashboard.md:73-80 | GraphResponse shape: nodes(path,title,category,status,commit_count), edges(from,to,count,last_commit) | src/graph-queries.ts:3-21 | IMPLEMENTED | — | spec says edges have `last_commit`; code includes it; spec-dashboard.md GraphResponse (line 79) omits `last_commit` from edges but ADR-0027 includes it and code has it — spec text is incomplete |
| spec-dashboard.md:85 | /api/lineage returns LineageResult[]; in doc mode heading="" per ADR-0031 | src/routes.ts:113; docs-mcp getLineage (external) | IMPLEMENTED | — | |
| spec-dashboard.md:89-94 | SSE broker: Set<Writer>, writer declared outside ReadableStream, start registers/sends hello, cancel removes | src/server.ts:77-129 | IMPLEMENTED | — | |
| spec-dashboard.md:100-109 | Graph global SQL: SELECT path,title,category,status,commit_count FROM documents; SELECT MIN/MAX/SUM/MAX edges | src/graph-queries.ts:31-58 | IMPLEMENTED | — | |
| spec-dashboard.md:111 | Graph local: 1-hop neighborhood, two SQL statements (not N+1) | src/graph-queries.ts:70-111 | IMPLEMENTED | — | |
| spec-dashboard.md:113-115 | LineagePopover: collapse LineageResult[] by section_b_doc; count=SUM, last_commit=MAX proxy | ui/src/components/LineagePopover.tsx:39-91 | IMPLEMENTED | — | |
| spec-dashboard.md:115 | Sorted by collapsed count descending | ui/src/components/LineagePopover.tsx:81-90 | IMPLEMENTED | — | |
| spec-dashboard.md:115 | Row click navigates to doc top (#/adr/<slug> or #/spec/<path>) without §heading anchor | ui/src/components/LineagePopover.tsx:255-259 | IMPLEMENTED | — | |
| spec-dashboard.md:115 | Final row: "Open graph centered here" → #/graph?focus=<doc_path>&section=<heading> (section) or #/graph?focus=<doc_path> (doc) | ui/src/components/LineagePopover.tsx:217-219, 265-270 | IMPLEMENTED | — | |
| spec-dashboard.md:117-119 | H1 lineage marker (≡ icon) next to H1 title on every spec and ADR detail page | ui/src/routes/AdrDetail.tsx:63, ui/src/routes/SpecDetail.tsx:56 | IMPLEMENTED | — | |
| spec-dashboard.md:119 | Popover row format identical to H2 collapsed row | ui/src/components/LineagePopover.tsx:249-278 | IMPLEMENTED | — | |
| spec-dashboard.md:125 | #/ Landing.tsx: ADRs bucketed by status (Drafts, Accepted, Implemented, Superseded, Withdrawn, Unspecified), Drafts expanded by default, right column specs grouped by directory | ui/src/routes/Landing.tsx:19-29, 95-119 | IMPLEMENTED | — | |
| spec-dashboard.md:126 | #/adr/<slug> AdrDetail.tsx: status badge, H2 popovers, H1 lineage marker | ui/src/routes/AdrDetail.tsx:58-79 | PARTIAL | SPEC→FIX | Status history dates in header visible via meta/commitCount display, but the spec mentions "history dates" in the header — AdrDetail shows doc_path and commit_count but not individual status history dates. However, ADR-0027 mentions "status history" tooltip via StatusBadge title prop which accepts historyDates. StatusBadge is called without historyDates in AdrDetail (line 64), so history dates are not shown. Spec says "rendered ADR with status badge + history dates" — the history dates are not rendered in the header. |
| spec-dashboard.md:127 | #/spec/<path> SpecDetail.tsx: rendered spec, H2 popovers, H1 lineage marker | ui/src/routes/SpecDetail.tsx:51-72 | IMPLEMENTED | — | |
| spec-dashboard.md:128 | #/search?q=<q> SearchResults.tsx: FTS5 results with snippets | ui/src/routes/SearchResults.tsx | IMPLEMENTED | — | |
| spec-dashboard.md:129 | #/graph[?focus=<p>] Graph.tsx: force-directed graph, global or 1-hop local | ui/src/routes/Graph.tsx | IMPLEMENTED | — | |
| spec-dashboard.md:133 | .git not found: print error and exit non-zero | src/boot.ts:55-60 | IMPLEMENTED | — | |
| spec-dashboard.md:134 | .docs-index.db missing or corrupt: openDb rebuilds | src/boot.ts:65 (delegates to openDb) | IMPLEMENTED | — | |
| spec-dashboard.md:135 | Schema version mismatch: openDb deletes and rebuilds | src/boot.ts:65 (delegates to openDb) | IMPLEMENTED | — | |
| spec-dashboard.md:136 | fs.watch throws: fall back to polling every 5s; show "Live updates via polling" in footer | N/A (delegates to startWatcher in docs-mcp) | PARTIAL | SPEC→FIX | Dashboard delegates watcher error handling to docs-mcp/watcher. The "Live updates via polling" footer indicator is a UI requirement not yet implemented in the dashboard UI. No footer exists in App.tsx. |
| spec-dashboard.md:137 | Port in use: fail fast with specific error message | src/server.ts:238-243 | IMPLEMENTED | — | |
| spec-dashboard.md:138 | /api/doc or /api/lineage unknown path: HTTP 404, JSON {error:"not found",path} | src/routes.ts:17-19 | IMPLEMENTED | — | |
| spec-dashboard.md:139 | FTS5 query syntax error: HTTP 400 | src/routes.ts:163-164 | IMPLEMENTED | — | |
| spec-dashboard.md:140 | SSE disconnect: browser auto-reconnects; hello triggers full refetch | ui/src/App.tsx:88-92 | IMPLEMENTED | — | |
| spec-dashboard.md:141 | Markdown parse error: show raw source in <pre> with one-line warning | ui/src/components/MarkdownView.tsx:73-74 | IMPLEMENTED | — | |
| spec-dashboard.md:142 | indexAllDocs throws during boot: catch-and-log, non-fatal | src/boot.ts:72-77 | IMPLEMENTED | — | |
| spec-dashboard.md:143 | runLineageScan throws during boot: catch-and-log, non-fatal | src/boot.ts:80-86 | IMPLEMENTED | — | |
| spec-dashboard.md:147 | Binds to 0.0.0.0; access control delegated to host network | src/server.ts:189 | IMPLEMENTED | — | |
| spec-dashboard.md:149 | No write endpoints in v1 — read-only | src/routes.ts (GET only) | IMPLEMENTED | — | |
| spec-dashboard.md:150 | CORS: Access-Control-Allow-Origin: * | src/routes.ts:6-8, src/server.ts:121-128 | IMPLEMENTED | — | |
| spec-dashboard.md:154-159 | Dependencies: docs-mcp (workspace), bun:sqlite via docs-mcp/db, Bun stdlib, UI: react 18, react-force-graph-2d, marked, highlight.js, vite | src/boot.ts:4-7, src/server.ts:3-4, ui/src/routes/Graph.tsx:2, ui/src/components/MarkdownView.tsx:2-3 | IMPLEMENTED | — | |
| adr-0034:18-28 | ADR number display format "ADR-NNNN: <title>" via regex on doc_path basename; scope: Landing page ADR list + LineagePopover ADR references | ui/src/routes/Landing.tsx:36-47, ui/src/components/LineagePopover.tsx:107-122 | IMPLEMENTED | — | |
| adr-0035:17-28 | URL slug format: use doc_path minus .md suffix directly; Landing.tsx uses doc_path.replace(/\.md$/,""); AdrDetail.tsx slugToDocPath appends .md only | ui/src/routes/Landing.tsx:157, ui/src/routes/AdrDetail.tsx:14-16 | IMPLEMENTED | — | |
| adr-0035:28 | LineagePopover: if constructs #/adr/ links, same fix applies | ui/src/components/LineagePopover.tsx:26-29 | IMPLEMENTED | — | docPathToHash in LineagePopover uses `adr-` prefix detection on the full path basename; correctly produces /adr/<full-path-minus-.md> |
| spec-dashboard.md (GraphResponse edges) | GraphResponse.edges includes last_commit field | src/graph-queries.ts:15-16, src/routes.ts:172-182 | IMPLEMENTED | — | spec-dashboard.md line 79 omits last_commit from the GraphResponse type definition but code and ADR-0027 include it |
| adr-0027:54 | Auth: None — binds to 127.0.0.1 only | SUPERSEDED by ADR-0028 | — | — | ADR-0027 security decision superseded by ADR-0028; code correctly binds 0.0.0.0 |
| adr-0027 Graph sidebar | Global graph defaults: render only ADR↔spec edges by default; sidebar toggles for ADR↔ADR, spec↔spec | ui/src/routes/Graph.tsx:59-60, 96-112, 210-225 | IMPLEMENTED | — | |
| adr-0027 Node encoding | Fill color = category; border+fill tone = status (for ADRs only); node radius ∝ √commit_count | ui/src/routes/Graph.tsx:30-47 | IMPLEMENTED | — | |
| adr-0027 Edge encoding | Line thickness ∝ commit_count; tooltip with count and last_commit | ui/src/routes/Graph.tsx:196-204 | IMPLEMENTED | — | |
| adr-0027 Search | FTS bar in top nav; typing debounces 150ms; GET /api/search?q=... | ui/src/components/SearchBar.tsx:8, 15-26 | IMPLEMENTED | — | |
| adr-0027 Markdown rendering | marked + highlight.js; renderer extension rewrites relative links | ui/src/components/MarkdownView.tsx:10-22 | PARTIAL | SPEC→FIX | Link rewriting for ADR links uses regex capturing group — produces #/adr/<slug> where slug strips "docs/" prefix and "adr-" prefix. e.g. docs/adr-0015-docs-mcp.md → #/adr/0015-docs-mcp. However, ADR-0035 changes the URL format to use full doc_path. MarkdownView.tsx:12-13 still strips "docs/" and captures only adr-XXXX... portion via regex. This is inconsistent with the ADR-0035 fix applied to Landing.tsx and AdrDetail.tsx. MarkdownView docLinkToHash (line 13) produces /adr/0015-docs-mcp while Landing produces /adr/docs/adr-0015-docs-mcp. The two route construction methods are now inconsistent. |
| adr-0027 Watcher callback | extend startWatcher signature with optional onReindex | src/boot.ts:88 | IMPLEMENTED | — | |
| adr-0032 --docs-dir | --docs-dir flag resolved relative to cwd; absolute paths accepted | src/server.ts:34-37, src/boot.ts:69 | IMPLEMENTED | — | |

### Phase 2 — Code → Spec

| File:lines | Classification | Explanation |
|------------|---------------|-------------|
| src/server.ts:177-186 | INFRA | Graceful shutdown handlers (SIGINT/SIGTERM): close watcher + db. Not spec'd explicitly but necessary infrastructure for the spec'd server lifecycle. |
| src/server.ts:195-200 | INFRA | CORS preflight handler (OPTIONS 204). Supports the spec'd CORS requirement; standard HTTP plumbing. |
| src/server.ts:230-246 | INFRA | Fallback 404 JSON response for unknown routes + server error handler. Error handling required by spec. |
| src/server.ts:252-256 | INFRA | Top-level main() invocation guard (import.meta.main). Standard Bun entrypoint pattern. |
| src/boot.ts:28-32 | INFRA | BootResult interface declaration. Type-only infrastructure for the spec'd boot contract. |
| src/routes.ts:5-15 | INFRA | CORS_HEADERS constant, json(), notFound(), badRequest() helpers. Plumbing for spec'd HTTP responses. |
| src/routes.ts:31-38 | INFRA | Status validation in handleAdrs: rejects invalid status values with 400. Defensive validation not spec'd but consistent with spec'd 400 behavior for FTS5 errors. |
| src/routes.ts:136-164 | INFRA | Parameter validation in handleSearch (limit, category, status). Plumbing for spec'd search endpoint. |
| ui/src/App.tsx:22-62 | INFRA | useEventSource hook: SSE subscription logic. Implements spec'd SSE reconnect → hello → full refetch behavior. |
| ui/src/App.tsx:66-73 | INFRA | parseHash() utility for hash router. Infrastructure for spec'd hash routing. |
| ui/src/App.tsx:143-187 | INFRA | Style constants (app, nav, brand, etc.). Pure styling, not behavior. |
| ui/src/api.ts:64-74 | INFRA | Generic get<T>() fetch helper with error extraction. Plumbing for spec'd API fetch wrappers. |
| ui/src/routes/Graph.tsx:11-27 | INFRA | ForceNode, ForceLink, ForceData interface extensions for react-force-graph-2d. Needed by spec'd graph library integration. |
| ui/src/routes/Graph.tsx:73-112 | INFRA | filteredEdges() and edge filtering logic. Implements spec'd global graph sidebar filters and local-mode all-edge behavior. |
| ui/src/routes/Graph.tsx:114-126 | INFRA | forceData assembly, maxEdgeCount computation, handleNodeClick. Plumbing for spec'd graph rendering and click navigation. |
| ui/src/routes/Landing.tsx:49-63 | INFRA | groupByDirectory() helper for spec grouping. Infrastructure for spec'd spec-grouping-by-directory layout. |
| ui/src/routes/Landing.tsx:31-33 | INFRA | adrSlug() function. This is UNSPEC'd — see below. |
| ui/src/routes/Landing.tsx:31-33 | UNSPEC'd | adrSlug(docPath) function remains in Landing.tsx after ADR-0035. It is no longer used for navigation (navigation now uses doc_path.replace(/\.md$/,"")), but is still referenced in adrLabel() as a fallback display when adrNumber returns null. Function is retained for a display fallback but could be simplified. |
| ui/src/routes/SearchResults.tsx:9-14 | UNSPEC'd | docPathToHash in SearchResults uses the old regex capture approach (/adr/<slug-without-docs-or-adr-prefix>) inconsistent with ADR-0035 fix. See Phase 1 PARTIAL for MarkdownView. Same issue exists here: clicking a search result for a nested ADR would produce the wrong URL. |
| ui/src/routes/Graph.tsx:49-53 | UNSPEC'd | docPathToHash in Graph.tsx uses the old regex capture approach, inconsistent with ADR-0035. Clicking a graph node for a nested ADR produces wrong URL. |
| ui/src/components/MarkdownView.tsx:10-22 | UNSPEC'd | docLinkToHash uses old regex capture approach for ADR links, inconsistent with ADR-0035. Produces /adr/0015-docs-mcp instead of /adr/docs/adr-0015-docs-mcp for inline markdown links. |
| ui/src/components/LineagePopover.tsx:39-105 | INFRA | collapseByDoc() and passThrough() helpers. Implements spec'd LineagePopover collapse algorithm. |
| ui/src/components/StatusBadge.tsx | INFRA | StatusBadge component. Implements spec'd status encoding for landing page and detail views. |
| ui/src/main.tsx | INFRA | React root mount point. Standard SPA entrypoint. |
| ui/src/bun-test-setup.ts | INFRA | Test setup file (not production code). |
| ui/src/test-setup.ts | INFRA | Test setup file (not production code). |

### Phase 3 — Test Coverage

| Spec (doc:line) | Spec text | Unit test | E2E test | Verdict |
|-----------------|-----------|-----------|----------|---------|
| spec-dashboard.md:13 | findRepoRoot walks up to .git, exits non-zero | tests/boot.test.ts (findRepoRoot, 3 cases) | None | UNIT_ONLY |
| spec-dashboard.md:14-17 | Boot sequence: openDb, indexAllDocs, runLineageScan, startWatcher | tests/boot-lineage.test.ts (5 cases), tests/boot-docs-dir.test.ts (5 cases) | None | UNIT_ONLY |
| spec-dashboard.md:18,29-33 | CLI flags --port, --db-path, --docs-dir | tests/boot-docs-dir.test.ts parseArgs contract (5 cases) | None | UNIT_ONLY |
| spec-dashboard.md:20-25 | Startup banner format | tests/server-banner.test.ts (8 cases) | None | UNIT_ONLY |
| spec-dashboard.md:51 | GET /api/adrs?status=<s> | tests/routes.test.ts handleAdrs (3 cases) | None | UNIT_ONLY |
| spec-dashboard.md:52 | GET /api/specs | tests/routes.test.ts handleSpecs (1 case) | None | UNIT_ONLY |
| spec-dashboard.md:53 | GET /api/doc?path=<p> | tests/routes.test.ts handleDoc (3 cases) | None | UNIT_ONLY |
| spec-dashboard.md:54 | GET /api/lineage (optional heading, doc mode, section mode) | tests/routes.test.ts handleLineage (6 cases) | None | UNIT_ONLY |
| spec-dashboard.md:55 | GET /api/search | tests/routes.test.ts handleSearch (3 cases) | None | UNIT_ONLY |
| spec-dashboard.md:56 | GET /api/graph (global + local) | tests/routes.test.ts handleGraph (4 cases), tests/graph-queries.test.ts (12 cases) | None | UNIT_ONLY |
| spec-dashboard.md:57 | SSE broker: hello on connect, reindex broadcast, dirty disconnect | tests/sse.test.ts (6 cases) | None | UNIT_ONLY |
| spec-dashboard.md:100-109 | Graph global SQL: nodes, edges, MIN/MAX canonicalization | tests/graph-queries.test.ts globalGraphQuery (6 cases) | None | UNIT_ONLY |
| spec-dashboard.md:111 | Graph local SQL: 1-hop, 2-query pattern | tests/graph-queries.test.ts localGraphQuery (5 cases) | None | UNIT_ONLY |
| spec-dashboard.md:113-115 | LineagePopover: collapse, sort, row click, pin, Esc, outside click, graph link | ui/src/__tests__/LineagePopover.test.tsx (15+ cases) | None | UNIT_ONLY |
| spec-dashboard.md:117-119 | H1 lineage marker in AdrDetail and SpecDetail | ui/src/__tests__/AdrDetail.test.tsx (3 cases) | None | UNIT_ONLY |
| spec-dashboard.md:125 | Landing: status buckets, Drafts expanded, spec groups, ADR number prefix | ui/src/__tests__/Landing.test.tsx (7 cases) | None | UNIT_ONLY |
| spec-dashboard.md:126 | AdrDetail: ADR-0035 nested slug handling | ui/src/__tests__/AdrDetail.test.tsx (2 cases) | None | UNIT_ONLY |
| adr-0034 | ADR number prefix in Landing and LineagePopover | ui/src/__tests__/Landing.test.tsx, LineagePopover.test.tsx | None | UNIT_ONLY |
| adr-0035 | ADR route fix for nested docs dir | ui/src/__tests__/Landing.test.tsx:123-146, AdrDetail.test.tsx:33-59, LineagePopover.test.tsx:367-442 | None | UNIT_ONLY |
| spec-dashboard.md:126 PARTIAL | AdrDetail status history dates in header | No test for history dates | None | UNTESTED |
| spec-dashboard.md:136 PARTIAL | "Live updates via polling" footer indicator | No test | None | UNTESTED |
| UNSPEC'd gap | MarkdownView/SearchResults/Graph.docPathToHash old-format ADR links | No test for nested ADR links in MarkdownView; MarkdownView.test.tsx line 31 tests OLD behavior (#/adr/0015-docs-mcp) | None | UNTESTED |

### Phase 4 — Bug Triage

No `.agent/bugs/` directory found in this repository. No bugs to triage.

| Bug | Title | Verdict | Notes |
|-----|-------|---------|-------|
| — | — | — | No open bugs directory |

### Summary

- Implemented: 46
- Gap: 0
- Partial: 3
- Infra: 19
- Unspec'd: 4
- Dead: 0
- Tested (unit+e2e): 0
- Unit only: 19
- E2E only: 0
- Untested: 3
- Bugs fixed: 0
- Bugs open: 0
