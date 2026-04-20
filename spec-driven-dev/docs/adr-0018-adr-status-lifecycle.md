# ADR: ADR Status Lifecycle

**Status**: implemented
**Status history**:
- 2026-04-19: accepted
- 2026-04-19: implemented — docs-mcp status column + parser + filters landed in 982a95d and d42f76a; spec-evaluator CLEAN

## Overview

Add a small, bounded status lifecycle to every ADR so that planning can be paused and resumed, and so that the distinction between "a decision being drafted" and "a decision that has been made" is explicit in the filesystem.

Status values: `draft | accepted | implemented | superseded | withdrawn`.

The ADR body remains immutable once a decision is made. Only the `Status` field and `Status history` list are mutable — they are metadata about the decision, not the decision itself.

## Motivation

The refactor in `adr-0021-docs-plan-spec-refactor.md` established that every feature request produces an ADR, co-committed with any impacted specs. The co-commit is the lineage edge.

But in practice, planning is not atomic:
- A user starts `/plan-feature`, gets partway through Q&A, and wants to pause.
- Work shifts to something else; the half-drafted ADR sits in the working tree.
- When they come back, they want to pick up from where they left off.

Without a status concept:
- A committed-but-incomplete ADR pollutes the lineage graph with non-decisions.
- An uncommitted draft gets lost when the user switches branches.
- There is no way to tell at a glance whether a given ADR is "decided" or "still being figured out."

A status field plus a bounded state machine fixes this. Drafts are first-class citizens, safe to commit, safe to resume, and excluded from lineage until they reach `accepted`.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Status values | `draft`, `accepted`, `implemented`, `superseded`, `withdrawn` | Standard Nygard ADR lifecycle, trimmed to the five transitions mclaude actually uses. |
| Where status lives | Top of the ADR body, as `**Status**: <value>` followed by `**Status history**:` list | Visible in any markdown reader, grep-able, editable by humans without tooling. |
| Mutability | Status field + history list are mutable. The rest of the ADR body is immutable once `accepted`. | Status is metadata; the decision itself is not being rewritten. |
| Default status for new ADRs | `draft` | `/plan-feature` always starts in draft and promotes to `accepted` only when Q&A is complete and spec edits are staged. |
| When the lineage co-commit happens | Only at the `draft → accepted` transition | Drafts never co-commit with specs. This keeps `get_lineage` clean. |
| When `accepted → implemented` fires | After `/feature-change` runs its dev-harness loop to CLEAN for the ADR's scope | A separate commit that edits only the status field. No spec change required. |
| Resume mechanism | `/plan-feature --resume <slug>` lists draft ADRs; `/plan-feature <description>` detects a matching draft and offers to resume | Filesystem is the source of truth; no separate drafts registry. |
| Tooling filters | `search_docs` and `list_docs` accept an optional `status` filter. `get_lineage` only considers `accepted` and `implemented`. | Drafts should not surface in day-to-day discovery; implemented decisions still matter for lineage. |
| Schema/spec impact | None. This is a process and convention change, not a state-schema change. | No `docs/spec-*.md` is affected. |

## Status values

| Status | Meaning | Transitions from | Transitions to |
|--------|---------|-----------------|----------------|
| `draft` | Planning in progress. Questions may still be open. Not safe to implement. | — (initial state) | `accepted`, `withdrawn` |
| `accepted` | Decision finalized. Spec edits (if any) co-committed. Ready for dev-harness. | `draft` | `implemented`, `superseded` |
| `implemented` | Code matches the decision. Verified by `/spec-evaluator` CLEAN. | `accepted` | `superseded` |
| `superseded` | A later ADR overrides this decision. Kept for historical record. | `accepted`, `implemented` | — (terminal) |
| `withdrawn` | Abandoned before implementation. | `draft` | — (terminal) |

## ADR header format

Every ADR starts with:

```markdown
# ADR: <Title>

**Status**: <status>
**Status history**:
- YYYY-MM-DD: <status> [— optional one-line note, e.g. "paired with spec-state-schema.md update"]

## Overview
...
```

The `Status history` list is append-only. Each line records a transition with its date. When an ADR is superseded, the transition line points at the superseding ADR:

```markdown
- 2026-05-02: superseded by adr-2026-05-02-<slug>.md
```

