#!/usr/bin/env bash
# Creates or updates the labels the SDLC skills rely on. Safe to re-run.
set -euo pipefail

label() { gh label create "$1" --color "$2" --description "$3" --force >/dev/null && echo "✓ $1"; }

label "type:feature"       "1f883d" "New functionality"
label "type:bug"           "d73a4a" "Something is broken"
label "type:chore"         "c5def5" "Tooling, config, deps"
label "type:docs"          "0075ca" "Documentation"

label "size:S"             "bfdadc" "< 1 hour"
label "size:M"             "7fc8c4" "1-2 hours"
label "size:L"             "e99695" "Too big: split it"

label "status:ready"       "0e8a16" "Ready to pick up"
label "status:in-progress" "fbca04" "Someone is on it"
label "status:blocked"     "b60205" "Waiting on the issues under Depends on"
label "status:needs-decision" "d876e3" "A worker parked it: needs a human decision"

label "pr:needs-review"    "0e8a16" "Waiting for a worker to review and merge"
label "pr:reviewing"       "fbca04" "A worker is reviewing it"
label "pr:changes"         "d93f0b" "Sent back: the author's worker fixes it next"

label "priority:p0"        "b60205" "Demo-critical"
label "priority:p1"        "d93f0b" "Important"
label "priority:p2"        "fef2c0" "Nice to have"

label "area:frontend"      "5319e7" "UI"
label "area:backend"       "1d76db" "API, services, DB"
label "area:infra"         "6e7781" "CI, deploy, hosting"
label "area:ai"            "8250df" "LLM, agents, prompts"

label "agent:auto"         "000000" "Well specified: an unattended worker can finish it"
