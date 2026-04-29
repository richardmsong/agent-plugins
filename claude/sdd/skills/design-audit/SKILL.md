---
name: design-audit
description: Multi-round ambiguity audit loop for a design document. Calls /design-evaluator (fresh-context agent) repeatedly, fixing gaps between rounds until CLEAN. Logs all findings, fixes, and decisions to .agent/audits/.
version: 1.0.0
user_invocable: true
argument-hint: <path to design document>
---
{{ include "skills/design-audit/SKILL.md" }}
