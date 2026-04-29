#!/usr/bin/env bash
# factory I/O wrapper for workflow-reminder guard
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
GUARD="${SCRIPT_DIR}/guards/workflow-reminder.sh"
bash "$GUARD"
