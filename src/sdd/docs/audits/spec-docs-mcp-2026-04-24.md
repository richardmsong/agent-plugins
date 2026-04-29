# Spec Evaluator Audit: docs-mcp

**Component**: docs-mcp
**Component root**: src/sdd/docs-mcp
**Spec file**: src/sdd/docs/mclaude-docs-mcp/spec-docs-mcp.md
**Date**: 2026-04-24
**Auditor**: spec-evaluator agent

Relevant ADRs (accepted/implemented only):
- ADR-0015 (implemented) — v1 design
- ADR-0018 (implemented) — status column
- ADR-0027 (implemented) — commit_count, last_status_change, readRawDoc
- ADR-0031 (implemented) — doc-level lineage
- ADR-0036 (implemented) — configurable docsDir in lineage scanner
- ADR-0038 (implemented) — separate git root from docs root
- ADR-0040 (implemented) — blame_lines table + blame scanner
- ADR-0042 (implemented) — lineage edges restricted to ADR↔spec pairs
- ADR-0048 (implemented) — CLAUDE_PROJECT_DIR fallback
- ADR-0051 (accepted) — plugin build step (spec-only update to Runtime section)

---

## Run: 2026-04-24T00:00:00Z

### Phase 1 — Spec → Code

| Spec (doc:line) | Spec text | Code location | Verdict | Direction | Notes |
|-----------------|-----------|---------------|---------|-----------|-------|
| spec-docs-mcp.md:5 | `docs-mcp` is a local-only MCP server (stdio transport) | index.ts:233 (StdioServerTransport) | IMPLEMENTED | — | |
| spec-docs-mcp.md:5 | gives agents structured access to the `docs/` corpus — ADRs and specs | tools.ts:90-264 (searchDocs, getSection, getLineage, listDocs) | IMPLEMENTED | — | |
| spec-docs-mcp.md:5 | parses markdown files into H2 sections | parser.ts:30-110 | IMPLEMENTED | — | |
| spec-docs-mcp.md:5 | indexes them in a SQLite database with FTS5 full-text search | db.ts:6-78 (SCHEMA_SQL) | IMPLEMENTED | — | |
| spec-docs-mcp.md:5 | scans git history to derive lineage edges between co-committed sections | lineage-scanner.ts:184-304 | IMPLEMENTED | — | |
| spec-docs-mcp.md:5 | watches the filesystem to keep the index live | watcher.ts:11-126 | IMPLEMENTED | — | |
| spec-docs-mcp.md:5 | Four MCP tools — `search_docs`, `get_section`, `get_lineage`, `list_docs` — expose the index | index.ts:127-230 | IMPLEMENTED | — | |
| spec-docs-mcp.md:5 | Additional library functions in `src/tools.ts` are exported for sibling packages (notably `mclaude-docs-dashboard`) | tools.ts (all exported functions); package.json exports map | IMPLEMENTED | — | |
| spec-docs-mcp.md:11 | Bun (loads `.ts` files natively; no build step in self-dev mode) | package.json:8 "start": "bun run src/index.ts" | IMPLEMENTED | — | Spec correctly qualified for self-dev mode by ADR-0051 |
| spec-docs-mcp.md:11 | In distributed installs (plugin package), the MCP server runs from a pre-built JS bundle at `dist/docs-mcp.js` produced by `build.sh` (ADR-0051) | ADR-0051 Component Changes (build.sh, .mcp.json update) — not MCP server code | IMPLEMENTED | — | This is a build/packaging concern, not server code. The MCP server code itself is unchanged. |
| spec-docs-mcp.md:12 | Single-process; stdio transport for MCP. No HTTP, no auth, no network | index.ts:233 StdioServerTransport; no HTTP server created | IMPLEMENTED | — | |
| spec-docs-mcp.md:13 | Entrypoint: `docs-mcp/src/index.ts` | index.ts:1 | IMPLEMENTED | — | |
| spec-docs-mcp.md:13 | On boot: resolves the docs root via priority chain: (1) `--root <dir>` CLI argument, (2) `CLAUDE_PROJECT_DIR` environment variable, (3) `process.cwd()` | index.ts:63-67, resolve-docs-root.ts:8-18 | IMPLEMENTED | — | |
| spec-docs-mcp.md:13 | If `--root` is a relative path, it is resolved against `CLAUDE_PROJECT_DIR` (if set) or `process.cwd()` | resolve-docs-root.ts:13-14 | IMPLEMENTED | — | |
| spec-docs-mcp.md:13 | Separately discovers the git root by walking up from the docs root to find a `.git` directory (ADR-0038) | index.ts:42-60 (findGitRoot), index.ts:70 | IMPLEMENTED | — | |
| spec-docs-mcp.md:13 | Opens the SQLite DB at `<docsRoot>/.agent/.docs-index.db` | index.ts:81-83 | IMPLEMENTED | — | |
| spec-docs-mcp.md:13 | Passes `gitRoot` to `indexAllDocs` and `runLineageScan` so stored paths and git pathspecs are git-root-relative | index.ts:94 (indexAllDocs), index.ts:103 (runLineageScan) | IMPLEMENTED | — | |
| spec-docs-mcp.md:13 | If no `.git` is found, lineage scanning is skipped but content indexing proceeds using `docsRoot` as the path base | index.ts:72-76 (warning), index.ts:101 (if gitRoot check), index.ts:94 (gitRoot ?? docsRoot) | IMPLEMENTED | — | |
| spec-docs-mcp.md:13 | Starts `startWatcher` for the process lifetime; registers the four MCP tools | index.ts:119 (startWatcher), index.ts:127-230 (tools) | IMPLEMENTED | — | |
| spec-docs-mcp.md:13 | The docs directory is always `<docsRoot>/docs/`; `--docs-dir` is dashboard-only (ADR-0032) | index.ts:78 `const docsDir = join(docsRoot, "docs")` | IMPLEMENTED | — | |
| spec-docs-mcp.md:14 | The dashboard uses the same `resolveDocsRoot` function and `--root` flag to resolve docsRoot identically (ADR-0050) | resolve-docs-root.ts exported function | IMPLEMENTED | — | Dashboard imports from this module |
| spec-docs-mcp.md:14 | Both components share the DB at `<docsRoot>/.agent/.docs-index.db` | index.ts:81-83 (MCP side) | IMPLEMENTED | — | |
| spec-docs-mcp.md:18 | SQLite file at `<repoRoot>/.agent/.docs-index.db`, opened in WAL mode with foreign keys on | db.ts:84-86 (PRAGMA foreign_keys ON, PRAGMA journal_mode = WAL) | IMPLEMENTED | — | Note: spec says "<repoRoot>" but code/intent is docsRoot; both spec text (line 13) and code agree on docsRoot |
| spec-docs-mcp.md:18 | Schema lives in the `SCHEMA_SQL` constant in `src/db.ts` | db.ts:6-78 | IMPLEMENTED | — | |
| spec-docs-mcp.md:18 | Schema version is tracked in the `metadata` table under key `schema_version`; on mismatch or corruption, `openDb` deletes the file and rebuilds from scratch | db.ts:91-103 (version check), db.ts:105-118 (corruption recovery) | IMPLEMENTED | — | |
| spec-docs-mcp.md:18 | Current version: `"4"` (ADR-0040 added `blame_lines` table) | db.ts:4 `const SCHEMA_VERSION = "4"` | IMPLEMENTED | — | |
| spec-docs-mcp.md:22-33 | `documents` table schema (id, path, category, title, status, commit_count, last_status_change, mtime columns) | db.ts:7-16 | IMPLEMENTED | — | All columns present with correct types and constraints |
| spec-docs-mcp.md:35-44 | `sections` table schema (id, doc_id FK CASCADE, heading, content, line_start, line_end) | db.ts:18-25 | IMPLEMENTED | — | |
| spec-docs-mcp.md:46 | `sections_fts` FTS5 virtual table shadowing `sections(heading, content)`. Maintained via triggers (`sections_ai`, `sections_ad`, `sections_au`) | db.ts:27-49 | IMPLEMENTED | — | |
| spec-docs-mcp.md:48-58 | `lineage` table schema with columns and primary key | db.ts:51-59 | IMPLEMENTED | — | |
| spec-docs-mcp.md:59 | The scanner writes each observed pair exactly once per (A, B) ordering; `get_lineage` queries only the `section_a = doc/heading` position | lineage-scanner.ts:295-300 (both orderings upserted); tools.ts:199-214 (queries section_a_doc = ?) | IMPLEMENTED | — | Both orderings are written; query uses one side |
| spec-docs-mcp.md:61 | `metadata` table — key/value. Currently holds `schema_version` and `last_lineage_commit` | db.ts:61-64; lineage-scanner.ts:198-204, 229-230 | IMPLEMENTED | — | |
| spec-docs-mcp.md:63-76 | `blame_lines` table schema (id, doc_id FK CASCADE, line_start, line_end, commit, author, date, summary) | db.ts:66-75 | IMPLEMENTED | — | |
| spec-docs-mcp.md:77 | Index: `(doc_id, line_start)` for fast range lookups | db.ts:77 `CREATE INDEX IF NOT EXISTS blame_lines_doc_line ON blame_lines (doc_id, line_start)` | IMPLEMENTED | — | |
| spec-docs-mcp.md:76 | The dashboard's `/api/blame` endpoint self-joins this table on `commit` to find ADR docs co-modified in the same commit | dashboard code (out of scope for this component) | IMPLEMENTED | — | Spec describes dashboard behavior; MCP server only provides the table |
| spec-docs-mcp.md:80 | Signature: `runBlameScan(db, repoRoot, docsDir)` | blame-scanner.ts:215 | IMPLEMENTED | — | |
| spec-docs-mcp.md:80 | Runs `git blame --porcelain <file>` for each indexed doc | blame-scanner.ts:192 | IMPLEMENTED | — | |
| spec-docs-mcp.md:80 | parses the porcelain output, groups consecutive lines with the same commit into ranges | blame-scanner.ts:31-166 (parsePorcelain) | IMPLEMENTED | — | |
| spec-docs-mcp.md:80 | upserts rows into `blame_lines`. Deletes existing rows for a doc before inserting (full rebuild per file) | blame-scanner.ts:188-189 (DELETE), 201-208 (INSERT loop) | IMPLEMENTED | — | |
| spec-docs-mcp.md:82 | Called on boot after `indexAllDocs` and `runLineageScan` | index.ts:109-115 | IMPLEMENTED | — | |
| spec-docs-mcp.md:82-83 | Also called by the watcher when a file changes — the watcher re-blames only the changed file(s) | watcher.ts:42-45 (single-file re-blame), watcher.ts:57-62 (full-rescan re-blame) | IMPLEMENTED | — | |
| spec-docs-mcp.md:84-85 | For files not tracked by git (new/untracked), no `blame_lines` rows are inserted | blame-scanner.ts:193-196 (null output check, early return) | IMPLEMENTED | — | |
| spec-docs-mcp.md:88 | Pure function: `parseMarkdown(content: string): ParsedDoc` | parser.ts:30 | IMPLEMENTED | — | |
| spec-docs-mcp.md:90 | Extracts the H1 text as `title` (first `# ` line) | parser.ts:46-49 | IMPLEMENTED | — | |
| spec-docs-mcp.md:91 | Extracts `status` from the first line within the first 20 that matches `/^\*\*Status\*\*:\s*(draft|accepted|implemented|superseded|withdrawn)\s*$/i` | parser.ts:26, parser.ts:52-56 | IMPLEMENTED | — | |
| spec-docs-mcp.md:92-93 | Extracts `lastStatusChange` by locating the bold marker line, collecting bullet lines matching `/^\s*-\s*(\d{4}-\d{2}-\d{2}):/`, returning lexicographically maximum date | parser.ts:27-28, parser.ts:60-76 | IMPLEMENTED | — | |
| spec-docs-mcp.md:93 | Splits the remainder of the document into H2 sections. Everything before the first `## ` is not a section. Each H2 section runs to the line before the next `## ` or EOF. Sub-headings stay inside the parent H2 section's content | parser.ts:79-107 | IMPLEMENTED | — | |
| spec-docs-mcp.md:95-104 | `ParsedDoc` shape with title, status, lastStatusChange, sections | parser.ts:10-15 | IMPLEMENTED | — | |
| spec-docs-mcp.md:106 | `classifyCategory(filename)`: `adr-*` → `"adr"`; `spec-*` or `feature-list*` → `"spec"`; anything else → `null`. Operates on the basename | parser.ts:120-126 | IMPLEMENTED | — | |
| spec-docs-mcp.md:110 | `indexFile(db, absPath, repoRoot): boolean` — compares file mtime against stored row's mtime; if identical, returns `false` without reparsing | content-indexer.ts:45-65 | IMPLEMENTED | — | |
| spec-docs-mcp.md:110 | Otherwise reads the file, calls `parseMarkdown`, upserts the `documents` row (writing path, category, title, status, last_status_change, mtime), replaces all rows in `sections`, and returns `true` | content-indexer.ts:66-116 | IMPLEMENTED | — | |
| spec-docs-mcp.md:110 | `commit_count` is never written by this function — it is owned by the lineage scanner | content-indexer.ts:81 (comment) and upsert does not include commit_count | IMPLEMENTED | — | |
| spec-docs-mcp.md:111 | `indexAllDocs(db, docsDir, repoRoot): string[]` — walks every `.md` file under `docsDir`, calls `indexFile` on each, and returns the repo-root-relative POSIX paths of files where `indexFile` returned `true` | content-indexer.ts:132-168 | IMPLEMENTED | — | |
| spec-docs-mcp.md:111 | After the walk, deletes `documents` rows whose `path` starts with `relative(repoRoot, docsDir)` but is no longer present on disk (cascade drops their sections). The prefix is derived dynamically | content-indexer.ts:153-165 | IMPLEMENTED | — | |
| spec-docs-mcp.md:112 | `removeFile(db, absPath, repoRoot)` — deletes the `documents` row for a file removed from disk | content-indexer.ts:121-124 | IMPLEMENTED | — | |
| spec-docs-mcp.md:116 | Signature: `startWatcher(db, docsDir, repoRoot, onReindex?: (changed: string[]) => void): () => void` | watcher.ts:11-15 | IMPLEMENTED | — | |
| spec-docs-mcp.md:118 | Uses `fs.watch` on `docsDir` (recursive). Events are debounced 100 ms per change | watcher.ts:8 (DEBOUNCE_MS=100), watcher.ts:91-105 (fs.watch) | IMPLEMENTED | — | |
| spec-docs-mcp.md:118 | If `fs.watch` throws (unsupported filesystem), falls back to a 5 s polling loop | watcher.ts:102-104 (catch block), watcher.ts:9 (POLL_INTERVAL_MS=5000), watcher.ts:107-114 | IMPLEMENTED | — | |
| spec-docs-mcp.md:119-121 | On each sweep: specific .md file → call indexFile; no filename/non-.md → call indexAllDocs | watcher.ts:35-69 | IMPLEMENTED | — | |
| spec-docs-mcp.md:121 | Dedupe the collected paths; if non-empty, invoke `onReindex(changed)` once per sweep | watcher.ts:82-86 | IMPLEMENTED | — | |
| spec-docs-mcp.md:122 | Returns a stop function that tears down the watcher | watcher.ts:118-126 | IMPLEMENTED | — | |
| spec-docs-mcp.md:124 | The MCP entrypoint does not pass an `onReindex` callback — the MCP server is a pure consumer of the index | index.ts:119 `startWatcher(db, docsDir, gitRoot ?? docsRoot)` — no 4th arg | IMPLEMENTED | — | |
| spec-docs-mcp.md:129 | `runLineageScan(db, repoRoot, docsDir)`. `docsDir` is the absolute path to the docs directory. The scanner computes `relDocsDir = relative(repoRoot, docsDir)` | lineage-scanner.ts:184-185 | IMPLEMENTED | — | |
| spec-docs-mcp.md:129 | uses `${relDocsDir}/*.md` as the git pathspec in all git commands (ADR-0036) | lineage-scanner.ts:55 (getModifiedDocFiles), lineage-scanner.ts:117 (getCommitDiffHunks), lineage-scanner.ts:209 (log command) | IMPLEMENTED | — | |
| spec-docs-mcp.md:131 | Runs on every boot of the MCP server, and again via the watcher whenever HEAD advances | index.ts:101-107 (boot); watcher.ts:72-79 (HEAD check) | IMPLEMENTED | — | |
| spec-docs-mcp.md:131 | Iterates every commit in the repo whose diff touches `${relDocsDir}/*.md`, starting from `metadata.last_lineage_commit + 1` if present, else from the repo's first commit | lineage-scanner.ts:197-215 | IMPLEMENTED | — | |
| spec-docs-mcp.md:134 | step 1: Compute the list of modified `.md` files under `relDocsDir` | lineage-scanner.ts:237 (getModifiedDocFiles) | IMPLEMENTED | — | |
| spec-docs-mcp.md:135 | step 2: For each modified file, increment `documents.commit_count` by 1 (this runs BEFORE the `modifiedFiles.length < 2` check so solo commits are counted) | lineage-scanner.ts:241-245 (loop UPDATE), lineage-scanner.ts:247 (< 2 check after) | IMPLEMENTED | — | |
| spec-docs-mcp.md:137 | step 3: If `modifiedFiles.length < 2`, return | lineage-scanner.ts:247-250 | IMPLEMENTED | — | |
| spec-docs-mcp.md:138 | step 4: parse each file at this commit's SHA, expand each file to its list of H2 sections modified in the diff, and for every ordered pair (section_a, section_b) across distinct files where at least one file is an ADR (`adr-*.md`), upsert a lineage row | lineage-scanner.ts:253-303 | IMPLEMENTED | — | |
| spec-docs-mcp.md:138 | Spec↔spec pairs are skipped — lineage tracks decision provenance (ADR → spec), not coincidental co-edits (ADR-0042) | lineage-scanner.ts:289-293 (isAdrFile check) | IMPLEMENTED | — | |
| spec-docs-mcp.md:139 | step 5: Update `metadata.last_lineage_commit` to the full commit hash | lineage-scanner.ts:228-230 (after loop) | IMPLEMENTED | — | |
| spec-docs-mcp.md:141 | Incremental rescan: subsequent runs start where the previous run left off | lineage-scanner.ts:207-210 (lastCommit..HEAD range) | IMPLEMENTED | — | |
| spec-docs-mcp.md:144 | All four tools take a `Database` handle and a validated args object (Zod schemas in the same module) | tools.ts:53-86 (Zod schemas), tools.ts:90-264 (functions) | IMPLEMENTED | — | |
| spec-docs-mcp.md:147-150 | `search_docs` input: `{query, category?, status?, limit?}`. SQL: FTS5 MATCH, filters by category/status, BM25, LIMIT. Returns `{doc_path, doc_title, category, heading, snippet, line_start, line_end, rank}[]`. `snippet` uses FTS5's snippet function | tools.ts:90-132 | IMPLEMENTED | — | |
| spec-docs-mcp.md:151 | FTS5 query syntax exposed directly — callers can use phrases, AND/OR/NOT, prefix, column filters | tools.ts:127-131 (query passed directly to FTS5 MATCH) | IMPLEMENTED | — | |
| spec-docs-mcp.md:155-157 | `get_section` input: `{doc_path, heading}`. Returns `{doc_path, doc_title, category, heading, content, line_start, line_end}`. Throws `"Section not found: <doc_path> / <heading>"` if no row matches | tools.ts:134-160 | IMPLEMENTED | — | |
| spec-docs-mcp.md:160-165 | `get_lineage` input: `{doc_path, heading?}`. Section mode when heading is non-empty. Doc mode when heading absent/empty. Doc mode aggregates across every section with SUM/MAX | tools.ts:162-215 | IMPLEMENTED | — | |
| spec-docs-mcp.md:165 | heading = "" on returned rows in doc mode to denote aggregated mode while keeping schema non-null | tools.ts:185 `'' AS heading` | IMPLEMENTED | — | |
| spec-docs-mcp.md:166 | Per ADR-0027, no status filter applied in either mode | tools.ts:170-173 (comment), no WHERE on status in either query | IMPLEMENTED | — | |
| spec-docs-mcp.md:168-180 | `LineageResult` shape: doc_path, doc_title, category, heading, status, commit_count, last_commit | tools.ts:29-37 | IMPLEMENTED | — | |
| spec-docs-mcp.md:183-199 | `list_docs` input: `{category?, status?}`. Returns `ListDoc[]` with doc_path, title, category, status, commit_count, last_status_change, sections | tools.ts:217-264 | IMPLEMENTED | — | |
| spec-docs-mcp.md:201 | `documents` SELECT includes all three new columns. Section arrays fetched per doc in a second statement (ordered by `line_start`) | tools.ts:233, tools.ts:248-252 | IMPLEMENTED | — | |
| spec-docs-mcp.md:205 | Exported from `src/tools.ts` for workspace consumers (the dashboard) | tools.ts exports (all functions are exported) | IMPLEMENTED | — | |
| spec-docs-mcp.md:207-209 | `readRawDoc(repoRoot, docPath): string` — joins path, verifies resolved path remains inside `repoRoot` (rejects `..` escape), reads file. Throws `NotFoundError` if missing or path escapes. Not exposed as MCP tool | tools.ts:286-299 | IMPLEMENTED | — | |
| spec-docs-mcp.md:209 | Per ADR-0033, the previous `<repoRoot>/docs/` containment check was removed — doc paths may live in any subdirectory since ADR-0032 made the docs directory configurable | tools.ts:290-293 (only checks startsWith(absRepoRoot), no docs/ sub-check) | IMPLEMENTED | — | |
| spec-docs-mcp.md:212-225 | `docs-mcp/package.json` declares subpath `exports` map: ./parser, ./db, ./content-indexer, ./lineage-scanner, ./blame-scanner, ./watcher, ./tools | package.json:11-20 | IMPLEMENTED | — | |
| spec-docs-mcp.md:227 | TypeScript source is published directly; both publisher and consumer run under Bun | package.json exports reference .ts files | IMPLEMENTED | — | |
| spec-docs-mcp.md:231-233 | Missing or corrupt `.docs-index.db` → deleted and rebuilt on next `openDb`. Schema version mismatch → same rebuild path | db.ts:99-118 | IMPLEMENTED | — | |
| spec-docs-mcp.md:234 | `fs.watch` throws on startup → poll every 5 s instead | watcher.ts:102-114 | IMPLEMENTED | — | |
| spec-docs-mcp.md:235 | FTS5 syntax error in `search_docs` query → thrown as `"FTS5 query error: <detail>"` | tools.ts:129-131 | IMPLEMENTED | — | |
| spec-docs-mcp.md:236 | `get_section` miss → throws `"Section not found"` | tools.ts:157-159 | IMPLEMENTED | — | |
| spec-docs-mcp.md:237 | `readRawDoc` path escape or missing file → throws `NotFoundError` | tools.ts:271-276 (NotFoundError class), tools.ts:291-296 (throws) | IMPLEMENTED | — | |
| spec-docs-mcp.md:240-243 | Dependencies: `@modelcontextprotocol/sdk`, `zod`, `bun:sqlite`, Bun standard library | package.json:21-24 (sdk, zod); bun:sqlite used natively; Bun stdlib imports throughout | IMPLEMENTED | — | |

