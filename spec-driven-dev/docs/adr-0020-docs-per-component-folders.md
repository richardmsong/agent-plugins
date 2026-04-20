# ADR: Per-Component Doc Subfolders

**Status**: implemented
**Status history**:
- 2026-04-19: draft
- 2026-04-19: accepted — paired with `docs/spec-doc-layout.md` (new living spec)
- 2026-04-19: implemented — renumber + UI split + reference migration in 98b45e0; docs-mcp parser recursion + status schema in 982a95d and d42f76a; spec-evaluator CLEAN

> Supersedes the "per-concern only, v1" partitioning rule in
> `adr-0021-docs-plan-spec-refactor.md` (formerly
> `adr-2026-04-19-docs-plan-spec-refactor.md`). Supersedes the
> `adr-YYYY-MM-DD-<slug>.md` naming convention from the same ADR.

## Overview

Restructure `docs/` so that component-local specs live in per-component
subfolders, cross-cutting specs stay at the root, and a `docs/ui/` cluster
holds specs that apply to any UI component. ADRs remain flat at `docs/` root
and switch from date-based filenames (`adr-YYYY-MM-DD-<slug>.md`) to a
monotonic global counter (`adr-NNNN-<slug>.md`). All 21 existing ADRs are
renumbered retroactively in the same commit. The docs MCP parser gains
recursion; no schema or API changes. A new living spec
`docs/spec-doc-layout.md` canonicalizes the rules so future ADRs reference
one doc rather than re-deriving the layout.

## Motivation

The current "per-concern, v1" rule (from ADR-0021
`docs-plan-spec-refactor`) was the right call at ~20 ADRs and 3 specs. It no longer is:

1. **Component-local behavior has no home.** The deferred docs MCP status
   feature is entirely local to `mclaude-docs-mcp`. Under the current rule,
   behavior lives only in its ADR — so answering "what does the docs MCP do
   today?" requires reading every ADR that touched it. A
   `docs/mclaude-docs-mcp/spec-docs-mcp.md` collapses that to one file.
2. **A UI cluster is forming.** `mclaude-web` is the only UI today;
   `mclaude-ios` is planned. Shared design system, navigation, and
   interaction patterns must stay consistent across UI components —
   narrower than whole-system but broader than one component.
3. **Token consumption.** Large monolithic specs (`spec-ui.md` is 1000+
   lines) force agents to load unrelated content. Smaller per-topic specs,
   co-located with their component, keep reads scoped.
4. **ADR ordering.** Date-only filenames can't disambiguate multiple ADRs
   landing the same day — already the case for 2026-04-19.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Layout | All ADRs stay at `docs/` root. Only specs move into per-component subfolders. | Keeps the ADR index flat and chronologically browsable. Co-commit of ADR (root) + spec (subfolder) still works — same git operation spans directories. |
