---
name: open-pr
description: Push the current branch and open a well-described pull request linked to its issue, labelled pr:needs-review so another teammate's worker reviews and merges it. Use when the user says "open a PR", "ship it", "create pull request", or after finishing an issue.
---

# Open a pull request

## Steps

1. **Pre-flight**
   - `git status`: commit or stash any stragglers. Never commit secrets or `.env` files.
   - Rebase on the latest main to minimize conflicts:
     ```bash
     git fetch origin && git rebase origin/main
     ```
   - `bash scripts/check.sh` must pass. It is the team's CI: there are no GitHub Actions, so nobody else will catch a failure before review.
   - The OpenSpec task group's boxes are ticked in `openspec/changes/<id>/tasks.md`.

2. **Derive the issue number** from the branch name (`<N>-slug`) if it wasn't given.

3. **Push and create**:
   ```bash
   git push -u origin HEAD
   gh pr create \
     --title "<type>(<area>): <summary> (#<N>)" \
     --body-file .git/pr-body.md \
     --label "pr:needs-review,<same type/area labels as the issue>"
   ```
   The body follows `.github/pull_request_template.md`:
   - `Closes #<N>`
   - **OpenSpec**: the change and task group, for example `add-items` group 2
   - **What**: a bullet list of the changes
   - **Why**: one line
   - **How to test**: exact commands or clicks
   - **Screenshots or GIF** for any UI change
   - **Risk or notes**: contract changes (with the design.md/spec delta update), new env vars, migrations

   A spec-only PR (kickoff or `plan-feature`) uses the title `docs(spec): …`, no `Closes`, and **no `pr:needs-review` label**. Contracts are agreed by people, not workers, so the conductor merges it once the affected lane owners have looked at it.

4. **Don't wait for it.** Another teammate's worker picks up `pr:needs-review` PRs, runs `check.sh` on them, and squash-merges or sends them back with `pr:changes`. Your worker's loop handles `pr:changes` first.

5. Report the PR URL.

## Keep PRs small

If the diff is over roughly 400 changed lines, suggest splitting it. Big PRs are where hackathon merge hell comes from.
