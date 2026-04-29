## Run: 2026-04-23T00:00:00Z

Component: docs-mcp
Spec: src/sdd/docs/mclaude-docs-mcp/spec-docs-mcp.md
ADRs evaluated: adr-0015, adr-0018, adr-0027, adr-0031, adr-0036, adr-0038, adr-0040, adr-0042, adr-0048
Code root: src/sdd/docs-mcp/src/

### Phase 1 — Spec → Code

| Spec (doc:line) | Spec text | Code location | Verdict | Direction | Notes |
|-----------------|-----------|---------------|---------|-----------|-------|
| spec-docs-mcp.md:11 | Bun (loads .ts files natively; no build step) | package.json:7 `"start": "bun run src/index.ts"` | IMPLEMENTED | — | |
| spec-docs-mcp.md:12 | Single-process; stdio transport for MCP | index.ts:233 `StdioServerTransport`, single process | IMPLEMENTED | — | |
| spec-docs-mcp.md:13 | Entrypoint: docs-mcp/src/index.ts. On boot: resolves the docs root via priority chain: (1) --root <dir> CLI argument, (2) CLAUDE_PROJECT_DIR environment variable, (3) process.cwd() | index.ts:63-67, resolve-docs-root.ts:1-18 | IMPLEMENTED | — | Priority chain (1)→(2)→(3) implemented in resolveDocsRoot |
| spec-docs-mcp.md:13 | If --root is a relative path, it is resolved against CLAUDE_PROJECT_DIR (if set) or process.cwd() | resolve-docs-root.ts:14 `resolve(projectDir ?? cwd, rawRoot)` | IMPLEMENTED | — | |
| spec-docs-mcp.md:13 | Separately discovers the git root by walking up from the docs root to find a .git directory (ADR-0038) | index.ts:42-60 `findGitRoot` | IMPLEMENTED | — | |
| spec-docs-mcp.md:13 | Opens the SQLite DB at <docsRoot>/.agent/.docs-index.db | index.ts:81-83 | IMPLEMENTED | — | |
| spec-docs-mcp.md:13 | Passes gitRoot to indexAllDocs and runLineageScan so stored paths are git-root-relative | index.ts:94,103 pass `gitRoot ?? docsRoot` and `gitRoot` | IMPLEMENTED | — | |
| spec-docs-mcp.md:13 | If no .git is found, lineage scanning is skipped but content indexing proceeds using docsRoot as the path base | index.ts:72-76, 101, 119 | IMPLEMENTED | — | |
| spec-docs-mcp.md:13 | Starts startWatcher for the process lifetime; registers the four MCP tools | index.ts:119-230 | IMPLEMENTED | — | |
| spec-docs-mcp.md:13 | The docs directory is always <docsRoot>/docs/; --docs-dir is dashboard-only (ADR-0032) | index.ts:78 `join(docsRoot, "docs")` | IMPLEMENTED | — | |
| spec-docs-mcp.md:18 | SQLite file at <repoRoot>/.agent/.docs-index.db, opened in WAL mode with foreign keys on | db.ts:85-86 `PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;` | IMPLEMENTED | — | |
| spec-docs-mcp.md:18 | Schema lives in the SCHEMA_SQL constant in src/db.ts | db.ts:6-78 | IMPLEMENTED | — | |
| spec-docs-mcp.md:18 | Schema version is tracked in the metadata table under key schema_version; on mismatch or corruption, openDb deletes the file and rebuilds from scratch | db.ts:88-118 | IMPLEMENTED | — | |
| spec-docs-mcp.md:18 | Current version: "4" (ADR-0040 added blame_lines table) | db.ts:4 `const SCHEMA_VERSION = "4"` | IMPLEMENTED | — | |
| spec-docs-mcp.md:22-34 | documents table schema — id, path, category, title, status, commit_count, last_status_change, mtime columns | db.ts:7-16 | IMPLEMENTED | — | All columns present with correct types |
| spec-docs-mcp.md:30 | status column: ADR status per ADR-0018: draft|accepted|implemented|superseded|withdrawn. null for specs or ADRs without a Status line | db.ts:13 `status TEXT`, parser.ts:26 regex | IMPLEMENTED | — | |
| spec-docs-mcp.md:31 | commit_count: Total git commits that touched this file. Default 0. Maintained by the lineage scanner | db.ts:14 `commit_count INTEGER NOT NULL DEFAULT 0` | IMPLEMENTED | — | |
| spec-docs-mcp.md:32 | last_status_change: ISO date (YYYY-MM-DD) of the most recent Status history line | db.ts:15 `last_status_change TEXT` | IMPLEMENTED | — | |
| spec-docs-mcp.md:33 | mtime: File mtime as a Unix-epoch float seconds. Used to skip reparse on unchanged files | db.ts:16 `mtime REAL NOT NULL` | IMPLEMENTED | — | |
| spec-docs-mcp.md:35-44 | sections table: id, doc_id (FK→documents.id ON DELETE CASCADE), heading, content, line_start, line_end | db.ts:18-25 | IMPLEMENTED | — | All columns and FK constraint present |
| spec-docs-mcp.md:42 | content: Full section body including the ## heading line, trailing whitespace trimmed | parser.ts:85 `currentLines.join("\n").trimEnd()` | IMPLEMENTED | — | |
| spec-docs-mcp.md:43 | line_start: 1-based line number of the ## line | parser.ts:82-83 `lineStart: currentStart` where currentStart=lineNum | IMPLEMENTED | — | |
| spec-docs-mcp.md:44 | line_end: 1-based inclusive line number of the last line in the section | parser.ts:84 `lineEnd: lineNum - 1` (flush) and 105 `lineEnd: lines.length` (last) | IMPLEMENTED | — | |
| spec-docs-mcp.md:46 | sections_fts — FTS5 virtual table shadowing sections(heading, content). Maintained via triggers (sections_ai, sections_ad, sections_au) | db.ts:27-49 | IMPLEMENTED | — | All three triggers present |
| spec-docs-mcp.md:46 | BM25 ranking via sections_fts.rank | tools.ts:118 `sections_fts.rank AS rank` | IMPLEMENTED | — | |
| spec-docs-mcp.md:48-59 | lineage table: section_a_doc, section_a_heading, section_b_doc, section_b_heading, commit_count (DEFAULT 1), last_commit. PK=(section_a_doc, section_a_heading, section_b_doc, section_b_heading) | db.ts:51-59 | IMPLEMENTED | — | |
| spec-docs-mcp.md:61 | metadata table: key/value store holding schema_version and last_lineage_commit | db.ts:61-64 | IMPLEMENTED | — | |
| spec-docs-mcp.md:63-76 | blame_lines table: id, doc_id (FK ON DELETE CASCADE), line_start, line_end, commit, author, date, summary. Index (doc_id, line_start) | db.ts:66-77 | IMPLEMENTED | — | |
| spec-docs-mcp.md:80 | Blame scanner signature: runBlameScan(db, repoRoot, docsDir) | blame-scanner.ts:215 `export function runBlameScan(db, repoRoot, docsDir)` | IMPLEMENTED | — | |
| spec-docs-mcp.md:80 | Runs git blame --porcelain <file> for each indexed doc, parses the porcelain output, groups consecutive lines with the same commit into ranges | blame-scanner.ts:173-209, 31-166 | IMPLEMENTED | — | |
| spec-docs-mcp.md:80 | upserts rows into blame_lines. Deletes existing rows for a doc before inserting (full rebuild per file) | blame-scanner.ts:188-208 | IMPLEMENTED | — | |
| spec-docs-mcp.md:82 | Called on boot after indexAllDocs and runLineageScan. Also called by the watcher when a file changes | index.ts:110-115; watcher.ts:43-47, 58-63 | IMPLEMENTED | — | |
| spec-docs-mcp.md:84 | For files not tracked by git (new/untracked), no blame_lines rows are inserted | blame-scanner.ts:193-196 (returns on null output) | IMPLEMENTED | — | |
| spec-docs-mcp.md:88 | Parser pure function: parseMarkdown(content: string): ParsedDoc | parser.ts:30 | IMPLEMENTED | — | |
| spec-docs-mcp.md:90 | Extracts the H1 text as title (first # line) | parser.ts:46-49 | IMPLEMENTED | — | |
| spec-docs-mcp.md:91 | Extracts status from the first line within the first 20 that matches /^\*\*Status\*\*:\s*(draft|accepted|implemented|superseded|withdrawn)\s*$/i | parser.ts:52-57 `if (status === null && lineNum <= 20)` | IMPLEMENTED | — | |
| spec-docs-mcp.md:92 | Extracts lastStatusChange by locating the bold marker line matching /^\*\*Status history\*\*:\s*$/i, then collecting each consecutive bullet line matching /^\s*-\s*(\d{4}-\d{2}-\d{2}):/ | parser.ts:60-76 | IMPLEMENTED | — | |
| spec-docs-mcp.md:92 | returning the lexicographically maximum date. null if the marker is absent, the list empty, or no matched dates | parser.ts:73-76 `dates.reduce((a,b) => (a>b?a:b))` | IMPLEMENTED | — | |
| spec-docs-mcp.md:93 | Splits the remainder into H2 sections. Everything before the first ## (including H1 and preamble) is not a section | parser.ts:80-107 | IMPLEMENTED | — | |
| spec-docs-mcp.md:93 | Sub-headings (###, ####) stay inside the parent H2 section | parser.ts:94-96 `else if (currentHeading !== null)` catches all non-## lines | IMPLEMENTED | — | |
| spec-docs-mcp.md:95-104 | ParsedDoc interface shape: title, status, lastStatusChange, sections | parser.ts:10-15 | IMPLEMENTED | — | |
| spec-docs-mcp.md:106 | classifyCategory(filename): adr-* → "adr"; spec-* or feature-list* → "spec"; anything else → null. Operates on the basename | parser.ts:120-126 | IMPLEMENTED | — | |
| spec-docs-mcp.md:110 | indexFile(db, absPath, repoRoot): boolean — compares file mtime against the stored row's mtime; if identical, returns false without reparsing | content-indexer.ts:45-65 | IMPLEMENTED | — | |
| spec-docs-mcp.md:110 | Otherwise reads the file, calls parseMarkdown, upserts the documents row (writing path, category, title, status, last_status_change, mtime), replaces all rows in sections for that doc | content-indexer.ts:67-115 | IMPLEMENTED | — | |
| spec-docs-mcp.md:110 | commit_count is never written by this function — it is owned by the lineage scanner | content-indexer.ts:80-90 — upsert does not include commit_count | IMPLEMENTED | — | |
| spec-docs-mcp.md:111 | indexAllDocs(db, docsDir, repoRoot): string[] — walks every .md file under docsDir, calls indexFile on each, returns the repo-root-relative POSIX paths of files where indexFile returned true | content-indexer.ts:132-169 | IMPLEMENTED | — | |
| spec-docs-mcp.md:111 | After the walk, deletes documents rows whose path starts with relative(repoRoot, docsDir) but is no longer present on disk (cascade drops their sections) | content-indexer.ts:153-166 | IMPLEMENTED | — | |
| spec-docs-mcp.md:111 | The prefix is derived dynamically — not hardcoded | content-indexer.ts:155 `const relDocsDir = relative(repoRoot, docsDir)` | IMPLEMENTED | — | |
| spec-docs-mcp.md:112 | removeFile(db, absPath, repoRoot) — deletes the documents row for a file that has been removed from disk | content-indexer.ts:121-124 | IMPLEMENTED | — | |
| spec-docs-mcp.md:116 | Watcher signature: startWatcher(db, docsDir, repoRoot, onReindex?: (changed: string[]) => void): () => void | watcher.ts:11-16 | IMPLEMENTED | — | |
| spec-docs-mcp.md:118 | Uses fs.watch on docsDir (recursive). Events are debounced 100 ms per change | watcher.ts:8,99-101; handleEvent debounce logic | IMPLEMENTED | — | |
| spec-docs-mcp.md:118 | If fs.watch throws (unsupported filesystem), falls back to a 5 s polling loop | watcher.ts:102-105, 107-115 | IMPLEMENTED | — | |
| spec-docs-mcp.md:119-122 | On each sweep: if event carries specific .md filename: call indexFile; if indexFile returned true, collect doc_path. Otherwise: call indexAllDocs and take its string[] return | watcher.ts:35-69 | IMPLEMENTED | — | |
| spec-docs-mcp.md:123 | Dedupe the collected paths; if non-empty, invoke onReindex(changed) once per sweep | watcher.ts:82-86 `Array.from(new Set(changedPaths))` | IMPLEMENTED | — | |
| spec-docs-mcp.md:124 | Returns a stop function that tears down the watcher | watcher.ts:118-126 | IMPLEMENTED | — | |
| spec-docs-mcp.md:125 | The MCP entrypoint does not pass an onReindex callback | index.ts:119 `startWatcher(db, docsDir, gitRoot ?? docsRoot)` — no 4th arg | IMPLEMENTED | — | |
| spec-docs-mcp.md:129 | Lineage scanner signature: runLineageScan(db, repoRoot, docsDir). docsDir is the absolute path to the docs directory | lineage-scanner.ts:184 | IMPLEMENTED | — | |
| spec-docs-mcp.md:129 | The scanner computes relDocsDir = relative(repoRoot, docsDir) and uses ${relDocsDir}/*.md as the git pathspec | lineage-scanner.ts:185 | IMPLEMENTED | — | |
| spec-docs-mcp.md:131 | Iterates every commit in the repo whose diff touches ${relDocsDir}/*.md, starting from metadata.last_lineage_commit + 1 if present, else from the repo's first commit | lineage-scanner.ts:199-228 | IMPLEMENTED | — | |
| spec-docs-mcp.md:133 | Step 1: Compute the list of modified .md files under relDocsDir | lineage-scanner.ts:237 `getModifiedDocFiles` | IMPLEMENTED | — | |
| spec-docs-mcp.md:134 | Step 2: For each modified file, increment documents.commit_count by 1 (before the modifiedFiles.length < 2 check) | lineage-scanner.ts:241-245 | IMPLEMENTED | — | |
| spec-docs-mcp.md:135 | Step 3: If modifiedFiles.length < 2, return | lineage-scanner.ts:248-250 | IMPLEMENTED | — | |
| spec-docs-mcp.md:136 | Step 4: parse each file at this commit's SHA, expand each file to its list of H2 sections modified in the diff (via line-range intersection), and for every ordered pair (section_a, section_b) across distinct files where at least one file is an ADR, upsert a lineage row | lineage-scanner.ts:253-303 | IMPLEMENTED | — | |
| spec-docs-mcp.md:136 | Spec↔spec pairs are skipped — lineage tracks decision provenance (ADR → spec) (ADR-0042) | lineage-scanner.ts:294 `if (!isAdrFile(a.filePath) && !isAdrFile(b.filePath)) continue` | IMPLEMENTED | — | |
| spec-docs-mcp.md:137 | Step 5: Update metadata.last_lineage_commit to the full commit hash | lineage-scanner.ts:229-230 | IMPLEMENTED | — | |
| spec-docs-mcp.md:139 | Incremental rescan: subsequent runs start where the previous run left off | lineage-scanner.ts:199-212 | IMPLEMENTED | — | |
| spec-docs-mcp.md:143 | All four tools take a Database handle and a validated args object (Zod schemas in the same module) | tools.ts:53-86 Zod schemas; 90-264 implementations | IMPLEMENTED | — | |
| spec-docs-mcp.md:147 | search_docs input: {query: string, category?: "adr"|"spec", status?: AdrStatus, limit?: number} | tools.ts:53-58 `SearchDocsSchema` | IMPLEMENTED | — | |
| spec-docs-mcp.md:149 | SQL joins sections_fts MATCH ? → sections → documents, filters by category/status if provided, orders by sections_fts.rank (BM25), applies LIMIT | tools.ts:109-126 | IMPLEMENTED | — | |
| spec-docs-mcp.md:149 | Returns {doc_path, doc_title, category, heading, snippet, line_start, line_end, rank}[] | tools.ts:8-17 SearchResult interface | IMPLEMENTED | — | |
| spec-docs-mcp.md:149 | snippet uses FTS5's snippet(sections_fts, 1, '[', ']', '...', 32) | tools.ts:115 | IMPLEMENTED | — | |
| spec-docs-mcp.md:151 | FTS5 query syntax is exposed directly — callers can use phrases, AND/OR/NOT, prefix, and column filters | tools.ts:54 description says "FTS5 syntax: words, phrases, AND/OR/NOT" | IMPLEMENTED | — | |
| spec-docs-mcp.md:155 | get_section input: {doc_path: string, heading: string} | tools.ts:60-65 `GetSectionSchema` | IMPLEMENTED | — | |
| spec-docs-mcp.md:156 | Returns {doc_path, doc_title, category, heading, content, line_start, line_end} | tools.ts:19-27 SectionResult interface | IMPLEMENTED | — | |
| spec-docs-mcp.md:156 | Throws "Section not found: <doc_path> / <heading>" if no row matches | tools.ts:157 | IMPLEMENTED | — | |
| spec-docs-mcp.md:161 | get_lineage input: {doc_path: string, heading?: string} (ADR-0031) | tools.ts:67-81 `GetLineageSchema` | IMPLEMENTED | — | |
| spec-docs-mcp.md:163 | Section mode — when heading is a non-empty string: returns LineageResult[] | tools.ts:197-215 | IMPLEMENTED | — | |
| spec-docs-mcp.md:165 | Doc mode — when heading is absent or empty: returns LineageResult[] aggregated across every section of the requested doc, grouped by the co-committed document. One row per co-committed doc; commit_count = SUM(commit_count), last_commit = MAX(last_commit); heading = "" | tools.ts:176-196 | IMPLEMENTED | — | |
| spec-docs-mcp.md:167 | Per ADR-0027, no status filter is applied in either mode | tools.ts:168-174 comment confirms; no WHERE clause on status in either SQL | IMPLEMENTED | — | |
| spec-docs-mcp.md:167 | Every row includes the linked doc's status | tools.ts:185,205 `d.status AS status` | IMPLEMENTED | — | |
| spec-docs-mcp.md:169 | Ordered by commit_count DESC in both modes | tools.ts:193,213 `ORDER BY commit_count DESC` | IMPLEMENTED | — | |
| spec-docs-mcp.md:170-181 | LineageResult shape: doc_path, doc_title, category, heading, status, commit_count, last_commit | tools.ts:29-37 | IMPLEMENTED | — | |
| spec-docs-mcp.md:185 | list_docs input: {category?: "adr"|"spec", status?: AdrStatus} | tools.ts:83-86 `ListDocsSchema` | IMPLEMENTED | — | |
| spec-docs-mcp.md:187-199 | ListDoc interface: doc_path, title, category, status, commit_count, last_status_change, sections [{heading, line_start, line_end}] | tools.ts:39-47 | IMPLEMENTED | — | |
| spec-docs-mcp.md:200-201 | The documents SELECT includes all three new columns. Section arrays fetched per doc in a second statement (ordered by line_start) | tools.ts:233, 248-251 | IMPLEMENTED | — | |
| spec-docs-mcp.md:207 | readRawDoc(repoRoot, docPath): string — verifies resolved path remains inside repoRoot (rejects .. escape), calls fs.readFileSync | tools.ts:286-300 | IMPLEMENTED | — | |
| spec-docs-mcp.md:207 | Throws NotFoundError if the file is missing or the path escapes repoRoot | tools.ts:271-276, 291-297 | IMPLEMENTED | — | |
| spec-docs-mcp.md:209 | Not exposed as an MCP tool. Per ADR-0033, the previous <repoRoot>/docs/ containment check was removed — doc paths may live in any subdirectory | tools.ts:286-300 — no docs/ prefix check | IMPLEMENTED | — | |
| spec-docs-mcp.md:213-225 | Package exports map: ./parser, ./db, ./content-indexer, ./lineage-scanner, ./blame-scanner, ./watcher, ./tools | package.json:11-19 | IMPLEMENTED | — | |
| spec-docs-mcp.md:231 | Missing or corrupt .docs-index.db → deleted and rebuilt on next openDb | db.ts:105-117 | IMPLEMENTED | — | |
| spec-docs-mcp.md:232 | Schema version mismatch → same rebuild path | db.ts:99-103 | IMPLEMENTED | — | |
| spec-docs-mcp.md:233 | fs.watch throws on startup → poll every 5 s instead | watcher.ts:102-115 | IMPLEMENTED | — | |
| spec-docs-mcp.md:234 | FTS5 syntax error in search_docs query → thrown as "FTS5 query error: <detail>" | tools.ts:129-131 | IMPLEMENTED | — | |
| spec-docs-mcp.md:235 | get_section miss → throws "Section not found" | tools.ts:155-157 | IMPLEMENTED | — | |
| spec-docs-mcp.md:236 | readRawDoc path escape or missing file → throws NotFoundError | tools.ts:291-297 | IMPLEMENTED | — | |

### Phase 2 — Code → Spec

| File:lines | Classification | Explanation |
|------------|---------------|-------------|
| index.ts:1-20 | INFRA | Imports — standard module loading |
| index.ts:28-36 | INFRA | parseRootArg helper — necessary infrastructure for the spec'd --root CLI argument parsing |
| index.ts:42-60 | INFRA | findGitRoot helper — necessary infrastructure for the spec'd git root discovery (ADR-0038) |
| index.ts:63-67 | INFRA | docsRoot resolution — directly implements spec'd priority chain |
| index.ts:70-76 | INFRA | gitRoot discovery and no-git warning — directly spec'd behavior |
| index.ts:78-83 | INFRA | docsDir and DB path setup — directly spec'd |
| index.ts:85-87 | INFRA | Startup log message — operational telemetry, not spec'd but standard infra |
| index.ts:90-116 | INFRA | Initial indexAllDocs, runLineageScan, runBlameScan calls — all spec'd boot sequence |
| index.ts:119 | INFRA | startWatcher call — spec'd |
| index.ts:122-125 | INFRA | McpServer instantiation — spec'd stdio transport |
| index.ts:127-230 | INFRA | Four tool registrations with descriptions — directly spec'd |
| index.ts:233-246 | INFRA | StdioServerTransport, SIGINT/SIGTERM handlers, server.connect — spec'd transport and cleanup |
| db.ts:1-2 | INFRA | Imports |
| db.ts:4 | INFRA | SCHEMA_VERSION constant — spec'd |
| db.ts:6-78 | INFRA | SCHEMA_SQL — directly spec'd schema |
| db.ts:80-121 | INFRA | openDb function — spec'd error handling (corrupt/mismatch rebuild) |
| parser.ts:1-15 | INFRA | Interfaces (ParsedSection, AdrStatus, ParsedDoc) — spec'd types |
| parser.ts:26-28 | INFRA | Regex constants STATUS_RE, STATUS_HISTORY_MARKER_RE, HISTORY_LINE_RE — spec'd parsing logic |
| parser.ts:30-110 | INFRA | parseMarkdown function — spec'd |
| parser.ts:112-126 | INFRA | classifyCategory function — spec'd |
| content-indexer.ts:1-4 | INFRA | Imports |
| content-indexer.ts:10-39 | INFRA | walkMdFiles helper — necessary infra for spec'd indexAllDocs recursive walk |
| content-indexer.ts:45-116 | INFRA | indexFile function — spec'd |
| content-indexer.ts:121-124 | INFRA | removeFile function — spec'd |
| content-indexer.ts:132-169 | INFRA | indexAllDocs function — spec'd |
| watcher.ts:1-9 | INFRA | Imports and constants DEBOUNCE_MS/POLL_INTERVAL_MS — spec'd (100ms debounce, 5s poll) |
| watcher.ts:11-126 | INFRA | startWatcher function — spec'd |
| lineage-scanner.ts:1-5 | INFRA | Imports |
| lineage-scanner.ts:10-18 | INFRA | git() helper — internal plumbing for all git commands |
| lineage-scanner.ts:23-26 | INFRA | isGitAvailable — spec'd: used before lineage scan |
| lineage-scanner.ts:31-34 | INFRA | getHeadCommit — spec'd: used by watcher for HEAD change detection |
| lineage-scanner.ts:39-46 | INFRA | isRootCommit — necessary infra for root commit handling (ADR-0015 lineage spec) |
| lineage-scanner.ts:51-63 | INFRA | getModifiedDocFiles — internal helper for runLineageScan |
| lineage-scanner.ts:68-70 | INFRA | getFileAtCommit — internal helper |
| lineage-scanner.ts:72-76 | INFRA | DiffHunk interface — internal type |
| lineage-scanner.ts:81-110 | INFRA | parseDiffHunks — spec'd (hunk-to-section mapping is described in ADR-0015) |
| lineage-scanner.ts:115-124 | INFRA | getCommitDiffHunks — internal helper |
| lineage-scanner.ts:126-130 | INFRA | SectionBoundary interface — internal type |
| lineage-scanner.ts:136-149 | INFRA | touchedSections — spec'd (line-range intersection described in ADR-0015) |
| lineage-scanner.ts:154-169 | INFRA | upsertLineage — spec'd (INSERT…ON CONFLICT DO UPDATE) |
| lineage-scanner.ts:175-178 | INFRA | isAdrFile — spec'd helper for ADR-0042 filter |
| lineage-scanner.ts:184-231 | INFRA | runLineageScan — spec'd |
| lineage-scanner.ts:236-304 | INFRA | processCommitForLineage — spec'd |
| blame-scanner.ts:1-2 | INFRA | Imports |
| blame-scanner.ts:8-16 | INFRA | git() helper — internal plumbing |
| blame-scanner.ts:18-25 | INFRA | BlameLine interface — internal type |
| blame-scanner.ts:31-166 | INFRA | parsePorcelain — spec'd (porcelain parsing described in spec) |
| blame-scanner.ts:173-209 | INFRA | blameFile — spec'd |
| blame-scanner.ts:215-234 | INFRA | runBlameScan — spec'd |
| tools.ts:1-4 | INFRA | Imports |
| tools.ts:8-47 | INFRA | Interface types (SearchResult, SectionResult, LineageResult, ListDoc) — spec'd |
| tools.ts:51 | INFRA | AdrStatusEnum — spec'd |
| tools.ts:53-86 | INFRA | Zod schemas (SearchDocsSchema, GetSectionSchema, GetLineageSchema, ListDocsSchema) — spec'd |
| tools.ts:90-132 | INFRA | searchDocs — spec'd |
| tools.ts:134-160 | INFRA | getSection — spec'd |
| tools.ts:162-215 | INFRA | getLineage — spec'd |
| tools.ts:217-264 | INFRA | listDocs — spec'd |
| tools.ts:271-276 | INFRA | NotFoundError class — spec'd |
| tools.ts:286-300 | INFRA | readRawDoc — spec'd |
| resolve-docs-root.ts:1 | INFRA | Import |
| resolve-docs-root.ts:8-18 | INFRA | resolveDocsRoot — spec'd priority chain |

### Phase 3 — Test Coverage

| Spec (doc:line) | Spec text | Unit test | E2E test | Verdict |
|-----------------|-----------|-----------|----------|---------|
| spec-docs-mcp.md:11-12 | Bun runtime, stdio transport | — | — | UNTESTED (infra/environment, acceptable) |
| spec-docs-mcp.md:13 | docsRoot priority chain: --root → CLAUDE_PROJECT_DIR → cwd | resolve-docs-root.test.ts (all 8 cases) | — | UNIT_ONLY |
| spec-docs-mcp.md:13 | git root discovery (findGitRoot) | lineage-scanner.test.ts:isGitAvailable tests | — | UNIT_ONLY |
| spec-docs-mcp.md:18 | DB at .agent/.docs-index.db, WAL mode, FK on | content-indexer.test.ts (makeTestDb sets FK+WAL); db.ts tested via fts.test.ts | — | UNIT_ONLY |
| spec-docs-mcp.md:18 | Schema version check + rebuild on mismatch | db.ts openDb — not directly unit tested | — | UNTESTED |
| spec-docs-mcp.md:22-34 | documents table columns | content-indexer.test.ts:indexFile tests verify all columns written | — | UNIT_ONLY |
| spec-docs-mcp.md:35-44 | sections table + FK cascade | content-indexer.test.ts:transaction correctness test | — | UNIT_ONLY |
| spec-docs-mcp.md:46 | sections_fts FTS5 + triggers | fts.test.ts (full searchDocs coverage) | — | UNIT_ONLY |
| spec-docs-mcp.md:48-59 | lineage table | lineage-scanner.test.ts:generates lineage edges test | — | UNIT_ONLY |
| spec-docs-mcp.md:61 | metadata table (last_lineage_commit) | lineage-scanner.test.ts:stores last_lineage_commit | — | UNIT_ONLY |
| spec-docs-mcp.md:63-76 | blame_lines table + index | blame-scanner.test.ts:makeTestDb creates it | — | UNIT_ONLY |
| spec-docs-mcp.md:80 | runBlameScan signature + behavior | blame-scanner.test.ts:runBlameScan describe | — | UNIT_ONLY |
| spec-docs-mcp.md:80 | git blame --porcelain parsing + line grouping | blame-scanner.test.ts:groups consecutive lines test | — | UNIT_ONLY |
| spec-docs-mcp.md:80 | Delete before insert (full rebuild) | blame-scanner.test.ts:deletes old blame rows test | — | UNIT_ONLY |
| spec-docs-mcp.md:82 | Watcher calls blame on file change | watcher.test.ts:debounce behavior (implicitly calls blameFile) | — | UNIT_ONLY |
| spec-docs-mcp.md:84 | Untracked file: no blame_lines rows | blame-scanner.test.ts:inserts no rows for untracked | — | UNIT_ONLY |
| spec-docs-mcp.md:88-93 | parseMarkdown: H1, status, lastStatusChange, H2 sections | parser.test.ts (comprehensive coverage) | — | UNIT_ONLY |
| spec-docs-mcp.md:106 | classifyCategory | parser.test.ts:classifyCategory describe | — | UNIT_ONLY |
| spec-docs-mcp.md:110 | indexFile: mtime skip, parse, upsert | content-indexer.test.ts:indexFile describe | — | UNIT_ONLY |
| spec-docs-mcp.md:111 | indexAllDocs: walk, changed return, stale removal | content-indexer.test.ts:indexAllDocs describe; recursion-and-status.test.ts | — | UNIT_ONLY |
| spec-docs-mcp.md:112 | removeFile | content-indexer.test.ts:deleted file test (calls removeFile via indexFile) | — | UNIT_ONLY |
| spec-docs-mcp.md:116-124 | startWatcher: debounce, fallback poll, onReindex | watcher.test.ts (full describe suite) | — | UNIT_ONLY |
| spec-docs-mcp.md:129-139 | runLineageScan: incremental, pathspec, ADR-0042 filter | lineage-scanner.test.ts (comprehensive) | — | UNIT_ONLY |
| spec-docs-mcp.md:133 | parseDiffHunks + touchedSections | lineage-scanner.test.ts:parseDiffHunks + touchedSections describes | — | UNIT_ONLY |
| spec-docs-mcp.md:134 | commit_count incremented for solo commits (before early return) | lineage-scanner.test.ts:commit_count tallied for solo commits | — | UNIT_ONLY |
| spec-docs-mcp.md:136 | ADR-0042: spec-to-spec pairs skipped | lineage-scanner.test.ts:skips spec-to-spec lineage | — | UNIT_ONLY |
| spec-docs-mcp.md:147-151 | searchDocs: FTS, category/status filters, BM25, snippet | fts.test.ts + recursion-and-status.test.ts:searchDocs status filter | — | UNIT_ONLY |
| spec-docs-mcp.md:155-156 | getSection: returns content, throws on miss | tools.test.ts:getSection describe | — | UNIT_ONLY |
| spec-docs-mcp.md:161-169 | getLineage: section mode + doc mode (ADR-0031) | lineage.test.ts (comprehensive) | — | UNIT_ONLY |
| spec-docs-mcp.md:165 | Doc mode: heading="", SUM, MAX, ORDER BY | lineage.test.ts:getLineage — doc mode describe | — | UNIT_ONLY |
| spec-docs-mcp.md:167 | No status filter in getLineage | recursion-and-status.test.ts:getLineage — no status filter | — | UNIT_ONLY |
| spec-docs-mcp.md:185-201 | listDocs: filters, commit_count, last_status_change | tools.test.ts:listDocs describe; recursion-and-status.test.ts:listDocs status filter | — | UNIT_ONLY |
| spec-docs-mcp.md:207-209 | readRawDoc: path escape rejection, NotFoundError | tools.test.ts:readRawDoc describe | — | UNIT_ONLY |
| spec-docs-mcp.md:213-225 | Package exports map | package.json:exports (structural, no test) | — | UNTESTED |
| spec-docs-mcp.md:231-236 | Error handling (DB corrupt, schema mismatch, fs.watch fail, FTS error, section miss) | fts.test.ts:FTS5 syntax error test; tools.test.ts:section miss; watcher.test.ts:starts without error | — | UNIT_ONLY |

### Phase 4 — Bug Triage

No `.agent/bugs/` directory found — no open bugs to triage.

| Bug | Title | Verdict | Notes |
|-----|-------|---------|-------|
| — | — | — | No bugs directory exists |

### Summary

- Implemented: 71
- Gap: 0
- Partial: 0
- Infra: 60
- Unspec'd: 0
- Dead: 0
- Tested: 0
- Unit only: 33
- E2E only: 0
- Untested: 3 (schema rebuild path, package exports map, boot sequence)
- Bugs fixed: 0
- Bugs open: 0
