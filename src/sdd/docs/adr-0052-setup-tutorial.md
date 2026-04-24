# ADR: Setup as interactive tutorial

**Status**: accepted
**Status history**:
- 2026-04-24: draft
- 2026-04-24: accepted — no spec updates (setup has no spec; deferred to docs/spec-setup.md)

## Overview

Transform `/setup` from a silent file-scaffolding step into a brief interactive tutorial that teaches the user the value of spec-driven development and how to use it. The mechanical setup still happens, but it's bookended by: (1) an intro explaining what SDD is and why it's valuable, (2) a contextual example based on the user's actual repo showing how they'd use it. The user finishes setup understanding the mental model and ready to work.

## Motivation

The current `/setup` writes config files silently. A new user finishes with zero understanding of why Claude can't edit their source files directly, what `sdd-master` is, or how the workflow benefits them. Their first reaction is confusion ("why can't I just edit the file?") rather than productivity. The tutorial bridges the gap between "files are configured" and "I understand how to work this way."

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Tutorial format | Brief printed guide integrated into setup output | Not an interactive walkthrough — just a few well-placed explanatory paragraphs before and after the mechanical steps. Fast, non-blocking. |
| Teaching scope | Benefits of SDD + high-level pipeline overview + how to use sdd-master + why source files are protected + run /setup on every project | Focus on value proposition and practical usage. Skills don't need explicit invocation instructions since CLAUDE.md handles routing. |
| Contextual example | Read the repo and explain how SDD would apply to their actual work | If the repo has code: reference their actual structure. If empty repo: sample `~/.claude/projects/` JSONL files to see what they've been working on across projects, then give concrete examples of how SDD would improve those workflows. Makes the tutorial personal without leaving artifacts. |
| Sample ADR | None created | No cleanup needed. The contextual example is explanation, not a file on disk. |
| First-time detection | Capture `is_first_time` boolean before any file writes | Check `spec-driven-config.json` absence at step 2, store result, then proceed. Mechanical setup (step 4) writes the file — but the boolean was already captured, so interrupted first runs don't suppress the tutorial on re-run. |
| Returning users | `/setup` re-runs all mechanical steps (idempotent) but skips tutorial | Returning path refreshes CLAUDE.md, permissions, AND sdd-master symlink — all idempotent. Only the tutorial content (intro, contextual example, skills overview) is skipped. |
| Skills introduction | List all user-invocable skills with one-line descriptions | Inclusion criterion: every skill directory under `claude/sdd/skills/` that has `user_invocable: true` in its SKILL.md frontmatter. |
| JSONL sampling | Read up to 5 most-recently-modified JSONL files, 50 lines each | Bound the sampling to keep setup fast. Read the last 50 lines (tail) of each file — recent conversation turns are most informative. If no signal, fall through to generic example. |

## User Flow

### First-time setup

1. User runs `/setup`
2. **Capture `is_first_time`**: check `spec-driven-config.json` absence. Store as boolean. This check happens BEFORE any file writes so interrupted first runs don't suppress the tutorial.
3. **Intro block** (printed only if `is_first_time`, not interactive):
   - What is spec-driven development? (2-3 sentences on the value: decisions are recorded, specs stay in sync, implementation is verified against specs)
   - How the pipeline works at a high level: you describe a change → Claude writes an ADR (records the decision) → updates the spec (living documentation) → dev-harness implements → spec-evaluator verifies
   - Why source files are protected: the master session orchestrates; subagents implement. This separation prevents drift between docs and code.
4. **Mechanical setup** (same as current, runs for ALL users — first-time and returning):
   - Write `spec-driven-config.json` (skips if exists)
   - Scaffold CLAUDE.md
   - Bootstrap permissions
   - Symlink sdd-master
5. **sdd-master explanation** (only if `is_first_time`):
   - What it is: a CLI shortcut that starts a Claude session with the SDD workflow pre-loaded
   - How to use it: `sdd-master` in any project where you've run `/setup`
   - Note: run `/setup` on every project you want to use SDD with
6. **Contextual example** (only if `is_first_time`):
   - Read the repo: check for `src/`, `package.json`, `go.mod`, existing `docs/`, etc.
   - If repo has code: "For example, if you wanted to [concrete change based on what's in the repo], you'd just tell Claude: '[natural language request]'. Claude would invoke /feature-change, write an ADR recording why, update the relevant spec, and implement it through dev-harness."
   - If empty repo: sample JSONL files from `~/.claude/projects/` using the bounded sampling strategy below.
   - If no Claude history either: fall back to a generic example relevant to their detected tech stack, or ask what they're planning to build.

   **JSONL sampling strategy** (empty-repo branch only):
   1. List all `.jsonl` files under `~/.claude/projects/`, sorted by mtime descending.
   2. Read the **last 50 lines** (`tail -50`) of the **5 most recently modified** files. This keeps sampling fast and focuses on recent work.
   3. Scan for user messages containing project-related keywords (language names, framework names, domain terms). Extract a 1-2 sentence summary of what the user has been working on.
   4. If sampling yields no clear signal (files empty, unreadable, or content too generic): fall through to the "no Claude history" generic example branch.
   5. Never print or reference the raw JSONL content — only use derived summaries.

