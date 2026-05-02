# ADR: /feature-change always invokes /plan-feature; dialogue is conversational

**Status**: accepted
**Status history**:
- 2026-05-02: accepted

## Overview

Two related changes: (1) `/feature-change` now invokes `/plan-feature` for ADR authoring on every request — bug fixes, refactors, behavior changes, and new features alike. The master session no longer authors ADRs directly in Step 3; it delegates that step to plan-feature's dialogue loop. (2) The Q&A loop in `/plan-feature` becomes conversational — 1–2 questions per round rather than up to 4 — so answers inform the next questions before more are asked.

## Motivation

The user wants a dialogue on every change, not just large features. Previously `/feature-change` authored ADRs directly in Step 3 (skipping any dialogue), and `/plan-feature` was only triggered for Class B (new features) — and even then, the user had to invoke it manually. The batch size of "up to 4 questions" made Q&A feel like a form rather than a conversation.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| /plan-feature invoked by /feature-change | Yes, for all classes (A/B/C/D) | Every change deserves a planning dialogue regardless of size or type |
| Who invokes plan-feature | /feature-change invokes it automatically in Step 3, replacing direct ADR authoring | User should not need to run two commands |
| plan-feature output is the ADR | plan-feature produces the accepted ADR + spec edits + commit; /feature-change picks up from the dev-harness step | Clean hand-off: plan-feature owns design, feature-change owns implementation |
| Q&A batch size | 1–2 questions per AskUserQuestion call (down from "up to 4") | Smaller batches force genuine follow-up based on what the user just said |
| Follow-up discipline | After each answer, explicitly consider what the answer unlocked or changed before drafting the next question | Prevents pre-scripted interrogations that ignore the user's direction |
| Big-picture conversation before drafting | New Step 1b: share feasibility assessment and shape before writing any ADR | User often has an idea but doesn't know if it's feasible or what it looks like — give that picture before committing to a draft structure |

## Impact

- `src/sdd/skills/feature-change/SKILL.md` — Step 2 Class B no longer tells user to run /plan-feature manually; Step 3 replaced with "invoke /plan-feature" for all classes
- `src/sdd/skills/plan-feature/SKILL.md` — new Step 1b (big-picture conversation); Step 3 batch size changed from "up to 4" to "1–2"; follow-up discipline added

No spec files require updating — skill instruction files only.

## Scope

In v1:
- feature-change Step 3 delegates to plan-feature for all classes
- plan-feature Q&A batch size reduced to 1–2
- Follow-up question guidance added

Deferred:
- No change to plan-feature's write-first principle, design-audit, or spec-evaluator steps
- No change to CLAUDE.md routing rules

## Integration Test Cases

No integration tests — change is skill instruction files only.
