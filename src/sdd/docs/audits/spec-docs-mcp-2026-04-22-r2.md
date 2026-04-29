## Run: 2026-04-22T00:00:00Z (r2 — re-evaluation of previous gaps)

Component: docs-mcp
Component root: spec-driven-dev/docs-mcp/
Spec files: spec-driven-dev/docs/mclaude-docs-mcp/spec-docs-mcp.md
ADRs evaluated (accepted/implemented): ADR-0015, ADR-0018, ADR-0027, ADR-0029, ADR-0030, ADR-0031, ADR-0032, ADR-0036, ADR-0038

This is a focused re-evaluation of the two gaps identified in the prior audit (spec-docs-mcp-2026-04-22.md):
1. GAP [CODE→FIX]: content-indexer.ts:157 hardcoded `LIKE 'docs/%.md'` — should be dynamic via `relative(repoRoot, docsDir)`
2. PARTIAL [SPEC→FIX]: spec said "short hash" but code uses full hashes — spec should be updated to say "full commit hash"

### Phase 1 — Re-evaluation of previous gaps

| Spec (doc:line) | Spec text | Code location | Verdict | Direction | Notes |
|-----------------|-----------|---------------|---------|-----------|-------|
| spec:88 | "After the walk, deletes `documents` rows whose `path` starts with `relative(repoRoot, docsDir)` but is no longer present on disk. The prefix is derived dynamically — not hardcoded — so stale removal works regardless of where `docsDir` sits relative to the git root." | content-indexer.ts:153-165 | IMPLEMENTED | — | Line 155 computes `relDocsDir = relative(repoRoot, docsDir).replace(/\\/g, "/")` dynamically. Line 160 uses `${relDocsDir}/%.md` as the LIKE pattern — no longer hardcoded. Gap resolved. |
| spec:57 | `last_commit` TEXT — "Full hash of the most recent co-committing commit." | lineage-scanner.ts:163-167 | IMPLEMENTED | — | Spec now says "Full hash". `upsertLineage` stores `commitHash` from `git log --format=%H` — a full 40-char hash. Spec and code are aligned. |
| spec:61 | `metadata` table holds `last_lineage_commit` (full hash of the most recent commit the lineage scanner has processed) | lineage-scanner.ts:221 | IMPLEMENTED | — | Spec now says "full hash". Line 221 stores `head` from `getHeadCommit()` → `git rev-parse HEAD` → full hash. Aligned. |
| spec:113-114 | "upsert a lineage row: … last_commit = <full commit hash>. Update metadata.last_lineage_commit to the full commit hash." | lineage-scanner.ts:163-167, 221 | IMPLEMENTED | — | Spec updated from "short hash" to "full commit hash" in every location. Code has consistently used full hashes. No divergence remains. |

### Phase 2 — Verification: no new issues introduced

| File:lines | Classification | Explanation |
|------------|---------------|-------------|
| content-indexer.ts:153-165 | INFRA | Stale-removal block now computes `relDocsDir` dynamically via `relative(repoRoot, docsDir)`. No unspecced behavior. |
| lineage-scanner.ts:221 | INFRA | `last_lineage_commit` written as full hash. Consistent with updated spec. No issue. |

### Phase 3 — Test coverage update

| Spec (doc:line) | Spec text | Unit test | E2E test | Verdict |
|-----------------|-----------|-----------|----------|---------|
| spec:88 (stale-removal, dynamic prefix) | Dynamic `relative(repoRoot, docsDir)` prefix for stale-removal LIKE filter | recursion-and-status.test.ts:264-289 tests stale removal of nested docs, but uses `repoRoot=tmpDir`, `docsDir=tmpDir/docs`, so stored paths are always `docs/...` and the pattern is `docs/%.md`. The subdirectory-repo scenario (repoRoot=gitRoot, docsDir=gitRoot/spec-driven-dev/docs, pattern=`spec-driven-dev/docs/%.md`) is not tested. | — | UNIT_ONLY — but the specific subdirectory-path scenario remains UNTESTED. |

### Phase 4 — Bug Triage

No `.agent/bugs/` directory found. No open bugs to triage.

| Bug | Title | Verdict | Notes |
|-----|-------|---------|-------|
| — | — | — | No bugs directory found |

### Summary

Previous gaps status:
- GAP [CODE→FIX] (content-indexer.ts stale removal hardcoded path): RESOLVED — code now dynamically computes prefix via `relative(repoRoot, docsDir)` (content-indexer.ts:155, 160)
- PARTIAL [SPEC→FIX] (spec said "short hash"): RESOLVED — spec now consistently says "full hash" / "full commit hash" in all three locations (spec:57, spec:61, spec:113-114); code uses full hashes throughout

Remaining from prior audit (not target of this re-evaluation, confirmed still applicable):
- UNSPEC'd: lineage-scanner.ts:227-291 — `processCommitForLineage` exported but not documented in spec as a named export
- UNTESTED (E2E): all spec'd behavior has unit tests but no integration/e2e tests
- UNTESTED (subdirectory stale-removal path): the specific case where docsDir is nested two levels below repoRoot (e.g. `spec-driven-dev/docs/`) is not covered by any test, even though the code is now correct

- Implemented (this run): 4
- Gap: 0
- Partial: 0
- Infra: 2
- Unspec'd: 0
- Dead: 0
- Tested: 0
- Unit only: 1 (partial coverage — subdirectory scenario untested)
- E2E only: 0
- Untested: 0
- Bugs fixed: 0
- Bugs open: 0