7. **Skills overview** (only if `is_first_time`):
   List all user-invocable skills except `/setup` itself (the user just ran it — listing it would be circular). Discover dynamically: scan `claude/sdd/skills/*/SKILL.md` and include every skill whose frontmatter contains `user_invocable: true`, excluding `setup`. As of this writing, the complete list is:
   ```
   Available skills (invoked automatically based on your request):
   - /feature-change — any change: features, bug fixes, refactors, config
   - /plan-feature — new features that need design discussion first
   - /dashboard — browse your ADRs, specs, and lineage graph
   - /spec-evaluator — verify code matches specs
   - /design-audit — evaluate an ADR for ambiguities and gaps
   - /file-bug — report a bug with structured reproduction steps
   ```
8. **Verify** (same as current, runs for ALL users)

### Returning user (re-run)

1. User runs `/setup`
2. `is_first_time = false` (spec-driven-config.json exists)
3. Runs all mechanical steps (idempotent):
   - `spec-driven-config.json` — skips (already exists, preserves customizations)
   - CLAUDE.md — refreshes SDD marker block (in case context.md was updated)
   - Permissions — merges any missing entries into `.claude/settings.json`
   - sdd-master symlink — re-creates (follows new plugin path if reinstalled)
4. Verify (same checks as first-time)
5. Prints: "SDD config refreshed. CLAUDE.md updated to latest workflow rules."
6. No tutorial — they already know.

## Component Changes

### setup SKILL.md
Rewrite the skill to add tutorial content around the mechanical steps. The algorithm becomes:

```
1. Resolve PLATFORM_ROOT and TARGET
2. Capture is_first_time = (spec-driven-config.json does not exist)
3. If is_first_time: print intro block
4. Mechanical setup (unchanged, runs for ALL users):
   a. Write spec-driven-config.json (skips if exists)
   b. Scaffold CLAUDE.md
   c. Bootstrap permissions
   d. Symlink sdd-master
5. If is_first_time: print sdd-master explanation
6. If is_first_time: read repo context, print contextual example
7. If is_first_time: print skills overview
8. Verify
9. If NOT is_first_time: print "SDD config refreshed" one-liner
```

The rewritten SKILL.md maps these steps to section headers as follows:

| Algorithm step | SKILL.md section header |
|---|---|
| 1 | (stays in existing "Resolving paths" section, before numbered steps) |
| 2 | ## Step 0 — Detect first-time vs returning |
| 3 | ## Step 1 — Intro block (first-time only) |
| 4a | ## Step 2 — Write spec-driven-config.json |
| 4b | ## Step 3 — Scaffold CLAUDE.md |
| 4c | ## Step 4 — Bootstrap default permissions |
| 4d | ## Step 5 — Symlink sdd-master |
| 5 | ## Step 6 — sdd-master explanation (first-time only) |
| 6 | ## Step 7 — Contextual example (first-time only) |
| 7 | ## Step 8 — Skills overview (first-time only) |
| 8 | ## Step 9 — Verify |
| 9 | (part of Step 9 — different output based on is_first_time) |

Existing mechanical steps (current Step 1–5) are renumbered to Step 2–5 to make room for the detection step and intro block.

### context.md (no change)
Current context.md is Claude-facing instructions. The tutorial content is in the SKILL.md — it tells Claude what to print, not what rules to follow.

## Data Model

No new data. Tutorial content is embedded in the SKILL.md as text for Claude to print.

## Error Handling

| Failure | Behavior |
|---------|----------|
| Can't read repo context (no `src/`, `package.json`, etc.) | Fall through to JSONL sampling branch |
| `~/.claude/projects/` doesn't exist or is empty | Fall through to generic example branch |
| JSONL files unreadable or yield no signal | Fall through to generic example branch |
| All contextual example branches fail | Print a generic example ("If you wanted to add a feature, you'd tell Claude...") or ask what the user is planning to build |
| User interrupts tutorial | Mechanical setup already completed by step 4; no harm. `is_first_time` was captured before writes, so re-running `/setup` will show the tutorial again. |

## Security

No change — same file scaffolding as before.

## Impact

Updates `claude/sdd/skills/setup/SKILL.md`. No updates to existing specs (`spec-docs-mcp.md`, `spec-dashboard.md`) — this ADR doesn't change MCP tools, data models, indexing, or dashboard endpoints.

Note: the setup skill has no dedicated spec (`docs/spec-setup.md`). Decisions from ADR-0033, ADR-0045, and this ADR accumulate in the skill file and ADR history only. Creating a living spec for setup is deferred — see Scope.

## Scope

### In v1
- Intro block explaining SDD value and pipeline
- sdd-master usage explanation
- Contextual example based on repo contents
- Skills overview
- First-time vs returning detection
- Rewritten setup SKILL.md

### Deferred
- Interactive walkthrough / guided first task
- Video or animated demo
- Per-language customized examples (e.g. Go-specific vs TypeScript-specific guidance)
- `docs/spec-setup.md` — living spec consolidating setup decisions from ADR-0033, ADR-0045, and this ADR
