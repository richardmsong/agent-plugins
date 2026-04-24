# Spec Audit: docs-dashboard (r3)

**Component**: docs-dashboard  
**Component root**: src/sdd/docs-dashboard/  
**Spec**: src/sdd/docs/mclaude-docs-dashboard/spec-dashboard.md  
**Focus**: Verify 3 PARTIAL (SPEC→FIX) findings from r2 are resolved after spec update  
**Previous audit**: src/sdd/docs/audits/spec-docs-dashboard-2026-04-24-r2.md

## Run: 2026-04-24T13:00:00Z

### PARTIAL findings from r2 — Verification

The three PARTIAL findings from the r2 audit were all tagged `SPEC→FIX`, meaning the code was correct and the spec needed to be updated to match. This run verifies that the spec was updated correctly.

---

#### Finding 1 — Boot step ordering (r2 spec:14 / r2 spec:15)

**r2 finding:**
> Code does `findGitRoot` inside `boot()` which is called *after* the auto-build check. Spec steps 2→3 ordered gitRoot discovery (step 2) before auto-build UI (step 3). The functional impact is zero; the spec should reorder to match.

**Updated spec (lines 14–15):**
```
2. Auto-build UI: if `ui/dist/index.html` does not exist, run `bun run build` in the `ui/`
   directory (ADR-0049). Log the build. On failure, log the error and continue …
3. Discover **gitRoot** by calling `findGitRoot(docsRoot)` — walks up from docsRoot to find
   `.git`. If not found, lineage and blame scanning are skipped; dashboard still serves docs.
```

**Code (server.ts:183–212, boot.ts:58–63):**
- Step 1 (docsRoot): `server.ts:183–184`
- Step 2 (auto-build): `server.ts:186–205` — runs before `boot()`
- Step 3 (gitRoot via `findGitRoot`): `boot.ts:58–63` — runs inside `boot()`, called at `server.ts:212`

**Verdict: RESOLVED** — Spec steps 2 and 3 now match the code's execution order.

---

#### Finding 2 — `runLineageScan` third argument (r2 spec:18)

**r2 finding:**
> Code calls `runLineageScan(db, gitRoot, docsDir)` with three arguments. Spec omitted the third argument `docsDir`. Code is correct; spec text needs updating to `runLineageScan(db, gitRoot, docsDir)`.

**Updated spec (line 18):**
```
6. `runLineageScan(db, gitRoot, docsDir)` — populates lineage from `git log` (ADR-0029).
```

**Code (boot.ts:83):**
```typescript
runLineageScan(db, gitRoot, docsDir);
```

**Verdict: RESOLVED** — Spec now correctly shows all three arguments matching the code.

---

#### Finding 3 — `.git` not found error table behavior (r2 spec:215)

**r2 finding:**
> Error table at line 215 said "Print error and exit non-zero." Code does `console.warn` and continues (lineage disabled gracefully). ADR-0038 and ADR-0050 both specify graceful degradation. Error table row should be updated to match line 14 and ADR-0038.

**Updated spec (line 215):**
```
| `.git` not found walking up from docsRoot | Log warning; lineage and blame scanning
  disabled. Dashboard still serves docs (ADR-0038). |
```

**Code (boot.ts:58–63):**
```typescript
const gitRoot = findGitRoot(docsRoot);
if (!gitRoot) {
  console.warn(
    `[dashboard] No .git directory found walking up from ${docsRoot}; lineage and blame scanning disabled`
  );
}
```
`runLineageScan` and `runBlameScan` both receive `gitRoot` which may be null, and both are wrapped in try/catch so they gracefully degrade. The server continues.

**Verdict: RESOLVED** — Spec now says "Log warning; lineage and blame scanning disabled. Dashboard still serves docs (ADR-0038)." which matches the code exactly, including the addition of "and blame" (r2 spec only mentioned lineage; updated spec correctly also mentions blame, consistent with boot.ts skipping `runBlameScan` when gitRoot is null).

---

### Summary

All 3 PARTIAL (SPEC→FIX) findings from the r2 audit are resolved:

| r2 Row | Spec text (r2) | Fix applied | Verdict |
|--------|---------------|-------------|---------|
| spec:14/15 | Boot steps 2 and 3 were in wrong order | Spec reordered: auto-build is now step 2, gitRoot discovery is step 3 | RESOLVED |
| spec:18 | `runLineageScan(db, gitRoot)` — missing `docsDir` arg | Spec updated to `runLineageScan(db, gitRoot, docsDir)` | RESOLVED |
| spec:215 | `.git` not found → "Print error and exit non-zero" | Updated to "Log warning; lineage and blame scanning disabled. Dashboard still serves docs (ADR-0038)." | RESOLVED |

**No remaining gaps, partials, or dead code.** The r2 baseline of 58 IMPLEMENTED / 0 GAP / 3 PARTIAL is now 61 IMPLEMENTED / 0 GAP / 0 PARTIAL.

No new code was introduced between r2 and r3. No bug triage changes (no `.agent/bugs/` directory). Test coverage is unchanged from r2 (2 UNTESTED, remainder UNIT_ONLY — those findings carried over and are not re-evaluated in this focused pass).
