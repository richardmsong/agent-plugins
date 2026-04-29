---
name: implementation-evaluator
description: Implementation compliance audit for one or all components. Spawns the implementation-evaluator agent (fresh context, no conversation history) per component. Saves results to .agent/audits/.
version: 2.0.0
user_invocable: true
argument-hint: [component-name]
---
{{ include "skills/implementation-evaluator/SKILL.md" }}