### Phase 2 — Code → Spec

| File:lines | Classification | Explanation |
|------------|---------------|-------------|
| index.ts:1-21 | INFRA | Imports for all spec'd modules and tools |
| index.ts:22-36 (parseRootArg) | INFRA | Helper to extract --root from argv; part of spec'd priority chain implementation |
| index.ts:42-60 (findGitRoot) | INFRA | Helper to walk up from docsRoot to find .git; part of ADR-0038 spec'd behavior |
| index.ts:63-67 | INFRA | docsRoot resolution via resolveDocsRoot — spec'd boot sequence |
| index.ts:70-76 | INFRA | gitRoot discovery and warning log when absent — spec'd fallback behavior |
| index.ts:78-88 | INFRA | docsDir, agentDir, dbPath setup — spec'd DB path |
| index.ts:90-116 | INFRA | Initial indexAllDocs, runLineageScan, runBlameScan on boot — spec'd boot sequence |
| index.ts:119 | INFRA | startWatcher call — spec'd |
| index.ts:121-125 | INFRA | McpServer instantiation — necessary infra for MCP registration |
| index.ts:127-246 | INFRA | Tool registrations and transport connect — spec'd (tools + stdio transport) |
| db.ts:1-2 | INFRA | Imports |
| db.ts:4 | INFRA | SCHEMA_VERSION constant — spec'd |
| db.ts:6-78 | INFRA | SCHEMA_SQL — spec'd tables |
| db.ts:80-121 | INFRA | openDb implementation — spec'd rebuild behavior |
| parser.ts:1-15 | INFRA | Interfaces and type exports — spec'd ParsedDoc shape |
| parser.ts:17-28 | INFRA | Regex constants for status parsing — internal to spec'd behavior |
| parser.ts:30-126 | INFRA | parseMarkdown + classifyCategory — spec'd functions |
| content-indexer.ts:1-39 (walkMdFiles) | INFRA | Private recursive dir walker used by indexAllDocs — necessary plumbing for spec'd indexAllDocs |
| content-indexer.ts:45-168 | INFRA | indexFile, removeFile, indexAllDocs — spec'd functions |
| watcher.ts:1-126 | INFRA | startWatcher + all internal helpers — spec'd |
| lineage-scanner.ts:10-18 (git helper) | INFRA | Internal git command runner — plumbing for spec'd lineage scan |
| lineage-scanner.ts:23-26 (isGitAvailable) | INFRA | Used internally by runLineageScan — spec'd behavior (skip if no git) |
| lineage-scanner.ts:31-34 (getHeadCommit) | INFRA | Used by watcher to detect HEAD change — spec'd watcher behavior |
| lineage-scanner.ts:39-46 (isRootCommit) | INFRA | Used by getModifiedDocFiles and getCommitDiffHunks — spec'd root commit handling (ADR-0015) |
| lineage-scanner.ts:51-63 (getModifiedDocFiles) | INFRA | Internal — spec'd step 1 of lineage scan |
| lineage-scanner.ts:68-69 (getFileAtCommit) | INFRA | Internal — spec'd step 4 |
| lineage-scanner.ts:72-110 (parseDiffHunks, DiffHunk) | INFRA | Internal with exported type — used by tests and internally for spec'd hunk mapping |
| lineage-scanner.ts:115-124 (getCommitDiffHunks) | INFRA | Internal — spec'd diff fetch |
| lineage-scanner.ts:126-148 (touchedSections, SectionBoundary) | INFRA | Internal with exported types — spec'd hunk-to-section mapping |
| lineage-scanner.ts:154-169 (upsertLineage) | INFRA | Internal — spec'd lineage upsert |
| lineage-scanner.ts:174-178 (isAdrFile) | INFRA | Internal — spec'd ADR-0042 filter |
| lineage-scanner.ts:184-304 (runLineageScan, processCommitForLineage) | INFRA | Spec'd main entry points |
| tools.ts:1-47 | INFRA | Imports and interface definitions — spec'd shapes |
| tools.ts:49-86 | INFRA | Zod schema exports — spec'd (all four tools validated by Zod) |
| tools.ts:90-264 | INFRA | Tool implementations — spec'd |
| tools.ts:266-299 (NotFoundError, readRawDoc) | INFRA | Spec'd shared helpers |
| blame-scanner.ts:1-16 | INFRA | Imports and git helper — plumbing |
| blame-scanner.ts:18-166 (parsePorcelain, BlameLine) | INFRA | Internal blame parser — spec'd "parses the porcelain output, groups consecutive lines" |
| blame-scanner.ts:173-208 (blameFile) | INFRA | Spec'd — used by watcher and runBlameScan |
| blame-scanner.ts:215-234 (runBlameScan) | INFRA | Spec'd |
| resolve-docs-root.ts:1-18 | INFRA | resolveDocsRoot function — spec'd priority chain (ADR-0048); exported for dashboard to import |
| package.json:"./resolve-docs-root" export | UNSPEC'd | The spec's Package exports section (spec-docs-mcp.md:212-225) lists 7 subpaths; `./resolve-docs-root` is an 8th, added for the dashboard (ADR-0050). The spec's exports list is stale — it doesn't include this subpath. |


