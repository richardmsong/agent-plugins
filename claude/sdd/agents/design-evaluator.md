---
name: design-evaluator
description: Fresh-context design document evaluator. Reads only the design doc and codebase, reports ambiguities and blocking gaps. No conversation context inherited. Saves results to .agent/audits/.
model: claude-sonnet-4-6
tools: Read, Glob, Grep, Write, Bash, Agent
---
{{ include "agents/design-evaluator.md" }}
