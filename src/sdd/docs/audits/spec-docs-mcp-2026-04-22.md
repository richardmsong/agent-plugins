## Run: 2026-04-22T00:00:00Z

Component: docs-mcp
Component root: spec-driven-dev/docs-mcp/
Spec files: docs/mclaude-docs-mcp/spec-docs-mcp.md
ADRs evaluated (accepted/implemented): ADR-0015, ADR-0018, ADR-0027, ADR-0029, ADR-0030, ADR-0031, ADR-0032, ADR-0036, ADR-0038

### Phase 1 — Spec → Code

| Spec (doc:line) | Spec text | Code location | Verdict | Direction | Notes |
|-----------------|-----------|---------------|---------|-----------|-------|
| spec:3-5 | `docs-mcp` is a local-only MCP server (stdio transport) that gives agents structured access to the `docs/` corpus | index.ts:219,231 | IMPLEMENTED | — | StdioServerTransport used; server connects via stdio |
| spec:5 | parses markdown files into H2 sections | parser.ts:30-110 | IMPLEMENTED | — | parseMarkdown splits on ## headings |
| spec:5 | indexes them in a SQLite database with FTS5 full-text search | db.ts:27-32, content-indexer.ts:78-115 | IMPLEMENTED | — | sections_fts virtual table; triggers; indexFile upserts |
| spec:5 | scans git history to derive lineage edges between co-committed sections | lineage-scanner.ts:175-291 | IMPLEMENTED | — | runLineageScan processes commit history |
| spec:5 | watches the filesystem to keep the index live | watcher.ts:10-109 | IMPLEMENTED | — | startWatcher with fs.watch + debounce |
| spec:5 | Four MCP tools — `search_docs`, `get_section`, `get_lineage`, `list_docs` | index.ts:114-216 | IMPLEMENTED | — | All four tools registered |
| spec:5-6 | Additional library functions in `src/tools.ts` are exported for sibling packages | tools.ts:266-300 | IMPLEMENTED | — | readRawDoc exported |
| spec:11 | Bun (loads `.ts` files natively; no build step) | package.json:scripts | IMPLEMENTED | — | `bun run src/index.ts`; no tsc/build step at runtime |
| spec:12 | Single-process; stdio transport for MCP | index.ts:219,231 | IMPLEMENTED | — | StdioServerTransport; one process |
| spec:12 | No HTTP, no auth, no network | index.ts (full file) | IMPLEMENTED | — | No HTTP server setup anywhere in index.ts |
| spec:13 | Entrypoint: `docs-mcp/src/index.ts` | index.ts:1 | IMPLEMENTED | — | Correct file |
| spec:13 | resolves the **docs root** via `--root <dir>` CLI argument (preferred) or `process.cwd()` (fallback) | index.ts:26-34, 61 | IMPLEMENTED | — | parseRootArg() falls back to process.cwd() |
| spec:13 | Separately discovers the **git root** by walking up from the docs root to find a `.git` directory (ADR-0038) | index.ts:40-58, 64 | IMPLEMENTED | — | findGitRoot walks up to filesystem root |
| spec:13 | Opens the SQLite DB at `<docsRoot>/.agent/.docs-index.db` | index.ts:75-77 | IMPLEMENTED | — | agentDir = join(docsRoot, ".agent"); dbPath = join(agentDir, ".docs-index.db") |
| spec:13 | Passes `gitRoot` to `indexAllDocs` and `runLineageScan` | index.ts:88, 97 | IMPLEMENTED | — | indexAllDocs(db, docsDir, gitRoot ?? docsRoot); runLineageScan(db, gitRoot, docsDir) |
| spec:13 | If no `.git` is found, lineage scanning is skipped but content indexing proceeds | index.ts:66-70, 95-102 | IMPLEMENTED | — | gitRoot null check gates lineage scan; indexAllDocs uses docsRoot fallback |
| spec:13 | Starts `startWatcher` for the process lifetime | index.ts:105 | IMPLEMENTED | — | startWatcher called; stopWatcher registered on SIGINT/SIGTERM |
| spec:13 | registers the four MCP tools | index.ts:114-216 | IMPLEMENTED | — | search_docs, get_section, get_lineage, list_docs all registered |
| spec:13 | The docs directory is always `<docsRoot>/docs/`; `--docs-dir` is dashboard-only (ADR-0032) | index.ts:72 | IMPLEMENTED | — | docsDir = join(docsRoot, "docs"); no --docs-dir parsing in index.ts |
| spec:14 | The dashboard accepts a `--docs-dir <path>` flag (ADR-0032) to override `<repoRoot>/docs/` location | boot.ts (dashboard) | — | — | Out of scope (dashboard component); not in docs-mcp source |
| spec:18 | SQLite file at `<repoRoot>/.agent/.docs-index.db`, opened in WAL mode with foreign keys on | db.ts:71-74 | IMPLEMENTED | — | PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL |
| spec:18 | Schema lives in the `SCHEMA_SQL` constant in `src/db.ts` | db.ts:6-65 | IMPLEMENTED | — | SCHEMA_SQL constant defined |
| spec:18 | Schema version tracked in `metadata` table under key `schema_version` | db.ts:79-91 | IMPLEMENTED | — | SELECT/INSERT for schema_version |
| spec:18 | on mismatch or corruption, `openDb` deletes the file and rebuilds | db.ts:86-104 | IMPLEMENTED | — | unlinkSync + recursive openDb call on mismatch; try/catch rebuild on corruption |
| spec:18 | Current version: `"3"` (ADR-0027) | db.ts:4 | IMPLEMENTED | — | SCHEMA_VERSION = "3" |
| spec:26-27 | `documents` table columns: id INTEGER PK, path TEXT UNIQUE, category TEXT, title TEXT, status TEXT, commit_count INTEGER DEFAULT 0, last_status_change TEXT, mtime REAL | db.ts:7-16 | IMPLEMENTED | — | Schema matches exactly |
| spec:35-45 | `sections` table: id PK, doc_id FK CASCADE, heading TEXT, content TEXT, line_start INTEGER, line_end INTEGER | db.ts:18-25 | IMPLEMENTED | — | Schema matches exactly |
| spec:46 | `sections_fts` FTS5 virtual table shadowing `sections(heading, content)` | db.ts:27-32 | IMPLEMENTED | — | sections_fts created with content='sections' |
| spec:46 | Maintained via triggers (`sections_ai`, `sections_ad`, `sections_au`) | db.ts:34-49 | IMPLEMENTED | — | All three triggers defined |
| spec:46 | BM25 ranking via `sections_fts.rank` | tools.ts:124 | IMPLEMENTED | — | ORDER BY rank using sections_fts.rank |
| spec:48-59 | `lineage` table columns: section_a_doc, section_a_heading, section_b_doc, section_b_heading TEXT; commit_count INTEGER DEFAULT 1; last_commit TEXT; PK=(a_doc, a_heading, b_doc, b_heading) | db.ts:51-59 | IMPLEMENTED | — | Schema matches exactly |
| spec:61 | `metadata` table holds `schema_version` and `last_lineage_commit` | db.ts:61-64; lineage-scanner.ts:194-221 | IMPLEMENTED | — | Both keys written/read |
| spec:65 | Pure function: `parseMarkdown(content: string): ParsedDoc` | parser.ts:30 | IMPLEMENTED | — | Correct signature |
| spec:67 | Extracts H1 text as `title` (first `# ` line) | parser.ts:46-48 | IMPLEMENTED | — | /^# / test with title = line.replace |
| spec:68 | Extracts `status` from first line within first 20 matching `/^\*\*Status\*\*:\s*(draft\|accepted\|implemented\|superseded\|withdrawn)\s*$/i` | parser.ts:52-57 | IMPLEMENTED | — | STATUS_RE; lineNum <= 20 check |
| spec:69-70 | Extracts `lastStatusChange` by locating `**Status history**:` marker, collecting consecutive bullets matching `/^\s*-\s*(\d{4}-\d{2}-\d{2}):/`, returning lexicographic max | parser.ts:60-77 | IMPLEMENTED | — | STATUS_HISTORY_MARKER_RE; HISTORY_LINE_RE; dates.reduce |
| spec:70 | `null` if marker absent, list empty, or no matched dates | parser.ts:73-76 | IMPLEMENTED | — | Conditional on dates.length > 0 |
| spec:71 | Splits document into H2 sections; everything before first `## ` is not a section | parser.ts:80-107 | IMPLEMENTED | — | /^## / boundary detection; preamble skipped |
| spec:71 | Each H2 section runs to line before next `## ` or EOF | parser.ts:82-96 | IMPLEMENTED | — | Flush on next ## boundary |
| spec:71 | Sub-headings (###, ####) stay inside parent H2 section | parser.ts:94-96 | IMPLEMENTED | — | Only ## triggers section flush |
| spec:74-80 | `ParsedDoc` shape: title, status, lastStatusChange, sections | parser.ts:10-15 | IMPLEMENTED | — | Interface matches exactly |
| spec:83 | `classifyCategory(filename)`: `adr-*` → `"adr"`; `spec-*` or `feature-list*` → `"spec"`; else `null`; operates on basename | parser.ts:120-126 | IMPLEMENTED | — | Regex tests on base; directory stripped |
| spec:87 | `indexFile(db, absPath, repoRoot): boolean` — compares file mtime against stored row's `mtime`; if identical, returns `false` | content-indexer.ts:45-65 | IMPLEMENTED | — | Math.abs mtime comparison; returns false if unchanged |
| spec:87 | reads file, calls parseMarkdown, upserts `documents` row (path, category, title, status, last_status_change, mtime), replaces sections, returns `true` | content-indexer.ts:68-115 | IMPLEMENTED | — | Full upsert + section replace in transaction |
| spec:87 | `commit_count` never written by indexFile — owned by lineage scanner | content-indexer.ts:80-90 | IMPLEMENTED | — | ON CONFLICT UPDATE excludes commit_count |
| spec:88 | `indexAllDocs(db, docsDir, repoRoot): string[]` — walks every `.md` file, calls `indexFile`, returns changed paths | content-indexer.ts:132-168 | IMPLEMENTED | — | walkMdFiles; returns changed array |
| spec:88 | After walk, deletes `documents` rows whose `path` no longer on disk | content-indexer.ts:153-165 | GAP | CODE→FIX | The stale-removal query hardcodes `WHERE path LIKE 'docs/%.md'` (content-indexer.ts:157-159). When docs live at `spec-driven-dev/docs/` (git-root-relative), stored paths look like `spec-driven-dev/docs/adr-0015.md`, which does NOT match the `docs/%.md` pattern. This means stale entries from subdirectory repos are never cleaned up. The filter should be `WHERE path LIKE '${relDocsDir}/%'` derived from `relative(repoRoot, docsDir)`. |
| spec:89 | `removeFile(db, absPath, repoRoot)` — deletes the `documents` row for a removed file | content-indexer.ts:121-124 | IMPLEMENTED | — | db.run DELETE |
| spec:93 | `startWatcher(db, docsDir, repoRoot, onReindex?: (changed: string[]) => void): () => void` | watcher.ts:10-14 | IMPLEMENTED | — | Signature matches exactly |
| spec:95 | Uses `fs.watch` on `docsDir` (recursive) | watcher.ts:83 | IMPLEMENTED | — | fsWatch(docsDir, { recursive: true }) |
| spec:95 | Events are debounced 100 ms per change, then grouped into single sweep | watcher.ts:7, 22-25 | IMPLEMENTED | — | DEBOUNCE_MS = 100; setTimeout |
| spec:95 | If `fs.watch` throws, falls back to 5 s polling loop | watcher.ts:85-88, 90-98 | IMPLEMENTED | — | try/catch around fsWatch; startPolling() with POLL_INTERVAL_MS=5000 |
| spec:96-97 | If specific `.md` filename: call `indexFile`. Otherwise (no filename or non-.md): call `indexAllDocs`. Dedupe; if non-empty, invoke `onReindex` once per sweep | watcher.ts:34-69 | IMPLEMENTED | — | Branching on filename.endsWith(".md"); deduplication via Set |
| spec:99 | Returns a stop function that tears down the watcher | watcher.ts:101-108 | IMPLEMENTED | — | Returns closure that clears timers/watcher |
| spec:102 | MCP entrypoint does not pass `onReindex` callback | index.ts:105 | IMPLEMENTED | — | startWatcher called with only 3 args (no callback) |
| spec:106 | `runLineageScan(db, repoRoot, docsDir)`. `docsDir` is the absolute path to docs directory. | lineage-scanner.ts:175 | IMPLEMENTED | — | Signature matches exactly |
| spec:106 | Scanner computes `relDocsDir = relative(repoRoot, docsDir)` | lineage-scanner.ts:176 | IMPLEMENTED | — | relative(repoRoot, docsDir).replace(/\\/g, "/") |
| spec:106 | Uses `${relDocsDir}/*.md` as git pathspec | lineage-scanner.ts:54-55, 118-119 | IMPLEMENTED | — | `${relDocsDir}/*.md` in diff-tree and diff commands |
| spec:108 | Runs on every boot of MCP server | index.ts:95-102 | IMPLEMENTED | — | runLineageScan called after openDb on boot |
| spec:108 | again via watcher whenever HEAD advances | watcher.ts:55-63 | IMPLEMENTED | — | getHeadCommit compared to lastHead; triggers runLineageScan |
| spec:108 | Iterates commits touching `${relDocsDir}/*.md`, starting from `last_lineage_commit + 1` if present | lineage-scanner.ts:198-204 | IMPLEMENTED | — | `${lastCommit}..HEAD` vs full `--reverse` |
| spec:111 | For each commit: increment `documents.commit_count` by 1 BEFORE `modifiedFiles.length < 2` check | lineage-scanner.ts:232-238 | IMPLEMENTED | — | UPDATE commit_count loop runs before the length < 2 guard |
| spec:113 | If `modifiedFiles.length < 2`, return (no pairs to emit) | lineage-scanner.ts:239-241 | IMPLEMENTED | — | Early return |
| spec:113-114 | Otherwise: parse file at commit SHA, expand to touched H2 sections, upsert lineage rows with `commit_count + 1, last_commit = hash` | lineage-scanner.ts:256-290 | IMPLEMENTED | — | getFileAtCommit → parseMarkdown → touchedSections → upsertLineage (both orderings) |
| spec:115 | Update `metadata.last_lineage_commit` to this commit's short hash | lineage-scanner.ts:221 | PARTIAL | SPEC→FIX | The scanner stores the full commit hash (from `git rev-parse HEAD`), not a short hash. The spec says "short hash" but the stored value is the full 40-char hash from HEAD. The lineage row's `last_commit` field (from `last_commit = <short hash>` in spec) is populated via upsertLineage with the full hash from the commits list. Spec should clarify "full hash" vs "short hash" — the implementation consistently uses full hashes for `last_lineage_commit`. |
| spec:116 | Incremental rescan: subsequent runs start where previous run left off | lineage-scanner.ts:192-203 | IMPLEMENTED | — | last_lineage_commit read from metadata; `${lastCommit}..HEAD` range used |
| spec:120 | All four tools take a `Database` handle and a validated args object (Zod schemas) | tools.ts:53-86, 90-264 | IMPLEMENTED | — | Zod schemas defined; Database passed to each function |
| spec:122-126 | `search_docs` Input: `{query, category?, status?, limit?}`. SQL: joins sections_fts MATCH → sections → documents, filters category/status, orders by rank, LIMIT. Returns `{doc_path, doc_title, category, heading, snippet, line_start, line_end, rank}[]` | tools.ts:53-58, 90-132 | IMPLEMENTED | — | Schema + SQL match spec exactly |
| spec:126 | `snippet` uses `snippet(sections_fts, 1, '[', ']', '...', 32)` | tools.ts:115 | IMPLEMENTED | — | Exact call matches spec |
| spec:128 | FTS5 query syntax exposed directly — callers can use phrases, AND/OR/NOT, prefix, column filters | tools.ts:126-131 | IMPLEMENTED | — | Query passed directly to MATCH; error caught as "FTS5 query error" |
| spec:130-134 | `get_section` Input: `{doc_path, heading}`. Returns `{doc_path, doc_title, category, heading, content, line_start, line_end}`. Throws "Section not found: <doc_path> / <heading>" | tools.ts:60-65, 134-159 | IMPLEMENTED | — | Exact error message; return shape matches |
| spec:136-158 | `get_lineage` Input: `{doc_path, heading?}`. Section mode (heading non-empty): returns LineageResult[]. Doc mode (heading absent/empty): aggregated one row per co-committed doc, SUM(commit_count), MAX(last_commit), heading="" | tools.ts:67-81, 162-214 | IMPLEMENTED | — | Both modes implemented; heading="" in doc mode |
| spec:144 | No status filter in either mode (ADR-0027) | tools.ts:176-196, 198-214 | IMPLEMENTED | — | No WHERE status clause in either query |
| spec:144 | Every row includes linked doc's `status` | tools.ts:184, 204 | IMPLEMENTED | — | d.status AS status in doc mode; d.status in section mode |
| spec:144 | Tool description instructs agents to use `status` for framing | index.ts:166-171 | IMPLEMENTED | — | MCP description text mentions framing guidance |
| spec:145 | Ordered by `commit_count DESC` in both modes | tools.ts:193, 213 | IMPLEMENTED | — | ORDER BY commit_count DESC in both queries |
| spec:147-157 | `LineageResult` shape: doc_path, doc_title, category, heading, status, commit_count, last_commit | tools.ts:29-37 | IMPLEMENTED | — | Interface matches exactly |
| spec:160-177 | `list_docs` Input: `{category?, status?}`. Returns `ListDoc[]` with doc_path, title, category, status, commit_count, last_status_change, sections[]. Sections fetched per doc ordered by line_start | tools.ts:83-86, 217-264 | IMPLEMENTED | — | All fields returned; sections ordered by line_start |
| spec:184-186 | `readRawDoc(repoRoot, docPath)`: joins repoRoot + docPath, verifies resolved path remains inside repoRoot (rejects `..` escape), reads file, returns contents. Throws `NotFoundError` if missing or path escapes | tools.ts:286-300 | IMPLEMENTED | — | resolve + startsWith check; existsSync; NotFoundError |
| spec:186 | Per ADR-0033: previous `<repoRoot>/docs/` containment check was removed — doc paths may live in any subdirectory | tools.ts:286-300 | IMPLEMENTED | — | Only repoRoot containment check; no /docs/ restriction |
| spec:190-202 | `package.json` exports map: `./parser`, `./db`, `./content-indexer`, `./lineage-scanner`, `./watcher`, `./tools` → respective src files | package.json:exports | IMPLEMENTED | — | All six export entries present |
| spec:207 | Missing/corrupt `.docs-index.db` → deleted and rebuilt | db.ts:92-104 | IMPLEMENTED | — | Corruption catch deletes and rebuilds |
| spec:207 | Schema version mismatch → same rebuild path | db.ts:86-91 | IMPLEMENTED | — | unlinkSync + recursive openDb |
| spec:208 | `fs.watch` throws → poll every 5 s | watcher.ts:85-98 | IMPLEMENTED | — | catch → startPolling() |
| spec:209 | FTS5 syntax error → thrown as "FTS5 query error: <detail>" | tools.ts:129-131 | IMPLEMENTED | — | throw new Error(`FTS5 query error: ${err}`) |
| spec:210 | `get_section` miss → throws "Section not found" | tools.ts:156-158 | IMPLEMENTED | — | throw new Error(`Section not found: ${doc_path} / ${heading}`) |
| spec:211 | `readRawDoc` path escape or missing file → throws `NotFoundError` | tools.ts:271-299 | IMPLEMENTED | — | NotFoundError class defined and thrown |

### Phase 2 — Code → Spec

| File:lines | Classification | Explanation |
|------------|---------------|-------------|
| index.ts:1-18 | INFRA | Imports for MCP SDK, path, fs, and internal modules — necessary for boot sequence |
| index.ts:20-34 | INFRA | `parseRootArg()` helper — reads `--root` CLI arg. Required by spec §Runtime |
| index.ts:40-58 | INFRA | `findGitRoot()` helper — walks up to `.git`. Required by ADR-0038 / spec §Runtime |
| index.ts:60-82 | INFRA | Boot-time resolution of docsRoot, gitRoot, docsDir, agentDir, dbPath + logging. All spec'd in §Runtime |
| index.ts:83-102 | INFRA | openDb call + initial indexAllDocs + initial runLineageScan — all spec'd in §Runtime |
| index.ts:104-111 | INFRA | startWatcher + McpServer construction — spec'd in §Runtime and §MCP tools |
| index.ts:113-216 | INFRA | Tool handler wrappers (try/catch around tool functions, JSON serialization). Necessary bridge between MCP SDK and spec'd tool functions |
| index.ts:218-232 | INFRA | Transport connect + SIGINT/SIGTERM handlers — necessary process lifecycle management |
| db.ts:1-3 | INFRA | Imports |
| db.ts:4 | INFRA | SCHEMA_VERSION constant — spec'd as "3" |
| db.ts:6-65 | INFRA | SCHEMA_SQL — spec'd in §Data store |
| db.ts:67-108 | INFRA | `openDb` implementation — spec'd §Data store error handling |
| parser.ts:1-127 | INFRA | All of parser.ts is spec'd in §Parser |
| content-indexer.ts:1-39 | INFRA | Imports + `walkMdFiles` helper — required by `indexAllDocs` spec |
| content-indexer.ts:45-168 | INFRA | `indexFile`, `removeFile`, `indexAllDocs` — all spec'd in §Content indexer |
| content-indexer.ts:153-165 | UNSPEC'd | Stale-removal query `WHERE path LIKE 'docs/%.md'` is a hardcoded assumption about path layout. This is the same code flagged as a GAP in Phase 1 — it also represents unspecced behavior (the spec describes "deletes documents rows whose path is no longer present on disk" without specifying how the candidate set is selected; the code's LIKE filter is an undocumented implementation detail that breaks in multi-level repo layouts) |
| watcher.ts:1-9 | INFRA | Imports + DEBOUNCE_MS/POLL_INTERVAL_MS constants — spec'd in §Watcher |
| watcher.ts:10-109 | INFRA | `startWatcher` — fully spec'd in §Watcher |
| watcher.ts:72 | INFRA | Unused variable type annotation `ReturnType<typeof Bun.file>` for `watcher` — watcher is set via `require("fs").watch` not Bun.file. Minor type mismatch but not a logic error |
| lineage-scanner.ts:1-5 | INFRA | Imports |
| lineage-scanner.ts:10-18 | INFRA | `git()` helper — necessary infrastructure for shelling out to git |
| lineage-scanner.ts:23-26 | INFRA | `isGitAvailable()` — exported helper; used by watcher.ts indirectly (via isGitAvailable check in runLineageScan); also exported for tests |
| lineage-scanner.ts:31-34 | INFRA | `getHeadCommit()` — exported; consumed by watcher.ts:17,55 for HEAD change detection |
| lineage-scanner.ts:39-46 | INFRA | `isRootCommit()` — private helper for root-commit special casing in git diff-tree |
| lineage-scanner.ts:51-63 | INFRA | `getModifiedDocFiles()` — private helper; used by processCommitForLineage |
| lineage-scanner.ts:68-70 | INFRA | `getFileAtCommit()` — private helper; used by processCommitForLineage |
| lineage-scanner.ts:72-110 | INFRA | `DiffHunk`, `parseDiffHunks` — exported; called by getCommitDiffHunks; exported for tests |
| lineage-scanner.ts:115-124 | INFRA | `getCommitDiffHunks()` — private helper; used by processCommitForLineage |
| lineage-scanner.ts:126-149 | INFRA | `SectionBoundary`, `touchedSections` — exported; called by processCommitForLineage; exported for tests |
| lineage-scanner.ts:154-169 | INFRA | `upsertLineage()` — private helper; called by processCommitForLineage |
| lineage-scanner.ts:175-222 | INFRA | `runLineageScan` — spec'd in §Lineage scanner |
| lineage-scanner.ts:227-291 | UNSPEC'd | `processCommitForLineage` is exported but not mentioned in the spec. It's consumed internally by `runLineageScan` and also by watcher tests. The export is needed for testing; it's reasonable infrastructure but the spec doesn't describe it as a named export |
| tools.ts:1-4 | INFRA | Imports |
| tools.ts:8-47 | INFRA | TypeScript interfaces (SearchResult, SectionResult, LineageResult, ListDoc) — shape defined by spec §MCP tools |
| tools.ts:49-86 | INFRA | Zod schemas — required for input validation per spec §MCP tools |
| tools.ts:90-264 | INFRA | Tool implementations — all spec'd in §MCP tools |
| tools.ts:271-300 | INFRA | `NotFoundError` class + `readRawDoc` — spec'd in §Shared helpers |

