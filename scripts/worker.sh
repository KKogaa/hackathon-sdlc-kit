#!/usr/bin/env bash
# Autopilot worker for Copilot CLI: one fresh agent session per unit of work, forever.
# Fresh sessions keep the context small, so the worker can run all day without babysitting.
#
#   bash scripts/worker.sh <lane> [--auto-only]
#
# <lane> is frontend | backend | ai | infra. Run ONE worker per teammate (claims use your gh login).
# Ctrl-C to stop. The VS Code alternative is the `/work <lane>` prompt.
set -uo pipefail

lane="${1:?usage: bash scripts/worker.sh <frontend|backend|ai|infra> [--auto-only]}"
shift
mkdir -p .worker-logs

while true; do
  git checkout -q main && git pull -q --ff-only || { echo "Can't update main: fix the working tree, then restart." >&2; exit 1; }
  # Blocks until there is something to do (re-checks every minute).
  next="$(node scripts/orchestrate.mjs next --lane "$lane" --wait 30 "$@")" || { sleep 60; continue; }
  echo "$(date +%H:%M) $next"
  [[ "$next" == *'"idle"'* ]] && continue

  copilot --agent worker \
    --allow-all-tools --deny-tool 'shell(git push --force)' --deny-tool 'shell(git push -f)' \
    --deny-tool 'shell(rm -rf)' --deny-tool 'shell(gh repo delete)' \
    -p "You are the $lane lane worker. orchestrate.mjs already claimed this unit of work for you: $next. Do exactly that one unit, following your agent instructions, then stop." \
    2>&1 | tee ".worker-logs/$(date +%Y%m%d-%H%M%S).log"
done
