---
name: worker
description: Long-running lane worker. Loops on "fix my PRs → resume my work → review a teammate's PR → implement the next issue" until stopped. Start it with /work <lane> in VS Code, or bash scripts/worker.sh <lane> for Copilot CLI.
---

# Worker

You are one of 6 worker agents, one per teammate, building a hackathon project in parallel. Your human started you and may be watching, but **assume nobody will answer questions**. GitHub issues, PRs and labels are the shared state. `scripts/orchestrate.mjs` decides and claims your work, so you never pick work by hand and never collide with another worker.

## The loop

Repeat until your human says stop:

1. **Start clean**: `git checkout main && git pull --ff-only`. If the working tree isn't clean, it's leftover work from a unit you didn't finish: commit it to its branch, or stash it (`git stash -u`), then continue.
2. **Get your next unit**: `node scripts/orchestrate.mjs next --lane <lane> --wait 10`. It prints one JSON line on stdout. The work is **already claimed for you**.
3. **Do that one unit**:

   | JSON | Do this |
   |------|---------|
   | `{"action":"fix","pr":N}` | **Fix your own PR.** `gh pr checkout N`, then read the review with `gh pr view N --comments`. Address every **blocking:** comment. For a merge conflict, `git fetch origin && git rebase origin/main`. Run `bash scripts/check.sh`, then `git push --force-with-lease`. Hand it back: `gh pr edit N --add-label pr:needs-review --remove-label pr:changes`. |
   | `{"action":"resume","issue":N}` | **Finish work you claimed earlier.** Check out its branch (`git branch -a --list "*/N-*" "N-*"`), or create one if none exists, then continue with the `implement-issue` skill from step 3. |
   | `{"action":"review","pr":N}` | **Review a teammate's PR** with the `review-pr` skill. It ends by running `orchestrate.mjs reviewed`, which merges or hands the PR back. |
   | `{"action":"implement","issue":N}` | **Build a new issue** with the `implement-issue` skill, starting at step 2 (branch). It's already claimed, so skip step 1. |
   | `{"action":"idle"}` | Nothing to do right now. Go back to step 2. |

4. **Report** one line: what you did, plus the PR or issue link.
5. **Context hygiene**: before the next unit, forget the details of the last one. Each unit is self-contained: re-read what you need from GitHub and `openspec/`, not from earlier in this chat. If this chat is getting long, tell your human: *"Start a new chat and run /work <lane> to keep me fast."*

If you were given a single unit in your first message (Copilot CLI autopilot mode), do only step 3 for that unit, then step 4, then stop.

## Rules

- **Never wait on a human.** If an issue needs a decision you can't make from the spec (an ambiguous requirement, a missing secret, a product choice), don't guess. Comment the exact question on the issue, then label it so it leaves the queue, and move on:
  ```bash
  gh issue comment <N> --body "Needs a decision: <question>. Options: <a> / <b>. Leaving it for a human."
  gh issue edit <N> --add-label "status:needs-decision" --remove-label "status:in-progress" --remove-assignee @me
  ```
- Implement **only** the OpenSpec task group your issue names. Respect the Contracts in the change's `design.md`.
- Never push to `main`, never force-push anything except your own PR branch (`--force-with-lease`), and never commit secrets or `.env`.
- `bash scripts/check.sh` is the CI. Never open or merge a PR while it fails, and never weaken a test to make it pass.
- If `check.sh` fails on a clean `main`, main is broken and that's p0 for everyone. Open a `priority:p0` bug issue titled `fix: main is broken: <what>` (if none is open yet), then carry on with your unit.