### Phase 3 — Test Coverage

| Spec (doc:line) | Spec text | Unit test | E2E test | Verdict |
|-----------------|-----------|-----------|----------|---------|
| spec:3-5 | stdio transport MCP server | — | — | UNTESTED — no test exercises the MCP server end-to-end through the stdio transport |
| spec:11-13 | Entrypoint boot sequence (--root, findGitRoot, openDb, indexAllDocs, startWatcher) | — | — | UNTESTED — index.ts has no tests; boot logic is implicitly tested through component tests |
| spec:65-82 | `parseMarkdown` — title, sections, sub-headings, line numbers, preamble skip | parser.test.ts: "extracts H1 title", "splits on ## headings", etc. | — | UNIT_ONLY — comprehensive unit tests; no e2e test of the full parse-to-index-to-query pipeline |
| spec:68 | Status extraction from first 20 lines | recursion-and-status.test.ts: "extracts 'draft' status" etc. | — | UNIT_ONLY |
| spec:69-70 | `lastStatusChange` extraction from status history bullets | parser.test.ts: "extracts the latest date" etc. | — | UNIT_ONLY |
| spec:83 | `classifyCategory` basename detection | parser.test.ts: "adr- prefix → adr" etc. | — | UNIT_ONLY |
| spec:87 | `indexFile` mtime skip, upsert, section replace | content-indexer.test.ts: full describe block | — | UNIT_ONLY |
| spec:87 | `commit_count` not written by indexFile | content-indexer.test.ts: "commit_count starts at 0" | — | UNIT_ONLY |
| spec:88 | `indexAllDocs` walks all .md, returns changed paths, deletes stale rows | content-indexer.test.ts: indexAllDocs describe block; recursion-and-status.test.ts: recursion tests | — | UNIT_ONLY |
| spec:88 (GAP) | Stale-removal hardcoded `LIKE 'docs/%.md'` (the GAP) | recursion-and-status.test.ts: "stale-removal correctly removes nested files" — BUT the test uses the same repoRoot as docsDir parent so stored paths match `docs/%.md`; the subdirectory scenario (e.g., `spec-driven-dev/docs/`) is not tested | — | UNIT_ONLY — and the specific broken case (git-root-relative paths like spec-driven-dev/docs/...) is UNTESTED |
| spec:89 | `removeFile` | content-indexer.test.ts: "returns false and removes from DB when file is deleted" (via indexFile) | — | UNIT_ONLY |
| spec:93-100 | `startWatcher` signature, debounce, polling fallback, onReindex | watcher.test.ts: full suite | — | UNIT_ONLY |
| spec:106-116 | `runLineageScan` — incremental, commit_count, lineage upsert, symmetric pairs | lineage-scanner.test.ts: full suite | — | UNIT_ONLY |
| spec:115 | `last_lineage_commit` stored after scan | lineage-scanner.test.ts: "stores last_lineage_commit in metadata" | — | UNIT_ONLY |
| spec:120-132 | `search_docs` — FTS5 match, category/status filters, rank, snippet | fts.test.ts: full suite; recursion-and-status.test.ts: searchDocs status filter | — | UNIT_ONLY |
| spec:130-134 | `get_section` — returns content, metadata; throws "Section not found" | tools.test.ts: getSection describe | — | UNIT_ONLY |
| spec:136-157 | `get_lineage` — section mode + doc mode (ADR-0031) | lineage.test.ts: full suite including doc-mode suite | — | UNIT_ONLY |
| spec:144 | No status filter in lineage; all statuses returned with status field | recursion-and-status.test.ts: "getLineage — no status filter (ADR-0027)" | — | UNIT_ONLY |
| spec:160-177 | `list_docs` — category + status filters, sections ordered by line_start, all fields | tools.test.ts: listDocs describe; recursion-and-status.test.ts: listDocs status filter | — | UNIT_ONLY |
| spec:184-186 | `readRawDoc` — containment check, NotFoundError, path escape rejection | tools.test.ts: readRawDoc describe | — | UNIT_ONLY |
| spec:18 | `openDb` WAL mode, FK on, schema version, rebuild on mismatch/corruption | fts.test.ts uses openDb; db.ts tested implicitly through all test suites | — | UNIT_ONLY — rebuild-on-corruption path not explicitly tested |
| spec:207-211 | Error handling paths (corruption rebuild, polling fallback, FTS5 error, Section not found) | fts.test.ts: "FTS5 syntax error"; tools.test.ts: "throws error for missing doc"; watcher.test.ts: polling tested implicitly | — | UNIT_ONLY |

### Phase 4 — Bug Triage

No `.agent/bugs/` directory found at project root or component level. No open bugs to triage.

| Bug | Title | Verdict | Notes |
|-----|-------|---------|-------|
| — | — | — | No bugs directory found |

### Summary

- Implemented: 61
- Gap: 1
- Partial: 1
- Infra: 39
- Unspec'd: 2
- Dead: 0
- Tested: 0
- Unit only: 21
- E2E only: 0
- Untested: 2
- Bugs fixed: 0
- Bugs open: 0