| ADR naming | `adr-NNNN-<slug>.md` — monotonic global counter, no date in filename. Dates remain in `Status history`. | Compact references (`ADR-0042`); no date arithmetic for ordering. |
| Existing ADR migration | Renumber all 21 existing ADRs retroactively in one mechanical rename commit. Sequence derived from first-commit-date via `git log --reverse --format=%ad --date=short -- <path>`. | Clean single-scheme codebase from day one. Acceptable one-time churn for external refs. |
| Renumber cross-reference updates | Mechanical find/replace of old filename references across `docs/`, `.agent/`, `.claude/`, and top-level READMEs in the same rename commit. Prose not altered. | Path updates are allowed under the ADR immutability rule (refactor ADR established this). Keeps the atomic rename useful. |
| Counter collision policy | Defer — hand-resolve by bumping the later-committed ADR's number. `/plan-feature` computes next N as `max(existing) + 1` at commit time and retries if the number's already taken. | Single author today; collision risk is low. Reservation infrastructure can be added later if needed. |
| Docs MCP data model | No new `component` column or filter. The index stays flat; callers filter by `doc_path` prefix. | Subfolder path already encodes the component — filter is a one-liner for callers. Avoids schema churn while the layout settles. |
| Docs MCP parser | Recurse into `docs/**/*.md` (content indexing). Classifier unchanged — `adr-*` → adr, `spec-*` → spec, `feature-list*` → spec. File watcher already uses `recursive: true`. | Only change needed for new layout. No schema migration. |
| UI cluster split | Split `docs/spec-ui.md` now on the shared-vs-local axis. Shared UI contracts (design system, navigation, interaction patterns, first-run flow, PTT, platform notes, connection indicator, prompt bar, diff view, settings schema) → `docs/ui/spec-*.md`. mclaude-web-specific (screens, overlays, web-specific settings layout) → `docs/ui/mclaude-web/spec-*.md`. | Establishes the shared-spec pattern while there's only one UI component, so the second (iOS) drops in without reshuffling. |
| UI split rule | "Is this a flow or contract another UI component would also implement?" → shared. "Is this a concrete widget implementation or screen layout?" → web-local. | Keeps the test simple enough to decide without a committee. |
| Filename convention inside subfolders | Keep the `spec-` prefix: `docs/<component>/spec-<topic>.md`. Multiple small files per component rather than one monolith. | Small per-topic specs keep token consumption bounded when an agent reads "just what it needs." Classifier stays filename-based (no parser changes). |
| Cross-component boundary | Anything touching 2+ components is cross-cutting by definition; lives at `docs/` root as `docs/spec-<concern>.md`. | Avoids owner-picking judgment calls and premature cluster-folder proliferation. |
| Existing cross-cutting specs | Do not split in this ADR. `spec-state-schema.md` (505 lines) and `spec-tailscale-dns.md` remain intact. | Keeps this ADR scoped to layout + naming. Size-driven splits can come under follow-up ADRs when an actual workflow hurts. |
| Folder naming | Full package names: `docs/mclaude-<component>/`. Folders created lazily — only when the first doc for that component is written. | Mirrors `ls mclaude-*` exactly; no mapping to maintain. `charts/` and `mclaude-cli` get folders only when they have content. |
| Retroactive component specs | Not written under this ADR. Existing components get a `spec-*.md` organically as future ADRs add or document behavior. | Backfilling specs for 10 components would be massive scope; lazy creation matches how the docs evolved. |
| Policy home | Extract a new living `docs/spec-doc-layout.md` that canonicalizes the partitioning + naming rules. This ADR co-commits with it (lineage edge). | Future ADRs that change layout update a single living doc rather than chaining ADR-to-ADR references. |

## Target Layout

```
docs/
├── feature-list.md                     # cross-cutting: inventory
├── spec-state-schema.md                # cross-cutting: DB/KV/NATS/K8s
├── spec-tailscale-dns.md               # cross-cutting: DNS
├── spec-doc-layout.md                  # cross-cutting: doc layout rules (new)
│
├── adr-0001-telemetry.md               # flat ADR index
├── adr-0002-k8s-integration.md
├── ...
├── adr-NNNN-<slug>.md
│
├── ui/                                 # UI cluster (shared across all UI components)
│   ├── spec-design-system.md
│   ├── spec-navigation.md
│   ├── spec-interaction-patterns.md
│   ├── spec-first-run-flow.md
│   ├── spec-auth.md                    # login flow + error contract
│   ├── spec-conversation-events.md     # event types + rendering contract
│   ├── spec-token-usage.md             # calibration + budget-bar semantics
│   ├── spec-ptt.md
│   ├── spec-platform-notes.md
│   ├── spec-connection-indicator.md
│   ├── spec-prompt-bar.md
│   ├── spec-diff-view.md
│   └── mclaude-web/                    # per-UI-component
│       ├── spec-dashboard.md           # Dashboard + New Session / Project Filter / New Project sheets
│       ├── spec-session-detail.md      # Session Detail + Terminal tab + Edit Session sheet
│       ├── spec-overlays.md            # Event Detail Modal, Three-dot Menu, Raw Output
│       ├── spec-user-management.md     # admin-only screen
│       └── spec-settings-web.md        # Settings screen (whole Screen: Settings section)
│
├── mclaude-docs-mcp/                   # component-local (new, lazy)
│   └── spec-docs-mcp.md                # consolidated once first ADR adds content
│
└── <other mclaude-*>/                  # folders spring up as specs appear
```

