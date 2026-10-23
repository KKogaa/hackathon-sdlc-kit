---
name: open-pr
description: Push the current branch and open a well-described pull request linked to its issue, labelled pr:needs-review so another teammate's worker reviews and merges it. Use when the user says "open a PR", "ship it", "create pull request", or after finishing an issue.
---

# Open a pull request

## Steps

1. **Pre-flight**
   - `git status`: commit or stash any stragglers. Never commit secrets or `.env` files.
   - Rebase on the latest main to minimize conflicts, one command at a time:
     ```
     git fetch origin
     git rebase origin/main
     ```
   - The `check` skill must pass. It is the team's CI: there are no GitHub Actions, so nobody else will catch a failure before review.
   - The OpenSpec task group's boxes are ticked in `openspec/changes/<id>/tasks.md`.

2. **Derive the issue number** from the branch name (`<N>-slug`) if it wasn't given.

3. **Push and create**:
   Write the body to `.git/pr-body.md` with your file tool (not a shell redirect), then run:
   ```
   git push -u origin HEAD
   gh pr create --title "<type>(<area>): <summary> (#<N>)" --body-file .git/pr-body.md --label "pr:needs-review,<same type/area labels as the issue>"
   ```
   The body follows `.github/pull_request_template.md`:
   - `Closes #<N>`
   - `<!-- worker:<your worker id> -->` on its own line. Your id is in the `work` result. The orchestrator uses this line to send review feedback back to you, and not to another worker on the same account.
   - **OpenSpec**: the change and task group, for example `add-items` group 2
   - **Evidence**: the `check` result. *Build ✔*, *Tests ✔ <n> passed*, which test files are new or changed, and which spec scenarios they cover. No evidence, no review: the reviewer gates on build and unit tests.
   - **What**: a bullet list of the changes
   - **Why**: one line
   - **How to test**: exact commands or clicks
   - **Screenshots or GIF** for any UI change
   - **Risk or notes**: contract changes (with the design.md/spec delta update), new env vars, migrations

   A spec-only PR (kickoff or `plan-feature`) uses the title `docs(spec): …` and no `Closes` (except a feature-request issue it fulfils). Contracts are agreed by people, not workers, so it gets `pr:needs-review` **only once a human has approved it**: the conductor in chat (`plan-feature`), or the team at kickoff. A worker then validates and merges it.

4. **Don't wait for it.** The orchestrator assigns the review to a worker on another account. That worker runs the checks and squash-merges, or sends it back with `pr:changes`, which comes back to you as a `fix`.

5. Report the PR URL.

## Keep PRs small

If the diff is over roughly 400 changed lines, suggest splitting it. Big PRs are where hackathon merge hell comes from.
