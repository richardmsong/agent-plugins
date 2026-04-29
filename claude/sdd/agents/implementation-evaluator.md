---
name: implementation-evaluator
description: Fresh-context implementation compliance evaluator. Reads all ADRs + specs and all production code for a component, reports every gap where spec says X but code doesn't implement X. No conversation context inherited. Saves results to .agent/audits/.
model: claude-sonnet-4-6
tools: Read, Glob, Grep, Write, Bash, Agent
---
{{ include "agents/implementation-evaluator.md" }}