Lazy folder creation: `docs/mclaude-cli/`, `docs/mclaude-connector/`,
`docs/mclaude-relay/`, `docs/mclaude-server/`, `docs/mclaude-session-agent/`,
`docs/mclaude-control-plane/`, `docs/mclaude-mcp/`, `docs/charts/` exist
only when they have a doc to hold.

## Component Changes

### `mclaude-docs-mcp`

- Parser: `indexAllDocs` in `mclaude-docs-mcp/src/content-indexer.ts`
  must recurse. Two sites change together:
  - **File enumeration** at line 102 (`readdirSync(docsDir).filter(f => f.endsWith(".md"))`)
    switches to a recursive walk that returns every `**/*.md` under
    `docs/` with full paths. Skip symlinked directories to avoid loops.
  - **Stale-removal reference list** at line 115 (`docPaths = files.map(...)`)
    must be built from the same recursive `files` list. If the walk
    recurses but `docPaths` stays flat, the stale-removal loop at
    line 122 deletes every subfolder document on each startup scan.
  Both changes land in the same commit and are covered by tests.
- File watcher: already uses `recursive: true` per
  `adr-0015-docs-mcp.md`. The `runReindex` at `watcher.ts:27-31` joins
  `docsDir` with the filename the OS reports. On macOS FSEvents,
  filenames for nested files are relative paths (e.g.
  `ui/spec-design-system.md`) — `join(docsDir, filename)` resolves
  correctly. This path is covered by a new test (below).
- Classifier: no change. `adr-*` → `'adr'`, `spec-*` → `'spec'`,
  `feature-list*` → `'spec'`. All ADRs live at root; specs may live at
  any depth under `docs/`.
- Schema: no change. No `component` column, no new filter on `list_docs`
  or `search_docs`. Callers who want to filter by component use
  `doc_path.startsWith("docs/<name>/")` on the results.
- Lineage: no change. Git co-commits across subfolder boundaries are
  discovered the same way as flat commits.

### Skills and agents

Reference globs updated from flat to recursive. Enumerated updates:

| File | Change |
|------|--------|
| `.agent/skills/plan-feature/SKILL.md` | Step 4b "Update impacted specs" table replaced entirely (see below). Filename template updated to `adr-NNNN-<slug>.md`. Next-number computation: `max(existing) + 1`. Collision policy: bump-and-retry at commit time. |
| `.agent/skills/feature-change/SKILL.md` | Same spec-location table. ADR authoring uses new naming. |
| `.agent/skills/design-audit/SKILL.md` | Default target glob includes `docs/adr-*.md` at root only (ADRs never nest). Examples updated. |
| `.agent/skills/spec-evaluator/SKILL.md` | Component → docs table maps each component to its subfolder glob (`docs/mclaude-<name>/spec-*.md`). |
| `.agent/skills/file-bug/SKILL.md` | Area-to-spec table updated. |
| `.agent/skills/schedule-feature/SKILL.md` | Example `spec-path` arguments use new paths. |
| `.agent/skills/job-queue/SKILL.md` | Example output references updated. |
| `.agent/agents/dev-harness/AGENT.md` | Discovery glob `docs/adr-*.md` (root-only) + `docs/**/spec-*.md` (recursive). Reference table updated. |
| `.agent/agents/spec-evaluator/AGENT.md` | Same glob changes. Per-component table mapping updated. |
| `.agent/agents/design-evaluator/AGENT.md` | Cross-reference glob `docs/adr-*.md` and `docs/**/spec-*.md`. |

**New Step 4b table for `.agent/skills/plan-feature/SKILL.md`** (replaces the current 4-row table):

