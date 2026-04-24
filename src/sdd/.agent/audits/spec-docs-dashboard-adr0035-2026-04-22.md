## Run: 2026-04-22T — ADR-0035 focused re-check

Component: docs-dashboard (UI)
Scope: ADR-0035 gap verification — docPathToHash / docLinkToHash / adrSlug routing consistency
Files checked:
- Landing.tsx
- AdrDetail.tsx
- SearchResults.tsx
- Graph.tsx
- LineagePopover.tsx
- MarkdownView.tsx

ADR-0035 contract:
1. URL slug for ADR routes = doc_path minus .md suffix (no prefix strip, no re-add)
2. Landing.tsx navigation: `doc_path.replace(/\.md$/, "")` — NOT `adrSlug(doc_path)`
3. AdrDetail.tsx slugToDocPath: appends `.md` only — no `docs/adr-` prefix injection
4. Any component building `#/adr/` links must use full doc_path (minus .md)

---

### Phase 1 — ADR-0035 Spec → Code

| Spec (doc:line) | Spec text | Code location | Verdict | Direction | Notes |
|-----------------|-----------|---------------|---------|-----------|-------|
| adr-0035:24 | Landing.tsx: navigation call uses `doc_path.replace(/\.md$/, "")` instead of `adrSlug(doc_path)` | Landing.tsx:157 | IMPLEMENTED | — | `navigate(\`/adr/${adr.doc_path.replace(/\.md$/, "")}\`)` — full doc_path, .md stripped only |
| adr-0035:25 | AdrDetail.tsx: `slugToDocPath` appends `.md` only, no prefix | AdrDetail.tsx:14-16 | IMPLEMENTED | — | `return \`${slug}.md\`` — no prefix manipulation at all |
| adr-0035:26 | LineagePopover.tsx: `#/adr/` links use full doc_path (minus .md) | LineagePopover.tsx:26-30 | IMPLEMENTED | — | `docPathToHash`: checks `base.startsWith("adr-")` then returns `/adr/${docPath.replace(/\.md$/, "")}` — full path, no strip |
| adr-0035 scope | SearchResults.tsx: `docPathToHash` uses full doc_path for ADR routes | SearchResults.tsx:9-14 | IMPLEMENTED | — | `docPathToHash`: checks `base.startsWith("adr-")` then returns `/adr/${docPath.replace(/\.md$/, "")}` — full path, no strip |
| adr-0035 scope | Graph.tsx: `docPathToHash` uses full doc_path for ADR routes | Graph.tsx:49-53 | IMPLEMENTED | — | `docPathToHash`: checks `base.startsWith("adr-")` then returns `/adr/${docPath.replace(/\.md$/, "")}` — full path, no strip |
| adr-0035 scope | MarkdownView.tsx: `docLinkToHash` uses full href for ADR routes | MarkdownView.tsx:10-15 | IMPLEMENTED | — | `docLinkToHash`: checks `base.startsWith("adr-")` then returns `#/adr/${href.replace(/\.md$/, "")}` — full href, no strip |

---

### Consistency cross-check

All six components use the same pattern:
- Detect ADR by checking if basename starts with `adr-`
- Route = `/adr/<full-doc-path-without-.md-extension>`
- No prefix stripping (`docs/`, `adr-`, etc.) — full path preserved

The `adrSlug` function in Landing.tsx (line 31-33) still exists and still strips `docs/` + `adr-` prefixes, but it is now only used for **display label fallback** in `adrLabel()` (line 43-47), not for navigation. Navigation at line 157 uses `adr.doc_path.replace(/\.md$/, "")` directly. This is correct per ADR-0035 decision table.

---

### Summary

All ADR-0035 gaps from the previous audit are resolved. All six components produce consistent `#/adr/<full-doc-path>` URLs. No remaining gaps.

- ADR-0035 spec lines: 6
- IMPLEMENTED: 6
- GAP: 0
- PARTIAL: 0
