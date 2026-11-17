#!/usr/bin/env bash
# Starts the nightly cycle with a headless coding agent.
#
# Schedule it with cron, a CI schedule or a Claude Code scheduled task, e.g.
#   30 3 * * *  cd /path/to/repo && scripts/nightly.sh >> nightly.log 2>&1
#
# The agent reads CLAUDE.md for how to run a cycle. To let it read production
# numbers, export SITE_URL and ADMIN_TOKEN (or the store credentials) first.
set -euo pipefail
cd "$(dirname "$0")/.."

git pull --ff-only

claude -p "Read program.md, lab_notebook.md and results.tsv. Run tonight's cycle." \
  --permission-mode acceptEdits