```markdown
| Change surface                                       | Spec to edit                                  |
|------------------------------------------------------|-----------------------------------------------|
| Persistent state (DB, KV, NATS subjects, K8s)        | `docs/spec-state-schema.md`                   |
| DNS                                                  | `docs/spec-tailscale-dns.md`                  |
| Doc layout / partitioning rules                      | `docs/spec-doc-layout.md`                     |
| Cross-cutting spec (touches 2+ components)           | `docs/spec-<concern>.md` (root)               |
| UI shared contract (flow, interaction, design token) | `docs/ui/spec-<topic>.md`                     |
| UI component-local (screen, widget, platform API)    | `docs/ui/<ui-component>/spec-<topic>.md`      |
| Component-local behavior (single non-UI component)   | `docs/<component>/spec-<topic>.md`            |
| Feature-local detail with no cross-cutting impact    | None — ADR alone is enough                    |
```

## Migration

**Atomic commit contents:**

1. Rename 21 existing ADR files (including this ADR itself) from
   `adr-YYYY-MM-DD-<slug>.md` to `adr-NNNN-<slug>.md`. Sequence is
   derived from the date embedded in each current filename (ascending),
   with same-date ties broken by ascending slug alphabetical. Sequence
   starts at `0001`. Deriving from the filename date (not git history)
   is important: `git log --format=%ad` returns 2026-04-19 for every
   ADR because of the prior rename in commit c706008, which would
   collapse all into a single-day tiebreaker. The filename date
   preserves the original authoring chronology.

   **Explicit mapping (final, authoritative):**

   | NNNN | Current filename                               |
   |------|------------------------------------------------|
   | 0001 | adr-0001-telemetry.md                    |
   | 0002 | adr-0002-core-containers.md              |
   | 0003 | adr-0003-k8s-integration.md              |
   | 0004 | adr-0004-multi-laptop.md                 |
   | 0005 | adr-0005-pluggable-cli.md                |
   | 0006 | adr-0006-client-architecture.md          |
   | 0007 | adr-0007-github-oauth.md                 |
   | 0008 | adr-0008-graceful-upgrades.md            |
   | 0009 | adr-0009-quota-aware-scheduling.md       |
   | 0010 | adr-0010-scratch-to-git.md               |
   | 0011 | adr-0011-multi-cluster.md                |
   | 0012 | adr-0012-replay-user-messages.md         |
   | 0013 | adr-0013-reconciler-env-sync.md          |
   | 0014 | adr-0014-controller-separation.md        |
   | 0015 | adr-0015-docs-mcp.md                     |
   | 0016 | adr-0016-nats-security.md                |
   | 0017 | adr-0017-token-insights.md               |
   | 0018 | adr-0018-adr-status-lifecycle.md         |
   | 0019 | adr-0019-backgrounded-shells.md          |
   | 0020 | adr-0020-docs-per-component-folders.md   |
   | 0021 | adr-0021-docs-plan-spec-refactor.md      |

   This ADR becomes ADR-0020. That it numerically precedes the ADR it
   supersedes (ADR-0021 docs-plan-spec-refactor) is fine — numbering is
   chronological by authoring date, not by semantic dependency.
   Supersession is tracked in `Status history`.
2. Mechanical find/replace across `docs/`, `.agent/`, `.claude/`, top-level
   `*.md` replacing every occurrence of each old filename with its new
   name. Prose is not edited beyond the filename token.
