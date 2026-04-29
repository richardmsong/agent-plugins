---
name: spec-evaluator
description: Fresh-context spec alignment evaluator. Reads an ADR and all referenced specs, reports every gap where the ADR decides X but the spec doesn't reflect X. No conversation context inherited. Saves results to .agent/audits/.
model: claude-sonnet-4-6
tools: Read, Glob, Grep, Write, Bash
---
{{ include "agents/spec-evaluator.md" }}
