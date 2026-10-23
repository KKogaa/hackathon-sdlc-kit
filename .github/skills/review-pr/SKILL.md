---
name: review-pr
description: Review a teammate's pull request against its issue and OpenSpec contracts, run the checks locally, then merge it or send it back. Use when the worker loop hands you a review, or when the user asks to review PR #N or review open PRs.
---

# Review a pull request

The goal is a **fast, useful** review that unblocks merges and catches real bugs. Skip style nitpicks. There is no CI, so **you are the CI**: you run the checks before merging.

If you didn't get the PR from `orchestrate.mjs next` (for example the user asked for it directly), claim it first so no other worker reviews it at the same time: `gh pr edit <N> --add-assignee @me --add-label pr:reviewing --remove-label pr:needs-review`.

## Steps

1. **Load the context**:
   ```bash
   gh pr view <N> --comments
   gh pr diff <N>
   ```
   Also read the linked issue's acceptance criteria, and for OpenSpec work, the change it names: the `## Contracts` in `design.md` and the WHEN/THEN scenarios in `specs/`.

2. **Run the checks on the PR as it would land on main.** This is a throwaway merge on a detached HEAD. You never push it. Make sure `git status` is clean first (`git stash -u` if it isn't).
   ```bash
   git fetch origin && git fetch origin "pull/<N>/head" && git checkout --detach FETCH_HEAD
   git merge --no-edit origin/main && bash scripts/check.sh
   git merge --abort 2>/dev/null; git checkout main
   ```
   If the merge itself conflicts, that's a blocking item: "rebase on main".

3. **Check these, in priority order**:
   1. **Does it do what the issue asks?** Go through the acceptance criteria and the group's tasks one by one.
   2. **Correctness**: edge cases, null or empty states, async/race issues, error handling.
   3. **Contracts**: API shapes, env vars and DB schema match `design.md` and the spec deltas. If the PR changes a contract, it updates them too and says so under *Risk or notes*.
   4. **Security**: no secrets committed, no injection, and auth is checked on new endpoints.
   5. **Merge risk**: does it touch shared files (routes, schema, config) that other open PRs also touch? Check with `gh pr list --state open --json number,files`.
   6. **Tests** cover the spec scenarios, and `check.sh` passed.

4. **Decide.** Only blocking items justify sending it back. Speed matters.
   - **Merge** when `check.sh` passed and nothing is blocking:
     ```bash
     gh pr review <N> --approve --body "LGTM: <one-line summary>"
     node scripts/orchestrate.mjs reviewed <N> --merge
     ```
     That squash-merges, closes the issue, and immediately unblocks whatever depended on it.
   - **Send it back** otherwise. Point inline comments at specific lines, each with a concrete fix, and prefix each with **blocking:**, **suggestion:** or **question:**.
     ```bash
     gh pr review <N> --request-changes --body "<summary of blocking items>"
     node scripts/orchestrate.mjs reviewed <N> --changes
     ```
     The author's worker picks it up next with `pr:changes`.

## Batch mode

"Review all open PRs": list them with `gh pr list --state open --label pr:needs-review`, review each one, then print a table of PR, verdict and blocking count.