3. Move `docs/spec-ui.md` → split per the explicit H2-to-destination
   table below. Every H2 in the current file has exactly one row. The
   shared/local call is made per-section using the rule from
   `spec-doc-layout.md` (flows/contracts = shared; concrete widget
   layout = local).

   | H2 heading in current spec-ui.md      | Destination file                               |
   |---------------------------------------|------------------------------------------------|
   | Design System                         | `docs/ui/spec-design-system.md`                |
   | Navigation Model                      | `docs/ui/spec-navigation.md`                   |
   | Screen: Auth / Login                  | `docs/ui/spec-auth.md`                         |
   | First-Run Flow                        | `docs/ui/spec-first-run-flow.md`               |
   | Screen: Dashboard                     | `docs/ui/mclaude-web/spec-dashboard.md`        |
   | Sheet: New Session                    | `docs/ui/mclaude-web/spec-dashboard.md`        |
   | Sheet: Project Filter                 | `docs/ui/mclaude-web/spec-dashboard.md`        |
   | Sheet: New Project                    | `docs/ui/mclaude-web/spec-dashboard.md`        |
   | Screen: Session Detail                | `docs/ui/mclaude-web/spec-session-detail.md`   |
   | Conversation Events                   | `docs/ui/spec-conversation-events.md`          |
   | Tab: Terminal                         | `docs/ui/mclaude-web/spec-session-detail.md`   |
   | Overlay: Event Detail Modal           | `docs/ui/mclaude-web/spec-overlays.md`         |
   | Overlay: Three-dot Menu               | `docs/ui/mclaude-web/spec-overlays.md`         |
   | Sheet: Edit Session                   | `docs/ui/mclaude-web/spec-session-detail.md`   |
   | Overlay: Token Usage (Session)        | `docs/ui/spec-token-usage.md`                  |
   | Screen: Token Usage (Global)          | `docs/ui/spec-token-usage.md`                  |
   | Screen: Settings                      | `docs/ui/mclaude-web/spec-settings-web.md` (whole section, no split — see note below) |
   | Screen: User Management (admin only)  | `docs/ui/mclaude-web/spec-user-management.md`  |
   | Component: Connection Indicator       | `docs/ui/spec-connection-indicator.md`         |
   | Component: Inline Diff View           | `docs/ui/spec-diff-view.md`                    |
   | Interaction: Prompt Bar               | `docs/ui/spec-prompt-bar.md`                   |
   | Raw Output Overlay                    | `docs/ui/mclaude-web/spec-overlays.md`         |
   | Interaction Patterns                  | `docs/ui/spec-interaction-patterns.md`         |
   | Push-to-Talk (PTT)                    | `docs/ui/spec-ptt.md`                          |
   | Platform Notes                        | `docs/ui/spec-platform-notes.md`               |
   | What v1 Does That v2 Must Also Do     | `docs/ui/spec-interaction-patterns.md` (appendix) |

   Rationale for the less-obvious calls:
   - **Auth / Login → shared**: login flow and error messaging are
     cross-platform contracts; any UI implements the same.
   - **Conversation Events → shared**: event types and their rendering
     contracts (AskUserQuestion, Tool Use, Subagent Group, etc.) are
     part of the session-agent stream protocol that every UI must render.
   - **Token Usage → shared**: the data contract (calibration, budget
     bar semantics) is cross-platform; entered from a screen in one UI,
     might be entered from a different surface in another.
   - **Edit Session → web-local**: it's a concrete in-session sheet;
     the underlying edit operation is cross-platform but lives in
     `spec-session-detail.md` because the sheet is a web widget.
   - **User Management → web-local**: admin-only web screen;
     multi-user features are web-first today.
   - **Settings → web-local (whole section, no split)**: the current
     Settings section describes widget-level layout and error-handling
     rules with no clean schema-vs-layout boundary. Keeping it intact
     avoids an arbitrary cut. Extracting a shared settings-keys contract
     is deferred (see Scope) until a second UI component forces it.
4. Add `docs/spec-doc-layout.md` (new living spec).
5. Update `.agent/skills/*.md` and `.agent/agents/*.md` per the table above.
6. Update `mclaude-docs-mcp/src/parser.ts` (or equivalent) to recurse.
   Update the corresponding tests.

**Cross-reference updates are limited to:**
- Path references in markdown links (`[…](docs/adr-YYYY-MM-DD-*.md)`).
- Path references in code fences / shell snippets (`Glob("docs/adr-*.md")`).
- Frontmatter-style pointers (`> Superseded by adr-YYYY-MM-DD-*.md`).
- Top-level README.md or CLAUDE.md references.

**Not edited:**
- Prose like "the telemetry decision" or "the k8s-integration ADR."
- `.agent/audits/*.md` content — frozen audit artifacts per the prior
  refactor's policy.
- Git commit messages (immutable history).

## Data Model

No persistent state changes. The `mclaude-docs-mcp/.docs-index.db` is rebuilt
automatically from the filesystem by the existing startup scan + watcher.