## Transition rules

### `draft → accepted`

- All open questions resolved.
- Design audit (`/design-audit`) returns CLEAN.
- Spec edits (if any) are staged alongside the ADR.
- Status flipped to `accepted`, new history line added.
- **Single commit**: the ADR status change + spec edits. This is the lineage edge.

### `accepted → implemented`

- `/feature-change` has driven dev-harness + spec-evaluator to CLEAN for this decision's scope.
- Status flipped to `implemented`, new history line added.
- **Single commit**: only `docs/adr-YYYY-MM-DD-<slug>.md` (status line change). Code changes commit separately through dev-harness.

### `draft → withdrawn`

- User abandons the planning session.
- Status flipped to `withdrawn`, new history line added.
- **Single commit**: only the ADR.
- The file is kept; it remains historical record of "we considered X and chose not to do it."

### `accepted | implemented → superseded`

- A new ADR is authored that overrides this one.
- The new ADR's motivation/overview names which ADR(s) it supersedes.
- On the superseded ADR: status flipped to `superseded`, new history line with `superseded by adr-YYYY-MM-DD-<slug>.md`.
- Both changes go in the new ADR's commit (same lineage edge applies).

## Impact

### `/plan-feature`

- Always authors a `draft` ADR on first invocation.
- Accepts `--resume <slug>` to resume a prior draft; prints a list of drafts if no slug given.
- On new invocation without `--resume`, scans `docs/adr-*.md` for any `Status: draft` entry whose slug overlaps with the new feature description; offers to resume if a match is found.
- A draft can be committed at any checkpoint — user convenience (so work survives branch switches), not a requirement. Uncommitted drafts stay in the working tree.
- At the end of Q&A + spec edits, `/plan-feature` flips the draft to `accepted`, stages the ADR + spec edits, and commits in a single spec commit.

### `/feature-change`

- Reads only `accepted` and `implemented` ADRs. Skips `draft`, `superseded`, `withdrawn`.
- After dev-harness + spec-evaluator returns CLEAN for the ADR's scope, flips the ADR's status to `implemented` in a separate ADR-only commit.

### `mclaude-docs-mcp`

- `search_docs` gains an optional `status: 'draft' | 'accepted' | 'implemented' | 'superseded' | 'withdrawn'` filter.
- `list_docs category=adr` returns all ADRs by default; callers filter by status as needed.
- `get_lineage` only traverses edges that touch ADRs in `accepted` or `implemented` status. Draft, superseded, and withdrawn ADRs do not contribute lineage edges.
- Parser reads the `Status` line from the ADR body and stores it on the `documents` row. New column: `documents.status TEXT`.
- Index is re-derived from the filesystem; no data migration needed.

### Evaluators

- `spec-evaluator` reads `accepted` and `implemented` ADRs + all specs. Drafts are skipped.
- `design-evaluator` evaluates the target document regardless of status (you can audit a draft mid-flight).

## Scope

**v1 (this ADR):**
- Add the status header format to all existing ADRs — mechanical: add `**Status**: accepted` + history line with today's date. Every existing ADR is already implemented or accepted, and was committed before this convention existed; treat all prior ADRs as `accepted` retroactively with history line `<first-commit-date>: accepted`.
- Update `.agent/skills/plan-feature/SKILL.md` to author drafts and handle resume.
- Update `.agent/skills/feature-change/SKILL.md` to skip non-accepted ADRs and flip to `implemented` on CLEAN.
- Update `.agent/agents/spec-evaluator/AGENT.md` and `.agent/agents/dev-harness/AGENT.md` to filter by status.
- Docs MCP changes (parser, `status` column, filter in tools) — deferred to a follow-up dev-harness pass under this same ADR.

**Deferred:**
- Automated status promotion (e.g., a commit hook that flips `accepted → implemented` when tests pass) — manual for now.
- A `docs/spec-doc-conventions.md` that canonicalizes ADR + spec layout rules — extract only when a second convention change forces it.
- Rich draft metadata (ownership, last-touched date, blocking questions) — defer until multi-user planning makes it necessary.

## References

- `adr-0021-docs-plan-spec-refactor.md` — establishes the ADR/spec split this lifecycle sits on top of
- Michael Nygard's original ADR template (2011) — source of the status pattern
