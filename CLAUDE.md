# Project Rules

## All changes — /feature-change first

**Never write implementation code directly for any app change.**
Every change — feature, bug fix, refactor, config, UI tweak, backend change — goes through `/feature-change` first.

The loop: `/feature-change` checks the spec → updates spec if needed → commits spec → calls dev-harness → implements and tests.

For bug fixes where the spec is already correct, `/feature-change` skips the spec update and goes straight to dev-harness.

## New feature detected → invoke /plan-feature immediately

When the user describes anything that looks like a potential new feature, jump straight into `/plan-feature` — don't wait for the full picture, don't rely on keeping it in memory.

Planning context is lost when you get compacted or switched out. The ADR on disk is the durable form. Start `/plan-feature` on the first mention, even mid-conversation, even if there are still open questions — drafts are first-class and can be paused, committed, and resumed.

Heuristic: if the user says something like "maybe we should...", "what if...", "could we add...", "I want to...", or describes a capability the app doesn't have yet → that's `/plan-feature`. Don't ask permission; just start the skill and let the Q&A surface the rest.

## Never edit source files directly

The master session authors ADRs, updates specs, and orchestrates agents. It does **not** write production code, tests, config, or templates. All source file changes go through dev-harness subagents invoked by `/feature-change`.

If tests fail, code is missing, or implementation is wrong — invoke dev-harness, don't fix it yourself. If agents are failing (permissions, context limits), fix the agent infrastructure, not the source code.

## Parallelism — use subagents for independent work

When requests can be parallelized, use subagents extensively rather than handling them sequentially.

Launch multiple agents in a single message when their work is independent. Don't serialize tasks that can overlap.