## Error Handling

| Failure | Behavior |
|---------|----------|
| Parser encounters a symlink loop under `docs/` | Ignore symlinks during walk. (Current code may not do this; tests added.) |
| Two ADRs committed with the same number | Second committer's pre-commit sees the existing file, bumps to next free number, retries. Manual fix if that also collides. |
| Rename commit partially applies (e.g. crash mid-run) | One commit = atomic. No partial state possible under git. |
| An old-path reference missed during find/replace | Agent trying to read it gets "file not found." Spec-evaluator catches stale refs in its next audit pass. |
| Docs MCP parser fails to recurse | Nothing under subfolders is indexed; cross-cutting root docs still work. Bug to fix; no data loss since index rebuilds. |

## Security

N/A — file layout only. No auth, no tokens, no scope changes.

## Impact

**Specs co-committed with this ADR:**

- `docs/spec-doc-layout.md` — new living spec canonicalizing the rules.
- `docs/spec-ui.md` — removed (content moved into `docs/ui/`).

**Components implementing the change:**

- `mclaude-docs-mcp` — parser recursion + tests.
- `.agent/skills/*` and `.agent/agents/*` — reference updates.
- All 21 existing ADR files (including this one) — mechanical rename.
- 17 new UI spec files from the `spec-ui.md` split (12 shared under `docs/ui/` + 5 web-local under `docs/ui/mclaude-web/`, per the target layout).

## Scope

**v1 (this ADR):**
- Rename all 21 existing ADRs (including this one) to `adr-NNNN-<slug>.md`.
- Mechanical cross-reference updates across `docs/`, `.agent/`, `.claude/`,
  top-level markdown.
- Split `docs/spec-ui.md` into `docs/ui/` + `docs/ui/mclaude-web/` per
  the mapping above.
- Author `docs/spec-doc-layout.md`.
- Update docs MCP parser to recurse.
- Update skill and agent reference globs.

**Deferred:**
- Extracting a shared settings-keys contract (`docs/ui/spec-settings.md`)
  out of the web-local `spec-settings-web.md` — do when a second UI
  component actually needs to consume the same settings schema.
- Splitting `docs/spec-state-schema.md` into topic files — handled when a
  concrete agent workflow shows the size hurts.
- Retroactively writing `spec-*.md` for components with no docs today
  (`mclaude-session-agent`, `mclaude-connector`, `mclaude-relay`,
  `mclaude-server`, `mclaude-control-plane`, `mclaude-cli`, `mclaude-mcp`,
  `charts`) — organic creation.
- Docs MCP `component` column / filter — only if grep-by-prefix becomes
  painful.
- Counter-collision reservation infrastructure — only if schedule-feature
  or other automation starts authoring ADRs in parallel.

## Implementation Plan

| Component | New/changed lines (est.) | Dev-harness tokens (est.) | Notes |
|-----------|--------------------------|---------------------------|-------|
| `mclaude-docs-mcp` parser recursion | ~20 | ~40k | Walk change + test. Index rebuild verified by existing tests. |
| Parser/classifier tests for nested paths | ~80 | ~50k | Cover `docs/ui/spec-*.md`, `docs/mclaude-*/spec-*.md`, symlink avoidance, stale-removal correctness under recursion, and watcher single-file reindex when `filename` from the OS is a relative nested path (e.g. `ui/spec-design-system.md`). |
| Skills/agents reference updates | ~120 | ~50k | 9 files per the table. |
| ADR rename + ref updates (mechanical) | ~0 (moves only) | ~20k | One sed pass; committed by plan-feature, not dev-harness. |
| spec-ui.md split (mechanical) | ~0 (moves only) | ~30k | Same commit as rename. |
| New `docs/spec-doc-layout.md` | ~150 | ~10k | Authored in Step 4b of this plan-feature. |
| docs MCP index regen verification | ~0 | ~10k | Delete `.docs-index.db`; restart; confirm all specs indexed. |

**Total estimated tokens:** ~200k
**Estimated wall-clock:** ~40min of 5h budget (~13%)
