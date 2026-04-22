# ADR: Dashboard shows ADR number in listing

**Status**: accepted
**Status history**:
- 2026-04-22: accepted

## Overview

The docs dashboard's ADR listing now prefixes each title with its ADR number (e.g. "ADR-0033: Setup skill scaffolds CLAUDE.md…"). Previously only the title was shown, making it hard to reference ADRs by number.

## Motivation

When scanning the ADR list, numbers are the primary identifier users use to reference and discuss ADRs. Showing only the title forces users to click into each ADR to discover its number.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Display format | `ADR-NNNN: <title>` | Matches the naming convention in filenames. Number first for quick scanning. |
| Number extraction | Regex on `doc_path` basename | The number is always in the filename (`adr-NNNN-slug.md`). No API change needed. |
| Scope | Landing page ADR list + LineagePopover ADR references | These are the two places ADR titles appear without their number. |

## Impact

- `docs-dashboard/ui/src/routes/Landing.tsx` — extract ADR number from `doc_path`, prepend to title display
- `docs-dashboard/ui/src/components/LineagePopover.tsx` — prepend ADR number when displaying linked ADRs

## Scope

**In:** ADR number prefix in Landing list and LineagePopover.
**Deferred:** AdrDetail page header (already shows the full doc_path which includes the number).
