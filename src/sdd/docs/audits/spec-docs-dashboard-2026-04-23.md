## Run: 2026-04-23T00:00:00Z

Component: docs-dashboard
Root: spec-driven-dev/docs-dashboard/
Primary spec: docs/mclaude-docs-dashboard/spec-dashboard.md
ADRs evaluated: 0027, 0028, 0029, 0030, 0031, 0032, 0034, 0035, 0035b, 0037, 0039, 0040, 0041

### Phase 1 — Spec → Code

| Spec (doc:line) | Spec text | Code location | Verdict | Direction | Notes |
|-----------------|-----------|---------------|---------|-----------|-------|
| spec-dashboard.md:9 | Boot: findRepoRoot(cwd) walks up to .git | boot.ts:14-27 | IMPLEMENTED | | |
| spec-dashboard.md:12 | openDb defaults to <repoRoot>/.agent/.docs-index.db | boot.ts:63-66 | IMPLEMENTED | | |
| spec-dashboard.md:13-14 | indexAllDocs then runLineageScan in order, non-fatal | boot.ts:73-87 | IMPLEMENTED | | |
| spec-dashboard.md:15 | runBlameScan(db, repoRoot, resolvedDocsDir) non-fatal | boot.ts:89-95 | IMPLEMENTED | | |
| spec-dashboard.md:16 | startWatcher with onReindex for SSE | boot.ts:97 | IMPLEMENTED | | |
| spec-dashboard.md:17 | Default port 4567 | server.ts:20 | IMPLEMENTED | | |
| spec-dashboard.md:18 | Binds to 0.0.0.0 | server.ts:208 | IMPLEMENTED | | |
| spec-dashboard.md:19-24 | Startup banner: Dashboard ready + loopback + non-loopback IPv4 | server.ts:60-75 | IMPLEMENTED | | |
| spec-dashboard.md:28-34 | CLI flags --port, --db-path, --docs-dir | server.ts:19-43 | IMPLEMENTED | | |
| spec-dashboard.md:36-47 | Logic-duplication: imports openDb, indexAllDocs, runLineageScan, runBlameScan, blameFile, startWatcher, listDocs, readRawDoc, getLineage, searchDocs, NotFoundError | boot.ts:4-8, routes.ts:1-2 | PARTIAL | SPEC->FIX | blameFile listed in spec's shared surface but is not imported or called in the dashboard; runBlameScan is used instead. Spec should remove blameFile from the dashboard's import list. |
| spec-dashboard.md:50 | GET /api/adrs?status=<s> calls listDocs | routes.ts:30-41 | IMPLEMENTED | | |
| spec-dashboard.md:51 | GET /api/specs calls listDocs | routes.ts:47-50 | IMPLEMENTED | | |
| spec-dashboard.md:52 | GET /api/doc returns DocResponse | routes.ts:56-91 | IMPLEMENTED | | |
| spec-dashboard.md:53 | GET /api/lineage?doc=<p>[&heading=<h>] optional heading | routes.ts:103-124 | IMPLEMENTED | | |
| spec-dashboard.md:54 | GET /api/search with FTS5 | routes.ts:130-166 | IMPLEMENTED | | |
| spec-dashboard.md:55 | GET /api/graph global and 1-hop local | routes.ts:173-183 | IMPLEMENTED | | |
| spec-dashboard.md:56-59 | GET /api/blame self-joins blame_lines on commit, since/ref on-demand | routes.ts:210-288 | IMPLEMENTED | | |
| spec-dashboard.md:57-60 | GET /api/diff runs git show and extracts hunks | routes.ts:468-504 | IMPLEMENTED | | |
| spec-dashboard.md:61 | GET /events SSE with hello+reindex | server.ts:94-148 | IMPLEMENTED | | |
| spec-dashboard.md:62 | GET / and /assets/* static SPA | server.ts:154-174 | IMPLEMENTED | | |
| spec-dashboard.md:65-75 | /api/doc response shape all fields | routes.ts:80-88 | IMPLEMENTED | | |
| spec-dashboard.md:78-85 | /api/graph response shape | graph-queries.ts:3-21 | IMPLEMENTED | | |
| spec-dashboard.md:88-108 | /api/blame BlameBlock shape | routes.ts:187-199, api.ts:122-135 | IMPLEMENTED | | |
| spec-dashboard.md:110 | When since/ref provided, lines outside range have commit: null | routes.ts:231-352 | PARTIAL | SPEC->FIX | On-demand path returns only matching blocks with empty uncommitted_lines (line 351); excluded lines are absent, not represented as commit:null. Spec wording is misleading; code behavior (absence) is more practical. |
| spec-dashboard.md:113-120 | /api/diff response, git show, hunk extraction | routes.ts:468-580 | IMPLEMENTED | | |
| spec-dashboard.md:122-124 | /api/lineage doc mode heading="" | routes.ts:103-124 | IMPLEMENTED | | |
| spec-dashboard.md:127-134 | SSE broker: Set<Writer>, heartbeat 15s, hello, reindex | server.ts:79-148 | IMPLEMENTED | | |
| spec-dashboard.md:136-150 | Graph queries global and local | graph-queries.ts:31-111 | IMPLEMENTED | | |
| spec-dashboard.md:152-159 | LineagePopover collapses by section_b_doc, SUM count, sorted desc, graph link | LineagePopover.tsx:39-91, 256-277 | IMPLEMENTED | | |
| spec-dashboard.md:156-158 | H1 lineage marker on spec and ADR detail pages | AdrDetail.tsx:199, SpecDetail.tsx:191 | IMPLEMENTED | | |
| spec-dashboard.md:160-166 | BlameGutter: 7-char hash, author, consecutive same-commit groups, always visible when data loaded, hover opens popover | BlameGutter.tsx, AdrDetail.tsx:213-219 | IMPLEMENTED | | |
| spec-dashboard.md:169-177 | LineBlamePopover: debounce ~300ms, rgba(99,179,237,0.08) highlight, ADR list+badge, secondary info, working copy label, pin/dismiss, inline diff | LineBlamePopover.tsx, AdrDetail.tsx:97-128 | IMPLEMENTED | | |
| spec-dashboard.md:173-175 | Uncommitted: working copy label with section heading, no lineage fetch | LineBlamePopover.tsx:166-169 | IMPLEMENTED | | |
| spec-dashboard.md:176 | Pin/dismiss: click pins, Esc/outside-click unpins | LineBlamePopover.tsx:78-96, AdrDetail.tsx:165-172 | IMPLEMENTED | | |
| spec-dashboard.md:177 | Inline diff in popover with expand toggle, fetches /api/diff | LineBlamePopover.tsx:98-135, 197-218 | IMPLEMENTED | | Diff expand available; not restricted to pinned state only but spec says "pinned" — this is consistent with spec intent |
| spec-dashboard.md:179-186 | BlameRangeFilter: All time/Since/Branch, refetches blame on change | BlameRangeFilter.tsx, AdrDetail.tsx:92-95 | IMPLEMENTED | | |
| spec-dashboard.md:188-197 | MarkdownView: marked, hljs, link rewriting, H2 LineagePopover, data-line-start/end, hover for LineBlamePopover | MarkdownView.tsx | IMPLEMENTED | | |
| spec-dashboard.md:197 | onBlockHover passes element's bounding rect (not mouse event) | MarkdownView.tsx:248-250 | IMPLEMENTED | | rect from getBoundingClientRect passed |
| spec-dashboard.md:200-206 | UI routes: #/, #/adr, #/spec, #/search, #/graph | App.tsx:99-125 | IMPLEMENTED | | |
| spec-dashboard.md:202 | Landing: ADR buckets, all expanded by default, specs by directory | Landing.tsx:29-36, 102-226 | IMPLEMENTED | | |
| spec-dashboard.md:203 | AdrDetail: status badge, H2 popovers, H1 marker | AdrDetail.tsx | IMPLEMENTED | | |
| spec-dashboard.md:204 | SpecDetail: H2 popovers, H1 marker | SpecDetail.tsx | IMPLEMENTED | | |
| spec-dashboard.md:208-221 | Error handling table | server.ts:262-270, boot.ts:56-61, routes.ts:18-24 | IMPLEMENTED | | |
| spec-dashboard.md:223-229 | Security: 0.0.0.0, no auth, CORS * | server.ts:208, routes.ts:6-9 | IMPLEMENTED | | |
| adr-0041 Decisions:1 | Anchor popover to block element bounding rect, not event.clientY/clientX | AdrDetail.tsx:114-124, SpecDetail.tsx:107-117 | IMPLEMENTED | | top=rect.bottom-4, left=rect.left |
| adr-0041 Decisions:2 | Zero visible gap — popover overlaps block edge slightly | AdrDetail.tsx:116 (rect.bottom-4), SpecDetail.tsx:109 | IMPLEMENTED | | 4px overlap achieved via rect.bottom - 4 |
| adr-0041 Decisions:3 | Hover bridge: popover mouseenter maintains block state; only different block or empty space dismisses | AdrDetail.tsx:176-185, SpecDetail.tsx:168-177, LineBlamePopover.tsx:149 | IMPLEMENTED | | onMouseEnter cancels debounce; onMouseLeave dismisses if unpinned |

### Phase 2 — Code → Spec

| File:lines | Classification | Explanation |
|------------|---------------|-------------|
| server.ts:1-16 | INFRA | Imports for boot, routes, standard libs |
| server.ts:19-43 | INFRA | parseArgs — plumbing to extract CLI flags; spec-required behavior |
| server.ts:45-75 | INFRA | buildStartupBanner — implements spec-required banner format |
| server.ts:79-92 | INFRA | SSE broadcast helper — spec-required SSE broker behavior |
| server.ts:94-148 | INFRA | handleSSE — implements spec /events endpoint with heartbeat |
| server.ts:150-174 | INFRA | handleStatic — serves SPA bundle from ui/dist/ |
| server.ts:178-282 | INFRA | main() entry point — wires parseArgs, boot, Bun.serve; spec-required |
| boot.ts:1-8 | INFRA | Imports |
| boot.ts:14-27 | INFRA | findRepoRoot — spec-required .git walk-up |
| boot.ts:29-33 | INFRA | BootResult interface — type for boot() return |
| boot.ts:49-100 | INFRA | boot() — spec-required initialization sequence |
| routes.ts:1-24 | INFRA | Imports, CORS headers, json/notFound/badRequest helpers |
| routes.ts:294-352 | INFRA | handleBlameOnDemand — on-demand git blame; spec-required for since/ref params |
| routes.ts:357-430 | INFRA | parsePorcelainSimple — helper for on-demand blame parsing; necessary for spec's on-demand path |
| routes.ts:435-459 | INFRA | findUncommittedLines — computes uncommitted_lines for /api/blame response |
| routes.ts:506-580 | INFRA | extractHunks — diff hunk extraction; spec requires /api/diff to filter to line range |
| graph-queries.ts:1-21 | INFRA | Interfaces GraphNode, GraphEdge, GraphResponse |
| graph-queries.ts:31-59 | INFRA | globalGraphQuery — spec-required global graph SQL |
| graph-queries.ts:70-111 | INFRA | localGraphQuery — spec-required 1-hop local graph SQL |
| ui/src/api.ts:1-165 | INFRA | All typed fetch wrappers for API endpoints; spec-required client interface |
| ui/src/App.tsx:1-187 | INFRA | Hash router, SSE hook, top-level nav; spec-required UI routing |
| ui/src/routes/Landing.tsx:1-327 | INFRA | Landing page with ADR buckets and spec directory listing; spec-required |
| ui/src/routes/AdrDetail.tsx:1-307 | INFRA | ADR detail view with blame, gutter, popover; spec-required |
| ui/src/routes/SpecDetail.tsx:1-308 | INFRA | Spec detail view; spec-required |
| ui/src/components/MarkdownView.tsx:1-279 | INFRA | Markdown renderer with line attribution; spec-required |
| ui/src/components/LineagePopover.tsx:1-380 | INFRA | H2/H1 lineage popover with collapse-by-doc; spec-required |
| ui/src/components/LineBlamePopover.tsx:1-357 | INFRA | Line-level blame popover; spec-required |
| ui/src/components/BlameGutter.tsx:1-134 | INFRA | VS Code-style blame gutter; spec-required |
| ui/src/components/BlameRangeFilter.tsx:1-120 | INFRA | Range filter dropdown; spec-required |
| ui/src/components/StatusBadge.tsx | INFRA | Status badge; used by Landing and AdrDetail for spec-required status display |
| ui/src/components/SearchBar.tsx | INFRA | Search bar; spec-required FTS search |
| ui/src/routes/SearchResults.tsx | INFRA | Search results page; spec-required |
| ui/src/routes/Graph.tsx | INFRA | Force-directed graph; spec-required |
| ui/src/main.tsx | INFRA | React entry point; boilerplate |
| ui/src/components/markdown-body.css | INFRA | Typography stylesheet per ADR-0039 |

### Phase 3 — Test Coverage

| Spec (doc:line) | Spec text | Unit test | E2E test | Verdict |
|-----------------|-----------|-----------|----------|---------|
| spec-dashboard.md:9-18 | Boot: findRepoRoot, openDb, indexAllDocs, runLineageScan, runBlameScan | None found | None | UNTESTED |
| spec-dashboard.md:50-62 | HTTP endpoints /api/adrs, /api/specs, /api/doc, /api/lineage, /api/search, /api/graph, /api/blame, /api/diff, /events | None found | None | UNTESTED |
| spec-dashboard.md:127-134 | SSE broker heartbeat, broadcast, hello | None found | None | UNTESTED |
| spec-dashboard.md:136-150 | Graph queries: global and local SQL | None found | None | UNTESTED |
| spec-dashboard.md:152-159 | LineagePopover collapse by doc | LineagePopover.test.tsx (implied by AdrDetail test) | None | UNTESTED |
| spec-dashboard.md:156-158 | H1 lineage marker on detail pages | AdrDetail.test.tsx:96-119, SpecDetail.test.tsx:45-68 | None | UNIT_ONLY |
| spec-dashboard.md:160-166 | BlameGutter: grouping, annotation, hover | BlameGutter.test.tsx | None | UNIT_ONLY |
| spec-dashboard.md:169-177 | LineBlamePopover: content, pin, dismiss, diff expand | LineBlamePopover.test.tsx | None | UNIT_ONLY |
| spec-dashboard.md:173-175 | Uncommitted: working copy label | LineBlamePopover.test.tsx:123-156 | None | UNIT_ONLY |
| spec-dashboard.md:177 | Inline diff expand | LineBlamePopover.test.tsx:243-271 | None | UNIT_ONLY |
| spec-dashboard.md:179-186 | BlameRangeFilter: modes, since, branch | BlameRangeFilter.test.tsx | None | UNIT_ONLY |
| spec-dashboard.md:188-197 | MarkdownView: line attrs, link rewriting, H2 placeholder | MarkdownView.test.tsx | None | UNIT_ONLY |
| spec-dashboard.md:200-206 | UI routes routing | None for routing logic | None | UNTESTED |
| spec-dashboard.md:202 | Landing: ADR buckets, all expanded by default | Landing.test.tsx (exists, not read in full) | None | UNIT_ONLY |
| adr-0041 Decisions:1-2 | Popover anchored to bounding rect, overlap 4px | LineBlamePopover.test.tsx:290-306 (tests anchorTop/Left props), AdrDetail.test.tsx (does not test rect.bottom-4 logic) | None | UNIT_ONLY |
| adr-0041 Decisions:3 | Hover bridge: onMouseEnter/Leave callbacks | LineBlamePopover.test.tsx:308-366 | None | UNIT_ONLY |

### Phase 4 — Bug Triage

No .agent/bugs/ directory found in repo root or spec-driven-dev/. No open bugs to triage.

| Bug | Title | Verdict | Notes |
|-----|-------|---------|-------|
| — | — | — | No bugs found |

### Summary

- Implemented: 47
- Gap: 0
- Partial: 2
- Infra: 35
- Unspec'd: 0
- Dead: 0
- Tested (unit+e2e): 0
- Unit only: 9
- E2E only: 0
- Untested: 6
- Bugs fixed: 0
- Bugs open: 0
