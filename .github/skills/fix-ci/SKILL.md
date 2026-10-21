---
name: fix-ci
description: Diagnose and fix failing GitHub Actions checks on a PR or branch by reading the logs, reproducing locally, and pushing a fix. Use when CI is red, checks fail, the build is broken, or the user says "fix CI".
---

# Fix failing CI

## Steps

1. Find the failure:
   ```bash
   gh pr checks            # on the current branch's PR
   gh run list --branch "$(git branch --show-current)" --limit 5
   gh run view <run-id> --log-failed
   ```

2. Classify it:
   - **Lint or format**: run the formatter and commit.
   - **Type error or build failure**: fix the code.
   - **Test failure**: decide whether the code is wrong or the test is outdated. A test is only outdated if the spec changed. Otherwise fix the code.
   - **Main moved**: rebase on `origin/main`, then rerun.
   - **Flaky or infra**: rerun once with `gh run rerun <run-id> --failed`. If it fails again, treat it as real.
   - **Missing secret or env var**: tell the user which secret to add in repo Settings → Secrets. Never hardcode it.

3. Reproduce the failure locally with the same command CI runs (see `.github/workflows/ci.yml`).

4. Fix it, commit `fix(ci): <what> (#<N>)`, push, and watch: `gh pr checks --watch`.

5. Never disable a check, skip tests, or add `|| true` to get green.

## Main is red

If `main` itself is failing, it blocks the whole team. Treat it as p0: tell the user to post in the team channel first, then fix it on a `hotfix-ci` branch.
