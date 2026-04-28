#!/usr/bin/env bash
# Agent-neutral workflow-reminder guard.
# Interface: no arguments, no stdin parsing.
#            Prints SDD workflow reminder to stdout, exits 0.
#            UserPromptSubmit: stdout on exit 0 is added to agent context.

TIMESTAMP=$(python3 -c "import time; print(int(time.time()*1000))")
echo "[HOOK-TS] ${TIMESTAMP}"
