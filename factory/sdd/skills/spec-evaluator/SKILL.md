---
name: spec-evaluator
description: Spec alignment audit — verifies that specs reflect ADR decisions. Spawns the spec-evaluator agent (fresh context, no conversation history). Saves results to .agent/audits/.
version: 1.0.0
user_invocable: true
argument-hint: <adr-path>
---
{{ include "skills/spec-evaluator/SKILL.md" }}
