---
name: open-pr
description: Push the current branch and open a well-described pull request linked to its issue, ready for fast review. Use when the user says "open a PR", "ship it", "create pull request", or after finishing an issue.
---

# Open a pull request

## Steps

1. **Pre-flight**
   - `git status`: commit or stash any stragglers. Never commit secrets or `.env` files.
   - Rebase on the latest main to minimize conflicts:
     ```bash
     git fetch origin && git rebase origin/main
     ```
   - Run the lint, test and build commands from `AGENTS.md`. They must pass.

2. **Derive the issue number** from the branch name (`<N>-slug`) if it wasn't given.

3. **Push and create**:
   ```bash
   git push -u origin HEAD
   gh pr create \
     --title "<type>(<area>): <summary> (#<N>)" \
     --body-file /tmp/pr.md \
     --label "<same type/area labels as the issue>"
   ```
   The body follows `.github/pull_request_template.md`:
   - `Closes #<N>`
   - **What**: bullet list of the changes
   - **Why**: one line
   - **How to test**: exact commands or clicks
   - **Screenshots or GIF** for any UI change
   - **Risk or notes**: contract changes, new env vars, migrations

4. **Request review**: add a teammate if one is known (`--reviewer <user>`). Otherwise leave the PR for the team to pick up.

5. **Watch CI**: `gh pr checks --watch`. If it fails, use the `fix-ci` skill.

6. Report the PR URL.

## Keep PRs small

If the diff is over roughly 400 changed lines, suggest splitting it. Big PRs are where hackathon merge hell comes from.
