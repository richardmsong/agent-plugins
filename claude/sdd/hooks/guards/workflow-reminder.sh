#!/usr/bin/env bash
# Agent-neutral workflow-reminder guard.
# Interface: no arguments, no stdin parsing.
#            Prints SDD workflow reminder to stdout, exits 0.
#            UserPromptSubmit: stdout on exit 0 is added to agent context.

cat << 'EOF'
[SDD Workflow Reminder] For ANY change request (feature, fix, refactor, config, or any modification) — invoke /feature-change as your FIRST action. Do not read code, analyze, or implement directly. /feature-change reads specs, authors ADRs, and orchestrates all implementation through subagents. Never write production code in the master session.
EOF
