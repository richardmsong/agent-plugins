---
name: feature-change
description: Universal entry point for any change to the project — new features, bug fixes, refactors, config changes, anything. Authors an ADR for the request, updates impacted specs (verified by spec-evaluator), and runs dev-harness -> implementation-evaluator loop until CLEAN. Handles spec backpressure via /plan-feature rules.
version: 1.0.0
user_invocable: true
argument-hint: <description of the change>
---
{{ include "skills/feature-change/SKILL.md" }}