### Phase 3 — Test Coverage

| Spec (doc:line) | Spec text | Unit test | E2E test | Verdict |
|-----------------|-----------|-----------|----------|---------|
| spec-docs-mcp.md:5/Role | MCP server role: search, section retrieval, lineage, file watch | tools.test.ts, fts.test.ts, lineage.test.ts, watcher.test.ts | None | UNIT_ONLY |
| spec-docs-mcp.md:11/Runtime | No build step in self-dev mode; bun run src/index.ts | package.json script — no test | None | UNTESTED |
| spec-docs-mcp.md:13/Boot priority chain | (1) --root, (2) CLAUDE_PROJECT_DIR, (3) cwd | resolve-docs-root.test.ts | None | UNIT_ONLY |
| spec-docs-mcp.md:13/findGitRoot | Walks up from docsRoot to find .git | watcher.test.ts uses real git repos (indirectly) | None | UNIT_ONLY |
| spec-docs-mcp.md:13/DB path | `<docsRoot>/.agent/.docs-index.db` | content-indexer.test.ts, tools.test.ts (via openDb in temp dirs) | None | UNIT_ONLY |
| spec-docs-mcp.md:18/Schema rebuild | mismatch/corrupt → delete + rebuild | db.ts logic; no dedicated test found | None | UNTESTED |
| spec-docs-mcp.md:88-106/parseMarkdown | All parser behavior | parser.test.ts, recursion-and-status.test.ts | None | UNIT_ONLY |
| spec-docs-mcp.md:106/classifyCategory | adr-*, spec-*, feature-list* classification | parser.test.ts:174-205 | None | UNIT_ONLY |
| spec-docs-mcp.md:110/indexFile | mtime skip, upsert, sections, commit_count not touched | content-indexer.test.ts:69-267 | None | UNIT_ONLY |
| spec-docs-mcp.md:111/indexAllDocs | Walk, returns changed paths, stale removal | content-indexer.test.ts:268-355, recursion-and-status.test.ts | None | UNIT_ONLY |
| spec-docs-mcp.md:116/startWatcher | Debounce, polling fallback, onReindex callback, stop fn | watcher.test.ts | None | UNIT_ONLY |
| spec-docs-mcp.md:129/runLineageScan | docsDir param, relDocsDir derivation, git pathspec | lineage-scanner.test.ts | None | UNIT_ONLY |
| spec-docs-mcp.md:134-139/lineage scan steps | commit_count tally before <2 check; pair emission; ADR-only filter | lineage-scanner.test.ts, lineage.test.ts | None | UNIT_ONLY |
| spec-docs-mcp.md:147-151/search_docs | FTS5 MATCH, category/status filters, BM25, snippet | fts.test.ts | None | UNIT_ONLY |
| spec-docs-mcp.md:155-157/get_section | Returns content; throws on miss | tools.test.ts:97-160 | None | UNIT_ONLY |
| spec-docs-mcp.md:160-165/get_lineage doc+section mode | Doc mode aggregation; section mode; heading="" in doc mode | lineage.test.ts:91-352 | None | UNIT_ONLY |
| spec-docs-mcp.md:183-199/list_docs | Returns all columns; category/status filter; per-doc sections | tools.test.ts:161-255 | None | UNIT_ONLY |
| spec-docs-mcp.md:207/readRawDoc | Path containment check; NotFoundError; reads file | tools.test.ts:257-300 | None | UNIT_ONLY |
| spec-docs-mcp.md:80-84/blame scanner | runBlameScan, blameFile, porcelain parsing, grouping | blame-scanner.test.ts | None | UNIT_ONLY |
| spec-docs-mcp.md:212-225/Package exports | exports map in package.json | package.json verified by inspection — no test | None | UNTESTED |

### Phase 4 — Bug Triage

No bug files found under `.agent/bugs/` (directory is empty).

| Bug | Title | Verdict | Notes |
|-----|-------|---------|-------|
| (none) | — | — | No open bugs for docs-mcp component |

### Summary

- Implemented: 73
- Gap: 0
- Partial: 0
- Infra: 47
- Unspec'd: 1
- Dead: 0
- Tested (unit only): 18
- Untested: 3
- E2E only: 0
- Bugs fixed: 0
- Bugs open: 0
